// =====================================================================
// PAGORA — Distância do trajeto
// =====================================================================
// Até aqui toda estimativa de frete usava 15 km fixos — o padrão do domínio,
// aplicado a um trajeto de 2 km e a um de 60 km igualmente. É o maior erro de
// preço que restava no produto.
//
// Este módulo resolve QUAL distância usar, e — igualmente importante — deixa
// registrado COMO ela foi obtida. Uma estimativa calculada sobre 15 km
// chutados e uma calculada sobre a rota real da via são números diferentes em
// natureza, e a tela precisa poder dizer isso ao cliente.
//
// Nada aqui chama a API do Google. É aritmética pura, para poder ser testada
// sem rede: quem busca a rota é `hooks/usePlaces.ts`.
// =====================================================================

import { DEFAULT_DISTANCE_KM } from '../pricing/frete-pricing';

export type LatLng = { lat: number; lng: number };

/**
 * De onde veio o número:
 *  - `route`    — distância por via, devolvida pelo Google. É a boa.
 *  - `straight` — linha reta entre os dois pontos, corrigida pelo fator
 *                 urbano abaixo. Vale quando há coordenada mas a rota falhou.
 *  - `default`  — nenhum endereço resolvido ainda. É o chute do domínio.
 */
export type DistanceSource = 'route' | 'straight' | 'default';

export type Distance = { km: number; source: DistanceSource };

/**
 * Quanto o trajeto por rua é mais longo que a linha reta, em cidade.
 *
 * 13/10 é uma escolha de modelagem, não um preço — e está aqui nomeada, com
 * teste, justamente para não virar um `* 1.3` solto no meio de um cálculo.
 * Ignorá-la seria pior que errá-la: linha reta pura subestima todo trajeto
 * urbano de forma sistemática, e subestimar preço no marketplace significa
 * prestador recusando pedido.
 *
 * Ela só existe no caminho de exceção. Quando a rota real responde, este
 * número não é usado.
 */
export const URBAN_ROAD_FACTOR_NUM = 13;
export const URBAN_ROAD_FACTOR_DEN = 10;

/** Raio médio da Terra, em km. */
const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distância em linha reta entre dois pontos (Haversine), em km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function isPoint(p: LatLng | null | undefined): p is LatLng {
  return (
    !!p &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  );
}

/** Arredonda para uma casa — a precisão que faz sentido mostrar e cobrar. */
function round1(km: number): number {
  return Math.round(km * 10) / 10;
}

export type ResolveDistanceInput = {
  /** Distância por via em METROS, como o Google devolve. */
  routeMeters?: number | null;
  origin?: LatLng | null;
  destination?: LatLng | null;
};

/**
 * Escolhe a melhor distância disponível, na ordem: rota real → linha reta
 * corrigida → padrão do domínio.
 *
 * Nunca devolve zero ou negativo: um trajeto de comprimento zero faria o
 * `calcFreteCents` estourar `PricingInputError` e a tela de estimativa sumir
 * inteira, quando o certo é cair no padrão e seguir.
 */
export function resolveDistance(input: ResolveDistanceInput): Distance {
  const meters = input.routeMeters;
  if (meters != null && Number.isFinite(meters) && meters > 0) {
    return { km: Math.max(0.1, round1(meters / 1000)), source: 'route' };
  }

  if (isPoint(input.origin) && isPoint(input.destination)) {
    const straight = haversineKm(input.origin, input.destination);
    if (straight > 0) {
      const corrected = (straight * URBAN_ROAD_FACTOR_NUM) / URBAN_ROAD_FACTOR_DEN;
      return { km: Math.max(0.1, round1(corrected)), source: 'straight' };
    }
  }

  return { km: DEFAULT_DISTANCE_KM, source: 'default' };
}

/** "12,4" — vírgula decimal, que é como se escreve distância em português. */
export function formatKm(km: number): string {
  return km.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * O rótulo que vai na linha de deslocamento do extrato.
 *
 * Cada origem tem uma palavra própria porque significam coisas diferentes, e
 * esconder a diferença é o que transforma estimativa em promessa quebrada.
 */
export function describeDistance(d: Distance): string {
  switch (d.source) {
    case 'route':
      return `${formatKm(d.km)} km por via`;
    case 'straight':
      return `${formatKm(d.km)} km aproximados`;
    case 'default':
      return `${formatKm(d.km)} km estimados`;
  }
}

/** Aviso curto quando a distância ainda não é real. `null` quando é. */
export function distanceCaveat(d: Distance): string | null {
  switch (d.source) {
    case 'route':
      return null;
    case 'straight':
      return 'Distância aproximada — o trajeto real pode variar.';
    case 'default':
      return 'Informe os endereços para calcular a distância real.';
  }
}
