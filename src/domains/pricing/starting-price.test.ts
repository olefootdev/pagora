// =====================================================================
// PAGORA — Preço de partida: derivado, exaustivo, nunca inventado
// =====================================================================

import { describe, it, expect } from 'vitest';
import { startingPriceCents } from './starting-price';
import { calcFreteCents, DEFAULT_DISTANCE_KM } from './frete-pricing';
import {
  calcCacambaCents,
  calcGuinchoCents,
  GUINCHO_DEFAULT_DISTANCE_KM,
  GUINCHO_VEHICLE_CENTS,
} from './service-pricing';
import { NEED_KINDS } from '../intent/intent';

describe('startingPriceCents', () => {
  it('cobre TODA necessidade — um card sem preço definido é bug de dado', () => {
    for (const need of NEED_KINDS) {
      // `null` é resposta válida (sob consulta); `undefined` seria um caso
      // esquecido no switch.
      expect(startingPriceCents(need)).not.toBeUndefined();
    }
  });

  it('é DERIVADO dos calculadores, não um literal paralelo', () => {
    // A asserção de identidade é o que impede as duas fontes de divergirem:
    // se o preço da caçamba mudar na constante, este teste continua passando
    // e o card muda junto. Um literal aqui quebraria no primeiro reajuste.
    expect(startingPriceCents('entulho')).toBe(calcCacambaCents({ sizeM3: 3, days: 1 }).lowCents);
    expect(startingPriceCents('carga')).toBe(
      calcFreteCents({ distanceKm: DEFAULT_DISTANCE_KM, vehicle: 'van', helpers: 0 }).lowCents,
    );
    expect(startingPriceCents('mudanca')).toBe(
      calcFreteCents({ distanceKm: DEFAULT_DISTANCE_KM, vehicle: 'bau', helpers: 0 }).lowCents,
    );
  });

  it('os valores de hoje, por extenso — mudou preço, muda este teste JUNTO', () => {
    expect(startingPriceCents('entulho')).toBe(18_000); // R$ 180 — caçamba 3 m³, 1 dia
    expect(startingPriceCents('veiculo')).toBe(16_000); // R$ 160 — moto, 8 km, na rua
    expect(startingPriceCents('carga')).toBe(21_000); //   R$ 210 — van, 15 km
    expect(startingPriceCents('material')).toBe(21_000);
    expect(startingPriceCents('mudanca')).toBe(26_000); // R$ 260 — baú, 15 km
  });

  it('guincho parte da MOTO — "a partir de" é o menor preço real', () => {
    // A moto tem sobretaxa negativa (pesa menos). Partir do carro popular
    // mostraria R$ 180 como piso quando o motor cobra R$ 160 de quem tem
    // moto — e "a partir de" que não é o mínimo é propaganda enganosa.
    const cheapest = Math.min(
      ...Object.keys(GUINCHO_VEHICLE_CENTS).map(
        (v) =>
          calcGuinchoCents({
            distanceKm: GUINCHO_DEFAULT_DISTANCE_KM,
            vehicleType: v,
            access: 'rua',
          }).lowCents,
      ),
    );
    expect(startingPriceCents('veiculo')).toBe(cheapest);
  });

  it('máquina é "sob consulta" — null, nunca um número inventado', () => {
    expect(startingPriceCents('maquina')).toBeNull();
  });
});
