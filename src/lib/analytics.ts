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
  // Porta do app (tela Entrar): enviar o SMS custa dinheiro — medir o funil
  // telefone → código → sessão é o que diz se o custo está virando conta.
  | 'otp_enviado'
  | 'login_ok'
  // Recompra: a taxa de repetição é a métrica que diz se o marketplace
  // fideliza ou se cada pedido é um cliente novo.
  | 'pedido_repetido'
  // Avaliação: sem ela não existe a nota que vende o marketplace.
  | 'servico_avaliado'
  // Disputa: a taxa de resposta do prestador dentro do prazo diz se o SLA de
  // 24 h é real ou se o admin está decidindo com um lado só da história.
  | 'disputa_respondida'
  | 'proposta_enviada'
  | 'proposta_aceita'
  // Jornada refatorada. `pedido_iniciado` mede a entrada pelo campo de
  // intenção contra a entrada pelos atalhos — é o número que diz se o texto
  // livre está puxando gente ou se é enfeite caro.
  | 'pedido_iniciado'
  | 'viagem_avancada'
  | 'entrega_confirmada'
  | 'acompanhamento_compartilhado';

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
