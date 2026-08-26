import { describe, it, expect } from 'vitest';
import { orderCode, spellOrderCode } from './order-code';

// uuids v4 reais o suficiente para o teste — o que importa é a forma.
const A = 'a7f3c210-4b8e-4c11-9d22-6e5f1a2b3c4d';
const B = 'b1c2d3e4-1111-2222-3333-444455556666';

describe('orderCode', () => {
  it('é determinístico — o mesmo pedido tem sempre o mesmo código', () => {
    expect(orderCode(A)).toBe(orderCode(A));
  });

  it('não usa os caracteres que se confundem ao telefone', () => {
    // I/1, L/1, O/0 e o U (que forma palavrão com frequência num código que
    // o cliente lê em voz alta para o transportador).
    for (let i = 0; i < 400; i++) {
      const id = `${i.toString(16).padStart(8, '0')}-4b8e-4c11-9d22-6e5f1a2b3c4d`;
      const code = orderCode(id).slice(4); // sem o prefixo PAG-
      expect(code).not.toMatch(/[ILOU]/);
    }
  });

  it('tem sempre o mesmo formato: PAG- e 4 caracteres', () => {
    for (let i = 0; i < 200; i++) {
      const id = `${i.toString(16).padStart(8, '0')}-1111-2222-3333-444455556666`;
      expect(orderCode(id)).toMatch(/^PAG-[0-9A-HJ-NP-TV-Z]{4}$/);
    }
  });

  it('pedidos diferentes tendem a códigos diferentes', () => {
    expect(orderCode(A)).not.toBe(orderCode(B));
  });

  it('espalha bem entre ids parecidos — o caso real de pedidos do mesmo dia', () => {
    // uuid v4 criados perto no tempo NÃO compartilham prefixo (v4 é
    // aleatório), mas um id sequencial é o pior caso possível para uma
    // derivação preguiçosa que só olhasse os primeiros dígitos.
    const codes = new Set<string>();
    for (let i = 0; i < 500; i++) {
      codes.add(orderCode(`00000000-0000-4000-8000-${i.toString(16).padStart(12, '0')}`));
    }
    // Com 500 sorteios em ~1M de combinações, o aniversário prevê ~0,1
    // colisão. Exigir 495 únicos deixa margem generosa e ainda reprova
    // qualquer implementação que agrupe.
    expect(codes.size).toBeGreaterThanOrEqual(495);
  });

  it('ignora os hífens do uuid — a mesma identidade, o mesmo código', () => {
    expect(orderCode(A)).toBe(orderCode(A.replace(/-/g, '')));
  });

  it('é insensível a maiúsculas no uuid', () => {
    expect(orderCode(A)).toBe(orderCode(A.toUpperCase()));
  });
});

describe('spellOrderCode', () => {
  it('separa para ser ditado caractere a caractere', () => {
    const code = orderCode(A); // PAG-XXXX
    const spelled = spellOrderCode(A);
    // Sete símbolos (P A G + 4), separados por espaço.
    expect(spelled.split(' ')).toHaveLength(7);
    expect(spelled.replace(/ /g, '')).toBe(code.replace('-', ''));
  });
});
