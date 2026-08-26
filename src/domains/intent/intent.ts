// =====================================================================
// PAGORA — Leitura de intenção
// =====================================================================
// A auditoria apontou que a jornada começava pela taxonomia da empresa:
// "que serviço você precisa?", com quatro categorias internas. Quem tem três
// toneladas de entulho na calçada não pensa "caçamba ou frete" — pensa
// "preciso tirar isso daqui".
//
// Este módulo traduz. Recebe o que a pessoa escreveu e devolve as
// necessidades prováveis, em ordem, com os termos que dispararam cada uma —
// para a tela poder mostrar o PORQUÊ da sugestão em vez de adivinhar em
// silêncio. Quando o palpite estiver errado, o usuário vê onde erramos.
//
// Não é classificador estatístico e não deve virar um. É uma tabela de termos
// do vocabulário real de quem contrata transporte no Brasil — legível,
// testável e corrigível por quem conhece o negócio, sem treinar nada.
// =====================================================================

import type { ServiceType } from '../../lib/database.types';

export type NeedKind = 'entulho' | 'mudanca' | 'material' | 'carga' | 'veiculo' | 'maquina';

export type Need = {
  kind: NeedKind;
  /** Serviço do backend que atende esta necessidade. Não muda de contrato. */
  service: ServiceType;
  label: string;
  /** 0 a 1. Acima de 0,5 a tela pode sugerir direto; abaixo, oferece opções. */
  confidence: number;
  /** Termos do texto que dispararam a sugestão, na ordem em que pesaram. */
  matched: string[];
};

/** Pistas numéricas extraídas do mesmo texto — preenchem o pedido sozinhas. */
export type Hints = {
  tons?: number;
  cubicMeters?: number;
  helpers?: number;
  /** `true` quando a pessoa escreveu urgência ("hoje", "agora", "urgente"). */
  urgent?: boolean;
};

export type IntentReading = {
  needs: Need[];
  hints: Hints;
};

// ---------------------------------------------------------------------
// Vocabulário
// ---------------------------------------------------------------------
// Peso 3 = o termo praticamente decide sozinho ("guincho", "entulho").
// Peso 2 = forte, mas ambíguo fora de contexto ("mudança", "tijolo").
// Peso 1 = pista de apoio; sozinho não sustenta uma sugestão ("obra", "caixa").

type Entry = { kind: NeedKind; service: ServiceType; weight: number; terms: string[] };

