-- ============================================================================
-- PAGORA — Schema inicial (MVP) em `pagora.*` (isolado de `public.*` do Olefoot)
-- ============================================================================
-- IMPORTANTE: depois de aplicar, no Supabase Dashboard:
--   Settings → API → "Exposed schemas" → adicionar `pagora`
-- Sem isso, o supabase-js não enxerga as tabelas do PostgREST.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions (idempotentes — Olefoot pode já ter)
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
create schema if not exists pagora;

-- PostgREST precisa USAGE pra enumerar o schema
grant usage on schema pagora to authenticated, anon;

-- Default privileges: tudo criado neste schema fica acessível a authenticated/anon
alter default privileges in schema pagora grant all on tables to authenticated;
alter default privileges in schema pagora grant select on tables to anon;
alter default privileges in schema pagora grant execute on functions to authenticated;
alter default privileges in schema pagora grant usage, select on sequences to authenticated;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type pagora.user_role as enum ('client', 'provider', 'admin');

create type pagora.service_type as enum ('frete', 'guincho', 'cacamba');

create type pagora.request_status as enum (
  'open', 'quoting', 'accepted', 'cancelled', 'expired'
);

create type pagora.quote_status as enum (
  'pending', 'sent', 'accepted', 'rejected', 'expired', 'withdrawn'
);

create type pagora.order_status as enum (
  'pending_payment', 'in_progress', 'completed', 'cancelled', 'disputed'
);

create type pagora.dispute_status as enum (
  'open', 'responded', 'resolved_client', 'resolved_provider', 'resolved_split'
);

create type pagora.wallet_tx_kind as enum (
  'order_credit', 'platform_fee', 'withdrawal', 'dispute_refund', 'bonus', 'adjustment'
);

-- ---------------------------------------------------------------------------
-- profiles — referencia auth.users (compartilhado entre Pagora e Olefoot)
-- ---------------------------------------------------------------------------
create table pagora.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         pagora.user_role not null default 'client',
  full_name    text,
  phone        text,
  email        citext,
  cpf          text,
  avatar_url   text,
  city         text,
  state        text,
  onboarded_at timestamptz,
  blocked_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index profiles_role_idx on pagora.profiles(role) where blocked_at is null;
create unique index profiles_cpf_unique on pagora.profiles(cpf) where cpf is not null;
create unique index profiles_phone_unique on pagora.profiles(phone) where phone is not null;

