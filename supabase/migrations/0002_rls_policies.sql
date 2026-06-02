-- ============================================================================
-- PAGORA — RLS policies (schema `pagora.*`)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Habilitar e forçar RLS
-- ---------------------------------------------------------------------------
alter table pagora.profiles            enable row level security;
alter table pagora.providers           enable row level security;
alter table pagora.service_requests    enable row level security;
alter table pagora.quotes              enable row level security;
alter table pagora.orders              enable row level security;
alter table pagora.reviews             enable row level security;
alter table pagora.wallets             enable row level security;
alter table pagora.wallet_transactions enable row level security;
alter table pagora.disputes            enable row level security;

alter table pagora.profiles            force row level security;
alter table pagora.providers           force row level security;
alter table pagora.service_requests    force row level security;
alter table pagora.quotes              force row level security;
alter table pagora.orders              force row level security;
alter table pagora.reviews             force row level security;
alter table pagora.wallets             force row level security;
alter table pagora.wallet_transactions force row level security;
alter table pagora.disputes            force row level security;

-- ---------------------------------------------------------------------------
-- Helpers — encapsulam checks de papel
-- ---------------------------------------------------------------------------
create or replace function pagora.current_user_role()
returns pagora.user_role
language sql stable security definer set search_path = pagora, public
as $$
  select role from pagora.profiles where id = auth.uid()
$$;
revoke all on function pagora.current_user_role() from public;
grant execute on function pagora.current_user_role() to authenticated;

create or replace function pagora.is_admin()
returns boolean
language sql stable security definer set search_path = pagora, public
as $$
  select coalesce((select role from pagora.profiles where id = auth.uid()) = 'admin', false)
$$;
revoke all on function pagora.is_admin() from public;
grant execute on function pagora.is_admin() to authenticated;

create or replace function pagora.is_provider()
returns boolean
language sql stable security definer set search_path = pagora, public
as $$
  select exists(select 1 from pagora.providers where profile_id = auth.uid() and approved_at is not null)
$$;
revoke all on function pagora.is_provider() from public;
grant execute on function pagora.is_provider() to authenticated;

-- ===========================================================================
-- profiles
-- ===========================================================================
create policy profiles_select_self on pagora.profiles
  for select to authenticated
  using (id = auth.uid() or pagora.is_admin());

create policy profiles_update_self on pagora.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_admin_update on pagora.profiles
  for update to authenticated
  using (pagora.is_admin())
  with check (pagora.is_admin());

-- ===========================================================================
-- providers
-- ===========================================================================
create policy providers_public_read on pagora.providers
  for select to authenticated
  using (approved_at is not null or profile_id = auth.uid() or pagora.is_admin());

create policy providers_insert_self on pagora.providers
  for insert to authenticated
  with check (profile_id = auth.uid());

create policy providers_update_self on pagora.providers
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy providers_admin_update on pagora.providers
  for update to authenticated
  using (pagora.is_admin())
  with check (pagora.is_admin());

-- ===========================================================================
-- service_requests
-- ===========================================================================
create policy requests_select on pagora.service_requests
  for select to authenticated
  using (
    client_id = auth.uid()
    or pagora.is_admin()
    or (
      pagora.is_provider()
      and status in ('open','quoting')
      and service = any (
        select unnest(services) from pagora.providers where profile_id = auth.uid()
      )
    )
  );

create policy requests_client_insert on pagora.service_requests
  for insert to authenticated
  with check (
    client_id = auth.uid()
    and pagora.current_user_role() in ('client','admin')
  );

create policy requests_client_update on pagora.service_requests
  for update to authenticated
  using (client_id = auth.uid() or pagora.is_admin())
  with check (client_id = auth.uid() or pagora.is_admin());

-- ===========================================================================
-- quotes
-- ===========================================================================
create policy quotes_select on pagora.quotes
  for select to authenticated
  using (
    provider_id = auth.uid()
    or pagora.is_admin()
    or exists (
      select 1 from pagora.service_requests sr
      where sr.id = quotes.request_id and sr.client_id = auth.uid()
    )
  );

