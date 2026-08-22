// Testa a conversão monetária na fronteira com o Asaas. O módulo roda em Deno
// (Edge Function), mas é TypeScript puro sem nenhuma API do Deno — então dá
// para exercitá-lo aqui, que é onde a suíte já roda.
//
// Por que isso merece teste próprio: o gateway manda reais decimais e nós
// guardamos centavos inteiros. É a única multiplicação por 100 do sistema, e
// um erro de 1 centavo por transação é a divergência clássica que só aparece
// quando alguém tenta fechar o mês.
import { describe, it, expect } from 'vitest';
import {
  centsToGatewayAmount,
  gatewayAmountToCents,
} from '../../../supabase/functions/_shared/money.ts';

describe('gatewayAmountToCents', () => {
  it.each([
    [100, 10_000],
    [438.75, 43_875],
    [255, 25_500],
    [0.01, 1],
    [10.01, 1_001],
    [99.99, 9_999],
    [100.01, 10_001],
    [1.1, 110],
    [2.3, 230],
    [8.7, 870],
  ])('converte %f reais em %i centavos', (reais, cents) => {
    expect(gatewayAmountToCents(reais)).toBe(cents);
  });

  it('resolve os valores onde a multiplicação por 100 deixa resíduo binário', () => {
    // 8.7 * 100 === 869.9999999999999 em IEEE-754. Quem trunca (ou fatia a
    // string do produto) devolve 869 — um centavo a menos por transação,
    // sempre a favor da mesma parte. Há 9.174 valores assim entre R$ 0,01 e
    // R$ 2.000,00.
    expect(8.7 * 100).not.toBe(870);
    expect(Math.trunc(8.7 * 100)).toBe(869);
    expect(gatewayAmountToCents(8.7)).toBe(870);

    expect(Math.trunc(0.29 * 100)).toBe(28);
    expect(gatewayAmountToCents(0.29)).toBe(29);
  });

  it('aceita string, com ponto ou vírgula', () => {
    expect(gatewayAmountToCents('438.75')).toBe(43_875);
    expect(gatewayAmountToCents('438,75')).toBe(43_875);
    expect(gatewayAmountToCents('  100.00  ')).toBe(10_000);
    expect(gatewayAmountToCents('7')).toBe(700);
    expect(gatewayAmountToCents('7.5')).toBe(750);
  });

  it('lida com valor negativo (estorno)', () => {
    expect(gatewayAmountToCents('-25.50')).toBe(-2_550);
  });

  it('REJEITA entrada inesperada em vez de virar zero silenciosamente', () => {
    // Este é o ponto: se o Asaas mudar o formato ou mandar null, queremos uma
    // exceção que derruba o processamento do webhook — e deixa o evento com
    // process_error preenchido — e não um crédito de R$ 0,00 registrado como
    // sucesso.
    expect(() => gatewayAmountToCents(undefined)).toThrow(/ausente|inesperado/);
    expect(() => gatewayAmountToCents(null)).toThrow(/ausente|inesperado/);
    expect(() => gatewayAmountToCents('abc')).toThrow(/não reconhecido/);
    expect(() => gatewayAmountToCents('')).toThrow(/não reconhecido/);
    expect(() => gatewayAmountToCents(Number.NaN)).toThrow(/inválido/);
    expect(() => gatewayAmountToCents(Number.POSITIVE_INFINITY)).toThrow(/inválido/);
    expect(() => gatewayAmountToCents({ value: 10 })).toThrow(/inesperado/);
  });

  it('ida e volta preserva o valor', () => {
    for (let cents = 1; cents <= 200_000; cents += 977) {
      expect(gatewayAmountToCents(centsToGatewayAmount(cents))).toBe(cents);
    }
  });
});
