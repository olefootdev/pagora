// =====================================================================
// PAGORA — Minha Rede
// =====================================================================
// Substitui a linha "Indicar o Pagora", que era um botão de compartilhar
// disfarçado de seção. Aqui a indicação vira o que ela é comercialmente:
// dois números e um link.
//
// A REGRA COMERCIAL já está decidida (19/08/2026) e é por dentro dos 15%:
// a Pagora repassa 3% a quem cadastrou o transportador e 0,5% a quem
// cadastrou o cliente. O cliente não paga nada a mais, o transportador não
// recebe nada a menos.
//
// HONESTIDADE QUE ESTA TELA CARREGA:
// o link já sai com `?ref=`, mas ninguém grava a atribuição — não existe
// coluna `referred_by` no banco. Então a tela mostra o link, os percentuais
// e um estado vazio que DIZ que a contagem ainda não está ligada. Exibir
// "0 indicados" como se fosse medição seria mentir para quem indicou; e
// inventar número seria pior.
//
// Quando o módulo de divulgador entrar (v1.1), a lista de indicados ocupa o
// lugar do estado vazio e o resto da tela não muda.
// =====================================================================

import { Body, Button, Card, Empty, IconButton, Num, Screen, SectionTitle } from '../ui/kit';
import { buildShareUrl, shareOrCopy } from '../lib/share';
import { useShare } from '../hooks/useShare';
import { useSession } from '../hooks/useSession';
import type { GoFn } from '../types';

/** Os percentuais fechados em 19/08/2026. Saem de dentro dos 15% da Pagora. */
const REPASSE_TRANSPORTADOR = 3;
const REPASSE_CLIENTE = 0.5;

export const MinhaRede = ({ go }: { go: GoFn }) => {
  const { user } = useSession();
  const { feedback, run } = useShare();

  const link = buildShareUrl('inicio', user ? { ref: user.id.slice(0, 8) } : {});

  function compartilhar() {
    void run(() =>
      shareOrCopy({
        title: 'Pagora — transporte sob demanda',
        text: 'Frete, guincho e caçamba com propostas de transportadores verificados.',
        url: link,
      }),
    );
  }

  return (
    <Screen label="Minha Rede">
      <header className="px-head px-head--sticky">
        <IconButton icon="arrow-left" label="Voltar" onClick={() => go('conta')} />
        <div className="px-head-title">Minha Rede</div>
      </header>

      <Body>
        {/* Os dois números que a pessoa quer ver. Enquanto a atribuição não
            existe, o traço é honesto — e é diferente de um zero medido. */}
        <div className="px-rede-nums">
          <Card>
            <div className="px-eyebrow">Indicados</div>
            <div style={{ marginTop: 6 }}>
              <Num value="—" size="md" unit="ainda não contabilizado" />
            </div>
          </Card>
          <Card>
            <div className="px-eyebrow">Você recebeu</div>
            <div style={{ marginTop: 6 }}>
              <Num value="—" size="md" unit="ainda não contabilizado" />
            </div>
          </Card>
        </div>

        <Card tone="action">
          <SectionTitle>Seu link</SectionTitle>
          <div className="px-rede-link px-data">{link}</div>
          <Button variant="primary" size="lg" block iconStart="share" onClick={compartilhar}>
            Compartilhar meu link
          </Button>
          {feedback && (
            <div className="px-chip px-chip--on" style={{ marginTop: 10 }} role="status">
              {feedback}
            </div>
          )}
        </Card>

        {/* Quanto rende — dois números, sem parágrafo explicando comissão. */}
        <section aria-labelledby="rede-quanto">
          <SectionTitle id="rede-quanto">Quanto rende</SectionTitle>
          <div className="px-rede-nums" style={{ marginTop: 12 }}>
            <Card tone="flat">
              <div className="px-rede-pct">{REPASSE_TRANSPORTADOR}%</div>
              <div className="px-opt-s">de cada serviço de quem você trouxe como transportador</div>
            </Card>
            <Card tone="flat">
              <div className="px-rede-pct">{String(REPASSE_CLIENTE).replace('.', ',')}%</div>
              <div className="px-opt-s">de cada serviço de quem você trouxe como cliente</div>
            </Card>
          </div>
          <p className="px-opt-s" style={{ marginTop: 12 }}>
            Sai de dentro da comissão da Pagora. Quem você indicou não paga nada a mais.
          </p>
        </section>

        <Empty
          icon="users"
          title="Seus indicados aparecem aqui"
          sub="A contagem por indicação ainda está sendo ligada. Seu link já funciona — compartilhe agora e quem entrar por ele conta quando o registro entrar no ar."
        />
      </Body>
    </Screen>
  );
};
