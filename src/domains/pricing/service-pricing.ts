// =====================================================================
// PAGORA — Estimativa de guincho e caçamba (em centavos)
// =====================================================================
// Estas contas viviam soltas no topo de `extra.tsx`, em reais e com fallback
// silencioso: `VEHICLE[s.vehicleType ?? ''] ?? 30` transformava "veículo não
// escolhido" no preço do veículo médio. É o mesmo bug que fazia quem escolhia
// van pagar preço de baú no frete, e que `frete-pricing.ts` foi criado para
// matar. Aqui ele morre nos outros dois serviços.
//
// OS NÚMEROS SÃO OS MESMOS. Esta extração não reprecifica nada — só troca a
// unidade para centavos inteiros, tira os fallbacks e cobre com teste. Se o
// preço tiver que mudar, muda numa constante nomeada, com o teste apontando
// para a mudança.
//
// URGÊNCIA NÃO TEM PREÇO — nem no frete, nem no guincho. O frete zerou em
// 19/08/2026; o guincho, em 25/08/2026. Agora a regra é uma só nos três
// serviços, e é a que dá para dizer em voz alta: quem precisa agora paga o
// mesmo que quem agenda.
// =====================================================================

import { PricingInputError } from './frete-pricing';

export type ServicePricingCents = {
  lowCents: number;
  highCents: number;
  lines: ReadonlyArray<{ label: string; cents: number }>;
};

// ---------------------------------------------------------------------
// GUINCHO
// ---------------------------------------------------------------------

export const GUINCHO_PRICE_PER_KM_CENTS = 1_500;
export const GUINCHO_BASE_FEE_CENTS = 6_000;
export const GUINCHO_DEFAULT_DISTANCE_KM = 8;

/** Sobretaxa por porte do veículo rebocado. Moto é mais barata: pesa menos. */
export const GUINCHO_VEHICLE_CENTS = {
  moto: -2_000,
  popular: 0,
  van: 6_000,
  suv: 8_000,
} as const;

export type GuinchoVehicle = keyof typeof GUINCHO_VEHICLE_CENTS;

/** Sobretaxa por dificuldade de acesso ao veículo parado. */
export const GUINCHO_ACCESS_CENTS = {
  rua: 0,
  garagem: 4_000,
  dificil: 8_000,
  expressa: 12_000,
} as const;

export type GuinchoAccess = keyof typeof GUINCHO_ACCESS_CENTS;

/**
 * Urgência não entra no preço do guincho. Decisão de 25/08/2026, alinhando com
 * o frete (19/08).
 *
 * Antes daqui existia um multiplicador de 3/2 (+50%) aplicado ao subtotal.
 * A constante fica, em zero e nomeada, pelo mesmo motivo do frete: se a regra
 * voltar, ela volta explícita e com teste — nunca como número solto no meio
 * do cálculo.
 *
 * O campo `urgency` continua sendo coletado e enviado ao prestador: ele
 * precisa saber que é para agora. O que saiu foi o efeito no preço.
 */
export const GUINCHO_URGENCY_SURCHARGE_CENTS = 0;

/** Faixa alta: +30%, aplicado como 13/10 (inteiro exato). */
export const GUINCHO_RANGE_NUM = 13;
export const GUINCHO_RANGE_DEN = 10;

export type GuinchoInput = {
  distanceKm?: number | null;
  vehicleType?: string | null;
  access?: string | null;
  urgency?: string | null;
};

function scale(cents: number, num: number, den: number): number {
  return Math.round((cents * num) / den);
}

function isGuinchoVehicle(v: unknown): v is GuinchoVehicle {
  return typeof v === 'string' && v in GUINCHO_VEHICLE_CENTS;
}

function isGuinchoAccess(v: unknown): v is GuinchoAccess {
  return typeof v === 'string' && v in GUINCHO_ACCESS_CENTS;
}

