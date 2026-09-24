// =====================================================================
// PAGORA CHECK — motor de conformidade
// =====================================================================
// Responde a duas perguntas, e só a elas:
//   1. Dado (serviço + veículo), o que a lei exige deste prestador?
//   2. Dado o que ele comprovou, ele pode receber este pedido?
//
// ---------------------------------------------------------------------
// Por que a matriz é DADO e não `if/else`
// ---------------------------------------------------------------------
// Os três serviços do Pagora caem em três regimes regulatórios DIFERENTES,
// e essa é a descoberta que muda o desenho:
//
//   frete   → ANTT/RNTRC — regime FEDERAL de transporte remunerado de cargas
//   guincho → autorização de socorro mecânico — regime MUNICIPAL/ESTADUAL
//   caçamba → licença de transporte de resíduos da construção (CONAMA 307
//             implementada por regra municipal) — regime MUNICIPAL
//
// Ou seja: exigir RNTRC de todo mundo não é só excesso de zelo, é exigir o
// documento ERRADO. Um transportador de entulho com RNTRC em dia continua
// irregular se não tiver a licença municipal de resíduos — e o RNTRC não
// cobre isso.
//
// Como as regras municipais variam entre ~5.500 municípios e mudam sem
// aviso, qualquer matriz hardcoded nasce desatualizada. Por isso as regras
// vivem em `REQUIREMENT_MATRIX` (espelhada na tabela
// `pagora.compliance_requirements`): jurídico ajusta linha de tabela, não
// pull request.
//
// ---------------------------------------------------------------------
// Sobre o campo `confidence`
// ---------------------------------------------------------------------
// Cada regra declara o quanto se pode confiar nela:
//   'alta'              → base legal federal estável e citável (ex.: CTB)
//   'media'             → regra geral conhecida, exceções possíveis
//   'verificar_juridico'→ depende de norma municipal/estadual ou de limiar
//                         que precisa de confirmação antes do go-live
//
// Regra com `verificar_juridico` NUNCA bloqueia prestador sozinha. Ela vira
// pendência para triagem humana. Bloquear alguém do sustento com base em
// regra não confirmada é o pior erro que este módulo pode cometer.
// =====================================================================

import type { TransporterKind } from './documentos';

export type ServiceType = 'frete' | 'guincho' | 'cacamba';

// ─── Veículo ─────────────────────────────────────────────────────────

export type BodyType =
  | 'moto'
  | 'furgao'
  | 'van'
  | 'bau'
  | 'carroceria'
  | 'basculante'
  | 'poliguindaste'
  | 'prancha'
  | 'lanca'
  | 'cavalo_mecanico'
  | 'outro';

export type VehicleProfile = {
  /** Peso Bruto Total em kg — o driver legal de quase tudo. */
  pbtKg: number | null;
  /** Capacidade de carga útil em kg. */
  capacityKg: number | null;
  bodyType: BodyType;
  /** Reboque/semirreboque acoplado. Muda a categoria de CNH exigida. */
  hasTrailer: boolean;
  axles?: number | null;
};

export type OperationContext = {
  service: ServiceType;
  /** No Pagora é sempre true — mas explícito porque é o gatilho do RNTRC. */
  remunerated: boolean;
  /** Transporte entre estados. */
  interstate?: boolean;
  municipality?: string | null;
  state?: string | null;
};

// ─── Credenciais ─────────────────────────────────────────────────────

export type CredentialKind =
  | 'cnh'
  | 'crlv'
  | 'rntrc'
  | 'antt_frota'
  | 'seguro_rctrc'
  | 'seguro_rcdc'
  | 'seguro_rcv'
  | 'licenca_residuos'
  | 'autorizacao_socorro';

