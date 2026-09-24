-- ============================================================================
-- PAGORA — Geolocalização: prestadores próximos + rastreio "a caminho"
-- ============================================================================
-- Habilita duas features:
--   1. DESCOBERTA  — cliente vê prestadores próximos num mapa
--   2. RASTREIO    — cliente acompanha o prestador a caminho do pedido ativo
--
-- ---------------------------------------------------------------------------
-- Por que lat/lng em double precision e não PostGIS
-- ---------------------------------------------------------------------------
-- PostGIS seria o default óbvio, mas para este MVP pesa contra:
--   a) exige `create extension postgis` — mais um pré-requisito de dashboard
--      numa conta nova, e mais um modo de falha na primeira aplicação;
--   b) supabase-js devolve `geography` como WKB hexadecimal, que obriga
--      parsing no client — atrito real para ganho zero nesta escala;
--   c) `database.types.ts` fica com string opaca em vez de number.
--
-- Com prefiltro por bounding box (índice btree em lat/lng) + haversine exato
-- no segundo passo, a query serve dezenas de milhares de prestadores sem
-- esforço. Migrar para PostGIS depois é contido: adicionar a coluna
-- geography, backfill a partir de lat/lng, e trocar o corpo das RPCs — a
-- assinatura que o frontend consome não muda.
--
-- ---------------------------------------------------------------------------
-- Modelo de privacidade — três níveis de precisão
-- ---------------------------------------------------------------------------
-- Localização de prestador é PII sensível. Um prestador autônomo costuma
-- operar a partir de casa, então expor o ponto exato é expor o endereço
-- residencial dele. Os níveis:
--
--   NÍVEL 1 — descoberta (qualquer cliente autenticado)
--     Posição arredondada para grade de ~250 m + distância em faixa.
--     Suficiente para "tem 6 guinchos perto de mim", insuficiente para
--     bater na porta de alguém ou raspar a base com endereços exatos.
--
--   NÍVEL 2 — contraparte de pedido ativo
--     Posição exata, e só enquanto o pedido está em andamento. Assim que o
--     pedido encerra, o acesso à posição do prestador cessa.
--
--   NÍVEL 3 — service_role / admin
--     Tudo, para suporte e resolução de disputa.
--
-- A fronteira é estrutural, não por convenção: `provider_presence` tem RLS
-- forçado SEM policy de SELECT. Ninguém lê a tabela direto via PostgREST.
-- Toda leitura passa pelas RPCs SECURITY DEFINER abaixo, que aplicam o nível
-- correto. Não dá para esquecer de filtrar: não existe caminho sem filtro.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers geométricos
-- ---------------------------------------------------------------------------

-- Distância em km entre dois pontos (haversine). IMMUTABLE — pode ser usada
-- em índice e o planner pode constant-fold.
create or replace function pagora.haversine_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable parallel safe as $$
  select 6371.0088 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2))
      * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

comment on function pagora.haversine_km is
  'Distância em km entre dois pares lat/lng. Raio médio da Terra (6371.0088 km).';

-- Rumo (0-360°, 0 = norte) de um ponto para outro. Usado para rotacionar o
-- ícone do veículo no mapa quando o GPS não reporta heading próprio.
create or replace function pagora.bearing_deg(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable parallel safe as $$
  select mod(
    degrees(atan2(
      sin(radians(lng2 - lng1)) * cos(radians(lat2)),
      cos(radians(lat1)) * sin(radians(lat2))
        - sin(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2 - lng1))
    ))::numeric + 360,
    360
  )::double precision;
$$;

-- Arredonda uma coordenada para uma grade. grid_deg 0.00225 ≈ 250 m.
-- Determinístico: o mesmo prestador cai sempre na mesma célula, então o pin
-- não "treme" entre refreshes — o que denunciaria a posição real por média.
create or replace function pagora.snap_coord(
  v double precision, grid_deg double precision
) returns double precision
language sql immutable parallel safe as $$
  select round((v / grid_deg)::numeric)::double precision * grid_deg;
