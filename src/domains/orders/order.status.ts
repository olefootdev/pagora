// =====================================================================
// PAGORA — máquina de estados do pedido (espelho de leitura)
// =====================================================================
// ATENÇÃO: este arquivo NÃO é a autoridade. Quem recusa uma transição
// inválida é `pagora.advance_order_status()`, consultando a tabela
// `pagora.order_status_transitions`. Aqui existe para a UI saber qual botão
// mostrar sem fazer round-trip — e o teste de paridade garante que os dois
// mapas descrevem o mesmo grafo.
//
// Se divergirem, o banco vence e a UI mostra um botão que dá erro. É o modo
// de falhar certo: irritante, não perigoso.
// =====================================================================

import type { OrderStatus } from '../../lib/database.types';

/** Espelho de `pagora.order_status_transitions` (migration 0007). */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending_payment: ['paid', 'expired', 'cancelled'],
  paid: ['en_route', 'cancelled', 'refunded', 'disputed'],
  en_route: ['in_progress', 'disputed', 'cancelled'],
  in_progress: ['completed', 'disputed'],
  completed: ['settled', 'disputed'],
  disputed: ['settled', 'refunded', 'completed'],
  settled: [],
  cancelled: [],
  expired: [],
  refunded: [],
};

/** Quem tem autoridade para provocar cada transição. Espelha o CASE da 0008. */
export type TransitionActor = 'client' | 'provider' | 'admin' | 'gateway';

export const TRANSITION_ACTORS: Readonly<Record<OrderStatus, readonly TransitionActor[]>> = {
  paid: ['gateway', 'admin'],
  expired: ['gateway', 'admin'],
  refunded: ['gateway', 'admin'],
  en_route: ['provider', 'admin'],
  in_progress: ['provider', 'admin'],
  completed: ['provider', 'admin'],
  settled: ['client', 'admin'],
  disputed: ['client', 'admin'],
  cancelled: ['client', 'provider', 'admin'],
  pending_payment: ['admin'],
};

/** Estados finais: não sai mais de lá. */
export const TERMINAL_STATUSES: readonly OrderStatus[] = [
  'settled',
  'cancelled',
  'expired',
  'refunded',
];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function canActorTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: TransitionActor,
): boolean {
  return canTransition(from, to) && TRANSITION_ACTORS[to].includes(actor);
}

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** O dinheiro do cliente já entrou? */
export function isPaid(status: OrderStatus): boolean {
  return ['paid', 'en_route', 'in_progress', 'completed', 'settled', 'disputed'].includes(status);
}

/** O prestador já pode sacar o valor deste pedido? */
export function isReleasedToProvider(status: OrderStatus): boolean {
  return status === 'settled';
}

export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  pending_payment: 'Aguardando pagamento',
  paid: 'Pago — aguardando o prestador',
  en_route: 'Prestador a caminho',
  in_progress: 'Serviço em andamento',
  completed: 'Concluído — confirme para liberar o pagamento',
  settled: 'Finalizado',
  cancelled: 'Cancelado',
  expired: 'Expirado sem pagamento',
  refunded: 'Estornado',
  disputed: 'Em disputa',
};