-- ---------------------------------------------------------------------------
-- providers
-- ---------------------------------------------------------------------------
create table pagora.providers (
  profile_id        uuid primary key references pagora.profiles(id) on delete cascade,
  display_name      text not null,
  bio               text,
  cnh_number        text,
  cnh_category      text check (cnh_category in ('A','B','C','D','E','AB','AC','AD','AE')),
  cnh_verified_at   timestamptz,
  services          pagora.service_type[] not null,
  vehicle_type      text,
  vehicle_plate     text,
  vehicle_model     text,
  vehicle_year      int check (vehicle_year between 1980 and 2100),
  vehicle_color     text,
  capacity_kg       int,
  service_areas     text[] default '{}',
  pix_key           text,
  bank_name         text,
  bank_agency       text,
  bank_account      text,
  selfie_url        text,
  doc_url           text,
  approved_at       timestamptz,
  rejected_at       timestamptz,
  rejection_reason  text,
  rating_avg        numeric(3,2) default 0.00,
  rating_count      int default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index providers_services_gin on pagora.providers using gin(services);
create index providers_approved_idx on pagora.providers(approved_at) where approved_at is not null;

-- ---------------------------------------------------------------------------
-- service_requests
-- ---------------------------------------------------------------------------
create table pagora.service_requests (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references pagora.profiles(id) on delete cascade,
  service         pagora.service_type not null,
  status          pagora.request_status not null default 'open',
  payload         jsonb not null default '{}'::jsonb,
  origin_city     text,
  origin_state    text,
  dest_city       text,
  dest_state      text,
  scheduled_for   timestamptz,
  estimate_low_cents   int,
  estimate_high_cents  int,
  estimate_breakdown   jsonb,
  expires_at      timestamptz not null default (now() + interval '48 hours'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index service_requests_client_idx on pagora.service_requests(client_id, created_at desc);
create index service_requests_open_idx on pagora.service_requests(service, status) where status in ('open','quoting');
create index service_requests_origin_state_idx on pagora.service_requests(origin_state) where status in ('open','quoting');

-- ---------------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------------
create table pagora.quotes (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references pagora.service_requests(id) on delete cascade,
  provider_id     uuid not null references pagora.providers(profile_id) on delete cascade,
  status          pagora.quote_status not null default 'pending',
  price_cents     int not null check (price_cents > 0),
  eta_minutes     int check (eta_minutes >= 0),
  notes           text,
  includes        text[] default '{}',
  viewed_at       timestamptz,
  accepted_at     timestamptz,
  rejected_at     timestamptz,
  expires_at      timestamptz not null default (now() + interval '24 hours'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (request_id, provider_id)
);

create index quotes_request_idx on pagora.quotes(request_id, price_cents);
create index quotes_provider_idx on pagora.quotes(provider_id, created_at desc);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table pagora.orders (
  id              uuid primary key default gen_random_uuid(),
  quote_id        uuid not null unique references pagora.quotes(id) on delete restrict,
  request_id      uuid not null references pagora.service_requests(id) on delete restrict,
  client_id       uuid not null references pagora.profiles(id) on delete restrict,
  provider_id     uuid not null references pagora.providers(profile_id) on delete restrict,
  status          pagora.order_status not null default 'pending_payment',
  price_cents     int not null check (price_cents > 0),
  platform_fee_cents int not null default 0 check (platform_fee_cents >= 0),
  pickup_at       timestamptz,
  delivered_at    timestamptz,
  cancelled_at    timestamptz,
  cancellation_reason text,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index orders_client_idx on pagora.orders(client_id, created_at desc);
create index orders_provider_idx on pagora.orders(provider_id, created_at desc);
create index orders_status_idx on pagora.orders(status);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
create table pagora.reviews (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null unique references pagora.orders(id) on delete cascade,
  client_id     uuid not null references pagora.profiles(id) on delete cascade,
  provider_id   uuid not null references pagora.providers(profile_id) on delete cascade,
  stars         int not null check (stars between 1 and 5),
  comment       text,
  tags          text[] default '{}',
  created_at    timestamptz not null default now()
);

create index reviews_provider_idx on pagora.reviews(provider_id, created_at desc);

-- ---------------------------------------------------------------------------
-- wallets
-- ---------------------------------------------------------------------------
create table pagora.wallets (
  provider_id     uuid primary key references pagora.providers(profile_id) on delete cascade,
  balance_cents   int not null default 0,
  pending_cents   int not null default 0,
  withdrawn_total_cents bigint not null default 0,
  updated_at      timestamptz not null default now()
);

create table pagora.wallet_transactions (
  id              uuid primary key default gen_random_uuid(),
  provider_id     uuid not null references pagora.providers(profile_id) on delete cascade,
  kind            pagora.wallet_tx_kind not null,
  amount_cents    int not null,
  balance_after_cents int not null,
  order_id        uuid references pagora.orders(id) on delete set null,
  description     text,
  metadata        jsonb default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index wallet_tx_provider_idx on pagora.wallet_transactions(provider_id, created_at desc);
create index wallet_tx_order_idx on pagora.wallet_transactions(order_id) where order_id is not null;

-- ---------------------------------------------------------------------------
-- disputes
-- ---------------------------------------------------------------------------
create table pagora.disputes (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null unique references pagora.orders(id) on delete restrict,
  opened_by       uuid not null references pagora.profiles(id),
  status          pagora.dispute_status not null default 'open',
  client_reason   text not null,
  client_evidence_urls text[] default '{}',
  provider_response text,
  provider_evidence_urls text[] default '{}',
  responded_at    timestamptz,
  resolved_by     uuid references pagora.profiles(id),
  resolved_at     timestamptz,
  resolution_notes text,
  refund_cents    int default 0,
  penalty_cents   int default 0,
  sla_due_at      timestamptz not null default (now() + interval '24 hours'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index disputes_status_idx on pagora.disputes(status, sla_due_at);

-- ---------------------------------------------------------------------------
-- Trigger: set updated_at
-- ---------------------------------------------------------------------------
create or replace function pagora.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at         before update on pagora.profiles         for each row execute function pagora.set_updated_at();
create trigger providers_set_updated_at        before update on pagora.providers        for each row execute function pagora.set_updated_at();
create trigger service_requests_set_updated_at before update on pagora.service_requests for each row execute function pagora.set_updated_at();
create trigger quotes_set_updated_at           before update on pagora.quotes           for each row execute function pagora.set_updated_at();
create trigger orders_set_updated_at           before update on pagora.orders           for each row execute function pagora.set_updated_at();
create trigger wallets_set_updated_at          before update on pagora.wallets          for each row execute function pagora.set_updated_at();
create trigger disputes_set_updated_at         before update on pagora.disputes         for each row execute function pagora.set_updated_at();

-- ---------------------------------------------------------------------------
-- RPC: ensure_profile() — chamado pelo frontend após login
-- (substitui o trigger handle_new_user — não criamos profile pra todos os
--  47 usuários do Olefoot que já existem em auth.users; só cria quando o
--  usuário interage com o Pagora pela primeira vez)
-- ---------------------------------------------------------------------------
create or replace function pagora.ensure_profile()
returns pagora.profiles
security definer set search_path = pagora, public
language plpgsql as $$
declare
  v_profile pagora.profiles;
  v_user auth.users;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  select * into v_profile from pagora.profiles where id = auth.uid();
  if found then
    return v_profile;
  end if;

  select * into v_user from auth.users where id = auth.uid();
  insert into pagora.profiles (id, phone, email)
  values (v_user.id, v_user.phone, v_user.email)
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function pagora.ensure_profile() from public;
grant execute on function pagora.ensure_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: become_provider()
-- ---------------------------------------------------------------------------
create or replace function pagora.become_provider(
  p_display_name text,
  p_services pagora.service_type[],
  p_vehicle_type text default null,
  p_service_areas text[] default '{}'
) returns pagora.providers
security definer set search_path = pagora, public
language plpgsql as $$
declare
  v_provider pagora.providers;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  -- Garante profile (caso usuário ainda não tenha)
  perform pagora.ensure_profile();

  update pagora.profiles set role = 'provider' where id = auth.uid();

  insert into pagora.providers (profile_id, display_name, services, vehicle_type, service_areas)
  values (auth.uid(), p_display_name, p_services, p_vehicle_type, p_service_areas)
  returning * into v_provider;

  insert into pagora.wallets (provider_id) values (auth.uid()) on conflict do nothing;

  return v_provider;
end;
$$;

revoke all on function pagora.become_provider(text, pagora.service_type[], text, text[]) from public;
grant execute on function pagora.become_provider(text, pagora.service_type[], text, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: accept_quote()
-- ---------------------------------------------------------------------------
create or replace function pagora.accept_quote(p_quote_id uuid)
returns pagora.orders
security definer set search_path = pagora, public
language plpgsql as $$
declare
  v_quote pagora.quotes;
  v_request pagora.service_requests;
  v_order pagora.orders;
  v_platform_fee int;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  select * into v_quote from pagora.quotes where id = p_quote_id and status in ('pending','sent') for update;
  if not found then
    raise exception 'quote_not_found_or_already_resolved';
  end if;

  select * into v_request from pagora.service_requests where id = v_quote.request_id for update;
  if v_request.client_id <> auth.uid() then
    raise exception 'forbidden: not your request';
  end if;
  if v_request.status not in ('open','quoting') then
    raise exception 'request_not_open';
  end if;

  v_platform_fee := round(v_quote.price_cents * 0.15)::int;

  update pagora.quotes set status='accepted', accepted_at=now() where id = p_quote_id;
  update pagora.quotes set status='rejected', rejected_at=now()
    where request_id = v_quote.request_id and id <> p_quote_id and status in ('pending','sent');
  update pagora.service_requests set status='accepted' where id = v_request.id;

  insert into pagora.orders (quote_id, request_id, client_id, provider_id, price_cents, platform_fee_cents, status)
  values (v_quote.id, v_quote.request_id, v_request.client_id, v_quote.provider_id,
          v_quote.price_cents, v_platform_fee, 'pending_payment')
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function pagora.accept_quote(uuid) from public;
grant execute on function pagora.accept_quote(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Comentários (úteis no Studio + MCP)
-- ---------------------------------------------------------------------------
comment on schema pagora is 'Schema isolado do Pagora (marketplace de logística). NÃO mexer em public.* do Olefoot.';
comment on table pagora.profiles is 'Pagora: dados de aplicação. Lazy-criado via ensure_profile() — não auto em auth.users insert.';
comment on table pagora.providers is 'Pagora: prestadores aprovados.';
comment on table pagora.service_requests is 'Pagora: pedido de cotação do cliente.';
comment on table pagora.quotes is 'Pagora: proposta de prestador.';
comment on table pagora.orders is 'Pagora: serviço contratado (quote aceita).';
comment on table pagora.wallets is 'Pagora: saldo do prestador.';
comment on table pagora.disputes is 'Pagora: disputas resolvidas pelo admin.';
