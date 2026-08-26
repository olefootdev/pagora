// =====================================================================
// PAGORA — mapa real, com degradação
// =====================================================================
// A chave do Google Maps é cobrada por carregamento. Isso tem duas
// consequências no desenho:
//
//  1. Sem chave configurada, o componente NÃO quebra e NÃO mostra erro: ele
//     renderiza o `fallback`, que é a ilustração estática que o app já usava.
//     Um ambiente de desenvolvimento sem chave continua navegável, e o build
//     de produção não fica refém de uma variável.
//
//  2. O `<APIProvider>` é montado uma vez por tela que usa mapa, não no topo
//     da aplicação. Quem abre a landing não dispara carregamento cobrado.
//
// A chave é restrita por referrer HTTP no console do Google — ver HANDOFF.md.
// Ela aparece no bundle por natureza (o browser precisa dela); a proteção é a
// restrição de domínio, não o segredo.
// =====================================================================
import { useEffect, useMemo, type ReactNode } from 'react';
import {
  APIProvider,
  ColorScheme,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';

export type LatLng = { lat: number; lng: number };

export const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

/** Há chave configurada? Telas usam para decidir o que oferecer. */
export function mapsEnabled(): boolean {
  return MAPS_API_KEY.length > 0;
}

/** Centro padrão: São Paulo. Usado quando ainda não há endereço resolvido. */
export const DEFAULT_CENTER: LatLng = { lat: -23.5613, lng: -46.6565 };

export type MapMarker = {
  id: string;
  position: LatLng;
  label?: string;
  /** Destaque visual — o prestador selecionado, por exemplo. */
  highlighted?: boolean;
};

export type PagoraMapProps = {
  center?: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  /** Rota origem → destino desenhada como polyline. */
  route?: { origin: LatLng; destination: LatLng } | undefined;
  height?: number | string;
  onMarkerClick?: (id: string) => void;
  /** Renderizado quando não há chave. Normalmente a ilustração já existente. */
  fallback: ReactNode;
  /**
   * Tema do mapa. `dark` para as telas do sistema novo — o mapa claro do
   * Google sobre o fundo `#0B0D0F` é um retângulo branco no meio da tela.
   */
  scheme?: 'light' | 'dark';
  /** Ajusta o enquadramento para caber todos os marcadores e a rota. */
  fitToContent?: boolean;
};

export const PagoraMap = ({
  center = DEFAULT_CENTER,
  zoom = 13,
  markers = [],
  route,
  height = 380,
  onMarkerClick,
  fallback,
  scheme = 'light',
  fitToContent = false,
}: PagoraMapProps) => {
  if (!mapsEnabled()) return <>{fallback}</>;

  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      <APIProvider apiKey={MAPS_API_KEY} libraries={['routes']}>
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          mapId="pagora"
          colorScheme={scheme === 'dark' ? ColorScheme.DARK : ColorScheme.LIGHT}
          disableDefaultUI
          zoomControl
          gestureHandling="greedy"
          style={{ width: '100%', height: '100%' }}
        >
          {markers.map((m) => (
            <AdvancedMarker
              key={m.id}
              position={m.position}
              title={m.label}
              onClick={() => onMarkerClick?.(m.id)}
            >
              <Pin
                background={m.highlighted ? '#22E3A3' : '#070E1A'}
                borderColor={m.highlighted ? '#0A7D54' : '#070E1A'}
                glyphColor="#FFFFFF"
              />
            </AdvancedMarker>
          ))}
          {route && <RouteOverlay origin={route.origin} destination={route.destination} />}
          {fitToContent && <FitBounds markers={markers} route={route} />}
        </Map>
      </APIProvider>
    </div>
  );
};

/**
 * Enquadra o mapa para caber tudo que está desenhado.
 *
 * Sem isto, um trajeto de 40 km abre centrado em São Paulo com zoom 13 e o
 * usuário vê uma rua qualquer — a rota inteira fica fora da tela.
 */
function FitBounds({
  markers,
  route,
}: {
  markers: MapMarker[];
  route?: { origin: LatLng; destination: LatLng } | undefined;
}) {
  const map = useMap();

  const key = useMemo(
    () =>
      JSON.stringify([
        markers.map((m) => [m.position.lat, m.position.lng]),
        route ? [route.origin, route.destination] : null,
      ]),
    [markers, route],
  );

  useEffect(() => {
    if (!map || !window.google?.maps) return;
    const points: LatLng[] = [
      ...markers.map((m) => m.position),
      ...(route ? [route.origin, route.destination] : []),
    ];
    if (points.length === 0) return;

    if (points.length === 1 && points[0]) {
      map.setCenter(points[0]);
      map.setZoom(15);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    for (const p of points) bounds.extend(p);
    // Margem para os marcadores não colarem na borda nem sumirem embaixo do
    // card flutuante do acompanhamento.
    map.fitBounds(bounds, { top: 56, bottom: 96, left: 40, right: 40 });
  }, [map, key, markers, route]);

  return null;
}

/**
 * Traça a rota entre dois pontos com o DirectionsService.
 *
 * Fica em componente separado porque precisa do `useMap()`, que só existe
 * dentro de `<Map>`. Falha de rota não derruba o mapa: sem `directions` o
 * usuário ainda vê os marcadores e o mapa em si.
 */
function RouteOverlay({ origin, destination }: { origin: LatLng; destination: LatLng }) {
  const map = useMap();

  // `useMemo` na chave evita refazer a requisição a cada render quando os
  // objetos de coordenada são recriados com os mesmos valores.
  const key = useMemo(
    () => `${origin.lat},${origin.lng}|${destination.lat},${destination.lng}`,
    [origin.lat, origin.lng, destination.lat, destination.lng],
  );

  useEffect(() => {
    if (!map || !window.google?.maps) return;
    let cancelled = false;

    const renderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#22E3A3', strokeWeight: 5, strokeOpacity: 0.9 },
    });

    new google.maps.DirectionsService()
      .route({
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      })
      .then((result) => {
        if (!cancelled) renderer.setDirections(result);
      })
      .catch(() => {
        // Rota indisponível (endereço sem via, cota estourada). O mapa
        // continua útil sem a linha; não vale derrubar a tela por isso.
      });

    return () => {
      cancelled = true;
      renderer.setMap(null);
    };
  }, [map, key, origin, destination]);

  return null;
}

/**
 * Distância em linha reta, em km (fórmula de Haversine).
 *
 * Serve para ordenar prestadores por proximidade sem gastar chamada da
 * Distance Matrix — que é cobrada por elemento. Para o preço final, quem vale
 * é a distância por via, calculada quando a rota é traçada.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
