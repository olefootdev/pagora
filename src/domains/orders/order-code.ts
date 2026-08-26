// =====================================================================
// PAGORA — Código falável do pedido
// =====================================================================
// `#A7F3C210` é impossível de ditar por telefone, e ditar o código do pedido
// é coisa que acontece o tempo todo: o transportador liga para o cliente do
// portão, o cliente liga para o suporte, o operador anota num papel.
// Hexadecimal tem B/D/E/P que se confundem ao telefone, tem 0/O, tem 1/I.
//
// O código curto é DERIVADO do uuid — determinístico, sem coluna nova, sem
// migration. O uuid continua sendo a identidade; isto é só como um humano
// diz o pedido em voz alta.
//
// PAG-4K7M
// ^^^ prefixo que diz de onde é   ^^^^ 4 caracteres do alfabeto sem ambiguidade
//
// 32 símbolos, 4 posições = 1.048.576 combinações. Colisão existe e é
// aceitável de propósito: o código NUNCA é chave de busca sozinho — ele
// acompanha o pedido que a pessoa já tem aberto, e serve para conferir
// ("é o PAG-4K7M mesmo?"), não para localizar.
// =====================================================================

/**
 * Alfabeto Crockford-like: sem `I`, `L`, `O` e `U`.
 *
 * As três primeiras se confundem com `1` e `0` ao telefone e na letra de
 * quem anota com luva. O `U` sai porque, combinado com as outras, forma
 * palavrão em português com frequência desconfortável para um código que
 * o cliente lê em voz alta para o transportador.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LENGTH = 4;
const PREFIX = 'PAG';

/**
 * Código falável de um pedido. Sempre 4 caracteres, sempre o mesmo para o
 * mesmo id.
 *
 * Usa TODOS os dígitos hexadecimais do uuid, não só os primeiros: dois
 * pedidos criados no mesmo instante compartilham o começo do uuid v4 com
 * mais frequência do que o fim, e um código que colide para pedidos do
 * mesmo dia seria pior que inútil.
 */
export function orderCode(id: string): string {
  const hex = id.replace(/-/g, '').toLowerCase();

  // Acumulador de 32 bits com mistura tipo FNV. Não é hash criptográfico e
  // não precisa ser — precisa espalhar, ser estável e caber em JS sem
  // BigInt.
  let h = 0x811c9dc5;
  for (let i = 0; i < hex.length; i++) {
    h ^= hex.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }

  let out = '';
  for (let i = 0; i < LENGTH; i++) {
    out += ALPHABET[h % ALPHABET.length];
    h = Math.floor(h / ALPHABET.length);
    // Re-mistura quando o acumulador se esgota, para o 4º caractere não
    // ficar sempre preso num punhado de valores.
    if (h === 0) h = Math.imul(h ^ i ^ 0x9e3779b9, 0x01000193) >>> 0;
  }

  return `${PREFIX}-${out}`;
}

/** Como o código é ditado: "P A G, quatro, K, sete, M". */
export function spellOrderCode(id: string): string {
  // O hífen SAI antes de separar. Trocá-lo por espaço e confiar em
  // `filter(Boolean)` não funciona: espaço é truthy, e o resultado sai com
  // buracos duplos.
  return orderCode(id).replace('-', '').split('').join(' ');
}
