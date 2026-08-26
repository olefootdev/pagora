// =====================================================================
// PAGORA — publicação de pedidos e propostas (as duas pontas da descoberta)
// =====================================================================
// Este é o trecho que faltava para o loop existir. Sem ele nenhuma
// `service_request` e nenhuma `quote` nascem, e portanto nenhuma `order` — as
// telas transacionais ficavam inalcançáveis por construção.
//
// Nada aqui move dinheiro. Publicar pedido e enviar proposta são operações de
// catálogo: passam por PostgREST com RLS, sem Edge Function. Só o aceite
// (`accept_quote`) é RPC, porque é ele que cria a order e congela o preço.
// =====================================================================
import { supabase } from '../../lib/supabase';
import type { PagoraState } from '../../types';
import type { ServiceType, Tables } from '../../lib/database.types';

export type PublishInput = {
  clientId: string;
  service: ServiceType;
  state: PagoraState;
  /** Estimativa em centavos, calculada pela tela. Informativa, não cobrada. */
  estimate?: { lowCents: number; highCents: number } | undefined;
};

/**
 * Extrai a cidade de um endereço em texto livre.
 *
 * Heurística deliberadamente simples: pega o penúltimo trecho separado por
 * vírgula ("Av. Paulista, 1000, São Paulo" → "São Paulo"). Serve para o
 * prestador filtrar por região sem depender de geocoding, que ainda não existe.
 * Quando o Places Autocomplete entrar, isto é substituído por dado estruturado.
 */
export function guessCity(address: string | undefined): string | null {
  if (!address) return null;
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;

  const last = parts[parts.length - 1] ?? null;
  if (!last) return null;

  // "Rua da Obra, 500" tem duas partes e a última é o NÚMERO, não a cidade.
  // Sem esta guarda, `origin_city = '500'` — e o pedido some de todo filtro
  // por região, porque nenhum prestador atende a cidade "500".
  if (/^[\d\s.\-/º°]+$/.test(last)) return null;

  return last;
}

/**
 * Cidade e UF do pedido, preferindo o dado estruturado do Places.
 *
 * `guessCity` sempre foi um substituto declarado: "pega o penúltimo trecho
 * separado por vírgula". Erra em endereço sem vírgula, em rodovia com km, e em
 * qualquer coisa que o usuário digite fora do padrão — e uma cidade errada faz
 * o pedido aparecer para prestadores da região errada.
 *
 * Com o Places ligado, `originCity` vem do `administrative_area_level_2` do
 * Google. A heurística fica como caminho de exceção: sem chave, é o que existe.
 */
export function localityFor(
  service: ServiceType,
  s: PagoraState,
): {
  originCity: string | null;
  originState: string | null;
  destCity: string | null;
  destState: string | null;
} {
  const { origin, dest } = addressesFor(service, s);

  const originCity = s.originCity ?? guessCity(origin);
  const originState = s.originState ?? null;

  // Caçamba é UM endereço só: entrega e retirada no mesmo lugar. O destino
  // espelha a origem em vez de ser recalculado — recalcular a partir do mesmo
  // texto podia dar resultado diferente do dado estruturado do Places, e o
  // pedido saía com origem em "Santo André" e destino em "500".
  if (service === 'cacamba') {
    return { originCity, originState, destCity: originCity, destState: originState };
  }

  return {
    originCity,
    originState,
    destCity: s.destCity ?? guessCity(dest),
    destState: s.destState ?? null,
  };
}

/** Endereço de origem e destino conforme o fluxo — cada um usa campos próprios. */
export function addressesFor(service: ServiceType, s: PagoraState) {
  switch (service) {
    case 'frete':
      return { origin: s.origin, dest: s.dest };
    case 'guincho':
      // `currentLoc` é o endereço onde o veículo está parado. `location` é o
      // TIPO DE ACESSO ('rua' | 'garagem' | 'dificil' | 'expressa') — entra no
      // preço, nunca no endereço.
      //
      // A ordem estava invertida (`s.location ?? s.currentLoc`), então todo
      // pedido de guincho gravava "rua" ou "garagem" como origem e saía com
      // `origin_city = null`: `guessCity('rua')` não acha vírgula. O efeito
      // vivo era o prestador de guincho não conseguir filtrar por região.
      return { origin: s.currentLoc, dest: s.destAddr };
    case 'cacamba':
      // Caçamba é entrega e retirada no mesmo endereço.
      return { origin: s.address, dest: s.address };
  }
}

/**
 * Publica o pedido para os prestadores.
 *
 * O `payload` guarda o estado inteiro do fluxo em jsonb. É proposital: os três
 * fluxos têm campos diferentes e o formulário ainda vai mudar. Normalizar isso
 * em colunas agora significaria migration a cada ajuste de tela, para ganhar
 * uma consulta que ninguém faz.
 */
