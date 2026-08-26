// =====================================================================
// PAGORA — Acompanhar o transporte
// =====================================================================
// A tela onde o mapa finalmente é protagonista. Nas outras duas intensidades
// ele é contexto; aqui ele é a informação.
//
// Ela responde, sem rolagem, às seis perguntas de quem está esperando um
// caminhão: onde está, quem está levando, o que está levando, para onde,
// quando chega e quanto custa. A antiga respondia às mesmas — mas com o card
// empurrando a rota para fora da tela e o ETA no mesmo corpo do texto
// auxiliar.
// =====================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Body,
  Button,
  Card,
  ErrorNote,
  IconButton,
  KV,
  Rating,
  RouteLine,
  Screen,
  ScreenHead,
  SectionTitle,
  Sheet,
  Skeleton,
  Stack,
  Timeline,
  type TimelineStep,
  cx,
} from '../ui/kit';
import { Icon } from '../icons';
import { MapCanvas } from '../ui/map-canvas';
import { supabase } from '../lib/supabase';
import { formatCents } from '../domains/money';
import { confirmDelivery, getOrder } from '../domains/orders/order.service';
import { orderCode } from '../domains/orders/order-code';
import {
  COARSE_TRACK,
  coarseTrackIndex,
  isPaid,
  isTerminal,
  ORDER_STATUS_LABELS,
} from '../domains/orders/order.status';
import {
  getProvider,
  initialsOf,
  type AvailableProvider,
} from '../domains/providers/provider.service';
import { buildShareUrl, shareOrCopy } from '../lib/share';
import { useShare } from '../hooks/useShare';
import { track } from '../lib/analytics';
import { loadErrorMessage, withTimeout } from '../lib/timeout';
import type { GoFn, PagoraState } from '../types';
import type { OrderStatus, Tables } from '../lib/database.types';

// =====================================================================
// LINHA DO TEMPO
// =====================================================================
// Os oito estados que o cliente entende, mapeados sobre a máquina real do
// banco. `order.status` tem dez valores, mas três deles (expired, refunded,
// disputed) não são etapas de um transporte — são desvios, e aparecem como
// aviso, não como passo cumprido.
// =====================================================================

const JOURNEY: ReadonlyArray<{ status: OrderStatus; label: string }> = [
  { status: 'pending_payment', label: 'Pedido confirmado' },
  { status: 'paid', label: 'Pagamento aprovado' },
  { status: 'en_route', label: 'Transportador a caminho' },
  { status: 'in_progress', label: 'Carga em transporte' },
  { status: 'completed', label: 'Entrega concluída' },
  { status: 'settled', label: 'Finalizado' },
];

export function journeySteps(current: OrderStatus): TimelineStep[] {
  const index = JOURNEY.findIndex((s) => s.status === current);
  return JOURNEY.map((s, i) => ({
    id: s.status,
    title: s.label,
    // Um estado fora da jornada (cancelado, em disputa) não marca nada como
    // cumprido: mostrar meio caminho andado num pedido cancelado seria pior
    // que mostrar nada.
    state: index < 0 ? 'todo' : i < index ? 'done' : i === index ? 'now' : 'todo',
  }));
}

/** Progresso de 0 a 1 para a ilustração do mapa acompanhar o estado. */
export function journeyProgress(current: OrderStatus): number {
  const index = JOURNEY.findIndex((s) => s.status === current);
  if (index < 0) return 0;
  return Math.min(1, (index + 1) / JOURNEY.length);
}

/**
 * O que desenhar no mapa a partir do que o pedido guardou.
 *
 * Caçamba tem um ponto só (entrega e retirada no mesmo endereço), então não
 * tem rota — desenhar uma linha de um ponto para ele mesmo seria inventar
 * trajeto. Frete e guincho têm dois.
 */
export function tripGeometry(payload: PagoraState, status: OrderStatus) {
  const origin = payload.originGeo ?? null;
  const destination = payload.destGeo ?? null;

  const markers = [
    origin ? { id: 'origem', position: origin, label: 'Retirada' } : null,
    // Mesmo ponto nos dois: um marcador só, senão eles se sobrepõem e o
    // segundo esconde o primeiro.
    destination && (!origin || destination.lat !== origin.lat || destination.lng !== origin.lng)
      ? { id: 'destino', position: destination, label: 'Entrega', highlighted: true }
      : null,
  ].filter((m): m is NonNullable<typeof m> => m != null);

  const route =
    origin && destination && (origin.lat !== destination.lat || origin.lng !== destination.lng)
      ? { origin, destination }
      : undefined;

  return {
    markers,
    route,
    alt:
      markers.length > 0
        ? `Mapa do trajeto. Estado atual: ${ORDER_STATUS_LABELS[status]}.`
        : `Mapa ilustrativo — este pedido não tem coordenada gravada. Estado atual: ${ORDER_STATUS_LABELS[status]}.`,
  };
}

