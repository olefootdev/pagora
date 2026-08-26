// =====================================================================
// PAGORA — Limite de espera para chamadas de rede
// =====================================================================
// Descoberto verificando as telas novas com o host do Supabase inacessível
// (`ERR_NAME_NOT_RESOLVED`): a tela ficava em esqueleto para sempre. Sem
// resposta e sem erro, `finally` nunca roda, `loading` nunca vira false, e o
// usuário fica olhando três retângulos cinza sem botão nenhum.
//
// Não é cenário de laboratório. O usuário do Pagora está numa obra, num
// depósito, embaixo de uma laje — com sinal ruim é o estado NORMAL. Uma tela
// que não sabe desistir é uma tela que trava para quem mais precisa dela.
//
// O limite é generoso de propósito: 15 segundos numa rede 3G ruim ainda é
// uma chamada que vai completar. O que ele corta é a espera infinita.
// =====================================================================

export const DEFAULT_TIMEOUT_MS = 15_000;

/** Erro de espera esgotada. Tipo próprio para a tela poder tratar diferente. */
export class TimeoutError extends Error {
  constructor(message = 'A conexão demorou demais para responder.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Resolve com a promessa original, ou rejeita com `TimeoutError` depois de
 * `ms` milissegundos.
 *
 * Não cancela a requisição — `fetch` só cancela com `AbortSignal`, que o
 * supabase-js não expõe em todas as chamadas. O que garantimos é que a
 * INTERFACE não fica presa esperando. Se a resposta chegar depois, ela é
 * ignorada; a tela já ofereceu "tentar de novo".
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number = DEFAULT_TIMEOUT_MS,
  message?: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(message)), ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        // A rejeição passa INTACTA. Envolvê-la em `new Error(String(erro))`
        // parecia defensivo e destruía a informação: o supabase-js rejeita
        // com objeto simples, e `String({})` vira "[object Object]" — que foi
        // literalmente o que apareceu na tela de acompanhamento. Normalizar
        // erro é trabalho de `loadErrorMessage`, num lugar só.
        reject(error as Error);
      },
    );
  });
}

/**
 * Mensagem de erro para o usuário, a partir de qualquer erro de carga.
 *
 * A regra é a mesma do resto do produto: dizer o que aconteceu e o que fazer.
 * "Failed to fetch" não é nenhuma das duas coisas.
 */
/**
 * Extrai a mensagem de qualquer forma de erro que chega até a tela.
 *
 * O supabase-js NÃO rejeita com `Error`: `PostgrestError` é objeto simples
 * com `message`, `code`, `details` e `hint`. Um `String(erro)` nele produz
 * `"[object Object]"` — que foi exatamente o que apareceu na tela de
 * acompanhamento antes desta função existir.
 */
function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object') {
    const o = error as Record<string, unknown>;
    for (const key of ['message', 'error_description', 'error', 'details', 'hint']) {
      const v = o[key];
      if (typeof v === 'string' && v.trim()) return v;
    }
  }

  return '';
}

export function loadErrorMessage(error: unknown): string {
  if (error instanceof TimeoutError) {
    return 'A conexão demorou demais. Verifique sua internet e tente de novo.';
  }

  const raw = messageOf(error);

  // `TypeError: Failed to fetch` é o que o navegador devolve quando o host não
  // resolve, o DNS falha ou o aparelho está sem rede.
  if (/failed to fetch|networkerror|load failed|err_name_not_resolved/i.test(raw)) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
  }

  if (/jwt|token|not authenticated|session/i.test(raw)) {
    return 'Sua sessão expirou. Entre novamente para continuar.';
  }

  return raw || 'Não foi possível carregar. Tente de novo.';
}
