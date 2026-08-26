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
import { Body, Button, Card, Empty, IconButton, Num, Screen } from '../ui/kit';
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
        <Empty
          icon="alert"
          title="Pedido não informado"
          sub="Volte e escolha uma proposta para continuar."
          action={
            <Button variant="primary" onClick={() => go('pedidos')}>
              Ver meus pedidos
            </Button>
          }
        />
      </Shell>
    );
  }

  return (
    <Shell go={go} title="Pagamento">
      {phase === 'loading' && (
        <Empty icon="refresh" title="Gerando seu Pix…" sub="Isso leva alguns segundos." />
      )}

      {phase === 'error' && (
        <Empty
          icon="alert"
          title="Não deu certo"
          sub={error ?? 'Tente novamente em instantes.'}
          action={
            <Button variant="primary" onClick={retry}>
              Tentar de novo
            </Button>
          }
        />
      )}

      {phase === 'paid' && (
        <Empty
          icon="check-circle"
          title="Pagamento confirmado"
          sub="O transportador já foi avisado e vai iniciar o serviço."
          action={
            <Button variant="primary" onClick={() => go(`acompanhar/${orderId}`)}>
              Acompanhar pedido
            </Button>
          }
        />
      )}

      {phase === 'ready' && charge && (
        <>
          {/* Valor — o maior número da tela, no verde profundo da marca. */}
          <Card
            style={{
              background: 'var(--x-hero-deep)',
              border: 'none',
              color: '#ffffff',
              textAlign: 'center',
            }}
          >
            <div className="px-eyebrow" style={{ color: 'var(--x-hero-bright)' }}>
              Total a pagar
            </div>
            <div style={{ marginTop: 8, display: 'grid', justifyItems: 'center' }}>
              <Num value={formatCents(charge.amountCents)} />
            </div>
            {secondsLeft !== null && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', marginTop: 8 }}>
                {secondsLeft > 0 ? (
                  <>
                    Expira em{' '}
                    <strong className="px-data" style={{ color: '#fff' }}>
                      {formatClock(secondsLeft)}
                    </strong>
                  </>
                ) : (
                  'Este Pix expirou — gere um novo.'
                )}
              </div>
            )}
          </Card>

          {/* QR Code */}
          {charge.pixQrCode && (
            <Card style={{ textAlign: 'center' }}>
              <div className="px-eyebrow">Escaneie com o app do seu banco</div>
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
            </Card>
          )}

          {/* Copia e cola */}
          {charge.pixPayload && (
            <Card>
              <div className="px-eyebrow">Ou use o Pix copia e cola</div>
              <div className="px-pix-payload px-data">{charge.pixPayload}</div>
              <Button
                variant="primary"
                block
                iconStart={copied ? 'check' : 'copy'}
                onClick={() => void copy()}
              >
                {copied ? 'Código copiado' : 'Copiar código Pix'}
              </Button>
            </Card>
          )}

          {/* Espera */}
          <Card tone="flat">
            <div className="px-row px-row--top">
              <Icon name="clock" size={18} style={{ color: 'var(--x-ink-dim)', flexShrink: 0 }} />
              <p className="px-opt-s" style={{ marginTop: 0 }}>
                Assim que o banco confirmar, esta tela muda sozinha — pode deixar aberta. O
                transportador só é acionado depois da confirmação.
              </p>
            </div>
          </Card>

          <Button variant="quiet" block onClick={() => go('pedidos')}>
            Pagar depois
          </Button>
        </>
      )}
    </Shell>
  );
};

// ---------------------------------------------------------------------
function Shell({ go, title, children }: { go: GoFn; title: string; children: React.ReactNode }) {
  return (
    <Screen label="Checkout Pix">
      <header className="px-head px-head--sticky">
        <IconButton icon="arrow-left" label="Voltar" onClick={() => go('pedidos')} />
        <div className="px-head-title">{title}</div>
      </header>
      <Body>{children}</Body>
    </Screen>
  );
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
