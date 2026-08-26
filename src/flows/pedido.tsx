// =====================================================================
// PAGORA — Pedido em três passos
// =====================================================================
// Substitui a jornada de seis telas. O que mudou não foi a quantidade de
// perguntas — foi quais delas param o usuário.
//
//   ANTES: serviço → carga → trajeto → veículo → quando → resumo
//          6 telas, 5 toques em "Continuar" desabilitado esperando escolha.
//
//   AGORA: o quê → onde → quem pode fazer
//          3 telas, avanço no toque da opção, e veículo/ajudante/acesso viram
//          detalhes opcionais com padrão inferido pelo tipo de carga.
//
// Nenhuma pergunta sumiu: o prestador continua recebendo veículo, ajudante e
// acesso no payload. Elas deixaram de ser barreira e viraram refinamento.
// =====================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Body,
  Button,
  Card,
  Chip,
  Dock,
  ErrorNote,
  Field,
  Heading,
  KV,
  Num,
  Option,
  Rail,
  Rating,
  RouteLine,
  Screen,
  ScreenHead,
  SectionTitle,
  Sheet,
  Skeleton,
  Stack,
  TextArea,
  cx,
} from '../ui/kit';
import { Icon } from '../icons';
import { AddressField, type AddressValue } from '../ui/address-field';
import { VoiceButton } from '../ui/anchor-card';
import { CacambaArt } from '../ui/art';
import { Avatar } from '../ui/kit';
import {
  ACCESS_TYPES,
  CACAMBA_MATERIALS,
  CACAMBA_PERIODS,
  CACAMBA_SIZES,
  CARGO_BY_NEED,
  DEFAULT_HELPERS,
  DEFAULT_VEHICLE,
  GUINCHO_ACCESS,
  GUINCHO_PROBLEMS,
  GUINCHO_VEHICLES,
  VEHICLES,
  vehicleSpec,
} from './catalog';
import { NEED_LABEL, NEED_SERVICE, type Hints, type NeedKind } from '../domains/intent/intent';
import { calcFreteCents, PricingInputError } from '../domains/pricing/frete-pricing';
import { calcCacambaCents, calcGuinchoCents } from '../domains/pricing/service-pricing';
import { formatCents } from '../domains/money';
import {
  describeDistance,
  distanceCaveat,
  resolveDistance,
  type Distance,
} from '../domains/geo/distance';
import { fetchRouteMeters } from '../hooks/usePlaces';
import {
  listMyRequests,
  publishServiceRequest,
  guessCity,
} from '../domains/orders/request.service';
import { recentAddresses } from '../domains/orders/recent-addresses';
import {
  initialsOf,
  listAvailableProviders,
  type AvailableProvider,
} from '../domains/providers/provider.service';
import { usePagoraStore } from '../store';
import { useSession } from '../hooks/useSession';
import { track } from '../lib/analytics';
import { loadErrorMessage, withTimeout } from '../lib/timeout';
import type { GoFn, PagoraState } from '../types';

type Step = 1 | 2 | 3;

