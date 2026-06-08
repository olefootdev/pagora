import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './icons';
import type { ScreenProps } from './types';
import { supabase } from './lib/supabase';
import { track } from './lib/analytics';

// =====================================================================
// Status bar (visual only, inside the phone frame)
// =====================================================================
export const StatusBar = ({ dark = false }: { dark?: boolean }) => (
  <div className={`pg-status${dark ? ' is-dark' : ''}`}>
    <span className="pg-mono">9:41</span>
    <span className="pg-status-icons">
      <Icon name="signal" size={16} />
      <Icon name="wifi" size={16} />
      <Icon name="battery-status" size={20} />
    </span>
  </div>
);

// =====================================================================
// Logo
// =====================================================================
export const Logo = ({ dark = false, size = 18 }: { dark?: boolean; size?: number }) => (
  <span className={`pg-logo${dark ? ' is-dark' : ''}`}>
    <span className="pg-logo-mark">
      <Icon name="logo" size={size} />
    </span>
    <span className="pg-logo-text">PAGORA</span>
  </span>
);

// =====================================================================
// Reusable: Top bar
// =====================================================================
type TopBarProps = {
  title?: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
  dark?: boolean;
  transparent?: boolean;
  progress?: number;
};

export const TopBar = ({
  title,
  onBack,
  right,
  dark = false,
  transparent = false,
  progress,
}: TopBarProps) => (
  <>
    <div className={`pg-topbar${transparent ? ' is-transparent' : ''}${dark ? ' is-dark' : ''}`}>
      <div className="pg-row" style={{ gap: 4 }}>
        {onBack ? (
          <button
            className={`pg-iconbtn${dark ? ' is-dark' : ''}`}
            onClick={onBack}
            aria-label="Voltar"
          >
            <Icon name="arrow-left" />
          </button>
        ) : (
          <span style={{ width: 8 }} />
        )}
        {title && <span className="pg-topbar-title">{title}</span>}
      </div>
      <div className="pg-row" style={{ gap: 4 }}>
        {right}
      </div>
    </div>
    {typeof progress === 'number' && (
      <div className="pg-progress" aria-hidden="true">
        <div
          className="pg-progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    )}
  </>
);

// =====================================================================
// MAP PREVIEW — hero map enxuto pra Landing (não é o ProvidersMap real)
// =====================================================================
const MapPreview = () => (
  <div
    style={{
      position: 'relative',
      width: '100%',
      height: 260,
      overflow: 'hidden',
      background: '#F5F1E8',
    }}
    aria-hidden="true"
  >
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 390 260"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: 'block' }}
    >
      <defs>
        <filter id="mapPreviewShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* base land */}
      <rect width="390" height="260" fill="#F5F1E8" />

      {/* residential blocks */}
      <rect x="0" y="0" width="195" height="90" fill="#EFEAD8" opacity="0.55" />
      <rect x="195" y="170" width="195" height="90" fill="#EFEAD8" opacity="0.55" />

      {/* WATER — rio diagonal */}
      <path
        d="M -10 40 Q 80 20, 160 60 T 320 80 L 410 75 L 410 105 Q 330 110, 240 85 T 80 75 L -10 85 Z"
        fill="#A8D5F0"
      />

      {/* parques */}
      <ellipse cx="290" cy="180" rx="55" ry="38" fill="#C8E6C9" />
      <ellipse cx="60" cy="215" rx="38" ry="26" fill="#C8E6C9" />

      {/* ROAD CASING + FILL — horizontais */}
      <path d="M -10 135 L 410 135" stroke="#D89940" strokeWidth="14" />
      <path d="M -10 135 L 410 135" stroke="#FFB74D" strokeWidth="11" />
      <path d="M -10 190 L 410 190" stroke="#E5C66B" strokeWidth="11" />
      <path d="M -10 190 L 410 190" stroke="#FFE082" strokeWidth="8.5" />
      <path d="M -10 105 L 410 105" stroke="#E0DCD0" strokeWidth="7" />
      <path d="M -10 105 L 410 105" stroke="#fff" strokeWidth="5" />
      <path d="M -10 230 L 410 230" stroke="#E0DCD0" strokeWidth="6" />
      <path d="M -10 230 L 410 230" stroke="#fff" strokeWidth="4.5" />

      {/* ROAD verticais */}
      <path d="M 195 -10 L 195 270" stroke="#D89940" strokeWidth="14" />
      <path d="M 195 -10 L 195 270" stroke="#FFB74D" strokeWidth="11" />
      <path d="M 80 -10 L 80 270" stroke="#E5C66B" strokeWidth="10" />
      <path d="M 80 -10 L 80 270" stroke="#FFE082" strokeWidth="7.5" />
      <path d="M 310 -10 L 310 270" stroke="#E5C66B" strokeWidth="10" />
      <path d="M 310 -10 L 310 270" stroke="#FFE082" strokeWidth="7.5" />

      {/* USER LOCATION — Google-style blue dot pulsando */}
      <g transform="translate(195 135)">
        <circle r="28" fill="#4285F4" opacity="0.18">
          <animate attributeName="r" from="14" to="36" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.35" to="0" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle r="9" fill="#4285F4" stroke="#fff" strokeWidth="3" />
      </g>

      {/* 3 provider pins próximos — verde (frete) / laranja (guincho) / roxo (caçamba) */}
      <g transform="translate(120 95)" filter="url(#mapPreviewShadow)">
        <circle r="13" fill="#0FA77A" stroke="#fff" strokeWidth="2.5" />
        <text
          textAnchor="middle"
          y="3.5"
          fontFamily="JetBrains Mono, monospace"
          fontSize="9"
          fontWeight="700"
          fill="#fff"
        >
          JM
        </text>
      </g>
      <g transform="translate(286 65)" filter="url(#mapPreviewShadow)">
        <circle r="13" fill="#F26B1F" stroke="#fff" strokeWidth="2.5" />
        <text
          textAnchor="middle"
          y="3.5"
          fontFamily="JetBrains Mono, monospace"
          fontSize="9"
          fontWeight="700"
          fill="#fff"
        >
          AS
        </text>
      </g>
      <g transform="translate(260 210)" filter="url(#mapPreviewShadow)">
        <circle r="13" fill="#7E57C2" stroke="#fff" strokeWidth="2.5" />
        <text
          textAnchor="middle"
          y="3.5"
          fontFamily="JetBrains Mono, monospace"
          fontSize="9"
          fontWeight="700"
          fill="#fff"
        >
          LC
        </text>
      </g>
    </svg>

    {/* Gradient overlay — fade do topo + fusão com night-900 no bottom */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(to bottom, rgba(7,14,26,0.35) 0%, rgba(7,14,26,0) 25%, rgba(7,14,26,0) 55%, rgba(7,14,26,0.85) 88%, var(--night-900) 100%)',
        pointerEvents: 'none',
      }}
    />

    {/* Chip "Ao vivo" — top-left */}
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 16,
        background: 'rgba(255,255,255,0.95)',
        color: 'var(--night-900)',
        borderRadius: 999,
        padding: '5px 10px 5px 8px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#0FA77A',
          boxShadow: '0 0 0 4px rgba(15,167,122,0.2)',
        }}
      />
      <span>3 prestadores próximos</span>
    </div>
  </div>
);

