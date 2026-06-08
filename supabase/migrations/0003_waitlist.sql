-- ============================================================================
-- PAGORA — Waitlist pública (captura de email/telefone antes do OTP)
-- ============================================================================
-- Objetivo: reduzir fricção de cadastro inicial. Usuário entra na landing,
-- deixa contato + cidade + serviços de interesse, recebe aviso quando a
-- PAGORA estiver ativa na região. Sem custo de Twilio nessa porta de entrada.
-- ============================================================================

create table if not exists pagora.waitlist (
  id           uuid primary key default gen_random_uuid(),

  -- pelo menos um dos dois precisa estar preenchido (constraint abaixo)
  email        citext,
  phone        text,

  city         text,
  cep          text,

  -- quais serviços interessam (subset de pagora.service_type)
  services     pagora.service_type[],

  -- de onde veio (landing, share, ad, etc.) — pra atribuição de funil
  source       text not null default 'landing',
  utm_campaign text,
  utm_source   text,
  utm_medium   text,

  -- bloqueio antifraude leve: hash do IP (sha256) + UA, sem PII direta
  ip_hash      text,
  user_agent   text,

  created_at   timestamptz not null default now(),

  -- pelo menos um canal de contato
  constraint waitlist_has_contact check (email is not null or phone is not null)
);

-- Email único (case-insensitive via citext). Telefone também único quando presente.
create unique index if not exists waitlist_email_uniq on pagora.waitlist (email) where email is not null;
create unique index if not exists waitlist_phone_uniq on pagora.waitlist (phone) where phone is not null;

-- Ordenação por created_at descendente pra reports
create index if not exists waitlist_created_at_idx on pagora.waitlist (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS — deny-by-default; anon pode INSERT, ninguém pode SELECT/UPDATE/DELETE
-- (admin lê via service_role, que bypassa RLS)
-- ---------------------------------------------------------------------------
alter table pagora.waitlist enable row level security;
alter table pagora.waitlist force row level security;

-- Permite que visitantes anônimos (e autenticados) registrem contato.
-- Não há policy de select → ninguém via PostgREST consegue listar/ver entradas.
drop policy if exists "waitlist_anon_insert" on pagora.waitlist;
create policy "waitlist_anon_insert"
  on pagora.waitlist
  for insert
  to anon, authenticated
  with check (true);

-- Garante que anon possa de fato inserir (default privileges concederam,
-- mas explicitar aqui torna o intent legível)
grant insert on pagora.waitlist to anon, authenticated;
