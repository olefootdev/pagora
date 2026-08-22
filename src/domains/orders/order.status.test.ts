import { describe, it, expect } from 'vitest';
// `?raw` do Vite entrega o SQL como string em tempo de build — evita depender
// de @types/node só para ler um arquivo dentro de um teste de browser.
import migrationSql from '../../../supabase/migrations/0007_financial_schema.sql?raw';
import type { OrderStatus } from '../../lib/database.types';
import {
  ORDER_TRANSITIONS,
  TERMINAL_STATUSES,
  TRANSITION_ACTORS,
  canActorTransition,
  canTransition,
  isPaid,
  isReleasedToProvider,
  isTerminal,
} from './order.status';

describe('máquina de estados — transições inválidas', () => {
  // Os três caminhos citados explicitamente como proibidos no desenho do
  // fluxo financeiro. São proibidos porque cada um representa dinheiro se
  // movendo na direção errada.
  it('COMPLETED não volta para PAYMENT_PENDING', () => {
    expect(canTransition('completed', 'pending_payment')).toBe(false);
  });

  it('CANCELLED não vira PAID', () => {
    expect(canTransition('cancelled', 'paid')).toBe(false);
  });

  it('pedido novo não pula direto para SETTLED', () => {
    expect(canTransition('pending_payment', 'settled')).toBe(false);
    expect(canTransition('pending_payment', 'completed')).toBe(false);
    expect(canTransition('pending_payment', 'in_progress')).toBe(false);
  });

  it('não se libera saldo de pedido que nunca foi pago', () => {
    expect(canTransition('pending_payment', 'settled')).toBe(false);
    expect(canTransition('expired', 'settled')).toBe(false);
    expect(canTransition('cancelled', 'settled')).toBe(false);
  });

  it('estados terminais não têm saída', () => {
    for (const status of TERMINAL_STATUSES) {
      expect(ORDER_TRANSITIONS[status]).toHaveLength(0);
      expect(isTerminal(status)).toBe(true);
    }
  });

  it('nenhum estado transiciona para si mesmo', () => {
    for (const [from, targets] of Object.entries(ORDER_TRANSITIONS)) {
      expect(targets).not.toContain(from);
    }
  });
});

describe('máquina de estados — autorização por ator', () => {
  it('o prestador NÃO confirma a conclusão no lugar do cliente', () => {
    // O prestador marca 'completed' (executou), mas quem libera o dinheiro
    // ('settled') é o cliente. Fundir os dois daria ao prestador a chave do
    // próprio pagamento.
    expect(canActorTransition('in_progress', 'completed', 'provider')).toBe(true);
    expect(canActorTransition('completed', 'settled', 'provider')).toBe(false);
    expect(canActorTransition('completed', 'settled', 'client')).toBe(true);
  });

  it('o cliente não declara a execução do serviço', () => {
    expect(canActorTransition('paid', 'en_route', 'client')).toBe(false);
    expect(canActorTransition('en_route', 'in_progress', 'client')).toBe(false);
    expect(canActorTransition('paid', 'en_route', 'provider')).toBe(true);
  });

  it('só o gateway (ou o admin) declara um pedido como pago', () => {
    expect(canActorTransition('pending_payment', 'paid', 'client')).toBe(false);
    expect(canActorTransition('pending_payment', 'paid', 'provider')).toBe(false);
    expect(canActorTransition('pending_payment', 'paid', 'gateway')).toBe(true);
  });

  it('o prestador não abre disputa contra si mesmo nem se estorna', () => {
    expect(canActorTransition('completed', 'disputed', 'provider')).toBe(false);
    expect(canActorTransition('paid', 'refunded', 'provider')).toBe(false);
  });

  it('admin alcança toda transição que existe no grafo', () => {
    for (const [from, targets] of Object.entries(ORDER_TRANSITIONS)) {
      for (const to of targets) {
        expect(canActorTransition(from as OrderStatus, to, 'admin')).toBe(true);
      }
    }
  });
});

describe('máquina de estados — paridade com a migration', () => {
  // Este é o teste que impede o espelho de envelhecer: lê o SQL de verdade e
  // compara aresta por aresta. Se alguém adicionar uma transição no banco e
  // esquecer da UI (ou o contrário), o build quebra aqui.
  it('ORDER_TRANSITIONS descreve exatamente o grafo de 0007_financial_schema.sql', () => {
    const sql = migrationSql;
    const block = sql.slice(
      sql.indexOf('insert into pagora.order_status_transitions'),
      sql.indexOf('on conflict do nothing'),
    );
    expect(block.length).toBeGreaterThan(0);

    const fromSql = new Set<string>();
    const rowPattern = /\('([a-z_]+)',\s*'([a-z_]+)'/g;
    let match: RegExpExecArray | null;
    while ((match = rowPattern.exec(block)) !== null) {
      fromSql.add(`${match[1]}->${match[2]}`);
    }

    const fromTs = new Set<string>();
    for (const [from, targets] of Object.entries(ORDER_TRANSITIONS)) {
      for (const to of targets) fromTs.add(`${from}->${to}`);
    }

    expect([...fromTs].sort()).toEqual([...fromSql].sort());
  });

  it('todo estado alcançável tem rótulo e lista de atores', () => {
    for (const status of Object.keys(ORDER_TRANSITIONS) as OrderStatus[]) {
      expect(TRANSITION_ACTORS[status]).toBeDefined();
      expect(TRANSITION_ACTORS[status].length).toBeGreaterThan(0);
    }
  });
});

describe('leitura financeira do estado', () => {
  it('"pago" e "liberado ao prestador" são coisas diferentes', () => {
    // O núcleo do desenho: o cliente pagar não autoriza o prestador a sacar.
    expect(isPaid('paid')).toBe(true);
    expect(isReleasedToProvider('paid')).toBe(false);

    expect(isPaid('completed')).toBe(true);
    expect(isReleasedToProvider('completed')).toBe(false);

    expect(isPaid('settled')).toBe(true);
    expect(isReleasedToProvider('settled')).toBe(true);
  });

  it('pedido não pago nunca conta como pago', () => {
    for (const status of ['pending_payment', 'expired', 'cancelled'] as OrderStatus[]) {
      expect(isPaid(status)).toBe(false);
      expect(isReleasedToProvider(status)).toBe(false);
    }
  });
});
