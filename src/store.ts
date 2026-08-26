import { create } from 'zustand';
import type { PagoraState } from './types';

// =====================================================================
// Estado do fluxo de pedido.
//
// Sobreviveu à aposentadoria dos wizards antigos porque o fluxo NOVO
// (`flows/pedido.tsx`) também é multi-passo e também precisa de um estado
// que atravesse os passos — e que o `acompanhar` leia depois via payload.
// O que morreu foi o estado DEMO que vinha pré-preenchido: o fluxo novo
// nasce em branco, como um pedido de verdade nasce.
// =====================================================================

const blankState: PagoraState = {
  cargo: null,
  origin: '',
  dest: '',
  originAccess: {},
  destAccess: {},
  vehicle: null,
  helpers: 1,
  urgency: null,
  notes: '',
};

type StoreActions = {
  patchState: (patch: Partial<PagoraState>) => void;
  resetState: () => void;
};

export type PagoraStore = PagoraState & StoreActions;

export const usePagoraStore = create<PagoraStore>((set) => ({
  ...blankState,
  patchState: (patch) => set((s) => ({ ...s, ...patch })),
  resetState: () => set(blankState),
}));
