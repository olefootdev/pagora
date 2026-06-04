/* PAGORA — Pricing engine
 * Centraliza os cálculos de preço dos 3 serviços (Frete, Guincho, Caçamba).
 * Mantém compatibilidade com os formatos { low, high, breakdown } usados em
 * frete.jsx / extra.jsx, que renderizam range de estimativa.
 *
 * Expõe em window.PagoraPricing para uso pelos componentes legados.
 */

// ─────────────────────────────────────────────────────────────────────────
// FRETE
// ─────────────────────────────────────────────────────────────────────────
const calcFrete = (s) => {
  const km = s.distance || 15;
  const baseKm = km * 12;
  const vehicle = { van: 0, bau: 50, grande: 130 }[s.vehicle] || 50;
  const helpers = (s.helpers || 0) * 50;
  const access =
    (s.originAccess?.needHelp ? 30 : 0) +
    (s.destAccess?.needHelp ? 30 : 0);
  const noElev =
    (s.originAccess?.type === "apt" && !s.originAccess?.elevator ? 25 : 0) +
    (s.destAccess?.type === "apt" && !s.destAccess?.elevator ? 25 : 0);
  const baseFee = 30;
  let total = baseKm + vehicle + helpers + access + noElev + baseFee;
  if (s.urgency === "today") total = Math.round(total * 1.3);
  return {
    low: Math.round(total),
    high: Math.round(total * 1.25),
    breakdown: {
      baseKm, vehicle, helpers, access, noElev, baseFee,
      urgency: s.urgency === "today" ? "+30%" : "—",
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────
// GUINCHO
// ─────────────────────────────────────────────────────────────────────────
const calcGuincho = (s) => {
  const km = s.distance || 8;
  const baseKm = km * 15;
  const veh = {
    popular: 0, medio: 30, grande: 60, suv: 80, pickup: 80, moto: -20, van: 60,
  }[s.vehicleType] || 30;
  const access = { rua: 0, garagem: 40, dificil: 80, expressa: 120 }[s.location] || 0;
  const baseFee = 60;
  let total = baseKm + veh + access + baseFee;
  if (s.urgency === "now") total = Math.round(total * 1.5);
  return {
    low: Math.round(total),
    high: Math.round(total * 1.3),
    breakdown: {
      baseKm, veh, access, baseFee,
      urgency: s.urgency === "now" ? "+50%" : "—",
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────
// CAÇAMBA
// ─────────────────────────────────────────────────────────────────────────
const calcCacamba = (s) => {
  const sizePrice = { p3: 180, p5: 280, p8: 380 }[s.size] || 280;
  const time = { d1: 0, d3: 60, d7: 120 }[s.duration] || 0;
  const total = sizePrice + time;
  return {
    low: total,
    high: Math.round(total * 1.15),
    breakdown: { sizePrice, time },
  };
};

// ─────────────────────────────────────────────────────────────────────────
// Formatter — sempre BRL pt-BR
// ─────────────────────────────────────────────────────────────────────────
const formatBRL = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatRange = (low, high) => `${formatBRL(low)} – ${formatBRL(high)}`;

window.PagoraPricing = {
  calcFrete,
  calcGuincho,
  calcCacamba,
  formatBRL,
  formatRange,
};
