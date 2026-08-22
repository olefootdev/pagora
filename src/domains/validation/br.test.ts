import { describe, it, expect } from 'vitest';
import {
  detectPixKeyType,
  isValidCEP,
  isValidCNPJ,
  isValidCPF,
  isValidMobilePhone,
  isValidPlate,
  maskCEP,
  maskCNPJ,
  maskCPF,
  maskCurrency,
  maskPhone,
  maskPlate,
  onlyDigits,
  toE164,
} from './br';

describe('CPF', () => {
  it.each(['529.982.247-25', '52998224725', '111.444.777-35', '11144477735'])(
    'aceita CPF válido: %s',
    (cpf) => {
      expect(isValidCPF(cpf)).toBe(true);
    },
  );

  it('recusa sequências repetidas — a armadilha do cálculo ingênuo', () => {
    // Os 10 CPFs de dígito único passam nos dois dígitos verificadores por
    // construção. São exatamente o que se digita para pular o campo.
    for (let d = 0; d <= 9; d++) {
      const repeated = String(d).repeat(11);
      expect(isValidCPF(repeated), `${repeated} não pode ser válido`).toBe(false);
    }
  });

  it('recusa CPF com dígito verificador errado', () => {
    expect(isValidCPF('529.982.247-26')).toBe(false);
    expect(isValidCPF('111.444.777-36')).toBe(false);
  });

  it('recusa comprimento errado e lixo', () => {
    for (const bad of ['', '123', '5299822472', '529982247251', 'abcdefghijk']) {
      expect(isValidCPF(bad), `"${bad}"`).toBe(false);
    }
  });

  it('é indiferente à pontuação', () => {
    expect(isValidCPF('529.982.247-25')).toBe(isValidCPF('52998224725'));
  });
});

describe('CNPJ', () => {
  it.each(['11.222.333/0001-81', '11222333000181'])('aceita CNPJ válido: %s', (cnpj) => {
    expect(isValidCNPJ(cnpj)).toBe(true);
  });

  it('recusa sequências repetidas', () => {
    for (let d = 0; d <= 9; d++) {
      expect(isValidCNPJ(String(d).repeat(14))).toBe(false);
    }
  });

  it('recusa dígito verificador errado e comprimento errado', () => {
    expect(isValidCNPJ('11.222.333/0001-82')).toBe(false);
    expect(isValidCNPJ('1122233300018')).toBe(false);
    expect(isValidCNPJ('')).toBe(false);
  });
});

describe('telefone celular', () => {
  it.each(['(11) 99999-8888', '11999998888', '+5511999998888', '5511999998888'])(
    'aceita celular válido: %s',
    (phone) => {
      expect(isValidMobilePhone(phone)).toBe(true);
    },
  );

  it('recusa fixo — o login é por SMS e fixo não recebe', () => {
    expect(isValidMobilePhone('(11) 3333-4444')).toBe(false);
    expect(isValidMobilePhone('1133334444')).toBe(false);
  });

  it('exige o 9 inicial do celular', () => {
    expect(isValidMobilePhone('11899998888')).toBe(false);
  });

  it('recusa DDD fora da faixa', () => {
    expect(isValidMobilePhone('10999998888')).toBe(false);
    expect(isValidMobilePhone('01999998888')).toBe(false);
  });

  it('toE164 normaliza e recusa o inválido', () => {
    expect(toE164('(11) 99999-8888')).toBe('+5511999998888');
    expect(toE164('+5511999998888')).toBe('+5511999998888');
    expect(() => toE164('(11) 3333-4444')).toThrow(/inválido/);
  });
});

describe('CEP', () => {
  it('aceita 8 dígitos', () => {
    expect(isValidCEP('01310-100')).toBe(true);
    expect(isValidCEP('01310100')).toBe(true);
  });

  it('recusa comprimento errado e zeros', () => {
    expect(isValidCEP('0131010')).toBe(false);
    expect(isValidCEP('00000000')).toBe(false);
  });
});

