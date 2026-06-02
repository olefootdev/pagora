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
    expect(result.breakdown.urgency).toBe('—');
  });

  // BUG conhecido (Fase 2): { van: 0 }[s.vehicle] || 50 → como 0 é falsy, van vira 50
  // Resultado: cliente que escolhe van paga preço de baú. Trocar `|| 50` por `?? 50`
  // exige alinhamento de produto sobre tabela de preços, por isso fica como TODO.
  it('[BUG] van retorna preço de baú (|| em vez de ??)', () => {
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
    expect(van.low).toBe(bau.low); // documenta o bug; quando consertar, vira .not.toBe
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

  it('urgência "today" multiplica total por 1.3', () => {
    const baseInputs: PagoraState = {
      distance: 10,
      vehicle: 'van',
      helpers: 0,
      originAccess: { type: 'house' },
      destAccess: { type: 'house' },
    };
    const normal = calcFrete({ ...baseInputs, urgency: 'scheduled' });
    const urgent = calcFrete({ ...baseInputs, urgency: 'today' });

    expect(urgent.low).toBe(Math.round(normal.low * 1.3));
    expect(urgent.breakdown.urgency).toBe('+30%');
  });
});
