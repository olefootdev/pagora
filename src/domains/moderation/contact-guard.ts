// =====================================================================
// PAGORA — bloqueio de contato no chat (ponto 9)
// =====================================================================
// Impede que cliente e prestador troquem telefone, e-mail, link ou @ dentro
// do chat. O objetivo não é censura: é que o combinado fique registrado onde
// dá para arbitrar disputa. Conversa que migra para fora leva junto o preço,
// o prazo e a prova.
//
// O ERRO ÓBVIO QUE ESTA IMPLEMENTAÇÃO NÃO COMETE
//
// "Bloquear números" lido ao pé da letra quebra o produto. Este é um app de
// frete: quantidade, andar, medida, horário e preço são números, e são o
// conteúdo legítimo da conversa. "20 caixas, 3º andar, chego 14:30" precisa
// passar. O que não pode passar é número de CONTATO.
//
// Por isso a regra mira formato de contato, não dígito.
// =====================================================================

export type ContactKind = 'phone' | 'email' | 'url' | 'handle';

export type ContactFinding = {
  kind: ContactKind;
  /** Trecho exato que disparou a regra. Vai para a fila de moderação. */
  match: string;
};

export type GuardVerdict = {
  blocked: boolean;
  findings: ContactFinding[];
  /** Mensagem para o usuário. `null` quando não há bloqueio. */
  reason: string | null;
};

// ---------------------------------------------------------------------
// Normalização
// ---------------------------------------------------------------------

/**
 * Converte dígitos não-ASCII para ASCII.
 *
 * Sem isto, "９８７６５４３２１" (dígitos fullwidth, dois toques num teclado
 * japonês ou um copiar-colar) atravessa qualquer regex de `\d` que assuma
 * ASCII. É um buraco barato de fechar e caro de descobrir depois.
 */
export function normalizeDigits(text: string): string {
  // NFKC resolve os equivalentes de compatibilidade — fullwidth "９",
  // matemáticos "𝟵", circulados. Não resolve os dígitos de outros sistemas
  // (árabe-índico "٩", devanágari "९"), que são caracteres próprios e não
  // variantes: esses caem no laço abaixo.
  return text.normalize('NFKC').replace(/\p{Nd}/gu, (ch) => {
    const code = ch.codePointAt(0)!;
    if (ch >= '0' && ch <= '9') return ch;
    return String(valorDoDigito(code));
  });
}

const ehDigitoUnicode = (code: number): boolean => {
  try {
    return /\p{Nd}/u.test(String.fromCodePoint(code));
  } catch {
    return false;
  }
};

/**
 * Valor numérico de um dígito de qualquer sistema.
 *
 * Todo bloco decimal do Unicode é contíguo de zero a nove. O zero do bloco é
 * o único cujo antecessor não é dígito decimal — é isso que o laço procura.
 */
function valorDoDigito(code: number): number {
  for (let v = 0; v <= 9; v++) {
    if (ehDigitoUnicode(code - v) && !ehDigitoUnicode(code - v - 1)) return v;
  }
  return 0;
}

// ---------------------------------------------------------------------
// Telefone
// ---------------------------------------------------------------------

/** Caracteres que uma pessoa usa entre os dígitos de um telefone. */
const SEPARADORES = new Set([' ', '.', '-', '(', ')', '/', '+', ' ', '_']);

/**
 * Duas regras, e a razão de serem duas está no caso que elas separam.
 *
 * FORTE — 8+ dígitos com no máximo 3 separadores no bloco.
 *   Pega todo formato real: "11987654321", "(11) 98765-4321",
 *   "11 98765 4321", "98765-4321". Oito é o piso porque telefone fixo local,
 *   sem DDD, tem oito — e num marketplace de bairro o número local alcança
 *   a pessoa igual.
 *
 * EVASÃO — 9+ dígitos no bloco, não importa quantos separadores.
 *   Pega "1 1 9 8 7 6 5 4 3 2 1", que é como alguém burla a regra forte.
 *
 * O limiar da segunda é 9, não 8, por causa de um falso positivo concreto:
 * "levo 15 20 30 40 caixas" tem oito dígitos espalhados e é frase legítima.
 * Nove dígitos espalhados já implica DDD + celular, que não aparece por
 * acaso numa frase sobre carga.
 */
