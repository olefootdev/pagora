/* PAGORA — WhatsApp deep-link
 * Gera mensagens pré-formatadas e abre wa.me com tudo preenchido.
 *
 * Em produção, o número vem de env / firestore. Aqui usamos um placeholder
 * que pode ser sobrescrito via window.PAGORA_WPP_NUMBER antes da carga.
 */

const DEFAULT_NUMBER = "5511999999999";

const getNumber = () =>
  (typeof window !== "undefined" && window.PAGORA_WPP_NUMBER) || DEFAULT_NUMBER;

const buildLink = (mensagem, numero = getNumber()) =>
  `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;

const abrirWhatsApp = (mensagem, numero) => {
  const link = buildLink(mensagem, numero);
  if (typeof window !== "undefined") window.open(link, "_blank", "noopener,noreferrer");
  return link;
};

// ─────────────────────────────────────────────────────────────────────────
// Templates — espelham os labels usados nas telas Summary
// ─────────────────────────────────────────────────────────────────────────

const CARGO_LABEL = {
  "mudanca-res": "Mudança residencial completa",
  "mudanca-com": "Mudança comercial",
  "moveis": "Móveis e eletrodomésticos",
  "carga-geral": "Carga geral / mercadorias",
  "construcao": "Materiais de construção",
  "outro": "Outro tipo de carga",
};

const VEHICLE_LABEL = {
  van: "Van / Fiorino (até 1 m³)",
  bau: "Caminhão baú (até 15 m³)",
  grande: "Caminhão grande (até 30 m³)",
};

const URGENCY_LABEL = {
  today: "Hoje (urgente)",
  tomorrow: "Amanhã",
  week: "Nos próximos 7 dias",
  scheduled: "Agendado",
};

const formatPriceLine = (price) => {
  const f = window.PagoraPricing?.formatRange;
  if (f) return f(price.low, price.high);
  return `R$ ${price.low} – R$ ${price.high}`;
};

const mensagemFrete = (state, price) => {
  const linhas = [
    "Olá! Quero solicitar um FRETE pela PAGORA:",
    "",
    `📦 Carga: ${CARGO_LABEL[state.cargo] || "—"}`,
    `📍 Origem: ${state.origin || "—"}`,
    `📍 Destino: ${state.dest || "—"}`,
    `📏 Distância: ${state.distance || 15} km`,
    `🚛 Veículo: ${VEHICLE_LABEL[state.vehicle] || "—"}`,
    `👥 Ajudantes: ${state.helpers || 0}`,
    `🕐 Quando: ${URGENCY_LABEL[state.urgency] || "—"}`,
  ];
  if (state.notes) linhas.push(`📝 Observações: ${state.notes}`);
  linhas.push("", `💰 Estimativa: ${formatPriceLine(price)}`, "", "Pode me enviar uma proposta?");
  return linhas.join("\n");
};

const PROBLEM_LABEL = {
  pane: "Pane mecânica",
  pneu: "Pneu furado",
  bateria: "Bateria descarregada",
  acidente: "Envolvido em acidente",
  combustivel: "Sem combustível",
  outro: "Outro problema",
};

const mensagemGuincho = (state, price) => {
  const linhas = [
    "Olá! Preciso de GUINCHO pela PAGORA:",
    "",
    `⚠️ Problema: ${PROBLEM_LABEL[state.problem] || "—"}`,
    `🚗 Veículo: ${state.vehicleType || "—"}`,
    `📍 Local: ${state.origin || "—"}`,
    `📏 Distância até destino: ${state.distance || 8} km`,
    `🕐 Urgência: ${state.urgency === "now" ? "Agora" : "Programado"}`,
  ];
  if (state.notes) linhas.push(`📝 Observações: ${state.notes}`);
  linhas.push("", `💰 Estimativa: ${formatPriceLine(price)}`, "", "Quanto tempo até chegar?");
  return linhas.join("\n");
};

const CACAMBA_SIZE_LABEL = { p3: "3 m³", p5: "5 m³", p8: "8 m³" };
const CACAMBA_DURATION_LABEL = { d1: "1 dia", d3: "2–3 dias", d7: "1 semana" };
const CACAMBA_MATERIAL_LABEL = {
  entulho: "Entulho de obra",
  terra: "Terra / barro",
  galhos: "Galhos e poda",
  misto: "Material misto",
};

const mensagemCacamba = (state, price) => {
  const linhas = [
    "Olá! Quero alugar uma CAÇAMBA pela PAGORA:",
    "",
    `🗑️ Material: ${CACAMBA_MATERIAL_LABEL[state.material] || "—"}`,
    `📐 Tamanho: ${CACAMBA_SIZE_LABEL[state.size] || "—"}`,
    `📅 Período: ${CACAMBA_DURATION_LABEL[state.duration] || "—"}`,
    `📍 Endereço: ${state.origin || "—"}`,
  ];
  if (state.notes) linhas.push(`📝 Observações: ${state.notes}`);
  linhas.push("", `💰 Estimativa: ${formatPriceLine(price)}`, "", "Quando você pode entregar?");
  return linhas.join("\n");
};

window.PagoraWhatsApp = {
  abrirWhatsApp,
  buildLink,
  mensagemFrete,
  mensagemGuincho,
  mensagemCacamba,
};
