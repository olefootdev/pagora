// =====================================================================
// PAGORA — Admin · Operação financeira
// =====================================================================
// Uma tela administrativa só serve para uma coisa: responder "onde está o
// dinheiro deste pedido?". Tudo aqui gira em torno disso.
//
// Três abas, na ordem em que o operador precisa delas:
//   Aprovações — prestador não aprovado não recebe pedido nem saca
//   Trilha     — pedido → pagamento → webhook → ledger → saque
//   Saúde      — webhooks que falharam e saldos que não fecham com o ledger
// =====================================================================
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../icons';
import { StatusBar, TopBar } from '../core';
import { supabase } from '../lib/supabase';
import { formatCents } from '../domains/money';
import { ORDER_STATUS_LABELS } from '../domains/orders/order.status';
import type { OrderStatus, Tables } from '../lib/database.types';
import type { GoFn } from '../types';

type Tab = 'aprovacoes' | 'trilha' | 'saude';

export const AdminFinanceiro = ({ go }: { go: GoFn }) => {
  const [tab, setTab] = useState<Tab>('aprovacoes');

  return (
    <div className="pg-screen" data-screen-label="P3 Admin · Financeiro">
      <StatusBar />
      <TopBar onBack={() => go('admin-dash')} title="Operação financeira" />
      <div className="pg-viewport">
        <div className="pg-row" style={{ gap: 6, padding: '14px 20px 0' }}>
          {(
            [
              ['aprovacoes', 'Aprovações'],
              ['trilha', 'Trilha'],
              ['saude', 'Saúde'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={`pg-btn pg-btn--sm ${tab === id ? 'pg-btn--accent' : 'pg-btn--ghost'}`}
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: '18px 20px 32px', display: 'grid', gap: 16 }}>
          {tab === 'aprovacoes' && <Approvals />}
          {tab === 'trilha' && <Trail />}
          {tab === 'saude' && <Health />}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
function Approvals() {
  const [pending, setPending] = useState<Tables<'providers'>[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // O try/catch não é cerimônia: numa falha de rede o supabase-js REJEITA
      // (não devolve `{ error }`), e sem isto a tela ficava presa em
      // "Carregando…" para sempre. Encontrado rodando o app com o backend fora
      // de alcance.
      try {
        const { data, error } = await supabase
          .from('providers')
          .select('*')
          .is('approved_at', null)
          .is('rejected_at', null)
          .order('created_at', { ascending: true });
        if (error) throw new Error(error.message);
        if (cancelled) return;
        setPending(data ?? []);
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
  }, [reloadToken]);

  async function decide(providerId: string, approve: boolean) {
    setBusy(providerId);
    setError(null);
    // `approve_provider` também cria a carteira. Aprovar por UPDATE direto na
    // tabela não funcionaria: a 0006 revogou essa escrita justamente para que
    // a aprovação e a criação da carteira não pudessem se separar.
    const { error } = await supabase.rpc('approve_provider', {
      p_provider_id: providerId,
      p_approve: approve,
      p_reason: approve ? null : 'Reprovado pela análise',
    });
    if (error) setError(traduzir(error.message));
    else reload();
    setBusy(null);
  }

  if (loading) return <Muted>Carregando cadastros…</Muted>;
  if (error) return <Muted>{error}</Muted>;
  if (pending.length === 0) return <Muted>Nenhum cadastro aguardando análise.</Muted>;

  return (
    <>
      {pending.map((p) => (
        <div
          key={p.profile_id}
          className="pg-card pg-card--padded"
          style={{ display: 'grid', gap: 10 }}
        >
          <div>
            <strong style={{ fontSize: 15 }}>{p.display_name}</strong>
            <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 2 }}>
              {(p.services ?? []).join(' · ')}
              {p.vehicle_type ? ` · ${p.vehicle_type}` : ''}
              {p.vehicle_plate ? ` · ${p.vehicle_plate}` : ''}
            </div>
          </div>
          <div className="pg-row" style={{ gap: 8 }}>
            <button
              className="pg-btn pg-btn--accent pg-btn--sm"
              style={{ flex: 1 }}
              disabled={busy !== null}
              onClick={() => void decide(p.profile_id, true)}
            >
              {busy === p.profile_id ? '…' : 'Aprovar'}
            </button>
            <button
              className="pg-btn pg-btn--ghost pg-btn--sm"
              style={{ flex: 1 }}
              disabled={busy !== null}
              onClick={() => void decide(p.profile_id, false)}
            >
              Reprovar
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------
type TrailData = {
  order?: {
    id: string;
    status: OrderStatus;
    price_cents: number;
    platform_fee_cents: number;
    provider_amount_cents: number;
    gateway_fee_cents: number;
  };
  client?: { name: string | null; phone: string | null };
  provider?: { name: string | null };
  payments?: {
    status: string;
    amount_cents: number;
    gateway_payment_id: string | null;
    paid_at: string | null;
  }[];
  webhooks?: {
    event_type: string;
    received_at: string;
    processed_at: string | null;
    error: string | null;
  }[];
  ledger?: { kind: string; bucket: string; amount_cents: number; created_at: string }[];
  wallet?: { balance_cents: number; pending_cents: number };
  dispute?: { status: string } | null;
};

function Trail() {
  const [orderId, setOrderId] = useState('');
  const [data, setData] = useState<TrailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function search() {
    setBusy(true);
    setError(null);
    setData(null);
    const { data: result, error } = await supabase.rpc('order_financial_trail', {
      p_order_id: orderId.trim(),
    });
    if (error) setError(traduzir(error.message));
    else setData(result as TrailData);
    setBusy(false);
  }

  return (
    <>
      <div className="pg-card pg-card--padded" style={{ display: 'grid', gap: 10 }}>
        <div className="pg-h-eyebrow" style={{ margin: 0 }}>
          ONDE ESTÁ O DINHEIRO DESTE PEDIDO?
        </div>
        <input
          placeholder="UUID do pedido"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 10,
            border: '1px solid var(--ink-200, rgba(0,0,0,0.12))',
            fontSize: 14,
            width: '100%',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        />
        <button
          className="pg-btn pg-btn--accent"
          disabled={!orderId.trim() || busy}
          onClick={() => void search()}
        >
          {busy ? 'Buscando…' : 'Rastrear'}
        </button>
        {error && <Muted>{error}</Muted>}
      </div>

      {data?.order && (
        <>
          <div className="pg-card pg-card--padded">
            <div className="pg-h-eyebrow">PEDIDO</div>
            <Row
              label="Situação"
              value={ORDER_STATUS_LABELS[data.order.status] ?? data.order.status}
            />
            <Row label="Cliente" value={data.client?.name ?? '—'} />
            <Row label="Prestador" value={data.provider?.name ?? '—'} />
            <Row label="Valor bruto" value={formatCents(data.order.price_cents)} mono />
            <Row label="Comissão PAGORA" value={formatCents(data.order.platform_fee_cents)} mono />
            <Row label="Taxa do gateway" value={formatCents(data.order.gateway_fee_cents)} mono />
            <Row
              label="Valor do prestador"
              value={formatCents(data.order.provider_amount_cents)}
              mono
            />
          </div>

          <Section title="PAGAMENTOS" empty="Nenhuma cobrança emitida.">
            {(data.payments ?? []).map((p, i) => (
              <Row
                key={i}
                label={`${p.status}${p.paid_at ? ` · ${formatDate(p.paid_at)}` : ''}`}
                value={formatCents(p.amount_cents)}
                mono
              />
            ))}
          </Section>

          <Section title="WEBHOOKS" empty="Nenhum evento recebido.">
            {(data.webhooks ?? []).map((w, i) => (
              <Row
                key={i}
                label={`${w.event_type} · ${formatDate(w.received_at)}`}
                value={w.error ? 'falhou' : w.processed_at ? 'aplicado' : 'pendente'}
              />
            ))}
          </Section>

          <Section title="LEDGER" empty="Nenhum lançamento.">
            {(data.ledger ?? []).map((l, i) => (
              <Row
                key={i}
                label={`${l.kind}${l.bucket === 'pending' ? ' · retido' : ''}`}
                value={`${l.amount_cents >= 0 ? '+' : '−'}${formatCents(Math.abs(l.amount_cents))}`}
                mono
              />
            ))}
          </Section>

          {data.wallet && (
            <div className="pg-card pg-card--padded">
              <div className="pg-h-eyebrow">CARTEIRA DO PRESTADOR</div>
              <Row label="Disponível" value={formatCents(data.wallet.balance_cents)} mono />
              <Row label="Retido" value={formatCents(data.wallet.pending_cents)} mono />
            </div>
          )}

          {data.dispute && (
            <div className="pg-card pg-card--padded">
              <div className="pg-h-eyebrow">DISPUTA</div>
              <Row label="Situação" value={data.dispute.status} />
            </div>
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
function Health() {
  const [audit, setAudit] = useState<
    { provider_id: string; bucket: string; wallet_cents: number; ledger_cents: number }[] | null
  >(null);
  const [failed, setFailed] = useState<Tables<'payment_events'>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [a, f] = await Promise.all([
          supabase.rpc('audit_wallet_integrity'),
          supabase
            .from('payment_events')
            .select('*')
            .is('processed_at', null)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);
        if (a.error) throw new Error(a.error.message);
        setAudit(a.data ?? []);
        setFailed(f.data ?? []);
      } catch (e) {
        // Mesmo motivo do Approvals: falha de rede rejeita em vez de devolver
        // `{ error }`, e a tela ficava em "Conferindo…" indefinidamente.
        setError(traduzir((e as Error).message));
        setAudit([]);
        setFailed([]);
      }
    })();
  }, []);

  if (error) return <Muted>{error}</Muted>;

  return (
    <>
      <div className="pg-card pg-card--padded">
        <div className="pg-h-eyebrow">SALDO x LEDGER</div>
        {audit === null ? (
          <Muted>Conferindo…</Muted>
        ) : audit.length === 0 ? (
          <div className="pg-row" style={{ gap: 8, marginTop: 8 }}>
            <Icon name="check-circle" size={18} />
            <span style={{ fontSize: 14 }}>Todos os saldos fecham com o ledger.</span>
          </div>
        ) : (
          // Cada linha aqui é dinheiro que existe no saldo mas não tem lastro
          // contábil (ou o contrário). Nunca deveria acontecer.
          audit.map((row, i) => (
            <Row
              key={i}
              label={`${row.provider_id.slice(0, 8)}… · ${row.bucket}`}
              value={`carteira ${formatCents(row.wallet_cents)} · ledger ${formatCents(row.ledger_cents)}`}
              mono
            />
          ))
        )}
      </div>

      <div className="pg-card pg-card--padded">
        <div className="pg-h-eyebrow">WEBHOOKS NÃO APLICADOS</div>
        {failed === null ? (
          <Muted>Carregando…</Muted>
        ) : failed.length === 0 ? (
          <div className="pg-row" style={{ gap: 8, marginTop: 8 }}>
            <Icon name="check-circle" size={18} />
            <span style={{ fontSize: 14 }}>Nenhum evento pendente.</span>
          </div>
        ) : (
          failed.map((e) => (
            <Row
              key={e.id}
              label={`${e.event_type} · ${formatDate(e.created_at)}`}
              value={e.process_error ?? 'pendente'}
            />
          ))
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------
function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="pg-card pg-card--padded">
      <div className="pg-h-eyebrow">{title}</div>
      {hasChildren ? children : <Muted>{empty}</Muted>}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      className="pg-row pg-row--between"
      style={{ padding: '9px 0', gap: 12, borderTop: '1px solid var(--ink-100)' }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>{label}</span>
      <span className={mono ? 'pg-mono' : undefined} style={{ fontSize: 13, textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 13, color: 'var(--text-mute)', margin: '8px 0 0', lineHeight: 1.5 }}>
      {children}
    </p>
  );
}

function traduzir(message: string): string {
  if (message.includes('admin only')) return 'Esta área é restrita a administradores.';
  if (message.includes('order_not_found')) return 'Pedido não encontrado.';
  if (message.includes('provider_not_found')) return 'Prestador não encontrado.';
  // "Failed to fetch" é o que o browser diz quando não alcançou o servidor:
  // DNS, offline, CORS. Nenhuma dessas três é acionável pelo operador com
  // esse nome — o que ele precisa saber é que não chegou lá.
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.';
  }
  if (message.includes('permission denied')) {
    return 'Seu usuário não tem permissão para esta consulta.';
  }
  return message;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
