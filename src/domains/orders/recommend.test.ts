import { describe, it, expect } from 'vitest';
import { orderForDisplay, recommend, type QuoteLike } from './recommend';

const q = (
  id: string,
  priceCents: number,
  etaMinutes?: number | null,
  rating?: number | null,
): QuoteLike => ({ id, priceCents, etaMinutes: etaMinutes ?? null, rating: rating ?? null });

describe('recommend', () => {
  it('não rotula nada quando há uma proposta só', () => {
    // Com uma opção não existe comparação, e "mais econômico" num universo de
    // um é enfeite que finge escolha.
    expect(recommend([q('a', 18_000, 30, 4.9)]).size).toBe(0);
  });

  it('rotula os três papéis quando são propostas diferentes', () => {
    const badges = recommend([
      q('barata', 12_000, 90, 3.2),
      q('rapida', 30_000, 12, 4.1),
      q('boa', 14_000, 45, 4.9),
    ]);
    expect(badges.get('boa')).toBe('value');
    expect(badges.get('rapida')).toBe('fastest');
    expect(badges.get('barata')).toBe('cheapest');
  });

  it('a mesma proposta nunca recebe dois rótulos', () => {
    const badges = recommend([q('a', 10_000, 10, 4.8), q('b', 20_000, 60, 4.0)]);
    expect(badges.get('a')).toBe('value');
    expect([...badges.values()].filter((v) => v === ('a' as never))).toHaveLength(0);
    expect(badges.size).toBe(1);
  });

  it('o rótulo perdido NÃO desce para a segunda colocada', () => {
    // O ponto central: 'b' não é a mais barata nem a mais rápida. Rotulá-la
    // com o que sobrou seria mentir na tela onde o preço é decidido.
    const badges = recommend([q('a', 10_000, 10, 4.8), q('b', 20_000, 60, 4.0)]);
    expect(badges.has('b')).toBe(false);
  });
});

describe('recommend — custo-benefício', () => {
  it('não recomenda proposta cara só porque tem nota boa', () => {
    // 30.000 está acima do teto de 25% sobre 12.000.
    const badges = recommend([q('barata', 12_000, 60, 3.0), q('cara', 30_000, 60, 5.0)]);
    expect(badges.get('cara')).toBeUndefined();
    expect(badges.get('barata')).toBe('cheapest');
  });

  it('recomenda quando o preço está dentro dos 25% e a nota é 4 ou mais', () => {
    const badges = recommend([q('barata', 12_000, 60, 3.0), q('boa', 15_000, 60, 4.5)]);
    expect(badges.get('boa')).toBe('value');
  });

  it('nota abaixo de 4 não vira recomendação', () => {
    const badges = recommend([q('a', 12_000, 60, 3.9), q('b', 13_000, 30, 3.8)]);
    expect([...badges.values()]).not.toContain('value');
  });

  it('prestador sem nota não é recomendado como custo-benefício', () => {
    // Nota ausente não é nota boa. Recomendar quem ninguém avaliou transfere
    // ao usuário um risco que ele não pediu para correr.
    const badges = recommend([q('a', 12_000, 60, null), q('b', 13_000, 30, null)]);
    expect([...badges.values()]).not.toContain('value');
  });
});

describe('recommend — mais rápido', () => {
  it('ignora propostas sem ETA', () => {
    const badges = recommend([q('sem', 10_000, null, 3.0), q('com', 20_000, 40, 3.0)]);
    expect(badges.get('com')).toBe('fastest');
  });

  it('sem nenhuma ETA, ninguém é o mais rápido', () => {
    const badges = recommend([q('a', 10_000, null, 3.0), q('b', 20_000, null, 3.0)]);
    expect([...badges.values()]).not.toContain('fastest');
  });

  it('ETA zero ou negativa não conta', () => {
    const badges = recommend([q('a', 10_000, 0, 3.0), q('b', 20_000, 40, 3.0)]);
    expect(badges.get('b')).toBe('fastest');
  });
});

describe('recommend — empate e estabilidade', () => {
  it('empate no preço não elege ninguém como o mais econômico', () => {
    // Duas propostas de R$ 100 e nenhuma é "a mais econômica": o superlativo
    // promete uma distinção que não existe.
    const badges = recommend([q('a', 10_000, 30, 3), q('z', 10_000, 45, 3)]);
    expect([...badges.values()]).not.toContain('cheapest');
  });

  it('empate no ETA não elege ninguém como o mais rápido', () => {
    const badges = recommend([q('a', 12_000, 60, 3), q('z', 30_000, 60, 3)]);
    expect([...badges.values()]).not.toContain('fastest');
    // A mais barata continua sendo estritamente a mais barata.
    expect(badges.get('a')).toBe('cheapest');
  });

  it('a ordem de entrada não muda os rótulos', () => {
    const set = [q('z', 14_000, 45, 4.9), q('a', 10_000, 90, 3.1), q('m', 30_000, 20, 4.2)];
    const first = recommend(set);
    const second = recommend([...set].reverse());
    expect([...first.entries()].sort()).toEqual([...second.entries()].sort());
  });
});

describe('orderForDisplay', () => {
  it('recomendada primeiro, depois rápida, depois barata, depois o resto por preço', () => {
    const quotes = [
      q('barata', 12_000, 90, 3.2),
      q('resto', 25_000, 70, 3.0),
      q('rapida', 14_500, 12, 4.1),
      q('boa', 14_000, 45, 4.9),
    ];
    const ordered = orderForDisplay(quotes, recommend(quotes)).map((x) => x.id);
    expect(ordered).toEqual(['boa', 'rapida', 'barata', 'resto']);
  });

  it('sem rótulo nenhum, ordena por preço', () => {
    const quotes = [q('b', 20_000), q('a', 10_000)];
    expect(orderForDisplay(quotes, new Map()).map((x) => x.id)).toEqual(['a', 'b']);
  });
});
