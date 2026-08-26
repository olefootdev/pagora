// =====================================================================
// PAGORA — Primitivos do sistema visual
// =====================================================================
// O que a auditoria encontrou e este arquivo resolve:
//
//   <button className="pg-btn pg-btn--primary"
//           style={{ background:'var(--green-500)', color:'var(--night-900)',
//                    border:'none', fontWeight:700 }}>
//
// O estilo inline sobrescrevendo a classe é o sintoma de que a classe nunca
// cobriu a variante necessária. Havia dezenas dessas correções pontuais, e
// era por elas que a mesma ação parecia diferente em telas diferentes.
//
// Aqui a variante é uma prop. Se ela não existe, ou a prop nasce — e vale
// para o app inteiro — ou o desenho está errado.
// =====================================================================

import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Icon } from '../icons';

/* ---------------------------------------------------------------------
 * Utilidade de classe. Aceita falsos para o call site poder escrever
 * `cx('px-btn', on && 'is-on')` sem ternário.
 * ------------------------------------------------------------------- */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// =====================================================================
// ESTRUTURA DE TELA
// =====================================================================

export type ScreenProps = {
  children: ReactNode;
  /** Rótulo lido por leitor de tela e usado no inventário de telas. */
  label?: string;
  className?: string;
  /**
   * Mantém esta tela no tema escuro.
   *
   * O CLARO é o padrão desde a aprovação do design system (26/08/2026) — o
   * `.is-light` redefine os mesmos tokens `--x-*`, então os componentes nunca
   * souberam a cor, só o nome dela. `dark` existe como transição: cada tela
   * ainda não convertida o carrega explicitamente, e a Fase B os remove um a
   * um, com verificação no navegador. Quando o último sair, a prop morre.
   */
  dark?: boolean;
};

/**
 * Raiz de toda tela nova. É ela que carrega a classe `pgx`, onde vivem os
 * tokens do sistema — por isso nenhuma tela antiga é afetada.
 */
export const Screen = ({ children, label, className, dark }: ScreenProps) => (
  <div className={cx('pgx', !dark && 'is-light', className)} data-screen={label}>
    {children}
  </div>
);

export type ScreenHeadProps = {
  onBack?: (() => void) | undefined;
  title?: string | undefined;
  /** Canto direito: normalmente um IconButton ou um Chip. */
  action?: ReactNode;
  sticky?: boolean;
  /**
   * O título da barra é o `<h1>` da tela?
   *
   * `true` (padrão) para telas cujo único título é este — Pedidos, Conta,
   * Propostas. `false` para telas que também mostram um `<Title>` grande no
   * corpo: aí o `<h1>` é aquele, e este vira só rótulo da barra.
   *
   * A alternativa preguiçosa seria deixar tudo como `<h2>`. Isso produzia o
   * salto H1 → H3 que o leitor de tela anuncia como nível pulado, e telas sem
   * `<Title>` ficavam sem `<h1>` nenhum.
   */
  heading?: boolean;
};

export const ScreenHead = ({
  onBack,
  title,
  action,
  sticky = false,
  heading = true,
}: ScreenHeadProps) => (
  <header className={cx('px-head', sticky && 'px-head--sticky')}>
    {onBack && (
      <button className="px-iconbtn px-iconbtn--ghost" onClick={onBack} aria-label="Voltar">
        <Icon name="arrow-left" size={20} />
      </button>
    )}
    {title ? (
      heading ? (
        <h1 className="px-head-title">{title}</h1>
      ) : (
        <div className="px-head-title">{title}</div>
      )
    ) : (
      <span style={{ flex: 1 }} />
    )}
    {action}
  </header>
);

export const Body = ({
  children,
  flush = false,
  className,
}: {
  children: ReactNode;
  flush?: boolean;
  className?: string;
}) => <div className={cx('px-body', flush && 'px-body--flush', className)}>{children}</div>;

export const Dock = ({ children }: { children: ReactNode }) => (
  <div className="px-dock">{children}</div>
);