export function calcGuinchoCents(input: GuinchoInput): ServicePricingCents {
  const km = input.distanceKm ?? GUINCHO_DEFAULT_DISTANCE_KM;
  if (!Number.isFinite(km) || km <= 0) {
    throw new PricingInputError(`Distância inválida para guincho: ${String(input.distanceKm)}`);
  }

  if (!isGuinchoVehicle(input.vehicleType)) {
    throw new PricingInputError(
      `Tipo de veículo não suportado no guincho: "${String(input.vehicleType)}".`,
    );
  }

  // Acesso é a única entrada com padrão: "na rua" cobre a maioria dos casos e
  // custa zero, então assumi-lo não infla preço nenhum. Um padrão que só pode
  // baratear é seguro; um que pode encarecer não seria.
  const access: GuinchoAccess = isGuinchoAccess(input.access) ? input.access : 'rua';

  const baseKmCents = Math.round(km * GUINCHO_PRICE_PER_KM_CENTS);
  const vehicleCents = GUINCHO_VEHICLE_CENTS[input.vehicleType];
  const accessCents = GUINCHO_ACCESS_CENTS[access];

  const subtotal = baseKmCents + vehicleCents + accessCents + GUINCHO_BASE_FEE_CENTS;
  const lowCents = subtotal + GUINCHO_URGENCY_SURCHARGE_CENTS;

  const lines = [
    { label: `Deslocamento · ${km} km`, cents: baseKmCents },
    { label: 'Taxa de atendimento', cents: GUINCHO_BASE_FEE_CENTS },
    { label: 'Porte do veículo', cents: vehicleCents },
    { label: 'Acesso ao veículo', cents: accessCents },
    // Sempre R$ 0,00 hoje. A linha fica porque a tela lista a urgência, e
    // mostrar "sem custo" é mais honesto que omitir — é justamente a
    // informação que o cliente quer confirmar quando pede para agora.
    { label: 'Atendimento imediato', cents: GUINCHO_URGENCY_SURCHARGE_CENTS },
  ];

  return {
    lowCents,
    highCents: scale(lowCents, GUINCHO_RANGE_NUM, GUINCHO_RANGE_DEN),
    lines,
  };
}

// ---------------------------------------------------------------------
// CAÇAMBA
// ---------------------------------------------------------------------

/** Preço por tamanho, em metros cúbicos. Chave numérica: é como se vende. */
export const CACAMBA_SIZE_CENTS = {
  3: 18_000,
  5: 28_000,
  8: 38_000,
} as const;

export type CacambaSize = keyof typeof CACAMBA_SIZE_CENTS;

/** Permanência incluída e o custo de estender. Chave em dias. */
export const CACAMBA_PERIOD_CENTS = {
  1: 0,
  3: 6_000,
  7: 12_000,
} as const;

export type CacambaPeriod = keyof typeof CACAMBA_PERIOD_CENTS;

/** Faixa alta: +15%, aplicado como 23/20. Caçamba varia menos que frete. */
export const CACAMBA_RANGE_NUM = 23;
export const CACAMBA_RANGE_DEN = 20;

export type CacambaInput = {
  /** Volume em m³. Aceita número ou string numérica — vem de `<button>`. */
  sizeM3?: number | string | null;
  /** Permanência em dias. */
  days?: number | string | null;
};

function asKey<T extends Record<number, number>>(
  table: T,
  raw: number | string | null | undefined,
  what: string,
): keyof T {
  const n = typeof raw === 'string' ? Number(raw) : raw;
  if (n == null || !Number.isFinite(n) || !(n in table)) {
    throw new PricingInputError(`${what} não suportado: "${String(raw)}".`);
  }
  return n as keyof T;
}

export function calcCacambaCents(input: CacambaInput): ServicePricingCents {
  const size = asKey(CACAMBA_SIZE_CENTS, input.sizeM3, 'Tamanho de caçamba');
  const days = asKey(CACAMBA_PERIOD_CENTS, input.days, 'Período de permanência');

  const sizeCents = CACAMBA_SIZE_CENTS[size];
  const periodCents = CACAMBA_PERIOD_CENTS[days];
  const lowCents = sizeCents + periodCents;

  return {
    lowCents,
    highCents: scale(lowCents, CACAMBA_RANGE_NUM, CACAMBA_RANGE_DEN),
    lines: [
      { label: `Caçamba de ${String(size)} m³`, cents: sizeCents },
      {
        label: `Permanência de ${String(days)} ${days === 1 ? 'dia' : 'dias'}`,
        cents: periodCents,
      },
    ],
  };
}
