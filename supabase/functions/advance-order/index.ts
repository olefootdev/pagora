// =====================================================================
// PAGORA — advance-order
// =====================================================================
// Move um pedido pela máquina de estados. Cobre as transições operacionais
// (prestador declarando execução) e a confirmação do cliente, que é a que
// libera dinheiro.
//
// O corpo é `{ orderId, to }`. Quem é o ator sai do JWT, nunca do corpo —
// senão o prestador poderia se passar pelo cliente e liberar o próprio saldo.
// A checagem de "quem pode levar a qual estado" vive em
// `pagora.advance_order_status()`; aqui só roteamos.
// =====================================================================
import {
  BusinessError,
  adminClient,
  handle,
  json,
  logEvent,
  requireUser,
} from '../_shared/http.ts';

/** Transições que o app pode pedir. `paid`/`refunded`/`expired` são do gateway. */
const ALLOWED = ['en_route', 'in_progress', 'completed', 'settled', 'cancelled'] as const;
type AllowedTarget = (typeof ALLOWED)[number];

Deno.serve((req) =>
  handle(req, async (req, origin) => {
    if (req.method !== 'POST') throw new BusinessError('Método não suportado', 405);

    const userId = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as {
      orderId?: string;
      to?: string;
      reason?: string;
    };

    if (!body.orderId) throw new BusinessError('orderId é obrigatório');
    if (!body.to || !(ALLOWED as readonly string[]).includes(body.to)) {
      throw new BusinessError(`"to" deve ser um de: ${ALLOWED.join(', ')}`);
    }
    const target = body.to as AllowedTarget;

    const db = adminClient();

    // `settled` não é uma transição qualquer: ela move dinheiro de retido para
    // disponível. Por isso vai por `settle_order`, que faz a transição E os
    // dois lançamentos no ledger na mesma transação.
    const rpc =
      target === 'settled'
        ? db.rpc('settle_order', { p_order_id: body.orderId, p_actor_id: userId })
        : db.rpc('advance_order_status', {
            p_order_id: body.orderId,
            p_to_status: target,
            p_actor_id: userId,
            p_reason: body.reason ?? null,
          });

    const { data, error } = await rpc;
    if (error) throw new BusinessError(translate(error.message), statusFor(error.message));

    logEvent('order_status_advanced', { order_id: body.orderId, to: target, actor: userId });

    const order = data as Record<string, unknown>;
    return json({ orderId: order.id, status: order.status }, 200, origin);
  }),
);

function statusFor(message: string): number {
  if (message.includes('forbidden')) return 403;
  if (message.includes('not_found')) return 404;
  return 400;
}

function translate(message: string): string {
  if (message.includes('order_not_found')) return 'Pedido não encontrado';
  if (message.includes('forbidden_transition')) {
    return 'Você não pode fazer esta mudança neste pedido';
  }
  if (message.includes('invalid_transition')) {
    return 'Esta mudança não é possível a partir da situação atual do pedido';
  }
  if (message.includes('cannot_settle_unpaid_order')) {
    return 'Não é possível confirmar um pedido que ainda não foi pago';
  }
  return 'Não foi possível atualizar o pedido';
}
