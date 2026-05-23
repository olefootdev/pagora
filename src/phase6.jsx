/* @jsxRuntime classic */
// =====================================================================
// FASE 6 ADMIN — Painel de operação
// =====================================================================
const { useState: useStateP6, useMemo: useMemoP6 } = React;

// ---------------------------------------------------------------------
// shared admin chrome (web app, NOT mobile)
// ---------------------------------------------------------------------
const AdminShell = ({ children, active, go, title, crumbs }) => {
  const nav = [
    ["admin-dash", "Dashboard", "bar-chart"],
    ["admin-order", "Pedidos", "package"],
    ["admin-dispute", "Disputas", "scales"],
    ["admin-users", "Usuários", "users"],
    ["admin-coupons", "Cupons", "ticket"],
    ["admin-config", "Sistema", "settings"],
  ];
  return (
    <div className="pg-screen" data-screen-label={`P6 ${title}`} style={{ background: "#F4F5F7" }}>
      {/* Top admin bar */}
      <div style={{ height: 52, background: "var(--night-900)", color: "#fff", display: "flex", alignItems: "center", padding: "0 18px", flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>PAGORA<span style={{ color: "var(--green-500)" }}>·</span>ops</span>
        <span className="pg-mono" style={{ marginLeft: 12, fontSize: 10, padding: "2px 8px", background: "rgba(255,255,255,0.08)", borderRadius: 4, color: "var(--green-500)" }}>ADMIN</span>
        <div style={{ flex: 1 }}/>
        <input placeholder="Buscar pedido, CPF, e-mail..." style={{ width: 280, height: 32, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#fff", padding: "0 12px", fontSize: 12, fontFamily: "inherit", marginRight: 16 }}/>
        <span className="pg-mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginRight: 12 }}>SP · 23:14</span>
        <div style={{ width: 28, height: 28, borderRadius: 14, background: "var(--green-500)", color: "var(--night-900)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>RA</div>
      </div>

      {/* Body: sidebar + content */}
      <div className="pg-viewport" style={{ display: "flex", padding: 0 }}>
        <aside style={{ width: 200, background: "#fff", borderRight: "1px solid var(--border)", padding: "16px 8px", flexShrink: 0 }}>
          {nav.map(([id, label, e]) => (
            <button key={id} onClick={() => go(id)} style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "9px 12px", marginBottom: 2,
              background: active === id ? "var(--bg-soft)" : "transparent",
              border: "none", borderRadius: 8, cursor: "pointer",
              fontFamily: "inherit", textAlign: "left",
              fontSize: 13, fontWeight: active === id ? 700 : 500,
              color: active === id ? "var(--text)" : "var(--text-soft)",
            }}>
              <Icon name={e} size={16} color={active === id ? "var(--text)" : "var(--text-soft)"} />
              <span>{label}</span>
            </button>
          ))}
          <div style={{ marginTop: 20, padding: "0 12px" }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>STATUS DO SISTEMA</div>
            <div style={{ marginTop: 8, padding: 10, background: "var(--green-50)", borderRadius: 8 }}>
              <div className="pg-row" style={{ gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--green-500)" }}/>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green-700)" }}>Operacional</span>
              </div>
              <div className="pg-mono" style={{ fontSize: 9, color: "var(--text-soft)", marginTop: 2 }}>Pix · API · Mapa OK</div>
            </div>
          </div>
        </aside>

        <main style={{ flex: 1, overflow: "auto" }}>
          {/* breadcrumbs + title */}
          <div style={{ padding: "16px 24px 0" }}>
            <div className="pg-mono" style={{ fontSize: 10, color: "var(--text-mute)", marginBottom: 6 }}>{crumbs || `OPS / ${title?.toUpperCase()}`}</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>{title}</h1>
          </div>
          <div style={{ padding: 24 }}>{children}</div>
        </main>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 1. DETALHE DE DISPUTA
// ---------------------------------------------------------------------
const AdminDispute = ({ go }) => {
  const [decision, setDecision] = useStateP6(null);
  return (
    <AdminShell go={go} active="admin-dispute" title="Disputa #DSP-0312" crumbs="OPS / DISPUTAS / #DSP-0312">
      {/* Banner */}
      <div style={{ background: "#FFF6E6", border: "1px solid var(--orange-500)", padding: 14, borderRadius: 10, marginBottom: 18, display: "flex", gap: 12, alignItems: "center" }}>
        <Icon name="alert" size={22} color="var(--orange-600)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--orange-600)" }}>Disputa aberta há 4h 12min</div>
          <div style={{ fontSize: 12, color: "var(--text-soft)" }}>SLA de 24h · Cliente pediu reembolso parcial. Valor em escrow: R$ 251,30</div>
        </div>
        <span className="pg-mono" style={{ fontSize: 11, padding: "4px 10px", background: "var(--orange-500)", color: "#fff", borderRadius: 4, fontWeight: 700 }}>ALTA</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        {/* main column */}
        <div>
          <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 10 }}>RECLAMAÇÃO DA CLIENTE</div>
            <div className="pg-row" style={{ gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: "var(--bg-soft)", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)" }}>JS</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Joana Silva</div>
                <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)" }}>cpf 123.456.***-89 · cliente desde 2024 · 18 pedidos</div>
              </div>
            </div>
            <div style={{ background: "var(--bg-soft)", padding: 14, borderRadius: 10, fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>
              "O prestador entregou tudo certo, mas o pé da mesa de jantar chegou trincado. Tenho a foto do antes (no carregamento) e do depois. Queria reembolso parcial de R$ 80 para conserto."
            </div>
            <div className="pg-row" style={{ gap: 8, marginTop: 12 }}>
              <div style={{ width: 80, height: 80, borderRadius: 8, background: "linear-gradient(135deg,#A0826D,#6B4423)", position: "relative" }}>
                <span className="pg-mono" style={{ position: "absolute", top: 4, left: 4, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "2px 6px", borderRadius: 3, fontSize: 8 }}>ANTES</span>
              </div>
              <div style={{ width: 80, height: 80, borderRadius: 8, background: "linear-gradient(135deg,#A0826D,#6B4423)", position: "relative" }}>
                <span className="pg-mono" style={{ position: "absolute", top: 4, left: 4, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "2px 6px", borderRadius: 3, fontSize: 8 }}>DEPOIS</span>
                <span style={{ position: "absolute", bottom: 6, right: 6, width: 12, height: 12, borderRadius: "50%", background: "#EF4444", border: "2px solid #fff" }} />
              </div>
              <div style={{ width: 80, height: 80, borderRadius: 8, background: "var(--bg-soft)", display: "grid", placeItems: "center", color: "var(--text-mute)", fontSize: 11 }}>+1</div>
            </div>
          </div>

          <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 10 }}>RESPOSTA DO PRESTADOR</div>
            <div className="pg-row" style={{ gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: "var(--green-500)", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--night-900)" }}>CM</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Carlos Mudanças <span className="pg-tag pg-tag--green" style={{ fontSize: 9, marginLeft: 4, display: "inline-flex", alignItems: "center", gap: 3 }}><Icon name="medal" size={9} color="currentColor" /> PRATA</span></div>
                <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", display: "flex", alignItems: "center", gap: 4 }}><Icon name="star-fill" size={10} color="var(--amber-400)" /> 4,9 · 87 corridas · 0 disputas anteriores</div>
              </div>
            </div>
            <div style={{ background: "var(--bg-soft)", padding: 14, borderRadius: 10, fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>
              "Carreguei e entreguei conforme protocolo. A foto do 'antes' não mostra o pé claramente. Acredito que já estava trincado. Pode revisar o checklist anexo."
            </div>
          </div>

          <div className="pg-card pg-card--padded">
            <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 12 }}>TIMELINE DA DISPUTA</div>
            {[
              ["19:42", "Disputa aberta pela cliente", "var(--orange-600)"],
              ["19:48", "Sistema notificou prestador", "var(--text-mute)"],
              ["20:14", "Prestador respondeu (acima)", "var(--text-soft)"],
              ["21:30", "Cliente anexou +2 fotos", "var(--text-soft)"],
              ["23:14", "Aguardando decisão admin", "var(--text)"],
            ].map(([t, d, c], i) => (
              <div key={i} className="pg-row" style={{ gap: 12, marginBottom: 8 }}>
                <span className="pg-mono" style={{ width: 50, fontSize: 11, color: "var(--text-mute)" }}>{t}</span>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: c, marginTop: 5 }}/>
                <span style={{ fontSize: 13, color: c }}>{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* right column — decisão */}
        <div>
          <div className="pg-card pg-card--padded" style={{ marginBottom: 16, border: "1.5px solid var(--night-900)" }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 12 }}>SUA DECISÃO</div>
            <div className="pg-stack pg-stack--sm" style={{ marginBottom: 16 }}>
              {[
                { id: "client", t: "Reembolsar cliente integral", v: "R$ 251,30 → cliente", c: "var(--green-500)" },
                { id: "partial", t: "Reembolso parcial (R$ 80)", v: "Pgr cobre · prest. recebe R$ 251,30", c: "var(--green-700)", sug: true },
                { id: "provider", t: "Negar disputa", v: "Prestador recebe integral", c: "var(--text-mute)" },
                { id: "split", t: "Dividir 50/50", v: "R$ 40 cliente · R$ 211,30 prest.", c: "var(--text-soft)" },
              ].map(opt => (
                <label key={opt.id} className="pg-row" style={{
                  padding: 12, borderRadius: 10,
                  border: `1.5px solid ${decision === opt.id ? "var(--night-900)" : "var(--border)"}`,
                  background: decision === opt.id ? "var(--bg-soft)" : "var(--paper)",
                  cursor: "pointer", gap: 10, alignItems: "flex-start",
                }}>
                  <input type="radio" checked={decision === opt.id} onChange={() => setDecision(opt.id)} style={{ marginTop: 3, accentColor: "var(--night-900)" }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {opt.t}
                      {opt.sug && <span className="pg-tag pg-tag--green" style={{ marginLeft: 6, fontSize: 9 }}>SUGESTÃO IA</span>}
                    </div>
                    <div className="pg-mono" style={{ fontSize: 10, color: "var(--text-mute)", marginTop: 2 }}>{opt.v}</div>
                  </div>
                </label>
              ))}
            </div>

            <label className="pg-label">Nota interna</label>
            <textarea className="pg-textarea" placeholder="Justificativa para auditoria..." style={{ marginBottom: 12 }}/>

            <div className="pg-row" style={{ gap: 8 }}>
              <button className="pg-btn pg-btn--ghost" style={{ flex: 1 }}>Salvar rascunho</button>
              <button className="pg-btn pg-btn--accent" style={{ flex: 1 }} disabled={!decision}>Aplicar decisão</button>
            </div>
          </div>

          <div className="pg-card pg-card--padded">
            <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 10 }}>CONTEXTO IA</div>
            <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.6 }}>
              <p style={{ margin: "0 0 8px", display: "flex", gap: 6, alignItems: "flex-start" }}><Icon name="bar-chart" size={14} color="var(--text-mute)" style={{ flexShrink: 0, marginTop: 1 }} /><span><strong>Padrão histórico:</strong> em 78% das disputas com fotos antes/depois claras, o sistema decide reembolso parcial.</span></p>
              <p style={{ margin: "0 0 8px", display: "flex", gap: 6, alignItems: "flex-start" }}><Icon name="scales" size={14} color="var(--text-mute)" style={{ flexShrink: 0, marginTop: 1 }} /><span><strong>Risco:</strong> baixo. Prestador tem 0 disputas, cliente tem 1 disputa anterior (resolvida a favor do prestador).</span></p>
              <p style={{ margin: 0, display: "flex", gap: 6, alignItems: "flex-start" }}><Icon name="money" size={14} color="var(--text-mute)" style={{ flexShrink: 0, marginTop: 1 }} /><span><strong>Custo médio dessa categoria:</strong> R$ 65 cobertos pela PAGORA.</span></p>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

// ---------------------------------------------------------------------
// 2. DETALHE DE PEDIDO
// ---------------------------------------------------------------------
const AdminOrder = ({ go }) => (
  <AdminShell go={go} active="admin-order" title="Pedido #PG-2701" crumbs="OPS / PEDIDOS / #PG-2701">
    {/* status banner */}
    <div className="pg-row" style={{ gap: 16, marginBottom: 20 }}>
      <div className="pg-card pg-card--padded" style={{ flex: 1 }}>
        <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>STATUS</div>
        <div className="pg-row" style={{ marginTop: 6, gap: 6, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: "var(--green-500)" }}/>
          <span style={{ fontSize: 16, fontWeight: 800 }}>Concluído</span>
        </div>
        <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 4 }}>02 abr · 16:14</div>
      </div>
      <div className="pg-card pg-card--padded" style={{ flex: 1 }}>
        <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>VALOR TOTAL</div>
        <div className="pg-mono" style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>R$ 324,00</div>
        <div className="pg-mono" style={{ fontSize: 11, color: "var(--green-700)", marginTop: 2 }}>Pix → liberado</div>
      </div>
      <div className="pg-card pg-card--padded" style={{ flex: 1 }}>
        <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>COMISSÃO PGR</div>
        <div className="pg-mono" style={{ fontSize: 22, fontWeight: 800, marginTop: 6, color: "var(--green-700)" }}>R$ 47,00</div>
        <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>14,5%</div>
      </div>
      <div className="pg-card pg-card--padded" style={{ flex: 1 }}>
        <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>DURAÇÃO</div>
        <div className="pg-mono" style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>1h 47</div>
        <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>+12 min vs estimado</div>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
      <div>
        {/* timeline */}
        <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
          <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 14 }}>TIMELINE</div>
          {[
            ["14:08", "Pedido criado por Joana Silva", "create"],
            ["14:10", "Match com Carlos Mudanças (3min)", "match"],
            ["14:32", "Prestador chegou na origem (pin verificado)", "arrive"],
            ["14:51", "Início do carregamento", "load"],
            ["15:14", "Saiu para entrega (foto checklist OK)", "go"],
            ["15:58", "Chegou no destino", "arrive"],
            ["16:14", "Concluído + pago", "done"],
            ["16:18", "Cliente avaliou nota 5", "rating"],
          ].map(([t, d, k], i) => (
            <div key={i} className="pg-row" style={{ gap: 12, padding: "8px 0", borderBottom: i < 7 ? "1px solid var(--border)" : "none" }}>
              <span className="pg-mono" style={{ width: 50, fontSize: 12, color: "var(--text-mute)" }}>{t}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{d}</span>
              <button style={{ background: "none", border: "none", color: "var(--green-700)", fontSize: 11, cursor: "pointer" }}>logs ›</button>
            </div>
          ))}
        </div>

        {/* mapa */}
        <div className="pg-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="pg-h-eyebrow" style={{ margin: 0, padding: 16, paddingBottom: 0 }}>ROTA</div>
          <div style={{ height: 220, background: "linear-gradient(135deg, #DDE5DD, #B8C9B5)", margin: 16, borderRadius: 8, position: "relative" }}>
            <svg viewBox="0 0 400 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <path d="M 50 150 Q 150 100, 220 80 T 350 50" stroke="var(--green-700)" strokeWidth="3" fill="none" strokeDasharray="2 4"/>
            </svg>
            <span style={{ position: "absolute", bottom: 30, left: 30, background: "var(--night-900)", color: "#fff", padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="pin-fill" size={12} color="#fff" /> ORIGEM</span>
            <span style={{ position: "absolute", top: 30, right: 30, background: "var(--green-500)", color: "var(--night-900)", padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="flag" size={12} color="var(--night-900)" /> DESTINO</span>
            <div style={{ position: "absolute", bottom: 8, left: 8, padding: "4px 8px", background: "rgba(255,255,255,0.9)", borderRadius: 4, fontSize: 10, fontFamily: "var(--font-mono)" }}>18,4 km · 1h 47</div>
          </div>
        </div>
      </div>

      <div>
        <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
          <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 12 }}>PARTES</div>
          {[
            { t: "Cliente", n: "Joana Silva", id: "USR-1029", e: "joana@***" },
            { t: "Prestador", n: "Carlos Mudanças", id: "PRV-0438", e: "carlos@***" },
          ].map(p => (
            <div key={p.t} className="pg-row" style={{ gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: "var(--bg-soft)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{p.n.split(" ").map(s => s[0]).join("")}</div>
              <div style={{ flex: 1 }}>
                <div className="pg-mono" style={{ fontSize: 9, color: "var(--text-mute)" }}>{p.t.toUpperCase()}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.n}</div>
                <div className="pg-mono" style={{ fontSize: 10, color: "var(--text-mute)" }}>{p.id} · {p.e}</div>
              </div>
              <button className="pg-btn pg-btn--ghost pg-btn--sm" onClick={() => go("admin-users")}>ver perfil</button>
            </div>
          ))}
        </div>

        <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
          <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 10 }}>BREAKDOWN FINANCEIRO</div>
          {[
            ["Serviço base", 220],
            ["Içamento", 80, "extra"],
            ["Gorjeta", 24, "tip"],
            ["Total cliente", 324, "subtotal"],
            ["Comissão PAGORA", -47],
            ["Taxa Pix", -2],
            ["IRRF retido", -25.70],
            ["Pago ao prestador", 251.30, "out"],
          ].map(([t, v, k], i) => (
            <div key={i} className="pg-row pg-row--between" style={{
              fontSize: 12, padding: "6px 0",
              borderTop: k === "subtotal" || k === "out" ? "1px solid var(--border)" : "none",
              fontWeight: k === "subtotal" || k === "out" ? 700 : 500,
            }}>
              <span style={{ color: "var(--text-soft)" }}>{t}</span>
              <span className="pg-mono" style={{ color: v < 0 ? "var(--orange-600)" : "var(--text)" }}>R$ {v.toFixed(2).replace(".", ",")}</span>
            </div>
          ))}
        </div>

        <div className="pg-card pg-card--padded">
          <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 10 }}>AÇÕES</div>
          <button className="pg-btn pg-btn--ghost pg-btn--block" style={{ marginBottom: 6, display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Icon name="mail" size={14} color="currentColor" /> Email para ambas as partes</button>
          <button className="pg-btn pg-btn--ghost pg-btn--block" style={{ marginBottom: 6, display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Icon name="refresh" size={14} color="currentColor" /> Reverter pagamento</button>
          <button className="pg-btn pg-btn--ghost pg-btn--block" style={{ marginBottom: 6, color: "var(--orange-600)", display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Icon name="scales" size={14} color="var(--orange-600)" /> Abrir disputa manual</button>
          <button className="pg-btn pg-btn--ghost pg-btn--block" style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Icon name="download" size={14} color="currentColor" /> Exportar logs (JSON)</button>
        </div>
      </div>
    </div>
  </AdminShell>
);

// ---------------------------------------------------------------------
// 3. GESTÃO DE USUÁRIOS
// ---------------------------------------------------------------------
const AdminUsers = ({ go }) => {
  const [tab, setTab] = useStateP6("clients");
  const [filter, setFilter] = useStateP6("all");

  const clients = [
    { n: "Joana Silva", e: "joana@email.com", id: "USR-1029", st: "active", o: 18, sp: 4280, j: "Mar 24" },
    { n: "Pedro Henrique", e: "pedro@email.com", id: "USR-2104", st: "active", o: 7, sp: 1890, j: "Out 24" },
    { n: "Mariana Costa", e: "mari@email.com", id: "USR-3041", st: "flagged", o: 3, sp: 240, j: "Jan 26", flag: "3 disputas em 30d" },
    { n: "Lucas Pereira", e: "lucas@email.com", id: "USR-3155", st: "blocked", o: 12, sp: 1850, j: "Jul 24", flag: "Cobrança contestada" },
    { n: "Ana Beatriz", e: "ana@email.com", id: "USR-4002", st: "active", o: 31, sp: 8420, j: "Fev 23" },
  ];
  const providers = [
    { n: "Carlos Mudanças", e: "carlos@email.com", id: "PRV-0438", st: "active", o: 87, sp: 32840, j: "Set 25", lvl: "medal", lvlColor: "#C0C0C0" },
    { n: "Raquel Frete", e: "raquel@email.com", id: "PRV-0521", st: "pending", o: 0, sp: 0, j: "01 abr 26", flag: "Documentos em análise" },
    { n: "João Caçambas", e: "joao@email.com", id: "PRV-0398", st: "active", o: 142, sp: 87320, j: "Jan 25", lvl: "trophy", lvlColor: "#FFD700" },
    { n: "Helena Mudanças", e: "helena@email.com", id: "PRV-0612", st: "blocked", o: 23, sp: 4820, j: "Ago 25", flag: "nota 3,2 · 3 disputas perdidas" },
  ];
  const data = tab === "clients" ? clients : providers;

  return (
    <AdminShell go={go} active="admin-users" title="Usuários" crumbs="OPS / USUÁRIOS">
      {/* tabs */}
      <div className="pg-row" style={{ gap: 24, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        {[["clients", "Clientes", clients.length], ["providers", "Prestadores", providers.length], ["admins", "Administradores", 4]].map(([k, t, n]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: "10px 0", background: "none", border: "none",
            borderBottom: tab === k ? "2px solid var(--night-900)" : "2px solid transparent",
            fontSize: 14, fontWeight: tab === k ? 700 : 500,
            color: tab === k ? "var(--text)" : "var(--text-soft)",
            cursor: "pointer", fontFamily: "inherit",
          }}>{t} <span className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", marginLeft: 4 }}>{n}</span></button>
        ))}
      </div>

      {/* filters bar */}
      <div className="pg-row" style={{ gap: 8, marginBottom: 14, alignItems: "center" }}>
        <input placeholder="Buscar por nome, e-mail, CPF..." style={{ flex: 1, height: 36, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}/>
        {[["all", "Todos"], ["active", "Ativos"], ["pending", "Pendentes"], ["flagged", "Sinalizados"], ["blocked", "Bloqueados"]].map(([k, t]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            padding: "8px 14px", borderRadius: 100,
            border: filter === k ? "1px solid var(--night-900)" : "1px solid var(--border)",
            background: filter === k ? "var(--night-900)" : "var(--paper)",
            color: filter === k ? "#fff" : "var(--text)",
            fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>{t}</button>
        ))}
        <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="download" size={13} color="currentColor" /> CSV</button>
      </div>

      {/* table */}
      <div className="pg-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 0.6fr 0.5fr", padding: "10px 16px", background: "var(--bg-soft)", borderBottom: "1px solid var(--border)" }}>
          {["Nome", "Email", "ID", tab === "providers" ? "Receita" : "Gasto", tab === "providers" ? "Corridas" : "Pedidos", "Desde", ""].map(h => (
            <div key={h} className="pg-mono" style={{ fontSize: 9, color: "var(--text-mute)", fontWeight: 700 }}>{h.toUpperCase()}</div>
          ))}
        </div>
        {data.filter(r => filter === "all" || r.st === filter).map((u, i) => (
          <div key={u.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 0.6fr 0.5fr", padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)", alignItems: "center", fontSize: 13 }}>
            <div className="pg-row" style={{ gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: "var(--bg-soft)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{u.n.split(" ").map(s => s[0]).join("")}</div>
              <div>
                <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>{u.n} {u.lvl && <Icon name={u.lvl} size={13} color={u.lvlColor} />}</div>
                {u.flag && <div className="pg-mono" style={{ fontSize: 9, color: "var(--orange-600)", display: "flex", alignItems: "center", gap: 3 }}><Icon name="alert" size={9} color="var(--orange-600)" /> {u.flag}</div>}
              </div>
            </div>
            <div className="pg-mono" style={{ fontSize: 12, color: "var(--text-soft)" }}>{u.e}</div>
            <div className="pg-mono" style={{ fontSize: 11 }}>{u.id}</div>
            <div className="pg-mono" style={{ fontSize: 12, fontWeight: 700 }}>R$ {u.sp.toLocaleString("pt-BR")}</div>
            <div className="pg-mono" style={{ fontSize: 12 }}>{u.o}</div>
            <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-soft)" }}>{u.j}</div>
            <div>
              <span style={{
                padding: "2px 8px", borderRadius: 100, fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)",
                background: u.st === "active" ? "var(--green-50)" : u.st === "pending" ? "var(--orange-50)" : u.st === "flagged" ? "var(--orange-50)" : "rgba(220,38,38,0.08)",
                color: u.st === "active" ? "var(--green-700)" : u.st === "pending" ? "var(--orange-600)" : u.st === "flagged" ? "var(--orange-600)" : "var(--danger)",
              }}>{u.st === "active" ? "ATIVO" : u.st === "pending" ? "PEND." : u.st === "flagged" ? "FLAG" : "BLOQ"}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="pg-row pg-row--between" style={{ marginTop: 12, fontSize: 11, color: "var(--text-mute)" }}>
        <span>Mostrando {data.length} de 12.847 usuários</span>
        <div className="pg-row" style={{ gap: 4 }}>
          <button className="pg-btn pg-btn--ghost pg-btn--sm">‹</button>
          <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ background: "var(--night-900)", color: "#fff" }}>1</button>
          <button className="pg-btn pg-btn--ghost pg-btn--sm">2</button>
          <button className="pg-btn pg-btn--ghost pg-btn--sm">3</button>
          <button className="pg-btn pg-btn--ghost pg-btn--sm">›</button>
        </div>
      </div>
    </AdminShell>
  );
};

// ---------------------------------------------------------------------
// 4. CUPONS
// ---------------------------------------------------------------------
const AdminCoupons = ({ go }) => {
  const [showNew, setShowNew] = useStateP6(false);
  const coupons = [
    { code: "PRIMEIRA20", t: "20% off primeiro pedido", uses: "847 / 5000", st: "ativo", exp: "31/05/2026", val: "20%" },
    { code: "VOLTAJA10", t: "R$ 10 off para reativação", uses: "234 / ∞", st: "ativo", exp: "30/06/2026", val: "R$ 10" },
    { code: "FRETESP25", t: "25% off em SP capital", uses: "1.847 / 2000", st: "esgotando", exp: "15/05/2026", val: "25%" },
    { code: "MUDANCA15", t: "15% off mudanças completas", uses: "0 / 1000", st: "agendado", exp: "01/06/2026", val: "15%" },
    { code: "BLACK50", t: "Black Friday — 50% off", uses: "0 / 10000", st: "rascunho", exp: "29/11/2026", val: "50%" },
    { code: "EXPIRED20", t: "Maio · 20% off", uses: "892 / 1000", st: "expirado", exp: "30/04/2026", val: "20%" },
  ];

  return (
    <AdminShell go={go} active="admin-coupons" title="Cupons & Promoções" crumbs="OPS / CUPONS">
      <div className="pg-row pg-row--between" style={{ marginBottom: 18 }}>
        <div className="pg-row" style={{ gap: 16 }}>
          {[
            { l: "Ativos", v: "12", c: "var(--green-700)" },
            { l: "Resgates 30d", v: "3.847", c: "var(--text)" },
            { l: "Receita perdida", v: "R$ 14.2k", c: "var(--orange-600)" },
            { l: "Conversão", v: "12,4%", c: "var(--text)" },
          ].map(s => (
            <div key={s.l} className="pg-card pg-card--padded" style={{ minWidth: 130 }}>
              <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>{s.l.toUpperCase()}</div>
              <div className="pg-mono" style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: s.c }}>{s.v}</div>
            </div>
          ))}
        </div>
        <button className="pg-btn pg-btn--accent" onClick={() => setShowNew(!showNew)}>+ Novo cupom</button>
      </div>

      {showNew && (
        <div className="pg-card pg-card--padded" style={{ marginBottom: 16, border: "1.5px solid var(--night-900)" }}>
          <div className="pg-row pg-row--between" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Criar novo cupom</div>
            <button onClick={() => setShowNew(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="pg-field"><label className="pg-label">Código</label><input className="pg-input" placeholder="EX: PROMO20" style={{ textTransform: "uppercase" }}/></div>
            <div className="pg-field"><label className="pg-label">Tipo de desconto</label>
              <select className="pg-input"><option>Percentual</option><option>Valor fixo</option><option>Frete grátis</option></select>
            </div>
            <div className="pg-field"><label className="pg-label">Valor</label><input className="pg-input" placeholder="20"/></div>
            <div className="pg-field"><label className="pg-label">Limite total de usos</label><input className="pg-input" placeholder="1000"/></div>
            <div className="pg-field"><label className="pg-label">Limite por usuário</label><input className="pg-input" placeholder="1"/></div>
            <div className="pg-field"><label className="pg-label">Validade</label><input className="pg-input" type="date"/></div>
          </div>
          <div className="pg-row" style={{ gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button className="pg-btn pg-btn--ghost" onClick={() => setShowNew(false)}>Cancelar</button>
            <button className="pg-btn pg-btn--ghost">Salvar rascunho</button>
            <button className="pg-btn pg-btn--accent">Criar e ativar</button>
          </div>
        </div>
      )}

      <div className="pg-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 2.2fr 0.8fr 1.4fr 1fr 0.8fr 0.5fr", padding: "10px 16px", background: "var(--bg-soft)", borderBottom: "1px solid var(--border)" }}>
          {["Código", "Descrição", "Desconto", "Resgates", "Validade", "Status", ""].map(h => <div key={h} className="pg-mono" style={{ fontSize: 9, color: "var(--text-mute)", fontWeight: 700 }}>{h.toUpperCase()}</div>)}
        </div>
        {coupons.map((c, i) => {
          const stColors = {
            ativo: ["var(--green-50)", "var(--green-700)"],
            esgotando: ["var(--orange-50)", "var(--orange-600)"],
            agendado: ["#EFE9FA", "#6633CC"],
            rascunho: ["var(--bg-soft)", "var(--text-soft)"],
            expirado: ["rgba(220,38,38,0.08)", "var(--danger)"],
          };
          const [bg, fg] = stColors[c.st];
          return (
            <div key={c.code} style={{ display: "grid", gridTemplateColumns: "1.4fr 2.2fr 0.8fr 1.4fr 1fr 0.8fr 0.5fr", padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)", alignItems: "center", fontSize: 13 }}>
              <div className="pg-mono" style={{ fontWeight: 800, fontSize: 12 }}>{c.code}</div>
              <div style={{ fontSize: 13, color: "var(--text-soft)" }}>{c.t}</div>
              <div className="pg-mono" style={{ fontWeight: 700, color: "var(--green-700)" }}>{c.val}</div>
              <div className="pg-mono" style={{ fontSize: 12 }}>{c.uses}</div>
              <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-soft)" }}>{c.exp}</div>
              <div><span style={{ padding: "2px 8px", borderRadius: 100, background: bg, color: fg, fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{c.st.toUpperCase()}</span></div>
              <div><button style={{ background: "none", border: "none", color: "var(--text-mute)", cursor: "pointer", padding: 4 }}><Icon name="menu" size={16} color="var(--text-mute)" /></button></div>
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
};

// ---------------------------------------------------------------------
// 5. CONFIGURAÇÕES DO SISTEMA
// ---------------------------------------------------------------------
const AdminConfig = ({ go }) => {
  const [tab, setTab] = useStateP6("comissao");
  const [comm, setComm] = useStateP6(15);
  const [surge, setSurge] = useStateP6(true);
  const [maint, setMaint] = useStateP6(false);

  return (
    <AdminShell go={go} active="admin-config" title="Configurações do sistema" crumbs="OPS / CONFIGURAÇÕES">
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
        <aside>
          {[
            ["comissao", "Comissão & Taxas", "money"],
            ["pricing", "Preços dinâmicos", "trending-up"],
            ["payments", "Pagamentos", "credit-card"],
            ["notifications", "Notificações", "bell"],
            ["compliance", "Compliance & LGPD", "lock"],
            ["danger", "Zona de risco", "alert"],
          ].map(([id, t, e]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "10px 14px", marginBottom: 4,
              background: tab === id ? "#fff" : "transparent",
              border: tab === id ? "1px solid var(--border)" : "1px solid transparent",
              borderRadius: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              fontSize: 13, fontWeight: tab === id ? 700 : 500,
              color: id === "danger" ? "var(--danger)" : "var(--text-soft)",
            }}>
              <Icon name={e} size={16} color={id === "danger" ? "var(--danger)" : tab === id ? "var(--text)" : "var(--text-soft)"} /><span>{t}</span>
            </button>
          ))}
        </aside>

        <section>
          {tab === "comissao" && (
            <>
              <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
                <div className="pg-row pg-row--between" style={{ alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>Comissão padrão da plataforma</div>
                    <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4 }}>Aplicada sobre o valor base do serviço, antes de extras e gorjeta.</div>
                  </div>
                  <div className="pg-mono" style={{ fontSize: 32, fontWeight: 800 }}>{comm}<span style={{ fontSize: 18 }}>%</span></div>
                </div>
                <input type="range" min={5} max={25} step={0.5} value={comm} onChange={(e) => setComm(+e.target.value)} className="pg-range"/>
                <div className="pg-row pg-row--between" style={{ marginTop: 6, fontSize: 10, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>
                  <span>5%</span><span>15% atual</span><span>25%</span>
                </div>
                <div style={{ marginTop: 16, padding: 12, background: "var(--orange-50)", borderRadius: 8, fontSize: 12, color: "var(--orange-600)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Icon name="alert" size={14} color="var(--orange-600)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Mudanças impactam <strong>2.847 prestadores ativos</strong>. Período de aviso prévio mínimo: 30 dias.</span>
                </div>
              </div>

              <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>OVERRIDES POR NÍVEL</div>
              <div className="pg-card" style={{ padding: 0, marginBottom: 16 }}>
                {[
                  ["Bronze", "trophy", "#CD7F32", 15, ""],
                  ["Prata", "medal", "#C0C0C0", 13, "−2pp"],
                  ["Ouro", "trophy", "#FFD700", 11, "−4pp"],
                  ["Diamante", "diamond", "#0EA5E9", 9, "−6pp"],
                ].map(([n, ico, ic, v, d], i) => (
                  <div key={n} className="pg-row pg-row--between" style={{ padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name={ico} size={16} color={ic} /><span style={{ fontSize: 13, fontWeight: 600 }}>{n}</span></div>
                    <div className="pg-row" style={{ gap: 12 }}>
                      <span className="pg-mono" style={{ fontSize: 13, fontWeight: 700 }}>{v}%</span>
                      {d && <span className="pg-mono" style={{ fontSize: 11, color: "var(--green-700)" }}>{d}</span>}
                      <button className="pg-btn pg-btn--ghost pg-btn--sm">editar</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>OUTRAS TAXAS</div>
              <div className="pg-card" style={{ padding: 0 }}>
                {[
                  ["Taxa Pix saque", "R$ 2,00", "grátis acima R$ 500"],
                  ["Taxa antecipação", "3,2%", "por antecipação"],
                  ["Taxa cancelamento tardio", "R$ 15,00", "<30 min"],
                  ["IRRF retido", "Auto", "tabela progressiva 2026"],
                ].map(([t, v, d], i) => (
                  <div key={t} className="pg-row pg-row--between" style={{ padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{t}</div>
                      <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>{d}</div>
                    </div>
                    <div className="pg-row" style={{ gap: 12 }}>
                      <span className="pg-mono" style={{ fontSize: 13, fontWeight: 700 }}>{v}</span>
                      <button className="pg-btn pg-btn--ghost pg-btn--sm">editar</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "pricing" && (
            <>
              <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
                <div className="pg-row pg-row--between" style={{ marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>Surge pricing (preço dinâmico)</div>
                    <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4 }}>Aumenta preço em horários ou regiões com alta demanda.</div>
                  </div>
                  <button className="pg-toggle" onClick={() => setSurge(!surge)} style={{ background: surge ? "var(--green-500)" : "var(--ink-200)", border: "none", cursor: "pointer", position: "relative" }}>
                    <span style={{ position: "absolute", top: 2, left: surge ? 20 : 2, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 200ms" }}/>
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div className="pg-field"><label className="pg-label">Multiplicador máximo</label><input className="pg-input" defaultValue="2,0×"/></div>
                  <div className="pg-field"><label className="pg-label">Trigger por demanda</label><input className="pg-input" defaultValue="3+ pedidos/min"/></div>
                  <div className="pg-field"><label className="pg-label">Janela do surge</label><input className="pg-input" defaultValue="15 min"/></div>
                </div>
              </div>

              <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>HORÁRIOS DE PICO PROGRAMADOS</div>
              <div className="pg-card pg-card--padded">
                <div className="pg-row" style={{ gap: 8, marginBottom: 8 }}>
                  {Array.from({length:24}).map((_,h) => (
                    <div key={h} style={{ flex:1, height: 24, background: (h>=17 && h<20) ? "var(--orange-500)" : (h>=11&&h<14) ? "#FBC02D" : "var(--ink-100)", borderRadius: 2 }}/>
                  ))}
                </div>
                <div className="pg-row" style={{ gap: 16, fontSize: 11, color: "var(--text-soft)" }}>
                  <span><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--orange-500)", display: "inline-block", marginRight: 4 }}/>Pico (1,5×)</span>
                  <span><span style={{ width: 8, height: 8, borderRadius: 2, background: "#FBC02D", display: "inline-block", marginRight: 4 }}/>Médio (1,2×)</span>
                  <span><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--ink-100)", display: "inline-block", marginRight: 4 }}/>Normal (1,0×)</span>
                </div>
              </div>
            </>
          )}

          {tab === "payments" && (
            <div className="pg-card pg-card--padded">
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Métodos de pagamento aceitos</div>
              <div className="pg-stack pg-stack--sm">
                {[
                  ["Pix", true, "Provedor: BankX · taxa 0,4%"],
                  ["Cartão de crédito", true, "Stripe · taxa 3,2% + R$ 0,40"],
                  ["Cartão de débito", true, "Stripe · taxa 1,9%"],
                  ["Boleto bancário", false, "Compensação D+1, alta inadimplência"],
                  ["Apple/Google Pay", true, "Habilitado iOS/Android"],
                ].map(([t, on, d]) => (
                  <div key={t} className="pg-row pg-row--between" style={{ padding: 12, background: "var(--bg-soft)", borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{t}</div>
                      <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>{d}</div>
                    </div>
                    <div className="pg-toggle" style={{ background: on ? "var(--green-500)" : "var(--ink-200)", position: "relative" }}>
                      <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: 10, background: "#fff" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div className="pg-card pg-card--padded">
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Templates de notificação</div>
              <div className="pg-stack pg-stack--sm">
                {[
                  ["Pedido criado", "Push + SMS", true],
                  ["Prestador a caminho", "Push", true],
                  ["Serviço concluído", "Push + Email", true],
                  ["Lembrete avaliação (24h)", "Push", true],
                  ["Reativação (30 dias inativo)", "Email", false],
                ].map(([t, ch, on]) => (
                  <div key={t} className="pg-row pg-row--between" style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{t}</div>
                      <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>{ch}</div>
                    </div>
                    <div className="pg-row" style={{ gap: 8 }}>
                      <button className="pg-btn pg-btn--ghost pg-btn--sm">editar</button>
                      <span className={`pg-tag ${on ? "pg-tag--green" : ""}`} style={{ fontSize: 9 }}>{on ? "ATIVO" : "PAUSADO"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "compliance" && (
            <div className="pg-card pg-card--padded">
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>LGPD & Auditoria</div>
              <div className="pg-stack pg-stack--sm">
                <div className="pg-row pg-row--between" style={{ padding: 12, background: "var(--green-50)", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green-700)", display: "flex", alignItems: "center", gap: 6 }}><Icon name="check" size={14} strokeWidth={2.5} color="var(--green-700)" /> DPO designado</div>
                    <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 2 }}>dpo@pagora.com.br · CT-2024-0418</div>
                  </div>
                </div>
                <div className="pg-row pg-row--between" style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Solicitações de exclusão (LGPD)</div>
                    <div style={{ fontSize: 11, color: "var(--text-soft)" }}>3 pendentes · prazo legal 15 dias</div>
                  </div>
                  <button className="pg-btn pg-btn--ghost pg-btn--sm">processar</button>
                </div>
                <div className="pg-row pg-row--between" style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Logs de auditoria (90 dias)</div>
                    <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-soft)" }}>847.302 eventos · S3 criptografado</div>
                  </div>
                  <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="download" size={13} color="currentColor" /> exportar</button>
                </div>
                <div className="pg-row pg-row--between" style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Termos & política de privacidade</div>
                    <div style={{ fontSize: 11, color: "var(--text-soft)" }}>Última atualização 12/03/2026 · v3.4</div>
                  </div>
                  <button className="pg-btn pg-btn--ghost pg-btn--sm">editar</button>
                </div>
              </div>
            </div>
          )}

          {tab === "danger" && (
            <div className="pg-card pg-card--padded" style={{ borderColor: "var(--danger)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--danger)", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}><Icon name="alert" size={18} color="var(--danger)" /> Zona de risco</div>
              <div style={{ fontSize: 12, color: "var(--text-soft)", marginBottom: 18 }}>Ações destrutivas. Requerem 2FA + aprovação de outro admin.</div>

              <div className="pg-row pg-row--between" style={{ padding: 14, background: maint ? "var(--orange-50)" : "var(--bg-soft)", borderRadius: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>{maint && <Icon name="wrench" size={14} color="var(--orange-600)" />}{maint ? "Modo manutenção ATIVO" : "Modo manutenção"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>{maint ? "App offline para clientes desde 22:48" : "Pausa novos pedidos. Pedidos em andamento continuam."}</div>
                </div>
                <button className={`pg-btn ${maint ? "pg-btn--ghost" : "pg-btn--accent"}`} onClick={() => setMaint(!maint)} style={{ borderColor: maint ? "var(--orange-500)" : undefined, color: maint ? "var(--orange-600)" : undefined }}>{maint ? "Reativar" : "Ativar"}</button>
              </div>

              <div className="pg-row pg-row--between" style={{ padding: 14, background: "var(--bg-soft)", borderRadius: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Bloquear novos cadastros</div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>Para conter incidentes de fraude em massa.</div>
                </div>
                <button className="pg-btn pg-btn--ghost">Bloquear</button>
              </div>

              <div className="pg-row pg-row--between" style={{ padding: 14, background: "rgba(220,38,38,0.06)", borderRadius: 8, border: "1px dashed var(--danger)" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--danger)" }}>Killswitch financeiro</div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>Pausa todos os repasses Pix/cartão. Requer 3 admins.</div>
                </div>
                <button className="pg-btn" style={{ background: "var(--danger)", color: "#fff", border: "none" }}>Acionar</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
};

window.PagoraPhase6 = {
  AdminDispute, AdminOrder, AdminUsers, AdminCoupons, AdminConfig,
};
