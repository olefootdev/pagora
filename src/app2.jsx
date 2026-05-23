/* @jsxRuntime classic */
/* global React, Icon, StatusBar, TopBar, Logo */
const { useState: useStateB, useMemo: useMemoB } = React;
const { BottomNav } = window.PagoraApp;

// =====================================================================
// MAP — prestadores próximos com filtros · estilo Google Maps
// =====================================================================
const ProvidersMap = ({ go }) => {
  const [filter, setFilter] = useStateB("near");
  const [selected, setSelected] = useStateB("p1");
  const providers = [
    { id: "p1", name: "Carlos Mudanças", initials: "CM", x: 168, y: 280, rating: 4.7, reviews: 89, dist: "0.8 km", price: 210, fav: true, service: "Frete" },
    { id: "p2", name: "JM Transportes", initials: "JM", x: 286, y: 168, rating: 4.9, reviews: 142, dist: "1.4 km", price: 240, service: "Frete" },
    { id: "p3", name: "Frete Já SP", initials: "FJ", x: 232, y: 388, rating: 4.8, reviews: 256, dist: "2.1 km", price: 295, service: "Frete" },
    { id: "p4", name: "Roberto Frota", initials: "RF", x: 332, y: 326, rating: 4.5, reviews: 47, dist: "2.8 km", price: 260, service: "Guincho" },
    { id: "p5", name: "Lúcia Caçambas", initials: "LC", x: 96, y: 432, rating: 4.6, reviews: 64, dist: "3.4 km", price: 195, service: "Caçamba" },
    { id: "p6", name: "Auto Socorro 24h", initials: "AS", x: 64, y: 196, rating: 4.8, reviews: 311, dist: "4.0 km", price: 285, service: "Guincho" },
  ];
  const sorted = [...providers].sort((a, b) => {
    if (filter === "cheap") return a.price - b.price;
    if (filter === "best") return b.rating - a.rating;
    return parseFloat(a.dist) - parseFloat(b.dist);
  });
  const sel = providers.find(p => p.id === selected);

  // Google Maps palette
  const C = {
    land: "#F5F1E8",       // off-white land
    landAlt: "#EFEAD8",    // residential
    park: "#C8E6C9",       // green park
    parkLight: "#D4E9C5",
    water: "#A8D5F0",
    road: "#FFFFFF",       // major road fill
    roadStroke: "#E0DCD0",
    arterial: "#FFE082",   // yellow arterial
    arterialStroke: "#E5C66B",
    highway: "#FFB74D",    // orange highway
    highwayStroke: "#D89940",
    label: "#5C5040",
    labelLight: "#8B7E6C",
  };

  return (
    <div className="pg-screen" data-screen-label="A8 Mapa de prestadores" style={{ position: "relative" }}>
      <StatusBar />
      <TopBar onBack={() => go("home")} title="Prestadores" />

      {/* filter chips */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--paper)" }}>
        <div className="pg-segmented">
          <button className={`pg-segmented-item${filter === "near" ? " is-active" : ""}`} onClick={() => setFilter("near")}>Mais próximos</button>
          <button className={`pg-segmented-item${filter === "cheap" ? " is-active" : ""}`} onClick={() => setFilter("cheap")}>Mais baratos</button>
          <button className={`pg-segmented-item${filter === "best" ? " is-active" : ""}`} onClick={() => setFilter("best")}>Melhor avaliados</button>
        </div>
      </div>

      {/* MAP — Google Maps style */}
      <div style={{ position: "relative", height: 340, flexShrink: 0, background: C.land, overflow: "hidden" }}>
        <svg width="100%" height="100%" viewBox="0 0 390 340" preserveAspectRatio="xMidYMid slice" style={{ display: "block" }}>
          <defs>
            <filter id="pinShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3"/>
            </filter>
          </defs>

          {/* base land */}
          <rect width="390" height="340" fill={C.land}/>

          {/* residential blocks (subtle alt color) */}
          <rect x="0" y="0" width="195" height="120" fill={C.landAlt} opacity="0.55"/>
          <rect x="195" y="220" width="195" height="120" fill={C.landAlt} opacity="0.55"/>

          {/* WATER — river crossing */}
          <path d="M -10 60 Q 80 40, 160 80 T 320 100 L 410 95 L 410 130 Q 330 135, 240 110 T 80 100 L -10 110 Z"
                fill={C.water}/>

          {/* PARKS / green areas */}
          <ellipse cx="290" cy="240" rx="55" ry="42" fill={C.park}/>
          <ellipse cx="290" cy="240" rx="55" ry="42" fill={C.parkLight} opacity="0.5"/>
          <ellipse cx="60" cy="290" rx="38" ry="28" fill={C.park}/>
          <ellipse cx="170" cy="55" rx="32" ry="20" fill={C.park}/>

          {/* ROAD CASING (darker stroke under) — drawn first so road fill sits on top */}
          {/* highways */}
          <path d="M -10 175 L 410 175" stroke={C.highwayStroke} strokeWidth="14"/>
          <path d="M 195 -10 L 195 350" stroke={C.highwayStroke} strokeWidth="14"/>
          {/* arterials */}
          <path d="M -10 245 L 410 245" stroke={C.arterialStroke} strokeWidth="11"/>
          <path d="M 80 -10 L 80 350" stroke={C.arterialStroke} strokeWidth="10"/>
          <path d="M 310 -10 L 310 350" stroke={C.arterialStroke} strokeWidth="10"/>
          {/* local roads */}
          <path d="M -10 210 L 410 210" stroke={C.roadStroke} strokeWidth="8"/>
          <path d="M -10 285 L 410 285" stroke={C.roadStroke} strokeWidth="8"/>
          <path d="M -10 145 L 410 145" stroke={C.roadStroke} strokeWidth="7"/>
          <path d="M 130 -10 L 130 350" stroke={C.roadStroke} strokeWidth="7"/>
          <path d="M 250 -10 L 250 350" stroke={C.roadStroke} strokeWidth="7"/>
          <path d="M 360 -10 L 360 350" stroke={C.roadStroke} strokeWidth="7"/>
          {/* diagonal scenic road */}
          <path d="M -10 320 Q 100 260 200 250 T 410 200" fill="none" stroke={C.roadStroke} strokeWidth="7"/>

          {/* ROAD FILL (white/yellow/orange on top of casings) */}
          <path d="M -10 175 L 410 175" stroke={C.highway} strokeWidth="11"/>
          <path d="M 195 -10 L 195 350" stroke={C.highway} strokeWidth="11"/>
          <path d="M -10 245 L 410 245" stroke={C.arterial} strokeWidth="8.5"/>
          <path d="M 80 -10 L 80 350" stroke={C.arterial} strokeWidth="7.5"/>
          <path d="M 310 -10 L 310 350" stroke={C.arterial} strokeWidth="7.5"/>
          <path d="M -10 210 L 410 210" stroke={C.road} strokeWidth="5.5"/>
          <path d="M -10 285 L 410 285" stroke={C.road} strokeWidth="5.5"/>
          <path d="M -10 145 L 410 145" stroke={C.road} strokeWidth="5"/>
          <path d="M 130 -10 L 130 350" stroke={C.road} strokeWidth="5"/>
          <path d="M 250 -10 L 250 350" stroke={C.road} strokeWidth="5"/>
          <path d="M 360 -10 L 360 350" stroke={C.road} strokeWidth="5"/>
          <path d="M -10 320 Q 100 260 200 250 T 410 200" fill="none" stroke={C.road} strokeWidth="5"/>

          {/* small connector roads (lighter, no casing) */}
          <path d="M 80 60 L 195 60" stroke={C.road} strokeWidth="3" opacity="0.85"/>
          <path d="M 250 60 L 360 60" stroke={C.road} strokeWidth="3" opacity="0.85"/>
          <path d="M 130 110 L 250 110" stroke={C.road} strokeWidth="3" opacity="0.85"/>
          <path d="M 80 320 L 195 320" stroke={C.road} strokeWidth="3" opacity="0.85"/>
          <path d="M 250 320 L 360 320" stroke={C.road} strokeWidth="3" opacity="0.85"/>

          {/* highway shields (small numbered badges) */}
          <g transform="translate(150 175)">
            <rect x="-12" y="-7" width="24" height="14" rx="3" fill="#fff" stroke="#D89940" strokeWidth="1"/>
            <text textAnchor="middle" y="3" fontFamily="Inter,sans-serif" fontSize="9" fontWeight="700" fill="#5C5040">SP-15</text>
          </g>
          <g transform="translate(195 100)">
            <rect x="-10" y="-7" width="20" height="14" rx="3" fill="#fff" stroke="#D89940" strokeWidth="1"/>
            <text textAnchor="middle" y="3" fontFamily="Inter,sans-serif" fontSize="9" fontWeight="700" fill="#5C5040">232</text>
          </g>

          {/* PLACE LABELS */}
          <text x="50" y="35" fontFamily="Inter,sans-serif" fontSize="10" fontWeight="600" fill={C.label} letterSpacing="0.6">PINHEIROS</text>
          <text x="290" y="35" fontFamily="Inter,sans-serif" fontSize="10" fontWeight="600" fill={C.label} letterSpacing="0.6">VILA MADALENA</text>
          <text x="40" y="160" fontFamily="Inter,sans-serif" fontSize="9" fontWeight="500" fill={C.labelLight}>Itaim Bibi</text>
          <text x="295" y="270" fontFamily="Inter,sans-serif" fontSize="8" fontWeight="500" fill="#5A8A5A" textAnchor="middle">Parque do Povo</text>
          <text x="60" y="295" fontFamily="Inter,sans-serif" fontSize="7" fontWeight="500" fill="#5A8A5A" textAnchor="middle">P. Villa-Lobos</text>
          <text x="160" y="60" fontFamily="Inter,sans-serif" fontSize="7" fontStyle="italic" fill="#3A6B9C" textAnchor="middle">Rio Pinheiros</text>
          <text x="220" y="170" fontFamily="Inter,sans-serif" fontSize="7" fontWeight="500" fill={C.labelLight}>Av. Brigadeiro</text>
          <text x="105" y="244" fontFamily="Inter,sans-serif" fontSize="7" fontWeight="500" fill={C.labelLight}>R. Teodoro</text>

          {/* POI dots — restaurants, gas, hospital style */}
          <circle cx="100" cy="200" r="3" fill="#E57373"/>
          <circle cx="240" cy="220" r="3" fill="#FFA726"/>
          <circle cx="340" cy="170" r="3" fill="#42A5F5"/>
          <circle cx="220" cy="295" r="3" fill="#26A69A"/>
          <circle cx="135" cy="320" r="3" fill="#AB47BC"/>

          {/* USER LOCATION — blue dot google style */}
          <g transform="translate(195 168)">
            <circle r="28" fill="#4285F4" opacity="0.18">
              <animate attributeName="r" from="14" to="36" dur="2.4s" repeatCount="indefinite"/>
              <animate attributeName="opacity" from="0.35" to="0" dur="2.4s" repeatCount="indefinite"/>
            </circle>
            <circle r="9" fill="#4285F4" stroke="#fff" strokeWidth="3"/>
          </g>

          {/* PROVIDER PINS — Google Maps teardrop */}
          {providers.map(p => {
            const isSel = p.id === selected;
            const color = p.service === "Frete" ? "#0FA77A" :
                          p.service === "Guincho" ? "#E5640A" : "#7E57C2";
            return (
              <g key={p.id} transform={`translate(${p.x} ${p.y})`}
                 style={{ cursor: "pointer" }} onClick={() => setSelected(p.id)}
                 filter="url(#pinShadow)">
                {isSel ? (
                  <>
                    {/* Selected: large teardrop */}
                    <path d="M 0 -34 C 12 -34 18 -25 18 -16 C 18 -6 12 0 0 14 C -12 0 -18 -6 -18 -16 C -18 -25 -12 -34 0 -34 Z"
                          fill={color} stroke="#fff" strokeWidth="2.5"/>
                    <circle cx="0" cy="-17" r="9" fill="#fff"/>
                    <text textAnchor="middle" y="-13.5" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" fill={color}>
                      {p.initials}
                    </text>
                  </>
                ) : (
                  <>
                    {/* Unselected: small circular dot */}
                    <circle r="11" fill={color} stroke="#fff" strokeWidth="2.5"/>
                    <text textAnchor="middle" y="3.5" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" fill="#fff">
                      {p.initials}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Map controls — top-right */}
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <button aria-label="Camadas" style={mapBtnStyle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
            </svg>
          </button>
          <button aria-label="Sua localização" style={mapBtnStyle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/>
            </svg>
          </button>
        </div>

        {/* Zoom controls — bottom right */}
        <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", flexDirection: "column", background: "#fff", borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.18)", overflow: "hidden" }}>
          <button aria-label="Aproximar" style={zoomBtnStyle}>＋</button>
          <div style={{ height: 1, background: "#E0E0E0" }} />
          <button aria-label="Afastar" style={zoomBtnStyle}>−</button>
        </div>

        {/* Scale bar — bottom left */}
        <div style={{ position: "absolute", bottom: 14, left: 12, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ height: 8, width: 60, borderLeft: "2px solid #444", borderRight: "2px solid #444", borderBottom: "2px solid #444" }} />
          <span style={{ fontSize: 10, color: "#444", fontFamily: "Inter,sans-serif", fontWeight: 500, textShadow: "0 1px 0 rgba(255,255,255,0.8)" }}>500 m</span>
        </div>

        {/* Legend chip top-left */}
        <div style={{ position: "absolute", top: 12, left: 12, background: "#fff", borderRadius: 6, padding: "6px 10px", boxShadow: "0 1px 4px rgba(0,0,0,0.18)", display: "flex", gap: 10, fontSize: 10, fontFamily: "Inter,sans-serif" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0FA77A" }} />Frete</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E5640A" }} />Guincho</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#7E57C2" }} />Caçamba</span>
        </div>

        {/* Selected provider preview card — floating bottom */}
        {sel && (
          <div style={{
            position: "absolute", left: 12, right: 80, bottom: 50,
            background: "#fff", borderRadius: 10,
            boxShadow: "0 2px 10px rgba(0,0,0,0.22)",
            padding: "10px 12px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "var(--night-900)", color: "var(--green-500)",
              display: "grid", placeItems: "center",
              fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 12, flexShrink: 0,
            }}>{sel.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{sel.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 2, display: "flex", gap: 5 }}>
                <Icon name="star" size={10} />
                <span>{sel.rating} · {sel.reviews}</span>
                <span>·</span>
                <span>{sel.dist}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="pg-mono" style={{ fontSize: 14, fontWeight: 700 }}>R$ {sel.price}</div>
            </div>
          </div>
        )}
      </div>

      <div className="pg-viewport" style={{ paddingBottom: 80 }}>
        <div style={{ padding: "16px 20px 20px" }}>
          <div className="pg-row pg-row--between" style={{ marginBottom: 12 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0 }}>{sorted.length} PRESTADORES NA SUA REGIÃO</div>
          </div>
          <div className="pg-stack pg-stack--sm">
            {sorted.map(p => (
              <button key={p.id} onClick={() => setSelected(p.id)}
                className="pg-card pg-card--padded"
                style={{
                  textAlign: "left", cursor: "pointer", width: "100%",
                  border: `1px solid ${selected === p.id ? "var(--night-900)" : "var(--border)"}`,
                  background: "var(--paper)",
                }}>
                <div className="pg-row" style={{ gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: "var(--night-900)", color: "var(--green-500)",
                    display: "grid", placeItems: "center",
                    fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 13,
                  }}>{p.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pg-row" style={{ gap: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</span>
                      {p.fav && <Icon name="heart" size={14} />}
                    </div>
                    <div className="pg-row" style={{ fontSize: 12, color: "var(--text-soft)", gap: 8, marginTop: 2 }}>
                      <span><Icon name="star" size={11} /> {p.rating} ({p.reviews})</span>
                      <span>·</span>
                      <span>{p.dist}</span>
                      <span>·</span>
                      <span className="pg-tag" style={{ background: "var(--ink-100)", padding: "1px 6px", fontSize: 10 }}>{p.service}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="pg-mono" style={{ fontSize: 16, fontWeight: 700 }}>R$ {p.price}</div>
                    <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>MÉDIA</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

const mapBtnStyle = {
  width: 36, height: 36, background: "#fff", border: "none",
  borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
  display: "grid", placeItems: "center", cursor: "pointer",
};
const zoomBtnStyle = {
  width: 36, height: 36, background: "#fff", border: "none",
  fontSize: 20, color: "#444", cursor: "pointer", fontFamily: "inherit",
  display: "grid", placeItems: "center",
};

// =====================================================================
// NOTIFICATIONS
// =====================================================================
const Notifications = ({ go }) => {
  const items = [
    { id: 1, type: "proposal", icon: "package", color: "var(--green-700)", bg: "var(--green-50)",
      t: "Nova proposta recebida", s: "JM Transportes ofereceu R$ 240 pelo seu pedido #PG-1247", time: "Agora", unread: true },
    { id: 2, type: "tracking", icon: "truck", color: "var(--orange-600)", bg: "var(--orange-50)",
      t: "Carlos está a caminho", s: "Chegada estimada em 12 min · pedido #PG-1247", time: "Há 5 min", unread: true },
    { id: 3, type: "promo", icon: "spark", color: "var(--night-900)", bg: "var(--ink-100)",
      t: "Você ganhou R$ 30 de cashback", s: "Indicação aprovada de Pedro Henrique", time: "Há 2h", unread: true },
    { id: 4, type: "system", icon: "info", color: "var(--ink-700)", bg: "var(--ink-100)",
      t: "Atualização nos termos de uso", s: "Pequenas mudanças nas regras de cancelamento", time: "Ontem" },
    { id: 5, type: "review", icon: "star", color: "#B8930F", bg: "rgba(245,197,24,0.12)",
      t: "Avalie seu último serviço", s: "Caçamba retirada por Lúcia há 3 dias", time: "Há 3 dias" },
  ];
  return (
    <div className="pg-screen" data-screen-label="A9 Notificações">
      <StatusBar />
      <TopBar onBack={() => go("home")} title="Avisos"
        right={<button style={{ background: "none", border: "none", color: "var(--text-soft)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Marcar todas</button>} />
      <div className="pg-viewport" style={{ paddingBottom: 80 }}>
        <div style={{ padding: "16px 20px 20px" }}>
          <div className="pg-h-eyebrow" style={{ marginBottom: 8 }}>HOJE</div>
          <div className="pg-stack pg-stack--sm">
            {items.slice(0, 3).map(n => (
              <div key={n.id} className="pg-card pg-card--padded" style={{
                position: "relative",
                borderColor: n.unread ? "var(--border-strong)" : "var(--border)",
                background: n.unread ? "var(--paper)" : "var(--ink-50)",
              }}>
                {n.unread && <span style={{ position: "absolute", top: 14, right: 14, width: 8, height: 8, borderRadius: "50%", background: "var(--green-500)" }} />}
                <div className="pg-row" style={{ gap: 12, alignItems: "flex-start" }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: n.bg, color: n.color, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Icon name={n.icon} size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, paddingRight: 14 }}>{n.t}</div>
                    <div style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 2, lineHeight: 1.4 }}>{n.s}</div>
                    <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 6 }}>{n.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pg-h-eyebrow" style={{ marginTop: 24, marginBottom: 8 }}>ANTERIORES</div>
          <div className="pg-stack pg-stack--sm">
            {items.slice(3).map(n => (
              <div key={n.id} className="pg-card pg-card--padded" style={{ background: "var(--ink-50)" }}>
                <div className="pg-row" style={{ gap: 12, alignItems: "flex-start" }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: n.bg, color: n.color, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Icon name={n.icon} size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{n.t}</div>
                    <div style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 2 }}>{n.s}</div>
                    <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 6 }}>{n.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// FAVORITES
// =====================================================================
const Favorites = ({ go }) => {
  const groups = [
    { neighborhood: "Pinheiros · seu bairro", items: [
      { id: 1, name: "Carlos Mudanças", initials: "CM", rating: 4.7, jobs: 3, lastUsed: "há 2 dias", service: "Frete" },
      { id: 2, name: "Lúcia Caçambas", initials: "LC", rating: 4.6, jobs: 5, lastUsed: "há 1 mês", service: "Caçamba" },
    ]},
    { neighborhood: "Outros bairros", items: [
      { id: 3, name: "JM Transportes", initials: "JM", rating: 4.9, jobs: 1, lastUsed: "há 6 meses", service: "Frete" },
      { id: 4, name: "Auto Socorro 24h", initials: "AS", rating: 4.8, jobs: 2, lastUsed: "há 3 meses", service: "Guincho" },
    ]},
  ];
  return (
    <div className="pg-screen" data-screen-label="A10 Favoritos">
      <StatusBar />
      <TopBar onBack={() => go("profile")} title="Favoritos" />
      <div className="pg-viewport">
        <div style={{ padding: "20px 20px 30px" }}>
          <p style={{ fontSize: 14, color: "var(--text-soft)", margin: "0 0 20px" }}>
            Prestadores que você curtiu. Chame eles direto sem precisar abrir orçamento.
          </p>
          {groups.map(g => (
            <div key={g.neighborhood} style={{ marginBottom: 24 }}>
              <div className="pg-h-eyebrow" style={{ marginBottom: 10 }}>{g.neighborhood.toUpperCase()}</div>
              <div className="pg-stack pg-stack--sm">
                {g.items.map(p => (
                  <div key={p.id} className="pg-card pg-card--padded">
                    <div className="pg-row" style={{ gap: 12 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12, position: "relative",
                        background: "var(--night-900)", color: "var(--green-500)",
                        display: "grid", placeItems: "center",
                        fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 14,
                      }}>
                        {p.initials}
                        <span style={{
                          position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%",
                          background: "var(--paper)", display: "grid", placeItems: "center", color: "#DC2626",
                        }}>
                          <Icon name="heart" size={11} />
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</div>
                        <div className="pg-row" style={{ fontSize: 12, color: "var(--text-soft)", gap: 8, marginTop: 2 }}>
                          <span><Icon name="star" size={11} /> {p.rating}</span>
                          <span>·</span>
                          <span>{p.jobs} pedidos</span>
                          <span>·</span>
                          <span className="pg-tag" style={{ background: "var(--ink-100)", padding: "1px 6px", fontSize: 10 }}>{p.service}</span>
                        </div>
                        <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 4 }}>
                          Último: {p.lastUsed}
                        </div>
                      </div>
                    </div>
                    <div className="pg-row" style={{ marginTop: 12, gap: 8 }}>
                      <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ flex: 1 }}>
                        <Icon name="whatsapp" size={14} /> Conversar
                      </button>
                      <button className="pg-btn pg-btn--primary pg-btn--sm" style={{ flex: 1 }}>
                        Chamar direto
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// ADDRESSES — endereços salvos
// =====================================================================
const Addresses = ({ go }) => {
  const items = [
    { id: 1, label: "Casa", addr: "Rua Augusta, 500, ap. 31, Consolação", icon: "home", primary: true },
    { id: 2, label: "Trabalho", addr: "Av. Paulista, 1000, 12º andar, Bela Vista", icon: "building" },
    { id: 3, label: "Casa da mãe", addr: "Rua dos Pinheiros, 250, Pinheiros", icon: "heart" },
    { id: 4, label: "Obra Vila Madalena", addr: "Rua Aspicuelta, 88, Vila Madalena", icon: "wrench" },
  ];
  return (
    <div className="pg-screen" data-screen-label="A11 Endereços salvos">
      <StatusBar />
      <TopBar onBack={() => go("profile")} title="Endereços salvos" />
      <div className="pg-viewport">
        <div style={{ padding: "20px 20px 30px" }}>
          <div className="pg-stack pg-stack--sm">
            {items.map(it => (
              <div key={it.id} className="pg-card pg-card--padded">
                <div className="pg-row" style={{ gap: 12 }}>
                  <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--ink-100)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Icon name={it.icon} size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pg-row" style={{ gap: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{it.label}</span>
                      {it.primary && <span className="pg-tag pg-tag--green" style={{ fontSize: 9, padding: "1px 6px" }}>PRINCIPAL</span>}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 2, lineHeight: 1.4 }}>{it.addr}</div>
                  </div>
                  <button className="pg-iconbtn" aria-label="Editar"><Icon name="edit" size={16} /></button>
                </div>
              </div>
            ))}
          </div>
          <button className="pg-btn pg-btn--ghost pg-btn--block" style={{ marginTop: 14 }}>
            <Icon name="plus" size={18} /> Adicionar novo endereço
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// REFER — programa de indicação
// =====================================================================
const Refer = ({ go }) => {
  const friends = [
    { name: "Pedro Henrique", status: "completed", reward: 30 },
    { name: "Ana Beatriz", status: "pending", reward: 30 },
    { name: "Roberto Lima", status: "invited" },
  ];
  return (
    <div className="pg-screen" data-screen-label="A12 Indicar amigo">
      <StatusBar />
      <TopBar onBack={() => go("home")} title="Indicar e ganhar" />
      <div className="pg-viewport">
        <div style={{ padding: "20px 20px 30px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Hero */}
          <div className="pg-card pg-card--dark" style={{ padding: 24, position: "relative", overflow: "hidden", textAlign: "center" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 0%, rgba(34,227,163,0.18), transparent 60%)" }} />
            <span style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(34,227,163,0.16)", color: "var(--green-500)", display: "grid", placeItems: "center", margin: "0 auto" }}>
              <Icon name="heart" size={28} />
            </span>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: "16px 0 6px", letterSpacing: "-0.015em" }}>
              R$ 30 pra você. <span style={{ color: "var(--green-500)" }}>R$ 30 pra ele.</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              Cada amigo que faz o primeiro pedido pela sua indicação rende crédito pros dois.
            </p>
          </div>

          {/* Code */}
          <div className="pg-card pg-card--padded">
            <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 8 }}>SEU CÓDIGO</div>
            <div className="pg-row pg-row--between" style={{ background: "var(--ink-50)", borderRadius: 10, padding: "14px 16px", border: "1px dashed var(--border-strong)" }}>
              <span className="pg-mono" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.08em" }}>MARINA30</span>
              <button className="pg-btn pg-btn--ghost pg-btn--sm">
                <Icon name="copy" size={14} /> Copiar
              </button>
            </div>
            <div className="pg-row" style={{ gap: 8, marginTop: 12 }}>
              <button className="pg-btn pg-btn--primary pg-btn--sm" style={{ flex: 1 }}>
                <Icon name="whatsapp" size={16} /> WhatsApp
              </button>
              <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ flex: 1 }}>
                <Icon name="share" size={16} /> Compartilhar
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              ["3", "INDICADOS"],
              ["1", "PRIMEIRO PEDIDO"],
              ["R$ 30", "GANHOS"],
            ].map(([n, l]) => (
              <div key={l} className="pg-card" style={{ padding: 14, textAlign: "center" }}>
                <div className="pg-mono" style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>{n}</div>
                <div className="pg-h-eyebrow" style={{ margin: "4px 0 0", fontSize: 9 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Friends */}
          <div>
            <div className="pg-h-eyebrow" style={{ marginBottom: 10 }}>SEUS INDICADOS</div>
            <div className="pg-stack pg-stack--sm">
              {friends.map(f => {
                const status = {
                  completed: { color: "var(--green-700)", bg: "var(--green-50)", t: "Pedido concluído" },
                  pending:   { color: "var(--orange-600)", bg: "var(--orange-50)", t: "Cadastrou · aguarda 1º pedido" },
                  invited:   { color: "var(--text-mute)", bg: "var(--ink-100)", t: "Convite enviado" },
                }[f.status];
                return (
                  <div key={f.name} className="pg-card pg-card--padded">
                    <div className="pg-row" style={{ gap: 12 }}>
                      <span style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--ink-100)", display: "grid", placeItems: "center", color: "var(--text-soft)" }}>
                        <Icon name="user" size={16} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</div>
                        <span style={{ fontSize: 12, color: status.color, background: status.bg, padding: "2px 8px", borderRadius: 100, marginTop: 4, display: "inline-block" }}>
                          {status.t}
                        </span>
                      </div>
                      {f.reward && (
                        <span className="pg-mono" style={{ fontSize: 14, fontWeight: 700, color: f.status === "completed" ? "var(--green-700)" : "var(--text-mute)" }}>
                          {f.status === "completed" ? "+" : ""}R$ {f.reward}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// PROFILE
// =====================================================================
const Profile = ({ go, fontScale, setFontScale }) => {
  const sections = [
    { label: "Conta", items: [
      { t: "Meus dados", icon: "user", route: null },
      { t: "Endereços salvos", icon: "pin", route: "addresses" },
      { t: "Métodos de pagamento", icon: "money", route: null },
    ]},
    { label: "Atividade", items: [
      { t: "Pedidos", icon: "package", route: "history-list" },
      { t: "Favoritos", icon: "heart", route: "favorites" },
      { t: "Carteira & Cashback", icon: "spark", route: "wallet" },
    ]},
    { label: "Mais", items: [
      { t: "Indicar amigos", icon: "share", route: "refer" },
      { t: "Pedido recorrente", icon: "calendar", route: "recurring" },
      { t: "Dividir frete", icon: "users", route: "joint" },
      { t: "Acessibilidade", icon: "info", route: "accessibility" },
      { t: "Suporte", icon: "headset", route: null },
      { t: "Sair", icon: "arrow-left", route: "landing", danger: true },
    ]},
  ];
  return (
    <div className="pg-screen" data-screen-label="A13 Perfil">
      <StatusBar />
      <TopBar onBack={() => go("home")} title="Perfil" />
      <div className="pg-viewport" style={{ paddingBottom: 80 }}>
        {/* user header */}
        <div style={{ padding: "24px 20px 24px", textAlign: "center", background: "var(--paper)", borderBottom: "1px solid var(--border)" }}>
          <div style={{
            width: 76, height: 76, borderRadius: "50%",
            background: "var(--night-900)", color: "var(--green-500)",
            display: "grid", placeItems: "center", margin: "0 auto",
            fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 26,
          }}>MS</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>Marina Silva</div>
          <div style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 2, fontFamily: "var(--font-mono)" }}>(11) 98765-4321</div>
          <div className="pg-row" style={{ justifyContent: "center", gap: 18, marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--border)" }}>
            <button onClick={() => go("history-list")} style={{ textAlign: "center", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              <div className="pg-mono" style={{ fontSize: 18, fontWeight: 700 }}>12</div>
              <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>PEDIDOS</div>
            </button>
            <div style={{ width: 1, background: "var(--border)" }} />
            <div style={{ textAlign: "center" }}>
              <div className="pg-mono" style={{ fontSize: 18, fontWeight: 700 }}>4,8</div>
              <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>SUA NOTA</div>
            </div>
            <div style={{ width: 1, background: "var(--border)" }} />
            <button onClick={() => go("wallet")} style={{ textAlign: "center", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              <div className="pg-mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--green-700)" }}>R$ 47</div>
              <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>SALDO</div>
            </button>
          </div>
        </div>

        {/* Atalhos prominentes */}
        <div style={{ padding: "16px 20px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <button onClick={() => go("history-list")} style={{
            background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)",
            border: "1px solid #BFDBFE", borderRadius: 14,
            padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            cursor: "pointer", boxShadow: "0 2px 8px rgba(37,99,235,0.08)",
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", display: "grid", placeItems: "center" }}>
              <Icon name="package" size={18} color="#fff" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#0F172A" }}>Pedidos</span>
            <span style={{ fontSize: 10, color: "#475569", marginTop: -2 }}>12 no total</span>
          </button>
          <button onClick={() => go("wallet")} style={{
            background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14,
            padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            cursor: "pointer", boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "#EFF6FF", display: "grid", placeItems: "center" }}>
              <Icon name="spark" size={18} color="#2563EB" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#0F172A" }}>Carteira</span>
            <span style={{ fontSize: 10, color: "#475569", marginTop: -2 }}>R$ 47,80</span>
          </button>
          <button onClick={() => go("favorites")} style={{
            background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14,
            padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            cursor: "pointer", boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "#EFF6FF", display: "grid", placeItems: "center" }}>
              <Icon name="heart" size={18} color="#2563EB" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#0F172A" }}>Favoritos</span>
            <span style={{ fontSize: 10, color: "#475569", marginTop: -2 }}>12 salvos</span>
          </button>
        </div>

        <div style={{ padding: "16px 20px 30px" }}>
          {sections.map(s => (
            <div key={s.label} style={{ marginBottom: 22 }}>
              <div className="pg-h-eyebrow" style={{ marginBottom: 8 }}>{s.label.toUpperCase()}</div>
              <div className="pg-card" style={{ padding: 0, overflow: "hidden" }}>
                {s.items.map((it, i) => (
                  <button key={it.t} onClick={() => it.route && go(it.route)}
                    style={{
                      width: "100%", border: "none", background: "transparent",
                      padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
                      cursor: it.route ? "pointer" : "default", fontFamily: "inherit",
                      borderTop: i === 0 ? "none" : "1px solid var(--border)", textAlign: "left",
                      color: it.danger ? "var(--danger)" : "var(--text)",
                    }}>
                    <Icon name={it.icon} size={18} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{it.t}</span>
                    {it.route && <Icon name="arrow-right" size={16} />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// WALLET
// =====================================================================
const Wallet = ({ go }) => {
  const transactions = [
    { t: "Cashback · Frete #PG-1247", v: 4.20, date: "Hoje", positive: true },
    { t: "Indicação · Pedro Henrique", v: 30.00, date: "Há 2 dias", positive: true },
    { t: "Usado em Caçamba #PG-1183", v: -15.00, date: "Há 1 semana" },
    { t: "Cashback · Caçamba #PG-1183", v: 8.40, date: "Há 1 semana", positive: true },
    { t: "Bônus de boas-vindas", v: 20.00, date: "Há 2 meses", positive: true },
  ];
  return (
    <div className="pg-screen" data-screen-label="A14 Carteira">
      <StatusBar />
      <TopBar onBack={() => go("profile")} title="Carteira" />
      <div className="pg-viewport">
        <div style={{ padding: "20px 20px 30px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Balance card */}
          <div className="pg-card pg-card--dark" style={{ padding: 22, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, background: "radial-gradient(circle, rgba(34,227,163,0.18), transparent 60%)" }} />
            <div className="pg-h-eyebrow" style={{ color: "var(--green-500)", margin: 0 }}>SEU SALDO</div>
            <div className="pg-mono" style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 6, lineHeight: 1 }}>
              R$ 47<span style={{ color: "rgba(255,255,255,0.4)" }}>,80</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 8 }}>
              Aplica automaticamente no próximo pedido. Sem prazo de validade.
            </div>
            <div className="pg-row" style={{ gap: 8, marginTop: 18 }}>
              <button className="pg-btn pg-btn--accent pg-btn--sm" style={{ flex: 1 }}>
                <Icon name="spark" size={14} /> Resgatar via Pix
              </button>
              <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ flex: 1, background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }} onClick={() => go("refer")}>
                <Icon name="heart" size={14} /> Indicar
              </button>
            </div>
          </div>

          {/* Monthly cashback progress */}
          <div className="pg-card pg-card--padded">
            <div className="pg-row pg-row--between" style={{ marginBottom: 10 }}>
              <div className="pg-h-eyebrow" style={{ margin: 0 }}>CASHBACK DESTE MÊS</div>
              <span className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)" }}>ABRIL</span>
            </div>
            <div className="pg-row pg-row--between" style={{ alignItems: "baseline" }}>
              <div className="pg-mono" style={{ fontSize: 22, fontWeight: 700 }}>R$ 12,60<span style={{ color: "var(--text-mute)", fontSize: 14, fontWeight: 500 }}> / 50,00</span></div>
              <span className="pg-tag pg-tag--green" style={{ fontSize: 9 }}>+R$ 4,20 ESTA SEMANA</span>
            </div>
            <div style={{ height: 8, background: "var(--ink-100)", borderRadius: 4, overflow: "hidden", marginTop: 12 }}>
              <div style={{ width: "25%", height: "100%", background: "linear-gradient(90deg, var(--green-500), var(--green-700))", borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 10, lineHeight: 1.5 }}>
              Faça mais <strong>R$ 1.870 em pedidos</strong> esse mês para virar <strong>nível Ouro</strong> (4% de cashback).
            </div>
          </div>

          {/* How it works */}
          <div className="pg-card pg-card--soft" style={{ padding: 16 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 10 }}>COMO ACUMULA</div>
            <div className="pg-stack pg-stack--sm" style={{ fontSize: 13 }}>
              {[
                ["2% de cashback em cada pedido concluído", "spark"],
                ["R$ 30 por amigo indicado que faz o 1º pedido", "heart"],
                ["Bônus em pedidos recorrentes", "calendar"],
              ].map(([t, ic]) => (
                <div key={t} className="pg-row" style={{ gap: 10 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--paper)", display: "grid", placeItems: "center", color: "var(--text)" }}>
                    <Icon name={ic} size={14} />
                  </span>
                  <span style={{ color: "var(--text-soft)" }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions */}
          <div>
            <div className="pg-h-eyebrow" style={{ marginBottom: 10 }}>HISTÓRICO</div>
            <div className="pg-card" style={{ padding: 0 }}>
              {transactions.map((tx, i) => (
                <div key={i} className="pg-row pg-row--between" style={{ padding: "14px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{tx.t}</div>
                    <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>{tx.date}</div>
                  </div>
                  <span className="pg-mono" style={{ fontSize: 14, fontWeight: 700, color: tx.positive ? "var(--green-700)" : "var(--text)" }}>
                    {tx.v > 0 ? "+" : ""}R$ {tx.v.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// HISTORY LIST
// =====================================================================
const HistoryList = ({ go }) => {
  const [tab, setTab] = useStateB("active");
  const orders = {
    active: [
      { id: "PG-1247", service: "Frete", status: "Em andamento", color: "var(--green-700)", bg: "var(--green-50)", date: "Hoje · 09:14", value: 210, provider: "Carlos Mudanças" },
    ],
    past: [
      { id: "PG-1183", service: "Caçamba", status: "Concluído", color: "var(--text-soft)", bg: "var(--ink-100)", date: "21 abr · 14:00", value: 280, provider: "Lúcia Caçambas" },
      { id: "PG-1102", service: "Frete", status: "Concluído", color: "var(--text-soft)", bg: "var(--ink-100)", date: "08 abr · 10:30", value: 195, provider: "Carlos Mudanças" },
      { id: "PG-0987", service: "Guincho", status: "Concluído", color: "var(--text-soft)", bg: "var(--ink-100)", date: "12 mar · 22:14", value: 340, provider: "Auto Socorro 24h" },
      { id: "PG-0921", service: "Frete", status: "Cancelado", color: "var(--danger)", bg: "rgba(220,38,38,0.08)", date: "02 mar · 08:00", value: 0, provider: "—" },
    ],
  };
  const list = orders[tab];
  return (
    <div className="pg-screen" data-screen-label="A15 Histórico">
      <StatusBar />
      <TopBar onBack={() => go("home")} title="Pedidos" />
      <div style={{ padding: "12px 16px 0", borderBottom: "1px solid var(--border)", background: "var(--paper)" }}>
        <div className="pg-segmented">
          <button className={`pg-segmented-item${tab === "active" ? " is-active" : ""}`} onClick={() => setTab("active")}>Em andamento (1)</button>
          <button className={`pg-segmented-item${tab === "past" ? " is-active" : ""}`} onClick={() => setTab("past")}>Anteriores</button>
        </div>
      </div>
      <div className="pg-viewport" style={{ paddingBottom: 80 }}>
        <div style={{ padding: "16px 20px 20px" }}>
          {list.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--text-mute)" }}>
              <Icon name="package" size={40} />
              <p>Nenhum pedido aqui</p>
            </div>
          ) : (
            <div className="pg-stack pg-stack--sm">
              {list.map(o => (
                <button key={o.id} onClick={() => o.status === "Em andamento" ? go("tracking") : go("receipt")}
                  className="pg-card pg-card--padded" style={{ textAlign: "left", cursor: "pointer", border: "1px solid var(--border)", background: "var(--paper)" }}>
                  <div className="pg-row pg-row--between">
                    <span style={{ fontSize: 12, color: o.color, background: o.bg, padding: "3px 10px", borderRadius: 100, fontWeight: 600 }}>
                      {o.status}
                    </span>
                    <span className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", letterSpacing: "0.08em" }}>#{o.id}</span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{o.service} · {o.provider}</div>
                    <div className="pg-row pg-row--between" style={{ marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: "var(--text-soft)" }}>{o.date}</span>
                      <span className="pg-mono" style={{ fontSize: 14, fontWeight: 700 }}>{o.value > 0 ? `R$ ${o.value}` : "—"}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// RECURRING
// =====================================================================
const Recurring = ({ go }) => {
  const active = [
    { t: "Caçamba semanal · Obra Vila Madalena", freq: "Toda segunda", price: "R$ 280", next: "Próxima: 04 mai" },
  ];
  return (
    <div className="pg-screen" data-screen-label="A16 Pedido recorrente">
      <StatusBar />
      <TopBar onBack={() => go("home")} title="Pedidos recorrentes" />
      <div className="pg-viewport">
        <div style={{ padding: "20px 20px 30px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="pg-card pg-card--soft" style={{ padding: 16 }}>
            <div className="pg-row" style={{ gap: 10, alignItems: "flex-start" }}>
              <Icon name="info" size={16} />
              <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.5 }}>
                Programe pedidos que se repetem. Você confirma cada um por WhatsApp 1 dia antes — sem cobrança automática.
              </div>
            </div>
          </div>

          <div>
            <div className="pg-h-eyebrow" style={{ marginBottom: 10 }}>ATIVOS ({active.length})</div>
            <div className="pg-stack pg-stack--sm">
              {active.map(r => (
                <div key={r.t} className="pg-card pg-card--padded">
                  <div className="pg-row pg-row--between">
                    <span className="pg-tag pg-tag--green">ATIVO</span>
                    <span className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)" }}>{r.next}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>{r.t}</div>
                  <div className="pg-row pg-row--between" style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 13, color: "var(--text-soft)" }}>{r.freq}</span>
                    <span className="pg-mono" style={{ fontSize: 14, fontWeight: 700 }}>{r.price}</span>
                  </div>
                  <div className="pg-row" style={{ marginTop: 12, gap: 8 }}>
                    <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ flex: 1 }}>Editar</button>
                    <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ flex: 1, color: "var(--danger)" }}>Pausar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="pg-btn pg-btn--primary pg-btn--block">
            <Icon name="plus" size={18} /> Programar novo recorrente
          </button>

          <div>
            <div className="pg-h-eyebrow" style={{ marginBottom: 10 }}>SUGESTÕES</div>
            <div className="pg-stack pg-stack--sm">
              {[
                ["Caçamba semanal", "Para obras em andamento", "dumpster"],
                ["Frete mensal", "Estoque, escritório, depósito", "truck"],
                ["Mudança programada", "Para data específica futura", "package"],
              ].map(([t, s, ic]) => (
                <button key={t} className="pg-card pg-card--padded" style={{ textAlign: "left", cursor: "pointer", border: "1px dashed var(--border-strong)", background: "transparent" }}>
                  <div className="pg-row" style={{ gap: 12 }}>
                    <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--ink-100)", display: "grid", placeItems: "center" }}>
                      <Icon name={ic} size={16} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{t}</div>
                      <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>{s}</div>
                    </div>
                    <Icon name="arrow-right" size={16} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// JOINT — dividir frete
// =====================================================================
const Joint = ({ go }) => {
  const matches = [
    { name: "Pedro M.", route: "Vila Madalena → Pinheiros", date: "Hoje 14:00", split: "R$ 95 cada", initials: "PM" },
    { name: "Ana L.", route: "Pinheiros → Lapa", date: "Amanhã 09:00", split: "R$ 110 cada", initials: "AL" },
  ];
  return (
    <div className="pg-screen" data-screen-label="A17 Dividir frete">
      <StatusBar />
      <TopBar onBack={() => go("home")} title="Dividir frete" />
      <div className="pg-viewport">
        <div style={{ padding: "20px 20px 30px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="pg-card pg-card--dark" style={{ padding: 22 }}>
            <div className="pg-h-eyebrow" style={{ color: "var(--green-500)", margin: 0 }}>NOVIDADE</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "8px 0 4px", letterSpacing: "-0.015em" }}>
              Tem trajeto parecido? Divida o frete.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              Conecta clientes com origem ou destino próximos no mesmo dia. O prestador faz uma viagem só, vocês dividem o valor.
            </p>
          </div>

          <button className="pg-btn pg-btn--primary pg-btn--block">
            <Icon name="plus" size={18} /> Buscar parceiros para meu trajeto
          </button>

          <div>
            <div className="pg-h-eyebrow" style={{ marginBottom: 10 }}>VIZINHOS COM TRAJETO PRÓXIMO</div>
            <div className="pg-stack pg-stack--sm">
              {matches.map(m => (
                <div key={m.name} className="pg-card pg-card--padded">
                  <div className="pg-row" style={{ gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: "var(--ink-100)", color: "var(--text)",
                      display: "grid", placeItems: "center",
                      fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 13,
                    }}>{m.initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>{m.route}</div>
                      <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 4 }}>{m.date}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>SE DIVIDIR</div>
                      <div className="pg-mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--green-700)", marginTop: 2 }}>{m.split}</div>
                    </div>
                  </div>
                  <button className="pg-btn pg-btn--ghost pg-btn--sm pg-btn--block" style={{ marginTop: 12 }}>
                    <Icon name="whatsapp" size={14} /> Combinar com {m.name.split(" ")[0]}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pg-card pg-card--soft" style={{ padding: 14 }}>
            <div className="pg-row" style={{ gap: 10 }}>
              <Icon name="shield" size={16} />
              <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5 }}>
                Você só paga depois que confirma o serviço. PAGORA media as conversas até o pedido ser fechado.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// ACCESSIBILITY
// =====================================================================
const Accessibility = ({ go }) => {
  const [largeFont, setLargeFont] = useStateB(false);
  const [highContrast, setHighContrast] = useStateB(false);
  const [reduceMotion, setReduceMotion] = useStateB(false);
  const [voiceover, setVoiceover] = useStateB(false);

  const Toggle = ({ on, set, title, sub, icon }) => (
    <button onClick={() => set(!on)} className="pg-card pg-card--padded"
      style={{ textAlign: "left", cursor: "pointer", width: "100%", border: "1px solid var(--border)" }}>
      <div className="pg-row" style={{ gap: 12, alignItems: "center" }}>
        <span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--ink-100)", display: "grid", placeItems: "center" }}>
          <Icon name={icon} size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
        </div>
        <span className="pg-toggle" style={{ background: on ? "var(--green-600)" : "var(--ink-300)" }}>
          <span className="pg-toggle-knob" style={{ transform: on ? "translateX(18px)" : "translateX(0)" }} />
        </span>
      </div>
    </button>
  );

  return (
    <div className="pg-screen" data-screen-label="A18 Acessibilidade">
      <StatusBar />
      <TopBar onBack={() => go("profile")} title="Acessibilidade" />
      <div className="pg-viewport">
        <div style={{ padding: "20px 20px 30px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="pg-card pg-card--soft" style={{ padding: 16 }}>
            <p style={{ fontSize: 14, color: "var(--text-soft)", margin: 0, lineHeight: 1.55 }}>
              A PAGORA foi pensada para todos. Ajustes que facilitam o uso por idosos, baixa visão ou em situações difíceis.
            </p>
          </div>

          <div>
            <div className="pg-h-eyebrow" style={{ marginBottom: 10 }}>VISUAL</div>
            <div className="pg-stack pg-stack--sm">
              <Toggle on={largeFont} set={setLargeFont} title="Fonte maior"
                sub="Aumenta todos os textos do app em 25%" icon="edit" />
              <Toggle on={highContrast} set={setHighContrast} title="Alto contraste"
                sub="Cores mais fortes para melhor leitura sob sol forte" icon="sun-on" />
              <Toggle on={reduceMotion} set={setReduceMotion} title="Reduzir animações"
                sub="Menos movimento na tela" icon="info" />
            </div>
          </div>

          {/* Preview */}
          <div>
            <div className="pg-h-eyebrow" style={{ marginBottom: 10 }}>PRÉVIA</div>
            <div className="pg-card pg-card--padded" style={{
              fontSize: largeFont ? 18 : 14,
              background: highContrast ? "#fff" : "var(--paper)",
              borderColor: highContrast ? "#000" : "var(--border)",
              borderWidth: highContrast ? 2 : 1,
              color: highContrast ? "#000" : "var(--text)",
            }}>
              <div style={{ fontWeight: 700, fontSize: largeFont ? 20 : 16 }}>Pedido confirmado</div>
              <div style={{ marginTop: 6, color: highContrast ? "#000" : "var(--text-soft)" }}>
                Carlos chegará em 12 minutos.
              </div>
              <button className="pg-btn pg-btn--primary"
                style={{ marginTop: 12, fontSize: largeFont ? 16 : 14, height: largeFont ? 56 : 48 }}>
                Acompanhar
              </button>
            </div>
          </div>

          <div>
            <div className="pg-h-eyebrow" style={{ marginBottom: 10 }}>ASSISTÊNCIA</div>
            <div className="pg-stack pg-stack--sm">
              <Toggle on={voiceover} set={setVoiceover} title="Leitura em voz alta"
                sub="O app lê o conteúdo das telas" icon="headset" />
              <button className="pg-card pg-card--padded" style={{ textAlign: "left", cursor: "pointer", width: "100%" }}>
                <div className="pg-row" style={{ gap: 12 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--orange-50)", color: "var(--orange-600)", display: "grid", placeItems: "center" }}>
                    <Icon name="phone" size={18} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Atendimento por telefone</div>
                    <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>0800 940 PAGORA · gratuito</div>
                  </div>
                  <Icon name="arrow-right" size={16} />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.PagoraApp2 = {
  ProvidersMap, Notifications, Favorites, Addresses,
  Refer, Profile, Wallet, HistoryList, Recurring, Joint, Accessibility,
};
