// =====================================================================
// PAGORA — Pedir de novo
// =====================================================================
// Cliente de caçamba pede caçamba de novo. Cliente de frete entre as mesmas
// duas obras pede o mesmo frete de novo. Hoje ele redigita tudo — e o payload
// do pedido anterior está gravado, inteiro, em `service_requests`.
//
// Este módulo decide DUAS coisas, e as duas são de produto:
//   1. Qual pedido vale repetir (o mais recente que não seja um rascunho).
//   2. O que se repete e o que NÃO se repete.
//
// O que não se repete é a parte que importa: data, hora e urgência ficam de
// fora. Repetir "hoje às 14h" de um pedido de três semanas atrás produziria
// um pedido para uma data no passado — e o cliente só descobriria no fim.
// =====================================================================

import type { PagoraState } from '../../types';
import type { Tables } from '../../lib/database.types';
import { isNeedKind, type NeedKind } from '../intent/intent';

export type RepeatablePedido = {
  /** A necessidade em que o fluxo reabre. */
  need: NeedKind;
  /** O estado do fluxo, já sem o que não deve ser repetido. */
  state: PagoraState;
  /** Origem, para a tela poder mostrar de qual pedido veio. */
  from: Tables<'service_requests'>;
};

/**
 * A necessidade de um pedido antigo.
 *
 * Pedidos publicados ANTES de o `need` passar a ser gravado no payload não
 * têm o campo. Para eles, `service` é o melhor palpite disponível: caçamba e
 * guincho mapeiam sem ambiguidade; `frete` cai em "carga", que é o rótulo
 * mais genérico dos quatro que viram frete — errar para o genérico é
 * recuperável (o cliente ajusta no passo 1), errar para o específico não.
 */
export function needOf(request: Tables<'service_requests'>): NeedKind {
  const payload = (request.payload ?? {}) as PagoraState;
  if (payload.need && isNeedKind(payload.need)) return payload.need;

  switch (request.service) {
    case 'cacamba':
      return 'entulho';
    case 'guincho':
      return 'veiculo';
    case 'frete':
      return 'carga';
  }
}

/**
 * O que se repete de um pedido.
 *
 * Fora ficam: data, hora e urgência (viram decisão nova), e a distância
 * calculada — que é derivada dos endereços e será recalculada. Ficam:
 * endereços com coordenada, veículo, ajudantes, acesso, tamanho, material,
 * observações. É o trabalho de digitação que a pessoa não repete.
 */
export function repeatState(request: Tables<'service_requests'>): PagoraState {
  const p = (request.payload ?? {}) as PagoraState;
  const {
    scheduledDate: _d,
    scheduledTime: _t,
    urgency: _u,
    distance: _dist,
    distanceSource: _ds,
    ...resto
  } = p;
  return resto;
}

/**
 * O pedido que vale oferecer para repetir, se houver.
 *
 * Só pedidos que chegaram a algum lugar: `cancelled` e `expired` ficam de
 * fora — repetir o que deu errado sem o cliente pedir é insistir no erro.
 */
export function findRepeatable(requests: Tables<'service_requests'>[]): RepeatablePedido | null {
  const candidato = [...requests]
    .filter((r) => r.status === 'accepted' || r.status === 'quoting' || r.status === 'open')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  if (!candidato) return null;

  const state = repeatState(candidato);
  // Sem endereço nenhum não há o que repetir: o valor da recompra é pular a
  // digitação, e um pedido sem endereço não poupa digitação nenhuma.
  const temEndereco = Boolean(state.origin || state.address || state.currentLoc);
  if (!temEndereco) return null;

  return { need: needOf(candidato), state, from: candidato };
}

/** O rótulo curto do que será repetido: "Caçamba · Santo André". */
export function repeatLabel(request: Tables<'service_requests'>): string {
  const p = (request.payload ?? {}) as PagoraState;
  const onde = request.origin_city ?? p.origin ?? p.address ?? p.currentLoc ?? '';
  const need = needOf(request);
  const servico = NEED_LABEL_CURTO[need];
  return onde ? `${servico} · ${onde}` : servico;
}

const NEED_LABEL_CURTO: Record<NeedKind, string> = {
  entulho: 'Caçamba',
  mudanca: 'Mudança',
  material: 'Material',
  carga: 'Frete',
  veiculo: 'Guincho',
  maquina: 'Máquina',
};
