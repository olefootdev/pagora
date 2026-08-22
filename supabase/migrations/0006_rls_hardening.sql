-- ============================================================================
-- PAGORA — 0005: hardening de RLS antes de existir dinheiro no sistema
-- ============================================================================
-- Auditoria da 0002 encontrou quatro problemas que permitiriam a um usuário
-- autenticado comum manipular valores financeiros direto pelo PostgREST,
-- sem passar por nenhuma função:
--
--  [C1] `orders_update_party` — FOR UPDATE liberado para cliente e prestador
--       sobre TODAS as colunas. O cliente podia zerar `platform_fee_cents`,
--       reescrever `price_cents` e pular a máquina de estados escrevendo
--       `status = 'completed'` sem nunca ter pago.
--
--  [C2] `quotes_client_view` — o nome sugere marcar proposta como vista, mas a
--       policy é FOR UPDATE sem restrição de coluna. O cliente podia baixar o
--       `price_cents` de qualquer proposta do próprio pedido para R$ 0,01 e
--       depois aceitá-la — `accept_quote()` copia o preço que estiver na linha.
--
--  [C3] `disputes_party_update` — prestador (e "admin", checado só por policy)
--       podia escrever `status`, `refund_cents`, `penalty_cents` e
--       `resolved_at`, isto é, resolver a própria disputa a seu favor.
--
--  [C4] Os `revoke update (coluna)` da 0002 NÃO surtem efeito. A 0001 rodou
--       `alter default privileges ... grant all on tables to authenticated`,
--       então todo mundo tem UPDATE em nível de TABELA. No Postgres, privilégio
--       de tabela e de coluna são independentes: revogar a coluna não remove o
--       acesso concedido pela tabela. O padrão correto — usado aqui — é
--       revogar no nível da tabela e reconceder apenas as colunas permitidas.
--
-- Princípio aplicado: o browser nunca escreve dinheiro nem estado. Toda
-- transição crítica passa por função SECURITY DEFINER (migration 0008).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- [C4] Base: derruba os privilégios amplos herdados do default privileges.
-- Sem isso, qualquer policy permissiva vira escrita irrestrita de coluna.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on all tables in schema pagora from authenticated;
revoke insert, update, delete on all tables in schema pagora from anon;

-- Novas tabelas não devem voltar a nascer com GRANT ALL.
alter default privileges in schema pagora revoke all on tables from authenticated;
alter default privileges in schema pagora revoke all on tables from anon;
alter default privileges in schema pagora grant select on tables to authenticated;

-- Formulários públicos (0003/0004) precisam do insert de volta — são as duas
-- únicas superfícies de escrita anônima e nenhuma delas toca dinheiro.
grant insert on pagora.waitlist to anon, authenticated;
grant insert on pagora.provider_applications to anon, authenticated;

-- ===========================================================================
-- profiles — o usuário edita o próprio cadastro, e só ele
-- ===========================================================================
grant update (full_name, email, cpf, avatar_url, city, state, onboarded_at)
  on pagora.profiles to authenticated;
-- `role`, `phone`, `blocked_at`, `id` ficam de fora de propósito:
--   role      → escalonamento de privilégio (virar 'admin')
--   phone     → é a identidade de login, vem do auth.users
--   blocked_at→ usuário se desbloquearia sozinho

-- Admin não escreve por REST: a policy antiga dava UPDATE amplo a quem tivesse
-- role='admin'. Passa a ser função dedicada (0008), auditável.
drop policy if exists profiles_admin_update on pagora.profiles;

-- ===========================================================================
-- providers — cadastro próprio; aprovação e rating são do sistema
-- ===========================================================================
grant insert (profile_id, display_name, bio, cnh_number, cnh_category, services,
              vehicle_type, vehicle_plate, vehicle_model, vehicle_year, vehicle_color,
              capacity_kg, service_areas, pix_key, bank_name, bank_agency,
              bank_account, selfie_url, doc_url)
  on pagora.providers to authenticated;

grant update (display_name, bio, cnh_number, cnh_category, services, vehicle_type,
              vehicle_plate, vehicle_model, vehicle_year, vehicle_color, capacity_kg,
              service_areas, pix_key, bank_name, bank_agency, bank_account,
              selfie_url, doc_url)
  on pagora.providers to authenticated;
-- Fora da lista: approved_at / rejected_at / rejection_reason (auto-aprovação),
-- rating_avg / rating_count (auto-elogio), e as colunas de gateway da 0007.

drop policy if exists providers_admin_update on pagora.providers;

-- ===========================================================================
-- service_requests — o cliente edita o pedido, não o estado dele
-- ===========================================================================
grant insert (client_id, service, payload, origin_city, origin_state,
              dest_city, dest_state, scheduled_for,
              estimate_low_cents, estimate_high_cents, estimate_breakdown)
  on pagora.service_requests to authenticated;

grant update (payload, origin_city, origin_state, dest_city, dest_state,
              scheduled_for, estimate_low_cents, estimate_high_cents,
              estimate_breakdown)
  on pagora.service_requests to authenticated;
-- `status` e `expires_at` saem: quem move o pedido de 'open' → 'accepted' é
-- `accept_quote()`. Um cliente que pudesse reabrir um pedido aceito geraria
-- duas orders para a mesma solicitação.

-- Cliente só edita enquanto ninguém fechou negócio.
drop policy if exists requests_client_update on pagora.service_requests;
create policy requests_client_update on pagora.service_requests
  for update to authenticated
  using (client_id = auth.uid() and status in ('open', 'quoting'))
  with check (client_id = auth.uid() and status in ('open', 'quoting'));

