// =====================================================================
// PAGORA — Icon wrapper
//
// Trocamos os SVGs artesanais por @hugeicons/core-free-icons (4.6k icons,
// stroke rounded, MIT) acessados via @hugeicons/react HugeiconsIcon.
//
// API mantida: <Icon name="..." size strokeWidth color /> — zero refactor
// nos ~30 call sites espalhados pelo app. Mapeamento name → IconSvgElement
// abaixo. Pra adicionar um nome novo, importa do @hugeicons/core-free-icons
// e adiciona em ICON_MAP.
//
// Caso `name="logo"` continuamos renderizando o pin verde da identidade
// (não é um ícone do set externo).
// =====================================================================

import type { SVGAttributes } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { IconSvgElement } from '@hugeicons/react';
import {
  // navigation & basic
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  Menu01Icon,
  Tick01Icon,
  CheckmarkCircle01Icon,
  PlusSignIcon,
  MinusSignIcon,
  RefreshIcon,
  Maximize01Icon,
  Minimize01Icon,
  // alerts & status
  AlertCircleIcon,
  InformationCircleIcon,
  Notification01Icon,
  NotificationBlock01Icon,
  AmbulanceIcon,
  // user, profile, social
  UserIcon,
  UserMultiple02Icon,
  FavouriteIcon,
  StarIcon,
  ThumbsUpIcon,
  Award01Icon,
  Medal01Icon,
  // mobility & logistics
  DeliveryTruck01Icon,
  TowTruckIcon,
  GarbageTruckIcon,
  Package01Icon,
  WeightIcon,
  WeightScale01Icon,
  RulerIcon,
  FuelIcon,
  Wrench01Icon,
  // location & map
  Location01Icon,
  Navigation01Icon,
  GlobeIcon,
  Building01Icon,
  Store01Icon,
  Stairs01Icon,
  ApartmentIcon, // proxy pra elevator (sem ícone literal)
  // finance
  CreditCardIcon,
  Money01Icon,
  Wallet01Icon,
  TradeUpIcon,
  Ticket01Icon,
  DiamondIcon,
  GiftIcon,
  // device & connectivity
  Wifi01Icon,
  CellularNetworkIcon,
  BatteryFullIcon,
  BulbIcon,
  KeyboardIcon,
  Mic01Icon,
  MicOff01Icon,
  VolumeHighIcon,
  Camera01Icon,
  EyeIcon,
  Moon01Icon,
  Sun01Icon,
  // comms
  Call02Icon,
  Mail01Icon,
  Message01Icon,
  CustomerService01Icon,
  WhatsappIcon,
  Share01Icon,
  // actions / data
  Search01Icon,
  FilterIcon,
  ListViewIcon,
  Edit02Icon,
  PencilEdit01Icon,
  Pen01Icon,
  Copy01Icon,
  Delete02Icon,
  Download01Icon,
  Upload01Icon,
  Attachment01Icon,
  Drag01Icon,
  ChartLineIcon,
  Calendar01Icon,
  Clock01Icon,
  Flag01Icon,
  Key01Icon,
  LockIcon,
  Logout01Icon,
  Shield01Icon,
  Settings01Icon,
  ClipboardIcon,
  File01Icon,
  FlashIcon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';

const ICON_MAP: Record<string, IconSvgElement> = {
  // navigation & basic
  'arrow-left': ArrowLeft01Icon,
  'arrow-right': ArrowRight01Icon,
  close: Cancel01Icon,
  menu: Menu01Icon,
  check: Tick01Icon,
  'check-circle': CheckmarkCircle01Icon,
  plus: PlusSignIcon,
  minus: MinusSignIcon,
  refresh: RefreshIcon,
  maximize: Maximize01Icon,
  minimize: Minimize01Icon,
  external: ArrowUpRight01Icon,

  // alerts & status
  alert: AlertCircleIcon,
  info: InformationCircleIcon,
  bell: Notification01Icon,
  'bell-off': NotificationBlock01Icon,
  siren: AmbulanceIcon,

  // user, profile, social
  user: UserIcon,
  users: UserMultiple02Icon,
  heart: FavouriteIcon,
  star: StarIcon,
  'star-fill': StarIcon, // visualmente igual no free — fill aplicado via prop quando preciso
  'thumbs-up': ThumbsUpIcon,
  trophy: Award01Icon,
  medal: Medal01Icon,

  // mobility & logistics
  truck: DeliveryTruck01Icon,
  tow: TowTruckIcon,
  dumpster: GarbageTruckIcon, // caminhão coletor — o serviço de caçamba na prática
  package: Package01Icon,
  weight: WeightIcon,
  scales: WeightScale01Icon,
  ruler: RulerIcon,
  fuel: FuelIcon,
  wrench: Wrench01Icon,

  // location & map
  pin: Location01Icon,
  'pin-fill': Location01Icon, // mesma silhueta, com fill via prop
  navigation: Navigation01Icon,
  globe: GlobeIcon,
  building: Building01Icon,
  store: Store01Icon,
  stairs: Stairs01Icon,
  elevator: ApartmentIcon,

  // finance
  'credit-card': CreditCardIcon,
  money: Money01Icon,
  spark: SparklesIcon, // sparkle pra Pagora-coin / carteira premium
  diamond: DiamondIcon,
  ticket: Ticket01Icon,
  'trending-up': TradeUpIcon,
  gift: GiftIcon,
  bolt: FlashIcon,

  // device & connectivity
  wifi: Wifi01Icon,
  signal: CellularNetworkIcon,
  battery: BatteryFullIcon,
  'battery-status': BatteryFullIcon,
  lightbulb: BulbIcon,
  keyboard: KeyboardIcon,
  mic: Mic01Icon,
  'mic-off': MicOff01Icon,
  volume: VolumeHighIcon,
  camera: Camera01Icon,
  eye: EyeIcon,
  moon: Moon01Icon,
  'sun-on': Sun01Icon,

  // comms
  phone: Call02Icon,
  mail: Mail01Icon,
  message: Message01Icon,
  headset: CustomerService01Icon,
  whatsapp: WhatsappIcon,
  share: Share01Icon,

  // actions / data
  search: Search01Icon,
  filter: FilterIcon,
  list: ListViewIcon,
  edit: Edit02Icon,
  pen: Pen01Icon,
  copy: Copy01Icon,
  trash: Delete02Icon,
  download: Download01Icon,
  upload: Upload01Icon,
  attach: Attachment01Icon,
  drag: Drag01Icon,
  chart: ChartLineIcon,
  'bar-chart': ChartLineIcon,
  calendar: Calendar01Icon,
  clock: Clock01Icon,
  flag: Flag01Icon,
  key: Key01Icon,
  lock: LockIcon,
  logout: Logout01Icon,
  shield: Shield01Icon,
  settings: Settings01Icon,
  clipboard: ClipboardIcon,
  doc: File01Icon,
  home: Location01Icon, // PAGORA não tem home tradicional — pino de localização
  'pencil-edit': PencilEdit01Icon, // disponibilizado caso futuro
};

// =====================================================================
// Logo mark — caminhão verde PAGORA. Não é um icon set externo; mantido
// como case especial pra preservar a identidade visual.
// =====================================================================
const LogoSvg = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    aria-hidden="true"
  >
    <path d="M3 5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3h3.2c.5 0 1 .25 1.3.65l1.3 1.7c.13.18.2.4.2.6V17a2 2 0 0 1-2 2h-1.2a3 3 0 1 1-5.6 0H10.8a3 3 0 1 1-5.6 0H4a1 1 0 0 1-1-1V5Zm13 5v5h5l-2-3-3-2Z" />
  </svg>
);

