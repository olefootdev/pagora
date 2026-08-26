// =====================================================================
// PAGORA — Avisos
// =====================================================================
// Não existe tabela de notificações, e este módulo não cria uma. Ele DERIVA
// os avisos das linhas que o usuário já pode ler: as propostas dos pedidos
// dele e os estados dos pedidos dele. O realtime dessas tabelas está ligado
// desde a 0002 — então o aviso aparece sozinho, sem polling e sem migration.
//
// Por que derivar em vez de gravar: uma tabela de notificações precisaria
// existir em três lugares (schema, RLS, publication) para dizer algo que os
// dados já dizem. Quando houver push de verdade — que é infraestrutura, não
// banco —, este módulo continua sendo a fonte do que mostrar.
//
// O "lido" mora no `localStorage`, por usuário. É o único estado que não dá
// para derivar, e é barato o suficiente para não justificar uma tabela: se o
// usuário trocar de aparelho, o pior que acontece é ver de novo um aviso que
// já tinha visto.
// =====================================================================

import type { OrderStatus, ServiceType, Tables } from '../../lib/database.types';
import { ORDER_STATUS_LABELS } from '../orders/order.status';
import { orderCode } from '../orders/order-code';

export type NoticeKind = 'proposta' | 'estado' | 'pedido-aberto';

export type Notice = {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  at: string;
  /** Para onde levar o usuário ao tocar. */
  route: string;
  icon: string;
  /** Exige ação dele agora? Muda o tom do card, não só a cor. */
  actionable: boolean;
  /** Só em `proposta`: quantas propostas o pedido tem. */
  count?: number;
  /** Só em `proposta`: rótulo do serviço, para a faixa da home compor texto. */
  serviceLabel?: string;
};

const SERVICE_LABEL: Record<ServiceType, string> = {
  frete: 'Frete',
  guincho: 'Guincho',
  cacamba: 'Caçamba',
};

/**
 * Estados que valem um aviso ao cliente.
 *
 * Nem toda transição merece interromper alguém. `pending_payment` é o
 * nascimento do pedido — o usuário acabou de causá-lo e está olhando para a
 * tela. Avisar seria contar o que ele acabou de fazer.
 */
const CLIENT_NOTABLE: Partial<Record<OrderStatus, { actionable: boolean; icon: string }>> = {
  paid: { actionable: false, icon: 'check-circle' },
  en_route: { actionable: false, icon: 'truck' },
  in_progress: { actionable: false, icon: 'package' },
  completed: { actionable: true, icon: 'star' },
  settled: { actionable: true, icon: 'star' },
  cancelled: { actionable: false, icon: 'close' },
  disputed: { actionable: true, icon: 'alert' },
  refunded: { actionable: false, icon: 'money' },
  expired: { actionable: false, icon: 'clock' },
};

export type BuildClientFeedInput = {
  requests: Tables<'service_requests'>[];
  orders: Tables<'orders'>[];
  /** Propostas recebidas, agrupadas por pedido. */
  quotesByRequest: Map<string, Tables<'quotes'>[]>;
};

/** Avisos do cliente, do mais recente para o mais antigo. */
export function buildClientFeed(input: BuildClientFeedInput): Notice[] {
  const notices: Notice[] = [];

  for (const request of input.requests) {
    const quotes = input.quotesByRequest.get(request.id) ?? [];
    if (quotes.length === 0) continue;

    // Um aviso por pedido, não um por proposta. Cinco propostas no mesmo
    // frete são uma boa notícia só — cinco cartões seriam spam do próprio app.
    const newest = quotes.reduce((a, b) => (a.created_at > b.created_at ? a : b));

    notices.push({
      id: `quotes-${request.id}-${quotes.length}`,
      kind: 'proposta',
      title:
        quotes.length === 1
          ? 'Você recebeu uma proposta'
          : `Você recebeu ${quotes.length} propostas`,
      body: `${SERVICE_LABEL[request.service]}${request.origin_city ? ` · ${request.origin_city}` : ''} — toque para comparar e escolher.`,
      at: newest.created_at,
      route: `escolher/${request.id}`,
      icon: 'spark',
      actionable: true,
      count: quotes.length,
      serviceLabel: SERVICE_LABEL[request.service],
    });
  }

  for (const order of input.orders) {
    const meta = CLIENT_NOTABLE[order.status];
    if (!meta) continue;

    // Serviço liberado: o próximo passo do cliente é dar a nota, não voltar
    // ao acompanhamento. É a nota que faz o próximo cliente escolher.
    const paraAvaliar = order.status === 'settled';

    notices.push({
      // `updated_at` no id: a mesma order muda de estado várias vezes, e cada
      // mudança é um aviso distinto.
      id: `order-${order.id}-${order.status}-${order.updated_at}`,
      kind: 'estado',
      title: paraAvaliar ? 'Como foi o serviço?' : ORDER_STATUS_LABELS[order.status],
      body: paraAvaliar
        ? 'Sua nota ajuda o próximo cliente a escolher.'
        : order.status === 'completed'
          ? 'Confirme a entrega para liberar o pagamento ao transportador.'
          : `Pedido ${orderCode(order.id)}`,
      at: order.updated_at,
      route: paraAvaliar ? `avaliar/${order.id}` : `acompanhar/${order.id}`,
      icon: meta.icon,
      actionable: meta.actionable,
    });
  }

  return sortByRecency(notices);
}