$$;

comment on function pagora.snap_coord is
  'Arredonda coordenada para grade fixa (fuzzing de descoberta). Determinístico de propósito: posição média de N leituras não converge para o ponto real.';

-- ---------------------------------------------------------------------------
-- providers — base de operação
-- ---------------------------------------------------------------------------
-- Ponto âncora do prestador (garagem/base). Usado como posição aproximada
-- quando ele está offline, e para casar `service_areas` com geografia real.
alter table pagora.providers
  add column if not exists base_lat double precision,
  add column if not exists base_lng double precision,
  add column if not exists base_radius_km double precision not null default 15;

alter table pagora.providers
  drop constraint if exists providers_base_coords_valid;
alter table pagora.providers
  add constraint providers_base_coords_valid check (
    (base_lat is null and base_lng is null)
    or (base_lat between -90 and 90 and base_lng between -180 and 180)
  );

alter table pagora.providers
  drop constraint if exists providers_base_radius_sane;
alter table pagora.providers
  add constraint providers_base_radius_sane check (base_radius_km > 0 and base_radius_km <= 500);

-- Prefiltro de bounding box. Índice composto cobre o range em lat e filtra
-- lng no heap — ordem importa: lat primeiro porque o range em lat é sempre
-- simétrico, enquanto o de lng varia com cos(lat).
create index if not exists providers_base_coords_idx
  on pagora.providers (base_lat, base_lng)
  where approved_at is not null and base_lat is not null;

-- ---------------------------------------------------------------------------
-- provider_presence — posição ao vivo
-- ---------------------------------------------------------------------------
-- Tabela separada de `providers` de propósito: recebe escrita de alta
-- frequência (ping a cada ~15 s por prestador online). Mantê-la fora da
-- tabela principal evita que o autovacuum brigue com a tabela que todo o
-- resto do app lê, e deixa o índice de presença pequeno e quente.
create table if not exists pagora.provider_presence (
  provider_id   uuid primary key references pagora.providers(profile_id) on delete cascade,

  lat           double precision not null,
  lng           double precision not null,

  -- rumo em graus (0 = norte) e velocidade em km/h, quando o device reporta
  heading_deg   double precision,
  speed_kmh     double precision,
  accuracy_m    double precision,

  -- prestador se declara disponível para receber pedido
  is_available  boolean not null default false,

  last_ping_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),

  constraint presence_coords_valid check (
    lat between -90 and 90 and lng between -180 and 180
  ),
  constraint presence_heading_valid check (
    heading_deg is null or (heading_deg >= 0 and heading_deg < 360)
  ),
  constraint presence_speed_sane check (
    speed_kmh is null or (speed_kmh >= 0 and speed_kmh <= 400)
  )
);

create index if not exists presence_live_idx
  on pagora.provider_presence (lat, lng)
  where is_available;

create index if not exists presence_ping_idx
  on pagora.provider_presence (last_ping_at desc);

comment on table pagora.provider_presence is
  'Posição ao vivo do prestador. RLS forçado sem policy de SELECT — leitura só via RPC (nearby_providers / order_tracking), que aplicam o nível de precisão correto.';

-- ---------------------------------------------------------------------------
-- service_requests — coordenadas de origem e destino
-- ---------------------------------------------------------------------------
alter table pagora.service_requests
  add column if not exists origin_lat double precision,
  add column if not exists origin_lng double precision,
  add column if not exists dest_lat   double precision,
  add column if not exists dest_lng   double precision;

alter table pagora.service_requests
  drop constraint if exists requests_origin_coords_valid;
alter table pagora.service_requests
  add constraint requests_origin_coords_valid check (
    (origin_lat is null and origin_lng is null)
    or (origin_lat between -90 and 90 and origin_lng between -180 and 180)
  );

alter table pagora.service_requests
  drop constraint if exists requests_dest_coords_valid;
alter table pagora.service_requests
  add constraint requests_dest_coords_valid check (
    (dest_lat is null and dest_lng is null)
    or (dest_lat between -90 and 90 and dest_lng between -180 and 180)
  );

