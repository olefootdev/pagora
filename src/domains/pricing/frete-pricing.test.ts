import { describe, it, expect } from 'vitest';
import {
  BASE_FEE_CENTS,
  PricingInputError,
  VEHICLE_SURCHARGE_CENTS,
  calcFreteCents,
  vehicleSurchargeCents,
} from './frete-pricing';

const baseInput = {
  distanceKm: 10,
  helpers: 0,
  originAccess: { type: 'house' },
  destAccess: { type: 'house' },
  urgency: 'scheduled',
} as const;

describe('vehicleSurchargeCents — o bug do fallback silencioso', () => {
  it('van custa ZERO de sobretaxa (regressão do bug `|| 50`)', () => {
    expect(vehicleSurchargeCents('van')).toBe(0);
    expect(VEHICLE_SURCHARGE_CENTS.van).toBe(0);
  });

  it('bau = R$ 50,00 e grande = R$ 130,00', () => {
    expect(vehicleSurchargeCents('bau')).toBe(5_000);
    expect(vehicleSurchargeCents('grande')).toBe(13_000);
  });

  it('van NÃO paga preço de baú', () => {
    expect(vehicleSurchargeCents('van')).not.toBe(vehicleSurchargeCents('bau'));
  });

  it('veículo desconhecido explode em vez de virar preço de outro veículo', () => {
    expect(() => vehicleSurchargeCents('caminhonete')).toThrow(PricingInputError);
    expect(() => vehicleSurchargeCents('caminhonete')).toThrow(/não suportado/);
  });

  it('veículo ausente explode — não existe preço sem escolha', () => {
    expect(() => vehicleSurchargeCents(null)).toThrow(PricingInputError);
    expect(() => vehicleSurchargeCents(undefined)).toThrow(PricingInputError);
    expect(() => vehicleSurchargeCents('')).toThrow(PricingInputError);
  });
});

describe('calcFreteCents', () => {
  it('van sai mais barato que baú exatamente pela diferença de sobretaxa', () => {
    const van = calcFreteCents({ ...baseInput, vehicle: 'van' });
    const bau = calcFreteCents({ ...baseInput, vehicle: 'bau' });

    expect(bau.lowCents - van.lowCents).toBe(5_000);
    expect(van.lowCents).toBe(15_000); // 10km × R$12 + R$0 + taxa base R$30
    expect(bau.lowCents).toBe(20_000);
  });

  it('orçamento mínimo de baú bate com o modelo documentado', () => {
    const r = calcFreteCents({ ...baseInput, vehicle: 'bau' });
    // baseKm 12000 + vehicle 5000 + baseFee 3000 = 20000
    expect(r.lowCents).toBe(20_000);
    expect(r.highCents).toBe(25_000); // +25%
    expect(r.breakdown.baseFeeCents).toBe(BASE_FEE_CENTS);
    expect(r.breakdown.urgencySurchargeCents).toBe(0);
  });

  it('acumula ajudantes, acesso difícil e ausência de elevador', () => {
    const r = calcFreteCents({
      distanceKm: 15,
      vehicle: 'bau',
      helpers: 2,
      originAccess: { type: 'apt', elevator: false, needHelp: true },
      destAccess: { type: 'house', needHelp: true },
      urgency: 'scheduled',
    });
    // 18000 + 5000 + 10000 + 6000 + 2500 + 3000 = 44500
    expect(r.lowCents).toBe(44_500);
    expect(r.breakdown.helpersCents).toBe(10_000);
    expect(r.breakdown.accessCents).toBe(6_000);
    expect(r.breakdown.noElevatorCents).toBe(2_500);
  });

  it('urgência não altera o preço — pedir "hoje" custa o mesmo que agendar', () => {
    // Regressão da decisão de produto de 19/08/2026. Este teste existia ao
    // contrário: garantia o +30%. Ele foi virado, e não deletado, porque a
    // pergunta "urgência cobra a mais?" precisa continuar tendo uma resposta
    // fixada em teste — hoje a resposta é não.
    const normal = calcFreteCents({ ...baseInput, vehicle: 'van', urgency: 'scheduled' });
    const urgente = calcFreteCents({ ...baseInput, vehicle: 'van', urgency: 'today' });

    expect(urgente.lowCents).toBe(normal.lowCents);
    expect(urgente.highCents).toBe(normal.highCents);
    expect(urgente.breakdown.urgencySurchargeCents).toBe(0);
    expect(normal.breakdown.urgencySurchargeCents).toBe(0);
  });

  it('o preço independe da urgência em toda a matriz de veículo e distância', () => {
    for (const vehicle of ['van', 'bau', 'grande']) {
      for (let km = 1; km <= 60; km += 7) {
        const hoje = calcFreteCents({ ...baseInput, vehicle, urgency: 'today', distanceKm: km });
        const agendado = calcFreteCents({
          ...baseInput,
          vehicle,
          urgency: 'scheduled',
          distanceKm: km,
        });
        expect(hoje.lowCents).toBe(agendado.lowCents);
      }
    }
  });

  it('rejeita distância e ajudantes inválidos em vez de assumir default', () => {
    expect(() => calcFreteCents({ ...baseInput, vehicle: 'van', distanceKm: 0 })).toThrow(
      PricingInputError,
    );
    expect(() => calcFreteCents({ ...baseInput, vehicle: 'van', distanceKm: -5 })).toThrow(
      PricingInputError,
    );
    expect(() => calcFreteCents({ ...baseInput, vehicle: 'van', helpers: -1 })).toThrow(
      PricingInputError,
    );
    expect(() => calcFreteCents({ ...baseInput, vehicle: 'van', helpers: 1.5 })).toThrow(
      PricingInputError,
    );
  });

  it('todo resultado é inteiro em centavos — nunca fração', () => {
    for (const vehicle of ['van', 'bau', 'grande']) {
      for (const urgency of ['today', 'scheduled']) {
        for (let km = 1; km <= 60; km += 7) {
          const r = calcFreteCents({ ...baseInput, vehicle, urgency, distanceKm: km, helpers: 1 });
          expect(Number.isSafeInteger(r.lowCents)).toBe(true);
          expect(Number.isSafeInteger(r.highCents)).toBe(true);
          expect(r.highCents).toBeGreaterThan(r.lowCents);
        }
      }
    }
  });
});
