-- ============================================================================
-- PAGORA — Detalhes do veículo e habilitação na candidatura
-- ============================================================================
-- Contexto: `phase4.tsx` coletava um dossiê completo do prestador em 5 passos
-- e não gravava NADA — o candidato preenchia tudo e o dado evaporava.
--
-- O destino correto é esta tabela, não `providers`. A 0004 já explicava por
-- quê: `providers.profile_id` depende de `auth.users`, e o candidato ainda não
-- tem conta. `provider_applications` é a caixa de entrada pública; o admin
-- aprova e só então o fluxo migra para `providers`.
--
-- ---------------------------------------------------------------------------
-- O que NÃO entra aqui, de propósito
-- ---------------------------------------------------------------------------
-- Banco, agência, conta e chave Pix ficaram de fora. Não existe motivo para
-- guardar dado de pagamento de candidato que ainda não foi aprovado: ele só
-- recebe depois de ter pedido concluído, o que exige aprovação e login. Até
-- lá é passivo sem contrapartida — e numa tabela que aceita INSERT anônimo.
--
-- `providers` já tem `pix_key`, `bank_name`, `bank_agency` e `bank_account`
-- desde a 0001. É lá que esse dado entra, depois da aprovação, com o
-- prestador autenticado escrevendo na própria linha.
--
-- Foto de selfie e documento também ficam de fora: o upload não existe ainda
-- (precisa de Storage). Gravar um booleano `selfie = true` sem arquivo por
-- trás seria registrar uma verificação que não aconteceu.
-- ============================================================================

alter table pagora.provider_applications
  -- CPF: base da consulta ao RNTRC quando o prestador é TAC, e chave de
  -- deduplicação na triagem. Validado no client (dígito verificador) antes
  -- de chegar aqui — ver src/lib/documentos.ts.
  add column if not exists cpf text,

  add column if not exists cnh_number text,
  add column if not exists cnh_category text,

  -- `plate` guarda o que o candidato digitou; `plate_key` é a forma canônica
  -- Mercosul (ver plateKey() em src/lib/placa.ts). Guardar as duas permite
  -- mostrar ao admin o que foi digitado e ainda assim deduplicar entre
  -- formatos: ABC1234 e ABC1B34 são o mesmo caminhão.
  add column if not exists plate text,
  add column if not exists plate_key text,

  add column if not exists vehicle_model text,
  add column if not exists vehicle_year int,
  add column if not exists vehicle_color text,
  add column if not exists body_type pagora.body_type,

  -- PBT é o que define categoria de CNH exigida e se a ANTT exige RNTRC.
  -- Separado de capacidade de propósito: capacidade é carga útil, PBT é o
  -- veículo carregado.
  add column if not exists pbt_kg int,
  add column if not exists capacity_kg int;

alter table pagora.provider_applications
  drop constraint if exists provider_apps_plate_key_format;
alter table pagora.provider_applications
  add constraint provider_apps_plate_key_format check (
    plate_key is null or plate_key ~ '^[A-Z]{3}[0-9][A-Z][0-9]{2}$'
  );

alter table pagora.provider_applications
  drop constraint if exists provider_apps_cnh_category_valid;
alter table pagora.provider_applications
  add constraint provider_apps_cnh_category_valid check (
    cnh_category is null or cnh_category in ('A','B','C','D','E','AB','AC','AD','AE')
  );

alter table pagora.provider_applications
  drop constraint if exists provider_apps_weights_sane;
alter table pagora.provider_applications
  add constraint provider_apps_weights_sane check (
    (pbt_kg is null or pbt_kg between 100 and 200000)
    and (capacity_kg is null or capacity_kg between 0 and 100000)
  );

alter table pagora.provider_applications
  drop constraint if exists provider_apps_year_sane;
alter table pagora.provider_applications
  add constraint provider_apps_year_sane check (
    vehicle_year is null or vehicle_year between 1950 and 2100
  );

-- Índices de triagem, NÃO-únicos de propósito.
--
-- Um unique em `plate_key` bloquearia caso legítimo: o dono do caminhão e o
-- motorista contratado podem se candidatar com a mesma placa, e são duas
-- candidaturas reais. O mesmo vale para CPF de quem se candidata a dois
-- serviços. O índice serve para o admin ENXERGAR a duplicata e decidir, não
-- para o banco decidir por ele.
create index if not exists provider_apps_plate_idx
  on pagora.provider_applications (plate_key, created_at desc)
  where plate_key is not null;

create index if not exists provider_apps_cpf_idx
  on pagora.provider_applications (cpf, created_at desc)
  where cpf is not null;

comment on column pagora.provider_applications.plate_key is
  'Forma canônica Mercosul da placa. Placa antiga e sua equivalente Mercosul produzem o mesmo valor — ver plateKey() em src/lib/placa.ts.';
comment on column pagora.provider_applications.pbt_kg is
  'Peso Bruto Total. Define a categoria de CNH exigida e se a ANTT exige RNTRC. Não confundir com capacity_kg (carga útil).';
