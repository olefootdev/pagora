// =====================================================================
// PAGORA — Comprovante do serviço
// =====================================================================
// A tela que fecha o ciclo e faz propaganda sozinha: todo comprovante
// enviado num grupo de WhatsApp de obra é mídia grátis do Pagora.
//
// É 100% DERIVADA — pedido + proposta + transportador. Nenhum dado novo,
// nenhuma tabela, nenhuma migration. Por isso ela pode existir hoje, antes
// do pagamento estar ligado.
//
// Regra que a tela respeita: comprovante é documento. Nada aqui é
// aproximado, nada é "estimado". Se um dado não existe, a linha não aparece
// — um comprovante com lacuna é melhor que um comprovante com chute.
// =====================================================================

import { useEffect, useState } from 'react';
import {
  Body,
  Button,
  Card,
  Dock,
  Empty,
  ErrorNote,
  IconButton,
  KV,
  Num,
  Screen,
  Skeleton,
} from '../ui/kit';
import { Icon } from '../icons';
import { getOrder } from '../domains/orders/order.service';
import { orderCode } from '../domains/orders/order-code';
import { ORDER_STATUS_LABELS } from '../domains/orders/order.status';
import { getProvider, type AvailableProvider } from '../domains/providers/provider.service';
import { formatCents } from '../domains/money';
import { supabase } from '../lib/supabase';
import { buildShareUrl, shareOrCopy } from '../lib/share';
import { useShare } from '../hooks/useShare';
import { loadErrorMessage, withTimeout } from '../lib/timeout';
import type { GoFn, PagoraState } from '../types';
import type { Tables } from '../lib/database.types';

const dataLonga = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

export const Comprovante = ({ go, orderId }: { go: GoFn; orderId?: string | undefined }) => {
  const [order, setOrder] = useState<Tables<'orders'> | null>(null);
  const [request, setRequest] = useState<Tables<'service_requests'> | null>(null);
  const [provider, setProvider] = useState<AvailableProvider | null>(null);
  // Sem id não há o que carregar: o estado inicial já sabe disso, e o
  // efeito não precisa desligá-lo com um setState síncrono.
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState<string | null>(null);
  const { feedback, run } = useShare();

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    void (async () => {
      try {
        const o = await withTimeout(getOrder(orderId));
        if (cancelled) return;
        setOrder(o);
        if (o) {
          const [{ data: req }, prov] = await withTimeout(
            Promise.all([
              supabase.from('service_requests').select('*').eq('id', o.request_id).maybeSingle(),
              getProvider(o.provider_id),
            ]),
          );
          if (cancelled) return;
          setRequest(req);
          setProvider(prov);
        }
      } catch (e) {
        if (!cancelled) setError(loadErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <Shell go={go}>
        <Skeleton count={2} height={140} />
      </Shell>
    );
  }

  if (!order) {
    return (
      <Shell go={go}>
        <ErrorNote message={error ?? 'Não encontramos este serviço.'} />
        <Button variant="outline" block onClick={() => go('pedidos')}>
          Ver meus pedidos
        </Button>
      </Shell>
    );
  }

  const payload = (request?.payload ?? {}) as PagoraState;
  const codigo = orderCode(order.id);
  const concluido = order.status === 'settled' || order.status === 'completed';

  if (!concluido) {
    return (
      <Shell go={go}>
        <Empty
          icon="clock"
          title="O serviço ainda não terminou"
          sub="O comprovante fica disponível quando a entrega for confirmada."
          action={
            <Button variant="primary" onClick={() => go(`acompanhar/${order.id}`)}>
              Acompanhar
            </Button>
          }
        />
      </Shell>
    );
  }

  return (
    <Shell
      go={go}
      dock={
        <Dock>
          <Button
            variant="primary"
            size="lg"
            block
            iconStart="share"
            onClick={() => {
              void run(() =>
                shareOrCopy({
                  title: `Pagora — serviço ${codigo}`,
                  text: `${provider?.display_name ?? 'Transporte'} · ${formatCents(order.price_cents)} · concluído em ${dataLonga(order.updated_at)}`,
                  url: buildShareUrl(`comprovante/${order.id}`),
                }),
              );
            }}
          >
            Compartilhar comprovante
          </Button>
        </Dock>
      }
    >
      {/* O valor é o documento. Tudo o mais é contexto dele. */}
      <Card style={{ textAlign: 'center' }}>
        <span className="px-comp-selo">
          <Icon name="check-circle" size={15} aria-hidden="true" />
          Serviço concluído
        </span>
        <div style={{ marginTop: 14, display: 'grid', justifyItems: 'center' }}>
          <Num value={formatCents(order.price_cents)} />
        </div>
        <div className="px-data px-comp-codigo">{codigo}</div>
      </Card>

      <Card>
        <KV k="Transportador" v={provider?.display_name ?? '—'} strong />
        {provider?.vehicle_model && <KV k="Veículo" v={provider.vehicle_model} />}
        <KV k="Concluído em" v={dataLonga(order.updated_at)} />
        <KV k="Situação" v={ORDER_STATUS_LABELS[order.status]} />
      </Card>

      {/* Trajeto: só as linhas que existem. Comprovante não chuta. */}
      {(payload.origin || payload.address || payload.currentLoc) && (
        <Card>
          <KV
            k={request?.service === 'cacamba' ? 'Endereço' : 'Retirada'}
            v={payload.origin ?? payload.address ?? payload.currentLoc ?? '—'}
          />
          {request?.service !== 'cacamba' && (payload.dest || payload.destAddr) && (
            <KV k="Entrega" v={payload.dest ?? payload.destAddr ?? '—'} />
          )}
        </Card>
      )}

      {feedback && (
        <div className="px-chip px-chip--on" role="status">
          {feedback}
        </div>
      )}
    </Shell>
  );
};

const Shell = ({
  go,
  children,
  dock,
}: {
  go: GoFn;
  children: React.ReactNode;
  dock?: React.ReactNode;
}) => (
  <Screen label="Comprovante">
    <header className="px-head px-head--sticky">
      <IconButton icon="arrow-left" label="Voltar" onClick={() => go('pedidos')} />
      <div className="px-head-title">Comprovante</div>
    </header>
    <Body>{children}</Body>
    {dock}
  </Screen>
);
