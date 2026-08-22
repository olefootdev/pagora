import { describe, it, expect } from 'vitest';
import {
  PLATFORM_FEE_BPS,
  PLATFORM_FEE_PERCENT,
  centsToReais,
  formatCents,
  percentOfCents,
  platformFeeCents,
  reaisToCents,
  splitFees,
} from './money';

describe('money — comissão da plataforma', () => {
  it('aplica 15% e devolve o líquido do prestador (exemplo canônico do produto)', () => {
    const split = splitFees(30_000); // R$ 300,00
    expect(split.platformFeeCents).toBe(4_500); // R$ 45,00
    expect(split.providerAmountCents).toBe(25_500); // R$ 255,00
    expect(split.platformFeeCents + split.providerAmountCents).toBe(split.grossCents);
  });

  it('R$ 1.000,00 → R$ 150,00 de taxa e R$ 850,00 pro prestador', () => {
    const split = splitFees(100_000);
    expect(split.platformFeeCents).toBe(15_000);
    expect(split.providerAmountCents).toBe(85_000);
  });

  it('taxa do gateway sai da parte da plataforma, nunca da do prestador', () => {
    const semGateway = splitFees(30_000);
    const comGateway = splitFees(30_000, 199); // R$ 1,99 de Pix

    expect(comGateway.providerAmountCents).toBe(semGateway.providerAmountCents);
    expect(comGateway.platformNetCents).toBe(4_500 - 199);
  });

  it('margem da plataforma pode ficar negativa em ticket pequeno — e isso é visível', () => {
    const split = splitFees(500, 199); // R$ 5,00 com R$ 1,99 de gateway
    expect(split.platformFeeCents).toBe(75);
    expect(split.platformNetCents).toBe(75 - 199);
    expect(split.platformNetCents).toBeLessThan(0);
  });

  it('nunca perde nem cria centavo: bruto = taxa + líquido do prestador', () => {
    for (let gross = 1; gross <= 5_000; gross += 7) {
      const split = splitFees(gross);
      expect(split.platformFeeCents + split.providerAmountCents).toBe(gross);
      expect(split.platformFeeCents).toBeGreaterThanOrEqual(0);
      expect(split.providerAmountCents).toBeGreaterThanOrEqual(0);
    }
  });

  it('rejeita valor bruto não positivo e centavo fracionário', () => {
    expect(() => splitFees(0)).toThrow(/positivo/);
    expect(() => splitFees(-100)).toThrow(/positivo/);
    expect(() => splitFees(10.5)).toThrow(/inteiro em centavos/);
    expect(() => splitFees(30_000, -1)).toThrow(/negativo/);
  });
});

describe('money — arredondamento financeiro', () => {
  // Estes casos são a razão de `percentOfCents` usar (x * 15) / 100 em vez de
  // x * 0.15: precisam bater exatamente com round((x::numeric * 15) / 100) do
  // Postgres, senão o ledger diverge do que o gateway cobrou.
  it.each([
    [1, 0], // R$ 0,01 → arredonda pra baixo
    [4, 1], // 0,60 centavo → 1
    [10, 2], // 1,5 centavo → half-up → 2
    [1_001, 150], // 150,15 → 150
    [1_003, 150], // 150,45 → 150
    [1_004, 151], // 150,60 → 151
    [9_999, 1_500], // 1499,85 → 1500
    [10_001, 1_500], // 1500,15 → 1500
    [30, 5], // 4,5 → half-up → 5
    [50, 8], // 7,5 → half-up → 8
    [70, 11], // 10,5 → half-up → 11
  ])('percentOfCents(%i, 15%%) = %i', (cents, expected) => {
    expect(percentOfCents(cents, PLATFORM_FEE_PERCENT)).toBe(expected);
  });

  it('valores de fronteira .5 sempre arredondam para cima (half-up, igual ao Postgres)', () => {
    // x * 15 / 100 cai exatamente em n.5 quando x*15 ≡ 50 (mod 100).
    const boundaries = [10, 30, 50, 70, 90, 110, 130];
    for (const cents of boundaries) {
      const exact = (cents * 15) / 100;
      expect(exact % 1).toBe(0.5);
      expect(percentOfCents(cents, 15)).toBe(Math.floor(exact) + 1);
    }
  });

  it('platformFeeCents é monotônica — mais bruto nunca gera menos taxa', () => {
    let prev = -1;
    for (let gross = 1; gross <= 20_000; gross += 13) {
      const fee = platformFeeCents(gross);
      expect(fee).toBeGreaterThanOrEqual(prev);
      prev = fee;
    }
  });

  it('PLATFORM_FEE_BPS espelha o percentual usado no banco', () => {
    expect(PLATFORM_FEE_BPS).toBe(1500);
  });
});

describe('money — conversões', () => {
  it.each([
    [0.01, 1],
    [10.01, 1_001],
    [99.99, 9_999],
    [100.01, 10_001],
    [255, 25_500],
  ])('reaisToCents(%f) = %i', (reais, cents) => {
    expect(reaisToCents(reais)).toBe(cents);
    expect(centsToReais(cents)).toBeCloseTo(reais, 2);
  });

  it('formata em BRL', () => {
    // O Intl insere U+00A0 (espaco nao separavel) depois de "R$" — normalizamos
    // para espaco comum antes de comparar, senao o teste vira refem do ICU.
    const brl = (cents: number) => formatCents(cents).replace(/\u00a0/g, ' ');
    expect(brl(25_500)).toBe('R$ 255,00');
    expect(brl(1)).toBe('R$ 0,01');
  });

  it('rejeita entrada não finita', () => {
    expect(() => reaisToCents(Number.NaN)).toThrow(/inválido/);
    expect(() => reaisToCents(Number.POSITIVE_INFINITY)).toThrow(/inválido/);
  });
});
