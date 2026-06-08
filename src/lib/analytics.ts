// PAGORA — Analytics wrapper
// Camada fina sobre gtag (GA4) / window.dataLayer (GTM), com fallback console em dev.
//
// Eventos canônicos (DS §13):
//   simulacao_iniciada    { tipo_servico }
//   distancia_definida    { km, metodo }
//   adicional_selecionado { adicional, preco_atual }
//   preco_calculado       { valor, tipo, km }
//   pedido_enviado        { valor, tipo, adicionais }
//   whatsapp_clicado      { origem }
//   email_capturado       { origem }
//   prestador_cadastrado  { tipo, regiao }

export type AnalyticsEvent =
  | 'simulacao_iniciada'
  | 'distancia_definida'
  | 'adicional_selecionado'
  | 'preco_calculado'
  | 'pedido_enviado'
  | 'whatsapp_clicado'
  | 'email_capturado'
  | 'prestador_cadastrado';

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (command: 'event', eventName: string, params?: AnalyticsProps) => void;
    dataLayer?: Array<Record<string, unknown>>;
  }
}

const isDev = (): boolean => {
  try {
    return import.meta.env?.DEV ?? false;
  } catch {
    return false;
  }
};

export const track = (event: AnalyticsEvent, props: AnalyticsProps = {}): void => {
  if (typeof window === 'undefined') return;

  if (typeof window.gtag === 'function') {
    window.gtag('event', event, props);
  }
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event, ...props });
  }
  if (isDev()) {
    console.log('[PAGORA analytics]', event, props);
  }
};
