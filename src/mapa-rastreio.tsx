// Fronteira de code-splitting do mapa de rastreio. Ver mapa-prestadores.tsx.
import { PagoraMap, TrackingLayer, type TrackingLayerProps } from './mapa';
import type { LatLng } from './lib/geo';

export type MapaRastreioProps = TrackingLayerProps & {
  center: LatLng;
  zoom?: number;
  height?: number | string;
};

const MapaRastreio = ({ center, zoom, height, ...layer }: MapaRastreioProps) => (
  <PagoraMap center={center} zoom={zoom} height={height}>
    <TrackingLayer {...layer} />
  </PagoraMap>
);

export default MapaRastreio;