const MAX_SEPARADORES_FORTE = 3;
const MIN_DIGITOS_FORTE = 8;
const MIN_DIGITOS_EVASAO = 9;

/**
 * Data escrita com separador: "01/03/2026", "12-03", "5.4.26".
 *
 * Sem esta exceção, "consigo dia 01/03/2026" vira telefone — oito dígitos com
 * dois separadores é exatamente o formato forte. Data é das mensagens mais
 * prováveis num app de agendamento de frete.
 *
 * As âncoras existem para a data precisar ser um token inteiro. Sem elas,
 * "11.9.8765.4321" teria o miolo reconhecido como data e o telefone sairia
 * mascarado — a exceção viraria a brecha.
 *
 * Elas proíbem dígito grudado E separador SEGUIDO de dígito, em vez de
 * proibir separador. A diferença aparece em "Consigo no dia 01/03/2026.":
 * o ponto final é pontuação de frase, não separador de número, e a versão
 * ingênua rejeitava a data inteira por causa dele — bloqueando a mensagem
 * mais banal de um app de agendamento.
 */
const RE_DATA = /(?<!\d)(?<!\d[/.-])\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?(?!\d)(?![/.-]\d)/g;

/** Troca datas por espaço para elas não alimentarem o detector de telefone. */
function mascaraDatas(text: string): string {
  return text.replace(RE_DATA, (m) => ' '.repeat(m.length));
}

function achaTelefones(text: string): ContactFinding[] {
  const achados: ContactFinding[] = [];
  let bloco = '';
  let digitos = 0;

  const fecha = () => {
    // Separador que sobra no fim do bloco não separa nada. Contá-lo fazia o
    // veredito depender do que vinha DEPOIS dos dígitos: "levo 15 20 30 40"
    // bloqueava e "levo 15 20 30 40 caixas" não, porque o espaço final
    // empurrava a contagem para fora do limite. Mesmo texto, respostas
    // diferentes por acidente de pontuação.
    let fim = bloco.length;
    while (fim > 0 && !/[0-9]/.test(bloco[fim - 1]!)) fim -= 1;
    const enxuto = bloco.slice(0, fim);
    const sepsReais = enxuto.length - digitos;

    const forte = digitos >= MIN_DIGITOS_FORTE && sepsReais <= MAX_SEPARADORES_FORTE;
    const evasao = digitos >= MIN_DIGITOS_EVASAO;
    if (forte || evasao) achados.push({ kind: 'phone', match: enxuto });
    bloco = '';
    digitos = 0;
  };

  for (const ch of text) {
    if (ch >= '0' && ch <= '9') {
      bloco += ch;
      digitos += 1;
    } else if (SEPARADORES.has(ch) && digitos > 0) {
      bloco += ch;
    } else {
      fecha();
    }
  }
  fecha();
  return achados;
}

// ---------------------------------------------------------------------
// Telefone por extenso
// ---------------------------------------------------------------------

// "meia" é seis na leitura brasileira de telefone — quem dita número fala
// "meia" justamente para não confundir com "três". Deixar de fora seria
// deixar aberta a forma mais comum de ditar.
const PALAVRA_DIGITO: Record<string, string> = {
  zero: '0',
  um: '1',
  uma: '1',
  dois: '2',
  duas: '2',
  tres: '3',
  três: '3',
  quatro: '4',
  cinco: '5',
  seis: '6',
  meia: '6',
  sete: '7',
  oito: '8',
  nove: '9',
};

const MIN_PALAVRAS_SEQUENCIA = 8;

