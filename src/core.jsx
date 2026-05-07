/* @jsxRuntime classic */
/* global React, Icon */
const { useState, useMemo, useEffect } = React;

// =====================================================================
// Status bar (visual only, inside the phone frame)
// =====================================================================
const StatusBar = ({ dark = false }) => (
  <div className={`pg-status${dark ? " is-dark" : ""}`}>
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
const Logo = ({ dark = false, size = 18 }) => (
  <span className={`pg-logo${dark ? " is-dark" : ""}`}>
    <span className="pg-logo-mark">
      <Icon name="logo" size={size} />
    </span>
    <span className="pg-logo-text">PAGORA</span>
  </span>
);

// =====================================================================
// Reusable: Top bar
// =====================================================================
const TopBar = ({ title, onBack, right, dark = false, transparent = false, progress }) => (
  <>
    <div className={`pg-topbar${transparent ? " is-transparent" : ""}${dark ? " is-dark" : ""}`}>
      <div className="pg-row" style={{ gap: 4 }}>
        {onBack ? (
          <button className={`pg-iconbtn${dark ? " is-dark" : ""}`} onClick={onBack} aria-label="Voltar">
            <Icon name="arrow-left" />
          </button>
        ) : <span style={{ width: 8 }} />}
        {title && <span className="pg-topbar-title">{title}</span>}
      </div>
      <div className="pg-row" style={{ gap: 4 }}>{right}</div>
    </div>
    {typeof progress === "number" && (
      <div className="pg-progress" aria-hidden="true">
        <div className="pg-progress-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
    )}
  </>
);

// =====================================================================
// LANDING
// =====================================================================
const Landing = ({ go }) => (
  <div className="pg-screen is-dark" data-screen-label="01 Landing">
    <StatusBar dark />
    <div className="pg-topbar is-dark is-transparent" style={{ borderBottom: "none" }}>
      <Logo dark />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="pg-btn pg-btn--sm" style={{ background: "var(--green-500)", color: "var(--night-900)", border: "none", height: 36, fontWeight: 700 }}
          onClick={() => go("home")}>
          Entrar
        </button>
        <button className="pg-btn pg-btn--sm" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.16)", height: 36 }}
          onClick={() => go("provider-landing")}>
          Sou prestador
        </button>
      </div>
    </div>

    <div className="pg-viewport" style={{ background: "var(--night-900)", color: "#fff" }}>
      {/* HERO */}
      <div style={{ padding: "16px 20px 28px" }}>
        <div className="pg-mono" style={{
          fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
          color: "var(--green-500)", marginBottom: 12,
        }}>
          MARKETPLACE DE LOGÍSTICA PESADA
        </div>
        <h1 style={{
          margin: 0, fontSize: 38, lineHeight: 1.05,
          letterSpacing: "-0.025em", fontWeight: 700, textWrap: "balance",
        }}>
          Frete, guincho e caçamba com <span style={{ color: "var(--green-500)" }}>orçamento transparente</span>.
        </h1>
        <p style={{ margin: "16px 0 0", color: "rgba(255,255,255,0.72)", fontSize: 16, lineHeight: 1.55, maxWidth: "32ch" }}>
          Você descreve, prestadores verificados respondem em até 2h, você compara e escolhe.
        </p>

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="pg-btn pg-btn--accent pg-btn--block pg-btn--lg" onClick={() => go("services")}>
            Solicitar orçamentos
            <Icon name="arrow-right" size={18} />
          </button>
          <button className="pg-btn pg-btn--block" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.16)" }}
            onClick={() => go("how")}>
            Como funciona
          </button>
        </div>

        {/* trust strip */}
        <div style={{
          marginTop: 28, padding: "16px 0",
          borderTop: "1px dashed rgba(255,255,255,0.12)",
          borderBottom: "1px dashed rgba(255,255,255,0.12)",
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
        }}>
          {[
            { icon: "shield", t: "Prestadores", s: "verificados" },
            { icon: "clock", t: "Resposta", s: "em até 2h" },
            { icon: "money", t: "Preço base", s: "transparente" },
          ].map((it, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ color: "var(--green-500)" }}><Icon name={it.icon} size={20} /></span>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{it.t}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{it.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SERVICES */}
      <div style={{ padding: "8px 20px 28px" }}>
        <div className="pg-mono" style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>
          SERVIÇOS DISPONÍVEIS
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { id: "frete", icon: "truck", t: "Frete", s: "Mudanças, cargas, móveis" },
            { id: "guincho", icon: "tow", t: "Guincho", s: "Pane, acidente, remoção" },
            { id: "cacamba", icon: "dumpster", t: "Caçamba", s: "Entulho, demolição, terra" },
            { id: "rodoviario", icon: "package", t: "Rodoviário", s: "Cargas entre cidades" },
          ].map(s => (
            <button key={s.id} onClick={() => go("services", { preselect: s.id })}
              style={{
                background: "var(--night-800)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#fff", borderRadius: 14, padding: 16, textAlign: "left", cursor: "pointer",
                display: "flex", flexDirection: "column", gap: 12,
              }}>
              <span style={{
                width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center",
                background: "rgba(34,227,163,0.12)", color: "var(--green-500)",
              }}><Icon name={s.icon} size={22} /></span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{s.t}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{s.s}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* HOW */}
      <div style={{ padding: "8px 20px 32px" }}>
        <div className="pg-mono" style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>
          COMO FUNCIONA
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { n: "01", t: "Descreva o serviço", s: "Tipo de carga, andares, urgência. Levamos a sério o contexto." },
            { n: "02", t: "Receba propostas", s: "Prestadores avaliam e enviam orçamento via WhatsApp em até 2h." },
            { n: "03", t: "Compare e escolha", s: "Negocie diretamente. Pagamento direto com o prestador." },
          ].map((it, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: 14,
              padding: "14px 4px", borderTop: "1px solid rgba(255,255,255,0.08)",
            }}>
              <span className="pg-mono" style={{ fontSize: 14, color: "var(--green-500)", fontWeight: 700 }}>{it.n}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{it.t}</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{it.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SOCIAL PROOF */}
      <div style={{
        margin: "8px 20px 24px", padding: 18,
        background: "rgba(34,227,163,0.06)",
        border: "1px solid rgba(34,227,163,0.2)",
        borderRadius: 14,
      }}>
        <div className="pg-row" style={{ gap: 8, color: "var(--green-500)" }}>
          {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={14} />)}
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginLeft: 4 }}>4,8/5 · 1.247 serviços</span>
        </div>
        <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 1.5 }}>
          “Recebi 4 propostas em 40 minutos. Comparei e fechei R$ 60 abaixo do que ia pagar antes.”
        </p>
        <div style={{ marginTop: 8, color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Mariana T. — mudança em SP</div>
      </div>

      {/* PROVIDER CTA */}
      <div style={{ padding: "0 20px 32px" }}>
        <div style={{
          background: "var(--night-800)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14, padding: 18,
        }}>
          <div className="pg-tag pg-tag--dark" style={{ background: "rgba(34,227,163,0.12)" }}>PRESTADORES</div>
          <h3 style={{ margin: "10px 0 6px", fontSize: 18, fontWeight: 700 }}>Tem caminhão, guincho ou caçamba?</h3>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.65)", fontSize: 14 }}>
            Cadastre-se grátis. Receba pedidos qualificados pelo WhatsApp.
          </p>
          <button className="pg-btn pg-btn--accent pg-btn--block" style={{ marginTop: 14 }}
            onClick={() => go("provider-landing")}>
            Cadastrar como prestador
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ padding: "16px 20px 28px", borderTop: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
        <div className="pg-row pg-row--between">
          <Logo dark size={14} />
          <span>v1.0 · Brasil</span>
        </div>
        <div style={{ marginTop: 10 }}>© 2026 PAGORA. Pagamento direto com prestador.</div>
      </div>
    </div>
  </div>
);

