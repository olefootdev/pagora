// =====================================================================
// PAGORA — A régua de progresso do hero
// =====================================================================
// Quatro marcos num relance, não a timeline de oito estados que vive em
// `/acompanhar`. O que estes testes protegem é a regra que impede a régua de
// mentir: pedido morto não acende marco nenhum.
// =====================================================================

import { describe, it, expect } from 'vitest';
import { coarseTrackIndex as trackIndex } from '../domains/orders/order.status';
import type { OrderStatus } from '../lib/database.types';

describe('trackIndex', () => {
  it('avança conforme o pedido caminha', () => {
    expect(trackIndex('pending_payment')).toBe(0);
    expect(trackIndex('paid')).toBe(0);
    expect(trackIndex('en_route')).toBe(1);
    expect(trackIndex('in_progress')).toBe(2);
    expect(trackIndex('completed')).toBe(3);
    expect(trackIndex('settled')).toBe(3);
  });

  it('nunca retrocede', () => {
    const caminho: OrderStatus[] = [
      'pending_payment',
      'paid',
      'en_route',
      'in_progress',
      'completed',
      'settled',
    ];
    const idx = caminho.map(trackIndex);
    for (let i = 1; i < idx.length; i++) {
      expect(idx[i]).toBeGreaterThanOrEqual(idx[i - 1] as number);
    }
  });

  it('pedido morto não acende marco nenhum', () => {
    // Mostrar "a caminho" sobre um pedido cancelado é pior que não mostrar
    // nada: o cliente fica esperando um caminhão que não vem.
    for (const s of ['cancelled', 'expired', 'refunded', 'disputed'] as OrderStatus[]) {
      expect(trackIndex(s)).toBe(-1);
    }
  });
});