export type BuildProviderFeedInput = {
  /** Pedidos abertos que este prestador atende. */
  openRequests: Tables<'service_requests'>[];
  /** Pedidos em que ele é o transportador. */
  orders: Tables<'orders'>[];
  /** Propostas dele, para saber em quais já respondeu. */
  myQuotes: Map<string, Tables<'quotes'>>;
};

/**
 * Estados que valem aviso ao prestador — o recorte é outro, e o destino
 * também.
 *
 * O cliente tem `acompanhar/:id`, uma tela por pedido que serve para
 * qualquer estado. O prestador NÃO tem equivalente: "Viagem" mostra um
 * serviço só, o que estiver em andamento. Mandar um pedido finalizado para
 * lá abre uma tela vazia — o aviso vira beco sem saída.
 *
 * Por isso cada estado aponta para onde a informação dele realmente mora.
 */
const PROVIDER_NOTABLE: Partial<
  Record<OrderStatus, { actionable: boolean; icon: string; route: string }>
> = {
  // O único que ainda está em andamento: é a Viagem dele, agora.
  paid: { actionable: true, icon: 'money', route: 'parceiro-viagem' },
  // O dinheiro saiu da retenção e entrou no liberado. É em Ganhos que se vê.
  settled: { actionable: false, icon: 'check-circle', route: 'parceiro-ganhos' },
  // Não há o que ver de um pedido que caiu — há o que pegar no lugar dele.
  cancelled: { actionable: false, icon: 'close', route: 'parceiro' },
  // A tela de disputa dele precisa do id do pedido — resolvido abaixo.
  disputed: { actionable: true, icon: 'alert', route: 'disputa' },
};

export function buildProviderFeed(input: BuildProviderFeedInput): Notice[] {
  const notices: Notice[] = [];

  for (const request of input.openRequests) {
    // Pedido que ele já respondeu não é oportunidade: é espera.
    if (input.myQuotes.has(request.id)) continue;

    notices.push({
      id: `open-${request.id}`,
      kind: 'pedido-aberto',
      title: `Novo pedido de ${SERVICE_LABEL[request.service].toLowerCase()}`,
      body: request.origin_city
        ? `${request.origin_city} — envie sua proposta antes dos outros.`
        : 'Envie sua proposta antes dos outros.',
      at: request.created_at,
      route: 'parceiro',
      icon: 'bolt',
      actionable: true,
    });
  }

  for (const order of input.orders) {
    const meta = PROVIDER_NOTABLE[order.status];
    if (!meta) continue;

    notices.push({
      id: `porder-${order.id}-${order.status}-${order.updated_at}`,
      kind: 'estado',
      title:
        order.status === 'paid'
          ? 'Pagamento confirmado — pode sair'
          : ORDER_STATUS_LABELS[order.status],
      body: `Pedido ${orderCode(order.id)}`,
      at: order.updated_at,
      // `disputa` é por pedido; as outras são abas e não levam segmento.
      route: meta.route === 'disputa' ? `disputa/${order.id}` : meta.route,
      icon: meta.icon,
      actionable: meta.actionable,
    });
  }

  return sortByRecency(notices);
}

/** Mais recente primeiro. Empate desempata por id, para a ordem ser estável. */
function sortByRecency(notices: Notice[]): Notice[] {
  return [...notices].sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
}

// ---------------------------------------------------------------------
// Não lidos
// ---------------------------------------------------------------------

const SEEN_KEY = 'pagora:avisos-vistos';

/**
 * De quem é o feed.
 *
 * A mesma pessoa pode ser cliente E transportador — o `profile` é um só.
 * Sem separar, abrir os avisos de um lado marcaria os do outro como vistos,
 * e o transportador perderia o "pagamento confirmado" por ter olhado os
 * avisos de cliente.
 */
export type FeedScope = 'cliente' | 'transportador';

/**
 * Quantos avisos são posteriores à última visita.
 *
 * Compara por data, não por lista de ids: ids crescem para sempre e a lista
 * viraria lixo permanente no `localStorage`. Uma data só resolve.
 */
export function countUnseen(notices: Notice[], lastSeenAt: string | null): number {
  if (!lastSeenAt) return notices.length;
  return notices.filter((n) => n.at > lastSeenAt).length;
}

export function readLastSeen(userId: string, scope: FeedScope = 'cliente'): string | null {
  try {
    return localStorage.getItem(`${SEEN_KEY}:${scope}:${userId}`);
  } catch {
    // Navegação privada, armazenamento bloqueado. Sem memória do que foi
    // visto, tudo conta como novo — chato, nunca quebrado.
    return null;
  }
}

export function writeLastSeen(userId: string, at: string, scope: FeedScope = 'cliente'): void {
  try {
    localStorage.setItem(`${SEEN_KEY}:${scope}:${userId}`, at);
  } catch {
    // Idem.
  }
}
