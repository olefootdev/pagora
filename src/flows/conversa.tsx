// =====================================================================
// PAGORA — Conversa do pedido
// =====================================================================
// Porte do chat legado para o design system, com a LÓGICA intacta: o
// `useChat` (carga, realtime, envio, leitura) e o filtro de contato da
// moderação não mudaram uma linha. O que mudou é a pele — tokens no lugar
// de cores cravadas, e as mesmas regras de produto:
//
//   - Mensagem barrada pelo filtro CONTINUA no campo, para a pessoa editar
//     o trecho em vez de digitar tudo de novo.
//   - O aviso de bloqueio fica acima do campo, onde o olho está.
//   - O selo de registro abre a conversa: é o que vale numa divergência.
// =====================================================================

import { useEffect, useRef, useState } from 'react';
import { Button, IconButton, Screen, cx } from '../ui/kit';
import { VoiceButton } from '../ui/anchor-card';
import { Icon } from '../icons';
import { orderCode } from '../domains/orders/order-code';
import { useChat } from '../hooks/useChat';
import { useProfile } from '../hooks/useProfile';
import { MAX_BODY } from '../domains/chat/message.service';
import type { GoFn } from '../types';

const horaCurta = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const diaLegivel = (iso: string) => {
  const d = new Date(iso);
  const mesmoDia = d.toDateString() === new Date().toDateString();
  if (mesmoDia) return 'HOJE';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase();
};

export const Conversa = ({ go, orderId }: { go: GoFn; orderId?: string | undefined }) => {
  const [msg, setMsg] = useState('');
  const { profile } = useProfile();
  const { messages, loading, error, block, sending, send, dismissBlock } = useChat(
    orderId,
    profile?.id,
  );
  const fim = useRef<HTMLDivElement | null>(null);

  // Rolar para o fim quando chega mensagem. Conversa que abre "pulada" para
  // o fim é o comportamento esperado de chat.
  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  async function enviar() {
    if (!msg.trim() || sending) return;
    const ok = await send(msg);
    // Só limpa se foi. Mensagem barrada fica para ser editada.
    if (ok) setMsg('');
  }

  const semPedido = !orderId;

  return (
    <Screen label="Conversa" className="px-chat">
      <header className="px-head px-head--sticky">
        <IconButton
          icon="arrow-left"
          label="Voltar"
          onClick={() => (orderId ? go(`acompanhar/${orderId}`) : go('pedidos'))}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="px-head-title">Conversa do pedido</div>
          <div className="px-data" style={{ fontSize: 11.5, color: 'var(--x-ink-dim)' }}>
            {orderId ? orderCode(orderId) : 'sem pedido'}
          </div>
        </div>
      </header>

      <div className="px-chat-scroll">
        {/* O selo que abre toda conversa: o registro é a proteção. */}
        <div className="px-chat-notice">
          <Icon name="shield" size={13} aria-hidden="true" /> Conversa registrada pela Pagora.
          Telefone, e-mail e link não passam por aqui — é o registro que vale se houver divergência.
        </div>

        {semPedido && (
          <div className="px-chat-empty">
            A conversa acontece dentro de um pedido. Abra pelo pedido em andamento.
            <Button
              variant="outline"
              size="sm"
              style={{ marginTop: 12 }}
              onClick={() => go('pedidos')}
            >
              Ver meus pedidos
            </Button>
          </div>
        )}

        {loading && !semPedido && <div className="px-chat-empty">Carregando conversa…</div>}

        {error && (
          <div role="alert" className="px-chat-error">
            {error}
          </div>
        )}

        {messages.map((m, i) => {
          const minha = m.sender_id === profile?.id;
          const anterior = messages[i - 1];
          const trocouODia =
            !anterior || diaLegivel(anterior.created_at) !== diaLegivel(m.created_at);
          return (
            <div key={m.id}>
              {trocouODia && (
                <div style={{ textAlign: 'center', margin: '8px 0 14px' }}>
                  <span className="px-chat-day">{diaLegivel(m.created_at)}</span>
                </div>
              )}
              <div className={cx('px-msg-row', minha && 'is-mine')}>
                <div className={cx('px-msg', minha && 'is-mine')}>
                  {m.body}
                  <span className="px-msg-meta">
                    {horaCurta(m.created_at)}{' '}
                    {minha && m.read_at && <Icon name="check" size={10} strokeWidth={3} />}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={fim} />
      </div>

      {/* Bloqueio de contato: acima do campo, onde a pessoa está olhando. */}
      {block && (
        <div role="alert" className="px-chat-block">
          <Icon name="shield" size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>{block.reason}</div>
          <IconButton icon="close" label="Fechar aviso" onClick={dismissBlock} />
        </div>
      )}

      <div className="px-chat-compose">
        <input
          className="px-input"
          placeholder={semPedido ? 'Abra um pedido para conversar' : 'Mensagem'}
          value={msg}
          disabled={semPedido || sending}
          maxLength={MAX_BODY}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void enviar();
          }}
          aria-label="Mensagem"
        />
        {/* Concatena em vez de substituir: quem já digitou metade e ditou o
            resto não perde o que escreveu. */}
        <VoiceButton
          onText={(t) => setMsg((m) => (m ? `${m} ${t}` : t))}
          label="Ditar a mensagem"
        />
        <button
          className={cx('px-chat-send', msg.trim() && !sending && 'is-ready')}
          onClick={() => void enviar()}
          disabled={semPedido || sending || !msg.trim()}
          aria-label="Enviar"
        >
          <Icon name="navigation" size={18} />
        </button>
      </div>
    </Screen>
  );
};
