-- ============================================================================
-- PAGORA — 0007: modelo financeiro (payments, eventos, saques, ledger)
-- ============================================================================
-- Decisão de unidade monetária: INTEIRO EM CENTAVOS, não numeric(12,2).
-- O schema da 0001 já nasceu em centavos (`price_cents`, `platform_fee_cents`,
-- `balance_cents`). Introduzir numeric agora criaria duas unidades no mesmo
-- fluxo de dinheiro e uma fronteira de conversão em cada join — exatamente a
-- classe de erro que a modelagem monetária tenta evitar. Centavo inteiro
-- elimina ponto flutuante por construção; acumuladores usam bigint.
--
-- Separação de responsabilidades:
--   payments          → uma cobrança no gateway (o que o CLIENTE paga)
--   payment_events    → log bruto e idempotente de webhooks
--   withdrawals       → uma transferência para o prestador (o que SAI)
--   wallets           → saldo materializado (cache do ledger)
--   wallet_transactions → ledger append-only; é a verdade contábil
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tabela de transições válidas de order.
-- Regra em dado, não em código espalhado por tela: para saber se um caminho é
-- legal basta um SELECT, e adicionar um estado não exige reler nenhum if.
-- ---------------------------------------------------------------------------
create table if not exists pagora.order_status_transitions (
  from_status pagora.order_status not null,
  to_status   pagora.order_status not null,
  note        text,
  primary key (from_status, to_status)
);

insert into pagora.order_status_transitions (from_status, to_status, note) values
  ('pending_payment', 'paid',      'webhook do gateway confirmou a cobrança'),
  ('pending_payment', 'expired',   'Pix venceu sem pagamento'),
  ('pending_payment', 'cancelled', 'cliente ou prestador desistiu antes de pagar'),
  ('paid',            'en_route',  'prestador saiu para o atendimento'),
  ('paid',            'cancelled', 'cancelado após pagamento — exige estorno'),
  ('paid',            'refunded',  'estorno integral'),
  ('paid',            'disputed',  'cliente abriu disputa antes da execução'),
  ('en_route',        'in_progress', 'serviço começou'),
  ('en_route',        'disputed',  null),
  ('en_route',        'cancelled', 'exige estorno'),
  ('in_progress',     'completed', 'prestador concluiu; aguarda confirmação'),
  ('in_progress',     'disputed',  null),
  ('completed',       'settled',   'cliente confirmou — saldo liberado ao prestador'),
  ('completed',       'disputed',  'cliente contestou dentro do prazo'),
  ('disputed',        'settled',   'disputa resolvida a favor do prestador'),
  ('disputed',        'refunded',  'disputa resolvida a favor do cliente'),
  ('disputed',        'completed', 'disputa encerrada sem alteração financeira')
on conflict do nothing;

alter table pagora.order_status_transitions enable row level security;
-- `force` também aqui: a tabela é referência somente-leitura, mas manter o
-- schema uniforme é o que permite auditar "toda tabela tem RLS forçada" com
-- uma consulta só, em vez de manter uma lista de exceções na cabeça.
alter table pagora.order_status_transitions force row level security;
create policy order_transitions_read on pagora.order_status_transitions
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- orders: colunas que faltavam para representar o dinheiro do pedido
-- ---------------------------------------------------------------------------
alter table pagora.orders
  add column if not exists provider_amount_cents int not null default 0
    check (provider_amount_cents >= 0),
  add column if not exists gateway_fee_cents int not null default 0
    check (gateway_fee_cents >= 0),
  add column if not exists paid_at        timestamptz,
  add column if not exists settled_at     timestamptz,
  add column if not exists refunded_at    timestamptz,
  add column if not exists client_confirmed_at timestamptz;

-- O dinheiro tem que fechar: bruto = comissão + parte do prestador.
-- Linhas antigas (provider_amount_cents = 0) ficam de fora por enquanto e são
-- corrigidas no backfill abaixo.
update pagora.orders
   set provider_amount_cents = price_cents - platform_fee_cents
 where provider_amount_cents = 0
   and price_cents > platform_fee_cents;

alter table pagora.orders
  drop constraint if exists orders_money_balances;
alter table pagora.orders
  add constraint orders_money_balances
  check (price_cents = platform_fee_cents + provider_amount_cents);

