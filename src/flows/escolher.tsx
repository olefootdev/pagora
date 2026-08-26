// =====================================================================
// PAGORA — Escolher proposta
// =====================================================================
// A tela onde o dinheiro é decidido, e por isso a que mais precisava mudar.
//
// A antiga (`proposals` / `compare`) ordenava um array fixo por preço, sem
// rótulo nenhum: o usuário fazia a análise sozinho, na rua, no telefone — e
// por isso escolhia sempre a mais barata. Esta rotula, ordena pela leitura
// que queremos que ele faça, e diz em texto por que cada rótulo está ali.
//
// A espera também é interface. Enquanto não há proposta, a tela não é uma
// lista vazia: é um estado que informa que o pedido está circulando, quantos
// prestadores o receberam, e que a resposta chega sozinha — a inscrição em
// realtime já existe desde a 0002, então não há polling nem "atualizar".
// =====================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Body,
  Button,
  Card,
  Chip,
  Empty,
  ErrorNote,
  KV,
  Num,
  Rating,
  RouteLine,
  Screen,
  ScreenHead,
  SectionTitle,
  Sheet,
  Skeleton,
  Stack,
  cx,
} from '../ui/kit';
import { Icon } from '../icons';
import { supabase } from '../lib/supabase';
import { formatCents } from '../domains/money';
import { acceptQuote } from '../domains/orders/order.service';
import { listMyQuotesForRequest, type QuoteWithProvider } from '../domains/orders/request.service';
import { BADGE_LABEL, orderForDisplay, recommend, type Badge } from '../domains/orders/recommend';
import { initialsOf } from '../domains/providers/provider.service';
import { track } from '../lib/analytics';
import { loadErrorMessage, withTimeout } from '../lib/timeout';
import type { GoFn, PagoraState } from '../types';
import type { Tables } from '../lib/database.types';

const SERVICE_LABEL: Record<string, string> = {
  frete: 'Frete',
  guincho: 'Guincho',
  cacamba: 'Caçamba',
};