create policy quotes_provider_insert on pagora.quotes
  for insert to authenticated
  with check (
    provider_id = auth.uid()
    and pagora.is_provider()
    and exists (
      select 1 from pagora.service_requests sr
      where sr.id = request_id and sr.status in ('open','quoting')
    )
  );

create policy quotes_provider_update on pagora.quotes
  for update to authenticated
  using (provider_id = auth.uid() and status in ('pending','sent'))
  with check (provider_id = auth.uid());

create policy quotes_client_view on pagora.quotes
  for update to authenticated
  using (
    exists (
      select 1 from pagora.service_requests sr
      where sr.id = quotes.request_id and sr.client_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from pagora.service_requests sr
      where sr.id = quotes.request_id and sr.client_id = auth.uid()
    )
  );

-- ===========================================================================
-- orders
-- ===========================================================================
create policy orders_select_party on pagora.orders
  for select to authenticated
  using (client_id = auth.uid() or provider_id = auth.uid() or pagora.is_admin());

create policy orders_update_party on pagora.orders
  for update to authenticated
  using (client_id = auth.uid() or provider_id = auth.uid() or pagora.is_admin())
  with check (client_id = auth.uid() or provider_id = auth.uid() or pagora.is_admin());

-- ===========================================================================
-- reviews
-- ===========================================================================
create policy reviews_public_read on pagora.reviews
  for select to authenticated using (true);

create policy reviews_client_insert on pagora.reviews
  for insert to authenticated
  with check (
    client_id = auth.uid()
    and exists (
      select 1 from pagora.orders o
      where o.id = order_id and o.client_id = auth.uid() and o.status = 'completed'
    )
  );

-- ===========================================================================
-- wallets / wallet_transactions
-- ===========================================================================
create policy wallets_select on pagora.wallets
  for select to authenticated
  using (provider_id = auth.uid() or pagora.is_admin());

create policy wallet_tx_select on pagora.wallet_transactions
  for select to authenticated
  using (provider_id = auth.uid() or pagora.is_admin());

-- ===========================================================================
-- disputes
-- ===========================================================================
create policy disputes_select on pagora.disputes
  for select to authenticated
  using (
    pagora.is_admin()
    or exists (
      select 1 from pagora.orders o
      where o.id = order_id and (o.client_id = auth.uid() or o.provider_id = auth.uid())
    )
  );

create policy disputes_client_insert on pagora.disputes
  for insert to authenticated
  with check (
    opened_by = auth.uid()
    and exists (
      select 1 from pagora.orders o
      where o.id = order_id and o.client_id = auth.uid() and o.status in ('completed','in_progress')
    )
  );

create policy disputes_party_update on pagora.disputes
  for update to authenticated
  using (
    pagora.is_admin()
    or exists (
      select 1 from pagora.orders o
      where o.id = order_id and o.provider_id = auth.uid()
    )
  )
  with check (
    pagora.is_admin()
    or exists (
      select 1 from pagora.orders o
      where o.id = order_id and o.provider_id = auth.uid()
    )
  );

-- ===========================================================================
-- Column-level GRANT — bloqueia escrita em colunas sensíveis via REST
-- ===========================================================================
revoke update (role, blocked_at, created_at) on pagora.profiles from authenticated;
grant  update (full_name, phone, email, cpf, avatar_url, city, state, onboarded_at, updated_at)
  on pagora.profiles to authenticated;

revoke update (approved_at, rejected_at, rejection_reason, rating_avg, rating_count, created_at)
  on pagora.providers from authenticated;

-- ===========================================================================
-- Realtime — opt-in por tabela
-- ===========================================================================
alter publication supabase_realtime add table pagora.service_requests;
alter publication supabase_realtime add table pagora.quotes;
alter publication supabase_realtime add table pagora.orders;
alter publication supabase_realtime add table pagora.disputes;