// =====================================================================
// SERVICE PICKER
// =====================================================================
const SERVICES = [
  { id: "frete", icon: "truck", t: "Frete / Mudança", s: "Móveis, caixas, cargas em geral", available: true },
  { id: "guincho", icon: "tow", t: "Guincho", s: "Pane, acidente, falta de combustível", available: true },
  { id: "cacamba", icon: "dumpster", t: "Caçamba / Entulho", s: "Construção, demolição, jardim", available: true },
  { id: "rodoviario", icon: "package", t: "Transporte rodoviário", s: "Cargas entre cidades", available: false },
];

const ServicePicker = ({ go, preselect }) => {
  const [sel, setSel] = useState(preselect || null);
  return (
    <div className="pg-screen" data-screen-label="02 Selecionar serviço">
      <StatusBar />
      <TopBar onBack={() => go("landing")} title="" />
      <div className="pg-page">
        <div className="pg-page-body">
          <div>
            <div className="pg-h-eyebrow">PASSO 1 DE 5</div>
            <h1 className="pg-h-title">Que serviço você precisa?</h1>
            <p className="pg-h-sub">Cada serviço tem perguntas específicas para um orçamento mais preciso.</p>
          </div>

          <div className="pg-stack">
            {SERVICES.map(s => (
              <button
                key={s.id}
                disabled={!s.available}
                onClick={() => setSel(s.id)}
                className={`pg-tile${sel === s.id ? " is-active" : ""}`}
                style={{ opacity: s.available ? 1 : 0.5 }}
              >
                <div className="pg-row pg-row--between" style={{ alignItems: "flex-start" }}>
                  <div className="pg-tile-icon"><Icon name={s.icon} size={22} /></div>
                  {!s.available && <span className="pg-tag pg-tag--outline">Em breve</span>}
                  {sel === s.id && (
                    <span style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: "var(--green-500)", display: "grid", placeItems: "center", color: "var(--night-900)",
                    }}><Icon name="check" size={14} strokeWidth={3} /></span>
                  )}
                </div>
                <div>
                  <div className="pg-tile-title">{s.t}</div>
                  <div className="pg-tile-sub">{s.s}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="pg-card pg-card--soft" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ color: "var(--text-soft)", marginTop: 2 }}><Icon name="info" size={18} /></span>
            <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--text)" }}>Não é Uber.</strong> Cada serviço pesado tem variáveis (acesso, volume, equipamento). Fazemos as perguntas certas para o prestador chegar preparado.
            </div>
          </div>
        </div>

        <div className="pg-page-foot">
          <button
            className="pg-btn pg-btn--primary pg-btn--block"
            disabled={!sel}
            onClick={() => {
              if (sel === "frete") go("frete-1");
              else if (sel === "guincho") go("guincho-1");
              else if (sel === "cacamba") go("cacamba-1");
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

window.PagoraCore = { StatusBar, TopBar, Logo, Landing, ServicePicker, SERVICES };
