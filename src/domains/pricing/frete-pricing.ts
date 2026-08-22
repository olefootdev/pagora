// =====================================================================
// PAGORA — Pricing de frete (fonte única, em centavos)
// =====================================================================
// Esta é a implementação canônica no client. Ela existe para MOSTRAR uma
// estimativa ao cliente antes de haver propostas — não para determinar o que
// será cobrado. O valor cobrado vem sempre da quote aceita, e a decomposição
// financeira é recalculada no servidor a partir do `quote_id`.
//
// Regra que substituiu o bug: nenhum valor monetário usa fallback silencioso.
// Um veículo desconhecido é erro de programação e precisa explodir, não virar
// o preço de outro veículo.
// =====================================================================

import { reaisToCents } from '../money';

export const VEHICLE_TYPES = ['van', 'bau', 'grande'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

/**
 * Sobretaxa por veículo, em centavos.
 * `van: 0` é intencional — a van é o veículo base, sem acréscimo sobre o
 * preço por km. Era exatamente esse zero que o antigo `|| 50` engolia,
 * fazendo o cliente de van pagar preço de baú.
 */
export const VEHICLE_SURCHARGE_CENTS: Record<VehicleType, number> = {
  van: 0,
  bau: 5_000,
  grande: 13_000,
};

export const PRICE_PER_KM_CENTS = 1_200;
export const HELPER_CENTS = 5_000;
export const ACCESS_HELP_CENTS = 3_000;
export const NO_ELEVATOR_CENTS = 2_500;
export const BASE_FEE_CENTS = 3_000;

/**
 * Urgência não tem preço. Decisão de produto de 19/08/2026: o cliente que
 * precisa hoje paga o mesmo que o cliente que agenda. A urgência continua
 * sendo coletada e enviada ao prestador — ele precisa saber que é para hoje —,
 * só não entra na conta.
 *
 * Antes daqui existia um multiplicador de 13/10 (+30%) aplicado ao subtotal.
 * Se a regra voltar, ela volta como constante explícita e com teste, nunca
 * como número solto no meio do cálculo.
 */
export const URGENCY_SURCHARGE_CENTS = 0;

/** Faixa alta da estimativa: +25%. Aplicado como 5/4 (inteiro exato). */
export const RANGE_HIGH_NUMERATOR = 5;
export const RANGE_HIGH_DENOMINATOR = 4;

export const DEFAULT_DISTANCE_KM = 15;

export type AccessInput = {
  type?: string | undefined;
  elevator?: boolean | undefined;
  needHelp?: boolean | undefined;
};

export type FretePricingInput = {
  distanceKm?: number | null | undefined;
  vehicle?: string | null | undefined;
  helpers?: number | null | undefined;
  originAccess?: AccessInput | null | undefined;
  destAccess?: AccessInput | null | undefined;
  urgency?: string | null | undefined;
};

export type FreteBreakdownCents = {
  baseKmCents: number;
  vehicleCents: number;
  helpersCents: number;
  accessCents: number;
  noElevatorCents: number;
  baseFeeCents: number;
  urgencySurchargeCents: number;
};

export type FretePricingCents = {
  lowCents: number;
  highCents: number;
  breakdown: FreteBreakdownCents;
};

/** Erro de domínio: entrada insuficiente ou inválida para precificar. */
export class PricingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingInputError';
  }
}

export function isVehicleType(value: unknown): value is VehicleType {
  return typeof value === 'string' && (VEHICLE_TYPES as readonly string[]).includes(value);
}

/**
 * Resolve a sobretaxa do veículo. Sem fallback: `van` (0) tem que sobreviver.
 * @throws PricingInputError se o veículo não foi escolhido ou é desconhecido.
 */
export function vehicleSurchargeCents(vehicle: string | null | undefined): number {
  if (vehicle === null || vehicle === undefined || vehicle === '') {
    throw new PricingInputError('Veículo não selecionado — impossível precificar o frete.');
  }
  if (!isVehicleType(vehicle)) {
    throw new PricingInputError(`Tipo de veículo não suportado: "${vehicle}".`);
  }
  // `noUncheckedIndexedAccess` está ligado, mas o type guard acima já garantiu
  // que a chave existe no Record — daí o acesso direto ser seguro.
  return VEHICLE_SURCHARGE_CENTS[vehicle];
}

/** Multiplica centavos por uma fração inteira, com arredondamento half-up. */
function scaleCents(cents: number, numerator: number, denominator: number): number {
  return Math.round((cents * numerator) / denominator);
}

function accessSurchargeCents(access: AccessInput | null | undefined): number {
  return access?.needHelp ? ACCESS_HELP_CENTS : 0;
}

function noElevatorSurchargeCents(access: AccessInput | null | undefined): number {
  return access?.type === 'apt' && !access?.elevator ? NO_ELEVATOR_CENTS : 0;
}

/**
 * Estimativa de frete em centavos.
 * @throws PricingInputError quando o veículo é ausente ou inválido.
 */
export function calcFreteCents(input: FretePricingInput): FretePricingCents {
  const km = input.distanceKm ?? DEFAULT_DISTANCE_KM;
  if (!Number.isFinite(km) || km <= 0) {
    throw new PricingInputError(`Distância inválida: ${String(input.distanceKm)}`);
  }

  const helpers = input.helpers ?? 0;
  if (!Number.isInteger(helpers) || helpers < 0) {
    throw new PricingInputError(`Número de ajudantes inválido: ${String(input.helpers)}`);
  }

  const baseKmCents = Math.round(km * PRICE_PER_KM_CENTS);
  const vehicleCents = vehicleSurchargeCents(input.vehicle);
  const helpersCents = helpers * HELPER_CENTS;
  const accessCents =
    accessSurchargeCents(input.originAccess) + accessSurchargeCents(input.destAccess);
  const noElevatorCents =
    noElevatorSurchargeCents(input.originAccess) + noElevatorSurchargeCents(input.destAccess);

  const subtotalCents =
    baseKmCents + vehicleCents + helpersCents + accessCents + noElevatorCents + BASE_FEE_CENTS;

  // `input.urgency` segue no contrato de entrada de propósito: a informação vai
  // para o prestador. O que saiu foi o efeito dela no preço.
  const lowCents = subtotalCents + URGENCY_SURCHARGE_CENTS;

  return {
    lowCents,
    highCents: scaleCents(lowCents, RANGE_HIGH_NUMERATOR, RANGE_HIGH_DENOMINATOR),
    breakdown: {
      baseKmCents,
      vehicleCents,
      helpersCents,
      accessCents,
      noElevatorCents,
      baseFeeCents: BASE_FEE_CENTS,
      // Sempre 0 hoje. O campo fica porque a tela de resumo lista a linha de
      // urgência, e mostrar "R$ 0,00" é mais honesto que omitir a linha.
      urgencySurchargeCents: URGENCY_SURCHARGE_CENTS,
    },
  };
}

/** Helper para chamadas que já têm reais e querem centavos. */
export const toCents = reaisToCents;
