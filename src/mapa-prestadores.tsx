// Fronteira de code-splitting do mapa de descoberta.
//
// Existe só para dar um `export default` ao `React.lazy`. O Leaflet pesa
// ~150 kB e é usado em 2 de ~40 telas — carregá-lo no bundle principal faria
// todo mundo pagar por um mapa que a maioria nunca abre.
import { PagoraMap, ProvidersLayer, type ProvidersLayerProps } from './mapa';
import type { LatLng } from './lib/geo';

export type MapaPrestadoresProps = ProvidersLayerProps & {
  center: LatLng;
  zoom?: number;
  height?: number | string;
};

const MapaPrestadores = ({ center, zoom, height, ...layer }: MapaPrestadoresProps) => (
  <PagoraMap center={center} zoom={zoom} height={height}>
    <ProvidersLayer {...layer} />
  </PagoraMap>
);

export default MapaPrestadores;