create index if not exists requests_origin_coords_idx
  on pagora.service_requests (origin_lat, origin_lng)
  where status in ('open', 'quoting') and origin_lat is not null;

-- ---------------------------------------------------------------------------
-- order_waypoints — trilha do pedido em andamento
-- ---------------------------------------------------------------------------
-- Breadcrumb da rota. Serve para (a) desenhar o trajeto percorrido no mapa,
-- (b) provar percurso numa disputa, (c) estimar ETA por velocidade média real
-- em vez de linha reta.
--
-- Append-only e sem UPDATE: a trilha é registro histórico. Retenção fica a
-- cargo de um job de limpeza (waypoints de pedido encerrado há > 90 dias).
create table if not exists pagora.order_waypoints (
  id           bigserial primary key,
  order_id     uuid not null references pagora.orders(id) on delete cascade,
  lat          double precision not null,
  lng          double precision not null,
  heading_deg  double precision,
  speed_kmh    double precision,
  recorded_at  timestamptz not null default now(),

  constraint waypoint_coords_valid check (
    lat between -90 and 90 and lng between -180 and 180
  )
);

create index if not exists order_waypoints_order_idx
  on pagora.order_waypoints (order_id, recorded_at desc);

comment on table pagora.order_waypoints is
  'Trilha append-only do pedido em andamento. Usada para desenhar rota, calcular ETA real e servir de prova em disputa.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table pagora.provider_presence enable row level security;
alter table pagora.provider_presence force row level security;
alter table pagora.order_waypoints   enable row level security;
alter table pagora.order_waypoints   force row level security;

-- provider_presence: o prestador escreve a própria linha. NÃO existe policy
-- de SELECT — é isso que força toda leitura pelas RPCs.
drop policy if exists presence_insert_self on pagora.provider_presence;
create policy presence_insert_self on pagora.provider_presence
  for insert to authenticated
  with check (provider_id = auth.uid());

drop policy if exists presence_update_self on pagora.provider_presence;
create policy presence_update_self on pagora.provider_presence
  for update to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

drop policy if exists presence_delete_self on pagora.provider_presence;
create policy presence_delete_self on pagora.provider_presence
  for delete to authenticated
  using (provider_id = auth.uid());

-- order_waypoints: só o prestador do pedido grava, e só enquanto o pedido
-- está em andamento. Sem UPDATE/DELETE para ninguém — trilha é imutável.
drop policy if exists waypoints_insert_provider on pagora.order_waypoints;
create policy waypoints_insert_provider on pagora.order_waypoints
  for insert to authenticated
  with check (
    exists (
      select 1 from pagora.orders o
      where o.id = order_id
        and o.provider_id = auth.uid()
        and o.status = 'in_progress'
    )
  );