// =====================================================================

export const Acompanhar = ({ go, orderId }: { go: GoFn; orderId?: string | undefined }) => {
  const [order, setOrder] = useState<Tables<'orders'> | null>(null);
  const [request, setRequest] = useState<Tables<'service_requests'> | null>(null);
  const [provider, setProvider] = useState<AvailableProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [seguranca, setSeguranca] = useState(false);
  const { feedback: shareFeedback, run: runShare } = useShare();

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const o = await withTimeout(getOrder(orderId));
      setError(null);
      setOrder(o);
      if (o) {
        const [{ data: req }, prov] = await withTimeout(
          Promise.all([
            supabase.from('service_requests').select('*').eq('id', o.request_id).maybeSingle(),
            getProvider(o.provider_id),
          ]),
        );
        setRequest(req);
        setProvider(prov);
      }
    } catch (e) {
      setError(loadErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    // `load` é assíncrona: todo setState dela acontece DEPOIS do await, não
    // no corpo do efeito. A regra não modela a fronteira do await e marca a
    // chamada mesmo assim — mesma exceção já usada em hooks/useProfile.ts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // O estado do pedido muda pelo prestador e pelo gateway, não por esta tela.
  // Sem realtime, quem espera o caminhão ficaria puxando para atualizar.
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order-track-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'pagora', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => setOrder(payload.new as Tables<'orders'>),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId]);

  async function confirmar() {
    if (!order) return;
    setConfirming(true);
    setError(null);
    try {
      await withTimeout(confirmDelivery(order.id));
      track('entrega_confirmada', { order_id: order.id });
      // Direto para a nota: quem acabou de confirmar tem o serviço fresco na
      // cabeça, e é a única janela em que avaliar é fácil de pedir.
      go(`avaliar/${order.id}`);
    } catch (e) {
      setError(loadErrorMessage(e));
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <Screen label="Acompanhar">
        <ScreenHead onBack={() => go('pedidos')} title="Acompanhar" />
        <Body>
          <Skeleton count={3} height={110} />
        </Body>
      </Screen>
    );
  }

  if (!order) {
    // Dois motivos diferentes levam a "sem pedido", e confundi-los custa
    // caro: dizer "não encontramos este transporte" quando o problema é a
    // internet do usuário é um diagnóstico errado que vira ligação para o
    // suporte. Quando há erro de carga, ele é que fala.
    return (
      <Screen label="Acompanhar">
        <ScreenHead onBack={() => go('pedidos')} title="Acompanhar" />
        <Body>
          <ErrorNote
            message={
              error ??
              'Não encontramos este transporte. Ele pode ter sido cancelado, ou o link não é seu.'
            }
            onRetry={() => void load()}
          />
          <Button variant="outline" block onClick={() => go('pedidos')}>
            Ver meus pedidos
          </Button>
        </Body>
      </Screen>
    );
  }

  const payload = (request?.payload ?? {}) as PagoraState;
  const trip = tripGeometry(payload, order.status);
  const steps = journeySteps(order.status);
  const done = order.status === 'completed';
  const terminal = isTerminal(order.status);

  return (
    <Screen label="Acompanhar">
      {/* ---- HERO DE STATUS — a 2ª prancheta do canvas ---------------- */}
      <div className="px-hero px-hero--track">
        <div className="px-hero-top">
          <button className="px-hero-btn" onClick={() => go('pedidos')} aria-label="Voltar">
            <Icon name="arrow-left" size={20} />
          </button>
          <button
            className="px-hero-btn"
            aria-label="Compartilhar acompanhamento"
            onClick={() => {
              void runShare(() =>
                shareOrCopy({
                  title: 'Acompanhe meu transporte no Pagora',
                  text: `${ORDER_STATUS_LABELS[order.status]} — pedido ${orderCode(order.id)}`,
                  url: buildShareUrl(`acompanhar/${order.id}`),
                }),
              );
              track('acompanhamento_compartilhado', { order_id: order.id });
            }}
          >
            <Icon name="share" size={19} />
          </button>
        </div>

        <div className="px-hero-head">
          <h1 className="px-hero-title">{ORDER_STATUS_LABELS[order.status]}</h1>
          {!terminal && (
            <span className="px-hero-pill">
              <span className="px-live" aria-hidden="true" />
              ao vivo
            </span>
          )}
        </div>

        <p className="px-hero-sub">
          {provider?.display_name ?? 'Transportador'}
          {provider?.vehicle_model ? ` · ${provider.vehicle_model}` : ''}
          {' · '}
          <span className="px-data" style={{ color: 'var(--x-hero-ink)' }}>
            {orderCode(order.id)}
          </span>
        </p>

        {/* A régua repete o estado numa terceira forma: posição. */}
        <div className="px-track" role="list" aria-label="Progresso do transporte">
          {COARSE_TRACK.map((step, idx) => {
            const atual = coarseTrackIndex(order.status);
            return (
              <div
                key={step.lbl}
                role="listitem"
                className={cx('px-track-step', atual > idx && 'is-done', atual === idx && 'is-now')}
              >
                <span className="px-track-dot" aria-hidden="true" />
                <span className="px-track-lbl">{step.lbl}</span>
                <span className="px-sr">
                  {atual > idx ? 'concluído' : atual === idx ? 'etapa atual' : 'pendente'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- MAPA ------------------------------------------------------ */}
      {/* O mapa recebe as coordenadas gravadas no pedido. Sem chave do
          Google — ou sem coordenada, quando o pedido foi feito antes do
          Places — cai na ilustração, que continua comunicando o estado. */}
      <MapCanvas
        height={260}
        progress={journeyProgress(order.status)}
        {...(trip.markers.length > 0 ? { markers: trip.markers } : {})}
        route={trip.route}
        alt={trip.alt}
      />

      <Body>
        {shareFeedback && (
          <div className="px-chip px-chip--on" role="status">
            {shareFeedback}
          </div>
        )}

        {error && <ErrorNote message={error} onRetry={() => void load()} />}

        {/* ---- AÇÃO DO MOMENTO ---------------------------------------- */}
        {order.status === 'pending_payment' && (
          <Card tone="urgent">
            <div className="px-row px-row--top">
              <Icon name="alert" size={20} style={{ color: 'var(--x-urgent)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <SectionTitle>Falta o pagamento</SectionTitle>
                <p className="px-opt-s" style={{ marginTop: 6 }}>
                  O transportador só é acionado depois que o pagamento entra.
                </p>
                <Button
                  variant="urgent"
                  block
                  style={{ marginTop: 12 }}
                  onClick={() => go('checkout', { orderId: order.id })}
                >
                  Pagar com Pix
                </Button>
              </div>
            </div>
          </Card>
        )}

        {done && (
          <Card tone="action">
            <SectionTitle>O transportador marcou como entregue</SectionTitle>
            <p className="px-opt-s" style={{ marginTop: 6 }}>
              Confirme para liberar o pagamento a ele. Se algo deu errado, abra uma disputa antes de
              confirmar.
            </p>
            <Button
              variant="primary"
              block
              busy={confirming}
              busyLabel="Confirmando…"
              style={{ marginTop: 12 }}
              onClick={() => void confirmar()}
            >
              Confirmar entrega
            </Button>
          </Card>
        )}

        {/* ---- QUEM ESTÁ LEVANDO -------------------------------------- */}
        <Card>
          <div className="px-row">
            <Avatar initials={initialsOf(provider?.display_name)} large />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="px-opt-t">{provider?.display_name ?? 'Transportador'}</div>
              <div style={{ marginTop: 4 }}>
                <Rating value={provider?.rating_avg} count={provider?.rating_count} />
              </div>
              {provider?.vehicle_model && (
                <div className="px-data" style={{ color: 'var(--x-ink-dim)', marginTop: 5 }}>
                  {provider.vehicle_model}
                </div>
              )}
            </div>
          </div>

          <div className="px-row" style={{ gap: 8, marginTop: 14 }}>
            <Button
              variant="outline"
              block
              iconStart="message"
              onClick={() => go('chat', { orderId: order.id })}
            >
              Mensagem
            </Button>
            <IconButton icon="shield" label="Segurança" onClick={() => setSeguranca(true)} />
          </div>
        </Card>

        {/* ---- O QUE E PARA ONDE -------------------------------------- */}
        <Card>
          {request?.service === 'cacamba' ? (
            <div className="px-opt-t">
              Caçamba de {payload.size ?? '—'} m³ · {payload.address ?? 'endereço no pedido'}
            </div>
          ) : request?.service === 'guincho' ? (
            <RouteLine
              origin={payload.currentLoc}
              dest={payload.destAddr}
              originLabel="Veículo estava em"
              destLabel="Levando para"
            />
          ) : (
            <RouteLine origin={payload.origin} dest={payload.dest} />
          )}
        </Card>

        {/* ---- ONDE ESTÁ NA JORNADA ----------------------------------- */}
        <section className="px-stack">
          <SectionTitle>Andamento</SectionTitle>
          <Card>
            <Timeline steps={steps} />
          </Card>
        </section>

        {/* ---- QUANTO CUSTA ------------------------------------------- */}
        <section className="px-stack">
          <SectionTitle>Valores</SectionTitle>
          <Card>
            <KV k="Valor do serviço" v={formatCents(order.price_cents)} strong />
            <KV k="Pagamento" v={isPaid(order.status) ? 'Confirmado' : 'Aguardando'} />
            <KV k="Taxa ao cliente" v="Nenhuma" />
          </Card>
        </section>

        {/* Ciclo fechado: quem terminou avalia e leva o comprovante. */}
        {order.status === 'settled' && (
          <>
            <Button
              variant="primary"
              size="lg"
              block
              iconStart="star"
              onClick={() => go(`avaliar/${order.id}`)}
            >
              Avaliar o transportador
            </Button>
            <Button
              variant="outline"
              block
              iconStart="doc"
              onClick={() => go(`comprovante/${order.id}`)}
            >
              Ver comprovante
            </Button>
          </>
        )}

        {terminal && order.status !== 'settled' && (
          <Button variant="outline" block onClick={() => go('inicio')}>
            Voltar ao início
          </Button>
        )}
      </Body>

      <SegurancaSheet
        open={seguranca}
        onClose={() => setSeguranca(false)}
        order={order}
        provider={provider}
        onShare={() => {
          void runShare(() =>
            shareOrCopy({
              title: 'Acompanhe meu transporte no Pagora',
              text: `Pedido ${orderCode(order.id)} no Pagora`,
              url: buildShareUrl(`acompanhar/${order.id}`),
            }),
          );
        }}
      />
    </Screen>
  );
};

// =====================================================================
// SEGURANÇA
// =====================================================================
// A auditoria pediu segurança visível sem poluir a interface. A solução é
// esta: um ícone permanente ao lado do contato, e tudo o que importa numa
// folha — verificação, identificação, compartilhamento da viagem e suporte.
// =====================================================================

const SegurancaSheet = ({
  open,
  onClose,
  order,
  provider,
  onShare,
}: {
  open: boolean;
  onClose: () => void;
  order: Tables<'orders'>;
  provider: AvailableProvider | null;
  onShare: () => void;
}) => (
  <Sheet open={open} onClose={onClose} title="Segurança">
    <Stack>
      <Card>
        <div className="px-row px-row--top">
          <Icon name="shield" size={20} style={{ color: 'var(--x-action)', flexShrink: 0 }} />
          <div>
            <div className="px-opt-t">Transportador verificado</div>
            <p className="px-opt-s" style={{ marginTop: 5 }}>
              Documento, CNH e veículo conferidos pela Pagora antes da aprovação do cadastro.
            </p>
          </div>
        </div>
      </Card>

      <div>
        <KV k="Pedido" v={orderCode(order.id)} />
        <KV k="Transportador" v={provider?.display_name ?? '—'} />
        <KV k="Veículo" v={provider?.vehicle_model ?? '—'} />
      </div>

      <Button variant="outline" block iconStart="share" onClick={onShare}>
        Compartilhar acompanhamento
      </Button>
      <Button
        variant="outline"
        block
        iconStart="headset"
        onClick={() => window.open('mailto:suporte@pagora.com.br', '_blank', 'noopener')}
      >
        Falar com o suporte
      </Button>

      <p className="px-opt-s" style={{ marginTop: 0 }}>
        Em emergência, ligue 190. A Pagora não substitui o atendimento de urgência.
      </p>
    </Stack>
  </Sheet>
);
