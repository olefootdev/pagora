import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  geocode,
  geocodePair,
  setGeocodeProvider,
  clearGeocodeCache,
  nominatimProvider,
  googleProvider,
  type GeocodeProvider,
  type GeocodeResult,
} from './geocoding';
import { roadDistanceKm, travelMinutes, ROAD_FACTOR, haversineKm } from './geo';

const PAULISTA = { lat: -23.5614, lng: -46.6559 };
const PINHEIROS = { lat: -23.5673, lng: -46.6931 };

const fakeResult = (over: Partial<GeocodeResult> = {}): GeocodeResult => ({
  point: PAULISTA,
  label: 'Av. Paulista, 1000 - São Paulo',
  precision: 'exata',
  provider: 'fake',
  ...over,
});

afterEach(() => {
  setGeocodeProvider(null);
  clearGeocodeCache();
  vi.restoreAllMocks();
});

describe('geocode — contrato', () => {
  it('devolve o resultado do provedor', async () => {
    setGeocodeProvider({ name: 'fake', geocode: async () => fakeResult() });
    const r = await geocode('Av. Paulista, 1000');
    expect(r?.point).toEqual(PAULISTA);
    expect(r?.precision).toBe('exata');
  });

  it('não consulta endereço curto demais — economiza request', async () => {
    const spy = vi.fn(async () => fakeResult());
    setGeocodeProvider({ name: 'fake', geocode: spy });
    expect(await geocode('SP')).toBeNull();
    expect(await geocode('')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('propaga erro de infraestrutura em vez de virar "não encontrado"', async () => {
    // A distinção importa: "não achei o endereço" pede correção do usuário;
    // "a API caiu" não é culpa dele.
    setGeocodeProvider({
      name: 'fake',
      geocode: async () => {
        throw new Error('google_status_OVER_QUERY_LIMIT');
      },
    });
    await expect(geocode('Av. Paulista, 1000')).rejects.toThrow('OVER_QUERY_LIMIT');
  });

  it('endereço inexistente devolve null, não erro', async () => {
    setGeocodeProvider({ name: 'fake', geocode: async () => null });
    expect(await geocode('Rua Que Não Existe, 99999')).toBeNull();
  });
});

describe('geocode — cache', () => {
  it('não repete consulta do mesmo endereço', async () => {
    const spy = vi.fn(async () => fakeResult());
    setGeocodeProvider({ name: 'fake', geocode: spy });

    await geocode('Av. Paulista, 1000');
    await geocode('Av. Paulista, 1000');
    await geocode('  AV. PAULISTA, 1000  '); // caixa e espaço não criam entrada nova

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('cacheia também a ausência de resultado', async () => {
    // Sem isso, endereço errado consultaria a cada revisão do formulário.
    const spy = vi.fn(async () => null);
    setGeocodeProvider({ name: 'fake', geocode: spy });

    await geocode('Rua Inexistente, 1');
    await geocode('Rua Inexistente, 1');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('endereços diferentes consultam separadamente', async () => {
    const spy = vi.fn(async () => fakeResult());
    setGeocodeProvider({ name: 'fake', geocode: spy });
    await geocode('Av. Paulista, 1000');
    await geocode('Rua Augusta, 500');
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('geocodePair', () => {
  it('resolve origem e destino', async () => {
    const provider: GeocodeProvider = {
      name: 'fake',
      geocode: async (a) =>
        a.includes('Paulista')
          ? fakeResult({ point: PAULISTA })
          : fakeResult({ point: PINHEIROS, label: 'Pinheiros' }),
    };
    setGeocodeProvider(provider);

    const r = await geocodePair('Av. Paulista, 1000', 'Rua dos Pinheiros, 200');
    expect(r.origin?.point).toEqual(PAULISTA);
    expect(r.dest?.point).toEqual(PINHEIROS);
  });

  it('um lado falhando não derruba o outro', async () => {
    setGeocodeProvider({
      name: 'fake',
      geocode: async (a) => (a.includes('Paulista') ? fakeResult() : null),
    });
    const r = await geocodePair('Av. Paulista, 1000', 'Endereço Ruim Aqui');
    expect(r.origin).not.toBeNull();
    expect(r.dest).toBeNull();
  });
});

describe('providers — construção da URL', () => {
  it('Nominatim restringe ao Brasil e pede 1 resultado', async () => {
    const fetchSpy = vi.fn(async (_url: string) => ({
      ok: true,
      json: async () => [
        { lat: '-23.5614', lon: '-46.6559', display_name: 'Av. Paulista', addresstype: 'building' },
      ],
    }));
    vi.stubGlobal('fetch', fetchSpy);

    const r = await nominatimProvider.geocode('Av. Paulista, 1000');
    const url = String(fetchSpy.mock.calls[0]![0]);
    // Sem countrycodes, "Rua São João" cai em Portugal.
    expect(url).toContain('countrycodes=br');
    expect(url).toContain('limit=1');
    expect(r?.precision).toBe('exata');
  });

  it('Nominatim marca rua/bairro como aproximado', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => [
        { lat: '-23.5', lon: '-46.6', display_name: 'Pinheiros', addresstype: 'suburb' },
      ],
    }));
    const r = await nominatimProvider.geocode('Pinheiros, São Paulo');
    expect(r?.precision).toBe('aproximada');
  });

  it('Google restringe a country:BR e envia a chave', async () => {
    const fetchSpy = vi.fn(async (_url: string) => ({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [
          {
            geometry: { location: { lat: -23.5614, lng: -46.6559 }, location_type: 'ROOFTOP' },
            formatted_address: 'Av. Paulista, 1000',
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchSpy);

    const r = await googleProvider('CHAVE123').geocode('Av. Paulista, 1000');
    const url = String(fetchSpy.mock.calls[0]![0]);
    expect(url).toContain('components=country%3ABR');
    expect(url).toContain('key=CHAVE123');
    expect(r?.precision).toBe('exata');
  });

  it('Google: ZERO_RESULTS é null, outro status é erro', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({ status: 'ZERO_RESULTS' }),
    }));
    expect(await googleProvider('K').geocode('Rua Inexistente, 9')).toBeNull();

    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({ status: 'REQUEST_DENIED' }),
    }));
    // Chave inválida não pode virar "endereço não encontrado".
    await expect(googleProvider('K').geocode('Av. Paulista, 1000')).rejects.toThrow(
      'REQUEST_DENIED',
    );
  });
});

describe('roadDistanceKm', () => {
  it('aplica o fator de sinuosidade sobre a linha reta', () => {
    const reta = haversineKm(PAULISTA, PINHEIROS);
    const rua = roadDistanceKm(PAULISTA, PINHEIROS);
    expect(rua).toBeGreaterThan(reta);
    expect(rua).toBeCloseTo(Math.round(reta * ROAD_FACTOR * 10) / 10, 5);
  });

  it('usa o mesmo fator do banco (order_tracking)', () => {
    // Se divergirem, orçamento e rastreio mostram distâncias diferentes para a
    // mesma viagem.
    expect(ROAD_FACTOR).toBe(1.35);
  });

  it('arredonda para 1 casa — o preço sai deste número', () => {
    const d = roadDistanceKm(PAULISTA, PINHEIROS);
    expect(d).toBe(Math.round(d * 10) / 10);
  });

  it('ponto igual a ele mesmo dá zero', () => {
    expect(roadDistanceKm(PAULISTA, PAULISTA)).toBe(0);
  });

  it('corrige o bug: Santos→SP não custa igual a travessia de rua', () => {
    const santos = { lat: -23.9608, lng: -46.3336 };
    const longa = roadDistanceKm(PAULISTA, santos);
    const curta = roadDistanceKm(PAULISTA, { lat: -23.5617, lng: -46.6562 });
    expect(longa).toBeGreaterThan(60);
    expect(curta).toBeLessThan(1);
    // Antes as duas viravam 15 km fixos e o mesmo preço base.
    expect(longa).not.toBe(curta);
  });
});

describe('travelMinutes', () => {
  it('estima por velocidade média urbana', () => {
    expect(travelMinutes(25)).toBe(60);
    expect(travelMinutes(12.5)).toBe(30);
  });

  it('nunca devolve zero', () => {
    expect(travelMinutes(0)).toBe(1);
    expect(travelMinutes(0.05)).toBe(1);
  });
});
