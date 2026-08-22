import { describe, it, expect } from 'vitest';
import { guessCity } from './request.service';

describe('guessCity', () => {
  it('extrai a cidade de um endereço completo', () => {
    expect(guessCity('Av. Paulista, 1000, São Paulo')).toBe('São Paulo');
    expect(guessCity('Rua Augusta, 500, São Paulo')).toBe('São Paulo');
  });

  it('lida com espaçamento irregular', () => {
    expect(guessCity('Rua X,  100 ,   Campinas ')).toBe('Campinas');
  });

  it('devolve null quando não há vírgula suficiente para inferir', () => {
    // Melhor null do que chutar: uma cidade errada faz o pedido aparecer para
    // prestadores da região errada, o que é pior que aparecer sem cidade.
    expect(guessCity('Av. Paulista')).toBeNull();
    expect(guessCity('')).toBeNull();
    expect(guessCity(undefined)).toBeNull();
  });

  it('ignora vírgulas sobrando no fim', () => {
    expect(guessCity('Rua X, 100, Santos,')).toBe('Santos');
  });
});
