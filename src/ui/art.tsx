// =====================================================================
// PAGORA — Linguagem visual de veículo e carga
// =====================================================================
// O Hugeicons resolve interface, não catálogo. A auditoria encontrou o mesmo
// pictograma de caminhão de 22px nas três opções de veículo — justamente na
// decisão que mais mexe no preço.
//
// Aqui cada categoria tem silhueta própria, e todas compartilham o mesmo
// viewBox e a mesma linha de chão. É isso que faz a escala ser LIDA: a van
// ocupa metade da carreta na tela porque ocupa metade dela na rua. Trocar por
// ícones de tamanho igual devolveria o problema.
//
// Tudo em `currentColor` — a cor vem do contexto (verde quando selecionado,
// cinza quando não), nunca cravada aqui dentro.
// =====================================================================

type ArtProps = { size?: number; className?: string };

/** Chassi comum: 64×28 com o chão em y=25. Todas as silhuetas obedecem. */
const Frame = ({ size = 64, className, children }: ArtProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={(size * 28) / 64}
    viewBox="0 0 64 28"
    fill="none"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

const Wheel = ({ cx }: { cx: number }) => (
  <>
    <circle cx={cx} cy="24" r="3.2" fill="currentColor" opacity=".92" />
    <circle cx={cx} cy="24" r="1.15" fill="var(--x-surface, #15191d)" />
  </>
);

// O preenchimento vem de token: 0.16 foi calibrado para fundo escuro e vira
// fantasma sobre claro. O `.is-light` sobe para 0.3 — uma regra, todas as
// silhuetas, sem seletor por classe de arte (a armadilha nº 3 do plano).
const body = {
  fill: 'currentColor',
  style: { opacity: 'var(--x-art-fill, 0.16)' },
  stroke: 'currentColor',
  strokeWidth: 1.4,
};
const glass = { fill: 'currentColor', opacity: 0.5 };

// ---------------------------------------------------------------------
// VEÍCULOS — em ordem de capacidade
// ---------------------------------------------------------------------

/** Van / Fiorino — até 1 m³. A menor silhueta do conjunto. */
export const VanArt = (p: ArtProps) => (
  <Frame {...p}>
    <path
      d="M4 21V13.5c0-1.2.7-2 1.9-2.2L11 10.4l2.6-3.2c.4-.5 1-.8 1.7-.8h7.9c1.1 0 1.8.8 1.8 1.9V21H4Z"
      {...body}
    />
    <path d="M13.6 11.4h4.6V7.8h-3.2l-1.4 1.7v1.9Z" {...glass} />
    <path d="M4 21h21.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <Wheel cx={9.5} />
    <Wheel cx={21.5} />
  </Frame>
);

/** Caminhão baú — mudanças e cargas médias, até 15 m³. */
export const BauArt = (p: ArtProps) => (
  <Frame {...p}>
    <path d="M4 21v-7.2c0-1.1.6-1.8 1.7-2l3.4-.5 2-3.3c.3-.5.9-.8 1.5-.8h2.9V21H4Z" {...body} />
    <path d="M10.6 11.2h3.9V8.4h-2.2l-1.7 2.8Z" {...glass} />
    <rect x="15.5" y="4.5" width="23" height="16.5" rx="1.4" {...body} />
    <path d="M22 4.5V21M29.5 4.5V21" stroke="currentColor" strokeWidth="1" opacity=".45" />
    <Wheel cx={9} />
    <Wheel cx={32.5} />
  </Frame>
);

/** Caminhão grande / toco — mudanças completas, até 30 m³. */
export const TruckArt = (p: ArtProps) => (
  <Frame {...p}>
    <path d="M4 21v-8.3c0-1.1.6-1.8 1.7-2l3.6-.5 2.1-3.6c.3-.5.9-.9 1.6-.9h3.1V21H4Z" {...body} />
    <path d="M10.9 10.2h4.2V7h-2.3l-1.9 3.2Z" {...glass} />
    <rect x="16.2" y="2.6" width="31.5" height="18.4" rx="1.4" {...body} />
    <path d="M24 2.6V21M32 2.6V21M40 2.6V21" stroke="currentColor" strokeWidth="1" opacity=".45" />
    <Wheel cx={9} />
    <Wheel cx={35} />
    <Wheel cx={42.5} />
  </Frame>
);

/** Carreta — carga entre cidades. A maior silhueta do conjunto. */
export const CarretaArt = (p: ArtProps) => (
  <Frame {...p}>
    <path d="M3 21v-7.8c0-1.1.6-1.8 1.7-2l3.4-.5L10.3 7c.3-.5.9-.8 1.5-.8h3.3V21H3Z" {...body} />
    <path d="M9.9 10.7h4V7.6h-2.1l-1.9 3.1Z" {...glass} />
    <rect x="18.5" y="3.4" width="42.5" height="17.6" rx="1.4" {...body} />
    <path d="M15.1 17.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path
      d="M27 3.4V21M35.5 3.4V21M44 3.4V21M52.5 3.4V21"
      stroke="currentColor"
      strokeWidth="1"
      opacity=".4"
    />
    <Wheel cx={8.6} />
    <Wheel cx={45} />
    <Wheel cx={52.5} />
  </Frame>
);

/** Guincho / reboque — plataforma inclinada é o que identifica o serviço. */
export const GuinchoArt = (p: ArtProps) => (
  <Frame {...p}>
    <path d="M4 21v-7.6c0-1.1.6-1.8 1.7-2l3.4-.5 2-3.3c.3-.5.9-.8 1.5-.8h3V21H4Z" {...body} />
    <path d="M10.7 10.9h4V7.8h-2.2l-1.8 3.1Z" {...glass} />
    <path
      d="M16.5 21V15h30l-6-4.4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M27 15l6.5-4.4h7L34 15h-7Z" {...body} />
    <Wheel cx={9.5} />
    <Wheel cx={36} />
  </Frame>
);

/**
 * Caçamba. `m3` muda o desenho, não só a legenda — 3 m³ e 10 m³ ficam do
 * mesmo tamanho na rua? Não. Então não ficam na tela.
 */
export const CacambaArt = ({ m3 = 5, ...p }: ArtProps & { m3?: number }) => {
  // Escala do comprimento proporcional ao volume, com piso e teto para a
  // menor ainda ser legível e a maior ainda caber no chassi.
  const w = Math.round(20 + Math.min(10, Math.max(3, m3)) * 3.4);
  const h = Math.round(9 + Math.min(10, Math.max(3, m3)) * 0.65);
  const x = 6;
  const yTop = 21 - h;
  return (
    <Frame {...p}>
      {/* Trapézio: a boca é mais larga que o fundo — é o formato real. */}
      <path d={`M${x} 21 L${x + 3} ${yTop} L${x + w - 3} ${yTop} L${x + w} 21 Z`} {...body} />
      <path
        d={`M${x + 3.2} ${yTop + 1} h${w - 6.4}`}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Nervuras verticais — o que faz ler como caçamba de aço. */}
      {[0.3, 0.5, 0.7].map((f) => (
        <path
          key={f}
          d={`M${x + 3 + (w - 6) * f} ${yTop + 1.5} L${x + 2 + (w - 4) * f} 20`}
          stroke="currentColor"
          strokeWidth="1"
          opacity=".45"
        />
      ))}
      <path
        d={`M${x - 1} 21 h${w + 2}`}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </Frame>
  );
};

