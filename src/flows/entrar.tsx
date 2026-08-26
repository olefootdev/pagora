// =====================================================================
// PAGORA — Entrar
// =====================================================================
// A porta do app. Recebe CINCO rotas de entrada — era a tela mais antiga do
// produto servindo de porta para a jornada mais nova, e a primeira impressão
// era de outro aplicativo.
//
// Dois passos: telefone → código. As regras que vieram do legado e ficam:
//
//   - A máscara e a validação são do domínio (`domains/validation/br`) — o
//     botão só libera com celular PLAUSÍVEL, porque SMS custa dinheiro e
//     "(11) 11111-1111" passa em qualquer checagem de comprimento.
//   - O código é UM campo, não seis caixinhas: aceita colar, aceita o
//     autofill de SMS do teclado (`autoComplete="one-time-code"`), e não
//     briga com backspace.
//
// Decisão de jornada (26/08/2026): o onboarding de slides SAIU do caminho.
// Login entrega direto em `/inicio` — a proposta de valor mora no hero de
// visitante e em "Como funciona", e dois slides entre o código e a primeira
// ação útil eram custo, não boas-vindas. A rota `onboarding` redireciona.
// =====================================================================

import { useRef, useState } from 'react';
import { Body, Button, Dock, ErrorNote, Field, Screen, cx } from '../ui/kit';
import { Icon } from '../icons';
import { signInWithPhone, verifyOtp } from '../lib/auth';
import { isValidMobilePhone, maskPhone } from '../domains/validation/br';
import { track } from '../lib/analytics';
import type { GoFn } from '../types';

export const Entrar = ({ go }: { go: GoFn }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeInput = useRef<HTMLInputElement>(null);

  const phoneIsValid = isValidMobilePhone(phone);
  const showPhoneError = phone.length > 0 && !phoneIsValid;
  const codeIsComplete = code.length === 6;

  async function sendOtp() {
    setLoading(true);
    setError(null);
    try {
      await signInWithPhone(phone);
      setStep('otp');
      setCode('');
      track('otp_enviado', {});
      // O foco vai para o código no próximo quadro, quando o campo existir.
      setTimeout(() => codeInput.current?.focus(), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar o código');
    } finally {
      setLoading(false);
    }
  }

  async function verificar() {
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(phone, code);
      track('login_ok', {});
      // Direto para a home: o useSession atualiza sozinho, e a proposta de
      // valor já mora lá. Slides entre o código e a primeira ação eram custo.
      go('inicio');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Código inválido');
    } finally {
      setLoading(false);
    }
  }

  function submit() {
    if (loading) return;
    void (step === 'phone' ? sendOtp() : verificar());
  }

  return (
    <Screen label="Entrar">
      {/* O hero é a marca dizendo "você chegou" — mesmo gradiente da home. */}
      <div className="px-hero" style={{ paddingBottom: 34 }}>
        <div className="px-hero-top">
          <button
            className="px-hero-btn"
            onClick={() => {
              if (step === 'otp') {
                setStep('phone');
                setError(null);
              } else {
                go('inicio');
              }
            }}
            aria-label="Voltar"
          >
            <Icon name="arrow-left" size={20} />
          </button>
        </div>

        <h1 className="px-hero-title">
          {step === 'phone' ? 'Entrar no Pagora' : 'Digite o código'}
        </h1>
        <p className="px-hero-sub">
          {step === 'phone' ? (
            'Seu telefone é a sua conta. Enviamos um código de 6 dígitos por SMS.'
          ) : (
            <>
              Enviado para{' '}
              <span className="px-data" style={{ color: 'var(--x-hero-ink)' }}>
                {phone}
              </span>
            </>
          )}
        </p>
      </div>

      <Body className="px-entrar-body">
        {step === 'phone' ? (
          <Field
            label="Número de celular"
            icon="phone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 98765-4321"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && phoneIsValid) submit();
            }}
            error={
              showPhoneError ? 'Digite um celular com DDD — o código chega por SMS.' : undefined
            }
            hint={
              showPhoneError
                ? undefined
                : 'Não compartilhamos seu número com transportadores antes de você aceitar uma proposta.'
            }
          />
        ) : (
          <>
            {/* Um campo só: aceita colar e o autofill de SMS do teclado. */}
            <input
              ref={codeInput}
              className={cx('px-input', 'px-otp')}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && codeIsComplete) submit();
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              aria-label="Código de 6 dígitos"
            />
            <Button
              variant="quiet"
              size="sm"
              disabled={loading}
              onClick={() => void sendOtp()}
              style={{ alignSelf: 'center' }}
            >
              Reenviar código
            </Button>
          </>
        )}

        {error && <ErrorNote message={error} />}
      </Body>

      <Dock>
        <Button
          variant="primary"
          size="lg"
          block
          busy={loading}
          busyLabel={step === 'phone' ? 'Enviando…' : 'Verificando…'}
          disabled={step === 'phone' ? !phoneIsValid : !codeIsComplete}
          onClick={submit}
        >
          {step === 'phone' ? 'Receber o código' : 'Verificar e entrar'}
        </Button>
        <p
          style={{
            margin: 0,
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--x-ink-dim)',
          }}
        >
          {step === 'phone' ? (
            <>
              Ao continuar você aceita os{' '}
              <button
                onClick={() => go('termos')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  font: 'inherit',
                  color: 'var(--x-action)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                termos de uso
              </button>
            </>
          ) : (
            'Não recebeu? Confira o número e reenvie.'
          )}
        </p>
      </Dock>
    </Screen>
  );
};
