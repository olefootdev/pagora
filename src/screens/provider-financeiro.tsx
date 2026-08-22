// =====================================================================
// PAGORA — Financeiro do prestador
// =====================================================================
// Primeira tela do app que mostra dinheiro real. Três coisas que ela precisa
// deixar óbvias, e que o painel mock não deixava:
//
//  1. RETIDO e DISPONÍVEL são valores diferentes. Um serviço pago mas não
//     confirmado pelo cliente aparece em "a liberar", não em "disponível".
//  2. O saque sai do disponível, e o botão fica desabilitado quando não há.
//  3. Sem subconta no gateway não há repasse — e isso precisa ser um aviso
//     acionável, não um erro na hora do saque.
// =====================================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';
import { StatusBar, TopBar } from '../core';
import { formatCents } from '../domains/money';
import {
  enableGatewayPayouts,
  getLedger,
  getWallet,
  getWithdrawals,
  requestWithdrawal,
  type WalletSummary,
} from '../domains/wallets/wallet.service';
import { FunctionError, newIdempotencyKey } from '../lib/functions';
import { useSession } from '../hooks/useSession';
import type { Tables, WalletTxKind } from '../lib/database.types';
import type { GoFn } from '../types';

const TX_LABEL: Record<WalletTxKind, string> = {
  order_hold: 'Serviço recebido',
  platform_fee: 'Comissão PAGORA',
  order_release: 'Liberado para saque',
  order_credit: 'Crédito de serviço',
  withdrawal: 'Saque solicitado',
  withdrawal_reversal: 'Saque devolvido',
  dispute_refund: 'Estorno por disputa',
  chargeback: 'Contestação',
  bonus: 'Bônus',
  adjustment: 'Ajuste',
};

export const ProviderFinanceiro = ({ go }: { go: GoFn }) => {
  const { user, loading: sessionLoading } = useSession();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [ledger, setLedger] = useState<Tables<'wallet_transactions'>[]>([]);
  const [withdrawals, setWithdrawals] = useState<Tables<'withdrawals'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reloadToken, setReloadToken] = useState(0);
  /** Handler de evento: pode mexer em estado à vontade. */
  const refresh = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    if (sessionLoading || !user) return;
    let cancelled = false;

    void (async () => {
      try {
        const [w, l, wd] = await Promise.all([
          getWallet(user.id),
          getLedger(user.id),
          getWithdrawals(user.id),
        ]);
        if (cancelled) return;
        setWallet(w);
        setLedger(l);
        setWithdrawals(wd);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(traduzirErro((e as Error).message));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionLoading, user, reloadToken]);

  if (!sessionLoading && !user) {
    return (
      <Shell go={go}>
        <Empty
          title="Entre para ver seus ganhos"
          body="Você precisa estar logado como prestador."
          action={{ label: 'Entrar', onClick: () => go('login') }}
        />
      </Shell>
    );
  }

  if (loading && !wallet) {
    return (
      <Shell go={go}>
        <Empty title="Carregando…" body="Buscando seu saldo." />
      </Shell>
    );
  }

  if (!wallet) {
    return (
      <Shell go={go}>
        <Empty
          title="Carteira não encontrada"
          body={
            error ??
            'Sua carteira é criada quando seu cadastro de prestador é aprovado. Se já foi aprovado, fale com o suporte.'
          }
        />
      </Shell>
    );
  }

  return (
    <Shell go={go}>
      <div style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <BalanceCard wallet={wallet} />

        {!wallet.gatewayReady && <GatewayOnboarding onDone={refresh} />}

        {wallet.status !== 'active' && (
          <Notice
            icon="alert"
            text="Sua carteira está bloqueada. Saques estão suspensos até o suporte revisar."
          />
        )}

        <WithdrawSection wallet={wallet} onDone={refresh} />

        {withdrawals.length > 0 && <WithdrawalHistory items={withdrawals} />}

        <LedgerList items={ledger} />
      </div>
    </Shell>
  );
};

