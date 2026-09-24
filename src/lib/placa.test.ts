import { describe, it, expect } from 'vitest';
import {
  normalizePlate,
  parsePlate,
  isValidPlate,
  formatPlate,
  toMercosul,
  plateKey,
  isValidRenavam,
  normalizeRenavam,
} from './placa';

describe('normalizePlate', () => {
  it('remove separadores e sobe para maiúscula', () => {
    expect(normalizePlate('abc-1234')).toBe('ABC1234');
    expect(normalizePlate('ABC 1D23')).toBe('ABC1D23');
    expect(normalizePlate(' abc.1d23 ')).toBe('ABC1D23');
  });

  it('tolera entrada vazia sem explodir', () => {
    expect(normalizePlate('')).toBe('');
    expect(normalizePlate(undefined as unknown as string)).toBe('');
  });
});

describe('parsePlate — formatos válidos', () => {
  it('reconhece Mercosul', () => {
    const r = parsePlate('ABC1D23');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.format).toBe('mercosul');
      expect(r.plate).toBe('ABC1D23');
      expect(r.corrections).toEqual([]);
    }
  });

  it('reconhece placa antiga', () => {
    const r = parsePlate('ABC-1234');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.format).toBe('antiga');
      expect(r.plate).toBe('ABC1234');
    }
  });
});

describe('parsePlate — correção posicional O/0', () => {
  // Este é o valor concreto do módulo: cadastro manual erra O por 0 toda hora.
  it('corrige 0 → O nas três primeiras posições (só aceitam letra)', () => {
    const r = parsePlate('0BC1234'); // zero no lugar de O
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plate).toBe('OBC1234');
      expect(r.corrections).toHaveLength(1);
      expect(r.corrections[0]).toContain('posição 1');
    }
  });

  it('corrige O → 0 na quarta posição (só aceita dígito)', () => {
    const r = parsePlate('ABCO234');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plate).toBe('ABC0234');
      expect(r.corrections[0]).toContain('posição 4');
    }
  });

  it('corrige I → 1 nas duas últimas posições', () => {
    const r = parsePlate('ABC12I1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.plate).toBe('ABC1211');
  });

  it('NÃO mexe na 5ª posição — letra e dígito são ambos legítimos ali', () => {
    // 'O' na posição 5 poderia ser letra (Mercosul) ou zero (antiga).
    // Corrigir seria chute, então o parse recusa e devolve o erro.
    const mercosul = parsePlate('ABC1O23');
    expect(mercosul.ok).toBe(true);
    if (mercosul.ok) {
      expect(mercosul.format).toBe('mercosul');
      // preservou o O como letra, sem inventar correção na posição 5
      expect(mercosul.plate).toBe('ABC1O23');
      expect(mercosul.corrections.every((c) => !c.includes('posição 5'))).toBe(true);
    }
  });
});

describe('parsePlate — rejeições', () => {
  it('recusa vazia', () => {
    const r = parsePlate('');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('vazia');
  });

  it('recusa tamanho errado', () => {
    expect(parsePlate('ABC123')).toMatchObject({ ok: false, reason: 'tamanho_invalido' });
    expect(parsePlate('ABC12345')).toMatchObject({ ok: false, reason: 'tamanho_invalido' });
  });

  it('recusa formato irrecuperável', () => {
    // 4 letras seguidas não existe em nenhum dos dois formatos
    expect(parsePlate('ABCD123')).toMatchObject({ ok: false, reason: 'formato_desconhecido' });
  });
});

describe('isValidPlate', () => {
  it.each(['ABC1D23', 'ABC1234', 'abc-1234', 'XYZ9Z99'])('aceita %s', (p) => {
    expect(isValidPlate(p)).toBe(true);
  });

  it.each(['', 'ABC', 'ABCD123', '1234567'])('recusa %s', (p) => {
    expect(isValidPlate(p)).toBe(false);
  });
});

describe('formatPlate', () => {
  it('põe hífen na antiga e deixa Mercosul limpa', () => {
    expect(formatPlate('ABC1234')).toBe('ABC-1234');
    expect(formatPlate('ABC1D23')).toBe('ABC1D23');
  });
});

describe('toMercosul', () => {
  it('converte o 1º dígito na letra correspondente (0→A … 9→J)', () => {
    expect(toMercosul('ABC0234')).toBe('ABC0A34');
    expect(toMercosul('ABC1234')).toBe('ABC1B34');
    expect(toMercosul('ABC9234')).toBe('ABC9J34');
  });

  it('devolve Mercosul inalterada', () => {
    expect(toMercosul('ABC1D23')).toBe('ABC1D23');
  });

  it('devolve null para placa inválida', () => {
    expect(toMercosul('XX')).toBeNull();
  });
});

describe('plateKey — deduplicação', () => {
  it('placa antiga e sua Mercosul equivalente geram a MESMA chave', () => {
    // O mesmo veículo cadastrado nos dois formatos por prestadores diferentes
    // não pode virar duas linhas de frota.
    expect(plateKey('ABC1234')).toBe(plateKey('ABC1B34'));
  });

  it('veículos diferentes geram chaves diferentes', () => {
    expect(plateKey('ABC1234')).not.toBe(plateKey('ABC1235'));
  });
});

describe('isValidRenavam', () => {
  it('aceita RENAVAM com dígito verificador correto', () => {
    // base 0000000001 → soma 2 → (2*10) % 11 = 9 → DV 9
    expect(isValidRenavam('00000000019')).toBe(true);
  });

  it('recusa dígito verificador errado', () => {
    expect(isValidRenavam('00000000018')).toBe(false);
  });

  it('recusa repetições', () => {
    expect(isValidRenavam('11111111111')).toBe(false);
    expect(isValidRenavam('00000000000')).toBe(false);
  });

  it('recusa tamanho fora de 9–11 dígitos', () => {
    expect(isValidRenavam('123')).toBe(false);
    expect(isValidRenavam('123456789012')).toBe(false);
  });
});

describe('normalizeRenavam', () => {
  it('preenche com zeros à esquerda até 11', () => {
    expect(normalizeRenavam('123456789')).toBe('00123456789');
  });

  it('devolve null fora do intervalo', () => {
    expect(normalizeRenavam('12')).toBeNull();
  });
});