// ---------------------------------------------------------------------
// CARGA — o que está sendo transportado
// ---------------------------------------------------------------------

const CargoFrame = ({
  size = 40,
  className,
  children,
}: ArtProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

const cbody = {
  fill: 'currentColor',
  style: { opacity: 'var(--x-art-fill, 0.16)' },
  stroke: 'currentColor',
  strokeWidth: 1.5,
};

/** Mudança — sofá. É o objeto que as pessoas citam quando pedem mudança. */
export const MudancaArt = (p: ArtProps) => (
  <CargoFrame {...p}>
    <path d="M5 14v-3a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v3" {...cbody} />
    <rect x="3" y="13.5" width="26" height="8.5" rx="2.2" {...cbody} />
    <path d="M9 14v-3.5M23 14v-3.5" stroke="currentColor" strokeWidth="1.3" opacity=".5" />
    <path d="M6 22v3M26 22v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </CargoFrame>
);

/** Entulho — pilha com escombro. Não é caixa, e a diferença importa. */
export const EntulhoArt = (p: ArtProps) => (
  <CargoFrame {...p}>
    <path d="M3 24l6-9 5 5 4-7 5 6 6 5H3Z" {...cbody} />
    <path
      d="M10.5 12.5l2-2.5 2.5 2M21 9.5l1.8-2 2.2 1.6"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      opacity=".6"
    />
    <path d="M2 24h28" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </CargoFrame>
);

/** Material de construção — tijolos empilhados no pallet. */
export const MaterialArt = (p: ArtProps) => (
  <CargoFrame {...p}>
    <rect x="6" y="9" width="9" height="5" rx=".8" {...cbody} />
    <rect x="17" y="9" width="9" height="5" rx=".8" {...cbody} />
    <rect x="6" y="15.5" width="9" height="5" rx=".8" {...cbody} />
    <rect x="17" y="15.5" width="9" height="5" rx=".8" {...cbody} />
    <path
      d="M3 22.5h26M6 22.5V26M26 22.5V26"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </CargoFrame>
);

/** Carga geral — caixas e volumes. */
export const CargaArt = (p: ArtProps) => (
  <CargoFrame {...p}>
    <rect x="4" y="13" width="12" height="11" rx="1.4" {...cbody} />
    <rect x="17" y="8" width="11" height="16" rx="1.4" {...cbody} />
    <path d="M10 13v11M22.5 8v16" stroke="currentColor" strokeWidth="1.2" opacity=".5" />
    <path
      d="M7.5 16.5h5M20 12h5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      opacity=".6"
    />
  </CargoFrame>
);

/** Veículo — para guincho. */
export const CarroArt = (p: ArtProps) => (
  <CargoFrame {...p}>
    <path
      d="M4 20v-3.5c0-.8.4-1.4 1.2-1.7l2.3-.8 3-4.4c.4-.6 1-.9 1.8-.9h7.6c.7 0 1.3.3 1.7.9l3 4.4 2.3.8c.8.3 1.2.9 1.2 1.7V20H4Z"
      {...cbody}
    />
    <path d="M10.5 14h11l-2.3-3.6h-6.4L10.5 14Z" fill="currentColor" opacity=".45" />
    <circle cx="9.5" cy="20.5" r="2.6" fill="currentColor" opacity=".9" />
    <circle cx="22.5" cy="20.5" r="2.6" fill="currentColor" opacity=".9" />
  </CargoFrame>
);

/** Máquina / equipamento pesado. */
export const MaquinaArt = (p: ArtProps) => (
  <CargoFrame {...p}>
    <rect x="4" y="13" width="12" height="8" rx="1.4" {...cbody} />
    <path
      d="M16 15l6-6h4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <path d="M24 8.5l4 3.5-3.5 3-3.5-3 3-3.5Z" {...cbody} />
    <path d="M3 24.5h26" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="8.5" cy="21.5" r="2.2" fill="currentColor" opacity=".85" />
    <circle cx="14" cy="21.5" r="2.2" fill="currentColor" opacity=".85" />
  </CargoFrame>
);

// ---------------------------------------------------------------------
// Registros — para as telas montarem catálogo sem repetir o switch
// ---------------------------------------------------------------------

export const VEHICLE_ART: Record<string, (p: ArtProps) => React.ReactElement> = {
  van: VanArt,
  bau: BauArt,
  grande: TruckArt,
  carreta: CarretaArt,
  guincho: GuinchoArt,
  cacamba: CacambaArt,
};

export const CARGO_ART: Record<string, (p: ArtProps) => React.ReactElement> = {
  mudanca: MudancaArt,
  entulho: EntulhoArt,
  material: MaterialArt,
  carga: CargaArt,
  carro: CarroArt,
  maquina: MaquinaArt,
};

// ---------------------------------------------------------------------
// FROTA — silhuetas sólidas (design system aprovado em 25/08/2026)
// ---------------------------------------------------------------------
// A crítica que originou este bloco: os ícones de CARGA (sofá, caixas,
// tijolos) liam como vitrine de loja de móveis. A linguagem aprovada mostra
// o VEÍCULO que faz o serviço — silhueta sólida, chapada, sem contorno de
// desenho, e em escala real entre elas: a van é menor que a prancha de
// cinco eixos porque é.
//
// Janelas e frisos são recortes na cor do fundo (`--x-ground`), não branco:
// assim o furo é limpo nos dois temas. As silhuetas acima (outline) seguem
// vivas para as telas de escolha de veículo; estas são a cara dos SERVIÇOS.
// ---------------------------------------------------------------------

/** Roda da frota: aro sólido com cubo vazado na cor do fundo. */
const FWheel = ({ cx }: { cx: number }) => (
  <>
    <circle cx={cx} cy="23.6" r="3.1" fill="currentColor" />
    <circle cx={cx} cy="23.6" r="1.1" fill="var(--x-ground, #ffffff)" />
  </>
);

/** Cabine padrão da frota, com o recorte de janela. */
const FCab = ({ tall = false }: { tall?: boolean }) => (
  <>
    <path
      d={
        tall
          ? 'M2.5 21.8v-7.6c0-1 .6-1.7 1.6-1.9l3.2-.5 2-3.3c.3-.5.9-.9 1.5-.9h2.7v14.2H2.5Z'
          : 'M2.5 21.8v-6.9c0-1 .6-1.6 1.6-1.8l3-.4 1.9-3.2c.3-.5.8-.8 1.4-.8h2.9v13.1H2.5Z'
      }
      fill="currentColor"
    />
    <path
      d={tall ? 'M6.5 12l1.7-2.9h2.2V12H6.5Z' : 'M6.4 12.6l1.6-2.7h2.1v2.7H6.4Z'}
      fill="var(--x-ground, #ffffff)"
      fillOpacity=".85"
    />
  </>
);

/** Poliguindaste com a caçamba no chassi. */
export const FrotaCacambaArt = (p: ArtProps) => (
  <Frame {...p}>
    <FCab />
    <rect x="13" y="19.6" width="36" height="2.2" fill="currentColor" />
    <path d="M17.5 7.5h29.8l-4.2 11.3H20.6L17.5 7.5Z" fill="currentColor" />
    <path
      d="M22 10.8h21M23.6 14h17.6"
      stroke="var(--x-ground, #ffffff)"
      strokeOpacity=".4"
      strokeWidth="1.1"
    />
    <FWheel cx={8} />
    <FWheel cx={20} />
    <FWheel cx={43} />
  </Frame>
);

/** Caminhão baú — mudança. */
export const FrotaBauArt = (p: ArtProps) => (
  <Frame {...p}>
    <FCab tall />
    <rect x="14.8" y="4" width="32.5" height="17.8" rx="1.2" fill="currentColor" />
    <path d="M40.6 4v21.8" stroke="var(--x-ground, #ffffff)" strokeOpacity=".4" strokeWidth="1.1" />
    <FWheel cx={8} />
    <FWheel cx={33.5} />
    <FWheel cx={41} />
  </Frame>
);

/** Van compacta — frete e material leve. A escala menor é proposital. */
export const FrotaVanArt = (p: ArtProps) => (
  <Frame {...p}>
    <path
      d="M5.5 21.8v-7.3c0-1 .5-1.8 1.4-2.2l5-2.3 3.1-4.1c.4-.5 1-.8 1.6-.8h13.9c1.1 0 2 .9 2 2v14.7H5.5Z"
      fill="currentColor"
    />
    <path d="M13.6 9.9l2.5-3.4h4.4v3.4h-6.9Z" fill="var(--x-ground, #ffffff)" fillOpacity=".85" />
    <FWheel cx={11} />
    <FWheel cx={26.5} />
  </Frame>
);

/** Plataforma com carga amarrada — material de construção. */
export const FrotaPlataformaArt = (p: ArtProps) => (
  <Frame {...p}>
    <FCab />
    <rect x="13" y="18.6" width="39" height="3.2" fill="currentColor" />
    <rect x="16" y="14.6" width="33" height="3" fill="currentColor" fillOpacity=".85" />
    <rect x="18.5" y="10.8" width="28" height="2.9" fill="currentColor" fillOpacity=".68" />
    <FWheel cx={8} />
    <FWheel cx={20} />
    <FWheel cx={45.5} />
  </Frame>
);

/** Guincho plataforma com carro embarcado. */
export const FrotaGuinchoArt = (p: ArtProps) => (
  <Frame {...p}>
    <FCab />
    <rect x="13" y="18.8" width="39" height="2.6" fill="currentColor" />
    <path
      d="M19.5 18.8v-2.1c0-.6.3-1.1.9-1.4l3.8-2.1c1.5-.9 2.8-1.3 4.6-1.3h5.6c2.3 0 4.5.8 6.2 2.3l2.6 2.3c.4.4.7 1 .7 1.5v.8H19.5Z"
      fill="currentColor"
      fillOpacity=".82"
    />
    <path d="M25.6 14.4l3-1.7h3.9v1.7h-6.9Z" fill="var(--x-ground, #ffffff)" fillOpacity=".7" />
    <FWheel cx={8} />
    <FWheel cx={19.5} />
    <FWheel cx={45} />
  </Frame>
);

/** Prancha de cinco eixos com escavadeira — transporte de máquina. */
export const FrotaPranchaArt = (p: ArtProps) => (
  <Frame {...p}>
    <path
      d="M2.5 21.8v-6.2c0-1 .6-1.6 1.5-1.8l2.9-.4 1.8-3c.3-.5.8-.8 1.4-.8h2.7v12.2H2.5Z"
      fill="currentColor"
    />
    <path d="M6.3 13l1.5-2.5h2v2.5H6.3Z" fill="var(--x-ground, #ffffff)" fillOpacity=".85" />
    <rect x="13" y="19" width="45.5" height="2.4" fill="currentColor" />
    <rect
      x="27.5"
      y="15.2"
      width="15.5"
      height="3.6"
      rx="1.8"
      fill="currentColor"
      fillOpacity=".85"
    />
    <rect x="29.5" y="9.2" width="10" height="6.2" rx="1" fill="currentColor" />
    <path d="M39.5 10.6l8.3-4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M47.8 6.2l2.4 5.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M50 11.2l2.9 1.7-3.5 1.2.6-2.9Z" fill="currentColor" />
    <FWheel cx={8} />
    <FWheel cx={19.5} />
    <FWheel cx={26} />
    <FWheel cx={47} />
    <FWheel cx={53.5} />
  </Frame>
);

/**
 * Frota por necessidade — o mapa que a home e os cards de serviço consomem.
 * Chaveado pelos `NeedKind` do domínio de intenção.
 */
export const FLEET_ART: Record<string, (p: ArtProps) => React.ReactElement> = {
  entulho: FrotaCacambaArt,
  mudanca: FrotaBauArt,
  carga: FrotaVanArt,
  material: FrotaPlataformaArt,
  veiculo: FrotaGuinchoArt,
  maquina: FrotaPranchaArt,
};
