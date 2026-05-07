/* @jsxRuntime classic */
/* global React, Icon, StatusBar, TopBar, Logo */
const { useState: useStateA, useMemo: useMemoA, useEffect: useEffectA } = React;

// =====================================================================
// BOTTOM NAV — for authenticated cliente experience
// =====================================================================
const BottomNav = ({ active, go }) => {
  const tabs = [
    { id: "home", t: "Início", icon: "home" },
    { id: "map", t: "Prestadores", icon: "pin" },
    { id: "history-list", t: "Pedidos", icon: "package" },
    { id: "notifications", t: "Avisos", icon: "bell" },
    { id: "profile", t: "Perfil", icon: "user" },
  ];
  return (
    <nav className="pg-bnav">
      {tabs.map(t => (
        <button key={t.id} className={`pg-bnav-item${active === t.id ? " is-active" : ""}`} onClick={() => go(t.id)}>
          <Icon name={t.icon} size={20} />
          <span>{t.t}</span>
          <span className="pg-bnav-dot" />
        </button>
      ))}
    </nav>
  );
};

// =====================================================================
// LOGIN
// =====================================================================
const Login = ({ go }) => {
  const [phone, setPhone] = useStateA("");
  const [step, setStep] = useStateA("phone"); // phone | otp
  const [otp, setOtp] = useStateA(["", "", "", ""]);

  const formatPhone = (raw) => {
    const d = raw.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  };

  return (
    <div className="pg-screen is-dark" data-screen-label="A1 Login">
      <StatusBar dark />
      <TopBar dark transparent onBack={step === "otp" ? () => setStep("phone") : () => go("landing")} />
      <div className="pg-page">
        <div className="pg-page-body" style={{ paddingTop: 30 }}>
          <Logo size={22} />
          {step === "phone" ? (
            <>
              <div style={{ marginTop: 30 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15, margin: 0, letterSpacing: "-0.02em" }}>
                  Bem-vindo de volta.
                </h1>
                <p style={{ color: "rgba(255,255,255,0.65)", marginTop: 12, fontSize: 15 }}>
                  Use seu WhatsApp. Te enviamos um código de 4 dígitos.
                </p>
              </div>
              <div className="pg-field">
                <span className="pg-label" style={{ color: "rgba(255,255,255,0.7)" }}>Número de WhatsApp</span>
                <div className="pg-input-wrap">
                  <span className="pg-input-icon" style={{ color: "rgba(255,255,255,0.5)" }}>
                    <Icon name="whatsapp" size={18} />
                  </span>
                  <input
                    className="pg-input pg-input--with-icon"
                    inputMode="tel"
                    placeholder="(11) 98765-4321"
                    value={phone}
                    onChange={e => setPhone(formatPhone(e.target.value))}
                    style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.16)", color: "#fff", fontSize: 18, fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <span className="pg-helper" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Não compartilhamos seu número com prestadores antes de você aceitar uma proposta.
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginTop: 30 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2, margin: 0, letterSpacing: "-0.02em" }}>
                  Digite o código que enviamos
                </h1>
                <p style={{ color: "rgba(255,255,255,0.65)", marginTop: 10, fontSize: 14 }}>
                  Para <strong style={{ color: "#fff", fontFamily: "var(--font-mono)" }}>{phone}</strong>
                </p>
              </div>
              <div className="pg-row" style={{ gap: 12, justifyContent: "center", marginTop: 20 }}>
                {otp.map((d, i) => (
                  <input key={i} maxLength={1} value={d}
                    onChange={e => {
                      const newOtp = [...otp];
                      newOtp[i] = e.target.value.replace(/\D/g, "").slice(0, 1);
                      setOtp(newOtp);
                      if (e.target.value && i < 3) {
                        const next = e.target.parentElement.children[i+1];
                        if (next) next.focus();
                      }
                    }}
                    inputMode="numeric"
                    style={{
                      width: 60, height: 70, textAlign: "center",
                      fontSize: 28, fontWeight: 700, fontFamily: "var(--font-mono)",
                      borderRadius: 12, border: "1px solid rgba(255,255,255,0.16)",
                      background: "rgba(255,255,255,0.06)", color: "#fff",
                    }}
                  />
                ))}
              </div>
              <button style={{ background: "none", border: "none", color: "var(--green-500)", fontSize: 13, cursor: "pointer", marginTop: 12 }}>
                Reenviar código em 0:42
              </button>
            </>
          )}
        </div>
        <div className="pg-page-foot" style={{ background: "transparent", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button className="pg-btn pg-btn--accent pg-btn--block pg-btn--lg"
            disabled={step === "phone" ? phone.length < 14 : otp.join("").length < 4}
            onClick={() => step === "phone" ? setStep("otp") : go("onboarding")}>
            {step === "phone" ? "Continuar" : "Verificar e entrar"}
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            {step === "phone" ? "Ao continuar você aceita os termos de uso" : "Não recebeu? Tente por SMS"}
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// ONBOARDING (3 telas curtas)
// =====================================================================
const Onboarding = ({ go }) => {
  const [step, setStep] = useStateA(0);
  const slides = [
    {
      eyebrow: "1 / 3", t: "Você descreve.",
      s: "Conte o que precisa em até 4 passos. Frete, guincho ou caçamba.",
      icon: "edit", color: "var(--green-500)",
    },
    {
      eyebrow: "2 / 3", t: "Prestadores avaliam.",
      s: "Caminhoneiros e pequenas empresas locais enviam orçamentos pelo WhatsApp.",
      icon: "users", color: "var(--orange-500)",
    },
    {
      eyebrow: "3 / 3", t: "Você compara e escolhe.",
      s: "Sem matching automático, sem preço-armadilha. Pagamento direto com quem você escolher.",
      icon: "check-circle", color: "var(--green-500)",
    },
  ];
  const s = slides[step];
  return (
    <div className="pg-screen is-dark" data-screen-label={`A2 Onboarding ${step+1}`}>
      <StatusBar dark />
      <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between" }}>
        <div className="pg-row" style={{ gap: 6 }}>
          {slides.map((_, i) => (
            <span key={i} style={{
              width: i === step ? 22 : 6, height: 6, borderRadius: 3,
              background: i === step ? "var(--green-500)" : "rgba(255,255,255,0.2)",
              transition: "all 0.3s",
            }} />
          ))}
        </div>
        <button onClick={() => go("home")}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          Pular
        </button>
      </div>
      <div className="pg-page">
        <div className="pg-page-body" style={{ alignItems: "center", justifyContent: "center", textAlign: "center", paddingTop: 40 }}>
          <span style={{
            width: 96, height: 96, borderRadius: 24,
            background: "rgba(34,227,163,0.1)",
            border: "1px solid rgba(34,227,163,0.3)",
            color: s.color,
            display: "grid", placeItems: "center",
          }}>
            <Icon name={s.icon} size={42} />
          </span>
          <div className="pg-h-eyebrow" style={{ color: "var(--green-500)", margin: 0 }}>{s.eyebrow}</div>
          <h2 style={{ fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
            {s.t}
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", maxWidth: "32ch", margin: 0, lineHeight: 1.55 }}>
            {s.s}
          </p>
        </div>
        <div className="pg-page-foot" style={{ background: "transparent", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button className="pg-btn pg-btn--accent pg-btn--block pg-btn--lg"
            onClick={() => step < 2 ? setStep(step+1) : go("home")}>
            {step < 2 ? "Próximo" : "Começar"} <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// HOME (autenticada)
// =====================================================================
const HomeAuth = ({ go }) => {
  const activeOrder = {
    id: "PG-1247", service: "Frete", status: "A caminho",
    provider: "Carlos Mudanças", eta: "12 min", value: 210,
  };
  return (
    <div className="pg-screen" data-screen-label="A3 Home autenticada">
      <StatusBar />
      {/* Custom header */}
      <div style={{ padding: "14px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--paper)" }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--text-mute)" }}>Olá,</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Marina Silva 👋</div>
        </div>
        <div className="pg-row" style={{ gap: 8 }}>
          <button className="pg-iconbtn" onClick={() => go("notifications")} aria-label="Avisos" style={{ position: "relative" }}>
            <Icon name="bell" />
            <span style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", background: "var(--orange-500)", border: "2px solid #fff" }} />
          </button>
          <button className="pg-iconbtn" onClick={() => go("profile")} aria-label="Perfil"
            style={{ background: "var(--night-900)", color: "var(--green-500)", fontWeight: 700, fontSize: 13, fontFamily: "var(--font-mono)" }}>
            MS
          </button>
        </div>
      </div>

      <div className="pg-viewport" style={{ paddingBottom: 80 }}>
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Active order card */}
          {activeOrder && (
            <button className="pg-card pg-card--dark" onClick={() => go("tracking")}
              style={{
                position: "relative", overflow: "hidden",
                padding: 20, textAlign: "left", cursor: "pointer", border: "none",
                color: "#fff", display: "flex", flexDirection: "column", gap: 14,
              }}>
              <div style={{
                position: "absolute", top: -40, right: -40, width: 180, height: 180,
                background: "radial-gradient(circle, rgba(34,227,163,0.18), transparent 60%)",
              }} />
              <div className="pg-row pg-row--between">
                <span className="pg-tag pg-tag--green" style={{ background: "rgba(34,227,163,0.16)", color: "var(--green-500)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green-500)", animation: "pg-pulse 1.4s ease-in-out infinite" }} />
                  EM ANDAMENTO
                </span>
                <span className="pg-mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>
                  #{activeOrder.id}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
                  {activeOrder.service} · {activeOrder.provider}
                </div>
                <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, marginTop: 4 }}>
                  Prestador a caminho · chegada em <strong style={{ color: "var(--green-500)", fontFamily: "var(--font-mono)" }}>{activeOrder.eta}</strong>
                </div>
              </div>
              <div className="pg-row pg-row--between" style={{ paddingTop: 8, borderTop: "1px dashed rgba(255,255,255,0.16)" }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Acompanhar no mapa</span>
                <Icon name="arrow-right" size={18} />
              </div>
            </button>
          )}

          {/* Hero CTA */}
          <button onClick={() => go("services")}
            style={{
              border: "none", cursor: "pointer", textAlign: "left",
              background: "var(--green-500)", color: "var(--night-900)",
              borderRadius: "var(--r-xl)", padding: "22px 24px",
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
              boxShadow: "0 14px 28px -14px rgba(34,227,163,0.55)",
            }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.015em" }}>
                Novo pedido
              </div>
              <div style={{ fontSize: 14, marginTop: 4, opacity: 0.75 }}>
                Receba propostas em até 2h
              </div>
            </div>
            <span style={{
              width: 56, height: 56, borderRadius: 16,
              background: "var(--night-900)", color: "var(--green-500)",
              display: "grid", placeItems: "center",
            }}>
              <Icon name="plus" size={28} strokeWidth={3} />
            </span>
          </button>

          {/* Quick services */}
          <div>
            <div className="pg-h-eyebrow" style={{ marginBottom: 10 }}>SERVIÇOS RÁPIDOS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { id: "frete", t: "Frete", icon: "truck", c: "var(--green-50)", ic: "var(--green-700)", route: "frete-1" },
                { id: "guincho", t: "Guincho", icon: "tow", c: "var(--orange-50)", ic: "var(--orange-600)", route: "guincho-1" },
                { id: "cacamba", t: "Caçamba", icon: "dumpster", c: "rgba(245,197,24,0.12)", ic: "#B8930F", route: "cacamba-1" },
              ].map(s => (
                <button key={s.id} onClick={() => go(s.route)} className="pg-card"
                  style={{ padding: 14, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, cursor: "pointer", textAlign: "left", border: "1px solid var(--border)" }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: s.c, color: s.ic, display: "grid", placeItems: "center" }}>
                    <Icon name={s.icon} size={18} />
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{s.t}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recurring + Joint */}
          <div className="pg-card pg-card--padded" style={{ background: "var(--ink-50)", border: "1px dashed var(--ink-300)" }}>
            <div className="pg-row" style={{ gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--paper)", color: "var(--text)", display: "grid", placeItems: "center", border: "1px solid var(--border)" }}>
                <Icon name="calendar" size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Pedido recorrente</div>
                <div style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 2 }}>Caçamba toda semana? Mudança mensal? Programe e ganhe desconto.</div>
              </div>
              <button className="pg-btn pg-btn--ghost pg-btn--sm" onClick={() => go("recurring")}>Configurar</button>
            </div>
            <hr className="pg-divider--dashed" style={{ margin: "14px 0" }} />
            <div className="pg-row" style={{ gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--paper)", color: "var(--text)", display: "grid", placeItems: "center", border: "1px solid var(--border)" }}>
                <Icon name="users" size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Dividir frete <span className="pg-tag pg-tag--green" style={{ marginLeft: 6 }}>NOVO</span></div>
                <div style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 2 }}>Combine com vizinhos no mesmo trajeto e divida o custo.</div>
              </div>
              <button className="pg-btn pg-btn--ghost pg-btn--sm" onClick={() => go("joint")}>Ver</button>
            </div>
          </div>

          {/* Wallet preview */}
          <button onClick={() => go("wallet")} className="pg-card"
            style={{ padding: 18, cursor: "pointer", border: "1px solid var(--border)", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="pg-h-eyebrow" style={{ margin: 0 }}>SEU SALDO</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 24 }}>R$ 47,80</span>
                <span style={{ fontSize: 12, color: "var(--green-700)", fontWeight: 600 }}>+R$ 12 esta semana</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4 }}>Cashback de pedidos · use em qualquer serviço</div>
            </div>
            <Icon name="arrow-right" size={20} />
          </button>

          {/* Refer banner */}
          <button onClick={() => go("refer")}
            style={{
              border: "none", cursor: "pointer", textAlign: "left",
              background: "linear-gradient(120deg, var(--night-900) 0%, var(--night-700) 100%)",
              color: "#fff", borderRadius: "var(--r-xl)", padding: "18px 20px",
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14,
            }}>
            <div>
              <div className="pg-h-eyebrow" style={{ margin: 0, color: "var(--green-500)" }}>INDIQUE E GANHE</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>R$ 30 pra você + R$ 30 pra seu amigo</div>
            </div>
            <Icon name="heart" size={22} />
          </button>

          <div style={{ textAlign: "center", padding: "10px 0", color: "var(--text-mute)", fontSize: 12 }}>
            <Logo size={14} />
          </div>
        </div>
      </div>

      <BottomNav active="home" go={go} />
    </div>
  );
};

// =====================================================================
// TRACKING — mapa estilo Uber
// =====================================================================
const Tracking = ({ go }) => {
  const [stage, setStage] = useStateA(2); // 0 aceito · 1 a caminho · 2 chegou origem · 3 transportando · 4 entregue
  const stages = [
    { t: "Pedido aceito", s: "Carlos confirmou" },
    { t: "A caminho da origem", s: "12 min até você" },
    { t: "Chegou na origem", s: "Carregando os itens" },
    { t: "Transportando", s: "23 min até o destino" },
    { t: "Entregue", s: "Serviço concluído" },
  ];
  const current = stages[stage];

  return (
    <div className="pg-screen" data-screen-label="A4 Acompanhar pedido">
      <StatusBar />

      {/* Map area */}
      <div style={{ position: "relative", height: 380, flexShrink: 0, background: "#E8EEF5", overflow: "hidden" }}>
        {/* Faux map */}
        <svg width="100%" height="100%" viewBox="0 0 390 380" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="mapgrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(7,14,26,0.04)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="390" height="380" fill="#E8EEF5"/>
          <rect width="390" height="380" fill="url(#mapgrid)"/>
          {/* faux blocks */}
          <rect x="20" y="40" width="80" height="60" fill="#D6DEE8" rx="4"/>
          <rect x="120" y="20" width="100" height="80" fill="#D6DEE8" rx="4"/>
          <rect x="240" y="50" width="120" height="70" fill="#D6DEE8" rx="4"/>
          <rect x="30" y="160" width="60" height="80" fill="#D6DEE8" rx="4"/>
          <rect x="110" y="140" width="80" height="70" fill="#D6DEE8" rx="4"/>
          <rect x="210" y="160" width="100" height="60" fill="#D6DEE8" rx="4"/>
          <rect x="40" y="280" width="120" height="60" fill="#D6DEE8" rx="4"/>
          <rect x="180" y="270" width="90" height="70" fill="#D6DEE8" rx="4"/>
          <rect x="290" y="260" width="80" height="80" fill="#D6DEE8" rx="4"/>

          {/* roads */}
          <path d="M0 130 L390 130" stroke="#fff" strokeWidth="14"/>
          <path d="M0 250 L390 250" stroke="#fff" strokeWidth="10"/>
          <path d="M105 0 L105 380" stroke="#fff" strokeWidth="12"/>
          <path d="M225 0 L225 380" stroke="#fff" strokeWidth="10"/>

          {/* route — solid traveled, dashed remaining */}
          <path id="pg-route-traveled" d="M 60 320 L 60 250 L 105 250 L 105 130 L 280 130" stroke="#22E3A3" strokeWidth="5" fill="none" strokeLinecap="round"/>
          <path d="M 280 130 L 320 130 L 320 60" stroke="#22E3A3" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="6,8" opacity="0.5">
            <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.2s" repeatCount="indefinite"/>
          </path>

          {/* full route (used for motion path) */}
          <path id="pg-route-full" d="M 60 320 L 60 250 L 105 250 L 105 130 L 280 130 L 320 130 L 320 60" fill="none" stroke="none"/>

          {/* origin pin */}
          <g transform="translate(60 320)">
            <circle r="14" fill="#fff" stroke="#22E3A3" strokeWidth="3"/>
            <circle r="6" fill="#22E3A3"/>
          </g>
          {/* destination pin */}
          <g transform="translate(320 60)">
            <circle r="14" fill="#fff" stroke="#070E1A" strokeWidth="3"/>
            <circle r="6" fill="#070E1A"/>
          </g>

          {/* truck moving along the route */}
          <g>
            <circle r="22" fill="#070E1A"/>
            <circle r="22" fill="#070E1A" opacity="0.3">
              <animate attributeName="r" from="22" to="40" dur="1.6s" repeatCount="indefinite"/>
              <animate attributeName="opacity" from="0.5" to="0" dur="1.6s" repeatCount="indefinite"/>
            </circle>
            <g transform="translate(-10 -10)" stroke="#22E3A3" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 16V6h12v10"/>
              <path d="M14 9h4l3 3v4h-7"/>
              <circle cx="6" cy="17" r="2"/>
              <circle cx="17" cy="17" r="2"/>
            </g>
            <animateMotion dur="14s" repeatCount="indefinite" rotate="0">
              <mpath xlinkHref="#pg-route-full" />
            </animateMotion>
          </g>
        </svg>

        {/* top floating back */}
        <div style={{ position: "absolute", top: 12, left: 16, right: 16, display: "flex", justifyContent: "space-between" }}>
          <button className="pg-iconbtn" onClick={() => go("home")} aria-label="Voltar"
            style={{ background: "#fff", boxShadow: "0 4px 12px rgba(7,14,26,0.12)" }}>
            <Icon name="arrow-left" />
          </button>
          <button className="pg-iconbtn" aria-label="Centralizar"
            style={{ background: "#fff", boxShadow: "0 4px 12px rgba(7,14,26,0.12)" }}>
            <Icon name="navigation" />
          </button>
        </div>

        {/* ETA chip */}
        <div style={{
          position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
          background: "var(--night-900)", color: "#fff",
          padding: "8px 14px", borderRadius: 100, fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 6px 16px rgba(7,14,26,0.25)",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green-500)", animation: "pg-pulse 1.4s ease-in-out infinite" }} />
          <span style={{ fontFamily: "var(--font-mono)" }}>{current.s}</span>
        </div>
      </div>

      {/* Sheet */}
      <div className="pg-viewport" style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -20, background: "var(--paper)", position: "relative", zIndex: 2, paddingTop: 6 }}>
        <div style={{ width: 40, height: 4, background: "var(--ink-300)", borderRadius: 2, margin: "8px auto 14px" }} />

        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Status */}
          <div>
            <div className="pg-h-eyebrow" style={{ margin: 0 }}>STATUS · #PG-1247</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.015em", marginTop: 4 }}>{current.t}</div>
          </div>

          {/* Stage stepper */}
          <div className="pg-row" style={{ gap: 4 }}>
            {stages.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i <= stage ? "var(--green-500)" : "var(--ink-200)",
              }} />
            ))}
          </div>

          {/* Provider card */}
          <div className="pg-card pg-card--padded">
            <div className="pg-row" style={{ gap: 12 }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "var(--night-900)", color: "var(--green-500)",
                display: "grid", placeItems: "center",
                fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 18,
              }}>CM</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Carlos Mudanças</div>
                <div className="pg-row" style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2, gap: 8 }}>
                  <span><Icon name="star" size={12} /> 4,7 (89)</span>
                  <span>·</span>
                  <span>Mercedes-Benz Sprinter</span>
                </div>
                <div className="pg-mono" style={{ fontSize: 12, marginTop: 4, color: "var(--text)" }}>
                  HBS-2A47 · branca
                </div>
              </div>
              <button className="pg-iconbtn" aria-label="Favoritar" onClick={() => go("favorites")}>
                <Icon name="heart" />
              </button>
            </div>
            <div className="pg-row" style={{ marginTop: 14, gap: 8 }}>
              <button className="pg-btn pg-btn--primary pg-btn--sm" style={{ flex: 1 }} onClick={() => go("chat")}>
                <Icon name="whatsapp" size={16} /> Mensagem
              </button>
              <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ flex: 1 }}>
                <Icon name="phone" size={16} /> Ligar
              </button>
            </div>
          </div>

          {/* Trip summary */}
          <div className="pg-card pg-card--padded">
            <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 12 }}>TRAJETO</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="pg-row" style={{ gap: 12, alignItems: "flex-start" }}>
                <span style={{ marginTop: 4, color: "var(--green-500)" }}><Icon name="pin-fill" size={16} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--text-mute)" }}>ORIGEM</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>Av. Paulista, 1000, Bela Vista</div>
                </div>
              </div>
              <hr className="pg-divider--dashed" style={{ margin: 0 }} />
              <div className="pg-row" style={{ gap: 12, alignItems: "flex-start" }}>
                <span style={{ marginTop: 4, color: "var(--night-900)" }}><Icon name="navigation" size={16} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--text-mute)" }}>DESTINO</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>Rua Augusta, 500, Consolação</div>
                </div>
              </div>
            </div>
            <hr className="pg-divider" style={{ margin: "14px 0" }} />
            <div className="pg-row pg-row--between">
              <span style={{ fontSize: 13, color: "var(--text-soft)" }}>Valor combinado</span>
              <span className="pg-mono" style={{ fontSize: 18, fontWeight: 700 }}>R$ 210</span>
            </div>
            <div className="pg-row pg-row--between" style={{ marginTop: 4 }}>
              <span style={{ fontSize: 12, color: "var(--text-mute)" }}>Pagamento direto via Pix · após o serviço</span>
            </div>
          </div>

          {/* Stage advance (demo) */}
          <div className="pg-row" style={{ gap: 8 }}>
            <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ flex: 1 }} disabled={stage === 0}
              onClick={() => setStage(Math.max(0, stage-1))}>← Etapa anterior</button>
            <button className="pg-btn pg-btn--primary pg-btn--sm" style={{ flex: 1 }} disabled={stage === 4}
              onClick={() => stage === 3 ? go("rate") : setStage(Math.min(4, stage+1))}>Próxima etapa →</button>
          </div>

          <button className="pg-btn pg-btn--ghost pg-btn--block" style={{ color: "var(--danger)" }}>
            <Icon name="alert" size={16} /> Reportar problema
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// CHAT
// =====================================================================
const Chat = ({ go }) => {
  const [msg, setMsg] = useStateA("");
  const [messages, setMessages] = useStateA([
    { from: "p", t: "Oi Marina! Tô a caminho. Estimo 12 min.", time: "10:23" },
    { from: "u", t: "Tranquilo, Carlos! O elevador é pelo subsolo.", time: "10:24" },
    { from: "p", t: "Show, anotado. Algum item especial pra eu já preparar?", time: "10:25" },
    { from: "u", t: "Tem uma geladeira grande. Vc consegue lidar sozinho ou precisa de ajudante?", time: "10:25" },
    { from: "p", t: "Tranquilo, levo carrinho hidráulico. Ela tá vazia?", time: "10:26" },
  ]);

  const send = () => {
    if (!msg.trim()) return;
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setMessages([...messages, { from: "u", t: msg, time }]);
    setMsg("");
    setTimeout(() => {
      setMessages(m => [...m, { from: "p", t: "Boa, mandou bem 👍", time }]);
    }, 1100);
  };

  return (
    <div className="pg-screen" data-screen-label="A5 Chat com prestador">
      <StatusBar />

      {/* Custom header */}
      <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)", background: "var(--paper)" }}>
        <button className="pg-iconbtn" onClick={() => go("tracking")} aria-label="Voltar"><Icon name="arrow-left" /></button>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", background: "var(--night-900)", color: "var(--green-500)",
          display: "grid", placeItems: "center", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 14,
        }}>CM</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Carlos Mudanças</div>
          <div className="pg-row" style={{ fontSize: 11, color: "var(--green-700)", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green-600)" }} />
            Online · pedido #PG-1247
          </div>
        </div>
        <button className="pg-iconbtn" aria-label="Ligar"><Icon name="phone" /></button>
      </div>

      <div className="pg-viewport" style={{ background: "var(--ink-50)", padding: "16px 14px 8px" }}>
        {/* date sep */}
        <div style={{ textAlign: "center", margin: "0 0 16px" }}>
          <span style={{
            display: "inline-block", padding: "4px 10px", borderRadius: 100,
            background: "var(--paper)", border: "1px solid var(--border)",
            fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)",
          }}>HOJE · 27 ABR</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* system msg */}
          <div style={{ alignSelf: "center", textAlign: "center", maxWidth: 280 }}>
            <div style={{
              background: "rgba(34,227,163,0.1)", border: "1px solid rgba(34,227,163,0.25)",
              color: "var(--green-700)", padding: "8px 12px", borderRadius: 12, fontSize: 12,
            }}>
              <Icon name="shield" size={12} /> Conversa protegida pela PAGORA. Não compartilhe dados de pagamento aqui.
            </div>
          </div>

          {messages.map((m, i) => {
            const mine = m.from === "u";
            return (
              <div key={i} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "78%",
                  background: mine ? "var(--night-900)" : "var(--paper)",
                  color: mine ? "#fff" : "var(--text)",
                  padding: "10px 14px",
                  borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  border: mine ? "none" : "1px solid var(--border)",
                  fontSize: 14, lineHeight: 1.4,
                  boxShadow: mine ? "0 1px 2px rgba(7,14,26,0.06)" : "none",
                }}>
                  {m.t}
                  <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, fontFamily: "var(--font-mono)", textAlign: "right" }}>
                    {m.time} {mine && <Icon name="check" size={10} strokeWidth={3} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: 10, borderTop: "1px solid var(--border)", background: "var(--paper)", display: "flex", gap: 8, alignItems: "center" }}>
        <button className="pg-iconbtn" aria-label="Anexar"><Icon name="plus" /></button>
        <input className="pg-input" placeholder="Mensagem"
          value={msg} onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          style={{ background: "var(--ink-50)", border: "none", flex: 1 }} />
        <button className="pg-iconbtn" onClick={send} aria-label="Enviar"
          style={{ background: msg.trim() ? "var(--night-900)" : "var(--ink-100)", color: msg.trim() ? "#fff" : "var(--text-mute)" }}>
          <Icon name="navigation" size={18} />
        </button>
      </div>
    </div>
  );
};