function achaTelefonePorExtenso(text: string): ContactFinding[] {
  const tokens = text
    .toLowerCase()
    .split(/[^a-zà-ÿ]+/i)
    .filter(Boolean);
  const achados: ContactFinding[] = [];
  let seq: string[] = [];

  const fecha = () => {
    if (seq.length >= MIN_PALAVRAS_SEQUENCIA) {
      achados.push({ kind: 'phone', match: seq.join(' ') });
    }
    seq = [];
  };

  for (const t of tokens) {
    if (PALAVRA_DIGITO[t] !== undefined) seq.push(t);
    else fecha();
  }
  fecha();
  return achados;
}

// ---------------------------------------------------------------------
// E-mail, link e @
// ---------------------------------------------------------------------

const RE_EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/gi;

/** "fulano arroba gmail ponto com" — a forma falada de escapar do regex. */
const RE_EMAIL_FALADO = /[\w.+-]+\s+(?:arroba|@)\s+[\w-]+\s+ponto\s+[\w]{2,}/gi;

// Encurtadores e canais de mensagem entram por nome porque são o destino
// mais provável de quem quer sair da plataforma.
const RE_URL =
  /\b(?:https?:\/\/|www\.)[^\s]+|\b[\w-]+\.(?:com|com\.br|net|org|br|me|ly|app|io|link|site)\b(?:\/[^\s]*)?/gi;

/** @ de rede social. Três caracteres para não pegar "@" solto nem "@2". */
const RE_HANDLE = /(?<![\w@])@[a-z0-9._]{3,}/gi;

function coleta(text: string, re: RegExp, kind: ContactKind): ContactFinding[] {
  return [...text.matchAll(re)].map((m) => ({ kind, match: m[0] }));
}

// ---------------------------------------------------------------------
// API
// ---------------------------------------------------------------------

const MOTIVO: Record<ContactKind, string> = {
  phone: 'Não dá para enviar telefone pelo chat.',
  email: 'Não dá para enviar e-mail pelo chat.',
  url: 'Não dá para enviar link pelo chat.',
  handle: 'Não dá para enviar perfil de rede social pelo chat.',
};

const EXPLICACAO =
  'Combine tudo por aqui: é o registro que a PAGORA usa se houver divergência sobre preço, prazo ou o que foi combinado.';

/**
 * Analisa uma mensagem antes de ela ser gravada.
 *
 * Puro e síncrono de propósito, para poder rodar nos dois lados.
 *
 * HOJE SÓ RODA NO CLIENTE, em `chat/message.service`. Isso barra o usuário do
 * app, que é por onde passa quase todo mundo, e NÃO barra quem chama o
 * PostgREST direto com o próprio token: a 0010 valida autoria e participação,
 * não conteúdo. Fechar exige a Edge Function `send-message` chamando esta
 * mesma função antes do insert. Enquanto ela não existe, esta é uma barreira
 * de produto, não de segurança — e é assim que deve ser descrita.
 */
export function guardMessage(text: string): GuardVerdict {
  const normalizado = normalizeDigits(text);

  const findings = [
    ...coleta(normalizado, RE_EMAIL, 'email'),
    ...coleta(normalizado, RE_EMAIL_FALADO, 'email'),
    ...coleta(normalizado, RE_URL, 'url'),
    ...coleta(normalizado, RE_HANDLE, 'handle'),
    ...achaTelefones(mascaraDatas(normalizado)),
    ...achaTelefonePorExtenso(normalizado),
  ];

  if (findings.length === 0) return { blocked: false, findings: [], reason: null };

  // A ordem de MOTIVO decide o que a pessoa lê quando há mais de um tipo.
  // Telefone primeiro porque é o vazamento que mais acontece.
  const ordem: ContactKind[] = ['phone', 'email', 'url', 'handle'];
  const principal = ordem.find((k) => findings.some((f) => f.kind === k))!;

  return {
    blocked: true,
    findings,
    reason: `${MOTIVO[principal]} ${EXPLICACAO}`,
  };
}