/**
 * Progresso do fluxo. Substitui o "PASSO 1 DE 5" — que era a primeira coisa
 * que o usuário lia e informava quantas telas ainda faltavam antes de dizer
 * o que estava sendo pedido. O fio informa o mesmo sem cobrar atenção.
 */
export const Rail = ({ step, total }: { step: number; total: number }) => {
  const pct = Math.max(0, Math.min(100, (step / total) * 100));
  return (
    <div
      className="px-rail"
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Passo ${step} de ${total}`}
    >
      <div className="px-rail-fill" style={{ width: `${pct}%` }} />
    </div>
  );
};

// =====================================================================
// TIPOGRAFIA
// =====================================================================

export const Eyebrow = ({ children }: { children: ReactNode }) => (
  <div className="px-eyebrow">{children}</div>
);

export const Title = ({ children, small = false }: { children: ReactNode; small?: boolean }) => (
  <h1 className={cx('px-title', small && 'px-title--sm')}>{children}</h1>
);

export const Sub = ({ children }: { children: ReactNode }) => <p className="px-sub">{children}</p>;

export const SectionTitle = ({ children, id }: { children: ReactNode; id?: string }) => (
  <h2 className="px-sectitle" id={id}>
    {children}
  </h2>
);

/**
 * O número. Regra do sistema: onde há decisão, o número é o maior elemento
 * da tela e a legenda vive embaixo dele — nunca do lado, nunca no mesmo
 * corpo do texto auxiliar.
 */
export const Num = ({
  value,
  unit,
  size = 'lg',
  color,
}: {
  value: ReactNode;
  unit?: ReactNode;
  size?: 'lg' | 'md' | 'sm';
  color?: string;
}) => (
  <div>
    <span
      className={cx('px-num', size === 'md' && 'px-num--md', size === 'sm' && 'px-num--sm')}
      style={color ? { color } : undefined}
    >
      {value}
    </span>
    {unit && <span className="px-num-unit">{unit}</span>}
  </div>
);

export const Stack = ({
  children,
  gap = 'md',
  className,
}: {
  children: ReactNode;
  gap?: 'tight' | 'md' | 'loose';
  className?: string;
}) => (
  <div
    className={cx(
      'px-stack',
      gap === 'tight' && 'px-stack--tight',
      gap === 'loose' && 'px-stack--loose',
      className,
    )}
  >
    {children}
  </div>
);

/** Título + subtítulo como bloco — o par mais repetido do app. */
export const Heading = ({
  eyebrow,
  title,
  sub,
  small = false,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  small?: boolean;
}) => (
  <div className="px-heading-block">
    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
    <Title small={small}>{title}</Title>
    {sub && <Sub>{sub}</Sub>}
  </div>
);

// =====================================================================
// BOTÕES
// =====================================================================

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'quiet' | 'urgent' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  /** Ícone à direita do rótulo. À esquerda use `iconStart`. */
  icon?: string;
  iconStart?: string;
  /** Trava o botão e troca o rótulo enquanto uma ação assíncrona corre. */
  busy?: boolean;
  busyLabel?: string;
};

export const Button = ({
  variant = 'neutral',
  size = 'md',
  block = false,
  icon,
  iconStart,
  busy = false,
  busyLabel,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) => (
  <button
    className={cx(
      'px-btn',
      variant === 'primary' && 'px-btn--primary',
      variant === 'outline' && 'px-btn--outline',
      variant === 'quiet' && 'px-btn--quiet',
      variant === 'urgent' && 'px-btn--urgent',
      block && 'px-btn--block',
      size === 'lg' && 'px-btn--lg',
      size === 'sm' && 'px-btn--sm',
      className,
    )}
    disabled={disabled || busy}
    aria-busy={busy || undefined}
    {...rest}
  >
    {iconStart && !busy && <Icon name={iconStart} size={size === 'sm' ? 16 : 19} />}
    {busy ? (busyLabel ?? 'Aguarde…') : children}
    {icon && !busy && <Icon name={icon} size={size === 'sm' ? 16 : 19} />}
  </button>
);

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string;
  /** Obrigatório: botão só de ícone sem nome é invisível para leitor de tela. */
  label: string;
  ghost?: boolean;
  size?: number;
};

export const IconButton = ({
  icon,
  label,
  ghost = false,
  size = 20,
  className,
  ...rest
}: IconButtonProps) => (
  <button
    className={cx('px-iconbtn', ghost && 'px-iconbtn--ghost', className)}
    aria-label={label}
    title={label}
    {...rest}
  >
    <Icon name={icon} size={size} />
  </button>
);

// =====================================================================
// CARDS E OPÇÕES
// =====================================================================

export const Card = ({
  children,
  tone = 'default',
  className,
  ...rest
}: {
  children: ReactNode;
  tone?: 'default' | 'flat' | 'action' | 'urgent';
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cx(
      'px-card',
      tone === 'flat' && 'px-card--flat',
      tone === 'action' && 'px-card--action',
      tone === 'urgent' && 'px-card--urgent',
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);

export type OptionProps = {
  title: ReactNode;
  sub?: ReactNode;
  /** Ilustração à esquerda. Aceita SVG próprio, não só ícone. */
  art?: ReactNode;
  icon?: string;
  meta?: ReactNode;
  selected?: boolean;
  onClick: () => void;
  /**
   * Quando `true`, o toque avança sozinho e a seta aparece no fim da linha.
   * É o padrão que substitui "rádio + Continuar desabilitado": o passo aceita
   * uma resposta só, então o toque na opção já contém a intenção de avançar.
   */
  advances?: boolean;
};

export const Option = ({
  title,
  sub,
  art,
  icon,
  meta,
  selected = false,
  onClick,
  advances = false,
}: OptionProps) => (
  <button
    className={cx('px-opt', selected && 'is-on')}
    onClick={onClick}
    aria-pressed={advances ? undefined : selected}
  >
    {(art || icon) && (
      <span className="px-opt-art" aria-hidden="true">
        {art ?? (icon ? <Icon name={icon} size={22} /> : null)}
      </span>
    )}
    <span className="px-opt-text">
      <span className="px-opt-t">{title}</span>
      {sub && <span className="px-opt-s">{sub}</span>}
    </span>
    <span className="px-opt-end">
      {meta}
      {advances ? (
        <Icon name="arrow-right" size={18} />
      ) : selected ? (
        <Icon name="check-circle" size={20} />
      ) : null}
    </span>
  </button>
);

export const Tile = ({
  title,
  sub,
  icon,
  art,
  onClick,
}: {
  title: ReactNode;
  sub?: ReactNode;
  icon?: string;
  art?: ReactNode;
  onClick: () => void;
}) => (
  <button className="px-tile" onClick={onClick}>
    <span className="px-tile-art" aria-hidden="true">
      {art ?? (icon ? <Icon name={icon} size={21} /> : null)}
    </span>
    <span>
      <span className="px-tile-t">{title}</span>
      {sub && <span className="px-tile-s">{sub}</span>}
    </span>
  </button>
);

// =====================================================================
// CHIPS
// =====================================================================

export type ChipTone = 'default' | 'on' | 'urgent' | 'info' | 'danger';

export const Chip = ({
  children,
  tone = 'default',
  bare = false,
}: {
  children: ReactNode;
  tone?: ChipTone;
  bare?: boolean;
}) => (
  <span
    className={cx(
      'px-chip',
      tone === 'on' && 'px-chip--on',
      tone === 'urgent' && 'px-chip--urgent',
      tone === 'info' && 'px-chip--info',
      tone === 'danger' && 'px-chip--danger',
      bare && 'px-chip--bare',
    )}
  >
    {children}
  </span>
);

// =====================================================================
// CAMPOS
// =====================================================================

export type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string | null;
  hint?: string;
  /** Ícone dentro do campo, à esquerda. */
  icon?: string;
};

export const Field = ({ label, error, hint, icon, id, className, ...rest }: FieldProps) => {
  // `useId` em vez de contador em ref: o id precisa sobreviver a re-render
  // para o `htmlFor` não trocar de alvo, e ler `ref.current` durante o render
  // é justamente o que o React 19 proíbe. `useId` também é estável entre
  // servidor e cliente, o que um contador de módulo nunca seria.
  const auto = useId();
  const fid = id ?? auto;
  const eid = `${fid}-msg`;

  return (
    <div className="px-fieldset">
      {label && (
        <label className="px-label" htmlFor={fid}>
          {label}
        </label>
      )}
      <div className={icon ? 'px-search' : undefined}>
        {icon && (
          <span className="px-search-icon" aria-hidden="true">
            <Icon name={icon} size={19} />
          </span>
        )}
        <input
          id={fid}
          className={cx('px-input', error && 'is-bad', className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? eid : undefined}
          {...rest}
        />
      </div>
      {error ? (
        <span className="px-err" id={eid} role="alert">
          <Icon name="alert" size={14} />
          {error}
        </span>
      ) : hint ? (
        <span className="px-opt-s" id={eid}>
          {hint}
        </span>
      ) : null}
    </div>
  );
};

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string | null;
  hint?: string;
};

export const TextArea = ({ label, error, hint, id, className, ...rest }: TextAreaProps) => {
  const auto = useId();
  const fid = id ?? auto;
  const eid = `${fid}-msg`;

  return (
    <div className="px-fieldset">
      {label && (
        <label className="px-label" htmlFor={fid}>
          {label}
        </label>
      )}
      <textarea
        id={fid}
        className={cx('px-textarea', error && 'is-bad', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? eid : undefined}
        {...rest}
      />
      {error ? (
        <span className="px-err" id={eid} role="alert">
          <Icon name="alert" size={14} />
          {error}
        </span>
      ) : hint ? (
        <span className="px-opt-s" id={eid}>
          {hint}
        </span>
      ) : null}
    </div>
  );
};

// =====================================================================
// LINHAS DE DADO
// =====================================================================

export const KV = ({ k, v, strong = false }: { k: ReactNode; v: ReactNode; strong?: boolean }) => (
  <div className="px-kv">
    <span className="k">{k}</span>
    <span className="v" style={strong ? { fontWeight: 700, fontSize: 15 } : undefined}>
      {v}
    </span>
  </div>
);

export const Avatar = ({
  initials,
  src,
  large = false,
  alt,
}: {
  initials: string;
  src?: string | null;
  large?: boolean;
  alt?: string;
}) => (
  <span className={cx('px-avatar', large && 'px-avatar--lg')}>
    {src ? (
      <img
        src={src}
        alt={alt ?? ''}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    ) : (
      <span aria-hidden="true">{initials}</span>
    )}
  </span>
);

/** Nota do prestador. Estrela + número — nunca só estrelas desenhadas. */
export const Rating = ({ value, count }: { value?: number | null; count?: number | null }) => {
  if (value == null || value <= 0) {
    return (
      <span className="px-opt-s" style={{ marginTop: 0 }}>
        Sem avaliações ainda
      </span>
    );
  }
  return (
    <span
      className="px-data"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
      aria-label={`Nota ${value.toFixed(1).replace('.', ',')} de 5${count ? `, ${count} avaliações` : ''}`}
    >
      <Icon name="star-fill" size={13} style={{ color: 'var(--x-urgent)' }} aria-hidden="true" />
      <span aria-hidden="true">{value.toFixed(1).replace('.', ',')}</span>
      {count ? (
        <span aria-hidden="true" style={{ color: 'var(--x-ink-dim)' }}>
          ({count})
        </span>
      ) : null}
    </span>
  );
};

// =====================================================================
// TRAJETO
// =====================================================================

export const RouteLine = ({
  origin,
  dest,
  originLabel = 'Retirada',
  destLabel = 'Entrega',
  onEditOrigin,
  onEditDest,
}: {
  origin?: string | null;
  dest?: string | null;
  originLabel?: string;
  destLabel?: string;
  onEditOrigin?: () => void;
  onEditDest?: () => void;
}) => (
  <div className="px-route">
    <div className="px-route-marks" aria-hidden="true">
      <span className="px-route-dot" />
      <span className="px-route-wire" />
      <span className="px-route-dot px-route-dot--end" />
    </div>
    <div className="px-route-legs">
      <Leg label={originLabel} value={origin} onClick={onEditOrigin} />
      <Leg label={destLabel} value={dest} onClick={onEditDest} />
    </div>
  </div>
);

const Leg = ({
  label,
  value,
  onClick,
}: {
  label: string;
  value?: string | null;
  onClick?: (() => void) | undefined;
}) => {
  const body = (
    <>
      <span className="lbl">{label}</span>
      <div className={cx('addr', !value && 'is-empty')}>{value || 'Informar endereço'}</div>
    </>
  );
  if (!onClick) return <div className="px-route-leg">{body}</div>;
  return (
    <button
      className="px-route-leg"
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        textAlign: 'left',
        cursor: 'pointer',
        width: '100%',
      }}
    >
      {body}
    </button>
  );
};

// =====================================================================
// TIMELINE
// =====================================================================

export type TimelineStep = {
  id: string;
  title: string;
  at?: string | null;
  state: 'done' | 'now' | 'todo';
};

export const Timeline = ({ steps }: { steps: TimelineStep[] }) => (
  <ol className="px-tl" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
    {steps.map((s) => (
      <li
        key={s.id}
        className={cx('px-tl-step', s.state === 'done' && 'is-done', s.state === 'now' && 'is-now')}
        aria-current={s.state === 'now' ? 'step' : undefined}
      >
        <span className="px-tl-marks" aria-hidden="true">
          <span className="px-tl-dot" />
          <span className="px-tl-wire" />
        </span>
        <span className="px-tl-body">
          <span className="px-tl-t">{s.title}</span>
          {/* O estado também vai em texto: cor sozinha não comunica. */}
          {s.state === 'now' && <span className="px-tl-s">Agora</span>}
          {s.at && s.state !== 'now' && <span className="px-tl-s">{s.at}</span>}
        </span>
      </li>
    ))}
  </ol>
);

// =====================================================================
// FOLHA INFERIOR
// =====================================================================

export const Sheet = ({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) => {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Move o foco para dentro da folha — sem isso o leitor de tela continua
    // narrando a tela de trás como se nada tivesse aberto.
    panel.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="px-sheet-scrim"
      onClick={onClose}
      role="presentation"
      // A folha vive dentro da moldura do app, não do documento.
      style={{ position: 'fixed', inset: 0 }}
    >
      <div
        className="px-sheet"
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="px-sheet-grip" aria-hidden="true" />
        {title && (
          <div className="px-row px-row--between">
            <SectionTitle>{title}</SectionTitle>
            <IconButton icon="close" label="Fechar" ghost onClick={onClose} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

// =====================================================================
// VAZIO / CARGA / ERRO
// =====================================================================

export const Empty = ({
  icon = 'package',
  title,
  sub,
  action,
}: {
  icon?: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}) => (
  <div className="px-empty">
    <span className="px-empty-art" aria-hidden="true">
      <Icon name={icon} size={24} />
    </span>
    <span className="px-empty-t">{title}</span>
    {sub && <span className="px-empty-s">{sub}</span>}
    {action}
  </div>
);

export const Skeleton = ({ height = 72, count = 3 }: { height?: number; count?: number }) => (
  <div className="px-stack" aria-busy="true" aria-live="polite">
    <span className="px-sr">Carregando…</span>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="px-skel" style={{ height }} />
    ))}
  </div>
);

/**
 * Erro com o que fazer a seguir. A auditoria pediu que erro explique a causa
 * e ofereça saída — "algo deu errado" sem botão é beco sem saída.
 */
export const ErrorNote = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <Card tone="urgent">
    <div className="px-row px-row--top">
      <Icon name="alert" size={20} style={{ color: 'var(--x-urgent)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, lineHeight: 1.45 }}>{message}</div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} style={{ marginTop: 10 }}>
            Tentar de novo
          </Button>
        )}
      </div>
    </div>
  </Card>
);
