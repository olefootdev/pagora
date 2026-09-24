// =====================================================================
// PAGORA — CPF / CNPJ / RNTRC: validação local
// =====================================================================
// Zero API. Dígito verificador é aritmética — não precisa consultar ninguém
// para saber que "111.111.111-11" não é CPF.
//
// Importa para o PAGORA CHECK porque o RNTRC é emitido sobre a pessoa, não
// sobre o veículo:
//   TAC (Transportador Autônomo de Cargas) → CPF
//   ETC (Empresa de Transporte de Cargas)  → CNPJ
//   CTC (Cooperativa de Transporte)        → CNPJ
// Então validar o documento é pré-requisito de qualquer consulta ao RNTRC —
// e é o filtro barato que evita gastar consulta paga com lixo digitado.
// =====================================================================

export type TransporterKind = 'TAC' | 'ETC' | 'CTC';

// ─── CPF ─────────────────────────────────────────────────────────────

const cpfCheckDigit = (base: string, startWeight: number): number => {
  const sum = base
    .split('')
    .reduce((acc, d, i) => acc + Number(d) * (startWeight - i), 0);
  const rest = (sum * 10) % 11;
  return rest === 10 || rest === 11 ? 0 : rest;
};

export const isValidCPF = (raw: string): boolean => {
  const d = (raw ?? '').replace(/\D/g, '');
  if (d.length !== 11) return false;
  // Repetições passam no módulo 11 por acidente aritmético. 111.111.111-11
  // tem dígitos verificadores "corretos" e não é CPF.
  if (/^(\d)\1{10}$/.test(d)) return false;

  return (
    cpfCheckDigit(d.slice(0, 9), 10) === Number(d[9]) &&
    cpfCheckDigit(d.slice(0, 10), 11) === Number(d[10])
  );
};

export const formatCPF = (raw: string): string => {
  const d = (raw ?? '').replace(/\D/g, '').slice(0, 11);
  return d.replace(/^(\d{3})(\d{3})?(\d{3})?(\d{2})?/, (_, a, b, c, e) =>
    [a, b, c].filter(Boolean).join('.') + (e ? `-${e}` : ''),
  );
};

// ─── CNPJ ────────────────────────────────────────────────────────────

// CNPJ alfanumérico: a Receita Federal definiu que novas inscrições passam a
// aceitar letras nas 12 primeiras posições, mantendo os 2 dígitos
// verificadores numéricos. O cálculo é o mesmo módulo 11, trocando o dígito
// pelo valor ASCII menos 48 — '0'→0 … '9'→9, 'A'→17, 'B'→18 … 'Z'→42.
//
// Implementamos os dois porque CNPJ numérico é subconjunto exato do
// alfanumérico sob essa regra: um CNPJ antigo valida idêntico pelos dois
// caminhos. Não há custo em suportar ambos, e há custo real em recusar o
// cadastro de uma transportadora nova.
//
// ATENÇÃO: confirmar a data de vigência com a Receita antes do go-live. A
// aritmética abaixo é estável, o calendário não é.
const charValue = (c: string): number => c.charCodeAt(0) - 48;

const CNPJ_WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

const cnpjCheckDigit = (base: string, weights: number[]): number => {
  const sum = base
    .split('')
    .reduce((acc, c, i) => acc + charValue(c) * weights[i]!, 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
};

export const normalizeCNPJ = (raw: string): string =>
  (raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export const isValidCNPJ = (raw: string): boolean => {
  const v = normalizeCNPJ(raw);
  if (v.length !== 14) return false;
  // Os 2 últimos são sempre numéricos, mesmo no formato alfanumérico.
  if (!/^[A-Z0-9]{12}\d{2}$/.test(v)) return false;
  // Repetição de um mesmo caractere nunca é CNPJ real.
  if (/^(.)\1{13}$/.test(v)) return false;

  return (
    cnpjCheckDigit(v.slice(0, 12), CNPJ_WEIGHTS_1) === Number(v[12]) &&
    cnpjCheckDigit(v.slice(0, 13), CNPJ_WEIGHTS_2) === Number(v[13])
  );
};

export const formatCNPJ = (raw: string): string => {
  const v = normalizeCNPJ(raw).slice(0, 14);
  if (v.length !== 14) return v;
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
};

/** `true` se o CNPJ usa o formato alfanumérico novo (tem letra nas 12 primeiras). */
export const isAlphanumericCNPJ = (raw: string): boolean => {
  const v = normalizeCNPJ(raw);
  return v.length === 14 && /[A-Z]/.test(v.slice(0, 12));
};

// ─── Documento do transportador ──────────────────────────────────────

export type TransporterDoc =
  | { ok: true; kind: 'cpf'; value: string; allowedTypes: TransporterKind[] }
  | { ok: true; kind: 'cnpj'; value: string; allowedTypes: TransporterKind[] }
  | { ok: false; reason: 'invalido' | 'tamanho' };

/**
 * Identifica se o documento é CPF ou CNPJ e quais categorias de transportador
 * ele pode assumir no RNTRC.
 *
 * Regra de negócio embutida: TAC é pessoa física (CPF); ETC e CTC são pessoa
 * jurídica (CNPJ). Isso já elimina uma classe de cadastro inconsistente antes
 * de qualquer consulta externa — prestador que se declara ETC com CPF é erro
 * de preenchimento, não caso para gastar consulta na ANTT.
 */
export const parseTransporterDoc = (raw: string): TransporterDoc => {
  const digits = (raw ?? '').replace(/\D/g, '');
  const alnum = normalizeCNPJ(raw);

  if (digits.length === 11) {
    return isValidCPF(digits)
      ? { ok: true, kind: 'cpf', value: digits, allowedTypes: ['TAC'] }
      : { ok: false, reason: 'invalido' };
  }
  if (alnum.length === 14) {
    return isValidCNPJ(alnum)
      ? { ok: true, kind: 'cnpj', value: alnum, allowedTypes: ['ETC', 'CTC'] }
      : { ok: false, reason: 'invalido' };
  }
  return { ok: false, reason: 'tamanho' };
};

/** Coerência entre a categoria declarada e o tipo de documento. */
export const transporterKindMatchesDoc = (kind: TransporterKind, doc: string): boolean => {
  const parsed = parseTransporterDoc(doc);
  return parsed.ok && parsed.allowedTypes.includes(kind);
};

// ─── RNTRC ───────────────────────────────────────────────────────────

/**
 * Valida o FORMATO do RNTRC (8 dígitos numéricos).
 *
 * Deliberadamente só formato: não existe dígito verificador público no RNTRC,
 * e a única fonte de verdade sobre situação (ativo/suspenso/baixado) é a
 * ANTT. Esta função responde "vale a pena consultar?", nunca "está regular?".
 *
 * Confundir as duas coisas seria o pior bug possível deste módulo — marcaria
 * como verificado um transportador que ninguém verificou.
 */
export const isValidRNTRCFormat = (raw: string): boolean =>
  /^\d{8}$/.test((raw ?? '').replace(/\D/g, ''));

export const normalizeRNTRC = (raw: string): string | null => {
  const d = (raw ?? '').replace(/\D/g, '');
  return /^\d{8}$/.test(d) ? d : null;
};