export async function publishServiceRequest(
  input: PublishInput,
): Promise<Tables<'service_requests'>> {
  const locality = localityFor(input.service, input.state);

  const scheduledFor =
    input.state.scheduledDate && input.state.scheduledTime
      ? new Date(`${input.state.scheduledDate}T${input.state.scheduledTime}`).toISOString()
      : null;

  const { data, error } = await supabase
    .from('service_requests')
    .insert({
      client_id: input.clientId,
      service: input.service,
      payload: input.state as never,
      origin_city: locality.originCity,
      origin_state: locality.originState,
      dest_city: locality.destCity,
      dest_state: locality.destState,
      scheduled_for: scheduledFor,
      estimate_low_cents: input.estimate?.lowCents ?? null,
      estimate_high_cents: input.estimate?.highCents ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(translateRequestError(error.message));
  return data;
}

/** Pedidos do cliente que ainda estão recebendo propostas. */
export async function listMyRequests(clientId: string): Promise<Tables<'service_requests'>[]> {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Propostas recebidas para um pedido do cliente, da mais barata para a mais
 * cara. Traz o nome e a nota do prestador junto — comparar propostas só por
 * preço leva a escolher sempre a mais barata, que não é o que o produto quer
 * ensinar.
 */
export type QuoteWithProvider = Tables<'quotes'> & {
  provider: { display_name: string; rating_avg: number; rating_count: number } | null;
};

export async function listMyQuotesForRequest(requestId: string): Promise<QuoteWithProvider[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, provider:providers(display_name, rating_avg, rating_count)')
    .eq('request_id', requestId)
    .in('status', ['pending', 'sent'])
    .order('price_cents', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as QuoteWithProvider[];
}

// ---------------------------------------------------------------------
// Lado do prestador
// ---------------------------------------------------------------------

/**
 * Oportunidades abertas para este prestador.
 *
 * Não filtramos por serviço aqui: a policy `requests_select` da 0002 já
 * restringe ao que o prestador atende (`service = any(services)`) e ao que
 * está aberto. Repetir o filtro no client daria a impressão de que ele é a
 * proteção — e um dia alguém o removeria "porque é redundante".
 */
export async function listOpenRequests(): Promise<Tables<'service_requests'>[]> {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .in('status', ['open', 'quoting'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

/** Propostas que este prestador já enviou, indexadas por pedido. */
export async function listMyQuotes(providerId: string): Promise<Map<string, Tables<'quotes'>>> {
  const { data, error } = await supabase.from('quotes').select('*').eq('provider_id', providerId);

  if (error) throw error;
  return new Map((data ?? []).map((q) => [q.request_id, q]));
}

export type SendQuoteInput = {
  requestId: string;
  providerId: string;
  priceCents: number;
  etaMinutes?: number | undefined;
  notes?: string | undefined;
};

/**
 * Envia (ou atualiza) a proposta do prestador para um pedido.
 *
 * `unique (request_id, provider_id)` na 0001 garante uma proposta por
 * prestador por pedido. Em vez de tratar a violação como erro, atualizamos —
 * é o que o prestador quer dizer ao enviar de novo: "meu preço mudou".
 * A 0006 permite o UPDATE só enquanto a proposta está `pending`/`sent`.
 */
export async function sendQuote(input: SendQuoteInput): Promise<Tables<'quotes'>> {
  if (!Number.isSafeInteger(input.priceCents) || input.priceCents <= 0) {
    throw new Error('Informe um valor válido para a proposta');
  }

  const { data, error } = await supabase
    .from('quotes')
    .upsert(
      {
        request_id: input.requestId,
        provider_id: input.providerId,
        price_cents: input.priceCents,
        eta_minutes: input.etaMinutes ?? null,
        notes: input.notes ?? null,
      },
      { onConflict: 'request_id,provider_id' },
    )
    .select()
    .single();

  if (error) throw new Error(translateQuoteError(error.message));
  return data;
}

function translateRequestError(message: string): string {
  if (message.includes('violates row-level security')) {
    return 'Entre na sua conta para publicar o pedido';
  }
  return 'Não foi possível publicar o pedido. Tente novamente.';
}

function translateQuoteError(message: string): string {
  if (message.includes('violates row-level security')) {
    // A policy exige prestador APROVADO e pedido ainda aberto. As duas causas
    // acontecem na prática e o usuário precisa saber qual é.
    return 'Proposta recusada: seu cadastro precisa estar aprovado e o pedido ainda aberto.';
  }
  if (message.includes('price_cents')) return 'O valor precisa ser maior que zero';
  return 'Não foi possível enviar a proposta';
}
