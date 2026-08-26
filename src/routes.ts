// =====================================================================
// PAGORA — Resolução de rota
// =====================================================================
// Saiu do `App.tsx` para poder ser testada sem arrastar as 60 telas do
// router junto. É lógica pura: recebe o pathname, devolve a tela e o
// segmento.
//
// Por que existe segmento: as telas antigas passavam tudo por
// `location.state`, o que funciona para navegação interna e morre no link
// compartilhado — ele abre a rota sem o estado e a tela não sabe de qual
// pedido se trata. O acompanhamento precisa ser compartilhável (é o link que
// a pessoa manda para quem está esperando a carga), então o id vai na URL.
// =====================================================================

export const ALL_SCREENS = [
  'landing',
  'how',
  'provider-landing',
  'provider-signup',
  'admin-dispute',
  'login',
  'chat',
  'privacidade',
  'termos',
  // Núcleo transacional
  'checkout',
  'prov-financeiro',
  'admin-financeiro',
  // Jornada refatorada
  'inicio',
  'pedido',
  'escolher',
  'acompanhar',
  'comprovante',
  'avaliar',
  'pedidos',
  'avisos',
  'conta',
  'minha-rede',
  'perto',
  'parceiro',
  'parceiro-viagem',
  'parceiro-avisos',
  'parceiro-ganhos',
  'parceiro-conta',
] as const;

export type ScreenId = (typeof ALL_SCREENS)[number];

/**
 * Telas aposentadas e para onde vão agora.
 *
 * Aposentar NÃO é deletar a rota: um pedido pode ter sido compartilhado por
 * WhatsApp com `#/history-list`, e um link que abre a landing sem explicação é
 * pior que um que abre a tela certa. Cada antiga resolve para a substituta que
 * faz a mesma coisa — e faz de verdade, contra o banco.
 *
 * A regra que autorizou cada aposentadoria: a substituta existe, funciona e
 * está no lugar dela na navegação. Nenhuma foi removida antes disso.
 */
export const RETIRED_ROUTES: Readonly<Record<string, string>> = {
  // Listavam propostas a partir de um array fixo no próprio arquivo.
  proposals: 'pedidos',
  compare: 'pedidos',
  // Histórico maquete; `pedidos` lista o que é do usuário.
  'history-list': 'pedidos',
  // Painel do prestador com dados inventados; `parceiro` é a casa real.
  'provider-dash': 'parceiro',
  // Painel do admin maquete; `admin-financeiro` é o que fala com o ledger.
  'admin-dash': 'admin-financeiro',
  // Cadastro duplicado — `provider-signup` é o que grava no banco.
  'prov-signup': 'provider-signup',
  // Os slides entre o código e a primeira ação útil saíram da jornada em
  // 26/08/2026 — a proposta de valor mora no hero da home e em Como funciona.
  onboarding: 'inicio',

  // ---- Aposentadoria em bloco de 26/08/2026 --------------------------
  // O design system chegou a todas as áreas; cada rota abaixo tem uma
  // substituta que fala com o banco. Os wizards antigos apontam para o
  // fluxo de 3 passos DO SERVIÇO certo — quem guardou o link de
  // `#/cacamba-1` cai em caçamba, não numa home genérica.
  services: 'inicio',
  home: 'inicio',
  'frete-1': 'pedido/carga',
  'frete-2': 'pedido/carga',
  'frete-3': 'pedido/carga',
  'frete-4': 'pedido/carga',
  'frete-summary': 'pedido/carga',
  'frete-confirm': 'pedidos',
  'guincho-1': 'pedido/veiculo',
  'guincho-2': 'pedido/veiculo',
  'guincho-3': 'pedido/veiculo',
  'guincho-4': 'pedido/veiculo',
  'cacamba-1': 'pedido/entulho',
  'cacamba-2': 'pedido/entulho',
  'cacamba-3': 'pedido/entulho',
  tracking: 'pedidos',
  locator: 'pedidos',
  'service-done': 'pedidos',
  recurring: 'pedidos',
  joint: 'pedidos',
  'meus-pedidos': 'pedidos',
  map: 'perto',
  notifications: 'avisos',
  favorites: 'conta',
  addresses: 'conta',
  refer: 'minha-rede',
  profile: 'conta',
  wallet: 'conta',
  accessibility: 'conta',
  oportunidades: 'parceiro',
  'provider-confirm': 'provider-signup',
};

/** Rotas que aceitam um segmento: `/pedido/entulho`, `/acompanhar/<id>`. */
export const SEGMENT_ROUTES = new Set<string>([
  'pedido',
  'escolher',
  'acompanhar',
  'comprovante',
  'avaliar',
]);

export type ResolvedRoute = {
  route: string;
  slug?: string;
  /** Preenchido quando a URL pedida foi uma tela aposentada. */
  retiredFrom?: string;
};

export function resolveRoute(path: string): ResolvedRoute {
  // Barras extras nas pontas vêm de link colado à mão e de `buildShareUrl`.
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
  if ((ALL_SCREENS as readonly string[]).includes(clean)) return { route: clean };

  const retired = RETIRED_ROUTES[clean];
  if (retired) {
    // Re-resolve: o destino pode ser rota de segmento ("pedido/carga").
    // Não recursa além de um nível — os testes garantem que nenhuma
    // substituta é, ela mesma, aposentada.
    return { ...resolveRoute(retired), retiredFrom: clean };
  }

  const slash = clean.indexOf('/');
  if (slash > 0) {
    const head = clean.slice(0, slash);
    const rest = clean.slice(slash + 1);
    if (SEGMENT_ROUTES.has(head) && rest) {
      // `decodeURIComponent` estoura em `%` solto, que aparece em link
      // truncado por aplicativo de mensagem. Cair no valor cru é melhor que
      // derrubar a tela inteira.
      let slug: string;
      try {
        slug = decodeURIComponent(rest);
      } catch {
        slug = rest;
      }
      return { route: head, slug };
    }
  }

  return { route: 'landing' };
}
