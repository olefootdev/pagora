import { useState as useStateP } from 'react';
import { Icon } from './icons';
import { StatusBar, TopBar, Logo } from './core';
import { track } from './lib/analytics';
import { supabase } from './lib/supabase';
import type { ServiceType } from './lib/database.types';
import type { ScreenProps } from './types';

const SERVICE_ENUM: readonly ServiceType[] = ['frete', 'guincho', 'cacamba'];
const isServiceType = (id: string): id is ServiceType =>
  (SERVICE_ENUM as readonly string[]).includes(id);

// =====================================================================
// PROVIDER LANDING
// =====================================================================
const ProviderLanding = ({ go }: ScreenProps) => (
  <div className="pg-screen is-dark" data-screen-label="P1 Prestador · Landing">
    <StatusBar dark />
    <div
      className="pg-topbar pg-topbar--marketing is-dark is-transparent"
      style={{ borderBottom: 'none' }}
    >
      <button className="pg-iconbtn is-dark" onClick={() => go('landing')}>
        <Icon name="arrow-left" />
      </button>
      <Logo dark />
      <span style={{ width: 40 }} />
    </div>
    <div className="pg-viewport" style={{ background: 'var(--night-900)', color: '#fff' }}>
      <div style={{ padding: '16px 20px 24px' }}>
        <div
          className="pg-mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--green-500)',
          }}
        >
          ÁREA DO PRESTADOR
        </div>
        <h1
          style={{
            fontSize: 34,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.025em',
            margin: '12px 0 12px',
            textWrap: 'balance',
          }}
        >
          Receba pedidos qualificados{' '}
          <span style={{ color: 'var(--green-500)' }}>direto no WhatsApp</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: 15, lineHeight: 1.55 }}>
          Sem mensalidade. Sem comissão. Você decide quais pedidos atender e cobra direto do
          cliente.
        </p>

        <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
          {(
            [
              ['Cadastro grátis em 2 minutos', 'check-circle'],
              ['Pedidos com contexto completo', 'doc'],
              ['Pagamento direto com cliente', 'money'],
              ['Você define disponibilidade', 'clock'],
            ] as const
          ).map(([t, i], k) => (
            <div key={k} className="pg-row" style={{ gap: 10 }}>
              <span style={{ color: 'var(--green-500)' }}>
                <Icon name={i} size={18} />
              </span>
              <span style={{ fontSize: 14 }}>{t}</span>
            </div>
          ))}
        </div>

        <button
          className="pg-btn pg-btn--accent pg-btn--block pg-btn--lg"
          style={{ marginTop: 24 }}
          onClick={() => go('provider-signup')}
        >
          Cadastrar agora
        </button>

        {/* stats strip */}
        <div
          style={{
            marginTop: 28,
            padding: '16px 0',
            borderTop: '1px dashed rgba(255,255,255,0.16)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 4,
            textAlign: 'center',
          }}
        >
          {[
            ['1.247', 'serviços/mês'],
            ['R$ 280', 'ticket médio'],
            ['62%', 'taxa de aceite'],
          ].map(([n, l], i) => (
            <div key={i}>
              <div
                className="pg-mono"
                style={{ fontSize: 22, fontWeight: 700, color: 'var(--green-500)' }}
              >
                {n}
              </div>
              <div
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}
              >
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TYPES */}
      <div style={{ padding: '0 20px 24px' }}>
        <div
          className="pg-mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 12,
          }}
        >
          QUEM PODE SE CADASTRAR
        </div>
        <div className="pg-stack pg-stack--sm">
          {[
            { i: 'truck', t: 'Fretista / Mudanceiro', s: 'Van, baú, caminhão grande' },
            { i: 'tow', t: 'Guincheiro', s: 'Plataforma, asa-delta, moto' },
            { i: 'dumpster', t: 'Locador de caçamba', s: '3m³, 5m³, 8m³' },
            { i: 'package', t: 'Transportador rodoviário', s: 'Cargas entre cidades' },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: 'var(--night-800)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'rgba(34,227,163,0.12)',
                  color: 'var(--green-500)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name={s.i} size={20} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.t}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{s.s}</div>
              </div>
              <Icon name="check" size={16} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 20px 32px' }}>
        <button
          className="pg-btn pg-btn--accent pg-btn--block pg-btn--lg"
          onClick={() => go('provider-signup')}
        >
          Começar cadastro
        </button>
        <button
          className="pg-btn pg-btn--block"
          style={{
            background: 'transparent',
            color: '#fff',
            borderColor: 'rgba(255,255,255,0.16)',
            marginTop: 10,
          }}
          onClick={() => go('provider-dash')}
        >
          Já sou cadastrado · Entrar
        </button>
      </div>
    </div>
  </div>
);

// =====================================================================
// PROVIDER SIGNUP
// =====================================================================
type ProviderForm = {
  name: string;
  phone: string;
  services: string[];
  regions: string;
  vehicle: string;
};
const ProviderSignup = ({ go }: ScreenProps) => {
  const [form, setForm] = useStateP<ProviderForm>({
    name: '',
    phone: '',
    services: [],
    regions: '',
    vehicle: '',
  });
  const [status, setStatus] = useStateP<'idle' | 'sending' | 'err'>('idle');
  const [errorMsg, setErrorMsg] = useStateP('');
  const set = (p: Partial<ProviderForm>) => setForm((f) => ({ ...f, ...p }));
  const toggleService = (id: string) =>
    set({
      services: form.services.includes(id)
        ? form.services.filter((x) => x !== id)
        : [...form.services, id],
    });
  const valid = form.name && form.phone.length >= 10 && form.services.length > 0 && form.regions;

  const submit = async () => {
    if (!valid || status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');
    try {
      // Schema enum só aceita frete/guincho/cacamba — rodoviario fica de fora por ora
      const services = form.services.filter(isServiceType);
      if (services.length === 0) {
        setStatus('err');
        setErrorMsg('Rodoviário ainda não está aceito. Selecione frete, guincho ou caçamba.');
        return;
      }
      const { error } = await supabase.from('provider_applications').insert({
        full_name: form.name.trim(),
        phone: form.phone.trim(),
        services,
        vehicle: form.vehicle.trim() || null,
        regions: form.regions.trim(),
        source: 'landing',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
      });
      if (error) throw error;
      track('prestador_cadastrado', {
        tipo: services.join(','),
        regiao: form.regions,
      });
      go('provider-confirm');
    } catch (err) {
      setStatus('err');
      const msg = err instanceof Error ? err.message : 'Tente novamente';
      setErrorMsg(
        /duplicate|unique|provider_apps_phone_day/i.test(msg)
          ? 'Já recebemos um cadastro com esse telefone hoje. Aguarde nosso retorno no WhatsApp.'
          : msg,
      );
    }
  };
  return (
    <div className="pg-screen" data-screen-label="P2 Prestador · Cadastro">
      <StatusBar />
      <TopBar onBack={() => go('provider-landing')} title="Cadastro de Prestador" progress={50} />
      <div className="pg-page">
        <div className="pg-page-body">
          <div>
            <div className="pg-h-eyebrow">QUASE LÁ · 2 MIN</div>
            <h1 className="pg-h-title">Vamos te conectar a clientes</h1>
            <p className="pg-h-sub">
              Aprovação manual em até 24 h. Você recebe a confirmação no WhatsApp.
            </p>
          </div>

          <div className="pg-field">
            <span className="pg-label">Nome completo</span>
            <input
              className="pg-input"
              placeholder="Como aparece nos documentos"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>

          <div className="pg-field">
            <span className="pg-label">WhatsApp</span>
            <div className="pg-input-wrap">
              <span className="pg-input-icon">
                <Icon name="whatsapp" size={18} />
              </span>
              <input
                className="pg-input pg-input--with-icon"
                placeholder="(11) 98765-4321"
                value={form.phone}
                onChange={(e) => set({ phone: e.target.value.replace(/[^\d() -]/g, '') })}
              />
            </div>
            <span className="pg-helper">Você recebe pedidos por aqui.</span>
          </div>

          <div className="pg-field">
            <span className="pg-label">Que serviços você presta?</span>
            <div className="pg-stack pg-stack--sm" style={{ marginTop: 4 }}>
              {[
                { id: 'frete', icon: 'truck', t: 'Frete / Mudança' },
                { id: 'guincho', icon: 'tow', t: 'Guincho' },
                { id: 'cacamba', icon: 'dumpster', t: 'Caçamba' },
                { id: 'rodoviario', icon: 'package', t: 'Rodoviário' },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggleService(o.id)}
                  className={`pg-choice${form.services.includes(o.id) ? ' is-active' : ''}`}
                >
                  <span className="pg-choice-bullet is-square" />
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: form.services.includes(o.id)
                        ? 'rgba(255,255,255,0.1)'
                        : 'var(--ink-100)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Icon name={o.icon} size={16} />
                  </span>
                  <div className="pg-choice-body">
                    <div className="pg-choice-title" style={{ fontSize: 15 }}>
                      {o.t}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="pg-field">
            <span className="pg-label">Veículo / Equipamento</span>
            <input
              className="pg-input"
              placeholder="Ex.: Caminhão baú 5T, ano 2018"
              value={form.vehicle}
              onChange={(e) => set({ vehicle: e.target.value })}
            />
          </div>

          <div className="pg-field">
            <span className="pg-label">Regiões que atende</span>
            <textarea
              className="pg-textarea"
              placeholder="Ex.: São Paulo capital e Grande SP"
              value={form.regions}
              onChange={(e) => set({ regions: e.target.value })}
            />
          </div>

          <label
            style={{
              display: 'flex',
              gap: 10,
              fontSize: 13,
              color: 'var(--text-soft)',
              lineHeight: 1.5,
            }}
          >
            <input type="checkbox" defaultChecked style={{ marginTop: 4 }} />
            <span>
              Concordo com os{' '}
              <a href="#/termos" style={{ color: 'var(--green-700)', textDecoration: 'underline' }}>
                termos de uso
              </a>{' '}
              e{' '}
              <a
                href="#/privacidade"
                style={{ color: 'var(--green-700)', textDecoration: 'underline' }}
              >
                política de privacidade
              </a>
              . Sei que aprovação é manual.
            </span>
          </label>
        </div>
        <div className="pg-page-foot">
          {status === 'err' && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--orange-600)',
                background: 'var(--orange-50)',
                border: '1px solid rgba(255,122,26,0.3)',
                borderRadius: 8,
                padding: '8px 10px',
                marginBottom: 10,
              }}
            >
              {errorMsg}
            </div>
          )}
          <button
            className="pg-btn pg-btn--primary pg-btn--block"
            disabled={!valid || status === 'sending'}
            onClick={submit}
          >
            {status === 'sending' ? 'Enviando…' : 'Enviar cadastro'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProviderConfirm = ({ go }: ScreenProps) => (
  <div className="pg-screen" data-screen-label="P3 Prestador · Confirmação">
    <StatusBar />
    <TopBar transparent />
    <div className="pg-viewport">
      <div style={{ padding: '8px 24px 24px', textAlign: 'center' }}>
        <div className="pg-anim-in" style={{ display: 'inline-block' }}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="34" className="pg-check-circle" />
            <path d="M22 37 l10 10 l18 -22" className="pg-check-path" />
          </svg>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '16px 0 6px' }}>Cadastro recebido</h1>
        <p style={{ color: 'var(--text-soft)', maxWidth: '32ch', margin: '0 auto' }}>
          Nossa equipe valida seus dados em até 24 h. Você recebe a confirmação no WhatsApp{' '}
          <span className="pg-mono pg-bold">cadastrado</span>.
        </p>
      </div>
      <div style={{ padding: '0 20px 24px' }}>
        <div className="pg-card pg-card--padded">
          <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 12 }}>
            ENQUANTO AGUARDA
          </div>
          <div className="pg-stack pg-stack--sm">
            {[
              'Tenha CNH e documento do veículo em mãos',
              'Prepare 2 fotos: do veículo e da placa',
              'Decida sua faixa de preço por km',
            ].map((t, i) => (
              <div key={i} className="pg-row" style={{ gap: 10 }}>
                <span style={{ color: 'var(--green-700)' }}>
                  <Icon name="check" size={16} strokeWidth={2.5} />
                </span>
                <span style={{ fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="pg-btn pg-btn--accent pg-btn--block">
          <Icon name="whatsapp" size={18} /> Falar com suporte no WhatsApp
        </button>
        <button className="pg-btn pg-btn--ghost pg-btn--block" onClick={() => go('landing')}>
          Voltar ao início
        </button>
      </div>
    </div>
  </div>
);

// =====================================================================
// PROVIDER DASHBOARD (mobile)
// =====================================================================
type OrderTab = 'new' | 'pending' | 'accepted';
const ProviderDash = ({ go }: ScreenProps) => {
  const [tab, setTab] = useStateP<OrderTab>('new');
  type Order = {
    id: string;
    svc: string;
    route: string;
    when: string;
    km?: number;
    price?: string;
    proposal?: string;
    client?: string;
    state?: string;
    new?: boolean;
    urgent?: boolean;
  };
  const orders: Record<OrderTab, Order[]> = {
    new: [
      {
        id: '1247',
        svc: 'Frete',
        route: 'Centro → Guarulhos',
        km: 18,
        when: 'Hoje 14:00',
        price: 'R$ 220–280',
        new: true,
        urgent: false,
      },
      {
        id: '1248',
        svc: 'Frete',
        route: 'Pinheiros → Osasco',
        km: 12,
        when: 'Amanhã 09:00',
        price: 'R$ 180–230',
        new: true,
      },
      {
        id: '1249',
        svc: 'Guincho',
        route: 'Faria Lima · SUV',
        km: 8,
        when: 'AGORA',
        price: 'R$ 180–250',
        urgent: true,
      },
    ],
    pending: [
      {
        id: '1240',
        svc: 'Frete',
        route: 'Vila Madalena → Mooca',
        km: 14,
        when: '27/04 16:00',
        proposal: 'R$ 280',
        state: 'Cliente avaliando · 3 propostas',
      },
    ],
    accepted: [
      {
        id: '1235',
        svc: 'Guincho',
        route: 'Av. 23 de Maio',
        when: 'Amanhã 14:00',
        price: 'R$ 230',
        client: 'João Silva · (11) 98765-4321',
      },
    ],
  };
  return (
    <div className="pg-screen" data-screen-label="P4 Prestador · Dashboard">
      <StatusBar />
      {/* Header */}
      <div
        style={{
          background: 'var(--night-900)',
          color: '#fff',
          padding: '14px 20px 16px',
          flexShrink: 0,
        }}
      >
        <div className="pg-row pg-row--between">
          <div>
            <div
              className="pg-mono"
              style={{
                fontSize: 11,
                letterSpacing: '0.16em',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
              }}
            >
              OLÁ, JOSÉ
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>JM Transportes</div>
          </div>
          <div className="pg-row" style={{ gap: 8 }}>
            <span className="pg-tag pg-tag--green">
              <span
                style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green-600)' }}
              />
              Disponível
            </span>
            <button className="pg-iconbtn is-dark" onClick={() => go('landing')} aria-label="Sair">
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 10,
            marginTop: 16,
          }}
        >
          {[
            ['3', 'novos pedidos'],
            ['1', 'aguardando'],
            ['R$ 4.2k', 'este mês'],
          ].map(([n, l], i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              <div className="pg-mono" style={{ fontSize: 22, fontWeight: 700 }}>
                {n}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '16px 20px 0', background: 'var(--bg)', flexShrink: 0 }}>
        <div className="pg-segmented">
          {(
            [
              ['new', `Novos (${orders.new.length})`],
              ['pending', `Aguardando (${orders.pending.length})`],
              ['accepted', `Aceitos (${orders.accepted.length})`],
            ] as ReadonlyArray<readonly [OrderTab, string]>
          ).map(([id, t]) => (
            <button
              key={id}
              className={`pg-segmented-item${tab === id ? ' is-active' : ''}`}
              onClick={() => setTab(id)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="pg-viewport">
        <div
          style={{ padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {orders[tab].map((o) => (
            <div key={o.id} className="pg-card pg-card--padded">
              <div className="pg-row pg-row--between">
                <div className="pg-row" style={{ gap: 8 }}>
                  <span className="pg-tag pg-tag--outline pg-mono">#{o.id}</span>
                  <span className="pg-tag" style={{ background: 'var(--ink-100)' }}>
                    {o.svc}
                  </span>
                  {o.urgent && <span className="pg-tag pg-tag--orange">URGENTE</span>}
                  {o.new && !o.urgent && <span className="pg-tag pg-tag--green">NOVO</span>}
                </div>
                <span style={{ color: 'var(--text-mute)', fontSize: 12 }}>
                  {o.km && `${o.km} km`}
                </span>
              </div>
              <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600 }}>{o.route}</div>
              <div
                className="pg-row"
                style={{ gap: 12, marginTop: 6, fontSize: 13, color: 'var(--text-soft)' }}
              >
                <span>
                  <Icon name="clock" size={13} /> {o.when}
                </span>
              </div>
              {tab === 'new' && (
                <>
                  <div
                    className="pg-row pg-row--between"
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: '1px dashed var(--border-strong)',
                    }}
                  >
                    <div>
                      <div className="pg-h-eyebrow" style={{ margin: 0 }}>
                        CLIENTE ESPERA
                      </div>
                      <div
                        className="pg-mono"
                        style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}
                      >
                        {o.price}
                      </div>
                    </div>
                    <button className="pg-btn pg-btn--primary pg-btn--sm">Ver detalhes</button>
                  </div>
                  <div className="pg-row" style={{ marginTop: 12, gap: 8 }}>
                    <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ flex: 1 }}>
                      Recusar
                    </button>
                    <button className="pg-btn pg-btn--accent pg-btn--sm" style={{ flex: 2 }}>
                      Enviar proposta
                    </button>
                  </div>
                </>
              )}
              {tab === 'pending' && (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: '1px dashed var(--border-strong)',
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>Sua proposta</div>
                  <div className="pg-row pg-row--between" style={{ marginTop: 4 }}>
                    <div className="pg-mono" style={{ fontSize: 18, fontWeight: 700 }}>
                      {o.proposal}
                    </div>
                    <span className="pg-tag pg-tag--outline">{o.state}</span>
                  </div>
                </div>
              )}
              {tab === 'accepted' && (
                <>
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: '1px dashed var(--border-strong)',
                    }}
                  >
                    <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>{o.client}</div>
                    <div
                      className="pg-mono"
                      style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}
                    >
                      {o.price}
                    </div>
                  </div>
                  <div className="pg-row" style={{ marginTop: 12, gap: 8 }}>
                    <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ flex: 1 }}>
                      <Icon name="phone" size={16} /> Ligar
                    </button>
                    <button className="pg-btn pg-btn--primary pg-btn--sm" style={{ flex: 1 }}>
                      <Icon name="navigation" size={16} /> Navegar
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// ADMIN DASHBOARD (desktop-style, but rendered in phone for demo)
// =====================================================================
const AdminDash = ({ go }: ScreenProps) => {
  return (
    <div className="pg-screen" data-screen-label="A1 Admin · Dashboard">
      <StatusBar />
      <div style={{ background: 'var(--night-900)', color: '#fff', padding: '12px 20px 14px' }}>
        <div className="pg-row pg-row--between">
          <Logo dark size={14} />
          <div className="pg-row" style={{ gap: 8 }}>
            <span
              className="pg-tag pg-tag--dark"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}
            >
              ADMIN
            </span>
            <button className="pg-iconbtn is-dark" onClick={() => go('landing')}>
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </div>
      <div className="pg-viewport">
        <div style={{ padding: '20px 20px 16px' }}>
          <div className="pg-h-eyebrow">HOJE · 27 ABRIL</div>
          <h1 className="pg-h-title">Painel de operações</h1>
        </div>

        {/* KPIs */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { n: '15', l: 'Pedidos', d: '+3 vs. ontem', up: true },
              { n: '8', l: 'Orçando', d: 'tempo médio 42min', up: null },
              { n: '5', l: 'Fechados', d: 'Conv. 33%', up: true },
              { n: '38', l: 'Prestadores', d: 'ativos hoje', up: null },
            ].map((k, i) => (
              <div key={i} className="pg-card pg-card--padded">
                <div className="pg-h-eyebrow" style={{ margin: 0 }}>
                  {k.l}
                </div>
                <div
                  className="pg-mono"
                  style={{ fontSize: 30, fontWeight: 700, marginTop: 6, letterSpacing: '-0.02em' }}
                >
                  {k.n}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: k.up ? 'var(--green-700)' : 'var(--text-mute)',
                    marginTop: 4,
                  }}
                >
                  {k.up && '↗ '}
                  {k.d}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mini chart */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="pg-card pg-card--padded">
            <div className="pg-row pg-row--between" style={{ marginBottom: 12 }}>
              <div>
                <div className="pg-h-eyebrow" style={{ margin: 0 }}>
                  PEDIDOS · 7 DIAS
                </div>
                <div className="pg-mono" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                  87 <span style={{ fontSize: 14, color: 'var(--text-mute)' }}>total</span>
                </div>
              </div>
              <span className="pg-tag pg-tag--green">+22%</span>
            </div>
            <svg viewBox="0 0 280 80" style={{ width: '100%', height: 80, display: 'block' }}>
              <path
                d="M0 60 L40 50 L80 55 L120 35 L160 40 L200 25 L240 28 L280 15"
                fill="none"
                stroke="var(--green-600)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M0 60 L40 50 L80 55 L120 35 L160 40 L200 25 L240 28 L280 15 L280 80 L0 80 Z"
                fill="url(#g)"
                opacity="0.2"
              />
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--green-500)" />
                  <stop offset="1" stopColor="var(--green-500)" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            <div
              className="pg-row pg-row--between"
              style={{
                marginTop: 6,
                fontSize: 11,
                color: 'var(--text-mute)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span>21/4</span>
              <span>27/4</span>
            </div>
          </div>
        </div>

        {/* Active orders */}
        <div style={{ padding: '0 20px 16px' }}>
          <div className="pg-row pg-row--between" style={{ marginBottom: 10 }}>
            <div className="pg-h-eyebrow">SOLICITAÇÕES EM ABERTO</div>
            <button className="pg-iconbtn">
              <Icon name="filter" size={18} />
            </button>
          </div>
          <div className="pg-stack pg-stack--sm">
            {[
              {
                id: '1247',
                svc: 'Frete',
                route: 'SP Centro → Guarulhos',
                km: 18,
                price: 'R$ 220–280',
                state: '3 prestadores visualizaram',
                time: '15:42',
                urgent: false,
              },
              {
                id: '1246',
                svc: 'Guincho',
                route: 'Vila Mariana · Carro médio',
                km: 6,
                price: 'R$ 180–250',
                state: '5 notificados · 2 propostas',
                time: '15:38',
                urgent: true,
              },
              {
                id: '1245',
                svc: 'Caçamba',
                route: 'Itaim · 5m³ · 3 dias',
                km: 4,
                price: 'R$ 350',
                state: 'FECHADO · João Transportes',
                time: '14:20',
                closed: true,
              },
              {
                id: '1244',
                svc: 'Frete',
                route: 'Tatuapé → Santo André',
                km: 11,
                price: 'R$ 200–260',
                state: 'Aguardando 3 propostas',
                time: '13:50',
              },
            ].map((o) => (
              <div key={o.id} className="pg-card pg-card--padded">
                <div className="pg-row pg-row--between">
                  <div className="pg-row" style={{ gap: 8 }}>
                    <span className="pg-tag pg-tag--outline pg-mono">#{o.id}</span>
                    <span className="pg-tag">{o.svc}</span>
                    {o.urgent && <span className="pg-tag pg-tag--orange">URGENTE</span>}
                    {o.closed && <span className="pg-tag pg-tag--green">FECHADO</span>}
                  </div>
                  <span className="pg-mono" style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                    {o.time}
                  </span>
                </div>
                <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600 }}>{o.route}</div>
                <div
                  className="pg-row pg-row--between"
                  style={{ marginTop: 6, fontSize: 12, color: 'var(--text-soft)' }}
                >
                  <span>{o.state}</span>
                  <span className="pg-mono pg-bold">{o.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 20px 32px' }}>
          <div className="pg-row" style={{ gap: 10 }}>
            <button className="pg-btn pg-btn--ghost" style={{ flex: 1 }}>
              <Icon name="users" size={18} /> Prestadores
            </button>
            <button className="pg-btn pg-btn--ghost" style={{ flex: 1 }}>
              <Icon name="chart" size={18} /> Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// HOW IT WORKS
// =====================================================================
const HowItWorks = ({ go }: ScreenProps) => (
  <div className="pg-screen" data-screen-label="09 Como funciona">
    <StatusBar />
    <TopBar onBack={() => go('landing')} title="Como funciona" />
    <div className="pg-viewport">
      <div style={{ padding: '20px 20px 32px' }}>
        <h1 className="pg-h-title" style={{ marginTop: 0 }}>
          Diferente de pedir um Uber
        </h1>
        <p className="pg-h-sub">
          A PAGORA conecta você a prestadores que avaliam seu pedido antes de aceitar — por isso
          você recebe propostas reais, não estimativas que viram surpresa no dia.
        </p>

        <div className="pg-stack pg-stack--lg" style={{ marginTop: 24 }}>
          {[
            {
              n: '01',
              t: 'Você descreve o serviço',
              s: 'Tipo de carga, andar, elevador, urgência. Tudo o que afeta o trabalho.',
              icon: 'doc',
            },
            {
              n: '02',
              t: 'Prestadores avaliam',
              s: 'Em até 2 horas, profissionais verificados decidem se topam — sem matching automático.',
              icon: 'users',
            },
            {
              n: '03',
              t: 'Você recebe propostas',
              s: 'No WhatsApp. Cada uma com valor final, horário e dados do prestador.',
              icon: 'whatsapp',
            },
            {
              n: '04',
              t: 'Compara e contrata',
              s: 'Negocia direto com quem te atende. Pagamento direto.',
              icon: 'money',
            },
          ].map((it, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 14 }}>
              <div>
                <span
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: 'var(--night-900)',
                    color: 'var(--green-500)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Icon name={it.icon} size={20} />
                </span>
                <div
                  className="pg-mono"
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: 'var(--text-mute)',
                    textAlign: 'center',
                  }}
                >
                  {it.n}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{it.t}</div>
                <p
                  style={{
                    margin: '6px 0 0',
                    color: 'var(--text-soft)',
                    fontSize: 14,
                    lineHeight: 1.55,
                  }}
                >
                  {it.s}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="pg-card pg-card--soft" style={{ marginTop: 28, display: 'flex', gap: 12 }}>
          <span style={{ color: 'var(--orange-600)' }}>
            <Icon name="info" size={18} />
          </span>
          <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>
            <strong style={{ color: 'var(--text)' }}>Tempo realista:</strong> primeira proposta em
            15 min – 2 h. Fechamento médio em 4 h. Para urgências, marque como “Hoje”.
          </div>
        </div>

        <button
          className="pg-btn pg-btn--primary pg-btn--block pg-btn--lg"
          style={{ marginTop: 24 }}
          onClick={() => go('services')}
        >
          Solicitar orçamentos
        </button>
      </div>
    </div>
  </div>
);

export { ProviderLanding, ProviderSignup, ProviderConfirm, ProviderDash, AdminDash, HowItWorks };