export const Escolher = ({ go, requestId }: { go: GoFn; requestId?: string | undefined }) => {
  const [request, setRequest] = useState<Tables<'service_requests'> | null>(null);
  const [quotes, setQuotes] = useState<QuoteWithProvider[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<QuoteWithProvider | null>(null);

  // O `setError(null)` fica DEPOIS do await de propósito: chamar setState
  // antes dele torna a carga um efeito síncrono, que dispara render em
  // cascata a cada montagem. Limpar o erro no sucesso dá o mesmo resultado
  // visível sem o custo.
  const load = useCallback(async () => {
    if (!requestId) return;
    try {
      const [{ data: req, error: reqErr }, list] = await withTimeout(
        Promise.all([
          supabase.from('service_requests').select('*').eq('id', requestId).maybeSingle(),
          listMyQuotesForRequest(requestId),
        ]),
      );
      if (reqErr) throw reqErr;
      setRequest(req);
      setQuotes(list);
      setError(null);
    } catch (e) {
      setError(loadErrorMessage(e));
      setQuotes([]);
    }
  }, [requestId]);

  useEffect(() => {
    // `load` é assíncrona: todo setState dela acontece DEPOIS do await, não
    // no corpo do efeito. A regra não modela a fronteira do await e marca a
    // chamada mesmo assim — mesma exceção já usada em hooks/useProfile.ts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Proposta nova chega sozinha. `quotes` está na publication desde a 0002 —
  // sem isto a tela dependeria de o usuário puxar para atualizar, e um
  // marketplace que só responde quando você recarrega parece morto.
  useEffect(() => {
    if (!requestId) return;
    const channel = supabase
      .channel(`request-quotes-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'pagora',
          table: 'quotes',
          filter: `request_id=eq.${requestId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [requestId, load]);

  async function accept(quote: QuoteWithProvider) {
    setAccepting(quote.id);
    setError(null);
    try {
      const order = await acceptQuote(quote.id);
      track('proposta_aceita', {
        quote_id: quote.id,
        request_id: requestId,
        valor_centavos: quote.price_cents,
      });
      setConfirm(null);
      go(`acompanhar/${order.id}`);
    } catch (e) {
      setError(loadErrorMessage(e));
      setConfirm(null);
      // A proposta pode ter sido retirada enquanto a tela estava aberta.
      // Recarregar deixa a lista honesta antes de o usuário tentar de novo.
      void load();
    } finally {
      setAccepting(null);
    }
  }

  if (!requestId) {
    return (
      <Screen label="Escolher proposta">
        <ScreenHead onBack={() => go('pedidos')} title="Propostas" />
        <Body>
          <Empty
            icon="list"
            title="Pedido não identificado"
            sub="Abra a partir da sua lista de pedidos para ver as propostas."
            action={
              <Button variant="outline" onClick={() => go('pedidos')}>
                Ver meus pedidos
              </Button>
            }
          />
        </Body>
      </Screen>
    );
  }

  const badges = quotes ? recommend(quotes.map(toQuoteLike)) : new Map<string, Badge>();
  const ordered = quotes ? orderForDisplay(quotes.map(withKey), badges) : [];

  return (
    <Screen label="Escolher proposta">
      <ScreenHead onBack={() => go('pedidos')} title="Propostas recebidas" sticky />

      <Body>
        {request && <PedidoResumo request={request} />}

        {error && <ErrorNote message={error} onRetry={() => void load()} />}

        {quotes === null ? (
          <Skeleton count={3} height={128} />
        ) : quotes.length === 0 ? (
          // Lista vazia POR ERRO não é a mesma coisa que lista vazia por
          // ainda não ter chegado proposta. Dizer "seu pedido está
          // circulando" quando a carga falhou é afirmar um fato que não foi
          // verificado — o ErrorNote acima já explicou o que houve.
          error ? null : (
            <Aguardando request={request} />
          )
        ) : (
          <>
            <div className="px-row px-row--between">
              <SectionTitle>
                {quotes.length === 1
                  ? '1 proposta recebida'
                  : `${quotes.length} propostas recebidas`}
              </SectionTitle>
              <span className="px-row" style={{ gap: 7 }}>
                <span className="px-live" aria-hidden="true" />
                <span className="px-eyebrow">ao vivo</span>
              </span>
            </div>

            <Stack>
              {ordered.map((q, i) => (
                <PropostaCard
                  key={q.id}
                  quote={q}
                  badge={badges.get(q.id)}
                  index={i}
                  busy={accepting === q.id}
                  onAccept={() => setConfirm(q)}
                />
              ))}
            </Stack>

            <p className="px-opt-s" style={{ marginTop: 0 }}>
              O valor da proposta aceita é o valor final. A Pagora não acrescenta taxa ao cliente.
            </p>
          </>
        )}
      </Body>

      <ConfirmarSheet
        quote={confirm}
        busy={accepting !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && void accept(confirm)}
      />
    </Screen>
  );
};

// ---------------------------------------------------------------------

function toQuoteLike(q: QuoteWithProvider) {
  return {
    id: q.id,
    priceCents: q.price_cents,
    etaMinutes: q.eta_minutes,
    rating: q.provider?.rating_avg ?? null,
  };
}

/**
 * A linha inteira do banco mais as chaves que `orderForDisplay` lê. O domínio
 * fala em `priceCents`; o PostgREST devolve `price_cents`. Traduzir aqui, na
 * borda, evita que o domínio conheça o nome das colunas.
 */
function withKey(q: QuoteWithProvider) {
  return { ...q, ...toQuoteLike(q) };
}

// =====================================================================
// CARD DE PROPOSTA
// =====================================================================
// O preço é o maior elemento do card. Foi o achado mais direto da auditoria:
// o número que decide a compra aparecia no mesmo corpo do texto auxiliar.
// =====================================================================

const PropostaCard = ({
  quote,
  badge,
  index,
  busy,
  onAccept,
}: {
  quote: QuoteWithProvider;
  badge?: Badge | undefined;
  index: number;
  busy: boolean;
  onAccept: () => void;
}) => {
  const eta = quote.eta_minutes;
  return (
    <Card
      tone={badge === 'value' ? 'action' : 'default'}
      className={cx('px-in', index < 4 && `px-in-${index + 1}`)}
    >
      {badge && (
        <div style={{ marginBottom: 12 }}>
          <Chip tone={badge === 'value' ? 'on' : 'default'}>{BADGE_LABEL[badge]}</Chip>
        </div>
      )}

      <div className="px-row px-row--between" style={{ alignItems: 'flex-end' }}>
        <Num
          value={formatCents(quote.price_cents)}
          unit={eta ? `chega em ${formatEta(eta)}` : 'prazo a combinar'}
          size="md"
        />
      </div>

      <hr className="px-divider" style={{ margin: '16px 0 14px' }} />

      <div className="px-row">
        <Avatar initials={initialsOf(quote.provider?.display_name)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="px-opt-t">{quote.provider?.display_name ?? 'Prestador'}</div>
          <div style={{ marginTop: 4 }}>
            <Rating value={quote.provider?.rating_avg} count={quote.provider?.rating_count} />
          </div>
        </div>
        <Chip tone="on" bare>
          <Icon name="shield" size={12} /> Verificado
        </Chip>
      </div>

      {quote.notes && (
        <p
          className="px-opt-s"
          style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--x-line)' }}
        >
          “{quote.notes}”
        </p>
      )}

      <Button
        variant={badge === 'value' ? 'primary' : 'outline'}
        size="lg"
        block
        busy={busy}
        busyLabel="Fechando…"
        style={{ marginTop: 16 }}
        onClick={onAccept}
      >
        Contratar por {formatCents(quote.price_cents)}
      </Button>
    </Card>
  );
};

function formatEta(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

// =====================================================================
// ESPERA
// =====================================================================

const Aguardando = ({ request }: { request: Tables<'service_requests'> | null }) => (
  <Card className="px-scan">
    <div className="px-row" style={{ gap: 10, marginBottom: 14 }}>
      <span className="px-live" aria-hidden="true" />
      <span className="px-eyebrow" style={{ color: 'var(--x-action)' }}>
        Procurando transportador
      </span>
    </div>

    <div
      style={{
        fontFamily: 'var(--x-display)',
        fontWeight: 700,
        fontSize: 21,
        letterSpacing: '-0.025em',
        lineHeight: 1.15,
      }}
    >
      Seu pedido está circulando.
    </div>

    <p className="px-sub" style={{ marginTop: 10 }}>
      As propostas aparecem aqui sozinhas, sem precisar atualizar. Costumam chegar em até 2 horas —
      normalmente bem antes.
    </p>

    {request?.estimate_low_cents != null && (
      <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--x-line)' }}>
        <KV
          k="Estimativa do Pagora"
          v={`${formatCents(request.estimate_low_cents)} a ${formatCents(
            request.estimate_high_cents ?? request.estimate_low_cents,
          )}`}
        />
      </div>
    )}
  </Card>
);

// =====================================================================
// RESUMO DO PEDIDO
// =====================================================================

const PedidoResumo = ({ request }: { request: Tables<'service_requests'> }) => {
  const p = (request.payload ?? {}) as PagoraState;
  const isCacamba = request.service === 'cacamba';
  const isGuincho = request.service === 'guincho';

  return (
    <Card tone="flat" style={{ padding: 0 }}>
      <div className="px-row px-row--between" style={{ marginBottom: 12 }}>
        <span className="px-eyebrow">
          {SERVICE_LABEL[request.service] ?? request.service} · #{request.id.slice(0, 8)}
        </span>
        {p.urgency === 'now' && <Chip tone="urgent">Hoje</Chip>}
      </div>

      {isCacamba ? (
        <div className="px-opt-t">
          Caçamba de {p.size ?? '—'} m³ · {p.address ?? 'endereço não informado'}
        </div>
      ) : isGuincho ? (
        <RouteLine
          origin={p.currentLoc}
          dest={p.destAddr}
          originLabel="Veículo está em"
          destLabel="Levar para"
        />
      ) : (
        <RouteLine origin={p.origin} dest={p.dest} />
      )}
    </Card>
  );
};

// =====================================================================
// CONFIRMAÇÃO
// =====================================================================
// Contratar é irreversível do lado do cliente: cria a order, congela o preço
// e recusa as outras propostas. Um toque só seria rápido demais para uma
// decisão de centenas de reais — a folha custa meio segundo e evita o
// arrependimento que vira disputa.
// =====================================================================

const ConfirmarSheet = ({
  quote,
  busy,
  onClose,
  onConfirm,
}: {
  quote: QuoteWithProvider | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <Sheet open={quote !== null} onClose={onClose} title="Confirmar contratação">
    {quote && (
      <>
        <div>
          <Num value={formatCents(quote.price_cents)} unit="valor final, sem taxa ao cliente" />
        </div>

        <div>
          <KV k="Prestador" v={quote.provider?.display_name ?? 'Prestador'} />
          <KV
            k="Chegada estimada"
            v={quote.eta_minutes ? formatEta(quote.eta_minutes) : 'a combinar'}
          />
        </div>

        <p className="px-opt-s" style={{ marginTop: 0 }}>
          Ao contratar, as outras propostas deste pedido são recusadas e o valor fica travado.
        </p>

        <Button
          variant="primary"
          size="lg"
          block
          busy={busy}
          busyLabel="Fechando…"
          onClick={onConfirm}
        >
          Contratar
        </Button>
        <Button variant="quiet" block onClick={onClose} disabled={busy}>
          Voltar
        </Button>
      </>
    )}
  </Sheet>
);
