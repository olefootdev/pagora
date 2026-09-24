// =====================================================================
// PAGORA — Mapa real (Leaflet)
// =====================================================================
// Substitui os SVGs desenhados à mão que existiam em cliente-mapa.tsx e
// locator.tsx. Aqueles tinham ruas fictícias e coordenadas em pixel — bonitos
// de screenshot, inúteis para achar um guincho.
//
// ---------------------------------------------------------------------
// Escolhas
// ---------------------------------------------------------------------
// TILES: CartoDB Voyager. Sem chave de API, sem cadastro, sem custo — o que
// mantém a promessa de "zero API paga para lançar". Mapbox e Google exigem
// chave e cobram por carregamento.
//
// MARCADORES: `divIcon` com HTML em vez de `Icon` com PNG. Dois motivos: o
// ícone padrão do Leaflet quebra em bundler (caminho de imagem resolvido em
// runtime), e HTML deixa o marcador usar as variáveis CSS da marca em vez de
// uma imagem estática que teria de ser regerada a cada ajuste de paleta.
//
// ATRIBUIÇÃO: obrigatória pela licença do OpenStreetMap. Não remover.
// =====================================================================

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng, NearbyProvider } from './lib/geo';

// ─── Paleta por serviço ──────────────────────────────────────────────

const SERVICE_COLOR: Record<string, string> = {
  frete: '#0f9d63',
  guincho: '#e2680f',
  cacamba: '#7e57c2',
};

const colorForServices = (services: string[]): string =>
  SERVICE_COLOR[services[0] ?? ''] ?? '#4b5563';

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();

// ─── Ícones ──────────────────────────────────────────────────────────