export const CREDENTIAL_LABELS: Record<CredentialKind, string> = {
  cnh: 'CNH válida',
  crlv: 'CRLV do veículo',
  rntrc: 'RNTRC ativo (ANTT)',
  antt_frota: 'Veículo vinculado à frota do transportador',
  seguro_rctrc: 'Seguro RCTR-C',
  seguro_rcdc: 'Seguro RC-DC',
  seguro_rcv: 'Seguro RC-V',
  licenca_residuos: 'Licença municipal de transporte de resíduos',
  autorizacao_socorro: 'Autorização de socorro mecânico',
};

export type RequirementLevel = 'obrigatorio' | 'condicional' | 'recomendado' | 'nao_aplicavel';
export type Confidence = 'alta' | 'media' | 'verificar_juridico';

export type Requirement = {
  kind: CredentialKind;
  level: RequirementLevel;
  /** Por que este documento é exigido — texto mostrado ao prestador. */
  reason: string;
  legalBasis: string;
  confidence: Confidence;
};

export type CredentialStatus =
  | 'ausente'
  | 'pendente'
  | 'verificado'
  | 'rejeitado'
  | 'vencido';

export type HeldCredential = {
  kind: CredentialKind;
  status: CredentialStatus;
  /** ISO date. Usado para detectar vencimento. */
  expiresAt?: string | null;
  verifiedAt?: string | null;
};

// ─── CNH: categoria mínima ───────────────────────────────────────────

export type CNHCategory = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * Categoria mínima de CNH para conduzir o veículo.
 *
 * Base: CTB art. 143. É a regra mais estável deste módulo — federal, antiga
 * e sem variação municipal. Por isso é a única classificação que vira
 * `if/else` em código em vez de linha de tabela.
 *
 *   A → motocicleta
 *   B → até 3.500 kg de PBT
 *   C → carga acima de 3.500 kg de PBT
 *   E → combinação com unidade acoplada acima de 6.000 kg, ou articulado
 *
 * (D fica de fora: é transporte de passageiros, que o Pagora não opera.)
 */
export const minimumCNH = (v: VehicleProfile): CNHCategory | null => {
  if (v.bodyType === 'moto') return 'A';
  if (v.pbtKg == null) return null; // sem PBT não dá para afirmar nada

  // Cavalo mecânico sempre traça semirreboque — E independente do PBT
  // isolado do trator.
  if (v.bodyType === 'cavalo_mecanico') return 'E';
  if (v.hasTrailer && v.pbtKg > 6000) return 'E';
  if (v.pbtKg > 3500) return 'C';
  return 'B';
};

/** Ordem de abrangência: E habilita C, que habilita B. */
const CNH_RANK: Record<CNHCategory, number> = { A: 0, B: 1, C: 2, D: 2, E: 3 };

export const cnhCovers = (held: string | null | undefined, required: CNHCategory): boolean => {
  if (!held) return false;
  // Categorias combinadas ('AB', 'AC', 'AE'...) — vale a mais abrangente.
  const cats = held.toUpperCase().split('').filter((c): c is CNHCategory => c in CNH_RANK);
  if (cats.length === 0) return false;
  // Moto é requisito disjunto: só 'A' habilita, abrangência não se aplica.
  if (required === 'A') return cats.includes('A');
  return Math.max(...cats.map((c) => CNH_RANK[c])) >= CNH_RANK[required];
};

// ─── Matriz de exigências ────────────────────────────────────────────

/**
 * Limiar de PBT abaixo do qual não exigimos RNTRC.
 *
 * O RNTRC existe para transporte rodoviário REMUNERADO DE CARGAS exercido
 * por TAC/ETC/CTC. Veículo de pequeno porte em mudança residencial é área
 * cinzenta na prática do setor.
 *
 * `verificar_juridico` justamente por isso: o número abaixo é uma posição
 * conservadora de partida, NÃO uma leitura confirmada da norma vigente.
 * Confirmar com a ANTT / jurídico antes do go-live. Enquanto não confirmar,
 * o efeito é gerar pendência de triagem — nunca bloqueio automático.
 */
export const RNTRC_PBT_THRESHOLD_KG = 3500;

