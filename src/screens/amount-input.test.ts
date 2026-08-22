// O campo de saque é uma entrada monetária digitada à mão — o lugar mais
// provável do app para alguém digitar "1.500" e receber R$ 15,00. O parser
// precisa ser explícito sobre a convenção brasileira (ponto = milhar,
// vírgula = decimal) e recusar o que não entende, em vez de chutar.
import { describe, it, expect } from 'vitest';
import { parseAmountToCents } from './provider-financeiro';

describe('parseAmountToCents', () => {
  it.each([
    ['10', 1_000],
    ['10,50', 1_050],
    ['0,01', 1],
    ['1500', 150_000],
    ['1.500', 150_000], // ponto como separador de milhar
    ['1.500,25', 150_025],
    ['1234567,89', 123_456_789],
    ['10.00', 1_000], // ponto decimal também é aceito quando não há vírgula
    ['  25,90  ', 2_590],
  ])('"%s" → %i centavos', (input, cents) => {
    expect(parseAmountToCents(input)).toBe(cents);
  });

  it('"1.500" vale R$ 1.500,00 e não R$ 1,50 — a diferença é de mil vezes', () => {
    expect(parseAmountToCents('1.500')).toBe(150_000);
    expect(parseAmountToCents('1,50')).toBe(150);
  });

  it('recusa entrada inválida em vez de adivinhar', () => {
    for (const bad of ['', '   ', 'abc', '10,5,3', '-10', '10,555', 'R$ 10', '10.5.5']) {
      expect(parseAmountToCents(bad), `deveria recusar "${bad}"`).toBeNull();
    }
  });

  it('nunca devolve fração de centavo', () => {
    for (const input of ['10', '10,1', '10,99', '0,05', '999,99']) {
      const cents = parseAmountToCents(input);
      expect(Number.isSafeInteger(cents)).toBe(true);
    }
  });
});
