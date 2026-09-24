import { useState as useStateL, useEffect as useEffectL, lazy, Suspense } from 'react';
import { Icon } from './icons';
import { StatusBar } from './core';
import type { ScreenProps } from './types';
import {
  MOCK_TRACKING,
  MOCK_ROUTE,
  pointAlongRoute,
  haversineKm,
  formatDistance,
} from './lib/geo';

// Leaflet em chunk separado — ver mapa-prestadores.tsx.
const MapaRastreio = lazy(() => import('./mapa-rastreio'));

// =====================================================================
// LOCATOR — localizador completo do prestador a caminho
// =====================================================================
/** Rumo em graus → ponto cardeal abreviado. */
const compassLabel = (deg: number): string => {
  const dirs = ['NORTE', 'NE', 'LESTE', 'SE', 'SUL', 'SO', 'OESTE', 'NO'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8]!;
};

const Locator = ({ go }: ScreenProps) => {
  const [showShare, setShowShare] = useStateL(false);
  const [progress, setProgress] = useStateL(0.32);

  // TODO(banco): trocar por polling de
  //   supabase.rpc('order_tracking', { p_order_id })
  // O tipo OrderTracking já espelha o retorno. A RPC devolve lat/lng exatos,
  // heading, speed_kmh e eta_minutes prontos — este bloco some quase inteiro.
  const tracking = MOCK_TRACKING;

  useEffectL(() => {
    const t = setInterval(() => setProgress((p) => Math.min(0.98, p + 0.005)), 1200);
    return () => clearInterval(t);
  }, []);

  const route = pointAlongRoute(MOCK_ROUTE, progress);
  const destination = { lat: tracking.dest_lat!, lng: tracking.dest_lng! };

  // Distância e ETA derivam da posição real no mapa, não de um contador
  // decrescente. Quando o dado vier da RPC, estes dois valores já chegam
  // calculados no servidor e as duas linhas abaixo saem.
  const distance = route ? haversineKm(route.position, destination) : 0;
  const speed = tracking.speed_kmh ?? 25;
  const eta = Math.max(1, Math.ceil((distance * 1.35) / speed * 60));

  return (
    <div
      className="pg-screen"
      data-screen-label="A19 Localizador do prestador"
      style={{ position: 'relative' }}
    >
      <StatusBar />

      {/* MAPA REAL — ocupa a tela toda, chrome flutua por cima */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {route && (
          <Suspense
            fallback={<div style={{ height: '100%', background: 'var(--ink-100)' }} />}
          >
            <MapaRastreio
              center={destination}
              zoom={14}
              height="100%"
              position={route.position}
              heading={route.heading}
              destination={destination}
              traveled={route.traveled}
              remaining={route.remaining}
            />
          </Suspense>
        )}
      </div>


      {/* TOP CHROME — minimal */}
      <div
        style={{
          position: 'absolute',
          top: 50,
          left: 0,
          right: 0,
          zIndex: 3,
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <button
          onClick={() => go('home')}
          aria-label="Voltar"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            border: 'none',
            background: 'var(--paper)',
            color: 'var(--text)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(7,14,26,0.12)',
          }}
        >
          <Icon name="arrow-left" size={20} />
        </button>
        <div
          style={{
            flex: 1,
            background: 'var(--paper)',
            borderRadius: 14,
            padding: '10px 14px',
            boxShadow: '0 4px 14px rgba(7,14,26,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--green-500)',
              boxShadow: '0 0 0 0 rgba(34,227,163,0.8)',
              animation: 'locPulse 1.6s infinite',
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-mute)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.06em',
              }}
            >
              AO VIVO · #PG-1247
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, marginTop: 1 }}>
              Carlos está a caminho
            </div>
          </div>
        </div>
        <button
          aria-label="Recentralizar"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            border: 'none',
            background: 'var(--night-900)',
            color: 'var(--green-500)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(7,14,26,0.18)',
          }}
        >
          <Icon name="navigation" size={18} />
        </button>
      </div>

      {/* SIDE TELEMETRY — speed + heading */}
      <div
        style={{
          position: 'absolute',
          top: 130,
          right: 16,
          zIndex: 3,
          background: 'var(--paper)',
          borderRadius: 12,
          padding: '10px 12px',
          boxShadow: '0 4px 14px rgba(7,14,26,0.12)',
          textAlign: 'center',
          minWidth: 70,
        }}
      >
        <div
          className="pg-mono"
          style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.01em' }}
        >
          {Math.round(speed)}
        </div>
        <div className="pg-h-eyebrow" style={{ margin: '2px 0 0', fontSize: 8 }}>
          KM/H
        </div>
        <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
        <div style={{ display: 'grid', placeItems: 'center', marginBottom: 2 }}>
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              transform: `rotate(${route?.heading ?? 0}deg)`,
              transition: 'transform 600ms ease-out',
            }}
          >
            <Icon name="navigation" size={16} />
          </span>
        </div>
        <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 8 }}>
          {compassLabel(route?.heading ?? 0)}
        </div>
      </div>

      {/*
        A faixa de "próxima curva" ("Vire à direita na Av. Paulista") foi
        removida: era navegação passo a passo inventada. Produzi-la de verdade
        exige um serviço de rotas pago, e o cliente não precisa disso — ele
        quer saber quando o prestador chega, não por onde ele vai. Quem precisa
        de rota é o prestador, e esse já usa Waze/Maps.
      */}

      {/* BOTTOM SHEET — provider info + actions */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 3,
          background: 'var(--paper)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 30px rgba(7,14,26,0.14)',
          padding: '10px 20px 20px',
        }}
      >
        {/* drag handle */}
        <div
          style={{
            width: 40,
            height: 4,
            background: 'var(--ink-300)',
            borderRadius: 99,
            margin: '0 auto 14px',
          }}
        />

        {/* ETA strip */}
        <div className="pg-row pg-row--between" style={{ marginBottom: 14 }}>
          <div>
            <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>
              CHEGA EM
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
              <span
                className="pg-mono"
                style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}
              >
                {eta}
              </span>
              <span style={{ fontSize: 14, color: 'var(--text-soft)', fontWeight: 600 }}>min</span>
              <span
                className="pg-mono"
                style={{ fontSize: 11, color: 'var(--text-mute)', marginLeft: 6 }}
              >
                · {formatDistance(distance)}
              </span>
            </div>
          </div>
          <span className="pg-tag pg-tag--green" style={{ fontSize: 10 }}>
            NO HORÁRIO
          </span>
        </div>

        {/* progress bar with steps */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              position: 'relative',
              height: 4,
              background: 'var(--ink-100)',
              borderRadius: 99,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${progress * 100}%`,
                background: 'linear-gradient(90deg, var(--green-500), var(--green-600))',
                borderRadius: 99,
                transition: 'width 1s linear',
              }}
            />
            {[0, 0.5, 1].map((p) => (
              <span
                key={p}
                style={{
                  position: 'absolute',
                  top: -4,
                  left: `calc(${p * 100}% - 6px)`,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: progress >= p ? 'var(--green-600)' : 'var(--paper)',
                  border: `2px solid ${progress >= p ? 'var(--green-600)' : 'var(--ink-300)'}`,
                }}
              />
            ))}
          </div>
          <div
            className="pg-row pg-row--between"
            style={{
              marginTop: 8,
              fontSize: 11,
              color: 'var(--text-mute)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
            }}
          >
            <span style={{ color: 'var(--green-700)' }}>SAIU · 09:14</span>
            <span style={{ color: progress >= 0.5 ? 'var(--green-700)' : 'var(--text-mute)' }}>
              NA REGIÃO
            </span>
            <span>CHEGADA</span>
          </div>
        </div>

        {/* provider card */}
        <div
          className="pg-card pg-card--padded"
          style={{ background: 'var(--ink-50)', border: '1px solid var(--border)' }}
        >
          <div className="pg-row" style={{ gap: 12 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 14,
                position: 'relative',
                background: 'var(--night-900)',
                color: 'var(--green-500)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                fontSize: 16,
              }}
            >
              CM
              <span
                style={{
                  position: 'absolute',
                  bottom: -3,
                  right: -3,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'var(--green-500)',
                  border: '2.5px solid var(--paper)',
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pg-row" style={{ gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Carlos M.</span>
                <Icon name="check-circle" size={13} />
              </div>
              <div
                className="pg-row"
                style={{ fontSize: 12, color: 'var(--text-soft)', gap: 6, marginTop: 2 }}
              >
                <Icon name="star" size={11} />
                <span>4,7 · 89 fretes</span>
              </div>
              <div
                className="pg-mono"
                style={{
                  fontSize: 11,
                  color: 'var(--text-mute)',
                  marginTop: 4,
                  letterSpacing: '0.04em',
                }}
              >
                FIAT FIORINO · BRA-2E47 · BRANCO
              </div>
            </div>
          </div>

          {/* actions row */}
          <div className="pg-row" style={{ gap: 6, marginTop: 14 }}>
            <button
              className="pg-btn pg-btn--primary pg-btn--sm"
              onClick={() => go('chat')}
              style={{ flex: 2 }}
            >
              <Icon name="whatsapp" size={15} />
              <span>Mensagem</span>
            </button>
            <button
              className="pg-btn pg-btn--ghost pg-btn--sm"
              aria-label="Ligar"
              style={{ flex: 1 }}
            >
              <Icon name="phone" size={15} />
            </button>
            <button
              className="pg-btn pg-btn--ghost pg-btn--sm"
              aria-label="Compartilhar localização"
              onClick={() => setShowShare(true)}
              style={{ flex: 1 }}
            >
              <Icon name="share" size={15} />
            </button>
          </div>
        </div>

        {/* SOS link */}
        <button
          style={{
            width: '100%',
            marginTop: 12,
            padding: '10px 14px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontFamily: 'inherit',
            fontSize: 12,
            color: 'var(--text-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <Icon name="shield" size={14} />
          <span>
            Algo estranho? <strong style={{ color: 'var(--danger)' }}>Acionar segurança</strong>
          </span>
        </button>
      </div>

      {/* SHARE MODAL */}
      {showShare && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            background: 'rgba(7,14,26,0.55)',
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setShowShare(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--paper)',
              width: '100%',
              borderRadius: '20px 20px 0 0',
              padding: '12px 20px 24px',
              animation: 'locSlideUp 0.25s ease-out',
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                background: 'var(--ink-300)',
                borderRadius: 99,
                margin: '0 auto 16px',
              }}
            />
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
              Compartilhar localização ao vivo
            </h3>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-soft)',
                margin: '6px 0 16px',
                lineHeight: 1.5,
              }}
            >
              Mande o link para alguém acompanhar a chegada do Carlos. O link expira automaticamente
              quando o pedido terminar.
            </p>

            {/* preview link */}
            <div
              style={{
                background: 'var(--ink-50)',
                border: '1px dashed var(--border-strong)',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Icon name="globe" size={16} />
              <span
                className="pg-mono"
                style={{
                  fontSize: 12,
                  color: 'var(--text-soft)',
                  flex: 1,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                pagorapro.com/r/PG-1247-x9k
              </span>
              <button
                className="pg-btn pg-btn--ghost pg-btn--sm"
                style={{ height: 32, padding: '0 10px' }}
              >
                <Icon name="copy" size={13} /> Copiar
              </button>
            </div>

            <div className="pg-stack pg-stack--sm">
              <button className="pg-btn pg-btn--primary pg-btn--block">
                <Icon name="whatsapp" size={16} /> Compartilhar no WhatsApp
              </button>
              <button className="pg-btn pg-btn--ghost pg-btn--block">
                <Icon name="share" size={16} /> Outros aplicativos
              </button>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: '10px 12px',
                background: 'var(--green-50)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--green-700)',
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <Icon name="shield" size={14} />
              <span>
                Quem receber só vê a localização do prestador, não a sua. Sem app, sem cadastro.
              </span>
            </div>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes locPulse {
          0% { box-shadow: 0 0 0 0 rgba(34,227,163,0.7); }
          70% { box-shadow: 0 0 0 8px rgba(34,227,163,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,227,163,0); }
        }
        @keyframes locSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `,
        }}
      />
    </div>
  );
};

export { Locator };
