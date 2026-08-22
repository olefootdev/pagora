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
  | 'prestador_cadastrado'
  // Fluxo de descoberta dentro do app (não pelo WhatsApp). `pedido_publicado`
  // e `pedido_enviado` medem coisas diferentes de propósito: o primeiro é
  // pedido que virou linha no banco e pode receber proposta; o segundo é
  // pedido que saiu por WhatsApp. Comparar os dois é como se mede a migração
  // do canal.
  | 'pedido_publicado'
  | 'publicar_pedido_sem_login'
  | 'proposta_enviada'
  | 'proposta_aceita';

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
