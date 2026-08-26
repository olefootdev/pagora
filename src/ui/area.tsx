// =====================================================================
// PAGORA — Barras de área
// =====================================================================
// Hoje existe UMA barra inferior servindo 37 rotas de perfis diferentes,
// visível inclusive durante o fluxo de pedido. Um fluxo com começo e fim
// precisa de saída consciente, não de cinco atalhos para abandoná-lo.
//
// A proposta separa por quem está usando: cliente e prestador têm barras
// próprias, e o fluxo de pedido não tem barra nenhuma.
// =====================================================================

import { Icon } from '../icons';
import { cx } from './kit';
import type { GoFn } from '../types';
import { useSession } from '../hooks/useSession';
import { useNotices } from '../flows/avisos';

export type NavTab = {
  id: string;
  route: string;
  label: string;
  icon: string;
  badge?: number;
};

/**
 * Cliente. Cinco destinos é o teto — acima disso os rótulos truncam em 375px
 * e a barra vira uma fileira de reticências.
 *
 * "Perto" saiu para "Avisos" entrar: descobrir que chegou proposta vale mais
 * que ver o mapa de quem atende a região, e o mapa continua a um toque, no
 * card de prestadores do próprio fluxo de pedido.
 */
export const CLIENT_TABS: NavTab[] = [
  { id: 'inicio', route: 'inicio', label: 'Início', icon: 'home' },
  { id: 'pedidos', route: 'pedidos', label: 'Pedidos', icon: 'package' },
  { id: 'avisos', route: 'avisos', label: 'Avisos', icon: 'bell' },
  { id: 'mapa', route: 'perto', label: 'Perto', icon: 'pin' },
  { id: 'conta', route: 'conta', label: 'Conta', icon: 'user' },
];

/**
 * Prestador. "Viagem" só faz sentido quando existe serviço aceito, mas some
 * da barra deixaria o alvo pulando de lugar — fica sempre, em estado vazio.
 *
 * "Avisos" é a mesma quinta aba do cliente, pelo mesmo motivo: Oportunidades
 * responde "o que posso pegar agora", Avisos responde "o que mudou desde que
 * eu olhei" — inclusive o único sinal que faz o caminhão sair do lugar,
 * *pagamento confirmado*, que hoje não existe em tela nenhuma.
 */
export const PROVIDER_TABS: NavTab[] = [
  // O rótulo é "Pedidos", não "Oportunidades": com cinco abas em 375px a
  // palavra longa trunca ("Oportunid…"), e o próprio conteúdo da tela já
  // chama a lista de "3 pedidos abertos". O título da tela segue
  // "Oportunidades" — é lá que a palavra cabe inteira.
  { id: 'oportunidades', route: 'parceiro', label: 'Pedidos', icon: 'bolt' },
  { id: 'viagem', route: 'parceiro-viagem', label: 'Viagem', icon: 'truck' },
  { id: 'avisos', route: 'parceiro-avisos', label: 'Avisos', icon: 'bell' },
  { id: 'ganhos', route: 'parceiro-ganhos', label: 'Ganhos', icon: 'money' },
  { id: 'conta', route: 'parceiro-conta', label: 'Conta', icon: 'user' },
];

export const AreaNav = ({
  tabs,
  active,
  go,
  badges,
}: {
  tabs: NavTab[];
  active: string;
  go: GoFn;
  /** Contadores por id de aba. Só o que for maior que zero aparece. */
  badges?: Record<string, number>;
}) => (
  <nav className="px-nav" aria-label="Navegação principal">
    {tabs.map((t) => {
      const on = t.id === active;
      const count = badges?.[t.id] ?? t.badge ?? 0;
      return (
        <button
          key={t.id}
          className={cx('px-nav-item', on && 'is-on')}
          onClick={() => go(t.route)}
          aria-current={on ? 'page' : undefined}
        >
          <Icon name={t.icon} size={21} strokeWidth={on ? 2 : 1.7} />
          <span>{t.label}</span>
          {count > 0 ? (
            <span
              className="px-nav-badge"
              aria-label={`${count} ${count === 1 ? 'novo' : 'novos'}`}
            >
              {count > 9 ? '9+' : count}
            </span>
          ) : null}
        </button>
      );
    })}
  </nav>
);

/**
 * Barra do cliente já ligada ao contador de avisos.
 *
 * Existe para as cinco telas de cliente não repetirem o mesmo `useNotices` —
 * e para o selo não depender de a pessoa abrir a aba de avisos para descobrir
 * que tem proposta esperando.
 */
export const ClientNav = ({ active, go }: { active: string; go: GoFn }) => {
  const { user } = useSession();
  const { unseen } = useNotices(user?.id);
  return <AreaNav tabs={CLIENT_TABS} active={active} go={go} badges={{ avisos: unseen }} />;
};
