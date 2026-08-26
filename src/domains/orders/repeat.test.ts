import { describe, it, expect } from 'vitest';
import { findRepeatable, needOf, repeatLabel, repeatState } from './repeat';
import type { PagoraState } from '../../types';
import type { RequestStatus, ServiceType, Tables } from '../../lib/database.types';

function req(
  over: Partial<Tables<'service_requests'>> & { payload?: PagoraState } = {},
): Tables<'service_requests'> {
  return {
    id: 'r1',
    service: 'frete' as ServiceType,
    status: 'accepted' as RequestStatus,
    origin_city: 'São Paulo',
    created_at: '2026-08-20T10:00:00.000Z',
    payload: { origin: 'Rua A, 10, São Paulo', dest: 'Rua B, 20, São Paulo' },
    ...over,
  } as Tables<'service_requests'>;
}

describe('needOf', () => {
  it('usa o `need` do payload quando existe — é o dado exato', () => {
    expect(needOf(req({ payload: { need: 'mudanca', origin: 'x' } }))).toBe('mudanca');
  });

  it('caçamba e guincho mapeiam sem ambiguidade', () => {
    expect(needOf(req({ service: 'cacamba' as ServiceType, payload: {} }))).toBe('entulho');
    expect(needOf(req({ service: 'guincho' as ServiceType, payload: {} }))).toBe('veiculo');
  });

  it('frete antigo cai no genérico — errar para o genérico é recuperável', () => {
    // Mudança, material, carga e máquina viram todos `frete`. Sem o `need`
    // gravado, escolher "carga" deixa o cliente ajustar no passo 1; escolher
    // "mudança" para quem pediu material seria confiança mal colocada.
    expect(needOf(req({ service: 'frete' as ServiceType, payload: {} }))).toBe('carga');
  });

  it('ignora um `need` inválido gravado no payload', () => {
    expect(needOf(req({ service: 'cacamba' as ServiceType, payload: { need: 'foguete' } }))).toBe(
      'entulho',
    );
  });
});

describe('repeatState — o que NÃO se repete', () => {
  const completo: PagoraState = {
    need: 'mudanca',
    origin: 'Rua A, 10',
    dest: 'Rua B, 20',
    originGeo: { lat: -23.5, lng: -46.6 },
    vehicle: 'bau',
    helpers: 2,
    notes: 'Portaria fecha às 18h',
    scheduledDate: '2026-08-01',
    scheduledTime: '14:00',
    urgency: 'now',
    distance: 12.4,
    distanceSource: 'route',
  };

  it('data, hora e urgência ficam de fora — senão o pedido nasce no passado', () => {
    const s = repeatState(req({ payload: completo }));
    expect(s.scheduledDate).toBeUndefined();
    expect(s.scheduledTime).toBeUndefined();
    expect(s.urgency).toBeUndefined();
  });

  it('a distância sai — ela é derivada e será recalculada', () => {
    const s = repeatState(req({ payload: completo }));
    expect(s.distance).toBeUndefined();
    expect(s.distanceSource).toBeUndefined();
  });

  it('o trabalho de digitação é o que se repete', () => {
    const s = repeatState(req({ payload: completo }));
    expect(s.origin).toBe('Rua A, 10');
    expect(s.dest).toBe('Rua B, 20');
    expect(s.originGeo).toEqual({ lat: -23.5, lng: -46.6 });
    expect(s.vehicle).toBe('bau');
    expect(s.helpers).toBe(2);
    expect(s.notes).toBe('Portaria fecha às 18h');
  });
});

describe('findRepeatable', () => {
  it('escolhe o mais recente', () => {
    const r = findRepeatable([
      req({ id: 'velho', created_at: '2026-08-01T10:00:00.000Z' }),
      req({ id: 'novo', created_at: '2026-08-20T10:00:00.000Z' }),
    ]);
    expect(r?.from.id).toBe('novo');
  });

  it('não oferece repetir o que deu errado', () => {
    // Cancelado e expirado ficam de fora: insistir no erro sem o cliente
    // pedir é o oposto de ajudar.
    for (const status of ['cancelled', 'expired'] as RequestStatus[]) {
      expect(findRepeatable([req({ status })])).toBeNull();
    }
  });

  it('pedido sem endereço não vale repetir — não poupa digitação nenhuma', () => {
    expect(findRepeatable([req({ payload: { vehicle: 'van' } })])).toBeNull();
  });

  it('caçamba repete pelo endereço único', () => {
    const r = findRepeatable([
      req({
        service: 'cacamba' as ServiceType,
        payload: { address: 'Rua da Obra, 500', size: '5' },
      }),
    ]);
    expect(r?.need).toBe('entulho');
    expect(r?.state.size).toBe('5');
  });

  it('lista vazia é null, não erro', () => {
    expect(findRepeatable([])).toBeNull();
  });
});

describe('repeatLabel', () => {
  it('serviço e onde, curto o bastante para um card', () => {
    expect(
      repeatLabel(req({ payload: { need: 'entulho', address: 'x' }, origin_city: 'Santo André' })),
    ).toBe('Caçamba · Santo André');
  });

  it('sem cidade, só o serviço — nunca um separador solto', () => {
    expect(repeatLabel(req({ payload: { need: 'carga' }, origin_city: null }))).toBe('Frete');
  });
});