type MatrixRule = Requirement & {
  /** Regra só vale se este predicado passar. Ausente = sempre vale. */
  appliesWhen?: (ctx: OperationContext, v: VehicleProfile) => boolean;
};

export const REQUIREMENT_MATRIX: Record<ServiceType, MatrixRule[]> = {
  // ─────────────────────────────────────────────────────────────────
  // FRETE — regime federal ANTT
  // ─────────────────────────────────────────────────────────────────
  frete: [
    {
      kind: 'cnh',
      level: 'obrigatorio',
      reason: 'Conduzir veículo exige habilitação compatível com o porte.',
      legalBasis: 'CTB art. 143',
      confidence: 'alta',
    },
    {
      kind: 'crlv',
      level: 'obrigatorio',
      reason: 'O veículo precisa estar licenciado e em dia.',
      legalBasis: 'CTB art. 130 e 131',
      confidence: 'alta',
    },
    {
      kind: 'rntrc',
      level: 'obrigatorio',
      reason:
        'Transporte rodoviário remunerado de cargas exige inscrição ativa no RNTRC.',
      legalBasis: 'Lei 11.442/2007; regulamentação ANTT',
      confidence: 'verificar_juridico',
      appliesWhen: (ctx, v) =>
        ctx.remunerated && (v.pbtKg ?? 0) > RNTRC_PBT_THRESHOLD_KG,
    },
    {
      kind: 'antt_frota',
      level: 'obrigatorio',
      reason:
        'O veículo precisa estar vinculado à frota do transportador no RNTRC.',
      legalBasis: 'ANTT — ConsultarFrotaTransportador',
      confidence: 'verificar_juridico',
      appliesWhen: (ctx, v) =>
        ctx.remunerated && (v.pbtKg ?? 0) > RNTRC_PBT_THRESHOLD_KG,
    },
    {
      kind: 'seguro_rctrc',
      level: 'obrigatorio',
      reason:
        'Seguro de responsabilidade civil do transportador rodoviário de carga.',
      legalBasis: 'Seguro obrigatório do TRC',
      confidence: 'verificar_juridico',
      appliesWhen: (ctx, v) =>
        ctx.remunerated && (v.pbtKg ?? 0) > RNTRC_PBT_THRESHOLD_KG,
    },
    {
      kind: 'seguro_rcdc',
      level: 'recomendado',
      reason: 'Cobre desaparecimento de carga. Aumenta a confiança do cliente.',
      legalBasis: 'Seguro complementar do TRC',
      confidence: 'verificar_juridico',
    },
  ],

  // ─────────────────────────────────────────────────────────────────
  // GUINCHO — regime municipal/estadual, NÃO federal
  // ─────────────────────────────────────────────────────────────────
  // Socorro mecânico e remoção não são "transporte de cargas" no sentido da
  // Lei 11.442. Exigir RNTRC aqui seria pedir documento que não se aplica.
  //
  // A exceção real: transporte de veículos COMO CARGA (cegonha, remoção em
  // lote, leilão) volta a ser transporte de cargas. A regra condicional
  // abaixo cobre isso via porte do veículo.
  guincho: [
    {
      kind: 'cnh',
      level: 'obrigatorio',
      reason: 'Conduzir o guincho exige habilitação compatível com o porte.',
      legalBasis: 'CTB art. 143',
      confidence: 'alta',
    },
    {
      kind: 'crlv',
      level: 'obrigatorio',
      reason: 'O guincho precisa estar licenciado e em dia.',
      legalBasis: 'CTB art. 130 e 131',
      confidence: 'alta',
    },
    {
      kind: 'autorizacao_socorro',
      level: 'obrigatorio',
      reason:
        'Serviço de socorro e remoção depende de autorização do município ou do estado.',
      legalBasis: 'Norma municipal/estadual — varia por localidade',
      confidence: 'verificar_juridico',
    },
    {
      kind: 'seguro_rcv',
      level: 'obrigatorio',
      reason:
        'O veículo rebocado fica sob responsabilidade do prestador durante a remoção.',
      legalBasis: 'RC-V — responsabilidade civil sobre veículo de terceiro',
      confidence: 'verificar_juridico',
    },
    {
      kind: 'rntrc',
      level: 'condicional',
      reason:
        'Remoção de veículos como carga (prancha/cegonha) se enquadra como transporte de cargas.',
      legalBasis: 'Lei 11.442/2007',
      confidence: 'verificar_juridico',
      appliesWhen: (ctx, v) =>
        ctx.remunerated && v.bodyType === 'prancha' && (v.pbtKg ?? 0) > RNTRC_PBT_THRESHOLD_KG,
    },
  ],

  // ─────────────────────────────────────────────────────────────────
  // CAÇAMBA — regime municipal de resíduos
  // ─────────────────────────────────────────────────────────────────
  // Aqui o RNTRC é quase sempre o documento ERRADO. O que vale é a licença
  // municipal de transporte de resíduos da construção civil (RCC), no
  // arcabouço da CONAMA 307 implementado por cada município — em São Paulo,
  // por exemplo, via cadastro do transportador e controle de destinação.
  //
  // Consequência de produto: a licença é POR MUNICÍPIO. Um prestador
  // licenciado em São Paulo não está licenciado em Guarulhos. O matching
  // precisa considerar isso — ver `licenseCoversMunicipality`.
  cacamba: [
    {
      kind: 'cnh',
      level: 'obrigatorio',
      reason: 'Conduzir o caminhão exige habilitação compatível com o porte.',
      legalBasis: 'CTB art. 143',
      confidence: 'alta',
    },
    {
      kind: 'crlv',
      level: 'obrigatorio',
      reason: 'O veículo precisa estar licenciado e em dia.',
      legalBasis: 'CTB art. 130 e 131',
      confidence: 'alta',
    },
    {
      kind: 'licenca_residuos',
      level: 'obrigatorio',
      reason:
        'Transporte de resíduos da construção exige licença do município onde a caçamba fica.',
      legalBasis: 'CONAMA 307 + regulamentação municipal',
      confidence: 'verificar_juridico',
    },
  ],
};