// =====================================================================
// RATE — avaliação obrigatória
// =====================================================================
const Rate = ({ go }) => {
  const [stars, setStars] = useStateA(0);
  const [tags, setTags] = useStateA([]);
  const [comment, setComment] = useStateA("");
  const [favorited, setFavorited] = useStateA(false);

  const tagOpts = stars >= 4
    ? ["Pontual", "Cuidadoso", "Educado", "Equipamento ok", "Bom preço", "Comunicação clara"]
    : ["Atrasou", "Descortês", "Equipamento ruim", "Cobrou extra", "Comunicação ruim", "Danos no item"];

  return (
    <div className="pg-screen" data-screen-label="A6 Avaliar">
      <StatusBar />
      <TopBar onBack={() => go("tracking")} title="Avaliar serviço" />
      <div className="pg-page">
        <div className="pg-page-body">
          <div className="pg-card pg-card--soft" style={{ display: "flex", gap: 12, alignItems: "center", padding: 14 }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--green-50)", color: "var(--green-700)", display: "grid", placeItems: "center" }}>
              <Icon name="check-circle" size={18} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Serviço concluído</div>
              <div style={{ fontSize: 12, color: "var(--text-soft)" }}>#PG-1247 · há 2 minutos</div>
            </div>
          </div>

          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16, background: "var(--night-900)", color: "var(--green-500)",
              display: "grid", placeItems: "center", margin: "0 auto",
              fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 22,
            }}>CM</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "12px 0 4px" }}>Como foi com Carlos?</h2>
            <p style={{ fontSize: 14, color: "var(--text-soft)", margin: 0 }}>
              Sua avaliação ajuda outros clientes a escolher.
            </p>
          </div>

          <div className="pg-row" style={{ justifyContent: "center", gap: 10 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setStars(n)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <svg width="44" height="44" viewBox="0 0 24 24"
                  fill={n <= stars ? "var(--amber-400)" : "transparent"}
                  stroke={n <= stars ? "var(--amber-400)" : "var(--ink-300)"}
                  strokeWidth="2" strokeLinejoin="round">
                  <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8l-6.2 3.2 1.2-6.8-5-4.9 6.9-1L12 2Z"/>
                </svg>
              </button>
            ))}
          </div>

          {stars > 0 && (
            <>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {["Péssimo", "Ruim", "Regular", "Bom", "Excelente"][stars-1]}
                </div>
              </div>

              <div>
                <div className="pg-h-eyebrow" style={{ marginBottom: 10 }}>O QUE DESTACAR?</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {tagOpts.map(t => (
                    <button key={t}
                      onClick={() => setTags(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t])}
                      style={{
                        padding: "8px 14px", borderRadius: 100, border: "1px solid",
                        borderColor: tags.includes(t) ? "var(--night-900)" : "var(--border)",
                        background: tags.includes(t) ? "var(--night-900)" : "var(--paper)",
                        color: tags.includes(t) ? "#fff" : "var(--text)",
                        fontSize: 13, fontWeight: 500, cursor: "pointer",
                      }}>
                      {tags.includes(t) && "✓ "}{t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pg-field">
                <span className="pg-label">Comentário (opcional)</span>
                <textarea className="pg-textarea" rows={3}
                  placeholder="Conte como foi o serviço…"
                  value={comment} onChange={e => setComment(e.target.value)} />
              </div>

              {stars >= 4 && (
                <button className="pg-card" onClick={() => setFavorited(!favorited)}
                  style={{
                    padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center",
                    cursor: "pointer", textAlign: "left", border: "1px solid",
                    borderColor: favorited ? "var(--green-500)" : "var(--border)",
                    background: favorited ? "var(--green-50)" : "var(--paper)",
                  }}>
                  <div className="pg-row" style={{ gap: 12 }}>
                    <Icon name="heart" size={20} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>Adicionar aos favoritos</div>
                      <div style={{ fontSize: 12, color: "var(--text-soft)" }}>Chame Carlos diretamente da próxima vez</div>
                    </div>
                  </div>
                  <span className="pg-toggle" style={{ background: favorited ? "var(--green-600)" : "var(--ink-300)" }}>
                    <span className="pg-toggle-knob" style={{ transform: favorited ? "translateX(18px)" : "translateX(0)" }} />
                  </span>
                </button>
              )}
            </>
          )}
        </div>
        <div className="pg-page-foot">
          <button className="pg-btn pg-btn--primary pg-btn--block pg-btn--lg" disabled={stars === 0}
            onClick={() => go("receipt")}>
            Enviar avaliação
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// RECEIPT
// =====================================================================
const Receipt = ({ go }) => {
  return (
    <div className="pg-screen" data-screen-label="A7 Recibo">
      <StatusBar />
      <TopBar onBack={() => go("home")} title="Comprovante"
        right={<button className="pg-iconbtn"><Icon name="share" /></button>} />
      <div className="pg-page">
        <div className="pg-page-body">
          <div style={{ textAlign: "center", padding: "10px 0 0" }}>
            <span style={{ width: 56, height: 56, borderRadius: 16, background: "var(--green-50)", color: "var(--green-700)", display: "grid", placeItems: "center", margin: "0 auto" }}>
              <Icon name="check-circle" size={26} />
            </span>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "14px 0 4px" }}>Obrigada pela avaliação!</h2>
            <p style={{ fontSize: 14, color: "var(--text-soft)", margin: 0 }}>Aqui está seu comprovante.</p>
          </div>

          {/* Receipt card */}
          <div className="pg-card" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--border)" }}>
            <div style={{ background: "var(--night-900)", color: "#fff", padding: "16px 20px" }}>
              <div className="pg-row pg-row--between">
                <Logo dark size={16} />
                <span className="pg-mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em" }}>
                  COMPROVANTE
                </span>
              </div>
              <div className="pg-mono" style={{ fontSize: 22, fontWeight: 700, marginTop: 12, letterSpacing: "-0.01em" }}>
                R$ 210,00
              </div>
              <div className="pg-row" style={{ gap: 10, marginTop: 6, color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                <span>Frete · 15 km</span>
                <span>·</span>
                <span>27 abr 2026</span>
              </div>
            </div>

            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                ["Pedido", "#PG-1247"],
                ["Prestador", "Carlos Mudanças"],
                ["CPF/CNPJ", "***.456.789-**"],
                ["Veículo", "Mercedes Sprinter HBS-2A47"],
                ["Origem", "Av. Paulista, 1000"],
                ["Destino", "Rua Augusta, 500"],
                ["Distância", "15 km"],
                ["Início", "27 abr · 09:14"],
                ["Conclusão", "27 abr · 11:32"],
                ["Forma de pagamento", "Pix · direto ao prestador"],
              ].map(([k, v]) => (
                <div key={k} className="pg-row pg-row--between">
                  <span style={{ fontSize: 13, color: "var(--text-soft)" }}>{k}</span>
                  <span className="pg-mono" style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <hr className="pg-divider--dashed" />
              <div className="pg-row pg-row--between">
                <span style={{ fontSize: 14, fontWeight: 600 }}>Cashback ganho</span>
                <span className="pg-mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--green-700)" }}>+ R$ 4,20</span>
              </div>
            </div>

            {/* QR */}
            <div style={{ borderTop: "1px dashed var(--ink-300)", padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 70, height: 70, padding: 4, background: "#fff", border: "1px solid var(--border)",
                display: "grid", placeItems: "center", borderRadius: 6,
              }}>
                <svg width="62" height="62" viewBox="0 0 21 21" shapeRendering="crispEdges">
                  {/* faux QR */}
                  <rect width="21" height="21" fill="#fff"/>
                  {[
                    "111111101011010111111",
                    "100000101110010100001",
                    "101110100100110101110",
                    "101110101011110101110",
                    "101110100100010101110",
                    "100000101011010100001",
                    "111111101010101111111",
                    "000000001110011000000",
                    "101010111000110110001",
                    "010101010101010101010",
                    "110011001100110011001",
                    "001100110011001100110",
                    "101010101010101010101",
                    "010110100101011010110",
                    "000000001110100110001",
                    "111111101011001011001",
                    "100000101110100110100",
                    "101110100100011001011",
                    "101110101011010110100",
                    "101110100100100101001",
                    "100000101010101010100",
                  ].map((row, y) => row.split("").map((b, x) =>
                    b === "1" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#070E1A"/> : null
                  ))}
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div className="pg-h-eyebrow" style={{ margin: 0 }}>VERIFIQUE A AUTENTICIDADE</div>
                <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
                  pagora.app/v/PG-1247-A47B
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ flex: 1 }}>
              <Icon name="download" size={16} /> Baixar PDF
            </button>
            <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ flex: 1 }}>
              <Icon name="share" size={16} /> Compartilhar
            </button>
          </div>

          {/* Refer prompt */}
          <div className="pg-card pg-card--dark" style={{ padding: 18 }}>
            <div className="pg-row" style={{ gap: 14 }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(34,227,163,0.16)", color: "var(--green-500)", display: "grid", placeItems: "center" }}>
                <Icon name="heart" size={20} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Curtiu a PAGORA?</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
                  Indique e ganhe R$ 30 por amigo que fizer o primeiro pedido.
                </div>
              </div>
            </div>
            <button className="pg-btn pg-btn--accent pg-btn--block" style={{ marginTop: 14 }} onClick={() => go("refer")}>
              <Icon name="share" size={16} /> Indicar PAGORA
            </button>
          </div>
        </div>
        <div className="pg-page-foot">
          <button className="pg-btn pg-btn--primary pg-btn--block" onClick={() => go("home")}>
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};

window.PagoraApp = {
  BottomNav, Login, Onboarding, HomeAuth, Tracking, Chat, Rate, Receipt,
};
