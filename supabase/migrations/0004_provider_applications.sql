-- ============================================================================
-- PAGORA — Cadastro público de prestador (pré-aprovação)
-- ============================================================================
-- Pra divulgação: prestador interessado preenche o form, vira candidato
-- antes mesmo de criar profile/auth. Admin aprova manualmente e a partir daí
-- o fluxo migra pra pagora.providers (que exige auth.uid()).
--
-- Não acopla a pagora.providers de propósito — providers depende de profile_id
-- que vem do auth.users. Mantemos applications como inbox público.
-- ============================================================================

create table if not exists pagora.provider_applications (
  id              uuid primary key default gen_random_uuid(),

  full_name       text not null,
  phone           text not null,
  email           citext,
  services        pagora.service_type[] not null,
  vehicle         text,
  regions         text not null,

  -- atribuição
  source          text not null default 'landing',
  utm_campaign    text,
  utm_source      text,
  utm_medium      text,
  ip_hash         text,
  user_agent      text,

  -- gestão admin (default null — preenchido depois)
  reviewed_at     timestamptz,
  reviewed_by     uuid references auth.users(id),
  decision        text check (decision in ('approved', 'rejected', null)),
  decision_notes  text,

  -- evita o mesmo cara cadastrar 5x no mesmo dia
  created_at      timestamptz not null default now(),

  constraint provider_apps_phone_format check (length(phone) >= 10),
  constraint provider_apps_services_nonempty check (array_length(services, 1) >= 1)
);

-- Dedup defensivo: mesmo telefone, mesma janela de 24h → bloqueia
create unique index if not exists provider_apps_phone_day_uniq
  on pagora.provider_applications (phone, date_trunc('day', created_at));

create index if not exists provider_apps_created_at_idx
  on pagora.provider_applications (created_at desc);
create index if not exists provider_apps_decision_idx
  on pagora.provider_applications (decision) where decision is null;

-- ---------------------------------------------------------------------------
-- RLS — anon pode INSERT, ninguém lê via PostgREST (admin via service_role)
-- ---------------------------------------------------------------------------
alter table pagora.provider_applications enable row level security;
alter table pagora.provider_applications force row level security;

drop policy if exists "provider_apps_anon_insert" on pagora.provider_applications;
create policy "provider_apps_anon_insert"
  on pagora.provider_applications
  for insert
  to anon, authenticated
  with check (true);

grant insert on pagora.provider_applications to anon, authenticated;
