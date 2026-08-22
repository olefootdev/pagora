// =====================================================================
// PAGORA — Oportunidades do prestador
// =====================================================================
// A ponta que faltava. Sem esta tela, um pedido publicado pelo cliente não
// tinha como receber proposta, e o loop nunca fechava.
//
// A lista NÃO filtra por serviço no client: a policy `requests_select` da 0002
// já restringe ao que o prestador atende e ao que está aberto. Repetir o
// filtro aqui daria a impressão de que ele é a proteção — e alguém acabaria
// removendo "porque é redundante".
// =====================================================================
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../icons';
import { StatusBar, TopBar } from '../core';
import { formatCents } from '../domains/money';
import { PLATFORM_FEE_PERCENT, splitFees } from '../domains/money';
import { listMyQuotes, listOpenRequests, sendQuote } from '../domains/orders/request.service';
import { parseAmountToCents } from './provider-financeiro';
import { useSession } from '../hooks/useSession';
import { track } from '../lib/analytics';
import type { ServiceType, Tables } from '../lib/database.types';
import type { GoFn, PagoraState } from '../types';

const SERVICE_LABEL: Record<ServiceType, { label: string; icon: string }> = {
  frete: { label: 'Frete', icon: 'truck' },
  guincho: { label: 'Guincho', icon: 'tow' },
  cacamba: { label: 'Caçamba', icon: 'dumpster' },
};

