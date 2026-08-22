// =====================================================================
// PAGORA — validação de documentos e formatos brasileiros
// =====================================================================
// Funções puras, sem dependência de React ou de zod. Os schemas em
// `schemas.ts` consomem daqui.
//
// Por que dígito verificador de verdade e não `length === 11`: o CPF entra no
// cadastro do pagador no gateway e na conta de recebimento do prestador. Um
// CPF sintaticamente plausível mas inválido só é recusado lá na frente, no
// meio de um pagamento — e aí o erro chega como "gateway recusou", que não
// diz a ninguém o que fazer.
// =====================================================================

/** Só os dígitos. `"123.456.789-09"` → `"12345678909"`. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida CPF pelos dois dígitos verificadores.
 *
 * O caso que a checagem ingênua deixa passar: sequências repetidas
 * ("111.111.111-11") satisfazem o cálculo dos DVs por construção — a soma
 * ponderada de um dígito constante sempre fecha. São 10 CPFs "válidos" que não
 * existem, e é o valor que um usuário digita quando quer pular o campo.
 */
export function isValidCPF(input: string): boolean {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  for (const [length, factor] of [
    [9, 10],
    [10, 11],
  ] as const) {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(cpf[i]) * (factor - i);
    }
    const remainder = (sum * 10) % 11;
    const digit = remainder === 10 ? 0 : remainder;
    if (digit !== Number(cpf[length])) return false;
  }
  return true;
}

/** Valida CNPJ pelos dois dígitos verificadores. Mesma armadilha da sequência. */
export function isValidCNPJ(input: string): boolean {
  const cnpj = onlyDigits(input);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const check = (length: number): number => {
    let sum = 0;
    let weight = length - 7;
    for (let i = 0; i < length; i++) {
      sum += Number(cnpj[i]) * weight;
      weight = weight - 1 < 2 ? 9 : weight - 1;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return check(12) === Number(cnpj[12]) && check(13) === Number(cnpj[13]);
}

/**
 * Telefone celular brasileiro. Exige o 9 inicial no celular — fixo não recebe
 * SMS, e o login do Pagora é por OTP.
 */
export function isValidMobilePhone(input: string): boolean {
  const digits = onlyDigits(input).replace(/^55/, '');
  if (digits.length !== 11) return false;
  const ddd = Number(digits.slice(0, 2));
  // DDDs válidos vão de 11 a 99, mas nem todos existem. Checamos a faixa e o
  // 9 obrigatório; a validade real quem atesta é o SMS chegar.
  if (ddd < 11 || ddd > 99) return false;
  return digits[2] === '9';
}

/** CEP: 8 dígitos, e não pode ser tudo zero. */
export function isValidCEP(input: string): boolean {
  const cep = onlyDigits(input);
  return cep.length === 8 && !/^0{8}$/.test(cep);
}

/**
 * Placa de veículo — aceita o padrão antigo (ABC1234) e o Mercosul
 * (ABC1D23). O frota do Pagora tem veículos dos dois períodos, então recusar
 * o formato antigo excluiria prestador legítimo.
 */
export function isValidPlate(input: string): boolean {
  const plate = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (plate.length !== 7) return false;
  return /^[A-Z]{3}\d{4}$/.test(plate) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(plate);
}

/** Chave Pix: CPF, CNPJ, e-mail, telefone ou chave aleatória (EVP/UUID). */
export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';

export function detectPixKeyType(input: string): PixKeyType | null {
  const value = input.trim();
  if (!value) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return 'EVP';
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return 'EMAIL';

  const digits = onlyDigits(value);
  if (digits.length === 11 && isValidCPF(digits)) return 'CPF';
  if (digits.length === 14 && isValidCNPJ(digits)) return 'CNPJ';
  if (isValidMobilePhone(value)) return 'PHONE';
  return null;
}

// ---------------------------------------------------------------------
// Máscaras — formatação progressiva, aplicada enquanto o usuário digita.
// Cada uma é tolerante a entrada parcial: nunca "corrige" o que ainda está
// sendo digitado, só posiciona os separadores do que já existe.
// ---------------------------------------------------------------------
export function maskCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

export function maskCNPJ(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function maskPhone(value: string): string {
  const d = onlyDigits(value).replace(/^55/, '').slice(0, 11);
  if (d.length <= 2) return d.replace(/^(\d{0,2})/, '($1');
  if (d.length <= 6) return d.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

export function maskCEP(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, '$1-$2');
}

export function maskPlate(value: string): string {
  const clean = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7);
  return clean.length > 3 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
}

/** Máscara monetária: digita-se em centavos, exibe-se em reais. */
export function maskCurrency(value: string): string {
  const cents = onlyDigits(value).slice(0, 11);
  if (!cents) return '';
  const asNumber = Number(cents) / 100;
  return asNumber.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Converte E.164 para o formato que o usuário lê. */
export function formatPhoneForDisplay(e164: string): string {
  return maskPhone(e164);
}

/** Normaliza para E.164 (`+5511999998888`). Lança se não for celular válido. */
export function toE164(input: string): string {
  if (!isValidMobilePhone(input)) {
    throw new Error('Telefone celular inválido — use (11) 99999-9999');
  }
  return `+55${onlyDigits(input).replace(/^55/, '')}`;
}
