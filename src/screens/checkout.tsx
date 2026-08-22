// =====================================================================
// PAGORA — Checkout Pix
// =====================================================================
// A tela que faltava para o marketplace faturar.
//
// Ela NÃO calcula preço. Recebe um `orderId` e pede a cobrança ao servidor,
// que lê o valor da order (cópia congelada da proposta aceita) e devolve só o
// necessário para pagar: valor, QR, copia-e-cola e vencimento. Não há estado
// local de dinheiro que possa divergir do que será cobrado.
//
// A confirmação chega por Realtime: quem sabe que o Pix caiu é o webhook do
// Asaas, não o browser. Polling aqui seria bater no banco por minutos à toa.
// =====================================================================
import { useEffect, useState } from 'react';
import { Icon } from '../icons';
import { StatusBar, TopBar } from '../core';
import { formatCents } from '../domains/money';
import {
  createPixPayment,
  watchOrderPayment,
  type PixCharge,
} from '../domains/payments/payment.service';
import { FunctionError } from '../lib/functions';
import type { GoFn } from '../types';

type CheckoutProps = { go: GoFn; orderId?: string | undefined };

type Phase = 'loading' | 'ready' | 'paid' | 'error';

export const Checkout = ({ go, orderId }: CheckoutProps) => {
  const [phase, setPhase] = useState<Phase>('loading');
  const [charge, setCharge] = useState<PixCharge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Bumpar este contador é como "Tentar de novo" refaz a busca: a mudança sai
  // de um handler de evento, e o efeito reage. Evita `setState` síncrono
  // dentro do efeito e dá um ponto natural para cancelar a resposta antiga.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    void (async () => {
      try {
        const result = await createPixPayment(orderId);
        if (cancelled) return;
        setCharge(result);
        setPhase(result.status === 'paid' ? 'paid' : 'ready');
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof FunctionError ? e.message : 'Não foi possível gerar a cobrança.');
        setPhase('error');
      }
    })();

    // Em dev o StrictMode dispara o efeito duas vezes. Não há guarda contra
    // isso aqui de propósito: `prepare_payment` é idempotente e devolve a
    // mesma cobrança, então o segundo disparo não gera um segundo Pix.
    return () => {
      cancelled = true;
    };
  }, [orderId, attempt]);

  const retry = () => {
    setPhase('loading');
    setError(null);
    setAttempt((n) => n + 1);
  };

  // Realtime: o webhook confirma, a tela reage.
  useEffect(() => {
    if (!orderId || phase !== 'ready') return;
    return watchOrderPayment(orderId, () => setPhase('paid'));
  }, [orderId, phase]);

  // Contagem regressiva do vencimento do Pix.
  useEffect(() => {
    if (!charge?.expiresAt || phase !== 'ready') return;
    const deadline = new Date(charge.expiresAt).getTime();
    const tick = () => setSecondsLeft(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [charge?.expiresAt, phase]);

  const copy = async () => {
    if (!charge?.pixPayload) return;
    await navigator.clipboard.writeText(charge.pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  if (!orderId) {
    return (
      <Shell go={go} title="Pagamento">
        <Message
          icon="alert"
          title="Pedido não informado"
          body="Volte e escolha uma proposta para continuar."
          action={{ label: 'Ver meus pedidos', onClick: () => go('history-list') }}
        />
      </Shell>
    );
  }

  return (
    <Shell go={go} title="Pagamento">
      {phase === 'loading' && (
        <Message icon="refresh" title="Gerando seu Pix…" body="Isso leva alguns segundos." />
      )}

      {phase === 'error' && (
        <Message
          icon="alert"
          title="Não deu certo"
          body={error ?? 'Tente novamente em instantes.'}
          action={{ label: 'Tentar de novo', onClick: retry }}
        />
      )}

      {phase === 'paid' && (
        <Message
          icon="check-circle"
          tone="success"
          title="Pagamento confirmado"
          body="O prestador já foi avisado e vai iniciar o serviço."
          action={{ label: 'Acompanhar pedido', onClick: () => go('tracking', { orderId }) }}
        />
      )}

      {phase === 'ready' && charge && (
        <div
          style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}
        >
          {/* Valor */}
          <div className="pg-card pg-card--dark" style={{ padding: 22, textAlign: 'center' }}>
            <div className="pg-h-eyebrow" style={{ color: 'var(--green-500)', margin: 0 }}>
              TOTAL A PAGAR
            </div>
            <div
              className="pg-mono"
              style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6 }}
            >
              {formatCents(charge.amountCents)}
            </div>
            {secondsLeft !== null && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>
                {secondsLeft > 0 ? (
                  <>
                    Expira em <strong className="pg-mono">{formatClock(secondsLeft)}</strong>
                  </>
                ) : (
                  'Este Pix expirou — gere um novo.'
                )}
              </div>
            )}
          </div>

          {/* QR Code */}
          {charge.pixQrCode && (
            <div className="pg-card pg-card--padded" style={{ textAlign: 'center' }}>
              <div className="pg-h-eyebrow">ESCANEIE COM O APP DO SEU BANCO</div>
              <img
                src={`data:image/png;base64,${charge.pixQrCode}`}
                alt="QR Code do Pix para pagamento"
                style={{
                  width: 220,
                  height: 220,
                  maxWidth: '100%',
                  margin: '12px auto 0',
                  display: 'block',
                  borderRadius: 12,
                  background: '#fff',
                }}
              />
            </div>
          )}

          {/* Copia e cola */}
          {charge.pixPayload && (
            <div className="pg-card pg-card--padded">
              <div className="pg-h-eyebrow">OU USE O PIX COPIA E COLA</div>
              <div
                className="pg-mono"
                style={{
                  fontSize: 11,
                  color: 'var(--text-mute)',
                  wordBreak: 'break-all',
                  background: 'var(--ink-100)',
                  padding: 12,
                  borderRadius: 10,
                  margin: '10px 0 12px',
                  maxHeight: 96,
                  overflow: 'auto',
                }}
              >
                {charge.pixPayload}
              </div>
              <button className="pg-btn pg-btn--accent" style={{ width: '100%' }} onClick={copy}>
                <Icon name={copied ? 'check' : 'copy'} size={16} />
                {copied ? 'Código copiado' : 'Copiar código Pix'}
              </button>
            </div>
          )}

          {/* Espera */}
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
            <Icon name="clock" size={18} />
            <div style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.5 }}>
              Assim que o banco confirmar, esta tela muda sozinha — pode deixar aberta. O prestador
              só é acionado depois da confirmação.
            </div>
          </div>

          <button className="pg-btn pg-btn--ghost" onClick={() => go('history-list')}>
            Pagar depois
          </button>
        </div>
      )}
    </Shell>
  );
};

// ---------------------------------------------------------------------
function Shell({ go, title, children }: { go: GoFn; title: string; children: React.ReactNode }) {
  return (
    <div className="pg-screen" data-screen-label="P1 Checkout Pix">
      <StatusBar />
      <TopBar onBack={() => go('history-list')} title={title} />
      <div className="pg-viewport">{children}</div>
    </div>
  );
}

function Message({
  icon,
  title,
  body,
  action,
  tone,
}: {
  icon: string;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
  tone?: 'success';
}) {
  return (
    <div
      style={{
        padding: '56px 28px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background: tone === 'success' ? 'var(--green-500)' : 'var(--ink-100)',
        }}
      >
        <Icon name={icon} size={28} />
      </div>
      <h2 style={{ fontSize: 20, margin: 0 }}>{title}</h2>
      <p style={{ color: 'var(--text-mute)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>{body}</p>
      {action && (
        <button className="pg-btn pg-btn--accent" style={{ marginTop: 8 }} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
