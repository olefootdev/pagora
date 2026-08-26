// =====================================================================
// PAGORA — Área do transportador
// =====================================================================
// O prestador entrou depois no produto e ficou com o layout do cliente. Não
// existia uma casa dele: `oportunidades` (real), `provider-dash` (maquete) e
// `prov-financeiro` (real) viviam soltas, sem barra própria, sem estado
// online/offline e sem lugar onde a viagem em andamento aparecesse.
//
// São quatro telas com a mesma linguagem visual do cliente e o vocabulário
// dele: oportunidade, viagem, ganhos. A regra que rege todas: o líquido
// depois da comissão aparece ANTES de ele enviar a proposta. Descobrir a
// comissão só no extrato é como se perde prestador.
// =====================================================================

import { useCallback, useEffect, useId, useState } from 'react';
import {
  Body,
  Button,
  Card,
  Chip,
  Empty,
  ErrorNote,
  Field,
  KV,
  Num,
  Screen,
  ScreenHead,
  SectionTitle,
  Sheet,
  Skeleton,
  Stack,
  TextArea,
  Timeline,
} from '../ui/kit';
import { AreaNav, PROVIDER_TABS } from '../ui/area';
import { Icon } from '../icons';
import { VEHICLE_ART } from '../ui/art';
import { formatCents, formatCentsCompact, PLATFORM_FEE_PERCENT, splitFees } from '../domains/money';
import { listMyQuotes, listOpenRequests, sendQuote } from '../domains/orders/request.service';
import {
  buildProviderFeed,
  countUnseen,
  readLastSeen,
  writeLastSeen,
  type Notice,
} from '../domains/notifications/feed';
import { NoticeRow } from './avisos';
import { advanceOrder, listMyOrders, providerNetCents } from '../domains/orders/order.service';
import { orderCode } from '../domains/orders/order-code';
import { isTerminal, ORDER_STATUS_LABELS } from '../domains/orders/order.status';
import { parseAmountToCents } from '../screens/provider-financeiro';
import { journeySteps } from './acompanhar';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';
import { track } from '../lib/analytics';
import { loadErrorMessage, withTimeout } from '../lib/timeout';
import type { ServiceType, Tables } from '../lib/database.types';
import type { GoFn, PagoraState } from '../types';

const SERVICE: Record<ServiceType, { label: string; art: keyof typeof VEHICLE_ART }> = {
  frete: { label: 'Frete', art: 'bau' },
  guincho: { label: 'Guincho', art: 'guincho' },
  cacamba: { label: 'Caçamba', art: 'cacamba' },
};

/**
 * A silhueta do card de oportunidade é a do veículo que o CLIENTE pediu —
 * um frete de van mostra van, não o baú genérico. O prestador decide se
 * aceita olhando o desenho, antes de ler qualquer campo.
 *
 * Devolve a CHAVE, não o componente: o lint de componentes-durante-render
 * aceita o lookup direto no Record, não o retorno de função.
 */
function requestArtKey(service: ServiceType, p: PagoraState): keyof typeof VEHICLE_ART {
  if (service === 'frete' && p.vehicle && p.vehicle in VEHICLE_ART) {
    return p.vehicle;
  }
  return SERVICE[service].art;
}

// =====================================================================
// GUARDA DE ÁREA
// =====================================================================
// Só prestador aprovado envia proposta — a policy da 0002 exige. Dizer isso
// aqui, com o motivo e o próximo passo, é melhor que deixar o botão falhar
// com "violates row-level security".
// =====================================================================

