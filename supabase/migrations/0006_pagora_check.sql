-- ============================================================================
-- PAGORA CHECK — frota, credenciais e conformidade
-- ============================================================================
-- Estrutura para verificar prestador, veículo e habilitação regulatória, e
-- para casar pedido com veículo compatível.
--
-- ---------------------------------------------------------------------------
-- O que reaproveita do que já existe
-- ---------------------------------------------------------------------------
--   providers.cnh_number / cnh_category / cnh_verified_at
--       Ficam como estão. CNH é da PESSOA, não do veículo — o lugar certo
--       dela já era `providers`.
--
--   providers.approved_at / rejected_at / rejection_reason
--       Continuam sendo o portão de entrada do prestador. O PAGORA CHECK não
--       substitui a aprovação manual: ele a destrincha por documento, para
--       que "aprovado" deixe de ser um booleano sem rastro.
--
--   provider_applications.decision
--       Segue como inbox público de triagem. Nada muda ali.
--
--   providers.vehicle_plate / vehicle_model / vehicle_year / vehicle_color
--       Viram o veículo PRIMÁRIO dentro de `vehicles` (backfill abaixo). As
--       colunas antigas permanecem para não quebrar `phase4.tsx`, mas passam
--       a ser derivadas — a fonte de verdade é `vehicles`.
--
-- ---------------------------------------------------------------------------
-- Onde a regra de conformidade VIVE
-- ---------------------------------------------------------------------------
-- `compliance_requirements` guarda a matriz (qual serviço exige o quê). Ela
-- espelha `REQUIREMENT_MATRIX` em src/lib/conformidade.ts, e existe para que
-- o jurídico ajuste uma linha de tabela em vez de abrir pull request.
--
-- Mas o CÁLCULO do selo (cruzar exigido × comprovado) fica só no TypeScript.
-- Reimplementá-lo em PL/pgSQL criaria duas fontes da mesma regra, que
-- divergem na primeira mudança regulatória — e a versão errada barraria
-- prestador do sustento sem ninguém perceber. O resultado é gravado em
-- `vehicles.check_status` como cache, sempre com `check_evaluated_at` do
-- lado, para que um cache velho seja detectável.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type pagora.transporter_kind as enum ('TAC', 'ETC', 'CTC');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pagora.credential_kind as enum (
    'cnh', 'crlv', 'rntrc', 'antt_frota',
    'seguro_rctrc', 'seguro_rcdc', 'seguro_rcv',
    'licenca_residuos', 'autorizacao_socorro'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type pagora.credential_status as enum (
    'ausente', 'pendente', 'verificado', 'rejeitado', 'vencido'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type pagora.requirement_level as enum (
    'obrigatorio', 'condicional', 'recomendado', 'nao_aplicavel'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type pagora.rule_confidence as enum ('alta', 'media', 'verificar_juridico');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pagora.check_status as enum ('aprovado', 'pendente', 'bloqueado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pagora.body_type as enum (
    'moto', 'furgao', 'van', 'bau', 'carroceria', 'basculante',
    'poliguindaste', 'prancha', 'lanca', 'cavalo_mecanico', 'outro'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- vehicles — frota do prestador
-- ---------------------------------------------------------------------------
-- Um prestador pode ter N veículos. Uma ETC com 12 caminhões não cabia nas
-- colunas `vehicle_*` de `providers`, e é exatamente o perfil que o Pagora
-- quer atrair no frete pesado.
create table if not exists pagora.vehicles (
  id              uuid primary key default gen_random_uuid(),
  provider_id     uuid not null references pagora.providers(profile_id) on delete cascade,

  -- Chave canônica: placa antiga e sua Mercosul equivalente produzem o MESMO
  -- valor (ver plateKey() em src/lib/placa.ts). É o que impede o mesmo
  -- caminhão de entrar duas vezes na frota com formatos diferentes.
  plate_key       text not null,
  plate           text not null,
  renavam         text,

  brand           text,
  model           text,
  year            int check (year between 1950 and 2100),
  color           text,
  body_type       pagora.body_type not null default 'outro',

  -- Peso Bruto Total: driver legal de categoria de CNH e de exigência de
  -- RNTRC. Nulo é estado legítimo no cadastro manual, e o matching trata
  -- nulo como "não dá para afirmar", nunca como zero.
  pbt_kg          int check (pbt_kg is null or pbt_kg between 100 and 200000),
  capacity_kg     int check (capacity_kg is null or capacity_kg between 0 and 100000),
  axles           int check (axles is null or axles between 1 and 12),
  has_trailer     boolean not null default false,

  is_primary      boolean not null default false,

  -- Cache do PAGORA CHECK. Calculado no TypeScript, gravado aqui.
  -- `check_evaluated_at` existe para tornar cache velho detectável: sem ele,
  -- um selo aprovado em 2026 continuaria verde para sempre.
  check_status       pagora.check_status not null default 'pendente',
  check_evaluated_at timestamptz,

  -- Origem do preenchimento: 'manual' hoje, 'api_placa' quando a consulta
  -- veicular entrar. Saber a procedência do dado é o que permite confiar
  -- mais em um do que no outro na hora da disputa.
  data_source     text not null default 'manual'
                    check (data_source in ('manual', 'api_placa', 'admin')),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint vehicles_plate_key_format check (plate_key ~ '^[A-Z]{3}[0-9][A-Z][0-9]{2}$')
);

-- Um veículo não pode estar em duas frotas ao mesmo tempo.
create unique index if not exists vehicles_plate_key_uniq on pagora.vehicles (plate_key);
create index if not exists vehicles_provider_idx on pagora.vehicles (provider_id);

-- Só um primário por prestador.
create unique index if not exists vehicles_one_primary_per_provider
  on pagora.vehicles (provider_id) where is_primary;

create index if not exists vehicles_matchable_idx
  on pagora.vehicles (body_type, capacity_kg)
  where check_status = 'aprovado';

create trigger vehicles_set_updated_at
  before update on pagora.vehicles
  for each row execute function pagora.set_updated_at();

comment on table pagora.vehicles is
  'Frota do prestador. plate_key é a forma canônica Mercosul — dedupe entre formatos antigo e novo.';
comment on column pagora.vehicles.check_status is
  'Cache do resultado calculado em src/lib/conformidade.ts. Ler junto com check_evaluated_at: cache sem data de avaliação não vale.';

-- ---------------------------------------------------------------------------
-- transporter_registrations — RNTRC do prestador
-- ---------------------------------------------------------------------------
-- Separado de `vehicles` porque o RNTRC é da PESSOA/EMPRESA, não do veículo.
-- O vínculo veículo↔transportador é outra coisa, e é justamente o que o
-- ConsultarFrotaTransportador da ANTT responde — por isso mora em
-- `credentials` como 'antt_frota', por veículo.
create table if not exists pagora.transporter_registrations (
  provider_id       uuid primary key references pagora.providers(profile_id) on delete cascade,

  kind              pagora.transporter_kind not null,
  -- CPF (TAC) ou CNPJ (ETC/CTC), só dígitos/alfanumérico, sem pontuação.
  document          text not null,
  rntrc             text check (rntrc is null or rntrc ~ '^[0-9]{8}$'),

  -- Situação conforme a ANTT. Texto livre de propósito: a ANTT pode
  -- introduzir estados que um enum nosso não previu, e travar o cadastro por
  -- causa disso seria pior do que guardar o texto que ela devolveu.
  antt_situacao     text,
  antt_checked_at   timestamptz,
  -- Como foi verificado: 'manual' = admin conferiu no portal e anotou.
  antt_source       text not null default 'manual'
                      check (antt_source in ('manual', 'webservice', 'nao_verificado')),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint transporter_doc_shape check (document ~ '^[A-Z0-9]{11,14}$')
);

create index if not exists transporter_rntrc_idx
  on pagora.transporter_registrations (rntrc) where rntrc is not null;

create trigger transporter_registrations_set_updated_at
  before update on pagora.transporter_registrations
  for each row execute function pagora.set_updated_at();

comment on column pagora.transporter_registrations.antt_source is
  'manual = admin conferiu no portal da ANTT e registrou. Nunca marcar webservice sem integração real: seria afirmar verificação que não houve.';

-- ---------------------------------------------------------------------------
-- credentials — o livro-razão da verificação
-- ---------------------------------------------------------------------------
-- Uma linha por (prestador, veículo?, tipo de documento). É o que transforma
-- `approved_at` de booleano opaco em trilha auditável: quem verificou, quando,
-- com base em qual arquivo, e até quando vale.
create table if not exists pagora.credentials (
  id             uuid primary key default gen_random_uuid(),
  provider_id    uuid not null references pagora.providers(profile_id) on delete cascade,
  -- Nulo = credencial da pessoa (CNH, RNTRC). Preenchido = do veículo.
  vehicle_id     uuid references pagora.vehicles(id) on delete cascade,

  kind           pagora.credential_kind not null,
  status         pagora.credential_status not null default 'ausente',

  -- Número/identificador do documento, quando aplicável.
  document_ref   text,
  -- Arquivo no Storage. Nunca a imagem inline.
  file_path      text,

  issued_at      date,
  expires_at     date,

  verified_by    uuid references pagora.profiles(id),
  verified_at    timestamptz,
  rejection_reason text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Status verificado exige quem verificou e quando. Sem isso, "verificado"
  -- é afirmação sem autor — inútil numa disputa.
  constraint credentials_verified_has_author check (
    status <> 'verificado' or (verified_by is not null and verified_at is not null)
  ),
  constraint credentials_rejected_has_reason check (
    status <> 'rejeitado' or rejection_reason is not null
  )
);

create unique index if not exists credentials_unique_per_scope
  on pagora.credentials (provider_id, kind, coalesce(vehicle_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index if not exists credentials_provider_idx on pagora.credentials (provider_id, status);
create index if not exists credentials_expiring_idx
  on pagora.credentials (expires_at)
  where status = 'verificado' and expires_at is not null;

create trigger credentials_set_updated_at
  before update on pagora.credentials
  for each row execute function pagora.set_updated_at();

-- ---------------------------------------------------------------------------
-- compliance_requirements — a matriz como DADO
-- ---------------------------------------------------------------------------
-- Espelha REQUIREMENT_MATRIX de src/lib/conformidade.ts. Existe para que
-- ajuste regulatório seja UPDATE, não deploy.
--
-- `min_pbt_kg` / `max_pbt_kg` / `body_types` expressam as condições que no
-- TypeScript são `appliesWhen`. Deliberadamente declarativas: predicado
-- arbitrário em tabela viraria uma linguagem de regras caseira, que é o
-- caminho mais curto para um bug que ninguém sabe depurar.
create table if not exists pagora.compliance_requirements (
  id            uuid primary key default gen_random_uuid(),
  service       pagora.service_type not null,
  kind          pagora.credential_kind not null,
  level         pagora.requirement_level not null,
  confidence    pagora.rule_confidence not null,

  -- Condições de aplicação (null = sem restrição)
  min_pbt_kg    int,
  max_pbt_kg    int,
  body_types    pagora.body_type[],

  reason        text not null,
  legal_basis   text not null,

  -- Escopo territorial: regra municipal vale só onde vale.
  state         text,
  municipality  text,

  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists compliance_req_lookup_idx
  on pagora.compliance_requirements (service, active);

create trigger compliance_requirements_set_updated_at
  before update on pagora.compliance_requirements
  for each row execute function pagora.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed da matriz — espelho de REQUIREMENT_MATRIX
-- ---------------------------------------------------------------------------
-- ATENÇÃO JURÍDICO: toda linha com confidence = 'verificar_juridico' é
-- posição conservadora de partida, NÃO leitura confirmada da norma vigente.
-- Confirmar antes do go-live. Enquanto não confirmada, a regra gera pendência
-- de triagem e nunca bloqueio automático (ver evaluateCheck).
insert into pagora.compliance_requirements
  (service, kind, level, confidence, min_pbt_kg, body_types, reason, legal_basis)
values
  -- FRETE — regime federal ANTT
  ('frete','cnh','obrigatorio','alta',null,null,
   'Conduzir veículo exige habilitação compatível com o porte.','CTB art. 143'),
  ('frete','crlv','obrigatorio','alta',null,null,
   'O veículo precisa estar licenciado e em dia.','CTB art. 130 e 131'),
  ('frete','rntrc','obrigatorio','verificar_juridico',3501,null,
   'Transporte rodoviário remunerado de cargas exige inscrição ativa no RNTRC.','Lei 11.442/2007; regulamentação ANTT'),
  ('frete','antt_frota','obrigatorio','verificar_juridico',3501,null,
   'O veículo precisa estar vinculado à frota do transportador no RNTRC.','ANTT — ConsultarFrotaTransportador'),
  ('frete','seguro_rctrc','obrigatorio','verificar_juridico',3501,null,
   'Seguro de responsabilidade civil do transportador rodoviário de carga.','Seguro obrigatório do TRC'),
  ('frete','seguro_rcdc','recomendado','verificar_juridico',null,null,
   'Cobre desaparecimento de carga. Aumenta a confiança do cliente.','Seguro complementar do TRC'),

  -- GUINCHO — regime municipal/estadual
  ('guincho','cnh','obrigatorio','alta',null,null,
   'Conduzir o guincho exige habilitação compatível com o porte.','CTB art. 143'),
  ('guincho','crlv','obrigatorio','alta',null,null,
   'O guincho precisa estar licenciado e em dia.','CTB art. 130 e 131'),
  ('guincho','autorizacao_socorro','obrigatorio','verificar_juridico',null,null,
   'Serviço de socorro e remoção depende de autorização do município ou do estado.','Norma municipal/estadual — varia por localidade'),
  ('guincho','seguro_rcv','obrigatorio','verificar_juridico',null,null,
   'O veículo rebocado fica sob responsabilidade do prestador durante a remoção.','RC-V — responsabilidade civil sobre veículo de terceiro'),
  ('guincho','rntrc','condicional','verificar_juridico',3501,array['prancha']::pagora.body_type[],
   'Remoção de veículos como carga (prancha/cegonha) se enquadra como transporte de cargas.','Lei 11.442/2007'),

  -- CAÇAMBA — regime municipal de resíduos
  ('cacamba','cnh','obrigatorio','alta',null,null,
   'Conduzir o caminhão exige habilitação compatível com o porte.','CTB art. 143'),
  ('cacamba','crlv','obrigatorio','alta',null,null,
   'O veículo precisa estar licenciado e em dia.','CTB art. 130 e 131'),
  ('cacamba','licenca_residuos','obrigatorio','verificar_juridico',null,null,
   'Transporte de resíduos da construção exige licença do município onde a caçamba fica.','CONAMA 307 + regulamentação municipal')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Licença municipal — cobertura territorial
-- ---------------------------------------------------------------------------
-- Licença de resíduos vale onde foi emitida. Prestador licenciado em São
-- Paulo não está licenciado em Guarulhos, e o matching precisa saber disso.
create table if not exists pagora.credential_coverage (
  credential_id  uuid not null references pagora.credentials(id) on delete cascade,
  municipality   text not null,
  state          text not null,
  primary key (credential_id, municipality, state)
);

create index if not exists credential_coverage_city_idx
  on pagora.credential_coverage (municipality, state);

-- ---------------------------------------------------------------------------
-- Backfill: veículo primário a partir das colunas antigas
-- ---------------------------------------------------------------------------
-- Idempotente e no-op em base nova. Existe para o caso de a migration rodar
-- sobre dados já cadastrados via phase4.tsx.
--
-- Só migra placa no formato Mercosul canônico; placa antiga precisa da
-- conversão de plateKey(), que é TypeScript. O relatório abaixo lista o que
-- ficou de fora para tratamento pelo app.
insert into pagora.vehicles (provider_id, plate_key, plate, model, year, color, data_source, is_primary)
select
  p.profile_id,
  upper(regexp_replace(p.vehicle_plate, '[^A-Za-z0-9]', '', 'g')),
  upper(regexp_replace(p.vehicle_plate, '[^A-Za-z0-9]', '', 'g')),
  p.vehicle_model,
  p.vehicle_year,
  p.vehicle_color,
  'manual',
  true
from pagora.providers p
where p.vehicle_plate is not null
  and upper(regexp_replace(p.vehicle_plate, '[^A-Za-z0-9]', '', 'g')) ~ '^[A-Z]{3}[0-9][A-Z][0-9]{2}$'
on conflict (plate_key) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table pagora.vehicles                   enable row level security;
alter table pagora.vehicles                   force row level security;
alter table pagora.transporter_registrations  enable row level security;
alter table pagora.transporter_registrations  force row level security;
alter table pagora.credentials                enable row level security;
alter table pagora.credentials                force row level security;
alter table pagora.credential_coverage        enable row level security;
alter table pagora.credential_coverage        force row level security;
alter table pagora.compliance_requirements    enable row level security;
alter table pagora.compliance_requirements    force row level security;

-- vehicles: dono gerencia o seu; cliente autenticado lê só veículo aprovado
-- (precisa ver o caminhão que vai atender). Colunas sensíveis não moram aqui.
drop policy if exists vehicles_owner_all on pagora.vehicles;
create policy vehicles_owner_all on pagora.vehicles
  for all to authenticated
  using (provider_id = auth.uid() or pagora.is_admin())
  with check (provider_id = auth.uid() or pagora.is_admin());

drop policy if exists vehicles_public_read_approved on pagora.vehicles;
create policy vehicles_public_read_approved on pagora.vehicles
  for select to authenticated
  using (check_status = 'aprovado');

-- O prestador não pode se auto-aprovar. Só admin/service_role escreve o
-- status do check e o carimbo de avaliação.
revoke update (check_status, check_evaluated_at) on pagora.vehicles from authenticated;

-- transporter_registrations: só o dono e o admin. Documento e RNTRC são PII.
drop policy if exists transporter_owner on pagora.transporter_registrations;
create policy transporter_owner on pagora.transporter_registrations
  for all to authenticated
  using (provider_id = auth.uid() or pagora.is_admin())
  with check (provider_id = auth.uid() or pagora.is_admin());

-- A situação junto à ANTT é veredito de terceiro, não autodeclaração.
revoke update (antt_situacao, antt_checked_at, antt_source)
  on pagora.transporter_registrations from authenticated;

-- credentials: o prestador envia e acompanha; só admin verifica.
drop policy if exists credentials_owner_read on pagora.credentials;
create policy credentials_owner_read on pagora.credentials
  for select to authenticated
  using (provider_id = auth.uid() or pagora.is_admin());

drop policy if exists credentials_owner_insert on pagora.credentials;
create policy credentials_owner_insert on pagora.credentials
  for insert to authenticated
  with check (provider_id = auth.uid() or pagora.is_admin());

drop policy if exists credentials_owner_update on pagora.credentials;
create policy credentials_owner_update on pagora.credentials
  for update to authenticated
  using (provider_id = auth.uid() or pagora.is_admin())
  with check (provider_id = auth.uid() or pagora.is_admin());

-- O ponto que sustenta a confiança do selo: quem envia o documento não pode
-- carimbar que ele foi verificado.
revoke update (status, verified_by, verified_at, rejection_reason)
  on pagora.credentials from authenticated;

drop policy if exists coverage_read on pagora.credential_coverage;
create policy coverage_read on pagora.credential_coverage
  for select to authenticated
  using (
    pagora.is_admin()
    or exists (
      select 1 from pagora.credentials c
      where c.id = credential_id and c.provider_id = auth.uid()
    )
  );

-- A matriz é pública para quem está logado: o prestador precisa saber o que
-- vão exigir dele antes de começar o cadastro.
drop policy if exists compliance_req_read on pagora.compliance_requirements;
create policy compliance_req_read on pagora.compliance_requirements
  for select to authenticated using (active);

-- ---------------------------------------------------------------------------
-- View: o que falta para cada veículo
-- ---------------------------------------------------------------------------
-- Conveniência de leitura para o painel do prestador e a fila do admin.
-- NÃO decide nada — só cruza exigências ativas com credenciais existentes.
-- A decisão continua em evaluateCheck(), no TypeScript.
create or replace view pagora.vehicle_compliance_gaps as
select
  v.id            as vehicle_id,
  v.provider_id,
  v.plate,
  r.service,
  r.kind,
  r.level,
  r.confidence,
  r.reason,
  r.legal_basis,
  coalesce(c.status, 'ausente'::pagora.credential_status) as status,
  c.expires_at
from pagora.vehicles v
join pagora.compliance_requirements r
  on r.active
 and (r.min_pbt_kg is null or coalesce(v.pbt_kg, 0) >= r.min_pbt_kg)
 and (r.max_pbt_kg is null or coalesce(v.pbt_kg, 0) <= r.max_pbt_kg)
 and (r.body_types is null or v.body_type = any (r.body_types))
left join pagora.credentials c
  on c.provider_id = v.provider_id
 and c.kind = r.kind
 and (c.vehicle_id = v.id or c.vehicle_id is null)
where r.level in ('obrigatorio', 'condicional');

comment on view pagora.vehicle_compliance_gaps is
  'Exigências ativas × credenciais existentes, por veículo. Camada de leitura — a decisão do selo é de evaluateCheck() no TypeScript.';
