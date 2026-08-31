// =====================================================================
// PAGORA — Início (cliente)
// =====================================================================
// A tela de referência do design system aprovado em 25/08/2026 (canvas
// "Home Interna Pagora", na versão salva pelo dono do produto — sem a
// marca-d'água de caminhão que uma versão anterior tinha).
//
// A estrutura, de cima para baixo:
//   1. <Hero> — a laje com o gradiente profundo, três estados de miolo.
//   2. <AnchorCard> — a ação principal mordendo a borda: descrever (texto ou
//      voz) + a faixa de propostas esperando decisão.
//   3. Frota — os seis serviços como VEÍCULOS com preço de partida real.
//   4. A outra ponta do marketplace ("Tem um veículo?").
//
// Três estados de hero, e a distinção é de produto:
//   visitante            → proposta de valor + selos verificáveis
//   cliente ocioso       → a pergunta do dia
//   transporte a caminho → status: o número é o título
// =====================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Body, Button, Chip, Screen, SectionTitle, Skeleton, cx } from '../ui/kit';
import { Hero, HeroSeal } from '../ui/hero';
import { SERVICO_FOTO } from '../ui/servico-foto';
import { AnchorCard, type AnchorStrip } from '../ui/anchor-card';
import { ClientNav } from '../ui/area';
import { Icon } from '../icons';
import { readIntent, type Need, type NeedKind } from '../domains/intent/intent';
import { startingPriceCents } from '../domains/pricing/starting-price';
import { orderCode } from '../domains/orders/order-code';
import { listMyRequests } from '../domains/orders/request.service';
import { findRepeatable, repeatLabel } from '../domains/orders/repeat';
import { listMyOrders } from '../domains/orders/order.service';
import {
  COARSE_TRACK,
  coarseTrackIndex,
  isTerminal,
  ORDER_STATUS_LABELS,
} from '../domains/orders/order.status';
import { useNotices } from './avisos';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';
import { initialsOf } from '../domains/providers/provider.service';
import { formatCents, formatCentsCompact } from '../domains/money';
import { track } from '../lib/analytics';
import { withTimeout } from '../lib/timeout';
import type { GoFn } from '../types';
import type { Tables } from '../lib/database.types';

/** Os seis serviços, na ordem do canvas. A arte vem da frota sólida. */
const SHORTCUTS: ReadonlyArray<{ need: NeedKind; label: string }> = [
  { need: 'entulho', label: 'Caçamba' },
  { need: 'mudanca', label: 'Mudança' },
  { need: 'carga', label: 'Frete' },
  { need: 'material', label: 'Material' },
  { need: 'veiculo', label: 'Guincho' },
  { need: 'maquina', label: 'Máquina' },
];

