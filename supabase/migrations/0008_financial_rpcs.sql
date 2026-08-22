-- ============================================================================
-- PAGORA — 0008: funções financeiras server-side
-- ============================================================================
-- Tudo aqui é SECURITY DEFINER e concedido APENAS a `service_role`, com uma
-- exceção justificada (`accept_quote`, que não move dinheiro).
--
-- O motivo de o browser não chamar estas funções diretamente: elas recebem o
-- ator como parâmetro. Quem valida o JWT e determina quem é o ator é a Edge
-- Function. Assim existe uma porta só, e ela fica do lado do servidor.
--
-- Convenção de erro: `raise exception ... using errcode` com SQLSTATE próprio,
-- para a Edge Function distinguir "regra de negócio" de "falha de infra" sem
-- fazer match em string de mensagem.
--   P0001 → violação de regra de negócio (default do raise)
--   PGRST → nunca usado aqui
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Constante de comissão. Basis points para não haver fração perdida:
-- 1500 bps = 15,00%.
-- ---------------------------------------------------------------------------
create or replace function pagora.platform_fee_bps()
returns int language sql immutable as $$ select 1500 $$;

comment on function pagora.platform_fee_bps() is
  'Comissão da PAGORA em basis points. Espelhado em src/domains/money.ts (PLATFORM_FEE_BPS).';

-- ---------------------------------------------------------------------------
-- Decomposição financeira canônica.
--
-- `round((gross::numeric * bps) / 10000)` usa aritmética decimal exata do
-- Postgres. O espelho em TypeScript (`percentOfCents`) usa (x * 15) / 100 com
-- numerador inteiro pelo mesmo motivo: os dois têm que arredondar half-up no
-- mesmo ponto, senão o ledger diverge do que o gateway cobrou.
--
-- A taxa do gateway NÃO entra aqui: ela é custo da plataforma. O prestador
-- recebe bruto − comissão, valor previsível e independente do meio de
-- pagamento escolhido pelo cliente.
-- ---------------------------------------------------------------------------
create or replace function pagora.compute_amounts(p_gross_cents int)
returns table (platform_fee_cents int, provider_amount_cents int)
language plpgsql immutable as $$
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
$$;

