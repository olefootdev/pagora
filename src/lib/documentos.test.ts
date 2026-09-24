import { describe, it, expect } from 'vitest';
import {
  isValidCPF,
  formatCPF,
  isValidCNPJ,
  formatCNPJ,
  normalizeCNPJ,
  isAlphanumericCNPJ,
  parseTransporterDoc,
  transporterKindMatchesDoc,
  isValidRNTRCFormat,
  normalizeRNTRC,
} from './documentos';

// CPF e CNPJ de teste com dígitos verificadores conferidos à mão.
const CPF_OK = '52998224725';
const CNPJ_OK = '11222333000181';

describe('isValidCPF', () => {
  it('aceita CPF com DV correto', () => {
    expect(isValidCPF(CPF_OK)).toBe(true);
    expect(isValidCPF('529.982.247-25')).toBe(true);
  });

  it('recusa DV errado', () => {
    expect(isValidCPF('52998224724')).toBe(false);
  });

  it('recusa repetições que passam no módulo 11 por acidente', () => {
    // 111.111.111-11 tem DV aritmeticamente "correto" e não é CPF.
    expect(isValidCPF('11111111111')).toBe(false);
    expect(isValidCPF('00000000000')).toBe(false);
  });

  it('recusa tamanho errado', () => {
    expect(isValidCPF('529982247')).toBe(false);
  });
});

describe('formatCPF', () => {
  it('formata progressivamente conforme digita', () => {
    expect(formatCPF(CPF_OK)).toBe('529.982.247-25');
    expect(formatCPF('529982')).toBe('529.982');
  });
});

describe('isValidCNPJ — numérico', () => {
  it('aceita CNPJ com DV correto', () => {
    expect(isValidCNPJ(CNPJ_OK)).toBe(true);
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true);
  });

  it('recusa DV errado', () => {
    expect(isValidCNPJ('11222333000182')).toBe(false);
  });

  it('recusa repetições', () => {
    expect(isValidCNPJ('11111111111111')).toBe(false);
  });
});

describe('isValidCNPJ — alfanumérico', () => {
  // O formato alfanumérico usa o mesmo módulo 11 com valor = ASCII - 48.
  // O CNPJ numérico é subconjunto exato: valida idêntico pelos dois caminhos.
  it('CNPJ numérico continua válido sob a regra alfanumérica', () => {
    expect(isValidCNPJ(CNPJ_OK)).toBe(true);
  });

  it('exige que os 2 últimos dígitos sejam numéricos', () => {
    expect(isValidCNPJ('11222333000ABC')).toBe(false);
  });

  it('detecta formato alfanumérico', () => {
    expect(isAlphanumericCNPJ(CNPJ_OK)).toBe(false);
    // 12 primeiras com letra → alfanumérico (independente de validade do DV)
    expect(isAlphanumericCNPJ('AB222333000181')).toBe(true);
  });
});

describe('normalizeCNPJ / formatCNPJ', () => {
  it('normaliza removendo pontuação e subindo caixa', () => {
    expect(normalizeCNPJ('11.222.333/0001-81')).toBe(CNPJ_OK);
    expect(normalizeCNPJ('ab222333000181')).toBe('AB222333000181');
  });

  it('formata com a máscara padrão', () => {
    expect(formatCNPJ(CNPJ_OK)).toBe('11.222.333/0001-81');
  });
});

describe('parseTransporterDoc', () => {
  it('CPF só habilita TAC', () => {
    const r = parseTransporterDoc(CPF_OK);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.kind).toBe('cpf');
      expect(r.allowedTypes).toEqual(['TAC']);
    }
  });

  it('CNPJ habilita ETC e CTC', () => {
    const r = parseTransporterDoc(CNPJ_OK);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.kind).toBe('cnpj');
      expect(r.allowedTypes).toEqual(['ETC', 'CTC']);
    }
  });

  it('recusa documento inválido', () => {
    expect(parseTransporterDoc('52998224724')).toMatchObject({ ok: false, reason: 'invalido' });
  });

  it('recusa tamanho que não é nem CPF nem CNPJ', () => {
    expect(parseTransporterDoc('12345')).toMatchObject({ ok: false, reason: 'tamanho' });
  });
});

describe('transporterKindMatchesDoc', () => {
  it('pega a inconsistência ETC declarada com CPF antes de gastar consulta', () => {
    expect(transporterKindMatchesDoc('ETC', CPF_OK)).toBe(false);
    expect(transporterKindMatchesDoc('TAC', CPF_OK)).toBe(true);
    expect(transporterKindMatchesDoc('ETC', CNPJ_OK)).toBe(true);
    expect(transporterKindMatchesDoc('TAC', CNPJ_OK)).toBe(false);
  });
});

describe('RNTRC', () => {
  it('valida apenas o formato de 8 dígitos', () => {
    expect(isValidRNTRCFormat('12345678')).toBe(true);
    expect(isValidRNTRCFormat('1234567')).toBe(false);
    expect(isValidRNTRCFormat('ABCDEFGH')).toBe(false);
  });

  it('normaliza removendo pontuação', () => {
    expect(normalizeRNTRC('1234-5678')).toBe('12345678');
    expect(normalizeRNTRC('123')).toBeNull();
  });
});
