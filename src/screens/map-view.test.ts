import { describe, it, expect } from 'vitest';
import { DEFAULT_CENTER, haversineKm, mapsEnabled } from './map-view';

describe('haversineKm', () => {
  it('distância de um ponto a ele mesmo é zero', () => {
    expect(haversineKm(DEFAULT_CENTER, DEFAULT_CENTER)).toBe(0);
  });

  it('Av. Paulista → Estádio do Morumbi ≈ 8 km em linha reta', () => {
    const paulista = { lat: -23.5613, lng: -46.6565 };
    const morumbi = { lat: -23.6004, lng: -46.7196 };
    expect(haversineKm(paulista, morumbi)).toBeCloseTo(7.7, 0);
  });

  it('São Paulo → Rio de Janeiro ≈ 360 km em linha reta', () => {
    const sp = { lat: -23.5505, lng: -46.6333 };
    const rj = { lat: -22.9068, lng: -43.1729 };
    expect(haversineKm(sp, rj)).toBeGreaterThan(350);
    expect(haversineKm(sp, rj)).toBeLessThan(370);
  });

  it('é simétrica', () => {
    const a = { lat: -23.5, lng: -46.6 };
    const b = { lat: -22.9, lng: -43.1 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });

  it('atravessa o meridiano sem estourar', () => {
    const oeste = { lat: 0, lng: -179.9 };
    const leste = { lat: 0, lng: 179.9 };
    // Pontos quase colados fisicamente. A fórmula devolve a distância pelo
    // caminho curto — sem isso, ordenar prestadores por proximidade perto da
    // linha de data daria resultado invertido.
    expect(haversineKm(oeste, leste)).toBeLessThan(30);
  });
});

describe('degradação sem chave', () => {
  it('mapsEnabled() é falso quando a variável não está definida', () => {
    // O ambiente de teste não define VITE_GOOGLE_MAPS_API_KEY. É este caminho
    // que mantém o app navegável em dev e em qualquer build sem a chave.
    expect(mapsEnabled()).toBe(false);
  });
});
