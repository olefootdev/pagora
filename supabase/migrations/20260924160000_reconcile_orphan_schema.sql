-- ============================================================================
-- PAGORA — Reconciliação do schema órfão
-- ============================================================================
-- ESTE ARQUIVO NÃO É UMA MIGRATION NOVA. Ele captura o estado que JÁ EXISTE no
-- banco e que não tinha arquivo em nenhum branch deste repositório.
--
-- ---------------------------------------------------------------------------
-- O que aconteceu
-- ---------------------------------------------------------------------------
-- O banco registrava 11 migrations aplicadas; o repo só tinha as 4 primeiras.
-- As 7 restantes foram aplicadas direto no Supabase, sem commit dos arquivos:
--
--   0005 financial_enums          0009 hardening_public_forms
--   0006 rls_hardening            0010 chat
--   0007 financial_schema         0011 onboarding_simples
--   0008 financial_rpcs
--
-- Consequência prática: o repositório não reproduzia o banco. Recriar o
-- projeto do zero perderia pagamento, saque, ledger, chat e verificação.
--
-- ---------------------------------------------------------------------------
-- O que este arquivo é, e o que ele NÃO é
-- ---------------------------------------------------------------------------
-- É: um retrato do schema real, gerado por introspecção do catálogo do
--    Postgres (pg_get_functiondef, pg_get_constraintdef, pg_get_indexdef,
--    pg_get_viewdef), não transcrito à mão. Aplicado sobre um banco no estado
--    da 0004, reconstrói o que as 7 órfãs criaram.
--
-- NÃO é: o histórico delas. As 7 viram uma só, e a ordem interna aqui segue
--    dependência de objeto, não a cronologia original. Quem fez cada mudança e
--    por quê está perdido — isso não se recupera por introspecção.
--
-- ---------------------------------------------------------------------------
-- Idempotência
-- ---------------------------------------------------------------------------
-- Tudo aqui é `if not exists` / `create or replace` / `drop policy if exists`.
-- Rodar contra o banco atual é no-op: serve para conferir que o arquivo de
-- fato descreve o que está lá.
--
-- Gerado em 2026-09-24 a partir de mibdmoralhjmwfuxmxiu.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums  (migration órfã: financial_enums)
-- ---------------------------------------------------------------------------
-- `payment_gateway` tem um valor só, 'asaas' — o gateway escolhido. Enum de um
-- elemento é deliberado: força um novo gateway a passar por migration em vez
-- de entrar como string solta.
do $$ begin create type pagora.account_type as enum ('client', 'provider', 'promoter', 'company'); exception when duplicate_object then null; end $$;
do $$ begin create type pagora.ledger_direction as enum ('credit', 'debit'); exception when duplicate_object then null; end $$;
do $$ begin create type pagora.payment_gateway as enum ('asaas'); exception when duplicate_object then null; end $$;
do $$ begin create type pagora.payment_method as enum ('pix', 'credit_card', 'boleto'); exception when duplicate_object then null; end $$;
do $$ begin create type pagora.payment_status as enum ('pending', 'paid', 'failed', 'expired', 'refunded', 'chargeback'); exception when duplicate_object then null; end $$;
do $$ begin create type pagora.verification_status as enum ('in_review', 'approved', 'rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type pagora.withdrawal_status as enum ('requested', 'processing', 'paid', 'failed', 'cancelled'); exception when duplicate_object then null; end $$;

-- `order_status` ganhou 5 valores além dos 5 originais da 0001.
-- `en_route` importa em especial: é o estado que a geolocalização usa para
-- decidir se o pedido é rastreável (ver 20260924155422_geolocation.sql).
do $$ begin alter type pagora.order_status add value if not exists 'paid'; exception when others then null; end $$;
do $$ begin alter type pagora.order_status add value if not exists 'en_route'; exception when others then null; end $$;
do $$ begin alter type pagora.order_status add value if not exists 'settled'; exception when others then null; end $$;
do $$ begin alter type pagora.order_status add value if not exists 'expired'; exception when others then null; end $$;
do $$ begin alter type pagora.order_status add value if not exists 'refunded'; exception when others then null; end $$;

-- `wallet_tx_kind` ganhou 4 tipos de lançamento. order_hold/order_release são
-- as duas pontas do escrow: retém na confirmação do pagamento, libera quando o
-- cliente confirma a entrega. Sem eles o ledger não conseguiria distinguir
-- "recebido mas retido" de "disponível para saque".
do $$ begin alter type pagora.wallet_tx_kind add value if not exists 'order_hold'; exception when others then null; end $$;
do $$ begin alter type pagora.wallet_tx_kind add value if not exists 'order_release'; exception when others then null; end $$;
do $$ begin alter type pagora.wallet_tx_kind add value if not exists 'withdrawal_reversal'; exception when others then null; end $$;
do $$ begin alter type pagora.wallet_tx_kind add value if not exists 'chargeback'; exception when others then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Tabelas  (migrations órfãs: financial_schema, chat, onboarding_simples)
-- ---------------------------------------------------------------------------
-- Ordem por dependência, não alfabética: payment_events referencia payments e
-- withdrawals, então precisa vir depois das duas.

create table if not exists pagora.order_status_transitions (
  from_status pagora.order_status not null,
  to_status pagora.order_status not null,
  note text,
  constraint order_status_transitions_pkey PRIMARY KEY (from_status, to_status)
);

comment on table pagora.order_status_transitions is
  'Máquina de estados do pedido como DADO: quais transições de status são permitidas.';

create table if not exists pagora.account_verifications (
  id uuid default gen_random_uuid() not null,
  profile_id uuid not null,
  account_type pagora.account_type not null,
  status pagora.verification_status default 'in_review'::pagora.verification_status not null,
  data jsonb default '{}'::jsonb not null,
  notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint account_verifications_pkey PRIMARY KEY (id),
  constraint account_verifications_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES pagora.profiles(id) ON DELETE CASCADE,
  constraint account_verifications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES pagora.profiles(id)
);

create table if not exists pagora.messages (
  id uuid default gen_random_uuid() not null,
  order_id uuid not null,
  sender_id uuid not null,
  body text not null,
  read_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  constraint messages_pkey PRIMARY KEY (id),
  constraint messages_order_id_fkey FOREIGN KEY (order_id) REFERENCES pagora.orders(id) ON DELETE CASCADE,
  constraint messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES pagora.profiles(id) ON DELETE RESTRICT,
  constraint messages_body_len CHECK (((char_length(body) >= 1) AND (char_length(body) <= 2000)))
);

-- Registro de tentativa de troca de contato fora da plataforma. O `excerpt`
-- é limitado a 120 caracteres de propósito: guarda evidência sem virar cópia
-- da conversa.
create table if not exists pagora.message_blocks (
  id uuid default gen_random_uuid() not null,
  order_id uuid not null,
  sender_id uuid not null,
  kind text not null,
  excerpt text not null,
  created_at timestamp with time zone default now() not null,
  constraint message_blocks_pkey PRIMARY KEY (id),
  constraint message_blocks_order_id_fkey FOREIGN KEY (order_id) REFERENCES pagora.orders(id) ON DELETE CASCADE,
  constraint message_blocks_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES pagora.profiles(id) ON DELETE RESTRICT,
  constraint message_blocks_excerpt_check CHECK ((char_length(excerpt) <= 120)),
  constraint message_blocks_kind_check CHECK ((kind = ANY (ARRAY['phone'::text, 'email'::text, 'url'::text, 'handle'::text])))
);

-- `payments_money_balances` é a invariante que sustenta o financeiro:
-- amount = platform_fee + provider_amount, checada pelo banco a cada linha.
create table if not exists pagora.payments (
  id uuid default gen_random_uuid() not null,
  order_id uuid not null,
  client_id uuid not null,
  provider_id uuid not null,
  gateway pagora.payment_gateway default 'asaas'::pagora.payment_gateway not null,
  gateway_payment_id text,
  gateway_customer_id text,
  amount_cents integer not null,
  platform_fee_cents integer not null,
  gateway_fee_cents integer default 0 not null,
  provider_amount_cents integer not null,
  status pagora.payment_status default 'pending'::pagora.payment_status not null,
  payment_method pagora.payment_method default 'pix'::pagora.payment_method not null,
  pix_payload text,
  pix_qr_code text,
  invoice_url text,
  expires_at timestamp with time zone,
  paid_at timestamp with time zone,
  failed_at timestamp with time zone,
  refunded_at timestamp with time zone,
  failure_reason text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint payments_pkey PRIMARY KEY (id),
  constraint payments_client_id_fkey FOREIGN KEY (client_id) REFERENCES pagora.profiles(id) ON DELETE RESTRICT,
  constraint payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES pagora.orders(id) ON DELETE RESTRICT,
  constraint payments_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES pagora.providers(profile_id) ON DELETE RESTRICT,
  constraint payments_amount_cents_check CHECK ((amount_cents > 0)),
  constraint payments_gateway_fee_cents_check CHECK ((gateway_fee_cents >= 0)),
  constraint payments_money_balances CHECK ((amount_cents = (platform_fee_cents + provider_amount_cents))),
  constraint payments_paid_has_timestamp CHECK (((status <> 'paid'::pagora.payment_status) OR (paid_at IS NOT NULL))),
  constraint payments_platform_fee_cents_check CHECK ((platform_fee_cents >= 0)),
  constraint payments_provider_amount_cents_check CHECK ((provider_amount_cents >= 0))
);

create table if not exists pagora.withdrawals (
  id uuid default gen_random_uuid() not null,
  provider_id uuid not null,
  amount_cents integer not null,
  gateway pagora.payment_gateway default 'asaas'::pagora.payment_gateway not null,
  gateway_transfer_id text,
  status pagora.withdrawal_status default 'requested'::pagora.withdrawal_status not null,
  pix_key text,
  requested_at timestamp with time zone default now() not null,
  processed_at timestamp with time zone,
  failed_at timestamp with time zone,
  failure_reason text,
  idempotency_key text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint withdrawals_pkey PRIMARY KEY (id),
  constraint withdrawals_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES pagora.providers(profile_id) ON DELETE RESTRICT,
  constraint withdrawals_amount_cents_check CHECK ((amount_cents > 0))
);

-- `payment_events_idempotency` é o que impede o webhook do gateway de ser
-- processado duas vezes — reentrega é comportamento normal, não exceção.
create table if not exists pagora.payment_events (
  id uuid default gen_random_uuid() not null,
  payment_id uuid,
  withdrawal_id uuid,
  gateway pagora.payment_gateway default 'asaas'::pagora.payment_gateway not null,
  gateway_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamp with time zone,
  process_error text,
  created_at timestamp with time zone default now() not null,
  constraint payment_events_pkey PRIMARY KEY (id),
  constraint payment_events_idempotency UNIQUE (gateway, gateway_event_id),
  constraint payment_events_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES pagora.payments(id) ON DELETE SET NULL,
  constraint payment_events_withdrawal_fk FOREIGN KEY (withdrawal_id) REFERENCES pagora.withdrawals(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- 3. Colunas adicionadas a tabelas que já existiam
-- ---------------------------------------------------------------------------
-- disputes, waitlist, provider_applications e quotes ficaram intactas.
-- service_requests só mudou pela geolocalização (arquivo 20260924155422).

-- profiles: onboarding simplificado
alter table pagora.profiles
  add column if not exists cep text,
  add column if not exists account_type pagora.account_type not null default 'client'::pagora.account_type;

-- orders: rastro financeiro. `client_confirmed_at` é o gatilho do repasse —
-- o dinheiro só sai do escrow quando o cliente confirma a entrega.
alter table pagora.orders
  add column if not exists provider_amount_cents integer not null default 0,
  add column if not exists gateway_fee_cents integer not null default 0,
  add column if not exists paid_at timestamptz,
  add column if not exists settled_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists client_confirmed_at timestamptz;

-- wallets: vínculo com a conta no gateway
alter table pagora.wallets
  add column if not exists gateway pagora.payment_gateway not null default 'asaas'::pagora.payment_gateway,
  add column if not exists gateway_wallet_id text,
  add column if not exists gateway_account_id text,
  add column if not exists total_received_cents bigint not null default 0,
  add column if not exists currency text not null default 'BRL',
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now();

-- wallet_transactions vira LEDGER de dupla entrada: `direction` (credit/debit),
-- saldo antes e depois na mesma linha, e `bucket` separando disponível de
-- pendente. Guardar só `balance_after` impedia auditar a sequência.
alter table pagora.wallet_transactions
  add column if not exists payment_id uuid,
  add column if not exists withdrawal_id uuid,
  add column if not exists direction pagora.ledger_direction,
  add column if not exists balance_before_cents integer,
  add column if not exists gateway_reference text,
  add column if not exists bucket text not null default 'available';

-- ---------------------------------------------------------------------------
-- 4. Índices
-- ---------------------------------------------------------------------------
-- Vários são UNIQUE PARCIAIS, e é aí que mora a regra de negócio: eles
-- impedem no banco o que a aplicação poderia deixar passar sob concorrência.
--   payments_one_open_per_order        → um pagamento aberto por pedido
--   withdrawals_one_inflight_per_prov. → um saque em voo por prestador
--   account_verifications_um_aberto    → uma verificação em análise por perfil
--   wallet_tx_one_per_payment_kind     → lançamento não duplica no ledger
-- Reentrega de webhook e duplo clique são normais; a garantia tem que estar
-- aqui, não só no código.

create unique index if not exists account_verifications_um_aberto on pagora.account_verifications using btree (profile_id) where (status = 'in_review'::pagora.verification_status);
create index if not exists account_verifications_fila_idx on pagora.account_verifications using btree (created_at) where (status = 'in_review'::pagora.verification_status);
create index if not exists account_verifications_profile_idx on pagora.account_verifications using btree (profile_id, created_at desc);

create index if not exists messages_order_idx on pagora.messages using btree (order_id, created_at);
create index if not exists messages_unread_idx on pagora.messages using btree (order_id, read_at) where (read_at is null);
create index if not exists message_blocks_sender_idx on pagora.message_blocks using btree (sender_id, created_at desc);

create unique index if not exists payments_one_open_per_order on pagora.payments using btree (order_id) where (status = any (array['pending'::pagora.payment_status, 'paid'::pagora.payment_status]));
create unique index if not exists payments_gateway_id_uniq on pagora.payments using btree (gateway, gateway_payment_id) where (gateway_payment_id is not null);
create index if not exists payments_order_idx on pagora.payments using btree (order_id, created_at desc);
create index if not exists payments_client_idx on pagora.payments using btree (client_id, created_at desc);
create index if not exists payments_status_idx on pagora.payments using btree (status, expires_at) where (status = 'pending'::pagora.payment_status);

create unique index if not exists withdrawals_one_inflight_per_provider on pagora.withdrawals using btree (provider_id) where (status = any (array['requested'::pagora.withdrawal_status, 'processing'::pagora.withdrawal_status]));
create unique index if not exists withdrawals_idempotency_uniq on pagora.withdrawals using btree (provider_id, idempotency_key);
create unique index if not exists withdrawals_gateway_id_uniq on pagora.withdrawals using btree (gateway, gateway_transfer_id) where (gateway_transfer_id is not null);
create index if not exists withdrawals_provider_idx on pagora.withdrawals using btree (provider_id, created_at desc);
create index if not exists withdrawals_status_idx on pagora.withdrawals using btree (status, requested_at);

create index if not exists payment_events_payment_idx on pagora.payment_events using btree (payment_id, created_at desc);
create index if not exists payment_events_unprocessed_idx on pagora.payment_events using btree (created_at) where (processed_at is null);

create unique index if not exists wallet_tx_one_per_payment_kind on pagora.wallet_transactions using btree (payment_id, kind, bucket) where (payment_id is not null);
create unique index if not exists wallet_tx_one_per_withdrawal_kind on pagora.wallet_transactions using btree (withdrawal_id, kind, bucket) where (withdrawal_id is not null);
create index if not exists wallet_tx_payment_idx on pagora.wallet_transactions using btree (payment_id) where (payment_id is not null);
create unique index if not exists wallets_gateway_wallet_uniq on pagora.wallets using btree (gateway, gateway_wallet_id) where (gateway_wallet_id is not null);

create index if not exists profiles_account_type_idx on pagora.profiles using btree (account_type) where (blocked_at is null);
create index if not exists reviews_provider_stars_idx on pagora.reviews using btree (provider_id, stars);

-- Antifraude leve nos formulários públicos (migration órfã hardening_public_forms)
create index if not exists waitlist_ip_recent_idx on pagora.waitlist using btree (ip_hash, created_at desc) where (ip_hash is not null);
create index if not exists waitlist_phone_recent_idx on pagora.waitlist using btree (phone, created_at desc) where (phone is not null);
create index if not exists provider_apps_ip_recent_idx on pagora.provider_applications using btree (ip_hash, created_at desc) where (ip_hash is not null);

-- ---------------------------------------------------------------------------
-- 5. Funções — base
-- ---------------------------------------------------------------------------
-- 15% em basis points, numa função IMMUTABLE. Trocar a taxa vira migration,
-- não UPDATE numa tabela de config — e o valor fica citável no ledger.
CREATE OR REPLACE FUNCTION pagora.platform_fee_bps()
 RETURNS integer LANGUAGE sql IMMUTABLE
AS $function$ select 1500 $function$;

CREATE OR REPLACE FUNCTION pagora.compute_amounts(p_gross_cents integer)
 RETURNS TABLE(platform_fee_cents integer, provider_amount_cents integer)
 LANGUAGE plpgsql IMMUTABLE
AS $function$
declare
  v_fee int;
begin
  if p_gross_cents is null or p_gross_cents <= 0 then
    raise exception 'valor bruto inválido: %', p_gross_cents;
  end if;

  v_fee := round((p_gross_cents::numeric * pagora.platform_fee_bps()) / 10000)::int;

  platform_fee_cents    := v_fee;
  provider_amount_cents := p_gross_cents - v_fee;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION pagora.is_order_participant(p_order_id uuid, p_profile_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
  select exists (
    select 1 from pagora.orders o
     where o.id = p_order_id
       and (o.client_id = p_profile_id or o.provider_id = p_profile_id)
  );
$function$;

-- Ledger é append-only: UPDATE e DELETE são recusados pelo próprio banco.
-- Corrigir lançamento se faz com estorno, não apagando história.
CREATE OR REPLACE FUNCTION pagora.reject_ledger_mutation()
 RETURNS trigger LANGUAGE plpgsql
AS $function$
begin
  raise exception 'wallet_transactions é append-only: use um lançamento de estorno (kind=adjustment)';
end;
$function$;

CREATE OR REPLACE FUNCTION pagora.refresh_provider_rating()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_provider uuid := coalesce(new.provider_id, old.provider_id);
begin
  update pagora.providers p
     set rating_avg = coalesce(agg.avg_stars, 0),
         rating_count = coalesce(agg.n, 0)
    from (
      select avg(stars)::numeric(3,2) as avg_stars, count(*) as n
        from pagora.reviews
       where provider_id = v_provider
    ) agg
   where p.profile_id = v_provider;

  return null;  -- AFTER trigger: valor de retorno é ignorado
end;
$function$;

CREATE OR REPLACE FUNCTION pagora.enforce_public_form_rate_limit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_window  interval := interval '1 hour';
  v_max     int      := 5;
  v_recent  int;
begin
  if new.ip_hash is not null then
    execute format(
      'select count(*) from pagora.%I where ip_hash = $1 and created_at > now() - $2',
      tg_table_name
    ) into v_recent using new.ip_hash, v_window;

    if v_recent >= v_max then
      raise exception 'rate_limit_exceeded: muitos envios deste endereço. Tente novamente mais tarde.'
        using errcode = '53400';
    end if;
  end if;

  -- Segunda barreira, independente de IP: o mesmo telefone não se cadastra
  -- em loop. Vale também para quem envia sem ip_hash.
  --
  -- Na prática ela só faz efeito em `provider_applications`: `waitlist` já tem
  -- unique parcial em `phone` desde a 0003, então lá o segundo envio nem chega
  -- a este trigger. Mantida assim mesmo para que a regra não dependa de qual
  -- tabela recebeu o trigger.
  if new.phone is not null then
    execute format(
      'select count(*) from pagora.%I where phone = $1 and created_at > now() - $2',
      tg_table_name
    ) into v_recent using new.phone, v_window;

    if v_recent >= 3 then
      raise exception 'rate_limit_exceeded: este telefone já foi enviado recentemente.'
        using errcode = '53400';
    end if;
  end if;

  return new;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 6. Funções — fluxo financeiro
-- ---------------------------------------------------------------------------

-- Núcleo do ledger. Trava a carteira (FOR UPDATE), calcula saldo antes/depois
-- e grava a linha. `available` e `pending` são baldes separados: o dinheiro
-- fica retido até o serviço terminar.
CREATE OR REPLACE FUNCTION pagora.post_ledger_entry(p_provider_id uuid, p_kind pagora.wallet_tx_kind, p_bucket text, p_amount_cents integer, p_order_id uuid DEFAULT NULL::uuid, p_payment_id uuid DEFAULT NULL::uuid, p_withdrawal_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_gateway_ref text DEFAULT NULL::text)
 RETURNS pagora.wallet_transactions
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_wallet  pagora.wallets;
  v_before  int;
  v_after   int;
  v_tx      pagora.wallet_transactions;
begin
  if p_bucket not in ('available', 'pending') then
    raise exception 'bucket inválido: %', p_bucket;
  end if;
  if p_amount_cents = 0 then
    raise exception 'lançamento de valor zero não é lançamento';
  end if;

  select * into v_wallet from pagora.wallets
   where provider_id = p_provider_id
     for update;
  if not found then
    raise exception 'wallet_not_found for provider %', p_provider_id;
  end if;
  if v_wallet.status <> 'active' then
    raise exception 'wallet_not_active: %', v_wallet.status;
  end if;

  v_before := case p_bucket when 'available' then v_wallet.balance_cents
                            else v_wallet.pending_cents end;
  v_after  := v_before + p_amount_cents;

  if v_after < 0 then
    raise exception 'insufficient_funds: bucket % tem % e o lançamento pede %',
      p_bucket, v_before, p_amount_cents;
  end if;

  insert into pagora.wallet_transactions (
    provider_id, kind, bucket, direction, amount_cents,
    balance_before_cents, balance_after_cents,
    order_id, payment_id, withdrawal_id, description, gateway_reference
  ) values (
    p_provider_id, p_kind, p_bucket,
    (case when p_amount_cents >= 0 then 'credit' else 'debit' end)::pagora.ledger_direction,
    p_amount_cents, v_before, v_after,
    p_order_id, p_payment_id, p_withdrawal_id, p_description, p_gateway_ref
  )
  returning * into v_tx;

  if p_bucket = 'available' then
    update pagora.wallets
       set balance_cents = v_after,
           -- `total_received` conta só o que o prestador de fato ganhou. Uma
           -- devolução de saque que falhou volta ao saldo mas não é receita
           -- nova — contá-la inflaria o "total recebido" a cada erro de Pix.
           total_received_cents = total_received_cents
             + case when p_kind = 'order_release' and p_amount_cents > 0
                    then p_amount_cents else 0 end
     where provider_id = p_provider_id;
  else
    update pagora.wallets set pending_cents = v_after where provider_id = p_provider_id;
  end if;

  return v_tx;
end;
$function$;

CREATE OR REPLACE FUNCTION pagora.prepare_payment(p_order_id uuid, p_actor_id uuid)
 RETURNS pagora.payments
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_order   pagora.orders;
  v_payment pagora.payments;
  v_fee     int;
  v_net     int;
begin
  select * into v_order from pagora.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;
  if v_order.client_id <> p_actor_id then
    raise exception 'forbidden: order não pertence ao ator';
  end if;
  if v_order.status <> 'pending_payment' then
    raise exception 'order_not_payable: status atual é %', v_order.status;
  end if;

  -- Idempotência de nível de negócio: se já existe cobrança viva para este
  -- pedido, devolve ela. Dois cliques em "Pagar" não geram dois Pix.
  select * into v_payment
    from pagora.payments
   where order_id = p_order_id and status in ('pending', 'paid')
   order by created_at desc
   limit 1;
  if found then
    return v_payment;
  end if;

  select c.platform_fee_cents, c.provider_amount_cents
    into v_fee, v_net
    from pagora.compute_amounts(v_order.price_cents) c;

  insert into pagora.payments (
    order_id, client_id, provider_id,
    amount_cents, platform_fee_cents, provider_amount_cents,
    status, payment_method, expires_at
  ) values (
    v_order.id, v_order.client_id, v_order.provider_id,
    v_order.price_cents, v_fee, v_net,
    'pending', 'pix', now() + interval '30 minutes'
  )
  returning * into v_payment;

  return v_payment;
end;
$function$;

CREATE OR REPLACE FUNCTION pagora.attach_gateway_payment(p_payment_id uuid, p_gateway_id text, p_pix_payload text, p_pix_qr_code text, p_invoice_url text, p_expires_at timestamp with time zone)
 RETURNS pagora.payments
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_payment pagora.payments;
begin
  update pagora.payments
     set gateway_payment_id = p_gateway_id,
         pix_payload = p_pix_payload,
         pix_qr_code = p_pix_qr_code,
         invoice_url = p_invoice_url,
         expires_at  = coalesce(p_expires_at, expires_at)
   where id = p_payment_id and status = 'pending'
  returning * into v_payment;

  if not found then
    raise exception 'payment_not_pending_or_missing: %', p_payment_id;
  end if;
  return v_payment;
end;
$function$;

CREATE OR REPLACE FUNCTION pagora.confirm_payment(p_payment_id uuid, p_amount_cents integer, p_gateway_fee_cents integer DEFAULT 0, p_gateway_ref text DEFAULT NULL::text)
 RETURNS pagora.payments
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_payment pagora.payments;
begin
  select * into v_payment from pagora.payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment_not_found';
  end if;

  -- Reentrância: webhook reenviado depois de aplicado não faz nada.
  if v_payment.status = 'paid' then
    return v_payment;
  end if;
  if v_payment.status <> 'pending' then
    raise exception 'payment_not_pending: status atual é %', v_payment.status;
  end if;

  if p_amount_cents is distinct from v_payment.amount_cents then
    raise exception 'amount_mismatch: cobrado %, gateway informou %',
      v_payment.amount_cents, p_amount_cents;
  end if;

  update pagora.payments
     set status = 'paid',
         paid_at = now(),
         gateway_fee_cents = greatest(coalesce(p_gateway_fee_cents, 0), 0)
   where id = p_payment_id
  returning * into v_payment;

  update pagora.orders
     set gateway_fee_cents = v_payment.gateway_fee_cents
   where id = v_payment.order_id;

  perform pagora.advance_order_status(v_payment.order_id, 'paid', null, null);

  -- O valor BRUTO entra retido, e a comissão sai como lançamento próprio.
  -- Creditar direto o líquido seria mais curto e pior: o extrato do prestador
  -- precisa mostrar "Serviço R$ 300,00" e "Comissão −R$ 45,00", não um
  -- R$ 255,00 sem explicação. O saldo retido resultante é o mesmo.
  perform pagora.post_ledger_entry(
    p_provider_id   => v_payment.provider_id,
    p_kind          => 'order_hold',
    p_bucket        => 'pending',
    p_amount_cents  => v_payment.amount_cents,
    p_order_id      => v_payment.order_id,
    p_payment_id    => v_payment.id,
    p_description   => 'Pagamento recebido — retido até a conclusão do serviço',
    p_gateway_ref   => p_gateway_ref
  );

  -- Em ticket muito baixo a comissão arredonda para zero; lançamento de valor
  -- zero não é lançamento e post_ledger_entry rejeita, então o caso é tratado
  -- aqui em vez de estourar no meio de um webhook.
  if v_payment.platform_fee_cents > 0 then
    perform pagora.post_ledger_entry(
      p_provider_id   => v_payment.provider_id,
      p_kind          => 'platform_fee',
      p_bucket        => 'pending',
      p_amount_cents  => -v_payment.platform_fee_cents,
      p_order_id      => v_payment.order_id,
      p_payment_id    => v_payment.id,
      p_description   => format('Comissão PAGORA (%s bps)', pagora.platform_fee_bps())
    );
  end if;

  return v_payment;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 7. Funções — ciclo de vida do pedido
-- ---------------------------------------------------------------------------

-- A máquina de estados consulta `order_status_transitions` (dado) para saber
-- SE a transição existe, e o CASE abaixo para saber QUEM pode fazê-la.
-- Separar as duas coisas permite alterar o grafo sem mexer em permissão.
CREATE OR REPLACE FUNCTION pagora.advance_order_status(p_order_id uuid, p_to_status pagora.order_status, p_actor_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS pagora.orders
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_order    pagora.orders;
  v_is_admin boolean;
  v_allowed  boolean;
begin
  select * into v_order from pagora.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  -- Reentrância: repetir a transição que já aconteceu é no-op, não erro.
  -- Webhooks reenviados dependem disso.
  if v_order.status = p_to_status then
    return v_order;
  end if;

  if not exists (
    select 1 from pagora.order_status_transitions
     where from_status = v_order.status and to_status = p_to_status
  ) then
    raise exception 'invalid_transition: % -> %', v_order.status, p_to_status;
  end if;

  select coalesce(role = 'admin', false) into v_is_admin
    from pagora.profiles where id = p_actor_id;

  v_allowed := case
    -- Só o gateway (via service_role, ator nulo) confirma pagamento.
    when p_to_status in ('paid', 'expired', 'refunded') then p_actor_id is null or v_is_admin
    -- Execução do serviço é do prestador.
    when p_to_status in ('en_route', 'in_progress', 'completed')
      then p_actor_id = v_order.provider_id or v_is_admin
    -- Liberar o dinheiro é do cliente (ou do admin resolvendo disputa).
    when p_to_status = 'settled' then p_actor_id = v_order.client_id or v_is_admin
    -- Abrir disputa é do cliente.
    when p_to_status = 'disputed' then p_actor_id = v_order.client_id or v_is_admin
    when p_to_status = 'cancelled'
      then p_actor_id in (v_order.client_id, v_order.provider_id) or v_is_admin
    else v_is_admin
  end;

  if not coalesce(v_allowed, false) then
    raise exception 'forbidden_transition: ator % não pode levar order a %', p_actor_id, p_to_status;
  end if;

  update pagora.orders
     set status = p_to_status,
         paid_at      = case when p_to_status = 'paid'      then now() else paid_at end,
         completed_at = case when p_to_status = 'completed' then now() else completed_at end,
         settled_at   = case when p_to_status = 'settled'   then now() else settled_at end,
         refunded_at  = case when p_to_status = 'refunded'  then now() else refunded_at end,
         cancelled_at = case when p_to_status = 'cancelled' then now() else cancelled_at end,
         client_confirmed_at = case when p_to_status = 'settled' and p_actor_id = client_id
                                    then now() else client_confirmed_at end,
         cancellation_reason = coalesce(p_reason, cancellation_reason)
   where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$function$;

-- Libera o escrow em DOIS lançamentos: sai de `pending`, entra em `available`.
-- Um lançamento só de "transferência entre baldes" esconderia a origem do
-- dinheiro no extrato.
CREATE OR REPLACE FUNCTION pagora.settle_order(p_order_id uuid, p_actor_id uuid)
 RETURNS pagora.orders
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_order   pagora.orders;
  v_payment pagora.payments;
begin
  select * into v_order from pagora.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;
  if v_order.status = 'settled' then
    return v_order;  -- reentrante
  end if;

  select * into v_payment
    from pagora.payments
   where order_id = p_order_id and status = 'paid'
   limit 1;
  if not found then
    raise exception 'cannot_settle_unpaid_order';
  end if;

  v_order := pagora.advance_order_status(p_order_id, 'settled', p_actor_id, null);

  perform pagora.post_ledger_entry(
    p_provider_id  => v_order.provider_id,
    p_kind         => 'order_release',
    p_bucket       => 'pending',
    p_amount_cents => -v_order.provider_amount_cents,
    p_order_id     => v_order.id,
    p_payment_id   => v_payment.id,
    p_description  => 'Liberação de retenção — serviço confirmado pelo cliente'
  );

  perform pagora.post_ledger_entry(
    p_provider_id  => v_order.provider_id,
    p_kind         => 'order_release',
    p_bucket       => 'available',
    p_amount_cents => v_order.provider_amount_cents,
    p_order_id     => v_order.id,
    p_payment_id   => v_payment.id,
    p_description  => 'Saldo disponível para saque'
  );

  return v_order;
end;
$function$;

CREATE OR REPLACE FUNCTION pagora.refund_order(p_order_id uuid, p_actor_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS pagora.orders
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_order   pagora.orders;
  v_payment pagora.payments;
begin
  select * into v_order from pagora.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;
  if v_order.status = 'refunded' then
    return v_order;
  end if;

  select * into v_payment from pagora.payments
   where order_id = p_order_id and status = 'paid' limit 1;
  if not found then
    raise exception 'nothing_to_refund';
  end if;

  v_order := pagora.advance_order_status(p_order_id, 'refunded', p_actor_id, p_reason);

  update pagora.payments
     set status = 'refunded', refunded_at = now()
   where id = v_payment.id;

  -- Desfaz a retenção. Se o valor já tiver sido liberado e sacado, este
  -- lançamento falha por saldo insuficiente — e falhar é o comportamento
  -- correto: a decisão passa a ser humana, não um saldo negativo silencioso.
  perform pagora.post_ledger_entry(
    p_provider_id  => v_order.provider_id,
    p_kind         => 'dispute_refund',
    p_bucket       => case when v_order.settled_at is null then 'pending' else 'available' end,
    p_amount_cents => -v_order.provider_amount_cents,
    p_order_id     => v_order.id,
    p_payment_id   => v_payment.id,
    p_description  => format('Estorno ao cliente: %s', coalesce(p_reason, 'sem motivo'))
  );

  return v_order;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 8. Funções — saque e webhook do gateway
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION pagora.attach_provider_wallet(p_provider_id uuid, p_wallet_id text, p_account_id text)
 RETURNS pagora.wallets
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_wallet pagora.wallets;
begin
  insert into pagora.wallets (provider_id, gateway, gateway_wallet_id, gateway_account_id)
  values (p_provider_id, 'asaas', p_wallet_id, p_account_id)
  on conflict (provider_id) do update
    set gateway_wallet_id  = excluded.gateway_wallet_id,
        gateway_account_id = excluded.gateway_account_id
  returning * into v_wallet;

  return v_wallet;
end;
$function$;

-- Reserva o saldo NA SOLICITAÇÃO, não na confirmação. Se reservasse só depois,
-- o prestador poderia pedir dois saques do mesmo dinheiro enquanto o primeiro
-- estivesse em trânsito.
CREATE OR REPLACE FUNCTION pagora.request_withdrawal(p_provider_id uuid, p_amount_cents integer, p_idempotency_key text, p_pix_key text DEFAULT NULL::text)
 RETURNS pagora.withdrawals
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_existing pagora.withdrawals;
  v_wallet   pagora.wallets;
  v_wd       pagora.withdrawals;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'invalid_amount: %', p_amount_cents;
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key_required';
  end if;

  select * into v_existing from pagora.withdrawals
   where provider_id = p_provider_id and idempotency_key = p_idempotency_key;
  if found then
    return v_existing;  -- repetição da MESMA requisição
  end if;

  select * into v_wallet from pagora.wallets
   where provider_id = p_provider_id
     for update;
  if not found then
    raise exception 'wallet_not_found';
  end if;

  if v_wallet.balance_cents < p_amount_cents then
    raise exception 'insufficient_balance: disponível %, pedido %',
      v_wallet.balance_cents, p_amount_cents;
  end if;

  insert into pagora.withdrawals (
    provider_id, amount_cents, status, pix_key, idempotency_key
  ) values (
    p_provider_id, p_amount_cents, 'requested',
    coalesce(p_pix_key, (select pix_key from pagora.providers where profile_id = p_provider_id)),
    p_idempotency_key
  )
  returning * into v_wd;

  -- Reserva imediata. Se este débito levasse o saldo a negativo,
  -- post_ledger_entry levanta insufficient_funds e a transação inteira volta.
  perform pagora.post_ledger_entry(
    p_provider_id   => p_provider_id,
    p_kind          => 'withdrawal',
    p_bucket        => 'available',
    p_amount_cents  => -p_amount_cents,
    p_withdrawal_id => v_wd.id,
    p_description   => 'Saque solicitado — saldo reservado'
  );

  update pagora.wallets
     set withdrawn_total_cents = withdrawn_total_cents + p_amount_cents
   where provider_id = p_provider_id;

  return v_wd;
end;
$function$;

CREATE OR REPLACE FUNCTION pagora.confirm_withdrawal(p_withdrawal_id uuid, p_transfer_id text DEFAULT NULL::text)
 RETURNS pagora.withdrawals
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_wd pagora.withdrawals;
begin
  select * into v_wd from pagora.withdrawals where id = p_withdrawal_id for update;
  if not found then
    raise exception 'withdrawal_not_found';
  end if;
  if v_wd.status = 'paid' then
    return v_wd;  -- reentrante
  end if;
  if v_wd.status not in ('requested', 'processing') then
    raise exception 'withdrawal_not_in_flight: %', v_wd.status;
  end if;

  -- Nenhum lançamento novo: o débito já ocorreu na solicitação.
  update pagora.withdrawals
     set status = 'paid', processed_at = now(),
         gateway_transfer_id = coalesce(p_transfer_id, gateway_transfer_id)
   where id = p_withdrawal_id
  returning * into v_wd;

  return v_wd;
end;
$function$;

CREATE OR REPLACE FUNCTION pagora.fail_withdrawal(p_withdrawal_id uuid, p_reason text)
 RETURNS pagora.withdrawals
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_wd pagora.withdrawals;
begin
  select * into v_wd from pagora.withdrawals where id = p_withdrawal_id for update;
  if not found then
    raise exception 'withdrawal_not_found';
  end if;
  if v_wd.status = 'failed' then
    return v_wd;  -- reentrante
  end if;
  if v_wd.status not in ('requested', 'processing') then
    raise exception 'withdrawal_not_in_flight: %', v_wd.status;
  end if;

  update pagora.withdrawals
     set status = 'failed', failed_at = now(), failure_reason = p_reason
   where id = p_withdrawal_id
  returning * into v_wd;

  -- Devolve a reserva. Lançamento próprio, não edição do débito original —
  -- o ledger é append-only e o histórico tem que mostrar o que aconteceu.
  perform pagora.post_ledger_entry(
    p_provider_id   => v_wd.provider_id,
    p_kind          => 'withdrawal_reversal',
    p_bucket        => 'available',
    p_amount_cents  => v_wd.amount_cents,
    p_withdrawal_id => v_wd.id,
    p_description   => format('Saque falhou: %s', coalesce(p_reason, 'sem motivo informado'))
  );

  update pagora.wallets
     set withdrawn_total_cents = greatest(withdrawn_total_cents - v_wd.amount_cents, 0)
   where provider_id = v_wd.provider_id;

  return v_wd;
end;
$function$;

-- Porta de entrada do webhook. `already_processed` deixa o chamador distinguir
-- "evento novo" de "reentrega", que é decisão dele, não do banco.
CREATE OR REPLACE FUNCTION pagora.record_payment_event(p_gateway_event_id text, p_event_type text, p_payload jsonb, p_payment_id uuid DEFAULT NULL::uuid, p_withdrawal_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(event_id uuid, already_processed boolean)
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_id        uuid;
  v_processed timestamptz;
begin
  insert into pagora.payment_events (
    gateway, gateway_event_id, event_type, payload, payment_id, withdrawal_id
  ) values (
    'asaas', p_gateway_event_id, p_event_type, p_payload, p_payment_id, p_withdrawal_id
  )
  on conflict (gateway, gateway_event_id) do nothing
  returning id into v_id;

  if v_id is not null then
    event_id := v_id;
    already_processed := false;
    return next;
    return;
  end if;

  select id, processed_at into v_id, v_processed
    from pagora.payment_events
   where gateway = 'asaas' and gateway_event_id = p_gateway_event_id;

  event_id := v_id;
  already_processed := v_processed is not null;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION pagora.mark_event_processed(p_event_id uuid, p_error text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
begin
  update pagora.payment_events
     set processed_at = case when p_error is null then now() else null end,
         process_error = p_error
   where id = p_event_id;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 9. Funções — admin, disputa, chat e auditoria
-- ---------------------------------------------------------------------------

-- Duas guardas que valem citar: admin não aprova o próprio cadastro, e a
-- carteira nasce junto com a aprovação — sem ela, o primeiro pagamento
-- recebido falharia em post_ledger_entry por wallet_not_found.
CREATE OR REPLACE FUNCTION pagora.approve_provider(p_provider_id uuid, p_approve boolean, p_reason text DEFAULT NULL::text)
 RETURNS pagora.providers
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_provider pagora.providers;
begin
  if not pagora.is_admin() then
    raise exception 'forbidden: admin only';
  end if;
  if p_provider_id = auth.uid() then
    raise exception 'forbidden: admin não aprova o próprio cadastro';
  end if;

  update pagora.providers
     set approved_at      = case when p_approve then now() else null end,
         rejected_at      = case when p_approve then null else now() end,
         rejection_reason = case when p_approve then null else p_reason end
   where profile_id = p_provider_id
  returning * into v_provider;

  if not found then
    raise exception 'provider_not_found';
  end if;

  -- Carteira existe a partir da aprovação: sem ela, nenhum lançamento é
  -- possível e `confirm_payment` falharia no primeiro pagamento recebido.
  if p_approve then
    insert into pagora.wallets (provider_id) values (p_provider_id)
    on conflict (provider_id) do nothing;
  end if;

  return v_provider;
end;
$function$;

CREATE OR REPLACE FUNCTION pagora.review_verification(p_verification_id uuid, p_approve boolean, p_notes text DEFAULT NULL::text)
 RETURNS pagora.account_verifications
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_row pagora.account_verifications;
begin
  if pagora.current_user_role() <> 'admin' then
    raise exception 'apenas admin' using errcode = '42501';
  end if;

  update pagora.account_verifications
     set status      = case when p_approve then 'approved' else 'rejected' end::pagora.verification_status,
         notes       = p_notes,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at  = now()
   where id = p_verification_id
     and status = 'in_review'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'verificação não encontrada ou já revisada' using errcode = 'P0002';
  end if;

  if p_approve and v_row.account_type = 'provider' then
    update pagora.profiles set role = 'provider', updated_at = now()
     where id = v_row.profile_id and role = 'client';
  end if;

  return v_row;
end;
$function$;

CREATE OR REPLACE FUNCTION pagora.set_profile_blocked(p_profile_id uuid, p_blocked boolean)
 RETURNS pagora.profiles
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_profile pagora.profiles;
begin
  if not pagora.is_admin() then
    raise exception 'forbidden: admin only';
  end if;
  if p_profile_id = auth.uid() then
    raise exception 'forbidden: admin não bloqueia a si mesmo';
  end if;

  update pagora.profiles
     set blocked_at = case when p_blocked then now() else null end
   where id = p_profile_id
  returning * into v_profile;

  if not found then
    raise exception 'profile_not_found';
  end if;
  return v_profile;
end;
$function$;

CREATE OR REPLACE FUNCTION pagora.respond_dispute(p_dispute_id uuid, p_response text, p_evidence text[] DEFAULT '{}'::text[])
 RETURNS pagora.disputes
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_dispute pagora.disputes;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  select d.* into v_dispute
    from pagora.disputes d
    join pagora.orders o on o.id = d.order_id
   where d.id = p_dispute_id and o.provider_id = auth.uid()
     for update of d;
  if not found then
    raise exception 'dispute_not_found_or_not_yours';
  end if;
  if v_dispute.status <> 'open' then
    raise exception 'dispute_already_answered';
  end if;

  update pagora.disputes
     set provider_response = p_response,
         provider_evidence_urls = coalesce(p_evidence, '{}'),
         responded_at = now(),
         status = 'responded'
   where id = p_dispute_id
  returning * into v_dispute;

  return v_dispute;
end;
$function$;

-- A resolução da disputa REUSA refund_order e settle_order em vez de mexer no
-- ledger por conta própria. É o que garante que dinheiro movido por decisão de
-- admin siga exatamente o mesmo caminho contábil do fluxo normal.
CREATE OR REPLACE FUNCTION pagora.resolve_dispute(p_dispute_id uuid, p_resolution pagora.dispute_status, p_notes text DEFAULT NULL::text)
 RETURNS pagora.disputes
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_dispute pagora.disputes;
  v_order   pagora.orders;
begin
  if not pagora.is_admin() then
    raise exception 'forbidden: admin only';
  end if;
  if p_resolution not in ('resolved_client', 'resolved_provider', 'resolved_split') then
    raise exception 'invalid_resolution: %', p_resolution;
  end if;

  select * into v_dispute from pagora.disputes where id = p_dispute_id for update;
  if not found then
    raise exception 'dispute_not_found';
  end if;
  if v_dispute.status in ('resolved_client', 'resolved_provider', 'resolved_split') then
    return v_dispute;  -- reentrante
  end if;

  select * into v_order from pagora.orders where id = v_dispute.order_id for update;

  if p_resolution = 'resolved_client' then
    -- Cliente ganhou: estorna e devolve a retenção.
    perform pagora.refund_order(v_order.id, auth.uid(), coalesce(p_notes, 'Disputa resolvida a favor do cliente'));
  else
    -- Prestador ganhou (ou split): libera o valor retido.
    perform pagora.settle_order(v_order.id, auth.uid());
  end if;

  update pagora.disputes
     set status = p_resolution,
         resolved_by = auth.uid(),
         resolved_at = now(),
         resolution_notes = p_notes,
         refund_cents = case when p_resolution = 'resolved_client'
                             then v_order.price_cents else 0 end
   where id = p_dispute_id
  returning * into v_dispute;

  return v_dispute;
end;
$function$;

CREATE OR REPLACE FUNCTION pagora.record_message_block(p_order_id uuid, p_sender_id uuid, p_kind text, p_excerpt text)
 RETURNS void
 LANGUAGE sql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
  insert into pagora.message_blocks (order_id, sender_id, kind, excerpt)
  values (p_order_id, p_sender_id, p_kind, left(p_excerpt, 120));
$function$;

-- Dossiê completo de um pedido para suporte e disputa. Remove `pix_qr_code`
-- e o `payload` da requisição: são volumosos e não ajudam a decidir nada.
CREATE OR REPLACE FUNCTION pagora.order_financial_trail(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
declare
  v_result jsonb;
begin
  if not pagora.is_admin() then
    raise exception 'forbidden: admin only';
  end if;

  select jsonb_build_object(
    'order', to_jsonb(o) - 'payload',
    'client', jsonb_build_object('id', cp.id, 'name', cp.full_name, 'phone', cp.phone),
    'provider', jsonb_build_object('id', pr.profile_id, 'name', pr.display_name),
    'payments', coalesce((
      select jsonb_agg(to_jsonb(p) - 'pix_qr_code' order by p.created_at)
        from pagora.payments p where p.order_id = o.id), '[]'::jsonb),
    'webhooks', coalesce((
      select jsonb_agg(jsonb_build_object(
               'event_type', e.event_type, 'received_at', e.created_at,
               'processed_at', e.processed_at, 'error', e.process_error)
             order by e.created_at)
        from pagora.payment_events e
        join pagora.payments p on p.id = e.payment_id
       where p.order_id = o.id), '[]'::jsonb),
    'ledger', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.created_at)
        from pagora.wallet_transactions t where t.order_id = o.id), '[]'::jsonb),
    'wallet', (select to_jsonb(w) from pagora.wallets w where w.provider_id = o.provider_id),
    'dispute', (select to_jsonb(d) from pagora.disputes d where d.order_id = o.id)
  ) into v_result
  from pagora.orders o
  join pagora.profiles  cp on cp.id = o.client_id
  join pagora.providers pr on pr.profile_id = o.provider_id
  where o.id = p_order_id;

  if v_result is null then
    raise exception 'order_not_found';
  end if;
  return v_result;
end;
$function$;

-- Reconciliação: devolve LINHAS só quando a carteira discorda do ledger.
-- Resultado vazio é o estado saudável. Vale rodar em cron e alertar em
-- qualquer linha devolvida.
CREATE OR REPLACE FUNCTION pagora.audit_wallet_integrity()
 RETURNS TABLE(provider_id uuid, bucket text, wallet_cents bigint, ledger_cents bigint)
 LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'pagora', 'public'
AS $function$
  with ledger as (
    select t.provider_id, t.bucket, sum(t.amount_cents)::bigint as total
      from pagora.wallet_transactions t
     group by t.provider_id, t.bucket
  )
  select w.provider_id, b.bucket,
         (case b.bucket when 'available' then w.balance_cents else w.pending_cents end)::bigint,
         coalesce(l.total, 0)
    from pagora.wallets w
    cross join (values ('available'), ('pending')) as b(bucket)
    left join ledger l on l.provider_id = w.provider_id and l.bucket = b.bucket
   where (case b.bucket when 'available' then w.balance_cents else w.pending_cents end)::bigint
         is distinct from coalesce(l.total, 0);
$function$;

-- ---------------------------------------------------------------------------
-- 10. Máquina de estados do pedido — o grafo como DADO
-- ---------------------------------------------------------------------------
-- `advance_order_status` consulta esta tabela para saber se a transição
-- existe. Mudar o fluxo é INSERT/DELETE aqui, não reescrever a função.
-- O que NÃO está listado é proibido por omissão: 'pending_payment' não vai
-- direto a 'completed', e pedido 'settled' ou 'refunded' não volta atrás.
insert into pagora.order_status_transitions (from_status, to_status, note) values
  ('pending_payment', 'paid',        'webhook do gateway confirmou a cobrança'),
  ('pending_payment', 'expired',     'Pix venceu sem pagamento'),
  ('pending_payment', 'cancelled',   'cliente ou prestador desistiu antes de pagar'),
  ('paid',            'en_route',    'prestador saiu para o atendimento'),
  ('paid',            'cancelled',   'cancelado após pagamento — exige estorno'),
  ('paid',            'refunded',    'estorno integral'),
  ('paid',            'disputed',    'cliente abriu disputa antes da execução'),
  ('en_route',        'in_progress', 'serviço começou'),
  ('en_route',        'cancelled',   'exige estorno'),
  ('en_route',        'disputed',    NULL),
  ('in_progress',     'completed',   'prestador concluiu; aguarda confirmação'),
  ('in_progress',     'disputed',    NULL),
  ('completed',       'settled',     'cliente confirmou — saldo liberado ao prestador'),
  ('completed',       'disputed',    'cliente contestou dentro do prazo'),
  ('disputed',        'settled',     'disputa resolvida a favor do prestador'),
  ('disputed',        'refunded',    'disputa resolvida a favor do cliente'),
  ('disputed',        'completed',   'disputa encerrada sem alteração financeira')
on conflict (from_status, to_status) do nothing;

-- ---------------------------------------------------------------------------
-- 11. View pública de avaliações
-- ---------------------------------------------------------------------------
-- Existe para expor nota e comentário SEM o client_id: quem avaliou não é
-- informação pública. A tabela `reviews` tem a coluna; a view não.
create or replace view pagora.provider_reviews_public as
  select id, provider_id, stars, comment, tags, created_at
    from pagora.reviews r;

-- ---------------------------------------------------------------------------
-- 12. Triggers
-- ---------------------------------------------------------------------------
drop trigger if exists account_verifications_set_updated_at on pagora.account_verifications;
create trigger account_verifications_set_updated_at before update on pagora.account_verifications
  for each row execute function pagora.set_updated_at();

drop trigger if exists payments_set_updated_at on pagora.payments;
create trigger payments_set_updated_at before update on pagora.payments
  for each row execute function pagora.set_updated_at();

drop trigger if exists withdrawals_set_updated_at on pagora.withdrawals;
create trigger withdrawals_set_updated_at before update on pagora.withdrawals
  for each row execute function pagora.set_updated_at();

-- Append-only no nível do banco. Trigger, não convenção: nem service_role
-- consegue editar uma linha do ledger.
drop trigger if exists wallet_tx_no_update on pagora.wallet_transactions;
create trigger wallet_tx_no_update before delete or update on pagora.wallet_transactions
  for each row execute function pagora.reject_ledger_mutation();

-- Nota do prestador recalculada pelo banco. Deixar isso para a aplicação
-- deixaria a nota errada sempre que uma avaliação fosse editada por outro
-- caminho.
drop trigger if exists reviews_refresh_rating on pagora.reviews;
create trigger reviews_refresh_rating after insert or delete or update on pagora.reviews
  for each row execute function pagora.refresh_provider_rating();

drop trigger if exists waitlist_rate_limit on pagora.waitlist;
create trigger waitlist_rate_limit before insert on pagora.waitlist
  for each row execute function pagora.enforce_public_form_rate_limit();

drop trigger if exists provider_apps_rate_limit on pagora.provider_applications;
create trigger provider_apps_rate_limit before insert on pagora.provider_applications
  for each row execute function pagora.enforce_public_form_rate_limit();

-- ---------------------------------------------------------------------------
-- 13. RLS
-- ---------------------------------------------------------------------------
alter table pagora.payments                 enable row level security;
alter table pagora.payments                 force row level security;
alter table pagora.payment_events           enable row level security;
alter table pagora.payment_events           force row level security;
alter table pagora.withdrawals              enable row level security;
alter table pagora.withdrawals              force row level security;
alter table pagora.messages                 enable row level security;
alter table pagora.messages                 force row level security;
alter table pagora.message_blocks           enable row level security;
alter table pagora.message_blocks           force row level security;
alter table pagora.account_verifications    enable row level security;
alter table pagora.account_verifications    force row level security;
alter table pagora.order_status_transitions enable row level security;
alter table pagora.order_status_transitions force row level security;

-- ---------------------------------------------------------------------------
-- 13a. Policies REMOVIDAS pela migration órfã rls_hardening
-- ---------------------------------------------------------------------------
-- Estas seis vinham da 0002 e não existem mais no banco. O endurecimento tirou
-- o UPDATE direto em tabela e moveu cada operação para uma RPC SECURITY
-- DEFINER, onde a regra de negócio é aplicada antes da escrita:
--
--   orders_update_party    -> advance_order_status()  (valida a transição)
--   profiles_admin_update  -> set_profile_blocked()   (admin não bloqueia a si)
--   providers_admin_update -> approve_provider()      (admin não se aprova)
--   disputes_party_update  -> respond_dispute() / resolve_dispute()
--   quotes_client_view     -- marcar cotação como vista virou trabalho do app
--   reviews_public_read    -> reviews_read_party      (avaliação deixou de ser
--                                                      legível por qualquer um)
--
-- Sem estes DROPs, aplicar 0002 e depois este arquivo deixaria as policies
-- largas no lugar e o endurecimento não teria efeito.
drop policy if exists orders_update_party    on pagora.orders;
drop policy if exists profiles_admin_update  on pagora.profiles;
drop policy if exists providers_admin_update on pagora.providers;
drop policy if exists disputes_party_update  on pagora.disputes;
drop policy if exists quotes_client_view     on pagora.quotes;
drop policy if exists reviews_public_read    on pagora.reviews;

-- ---------------------------------------------------------------------------
-- 13b. Policies novas
-- ---------------------------------------------------------------------------
-- `payments`, `withdrawals` e `payment_events` são SELECT-only para o usuário:
-- toda escrita passa pelas RPCs. `message_blocks` fica sem policy alguma —
-- é registro de moderação, e nem o autor da tentativa deve conseguir lê-lo.

drop policy if exists payments_select_party on pagora.payments;
create policy payments_select_party on pagora.payments for select to authenticated
  using (((client_id = auth.uid()) OR (provider_id = auth.uid()) OR pagora.is_admin()));

drop policy if exists withdrawals_select_own on pagora.withdrawals;
create policy withdrawals_select_own on pagora.withdrawals for select to authenticated
  using (((provider_id = auth.uid()) OR pagora.is_admin()));

drop policy if exists payment_events_admin_only on pagora.payment_events;
create policy payment_events_admin_only on pagora.payment_events for select to authenticated
  using (pagora.is_admin());

drop policy if exists messages_participant_select on pagora.messages;
create policy messages_participant_select on pagora.messages for select to authenticated
  using (pagora.is_order_participant(order_id, auth.uid()));

drop policy if exists messages_participant_insert on pagora.messages;
create policy messages_participant_insert on pagora.messages for insert to authenticated
  with check (((sender_id = auth.uid()) AND pagora.is_order_participant(order_id, auth.uid())));

-- Só o destinatário marca como lida — `sender_id <> auth.uid()` impede que o
-- remetente marque a própria mensagem e falseie o "visto".
drop policy if exists messages_recipient_mark_read on pagora.messages;
create policy messages_recipient_mark_read on pagora.messages for update to authenticated
  using ((pagora.is_order_participant(order_id, auth.uid()) AND (sender_id <> auth.uid())))
  with check ((pagora.is_order_participant(order_id, auth.uid()) AND (sender_id <> auth.uid())));

drop policy if exists account_verifications_select_self on pagora.account_verifications;
create policy account_verifications_select_self on pagora.account_verifications for select to public
  using (((profile_id = auth.uid()) OR (pagora.current_user_role() = 'admin'::pagora.user_role)));

drop policy if exists account_verifications_insert_self on pagora.account_verifications;
create policy account_verifications_insert_self on pagora.account_verifications for insert to public
  with check ((profile_id = auth.uid()));

-- O grafo de transições é público para quem está logado: o app precisa dele
-- para saber quais botões mostrar.
drop policy if exists order_transitions_read on pagora.order_status_transitions;
create policy order_transitions_read on pagora.order_status_transitions for select to authenticated
  using (true);

-- Avaliação deixou de ser legível por qualquer autenticado.
drop policy if exists reviews_read_party on pagora.reviews;
create policy reviews_read_party on pagora.reviews for select to authenticated
  using (((client_id = auth.uid()) OR (provider_id = auth.uid()) OR pagora.is_admin()));

-- ---------------------------------------------------------------------------
-- 14. Grants de execução
-- ---------------------------------------------------------------------------
-- A separação aqui é a linha de defesa mais importante do financeiro:
--
--   service_role  → tudo que MOVE DINHEIRO. O frontend não alcança estas
--                   funções nem com sessão válida; elas só rodam a partir de
--                   uma Edge Function ou backend com a chave de serviço.
--                   Mesmo que alguém forje uma chamada com a anon key, o
--                   PostgREST recusa antes de entrar na função.
--
--   authenticated → funções que checam permissão POR DENTRO (is_admin(),
--                   dono do recurso). Aqui a trava é o corpo da função, não
--                   o grant.
--
-- Um grant a mais na primeira lista transformaria o ledger em API pública.

revoke all on function pagora.prepare_payment(uuid, uuid) from public, authenticated;
grant execute on function pagora.prepare_payment(uuid, uuid) to service_role;

revoke all on function pagora.confirm_payment(uuid, integer, integer, text) from public, authenticated;
grant execute on function pagora.confirm_payment(uuid, integer, integer, text) to service_role;

revoke all on function pagora.attach_gateway_payment(uuid, text, text, text, text, timestamptz) from public, authenticated;
grant execute on function pagora.attach_gateway_payment(uuid, text, text, text, text, timestamptz) to service_role;

revoke all on function pagora.settle_order(uuid, uuid) from public, authenticated;
grant execute on function pagora.settle_order(uuid, uuid) to service_role;

revoke all on function pagora.refund_order(uuid, uuid, text) from public, authenticated;
grant execute on function pagora.refund_order(uuid, uuid, text) to service_role;

revoke all on function pagora.advance_order_status(uuid, pagora.order_status, uuid, text) from public, authenticated;
grant execute on function pagora.advance_order_status(uuid, pagora.order_status, uuid, text) to service_role;

revoke all on function pagora.request_withdrawal(uuid, integer, text, text) from public, authenticated;
grant execute on function pagora.request_withdrawal(uuid, integer, text, text) to service_role;

revoke all on function pagora.confirm_withdrawal(uuid, text) from public, authenticated;
grant execute on function pagora.confirm_withdrawal(uuid, text) to service_role;

revoke all on function pagora.fail_withdrawal(uuid, text) from public, authenticated;
grant execute on function pagora.fail_withdrawal(uuid, text) to service_role;

revoke all on function pagora.post_ledger_entry(uuid, pagora.wallet_tx_kind, text, integer, uuid, uuid, uuid, text, text) from public, authenticated;
grant execute on function pagora.post_ledger_entry(uuid, pagora.wallet_tx_kind, text, integer, uuid, uuid, uuid, text, text) to service_role;

revoke all on function pagora.record_payment_event(text, text, jsonb, uuid, uuid) from public, authenticated;
grant execute on function pagora.record_payment_event(text, text, jsonb, uuid, uuid) to service_role;

revoke all on function pagora.mark_event_processed(uuid, text) from public, authenticated;
grant execute on function pagora.mark_event_processed(uuid, text) to service_role;

revoke all on function pagora.attach_provider_wallet(uuid, text, text) from public, authenticated;
grant execute on function pagora.attach_provider_wallet(uuid, text, text) to service_role;

-- Estas checam permissão por dentro, então podem ser chamadas pelo app.
revoke all on function pagora.approve_provider(uuid, boolean, text) from public;
grant execute on function pagora.approve_provider(uuid, boolean, text) to authenticated;

revoke all on function pagora.review_verification(uuid, boolean, text) from public;
grant execute on function pagora.review_verification(uuid, boolean, text) to authenticated;

revoke all on function pagora.set_profile_blocked(uuid, boolean) from public;
grant execute on function pagora.set_profile_blocked(uuid, boolean) to authenticated;

revoke all on function pagora.respond_dispute(uuid, text, text[]) from public;
grant execute on function pagora.respond_dispute(uuid, text, text[]) to authenticated;

revoke all on function pagora.resolve_dispute(uuid, pagora.dispute_status, text) from public;
grant execute on function pagora.resolve_dispute(uuid, pagora.dispute_status, text) to authenticated;

revoke all on function pagora.order_financial_trail(uuid) from public;
grant execute on function pagora.order_financial_trail(uuid) to authenticated;

revoke all on function pagora.audit_wallet_integrity() from public;
grant execute on function pagora.audit_wallet_integrity() to authenticated;

revoke all on function pagora.is_order_participant(uuid, uuid) from public;
grant execute on function pagora.is_order_participant(uuid, uuid) to authenticated, service_role;

revoke all on function pagora.record_message_block(uuid, uuid, text, text) from public;
grant execute on function pagora.record_message_block(uuid, uuid, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 15. Realtime
-- ---------------------------------------------------------------------------
-- Só `messages` entra: o chat precisa de entrega ao vivo. `payments`,
-- `withdrawals` e `wallet_transactions` ficam de fora de propósito — Realtime
-- entrega a linha inteira, e valor e referência do gateway não devem trafegar
-- por assinatura. O app consulta essas tabelas sob demanda.
do $$ begin
  alter publication supabase_realtime add table pagora.messages;
exception when duplicate_object then null; end $$;
