// =====================================================================
// PAGORA — serviço de pagamento (frontend)
// =====================================================================
// Repare no que NÃO existe aqui: nenhuma função recebe valor, comissão ou
// líquido do prestador. A assinatura de `createPixPayment` é `(orderId)`.
// Isso não é minimalismo — é a garantia estrutural de que o browser não tem
// como propor um preço. O servidor lê o preço da order, que copiou da quote
// aceita, e recalcula a decomposição.
// =====================================================================

import { supabase } from '../../lib/supabase';
import { callFunction } from '../../lib/functions';
import type { PaymentStatus, Tables } from '../../lib/database.types';

export type PixCharge = {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  amountCents: number;
  method: 'pix' | 'credit_card' | 'boleto';
  pixPayload: string | null;
  pixQrCode: string | null;
  invoiceUrl: string | null;
  expiresAt: string | null;
};

/**
 * Gera (ou recupera) a cobrança Pix de um pedido.
 *
 * Idempotente do lado do servidor: chamar duas vezes para o mesmo pedido
 * devolve o mesmo Pix, nunca dois. Pode ser chamada sem medo no retry da tela.
 */
export async function createPixPayment(orderId: string): Promise<PixCharge> {
  return await callFunction<PixCharge>('create-payment', { orderId });
}

/** Cobrança viva do pedido, se houver. Leitura direta — RLS filtra por parte. */
export async function getPaymentForOrder(orderId: string): Promise<Tables<'payments'> | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .in('status', ['pending', 'paid'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Observa a confirmação do pagamento via Realtime.
 *
 * O cliente paga o Pix fora do app; quem sabe que o dinheiro entrou é o
 * webhook. Fazer polling em `payments` seria mais simples e pior: a tela ficaria
 * batendo no banco durante minutos. `orders` já está na publication de Realtime
 * desde a 0002.
 *
 * @returns função para cancelar a inscrição — chame no cleanup do efeito.
 */
export function watchOrderPayment(
  orderId: string,
  onPaid: (order: Tables<'orders'>) => void,
): () => void {
  const channel = supabase
    .channel(`order-payment-${orderId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'pagora', table: 'orders', filter: `id=eq.${orderId}` },
      (payload) => {
        const order = payload.new as Tables<'orders'>;
        if (order.status === 'paid') onPaid(order);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
