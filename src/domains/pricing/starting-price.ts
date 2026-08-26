// =====================================================================
// PAGORA — Preço de partida por necessidade
// =====================================================================
// Os cards de serviço da home mostram "a partir de R$ X". Este módulo é a
// ÚNICA fonte desse número, e ele é DERIVADO dos calculadores reais — nunca
// um literal em tela. Se uma constante de preço mudar, o card muda junto;
// se alguém cravar um número numa tela, o teste deste arquivo não protege
// nada e o bug da van volta por outra porta.
//
// "A partir de" significa o MENOR preço que o motor devolve para aquela
// necessidade, na configuração mínima honesta:
//   caçamba  → 3 m³ por 1 dia
//   guincho  → moto (a mais barata de rebocar), acesso na rua, km padrão
//   frete    → van, sem ajudante, km padrão
//   mudança  → baú, sem ajudante, km padrão
//   máquina  → não tem motor de preço: `null`, e a tela diz "sob consulta".
//              Inventar número aqui quebraria exatamente a confiança que o
//              preço de partida existe para construir.
// =====================================================================

import { calcFreteCents, DEFAULT_DISTANCE_KM } from './frete-pricing';
import { calcCacambaCents, calcGuinchoCents, GUINCHO_DEFAULT_DISTANCE_KM } from './service-pricing';
import type { NeedKind } from '../intent/intent';

export function startingPriceCents(need: NeedKind): number | null {
  switch (need) {
    case 'entulho':
      return calcCacambaCents({ sizeM3: 3, days: 1 }).lowCents;
    case 'veiculo':
      return calcGuinchoCents({
        distanceKm: GUINCHO_DEFAULT_DISTANCE_KM,
        vehicleType: 'moto',
        access: 'rua',
      }).lowCents;
    case 'carga':
    case 'material':
      return calcFreteCents({ distanceKm: DEFAULT_DISTANCE_KM, vehicle: 'van', helpers: 0 })
        .lowCents;
    case 'mudanca':
      return calcFreteCents({ distanceKm: DEFAULT_DISTANCE_KM, vehicle: 'bau', helpers: 0 })
        .lowCents;
    case 'maquina':
      return null;
  }
}