function greeting(hour: number): string {
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export const Inicio = ({ go }: { go: GoFn }) => {
  const { user, loading: sessionLoading } = useSession();
  const { profile } = useProfile();
  const { notices, unseen } = useNotices(user?.id);
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const order = useLiveOrder(user?.id);

  const reading = useMemo(() => readIntent(text), [text]);
  const suggestions: Need[] = text.trim().length >= 3 ? reading.needs.slice(0, 3) : [];

  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  function start(need: NeedKind, from: string) {
    track('pedido_iniciado', { need, origem: from, texto: text.slice(0, 120) });
    go(`pedido/${need}`, { intentText: text.trim() || undefined, hints: reading.hints });
  }

  // A faixa do card ancorado: a proposta mais recente esperando decisão.
  // Vem do mesmo feed que alimenta a aba Avisos — promovida, não duplicada.
  const proposta = (notices ?? []).find((n) => n.kind === 'proposta');
  const strip: AnchorStrip | null = proposta
    ? {
        count: proposta.count ?? 1,
        text: (
          <>
            <strong style={{ fontWeight: 600 }}>
              {proposta.count === 1 ? '1 proposta nova' : `${proposta.count} propostas novas`}
            </strong>
            {proposta.serviceLabel
              ? ` no seu pedido de ${proposta.serviceLabel.toLowerCase()}`
              : ''}
          </>
        ),
        actionLabel: 'Comparar',
        onGo: () => go(proposta.route),
      }
    : null;

  return (
    <Screen label="Início">
      <Body flush>
        <Hero
          greeting={
            sessionLoading || !firstName ? 'Bem-vindo ao' : `${greeting(new Date().getHours())},`
          }
          name={firstName ?? 'Pagora'}
          avatarUrl={profile?.avatar_url}
          initials={firstName ? initialsOf(profile?.full_name) : ''}
          badge={unseen}
          onBell={() => go('avisos')}
        >
          {order ? (
            <HeroEmAndamento go={go} order={order} />
          ) : user ? (
            <HeroCliente />
          ) : (
            <HeroVisitante />
          )}
        </Hero>

        <AnchorCard
          ref={input}
          value={text}
          onChange={setText}
          placeholder="Descreva o que precisa levar…"
          ariaLabel="Descreva o que você precisa transportar"
          onKeyDown={(e) => {
            const top = suggestions[0];
            if (e.key === 'Enter' && top) start(top.kind, 'texto-enter');
          }}
          strip={text ? null : strip}
        />

        <div className="px-pad" style={{ paddingTop: 22 }}>
          {suggestions.length > 0 ? (
            <section className="px-stack px-stack--tight px-in" aria-label="Sugestões">
              {suggestions.map((s) => (
                <button
                  key={s.kind}
                  className={cx('px-opt', s.confidence >= 0.5 && 'is-on')}
                  onClick={() => start(s.kind, 'sugestao')}
                >
                  <span className="px-opt-art" aria-hidden="true">
                    <Icon name="spark" size={20} />
                  </span>
                  <span className="px-opt-text">
                    <span className="px-opt-t">{s.label}</span>
                    <span className="px-opt-s">
                      {s.matched.length > 0 ? `Você escreveu “${s.matched[0]}”` : 'Sugestão'}
                    </span>
                  </span>
                  <span className="px-opt-end">
                    <Icon name="arrow-right" size={18} />
                  </span>
                </button>
              ))}
            </section>
          ) : (
            <section aria-labelledby="servicos">
              <div className="px-row px-row--between" style={{ alignItems: 'baseline' }}>
                <SectionTitle id="servicos">Serviços</SectionTitle>
                <span style={{ fontSize: 11.5, color: 'var(--x-ink-dim)' }}>preços de partida</span>
              </div>
              <div className="px-fleet" style={{ marginTop: 14 }}>
                {SHORTCUTS.map((s, i) => {
                  const price = startingPriceCents(s.need);
                  const foto = SERVICO_FOTO[s.need];
                  return (
                    <button
                      key={s.need}
                      className="px-fleet-card"
                      onClick={() => start(s.need, 'atalho')}
                    >
                      {foto && (
                        <img
                          className="px-fleet-foto"
                          src={foto}
                          alt=""
                          width={670}
                          height={335}
                          /* As duas primeiras estão logo abaixo do hero e
                             entram na primeira tela; adiar o carregamento
                             delas só produziria buraco verde. */
                          loading={i < 2 ? 'eager' : 'lazy'}
                          decoding="async"
                        />
                      )}
                      <span className="px-fleet-veu">
                        <span className="px-fleet-name">{s.label}</span>
                        <span className={cx('px-fleet-price', price == null && 'is-quote')}>
                          {price != null
                            ? `a partir de ${formatCentsCompact(price)}`
                            : 'sob consulta'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {user && <Recentes go={go} userId={user.id} />}

          {/* A outra ponta do marketplace. Estava enterrada em Conta. */}
          <button className="px-band" onClick={() => go('parceiro')}>
            <span className="px-band-art" aria-hidden="true">
              <Icon name="truck" size={22} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="px-band-t">Tem um veículo?</span>
              <span className="px-band-s">Cadastro em 5 min · pedidos da sua região</span>
            </span>
            <Icon name="arrow-right" size={19} style={{ opacity: 0.7, flexShrink: 0 }} />
          </button>
        </div>
      </Body>

      <ClientNav active="inicio" go={go} />
    </Screen>
  );
};

// =====================================================================
// MIOLOS DO HERO
// =====================================================================

const Selos = () => (
  <div className="px-hero-seals">
    <HeroSeal icon="shield">CNH e documento conferidos</HeroSeal>
    <HeroSeal>Resposta em 2h</HeroSeal>
    <HeroSeal>Sem taxa</HeroSeal>
  </div>
);

/** Visitante — este sim precisa saber o que o Pagora é. */
const HeroVisitante = () => (
  <>
    <h1 className="px-hero-title">O transporte que você precisa, agora.</h1>
    <p className="px-hero-sub">
      Transportadores verificados respondem com preço fechado. Você compara e escolhe.
    </p>
    <Selos />
  </>
);

/** Cliente logado, sem transporte em andamento — não é hora de vender. */
const HeroCliente = () => (
  <>
    <h1 className="px-hero-title">O que você precisa levar?</h1>
    <p className="px-hero-sub">
      Escolha um serviço abaixo ou descreva. Você recebe propostas com preço fechado.
    </p>
    <Selos />
  </>
);

/** Com transporte em andamento — a laje vira status, o número é o título. */
const HeroEmAndamento = ({ go, order }: { go: GoFn; order: Tables<'orders'> }) => {
  const atual = coarseTrackIndex(order.status);

  return (
    <>
      <div className="px-hero-head">
        <h1 className="px-hero-title">{ORDER_STATUS_LABELS[order.status]}</h1>
        <span className="px-hero-pill">
          <span className="px-live" aria-hidden="true" />
          Em andamento
        </span>
      </div>

      <p className="px-hero-sub">
        {order.status === 'completed'
          ? 'Confirme a entrega para liberar o pagamento.'
          : 'Acompanhe o transporte em tempo real.'}
      </p>

      <button
        className="px-hero-slab"
        onClick={() => go(`acompanhar/${order.id}`)}
        style={{
          appearance: 'none',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          width: '100%',
        }}
        aria-label={`Acompanhar pedido ${orderCode(order.id)}`}
      >
        <span className="px-hero-tag">
          <Icon name="package" size={22} style={{ color: 'var(--x-action)', flexShrink: 0 }} />
          <span style={{ minWidth: 0, textAlign: 'left' }}>
            <span className="px-hero-tag-code">{orderCode(order.id)}</span>
            <span className="px-hero-tag-lbl">Toque para acompanhar</span>
          </span>
        </span>
      </button>

      {/* A régua repete o estado numa terceira forma: posição. Palavra no
          título, forma na pílula, posição aqui — e nenhuma depende de cor. */}
      <div className="px-track" role="list" aria-label="Progresso do transporte">
        {COARSE_TRACK.map((s, i) => (
          <div
            key={s.lbl}
            role="listitem"
            className={cx('px-track-step', atual > i && 'is-done', atual === i && 'is-now')}
          >
            <span className="px-track-dot" aria-hidden="true" />
            <span className="px-track-lbl">{s.lbl}</span>
            <span className="px-sr">
              {atual > i ? 'concluído' : atual === i ? 'etapa atual' : 'pendente'}
            </span>
          </div>
        ))}
      </div>
    </>
  );
};

/**
 * O pedido vivo do cliente, se houver.
 *
 * O resultado guarda de QUEM ele é, e a leitura confere — sem isso, na troca
 * de conta o pedido do usuário anterior aparecia por um quadro.
 */
function useLiveOrder(userId: string | undefined) {
  const [result, setResult] = useState<{ userId: string; order: Tables<'orders'> | null } | null>(
    null,
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await withTimeout(listMyOrders('client', userId));
        if (!cancelled)
          setResult({ userId, order: rows.find((o) => !isTerminal(o.status)) ?? null });
      } catch {
        // A home não morre por causa de um card. Sem o pedido em andamento ela
        // cai no estado ocioso, que é onde a pessoa cria um novo.
        if (!cancelled) setResult({ userId, order: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return result && result.userId === userId ? result.order : null;
}

// =====================================================================
// PEDIDOS RECENTES
// =====================================================================

const SERVICE_LABEL: Record<string, string> = {
  frete: 'Frete',
  guincho: 'Guincho',
  cacamba: 'Caçamba',
};

const Recentes = ({ go, userId }: { go: GoFn; userId: string }) => {
  const [rows, setRows] = useState<Tables<'service_requests'>[] | null>(null);
  const [repetir, setRepetir] = useState<ReturnType<typeof findRepeatable>>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const all = await withTimeout(listMyRequests(userId));
        if (cancelled) return;
        setRows(all.filter((r) => r.status === 'open' || r.status === 'quoting'));
        setRepetir(findRepeatable(all));
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (rows === null) return <Skeleton count={1} height={92} />;
  if (rows.length === 0 && !repetir) return null;

  return (
    <section aria-labelledby="recentes">
      {/* Recompra em um toque: o payload do pedido anterior já está gravado,
          e redigitar tudo é a fricção que mais custa cliente que volta. */}
      {repetir && (
        <button
          className="px-repeat"
          onClick={() => {
            track('pedido_repetido', { need: repetir.need, from: repetir.from.id });
            go(`pedido/${repetir.need}`, { repeatFrom: repetir.state });
          }}
        >
          <span className="px-repeat-art" aria-hidden="true">
            <Icon name="refresh" size={20} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="px-repeat-t">Pedir de novo</span>
            <span className="px-repeat-s">{repeatLabel(repetir.from)}</span>
          </span>
          <Icon name="arrow-right" size={18} style={{ color: 'var(--x-action)', flexShrink: 0 }} />
        </button>
      )}

      {rows.length > 0 && (
        <div
          className="px-row px-row--between"
          style={{ marginBottom: 12, marginTop: repetir ? 20 : 0 }}
        >
          <SectionTitle id="recentes">Aguardando propostas</SectionTitle>
          <Button variant="quiet" size="sm" onClick={() => go('pedidos')}>
            Ver todos
          </Button>
        </div>
      )}

      <div className="px-stack px-stack--tight">
        {rows.slice(0, 2).map((r) => (
          <button key={r.id} className="px-recent" onClick={() => go(`escolher/${r.id}`)}>
            <span className="px-recent-top">
              <span className="px-recent-art" aria-hidden="true">
                <Icon name="clock" size={21} style={{ color: 'var(--x-action)' }} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="px-recent-t">{SERVICE_LABEL[r.service] ?? r.service}</span>
                <span className="px-recent-s">Publicado — aguardando propostas</span>
              </span>
              <Chip tone="on">Aberto</Chip>
            </span>

            <span className="px-recent-foot">
              <span>
                <span className="k">Estimativa</span>
                <span className="v">
                  {r.estimate_low_cents != null ? formatCents(r.estimate_low_cents) : '—'}
                </span>
              </span>
              <span style={{ textAlign: 'right' }}>
                <span className="k">Região</span>
                <span className="v">{r.origin_city ?? '—'}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