export const Oportunidades = ({ go }: { go: GoFn }) => {
  const { user, loading: sessionLoading } = useSession();
  const [requests, setRequests] = useState<Tables<'service_requests'>[]>([]);
  const [myQuotes, setMyQuotes] = useState<Map<string, Tables<'quotes'>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    if (sessionLoading || !user) return;
    let cancelled = false;

    void (async () => {
      try {
        const [open, mine] = await Promise.all([listOpenRequests(), listMyQuotes(user.id)]);
        if (cancelled) return;
        setRequests(open);
        setMyQuotes(mine);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(traduzir((e as Error).message));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionLoading, user, reloadToken]);

  return (
    <div className="pg-screen" data-screen-label="P5 Prestador · Oportunidades">
      <StatusBar />
      <TopBar onBack={() => go('provider-dash')} title="Oportunidades" />
      <div className="pg-viewport">
        <div style={{ padding: '18px 20px 32px', display: 'grid', gap: 14 }}>
          {!sessionLoading && !user && (
            <Empty
              title="Entre para ver oportunidades"
              body="Só prestadores aprovados recebem pedidos."
              action={{ label: 'Entrar', onClick: () => go('login') }}
            />
          )}

          {user && loading && <Empty title="Carregando…" body="Buscando pedidos abertos." />}

          {user && !loading && error && <Empty title="Não deu certo" body={error} />}

          {user && !loading && !error && requests.length === 0 && (
            <Empty
              title="Nenhum pedido aberto agora"
              body="Assim que um cliente publicar um pedido do tipo que você atende, ele aparece aqui."
            />
          )}

          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              existingQuote={myQuotes.get(request.id)}
              providerId={user?.id ?? ''}
              onSent={reload}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
function RequestCard({
  request,
  existingQuote,
  providerId,
  onSent,
}: {
  request: Tables<'service_requests'>;
  existingQuote: Tables<'quotes'> | undefined;
  providerId: string;
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = SERVICE_LABEL[request.service];
  const payload = (request.payload ?? {}) as PagoraState;

  return (
    <div className="pg-card pg-card--padded" style={{ display: 'grid', gap: 12 }}>
      <div className="pg-row pg-row--between" style={{ gap: 10 }}>
        <div className="pg-row" style={{ gap: 8 }}>
          <span className="pg-tag" style={{ background: 'var(--ink-100)' }}>
            <Icon name={meta.icon} size={14} /> {meta.label}
          </span>
          {existingQuote && (
            <span className="pg-tag pg-tag--green">
              Proposta enviada · {formatCents(existingQuote.price_cents)}
            </span>
          )}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-mute)' }}>
          {timeAgo(request.created_at)}
        </span>
      </div>

      <RequestDetails service={request.service} payload={payload} request={request} />

      {request.estimate_low_cents !== null && request.estimate_high_cents !== null && (
        <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>
          Estimativa do cliente: {formatCents(request.estimate_low_cents)} –{' '}
          {formatCents(request.estimate_high_cents)}
        </div>
      )}

      {open ? (
        <QuoteForm
          requestId={request.id}
          providerId={providerId}
          existing={existingQuote}
          onCancel={() => setOpen(false)}
          onSent={() => {
            setOpen(false);
            onSent();
          }}
        />
      ) : (
        <button className="pg-btn pg-btn--accent pg-btn--sm" onClick={() => setOpen(true)}>
          {existingQuote ? 'Alterar minha proposta' : 'Enviar proposta'}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
function RequestDetails({
  service,
  payload,
  request,
}: {
  service: ServiceType;
  payload: PagoraState;
  request: Tables<'service_requests'>;
}) {
  const rows: [string, string][] = [];

  if (service === 'frete') {
    if (payload.origin) rows.push(['Origem', payload.origin]);
    if (payload.dest) rows.push(['Destino', payload.dest]);
    if (payload.vehicle) rows.push(['Veículo', payload.vehicle]);
    if (payload.helpers) rows.push(['Ajudantes', String(payload.helpers)]);
    if (payload.distance) rows.push(['Distância', `${payload.distance} km`]);
  } else if (service === 'guincho') {
    if (payload.location ?? payload.currentLoc)
      rows.push(['Local', (payload.location ?? payload.currentLoc) as string]);
    if (payload.destAddr) rows.push(['Destino', payload.destAddr]);
    if (payload.problem) rows.push(['Problema', payload.problem]);
    if (payload.vehicleType) rows.push(['Veículo', payload.vehicleType]);
  } else {
    if (payload.address) rows.push(['Endereço', payload.address]);
    if (payload.size) rows.push(['Tamanho', payload.size]);
    if (payload.material) rows.push(['Material', payload.material]);
    if (payload.duration) rows.push(['Permanência', payload.duration]);
  }

  if (request.scheduled_for) {
    rows.push(['Quando', new Date(request.scheduled_for).toLocaleString('pt-BR')]);
  }
  if (payload.notes) rows.push(['Observações', payload.notes]);

  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {rows.map(([label, value]) => (
        <div key={label} className="pg-row pg-row--between" style={{ gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-mute)' }}>{label}</span>
          <span style={{ fontSize: 13, textAlign: 'right' }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------
function QuoteForm({
  requestId,
  providerId,
  existing,
  onCancel,
  onSent,
}: {
  requestId: string;
  providerId: string;
  existing: Tables<'quotes'> | undefined;
  onCancel: () => void;
  onSent: () => void;
}) {
  const [price, setPrice] = useState(
    existing ? (existing.price_cents / 100).toFixed(2).replace('.', ',') : '',
  );
  const [eta, setEta] = useState(existing?.eta_minutes ? String(existing.eta_minutes) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cents = parseAmountToCents(price);
  const canSend = cents !== null && cents > 0 && !busy;

  // O prestador precisa ver o líquido ANTES de enviar. Descobrir a comissão só
  // no extrato, depois do serviço feito, é a origem clássica de disputa em
  // marketplace.
  const split = cents && cents > 0 ? splitFees(cents) : null;

  async function submit() {
    if (cents === null) return;
    setBusy(true);
    setError(null);
    try {
      await sendQuote({
        requestId,
        providerId,
        priceCents: cents,
        etaMinutes: eta ? Number(eta) : undefined,
        notes: notes.trim() || undefined,
      });
      track('proposta_enviada', { request_id: requestId, valor: cents / 100 });
      onSent();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10, paddingTop: 4 }}>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>Seu preço (R$)</span>
        <input
          className="pg-input"
          inputMode="decimal"
          placeholder="250,00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </label>

      {split && (
        <div
          className="pg-row pg-row--between"
          style={{ padding: 12, borderRadius: 10, background: 'var(--ink-100)', gap: 12 }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-mute)' }}>
            Comissão PAGORA {PLATFORM_FEE_PERCENT}%
          </span>
          <span style={{ fontSize: 13 }}>
            Você recebe{' '}
            <strong className="pg-mono">{formatCents(split.providerAmountCents)}</strong>
          </span>
        </div>
      )}

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>
          Em quanto tempo você chega? (minutos, opcional)
        </span>
        <input
          className="pg-input"
          inputMode="numeric"
          placeholder="45"
          value={eta}
          onChange={(e) => setEta(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>Mensagem (opcional)</span>
        <textarea
          className="pg-textarea"
          placeholder="O que está incluído, condições, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 400))}
        />
      </label>

      {error && (
        <span role="alert" className="pg-helper is-error">
          {error}
        </span>
      )}

      <div className="pg-row" style={{ gap: 8 }}>
        <button className="pg-btn pg-btn--ghost pg-btn--sm" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button
          className="pg-btn pg-btn--accent pg-btn--sm"
          style={{ flex: 1 }}
          disabled={!canSend}
          onClick={() => void submit()}
        >
          {busy ? 'Enviando…' : existing ? 'Atualizar proposta' : 'Enviar proposta'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
function Empty({
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

export function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

function traduzir(message: string): string {
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Não foi possível falar com o servidor. Verifique a conexão.';
  }
  if (message.includes('permission denied')) {
    return 'Seu cadastro de prestador precisa estar aprovado para ver pedidos.';
  }
  return message;
}
