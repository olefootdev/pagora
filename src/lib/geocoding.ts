// =====================================================================
// PAGORA — Geocoding: endereço → coordenada
// =====================================================================
// Por que este módulo existe, e não é refinamento de mapa:
//
// `calcFrete` cobra por quilômetro (`km * 12`), e até aqui `km` era a
// constante 15 vinda do store. O cliente digitava origem e destino como texto
// livre, nada convertia para coordenada, e o orçamento saía sempre sobre 15 km.
// Uma mudança atravessando a rua e uma de Santos a São Paulo recebiam o mesmo
// preço base — enquanto a tela exibia "~15 km" como se fosse medido.
//
// Num produto que se vende como "orçamento honesto", isso quebra na primeira
// conferência do cliente. Geocoding aqui é pré-requisito do preço.
//
// ---------------------------------------------------------------------
// Agnóstico de fornecedor, de propósito
// ---------------------------------------------------------------------
// A escolha entre Google, Nominatim ou outro ainda não foi feita, e trocar
// depois não pode significar mexer no fluxo de cotação. Cada provedor
// implementa `GeocodeProvider`; o resto do app chama `geocode()` e não sabe
// quem respondeu.
//
// O padrão é Nominatim (OpenStreetMap): grátis, sem chave, funciona hoje.
// Definindo `VITE_GOOGLE_MAPS_KEY`, o Google assume sozinho — nenhuma outra
// linha muda.
// =====================================================================

import type { LatLng } from './geo';

export type GeocodeResult = {
  point: LatLng;
  /** Endereço normalizado como o provedor entendeu. Mostrar ao usuário. */
  label: string;
  /**
   * Quão preciso é o ponto:
   *   'exata'      → número da rua identificado
   *   'aproximada' → caiu na rua, no bairro ou na cidade
   *
   * Importa para o preço: distância entre dois centros de bairro pode errar
   * alguns quilômetros, e o usuário precisa saber que o valor é estimativa.
   */
  precision: 'exata' | 'aproximada';
  provider: string;
};

export type GeocodeProvider = {
  name: string;
  geocode: (address: string) => Promise<GeocodeResult | null>;
};

// ─── Cache ───────────────────────────────────────────────────────────

// O mesmo endereço é consultado várias vezes: o usuário volta um passo, revisa
// o resumo, corrige o veículo e volta. Sem cache isso vira request repetido —
// caro no Google, e violação de limite no Nominatim (1 req/s).
const cache = new Map<string, GeocodeResult | null>();

const cacheKey = (address: string, provider: string) =>
  `${provider}::${address.trim().toLowerCase().replace(/\s+/g, ' ')}`;

export const clearGeocodeCache = () => cache.clear();

// ─── Nominatim (OpenStreetMap) ───────────────────────────────────────

// Grátis e sem chave, mas com limite de 1 req/s e a exigência de identificar a
// aplicação. Cobertura de endereço residencial brasileiro é irregular — por
// isso `precision` existe, para o app não tratar um centro de bairro como se
// fosse a porta da casa.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export const nominatimProvider: GeocodeProvider = {
  name: 'nominatim',
  geocode: async (address) => {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    // Sem o viés de país, "Rua São João" pode cair em Portugal.
    url.searchParams.set('countrycodes', 'br');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: { 'Accept-Language': 'pt-BR' },
    });
    if (!res.ok) throw new Error(`nominatim_http_${res.status}`);

    const json = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      addresstype?: string;
    }>;
    const hit = json[0];
    if (!hit) return null;

    // `addresstype` diz o que foi encontrado. Só 'building' e 'house' indicam
    // número identificado; o resto é rua, bairro ou cidade.
    const exato = hit.addresstype === 'building' || hit.addresstype === 'house';

    return {
      point: { lat: Number(hit.lat), lng: Number(hit.lon) },
      label: hit.display_name,
      precision: exato ? 'exata' : 'aproximada',
      provider: 'nominatim',
    };
  },
};

// ─── Google Geocoding ────────────────────────────────────────────────

// Melhor cobertura de endereço brasileiro, cobrado por request. Assume sozinho
// quando `VITE_GOOGLE_MAPS_KEY` existe.
const GOOGLE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export const googleProvider = (apiKey: string): GeocodeProvider => ({
  name: 'google',
  geocode: async (address) => {
    const url = new URL(GOOGLE_URL);
    url.searchParams.set('address', address);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('region', 'br');
    url.searchParams.set('language', 'pt-BR');
    // Restringe ao Brasil — sem isso, endereço ambíguo cai em outro país.
    url.searchParams.set('components', 'country:BR');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`google_http_${res.status}`);

    const json = (await res.json()) as {
      status: string;
      results?: Array<{
        geometry: { location: { lat: number; lng: number }; location_type: string };
        formatted_address: string;
      }>;
    };

    // ZERO_RESULTS é resposta válida: o endereço não existe. Qualquer outro
    // status é falha de configuração ou de cota, e precisa estourar em vez de
    // virar "endereço não encontrado" silencioso.
    if (json.status === 'ZERO_RESULTS') return null;
    if (json.status !== 'OK') throw new Error(`google_status_${json.status}`);

    const hit = json.results?.[0];
    if (!hit) return null;

    return {
      point: { lat: hit.geometry.location.lat, lng: hit.geometry.location.lng },
      label: hit.formatted_address,
      // ROOFTOP = ponto sobre o imóvel. O resto é interpolação ou centroide.
      precision: hit.geometry.location_type === 'ROOFTOP' ? 'exata' : 'aproximada',
      provider: 'google',
    };
  },
});

// ─── Seleção e entrada pública ───────────────────────────────────────

let override: GeocodeProvider | null = null;

/** Injeta um provedor. Usado nos testes e para trocar em runtime. */
export const setGeocodeProvider = (p: GeocodeProvider | null) => {
  override = p;
  cache.clear();
};

export const activeProvider = (): GeocodeProvider => {
  if (override) return override;
  const key =
    typeof import.meta !== 'undefined'
      ? (import.meta.env?.VITE_GOOGLE_MAPS_KEY as string | undefined)
      : undefined;
  return key ? googleProvider(key) : nominatimProvider;
};

/**
 * Converte endereço em coordenada. Devolve `null` quando o endereço não é
 * encontrado, e PROPAGA erro quando a consulta falha.
 *
 * A distinção é deliberada: "não achei esse endereço" pede correção do
 * usuário; "a API está fora" não é culpa dele e não pode virar a mesma
 * mensagem.
 */
export const geocode = async (address: string): Promise<GeocodeResult | null> => {
  const clean = address?.trim();
  if (!clean || clean.length < 5) return null;

  const provider = activeProvider();
  const key = cacheKey(clean, provider.name);
  if (cache.has(key)) return cache.get(key) ?? null;

  const result = await provider.geocode(clean);
  cache.set(key, result);
  return result;
};

/** Geocodifica origem e destino em paralelo. */
export const geocodePair = async (
  origin: string,
  dest: string,
): Promise<{ origin: GeocodeResult | null; dest: GeocodeResult | null }> => {
  const [o, d] = await Promise.all([geocode(origin), geocode(dest)]);
  return { origin: o, dest: d };
};
