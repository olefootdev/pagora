// =====================================================================
// PAGORA — Testes de guincho e caçamba
// =====================================================================
// O eixo destes testes é a paridade com os números que já estavam no ar em
// `extra.tsx`, e a ausência de fallback silencioso. Um preço que muda sem
// alguém decidir é o bug mais caro que este projeto já teve.
// =====================================================================

import { describe, it, expect } from 'vitest';
import { PricingInputError } from './frete-pricing';
import {
  calcCacambaCents,
  calcGuinchoCents,
  CACAMBA_SIZE_CENTS,
  GUINCHO_BASE_FEE_CENTS,
  GUINCHO_PRICE_PER_KM_CENTS,
  GUINCHO_URGENCY_SURCHARGE_CENTS,
} from './service-pricing';

describe('guincho — paridade com os valores que já estavam no ar', () => {
  it('carro popular na rua: km × 15 + taxa de 60', () => {
    const r = calcGuinchoCents({ distanceKm: 8, vehicleType: 'popular', access: 'rua' });
    expect(r.lowCents).toBe(8 * GUINCHO_PRICE_PER_KM_CENTS + GUINCHO_BASE_FEE_CENTS);
    expect(r.lowCents).toBe(18_000); // R$ 180,00
  });

  it('faixa alta é +30%', () => {
    const r = calcGuinchoCents({ distanceKm: 8, vehicleType: 'popular' });
    expect(r.highCents).toBe(Math.round((r.lowCents * 13) / 10));
  });

  it('moto é mais barata que carro popular — pesa menos', () => {
    const moto = calcGuinchoCents({ distanceKm: 10, vehicleType: 'moto' });
    const carro = calcGuinchoCents({ distanceKm: 10, vehicleType: 'popular' });
    expect(carro.lowCents - moto.lowCents).toBe(2_000);
  });

  it('acesso difícil soma, acesso na rua não', () => {
    const rua = calcGuinchoCents({ distanceKm: 5, vehicleType: 'popular', access: 'rua' });
    const dificil = calcGuinchoCents({ distanceKm: 5, vehicleType: 'popular', access: 'dificil' });
    expect(dificil.lowCents - rua.lowCents).toBe(8_000);
  });

  it('urgência NÃO custa nada — "agora" sai igual a "agendado"', () => {
    // Este teste era o inverso: garantia que o guincho cobrava +50%. Foi
    // invertido em 25/08/2026, não deletado, pelo mesmo motivo do frete —
    // um teste que afirma a regra nova é o que impede a antiga de voltar
    // por descuido num refactor.
    const agendado = calcGuinchoCents({ distanceKm: 8, vehicleType: 'popular' });
    const agora = calcGuinchoCents({ distanceKm: 8, vehicleType: 'popular', urgency: 'now' });
    expect(agora.lowCents).toBe(agendado.lowCents);
    expect(agora.highCents).toBe(agendado.highCents);
  });

  it('a linha de urgência aparece no extrato, valendo R$ 0,00', () => {
    // Omitir a linha esconderia justamente o que o cliente quer confirmar
    // quando pede para agora: que não vai pagar a mais por isso.
    const agora = calcGuinchoCents({ distanceKm: 8, vehicleType: 'popular', urgency: 'now' });
    const linha = agora.lines.find((l) => l.label === 'Atendimento imediato');
    expect(linha).toBeDefined();
    expect(linha?.cents).toBe(0);
  });

  it('nenhuma linha do extrato menciona percentual de urgência', () => {
    const agora = calcGuinchoCents({ distanceKm: 8, vehicleType: 'popular', urgency: 'now' });
    expect(agora.lines.some((l) => l.label.includes('%'))).toBe(false);
  });

  it('veículo ausente estoura em vez de virar o preço do médio', () => {
    // Era `VEHICLE[x] ?? 30`: sem escolha, cobrava R$ 30 de sobretaxa em
    // silêncio. Agora é erro de programação e aparece.
    expect(() => calcGuinchoCents({ distanceKm: 8 })).toThrow(PricingInputError);
    expect(() => calcGuinchoCents({ distanceKm: 8, vehicleType: 'foguete' })).toThrow(
      PricingInputError,
    );
  });

  it('acesso desconhecido cai no padrão mais barato, nunca no mais caro', () => {
    const desconhecido = calcGuinchoCents({
      distanceKm: 5,
      vehicleType: 'popular',
      access: 'sei-la',
    });
    const rua = calcGuinchoCents({ distanceKm: 5, vehicleType: 'popular', access: 'rua' });
    expect(desconhecido.lowCents).toBe(rua.lowCents);
  });

  it('distância inválida estoura', () => {
    expect(() => calcGuinchoCents({ distanceKm: 0, vehicleType: 'popular' })).toThrow(
      PricingInputError,
    );
    expect(() => calcGuinchoCents({ distanceKm: -3, vehicleType: 'popular' })).toThrow(
      PricingInputError,
    );
  });
});

describe('urgência — a mesma regra nos três serviços', () => {
  it('a sobretaxa de urgência do guincho é zero, como a do frete', () => {
    // Ter "sem custo" num serviço e "+50%" no outro era a inconsistência que
    // virava reclamação. A constante fica nomeada para a regra ser visível.
    expect(GUINCHO_URGENCY_SURCHARGE_CENTS).toBe(0);
  });
});

describe('caçamba — paridade e ausência de fallback', () => {
  it('os três tamanhos mantêm os preços que já estavam no ar', () => {
    expect(CACAMBA_SIZE_CENTS[3]).toBe(18_000);
    expect(CACAMBA_SIZE_CENTS[5]).toBe(28_000);
    expect(CACAMBA_SIZE_CENTS[8]).toBe(38_000);
  });

  it('tamanho mais permanência somam', () => {
    const r = calcCacambaCents({ sizeM3: 5, days: 3 });
    expect(r.lowCents).toBe(28_000 + 6_000);
  });

  it('aceita string, porque vem de um botão', () => {
    expect(calcCacambaCents({ sizeM3: '8', days: '7' }).lowCents).toBe(38_000 + 12_000);
  });

  it('faixa alta é +15%', () => {
    const r = calcCacambaCents({ sizeM3: 3, days: 1 });
    expect(r.highCents).toBe(Math.round((18_000 * 23) / 20));
  });

  it('tamanho ausente estoura em vez de virar o de 5 m³', () => {
    // Era `SIZE[x] ?? 280`: quem não escolhesse pagava caçamba de 5 m³.
    expect(() => calcCacambaCents({ days: 3 })).toThrow(PricingInputError);
    expect(() => calcCacambaCents({ sizeM3: 12, days: 3 })).toThrow(PricingInputError);
  });

  it('período ausente estoura', () => {
    expect(() => calcCacambaCents({ sizeM3: 5 })).toThrow(PricingInputError);
    expect(() => calcCacambaCents({ sizeM3: 5, days: 30 })).toThrow(PricingInputError);
  });

  it('o extrato lista tamanho e permanência separados', () => {
    const r = calcCacambaCents({ sizeM3: 8, days: 7 });
    expect(r.lines).toHaveLength(2);
    expect(r.lines[0]?.label).toContain('8 m³');
    expect(r.lines[1]?.label).toContain('7 dias');
  });

  it('um dia fica no singular', () => {
    expect(calcCacambaCents({ sizeM3: 3, days: 1 }).lines[1]?.label).toContain('1 dia');
  });
});
