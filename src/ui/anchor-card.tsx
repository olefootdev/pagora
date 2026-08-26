// =====================================================================
// PAGORA — Card ancorado: a ação principal do app
// =====================================================================
// Dois andares, mordendo a borda do hero:
//
//   1. Descrever a necessidade — texto, ou voz quando o navegador tem
//      SpeechRecognition (sem suporte o microfone nem renderiza).
//   2. A faixa de propostas esperando decisão — a informação mais valiosa
//      que a home pode dar, promovida do fundo da aba Avisos para o lugar
//      mais nobre da tela.
//
// O card fica no MESMO lugar em todos os estados do hero: a laje muda de
// conteúdo, a ação principal não muda de endereço.
// =====================================================================

import { forwardRef, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '../icons';
import { cx } from './kit';
import { useVoice } from '../hooks/useVoice';

/**
 * Botão de ditar. Só existe quando o navegador tem SpeechRecognition — sem
 * suporte não renderiza nada, e o campo continua sendo campo.
 *
 * `onText` recebe o texto RECONHECIDO, não o acumulado: cada tela decide se
 * substitui o que está escrito (busca) ou concatena (observações, chat).
 */
export const VoiceButton = ({
  onText,
  label = 'Ditar em vez de digitar',
  className,
}: {
  onText: (text: string) => void;
  label?: string;
  className?: string;
}) => {
  const voice = useVoice(onText);
  if (!voice.supported) return null;
  return (
    <button
      type="button"
      className={cx('px-anchor-mic', voice.listening && 'is-listening', className)}
      onClick={voice.toggle}
      aria-label={voice.listening ? 'Parar de ouvir' : label}
      aria-pressed={voice.listening}
    >
      <Icon name="mic" size={18} />
    </button>
  );
};

export type AnchorStrip = {
  /** O número no selo — quantas propostas esperam. */
  count: number;
  /** O texto da faixa. */
  text: ReactNode;
  actionLabel: string;
  onGo: () => void;
};

export type AnchorCardProps = {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  ariaLabel: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  /** `null` esconde a faixa — o card fica só com o campo. */
  strip?: AnchorStrip | null;
};

export const AnchorCard = forwardRef<HTMLInputElement, AnchorCardProps>(function AnchorCard(
  { value, onChange, placeholder, ariaLabel, onKeyDown, strip },
  ref,
) {
  return (
    <div className="px-anchor">
      <div className="px-anchor-row">
        <Icon name="search" size={19} style={{ color: 'var(--x-ink-dim)', flexShrink: 0 }} />
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoComplete="off"
          enterKeyHint="search"
          onKeyDown={onKeyDown}
        />
        <VoiceButton onText={onChange} label="Falar o que precisa levar" />
      </div>

      {strip && (
        <button className="px-anchor-strip" onClick={strip.onGo}>
          <span className="n" aria-hidden="true">
            {strip.count > 9 ? '9+' : strip.count}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>{strip.text}</span>
          <span className="go">
            {strip.actionLabel}
            <Icon name="arrow-right" size={15} aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
});
