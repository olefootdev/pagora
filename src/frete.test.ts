import { describe, it, expect } from 'vitest';
import { calcFrete } from './frete';
import type { PagoraState } from './types';

describe('calcFrete', () => {
  it('orçamento mínimo: baú, sem helpers, sem acesso difícil', () => {
    const result = calcFrete({
      distance: 10,
      vehicle: 'bau', // +50
      helpers: 0,
      originAccess: { type: 'house' },
      destAccess: { type: 'house' },
      urgency: 'scheduled',
    });
    // baseKm = 120, vehicle = 50, helpers = 0, access = 0, noElev = 0, baseFee = 30 → 200
    expect(result.low).toBe(200);
    expect(result.high).toBe(Math.round(200 * 1.25)); // 250
    expect(result.breakdown.urgency).toBe('sem custo');
  });

  // CORRIGIDO: o antigo `VEHICLE_PRICE[x] || 50` transformava van (0) em 50,
  // fazendo o cliente de van pagar preço de baú. O domínio agora resolve a
  // sobretaxa sem fallback e o teste virou regressão permanente.
  it('van NÃO paga preço de baú — sai R$ 50 mais barato', () => {
    const van = calcFrete({
      distance: 10,
      vehicle: 'van',
      helpers: 0,
      originAccess: { type: 'house' },
      destAccess: { type: 'house' },
      urgency: 'scheduled',
    });
    const bau = calcFrete({
      distance: 10,
      vehicle: 'bau',
      helpers: 0,
      originAccess: { type: 'house' },
      destAccess: { type: 'house' },
      urgency: 'scheduled',
    });
    expect(van.low).not.toBe(bau.low);
    expect(bau.low - van.low).toBe(50);
    expect(van.breakdown.vehicle).toBe(0);
  });

  it('veículo ausente ou desconhecido não vira preço de outro veículo', () => {
    const input = {
      distance: 10,
      helpers: 0,
      originAccess: { type: 'house' },
      destAccess: { type: 'house' },
      urgency: 'scheduled',
    } satisfies PagoraState;
    expect(() => calcFrete({ ...input, vehicle: null })).toThrow(/Veículo não selecionado/);
    expect(() => calcFrete({ ...input, vehicle: 'jetski' })).toThrow(/não suportado/);
  });

  it('com helpers e acesso difícil acumula corretamente', () => {
    const result = calcFrete({
      distance: 15,
      vehicle: 'bau', // +50
      helpers: 2, // +100
      originAccess: { type: 'apt', elevator: false, needHelp: true }, // +25 + 30
      destAccess: { type: 'house', needHelp: true }, // +30
      urgency: 'scheduled',
    });
    // baseKm = 180, vehicle = 50, helpers = 100, access = 60, noElev = 25, baseFee = 30 → 445
    expect(result.low).toBe(445);
    expect(result.breakdown.vehicle).toBe(50);
    expect(result.breakdown.helpers).toBe(100);
    expect(result.breakdown.access).toBe(60);
    expect(result.breakdown.noElev).toBe(25);
  });

  it('urgência "today" não muda o total — decisão de produto de 19/08/2026', () => {
    const baseInputs: PagoraState = {
      distance: 10,
      vehicle: 'van',
      helpers: 0,
      originAccess: { type: 'house' },
      destAccess: { type: 'house' },
    };
    const normal = calcFrete({ ...baseInputs, urgency: 'scheduled' });
    const urgent = calcFrete({ ...baseInputs, urgency: 'today' });

    expect(urgent.low).toBe(normal.low);
    expect(urgent.high).toBe(normal.high);
    expect(urgent.breakdown.urgency).toBe('sem custo');
  });
});
