import { Icon } from './icons';
import { StatusBar, TopBar, Logo } from './core';
import type { ScreenProps } from './types';

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
          onClick={() => go('inicio')}
        >
          Solicitar orçamentos
        </button>
      </div>
    </div>
  </div>
);

export { ProviderLanding, HowItWorks };
