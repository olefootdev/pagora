// =====================================================================
// PAGORA — Catálogo do fluxo de pedido
// =====================================================================
// Fonte única do que o usuário escolhe: veículos, tamanhos de caçamba,
// tipos de carga e problemas de guincho. Antes isso vivia espalhado em
// literais dentro de cada tela — três listas de veículo em três arquivos,
// que divergiram.
//
// O contrato com o banco não muda: `vehicle` continua sendo 'van' | 'bau' |
// 'grande' porque é o que `frete-pricing.ts` conhece e o que `payload` grava.
// O catálogo acrescenta o que faltava para a ESCOLHA ser possível — silhueta
// em escala, capacidade em referência concreta, e um padrão inferido para o
// passo poder ser pulado.
// =====================================================================

import type { VehicleType } from '../domains/pricing/frete-pricing';
import type { NeedKind } from '../domains/intent/intent';
import { BauArt, CacambaArt, TruckArt, VanArt } from '../ui/art';

// ---------------------------------------------------------------------
// VEÍCULOS
// ---------------------------------------------------------------------

export type VehicleSpec = {
  id: VehicleType;
  name: string;
  /** Capacidade em referência concreta, não em ficha técnica. */
  fits: string;
  volume: string;
  art: typeof VanArt;
};

export const VEHICLES: VehicleSpec[] = [
  {
    id: 'van',
    name: 'Van ou Fiorino',
    fits: 'Cabe o conteúdo de um quarto',
    volume: 'até 1 m³',
    art: VanArt,
  },
  {
    id: 'bau',
    name: 'Caminhão baú',
    fits: 'Cabe um apartamento de 2 quartos',
    volume: 'até 15 m³',
    art: BauArt,
  },
  {
    id: 'grande',
    name: 'Caminhão grande',
    fits: 'Cabe uma casa inteira',
    volume: 'até 30 m³',
    art: TruckArt,
  },
];

export function vehicleSpec(id: string | null | undefined): VehicleSpec | undefined {
  return VEHICLES.find((v) => v.id === id);
}

/**
 * Veículo provável para cada necessidade.
 *
 * É o que permite o passo de veículo deixar de ser obrigatório: o pedido nasce
 * com um palpite honesto e o usuário só abre a escolha se quiser mudar. Errar
 * o palpite não custa caro — o prestador confirma o veículo na proposta.
 */
export const DEFAULT_VEHICLE: Record<NeedKind, VehicleType> = {
  mudanca: 'bau',
  material: 'bau',
  carga: 'van',
  maquina: 'grande',
  // Não usam veículo de frete, mas o Record precisa ser total para o
  // `noUncheckedIndexedAccess` não obrigar um `??` em todo call site.
  entulho: 'bau',
  veiculo: 'van',
};

/** Ajudantes prováveis. Mudança sem ajudante é a exceção, não a regra. */
export const DEFAULT_HELPERS: Record<NeedKind, number> = {
  mudanca: 2,
  material: 1,
  carga: 1,
  maquina: 1,
  entulho: 0,
  veiculo: 0,
};

// ---------------------------------------------------------------------
// CAÇAMBA
// ---------------------------------------------------------------------

export type CacambaSpec = {
  m3: number;
  /** Referência do dia a dia. "5 m³" não diz nada a quem nunca alugou uma. */
  fits: string;
  weight: string;
};

export const CACAMBA_SIZES: CacambaSpec[] = [
  { m3: 3, fits: 'Reforma de um cômodo', weight: 'até 2,5 t' },
  { m3: 5, fits: 'Banheiro e cozinha, obra média', weight: 'até 4 t' },
  { m3: 8, fits: 'Demolição, limpeza de terreno', weight: 'até 6 t' },
];

export const CacambaSizeArt = CacambaArt;

export const CACAMBA_PERIODS = [
  { id: 1, label: '1 dia', sub: 'Retirada no mesmo dia' },
  { id: 3, label: '3 dias', sub: 'Reforma rápida' },
  { id: 7, label: '7 dias', sub: 'O mais pedido' },
] as const;