const AreaGuard = ({
  go,
  active,
  children,
}: {
  go: GoFn;
  active: string;
  children: (userId: string) => React.ReactNode;
}) => {
  const { user, loading } = useSession();
  const { profile } = useProfile();
  const inscricao = useInscricao(profile?.role === 'client' ? profile.phone : null);

  if (loading) {
    return (
      <Screen label="Transportador">
        <ScreenHead title="Transportador" />
        <Body>
          <Skeleton count={2} height={96} />
        </Body>
        <AreaNav tabs={PROVIDER_TABS} active={active} go={go} />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen label="Transportador">
        <ScreenHead title="Transportador" />
        <Body>
          <Empty
            icon="truck"
            title="Entre para receber pedidos"
            sub="Cadastro de transportador precisa de telefone verificado."
            action={
              <Button variant="primary" onClick={() => go('login')}>
                Entrar
              </Button>
            }
          />
        </Body>
        <AreaNav tabs={PROVIDER_TABS} active={active} go={go} />
      </Screen>
    );
  }

  // Quem JÁ enviou o cadastro e volta ao app via a mesma tela de "faça seu
  // cadastro" — e conclui que o envio se perdeu. Mostrar o estado, com o
  // prazo que a tela de cadastro prometeu, é o que segura essa pessoa.
  if (profile && profile.role === 'client' && inscricao === 'pendente') {
    return (
      <Screen label="Transportador">
        <ScreenHead onBack={() => go('inicio')} title="Transportador" />
        <Body>
          <Card tone="action">
            <div className="px-row px-row--top">
              <Icon name="clock" size={20} style={{ color: 'var(--x-action)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <SectionTitle>Cadastro em análise</SectionTitle>
                <p className="px-opt-s" style={{ marginTop: 6 }}>
                  Recebemos seus dados. A Pagora confere CNH, documento e veículo em até 24 h — é o
                  que permite mostrar “verificado” ao cliente. A confirmação chega no seu WhatsApp.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle>Enquanto isso</SectionTitle>
            <p className="px-opt-s" style={{ marginTop: 6 }}>
              Você já pode usar o Pagora para contratar transporte.
            </p>
            <Button variant="outline" block style={{ marginTop: 14 }} onClick={() => go('inicio')}>
              Ir para o início
            </Button>
          </Card>
        </Body>
        <AreaNav tabs={PROVIDER_TABS} active={active} go={go} />
      </Screen>
    );
  }

  if (profile && profile.role === 'client') {
    return (
      <Screen label="Transportador">
        <ScreenHead onBack={() => go('inicio')} title="Transportador" />
        <Body>
          <Card>
            <SectionTitle>Você ainda não é transportador</SectionTitle>
            <p className="px-opt-s" style={{ marginTop: 6 }}>
              Cadastre veículo, CNH e documento. A Pagora confere antes de liberar — é o que permite
              mostrar “verificado” ao cliente.
            </p>
            <Button
              variant="primary"
              size="lg"
              block
              style={{ marginTop: 14 }}
              onClick={() => go('provider-signup')}
            >
              Fazer cadastro
            </Button>
          </Card>
        </Body>
        <AreaNav tabs={PROVIDER_TABS} active={active} go={go} />
      </Screen>
    );
  }

  return <>{children(user.id)}</>;
};

// =====================================================================
// OPORTUNIDADES
// =====================================================================

export const ParceiroOportunidades = ({ go }: { go: GoFn }) => (
  <AreaGuard go={go} active="oportunidades">
    {(userId) => <OportunidadesInner go={go} userId={userId} />}
  </AreaGuard>
);

const OportunidadesInner = ({ go, userId }: { go: GoFn; userId: string }) => {
  const [requests, setRequests] = useState<Tables<'service_requests'>[] | null>(null);
  const [mine, setMine] = useState<Map<string, Tables<'quotes'>>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [propor, setPropor] = useState<Tables<'service_requests'> | null>(null);

  const load = useCallback(async () => {
    try {
      const [open, quotes] = await withTimeout(
        Promise.all([listOpenRequests(), listMyQuotes(userId)]),
      );
      setRequests(open);
      setMine(quotes);
      setError(null);
    } catch (e) {
      setError(loadErrorMessage(e));
      setRequests([]);
    }
  }, [userId]);

  useEffect(() => {
    // `load` é assíncrona: todo setState dela acontece DEPOIS do await, não
    // no corpo do efeito. A regra não modela a fronteira do await e marca a
    // chamada mesmo assim — mesma exceção já usada em hooks/useProfile.ts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Pedido novo chega sozinho: `service_requests` está na publication desde a
  // 0002. Para o prestador isso é dinheiro — quem vê primeiro propõe primeiro.
  useEffect(() => {
    const channel = supabase
      .channel('open-requests')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'pagora', table: 'service_requests' },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <Screen label="Transportador · Oportunidades">
      <ScreenHead
        title="Oportunidades"
        sticky
        action={
          <button
            className={`px-chip ${online ? 'px-chip--on' : ''}`}
            onClick={() => setOnline((v) => !v)}
            aria-pressed={online}
            style={{ cursor: 'pointer' }}
          >
            {online ? 'Online' : 'Offline'}
          </button>
        }
      />

      <Body>
        {!online && (
          <Card tone="urgent">
            <div className="px-row px-row--top">
              <Icon name="bell-off" size={19} style={{ color: 'var(--x-urgent)', flexShrink: 0 }} />
              <p className="px-opt-s" style={{ marginTop: 0 }}>
                Você está offline. Os pedidos continuam listados, mas avisos novos ficam pausados
                até você voltar.
              </p>
            </div>
          </Card>
        )}

        {error && <ErrorNote message={error} onRetry={() => void load()} />}

        {requests === null ? (
          <Skeleton count={3} height={150} />
        ) : requests.length === 0 ? (
          <Empty
            icon="bolt"
            title="Nenhum pedido aberto agora"
            sub="Assim que um cliente publicar um pedido do tipo que você atende, ele aparece aqui — sem precisar atualizar."
          />
        ) : (
          <>
            <div className="px-row px-row--between">
              <SectionTitle>
                {requests.length === 1 ? '1 pedido aberto' : `${requests.length} pedidos abertos`}
              </SectionTitle>
              <span className="px-row" style={{ gap: 7 }}>
                <span className="px-live" aria-hidden="true" />
                <span className="px-eyebrow">ao vivo</span>
              </span>
            </div>

            <Stack>
              {requests.map((r) => (
                <OportunidadeCard
                  key={r.id}
                  request={r}
                  existing={mine.get(r.id)}
                  onPropose={() => setPropor(r)}
                />
              ))}
            </Stack>
          </>
        )}
      </Body>

      <ProporSheet
        request={propor}
        providerId={userId}
        existing={propor ? mine.get(propor.id) : undefined}
        onClose={() => setPropor(null)}
        onSent={() => {
          setPropor(null);
          void load();
        }}
      />

      <ProviderNav active="oportunidades" go={go} userId={userId} />
    </Screen>
  );
};

const OportunidadeCard = ({
  request,
  existing,
  onPropose,
}: {
  request: Tables<'service_requests'>;
  existing?: Tables<'quotes'> | undefined;
  onPropose: () => void;
}) => {
  const p = (request.payload ?? {}) as PagoraState;
  const meta = SERVICE[request.service];
  const Art = VEHICLE_ART[requestArtKey(request.service, p)];

  return (
    <Card tone={existing ? 'default' : 'action'}>
      <div className="px-row px-row--between" style={{ marginBottom: 12 }}>
        <span className="px-row" style={{ gap: 10 }}>
          {Art && (
            <span style={{ color: 'var(--x-ink-soft)' }}>
              <Art size={46} />
            </span>
          )}
          <span className="px-eyebrow">{meta.label}</span>
        </span>
        {p.urgency === 'now' ? <Chip tone="urgent">Hoje</Chip> : <Chip>Agendado</Chip>}
      </div>

      <div className="px-opt-t">{describeRequest(request, p)}</div>

      <div style={{ marginTop: 12 }}>
        <KV k="Retirada" v={p.origin ?? p.currentLoc ?? p.address ?? request.origin_city ?? '—'} />
        {request.service !== 'cacamba' && <KV k="Entrega" v={p.dest ?? p.destAddr ?? '—'} />}
        {request.estimate_low_cents != null && (
          <KV
            k="Estimativa do cliente"
            v={`${formatCents(request.estimate_low_cents)} a ${formatCents(
              request.estimate_high_cents ?? request.estimate_low_cents,
            )}`}
          />
        )}
      </div>

      {p.notes && (
        <p className="px-opt-s" style={{ marginTop: 12 }}>
          “{p.notes}”
        </p>
      )}

      {existing ? (
        <div style={{ marginTop: 14 }}>
          <Chip tone="on">Proposta enviada · {formatCents(existing.price_cents)}</Chip>
          <Button variant="outline" block size="sm" style={{ marginTop: 10 }} onClick={onPropose}>
            Alterar valor
          </Button>
        </div>
      ) : (
        <Button variant="primary" size="lg" block style={{ marginTop: 16 }} onClick={onPropose}>
          {request.estimate_low_cents != null
            ? `Propor ${formatCentsCompact(request.estimate_low_cents)}`
            : 'Enviar proposta'}
        </Button>
      )}
    </Card>
  );
};

function describeRequest(r: Tables<'service_requests'>, p: PagoraState): string {
  if (r.service === 'cacamba')
    return `Caçamba de ${p.size ?? '—'} m³ · ${p.duration ?? '—'} dia(s)`;
  if (r.service === 'guincho') return `Guincho · ${p.vehicleType ?? 'veículo'}`;
  const helpers = p.helpers ?? 0;
  return `${p.cargo ?? 'Carga'} · ${helpers === 0 ? 'sem ajudante' : `${helpers} ajudante(s)`}`;
}

// =====================================================================
// PROPOSTA — o líquido antes do envio
// =====================================================================

const ProporSheet = ({
  request,
  providerId,
  existing,
  onClose,
  onSent,
}: {
  request: Tables<'service_requests'> | null;
  providerId: string;
  existing?: Tables<'quotes'> | undefined;
  onClose: () => void;
  onSent: () => void;
}) => (
  <Sheet open={request !== null} onClose={onClose} title="Sua proposta">
    {/* A `key` é o que zera o formulário ao trocar de pedido. A alternativa
        seria um efeito copiando prop para estado — o padrão que o React
        desaconselha, e que aqui causaria um render extra a cada abertura. */}
    {request && (
      <ProporForm
        key={request.id}
        request={request}
        providerId={providerId}
        existing={existing}
        onSent={onSent}
      />
    )}
  </Sheet>
);

const ProporForm = ({
  request,
  providerId,
  existing,
  onSent,
}: {
  request: Tables<'service_requests'>;
  providerId: string;
  existing?: Tables<'quotes'> | undefined;
  onSent: () => void;
}) => {
  // O campo nasce PREENCHIDO: proposta existente vence, senão a estimativa
  // do cliente. Digitar valor de pé, com luva, é a maior fricção do lado da
  // oferta — e a estimativa já está no card, então o número não vem do nada.
  const sugerido = existing?.price_cents ?? request.estimate_low_cents ?? null;
  const [amount, setAmount] = useState(
    sugerido ? (sugerido / 100).toFixed(2).replace('.', ',') : '',
  );
  const [eta, setEta] = useState(existing?.eta_minutes ? String(existing.eta_minutes) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cents = parseAmountToCents(amount);
  const split = cents && cents > 0 ? splitFees(cents) : null;

  async function send() {
    if (!cents || cents <= 0) return;
    setBusy(true);
    setError(null);
    try {
      await withTimeout(
        sendQuote({
          requestId: request.id,
          providerId,
          priceCents: cents,
          etaMinutes: eta ? Number(eta) : undefined,
          notes: notes.trim() || undefined,
        }),
      );
      track('proposta_enviada', { request_id: request.id, valor_centavos: cents });
      onSent();
    } catch (e) {
      setError(loadErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Field
        label="Quanto você cobra"
        inputMode="decimal"
        placeholder="0,00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        autoFocus
      />

      {/* O líquido aparece ANTES do envio. Descobrir a comissão só no extrato
          é como se perde prestador — e a reclamação é justa. */}
      {split && (
        <Card tone="action">
          <div className="px-eyebrow">Você recebe</div>
          <div style={{ marginTop: 8 }}>
            <Num value={formatCents(split.providerAmountCents)} size="md" />
          </div>
          <div style={{ marginTop: 12 }}>
            <KV k="Valor cobrado do cliente" v={formatCents(split.grossCents)} />
            <KV
              k={`Comissão Pagora (${PLATFORM_FEE_PERCENT}%)`}
              v={`− ${formatCents(split.platformFeeCents)}`}
            />
          </div>
        </Card>
      )}

      <Field
        label="Em quantos minutos você chega"
        inputMode="numeric"
        placeholder="Ex: 40"
        value={eta}
        onChange={(e) => setEta(e.target.value.replace(/\D/g, ''))}
        hint="Opcional, mas propostas com prazo são escolhidas mais vezes."
      />

      <TextArea
        label="Recado para o cliente"
        placeholder="O que está incluso, o que você leva, alguma condição."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {error && <ErrorNote message={error} />}

      <Button
        variant="primary"
        size="lg"
        block
        busy={busy}
        busyLabel="Enviando…"
        disabled={!cents || cents <= 0}
        onClick={() => void send()}
      >
        {split
          ? `${existing ? 'Atualizar' : 'Enviar'} · você recebe ${formatCentsCompact(split.providerAmountCents)}`
          : existing
            ? 'Atualizar proposta'
            : 'Enviar proposta'}
      </Button>
    </>
  );
};

// =====================================================================
// VIAGEM
// =====================================================================

export const ParceiroViagem = ({ go }: { go: GoFn }) => (
  <AreaGuard go={go} active="viagem">
    {(userId) => <ViagemInner go={go} userId={userId} />}
  </AreaGuard>
);

/** Próximo estado que o prestador pode pedir, e como o botão se chama. */
const NEXT_STEP: Partial<
  Record<string, { to: 'en_route' | 'in_progress' | 'completed'; label: string }>
> = {
  paid: { to: 'en_route', label: 'Estou a caminho' },
  en_route: { to: 'in_progress', label: 'Carga recolhida' },
  in_progress: { to: 'completed', label: 'Entrega concluída' },
};

const ViagemInner = ({ go, userId }: { go: GoFn; userId: string }) => {
  const [orders, setOrders] = useState<Tables<'orders'>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrders(await withTimeout(listMyOrders('provider', userId)));
      setError(null);
    } catch (e) {
      setError(loadErrorMessage(e));
      setOrders([]);
    }
  }, [userId]);

  useEffect(() => {
    // `load` é assíncrona: todo setState dela acontece DEPOIS do await, não
    // no corpo do efeito. A regra não modela a fronteira do await e marca a
    // chamada mesmo assim — mesma exceção já usada em hooks/useProfile.ts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const live = orders?.find((o) => !isTerminal(o.status)) ?? null;

  async function advance(orderId: string, to: 'en_route' | 'in_progress' | 'completed') {
    setBusy(true);
    setError(null);
    try {
      await withTimeout(advanceOrder(orderId, to));
      track('viagem_avancada', { order_id: orderId, para: to });
      await load();
    } catch (e) {
      setError(loadErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen label="Transportador · Viagem">
      <ScreenHead title="Viagem" sticky />
      <Body>
        {error && <ErrorNote message={error} onRetry={() => void load()} />}

        {orders === null ? (
          <Skeleton count={2} height={120} />
        ) : !live ? (
          <Empty
            icon="navigation"
            title="Nenhuma viagem em andamento"
            sub="Quando um cliente aceitar sua proposta, o serviço aparece aqui com o que fazer em cada etapa."
            action={
              <Button variant="outline" onClick={() => go('parceiro')}>
                Ver oportunidades
              </Button>
            }
          />
        ) : (
          <>
            <div>
              <div className="px-eyebrow" style={{ marginBottom: 8 }}>
                Estado atual
              </div>
              <Num
                value={ORDER_STATUS_LABELS[live.status]}
                size="md"
                unit={`Pedido ${orderCode(live.id)}`}
              />
            </div>

            <Card>
              {/* `providerNetCents` deriva o líquido quando a coluna da 0007
                  ainda não existe. Um `?? 0` mostraria "R$ 0,00" para um
                  serviço de R$ 300 — a mesma classe de fallback silencioso
                  que derrubou o preço da van. */}
              <KV k="Você recebe" v={formatCents(providerNetCents(live))} strong />
              <KV k="Valor do serviço" v={formatCents(live.price_cents)} />
              <KV
                k={`Comissão (${PLATFORM_FEE_PERCENT}%)`}
                v={`− ${formatCents(live.platform_fee_cents)}`}
              />
            </Card>

            {NEXT_STEP[live.status] && (
              <Button
                variant="primary"
                size="lg"
                block
                busy={busy}
                busyLabel="Registrando…"
                onClick={() => {
                  const step = NEXT_STEP[live.status];
                  if (step) void advance(live.id, step.to);
                }}
              >
                {NEXT_STEP[live.status]?.label}
              </Button>
            )}

            {live.status === 'pending_payment' && (
              <Card tone="urgent">
                <p className="px-opt-s" style={{ marginTop: 0 }}>
                  O cliente ainda não pagou. Você só é acionado depois que o pagamento entra — não
                  saia antes disso.
                </p>
              </Card>
            )}

            <Button
              variant="outline"
              block
              iconStart="message"
              onClick={() => go('chat', { orderId: live.id })}
            >
              Falar com o cliente
            </Button>

            <section className="px-stack">
              <SectionTitle>Andamento</SectionTitle>
              <Card>
                <Timeline steps={journeySteps(live.status)} />
              </Card>
            </section>
          </>
        )}
      </Body>

      <ProviderNav active="viagem" go={go} userId={userId} />
    </Screen>
  );
};

// =====================================================================
// GANHOS E CONTA
// =====================================================================
// A tela financeira real (`prov-financeiro`) já existe, é testada e está
// ligada ao ledger. Reescrevê-la seria destruir trabalho bom por causa de
// estilo. O que esta faz é dar a ela uma porta dentro da área do prestador.
// =====================================================================

export const ParceiroGanhos = ({ go }: { go: GoFn }) => (
  <AreaGuard go={go} active="ganhos">
    {(userId) => <GanhosInner go={go} userId={userId} />}
  </AreaGuard>
);

const GanhosInner = ({ go, userId }: { go: GoFn; userId: string }) => {
  const [orders, setOrders] = useState<Tables<'orders'>[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await withTimeout(listMyOrders('provider', userId));
        if (!cancelled) setOrders(rows);
      } catch {
        if (!cancelled) setOrders([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const liberado = (orders ?? [])
    .filter((o) => o.status === 'settled')
    .reduce((sum, o) => sum + providerNetCents(o), 0);

  const retido = (orders ?? [])
    .filter((o) => ['paid', 'en_route', 'in_progress', 'completed'].includes(o.status))
    .reduce((sum, o) => sum + providerNetCents(o), 0);

  return (
    <Screen label="Transportador · Ganhos">
      {orders === null ? (
        <>
          <ScreenHead title="Ganhos" sticky />
          <Body>
            <Skeleton count={2} height={110} />
          </Body>
        </>
      ) : (
        <>
          {/* O líquido liberado é o hero: o número é o título da tela. */}
          <div className="px-hero">
            <div className="px-eyebrow" style={{ color: 'var(--x-hero-ink-dim)' }}>
              Ganhos · já liberado
            </div>
            <h1 className="px-hero-title" style={{ marginTop: 10, maxWidth: 'none' }}>
              {formatCents(liberado)}
            </h1>
            <p className="px-hero-sub">de serviços finalizados pelo cliente</p>

            <div className="px-hero-slab">
              <span className="px-hero-tag">
                <Icon name="clock" size={20} style={{ color: 'var(--x-action)', flexShrink: 0 }} />
                <span style={{ minWidth: 0, textAlign: 'left' }}>
                  <span className="px-hero-tag-code">{formatCents(retido)}</span>
                  <span className="px-hero-tag-lbl">
                    em retenção — libera quando o cliente confirmar
                  </span>
                </span>
              </span>
            </div>
          </div>

          <Body>
            <Button
              variant="primary"
              size="lg"
              block
              icon="arrow-right"
              onClick={() => go('prov-financeiro')}
            >
              Extrato e saque
            </Button>

            <p className="px-opt-s" style={{ marginTop: 0 }}>
              O saque via Pix depende da conta bancária da Pagora, que ainda está sendo aberta.
              Enquanto isso o extrato registra tudo e nada se perde.
            </p>
          </Body>
        </>
      )}

      <ProviderNav active="ganhos" go={go} userId={userId} />
    </Screen>
  );
};

export const ParceiroConta = ({ go }: { go: GoFn }) => (
  <AreaGuard go={go} active="conta">
    {(userId) => <ContaInner go={go} userId={userId} />}
  </AreaGuard>
);

const ContaInner = ({ go, userId }: { go: GoFn; userId: string }) => {
  const { profile } = useProfile();

  return (
    <Screen label="Transportador · Conta">
      <ScreenHead title="Conta" sticky />
      <Body>
        <Card>
          <SectionTitle>{profile?.full_name || 'Transportador'}</SectionTitle>
          <div className="px-data" style={{ color: 'var(--x-ink-dim)', marginTop: 4 }}>
            {profile?.phone ?? ''}
          </div>
          <div style={{ marginTop: 12 }}>
            <Chip tone={profile?.role === 'provider' ? 'on' : 'urgent'}>
              {profile?.role === 'provider' ? 'Cadastro aprovado' : 'Aguardando aprovação'}
            </Chip>
          </div>
        </Card>

        <Stack gap="tight">
          <button className="px-opt" onClick={() => go('provider-signup')}>
            <span className="px-opt-art" aria-hidden="true">
              <Icon name="truck" size={20} />
            </span>
            <span className="px-opt-text">
              <span className="px-opt-t">Veículo e documentos</span>
              <span className="px-opt-s">CNH, placa, capacidade e áreas atendidas</span>
            </span>
            <span className="px-opt-end">
              <Icon name="arrow-right" size={18} />
            </span>
          </button>

          <button className="px-opt" onClick={() => go('inicio')}>
            <span className="px-opt-art" aria-hidden="true">
              <Icon name="home" size={20} />
            </span>
            <span className="px-opt-text">
              <span className="px-opt-t">Ir para o app de cliente</span>
              <span className="px-opt-s">Pedir um transporte para você</span>
            </span>
            <span className="px-opt-end">
              <Icon name="arrow-right" size={18} />
            </span>
          </button>
        </Stack>

        <Button
          variant="quiet"
          block
          onClick={() => {
            void supabase.auth.signOut().then(() => go('inicio'));
          }}
        >
          Sair da conta
        </Button>
      </Body>

      <ProviderNav active="conta" go={go} userId={userId} />
    </Screen>
  );
};

/**
 * O cadastro de transportador desta pessoa está em análise?
 *
 * `null` enquanto carrega ou quando não há telefone — e nesse caso o gate se
 * comporta como sempre se comportou (oferece o cadastro). Errar para
 * "oferece cadastrar" é recuperável; errar para "está em análise" prenderia
 * quem nunca se cadastrou numa tela sem saída.
 */
function useInscricao(phone: string | null): 'pendente' | 'nenhuma' | null {
  const [estado, setEstado] = useState<'pendente' | 'nenhuma' | null>(null);

  useEffect(() => {
    if (!phone) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await withTimeout(
          Promise.resolve(
            supabase
              .from('provider_applications')
              .select('id, decision')
              .eq('phone', phone)
              .is('decision', null)
              .limit(1),
          ),
        );
        if (!cancelled) setEstado((data ?? []).length > 0 ? 'pendente' : 'nenhuma');
      } catch {
        // Sem resposta, o gate segue no caminho de sempre.
        if (!cancelled) setEstado('nenhuma');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phone]);

  return estado;
}

// =====================================================================
// AVISOS DO TRANSPORTADOR
// =====================================================================
// `buildProviderFeed` estava escrito e testado desde 25/08 sem consumidor —
// código morto que eu mesmo deixei. Esta é a tela que faltava.
//
// O que ela mostra e Oportunidades não mostra: o que ACONTECEU. A aba de
// oportunidades responde "o que posso pegar agora"; esta responde "o que
// mudou desde que eu olhei" — e é a única que carrega o aviso que mais vale
// para quem dirige: **pagamento confirmado, pode sair**. Hoje esse sinal não
// existe em lugar nenhum do app.
//
// A sobreposição com Oportunidades (pedido aberto aparece nas duas) é a
// mesma que o cliente já tem entre Pedidos e Avisos: lista do que está
// disponível × linha do tempo do que mudou.
// =====================================================================

export const ParceiroAvisos = ({ go }: { go: GoFn }) => (
  <AreaGuard go={go} active="avisos">
    {(userId) => <AvisosInner go={go} userId={userId} />}
  </AreaGuard>
);

const AvisosInner = ({ go, userId }: { go: GoFn; userId: string }) => {
  const { notices, error, unseen, reload } = useProviderNotices(userId);

  // Abrir É ver. Marcar no fechamento deixaria o selo aceso enquanto a
  // pessoa lê a lista.
  useEffect(() => {
    const novo = notices?.[0]?.at;
    if (novo) writeLastSeen(userId, novo, 'transportador');
  }, [userId, notices]);

  const acao = (notices ?? []).filter((n) => n.actionable);
  const resto = (notices ?? []).filter((n) => !n.actionable);

  return (
    <Screen label="Transportador · Avisos">
      <ScreenHead title="Avisos" sticky />
      <Body>
        {error && <ErrorNote message={error} onRetry={() => void reload()} />}

        {notices === null ? (
          <Skeleton count={3} height={84} />
        ) : notices.length === 0 ? (
          <Empty
            icon="bell"
            title="Nada novo por aqui"
            sub="Pedido novo da sua região e mudança nos seus serviços aparecem aqui — sem precisar atualizar."
          />
        ) : (
          <>
            {acao.length > 0 && (
              <section className="px-stack">
                <div className="px-row px-row--between">
                  <h2 className="px-sectitle">Precisa de você</h2>
                  <Chip tone="urgent">{acao.length}</Chip>
                </div>
                <Stack gap="tight">
                  {acao.map((n) => (
                    <NoticeRow key={n.id} notice={n} go={go} />
                  ))}
                </Stack>
              </section>
            )}

            {resto.length > 0 && (
              <section className="px-stack">
                <h2 className="px-sectitle">Acompanhamento</h2>
                <Stack gap="tight">
                  {resto.map((n) => (
                    <NoticeRow key={n.id} notice={n} go={go} />
                  ))}
                </Stack>
              </section>
            )}
          </>
        )}
      </Body>

      {/* Aqui a barra NÃO usa `ProviderNav`: a tela já carregou o feed, e
          `ProviderNav` carregaria de novo — três consultas e um canal a mais
          justamente na tela para onde o selo manda a pessoa. */}
      <AreaNav tabs={PROVIDER_TABS} active="avisos" go={go} badges={{ avisos: unseen }} />
    </Screen>
  );
};

/**
 * Os avisos do transportador. Uma consulta só para as três fontes que o
 * feed precisa: pedidos abertos, os serviços dele e as propostas que ele já
 * mandou (para não chamar de oportunidade o que ele já respondeu).
 */
export function useProviderNotices(userId: string | undefined) {
  // O nome do canal precisa ser único POR MONTAGEM: duas instâncias deste
  // hook na mesma tela abririam dois canais com o mesmo nome, disputando o
  // mesmo tópico no Supabase. Hoje isso não acontece — a tela de avisos passa
  // o feed que já tem para a barra — e este `useId` é o que garante que
  // continue não acontecendo se alguém montar o hook duas vezes amanhã.
  const instance = useId();
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [openRequests, orders, myQuotes] = await withTimeout(
        Promise.all([listOpenRequests(), listMyOrders('provider', userId), listMyQuotes(userId)]),
      );
      setNotices(buildProviderFeed({ openRequests, orders, myQuotes }));
      setError(null);
    } catch (e) {
      setError(loadErrorMessage(e));
      setNotices([]);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    // `load` é assíncrona: o setState acontece depois do await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [userId, load]);

  // As duas tabelas que geram aviso para ele estão na publication desde a
  // 0002 — pedido novo e mudança de estado chegam sozinhos.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`avisos-prestador-${userId}-${instance}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'pagora', table: 'service_requests' },
        () => void load(),
      )
      .on('postgres_changes', { event: '*', schema: 'pagora', table: 'orders' }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, load, instance]);

  const unseen =
    userId && notices ? countUnseen(notices, readLastSeen(userId, 'transportador')) : 0;

  return { notices, error, unseen, reload: load };
}

/** A barra do transportador, já com o selo de avisos não lidos. */
const ProviderNav = ({
  active,
  go,
  userId,
}: {
  active: string;
  go: GoFn;
  userId: string | undefined;
}) => {
  const { unseen } = useProviderNotices(userId);
  return <AreaNav tabs={PROVIDER_TABS} active={active} go={go} badges={{ avisos: unseen }} />;
};
