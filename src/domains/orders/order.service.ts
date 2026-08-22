// =====================================================================
// PAGORA — serviço de pedidos (frontend)
// =====================================================================
import { supabase } from '../../lib/supabase';
import { callFunction } from '../../lib/functions';
import type { OrderStatus, ServiceType, Tables } from '../../lib/database.types';
import { calcFreteCents, type FretePricingInput } from '../pricing/frete-pricing';

/**
 * Cria a solicitação de cotação.
 *
 * A estimativa vai junto, mas é informativa: serve para o prestador calibrar a
 * proposta e para o cliente ter uma âncora. O preço cobrado é o da quote
 * aceita — nunca este número.
 */
export async function createServiceRequest(input: {
  clientId: string;
  service: ServiceType;
  payload: Record<string, unknown>;
  pricing?: FretePricingInput;
  originCity?: string;
  originState?: string;
  destCity?: string;
  destState?: string;
  scheduledFor?: string;
}): Promise<Tables<'service_requests'>> {
  let estimateLow: number | null = null;
  let estimateHigh: number | null = null;

  if (input.pricing) {
    const estimate = calcFreteCents(input.pricing);
    estimateLow = estimate.lowCents;
    estimateHigh = estimate.highCents;
  }

  const { data, error } = await supabase
    .from('service_requests')
    .insert({
      client_id: input.clientId,
      service: input.service,
      payload: input.payload as never,
      origin_city: input.originCity ?? null,
      origin_state: input.originState ?? null,
      dest_city: input.destCity ?? null,
      dest_state: input.destState ?? null,
      scheduled_for: input.scheduledFor ?? null,
      estimate_low_cents: estimateLow,
      estimate_high_cents: estimateHigh,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Propostas recebidas, da mais barata para a mais cara. */
export async function listQuotes(requestId: string): Promise<Tables<'quotes'>[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('request_id', requestId)
    .in('status', ['pending', 'sent'])
    .order('price_cents', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Aceita uma proposta e cria o pedido.
 *
 * Só o id da quote é enviado. O preço, a comissão e o líquido do prestador
 * são determinados dentro de `pagora.accept_quote()`, que trava a linha da
 * proposta antes de ler o preço — dois aceites simultâneos serializam e o
 * segundo falha.
 */
export async function acceptQuote(quoteId: string): Promise<Tables<'orders'>> {
  const { data, error } = await supabase.rpc('accept_quote', { p_quote_id: quoteId });
  if (error) throw new Error(translateAcceptError(error.message));
  return data as Tables<'orders'>;
}

function translateAcceptError(message: string): string {
  if (message.includes('quote_not_found_or_already_resolved')) {
    return 'Esta proposta não está mais disponível';
  }
  if (message.includes('quote_expired')) return 'Esta proposta expirou';
  if (message.includes('request_not_open')) return 'Você já fechou este pedido';
  if (message.includes('provider_not_approved')) return 'Prestador indisponível no momento';
  if (message.includes('forbidden')) return 'Este pedido não é seu';
  return 'Não foi possível aceitar a proposta';
}

export async function getOrder(orderId: string): Promise<Tables<'orders'> | null> {
  const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();

  if (error) throw error;
  return data;
}

/** Transições que a interface pode pedir. O resto é do gateway. */
export type RequestableStatus = 'en_route' | 'in_progress' | 'completed' | 'settled' | 'cancelled';

/**
 * Move o pedido na máquina de estados.
 *
 * O ator não é enviado: quem decide é o JWT do lado da Edge Function. Pedir
 * `settled` aciona `settle_order`, que libera o saldo retido — por isso o
 * servidor exige que o ator seja o cliente do pedido.
 */
export async function advanceOrder(
  orderId: string,
  to: RequestableStatus,
  reason?: string,
): Promise<{ orderId: string; status: OrderStatus }> {
  return await callFunction('advance-order', { orderId, to, reason });
}

/** Açúcar semântico: o cliente confirmando que o serviço foi entregue. */
export async function confirmDelivery(orderId: string) {
  return await advanceOrder(orderId, 'settled');
}

export async function listMyOrders(role: 'client' | 'provider', userId: string) {
  const column = role === 'client' ? 'client_id' : 'provider_id';
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq(column, userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
