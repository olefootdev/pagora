// =====================================================================
// PAGORA — Líquido do prestador com e sem a migration 0007
// =====================================================================
// Estes testes existem por causa de um caso concreto: com as migrations
// 0005–0010 ainda não aplicadas, `provider_amount_cents` não existe no banco
// e a tela do prestador mostrava "Você recebe R$ 0,00" para um serviço de
// R$ 300. Zero silencioso em tela de dinheiro é o bug mais caro deste
// projeto — foi o que fez quem escolhia van pagar preço de baú.
// =====================================================================

import { describe, it, expect } from 'vitest';
import { providerNetCents } from './order.service';
import { splitFees } from '../money';

describe('providerNetCents', () => {
  it('usa a coluna do banco quando ela existe', () => {
    expect(
      providerNetCents({
        price_cents: 30_000,
        platform_fee_cents: 4_500,
        provider_amount_cents: 25_500,
      }),
    ).toBe(25_500);
  });

  it('deriva quando a coluna não existe — mesmo valor, não aproximação', () => {
    // É a conta do backfill da própria 0007:
    //   provider_amount_cents = price_cents - platform_fee_cents
    expect(providerNetCents({ price_cents: 30_000, platform_fee_cents: 4_500 })).toBe(25_500);
    expect(
      providerNetCents({
        price_cents: 30_000,
        platform_fee_cents: 4_500,
        provider_amount_cents: null,
      }),
    ).toBe(25_500);
  });

  it('derivado bate com o `splitFees` que o prestador vê antes de propor', () => {
    // O número prometido na hora de enviar a proposta tem que ser o mesmo
    // que aparece depois na viagem. Se divergirem, é reclamação garantida.
    for (const bruto of [10_000, 18_050, 30_000, 127_349]) {
      const split = splitFees(bruto);
      expect(
        providerNetCents({ price_cents: bruto, platform_fee_cents: split.platformFeeCents }),
      ).toBe(split.providerAmountCents);
    }
  });

  it('coluna zerada cai na derivação — zero não é líquido válido', () => {
    // A 0007 cria a coluna com `default 0` e só depois faz o backfill. Uma
    // linha que escapou do backfill não pode virar "recebe nada".
    expect(
      providerNetCents({
        price_cents: 30_000,
        platform_fee_cents: 4_500,
        provider_amount_cents: 0,
      }),
    ).toBe(25_500);
  });

  it('nunca devolve negativo', () => {
    // Comissão maior que o bruto não deveria existir, mas se um dado torto
    // chegar, a tela mostra R$ 0,00 — nunca um líquido negativo.
    expect(providerNetCents({ price_cents: 1_000, platform_fee_cents: 5_000 })).toBe(0);
  });
});
