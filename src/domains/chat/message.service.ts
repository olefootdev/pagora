// =====================================================================
// PAGORA — mensagens do pedido (ponto 9)
// =====================================================================
// Passa por PostgREST com RLS, sem Edge Function. A 0010 amarra tudo que
// importa no banco: só participante lê e escreve, `sender_id` é preso a
// auth.uid() pelo with check, e não existe delete nem edição do corpo.
//
// ONDE O GUARD RODA HOJE — E ONDE AINDA NÃO RODA
//
// `guardMessage` é chamado aqui, antes do insert, e a mensagem barrada nunca
// chega ao banco. Isso resolve o caminho do app, que é por onde o usuário
// passa. NÃO resolve quem chama o PostgREST direto com o próprio token: essa
// pessoa insere texto com telefone e o banco aceita, porque a 0010 valida
// autoria e participação, não conteúdo.
//
// Fechar isso exige a Edge Function `send-message` rodando o MESMO guard e o
// insert saindo do alcance direto de `authenticated` — é o próximo passo do
// ponto 9, e está anotado como pendência no HANDOFF. Até lá, o bloqueio vale
// contra o usuário comum e não contra quem sabe usar a API.
//
// A fila `message_blocks` só aceita escrita de service_role, então o registro
// do bloqueio também espera essa função. Hoje o guard barra e não registra.
// =====================================================================
import { supabase } from '../../lib/supabase';
import { guardMessage, type ContactFinding } from '../moderation/contact-guard';
import type { Tables } from '../../lib/database.types';

export type Message = Tables<'messages'>;

export type SendResult =
  | { ok: true; message: Message }
  | { ok: false; kind: 'blocked'; reason: string; findings: ContactFinding[] }
  | { ok: false; kind: 'error'; reason: string };

export const MAX_BODY = 2000;

/** Histórico do pedido, do mais antigo para o mais novo. */
export async function listMessages(orderId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Envia uma mensagem, barrando contato antes de tocar no banco.
 *
 * O texto é enviado com `trim`, mas o guard roda no texto ORIGINAL: espaço é
 * separador de telefone, e analisar a versão aparada mudaria a contagem que
 * decide o bloqueio.
 */
export async function sendMessage(
  orderId: string,
  senderId: string,
  body: string,
): Promise<SendResult> {
  const veredito = guardMessage(body);
  if (veredito.blocked) {
    return {
      ok: false,
      kind: 'blocked',
      reason: veredito.reason ?? 'Mensagem bloqueada.',
      findings: veredito.findings,
    };
  }

  const texto = body.trim();
  if (!texto) return { ok: false, kind: 'error', reason: 'Mensagem vazia.' };
  if (texto.length > MAX_BODY) {
    return { ok: false, kind: 'error', reason: `Máximo de ${MAX_BODY} caracteres.` };
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ order_id: orderId, sender_id: senderId, body: texto })
    .select()
    .single();

  if (error) return { ok: false, kind: 'error', reason: error.message };
  return { ok: true, message: data };
}

/**
 * Marca como lidas as mensagens que o outro mandou.
 *
 * O filtro `neq('sender_id', meuId)` existe também no cliente, embora a policy
 * já o imponha: sem ele o PostgREST mandaria um update que afeta zero linhas e
 * a tela não teria como distinguir "não havia o que marcar" de "o banco
 * recusou".
 */
export async function markRead(orderId: string, meuProfileId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .neq('sender_id', meuProfileId)
    .is('read_at', null);

  if (error) throw new Error(error.message);
}

/**
 * Escuta mensagens novas do pedido.
 *
 * `messages` entrou na publication na 0010. Sem isto a tela precisaria de
 * polling, e uma conversa com polling parece quebrada mesmo funcionando.
 *
 * @returns função para cancelar a inscrição — chame no cleanup do efeito.
 */
export function watchMessages(orderId: string, onInsert: (m: Message) => void): () => void {
  const channel = supabase
    .channel(`order-messages-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'pagora',
        table: 'messages',
        filter: `order_id=eq.${orderId}`,
      },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
