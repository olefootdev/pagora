// =====================================================================
// PAGORA — Autocomplete de endereço e rota real
// =====================================================================
// A regra de ouro deste arquivo é a mesma de `screens/map-view.tsx`: SEM
// CHAVE, NADA QUEBRA. Sem `VITE_GOOGLE_MAPS_API_KEY` o hook devolve
// `enabled: false` e o campo de endereço vira um input de texto comum — que é
// exatamente o que o app faz hoje. O dia em que a chave existir, o mesmo
// componente passa a sugerir endereço e gravar coordenada, sem tocar em tela.
//
// Por que o SDK é carregado aqui e não no topo do app: a chave é cobrada por
// carregamento. Quem abre a landing não dispara chamada cobrada; só quem
// chega no passo de endereço.
// =====================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAPS_API_KEY, mapsEnabled } from '../screens/map-view';
import type { LatLng } from '../domains/geo/distance';

export type PlaceSuggestion = {
  /** Identificador do Google, usado para buscar o detalhe. */
  id: string;
  /** Linha principal: "Av. Paulista, 1000". */
  main: string;
  /** Linha secundária: "Bela Vista, São Paulo - SP". */
  secondary: string;
};

export type ResolvedPlace = {
  address: string;
  geo: LatLng;
  city: string | null;
  state: string | null;
};

// ---------------------------------------------------------------------
// Carregamento do SDK
// ---------------------------------------------------------------------
// `APIProvider` do @vis.gl só existe dentro da árvore de um `<Map>`. O campo
// de endereço aparece em telas sem mapa nenhum, então o carregamento é feito
// à mão — uma vez por sessão, compartilhado por todos os campos.

let loader: Promise<boolean> | null = null;

function loadMapsSdk(): Promise<boolean> {
  if (!mapsEnabled()) return Promise.resolve(false);
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.maps?.places) return Promise.resolve(true);
  if (loader) return loader;

  loader = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_API_KEY)}` +
      '&libraries=places,routes&language=pt-BR&region=BR&loading=async';
    script.async = true;
    script.onload = () => resolve(Boolean(window.google?.maps?.places));
    // Falha de carga não é erro de tela: o campo continua aceitando texto
    // livre, que é o comportamento de hoje.
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return loader;
}

// ---------------------------------------------------------------------

export type UsePlaces = {
  /** `false` quando não há chave, ou o SDK não carregou. A tela degrada. */
  enabled: boolean;
  suggestions: PlaceSuggestion[];
  /** Pede sugestões para o texto digitado. Ignorado quando desabilitado. */
  search: (query: string) => void;
  /** Resolve o endereço completo com coordenada. `null` se não der. */
  resolve: (id: string) => Promise<ResolvedPlace | null>;
  clear: () => void;
};

/** Abaixo disto o Google devolve ruído e a lista pisca a cada tecla. */
const MIN_QUERY = 4;

export function usePlaces(): UsePlaces {
  const [enabled, setEnabled] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Token de sessão: agrupa as teclas digitadas e a busca do detalhe numa
  // cobrança só. Sem ele, cada tecla vira uma sessão faturada à parte.
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadMapsSdk().then((ok) => {
      if (!cancelled) setEnabled(ok);
    });
    return () => {
      cancelled = true;
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  const clear = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current);
    setSuggestions([]);
  }, []);

  const search = useCallback(
    (query: string) => {
      if (!enabled) return;
      if (debounce.current) clearTimeout(debounce.current);

      const q = query.trim();
      if (q.length < MIN_QUERY) {
        setSuggestions([]);
        return;
      }

      // 250 ms: o suficiente para não pedir a cada tecla, curto o bastante
      // para a lista parecer instantânea.
      debounce.current = setTimeout(() => {
        void (async () => {
          try {
            const places = window.google?.maps?.places;
            if (!places?.AutocompleteSuggestion) return;

            token.current ??= new places.AutocompleteSessionToken();

            const { suggestions: raw } =
              await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
                input: q,
                sessionToken: token.current,
                // Endereço, não estabelecimento: quem digita aqui está
                // dizendo de onde a carga sai, não onde vai almoçar.
                includedPrimaryTypes: ['street_address', 'premise', 'route', 'subpremise'],
                region: 'br',
                language: 'pt-BR',
              });

            setSuggestions(
              (raw ?? [])
                .map((s) => s.placePrediction)
                .filter((p): p is NonNullable<typeof p> => p != null)
                .slice(0, 5)
                .map((p) => ({
                  id: p.placeId,
                  main: p.mainText?.toString() ?? p.text.toString(),
                  secondary: p.secondaryText?.toString() ?? '',
                })),
            );
          } catch {
            // Cota estourada, rede caída, chave restrita: a lista some e o
            // campo segue aceitando texto livre.
            setSuggestions([]);
          }
        })();
      }, 250);
    },
    [enabled],
  );

  const resolve = useCallback(
    async (id: string): Promise<ResolvedPlace | null> => {
      if (!enabled) return null;
      try {
        const places = window.google?.maps?.places;
        if (!places?.Place) return null;

        const place = new places.Place({ id });
        await place.fetchFields({
          fields: ['formattedAddress', 'location', 'addressComponents'],
        });

        const loc = place.location;
        if (!loc) return null;

        const components = place.addressComponents ?? [];
        const pick = (type: string) =>
          components.find((c) => c.types.includes(type))?.longText ?? null;
        const pickShort = (type: string) =>
          components.find((c) => c.types.includes(type))?.shortText ?? null;

        // A sessão termina aqui: a próxima digitação abre outra.
        token.current = null;
        setSuggestions([]);

        return {
          address: place.formattedAddress ?? '',
          geo: { lat: loc.lat(), lng: loc.lng() },
          city: pick('administrative_area_level_2') ?? pick('locality'),
          state: pickShort('administrative_area_level_1'),
        };
      } catch {
        return null;
      }
    },
    [enabled],
  );

  return { enabled, suggestions, search, resolve, clear };
}

// ---------------------------------------------------------------------
// Rota
// ---------------------------------------------------------------------

/**
 * Distância por via entre dois pontos, em metros. `null` quando não dá.
 *
 * Usa o DirectionsService, que já é carregado com a biblioteca `routes`.
 * Falhar aqui NÃO é erro de tela: `resolveDistance` cai na linha reta
 * corrigida e a estimativa continua existindo, rotulada como aproximada.
 */
export async function fetchRouteMeters(
  origin: LatLng,
  destination: LatLng,
): Promise<number | null> {
  if (!mapsEnabled()) return null;
  const ok = await loadMapsSdk();
  if (!ok || !window.google?.maps?.DirectionsService) return null;

  try {
    const result = await new window.google.maps.DirectionsService().route({
      origin,
      destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
    });
    const meters = result.routes[0]?.legs?.[0]?.distance?.value;
    return typeof meters === 'number' && meters > 0 ? meters : null;
  } catch {
    return null;
  }
}
