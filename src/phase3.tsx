// =====================================================================
// FASE 3 CLIENTE — Pós-serviço
// =====================================================================
import { Icon } from './icons';
import { StatusBar as StatusBarP3 } from './core';
import type { ScreenProps } from './types';

// ---------------------------------------------------------------------
// SERVIÇO CONCLUÍDO — celebratory full-screen
// ---------------------------------------------------------------------
const ServiceDone = ({ go }: ScreenProps) => (
  <div
    className="pg-screen is-dark"
    data-screen-label="C15 Serviço concluído"
    style={{ background: 'var(--night-900)', color: '#fff' }}
  >
    <StatusBarP3 dark />
    <div className="pg-viewport" style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 28,
          textAlign: 'center',
        }}
      >
        {/* confetti dots */}
        <svg
          width="280"
          height="60"
          viewBox="0 0 280 60"
          style={{ marginBottom: 12, opacity: 0.7 }}
        >
          {[...Array(18)].map((_, i) => {
            const colors = ['var(--green-500)', 'var(--orange-600)', '#FBC02D', '#3A6B9C', '#fff'];
            const x = (i * 17 + 8) % 280;
            const y = (i * 13 + 5) % 60;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width="6"
                height="10"
                fill={colors[i % 5]}
                transform={`rotate(${i * 27} ${x + 3} ${y + 5})`}
                rx="1"
              />
            );
          })}
        </svg>

        <div
          className="pg-anim-in"
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            background: 'var(--green-500)',
            display: 'grid',
            placeItems: 'center',
            marginBottom: 24,
          }}
        >
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <path
              d="M14 30 L26 42 L46 18"
              stroke="var(--night-900)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="pg-h-eyebrow" style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          SERVIÇO CONCLUÍDO
        </div>
        <h1
          style={{ fontSize: 30, fontWeight: 700, margin: '8px 0 12px', letterSpacing: '-0.02em' }}
        >
          Tudo certo!
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.5, maxWidth: 300 }}>
          Sua mudança foi entregue às <strong style={{ color: '#fff' }}>16:08</strong>. JM
          Transportes está aguardando sua confirmação.
        </p>

        {/* trip stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12,
            marginTop: 32,
            width: '100%',
            maxWidth: 320,
          }}
        >
          {[
            { k: 'Duração', v: '1h 47', color: 'var(--green-500)' },
            { k: 'Distância', v: '18.4 km', color: '#fff' },
            { k: 'Paradas', v: '2', color: '#fff' },
          ].map((s) => (
            <div
              key={s.k}
              style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '14px 8px',
                textAlign: 'center',
              }}
            >
              <div className="pg-mono" style={{ fontSize: 18, fontWeight: 700, color: s.color }}>
                {s.v}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.5)',
                  marginTop: 4,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {s.k.toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        {/* signature confirmation */}
        <div
          style={{
            marginTop: 28,
            padding: '14px 16px',
            background: 'rgba(34,227,163,0.1)',
            borderRadius: 12,
            border: '1px solid rgba(34,227,163,0.3)',
            fontSize: 12,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="check-circle" size={14} color="rgba(34,227,163,0.8)" /> Recebimento
            confirmado pela sua assinatura digital às 16:09
          </span>
        </div>
      </div>
      <div
        style={{ padding: 16, paddingBottom: 28, display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <button
          className="pg-btn pg-btn--accent pg-btn--lg pg-btn--block"
          onClick={() => go('rate')}
        >
          Avaliar serviço
        </button>
        <button
          className="pg-btn pg-btn--ghost pg-btn--lg pg-btn--block"
          style={{ color: 'rgba(255,255,255,0.7)' }}
          onClick={() => go('receipt')}
        >
          Ver recibo
        </button>
      </div>
    </div>
  </div>
);

export { ServiceDone };
