/* @jsxRuntime classic */
/* global React, Icon, StatusBar, TopBar */
const { useState: useStateL, useEffect: useEffectL } = React;

// =====================================================================
// LOCATOR — localizador completo do prestador a caminho
// =====================================================================
const Locator = ({ go }) => {
  const [eta, setEta] = useStateL(8);
  const [distance, setDistance] = useStateL(2.4);
  const [showShare, setShowShare] = useStateL(false);
  const [progress, setProgress] = useStateL(0.32); // 0..1 path progress

  useEffectL(() => {
    const t = setInterval(() => {
      setProgress(p => {
        const np = Math.min(0.98, p + 0.005);
        setEta(Math.max(1, Math.round(8 * (1 - np))));
        setDistance(+(2.4 * (1 - np)).toFixed(1));
        return np;
      });
    }, 1200);
    return () => clearInterval(t);
  }, []);

  // path from prestador to cliente — quadratic curve
  const pathD = "M 60 380 Q 130 280 180 240 T 280 140 T 330 70";
  // sample point along curve at progress
  const pointAt = (t) => {
    // crude sampling: linear interpolation through 4 keypoints
    const pts = [[60,380],[180,240],[280,140],[330,70]];
    const seg = Math.min(2, Math.floor(t * 3));
    const lt = (t * 3) - seg;
    const a = pts[seg], b = pts[seg + 1];
    return [a[0] + (b[0] - a[0]) * lt, a[1] + (b[1] - a[1]) * lt];
  };
  const [px, py] = pointAt(progress);

  return (
    <div className="pg-screen" data-screen-label="A19 Localizador do prestador" style={{ position: "relative" }}>
      <StatusBar />

      {/* MAP — full bleed */}
      <div style={{
        position: "absolute", inset: 0, background: "#E8EEF5", zIndex: 0,
      }}>
        <svg width="100%" height="100%" viewBox="0 0 390 600" preserveAspectRatio="xMidYMid slice"
          style={{ display: "block" }}>
          <defs>
            <pattern id="locgrid" width="34" height="34" patternUnits="userSpaceOnUse">
              <path d="M 34 0 L 0 0 0 34" fill="none" stroke="rgba(7,14,26,0.045)" strokeWidth="1"/>
            </pattern>
            <linearGradient id="routegrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#22E3A3"/>
              <stop offset="1" stopColor="#0FA77A"/>
            </linearGradient>
          </defs>
          <rect width="390" height="600" fill="#E8EEF5"/>
          <rect width="390" height="600" fill="url(#locgrid)"/>

          {/* parks / blocks */}
          <rect x="20" y="40" width="120" height="80" fill="#D4E1D2" rx="4"/>
          <rect x="160" y="30" width="80" height="70" fill="#D6DEE8" rx="4"/>
          <rect x="260" y="20" width="110" height="90" fill="#D6DEE8" rx="4"/>
          <rect x="20" y="140" width="90" height="70" fill="#D6DEE8" rx="4"/>
          <rect x="130" y="130" width="120" height="90" fill="#D4E1D2" rx="4"/>
          <rect x="270" y="130" width="100" height="80" fill="#D6DEE8" rx="4"/>
          <rect x="20" y="240" width="100" height="100" fill="#D6DEE8" rx="4"/>
          <rect x="140" y="250" width="120" height="80" fill="#D6DEE8" rx="4"/>
          <rect x="280" y="240" width="90" height="100" fill="#D6DEE8" rx="4"/>
          <rect x="30" y="370" width="100" height="80" fill="#D6DEE8" rx="4"/>
          <rect x="150" y="360" width="100" height="90" fill="#D6DEE8" rx="4"/>
          <rect x="270" y="370" width="100" height="80" fill="#D6DEE8" rx="4"/>
          <rect x="40" y="480" width="110" height="90" fill="#D6DEE8" rx="4"/>
          <rect x="170" y="470" width="100" height="100" fill="#D6DEE8" rx="4"/>
          <rect x="290" y="480" width="80" height="90" fill="#D6DEE8" rx="4"/>

          {/* major roads */}
          <path d="M0 120 L390 120" stroke="#fff" strokeWidth="14"/>
          <path d="M0 230 L390 230" stroke="#fff" strokeWidth="10"/>
          <path d="M0 350 L390 350" stroke="#fff" strokeWidth="14"/>
          <path d="M0 460 L390 460" stroke="#fff" strokeWidth="10"/>
          <path d="M150 0 L150 600" stroke="#fff" strokeWidth="12"/>
          <path d="M260 0 L260 600" stroke="#fff" strokeWidth="14"/>

          {/* dashed road indicators */}
          <path d="M0 120 L390 120" stroke="rgba(7,14,26,0.15)" strokeWidth="1" strokeDasharray="6 8"/>
          <path d="M0 350 L390 350" stroke="rgba(7,14,26,0.15)" strokeWidth="1" strokeDasharray="6 8"/>
          <path d="M260 0 L260 600" stroke="rgba(7,14,26,0.15)" strokeWidth="1" strokeDasharray="6 8"/>

          {/* completed route (behind) */}
          <path d={pathD} fill="none" stroke="rgba(15,167,122,0.25)" strokeWidth="6" strokeLinecap="round"/>
          {/* active route up to progress */}
          <path d={pathD} fill="none" stroke="url(#routegrad)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray="600" strokeDashoffset={600 - 600 * progress} />

          {/* destination (cliente) */}
          <g transform="translate(330 70)">
            <circle r="20" fill="rgba(7,14,26,0.08)"/>
            <circle r="11" fill="var(--night-900)" stroke="#fff" strokeWidth="3"/>
            <text y="-22" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="10" fontWeight="700" fill="#070E1A">VOCÊ</text>
          </g>

          {/* origin (prestador start) */}
          <g transform="translate(60 380)">
            <circle r="9" fill="#fff" stroke="#0FA77A" strokeWidth="3"/>
          </g>

          {/* moving prestador marker */}
          <g transform={`translate(${px} ${py})`}>
            <circle r="32" fill="rgba(34,227,163,0.12)">
              <animate attributeName="r" from="22" to="42" dur="1.8s" repeatCount="indefinite"/>
              <animate attributeName="opacity" from="0.5" to="0" dur="1.8s" repeatCount="indefinite"/>
            </circle>
            <circle r="18" fill="#fff" stroke="#0FA77A" strokeWidth="3"/>
            <g transform="translate(-9 -9)">
              <path d="M2 13V5h11v8" fill="none" stroke="#070E1A" strokeWidth="1.6" strokeLinejoin="round"/>
              <path d="M13 8h3l2 2v3h-5" fill="none" stroke="#070E1A" strokeWidth="1.6" strokeLinejoin="round"/>
              <circle cx="6" cy="14" r="1.6" fill="#070E1A"/>
              <circle cx="15" cy="14" r="1.6" fill="#070E1A"/>
            </g>
          </g>
        </svg>
      </div>

      {/* TOP CHROME — minimal */}
      <div style={{
        position: "absolute", top: 50, left: 0, right: 0, zIndex: 3,
        padding: "12px 16px", display: "flex", justifyContent: "space-between", gap: 12,
      }}>
        <button onClick={() => go("home")} aria-label="Voltar"
          style={{
            width: 44, height: 44, borderRadius: 14, border: "none",
            background: "var(--paper)", color: "var(--text)",
            display: "grid", placeItems: "center", cursor: "pointer",
            boxShadow: "0 4px 14px rgba(7,14,26,0.12)",
          }}>
          <Icon name="arrow-left" size={20} />
        </button>
        <div style={{
          flex: 1, background: "var(--paper)", borderRadius: 14,
          padding: "10px 14px", boxShadow: "0 4px 14px rgba(7,14,26,0.12)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green-500)", boxShadow: "0 0 0 0 rgba(34,227,163,0.8)", animation: "locPulse 1.6s infinite" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>AO VIVO · #PG-1247</div>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, marginTop: 1 }}>Carlos está a caminho</div>
          </div>
        </div>
        <button aria-label="Recentralizar"
          style={{
            width: 44, height: 44, borderRadius: 14, border: "none",
            background: "var(--night-900)", color: "var(--green-500)",
            display: "grid", placeItems: "center", cursor: "pointer",
            boxShadow: "0 4px 14px rgba(7,14,26,0.18)",
          }}>
          <Icon name="navigation" size={18} />
        </button>
      </div>

      {/* SIDE TELEMETRY — speed + heading */}
      <div style={{
        position: "absolute", top: 130, right: 16, zIndex: 3,
        background: "var(--paper)", borderRadius: 12, padding: "10px 12px",
        boxShadow: "0 4px 14px rgba(7,14,26,0.12)",
        textAlign: "center", minWidth: 70,
      }}>
        <div className="pg-mono" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.01em" }}>42</div>
        <div className="pg-h-eyebrow" style={{ margin: "2px 0 0", fontSize: 8 }}>KM/H</div>
        <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
        <div style={{ display: "grid", placeItems: "center", marginBottom: 2 }}>
          <Icon name="navigation" size={16} />
        </div>
        <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 8 }}>NORTE</div>
      </div>

      {/* NEXT TURN STRIP */}
      <div style={{
        position: "absolute", top: 130, left: 16, zIndex: 3,
        background: "var(--night-900)", color: "#fff", borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 4px 14px rgba(7,14,26,0.22)",
        display: "flex", alignItems: "center", gap: 10, maxWidth: 220,
      }}>
        <span style={{
          width: 36, height: 36, borderRadius: 10, background: "rgba(34,227,163,0.16)", color: "var(--green-500)",
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          {/* turn-right arrow */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 20v-7a4 4 0 0 1 4-4h9"/>
            <path d="m15 5 4 4-4 4"/>
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pg-mono" style={{ fontSize: 11, color: "var(--green-500)", letterSpacing: "0.08em" }}>EM 400 M</div>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, marginTop: 2 }}>
            Vire à direita na <strong>Av. Paulista</strong>
          </div>
        </div>
      </div>

      {/* BOTTOM SHEET — provider info + actions */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 3,
        background: "var(--paper)",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -8px 30px rgba(7,14,26,0.14)",
        padding: "10px 20px 20px",
      }}>
        {/* drag handle */}
        <div style={{ width: 40, height: 4, background: "var(--ink-300)", borderRadius: 99, margin: "0 auto 14px" }} />

        {/* ETA strip */}
        <div className="pg-row pg-row--between" style={{ marginBottom: 14 }}>
          <div>
            <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>CHEGA EM</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <span className="pg-mono" style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
                {eta}
              </span>
              <span style={{ fontSize: 14, color: "var(--text-soft)", fontWeight: 600 }}>min</span>
              <span className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", marginLeft: 6 }}>
                · {distance} km
              </span>
            </div>
          </div>
          <span className="pg-tag pg-tag--green" style={{ fontSize: 10 }}>NO HORÁRIO</span>
        </div>

        {/* progress bar with steps */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ position: "relative", height: 4, background: "var(--ink-100)", borderRadius: 99 }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${progress * 100}%`,
              background: "linear-gradient(90deg, var(--green-500), var(--green-600))",
              borderRadius: 99,
              transition: "width 1s linear",
            }} />
            {[0, 0.5, 1].map(p => (
              <span key={p} style={{
                position: "absolute", top: -4, left: `calc(${p * 100}% - 6px)`,
                width: 12, height: 12, borderRadius: "50%",
                background: progress >= p ? "var(--green-600)" : "var(--paper)",
                border: `2px solid ${progress >= p ? "var(--green-600)" : "var(--ink-300)"}`,
              }} />
            ))}
          </div>
          <div className="pg-row pg-row--between" style={{ marginTop: 8, fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
            <span style={{ color: "var(--green-700)" }}>SAIU · 09:14</span>
            <span style={{ color: progress >= 0.5 ? "var(--green-700)" : "var(--text-mute)" }}>NA REGIÃO</span>
            <span>CHEGADA</span>
          </div>
        </div>

        {/* provider card */}
        <div className="pg-card pg-card--padded" style={{ background: "var(--ink-50)", border: "1px solid var(--border)" }}>
          <div className="pg-row" style={{ gap: 12 }}>
            <div style={{
              width: 50, height: 50, borderRadius: 14, position: "relative",
              background: "var(--night-900)", color: "var(--green-500)",
              display: "grid", placeItems: "center",
              fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 16,
            }}>
              CM
              <span style={{
                position: "absolute", bottom: -3, right: -3,
                width: 16, height: 16, borderRadius: "50%",
                background: "var(--green-500)", border: "2.5px solid var(--paper)",
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pg-row" style={{ gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Carlos M.</span>
                <Icon name="check-circle" size={13} />
              </div>
              <div className="pg-row" style={{ fontSize: 12, color: "var(--text-soft)", gap: 6, marginTop: 2 }}>
                <Icon name="star" size={11} />
                <span>4,7 · 89 fretes</span>
              </div>
              <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 4, letterSpacing: "0.04em" }}>
                FIAT FIORINO · BRA-2E47 · BRANCO
              </div>
            </div>
          </div>

          {/* actions row */}
          <div className="pg-row" style={{ gap: 6, marginTop: 14 }}>
            <button className="pg-btn pg-btn--primary pg-btn--sm" onClick={() => go("chat")} style={{ flex: 2 }}>
              <Icon name="whatsapp" size={15} />
              <span>Mensagem</span>
            </button>
            <button className="pg-btn pg-btn--ghost pg-btn--sm" aria-label="Ligar" style={{ flex: 1 }}>
              <Icon name="phone" size={15} />
            </button>
            <button className="pg-btn pg-btn--ghost pg-btn--sm" aria-label="Compartilhar localização"
              onClick={() => setShowShare(true)} style={{ flex: 1 }}>
              <Icon name="share" size={15} />
            </button>
          </div>
        </div>

        {/* SOS link */}
        <button style={{
          width: "100%", marginTop: 12, padding: "10px 14px",
          background: "transparent", border: "1px solid var(--border)",
          borderRadius: 10, fontFamily: "inherit", fontSize: 12,
          color: "var(--text-soft)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          cursor: "pointer",
        }}>
          <Icon name="shield" size={14} />
          <span>Algo estranho? <strong style={{ color: "var(--danger)" }}>Acionar segurança</strong></span>
        </button>
      </div>

      {/* SHARE MODAL */}
      {showShare && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          background: "rgba(7,14,26,0.55)", display: "flex", alignItems: "flex-end",
        }} onClick={() => setShowShare(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "var(--paper)", width: "100%",
            borderRadius: "20px 20px 0 0", padding: "12px 20px 24px",
            animation: "locSlideUp 0.25s ease-out",
          }}>
            <div style={{ width: 40, height: 4, background: "var(--ink-300)", borderRadius: 99, margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
              Compartilhar localização ao vivo
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-soft)", margin: "6px 0 16px", lineHeight: 1.5 }}>
              Mande o link para alguém acompanhar a chegada do Carlos. O link expira automaticamente quando o pedido terminar.
            </p>

            {/* preview link */}
            <div style={{
              background: "var(--ink-50)", border: "1px dashed var(--border-strong)",
              borderRadius: 10, padding: "12px 14px", marginBottom: 14,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <Icon name="globe" size={16} />
              <span className="pg-mono" style={{ fontSize: 12, color: "var(--text-soft)", flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                pagora.app/r/PG-1247-x9k
              </span>
              <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ height: 32, padding: "0 10px" }}>
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

            <div style={{ marginTop: 14, padding: "10px 12px", background: "var(--green-50)", borderRadius: 8, fontSize: 12, color: "var(--green-700)", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Icon name="shield" size={14} />
              <span>Quem receber só vê a localização do prestador, não a sua. Sem app, sem cadastro.</span>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes locPulse {
          0% { box-shadow: 0 0 0 0 rgba(34,227,163,0.7); }
          70% { box-shadow: 0 0 0 8px rgba(34,227,163,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,227,163,0); }
        }
        @keyframes locSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}} />
    </div>
  );
};

window.PagoraLocator = { Locator };
