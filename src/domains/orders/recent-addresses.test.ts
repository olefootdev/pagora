import { describe, it, expect } from 'vitest';
import { recentAddresses } from './recent-addresses';
import type { PagoraState } from '../../types';
import type { ServiceType, Tables } from '../../lib/database.types';

function req(
  created_at: string,
  payload: PagoraState,
  service: ServiceType = 'frete',
): Tables<'service_requests'> {
  return { id: created_at, service, created_at, payload } as Tables<'service_requests'>;
}

describe('recentAddresses', () => {
  it('pega origem e destino do mesmo pedido', () => {
    const r = recentAddresses([req('2026-08-20', { origin: 'Rua A', dest: 'Rua B' })]);
    expect(r.map((a) => a.address)).toEqual(['Rua A', 'Rua B']);
  });

  it('pega o endereço único da caçamba e o do guincho', () => {
    const r = recentAddresses([
      req('2026-08-20', { address: 'Rua da Obra, 500' }, 'cacamba'),
      req(
        '2026-08-19',
        { currentLoc: 'Marginal Tietê km 20', destAddr: 'Oficina do Zé' },
        'guincho',
      ),
    ]);
    expect(r.map((a) => a.address)).toContain('Rua da Obra, 500');
    expect(r.map((a) => a.address)).toContain('Marginal Tietê km 20');
    expect(r.map((a) => a.address)).toContain('Oficina do Zé');
  });

  it('não repete o mesmo endereço, ainda que digitado diferente', () => {
    const r = recentAddresses([
      req('2026-08-20', { origin: 'Rua A, 10' }),
      req('2026-08-19', { origin: '  rua a,   10  ' }),
    ]);
    expect(r).toHaveLength(1);
  });

  it('o mais recente primeiro', () => {
    const r = recentAddresses([
      req('2026-08-01', { origin: 'Velho' }),
      req('2026-08-25', { origin: 'Novo' }),
    ]);
    expect(r[0]?.address).toBe('Novo');
  });

  it('a coordenada vem junto — é o que devolve a distância real', () => {
    const r = recentAddresses([
      req('2026-08-20', {
        origin: 'Rua A',
        originGeo: { lat: -23.5, lng: -46.6 },
        originCity: 'SP',
      }),
    ]);
    expect(r[0]?.geo).toEqual({ lat: -23.5, lng: -46.6 });
    expect(r[0]?.city).toBe('SP');
  });

  it('endereço COM coordenada não é sobrescrito por um sem, no mesmo dia', () => {
    // Se o sem-geo vencesse, escolher o endereço recente devolveria a
    // distância estimada em vez da real — que é o que este módulo evita.
    const comGeo = req('2026-08-20', { origin: 'Rua A', originGeo: { lat: -23.5, lng: -46.6 } });
    const semGeo = req('2026-08-20', { dest: 'Rua A' });
    expect(recentAddresses([comGeo, semGeo])[0]?.geo).toBeTruthy();
    expect(recentAddresses([semGeo, comGeo]).find((a) => a.address === 'Rua A')?.geo).toBeTruthy();
  });

  it('respeita o limite', () => {
    const pedidos = Array.from({ length: 10 }, (_, i) =>
      req(`2026-08-${String(i + 1).padStart(2, '0')}`, { origin: `Rua ${i}` }),
    );
    expect(recentAddresses(pedidos, 3)).toHaveLength(3);
  });

  it('ignora vazio e espaço em branco', () => {
    expect(recentAddresses([req('2026-08-20', { origin: '', dest: '   ' })])).toHaveLength(0);
  });

  it('sem pedidos, lista vazia — não erro', () => {
    expect(recentAddresses([])).toEqual([]);
  });
});