-- ===========================================================================
-- quotes — [C2] o cliente perde qualquer escrita
-- ===========================================================================
drop policy if exists quotes_client_view on pagora.quotes;

grant insert (request_id, provider_id, price_cents, eta_minutes, notes, includes)
  on pagora.quotes to authenticated;

grant update (price_cents, eta_minutes, notes, includes)
  on pagora.quotes to authenticated;
-- `status`, `accepted_at`, `rejected_at` e `viewed_at` são do sistema.

-- Insert do prestador: só em pedido aberto, só em nome próprio, e a proposta
-- nasce obrigatoriamente em 'pending' (o default da coluna, agora que o
-- prestador não pode escrever `status`).
drop policy if exists quotes_provider_insert on pagora.quotes;
create policy quotes_provider_insert on pagora.quotes
  for insert to authenticated
  with check (
    provider_id = auth.uid()
    and pagora.is_provider()
    and exists (
      select 1 from pagora.service_requests sr
      where sr.id = request_id
        and sr.status in ('open', 'quoting')
        and sr.expires_at > now()
    )
  );

-- Prestador reajusta o próprio preço enquanto a proposta está viva. Depois de
-- aceita, a linha congela — e a order guardou a própria cópia do preço.
drop policy if exists quotes_provider_update on pagora.quotes;
create policy quotes_provider_update on pagora.quotes
  for update to authenticated
  using (provider_id = auth.uid() and status in ('pending', 'sent'))
  with check (provider_id = auth.uid() and status in ('pending', 'sent'));

-- ===========================================================================
-- orders — [C1] nenhuma escrita direta. Ponto.
-- ===========================================================================
drop policy if exists orders_update_party on pagora.orders;
-- Sem policy de INSERT/UPDATE/DELETE e sem GRANT: `orders` é somente-leitura
-- via PostgREST. Toda transição vem de `pagora.advance_order_status()` e das
-- Edge Functions. A leitura continua restrita às partes:
--   orders_select_party (0002) → client_id = uid or provider_id = uid or admin

-- ===========================================================================
-- reviews — impede envenenar a nota de um prestador que não te atendeu
-- ===========================================================================
grant insert (order_id, client_id, provider_id, stars, comment, tags)
  on pagora.reviews to authenticated;

drop policy if exists reviews_client_insert on pagora.reviews;
create policy reviews_client_insert on pagora.reviews
  for insert to authenticated
  with check (
    client_id = auth.uid()
    and exists (
      select 1 from pagora.orders o
      where o.id = order_id
        and o.client_id = auth.uid()
        -- O provider_id da avaliação tem que ser o do pedido; sem isso o
        -- cliente escolhia um alvo arbitrário para receber a nota.
        and o.provider_id = reviews.provider_id
        and o.status in ('completed', 'settled')
    )
  );

-- Avaliação é pública, mas expor `client_id` para qualquer autenticado é
-- vazamento desnecessário — a leitura passa a ser por view (0007).
drop policy if exists reviews_public_read on pagora.reviews;
create policy reviews_read_party on pagora.reviews
  for select to authenticated
  using (client_id = auth.uid() or provider_id = auth.uid() or pagora.is_admin());

-- ===========================================================================
-- disputes — [C3] o prestador responde; quem resolve é o admin, via função
-- ===========================================================================
grant insert (order_id, opened_by, client_reason, client_evidence_urls)
  on pagora.disputes to authenticated;
-- `refund_cents`, `penalty_cents`, `status`, `resolved_by`, `resolved_at` e
-- `resolution_notes` não são concedidos a ninguém: só a função de resolução
-- (SECURITY DEFINER) escreve neles.

drop policy if exists disputes_party_update on pagora.disputes;
-- Resposta do prestador passa a ser `pagora.respond_dispute()` (0008).

drop policy if exists disputes_client_insert on pagora.disputes;
create policy disputes_client_insert on pagora.disputes
  for insert to authenticated
  with check (
    opened_by = auth.uid()
    and exists (
      select 1 from pagora.orders o
      where o.id = order_id
        and o.client_id = auth.uid()
        -- Só faz sentido abrir disputa em serviço já pago.
        and o.status in ('paid', 'en_route', 'in_progress', 'completed')
    )
  );

-- ===========================================================================
-- wallets / wallet_transactions — leitura apenas, e nada além disso
-- ===========================================================================
-- Já não havia policy de escrita; o REVOKE do topo remove também o GRANT que
-- vinha do default privileges. Fica explícito para quem ler a auditoria:
revoke insert, update, delete on pagora.wallets from authenticated, anon;
revoke insert, update, delete on pagora.wallet_transactions from authenticated, anon;

-- ===========================================================================
-- Verificação: nenhuma tabela do schema pode ter policy permissiva de UPDATE
-- sem restrição de coluna nas tabelas financeiras.
-- ===========================================================================
do $$
declare
  v_bad text;
begin
  select string_agg(format('%s.%s (%s)', schemaname, tablename, policyname), ', ')
    into v_bad
  from pg_policies
  where schemaname = 'pagora'
    and tablename in ('orders', 'wallets', 'wallet_transactions')
    and cmd in ('UPDATE', 'INSERT', 'DELETE', 'ALL');

  if v_bad is not null then
    raise exception 'RLS hardening falhou: policies de escrita ainda existem em %', v_bad;
  end if;
end $$;

comment on table pagora.orders is
  'Pagora: serviço contratado. SOMENTE-LEITURA via PostgREST — transições só por RPC/Edge Function.';
comment on table pagora.wallet_transactions is
  'Pagora: ledger append-only do prestador. Escrita exclusiva de pagora.post_ledger_entry().';
