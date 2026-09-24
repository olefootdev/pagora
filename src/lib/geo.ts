// =====================================================================
// PAGORA — Tipos e dados de geolocalização
// =====================================================================
// Os tipos abaixo espelham EXATAMENTE o retorno das RPCs da migration
// 0005_geolocation.sql. Isso é deliberado: quando o banco existir, trocar
// mock por dado real é trocar a origem, sem tocar nas telas.
//
//   NearbyProvider  ← pagora.nearby_providers()
//   OrderTracking   ← pagora.order_tracking()
//
// Enquanto o banco está congelado, `MOCK_*` alimenta a interface. Os pontos
// são coordenadas reais de São Paulo — mapa de verdade com dado de mentira,
// não o contrário.
// =====================================================================

export type LatLng = { lat: number; lng: number };

/** Espelha o retorno de pagora.nearby_providers(). */
export type NearbyProvider = {
  provider_id: string;
  display_name: string;
  services: string[];
  vehicle_type: string | null;
  rating_avg: number;
  rating_count: number;
  /** Já vem arredondada para grade de ~250 m pela RPC — nunca é o ponto exato. */
  lat: number;
  lng: number;
  distance_km: number;
  /** Posição ao vivo (ping recente) vs. base cadastrada. */
  is_live: boolean;
  is_available: boolean;
  last_seen_at: string | null;
};

/** Espelha o retorno de pagora.order_tracking(). */
export type OrderTracking = {
  order_id: string;
  order_status: string;
  provider_id: string;
  provider_name: string;
  vehicle_model: string | null;
  vehicle_plate: string | null;
  vehicle_color: string | null;
  rating_avg: number;
  rating_count: number;
  /** Coordenada EXATA — liberada só para a contraparte do pedido. */
  lat: number;
  lng: number;
  heading_deg: number | null;
  speed_kmh: number | null;
  last_ping_at: string | null;
  is_live: boolean;
  dest_lat: number | null;
  dest_lng: number | null;
  distance_km: number | null;
  eta_minutes: number | null;
};

// ─── Distância ───────────────────────────────────────────────────────

/**
 * Haversine em km. Mesma fórmula de pagora.haversine_km() na 0005.
 *
 * Duplicada de propósito: o client precisa reordenar e filtrar sem ida ao
 * servidor. Se a fórmula divergir, as distâncias do mapa param de bater com
 * as da busca — por isso ambas usam o mesmo raio (6371.0088 km).
 */
export const haversineKm = (a: LatLng, b: LatLng): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(h));
};

/** Rumo em graus (0 = norte). Usado para girar o ícone do veículo. */
export const bearingDeg = (a: LatLng, b: LatLng): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
};

/** Distância legível: abaixo de 1 km vira metros. */
export const formatDistance = (km: number): string =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;

/** Interpola entre dois pontos. Suaviza o salto entre pings no rastreio. */
export const lerpLatLng = (a: LatLng, b: LatLng, t: number): LatLng => ({
  lat: a.lat + (b.lat - a.lat) * t,
  lng: a.lng + (b.lng - a.lng) * t,
});

export type RoutePosition = {
  position: LatLng;
  /** Rumo do trecho atual, para girar o ícone. */
  heading: number;
  /** Trecho já percorrido, incluindo a posição atual. */
  traveled: LatLng[];
  /** Trecho restante, começando na posição atual. */
  remaining: LatLng[];
};

/**
 * Posição ao longo de uma rota, com `t` de 0 a 1.
 *
 * Interpola por SEGMENTO, não por distância total: cada trecho consome a
 * mesma fatia de `t`. Fica mais simples e é suficiente para animar chegada
 * entre pings — quando o rastreio real entrar, `t` vem do GPS e este helper
 * só suaviza o intervalo entre leituras.
 */
export const pointAlongRoute = (route: LatLng[], t: number): RoutePosition | null => {
  if (route.length === 0) return null;
  if (route.length === 1) {
    const only = route[0]!;
    return { position: only, heading: 0, traveled: [only], remaining: [only] };
  }

  const clamped = Math.min(1, Math.max(0, t));
  const segments = route.length - 1;
  // Em t = 1 o índice cairia fora do array; prende no último segmento.
  const idx = Math.min(segments - 1, Math.floor(clamped * segments));
  const local = clamped * segments - idx;

  const a = route[idx]!;
  const b = route[idx + 1]!;
  const position = lerpLatLng(a, b, local);

  return {
    position,
    heading: bearingDeg(a, b),
    traveled: [...route.slice(0, idx + 1), position],
    remaining: [position, ...route.slice(idx + 1)],
  };
};

