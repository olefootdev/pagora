import { useCallback, useEffect, useRef, useState } from 'react';
import { shareFeedback, type ShareResult } from '../lib/share';

/**
 * Estado de feedback para os botões de compartilhar.
 *
 * Existe para os dois pontos de uso (indicação e localização ao vivo) não
 * duplicarem o mesmo timeout — e para o timer ser limpo no unmount, senão um
 * setState dispara em componente desmontado quando a pessoa fecha o modal
 * logo depois de copiar.
 */
export function useShare(duracaoMs = 2200) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const run = useCallback(
    async (acao: () => Promise<ShareResult | 'copied' | 'failed'>) => {
      const resultado = await acao();
      const msg = shareFeedback(resultado as ShareResult);
      if (!msg) return resultado;
      if (timer.current) clearTimeout(timer.current);
      setFeedback(msg);
      timer.current = setTimeout(() => setFeedback(null), duracaoMs);
      return resultado;
    },
    [duracaoMs],
  );

  return { feedback, run };
}
