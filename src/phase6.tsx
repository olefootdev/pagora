// =====================================================================
// FASE 6 ADMIN — Painel de operação
// =====================================================================
import type { ReactNode } from 'react';
import { useState as useStateP6 } from 'react';
import { Icon } from './icons';
import type { ScreenProps } from './types';

type AdminShellProps = ScreenProps & {
  children?: ReactNode;
  active: string;
  title: string;
  crumbs?: string;
};

// ---------------------------------------------------------------------
// shared admin chrome (web app, NOT mobile)
// ---------------------------------------------------------------------
const AdminShell = ({ children, active, go, title, crumbs }: AdminShellProps) => {
  const nav = [
    ['admin-dash', 'Dashboard', 'bar-chart'],
    ['admin-dispute', 'Disputas', 'scales'],
  ] as const;
  return (
    <div className="pg-screen" data-screen-label={`P6 ${title}`} style={{ background: '#F4F5F7' }}>
      {/* Top admin bar */}
      <div
        style={{
          height: 52,
          background: 'var(--night-900)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          padding: '0 18px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          PAGORA<span style={{ color: 'var(--green-500)' }}>·</span>ops
        </span>
        <span
          className="pg-mono"
          style={{
            marginLeft: 12,
            fontSize: 10,
            padding: '2px 8px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 4,
            color: 'var(--green-500)',
          }}
        >
          ADMIN
        </span>
        <div style={{ flex: 1 }} />
        <input
          placeholder="Buscar pedido, CPF, e-mail..."
          style={{
            width: 280,
            height: 32,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            color: '#fff',
            padding: '0 12px',
            fontSize: 12,
            fontFamily: 'inherit',
            marginRight: 16,
          }}
        />
        <span
          className="pg-mono"
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginRight: 12 }}
        >
          SP · 23:14
        </span>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            background: 'var(--green-500)',
            color: 'var(--night-900)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          RA
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="pg-viewport" style={{ display: 'flex', padding: 0 }}>
        <aside
          style={{
            width: 200,
            background: '#fff',
            borderRight: '1px solid var(--border)',
            padding: '16px 8px',
            flexShrink: 0,
          }}
        >
          {nav.map(([id, label, e]) => (
            <button
              key={id}
              onClick={() => go(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 12px',
                marginBottom: 2,
                background: active === id ? 'var(--bg-soft)' : 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                fontSize: 13,
                fontWeight: active === id ? 700 : 500,
                color: active === id ? 'var(--text)' : 'var(--text-soft)',
              }}
            >
              <Icon name={e} size={16} color={active === id ? 'var(--text)' : 'var(--text-soft)'} />
              <span>{label}</span>
            </button>
          ))}
          <div style={{ marginTop: 20, padding: '0 12px' }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>
              STATUS DO SISTEMA
            </div>
            <div
              style={{ marginTop: 8, padding: 10, background: 'var(--green-50)', borderRadius: 8 }}
            >
              <div className="pg-row" style={{ gap: 6 }}>
                <span
                  style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--green-500)' }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-700)' }}>
                  Operacional
                </span>
              </div>
              <div
                className="pg-mono"
                style={{ fontSize: 9, color: 'var(--text-soft)', marginTop: 2 }}
              >
                Pix · API · Mapa OK
              </div>
            </div>
          </div>
        </aside>

        <main style={{ flex: 1, overflow: 'auto' }}>
          {/* breadcrumbs + title */}
          <div style={{ padding: '16px 24px 0' }}>
            <div
              className="pg-mono"
              style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 6 }}
            >
              {crumbs || `OPS / ${title?.toUpperCase()}`}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              {title}
            </h1>
          </div>
          <div style={{ padding: 24 }}>{children}</div>
        </main>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// DETALHE DE DISPUTA
