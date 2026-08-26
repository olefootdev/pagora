// =====================================================================
// PAGORA — Endereços recentes
// =====================================================================
// Não existe tabela de endereços salvos, e este módulo existe para que ela
// continue não existindo. Os endereços que a pessoa usa estão nos pedidos
// dela — origem, destino, local do veículo, endereço da caçamba. Derivar é
// mais barato que cadastrar, e é melhor produto: ninguém precisa lembrar de
// "salvar um endereço", e o que aparece é exatamente o que foi usado.
//
// A coordenada vem junto quando existe. É o que torna a repetição valiosa:
// escolher um endereço recente devolve o `geo`, e com ele a distância real
// volta a ser calculada — sem digitar e sem depender de o Places acertar de
// novo.
// =====================================================================

import type { PagoraState } from '../../types';
import type { Tables } from '../../lib/database.types';

export type RecentAddress = {
  /** O texto como foi gravado. É o que aparece na lista. */
  address: string;
  geo?: { lat: number; lng: number } | null;
  city?: string | null;
  state?: string | null;
  /** Quando foi usado pela última vez — define a ordem. */
  usedAt: string;
};

/** Todos os endereços de um pedido, com a coordenada de cada um. */
function fromRequest(r: Tables<'service_requests'>): RecentAddress[] {
  const p = (r.payload ?? {}) as PagoraState;
  const at = r.created_at;

  const candidatos: RecentAddress[] = [
    {
      address: p.origin ?? '',
      geo: p.originGeo,
      city: p.originCity,
      state: p.originState,
      usedAt: at,
    },
    { address: p.dest ?? '', geo: p.destGeo, city: p.destCity, state: p.destState, usedAt: at },
    // Caçamba e guincho guardam o endereço em campos próprios.
    {
      address: p.address ?? '',
      geo: p.originGeo,
      city: p.originCity,
      state: p.originState,
      usedAt: at,
    },
    {
      address: p.currentLoc ?? '',
      geo: p.originGeo,
      city: p.originCity,
      state: p.originState,
      usedAt: at,
    },
    { address: p.destAddr ?? '', geo: p.destGeo, city: p.destCity, state: p.destState, usedAt: at },
  ];

  return candidatos.filter((c) => c.address.trim().length > 0);
}

/** Chave de deduplicação: o mesmo endereço digitado com espaçamento ou caixa diferente é o mesmo endereço. */
function key(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Os endereços mais recentes do cliente, sem repetição.
 *
 * Quando o mesmo endereço aparece duas vezes, vence a ocorrência MAIS NOVA —
 * e, entre duas com a mesma data, a que TEM coordenada. Um endereço sem
 * `geo` sobrescrevendo um com `geo` faria a distância real voltar a ser
 * estimada, que é exatamente o que este módulo existe para evitar.
 */
export function recentAddresses(
  requests: Tables<'service_requests'>[],
  limit = 3,
): RecentAddress[] {
  const porEndereco = new Map<string, RecentAddress>();

  for (const r of requests) {
    for (const cand of fromRequest(r)) {
      const k = key(cand.address);
      const atual = porEndereco.get(k);
      if (!atual) {
        porEndereco.set(k, cand);
        continue;
      }
      const maisNovo = cand.usedAt > atual.usedAt;
      const ganhaCoordenada = cand.usedAt === atual.usedAt && !atual.geo && !!cand.geo;
      if (maisNovo || ganhaCoordenada) porEndereco.set(k, cand);
    }
  }

  return [...porEndereco.values()].sort((a, b) => b.usedAt.localeCompare(a.usedAt)).slice(0, limit);
}
