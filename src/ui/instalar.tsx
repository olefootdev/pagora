// =====================================================================
// PAGORA — Instalar o app e atualizar
// =====================================================================
// Duas peças pequenas que só aparecem quando têm o que dizer:
//
//   - `LinhaInstalar` mora na Conta. Some sozinha se o app já está
//     instalado, e no iPhone vira instrução em vez de botão — lá o navegador
//     não oferece convite nenhum, a instalação é pelo menu Compartilhar.
//   - `AvisoAtualizacao` aparece quando o service worker baixou uma versão
//     nova. Sem ele a pessoa fica na versão antiga até fechar todas as abas,
//     o que num app instalado pode levar semanas.
// =====================================================================

import { useEffect, useState } from 'react';
import { Button, Card, SectionTitle } from './kit';
import { Icon } from '../icons';
import { aplicarAtualizacao, ehIOS, instalar, podeInstalar, rodandoInstalado } from '../lib/pwa';
import { track } from '../lib/analytics';

export const LinhaInstalar = () => {
  const [disponivel, setDisponivel] = useState(podeInstalar);
  const [instalado] = useState(rodandoInstalado);
  const [ios] = useState(ehIOS);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const aoAparecer = () => setDisponivel(true);
    window.addEventListener('pagora:instalacao-disponivel', aoAparecer);
    return () => window.removeEventListener('pagora:instalacao-disponivel', aoAparecer);
  }, []);

  // Já está instalado: nada a oferecer.
  if (instalado || pronto) return null;
  // Nem convite do navegador, nem iPhone: este navegador não instala.
  if (!disponivel && !ios) return null;

  return (
    <Card tone="action">
      <div className="px-row px-row--top">
        <Icon name="phone" size={20} style={{ color: 'var(--x-action)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <SectionTitle>Instalar o Pagora</SectionTitle>
          <p className="px-opt-s" style={{ marginTop: 6 }}>
            {ios
              ? 'Toque em Compartilhar e escolha “Adicionar à Tela de Início”. O app abre direto, sem barra do navegador, e continua abrindo sem sinal.'
              : 'Fica na tela inicial do celular e abre mesmo sem sinal — útil quando o pátio não tem rede.'}
          </p>
          {!ios && (
            <Button
              variant="primary"
              block
              style={{ marginTop: 14 }}
              onClick={() => {
                void instalar().then((aceitou) => {
                  track(aceitou ? 'app_instalado' : 'app_instalacao_recusada', {});
                  if (aceitou) setPronto(true);
                });
              }}
            >
              Instalar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export const AvisoAtualizacao = () => {
  const [tem, setTem] = useState(false);

  useEffect(() => {
    const aoAtualizar = () => setTem(true);
    window.addEventListener('pagora:atualizacao-disponivel', aoAtualizar);
    return () => window.removeEventListener('pagora:atualizacao-disponivel', aoAtualizar);
  }, []);

  if (!tem) return null;

  return (
    <div className="px-atualiza" role="status">
      <span className="px-atualiza-t">Tem uma versão nova do Pagora</span>
      <button className="px-atualiza-btn" onClick={() => aplicarAtualizacao()}>
        Atualizar
      </button>
    </div>
  );
};