// =====================================================================
// WAITLIST CAPTURE — captura email/telefone na Landing antes do OTP
// =====================================================================
const WaitlistCapture = () => {
  const [contact, setContact] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = contact.trim();
    if (!c || status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const isEmail = c.includes('@');
      const payload = {
        email: isEmail ? c : null,
        phone: isEmail ? null : c,
        city: city.trim() || null,
        source: 'landing',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
      };
      const { error } = await supabase.from('waitlist').insert(payload);
      if (error) throw error;
      track('email_capturado', { origem: 'landing' });
      setStatus('ok');
    } catch (err) {
      setStatus('err');
      const msg = err instanceof Error ? err.message : 'Tente novamente';
      // Mensagem amigável pra duplicado (constraint unique)
      setErrorMsg(/duplicate|unique/i.test(msg) ? 'Esse contato já está na lista.' : msg);
    }
  };

  if (status === 'ok') {
    return (
      <div style={{ padding: '0 20px 28px' }}>
        <div
          style={{
            background: 'rgba(34,227,163,0.08)',
            border: '1px solid rgba(34,227,163,0.3)',
            borderRadius: 14,
            padding: 18,
            color: '#fff',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ color: 'var(--green-500)', flexShrink: 0, marginTop: 2 }}>
            <Icon name="check" size={18} strokeWidth={3} />
          </span>
          <div>
            <strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>
              Você está na lista.
            </strong>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
              Avisaremos por WhatsApp / email quando a PAGORA estiver ativa na sua região.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 20px 28px' }}>
      <div
        style={{
          background: 'var(--night-800)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: 18,
        }}
      >
        <div className="pg-tag pg-tag--dark" style={{ background: 'rgba(34,227,163,0.12)' }}>
          AINDA NÃO ATIVO NA SUA CIDADE?
        </div>
        <h3 style={{ margin: '10px 0 6px', fontSize: 17, fontWeight: 700, color: '#fff' }}>
          Avise quando chegar
        </h3>
        <p style={{ margin: '0 0 14px', color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
          Deixe email ou WhatsApp + cidade. Avisamos no dia que a PAGORA abrir aí.
        </p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            className="pg-input"
            type="text"
            placeholder="Email ou WhatsApp"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            autoComplete="email"
            inputMode="email"
            required
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderColor: 'rgba(255,255,255,0.16)',
              color: '#fff',
            }}
          />
          <input
            className="pg-input"
            type="text"
            placeholder="Cidade / região"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            autoComplete="address-level2"
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderColor: 'rgba(255,255,255,0.16)',
              color: '#fff',
            }}
          />
          <button
            type="submit"
            className="pg-btn pg-btn--accent pg-btn--block"
            disabled={status === 'sending' || !contact.trim()}
            style={{ marginTop: 4 }}
          >
            {status === 'sending' ? 'Enviando…' : 'Quero ser avisado'}
          </button>
          {status === 'err' && (
            <div style={{ fontSize: 12, color: '#FF8A8A', marginTop: 4 }}>{errorMsg}</div>
          )}
        </form>
      </div>
    </div>
  );
};