/** Pin de prestador. `dim` marca quem está offline. */
const providerIcon = (p: NearbyProvider, selected: boolean): L.DivIcon => {
  const color = colorForServices(p.services);
  const size = selected ? 42 : 32;
  // Offline entra esmaecido em vez de sumir: saber que existe prestador na
  // região, mesmo indisponível agora, é informação útil.
  const opacity = p.is_live ? 1 : 0.55;

  return L.divIcon({
    className: 'pg-map-pin',
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};border:2.5px solid #fff;
        box-shadow:0 2px 8px rgba(7,14,26,.35);
        display:grid;place-items:center;
        font:700 ${selected ? 13 : 11}px/1 'JetBrains Mono',monospace;
        color:#fff;opacity:${opacity};
      ">${initials(p.display_name)}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

/** Ponto azul do usuário, com halo pulsante. */
const userIcon = (): L.DivIcon =>
  L.divIcon({
    className: 'pg-map-user',
    html: `
      <div style="position:relative;width:22px;height:22px">
        <span style="
          position:absolute;inset:-11px;border-radius:50%;
          background:rgba(66,133,244,.22);animation:pgPulse 2.2s ease-out infinite"></span>
        <span style="
          position:absolute;inset:0;border-radius:50%;
          background:#4285f4;border:3px solid #fff;
          box-shadow:0 1px 4px rgba(0,0,0,.3)"></span>
      </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

/** Veículo em deslocamento. Gira conforme o rumo. */
const vehicleIcon = (heading: number): L.DivIcon =>
  L.divIcon({
    className: 'pg-map-vehicle',
    html: `
      <div style="position:relative;width:38px;height:38px">
        <span style="
          position:absolute;inset:-14px;border-radius:50%;
          background:rgba(34,227,163,.16);animation:pgPulse 1.8s ease-out infinite"></span>
        <div style="
          position:absolute;inset:0;border-radius:50%;
          background:#fff;border:3px solid #0fa77a;
          box-shadow:0 2px 10px rgba(7,14,26,.3);
          display:grid;place-items:center;
          transform:rotate(${heading}deg)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="#070e1a" stroke-width="2.2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3 L12 21 M12 3 L6 9 M12 3 L18 9"/>
          </svg>
        </div>
      </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

/** Bandeira de destino. */
const destIcon = (): L.DivIcon =>
  L.divIcon({
    className: 'pg-map-dest',
    html: `
      <div style="
        width:26px;height:26px;border-radius:8px;
        background:#070e1a;border:2.5px solid #fff;
        box-shadow:0 2px 8px rgba(7,14,26,.35);
        display:grid;place-items:center">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
             stroke="#22e3a3" stroke-width="2.5" stroke-linecap="round">
          <path d="M5 21V4h9l-1 3h6l-1 4 1 4h-6l1 3H5"/>
        </svg>
      </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

// ─── Controles internos ──────────────────────────────────────────────

/**
 * Reenquadra o mapa quando os pontos mudam.
 *
 * `fitBounds` com um único ponto produz zoom máximo (a caixa tem área zero),
 * o que deixa o usuário olhando para uma quadra. Por isso o caso de 1 ponto
 * usa `setView` com zoom fixo.
 */
const FitTo = ({ points, padding = 60 }: { points: LatLng[]; padding?: number }) => {
  const map = useMap();
  // Assinatura estável: sem isso o efeito redispara a cada render e o mapa
  // "pula" enquanto o usuário tenta arrastar.
  const key = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0]!.lat, points[0]!.lng], 15);
      return;
    }
    map.fitBounds(
      L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])),
      { padding: [padding, padding], maxZoom: 16 },
    );
    // `key` resume os pontos; `points` mudaria de referência a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map, padding]);

  return null;
};

/** Leaflet calcula mal o tamanho quando nasce dentro de container animado. */
const InvalidateOnMount = () => {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [map]);
  return null;
};

// ─── Mapa base ───────────────────────────────────────────────────────

export type PagoraMapProps = {
  center: LatLng;
  zoom?: number;
  height?: number | string;
  children?: React.ReactNode;
  /** Desliga interação — para mapas de preview dentro de card. */
  interactive?: boolean;
};

export const PagoraMap = ({
  center,
  zoom = 14,
  height = 340,
  children,
  interactive = true,
}: PagoraMapProps) => (
  <div style={{ height, width: '100%', position: 'relative' }}>
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      dragging={interactive}
      scrollWheelZoom={false}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      attributionControl
    >
      {/* CartoDB Voyager: sem chave, sem custo. Atribuição obrigatória. */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={20}
      />
      <InvalidateOnMount />
      {children}
    </MapContainer>
  </div>
);

// ─── Camada: prestadores próximos ────────────────────────────────────

export type ProvidersLayerProps = {
  providers: NearbyProvider[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  user?: LatLng | null;
  /** Raio de busca em km — desenha o círculo de cobertura. */
  radiusKm?: number | null;
};

export const ProvidersLayer = ({
  providers,
  selectedId,
  onSelect,
  user,
  radiusKm,
}: ProvidersLayerProps) => {
  const points = useMemo(
    () => [
      ...(user ? [user] : []),
      ...providers.map((p) => ({ lat: p.lat, lng: p.lng })),
    ],
    [providers, user],
  );

  return (
    <>
      {user && radiusKm != null && (
        <Circle
          center={[user.lat, user.lng]}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#0f9d63',
            weight: 1,
            opacity: 0.45,
            fillColor: '#0f9d63',
            fillOpacity: 0.05,
          }}
        />
      )}

      {user && <Marker position={[user.lat, user.lng]} icon={userIcon()} />}

      {providers.map((p) => (
        <Marker
          key={p.provider_id}
          position={[p.lat, p.lng]}
          icon={providerIcon(p, p.provider_id === selectedId)}
          zIndexOffset={p.provider_id === selectedId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect?.(p.provider_id) }}
        />
      ))}

      <FitTo points={points} />
    </>
  );
};

// ─── Camada: rastreio ao vivo ────────────────────────────────────────

export type TrackingLayerProps = {
  position: LatLng;
  heading: number;
  destination?: LatLng | null;
  /** Trecho já percorrido. */
  traveled?: LatLng[];
  /** Trecho restante, em tracejado. */
  remaining?: LatLng[];
};

export const TrackingLayer = ({
  position,
  heading,
  destination,
  traveled = [],
  remaining = [],
}: TrackingLayerProps) => {
  // Reenquadra só na montagem: refazer o fit a cada ping brigaria com o
  // usuário que está explorando o mapa com o dedo. `useState` com inicializador
  // preguiçoso em vez de `useRef` — ler `.current` durante o render é leitura
  // de valor mutável fora de efeito, que o React desaconselha.
  const [initialPoints] = useState<LatLng[]>(() => [
    position,
    ...(destination ? [destination] : []),
  ]);

  return (
    <>
      {remaining.length > 1 && (
        <Polyline
          positions={remaining.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: '#9ca3af', weight: 4, opacity: 0.55, dashArray: '6 8' }}
        />
      )}
      {traveled.length > 1 && (
        <Polyline
          positions={traveled.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: '#0fa77a', weight: 5, opacity: 0.95 }}
        />
      )}

      {destination && <Marker position={[destination.lat, destination.lng]} icon={destIcon()} />}
      <Marker position={[position.lat, position.lng]} icon={vehicleIcon(heading)} zIndexOffset={1000} />

      <FitTo points={initialPoints} padding={70} />
    </>
  );
};

// Keyframe do halo. Injetado uma vez, fora do React, porque os marcadores são
// HTML cru dentro do Leaflet e não enxergam CSS-in-JS de componente.
if (typeof document !== 'undefined' && !document.getElementById('pg-map-styles')) {
  const style = document.createElement('style');
  style.id = 'pg-map-styles';
  style.textContent = `
    @keyframes pgPulse {
      0%   { transform: scale(.6); opacity: .7; }
      100% { transform: scale(1.5); opacity: 0; }
    }
    .leaflet-container { font-family: var(--font-sans); background: #e8eef5; }
    .leaflet-control-attribution { font-size: 9px; background: rgba(255,255,255,.75); }
  `;
  document.head.appendChild(style);
}
