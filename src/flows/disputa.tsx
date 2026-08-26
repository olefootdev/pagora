// =====================================================================
// PAGORA — Disputa, a tela do transportador
// =====================================================================
// A lacuna que os avisos do prestador expuseram: existia o aviso "Em
// disputa" e não havia para onde mandar a pessoa. O aviso caía em Ganhos,
// que mostra o dinheiro retido mas não conta o motivo nem aceita resposta.
//
// A tela responde três perguntas, nesta ordem — que é a ordem em que a
// pessoa faz:
//   1. quanto do MEU dinheiro está preso;
//   2. do que estão me acusando, na íntegra, sem resumo do app;
//   3. até quando eu tenho para responder.
//
// A caixa de resposta aceita voz. Quem está no pátio com a mão suja não vai
// digitar quatro linhas de defesa no telefone — e essa defesa é o único lado
// da história que o admin ainda não tem.
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
  SectionTitle,
  Skeleton,
  TextArea,
} from '../ui/kit';
import { Icon } from '../icons';
import { VoiceButton } from '../ui/anchor-card';
import { getOrder, providerNetCents } from '../domains/orders/order.service';
import { orderCode } from '../domains/orders/order-code';
import {
  getDisputeForOrder,
  respondDispute,
  slaLabel,
  type Dispute,
} from '../domains/disputes/dispute.service';
import { formatCents } from '../domains/money';
import { track } from '../lib/analytics';
import { loadErrorMessage, withTimeout } from '../lib/timeout';
import type { GoFn } from '../types';
import type { Tables } from '../lib/database.types';

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

export const Disputa = ({ go, orderId }: { go: GoFn; orderId?: string | undefined }) => {
  const [order, setOrder] = useState<Tables<'orders'> | null>(null);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [resposta, setResposta] = useState('');
  // Sem id não há o que carregar: o estado inicial já sabe disso, e o efeito
  // não precisa desligá-lo com um setState síncrono.
  const [loading, setLoading] = useState(Boolean(orderId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    void (async () => {
      try {
        const [o, d] = await withTimeout(
          Promise.all([getOrder(orderId), getDisputeForOrder(orderId)]),
        );
        if (cancelled) return;
        setOrder(o);
        setDispute(d);
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

  async function enviar() {
    if (!dispute) return;
    setBusy(true);
    setError(null);
    try {
      const atualizada = await withTimeout(respondDispute(dispute.id, resposta));
      track('disputa_respondida', { dispute_id: dispute.id });
      setDispute(atualizada);
      setResposta('');
    } catch (e) {
      setError(loadErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Shell go={go}>
        <Skeleton count={3} height={120} />
      </Shell>
    );
  }

  if (!order || !dispute) {
    return (
      <Shell go={go}>
        <Empty
          icon="check-circle"
          title="Nenhuma disputa neste serviço"
          sub={error ?? 'Se o cliente abrir uma, ela aparece aqui e nos seus avisos.'}
          action={
            <Button variant="primary" onClick={() => go('parceiro-ganhos')}>
              Ver meus ganhos
            </Button>
          }
        />
      </Shell>
    );
  }

  const respondida = Boolean(dispute.responded_at);
  const resolvida = dispute.status.startsWith('resolved');

  return (
    <Shell
      go={go}
      dock={
        respondida || resolvida ? undefined : (
          <Dock>
            <Button
              variant="primary"
              size="lg"
              block
              busy={busy}
              busyLabel="Enviando…"
              disabled={resposta.trim().length < 10}
              onClick={() => void enviar()}
            >
              Enviar minha resposta
            </Button>
          </Dock>
        )
      }
    >
      {/* 1. Quanto do meu dinheiro está preso. É a pergunta que vem antes
          de qualquer outra, e a tela responde com o LÍQUIDO dele. */}
      <Card style={{ textAlign: 'center' }}>
        <span className="px-eyebrow">Retido até a disputa terminar</span>
        <div style={{ marginTop: 10, display: 'grid', justifyItems: 'center' }}>
          <Num value={formatCents(providerNetCents(order))} />
        </div>
        <div className="px-data px-comp-codigo">{orderCode(order.id)}</div>
      </Card>

      {/* 2. A acusação inteira, do jeito que o cliente escreveu. Resumir
          seria escolher um lado antes do admin. */}
      <Card>
        <SectionTitle>O que o cliente relatou</SectionTitle>
        <p className="px-opt-s" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
          {dispute.client_reason}
        </p>
        <div style={{ marginTop: 14 }}>
          <KV k="Aberta em" v={dataHora(dispute.created_at)} />
        </div>
      </Card>

      {resolvida ? (
        <Card tone="action">
          <SectionTitle>Disputa encerrada</SectionTitle>
          <p className="px-opt-s" style={{ marginTop: 6 }}>
            {dispute.resolution_notes ?? 'A Pagora analisou os dois lados e decidiu.'}
          </p>
          {typeof dispute.refund_cents === 'number' && dispute.refund_cents > 0 && (
            <div style={{ marginTop: 12 }}>
              <KV k="Devolvido ao cliente" v={formatCents(dispute.refund_cents)} strong />
            </div>
          )}
        </Card>
      ) : respondida ? (
        <Card tone="action">
          <div className="px-row px-row--top">
            <Icon
              name="check-circle"
              size={20}
              style={{ color: 'var(--x-action)', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <SectionTitle>Sua resposta foi enviada</SectionTitle>
              <p className="px-opt-s" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
                {dispute.provider_response}
              </p>
              <p className="px-opt-s" style={{ marginTop: 10 }}>
                A Pagora analisa os dois lados e avisa vocês pelo app. O valor segue retido até lá.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* 3. Até quando. Sem o prazo, responder vira "depois". */}
          <Card tone="action">
            <div className="px-row px-row--top">
              <Icon name="clock" size={20} style={{ color: 'var(--x-action)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <SectionTitle>{slaLabel(dispute.sla_due_at)}</SectionTitle>
                <p className="px-opt-s" style={{ marginTop: 6 }}>
                  Sem a sua versão, a Pagora decide só com o que o cliente contou.
                </p>
              </div>
            </div>
          </Card>

          <div style={{ position: 'relative' }}>
            <TextArea
              label="Conte o seu lado"
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              placeholder="O que aconteceu, o que foi combinado, o que você entregou…"
              className="px-textarea--voice"
            />
            <VoiceButton
              onText={(t) => setResposta((c) => (c ? `${c} ${t}` : t))}
              label="Ditar a resposta"
              className="px-voice-corner"
            />
          </div>
        </>
      )}

      {error && <ErrorNote message={error} />}
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
  <Screen label="Transportador · Disputa">
    <header className="px-head px-head--sticky">
      <IconButton icon="arrow-left" label="Voltar" onClick={() => go('parceiro-avisos')} />
      <div className="px-head-title">Disputa</div>
    </header>
    <Body>{children}</Body>
    {dock}
  </Screen>
);
