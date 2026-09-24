// =====================================================================
// PAGORA — Placa e RENAVAM: normalização e validação local
// =====================================================================
// Zero dependência de API. Tudo aqui roda offline, no client, de graça.
//
// Por que isso importa mais do que parece: o cadastro é manual por decisão
// de produto, e placa digitada errada é o erro mais caro do fluxo — ela vira
// a chave de tudo (consulta veicular futura, vínculo de frota ANTT, laudo de
// sinistro). Validar no ponto de entrada custa zero e evita um registro
// podre que só aparece meses depois.
//
// Quando a consulta veicular paga entrar, esta camada continua valendo: ela
// é o filtro que impede gastar R$ 0,80 numa placa que nem existe.
// =====================================================================

export type PlateFormat = 'mercosul' | 'antiga';

export type PlateParseResult =
  | { ok: true; plate: string; format: PlateFormat; corrections: string[] }
  | { ok: false; reason: PlateError; input: string };

export type PlateError =
  | 'vazia'
  | 'tamanho_invalido'
  | 'caractere_invalido'
  | 'formato_desconhecido';

export const PLATE_ERROR_MESSAGES: Record<PlateError, string> = {
  vazia: 'Informe a placa do veículo.',
  tamanho_invalido: 'A placa precisa ter 7 caracteres (ex.: ABC1D23 ou ABC1234).',
  caractere_invalido: 'A placa aceita apenas letras e números.',
  formato_desconhecido: 'Formato não reconhecido. Use ABC1D23 (Mercosul) ou ABC1234 (antiga).',
};

// ─── Normalização ────────────────────────────────────────────────────

// Posição a posição, o que cada caractere PRECISA ser:
//   0 1 2 → letra    (sempre, nos dois formatos)
//   3     → dígito   (sempre, nos dois formatos)
//   4     → letra no Mercosul, dígito na antiga  ← única posição ambígua
//   5 6   → dígito   (sempre, nos dois formatos)
//
// Isso permite corrigir a confusão clássica O/0 e I/1 com segurança: numa
// posição que só aceita dígito, "O" só pode ser zero. Não é adivinhação.
const LETTER_LOOKALIKES: Record<string, string> = { '0': 'O', '1': 'I', '5': 'S', '8': 'B' };
const DIGIT_LOOKALIKES: Record<string, string> = { O: '0', Q: '0', I: '1', L: '1', S: '5', B: '8' };

/**
 * Tira tudo que não for alfanumérico e sobe para maiúscula.
 * Aceita "abc-1234", "ABC 1D23", "abc1d23" e devolve "ABC1234" / "ABC1D23".
 */
export const normalizePlate = (raw: string): string =>
  (raw ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]/g, '');

/**
 * Valida e corrige uma placa brasileira.
 *
 * Devolve também `corrections` — a lista legível do que foi ajustado. O
 * cadastro deve MOSTRAR isso ao prestador ("entendemos ABC1D23"), nunca
 * corrigir em silêncio: se a correção estiver errada, quem sabe é ele.
 */
export const parsePlate = (raw: string): PlateParseResult => {
  const input = raw ?? '';
  const cleaned = normalizePlate(input);

  if (cleaned.length === 0) return { ok: false, reason: 'vazia', input };
  if (/[^A-Z0-9]/.test(cleaned)) return { ok: false, reason: 'caractere_invalido', input };
  if (cleaned.length !== 7) return { ok: false, reason: 'tamanho_invalido', input };

  const chars = cleaned.split('');
  const corrections: string[] = [];

  const forceLetter = (i: number) => {
    const c = chars[i]!;
    const fixed = LETTER_LOOKALIKES[c];
    if (fixed) {
      chars[i] = fixed;
      corrections.push(`posição ${i + 1}: ${c} → ${fixed}`);
    }
  };
  const forceDigit = (i: number) => {
    const c = chars[i]!;
    const fixed = DIGIT_LOOKALIKES[c];
    if (fixed) {
      chars[i] = fixed;
      corrections.push(`posição ${i + 1}: ${c} → ${fixed}`);
    }
  };

  // Posições não-ambíguas: corrige com confiança.
  forceLetter(0);
  forceLetter(1);
  forceLetter(2);
  forceDigit(3);
  forceDigit(5);
  forceDigit(6);

  // Posição 4 decide o formato. Não corrigimos aqui — letra e dígito são
  // ambos legítimos, então qualquer "correção" seria chute.
  const p4 = chars[4]!;
  const plate = chars.join('');

  if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(plate)) {
    return { ok: true, plate, format: 'mercosul', corrections };
  }
  if (/^[A-Z]{3}\d{4}$/.test(plate)) {
    return { ok: true, plate, format: 'antiga', corrections };
  }

  // Chegou aqui: as 6 posições fixas estão certas mas a 5ª não é nem letra
  // nem dígito válido no contexto — ou as 3 primeiras não são letras.
  void p4;
  return { ok: false, reason: 'formato_desconhecido', input };
};