-- Leitura da trilha: as duas partes do pedido, e o admin.
drop policy if exists waypoints_select_party on pagora.order_waypoints;
create policy waypoints_select_party on pagora.order_waypoints
  for select to authenticated
  using (
    pagora.is_admin()
    or exists (
      select 1 from pagora.orders o
      where o.id = order_id
        and (o.client_id = auth.uid() or o.provider_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- RPC: update_my_position() — prestador reporta onde está
-- ---------------------------------------------------------------------------
-- Um único entrypoint para o ping de GPS. Faz upsert na presença e, se o
-- prestador tem pedido em andamento, grava o waypoint na mesma transação —
-- assim a trilha nunca diverge da presença.
create or replace function pagora.update_my_position(
  p_lat         double precision,
  p_lng         double precision,
  p_heading_deg double precision default null,
  p_speed_kmh   double precision default null,
  p_accuracy_m  double precision default null,
  p_available   boolean default null
) returns void
security definer set search_path = pagora, public
language plpgsql as $$
declare
  v_order_id uuid;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  if not exists (select 1 from pagora.providers where profile_id = auth.uid()) then
    raise exception 'not_a_provider';
  end if;

  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90
     or p_lng not between -180 and 180 then
    raise exception 'invalid_coordinates';
  end if;

  insert into pagora.provider_presence as pp
    (provider_id, lat, lng, heading_deg, speed_kmh, accuracy_m, is_available, last_ping_at)
  values
    (auth.uid(), p_lat, p_lng, p_heading_deg, p_speed_kmh, p_accuracy_m,
     coalesce(p_available, false), now())
  on conflict (provider_id) do update set
    lat          = excluded.lat,
    lng          = excluded.lng,
    heading_deg  = excluded.heading_deg,
    speed_kmh    = excluded.speed_kmh,
    accuracy_m   = excluded.accuracy_m,
    -- p_available null = "só estou pingando", preserva o estado atual
    is_available = coalesce(p_available, pp.is_available),
    last_ping_at = now();

  -- Pedido em andamento? Registra a trilha junto.
  select o.id into v_order_id
    from pagora.orders o
   where o.provider_id = auth.uid()
     and o.status = 'in_progress'
   order by o.created_at desc
   limit 1;

  if v_order_id is not null then
    insert into pagora.order_waypoints (order_id, lat, lng, heading_deg, speed_kmh)
    values (v_order_id, p_lat, p_lng, p_heading_deg, p_speed_kmh);
  end if;
end;
$$;

revoke all on function pagora.update_my_position(double precision, double precision, double precision, double precision, double precision, boolean) from public;
grant execute on function pagora.update_my_position(double precision, double precision, double precision, double precision, double precision, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: nearby_providers() — NÍVEL 1, posição borrada
-- ---------------------------------------------------------------------------
-- Prestadores próximos para a tela de descoberta. Devolve posição arredondada
-- para grade de ~250 m e distância arredondada para 100 m. Nunca o ponto real.
--
-- Prestador online (ping recente) entra com a posição ao vivo; offline entra
-- com a base. `is_live` diz ao frontend qual dos dois está vendo, para não
-- prometer disponibilidade que não existe.
create or replace function pagora.nearby_providers(
  p_lat       double precision,
  p_lng       double precision,
  p_service   pagora.service_type default null,
  p_radius_km double precision default 10,
  p_limit     int default 50
) returns table (
  provider_id   uuid,
  display_name  text,
  services      pagora.service_type[],
  vehicle_type  text,
  rating_avg    numeric,
  rating_count  int,
  lat           double precision,
  lng           double precision,
  distance_km   double precision,
  is_live       boolean,
  is_available  boolean,
  last_seen_at  timestamptz
)
security definer set search_path = pagora, public
language plpgsql stable as $$
declare
  v_radius   double precision;
  v_limit    int;
  v_grid     constant double precision := 0.00225;  -- ~250 m
  v_lat_pad  double precision;
  v_lng_pad  double precision;
  -- Ping mais velho que isto = prestador considerado offline.
  v_live_cut constant interval := interval '2 minutes';
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90
     or p_lng not between -180 and 180 then
    raise exception 'invalid_coordinates';
  end if;

  -- Teto no raio e no limite: sem isso, um cliente pede raio 20000 km e
  -- pagina a base inteira de prestadores.
  v_radius := least(greatest(coalesce(p_radius_km, 10), 0.5), 50);
  v_limit  := least(greatest(coalesce(p_limit, 50), 1), 200);

  -- Bounding box para o prefiltro indexado. O padding em longitude cresce
  -- com a latitude (os meridianos convergem nos polos); o clamp em 0.01
  -- evita divisão por ~zero perto dos polos.
  v_lat_pad := v_radius / 111.045;
  v_lng_pad := v_radius / (111.045 * greatest(cos(radians(p_lat)), 0.01));

  return query
  with candidate as (
    select
      pr.profile_id,
      pr.display_name,
      pr.services,
      pr.vehicle_type,
      pr.rating_avg,
      pr.rating_count,
      -- posição ao vivo quando o ping é recente, senão a base
      case when pp.last_ping_at > now() - v_live_cut then pp.lat else pr.base_lat end as raw_lat,
      case when pp.last_ping_at > now() - v_live_cut then pp.lng else pr.base_lng end as raw_lng,
      (pp.last_ping_at > now() - v_live_cut)                       as live,
      coalesce(pp.is_available and pp.last_ping_at > now() - v_live_cut, false) as avail,
      pp.last_ping_at
    from pagora.providers pr
    left join pagora.provider_presence pp on pp.provider_id = pr.profile_id
    where pr.approved_at is not null
      and (p_service is null or p_service = any (pr.services))
      -- prefiltro por bbox nas duas fontes possíveis de posição
      and (
        (pr.base_lat between p_lat - v_lat_pad and p_lat + v_lat_pad
         and pr.base_lng between p_lng - v_lng_pad and p_lng + v_lng_pad)
        or
        (pp.lat between p_lat - v_lat_pad and p_lat + v_lat_pad
         and pp.lng between p_lng - v_lng_pad and p_lng + v_lng_pad)
      )
  ),
  measured as (
    select
      c.*,
      pagora.haversine_km(p_lat, p_lng, c.raw_lat, c.raw_lng) as dist
    from candidate c
    where c.raw_lat is not null and c.raw_lng is not null
  )
  select
    m.profile_id,
    m.display_name,
    m.services,
    m.vehicle_type,
    m.rating_avg,
    m.rating_count,
    -- NÍVEL 1: grade de ~250 m, nunca o ponto exato
    pagora.snap_coord(m.raw_lat, v_grid),
    pagora.snap_coord(m.raw_lng, v_grid),
    -- distância arredondada para 100 m; trilateração com 3 consultas de
    -- pontos diferentes ainda reduz a área, mas a grade limita o ganho
    round(m.dist::numeric, 1)::double precision,
    m.live,
    m.avail,
    -- minuto cheio: segundo exato permitiria inferir cadência de ping
    date_trunc('minute', m.last_ping_at)
  from measured m
  where m.dist <= v_radius
  order by m.dist asc
  limit v_limit;
end;
$$;

revoke all on function pagora.nearby_providers(double precision, double precision, pagora.service_type, double precision, int) from public;
grant execute on function pagora.nearby_providers(double precision, double precision, pagora.service_type, double precision, int) to authenticated;

comment on function pagora.nearby_providers is
  'NÍVEL 1 (descoberta): prestadores próximos com posição arredondada para ~250 m. Nunca devolve coordenada exata. Raio limitado a 50 km e 200 resultados.';

-- ---------------------------------------------------------------------------
-- RPC: order_tracking() — NÍVEL 2, posição exata
-- ---------------------------------------------------------------------------
-- Posição precisa do prestador de UM pedido, liberada só para a contraparte
-- e só enquanto o pedido está vivo. Encerrou o pedido, corta o acesso.
create or replace function pagora.order_tracking(p_order_id uuid)
returns table (
  order_id        uuid,
  order_status    pagora.order_status,
  provider_id     uuid,
  provider_name   text,
  vehicle_model   text,
  vehicle_plate   text,
  vehicle_color   text,
  rating_avg      numeric,
  rating_count    int,
  lat             double precision,
  lng             double precision,
  heading_deg     double precision,
  speed_kmh       double precision,
  last_ping_at    timestamptz,
  is_live         boolean,
  dest_lat        double precision,
  dest_lng        double precision,
  distance_km     double precision,
  eta_minutes     int
)
security definer set search_path = pagora, public
language plpgsql stable as $$
declare
  v_order   pagora.orders;
  v_request pagora.service_requests;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  select * into v_order from pagora.orders o where o.id = p_order_id;
  if not found then
    raise exception 'order_not_found';
  end if;

  -- A checagem que sustenta o NÍVEL 2.
  if not (v_order.client_id = auth.uid()
          or v_order.provider_id = auth.uid()
          or pagora.is_admin()) then
    raise exception 'forbidden: not a party to this order';
  end if;

  -- Rastreio é privilégio de pedido vivo. Pedido encerrado/cancelado para de
  -- expor a posição do prestador.
  if v_order.status not in ('pending_payment', 'in_progress') then
    raise exception 'order_not_trackable: status is %', v_order.status;
  end if;

  select * into v_request
    from pagora.service_requests sr
   where sr.id = v_order.request_id;

  return query
  with pos as (
    select
      pp.lat, pp.lng, pp.heading_deg, pp.speed_kmh, pp.last_ping_at,
      (pp.last_ping_at > now() - interval '2 minutes') as live
    from pagora.provider_presence pp
    where pp.provider_id = v_order.provider_id
  ),
  target as (
    -- Destino do rastreio é onde o prestador precisa CHEGAR. No frete isso é
    -- a origem da carga (ele vai buscar); guincho e caçamba idem. O ponto de
    -- entrega só passa a valer depois da coleta, e o app troca o alvo quando
    -- a etapa muda.
    select
      coalesce(v_request.origin_lat, v_request.dest_lat) as tlat,
      coalesce(v_request.origin_lng, v_request.dest_lng) as tlng
  )
  select
    v_order.id,
    v_order.status,
    v_order.provider_id,
    pr.display_name,
    pr.vehicle_model,
    pr.vehicle_plate,
    pr.vehicle_color,
    pr.rating_avg,
    pr.rating_count,
    -- NÍVEL 2: coordenada exata, sem arredondar
    p.lat,
    p.lng,
    -- heading do device, ou calculado em direção ao alvo
    coalesce(p.heading_deg, pagora.bearing_deg(p.lat, p.lng, t.tlat, t.tlng)),
    p.speed_kmh,
    p.last_ping_at,
    coalesce(p.live, false),
    t.tlat,
    t.tlng,
    pagora.haversine_km(p.lat, p.lng, t.tlat, t.tlng),
    -- ETA por velocidade instantânea quando o veículo está em movimento
    -- (> 5 km/h), senão por média urbana de 25 km/h. Linha reta com fator
    -- 1.35 de sinuosidade — aproximação honesta sem serviço de rota.
    case
      when t.tlat is null or p.lat is null then null
      else greatest(1, ceil(
        (pagora.haversine_km(p.lat, p.lng, t.tlat, t.tlng) * 1.35)
        / (case when coalesce(p.speed_kmh, 0) > 5 then p.speed_kmh else 25 end)
        * 60
      ))::int
    end
  from pagora.providers pr
  cross join target t
  left join pos p on true
  where pr.profile_id = v_order.provider_id;
end;
$$;

revoke all on function pagora.order_tracking(uuid) from public;
grant execute on function pagora.order_tracking(uuid) to authenticated;

comment on function pagora.order_tracking is
  'NÍVEL 2 (rastreio): posição EXATA do prestador, só para a contraparte do pedido e só enquanto o pedido está ativo.';

-- ---------------------------------------------------------------------------
-- RPC: my_active_order() — qual pedido o app deve rastrear
-- ---------------------------------------------------------------------------
-- Evita o round-trip "lista pedidos, filtra no client, pede rastreio".
create or replace function pagora.my_active_order()
returns uuid
security definer set search_path = pagora, public
language sql stable as $$
  select o.id
    from pagora.orders o
   where (o.client_id = auth.uid() or o.provider_id = auth.uid())
     and o.status in ('pending_payment', 'in_progress')
   order by o.created_at desc
   limit 1;
$$;

revoke all on function pagora.my_active_order() from public;
grant execute on function pagora.my_active_order() to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
-- provider_presence NÃO entra na publication de propósito: Realtime entrega
-- a linha inteira e reavalia RLS por assinante, o que vazaria a coordenada
-- exata para fora do NÍVEL 2. O rastreio ao vivo usa polling da RPC
-- order_tracking, que aplica a checagem de contraparte a cada chamada.
alter publication supabase_realtime add table pagora.order_waypoints;