// ---------------------------------------------------------------------
const AdminDispute = ({ go }: ScreenProps) => {
  const [decision, setDecision] = useStateP6<string | null>(null);
  return (
    <AdminShell
      go={go}
      active="admin-dispute"
      title="Disputa #DSP-0312"
      crumbs="OPS / DISPUTAS / #DSP-0312"
    >
      {/* Banner */}
      <div
        style={{
          background: '#FFF6E6',
          border: '1px solid var(--orange-500)',
          padding: 14,
          borderRadius: 10,
          marginBottom: 18,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <Icon name="alert" size={22} color="var(--orange-600)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange-600)' }}>
            Disputa aberta há 4h 12min
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
            SLA de 24h · Cliente pediu reembolso parcial. Valor em escrow: R$ 251,30
          </div>
        </div>
        <span
          className="pg-mono"
          style={{
            fontSize: 11,
            padding: '4px 10px',
            background: 'var(--orange-500)',
            color: '#fff',
            borderRadius: 4,
            fontWeight: 700,
          }}
        >
          ALTA
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        {/* main column */}
        <div>
          <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 10 }}>
              RECLAMAÇÃO DA CLIENTE
            </div>
            <div className="pg-row" style={{ gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  background: 'var(--bg-soft)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                JS
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Joana Silva</div>
                <div className="pg-mono" style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                  cpf 123.456.***-89 · cliente desde 2024 · 18 pedidos
                </div>
              </div>
            </div>
            <div
              style={{
                background: 'var(--bg-soft)',
                padding: 14,
                borderRadius: 10,
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--text)',
              }}
            >
              "O prestador entregou tudo certo, mas o pé da mesa de jantar chegou trincado. Tenho a
              foto do antes (no carregamento) e do depois. Queria reembolso parcial de R$ 80 para
              conserto."
            </div>
            <div className="pg-row" style={{ gap: 8, marginTop: 12 }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg,#A0826D,#6B4423)',
                  position: 'relative',
                }}
              >
                <span
                  className="pg-mono"
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: 3,
                    fontSize: 8,
                  }}
                >
                  ANTES
                </span>
              </div>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg,#A0826D,#6B4423)',
                  position: 'relative',
                }}
              >
                <span
                  className="pg-mono"
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: 3,
                    fontSize: 8,
                  }}
                >
                  DEPOIS
                </span>
                <span
                  style={{
                    position: 'absolute',
                    bottom: 6,
                    right: 6,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#EF4444',
                    border: '2px solid #fff',
                  }}
                />
              </div>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  background: 'var(--bg-soft)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--text-mute)',
                  fontSize: 11,
                }}
              >
                +1
              </div>
            </div>
          </div>

          <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 10 }}>
              RESPOSTA DO PRESTADOR
            </div>
            <div className="pg-row" style={{ gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  background: 'var(--green-500)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--night-900)',
                }}
              >
                CM
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  Carlos Mudanças{' '}
                  <span
                    className="pg-tag pg-tag--green"
                    style={{
                      fontSize: 9,
                      marginLeft: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <Icon name="medal" size={9} color="currentColor" /> PRATA
                  </span>
                </div>
                <div
                  className="pg-mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--text-mute)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Icon name="star-fill" size={10} color="var(--amber-400)" /> 4,9 · 87 corridas · 0
                  disputas anteriores
                </div>
              </div>
            </div>
            <div
              style={{
                background: 'var(--bg-soft)',
                padding: 14,
                borderRadius: 10,
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--text)',
              }}
            >
              "Carreguei e entreguei conforme protocolo. A foto do 'antes' não mostra o pé
              claramente. Acredito que já estava trincado. Pode revisar o checklist anexo."
            </div>
          </div>

          <div className="pg-card pg-card--padded">
            <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 12 }}>
              TIMELINE DA DISPUTA
            </div>
            {[
              ['19:42', 'Disputa aberta pela cliente', 'var(--orange-600)'],
              ['19:48', 'Sistema notificou prestador', 'var(--text-mute)'],
              ['20:14', 'Prestador respondeu (acima)', 'var(--text-soft)'],
              ['21:30', 'Cliente anexou +2 fotos', 'var(--text-soft)'],
              ['23:14', 'Aguardando decisão admin', 'var(--text)'],
            ].map(([t, d, c], i) => (
              <div key={i} className="pg-row" style={{ gap: 12, marginBottom: 8 }}>
                <span
                  className="pg-mono"
                  style={{ width: 50, fontSize: 11, color: 'var(--text-mute)' }}
                >
                  {t}
                </span>
                <span
                  style={{ width: 8, height: 8, borderRadius: 4, background: c, marginTop: 5 }}
                />
                <span style={{ fontSize: 13, color: c }}>{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* right column — decisão */}
        <div>
          <div
            className="pg-card pg-card--padded"
            style={{ marginBottom: 16, border: '1.5px solid var(--night-900)' }}
          >
            <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 12 }}>
              SUA DECISÃO
            </div>
            <div className="pg-stack pg-stack--sm" style={{ marginBottom: 16 }}>
              {[
                {
                  id: 'client',
                  t: 'Reembolsar cliente integral',
                  v: 'R$ 251,30 → cliente',
                  c: 'var(--green-500)',
                },
                {
                  id: 'partial',
                  t: 'Reembolso parcial (R$ 80)',
                  v: 'Pgr cobre · prest. recebe R$ 251,30',
                  c: 'var(--green-700)',
                  sug: true,
                },
                {
                  id: 'provider',
                  t: 'Negar disputa',
                  v: 'Prestador recebe integral',
                  c: 'var(--text-mute)',
                },
                {
                  id: 'split',
                  t: 'Dividir 50/50',
                  v: 'R$ 40 cliente · R$ 211,30 prest.',
                  c: 'var(--text-soft)',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className="pg-row"
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: `1.5px solid ${decision === opt.id ? 'var(--night-900)' : 'var(--border)'}`,
                    background: decision === opt.id ? 'var(--bg-soft)' : 'var(--paper)',
                    cursor: 'pointer',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  <input
                    type="radio"
                    checked={decision === opt.id}
                    onChange={() => setDecision(opt.id)}
                    style={{ marginTop: 3, accentColor: 'var(--night-900)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {opt.t}
                      {opt.sug && (
                        <span
                          className="pg-tag pg-tag--green"
                          style={{ marginLeft: 6, fontSize: 9 }}
                        >
                          SUGESTÃO IA
                        </span>
                      )}
                    </div>
                    <div
                      className="pg-mono"
                      style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 2 }}
                    >
                      {opt.v}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <label className="pg-label">Nota interna</label>
            <textarea
              className="pg-textarea"
              placeholder="Justificativa para auditoria..."
              style={{ marginBottom: 12 }}
            />

            <div className="pg-row" style={{ gap: 8 }}>
              <button className="pg-btn pg-btn--ghost" style={{ flex: 1 }}>
                Salvar rascunho
              </button>
              <button className="pg-btn pg-btn--accent" style={{ flex: 1 }} disabled={!decision}>
                Aplicar decisão
              </button>
            </div>
          </div>

          <div className="pg-card pg-card--padded">
            <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 10 }}>
              CONTEXTO IA
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 8px', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <Icon
                  name="bar-chart"
                  size={14}
                  color="var(--text-mute)"
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <span>
                  <strong>Padrão histórico:</strong> em 78% das disputas com fotos antes/depois
                  claras, o sistema decide reembolso parcial.
                </span>
              </p>
              <p style={{ margin: '0 0 8px', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <Icon
                  name="scales"
                  size={14}
                  color="var(--text-mute)"
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <span>
                  <strong>Risco:</strong> baixo. Prestador tem 0 disputas, cliente tem 1 disputa
                  anterior (resolvida a favor do prestador).
                </span>
              </p>
              <p style={{ margin: 0, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <Icon
                  name="money"
                  size={14}
                  color="var(--text-mute)"
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <span>
                  <strong>Custo médio dessa categoria:</strong> R$ 65 cobertos pela PAGORA.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

export { AdminShell, AdminDispute };