/** `true` se a placa é válida em qualquer um dos dois formatos. */
export const isValidPlate = (raw: string): boolean => parsePlate(raw).ok;

/** Formata para exibição: ABC1234 → "ABC-1234"; Mercosul fica sem hífen. */
export const formatPlate = (raw: string): string => {
  const parsed = parsePlate(raw);
  if (!parsed.ok) return normalizePlate(raw);
  return parsed.format === 'antiga'
    ? `${parsed.plate.slice(0, 3)}-${parsed.plate.slice(3)}`
    : parsed.plate;
};

/**
 * Converte placa antiga para o equivalente Mercosul.
 *
 * A regra oficial troca o 4º caractere (1º dígito) pela letra correspondente:
 * 0→A, 1→B, 2→C ... 9→J. Placa Mercosul volta inalterada.
 *
 * Serve para deduplicar: o mesmo veículo pode ter sido cadastrado com a placa
 * antiga por um prestador e a Mercosul por outro. Comparar pela forma
 * canônica evita frota duplicada.
 */
export const toMercosul = (raw: string): string | null => {
  const parsed = parsePlate(raw);
  if (!parsed.ok) return null;
  if (parsed.format === 'mercosul') return parsed.plate;
  const digit = parsed.plate[3]!;
  const letter = String.fromCharCode(65 + Number(digit)); // 0 → 'A'
  return `${parsed.plate.slice(0, 3)}${digit}${letter}${parsed.plate.slice(5)}`;
};

/**
 * Chave canônica para deduplicação e índice único no banco.
 * Placa antiga e sua Mercosul equivalente produzem a MESMA chave.
 */
export const plateKey = (raw: string): string | null => toMercosul(raw);

// ─── RENAVAM ─────────────────────────────────────────────────────────

/**
 * Valida RENAVAM (11 dígitos, último é verificador módulo 11).
 *
 * Zero API: o dígito verificador é aritmética pura. Pega erro de digitação
 * na hora, sem gastar consulta paga.
 *
 * Algoritmo: os 10 primeiros dígitos são multiplicados pelos pesos
 * 3,2,9,8,7,6,5,4,3,2; soma × 10 mod 11; resultado 10 ou 11 vira 0.
 */
export const isValidRenavam = (raw: string): boolean => {
  const digits = (raw ?? '').replace(/\D/g, '');
  // RENAVAM antigo tinha 9 dígitos; hoje é 11, com zeros à esquerda.
  if (digits.length < 9 || digits.length > 11) return false;
  const padded = digits.padStart(11, '0');

  // Rejeita repetições (00000000000, 11111111111...) — passam no módulo 11
  // por acidente aritmético mas nunca são RENAVAM real.
  if (/^(\d)\1{10}$/.test(padded)) return false;

  const base = padded.slice(0, 10);
  const check = Number(padded[10]);
  const weights = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const sum = base
    .split('')
    .reduce((acc, d, i) => acc + Number(d) * weights[i]!, 0);

  const rest = (sum * 10) % 11;
  const expected = rest === 10 || rest === 11 ? 0 : rest;

  return expected === check;
};

/** Normaliza RENAVAM para 11 dígitos com zeros à esquerda. */
export const normalizeRenavam = (raw: string): string | null => {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 11) return null;
  return digits.padStart(11, '0');
};