const VOCAB: Entry[] = [
  {
    kind: 'entulho',
    service: 'cacamba',
    weight: 3,
    terms: ['entulho', 'cacamba', 'cacambas', 'escombro', 'escombros', 'demolicao'],
  },
  {
    kind: 'entulho',
    service: 'cacamba',
    weight: 2,
    terms: ['retirar lixo', 'lixo de obra', 'restos de obra', 'terra', 'galhos', 'podas'],
  },
  {
    kind: 'entulho',
    service: 'cacamba',
    weight: 1,
    terms: ['obra', 'reforma', 'construcao', 'quintal', 'limpeza'],
  },

  {
    kind: 'veiculo',
    service: 'guincho',
    weight: 3,
    terms: ['guincho', 'reboque', 'rebocar', 'guinchar'],
  },
  {
    kind: 'veiculo',
    service: 'guincho',
    weight: 2,
    terms: [
      'carro quebrou',
      'carro parado',
      'nao liga',
      'nao pega',
      'pane',
      'bateria arriada',
      'pneu furado',
      'acidente',
      'colisao',
      'sem combustivel',
      'sem gasolina',
      'ficou na estrada',
    ],
  },
  {
    kind: 'veiculo',
    service: 'guincho',
    weight: 1,
    terms: ['moto', 'carro', 'veiculo', 'socorro'],
  },

  {
    kind: 'mudanca',
    service: 'frete',
    weight: 3,
    terms: ['mudanca', 'mudar de casa', 'mudar de apartamento', 'me mudar'],
  },
  {
    kind: 'mudanca',
    service: 'frete',
    weight: 2,
    terms: [
      'sofa',
      'geladeira',
      'fogao',
      'guarda roupa',
      'guarda-roupa',
      'armario',
      'cama',
      'colchao',
      'maquina de lavar',
      'moveis',
      'movel',
      'eletrodomestico',
      'eletrodomesticos',
    ],
  },
  {
    kind: 'mudanca',
    service: 'frete',
    weight: 1,
    terms: ['apartamento', 'casa', 'escritorio', 'quarto', 'sala'],
  },

  {
    kind: 'material',
    service: 'frete',
    weight: 2,
    terms: [
      'tijolo',
      'tijolos',
      'cimento',
      'areia',
      'brita',
      'telha',
      'telhas',
      'argamassa',
      'drywall',
      'madeira',
      'vergalhao',
      'bloco',
      'blocos',
      'saco de cimento',
      'material de construcao',
      'placa',
      'placas',
    ],
  },

  {
    kind: 'carga',
    service: 'frete',
    weight: 2,
    terms: [
      'mercadoria',
      'mercadorias',
      'encomenda',
      'encomendas',
      'palete',
      'pallet',
      'estoque',
      'lote',
      'carga',
      'transporte de carga',
      'produtos',
    ],
  },
  { kind: 'carga', service: 'frete', weight: 1, terms: ['caixa', 'caixas', 'volume', 'volumes'] },

  {
    kind: 'maquina',
    service: 'frete',
    weight: 2,
    terms: [
      'maquina',
      'maquinario',
      'equipamento',
      'gerador',
      'empilhadeira',
      'compressor',
      'motor',
      'betoneira',
      'torno',
    ],
  },
];

/** Todas as necessidades, na ordem em que aparecem na home. */
export const NEED_KINDS = [
  'entulho',
  'mudanca',
  'material',
  'carga',
  'veiculo',
  'maquina',
] as const satisfies readonly NeedKind[];

/**
 * Type guard sobre o segmento da URL (`/pedido/entulho`).
 *
 * Mora aqui, e não na tela, por dois motivos: é lógica de domínio sobre
 * `NeedKind`, e porque o `App.tsx` precisa dele de forma ESTÁTICA para
 * decidir a rota. Enquanto vivia em `flows/pedido.tsx`, aquele arquivo era
 * importado estática e dinamicamente ao mesmo tempo — e o Rollup avisava que
 * o chunk do fluxo estava sendo colado no de entrada, desfazendo o code
 * splitting que o projeto construiu de propósito.
 */
export function isNeedKind(value: unknown): value is NeedKind {
  return typeof value === 'string' && (NEED_KINDS as readonly string[]).includes(value);
}

export const NEED_LABEL: Record<NeedKind, string> = {
  entulho: 'Retirar entulho',
  mudanca: 'Mudança',
  material: 'Material de construção',
  carga: 'Carga e mercadorias',
  veiculo: 'Guincho para veículo',
  maquina: 'Máquina ou equipamento',
};

/** Serviço do backend por necessidade. Fonte única — as telas não repetem. */
export const NEED_SERVICE: Record<NeedKind, ServiceType> = {
  entulho: 'cacamba',
  mudanca: 'frete',
  material: 'frete',
  carga: 'frete',
  veiculo: 'guincho',
  maquina: 'frete',
};

// ---------------------------------------------------------------------
// Normalização
// ---------------------------------------------------------------------

/**
 * Minúsculas sem acento. Quem digita com o telefone na mão, numa obra, não
 * acentua — e "mudanca" precisa casar com "mudança".
 */
