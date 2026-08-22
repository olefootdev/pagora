// =====================================================================
// PAGORA — conversão monetária na fronteira com o gateway
// =====================================================================
// O Asaas trafega valores em REAIS decimais ("value": 438.75). O nosso lado
// inteiro é centavo. Esta é a única multiplicação por 100 do sistema, e um erro
// de 1 centavo por transação é a divergência clássica que só aparece quando
// alguém tenta fechar o mês.
//
// O produto `v * 100` carrega resíduo binário em boa parte do domínio —
// 8.7 * 100 é 869.9999999999999, e existem 9.174 valores assim só entre R$ 0,01
// e R$ 2.000,00. `Math.round` por acaso absorve todos eles nessa faixa, mas
// qualquer variação (truncar, fatiar a string do produto, somar antes de
// converter) passa a errar um centavo sempre para o mesmo lado.
//
// Em vez de depender dessa propriedade empírica, reconstruímos a representação
// decimal pretendida (`toFixed(2)`) e lemos os dígitos: a conversão passa a ser
// exata por construção, e uma entrada em formato inesperado vira exceção em vez
// de virar zero.
// =====================================================================

/** Converte um valor monetário do gateway (reais) para centavos inteiros. */
export function gatewayAmountToCents(value: unknown): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`valor monetário inválido do gateway: ${value}`);
    }
    // `toFixed(2)` reconstrói a representação decimal pretendida antes de
    // qualquer multiplicação, eliminando o resíduo binário.
    return parseDecimalToCents(value.toFixed(2));
  }
  if (typeof value === 'string') {
    return parseDecimalToCents(value.trim());
  }
  throw new Error(`valor monetário ausente ou de tipo inesperado: ${typeof value}`);
}

function parseDecimalToCents(text: string): number {
  const match = /^(-)?(\d+)(?:[.,](\d{1,2}))?$/.exec(text);
  if (!match) {
    throw new Error(`valor monetário não reconhecido: "${text}"`);
  }
  const [, sign, whole, frac = ''] = match;
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`valor monetário fora da faixa segura: "${text}"`);
  }
  return sign === '-' ? -cents : cents;
}

/** Centavos → o decimal em reais que o Asaas espera receber. */
export function centsToGatewayAmount(cents: number): number {
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`centavos inválidos: ${cents}`);
  }
  return Number((cents / 100).toFixed(2));
}