-- ---------------------------------------------------------------------------
-- payments — a cobrança feita ao cliente
-- ---------------------------------------------------------------------------
create table if not exists pagora.payments (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references pagora.orders(id) on delete restrict,
  client_id           uuid not null references pagora.profiles(id) on delete restrict,
  provider_id         uuid not null references pagora.providers(profile_id) on delete restrict,

  gateway             pagora.payment_gateway not null default 'asaas',
  gateway_payment_id  text,
  gateway_customer_id text,

  -- Decomposição congelada no momento da criação. Nunca recalcular a partir da
  -- quote depois: o prestador pode ter mudado o preço da proposta, e o que vale
  -- é o que foi cobrado.
  amount_cents          int not null check (amount_cents > 0),
  platform_fee_cents    int not null check (platform_fee_cents >= 0),
  gateway_fee_cents     int not null default 0 check (gateway_fee_cents >= 0),
  provider_amount_cents int not null check (provider_amount_cents >= 0),

  status          pagora.payment_status not null default 'pending',
  payment_method  pagora.payment_method not null default 'pix',

  pix_payload     text,   -- copia-e-cola
  pix_qr_code     text,   -- imagem base64
  invoice_url     text,

  expires_at      timestamptz,
  paid_at         timestamptz,
  failed_at       timestamptz,
  refunded_at     timestamptz,
  failure_reason  text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint payments_money_balances
    check (amount_cents = platform_fee_cents + provider_amount_cents),
  constraint payments_paid_has_timestamp
    check (status <> 'paid' or paid_at is not null)
);

-- Um pagamento por gateway não pode ser registrado duas vezes.
create unique index if not exists payments_gateway_id_uniq
  on pagora.payments (gateway, gateway_payment_id)
  where gateway_payment_id is not null;

-- Um pedido só pode ter UMA cobrança viva. Impede que dois cliques no botão
-- "Pagar" gerem dois Pix para o mesmo serviço.
create unique index if not exists payments_one_open_per_order
  on pagora.payments (order_id)
  where status in ('pending', 'paid');

create index if not exists payments_order_idx  on pagora.payments (order_id, created_at desc);
create index if not exists payments_client_idx on pagora.payments (client_id, created_at desc);
create index if not exists payments_status_idx on pagora.payments (status, expires_at)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- payment_events — log bruto de webhook, com a trava de idempotência
-- ---------------------------------------------------------------------------
create table if not exists pagora.payment_events (
  id               uuid primary key default gen_random_uuid(),
  payment_id       uuid references pagora.payments(id) on delete set null,
  withdrawal_id    uuid,  -- FK adicionada depois da criação de withdrawals

  gateway          pagora.payment_gateway not null default 'asaas',
  gateway_event_id text not null,
  event_type       text not null,
  payload          jsonb not null,

  -- NULL enquanto não processado. Um evento pode chegar, ser gravado e falhar
  -- no processamento; a distinção entre "recebido" e "aplicado" é o que
  -- permite reprocessar sem duplicar dinheiro.
  processed_at     timestamptz,
  process_error    text,
  created_at       timestamptz not null default now(),

  -- ESTA É A TRAVA DE IDEMPOTÊNCIA. Webhooks são reenviados por design: o
  -- Asaas repete a entrega até receber 200. Sem esta unique, um reenvio de
  -- PAYMENT_RECEIVED creditaria o prestador duas vezes.
  constraint payment_events_idempotency unique (gateway, gateway_event_id)
);

create index if not exists payment_events_payment_idx on pagora.payment_events (payment_id, created_at desc);
create index if not exists payment_events_unprocessed_idx on pagora.payment_events (created_at)
  where processed_at is null;

