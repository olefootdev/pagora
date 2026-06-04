/* PAGORA — Analytics wrapper
 * Camada fina sobre gtag / window.dataLayer com fallback console em dev.
 *
 * Eventos previstos (DS §13):
 *   simulacao_iniciada    { tipo_servico }
 *   distancia_definida    { km, metodo: "slider" | "endereco" }
 *   adicional_selecionado { adicional, preco_atual }
 *   preco_calculado       { valor, tipo, km }
 *   pedido_enviado        { valor, tipo, adicionais }
 *   whatsapp_clicado      { origem }
 *   email_capturado       { origem }
 *   prestador_cadastrado  { tipo, regiao }
 */

const isDev = () => {
  try {
    return import.meta.env?.DEV ?? false;
  } catch {
    return false;
  }
};

const track = (event, props = {}) => {
  // Google Analytics 4 (se carregado via gtag.js)
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, props);
  }
  // GTM / dataLayer (alternativa)
  if (typeof window !== "undefined" && Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event, ...props });
  }
  // Console em dev — não polui produção
  if (isDev()) {
    // eslint-disable-next-line no-console
    console.log("[PAGORA analytics]", event, props);
  }
};

window.PagoraAnalytics = { track };
