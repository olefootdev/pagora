// =====================================================================
// PAGORA — Captura da indicação
// =====================================================================
// A tela Minha Rede convida a compartilhar `#/inicio?ref=abc12345`. Hoje esse
// link abre o app normalmente e o `ref` EVAPORA — verificado no navegador.
// Como a atribuição real só chega com o módulo do divulgador (v1.1), tudo o
// que for indicado até lá seria perdido sem volta.
//
// Este módulo guarda a indicação pendente até haver onde gravá-la. É a ponte
// entre "o link já circula" e "o banco já registra".
//
// O QUE ELE NÃO FAZ, de propósito:
//   - não credita nada (não existe `referred_by`);
//   - não decide a expiração da COMISSÃO — esse prazo é decisão comercial
//     ainda em aberto (ver decisões de 19/08). O prazo abaixo é outra coisa:
//     por quanto tempo seguramos uma indicação que ainda não virou cadastro.
// =====================================================================

const KEY = 'pagora:ref-pendente';

/**
 * Por quanto tempo uma indicação pendente é guardada.
 *
 * 90 dias é o tempo entre alguém receber o link no WhatsApp e finalmente
 * precisar de um frete. Mais que isso, a lembrança de quem indicou já se
 * perdeu para as duas partes, e creditar viraria surpresa.
 *
 * NÃO confundir com a expiração da comissão do divulgador, que é decisão
 * comercial e continua indefinida.
 */
export const PENDING_REFERRAL_DAYS = 90;

export type PendingReferral = {
  /** O código de quem indicou, como veio no link. */
  ref: string;
  /** Quando chegou. ISO. */
  at: string;
};

/**
 * O `ref` de uma query string, se houver e for plausível.
 *
 * O formato é o que `buildShareUrl` produz: os 8 primeiros caracteres de um
 * uuid. Validar a forma evita guardar lixo colado por engano no link — e
 * evita que um valor arbitrário de terceiro entre no armazenamento.
 */
export function parseReferral(search: string): string | null {
  const value = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('ref');
  if (!value) return null;
  const clean = value.trim().toLowerCase();
  return /^[0-9a-f]{8}$/.test(clean) ? clean : null;
}

/**
 * Guarda a indicação — PRIMEIRO toque vence.
 *
 * Quem apresentou o Pagora à pessoa foi quem mandou o primeiro link; um
 * segundo link, de outra pessoa, não desfaz isso. É também a regra que a
 * linguagem do programa sugere ("quem cadastrou"). Se o negócio preferir
 * último toque, é este `if` que muda — e só ele.
 */
export function rememberReferral(ref: string, now: Date = new Date()): void {
  try {
    if (readReferral(now)) return;
    const payload: PendingReferral = { ref, at: now.toISOString() };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Navegação privada ou armazenamento bloqueado. A indicação se perde,
    // e o app segue — nunca o contrário.
  }
}

/** A indicação pendente, se ainda estiver dentro do prazo. */
export function readReferral(now: Date = new Date()): PendingReferral | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PendingReferral>;
    if (typeof parsed?.ref !== 'string' || typeof parsed?.at !== 'string') return null;

    const at = new Date(parsed.at).getTime();
    if (!Number.isFinite(at)) return null;

    const dias = (now.getTime() - at) / 86_400_000;
    if (dias < 0 || dias > PENDING_REFERRAL_DAYS) {
      forgetReferral();
      return null;
    }

    return { ref: parsed.ref, at: parsed.at };
  } catch {
    return null;
  }
}

export function forgetReferral(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // idem
  }
}

/**
 * A indicação vale para este usuário?
 *
 * Ninguém indica a si mesmo. O `ref` são os 8 primeiros caracteres do uuid de
 * quem indicou — se batem com os do próprio usuário, a indicação é
 * descartada. Sem esta checagem, compartilhar o próprio link e abrir num
 * navegador limpo criaria uma auto-indicação.
 */
export function referralAppliesTo(userId: string, ref: string): boolean {
  return userId.replace(/-/g, '').slice(0, 8).toLowerCase() !== ref.toLowerCase();
}