// =====================================================================
// LANDING
// =====================================================================
export const Landing = ({ go }: ScreenProps) => (
  <div className="pg-screen is-dark" data-screen-label="01 Landing">
    <StatusBar dark />
    <div className="pg-topbar is-dark is-transparent" style={{ borderBottom: 'none' }}>
      <Logo dark />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="pg-btn pg-btn--sm"
          style={{
            background: 'var(--green-500)',
            color: 'var(--night-900)',
            border: 'none',
            height: 36,
            fontWeight: 700,
          }}
          onClick={() => go('home')}
        >
          Entrar
        </button>
        <button
          className="pg-btn pg-btn--sm"
          style={{
            background: 'transparent',
            color: '#fff',
            borderColor: 'rgba(255,255,255,0.16)',
            height: 36,
          }}
          onClick={() => go('provider-landing')}
        >
          Sou prestador
        </button>
      </div>
    </div>

    <div className="pg-viewport" style={{ background: 'var(--night-900)', color: '#fff' }}>
      {/* HERO — Map first */}
      <MapPreview />
      <div style={{ padding: '20px 20px 28px', position: 'relative' }}>
        <div
          className="pg-mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--green-500)',
            marginBottom: 10,
          }}
        >
          PRESTADORES PERTO DE VOCÊ
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 34,
            lineHeight: 1.05,
            letterSpacing: '-0.025em',
            fontWeight: 700,
            textWrap: 'balance',
          }}
        >
          Frete, guincho e caçamba com{' '}
          <span style={{ color: 'var(--green-500)' }}>orçamento transparente</span>.
        </h1>
        <p
          style={{
            margin: '14px 0 0',
            color: 'rgba(255,255,255,0.72)',
            fontSize: 15,
            lineHeight: 1.55,
            maxWidth: '32ch',
          }}
        >
          Você descreve, prestadores verificados respondem em até 2h, você compara e escolhe.
        </p>

        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="pg-btn pg-btn--accent pg-btn--block pg-btn--lg"
            onClick={() => go('services')}
          >
            Solicitar orçamentos
            <Icon name="arrow-right" size={18} />
          </button>
          <button
            className="pg-btn pg-btn--block"
            style={{
              background: 'transparent',
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.16)',
            }}
            onClick={() => go('how')}
          >
            Como funciona
          </button>
        </div>

        {/* trust strip */}
        <div
          style={{
            marginTop: 24,
            padding: '16px 0',
            borderTop: '1px dashed rgba(255,255,255,0.12)',
            borderBottom: '1px dashed rgba(255,255,255,0.12)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
          }}
        >
          {[
            { icon: 'shield', t: 'Prestadores', s: 'verificados' },
            { icon: 'clock', t: 'Resposta', s: 'em até 2h' },
            { icon: 'money', t: 'Preço base', s: 'transparente' },
          ].map((it, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: 'var(--green-500)' }}>
                <Icon name={it.icon} size={20} />
              </span>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{it.t}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{it.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* WAITLIST — captura pré-OTP */}
      <WaitlistCapture />

      {/* SERVICES */}
      <div style={{ padding: '8px 20px 28px' }}>
        <div
          className="pg-mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 14,
          }}
        >
          SERVIÇOS DISPONÍVEIS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { id: 'frete', icon: 'truck', t: 'Frete', s: 'Mudanças, cargas, móveis' },
            { id: 'guincho', icon: 'tow', t: 'Guincho', s: 'Pane, acidente, remoção' },
            { id: 'cacamba', icon: 'dumpster', t: 'Caçamba', s: 'Entulho, demolição, terra' },
            { id: 'rodoviario', icon: 'package', t: 'Rodoviário', s: 'Cargas entre cidades' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => go('services', { preselect: s.id })}
              style={{
                background: 'var(--night-800)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
                borderRadius: 14,
                padding: 16,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(34,227,163,0.12)',
                  color: 'var(--green-500)',
                }}
              >
                <Icon name={s.icon} size={22} />
              </span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{s.t}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                  {s.s}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* HOW */}
      <div style={{ padding: '8px 20px 32px' }}>
        <div
          className="pg-mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 14,
          }}
        >
          COMO FUNCIONA
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              n: '01',
              t: 'Descreva o serviço',
              s: 'Tipo de carga, andares, urgência. Levamos a sério o contexto.',
            },
            {
              n: '02',
              t: 'Receba propostas',
              s: 'Prestadores avaliam e enviam orçamento via WhatsApp em até 2h.',
            },
            {
              n: '03',
              t: 'Compare e escolha',
              s: 'Negocie diretamente. Pagamento direto com o prestador.',
            },
          ].map((it, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 14,
                padding: '14px 4px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span
                className="pg-mono"
                style={{ fontSize: 14, color: 'var(--green-500)', fontWeight: 700 }}
              >
                {it.n}
              </span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{it.t}</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                  {it.s}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SOCIAL PROOF */}
      <div
        style={{
          margin: '8px 20px 24px',
          padding: 18,
          background: 'rgba(34,227,163,0.06)',
          border: '1px solid rgba(34,227,163,0.2)',
          borderRadius: 14,
        }}
      >
        <div className="pg-row" style={{ gap: 8, color: 'var(--green-500)' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Icon key={i} name="star" size={14} />
          ))}
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, marginLeft: 4 }}>
            4,8/5 · 1.247 serviços
          </span>
        </div>
        <p
          style={{
            margin: '10px 0 0',
            color: 'rgba(255,255,255,0.8)',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          “Recebi 4 propostas em 40 minutos. Comparei e fechei R$ 60 abaixo do que ia pagar antes.”
        </p>
        <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
          Mariana T. — mudança em SP
        </div>
      </div>

      {/* PROVIDER CTA */}
      <div style={{ padding: '0 20px 32px' }}>
        <div
          style={{
            background: 'var(--night-800)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: 18,
          }}
        >
          <div className="pg-tag pg-tag--dark" style={{ background: 'rgba(34,227,163,0.12)' }}>
            PRESTADORES
          </div>
          <h3 style={{ margin: '10px 0 6px', fontSize: 18, fontWeight: 700 }}>
            Tem caminhão, guincho ou caçamba?
          </h3>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>
            Cadastre-se grátis. Receba pedidos qualificados pelo WhatsApp.
          </p>
          <button
            className="pg-btn pg-btn--accent pg-btn--block"
            style={{ marginTop: 14 }}
            onClick={() => go('provider-landing')}
          >
            Cadastrar como prestador
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <div
        style={{
          padding: '16px 20px 28px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 12,
        }}
      >
        <div className="pg-row pg-row--between">
          <Logo dark size={14} />
          <span>v1.0 · Brasil</span>
        </div>
        <div style={{ marginTop: 10 }}>© 2026 PAGORA. Pagamento direto com prestador.</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 16 }}>
          <button
            onClick={() => go('privacidade')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 12,
              fontFamily: 'inherit',
              textDecoration: 'underline',
            }}
          >
            Privacidade
          </button>
          <button
            onClick={() => go('termos')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 12,
              fontFamily: 'inherit',
              textDecoration: 'underline',
            }}
          >
            Termos
          </button>
        </div>
      </div>
    </div>
  </div>
);

