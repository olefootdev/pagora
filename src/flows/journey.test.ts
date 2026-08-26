// =====================================================================
// PAGORA — Testes da linha do tempo do acompanhamento
// =====================================================================
// A regra que estes testes protegem: um pedido cancelado ou em disputa NÃO
// mostra meio caminho andado. Marcar etapas como cumpridas num pedido que
// deu errado é o tipo de tela que gera ligação para o suporte.
// =====================================================================

import { describe, it, expect } from 'vitest';
import { journeyProgress, journeySteps } from './acompanhar';
import { ORDER_TRANSITIONS } from '../domains/orders/order.status';
import type { OrderStatus } from '../lib/database.types';

describe('journeySteps', () => {
  it('marca o estado atual como "agora" e os anteriores como cumpridos', () => {
    const steps = journeySteps('en_route');
    const byId = Object.fromEntries(steps.map((s) => [s.id, s.state]));
    expect(byId['pending_payment']).toBe('done');
    expect(byId['paid']).toBe('done');
    expect(byId['en_route']).toBe('now');
    expect(byId['in_progress']).toBe('todo');
    expect(byId['settled']).toBe('todo');
  });

  it('no primeiro estado nada aparece como cumprido', () => {
    const steps = journeySteps('pending_payment');
    expect(steps[0]?.state).toBe('now');
    expect(steps.filter((s) => s.state === 'done')).toHaveLength(0);
  });

  it('no último estado tudo antes está cumprido', () => {
    const steps = journeySteps('settled');
    expect(steps.at(-1)?.state).toBe('now');
    expect(steps.slice(0, -1).every((s) => s.state === 'done')).toBe(true);
  });

  it('estado fora da jornada não marca nada como cumprido', () => {
    for (const desvio of ['cancelled', 'refunded', 'expired', 'disputed'] as OrderStatus[]) {
      const steps = journeySteps(desvio);
      expect(steps.every((s) => s.state === 'todo')).toBe(true);
    }
  });

  it('há exatamente um "agora" quando o estado pertence à jornada', () => {
    for (const s of [
      'pending_payment',
      'paid',
      'en_route',
      'in_progress',
      'completed',
      'settled',
    ] as OrderStatus[]) {
      expect(journeySteps(s).filter((x) => x.state === 'now')).toHaveLength(1);
    }
  });

  it('todo estado da jornada existe na máquina de estados do banco', () => {
    // Paridade: se alguém renomear um status na migration e esquecer da tela,
    // este teste quebra antes de o cliente ver uma linha do tempo vazia.
    for (const step of journeySteps('paid')) {
      expect(ORDER_TRANSITIONS).toHaveProperty(step.id);
    }
  });
});

describe('journeyProgress', () => {
  it('cresce ao longo da jornada e satura em 1', () => {
    expect(journeyProgress('pending_payment')).toBeLessThan(journeyProgress('en_route'));
    expect(journeyProgress('en_route')).toBeLessThan(journeyProgress('completed'));
    expect(journeyProgress('settled')).toBe(1);
  });

  it('estado fora da jornada não desenha rota andada', () => {
    expect(journeyProgress('cancelled')).toBe(0);
    expect(journeyProgress('refunded')).toBe(0);
  });

  it('nunca sai do intervalo 0 a 1', () => {
    const todos: OrderStatus[] = [
      'pending_payment',
      'paid',
      'en_route',
      'in_progress',
      'completed',
      'settled',
      'cancelled',
      'expired',
      'refunded',
      'disputed',
    ];
    for (const s of todos) {
      const p = journeyProgress(s);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});