export const Pedido = ({
  go,
  need,
  intentText,
  hints,
  repeatFrom,
}: {
  go: GoFn;
  need: NeedKind;
  intentText?: string | undefined;
  hints?: Hints | undefined;
  /** Estado de um pedido anterior, quando veio de "pedir de novo". */
  repeatFrom?: PagoraState | undefined;
}) => {
  const state = usePagoraStore();
  const set = usePagoraStore((s) => s.patchState);
  const reset = usePagoraStore((s) => s.resetState);
  const { user } = useSession();

  // Endereços que a pessoa já usou — derivados dos pedidos dela, sem
  // tabela de endereços e sem "salvar endereço".
  const [recents, setRecents] = useState<AddressValue[]>([]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const all = await withTimeout(listMyRequests(user.id));
        if (!cancelled) {
          setRecents(
            recentAddresses(all).map((a) => ({
              address: a.address,
              geo: a.geo,
              city: a.city,
              state: a.state,
            })),
          );
        }
      } catch {
        // Sem recentes a tela segue igual — é atalho, não requisito.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // A repetição entra UMA vez, na montagem. Reaplicar a cada render
  // desfaria toda edição que o cliente fizesse em cima do pedido repetido.
  const semeado = useRef(false);
  useEffect(() => {
    if (semeado.current) return;
    semeado.current = true;
    if (repeatFrom) {
      // `reset` antes: sem ele, um campo do pedido anterior que a repetição
      // não traz (data, urgência) ficaria pendurado do fluxo anterior.
      reset();
      set(repeatFrom);
    }
    // Só na montagem, de propósito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [step, setStep] = useState<Step>(1);
  const [details, setDetails] = useState(false);

  const service = NEED_SERVICE[need];

  // Semeadura de entrada. Roda UMA vez por necessidade — a marca `flowSeed`
  // no store distingue "acabou de entrar" de "voltou do login", que remonta o
  // componente com o mesmo `need` e apagaria tudo que já foi preenchido.
  //
  // Também limpa os campos de demonstração que o `initialState` do store
  // carrega desde as telas antigas ("Av. Paulista, 1000", data 29/04/2026,
  // veículo baú). Eles existiam para a maquete parecer preenchida; num fluxo
  // que grava pedido de verdade, endereço falso já preenchido é o pior
  // padrão possível — a pessoa publica sem perceber que não é o dela.
  useEffect(() => {
    if (state.flowSeed === need) return;

    const seed: Partial<PagoraState> = {
      flowSeed: need,
      // Limpeza dos campos de demonstração.
      origin: '',
      dest: '',
      address: '',
      currentLoc: '',
      destAddr: '',
      cargo: null,
      urgency: null,
      scheduledDate: '',
      scheduledTime: '',
      notes: '',
      originAccess: {},
      destAccess: {},
      // Palpite honesto: preenche, não trava. Tudo segue editável em
      // "Ajustar detalhes".
      vehicle: DEFAULT_VEHICLE[need],
      helpers: DEFAULT_HELPERS[need],
    };

    if (intentText) seed.notes = intentText;
    if (hints?.urgent) seed.urgency = 'now';
    if (hints?.cubicMeters) {
      // O tamanho mais próximo do que a pessoa pediu, sem passar para baixo:
      // caçamba pequena demais é frete perdido.
      const wanted = hints.cubicMeters;
      const fit = CACAMBA_SIZES.find((c) => c.m3 >= wanted) ?? CACAMBA_SIZES.at(-1);
      if (fit) seed.size = String(fit.m3);
    }

    set(seed);
    // `need` é a única dependência real: intentText e hints chegam junto com
    // ele, na mesma navegação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [need, state.flowSeed]);

  const back = () => (step === 1 ? go('inicio') : setStep((s) => (s - 1) as Step));
  const next = () => setStep((s) => Math.min(3, s + 1) as Step);

  return (
    <Screen label={`Pedido · ${NEED_LABEL[need]}`}>
      <ScreenHead
        onBack={back}
        heading={false}
        title={NEED_LABEL[need]}
        action={
          step < 3 ? (
            <Button variant="quiet" size="sm" onClick={() => go('inicio')}>
              Sair
            </Button>
          ) : undefined
        }
      />
      <Rail step={step} total={3} />

      {step === 1 && <PassoUm need={need} state={state} set={set} onPick={next} />}
      {step === 2 && (
        <PassoDois
          need={need}
          state={state}
          set={set}
          onNext={next}
          onDetails={() => setDetails(true)}
          recents={recents}
        />
      )}
      {step === 3 && <PassoTres go={go} need={need} state={state} set={set} />}

      <Detalhes
        open={details}
        onClose={() => setDetails(false)}
        need={need}
        state={state}
        set={set}
      />

      <span className="px-sr" aria-live="polite">
        Passo {step} de 3 · {service}
      </span>
    </Screen>
  );
};

// =====================================================================
// PASSO 1 — O QUE
// =====================================================================
// Toque na opção avança. Não existe "Continuar" nesta tela: o passo aceita
// uma resposta só, então o segundo toque não acrescentaria informação.
// =====================================================================

const PassoUm = ({
  need,
  state,
  set,
  onPick,
}: {
  need: NeedKind;
  state: PagoraState;
  set: (p: Partial<PagoraState>) => void;
  onPick: () => void;
}) => {
  // ---- Caçamba: o tamanho é a primeira decisão, e ela é visual ----------
  if (need === 'entulho') {
    return (
      <Body>
        <Heading
          title="Que tamanho de caçamba?"
          sub="Em dúvida, escolha a maior — sobra é melhor que uma segunda viagem."
        />
        <Stack>
          {CACAMBA_SIZES.map((c) => (
            <Option
              key={c.m3}
              advances
              selected={state.size === String(c.m3)}
              art={<CacambaArt size={52} m3={c.m3} />}
              title={`${c.m3} m³`}
              sub={c.fits}
              meta={<span className="px-data">{c.weight}</span>}
              onClick={() => {
                set({ size: String(c.m3), material: state.material ?? 'entulho' });
                onPick();
              }}
            />
          ))}
        </Stack>
      </Body>
    );
  }

  // ---- Guincho: o problema define o equipamento que o prestador leva ----
  if (need === 'veiculo') {
    return (
      <Body>
        <Heading title="O que aconteceu?" sub="O prestador precisa saber o que levar." />
        <Stack>
          {GUINCHO_PROBLEMS.map((p) => (
            <Option
              key={p.id}
              advances
              selected={state.problem === p.id}
              icon={p.icon}
              title={p.label}
              sub={p.sub}
              onClick={() => {
                set({ problem: p.id });
                onPick();
              }}
            />
          ))}
        </Stack>
      </Body>
    );
  }

  // ---- Frete: tipo de carga --------------------------------------------
  const options = CARGO_BY_NEED[need] ?? [];
  return (
    <Body>
      <Heading
        title="O que você vai transportar?"
        sub="Isso define o veículo e quantos ajudantes o prestador leva."
      />
      <Stack>
        {options.map((o) => (
          <Option
            key={o.id}
            advances
            selected={state.cargo === o.id}
            title={o.label}
            sub={o.sub}
            onClick={() => {
              set({ cargo: o.id });
              onPick();
            }}
          />
        ))}
      </Stack>
    </Body>
  );
};

// =====================================================================
// PASSO 2 — ONDE
// =====================================================================

const PassoDois = ({
  need,
  state,
  set,
  onNext,
  onDetails,
  recents,
}: {
  need: NeedKind;
  state: PagoraState;
  set: (p: Partial<PagoraState>) => void;
  onNext: () => void;
  onDetails: () => void;
  recents: AddressValue[];
}) => {
  const isCacamba = need === 'entulho';
  const isGuincho = need === 'veiculo';

  const ready = isCacamba
    ? Boolean(state.address?.trim() && state.duration)
    : isGuincho
      ? Boolean(state.currentLoc?.trim() && state.destAddr?.trim())
      : Boolean(state.origin?.trim() && state.dest?.trim());

  return (
    <>
      <Body>
        {isCacamba ? (
          <>
            <Heading title="Onde entregar a caçamba?" />
            <AddressField
              recents={recents}
              label="Endereço da entrega"
              value={state.address ?? ''}
              placeholder="Rua, número, bairro, cidade"
              autoComplete="street-address"
              onChange={(v) =>
                set({
                  address: v.address,
                  originGeo: v.geo,
                  destGeo: v.geo,
                  originCity: v.city,
                  originState: v.state,
                })
              }
            />

            <section className="px-stack">
              <SectionTitle>Quanto tempo vai ficar?</SectionTitle>
              <Stack gap="tight">
                {CACAMBA_PERIODS.map((p) => (
                  <Option
                    key={p.id}
                    selected={state.duration === String(p.id)}
                    title={p.label}
                    sub={p.sub}
                    onClick={() => set({ duration: String(p.id) })}
                  />
                ))}
              </Stack>
            </section>
          </>
        ) : isGuincho ? (
          <>
            <Heading title="Onde está e para onde levar?" />
            <AddressField
              recents={recents}
              label="Onde o veículo está"
              value={state.currentLoc ?? ''}
              placeholder="Endereço, rodovia e km, ou ponto de referência"
              onChange={(v) =>
                set({
                  currentLoc: v.address,
                  originGeo: v.geo,
                  originCity: v.city,
                  originState: v.state,
                })
              }
            />
            <AddressField
              recents={recents}
              label="Para onde levar"
              icon="flag"
              value={state.destAddr ?? ''}
              placeholder="Oficina, residência ou concessionária"
              onChange={(v) =>
                set({ destAddr: v.address, destGeo: v.geo, destCity: v.city, destState: v.state })
              }
            />
          </>
        ) : (
          <>
            <Heading title="De onde, para onde?" />
            <AddressField
              recents={recents}
              label="Retirada"
              value={state.origin ?? ''}
              placeholder="Rua, número, bairro, cidade"
              autoComplete="street-address"
              onChange={(v) =>
                set({
                  origin: v.address,
                  originGeo: v.geo,
                  originCity: v.city,
                  originState: v.state,
                })
              }
            />
            <AddressField
              recents={recents}
              label="Entrega"
              icon="flag"
              value={state.dest ?? ''}
              placeholder="Rua, número, bairro, cidade"
              onChange={(v) =>
                set({ dest: v.address, destGeo: v.geo, destCity: v.city, destState: v.state })
              }
            />
          </>
        )}

        <QuandoBlock state={state} set={set} />

        {/* Os detalhes que eram telas obrigatórias. Ficam aqui, opcionais, já
            preenchidos com o palpite — e o resumo mostra qual palpite foi. */}
        <button className="px-opt" onClick={onDetails}>
          <span className="px-opt-art" aria-hidden="true">
            <Icon name="settings" size={20} />
          </span>
          <span className="px-opt-text">
            <span className="px-opt-t">Ajustar detalhes</span>
            <span className="px-opt-s">{resumoDetalhes(need, state)}</span>
          </span>
          <span className="px-opt-end">
            <Icon name="arrow-right" size={18} />
          </span>
        </button>
      </Body>

      <Dock>
        <Button
          variant="primary"
          size="lg"
          block
          icon="arrow-right"
          disabled={!ready}
          onClick={onNext}
        >
          Ver quem pode fazer
        </Button>
        {!ready && (
          <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--x-ink-dim)' }}>
            {isCacamba
              ? 'Informe o endereço e por quanto tempo.'
              : 'Informe os dois endereços para continuar.'}
          </div>
        )}
      </Dock>
    </>
  );
};

/** Resumo do que o palpite preencheu — o usuário vê antes de decidir abrir. */
function resumoDetalhes(need: NeedKind, s: PagoraState): string {
  if (need === 'entulho') {
    const m = CACAMBA_MATERIALS.find((x) => x.id === s.material);
    return m ? `Material: ${m.label.toLowerCase()}` : 'Material e observações';
  }
  if (need === 'veiculo') {
    const v = GUINCHO_VEHICLES.find((x) => x.id === s.vehicleType);
    return v
      ? `${v.label} · ${GUINCHO_ACCESS.find((a) => a.id === s.location)?.label ?? 'na rua'}`
      : 'Tipo de veículo e acesso';
  }
  const v = vehicleSpec(s.vehicle);
  const h = s.helpers ?? 0;
  return `${v?.name ?? 'Veículo'} · ${h === 0 ? 'sem ajudante' : h === 1 ? '1 ajudante' : `${h} ajudantes`}`;
}

const QuandoBlock = ({
  state,
  set,
}: {
  state: PagoraState;
  set: (p: Partial<PagoraState>) => void;
}) => (
  <section className="px-stack">
    <SectionTitle>Quando?</SectionTitle>
    <div className="px-row" style={{ gap: 8 }}>
      <button
        className={cx('px-btn', state.urgency === 'now' ? 'px-btn--primary' : 'px-btn--outline')}
        style={{ flex: 1 }}
        onClick={() => set({ urgency: 'now' })}
        aria-pressed={state.urgency === 'now'}
      >
        Hoje
      </button>
      <button
        className={cx(
          'px-btn',
          state.urgency === 'scheduled' ? 'px-btn--primary' : 'px-btn--outline',
        )}
        style={{ flex: 1 }}
        onClick={() => set({ urgency: 'scheduled' })}
        aria-pressed={state.urgency === 'scheduled'}
      >
        Agendar
      </button>
    </div>

    {state.urgency === 'scheduled' && (
      <div className="px-row px-in" style={{ gap: 8 }}>
        <Field
          label="Data"
          type="date"
          value={state.scheduledDate ?? ''}
          onChange={(e) => set({ scheduledDate: e.target.value })}
        />
        <Field
          label="Hora"
          type="time"
          value={state.scheduledTime ?? ''}
          onChange={(e) => set({ scheduledTime: e.target.value })}
        />
      </div>
    )}
  </section>
);

// =====================================================================
// DETALHES — o que eram três telas obrigatórias
// =====================================================================

const Detalhes = ({
  open,
  onClose,
  need,
  state,
  set,
}: {
  open: boolean;
  onClose: () => void;
  need: NeedKind;
  state: PagoraState;
  set: (p: Partial<PagoraState>) => void;
}) => {
  const helpers = state.helpers ?? 0;

  return (
    <Sheet open={open} onClose={onClose} title="Detalhes do pedido">
      {need === 'entulho' && (
        <section className="px-stack">
          <SectionTitle>O que vai na caçamba?</SectionTitle>
          <Stack gap="tight">
            {CACAMBA_MATERIALS.map((m) => (
              <Option
                key={m.id}
                selected={state.material === m.id}
                title={m.label}
                sub={m.sub}
                onClick={() => set({ material: m.id })}
              />
            ))}
          </Stack>
        </section>
      )}

      {need === 'veiculo' && (
        <>
          <section className="px-stack">
            <SectionTitle>Qual veículo?</SectionTitle>
            <Stack gap="tight">
              {GUINCHO_VEHICLES.map((v) => (
                <Option
                  key={v.id}
                  selected={state.vehicleType === v.id}
                  title={v.label}
                  sub={v.sub}
                  onClick={() => set({ vehicleType: v.id })}
                />
              ))}
            </Stack>
          </section>
          <section className="px-stack">
            <SectionTitle>Onde ele está parado?</SectionTitle>
            <Stack gap="tight">
              {GUINCHO_ACCESS.map((a) => (
                <Option
                  key={a.id}
                  selected={(state.location ?? 'rua') === a.id}
                  title={a.label}
                  sub={a.sub}
                  onClick={() => set({ location: a.id })}
                />
              ))}
            </Stack>
          </section>
        </>
      )}

      {need !== 'entulho' && need !== 'veiculo' && (
        <>
          <section className="px-stack">
            <SectionTitle>Qual veículo?</SectionTitle>
            <Stack gap="tight">
              {VEHICLES.map((v) => {
                const Art = v.art;
                return (
                  <Option
                    key={v.id}
                    selected={state.vehicle === v.id}
                    art={<Art size={52} />}
                    title={v.name}
                    sub={v.fits}
                    meta={<span className="px-data">{v.volume}</span>}
                    onClick={() => set({ vehicle: v.id })}
                  />
                );
              })}
            </Stack>
          </section>

          <section className="px-stack">
            <div className="px-row px-row--between">
              <div>
                <SectionTitle>Ajudantes</SectionTitle>
                <div className="px-opt-s" style={{ marginTop: 3 }}>
                  Cada ajudante: + R$ 50
                </div>
              </div>
              <div className="px-row" style={{ gap: 10 }}>
                <button
                  className="px-iconbtn"
                  onClick={() => set({ helpers: Math.max(0, helpers - 1) })}
                  aria-label="Menos um ajudante"
                  disabled={helpers === 0}
                >
                  <Icon name="minus" size={18} />
                </button>
                <span
                  className="px-num px-num--sm"
                  style={{ minWidth: 24, textAlign: 'center' }}
                  aria-live="polite"
                >
                  {helpers}
                </span>
                <button
                  className="px-iconbtn"
                  onClick={() => set({ helpers: Math.min(4, helpers + 1) })}
                  aria-label="Mais um ajudante"
                  disabled={helpers === 4}
                >
                  <Icon name="plus" size={18} />
                </button>
              </div>
            </div>
          </section>

          <section className="px-stack">
            <SectionTitle>Como é o acesso?</SectionTitle>
            <Stack gap="tight">
              {ACCESS_TYPES.map((a) => (
                <Option
                  key={a.id}
                  selected={state.originAccess?.type === a.id}
                  title={a.label}
                  sub={a.sub}
                  onClick={() => set({ originAccess: { ...state.originAccess, type: a.id } })}
                />
              ))}
            </Stack>
            {state.originAccess?.type === 'apt' && (
              <Option
                selected={state.originAccess?.elevator === true}
                title="Tem elevador"
                sub={
                  state.originAccess?.elevator
                    ? 'Sem subida de escada'
                    : 'Sem elevador soma R$ 25 à estimativa'
                }
                onClick={() =>
                  set({
                    originAccess: {
                      ...state.originAccess,
                      elevator: !state.originAccess?.elevator,
                    },
                  })
                }
              />
            )}
          </section>
        </>
      )}

      {/* Observações é o campo mais longo do fluxo e o mais provável de ser
          preenchido de pé, na obra. O ditado concatena ao que já existe. */}
      <div style={{ position: 'relative' }}>
        <TextArea
          label="Observações para o prestador"
          value={state.notes ?? ''}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Qualquer coisa que ajude quem vai atender."
          className="px-textarea--voice"
        />
        <VoiceButton
          onText={(t) => set({ notes: state.notes ? `${state.notes} ${t}` : t })}
          label="Ditar as observações"
          className="px-voice-corner"
        />
      </div>

      <Button variant="primary" size="lg" block onClick={onClose}>
        Pronto
      </Button>
    </Sheet>
  );
};

// =====================================================================
// PASSO 3 — QUEM PODE FAZER
// =====================================================================
// A estimativa é o maior elemento da tela, e vem rotulada como estimativa.
// O preço cobrado é o da proposta aceita — dizer isso aqui, e não no rodapé
// em corpo 11, é o que impede a reclamação de "mudou o preço".
// =====================================================================

const PassoTres = ({
  go,
  need,
  state,
  set,
}: {
  go: GoFn;
  need: NeedKind;
  state: PagoraState;
  set: (p: Partial<PagoraState>) => void;
}) => {
  const { user } = useSession();
  const service = NEED_SERVICE[need];
  const [providers, setProviders] = useState<AvailableProvider[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeMeters, setRouteMeters] = useState<number | null>(null);

  // Distância por via. Só é pedida quando os DOIS endereços viraram
  // coordenada — sem chave do Google, `fetchRouteMeters` devolve null e
  // `resolveDistance` cai na linha reta corrigida ou no padrão do domínio.
  const originGeo = state.originGeo;
  const destGeo = state.destGeo;
  useEffect(() => {
    if (!originGeo || !destGeo) return;
    let cancelled = false;
    void fetchRouteMeters(originGeo, destGeo).then((m) => {
      if (!cancelled) setRouteMeters(m);
    });
    return () => {
      cancelled = true;
    };
  }, [originGeo, destGeo]);

  const distance: Distance = useMemo(
    () => resolveDistance({ routeMeters, origin: originGeo, destination: destGeo }),
    [routeMeters, originGeo, destGeo],
  );

  // A distância vai para o store porque é ela que o `payload` grava — o
  // prestador precisa ver o mesmo número que o cliente viu.
  useEffect(() => {
    if (state.distance === distance.km && state.distanceSource === distance.source) return;
    set({ distance: distance.km, distanceSource: distance.source });
  }, [distance, state.distance, state.distanceSource, set]);

  const estimate = useMemo(() => {
    try {
      if (need === 'entulho') {
        return calcCacambaCents({ sizeM3: state.size, days: state.duration });
      }
      if (need === 'veiculo') {
        return calcGuinchoCents({
          distanceKm: distance.km,
          vehicleType: state.vehicleType ?? 'popular',
          access: state.location,
          urgency: state.urgency,
        });
      }
      const f = calcFreteCents({
        distanceKm: distance.km,
        vehicle: state.vehicle,
        helpers: state.helpers,
        originAccess: state.originAccess,
        destAccess: state.destAccess,
        urgency: state.urgency,
      });
      return {
        lowCents: f.lowCents,
        highCents: f.highCents,
        lines: [
          // O rótulo diz COMO a distância foi obtida: "por via" quando o
          // Google respondeu, "aproximados" quando é linha reta corrigida,
          // "estimados" quando ainda não há endereço resolvido. Esconder a
          // diferença é o que transforma estimativa em promessa quebrada.
          {
            label: `Deslocamento · ${describeDistance(distance)}`,
            cents: f.breakdown.baseKmCents,
          },
          { label: 'Taxa de atendimento', cents: f.breakdown.baseFeeCents },
          { label: vehicleSpec(state.vehicle)?.name ?? 'Veículo', cents: f.breakdown.vehicleCents },
          { label: 'Ajudantes', cents: f.breakdown.helpersCents },
          { label: 'Acesso', cents: f.breakdown.accessCents + f.breakdown.noElevatorCents },
        ],
      };
    } catch (e) {
      // Entrada insuficiente para precificar não é motivo para tela em branco:
      // o pedido pode ser publicado sem estimativa, e o prestador cota.
      if (e instanceof PricingInputError) return null;
      throw e;
    }
  }, [need, state, distance]);

  const city = guessCity(
    need === 'entulho' ? state.address : need === 'veiculo' ? state.currentLoc : state.origin,
  );

  useEffect(() => {
    // Sem sessão, `providers` fica em `null` e o render trata o caso pelo
    // próprio `user` — a policy `providers_public_read` exige autenticação,
    // então não há o que buscar.
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await withTimeout(listAvailableProviders(service, city));
        if (!cancelled) setProviders(rows);
      } catch {
        if (!cancelled) setProviders([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [service, city, user]);

  async function publish() {
    if (!user) {
      track('publicar_pedido_sem_login', { tipo: service });
      go('login');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const request = await withTimeout(
        publishServiceRequest({
          clientId: user.id,
          service,
          state: { ...state, need },
          estimate: estimate
            ? { lowCents: estimate.lowCents, highCents: estimate.highCents }
            : undefined,
        }),
      );
      track('pedido_publicado', { tipo: service, request_id: request.id, need });
      go(`escolher/${request.id}`);
    } catch (e) {
      setError(loadErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Body>
        <Heading
          title="Quem pode fazer"
          sub="Publique o pedido e receba propostas com preço fechado. Você escolhe."
        />

        {estimate && (
          <Card tone="action">
            <div className="px-eyebrow">Estimativa do Pagora</div>
            <div style={{ marginTop: 10 }}>
              <Num
                value={formatCents(estimate.lowCents)}
                unit={`a ${formatCents(estimate.highCents)} — o valor final é o da proposta que você aceitar`}
              />
            </div>
            {distanceCaveat(distance) && (
              <div className="px-opt-s" style={{ marginTop: 10 }}>
                {distanceCaveat(distance)}
              </div>
            )}
            <details style={{ marginTop: 14 }}>
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--x-ink-soft)',
                  listStyle: 'none',
                }}
              >
                Como chegamos nesse número
              </summary>
              <div style={{ marginTop: 10 }}>
                {estimate.lines
                  .filter((l) => l.cents !== 0)
                  .map((l) => (
                    <KV key={l.label} k={l.label} v={formatCents(l.cents)} />
                  ))}
              </div>
            </details>
          </Card>
        )}

        <ResumoPedido need={need} state={state} />

        <section className="px-stack">
          <div className="px-row px-row--between">
            <SectionTitle>
              {city ? `Prestadores em ${city}` : 'Prestadores disponíveis'}
            </SectionTitle>
            {providers && providers.length > 0 && (
              <Chip tone="on">{providers.length} verificados</Chip>
            )}
          </div>

          {!user || providers === null ? (
            !user ? (
              <Card>
                <div className="px-row px-row--top">
                  <Icon name="info" size={19} style={{ color: 'var(--x-info)', flexShrink: 0 }} />
                  <p className="px-opt-s" style={{ marginTop: 0 }}>
                    Entre para ver quem atende sua região. Seu pedido fica salvo — você volta
                    exatamente para cá.
                  </p>
                </div>
              </Card>
            ) : (
              <Skeleton count={2} height={76} />
            )
          ) : providers.length === 0 ? (
            <Card>
              <div className="px-row px-row--top">
                <Icon name="info" size={19} style={{ color: 'var(--x-info)', flexShrink: 0 }} />
                <p className="px-opt-s" style={{ marginTop: 0 }}>
                  Ainda não há prestador com essa região declarada. Publicar mesmo assim vale a
                  pena: o pedido aparece para todos que atendem esse serviço.
                </p>
              </div>
            </Card>
          ) : (
            <Stack gap="tight">
              {providers.map((p) => (
                <Card key={p.profile_id}>
                  <div className="px-row">
                    <Avatar initials={initialsOf(p.display_name)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="px-opt-t">{p.display_name}</div>
                      <div className="px-row" style={{ gap: 10, marginTop: 4 }}>
                        <Rating value={p.rating_avg} count={p.rating_count} />
                        {p.vehicle_model && (
                          <span className="px-opt-s" style={{ marginTop: 0 }}>
                            {p.vehicle_model}
                          </span>
                        )}
                      </div>
                    </div>
                    <Chip tone="on" bare>
                      <Icon name="shield" size={12} /> Verificado
                    </Chip>
                  </div>
                </Card>
              ))}
            </Stack>
          )}
        </section>

        {error && <ErrorNote message={error} onRetry={() => void publish()} />}
      </Body>

      <Dock>
        <Button
          variant="primary"
          size="lg"
          block
          busy={busy}
          busyLabel="Publicando…"
          icon={user ? 'arrow-right' : undefined}
          iconStart={user ? undefined : 'logout'}
          onClick={() => void publish()}
        >
          {user ? 'Pedir propostas' : 'Entrar e pedir propostas'}
        </Button>
        <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--x-ink-dim)' }}>
          Sem custo e sem compromisso. Você só paga se aceitar uma proposta.
        </div>
      </Dock>
    </>
  );
};

// =====================================================================
// RESUMO — o que vai no pedido, editável
// =====================================================================

const ResumoPedido = ({ need, state }: { need: NeedKind; state: PagoraState }) => {
  if (need === 'entulho') {
    const period = CACAMBA_PERIODS.find((p) => String(p.id) === state.duration);
    return (
      <Card>
        <div className="px-row" style={{ marginBottom: 12 }}>
          <CacambaArt size={54} m3={Number(state.size) || 5} />
          <div>
            <div className="px-opt-t">Caçamba de {state.size} m³</div>
            <div className="px-opt-s">{period?.label ?? 'Período a definir'}</div>
          </div>
        </div>
        <KV k="Entrega e retirada" v={state.address || '—'} />
        <KV
          k="Material"
          v={CACAMBA_MATERIALS.find((m) => m.id === state.material)?.label ?? 'Entulho de obra'}
        />
      </Card>
    );
  }

  if (need === 'veiculo') {
    return (
      <Card>
        <RouteLine
          origin={state.currentLoc}
          dest={state.destAddr}
          originLabel="Veículo está em"
          destLabel="Levar para"
        />
        <div style={{ marginTop: 14 }}>
          <KV k="Problema" v={GUINCHO_PROBLEMS.find((p) => p.id === state.problem)?.label ?? '—'} />
          <KV
            k="Veículo"
            v={
              GUINCHO_VEHICLES.find((v) => v.id === state.vehicleType)?.label ?? 'Carro de passeio'
            }
          />
        </div>
      </Card>
    );
  }

  const v = vehicleSpec(state.vehicle);
  const Art = v?.art;
  const helpers = state.helpers ?? 0;
  return (
    <Card>
      <RouteLine origin={state.origin} dest={state.dest} />
      <div className="px-row" style={{ marginTop: 16, gap: 12 }}>
        {Art && <Art size={58} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="px-opt-t">{v?.name ?? 'Veículo a definir'}</div>
          <div className="px-opt-s">
            {helpers === 0 ? 'Sem ajudante' : helpers === 1 ? '1 ajudante' : `${helpers} ajudantes`}
            {v ? ` · ${v.volume}` : ''}
          </div>
        </div>
      </div>
    </Card>
  );
};
