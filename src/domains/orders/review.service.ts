// =====================================================================
// PAGORA — Avaliação do serviço
// =====================================================================
// A tabela `reviews` existe desde a 0001 e nunca foi escrita por ninguém —
// e é por isso que todo transportador aparece "sem avaliações", e o rótulo
// "melhor custo-benefício" (que exige nota ≥ 4) nunca aparece na comparação.
// Sem avaliação não existe o "4,9 ★ · 347 transportes" que vende o
// marketplace inteiro.
//
// A policy `reviews_client_insert` (0002) exige que o pedido esteja
// `completed` e que quem avalia seja o cliente dele. Não repetimos essa
// checagem aqui: repetir dá a impressão de que a proteção é do client.
// =====================================================================

import { supabase } from '../../lib/supabase';
import type { Tables } from '../../lib/database.types';

export type SubmitReviewInput = {
  orderId: string;
  clientId: string;
  providerId: string;
  /** 1 a 5. A tela oferece só as cinco. */
  stars: number;
  comment?: string | undefined;
};

export async function submitReview(input: SubmitReviewInput): Promise<Tables<'reviews'>> {
  if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5) {
    throw new Error('A nota precisa ser de 1 a 5 estrelas');
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      order_id: input.orderId,
      client_id: input.clientId,
      provider_id: input.providerId,
      stars: input.stars,
      comment: input.comment?.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(translateReviewError(error.message));
  return data;
}

/** A avaliação que este cliente já deu a este pedido, se deu. */
export async function getMyReview(orderId: string): Promise<Tables<'reviews'> | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function translateReviewError(message: string): string {
  // `order_id` é unique na 0001: uma avaliação por pedido, e a segunda
  // tentativa precisa dizer isso em vez de "duplicate key".
  if (message.includes('duplicate') || message.includes('unique')) {
    return 'Você já avaliou este serviço.';
  }
  if (message.includes('violates row-level security')) {
    return 'Só dá para avaliar depois que o serviço for concluído.';
  }
  return 'Não foi possível enviar sua avaliação. Tente de novo.';
}