// ---------------------------------------------------------------------
function BalanceCard({ wallet }: { wallet: WalletSummary }) {
  return (
    <div className="pg-card pg-card--dark" style={{ padding: 22 }}>
      <div className="pg-h-eyebrow" style={{ color: 'var(--green-500)', margin: 0 }}>
        DISPONÍVEL PARA SAQUE
      </div>
      <div
        className="pg-mono"
        style={{
          fontSize: 40,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          marginTop: 6,
          lineHeight: 1,
        }}
      >
        {formatCents(wallet.availableCents)}
      </div>

      <div
        className="pg-row pg-row--between"
        style={{
          marginTop: 18,
          paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.12)',
          gap: 16,
        }}
      >
        <Stat
          label="A LIBERAR"
          value={formatCents(wallet.pendingCents)}
          hint="Serviços pagos aguardando a confirmação do cliente"
        />
        <Stat label="JÁ RECEBIDO" value={formatCents(wallet.totalReceivedCents)} />
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)' }}>
        {label}
      </div>
      <div className="pg-mono" style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>
        {value}
      </div>
      {hint && (
        <div
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, lineHeight: 1.4 }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
function GatewayOnboarding({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      await enableGatewayPayouts();
      onDone();
    } catch (e) {
      setError(e instanceof FunctionError ? e.message : 'Não foi possível habilitar recebimentos.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pg-card pg-card--padded" style={{ display: 'grid', gap: 10 }}>
      <div className="pg-row" style={{ gap: 8 }}>
        <Icon name="alert" size={18} />
        <strong style={{ fontSize: 14 }}>Habilite seus recebimentos</strong>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-mute)', margin: 0, lineHeight: 1.5 }}>
        Sem a conta de recebimento, o valor dos seus serviços fica retido com a PAGORA até você
        habilitar. Leva menos de um minuto e usa os dados que você já cadastrou.
      </p>
      {error && <span style={{ fontSize: 13, color: 'var(--red-500, #e5484d)' }}>{error}</span>}
      <button className="pg-btn pg-btn--accent" disabled={busy} onClick={() => void enable()}>
        {busy ? 'Habilitando…' : 'Habilitar recebimentos'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------
function WithdrawSection({ wallet, onDone }: { wallet: WalletSummary; onDone: () => void }) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // A chave de idempotência é criada UMA vez por intenção de saque e reusada
  // em qualquer nova tentativa. Gerar uma nova a cada clique anularia a
  // proteção: seriam duas intenções distintas aos olhos do servidor.
  const idempotencyKey = useRef(newIdempotencyKey());

  const cents = parseAmountToCents(amount);
  const canWithdraw =
    wallet.status === 'active' && wallet.availableCents > 0 && cents !== null && cents > 0;

  async function submit() {
    if (cents === null) return;
    setBusy(true);
    setError(null);
    try {
      await requestWithdrawal({ amountCents: cents, idempotencyKey: idempotencyKey.current });
      setDone(true);
      setAmount('');
      idempotencyKey.current = newIdempotencyKey(); // próxima intenção, chave nova
      onDone();
    } catch (e) {
      setError(e instanceof FunctionError ? e.message : 'Não foi possível solicitar o saque.');
    } finally {
      setBusy(false);
    }
  }

  if (wallet.availableCents === 0) {
    return (
      <Notice
        icon="info"
        text={
          wallet.pendingCents > 0
            ? `Você tem ${formatCents(wallet.pendingCents)} aguardando a confirmação dos clientes. Assim que confirmarem, o valor fica disponível para saque.`
            : 'Você ainda não tem saldo disponível para saque.'
        }
      />
    );
  }

  return (
    <div className="pg-card pg-card--padded" style={{ display: 'grid', gap: 12 }}>
      <div className="pg-h-eyebrow" style={{ margin: 0 }}>
        SACAR VIA PIX
      </div>

      {done && (
        <Notice icon="check-circle" text="Saque solicitado. A confirmação chega em instantes." />
      )}

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>
          Quanto quer sacar? (máx. {formatCents(wallet.availableCents)})
        </span>
        <input
          className="pg-input"
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setDone(false);
          }}
          style={{
            padding: 12,
            borderRadius: 10,
            border: '1px solid var(--ink-200, rgba(0,0,0,0.12))',
            fontSize: 16,
            width: '100%',
          }}
        />
      </label>

      {cents !== null && cents > wallet.availableCents && (
        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>
          Valor acima do disponível. O servidor recusaria de qualquer forma.
        </span>
      )}
      {error && <span style={{ fontSize: 13 }}>{error}</span>}

      <div className="pg-row" style={{ gap: 8 }}>
        <button
          className="pg-btn pg-btn--ghost pg-btn--sm"
          onClick={() => setAmount(centsToInput(wallet.availableCents))}
        >
          Sacar tudo
        </button>
        <button
          className="pg-btn pg-btn--accent"
          style={{ flex: 1 }}
          disabled={!canWithdraw || busy || (cents ?? 0) > wallet.availableCents}
          onClick={() => void submit()}
        >
          {busy ? 'Enviando…' : 'Solicitar saque'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
function WithdrawalHistory({ items }: { items: Tables<'withdrawals'>[] }) {
  const LABEL: Record<string, string> = {
    requested: 'Solicitado',
    processing: 'Processando',
    paid: 'Pago',
    failed: 'Falhou',
    cancelled: 'Cancelado',
  };
  return (
    <div className="pg-card pg-card--padded">
      <div className="pg-h-eyebrow">SEUS SAQUES</div>
      <div style={{ display: 'grid', gap: 2, marginTop: 8 }}>
        {items.slice(0, 5).map((w) => (
          <div key={w.id} className="pg-row pg-row--between" style={{ padding: '10px 0' }}>
            <div>
              <div style={{ fontSize: 14 }}>{LABEL[w.status] ?? w.status}</div>
              <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>
                {formatDate(w.requested_at)}
                {w.failure_reason ? ` · ${w.failure_reason}` : ''}
              </div>
            </div>
            <span className="pg-mono" style={{ fontSize: 14 }}>
              {formatCents(w.amount_cents)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
function LedgerList({ items }: { items: Tables<'wallet_transactions'>[] }) {
  if (items.length === 0) {
    return <Notice icon="info" text="Seu extrato aparece aqui depois do primeiro serviço pago." />;
  }
  return (
    <div className="pg-card pg-card--padded">
      <div className="pg-h-eyebrow">EXTRATO</div>
      <div style={{ display: 'grid', marginTop: 8 }}>
        {items.map((tx) => (
          <div
            key={tx.id}
            className="pg-row pg-row--between"
            style={{ padding: '11px 0', borderTop: '1px solid var(--ink-100)' }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>{TX_LABEL[tx.kind] ?? tx.kind}</div>
              <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>
                {formatDate(tx.created_at)}
                {tx.bucket === 'pending' ? ' · retido' : ''}
              </div>
            </div>
            <span
              className="pg-mono"
              style={{
                fontSize: 14,
                whiteSpace: 'nowrap',
                color: tx.amount_cents >= 0 ? 'var(--green-600, #0a7d54)' : 'var(--text)',
              }}
            >
              {tx.amount_cents >= 0 ? '+' : '−'}
              {formatCents(Math.abs(tx.amount_cents))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
function Shell({ go, children }: { go: GoFn; children: React.ReactNode }) {
  return (
    <div className="pg-screen" data-screen-label="P2 Prestador · Financeiro">
      <StatusBar />
      <TopBar onBack={() => go('provider-dash')} title="Meus ganhos" />
      <div className="pg-viewport">{children}</div>
    </div>
  );
}

function Notice({ icon, text }: { icon: string; text: string }) {
  return (
    <div
      className="pg-row"
      style={{
        gap: 10,
        padding: 14,
        borderRadius: 12,
        background: 'var(--ink-100)',
        alignItems: 'flex-start',
      }}
    >
      <Icon name={icon} size={18} />
      <span style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

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
    <div style={{ padding: '56px 28px', textAlign: 'center', display: 'grid', gap: 10 }}>
      <h2 style={{ fontSize: 20, margin: 0 }}>{title}</h2>
      <p style={{ color: 'var(--text-mute)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>{body}</p>
      {action && (
        <button
          className="pg-btn pg-btn--accent"
          style={{ marginTop: 8, justifySelf: 'center' }}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * "1.234,56", "1234.56" ou "1.500" → centavos. `null` quando não dá para ler.
 *
 * O ponto é ambíguo em português: em "1.500" é separador de milhar (mil e
 * quinhentos), em "10.50" é decimal. Errar aqui muda o valor por um fator de
 * mil, então a regra é explícita em vez de heurística vaga:
 *
 *   • tem vírgula → ponto é milhar, vírgula é decimal (formato brasileiro)
 *   • sem vírgula e o grupo após o ponto tem 3 dígitos → milhar ("1.500")
 *   • sem vírgula e o grupo tem 1 ou 2 dígitos → decimal ("10.5", "10.50")
 *
 * Ninguém escreve preço em real com 3 casas decimais, então o caso de 3
 * dígitos não é ambíguo na prática. Qualquer outra forma é recusada — para
 * dinheiro, devolver `null` e deixar o botão desabilitado é melhor que
 * adivinhar.
 */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, '');
  if (!cleaned) return null;

  let normalized: string;
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, '');
  } else {
    normalized = cleaned;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole = '0', frac = ''] = normalized.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

function traduzirErro(message: string): string {
  // "Failed to fetch" é o que o browser diz quando não alcançou o servidor.
  // Mostrar isso a um prestador esperando ver o próprio saldo não ajuda.
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Não foi possível falar com o servidor. Verifique a conexão.';
  }
  return message;
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
