import { useCallback, useEffect, useState } from 'react';
import {
  listMessages,
  markRead,
  sendMessage,
  watchMessages,
  type Message,
} from '../domains/chat/message.service';
import type { ContactFinding } from '../domains/moderation/contact-guard';

export type ChatBlock = { reason: string; findings: ContactFinding[] };

export type UseChat = {
  messages: Message[];
  loading: boolean;
  /** Erro de carga ou de envio. Bloqueio de contato NÃO vem por aqui. */
  error: string | null;
  /** Preenchido quando o filtro barrou o último envio. */
  block: ChatBlock | null;
  sending: boolean;
  send: (body: string) => Promise<boolean>;
  dismissBlock: () => void;
};

/**
 * Conversa de um pedido: carga inicial, realtime e envio.
 *
 * `orderId` opcional porque a rota pode ser aberta sem pedido (link velho,
 * navegação direta). Nesse caso o hook fica inerte em vez de estourar.
 */
export function useChat(orderId: string | undefined, meuProfileId: string | undefined): UseChat {
  const [messages, setMessages] = useState<Message[]>([]);
  // Inicia carregando só se há pedido. Sem isto o efeito precisaria de um
  // setLoading(false) síncrono no caminho "sem pedido", que dispara render em
  // cascata — o valor exposto é derivado logo abaixo.
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState<string | null>(null);
  const [block, setBlock] = useState<ChatBlock | null>(null);
  const [sending, setSending] = useState(false);

  // Realtime devolve também a mensagem que EU acabei de inserir, então toda
  // entrada passa por deduplicação. O conjunto de ids é montado a partir do
  // próprio estado dentro do updater, e não guardado num ref: ref não pode ser
  // limpo durante o render, e era exatamente disso que a troca de pedido
  // precisava. Listas de conversa são curtas; o custo de refazer o Set é
  // irrelevante perto de um ref dessincronizado do estado.
  const absorve = useCallback((novas: Message[]) => {
    setMessages((atuais) => {
      const conhecidos = new Set(atuais.map((m) => m.id));
      const inéditas = novas.filter((m) => !conhecidos.has(m.id));
      if (inéditas.length === 0) return atuais;
      return [...atuais, ...inéditas].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }, []);

  // Trocar de pedido zera a conversa. Isto acontece DURANTE o render, não num
  // efeito: é o padrão que o React documenta para ajustar estado quando uma
  // prop muda, e evita o render em cascata de limpar a lista depois que a
  // anterior já apareceu na tela — que o usuário veria como um piscar.
  const [pedidoAnterior, setPedidoAnterior] = useState(orderId);
  if (orderId !== pedidoAnterior) {
    setPedidoAnterior(orderId);
    setMessages([]);
    setLoading(Boolean(orderId));
    setError(null);
    setBlock(null);
  }

  useEffect(() => {
    if (!orderId) return;

    let cancelado = false;

    listMessages(orderId)
      .then((rows) => {
        if (cancelado) return;
        setMessages(rows);
      })
      .catch((e: Error) => {
        if (!cancelado) setError(e.message);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    const parar = watchMessages(orderId, (m) => absorve([m]));
    return () => {
      cancelado = true;
      parar();
    };
  }, [orderId, absorve]);

  // Marcar como lida depois que as mensagens chegam, não junto da carga: o
  // que define "lida" é a tela ter renderizado, e a policy só deixa marcar as
  // que vieram do outro.
  useEffect(() => {
    if (!orderId || !meuProfileId) return;
    const temNaoLidaDoOutro = messages.some((m) => m.sender_id !== meuProfileId && !m.read_at);
    if (!temNaoLidaDoOutro) return;
    void markRead(orderId, meuProfileId).catch(() => {
      // Falhar em marcar como lida não é erro que valha interromper a
      // conversa. A próxima renderização tenta de novo.
    });
  }, [orderId, meuProfileId, messages]);

  const send = useCallback(
    async (body: string): Promise<boolean> => {
      if (!orderId || !meuProfileId) return false;
      setSending(true);
      setError(null);
      setBlock(null);
      try {
        const r = await sendMessage(orderId, meuProfileId, body);
        if (r.ok) {
          absorve([r.message]);
          return true;
        }
        if (r.kind === 'blocked') setBlock({ reason: r.reason, findings: r.findings });
        else setError(r.reason);
        return false;
      } finally {
        setSending(false);
      }
    },
    [orderId, meuProfileId, absorve],
  );

  const dismissBlock = useCallback(() => setBlock(null), []);

  return {
    messages,
    loading: Boolean(orderId) && loading,
    error,
    block,
    sending,
    send,
    dismissBlock,
  };
}