-- ---------------------------------------------------------------------------
-- withdrawals — saque do prestador
-- ---------------------------------------------------------------------------
create table if not exists pagora.withdrawals (
  id                  uuid primary key default gen_random_uuid(),
  provider_id         uuid not null references pagora.providers(profile_id) on delete restrict,

  amount_cents        int not null check (amount_cents > 0),
  gateway             pagora.payment_gateway not null default 'asaas',
  gateway_transfer_id text,

  status              pagora.withdrawal_status not null default 'requested',
  pix_key             text,

  requested_at        timestamptz not null default now(),
  processed_at        timestamptz,
  failed_at           timestamptz,
  failure_reason      text,

  -- Chave de idempotência gerada pelo cliente da API. Duas requisições de
  -- saque com a mesma chave produzem um único saque.
  idempotency_key     text not null,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists withdrawals_idempotency_uniq
  on pagora.withdrawals (provider_id, idempotency_key);

create unique index if not exists withdrawals_gateway_id_uniq
  on pagora.withdrawals (gateway, gateway_transfer_id)
  where gateway_transfer_id is not null;

-- Um saque em voo por prestador. Elimina a corrida de dois cliques simultâneos
-- em "Sacar" drenando o saldo duas vezes.
create unique index if not exists withdrawals_one_inflight_per_provider
  on pagora.withdrawals (provider_id)
  where status in ('requested', 'processing');

create index if not exists withdrawals_provider_idx on pagora.withdrawals (provider_id, created_at desc);
create index if not exists withdrawals_status_idx on pagora.withdrawals (status, requested_at);

alter table pagora.payment_events
  drop constraint if exists payment_events_withdrawal_fk;
alter table pagora.payment_events
  add constraint payment_events_withdrawal_fk
  foreign key (withdrawal_id) references pagora.withdrawals(id) on delete set null;

-- ---------------------------------------------------------------------------
-- wallets — saldo materializado, com a distinção que faltava
-- ---------------------------------------------------------------------------
alter table pagora.wallets
  add column if not exists gateway            pagora.payment_gateway not null default 'asaas',
  add column if not exists gateway_wallet_id  text,
  add column if not exists gateway_account_id text,
  add column if not exists total_received_cents bigint not null default 0,
  add column if not exists currency           text not null default 'BRL',
  add column if not exists status             text not null default 'active',
  add column if not exists created_at         timestamptz not null default now();

alter table pagora.wallets
  drop constraint if exists wallets_status_valid;
alter table pagora.wallets
  add constraint wallets_status_valid check (status in ('active', 'blocked', 'closed'));

-- Saldo negativo nunca é estado válido: se uma operação levaria a isso, ela
-- tem que falhar, não registrar o buraco.
alter table pagora.wallets
  drop constraint if exists wallets_no_negative_balance;
alter table pagora.wallets
  add constraint wallets_no_negative_balance
  check (balance_cents >= 0 and pending_cents >= 0);

-- `gateway_wallet_id` identifica a subconta do prestador no Asaas. NÃO é
-- segredo (é usado no split), mas o vínculo é: só o dono e o admin enxergam.
create unique index if not exists wallets_gateway_wallet_uniq
  on pagora.wallets (gateway, gateway_wallet_id)
  where gateway_wallet_id is not null;

-- ---------------------------------------------------------------------------
-- wallet_transactions — o ledger de verdade
-- ---------------------------------------------------------------------------
alter table pagora.wallet_transactions
  add column if not exists payment_id     uuid references pagora.payments(id) on delete set null,
  add column if not exists withdrawal_id  uuid references pagora.withdrawals(id) on delete set null,
  add column if not exists direction      pagora.ledger_direction,
  add column if not exists balance_before_cents int,
  add column if not exists gateway_reference    text,
  -- Em qual bolso do prestador o lançamento mexe.
  --   pending   → dinheiro recebido do cliente mas ainda preso ao serviço
  --   available → dinheiro liberado, sacável
  -- A liberação é um PAR de lançamentos (débito em pending + crédito em
  -- available), e é isso que garante que "o cliente pagou" nunca seja
  -- confundido com "o prestador pode sacar".
  add column if not exists bucket text not null default 'available';

alter table pagora.wallet_transactions
  drop constraint if exists wallet_tx_bucket_valid;
alter table pagora.wallet_transactions
  add constraint wallet_tx_bucket_valid check (bucket in ('available', 'pending'));

-- Backfill do que já existe antes de tornar as colunas obrigatórias.
-- O cast é obrigatório: um CASE com literais string resolve para `text`, e o
-- Postgres não faz coerção implícita de text para enum numa atribuição.
update pagora.wallet_transactions
   set direction = (case when amount_cents >= 0 then 'credit' else 'debit' end)::pagora.ledger_direction
 where direction is null;

update pagora.wallet_transactions
   set balance_before_cents = balance_after_cents - amount_cents
 where balance_before_cents is null;

alter table pagora.wallet_transactions
  alter column direction set not null,
  alter column balance_before_cents set not null;

-- Coerência interna de cada lançamento: o saldo do bucket depois é o saldo
-- antes mais o movimento, e o sinal bate com a direção declarada. Um
-- lançamento que não fecha é rejeitado pelo banco, não descoberto na
-- conciliação do fim do mês.
alter table pagora.wallet_transactions
  drop constraint if exists wallet_tx_balance_coherent;
alter table pagora.wallet_transactions
  add constraint wallet_tx_balance_coherent
  check (balance_after_cents = balance_before_cents + amount_cents);

-- Nenhum bucket pode ficar negativo depois de um lançamento.
alter table pagora.wallet_transactions
  drop constraint if exists wallet_tx_no_negative_after;
alter table pagora.wallet_transactions
  add constraint wallet_tx_no_negative_after check (balance_after_cents >= 0);

alter table pagora.wallet_transactions
  drop constraint if exists wallet_tx_direction_matches_sign;
alter table pagora.wallet_transactions
  add constraint wallet_tx_direction_matches_sign
  check (
    (direction = 'credit' and amount_cents >= 0) or
    (direction = 'debit'  and amount_cents <= 0)
  );

-- Um lançamento de cada tipo por bucket, por origem. Uma segunda linha
-- (payment, kind, bucket) idêntica é, por definição, pagamento em dobro — e é
-- exatamente o que um webhook reenviado tentaria fazer se a trava de
-- idempotência de payment_events falhasse. Esta é a segunda linha de defesa.
create unique index if not exists wallet_tx_one_per_payment_kind
  on pagora.wallet_transactions (payment_id, kind, bucket)
  where payment_id is not null;

create unique index if not exists wallet_tx_one_per_withdrawal_kind
  on pagora.wallet_transactions (withdrawal_id, kind, bucket)
  where withdrawal_id is not null;

create index if not exists wallet_tx_payment_idx on pagora.wallet_transactions (payment_id)
  where payment_id is not null;

-- Ledger é append-only: sem UPDATE e sem DELETE, nem para o owner da tabela.
create or replace function pagora.reject_ledger_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'wallet_transactions é append-only: use um lançamento de estorno (kind=adjustment)';
end;
$$;

drop trigger if exists wallet_tx_no_update on pagora.wallet_transactions;
create trigger wallet_tx_no_update
  before update or delete on pagora.wallet_transactions
  for each row execute function pagora.reject_ledger_mutation();

-- ---------------------------------------------------------------------------
-- Triggers de updated_at nas tabelas novas
-- ---------------------------------------------------------------------------
drop trigger if exists payments_set_updated_at on pagora.payments;
create trigger payments_set_updated_at
  before update on pagora.payments
  for each row execute function pagora.set_updated_at();

drop trigger if exists withdrawals_set_updated_at on pagora.withdrawals;
create trigger withdrawals_set_updated_at
  before update on pagora.withdrawals
  for each row execute function pagora.set_updated_at();

-- ===========================================================================
-- RLS — leitura restrita às partes, ZERO escrita pelo browser
-- ===========================================================================
alter table pagora.payments        enable row level security;
alter table pagora.payment_events  enable row level security;
alter table pagora.withdrawals     enable row level security;

alter table pagora.payments        force row level security;
alter table pagora.payment_events  force row level security;
alter table pagora.withdrawals     force row level security;

grant select on pagora.payments to authenticated;
grant select on pagora.withdrawals to authenticated;
-- payment_events é legível APENAS por admin — o payload cru do gateway carrega
-- dados de terceiros e identificadores internos. O GRANT abaixo é necessário
-- para a policy existir de fato: sem ele o PostgREST barra antes da RLS, e o
-- painel de falhas de webhook não funcionaria nem para o administrador.
-- Quem restringe a admin é `payment_events_admin_only`, logo abaixo.
grant select on pagora.payment_events to authenticated;

create policy payments_select_party on pagora.payments
  for select to authenticated
  using (client_id = auth.uid() or provider_id = auth.uid() or pagora.is_admin());

create policy withdrawals_select_own on pagora.withdrawals
  for select to authenticated
  using (provider_id = auth.uid() or pagora.is_admin());

create policy payment_events_admin_only on pagora.payment_events
  for select to authenticated
  using (pagora.is_admin());

-- Nenhuma policy de INSERT/UPDATE/DELETE e nenhum GRANT de escrita: as três
-- tabelas só são escritas por SECURITY DEFINER (0008) e Edge Functions.

-- ---------------------------------------------------------------------------
-- View pública de avaliações — expõe nota sem expor quem avaliou
-- (a 0006 removeu o SELECT irrestrito em pagora.reviews)
-- ---------------------------------------------------------------------------
create or replace view pagora.provider_reviews_public
with (security_invoker = false) as
  select
    r.id,
    r.provider_id,
    r.stars,
    r.comment,
    r.tags,
    r.created_at
  from pagora.reviews r;

grant select on pagora.provider_reviews_public to authenticated, anon;

comment on view pagora.provider_reviews_public is
  'Avaliações sem client_id nem order_id — seguro para exibir no perfil público do prestador.';

comment on table pagora.payments is
  'Pagora: cobrança no gateway. Decomposição congelada na criação; escrita só por Edge Function.';
comment on table pagora.payment_events is
  'Pagora: webhooks brutos. unique(gateway, gateway_event_id) é a trava de idempotência.';
comment on table pagora.withdrawals is
  'Pagora: saque do prestador. Saldo é reservado na criação, não na confirmação.';
comment on table pagora.order_status_transitions is
  'Pagora: máquina de estados de order como dado. Consultada por advance_order_status().';
