// PAGORA — WhatsApp deep-link
// Gera mensagens pré-formatadas (frete/guincho/caçamba) e abre wa.me.
//
// Número da central via .env.local:
//   VITE_PAGORA_WPP_NUMBER=5511999999999  (formato E.164 sem '+')
// Sobreposição em runtime via window.PAGORA_WPP_NUMBER (debug/staging).

import type { PagoraState, PricingResult } from '../types';

declare global {
  interface Window {
    PAGORA_WPP_NUMBER?: string;
  }
}

const DEFAULT_NUMBER = '5511999999999';

const getNumber = (): string => {
  if (typeof window !== 'undefined' && window.PAGORA_WPP_NUMBER) {
    return window.PAGORA_WPP_NUMBER;
  }
  try {
    return import.meta.env.VITE_PAGORA_WPP_NUMBER || DEFAULT_NUMBER;
  } catch {
    return DEFAULT_NUMBER;
  }
};

export const buildLink = (mensagem: string, numero: string = getNumber()): string =>
  `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;

export const abrirWhatsApp = (mensagem: string, numero?: string): string => {
  const link = buildLink(mensagem, numero ?? getNumber());
  if (typeof window !== 'undefined') {
    window.open(link, '_blank', 'noopener,noreferrer');
  }
  return link;
};

// ─── Formatter local (não acopla a este módulo um lib/format.ts) ───────
const formatBRL = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatRange = (low: number, high: number): string => `${formatBRL(low)} – ${formatBRL(high)}`;

// ─── Labels (espelham os usados nas telas Summary) ─────────────────────
const CARGO_LABEL: Record<string, string> = {
  'mudanca-res': 'Mudança residencial completa',
  'mudanca-com': 'Mudança comercial',
  moveis: 'Móveis e eletrodomésticos',
  'carga-geral': 'Carga geral / mercadorias',
  construcao: 'Materiais de construção',
  outro: 'Outro tipo de carga',
};

const VEHICLE_LABEL: Record<string, string> = {
  van: 'Van / Fiorino (até 1 m³)',
  bau: 'Caminhão baú (até 15 m³)',
  grande: 'Caminhão grande (até 30 m³)',
};

const URGENCY_LABEL: Record<string, string> = {
  today: 'Hoje (urgente)',
  tomorrow: 'Amanhã',
  week: 'Nos próximos 7 dias',
  scheduled: 'Agendado',
};

const PROBLEM_LABEL: Record<string, string> = {
  pane: 'Pane mecânica',
  pneu: 'Pneu furado',
  bateria: 'Bateria descarregada',
  acidente: 'Envolvido em acidente',
  combustivel: 'Sem combustível',
  outro: 'Outro problema',
};

const CACAMBA_SIZE_LABEL: Record<string, string> = {
  p3: '3 m³',
  p5: '5 m³',
  p8: '8 m³',
};
const CACAMBA_DURATION_LABEL: Record<string, string> = {
  d1: '1 dia',
  d3: '2–3 dias',
  d7: '1 semana',
};
const CACAMBA_MATERIAL_LABEL: Record<string, string> = {
  entulho: 'Entulho de obra',
  terra: 'Terra / barro',
  galhos: 'Galhos e poda',
  misto: 'Material misto',
};

const lookup = (table: Record<string, string>, key: string | null | undefined): string =>
  (key && table[key]) || '—';

// ─── Templates ──────────────────────────────────────────────────────────
export const mensagemFrete = (state: PagoraState, price: PricingResult): string => {
  const linhas = [
    'Olá! Quero solicitar um FRETE pela PAGORA:',
    '',
    `📦 Carga: ${lookup(CARGO_LABEL, state.cargo)}`,
    `📍 Origem: ${state.origin || '—'}`,
    `📍 Destino: ${state.dest || '—'}`,
    `📏 Distância: ${state.distance ?? 15} km`,
    `🚛 Veículo: ${lookup(VEHICLE_LABEL, state.vehicle)}`,
    `👥 Ajudantes: ${state.helpers ?? 0}`,
    `🕐 Quando: ${lookup(URGENCY_LABEL, state.urgency)}`,
  ];
  if (state.notes) linhas.push(`📝 Observações: ${state.notes}`);
  linhas.push(
    '',
    `💰 Estimativa: ${formatRange(price.low, price.high)}`,
    '',
    'Pode me enviar uma proposta?',
  );
  return linhas.join('\n');
};

export const mensagemGuincho = (state: PagoraState, price: PricingResult): string => {
  const linhas = [
    'Olá! Preciso de GUINCHO pela PAGORA:',
    '',
    `⚠️ Problema: ${lookup(PROBLEM_LABEL, state.problem)}`,
    `🚗 Veículo: ${state.vehicleType || '—'}`,
    `📍 Local: ${state.origin || state.currentLoc || '—'}`,
    `📏 Distância até destino: ${state.distance ?? 8} km`,
    `🕐 Urgência: ${state.urgency === 'now' ? 'Agora' : 'Programado'}`,
  ];
  if (state.notes) linhas.push(`📝 Observações: ${state.notes}`);
  linhas.push(
    '',
    `💰 Estimativa: ${formatRange(price.low, price.high)}`,
    '',
    'Quanto tempo até chegar?',
  );
  return linhas.join('\n');
};

export const mensagemCacamba = (state: PagoraState, price: PricingResult): string => {
  const linhas = [
    'Olá! Quero alugar uma CAÇAMBA pela PAGORA:',
    '',
    `🗑️ Material: ${lookup(CACAMBA_MATERIAL_LABEL, state.material)}`,
    `📐 Tamanho: ${lookup(CACAMBA_SIZE_LABEL, state.size)}`,
    `📅 Período: ${lookup(CACAMBA_DURATION_LABEL, state.duration)}`,
    `📍 Endereço: ${state.address || state.origin || '—'}`,
  ];
  if (state.notes) linhas.push(`📝 Observações: ${state.notes}`);
  linhas.push(
    '',
    `💰 Estimativa: ${formatRange(price.low, price.high)}`,
    '',
    'Quando você pode entregar?',
  );
  return linhas.join('\n');
};
