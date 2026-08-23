// =====================================================================
// PAGORA — Meus pedidos (dados reais)
// =====================================================================
// Ponto de entrada do fluxo transacional para os dois lados.
//
// Existe separada de `history-list` de propósito: aquela tela é maquete, com
// pedidos fixos no código. Misturar as duas produziria uma lista em que
// metade dos itens responde a botão e a outra metade não — pior para depurar
// do que duas telas honestas. Quando o fluxo de descoberta (criar pedido →
// receber propostas) for ligado ao banco, as duas viram uma só.
// =====================================================================
import { useEffect, useState } from 'react';
import { Icon } from '../icons';
import { StatusBar, TopBar } from '../core';
import { formatCents } from '../domains/money';
import { acceptQuote, listMyOrders } from '../domains/orders/order.service';
import {
  listMyQuotesForRequest,
  listMyRequests,
  type QuoteWithProvider,
} from '../domains/orders/request.service';
import { ORDER_STATUS_LABELS, isPaid, isTerminal } from '../domains/orders/order.status';
import { OrderActions } from './order-actions';
import { track } from '../lib/analytics';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';
import type { OrderStatus, Tables } from '../lib/database.types';
import type { GoFn } from '../types';

type Order = Tables<'orders'>;

export const MeusPedidos = ({ go }: { go: GoFn }) => {
  const { user, loading: sessionLoading } = useSession();
  const { profile } = useProfile();
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<Tables<'service_requests'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // O papel muda o que a tela oferece: cliente paga e confirma; prestador
  // declara execução. Não é decoração — `advance_order_status` recusa a
  // transição se o ator estiver errado, então oferecer o botão errado só
  // produziria um erro na cara do usuário.
  const actor = profile?.role === 'provider' ? 'provider' : 'client';

  // O efeito faz a busca e cancela a resposta se a tela sair antes. Nenhum
  // `setState` síncrono acontece dentro dele: `loading` já nasce true.
  useEffect(() => {
    if (sessionLoading || !user) return;
    let cancelled = false;

    void (async () => {
      try {
        // Pedidos aguardando proposta e serviços já fechados são coisas
        // diferentes na cabeça do cliente, mas vivem na mesma tela: é onde ele
        // volta para saber "e aí?".
        const [orderRows, requestRows] = await Promise.all([
          listMyOrders(actor, user.id),
          actor === 'client' ? listMyRequests(user.id) : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setOrders(orderRows);
          setRequests(requestRows);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(traduzirErro((e as Error).message));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionLoading, user, actor, reloadToken]);

  // Pedidos já aceitos viram order e apareceriam duas vezes.
  const openRequests = requests.filter((r) => r.status === 'open' || r.status === 'quoting');

  function patchStatus(orderId: string, status: OrderStatus) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  }

  return (
    <div className="pg-screen" data-screen-label="P4 Meus pedidos">
      <StatusBar />
      <TopBar onBack={() => go('home')} title="Meus pedidos" />
      <div className="pg-viewport">
        <div style={{ padding: '18px 20px 32px', display: 'grid', gap: 14 }}>
          {!sessionLoading && !user && (
            <Placeholder
              title="Entre para ver seus pedidos"
              body="Seus pedidos ficam vinculados ao seu telefone."
              action={{ label: 'Entrar', onClick: () => go('login') }}
            />
          )}

          {user && loading && <Placeholder title="Carregando…" body="Buscando seus pedidos." />}

          {user && !loading && error && <Placeholder title="Não deu certo" body={error} />}

          {user && !loading && !error && orders.length === 0 && openRequests.length === 0 && (
            <Placeholder
              title="Nenhum pedido ainda"
              body={
                actor === 'provider'
                  ? 'Quando um cliente aceitar sua proposta, o serviço aparece aqui.'
                  : 'Peça um frete, guincho ou caçamba para começar.'
              }
              action={
                actor === 'client'
                  ? { label: 'Pedir um serviço', onClick: () => go('services') }
                  : undefined
              }
            />
          )}

          {openRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              go={go}
              onAccepted={() => setReloadToken((n) => n + 1)}
            />
          ))}

          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              actor={actor}
              go={go}
              onChanged={(status) => patchStatus(order.id, status)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
function OrderCard({
  order,
  actor,
  go,
  onChanged,
}: {
  order: Order;
  actor: 'client' | 'provider';
  go: GoFn;
  onChanged: (status: OrderStatus) => void;
}) {
  const awaitingPayment = order.status === 'pending_payment';

  return (
    <div className="pg-card pg-card--padded" style={{ display: 'grid', gap: 12 }}>
      <div className="pg-row pg-row--between" style={{ gap: 10 }}>
        <span className="pg-tag pg-tag--outline pg-mono">#{order.id.slice(0, 8)}</span>
        <StatusPill status={order.status} />
      </div>

      <div className="pg-row pg-row--between" style={{ gap: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>
          {actor === 'provider' ? 'Você recebe' : 'Valor do serviço'}
        </span>
        <span className="pg-mono" style={{ fontSize: 20, fontWeight: 600 }}>
          {formatCents(actor === 'provider' ? order.provider_amount_cents : order.price_cents)}
        </span>
      </div>

      {/* Para o prestador, deixar explícito de onde sai a diferença. Descobrir
          a comissão só no extrato é o tipo de surpresa que gera disputa. */}
      {actor === 'provider' && (
        <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>
          Bruto {formatCents(order.price_cents)} − comissão {formatCents(order.platform_fee_cents)}
        </div>
      )}

      {actor === 'provider' && isPaid(order.status) && order.status !== 'settled' && (
        <div className="pg-row" style={{ gap: 8, alignItems: 'flex-start' }}>
          <Icon name="clock" size={15} />
          <span style={{ fontSize: 12, color: 'var(--text-mute)', lineHeight: 1.45 }}>
            Cliente já pagou. O valor é liberado para saque quando ele confirmar a conclusão.
          </span>
        </div>
      )}

      {awaitingPayment && actor === 'client' && (
        <button
          className="pg-btn pg-btn--accent"
          onClick={() => go('checkout', { orderId: order.id })}
        >
          <Icon name="credit-card" size={16} /> Pagar com Pix
        </button>
      )}

      {/* Entrada real do chat. As telas maquete (tracking, locator) chamam
          go('chat') sem pedido e caem no estado vazio; é daqui que a conversa
          abre com order_id de verdade, que é o que a RLS da 0010 exige. */}
      {!isTerminal(order.status) && (
        <button className="pg-btn pg-btn--ghost" onClick={() => go('chat', { orderId: order.id })}>
          <Icon name="message" size={16} /> Conversar
        </button>
      )}

      {!isTerminal(order.status) && !awaitingPayment && (
        <OrderActions
          orderId={order.id}
          status={order.status}
          actor={actor}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
/**
 * Pedido publicado, aguardando propostas.
 *
 * As propostas só são buscadas quando o cartão é expandido: um cliente com
 * cinco pedidos abertos dispararia cinco consultas ao entrar na tela, para
 * mostrar informação que ele talvez nem olhe.
 */
function RequestCard({
  request,
  go,
  onAccepted,
}: {
  request: Tables<'service_requests'>;
  go: GoFn;
  onAccepted: () => void;
}) {
  const [quotes, setQuotes] = useState<QuoteWithProvider[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || quotes !== null) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listMyQuotesForRequest(request.id);
        if (!cancelled) setQuotes(rows);
      } catch (e) {
        if (!cancelled) setError(traduzirErro((e as Error).message));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, quotes, request.id]);

  async function accept(quoteId: string) {
    setBusy(quoteId);
    setError(null);
    try {
      const order = await acceptQuote(quoteId);
      track('proposta_aceita', { request_id: request.id });
      // Aceitar cria a order em `pending_payment`. Levar direto ao checkout é
      // o caminho que o cliente espera — ele acabou de escolher, quer pagar.
      go('checkout', { orderId: order.id });
      onAccepted();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const serviceLabel = { frete: 'Frete', guincho: 'Guincho', cacamba: 'Caçamba' }[request.service];

  return (
    <div className="pg-card pg-card--padded" style={{ display: 'grid', gap: 12 }}>
      <div className="pg-row pg-row--between" style={{ gap: 10 }}>
        <span className="pg-tag" style={{ background: 'var(--ink-100)' }}>
          {serviceLabel}
        </span>
        <span className="pg-tag pg-tag--outline">Aguardando propostas</span>
      </div>

      {request.estimate_low_cents !== null && request.estimate_high_cents !== null && (
        <div style={{ fontSize: 13, color: 'var(--text-mute)' }}>
          Sua estimativa: {formatCents(request.estimate_low_cents)} –{' '}
          {formatCents(request.estimate_high_cents)}
        </div>
      )}

      {error && (
        <span role="alert" className="pg-helper is-error">
          {error}
        </span>
      )}

      {!open ? (
        <button className="pg-btn pg-btn--accent pg-btn--sm" onClick={() => setOpen(true)}>
          Ver propostas recebidas
        </button>
      ) : quotes === null ? (
        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>Buscando propostas…</span>
      ) : quotes.length === 0 ? (
        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>
          Nenhuma proposta ainda. Prestadores costumam responder em até 2 h.
        </span>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {quotes.map((quote) => (
            <div
              key={quote.id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 12,
                display: 'grid',
                gap: 8,
              }}
            >
              <div className="pg-row pg-row--between" style={{ gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {quote.provider?.display_name ?? 'Prestador'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>
                    {quote.provider && quote.provider.rating_count > 0
                      ? `${Number(quote.provider.rating_avg).toFixed(1)} ★ · ${quote.provider.rating_count} avaliações`
                      : 'Sem avaliações ainda'}
                    {quote.eta_minutes ? ` · chega em ${quote.eta_minutes} min` : ''}
                  </div>
                </div>
                <span className="pg-mono" style={{ fontSize: 18, fontWeight: 600 }}>
                  {formatCents(quote.price_cents)}
                </span>
              </div>

              {quote.notes && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.45 }}>
                  {quote.notes}
                </p>
              )}

              <button
                className="pg-btn pg-btn--accent pg-btn--sm"
                disabled={busy !== null}
                onClick={() => void accept(quote.id)}
              >
                {busy === quote.id ? 'Aceitando…' : 'Aceitar e pagar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function traduzirErro(message: string): string {
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Não foi possível falar com o servidor. Verifique a conexão.';
  }
  return message;
}

function StatusPill({ status }: { status: OrderStatus }) {
  const tone =
    status === 'settled'
      ? 'pg-tag--green'
      : status === 'disputed' || status === 'cancelled' || status === 'refunded'
        ? 'pg-tag--orange'
        : '';
  return (
    <span className={`pg-tag ${tone}`} style={tone ? undefined : { background: 'var(--ink-100)' }}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

function Placeholder({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div style={{ padding: '48px 20px', textAlign: 'center', display: 'grid', gap: 10 }}>
      <h2 style={{ fontSize: 19, margin: 0 }}>{title}</h2>
      <p style={{ color: 'var(--text-mute)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>{body}</p>
      {action && (
        // `justifySelf` porque o container é grid: sem isto o botão esticaria
        // de ponta a ponta e leria como banner, não como ação.
        <button
          className="pg-btn pg-btn--accent"
          style={{ marginTop: 6, justifySelf: 'center' }}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