// ─── Avaliação ───────────────────────────────────────────────────────

/** Exigências aplicáveis a este veículo neste serviço. */
export const requirementsFor = (
  ctx: OperationContext,
  vehicle: VehicleProfile,
): Requirement[] =>
  (REQUIREMENT_MATRIX[ctx.service] ?? [])
    .filter((r) => !r.appliesWhen || r.appliesWhen(ctx, vehicle))
    .map(({ appliesWhen: _drop, ...req }) => req);

export type CheckStatus = 'aprovado' | 'pendente' | 'bloqueado';

export type CheckResult = {
  status: CheckStatus;
  /** Pode estampar o selo PAGORA CHECK ✓ no perfil. */
  badge: boolean;
  /** Exigências obrigatórias ainda não comprovadas. */
  missing: Requirement[];
  /** Comprovadas mas vencidas — bloqueiam igual a ausentes. */
  expired: Requirement[];
  /** Aguardando análise humana. */
  pending: Requirement[];
  /** Explicitamente recusadas na triagem. */
  rejected: Requirement[];
  /** Pendências que dependem de confirmação jurídica — não bloqueiam. */
  needsLegalReview: Requirement[];
  /** Vencendo nos próximos 30 dias — para avisar antes de travar o prestador. */
  expiringSoon: Requirement[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Cruza o que a lei exige com o que o prestador comprovou.
 *
 * Regras de decisão:
 *   bloqueado → falta obrigatória de confiança alta/média, ou credencial
 *               rejeitada, ou vencida
 *   pendente  → tudo que falta está em análise, ou só há pendência de
 *               confiança `verificar_juridico`
 *   aprovado  → todo obrigatório verificado e dentro da validade
 *
 * O selo (`badge`) é mais estrito que `status`: só sai com `aprovado`. Um
 * prestador `pendente` opera, mas sem selo — a distinção entre "pode
 * trabalhar" e "está verificado" precisa ficar visível para o cliente.
 */
export const evaluateCheck = (
  ctx: OperationContext,
  vehicle: VehicleProfile,
  held: HeldCredential[],
  now: Date = new Date(),
): CheckResult => {
  const required = requirementsFor(ctx, vehicle);
  const byKind = new Map(held.map((h) => [h.kind, h]));

  const missing: Requirement[] = [];
  const expired: Requirement[] = [];
  const pending: Requirement[] = [];
  const rejected: Requirement[] = [];
  const needsLegalReview: Requirement[] = [];
  const expiringSoon: Requirement[] = [];

  for (const req of required) {
    if (req.level === 'recomendado' || req.level === 'nao_aplicavel') continue;

    const h = byKind.get(req.kind);
    const isExpired =
      h?.expiresAt != null && new Date(h.expiresAt).getTime() < now.getTime();

    if (h?.status === 'verificado' && !isExpired) {
      if (h.expiresAt != null) {
        const daysLeft = (new Date(h.expiresAt).getTime() - now.getTime()) / DAY_MS;
        if (daysLeft <= 30) expiringSoon.push(req);
      }
      continue;
    }

    if (h?.status === 'rejeitado') {
      rejected.push(req);
      continue;
    }
    if (isExpired) {
      expired.push(req);
      continue;
    }
    if (h?.status === 'pendente') {
      pending.push(req);
      continue;
    }

    // Ausente. Regra não confirmada juridicamente não bloqueia — vira
    // triagem. Bloquear alguém do sustento com base em regra incerta é o
    // erro que este módulo existe para não cometer.
    if (req.confidence === 'verificar_juridico') needsLegalReview.push(req);
    else missing.push(req);
  }

  const blocked = missing.length > 0 || expired.length > 0 || rejected.length > 0;
  const waiting = pending.length > 0 || needsLegalReview.length > 0;

  const status: CheckStatus = blocked ? 'bloqueado' : waiting ? 'pendente' : 'aprovado';

  return {
    status,
    badge: status === 'aprovado',
    missing,
    expired,
    pending,
    rejected,
    needsLegalReview,
    expiringSoon,
  };
};

/**
 * Licença de resíduos é municipal: vale onde foi emitida, não no país todo.
 *
 * Mantida separada de `evaluateCheck` porque depende do município do PEDIDO,
 * não do cadastro do prestador — só dá para avaliar no momento do matching.
 */
export const licenseCoversMunicipality = (
  licensedIn: string[] | null | undefined,
  municipality: string | null | undefined,
): boolean => {
  if (!municipality) return false;
  if (!licensedIn || licensedIn.length === 0) return false;
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toLowerCase();
  const target = norm(municipality);
  return licensedIn.some((m) => norm(m) === target);
};

/** Resumo de uma linha só, para card de perfil e mensagem de WhatsApp. */
export const checkSummary = (result: CheckResult): string => {
  if (result.badge) return 'PAGORA CHECK ✓ — prestador verificado';
  if (result.status === 'pendente') {
    const n = result.pending.length + result.needsLegalReview.length;
    return `Em verificação — ${n} ${n === 1 ? 'item' : 'itens'} em análise`;
  }
  const faltando = result.missing.length + result.expired.length + result.rejected.length;
  return `Pendências de documentação — ${faltando} ${faltando === 1 ? 'item' : 'itens'}`;
};

/** Categorias de transportador aceitas por serviço, para o cadastro. */
export const TRANSPORTER_KINDS_BY_SERVICE: Record<ServiceType, TransporterKind[]> = {
  frete: ['TAC', 'ETC', 'CTC'],
  guincho: ['TAC', 'ETC'],
  cacamba: ['ETC', 'CTC'],
};