-- ---------------------------------------------------------------------------
-- accept_quote — REESCRITA
--
-- A versão da 0001 inseria a order sem `provider_amount_cents`, que a 0007
-- tornou parte da constraint `orders_money_balances`. Sem esta reescrita,
-- aceitar proposta passaria a falhar. Aproveitamos para fechar duas brechas:
--   • a quote precisa estar dentro da validade;
--   • o prestador precisa continuar aprovado no momento do aceite.
-- ---------------------------------------------------------------------------
create or replace function pagora.accept_quote(p_quote_id uuid)
returns pagora.orders
security definer set search_path = pagora, public
language plpgsql as $$
declare
  v_quote   pagora.quotes;
  v_request pagora.service_requests;
  v_order   pagora.orders;
  v_fee     int;
  v_net     int;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  -- FOR UPDATE trava a linha até o commit: duas requisições simultâneas de
  -- "aceitar" a mesma proposta serializam, e a segunda encontra status
  -- 'accepted' e falha no filtro.
  select * into v_quote
    from pagora.quotes
   where id = p_quote_id and status in ('pending', 'sent')
     for update;
  if not found then
    raise exception 'quote_not_found_or_already_resolved';
  end if;

  if v_quote.expires_at <= now() then
    raise exception 'quote_expired';
  end if;

  select * into v_request
    from pagora.service_requests
   where id = v_quote.request_id
     for update;

  if v_request.client_id <> auth.uid() then
    raise exception 'forbidden: not your request';
  end if;
  if v_request.status not in ('open', 'quoting') then
    raise exception 'request_not_open';
  end if;

  if not exists (
    select 1 from pagora.providers
     where profile_id = v_quote.provider_id and approved_at is not null
  ) then
    raise exception 'provider_not_approved';
  end if;

  select c.platform_fee_cents, c.provider_amount_cents
    into v_fee, v_net
    from pagora.compute_amounts(v_quote.price_cents) c;

  update pagora.quotes set status = 'accepted', accepted_at = now() where id = p_quote_id;
  update pagora.quotes set status = 'rejected', rejected_at = now()
   where request_id = v_quote.request_id
     and id <> p_quote_id
     and status in ('pending', 'sent');
  update pagora.service_requests set status = 'accepted' where id = v_request.id;

  insert into pagora.orders (
    quote_id, request_id, client_id, provider_id,
    price_cents, platform_fee_cents, provider_amount_cents, status
  ) values (
    v_quote.id, v_quote.request_id, v_request.client_id, v_quote.provider_id,
    v_quote.price_cents, v_fee, v_net, 'pending_payment'
  )
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function pagora.accept_quote(uuid) from public;
grant execute on function pagora.accept_quote(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- post_ledger_entry — o ÚNICO caminho para mexer em saldo
--
-- Trava a carteira (FOR UPDATE), lê o saldo do bucket, grava o lançamento com
-- before/after e materializa o novo saldo em `wallets`. Saldo e ledger mudam
-- na mesma transação, sempre; é isso que impede o saldo de existir sem
-- lastro contábil.
-- ---------------------------------------------------------------------------
create or replace function pagora.post_ledger_entry(
  p_provider_id   uuid,
  p_kind          pagora.wallet_tx_kind,
  p_bucket        text,
  p_amount_cents  int,
  p_order_id      uuid default null,
  p_payment_id    uuid default null,
  p_withdrawal_id uuid default null,
  p_description   text default null,
  p_gateway_ref   text default null
) returns pagora.wallet_transactions
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

revoke all on function pagora.post_ledger_entry(uuid, pagora.wallet_tx_kind, text, int, uuid, uuid, uuid, text, text) from public, authenticated, anon;

-- ---------------------------------------------------------------------------
-- advance_order_status — máquina de estados com autorização por transição
--
-- Duas checagens independentes:
--   1. a transição existe em `order_status_transitions` (o caminho é legal)
--   2. o ator tem o papel certo PARA AQUELA transição (quem pode fazer)
-- Separar as duas evita o erro clássico de permitir um caminho válido para a
-- pessoa errada — por exemplo o prestador declarando que o cliente confirmou.
-- ---------------------------------------------------------------------------
create or replace function pagora.advance_order_status(
  p_order_id  uuid,
  p_to_status pagora.order_status,
  p_actor_id  uuid,
  p_reason    text default null
) returns pagora.orders
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

revoke all on function pagora.advance_order_status(uuid, pagora.order_status, uuid, text) from public, authenticated, anon;

-- ---------------------------------------------------------------------------
-- prepare_payment — cria a cobrança a partir do QUOTE, nunca de um valor
--                   enviado pelo cliente
--
-- O frontend manda `orderId`. Tudo que é dinheiro sai daqui:
--   preço      → da order (que copiou da quote aceita)
--   comissão   → de compute_amounts()
--   líquido    → bruto − comissão
--
-- Se a Edge Function receber `{ amount: 4.38 }` no corpo, esse número não
-- chega a lugar nenhum: não existe parâmetro para ele.
-- ---------------------------------------------------------------------------
create or replace function pagora.prepare_payment(
  p_order_id uuid,
  p_actor_id uuid
) returns pagora.payments
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

revoke all on function pagora.prepare_payment(uuid, uuid) from public, authenticated, anon;

-- ---------------------------------------------------------------------------
-- attach_gateway_payment — grava o que voltou do Asaas na cobrança
-- ---------------------------------------------------------------------------
create or replace function pagora.attach_gateway_payment(
  p_payment_id  uuid,
  p_gateway_id  text,
  p_pix_payload text,
  p_pix_qr_code text,
  p_invoice_url text,
  p_expires_at  timestamptz
) returns pagora.payments
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

revoke all on function pagora.attach_gateway_payment(uuid, text, text, text, text, timestamptz) from public, authenticated, anon;

-- ---------------------------------------------------------------------------
-- record_payment_event — grava o webhook ANTES de processar
--
-- Devolve `already_processed = true` quando o evento já existe e já foi
-- aplicado. A Edge Function usa isso para responder 200 sem repetir efeito.
-- A trava real é a unique(gateway, gateway_event_id) — o ON CONFLICT abaixo só
-- transforma a violação em resposta, em vez de erro.
-- ---------------------------------------------------------------------------
create or replace function pagora.record_payment_event(
  p_gateway_event_id text,
  p_event_type       text,
  p_payload          jsonb,
  p_payment_id       uuid default null,
  p_withdrawal_id    uuid default null
) returns table (event_id uuid, already_processed boolean)
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

revoke all on function pagora.record_payment_event(text, text, jsonb, uuid, uuid) from public, authenticated, anon;

-- ---------------------------------------------------------------------------
-- confirm_payment — aplica o recebimento: order → paid e dinheiro em PENDING
--
-- O valor NÃO cai como disponível. O prestador ainda não executou o serviço.
-- Mesmo que o Asaas já tenha feito o split para a subconta dele, internamente
-- o valor está retido: `settle_order()` é que libera.
--
-- Validação antifraude do webhook: `p_amount_cents` é o valor que o gateway
-- diz ter recebido, e precisa bater com o que foi cobrado. Um webhook forjado
-- com valor divergente é rejeitado aqui, não aceito e conciliado depois.
-- ---------------------------------------------------------------------------
create or replace function pagora.confirm_payment(
  p_payment_id       uuid,
  p_amount_cents     int,
  p_gateway_fee_cents int default 0,
  p_gateway_ref      text default null
) returns pagora.payments
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

revoke all on function pagora.confirm_payment(uuid, int, int, text) from public, authenticated, anon;

-- ---------------------------------------------------------------------------
-- settle_order — cliente confirma a conclusão e o dinheiro é LIBERADO
--
-- Este é o momento em que "recebido" vira "sacável". Par de lançamentos:
-- débito em pending + crédito em available. Os dois na mesma transação.
-- ---------------------------------------------------------------------------
create or replace function pagora.settle_order(
  p_order_id uuid,
  p_actor_id uuid
) returns pagora.orders
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

revoke all on function pagora.settle_order(uuid, uuid) from public, authenticated, anon;

-- ---------------------------------------------------------------------------
-- request_withdrawal — saque com saldo RESERVADO na hora do pedido
--
-- O débito acontece agora, não na confirmação do gateway. Se a transferência
-- falhar, `fail_withdrawal()` devolve o valor. A ordem inversa (debitar só na
-- confirmação) permitiria dois saques simultâneos passarem pela checagem de
-- saldo antes de qualquer débito.
--
-- Três travas contra duplicidade:
--   1. unique (provider_id, idempotency_key)
--   2. unique parcial: um saque 'requested'/'processing' por prestador
--   3. FOR UPDATE na carteira dentro de post_ledger_entry
-- ---------------------------------------------------------------------------
create or replace function pagora.request_withdrawal(
  p_provider_id     uuid,
  p_amount_cents    int,
  p_idempotency_key text,
  p_pix_key         text default null
) returns pagora.withdrawals
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

revoke all on function pagora.request_withdrawal(uuid, int, text, text) from public, authenticated, anon;

-- ---------------------------------------------------------------------------
-- confirm_withdrawal / fail_withdrawal — resultado do gateway
-- ---------------------------------------------------------------------------
create or replace function pagora.confirm_withdrawal(
  p_withdrawal_id uuid,
  p_transfer_id   text default null
) returns pagora.withdrawals
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

create or replace function pagora.fail_withdrawal(
  p_withdrawal_id uuid,
  p_reason        text
) returns pagora.withdrawals
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

revoke all on function pagora.confirm_withdrawal(uuid, text) from public, authenticated, anon;
revoke all on function pagora.fail_withdrawal(uuid, text) from public, authenticated, anon;

-- ---------------------------------------------------------------------------
-- refund_order — estorno integral, com devolução do que estava retido
-- ---------------------------------------------------------------------------
create or replace function pagora.refund_order(
  p_order_id uuid,
  p_actor_id uuid,
  p_reason   text default null
) returns pagora.orders
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

revoke all on function pagora.refund_order(uuid, uuid, text) from public, authenticated, anon;

-- ---------------------------------------------------------------------------
-- respond_dispute — substitui a policy de UPDATE removida na 0006
-- ---------------------------------------------------------------------------
create or replace function pagora.respond_dispute(
  p_dispute_id uuid,
  p_response   text,
  p_evidence   text[] default '{}'
) returns pagora.disputes
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

revoke all on function pagora.respond_dispute(uuid, text, text[]) from public;
grant execute on function pagora.respond_dispute(uuid, text, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- attach_provider_wallet — vincula a subconta do Asaas ao prestador
--
-- Só `gateway_wallet_id` e `gateway_account_id` moram no banco. A API key da
-- subconta, que o Asaas devolve UMA ÚNICA VEZ na criação, NÃO é persistida
-- aqui: ela vive no cofre de secrets da Edge Function. Guardá-la em coluna
-- legível por RLS transformaria um bug de policy em vazamento de credencial.
-- ---------------------------------------------------------------------------
create or replace function pagora.attach_provider_wallet(
  p_provider_id uuid,
  p_wallet_id   text,
  p_account_id  text
) returns pagora.wallets
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

revoke all on function pagora.attach_provider_wallet(uuid, text, text) from public, authenticated, anon;

-- ---------------------------------------------------------------------------
-- mark_event_processed — fecha o ciclo do webhook
-- ---------------------------------------------------------------------------
create or replace function pagora.mark_event_processed(
  p_event_id uuid,
  p_error    text default null
) returns void
security definer set search_path = pagora, public
language plpgsql as $$
begin
  update pagora.payment_events
     set processed_at = case when p_error is null then now() else null end,
         process_error = p_error
   where id = p_event_id;
end;
$$;

revoke all on function pagora.mark_event_processed(uuid, text) from public, authenticated, anon;

-- ===========================================================================
-- Ações administrativas
-- ===========================================================================
-- A 0006 removeu `providers_admin_update` e `profiles_admin_update`, que eram
-- policies de UPDATE amplas: quem tivesse role='admin' podia escrever qualquer
-- coluna de qualquer prestador, inclusive `rating_avg`. As três funções
-- abaixo devolvem essas capacidades de forma nomeada e auditável — sem elas o
-- fluxo trava, porque prestador não aprovado não recebe pedido nem saca.
-- ---------------------------------------------------------------------------
create or replace function pagora.approve_provider(
  p_provider_id uuid,
  p_approve     boolean,
  p_reason      text default null
) returns pagora.providers
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

revoke all on function pagora.approve_provider(uuid, boolean, text) from public;
grant execute on function pagora.approve_provider(uuid, boolean, text) to authenticated;

create or replace function pagora.set_profile_blocked(
  p_profile_id uuid,
  p_blocked    boolean
) returns pagora.profiles
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

revoke all on function pagora.set_profile_blocked(uuid, boolean) from public;
grant execute on function pagora.set_profile_blocked(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- resolve_dispute — decisão do admin, com o efeito financeiro correspondente
--
-- Substitui a policy que deixava o próprio prestador escrever `refund_cents`
-- e `status`. A decisão e a movimentação de dinheiro acontecem na MESMA
-- transação: não existe estado em que a disputa está resolvida a favor do
-- cliente e o estorno "ainda vai ser feito".
-- ---------------------------------------------------------------------------
create or replace function pagora.resolve_dispute(
  p_dispute_id uuid,
  p_resolution pagora.dispute_status,
  p_notes      text default null
) returns pagora.disputes
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

revoke all on function pagora.resolve_dispute(uuid, pagora.dispute_status, text) from public;
grant execute on function pagora.resolve_dispute(uuid, pagora.dispute_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- order_financial_trail — a pergunta que o admin precisa responder:
-- "onde está o dinheiro deste pedido?"
-- ---------------------------------------------------------------------------
create or replace function pagora.order_financial_trail(p_order_id uuid)
returns jsonb
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

revoke all on function pagora.order_financial_trail(uuid) from public;
grant execute on function pagora.order_financial_trail(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Conferência de integridade: saldo materializado x soma do ledger.
-- Rodar em job/admin. Retorna vazio quando está tudo fechado.
-- ---------------------------------------------------------------------------
create or replace function pagora.audit_wallet_integrity()
returns table (provider_id uuid, bucket text, wallet_cents bigint, ledger_cents bigint)
security definer set search_path = pagora, public
language sql stable as $$
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
$$;

revoke all on function pagora.audit_wallet_integrity() from public;
grant execute on function pagora.audit_wallet_integrity() to authenticated;

-- ---------------------------------------------------------------------------
-- Concessões finais: só service_role abre estas portas.
-- ---------------------------------------------------------------------------
grant execute on function pagora.post_ledger_entry(uuid, pagora.wallet_tx_kind, text, int, uuid, uuid, uuid, text, text) to service_role;
grant execute on function pagora.advance_order_status(uuid, pagora.order_status, uuid, text) to service_role;
grant execute on function pagora.prepare_payment(uuid, uuid) to service_role;
grant execute on function pagora.attach_gateway_payment(uuid, text, text, text, text, timestamptz) to service_role;
grant execute on function pagora.record_payment_event(text, text, jsonb, uuid, uuid) to service_role;
grant execute on function pagora.confirm_payment(uuid, int, int, text) to service_role;
grant execute on function pagora.settle_order(uuid, uuid) to service_role;
grant execute on function pagora.request_withdrawal(uuid, int, text, text) to service_role;
grant execute on function pagora.confirm_withdrawal(uuid, text) to service_role;
grant execute on function pagora.fail_withdrawal(uuid, text) to service_role;
grant execute on function pagora.refund_order(uuid, uuid, text) to service_role;
grant execute on function pagora.attach_provider_wallet(uuid, text, text) to service_role;
grant execute on function pagora.mark_event_processed(uuid, text) to service_role;
grant execute on function pagora.compute_amounts(int) to service_role, authenticated;
