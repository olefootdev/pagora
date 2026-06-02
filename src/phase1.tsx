// =====================================================================
// FASE 1 CLIENTE — Pré-pedido / cotação
// =====================================================================
import type { CSSProperties } from 'react';
import { useState as useStateP1 } from 'react';
import { Icon } from './icons';
import { StatusBar as StatusBarP1, TopBar as TopBarP1 } from './core';
import type { ScreenProps } from './types';

// ---------------------------------------------------------------------
// COMPARADOR — 2 a 3 prestadores lado a lado
// ---------------------------------------------------------------------
const Compare = ({ go }: ScreenProps) => {
  const [sel, setSel] = useStateP1<string[]>(['p1', 'p2']);
  const all = [
    {
      id: 'p1',
      name: 'Carlos Mudanças',
      initials: 'CM',
      price: 210,
      eta: '45 min',
      rating: 4.7,
      reviews: 89,
      vehicle: 'Furgão 8m³',
      helpers: 1,
      free: ['Içamento', 'Embalagem básica'],
      lvl: 'Ouro',
    },
    {
      id: 'p2',
      name: 'JM Transportes',
      initials: 'JM',
      price: 240,
      eta: '1h 10',
      rating: 4.9,
      reviews: 142,
      vehicle: 'Baú 12m³',
      helpers: 2,
      free: ['Embalagem', 'Desmontagem', 'Seguro R$3k'],
      lvl: 'Platina',
    },
    {
      id: 'p3',
      name: 'Frete Já SP',
      initials: 'FJ',
      price: 295,
      eta: '2h',
      rating: 4.8,
      reviews: 256,
      vehicle: 'Toco 16m³',
      helpers: 2,
      free: ['Seguro R$5k', 'Cobertor'],
      lvl: 'Ouro',
    },
  ];
  const toggle = (id: string) => {
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 3 ? [...s, id] : s));
  };
  const selected = all.filter((p) => sel.includes(p.id));
  const minPrice = Math.min(...selected.map((p) => p.price));
  const bestRating = Math.max(...selected.map((p) => p.rating));

  return (
    <div className="pg-screen" data-screen-label="C1 Comparador de prestadores">
      <StatusBarP1 />
      <TopBarP1 onBack={() => go('proposals')} title="Comparar propostas" />
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: '16px 20px 0' }}>
          <div className="pg-h-eyebrow" style={{ margin: 0 }}>
            SELECIONE ATÉ 3 PARA COMPARAR
          </div>
          <div className="pg-stack pg-stack--sm" style={{ marginTop: 10 }}>
            {all.map((p) => {
              const active = sel.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={`pg-card ${active ? '' : ''}`}
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    width: '100%',
                    border: `1.5px solid ${active ? 'var(--night-900)' : 'var(--border)'}`,
                    background: active ? 'var(--bg-soft)' : 'var(--paper)',
                  }}
                >
                  <div className="pg-row" style={{ gap: 10 }}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: `2px solid ${active ? 'var(--night-900)' : 'var(--border-strong)'}`,
                        background: active ? 'var(--night-900)' : 'transparent',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {active && (
                        <Icon name="check" size={13} strokeWidth={3} color="var(--green-500)" />
                      )}
                    </div>
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                    <div className="pg-mono" style={{ fontSize: 13, fontWeight: 700 }}>
                      R$ {p.price}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Comparison table */}
        <div style={{ padding: '20px 0 0' }}>
          <div className="pg-h-eyebrow" style={{ margin: '0 20px 10px' }}>
            COMPARATIVO ({selected.length})
          </div>

          <div style={{ overflowX: 'auto', padding: '0 20px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `120px repeat(${selected.length}, 1fr)`,
                minWidth: 320 + selected.length * 140,
                gap: 0,
                border: '1px solid var(--border)',
                borderRadius: 12,
                overflow: 'hidden',
                background: 'var(--paper)',
              }}
            >
              {/* header row */}
              <div style={cellHeadStyle}></div>
              {selected.map((p) => (
                <div key={p.id} style={{ ...cellHeadStyle, textAlign: 'center', padding: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      margin: '0 auto',
                      borderRadius: 10,
                      background: 'var(--night-900)',
                      color: 'var(--green-500)',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                    }}
                  >
                    {p.initials}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>
                    {p.name}
                  </div>
                </div>
              ))}

              {/* Price row */}
              <div style={cellLabelStyle}>Preço</div>
              {selected.map((p) => (
                <div key={p.id} style={cellStyle}>
                  <span className="pg-mono" style={{ fontSize: 16, fontWeight: 700 }}>
                    R$ {p.price}
                  </span>
                  {p.price === minPrice && selected.length > 1 && (
                    <div className="pg-tag pg-tag--green" style={{ fontSize: 9, marginTop: 4 }}>
                      MAIS BARATO
                    </div>
                  )}
                </div>
              ))}

              {/* ETA */}
              <div style={cellLabelStyle}>Chegada</div>
              {selected.map((p) => (
                <div key={p.id} style={cellStyle}>
                  {p.eta}
                </div>
              ))}

              {/* Rating */}
              <div style={cellLabelStyle}>Avaliação</div>
              {selected.map((p) => (
                <div key={p.id} style={cellStyle}>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 3,
                    }}
                  >
                    <Icon name="star-fill" size={11} color="var(--amber-400)" /> {p.rating}{' '}
                    <span style={{ color: 'var(--text-mute)', fontSize: 11 }}>({p.reviews})</span>
                  </span>
                  {p.rating === bestRating && selected.length > 1 && (
                    <div className="pg-tag pg-tag--green" style={{ fontSize: 9, marginTop: 4 }}>
                      MELHOR
                    </div>
                  )}
                </div>
              ))}

              {/* Vehicle */}
              <div style={cellLabelStyle}>Veículo</div>
              {selected.map((p) => (
                <div key={p.id} style={cellStyle}>
                  {p.vehicle}
                </div>
              ))}

              {/* Helpers */}
              <div style={cellLabelStyle}>Ajudantes</div>
              {selected.map((p) => (
                <div key={p.id} style={cellStyle}>
                  {p.helpers}
                </div>
              ))}

              {/* Level */}
              <div style={cellLabelStyle}>Nível</div>
              {selected.map((p) => (
                <div key={p.id} style={cellStyle}>
                  <span className="pg-tag pg-tag--dark" style={{ fontSize: 10 }}>
                    {p.lvl}
                  </span>
                </div>
              ))}

              {/* Free items */}
              <div style={cellLabelStyle}>Inclui</div>
              {selected.map((p) => (
                <div key={p.id} style={{ ...cellStyle, fontSize: 11, lineHeight: 1.5 }}>
                  {p.free.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="check" size={11} strokeWidth={2.5} color="var(--green-700)" />
                      {f}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 20px' }}>
          <div
            className="pg-card pg-card--soft"
            style={{ padding: 14, fontSize: 12, color: 'var(--text-soft)' }}
          >
            <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Icon
                name="lightbulb"
                size={14}
                color="var(--green-700)"
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <span>
                <strong style={{ color: 'var(--text)' }}>Dica:</strong> O preço é importante, mas
                considere também avaliação e o que está incluso. Embalagem inclusa pode economizar
                R$ 80–150.
              </span>
            </span>
          </div>
        </div>
      </div>

      <div
        className="pg-page-foot"
        style={{ borderTop: '1px solid var(--border)', padding: 16, background: 'var(--paper)' }}
      >
        <button
          className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block"
          onClick={() => go('proposals')}
        >
          Voltar para escolher
        </button>
      </div>
    </div>
  );
};

const cellHeadStyle: CSSProperties = {
  background: 'var(--bg-soft)',
  borderBottom: '1px solid var(--border)',
  padding: '10px 12px',
  fontSize: 11,
  color: 'var(--text-mute)',
  fontWeight: 600,
};
const cellLabelStyle: CSSProperties = {
  background: 'var(--bg-soft)',
  padding: '10px 12px',
  fontSize: 11,
  color: 'var(--text-soft)',
  fontWeight: 600,
  borderTop: '1px solid var(--border)',
};
const cellStyle: CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  borderTop: '1px solid var(--border)',
  borderLeft: '1px solid var(--border)',
  textAlign: 'center',
};

export { Compare };