export function normalize(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // "m\u00b3" \u00e9 variante tipogr\u00e1fica de "m3". Sem esta troca o `\b` no fim do
      // padr\u00e3o de volume nunca fecha \u2014 `\u00b3` n\u00e3o conta como caractere de
      // palavra \u2014, e "ca\u00e7amba de 5m\u00b3" passava batido.
      .replace(/\u00b3/g, '3')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Casamento por palavra inteira. Sem isso "areia" casaria dentro de outra
 * palavra e "carga" dentro de "descarga" — barulho que estraga a sugestão.
 */
function contains(haystack: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(haystack);
}

// ---------------------------------------------------------------------
// Pistas numéricas
// ---------------------------------------------------------------------

/** Aceita vírgula decimal — "2,5 toneladas" é como se escreve em português. */
function num(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function extractHints(text: string): Hints {
  const t = normalize(text);
  const hints: Hints = {};

  const tons = /(\d+(?:[.,]\d+)?)\s*(?:t|ton|tons|tonelada|toneladas)\b/.exec(t);
  const tonValue = num(tons?.[1]);
  if (tonValue !== undefined) hints.tons = tonValue;

  // "m3", "m³", "metros cubicos" — todas as formas que aparecem na prática.
  const m3 = /(\d+(?:[.,]\d+)?)\s*(?:m3|m³|metros? cubicos?)\b/.exec(t);
  const m3Value = num(m3?.[1]);
  if (m3Value !== undefined) hints.cubicMeters = m3Value;

  const helpers = /(\d+)\s*(?:ajudante|ajudantes|carregador|carregadores)\b/.exec(t);
  const helperValue = num(helpers?.[1]);
  if (helperValue !== undefined) hints.helpers = Math.min(4, Math.round(helperValue));

  if (/(^|[^a-z])(hoje|agora|urgente|urgencia|imediato|ja)($|[^a-z])/.test(t)) {
    hints.urgent = true;
  }

  return hints;
}

// ---------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------

/**
 * Lê o texto livre e devolve as necessidades prováveis, da mais para a menos.
 *
 * Confiança satura em três pontos de peso: um termo decisivo (peso 3) ou a
 * soma de vários de apoio já bastam para o topo. Acima de 0,5 a tela pode
 * seguir direto; abaixo, ela oferece as opções em vez de escolher sozinha.
 */
export function readIntent(text: string): IntentReading {
  const t = normalize(text);
  const hints = extractHints(text);

  if (t.length < 2) return { needs: [], hints };

  const score = new Map<NeedKind, { total: number; matched: string[] }>();

  for (const entry of VOCAB) {
    for (const term of entry.terms) {
      if (!contains(t, normalize(term))) continue;
      const acc = score.get(entry.kind) ?? { total: 0, matched: [] };
      acc.total += entry.weight;
      acc.matched.push(term);
      score.set(entry.kind, acc);
    }
  }

  // Volume em m³ escrito sem mais nada é caçamba: é a unidade em que caçamba
  // é vendida. Não decide sozinho, mas desempata.
  if (hints.cubicMeters !== undefined && !score.has('entulho')) {
    score.set('entulho', { total: 1, matched: [`${hints.cubicMeters} m³`] });
  }

  const needs: Need[] = [...score.entries()]
    .map(([kind, acc]) => ({
      kind,
      service: NEED_SERVICE[kind],
      label: NEED_LABEL[kind],
      confidence: Math.min(1, acc.total / 3),
      // Termo mais específico primeiro: é o que a tela mostra como
      // justificativa, e "sofá" explica melhor que "casa".
      matched: [...new Set(acc.matched)].sort((a, b) => b.length - a.length),
    }))
    .sort((a, b) => b.confidence - a.confidence || a.kind.localeCompare(b.kind));

  return { needs, hints };
}

/**
 * A necessidade única quando há uma clara o suficiente para seguir sem
 * perguntar. Devolve `null` quando o melhor palpite empata com o segundo —
 * nesse caso perguntar é mais rápido que errar e voltar.
 */
export function bestNeed(reading: IntentReading): Need | null {
  const [first, second] = reading.needs;
  if (!first || first.confidence < 0.5) return null;
  if (second && second.confidence >= first.confidence) return null;
  return first;
}
