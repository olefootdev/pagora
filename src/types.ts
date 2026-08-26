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
  /**
   * A necessidade que originou o pedido ("mudanca", "entulho"…).
   *
   * `service` (o enum do banco) é de MUITOS para um: mudança, material, carga
   * e máquina viram todos `frete`. Guardar o `need` no payload é o que
   * permite reabrir o fluxo exatamente onde ele começou — sem isso, "pedir
   * de novo" de uma mudança abriria as perguntas de carga.
   */
  need?: string;
  cargo?: string | null;
  origin?: string;
  dest?: string;
  /**
   * Distância do trajeto em km. Preenchida pelo passo de endereço quando há
   * coordenada; sem ela, `resolveDistance` devolve o padrão do domínio.
   */
  distance?: number;
  /** Como a distância foi obtida — a tela rotula o extrato conforme isto. */
  distanceSource?: 'route' | 'straight' | 'default';
  /** Coordenadas resolvidas pelo Places. Sem chave do Google, ficam nulas. */
  originGeo?: { lat: number; lng: number } | null;
  destGeo?: { lat: number; lng: number } | null;
  /** Cidade e UF vindas do Places — dado estruturado, não `guessCity`. */
  originCity?: string | null;
  originState?: string | null;
  destCity?: string | null;
  destState?: string | null;
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
  /**
   * Necessidade para a qual este estado já foi semeado, no fluxo novo.
   *
   * Existe para o passo 1 saber a diferença entre "acabou de entrar" e
   * "voltou do login". Sem essa marca, o efeito de semeadura roda de novo a
   * cada remontagem e apaga o que a pessoa já tinha preenchido — o que
   * acontece exatamente no caminho mais caro: publicar, ser mandado para o
   * login, voltar.
   */
  flowSeed?: string;
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
