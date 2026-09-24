// =====================================================================
// PAGORA — Matching de veículo compatível
// =====================================================================
// O ganho que cai de graça uma vez que veículo e conformidade estão
// estruturados: hoje o cliente vê "prestadores disponíveis"; aqui ele passa
// a ver só quem PODE de fato executar aquele pedido.
//
// Três filtros, nesta ordem — do mais barato ao mais caro:
//   1. FÍSICO      — cabe? (peso, carroceria)
//   2. REGULATÓRIO — pode? (PAGORA CHECK do serviço)
//   3. GEOGRÁFICO  — atende ali? (licença municipal, raio de atuação)
//
// A ordem não é estética: o filtro físico é aritmética pura e derruba a
// maior parte dos candidatos antes de tocar em conformidade, que é mais
// cara de avaliar.
//
// Decisão importante: incompatibilidade nunca some em silêncio. Cada
// candidato descartado carrega o motivo (`MatchRejection`). Isso alimenta
// duas coisas que valem dinheiro: dizer ao cliente "nenhum caminhão de 12 t
// disponível na sua região" em vez de uma lista vazia, e dizer ao prestador
// "você perdeu 14 pedidos por falta de licença municipal".
// =====================================================================

import {
  evaluateCheck,
  licenseCoversMunicipality,
  type BodyType,
  type HeldCredential,
  type OperationContext,
  type ServiceType,
  type VehicleProfile,
  type CheckResult,
} from './conformidade';

// ─── Entradas ────────────────────────────────────────────────────────

export type CargoRequirements = {
  service: ServiceType;
  /** Peso estimado da carga em kg. */
  weightKg?: number | null;
  /** Carrocerias que servem. Vazio/ausente = qualquer uma. */
  acceptableBodyTypes?: BodyType[];
  municipality?: string | null;
  state?: string | null;
  interstate?: boolean;
};

export type CandidateVehicle = {
  vehicleId: string;
  providerId: string;
  profile: VehicleProfile;
  credentials: HeldCredential[];
  /** CNH declarada do condutor, ex.: 'AB', 'C', 'E'. */
  cnhCategory?: string | null;
  /** Municípios cobertos pela licença de resíduos (só relevante em caçamba). */
  licensedMunicipalities?: string[] | null;
};

export type MatchRejection =
  | 'capacidade_insuficiente'
  | 'carroceria_incompativel'
  | 'conformidade_bloqueada'
  | 'licenca_municipal_ausente'
  | 'dados_veiculo_incompletos';

export const REJECTION_LABELS: Record<MatchRejection, string> = {
  capacidade_insuficiente: 'Capacidade menor que a carga',
  carroceria_incompativel: 'Tipo de carroceria não atende',
  conformidade_bloqueada: 'Documentação pendente para este serviço',
  licenca_municipal_ausente: 'Sem licença no município do pedido',
  dados_veiculo_incompletos: 'Cadastro do veículo incompleto',
};

export type MatchResult =
  | { vehicleId: string; providerId: string; compatible: true; check: CheckResult }
  | {
      vehicleId: string;
      providerId: string;
      compatible: false;
      reasons: MatchRejection[];
      check: CheckResult | null;
    };

// ─── Compatibilidade física ──────────────────────────────────────────

/**
 * Margem de segurança sobre a capacidade declarada.
 *
 * Peso informado pelo cliente é estimativa de leigo — quem diz "uns 800 kg"
 * costuma errar para baixo. Carregar no limite exato é como o veículo sai
 * com excesso de peso e o prestador toma a multa. 10% de folga é a prática
 * de quem opera; ajustável por produto.
 */
export const CAPACITY_SAFETY_MARGIN = 0.9;

export const fitsCapacity = (
  profile: VehicleProfile,
  weightKg: number | null | undefined,
): boolean => {
  if (weightKg == null) return true; // sem peso informado, não descarta
  if (profile.capacityKg == null) return false; // sem capacidade, não dá para afirmar
  return weightKg <= profile.capacityKg * CAPACITY_SAFETY_MARGIN;
};

export const fitsBodyType = (
  profile: VehicleProfile,
  acceptable: BodyType[] | null | undefined,
): boolean => {
  if (!acceptable || acceptable.length === 0) return true;
  return acceptable.includes(profile.bodyType);
};

// ─── Avaliação de um candidato ───────────────────────────────────────

