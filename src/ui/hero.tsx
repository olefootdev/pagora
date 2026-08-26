// =====================================================================
// PAGORA — Hero: a laje que engole o cabeçalho
// =====================================================================
// O movimento estrutural do design system aprovado: não existe barra de
// aplicativo separada. Avatar, saudação, sino e o conteúdo do momento moram
// numa laje com o gradiente da marca (`--x-hero-grad`), que mergulha do verde
// vivo ao quase-preto e tem cantos inferiores arredondados.
//
// O componente carrega só a moldura (topo + gradiente); o miolo vem por
// `children`, porque ele é o que muda por tela e por estado — pergunta na
// home ociosa, status na home com transporte, líquido do dia no painel do
// transportador.
// =====================================================================

import type { ReactNode } from 'react';
import { Icon } from '../icons';
import { cx } from './kit';

export type HeroProps = {
  /** Linha pequena acima do nome: "Boa tarde," / "Bem-vindo ao". */
  greeting: string;
  /** Nome de quem está logado, ou a marca para o visitante. */
  name: string;
  avatarUrl?: string | null;
  /** Iniciais para o avatar sem foto; vazio = ícone genérico de pessoa. */
  initials?: string;
  /** Contador do sino. Zero esconde o selo, nunca o sino. */
  badge?: number;
  onBell: () => void;
  bellLabel?: string;
  children: ReactNode;
  className?: string;
};

export const Hero = ({
  greeting,
  name,
  avatarUrl,
  initials,
  badge = 0,
  onBell,
  bellLabel,
  children,
  className,
}: HeroProps) => (
  <section className={cx('px-hero', className)}>
    <div className="px-hero-top">
      <div className="px-hero-who">
        <span className="px-hero-avatar" aria-hidden="true">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : initials || <Icon name="user" size={20} />}
        </span>
        <span style={{ minWidth: 0 }}>
          <span className="px-hero-hi">{greeting}</span>
          <span className="px-hero-name">{name}</span>
        </span>
      </div>

      <button
        className="px-hero-btn"
        onClick={onBell}
        aria-label={bellLabel ?? (badge > 0 ? `Avisos, ${badge} novos` : 'Avisos')}
      >
        <Icon name="bell" size={20} />
        {badge > 0 && (
          <span className="px-hero-btn-dot" aria-hidden="true">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>
    </div>

    {children}
  </section>
);

/** Selo de confiança dentro da laje — informação verificável, não slogan. */
export const HeroSeal = ({ icon, children }: { icon?: string; children: ReactNode }) => (
  <span className="px-hero-seal">
    {icon && <Icon name={icon} size={13} aria-hidden="true" />}
    {children}
  </span>
);
