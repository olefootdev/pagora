// =====================================================================
// PAGORA — Money (domínio compartilhado)
// =====================================================================
// REGRA FUNDAMENTAL: dinheiro é SEMPRE inteiro em centavos.
//
// O schema do banco já nasceu em centavos (`price_cents int`,
// `platform_fee_cents int`, `balance_cents int`). Introduzir numeric(12,2)
// agora criaria duas unidades convivendo no mesmo fluxo financeiro — que é
// exatamente a classe de bug que a modelagem monetária tenta evitar.
// Inteiro em centavos elimina erro de ponto flutuante por construção e é
// coerente com o que já está persistido.
//
// Nenhum valor daqui é autoridade: o backend recalcula tudo. Estas funções
// existem para (a) exibir estimativas na UI e (b) serem espelho exato da
// aritmética implementada em SQL, para que o teste de paridade tenha sentido.
// =====================================================================

/** Comissão da plataforma, em pontos percentuais. Espelha pagora.platform_fee_bps. */
export const PLATFORM_FEE_PERCENT = 15;

/** Mesma taxa em basis points — unidade usada no banco (1500 bps = 15,00%). */
export const PLATFORM_FEE_BPS = PLATFORM_FEE_PERCENT * 100;

/**
 * Arredondamento monetário half-up sobre inteiros.
 *
 * `Math.round(x * 0.15)` é proibido aqui: a multiplicação por um literal
 * binário inexato (0.15) pode cair logo abaixo do limite .5 e arredondar para
 * baixo onde o Postgres (numeric, decimal exato) arredonda para cima.
 * `(x * 15) / 100` mantém o numerador inteiro e exato; a divisão por 100 é
 * corretamente arredondada pelo IEEE-754 e todo valor de fronteira (n.5) é
 * exatamente representável em binário. Resultado: paridade bit a bit com
 * `round((x::numeric * 15) / 100)` do Postgres.
 */
export function percentOfCents(cents: number, percent: number): number {
  assertIntegerCents(cents);
  return Math.round((cents * percent) / 100);
}

/** Comissão da PAGORA sobre o valor bruto. */
export function platformFeeCents(grossCents: number): number {
  return percentOfCents(grossCents, PLATFORM_FEE_PERCENT);
}

export type FeeSplit = {
  /** Valor cheio cobrado do cliente. */
  grossCents: number;
  /** 15% retidos pela PAGORA. */
  platformFeeCents: number;
  /** Custo do gateway (Asaas). Sai da parte da PAGORA, não da do prestador. */
  gatewayFeeCents: number;
  /** O que o prestador recebe: bruto − comissão. Previsível, independe do gateway. */
  providerAmountCents: number;
  /** Margem real da plataforma depois do custo de adquirência. Pode ser negativa. */
  platformNetCents: number;
};

/**
 * Decomposição financeira canônica de um serviço.
 *
 * Decisão de produto (regra do exemplo R$300 → R$45 / R$255): o prestador
 * recebe exatamente `bruto − 15%`. A taxa do gateway é custo da plataforma,
 * não do prestador — caso contrário o líquido do prestador oscilaria conforme
 * o meio de pagamento escolhido pelo cliente, o que é injusto e impossível de
 * comunicar na proposta.
 */
export function splitFees(grossCents: number, gatewayFeeCents = 0): FeeSplit {
  assertIntegerCents(grossCents);
  assertIntegerCents(gatewayFeeCents);
  if (grossCents <= 0) throw new Error('grossCents deve ser positivo');
  if (gatewayFeeCents < 0) throw new Error('gatewayFeeCents não pode ser negativo');

  const fee = platformFeeCents(grossCents);
  return {
    grossCents,
    platformFeeCents: fee,
    gatewayFeeCents,
    providerAmountCents: grossCents - fee,
    platformNetCents: fee - gatewayFeeCents,
  };
}

function assertIntegerCents(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Valor monetário deve ser inteiro em centavos, recebido: ${value}`);
  }
}

/** Converte reais (número da UI) para centavos. Rejeita entrada não finita. */
export function reaisToCents(reais: number): number {
  if (!Number.isFinite(reais)) throw new Error(`Valor inválido em reais: ${reais}`);
  return Math.round(reais * 100);
}

/** Converte centavos para reais. Uso exclusivo de exibição. */
export function centsToReais(cents: number): number {
  assertIntegerCents(cents);
  return cents / 100;
}

/** Formata centavos como moeda brasileira: 25500 → "R$ 255,00". */
export function formatCents(cents: number): string {
  assertIntegerCents(cents);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
