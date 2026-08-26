// =====================================================================
// PAGORA — Mapa (real quando há chave, ilustração quando não há)
// =====================================================================
// `screens/map-view.tsx` já resolve a degradação: sem `VITE_GOOGLE_MAPS_API_KEY`
// ele renderiza o `fallback`. O que faltava era um fallback do sistema novo —
// a ilustração antiga é clara, e sobre o fundo escuro ficava um retângulo
// branco no meio da tela.
//
// A ilustração NÃO tenta parecer um mapa de verdade. Ela comunica três coisas
// e para: existe uma malha, existe uma rota, e há um veículo nela. Fingir
// ruas reais criaria a expectativa de que os nomes significam alguma coisa.
// =====================================================================

import { PagoraMap, type LatLng, type MapMarker } from '../screens/map-view';

export type MapCanvasProps = {
  height?: number | string;
  center?: LatLng;
  markers?: MapMarker[];
  route?: { origin: LatLng; destination: LatLng } | undefined;
  /** Progresso do veículo na rota ilustrada, de 0 a 1. Só afeta o fallback. */
  progress?: number;
  /** Descrição do que o mapa mostra, para quem usa leitor de tela. */
  alt: string;
};

export const MapCanvas = ({
  height = 320,
  center,
  markers,
  route,
  progress = 0.45,
  alt,
}: MapCanvasProps) => (
  <div role="img" aria-label={alt} style={{ position: 'relative' }}>
    <PagoraMap
      height={height}
      // Escuro sempre: o mapa claro do Google sobre o fundo #0B0D0F é um
      // retângulo branco no meio da tela.
      scheme="dark"
      fitToContent
      {...(center ? { center } : {})}
      {...(markers ? { markers } : {})}
      route={route}
      fallback={<MapIllustration height={height} progress={progress} />}
    />
  </div>
);

/**
 * Malha escura com rota. As coordenadas são fixas de propósito: uma malha que
 * muda a cada render distrai de um card que, ele sim, precisa ser lido.
 */
const MapIllustration = ({ height, progress }: { height: number | string; progress: number }) => {
  // Caminho da rota em L, o traçado urbano típico. O veículo anda sobre ele.
  //
  // As pontas ficam entre y=86 e y=238 de propósito. Com
  // `preserveAspectRatio="slice"` num contêiner mais largo que alto, o topo e
  // a base do viewBox são cortados — e a origem, desenhada em y=292, saía da
  // tela. Rota que começa fora do quadro não comunica trajeto nenhum.
  const path = 'M40 238 L40 160 L150 160 L150 86 L282 86';
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <div
      style={{
        height,
        width: '100%',
        overflow: 'hidden',
        background: 'var(--x-surface)',
        position: 'relative',
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 320 320"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <rect width="320" height="320" fill="var(--x-surface)" />

        {/* Quadras. Malha 6×6 e não 4×4: o `preserveAspectRatio="slice"`
            amplia o desenho para cobrir o contêiner, e com quatro quarteirões
            gigantes o resultado lia como abstração, não como cidade. */}
        {Array.from({ length: 6 }, (_, r) =>
          Array.from({ length: 6 }, (_, c) => (
            <rect
              key={`${r}-${c}`}
              x={10 + c * 52}
              y={10 + r * 52}
              width="38"
              height="38"
              rx="3"
              fill="var(--x-surface-2)"
            />
          )),
        )}

        {/* Vias */}
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i} opacity=".5">
            <rect x={0} y={52 + i * 52 - 4} width="320" height="4" fill="var(--x-line)" />
            <rect x={52 + i * 52 - 4} y={0} width="4" height="320" fill="var(--x-line)" />
          </g>
        ))}

        {/* Rio */}
        <path
          d="M0 272 C70 258 118 288 176 276 C232 264 276 284 320 274"
          stroke="var(--x-info)"
          strokeWidth="9"
          fill="none"
          opacity=".2"
        />

        {/* Rota */}
        <path
          d={path}
          stroke="var(--x-action)"
          strokeWidth="4"
          fill="none"
          opacity=".22"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={path}
          stroke="var(--x-action)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - clamped}
        />

        {/* Origem e destino */}
        <circle
          cx="40"
          cy="238"
          r="7"
          fill="var(--x-surface)"
          stroke="var(--x-action)"
          strokeWidth="3"
        />
        <rect x="275" y="79" width="14" height="14" rx="3" fill="var(--x-ink)" />

        {/* Veículo sobre a rota */}
        <g>
          <animateMotion dur="14s" repeatCount="indefinite" path={path} rotate="auto-reverse" />
          <circle r="14" fill="var(--x-action)" opacity=".18" />
          <circle r="8" fill="var(--x-ground)" stroke="var(--x-action)" strokeWidth="2.5" />
          <circle r="3" fill="var(--x-action)" />
        </g>
      </svg>

      {/* Aviso honesto: sem chave, não é a posição real. Fica à DIREITA
          porque a origem da rota nasce no canto inferior esquerdo — o selo
          cobria justamente o ponto de partida. */}
      <span
        className="px-chip"
        style={{ position: 'absolute', right: 12, bottom: 12, background: 'var(--x-ground)' }}
      >
        Mapa ilustrativo
      </span>
    </div>
  );
};
