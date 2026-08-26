// =====================================================================
// PAGORA — Rótulos de recomendação das propostas
// =====================================================================
// A auditoria encontrou a tela de propostas como uma lista ordenada por preço,
// sem rótulo nenhum. O usuário — na rua, no telefone, muitas vezes numa obra —
// tinha que fazer a análise sozinho, e por isso escolhia sempre a mais barata.
// Nem sempre é a certa: a mais barata pode ser a de nota 3,1.
//
// REGRA QUE NÃO SE QUEBRA: um rótulo só aparece na proposta que realmente o
// merece. Se a mesma proposta é a mais barata E a mais rápida, ela recebe o
// rótulo mais informativo e o outro NÃO é repassado para a segunda colocada.
// Escrever "mais econômico" em algo que não é o mais barato é mentira, e
// mentira em tela de preço destrói o produto inteiro.
// =====================================================================

export type Badge = 'value' | 'fastest' | 'cheapest';

export const BADGE_LABEL: Record<Badge, string> = {
  value: 'Melhor custo-benefício',
  fastest: 'Mais rápido',
  cheapest: 'Mais econômico',
};

export type QuoteLike = {
  id: string;
  priceCents: number;
  etaMinutes?: number | null;
  rating?: number | null;
};

/**
 * Tolerância de preço para o "melhor custo-benefício": a proposta precisa
 * estar até 25% acima da mais barata. Acima disso não é custo-benefício, é
 * só uma proposta cara com nota boa — e o usuário deve ver isso como escolha
 * dele, não como recomendação nossa.
 */
export const VALUE_PRICE_TOLERANCE_NUM = 5;
export const VALUE_PRICE_TOLERANCE_DEN = 4;

/** Nota mínima para uma proposta poder ser recomendada como custo-benefício. */
export const VALUE_MIN_RATING = 4;

/**
 * Vencedor por um critério — só quando ele é ESTRITAMENTE melhor que todos.
 *
 * Empate não produz vencedor. Chamar de "mais econômica" uma proposta que
 * custa igual a outra é a mesma mentira que chamar de mais barata quem não é:
 * o superlativo promete uma distinção que não existe. Sem vencedor, o rótulo
 * simplesmente não aparece — e a tela fica com dois rótulos verdadeiros em
 * vez de três, sendo um deles inventado.
 */
function strictWinner(
  quotes: QuoteLike[],
  measure: (q: QuoteLike) => number | null,
): QuoteLike | undefined {
  const scored = quotes
    .map((q) => ({ q, v: measure(q) }))
    .filter((x): x is { q: QuoteLike; v: number } => x.v != null && Number.isFinite(x.v));

  if (scored.length === 0) return undefined;

  const best = Math.min(...scored.map((x) => x.v));
  const winners = scored.filter((x) => x.v === best);
  return winners.length === 1 ? winners[0]?.q : undefined;
}

function cheapestOf(quotes: QuoteLike[]): QuoteLike | undefined {
  return strictWinner(quotes, (q) => q.priceCents);
}

function fastestOf(quotes: QuoteLike[]): QuoteLike | undefined {
  // ETA ausente, zero ou negativa não é "chega na hora": é ausência de
  // informação, e quem não informou não disputa este rótulo.
  return strictWinner(quotes, (q) =>
    q.etaMinutes != null && q.etaMinutes > 0 ? q.etaMinutes : null,
  );
}

/** O mais barato para efeito de teto de custo-benefício — aqui empate serve. */
function lowestPriceCents(quotes: QuoteLike[]): number | undefined {
  if (quotes.length === 0) return undefined;
  return Math.min(...quotes.map((q) => q.priceCents));
}

function bestValueOf(quotes: QuoteLike[]): QuoteLike | undefined {
  const floor = lowestPriceCents(quotes);
  if (floor === undefined) return undefined;

  const ceiling = Math.round((floor * VALUE_PRICE_TOLERANCE_NUM) / VALUE_PRICE_TOLERANCE_DEN);

  const candidates = quotes.filter(
    (q) => q.priceCents <= ceiling && (q.rating ?? 0) >= VALUE_MIN_RATING,
  );
  if (candidates.length === 0) return undefined;

  return [...candidates].sort(
    (a, b) =>
      (b.rating ?? 0) - (a.rating ?? 0) || a.priceCents - b.priceCents || a.id.localeCompare(b.id),
  )[0];
}

/**
 * Um rótulo por proposta, no máximo. Prioridade: custo-benefício, depois mais
 * rápido, depois mais econômico — do mais informativo ao mais óbvio.
 *
 * Uma proposta que ganha dois rótulos fica só com o de maior prioridade; o
 * outro simplesmente não aparece na tela. Preferimos dois rótulos verdadeiros
 * a três, sendo um deles falso.
 */
export function recommend(quotes: QuoteLike[]): Map<string, Badge> {
  const out = new Map<string, Badge>();
  if (quotes.length < 2) return out;

  const winners: ReadonlyArray<readonly [Badge, QuoteLike | undefined]> = [
    ['value', bestValueOf(quotes)],
    ['fastest', fastestOf(quotes)],
    ['cheapest', cheapestOf(quotes)],
  ];

  for (const [badge, quote] of winners) {
    if (quote && !out.has(quote.id)) out.set(quote.id, badge);
  }

  return out;
}

/**
 * Ordem de exibição: recomendada primeiro, depois as demais por preço.
 * A lista não é "por preço" nem "por nota" — é pela leitura que queremos que
 * a pessoa faça em três segundos.
 */
export function orderForDisplay<T extends QuoteLike>(quotes: T[], badges: Map<string, Badge>): T[] {
  const rank: Record<Badge, number> = { value: 0, fastest: 1, cheapest: 2 };
  return [...quotes].sort((a, b) => {
    const ra = badges.has(a.id) ? rank[badges.get(a.id)!] : 3;
    const rb = badges.has(b.id) ? rank[badges.get(b.id)!] : 3;
    return ra - rb || a.priceCents - b.priceCents || a.id.localeCompare(b.id);
  });
}