// ─── Dados de demonstração ───────────────────────────────────────────

/** Centro padrão do mapa: Av. Paulista. */
export const SP_CENTER: LatLng = { lat: -23.5614, lng: -46.6559 };

export const MOCK_NEARBY_PROVIDERS: NearbyProvider[] = [
  {
    provider_id: 'p1',
    display_name: 'Carlos Mudanças',
    services: ['frete'],
    vehicle_type: 'Baú 3/4',
    rating_avg: 4.7,
    rating_count: 89,
    lat: -23.5583,
    lng: -46.6625,
    distance_km: 0.8,
    is_live: true,
    is_available: true,
    last_seen_at: new Date().toISOString(),
  },
  {
    provider_id: 'p2',
    display_name: 'JM Transportes',
    services: ['frete'],
    vehicle_type: 'Van média',
    rating_avg: 4.9,
    rating_count: 142,
    lat: -23.5502,
    lng: -46.6489,
    distance_km: 1.4,
    is_live: true,
    is_available: true,
    last_seen_at: new Date().toISOString(),
  },
  {
    provider_id: 'p3',
    display_name: 'Frete Já SP',
    services: ['frete'],
    vehicle_type: 'Caminhão toco',
    rating_avg: 4.8,
    rating_count: 256,
    lat: -23.5721,
    lng: -46.6612,
    distance_km: 1.3,
    is_live: false,
    is_available: false,
    last_seen_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
  },
  {
    provider_id: 'p4',
    display_name: 'Roberto Frota',
    services: ['guincho'],
    vehicle_type: 'Guincho prancha',
    rating_avg: 4.5,
    rating_count: 47,
    lat: -23.5668,
    lng: -46.6418,
    distance_km: 1.6,
    is_live: true,
    is_available: true,
    last_seen_at: new Date().toISOString(),
  },
  {
    provider_id: 'p5',
    display_name: 'Lúcia Caçambas',
    services: ['cacamba'],
    vehicle_type: 'Poliguindaste',
    rating_avg: 4.6,
    rating_count: 64,
    lat: -23.5789,
    lng: -46.6731,
    distance_km: 2.6,
    is_live: false,
    is_available: false,
    last_seen_at: new Date(Date.now() - 26 * 3600_000).toISOString(),
  },
  {
    provider_id: 'p6',
    display_name: 'Auto Socorro 24h',
    services: ['guincho'],
    vehicle_type: 'Guincho asa-delta',
    rating_avg: 4.8,
    rating_count: 311,
    lat: -23.5468,
    lng: -46.6701,
    distance_km: 2.2,
    is_live: true,
    is_available: true,
    last_seen_at: new Date().toISOString(),
  },
];

/** Rota de demonstração do rastreio: Pinheiros → Av. Paulista. */
export const MOCK_ROUTE: LatLng[] = [
  { lat: -23.5673, lng: -46.6931 },
  { lat: -23.5651, lng: -46.6842 },
  { lat: -23.5638, lng: -46.6756 },
  { lat: -23.5629, lng: -46.6671 },
  { lat: -23.5618, lng: -46.6602 },
  { lat: -23.5614, lng: -46.6559 },
];

export const MOCK_TRACKING: OrderTracking = {
  order_id: 'PG-1247',
  order_status: 'in_progress',
  provider_id: 'p1',
  provider_name: 'Carlos M.',
  vehicle_model: 'Fiat Fiorino',
  vehicle_plate: 'BRA2E47',
  vehicle_color: 'Branco',
  rating_avg: 4.7,
  rating_count: 89,
  lat: MOCK_ROUTE[0]!.lat,
  lng: MOCK_ROUTE[0]!.lng,
  heading_deg: null,
  speed_kmh: 42,
  last_ping_at: new Date().toISOString(),
  is_live: true,
  dest_lat: SP_CENTER.lat,
  dest_lng: SP_CENTER.lng,
  distance_km: 2.4,
  eta_minutes: 8,
};
