// =====================================================================
// PAGORA — compartilhamento (ponto 8)
// =====================================================================
// Antes disto, todo botão "Compartilhar" do app era enfeite: o modal do
// locator mostrava um link decorativo que não existia, e o "Copiar" do código
// de indicação não tinha onClick. Este módulo é o único lugar que monta URL
// compartilhável e o único que fala com navigator.share/clipboard.
//
// Duas armadilhas que esta implementação trata de propósito:
//
// 1. `navigator.share` rejeita com AbortError quando a pessoa abre a bandeja
//    e desiste. Isso é desistência, não falha — mostrar erro nesse caso é
//    culpar o usuário por uma escolha dele.
// 2. `navigator.clipboard` só existe em contexto seguro (https ou localhost).
//    Num staging servido em http puro ele é `undefined`, e sem o fallback o
//    botão morre calado.
// =====================================================================

export type SharePayload = {
  title: string;
  text: string;
  url: string;
};

/**
 * `shared` — foi pela bandeja nativa do sistema.
 * `copied` — não havia bandeja; o link está na área de transferência.
 * `dismissed` — a bandeja abriu e a pessoa fechou. Não é erro.
 * `failed` — nem compartilhar nem copiar funcionou.
 */
export type ShareResult = 'shared' | 'copied' | 'dismissed' | 'failed';

/**
 * Monta uma URL absoluta para uma tela do app.
 *
 * O app usa HashRouter, então a rota vive DEPOIS do `#` — e a query também,
 * senão o router não enxerga. `?ref=X#/landing` é a forma errada e silenciosa:
 * o link abre a tela certa e o parâmetro nunca chega ao componente.
 */
export function buildShareUrl(
  route: string,
  params: Record<string, string> = {},
  origin: string = typeof window === 'undefined' ? '' : window.location.origin,
): string {
  const clean = route.replace(/^#?\/?/, '');
  const qs = new URLSearchParams(params).toString();
  return `${origin}/#/${clean}${qs ? `?${qs}` : ''}`;
}

/** Copia texto sem depender da Clipboard API, que exige contexto seguro. */
function copiaPorTextarea(texto: string): boolean {
  if (typeof document === 'undefined') return false;
  const ta = document.createElement('textarea');
  ta.value = texto;
  // Fora da tela, mas não `display:none` — o navegador não seleciona o que
  // não está renderizado.
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  ta.setAttribute('readonly', '');
  document.body.appendChild(ta);
  try {
    ta.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(ta);
  }
}

async function copia(texto: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // Permissão negada ou contexto inseguro — cai no fallback.
    }
  }
  return copiaPorTextarea(texto);
}

/** Copia só o texto. Usado pelo código de indicação, que não é uma URL. */
export async function copyText(texto: string): Promise<'copied' | 'failed'> {
  return (await copia(texto)) ? 'copied' : 'failed';
}

/**
 * Abre a bandeja nativa quando existe; senão copia o link.
 *
 * Precisa ser chamado direto de um handler de clique: sem gesto do usuário o
 * navegador bloqueia tanto o share quanto o clipboard.
 */
export async function shareOrCopy(payload: SharePayload): Promise<ShareResult> {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;

  if (nav?.share) {
    try {
      await nav.share(payload);
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'dismissed';
      // Qualquer outro erro (NotAllowedError, share indisponível para o
      // payload) ainda tem conserto: copiar resolve o objetivo da pessoa.
    }
  }

  return (await copia(payload.url)) ? 'copied' : 'failed';
}

/** Mensagem curta para o usuário, por resultado. `null` = não diga nada. */
export function shareFeedback(r: ShareResult): string | null {
  switch (r) {
    case 'copied':
      return 'Link copiado';
    case 'failed':
      return 'Não deu para compartilhar';
    case 'shared':
    case 'dismissed':
      // O sistema já deu o retorno visual, ou a pessoa desistiu de propósito.
      return null;
  }
}