export const CACAMBA_MATERIALS = [
  { id: 'entulho', label: 'Entulho de obra', sub: 'Concreto, tijolo, argamassa' },
  { id: 'terra', label: 'Terra e barro', sub: 'Escavação, jardim' },
  { id: 'madeira', label: 'Madeira e móveis', sub: 'Demolição, descarte' },
  { id: 'poda', label: 'Galhos e podas', sub: 'Limpeza de terreno' },
  { id: 'misto', label: 'Misto', sub: 'Um pouco de cada' },
] as const;

// ---------------------------------------------------------------------
// GUINCHO
// ---------------------------------------------------------------------

export const GUINCHO_PROBLEMS = [
  { id: 'pane', label: 'Não liga ou apagou', sub: 'Pane elétrica ou mecânica', icon: 'wrench' },
  { id: 'pneu', label: 'Pneu ou roda', sub: 'Sem estepe, roda travada', icon: 'settings' },
  { id: 'combustivel', label: 'Acabou o combustível', sub: 'Parado sem tanque', icon: 'fuel' },
  { id: 'acidente', label: 'Acidente ou colisão', sub: 'Veículo não roda', icon: 'alert' },
  { id: 'transporte', label: 'Só transportar', sub: 'Veículo em bom estado', icon: 'truck' },
] as const;

export const GUINCHO_VEHICLES = [
  { id: 'popular', label: 'Carro de passeio', sub: 'Hatch, sedã, SUV pequeno' },
  { id: 'suv', label: 'SUV ou picape', sub: 'Veículo alto ou pesado' },
  { id: 'moto', label: 'Moto', sub: 'Qualquer cilindrada' },
  { id: 'van', label: 'Utilitário ou van', sub: 'Furgão, Fiorino, Kombi' },
] as const;

/** Onde o veículo está parado. Muda o custo do resgate, não do transporte. */
export const GUINCHO_ACCESS = [
  { id: 'rua', label: 'Na rua', sub: 'Acesso livre' },
  { id: 'garagem', label: 'Em garagem', sub: 'Subsolo, estacionamento' },
  { id: 'dificil', label: 'Acesso difícil', sub: 'Ladeira, ré longa, terreno' },
  { id: 'expressa', label: 'Via expressa', sub: 'Rodovia, marginal, túnel' },
] as const;

// ---------------------------------------------------------------------
// CARGA DE FRETE
// ---------------------------------------------------------------------
// Os rótulos batem com os que já iam no `payload` das telas antigas, para
// pedido novo e pedido antigo continuarem legíveis pelo mesmo prestador.

export const CARGO_BY_NEED: Record<
  string,
  ReadonlyArray<{ id: string; label: string; sub: string }>
> = {
  mudanca: [
    { id: 'mudanca-casa', label: 'Casa inteira', sub: 'Todos os cômodos' },
    { id: 'mudanca-apto', label: 'Apartamento', sub: '1 a 3 quartos' },
    { id: 'mudanca-comercial', label: 'Escritório ou loja', sub: 'Mudança comercial' },
    { id: 'mudanca-pequena', label: 'Alguns móveis', sub: 'Sofá, cama, geladeira' },
  ],
  material: [
    { id: 'material-obra', label: 'Material de obra', sub: 'Tijolo, cimento, areia' },
    { id: 'material-acabamento', label: 'Acabamento', sub: 'Porcelanato, louça, tinta' },
    { id: 'material-madeira', label: 'Madeira e chapas', sub: 'Tábua, drywall, compensado' },
  ],
  carga: [
    { id: 'carga-caixas', label: 'Caixas e volumes', sub: 'Encomendas, lotes' },
    { id: 'carga-palete', label: 'Palete', sub: 'Carga paletizada' },
    { id: 'carga-mercadoria', label: 'Mercadoria de loja', sub: 'Estoque, reposição' },
  ],
  maquina: [
    { id: 'maquina-leve', label: 'Equipamento leve', sub: 'Gerador, compressor' },
    { id: 'maquina-pesada', label: 'Máquina pesada', sub: 'Precisa de guindaste ou rampa' },
  ],
};

// ---------------------------------------------------------------------
// ACESSO
// ---------------------------------------------------------------------

export const ACCESS_TYPES = [
  { id: 'house', label: 'Casa ou térreo', sub: 'Carga no nível da rua' },
  { id: 'apt', label: 'Apartamento', sub: 'Prédio com andares' },
] as const;
