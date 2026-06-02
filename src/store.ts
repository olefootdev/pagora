import { create } from 'zustand';
import type { PagoraState } from './types';

// Estado inicial do fluxo de cotação (frete / guincho / caçamba).
// As telas atuais ainda consomem isso via prop `state`/`set` passada pelo App,
// mas qualquer tela pode passar a usar `usePagoraStore` diretamente sem churn.
const initialState: PagoraState = {
  cargo: null,
  origin: 'Av. Paulista, 1000, São Paulo',
  dest: 'Rua Augusta, 500, São Paulo',
  distance: 15,
  originAccess: { type: 'apt', floor: '3', elevator: true, needHelp: true },
  destAccess: { type: 'house', needHelp: false },
  vehicle: 'bau',
  helpers: 1,
  urgency: 'scheduled',
  scheduledDate: '2026-04-29',
  scheduledTime: '09:00',
  notes: '',
};

const blankState: PagoraState = {
  cargo: null,
  origin: '',
  dest: '',
  distance: 15,
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
  ...initialState,
  patchState: (patch) => set((s) => ({ ...s, ...patch })),
  resetState: () => set(blankState),
}));
