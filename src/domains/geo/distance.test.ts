import { describe, it, expect } from 'vitest';
import {
  describeDistance,
  distanceCaveat,
  formatKm,
  haversineKm,
  resolveDistance,
  URBAN_ROAD_FACTOR_DEN,
  URBAN_ROAD_FACTOR_NUM,
} from './distance';
import { calcFreteCents, DEFAULT_DISTANCE_KM } from '../pricing/frete-pricing';

// Pontos reais de São Paulo — a distância entre eles é conferível.
const PAULISTA = { lat: -23.5613, lng: -46.6565 };
const IBIRAPUERA = { lat: -23.5874, lng: -46.6576 };
const GUARULHOS = { lat: -23.4356, lng: -46.4731 };

describe('haversineKm', () => {
  it('mede uma distância urbana curta com precisão razoável', () => {
    // Paulista → Ibirapuera são ~2,9 km em linha reta.
    expect(haversineKm(PAULISTA, IBIRAPUERA)).toBeGreaterThan(2.5);
    expect(haversineKm(PAULISTA, IBIRAPUERA)).toBeLessThan(3.3);
  });

  it('mede uma distância metropolitana', () => {
    // Paulista → Guarulhos são ~24 km em linha reta.
    expect(haversineKm(PAULISTA, GUARULHOS)).toBeGreaterThan(21);
    expect(haversineKm(PAULISTA, GUARULHOS)).toBeLessThan(27);
  });

  it('o mesmo ponto dá zero', () => {
    expect(haversineKm(PAULISTA, PAULISTA)).toBe(0);
  });

  it('é simétrica', () => {
    expect(haversineKm(PAULISTA, GUARULHOS)).toBeCloseTo(haversineKm(GUARULHOS, PAULISTA), 6);
  });
});

describe('resolveDistance — ordem de preferência', () => {
  it('a rota real vence tudo', () => {
    const d = resolveDistance({ routeMeters: 12_400, origin: PAULISTA, destination: GUARULHOS });
    expect(d).toEqual({ km: 12.4, source: 'route' });
  });

  it('sem rota, usa linha reta corrigida pelo fator urbano', () => {
    const d = resolveDistance({ origin: PAULISTA, destination: IBIRAPUERA });
    expect(d.source).toBe('straight');
    const reta = haversineKm(PAULISTA, IBIRAPUERA);
    expect(d.km).toBeCloseTo(
      Math.round(((reta * URBAN_ROAD_FACTOR_NUM) / URBAN_ROAD_FACTOR_DEN) * 10) / 10,
      5,
    );
  });

  it('a correção urbana aumenta a distância, nunca diminui', () => {
    // Linha reta pura subestima todo trajeto de cidade. Subestimar preço
    // significa prestador recusando pedido.
    const d = resolveDistance({ origin: PAULISTA, destination: GUARULHOS });
    expect(d.km).toBeGreaterThan(haversineKm(PAULISTA, GUARULHOS));
  });

  it('sem coordenada nenhuma, cai no padrão do domínio', () => {
    expect(resolveDistance({})).toEqual({ km: DEFAULT_DISTANCE_KM, source: 'default' });
    expect(resolveDistance({ origin: PAULISTA })).toEqual({
      km: DEFAULT_DISTANCE_KM,
      source: 'default',
    });
  });
});

describe('resolveDistance — o que não pode acontecer', () => {
  it('nunca devolve zero — zerar estoura o cálculo de preço', () => {
    // `calcFreteCents` levanta PricingInputError com km <= 0, e a tela de
    // estimativa sumiria inteira. Origem e destino iguais é caso real:
    // caçamba entrega e retira no mesmo endereço.
    const mesmoPonto = resolveDistance({ origin: PAULISTA, destination: PAULISTA });
    expect(mesmoPonto.km).toBeGreaterThan(0);
    expect(() => calcFreteCents({ distanceKm: mesmoPonto.km, vehicle: 'van' })).not.toThrow();
  });

  it('rota de metros inválidos não vira distância', () => {
    for (const meters of [0, -500, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(resolveDistance({ routeMeters: meters }).source).toBe('default');
    }
  });

  it('coordenada fora do planeta é ignorada', () => {
    expect(resolveDistance({ origin: { lat: 999, lng: 0 }, destination: GUARULHOS }).source).toBe(
      'default',
    );
    expect(resolveDistance({ origin: PAULISTA, destination: { lat: 0, lng: 500 } }).source).toBe(
      'default',
    );
  });

  it('coordenada nula é ignorada sem estourar', () => {
    expect(resolveDistance({ origin: null, destination: null }).source).toBe('default');
  });
});

describe('rótulos', () => {
  it('formata com vírgula decimal', () => {
    expect(formatKm(12.4)).toBe('12,4');
    expect(formatKm(15)).toBe('15,0');
  });

  it('cada origem tem palavra própria — esconder a diferença é o problema', () => {
    expect(describeDistance({ km: 12.4, source: 'route' })).toBe('12,4 km por via');
    expect(describeDistance({ km: 12.4, source: 'straight' })).toBe('12,4 km aproximados');
    expect(describeDistance({ km: 15, source: 'default' })).toBe('15,0 km estimados');
  });

  it('só a rota real dispensa ressalva', () => {
    expect(distanceCaveat({ km: 12.4, source: 'route' })).toBeNull();
    expect(distanceCaveat({ km: 12.4, source: 'straight' })).toContain('aproximada');
    expect(distanceCaveat({ km: 15, source: 'default' })).toContain('endereços');
  });
});

describe('efeito no preço — por que isto importa', () => {
  it('trajeto curto deixa de ser cobrado como 15 km', () => {
    const antes = calcFreteCents({ distanceKm: DEFAULT_DISTANCE_KM, vehicle: 'van' });
    const agora = calcFreteCents({
      distanceKm: resolveDistance({ routeMeters: 3_800 }).km,
      vehicle: 'van',
    });
    expect(agora.lowCents).toBeLessThan(antes.lowCents);
  });

  it('trajeto longo deixa de ser subcobrado', () => {
    const antes = calcFreteCents({ distanceKm: DEFAULT_DISTANCE_KM, vehicle: 'bau' });
    const agora = calcFreteCents({
      distanceKm: resolveDistance({ routeMeters: 48_000 }).km,
      vehicle: 'bau',
    });
    expect(agora.lowCents).toBeGreaterThan(antes.lowCents);
  });
});
