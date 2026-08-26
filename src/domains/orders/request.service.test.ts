import { describe, it, expect } from 'vitest';
import { addressesFor, guessCity, localityFor } from './request.service';

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

  it('número no fim não vira nome de cidade', () => {
    // "Rua da Obra, 500" tem duas partes e a última é o número. Gravar
    // `origin_city = '500'` tira o pedido de todo filtro por região —
    // nenhum prestador atende a cidade "500".
    expect(guessCity('Rua da Obra, 500')).toBeNull();
    expect(guessCity('Av. Brasil, 1200')).toBeNull();
    expect(guessCity('Rua X, 100, 09300')).toBeNull();
  });

  it('cidade com número no nome continua valendo', () => {
    expect(guessCity('Rua A, 10, Embu das Artes')).toBe('Embu das Artes');
  });
});

describe('addressesFor — qual campo é endereço em cada fluxo', () => {
  it('frete usa origin e dest', () => {
    expect(addressesFor('frete', { origin: 'A, 1, Santos', dest: 'B, 2, Guarujá' })).toEqual({
      origin: 'A, 1, Santos',
      dest: 'B, 2, Guarujá',
    });
  });

  it('caçamba entrega e retira no mesmo endereço', () => {
    const r = addressesFor('cacamba', { address: 'Rua X, 10, Campinas' });
    expect(r.origin).toBe('Rua X, 10, Campinas');
    expect(r.dest).toBe('Rua X, 10, Campinas');
  });

  it('guincho usa currentLoc como origem, NUNCA location', () => {
    // Regressão: `location` é o tipo de acesso ('rua', 'garagem'), não o
    // endereço. A ordem invertida fazia todo pedido de guincho gravar
    // origin_city = null, e o prestador não conseguia filtrar por região.
    const r = addressesFor('guincho', {
      currentLoc: 'Marginal Tietê, km 20, São Paulo',
      location: 'expressa',
      destAddr: 'Oficina do Zé, 300, São Paulo',
    });
    expect(r.origin).toBe('Marginal Tietê, km 20, São Paulo');
    expect(guessCity(r.origin)).toBe('São Paulo');
  });

  it('guincho sem endereço não inventa um a partir do acesso', () => {
    const r = addressesFor('guincho', { location: 'garagem' });
    expect(r.origin).toBeUndefined();
    expect(guessCity(r.origin)).toBeNull();
  });
});

describe('localityFor — dado estruturado ganha da heurística', () => {
  it('usa a cidade do Places quando ela existe', () => {
    const r = localityFor('frete', {
      origin: 'Rodovia Anhanguera km 32',
      originCity: 'Jundiaí',
      originState: 'SP',
      dest: 'Av. Paulista, 1000, São Paulo',
      destCity: 'São Paulo',
      destState: 'SP',
    });
    // `guessCity('Rodovia Anhanguera km 32')` devolveria null — sem vírgula
    // não há o que extrair. É exatamente o endereço de quem chama guincho.
    expect(r.originCity).toBe('Jundiaí');
    expect(r.originState).toBe('SP');
    expect(r.destCity).toBe('São Paulo');
  });

  it('sem Places, cai na heurística — que continua funcionando', () => {
    const r = localityFor('frete', {
      origin: 'Rua X, 10, Campinas',
      dest: 'Rua Y, 20, Valinhos',
    });
    expect(r.originCity).toBe('Campinas');
    expect(r.destCity).toBe('Valinhos');
    expect(r.originState).toBeNull();
  });

  it('caçamba herda o destino da origem — é o mesmo endereço', () => {
    // Sem isto o pedido saía com `dest_city = null` e sumia dos filtros de
    // região do prestador pela metade.
    const r = localityFor('cacamba', {
      address: 'Rua da Obra, 500',
      originCity: 'Santo André',
      originState: 'SP',
    });
    expect(r.destCity).toBe('Santo André');
    expect(r.destState).toBe('SP');
  });

  it('guincho lê o endereço de currentLoc, não do tipo de acesso', () => {
    const r = localityFor('guincho', {
      currentLoc: 'Marginal Tietê, km 20, São Paulo',
      location: 'expressa',
    });
    expect(r.originCity).toBe('São Paulo');
  });

  it('sem endereço nenhum não inventa cidade', () => {
    const r = localityFor('frete', {});
    expect(r.originCity).toBeNull();
    expect(r.destCity).toBeNull();
  });
});
