// =====================================================================
// PAGORA — O que o mapa do acompanhamento desenha
// =====================================================================
// A regra que estes testes protegem: o mapa só desenha o que o pedido
// realmente guardou. Pedido sem coordenada — todos os publicados antes do
// Places existir — cai na ilustração, e o texto alternativo diz isso.
// Desenhar um trajeto inventado num pedido real é pior que não desenhar nada.
// =====================================================================

import { describe, it, expect } from 'vitest';
import { tripGeometry } from './acompanhar';
import { ORDER_STATUS_LABELS } from '../domains/orders/order.status';

const PAULISTA = { lat: -23.5613, lng: -46.6565 };
const IBIRAPUERA = { lat: -23.5874, lng: -46.6576 };

describe('tripGeometry', () => {
  it('dois pontos distintos viram dois marcadores e uma rota', () => {
    const t = tripGeometry({ originGeo: PAULISTA, destGeo: IBIRAPUERA }, 'en_route');
    expect(t.markers).toHaveLength(2);
    expect(t.route).toEqual({ origin: PAULISTA, destination: IBIRAPUERA });
  });

  it('o destino é o marcador destacado — é para onde a carga vai', () => {
    const t = tripGeometry({ originGeo: PAULISTA, destGeo: IBIRAPUERA }, 'en_route');
    expect(t.markers.find((m) => m.id === 'destino')?.highlighted).toBe(true);
    expect(t.markers.find((m) => m.id === 'origem')?.highlighted).toBeUndefined();
  });

  it('caçamba tem um ponto só — não inventa rota de um ponto para ele mesmo', () => {
    const t = tripGeometry({ originGeo: PAULISTA, destGeo: PAULISTA }, 'paid');
    expect(t.markers).toHaveLength(1);
    expect(t.route).toBeUndefined();
  });

  it('sem coordenada nenhuma não desenha nada, e o texto alternativo avisa', () => {
    // É o caso de todo pedido publicado antes do Places entrar.
    const t = tripGeometry({ origin: 'Av. Paulista, 1000', dest: 'Rua Augusta, 500' }, 'paid');
    expect(t.markers).toHaveLength(0);
    expect(t.route).toBeUndefined();
    expect(t.alt).toContain('ilustrativo');
  });

  it('só a origem resolvida já vale um marcador', () => {
    const t = tripGeometry({ originGeo: PAULISTA }, 'paid');
    expect(t.markers).toHaveLength(1);
    expect(t.markers[0]?.id).toBe('origem');
    expect(t.route).toBeUndefined();
  });

  it('só o destino resolvido também vale', () => {
    const t = tripGeometry({ destGeo: IBIRAPUERA }, 'paid');
    expect(t.markers).toHaveLength(1);
    expect(t.markers[0]?.id).toBe('destino');
  });

  it('o texto alternativo carrega o estado do pedido, não só "mapa"', () => {
    // Quem usa leitor de tela precisa da mesma informação que o mapa dá a
    // quem enxerga — e o estado é a informação principal desta tela.
    //
    // A asserção usa `ORDER_STATUS_LABELS` em vez de um texto cravado: assim
    // renomear um status não quebra o alt em silêncio, quebra este teste.
    const t = tripGeometry({ originGeo: PAULISTA, destGeo: IBIRAPUERA }, 'in_progress');
    expect(t.alt).toContain(ORDER_STATUS_LABELS.in_progress);
  });
});