// =====================================================================
// SERVICE PICKER
// =====================================================================
export const SERVICES = [
  {
    id: 'frete',
    icon: 'truck',
    t: 'Frete / Mudança',
    s: 'Móveis, caixas, cargas em geral',
    available: true,
  },
  {
    id: 'guincho',
    icon: 'tow',
    t: 'Guincho',
    s: 'Pane, acidente, falta de combustível',
    available: true,
  },
  {
    id: 'cacamba',
    icon: 'dumpster',
    t: 'Caçamba / Entulho',
    s: 'Construção, demolição, jardim',
    available: true,
  },
  {
    id: 'rodoviario',
    icon: 'package',
    t: 'Transporte rodoviário',
    s: 'Cargas entre cidades',
    available: false,
  },
];

export const ServicePicker = ({ go, preselect }: ScreenProps & { preselect?: string }) => {
  const [sel, setSel] = useState(preselect || null);
  return (
    <div className="pg-screen" data-screen-label="02 Selecionar serviço">
      <StatusBar />
      <TopBar onBack={() => go('landing')} title="" />
      <div className="pg-page">
        <div className="pg-page-body">
          <div>
            <div className="pg-h-eyebrow">PASSO 1 DE 5</div>
            <h1 className="pg-h-title">Que serviço você precisa?</h1>
            <p className="pg-h-sub">
              Cada serviço tem perguntas específicas para um orçamento mais preciso.
            </p>
          </div>

          <div className="pg-stack">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                disabled={!s.available}
                onClick={() => setSel(s.id)}
                className={`pg-tile${sel === s.id ? ' is-active' : ''}`}
                style={{ opacity: s.available ? 1 : 0.5 }}
              >
                <div className="pg-row pg-row--between" style={{ alignItems: 'flex-start' }}>
                  <div className="pg-tile-icon">
                    <Icon name={s.icon} size={22} />
                  </div>
                  {!s.available && <span className="pg-tag pg-tag--outline">Em breve</span>}
                  {sel === s.id && (
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'var(--green-500)',
                        display: 'grid',
                        placeItems: 'center',
                        color: 'var(--night-900)',
                      }}
                    >
                      <Icon name="check" size={14} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div>
                  <div className="pg-tile-title">{s.t}</div>
                  <div className="pg-tile-sub">{s.s}</div>
                </div>
              </button>
            ))}
          </div>

          <div
            className="pg-card pg-card--soft"
            style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
          >
            <span style={{ color: 'var(--text-soft)', marginTop: 2 }}>
              <Icon name="info" size={18} />
            </span>
            <div style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text)' }}>Não é Uber.</strong> Cada serviço pesado tem
              variáveis (acesso, volume, equipamento). Fazemos as perguntas certas para o prestador
              chegar preparado.
            </div>
          </div>
        </div>

        <div className="pg-page-foot">
          <button
            className="pg-btn pg-btn--primary pg-btn--block"
            disabled={!sel}
            onClick={() => {
              if (sel === 'frete') go('frete-1');
              else if (sel === 'guincho') go('guincho-1');
              else if (sel === 'cacamba') go('cacamba-1');
            }}
          >
            Continuar
            <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
