// =====================================================================
// PAGORA — Shared types
// =====================================================================

// Navegação. Em Fase 1d isso deve virar useNavigate() direto nas telas;
// por hora o App passa essa função como prop pra evitar churn em ~50 telas.
export type GoFn = (route: string, params?: Record<string, unknown>) => void;

export type AccessInfo = {
  type?: 'apt' | 'house';
  floor?: string;
  elevator?: boolean;
  needHelp?: boolean;
};

// Shape do estado compartilhado entre os 3 fluxos de cotação (frete / guincho / caçamba).
// Campos são opcionais pra acomodar que cada fluxo usa um subconjunto.
export type PagoraState = {
  cargo?: string | null;
  origin?: string;
  dest?: string;
  distance?: number;
  originAccess?: AccessInfo;
  destAccess?: AccessInfo;
  vehicle?: string | null;
  helpers?: number;
  urgency?: string | null;
  scheduledDate?: string;
  scheduledTime?: string;
  notes?: string;
  // guincho-specific
  problem?: string;
  vehicleType?: string;
  vehicleNotes?: string;
  location?: string;
  destType?: string;
  destAddr?: string;
  currentLoc?: string;
  // caçamba-specific
  material?: string;
  size?: string;
  duration?: string;
  address?: string;
  placement?: string;
  period?: string;
};

export type PatchFn = (patch: Partial<PagoraState>) => void;
export type ResetFn = () => void;

// Tela mínima: só precisa de navegação.
export type ScreenProps = { go: GoFn };

// Tela de wizard: lê e escreve o state compartilhado.
export type FlowScreenProps = ScreenProps & {
  state: PagoraState;
  set: PatchFn;
};

// Tela de resumo: lê mas não escreve.
export type SummaryScreenProps = ScreenProps & {
  state: PagoraState;
};

// Tela de confirmação: lê e tem botão pra zerar o state.
export type ConfirmScreenProps = SummaryScreenProps & {
  reset: ResetFn;
};

// Breakdown que `calcFrete` retorna — exposto pra summary screens.
export type PricingResult = {
  low: number;
  high: number;
  breakdown: {
    baseKm: number;
    vehicle?: number;
    helpers?: number;
    access?: number;
    noElev?: number;
    baseFee: number;
    veh?: number;
    sizePrice?: number;
    time?: number;
    urgency: string;
  };
};