describe('placa', () => {
  it('aceita o padrão antigo e o Mercosul — a frota tem os dois', () => {
    expect(isValidPlate('ABC1234')).toBe(true);
    expect(isValidPlate('ABC-1234')).toBe(true);
    expect(isValidPlate('ABC1D23')).toBe(true);
    expect(isValidPlate('abc1d23')).toBe(true);
  });

  it('recusa formatos que não existem', () => {
    for (const bad of ['AB1234', 'ABCD123', '1234ABC', 'ABC12D3', '']) {
      expect(isValidPlate(bad), `"${bad}"`).toBe(false);
    }
  });
});

describe('chave Pix', () => {
  it.each([
    ['529.982.247-25', 'CPF'],
    ['11.222.333/0001-81', 'CNPJ'],
    ['prestador@pagora.com.br', 'EMAIL'],
    ['(11) 99999-8888', 'PHONE'],
    ['123e4567-e89b-12d3-a456-426614174000', 'EVP'],
  ])('detecta %s como %s', (key, type) => {
    expect(detectPixKeyType(key)).toBe(type);
  });

  it('recusa o que não é chave', () => {
    // Um CPF inválido não vira PHONE por acidente — a ordem de detecção
    // importa, e cada tipo é confirmado, não presumido.
    expect(detectPixKeyType('111.111.111-11')).toBeNull();
    expect(detectPixKeyType('não é chave')).toBeNull();
    expect(detectPixKeyType('')).toBeNull();
  });
});

describe('máscaras — formatação progressiva', () => {
  it('CPF se monta enquanto digita', () => {
    expect(maskCPF('529')).toBe('529');
    expect(maskCPF('5299')).toBe('529.9');
    expect(maskCPF('529982')).toBe('529.982');
    expect(maskCPF('52998224')).toBe('529.982.24');
    expect(maskCPF('52998224725')).toBe('529.982.247-25');
  });

  it('CPF ignora dígito além do 11º', () => {
    expect(maskCPF('529982247259999')).toBe('529.982.247-25');
  });

  it('CNPJ se monta enquanto digita', () => {
    expect(maskCNPJ('11')).toBe('11');
    expect(maskCNPJ('11222')).toBe('11.222');
    expect(maskCNPJ('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('telefone alterna entre 10 e 11 dígitos sem embaralhar', () => {
    expect(maskPhone('11')).toBe('(11');
    expect(maskPhone('1199')).toBe('(11) 99');
    expect(maskPhone('1199999')).toBe('(11) 9999-9');
    expect(maskPhone('11999998888')).toBe('(11) 99999-8888');
  });

  it('telefone descarta o 55 colado pelo autofill', () => {
    expect(maskPhone('5511999998888')).toBe('(11) 99999-8888');
  });

  it('CEP e placa', () => {
    expect(maskCEP('01310100')).toBe('01310-100');
    expect(maskPlate('abc1d23')).toBe('ABC-1D23');
    expect(maskPlate('ab')).toBe('AB');
  });

  it('moeda: digita-se em centavos', () => {
    expect(maskCurrency('1')).toBe('0,01');
    expect(maskCurrency('150')).toBe('1,50');
    expect(maskCurrency('30000')).toBe('300,00');
    expect(maskCurrency('')).toBe('');
  });

  it('máscara é idempotente — reaplicar não corrompe', () => {
    for (const [fn, input] of [
      [maskCPF, '529.982.247-25'],
      [maskCNPJ, '11.222.333/0001-81'],
      [maskPhone, '(11) 99999-8888'],
      [maskCEP, '01310-100'],
      [maskPlate, 'ABC-1D23'],
    ] as const) {
      expect(fn(fn(input)), `${input}`).toBe(fn(input));
    }
  });
});

describe('onlyDigits', () => {
  it('remove tudo que não é dígito', () => {
    expect(onlyDigits('(11) 99999-8888')).toBe('11999998888');
    expect(onlyDigits('R$ 1.234,56')).toBe('123456');
    expect(onlyDigits('abc')).toBe('');
  });
});
