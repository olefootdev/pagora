// =====================================================================
// PAGORA — Disputa, lado do prestador
// =====================================================================
// A tabela `disputes` existe desde a 0001 e o prestador nunca teve tela.
// O efeito prático hoje: o cliente abre disputa, o dinheiro do serviço fica
// retido, e o transportador descobre isso — quando descobre — por um valor
// que não entra no "liberado" da tela de Ganhos. Sem lugar para responder,
// a disputa só anda quando o admin decide sozinho, com um lado da história.
//
// Quem escreve o quê:
//   - o CLIENTE abre (`disputes_client_insert`, endurecida na 0006: só em
//     serviço já pago);
//   - o PRESTADOR responde via `pagora.respond_dispute()` (0008) — a policy
//     de UPDATE ampla que existia na 0002 foi removida justamente porque
//     deixava qualquer parte reescrever `refund_cents` e `status`;
//   - o ADMIN resolve, por outra função.
//
// Este módulo cobre só o meio: ler a disputa do pedido e responder.
// =====================================================================

import { supabase } from '../../lib/supabase';
import type { Tables } from '../../lib/database.types';

export type Dispute = Tables<'disputes'>;

/** A disputa de um pedido, se houver. `order_id` é unique na 0001. */
export async function getDisputeForOrder(orderId: string): Promise<Dispute | null> {
  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Envia a versão do transportador.
 *
 * A validação de "é sua?" e "ainda está aberta?" mora dentro da função no
 * banco. Não repetimos aqui: repetir passaria a impressão de que a proteção
 * é do lado do cliente, e um dia alguém confiaria nela.
 */
export async function respondDispute(disputeId: string, response: string): Promise<Dispute> {
  const texto = response.trim();
  if (texto.length < 10) {
    throw new Error('Conte o que aconteceu com um pouco mais de detalhe.');
  }

  const { data, error } = await supabase.rpc('respond_dispute', {
    p_dispute_id: disputeId,
    p_response: texto,
  });

  if (error) throw new Error(translateDisputeError(error.message));
  return data;
}

/**
 * O prazo é o que faz o prestador responder hoje em vez de semana que vem.
 * `sla_due_at` nasce com 24 h na 0001.
 */
export function hoursUntil(dueAt: string, now: number = Date.now()): number {
  return (new Date(dueAt).getTime() - now) / 3_600_000;
}

export function slaLabel(dueAt: string, now: number = Date.now()): string {
  const horas = hoursUntil(dueAt, now);
  if (horas <= 0) return 'Prazo encerrado';
  if (horas < 1) return `Faltam ${Math.max(1, Math.round(horas * 60))} min para responder`;
  return `Faltam ${Math.round(horas)} h para responder`;
}

function translateDisputeError(message: string): string {
  if (message.includes('dispute_already_answered')) {
    return 'Você já respondeu esta disputa.';
  }
  if (message.includes('dispute_not_found_or_not_yours')) {
    return 'Esta disputa não é de um serviço seu.';
  }
  if (message.includes('unauthenticated')) {
    return 'Entre de novo para responder.';
  }
  return 'Não foi possível enviar sua resposta. Tente de novo.';
}