export const evaluateCandidate = (
  cargo: CargoRequirements,
  candidate: CandidateVehicle,
  now: Date = new Date(),
): MatchResult => {
  const reasons: MatchRejection[] = [];

  // 1. FÍSICO — aritmética, roda primeiro por ser o mais barato.
  if (!fitsCapacity(candidate.profile, cargo.weightKg)) {
    reasons.push(
      candidate.profile.capacityKg == null
        ? 'dados_veiculo_incompletos'
        : 'capacidade_insuficiente',
    );
  }
  if (!fitsBodyType(candidate.profile, cargo.acceptableBodyTypes)) {
    reasons.push('carroceria_incompativel');
  }

  // 2. REGULATÓRIO
  const ctx: OperationContext = {
    service: cargo.service,
    remunerated: true, // Pagora é sempre transporte remunerado
    interstate: cargo.interstate,
    municipality: cargo.municipality,
    state: cargo.state,
  };
  const check = evaluateCheck(ctx, candidate.profile, candidate.credentials, now);
  if (check.status === 'bloqueado') {
    reasons.push('conformidade_bloqueada');
  }

  // 3. GEOGRÁFICO — licença de resíduos é por município, não nacional.
  if (cargo.service === 'cacamba') {
    if (!licenseCoversMunicipality(candidate.licensedMunicipalities, cargo.municipality)) {
      reasons.push('licenca_municipal_ausente');
    }
  }

  if (reasons.length > 0) {
    return {
      vehicleId: candidate.vehicleId,
      providerId: candidate.providerId,
      compatible: false,
      reasons,
      check,
    };
  }
  return {
    vehicleId: candidate.vehicleId,
    providerId: candidate.providerId,
    compatible: true,
    check,
  };
};

// ─── Avaliação de uma frota ──────────────────────────────────────────

export type MatchReport = {
  compatible: Extract<MatchResult, { compatible: true }>[];
  rejected: Extract<MatchResult, { compatible: false }>[];
  /** Quantos candidatos caíram por cada motivo — alimenta o diagnóstico. */
  rejectionBreakdown: Record<MatchRejection, number>;
};

const emptyBreakdown = (): Record<MatchRejection, number> => ({
  capacidade_insuficiente: 0,
  carroceria_incompativel: 0,
  conformidade_bloqueada: 0,
  licenca_municipal_ausente: 0,
  dados_veiculo_incompletos: 0,
});

export const matchFleet = (
  cargo: CargoRequirements,
  candidates: CandidateVehicle[],
  now: Date = new Date(),
): MatchReport => {
  const compatible: Extract<MatchResult, { compatible: true }>[] = [];
  const rejected: Extract<MatchResult, { compatible: false }>[] = [];
  const rejectionBreakdown = emptyBreakdown();

  for (const c of candidates) {
    const result = evaluateCandidate(cargo, c, now);
    if (result.compatible) {
      compatible.push(result);
    } else {
      rejected.push(result);
      for (const r of result.reasons) rejectionBreakdown[r] += 1;
    }
  }

  return { compatible, rejected, rejectionBreakdown };
};

/**
 * Explica uma lista vazia em linguagem de cliente.
 *
 * "Nenhum prestador disponível" é a pior mensagem possível: não diz se o
 * problema é a hora, a região ou a carga, e não dá ao cliente nada para
 * fazer. O motivo dominante quase sempre sugere a saída.
 */
export const explainEmptyResult = (report: MatchReport): string => {
  if (report.compatible.length > 0) return '';
  if (report.rejected.length === 0) {
    return 'Ainda não temos prestadores cadastrados para esse serviço na sua região.';
  }

  const entries = Object.entries(report.rejectionBreakdown) as [MatchRejection, number][];
  const [topReason] = entries.sort((a, b) => b[1] - a[1])[0]!;

  switch (topReason) {
    case 'capacidade_insuficiente':
      return 'Os veículos disponíveis são menores que a sua carga. Tente dividir em duas viagens ou revise o peso informado.';
    case 'carroceria_incompativel':
      return 'Nenhum veículo disponível tem o tipo de carroceria que esse transporte pede.';
    case 'licenca_municipal_ausente':
      return 'Ainda não temos prestador licenciado para retirar resíduos nesse município.';
    case 'conformidade_bloqueada':
      return 'Os prestadores dessa região estão com documentação em análise. Tente novamente em breve.';
    case 'dados_veiculo_incompletos':
      return 'Não conseguimos confirmar a capacidade dos veículos disponíveis. Nossa equipe já foi avisada.';
    default:
      return 'Nenhum prestador compatível no momento.';
  }
};
