// =====================================================================
// PAGORA — botão de publicar pedido
// =====================================================================
// Usado nas três telas de resumo (frete, guincho, caçamba). É o ponto em que
// o fluxo deixa de ser simulação e vira linha no banco.
//
// Sobre o login: publicar exige sessão, porque a RLS exige
// `client_id = auth.uid()`. Em vez de bloquear a tela inteira, o botão troca
// de rótulo e leva ao login. O estado do fluxo vive no Zustand, então voltar
// do login preserva tudo que foi preenchido — nenhum dado é perdido.
//
// O WhatsApp continua ali ao lado, como estava. Ele é o canal que a operação
// usa hoje e vai continuar existindo enquanto a base de prestadores no app
// não for suficiente para responder a um pedido publicado.
// =====================================================================
import { useState } from 'react';
import { Icon } from '../icons';
import { publishServiceRequest } from '../domains/orders/request.service';
import { useSession } from '../hooks/useSession';
import { track } from '../lib/analytics';
import type { ServiceType } from '../lib/database.types';
import type { GoFn, PagoraState } from '../types';

export type PublishRequestButtonProps = {
  go: GoFn;
  service: ServiceType;
  state: PagoraState;
  /** Estimativa em CENTAVOS. As telas calculam em reais, então converta. */
  estimate?: { lowCents: number; highCents: number } | undefined;
};

export const PublishRequestButton = ({
  go,
  service,
  state,
  estimate,
}: PublishRequestButtonProps) => {
  const { user, loading: sessionLoading } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sessionLoading) {
    return (
      <button className="pg-btn pg-btn--accent pg-btn--block pg-btn--lg" disabled>
        Carregando…
      </button>
    );
  }

  if (!user) {
    return (
      <>
        <button
          className="pg-btn pg-btn--accent pg-btn--block pg-btn--lg"
          onClick={() => {
            track('publicar_pedido_sem_login', { tipo: service });
            go('login');
          }}
        >
          <Icon name="spark" size={20} /> Entrar e receber propostas
        </button>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-mute)' }}>
          Seu orçamento fica salvo — você volta exatamente para cá.
        </div>
      </>
    );
  }

  async function publish() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const request = await publishServiceRequest({
        clientId: user.id,
        service,
        state,
        estimate,
      });
      track('pedido_publicado', { tipo: service, request_id: request.id });
      go('meus-pedidos');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error && (
        <div
          className="pg-row"
          role="alert"
          style={{
            gap: 8,
            padding: 12,
            borderRadius: 10,
            background: 'var(--ink-100)',
            alignItems: 'flex-start',
            marginBottom: 8,
          }}
        >
          <Icon name="alert" size={16} />
          <span style={{ fontSize: 13 }}>{error}</span>
        </div>
      )}
      <button
        className="pg-btn pg-btn--accent pg-btn--block pg-btn--lg"
        disabled={busy}
        onClick={() => void publish()}
      >
        <Icon name="spark" size={20} />
        {busy ? 'Publicando…' : 'Publicar e receber propostas'}
      </button>
    </>
  );
};