type IconProps = {
  name: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
} & Omit<SVGAttributes<SVGSVGElement>, 'color'>;

export const Icon = ({ name, size = 22, strokeWidth = 1.75, color, style, ...rest }: IconProps) => {
  // Logo permanece custom — não é ícone de set externo.
  if (name === 'logo') {
    return <LogoSvg size={size} />;
  }

  const svgIcon = ICON_MAP[name];
  if (!svgIcon) {
    if (import.meta.env?.DEV) {
      console.warn(`[Icon] no mapping for "${name}". Add it to ICON_MAP in src/icons.tsx.`);
    }
    // Fallback discreto: ícone de alerta em vez de quebrar layout
    return (
      <HugeiconsIcon
        icon={AlertCircleIcon}
        size={size}
        strokeWidth={strokeWidth}
        color={color ?? 'currentColor'}
        style={style}
        {...rest}
      />
    );
  }

  // Variantes "filled" usam fill+stroke ambos pra simular solid sem ícone Pro.
  const isFilled = name === 'star-fill' || name === 'pin-fill';
  const filledStyle = isFilled ? { fill: 'currentColor', ...style } : style;

  return (
    <HugeiconsIcon
      icon={svgIcon}
      size={size}
      strokeWidth={strokeWidth}
      color={color ?? 'currentColor'}
      style={filledStyle}
      {...rest}
    />
  );
};
