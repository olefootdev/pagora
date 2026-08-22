-- ============================================================================
-- PAGORA — 0009: formulários públicos e reputação
-- ============================================================================
-- Duas pontas soltas que a auditoria anotou e o fluxo financeiro não dependia:
--
--  1. `waitlist` e `provider_applications` aceitam INSERT anônimo com
--     `with check (true)`. É necessário — são formulários de captação, e exigir
--     login antes de captar derrota o propósito. Mas sem limite, um script
--     enche a tabela em minutos e a operação perde a caixa de entrada.
--
--  2. `providers.rating_avg` e `rating_count` nunca foram preenchidos. A coluna
--     existe desde a 0001, os reviews existem, e o número exibido no app é 0
--     para todo mundo. A 0006 revogou a escrita dessas colunas (era
--     auto-elogio), então a única saída correta é o banco calcular.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Rate limit dos formulários públicos
--
-- Feito por trigger e não por policy: uma policy `with check` não consegue
-- olhar para "quantas linhas este IP inseriu na última hora" sem uma subquery
-- que roda a cada tentativa e ainda por cima é contornável mudando de coluna.
-- O trigger centraliza a regra e produz mensagem de erro legível.
--
-- A janela é por `ip_hash` — que o frontend já preenche — e cai para o par
-- (telefone/email) quando não há IP, para que um cliente atrás de CGNAT não
-- bloqueie o prédio inteiro nem um bot sem IP passe livre.
-- ---------------------------------------------------------------------------
create or replace function pagora.enforce_public_form_rate_limit()
returns trigger
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

drop trigger if exists waitlist_rate_limit on pagora.waitlist;
create trigger waitlist_rate_limit
  before insert on pagora.waitlist
  for each row execute function pagora.enforce_public_form_rate_limit();

drop trigger if exists provider_apps_rate_limit on pagora.provider_applications;
create trigger provider_apps_rate_limit
  before insert on pagora.provider_applications
  for each row execute function pagora.enforce_public_form_rate_limit();

-- Índices que o trigger usa. Sem eles, cada insert vira um seq scan que piora
-- conforme a tabela cresce — ou seja, o rate limit ficaria mais caro
-- exatamente durante um ataque.
create index if not exists waitlist_ip_recent_idx
  on pagora.waitlist (ip_hash, created_at desc) where ip_hash is not null;
create index if not exists waitlist_phone_recent_idx
  on pagora.waitlist (phone, created_at desc) where phone is not null;
create index if not exists provider_apps_ip_recent_idx
  on pagora.provider_applications (ip_hash, created_at desc) where ip_hash is not null;

-- ---------------------------------------------------------------------------
-- 2. Reputação calculada pelo banco
--
-- `rating_avg` e `rating_count` passam a ser derivados de `pagora.reviews`.
-- Recalculamos a média inteira em vez de fazer aritmética incremental: com
-- volume de marketplace a diferença de custo é irrelevante, e uma média
-- incremental acumula erro e não se recupera de um review removido.
-- ---------------------------------------------------------------------------
create or replace function pagora.refresh_provider_rating()
returns trigger
security definer set search_path = pagora, public
language plpgsql as $$
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
$$;

drop trigger if exists reviews_refresh_rating on pagora.reviews;
create trigger reviews_refresh_rating
  after insert or update or delete on pagora.reviews
  for each row execute function pagora.refresh_provider_rating();

create index if not exists reviews_provider_stars_idx
  on pagora.reviews (provider_id, stars);

-- Backfill do que já existe (hoje, zero linhas — mas a migration precisa ser
-- correta se rodar num banco que já recebeu avaliações).
update pagora.providers p
   set rating_avg = coalesce(agg.avg_stars, 0),
       rating_count = coalesce(agg.n, 0)
  from (
    select provider_id, avg(stars)::numeric(3,2) as avg_stars, count(*) as n
      from pagora.reviews group by provider_id
  ) agg
 where p.profile_id = agg.provider_id;

comment on function pagora.refresh_provider_rating() is
  'Mantém providers.rating_avg/rating_count derivados de reviews. As colunas não são escrevíveis por authenticated (0006).';
comment on function pagora.enforce_public_form_rate_limit() is
  'Limita envios anônimos: 5/hora por ip_hash e 3/hora por telefone.';
