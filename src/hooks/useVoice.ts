// =====================================================================
// PAGORA — Entrada por voz
// =====================================================================
// O usuário do Pagora está de luva, no sol, entre uma carga e outra. Falar
// "preciso tirar três caçambas de entulho de uma obra" é mais viável que
// digitar — e o leitor de intenção (`domains/intent`) já entende texto livre,
// então a voz é só outra porta para o mesmo caminho.
//
// Web Speech API, sem biblioteca. A regra de degradação é a do resto do app:
// SEM SUPORTE, NADA QUEBRA — `supported: false` e o botão de microfone nem
// renderiza. O campo continua sendo campo.
// =====================================================================

import { useCallback, useEffect, useRef, useState } from 'react';

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type UseVoice = {
  /** `false` = navegador sem SpeechRecognition. O botão não deve existir. */
  supported: boolean;
  listening: boolean;
  /** Liga/desliga a escuta. O resultado chega pelo `onText`. */
  toggle: () => void;
};

export function useVoice(onText: (text: string) => void): UseVoice {
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  // Ref para o callback: o reconhecimento vive entre renders e chamaria uma
  // versão velha do handler — o clássico closure obsoleto. A atualização mora
  // num efeito porque escrever ref durante o render é proibido pela regra do
  // compilador do React (e com razão: render precisa ser puro).
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });

  const supported = recognitionCtor() !== null;

  useEffect(() => {
    return () => {
      rec.current?.abort();
    };
  }, []);

  const toggle = useCallback(() => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) return;

    const r = new Ctor();
    r.lang = 'pt-BR';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript;
      if (transcript) onTextRef.current(transcript);
    };
    // `onend` cobre os três fins possíveis — resultado, silêncio e erro — e
    // é o único lugar que desarma o estado. Sem ele, um erro de microfone
    // deixaria o botão pulsando para sempre.
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);

    rec.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      // start() em cima de uma sessão ainda fechando levanta InvalidState.
      setListening(false);
    }
  }, [listening]);

  return { supported, listening, toggle };
}
