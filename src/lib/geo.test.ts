import { describe, it, expect } from 'vitest';
import {
  haversineKm,
  bearingDeg,
  formatDistance,
  lerpLatLng,
  pointAlongRoute,
  SP_CENTER,
  MOCK_ROUTE,
  MOCK_NEARBY_PROVIDERS,
} from './geo';

describe('haversineKm', () => {
  it('distância de um ponto para ele mesmo é zero', () => {
    expect(haversineKm(SP_CENTER, SP_CENTER)).toBeCloseTo(0, 6);
  });

  it('bate com distância conhecida: Paulista → Pinheiros ≈ 4 km', () => {
    const pinheiros = { lat: -23.5673, lng: -46.6931 };
    const d = haversineKm(SP_CENTER, pinheiros);
    expect(d).toBeGreaterThan(3.5);
    expect(d).toBeLessThan(4.5);
  });

  it('é simétrica', () => {
    const a = { lat: -23.55, lng: -46.63 };
    const b = { lat: -23.57, lng: -46.69 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9);
  });

  it('1 grau de latitude ≈ 111 km', () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.19, 1);
  });
});

describe('bearingDeg', () => {
  it('norte = 0°', () => {
    expect(bearingDeg({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(0, 5);
  });

  it('leste = 90°', () => {
    expect(bearingDeg({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(90, 5);
  });

  it('sul = 180°', () => {
    expect(bearingDeg({ lat: 0, lng: 0 }, { lat: -1, lng: 0 })).toBeCloseTo(180, 5);
  });

  it('oeste = 270° (nunca negativo)', () => {
    const b = bearingDeg({ lat: 0, lng: 0 }, { lat: 0, lng: -1 });
    expect(b).toBeCloseTo(270, 5);
    expect(b).toBeGreaterThanOrEqual(0);
  });
});

describe('formatDistance', () => {
  it('abaixo de 1 km vira metros', () => {
    expect(formatDistance(0.8)).toBe('800 m');
    expect(formatDistance(0.05)).toBe('50 m');
  });

  it('acima de 1 km usa vírgula decimal (pt-BR)', () => {
    expect(formatDistance(2.4)).toBe('2,4 km');
    expect(formatDistance(12)).toBe('12,0 km');
  });
});

describe('lerpLatLng', () => {
  it('t=0 devolve o início, t=1 o fim', () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 10, lng: 20 };
    expect(lerpLatLng(a, b, 0)).toEqual(a);
    expect(lerpLatLng(a, b, 1)).toEqual(b);
  });

  it('t=0.5 cai no meio', () => {
    const m = lerpLatLng({ lat: 0, lng: 0 }, { lat: 10, lng: 20 }, 0.5);
    expect(m.lat).toBeCloseTo(5);
    expect(m.lng).toBeCloseTo(10);
  });
});

describe('pointAlongRoute', () => {
  it('rota vazia devolve null', () => {
    expect(pointAlongRoute([], 0.5)).toBeNull();
  });

  it('rota de um ponto devolve esse ponto', () => {
    const r = pointAlongRoute([SP_CENTER], 0.7);
    expect(r?.position).toEqual(SP_CENTER);
  });

  it('t=0 começa na origem da rota', () => {
    const r = pointAlongRoute(MOCK_ROUTE, 0);
    expect(r?.position.lat).toBeCloseTo(MOCK_ROUTE[0]!.lat, 6);
    expect(r?.position.lng).toBeCloseTo(MOCK_ROUTE[0]!.lng, 6);
  });

  it('t=1 termina no destino sem estourar o array', () => {
    // O índice do segmento precisa ser preso; sem isso t=1 leria route[n].
    const r = pointAlongRoute(MOCK_ROUTE, 1);
    const last = MOCK_ROUTE[MOCK_ROUTE.length - 1]!;
    expect(r?.position.lat).toBeCloseTo(last.lat, 6);
    expect(r?.position.lng).toBeCloseTo(last.lng, 6);
  });

  it('prende t fora do intervalo 0–1', () => {
    const antes = pointAlongRoute(MOCK_ROUTE, -3);
    const depois = pointAlongRoute(MOCK_ROUTE, 9);
    expect(antes?.position.lat).toBeCloseTo(MOCK_ROUTE[0]!.lat, 6);
    expect(depois?.position.lat).toBeCloseTo(MOCK_ROUTE[MOCK_ROUTE.length - 1]!.lat, 6);
  });

  it('traveled e remaining se encontram na posição atual', () => {
    const r = pointAlongRoute(MOCK_ROUTE, 0.45)!;
    expect(r.traveled[r.traveled.length - 1]).toEqual(r.position);
    expect(r.remaining[0]).toEqual(r.position);
  });

  it('percorrido cresce conforme t avança', () => {
    const a = pointAlongRoute(MOCK_ROUTE, 0.2)!;
    const b = pointAlongRoute(MOCK_ROUTE, 0.8)!;
    expect(b.traveled.length).toBeGreaterThanOrEqual(a.traveled.length);
    expect(b.remaining.length).toBeLessThanOrEqual(a.remaining.length);
  });

  it('a distância até o destino diminui conforme avança', () => {
    const dest = MOCK_ROUTE[MOCK_ROUTE.length - 1]!;
    const inicio = haversineKm(pointAlongRoute(MOCK_ROUTE, 0.1)!.position, dest);
    const fim = haversineKm(pointAlongRoute(MOCK_ROUTE, 0.9)!.position, dest);
    expect(fim).toBeLessThan(inicio);
  });
});

describe('dados de demonstração', () => {
  it('prestadores mock têm coordenadas plausíveis para São Paulo', () => {
    for (const p of MOCK_NEARBY_PROVIDERS) {
      expect(p.lat).toBeGreaterThan(-24);
      expect(p.lat).toBeLessThan(-23);
      expect(p.lng).toBeGreaterThan(-47);
      expect(p.lng).toBeLessThan(-46);
    }
  });

  it('distance_km do mock confere com a posição declarada', () => {
    // Guarda contra mock incoerente: um pin longe do centro anunciando 0,8 km
    // faria a tela mentir de um jeito difícil de notar.
    for (const p of MOCK_NEARBY_PROVIDERS) {
      const real = haversineKm(SP_CENTER, { lat: p.lat, lng: p.lng });
      expect(Math.abs(real - p.distance_km)).toBeLessThan(0.1);
    }
  });
});
