// =====================================================================
// PAGORA — chamadas às Edge Functions
// =====================================================================
// Toda operação financeira do frontend passa por aqui. O supabase-js anexa o
// JWT da sessão automaticamente em `functions.invoke`, e é esse token — não
// nenhum campo do corpo — que decide quem é o usuário do outro lado.
// =====================================================================

import { supabase } from './supabase';

/** Erro vindo de uma Edge Function, já com a mensagem destinada ao usuário. */
export class FunctionError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'FunctionError';
  }
}

export async function callFunction<TResponse, TBody extends object = object>(
  name: string,
  body?: TBody,
): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke<TResponse>(name, {
    body: body ?? {},
  });

  if (error) {
    // O corpo de erro da função traz `{ error: "mensagem legível" }`.
    // `context` é a Response original quando o status é 4xx/5xx.
    let message = error.message;
    let status: number | undefined;
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      status = context.status;
      try {
        const parsed = (await context.json()) as { error?: string };
        if (parsed?.error) message = parsed.error;
      } catch {
        // Resposta sem JSON: mantém a mensagem original do supabase-js.
      }
    }
    throw new FunctionError(message, status);
  }

  if (data === null || data === undefined) {
    throw new FunctionError('Resposta vazia da função');
  }
  return data;
}

/**
 * Chave de idempotência para operações que não podem repetir.
 * Gerada no client e mantida por tentativa: se a rede cair depois do envio, o
 * retry reusa a MESMA chave e o servidor devolve a operação original em vez de
 * criar uma segunda.
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
