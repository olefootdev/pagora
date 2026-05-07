/* @jsxRuntime classic */
// =====================================================================
// FASE 3 CLIENTE — Pós-serviço + conta
// =====================================================================
const { useState: useStateP3 } = React;
const StatusBarP3 = window.StatusBar;
const TopBarP3 = window.TopBar;

// ---------------------------------------------------------------------
// 1. SERVIÇO CONCLUÍDO — celebratory full-screen
// ---------------------------------------------------------------------
const ServiceDone = ({ go }) => (
  <div className="pg-screen is-dark" data-screen-label="C15 Serviço concluído" style={{ background: "var(--night-900)", color: "#fff" }}>
    <StatusBarP3 dark />
    <div className="pg-viewport" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center" }}>
        {/* confetti dots */}
        <svg width="280" height="60" viewBox="0 0 280 60" style={{ marginBottom: 12, opacity: 0.7 }}>
          {[...Array(18)].map((_, i) => {
            const colors = ["#22E3A3", "#E5640A", "#FBC02D", "#3A6B9C", "#fff"];
            const x = (i * 17 + 8) % 280;
            const y = (i * 13 + 5) % 60;
            return <rect key={i} x={x} y={y} width="6" height="10" fill={colors[i % 5]} transform={`rotate(${i * 27} ${x + 3} ${y + 5})`} rx="1"/>;
          })}
        </svg>

        <div className="pg-anim-in" style={{ width: 120, height: 120, borderRadius: 60, background: "var(--green-500)", display: "grid", placeItems: "center", marginBottom: 24 }}>
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <path d="M14 30 L26 42 L46 18" stroke="var(--night-900)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div className="pg-h-eyebrow" style={{ color: "rgba(255,255,255,0.5)", margin: 0 }}>SERVIÇO CONCLUÍDO</div>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: "8px 0 12px", letterSpacing: "-0.02em" }}>Tudo certo!</h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.5, maxWidth: 300 }}>
          Sua mudança foi entregue às <strong style={{ color: "#fff" }}>16:08</strong>. JM Transportes está aguardando sua confirmação.
        </p>

        {/* trip stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 32, width: "100%", maxWidth: 320 }}>
          {[
            { k: "Duração", v: "1h 47", color: "var(--green-500)" },
            { k: "Distância", v: "18.4 km", color: "#fff" },
            { k: "Paradas", v: "2", color: "#fff" },
          ].map(s => (
            <div key={s.k} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 8px", textAlign: "center" }}>
              <div className="pg-mono" style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.v}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4, fontFamily: "var(--font-mono)" }}>{s.k.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* signature confirmation */}
        <div style={{ marginTop: 28, padding: "14px 16px", background: "rgba(34,227,163,0.1)", borderRadius: 12, border: "1px solid rgba(34,227,163,0.3)", fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
          ✓ Recebimento confirmado pela sua assinatura digital às 16:09
        </div>
      </div>
      <div style={{ padding: 16, paddingBottom: 28, display: "flex", flexDirection: "column", gap: 8 }}>
        <button className="pg-btn pg-btn--accent pg-btn--lg pg-btn--block" onClick={() => go("rate")}>Avaliar serviço</button>
        <button className="pg-btn pg-btn--ghost pg-btn--lg pg-btn--block" style={{ color: "rgba(255,255,255,0.7)" }} onClick={() => go("receipt")}>Ver recibo</button>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------
// 2. GORJETA OPCIONAL
// ---------------------------------------------------------------------
const Tip = ({ go }) => {
  const [pct, setPct] = useStateP3(10);
  const [custom, setCustom] = useStateP3(false);
  const [customVal, setCustomVal] = useStateP3(0);
  const total = 240;
  const tipVal = custom ? customVal : Math.round(total * pct / 100);

  return (
    <div className="pg-screen" data-screen-label="C16 Gorjeta opcional">
      <StatusBarP3 />
      <TopBarP3 onBack={() => go("rate")} title="" />
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: "8px 24px 20px", textAlign: "center" }}>
          <div className="pg-anim-in" style={{ width: 80, height: 80, margin: "20px auto 16px", borderRadius: 40, background: "var(--green-50)", display: "grid", placeItems: "center" }}>
            <span style={{ fontSize: 38 }}>🎁</span>
          </div>
          <div className="pg-h-eyebrow" style={{ margin: 0 }}>VOCÊ DEU 5 ESTRELAS</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 8px", letterSpacing: "-0.02em" }}>Quer reconhecer o JM?</h1>
          <p style={{ color: "var(--text-soft)", fontSize: 14, lineHeight: 1.5 }}>
            Uma gorjeta vai 100% para o prestador. PAGORA não cobra nada por isso.
          </p>
        </div>

        <div style={{ padding: "0 20px" }}>
          {/* options */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
            {[5, 10, 15, 20].map(p => (
              <button key={p} onClick={() => { setPct(p); setCustom(false); }}
                style={{
                  height: 80, borderRadius: 14,
                  border: `1.5px solid ${!custom && pct === p ? "var(--night-900)" : "var(--border)"}`,
                  background: !custom && pct === p ? "var(--night-900)" : "var(--paper)",
                  color: !custom && pct === p ? "#fff" : "var(--text)",
                  cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                }}>
                <div className="pg-mono" style={{ fontSize: 22, fontWeight: 700 }}>{p}%</div>
                <div className="pg-mono" style={{ fontSize: 11, opacity: 0.7 }}>R$ {Math.round(total * p / 100)}</div>
              </button>
            ))}
          </div>

          <button onClick={() => setCustom(true)}
            className="pg-card" style={{ width: "100%", padding: 14, textAlign: "left", cursor: "pointer", border: `1.5px solid ${custom ? "var(--night-900)" : "var(--border)"}`, background: custom ? "var(--bg-soft)" : "var(--paper)", marginBottom: 16 }}>
            <div className="pg-row pg-row--between">
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Valor personalizado</div>
                {custom && (
                  <div className="pg-row" style={{ gap: 4, marginTop: 8 }}>
                    <span className="pg-mono" style={{ fontSize: 16, fontWeight: 700 }}>R$</span>
                    <input type="number" value={customVal} onChange={(e) => setCustomVal(+e.target.value)} autoFocus
                      style={{ width: 80, fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)", border: "none", background: "transparent", outline: "none" }} />
                  </div>
                )}
              </div>
              <span style={{ color: "var(--text-mute)", fontSize: 18 }}>›</span>
            </div>
          </button>

          <button onClick={() => go("receipt")} style={{ background: "none", border: "none", color: "var(--text-soft)", fontSize: 13, fontFamily: "inherit", cursor: "pointer", textDecoration: "underline" }}>
            Não, obrigada (sem gorjeta)
          </button>

          {/* impact info */}
          <div className="pg-card pg-card--soft" style={{ padding: 14, marginTop: 24, fontSize: 12, color: "var(--text-soft)", lineHeight: 1.6 }}>
            🟢 100% da gorjeta vai para o prestador, sem comissão. Você pode adicionar até 24h após o serviço.
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" onClick={() => go("receipt")} disabled={tipVal === 0}>
          Enviar gorjeta de R$ {tipVal}
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 3. DISPUTA — chat-style com timeline
// ---------------------------------------------------------------------
const Dispute = ({ go }) => {
  return (
    <div className="pg-screen" data-screen-label="C17 Disputa contestar">
      <StatusBarP3 />
      <TopBarP3 onBack={() => go("history-list")} title="Disputa #DSP-1142" right={<span className="pg-tag pg-tag--orange" style={{ fontSize: 10 }}>EM ANÁLISE</span>}/>
      <div className="pg-viewport" style={{ paddingBottom: 80 }}>
        <div style={{ padding: 20 }}>
          {/* status banner */}
          <div className="pg-card pg-card--padded" style={{ background: "var(--night-900)", color: "#fff", borderColor: "transparent", marginBottom: 20 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: 9 }}>RESPOSTA EM</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--font-mono)", marginTop: 4, color: "var(--green-500)" }}>23h 14min</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 8 }}>SLA garantido pela PAGORA · você não precisa fazer nada agora</div>
          </div>

          {/* about the dispute */}
          <div className="pg-card pg-card--padded" style={{ marginBottom: 20 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>SOBRE</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>Cobrança extra de R$ 80 não combinada</div>
            <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 4 }}>Pedido #PG-2618 · 02 abr · JM Transportes</div>
            <div className="pg-divider" style={{ margin: "12px 0" }}/>
            <div className="pg-row pg-row--between" style={{ fontSize: 13 }}>
              <span style={{ color: "var(--text-soft)" }}>Valor contestado</span>
              <span className="pg-mono" style={{ fontWeight: 700 }}>R$ 80,00</span>
            </div>
          </div>

          {/* timeline */}
          <div className="pg-h-eyebrow" style={{ margin: "0 0 12px" }}>HISTÓRICO</div>

          <div style={{ position: "relative", paddingLeft: 28 }}>
            <div style={{ position: "absolute", left: 9, top: 12, bottom: 12, width: 2, background: "var(--border)" }} />

            {[
              { who: "you", t: "Você abriu a disputa", time: "Hoje, 09:14", body: "Fui cobrada R$ 80 a mais sem combinar previamente.", icon: "📝", iconColor: "var(--night-900)" },
              { who: "system", t: "PAGORA recebeu o caso", time: "Hoje, 09:14", body: "Analista designado: Marina S.", icon: "🛎", iconColor: "var(--green-500)" },
              { who: "provider", t: "JM Transportes respondeu", time: "Hoje, 11:22", body: "Cliente solicitou içamento de geladeira pelo 3º andar — informei taxa de R$ 80 por mensagem na hora.", icon: "🚚", iconColor: "var(--orange-500)" },
              { who: "you", t: "Você anexou evidência", time: "Hoje, 13:45", body: "Print do chat sem menção a taxa adicional.", icon: "📎", iconColor: "var(--night-900)" },
              { who: "system", t: "Aguardando análise", time: "Em curso", body: "Marina está revisando as evidências.", icon: "⏱", iconColor: "var(--ink-300)", current: true },
            ].map((e, i) => (
              <div key={i} style={{ position: "relative", paddingBottom: 18 }}>
                <div style={{
                  position: "absolute", left: -28, top: 4, width: 22, height: 22, borderRadius: 11,
                  background: e.iconColor, color: "#fff", display: "grid", placeItems: "center",
                  fontSize: 11, border: e.current ? "3px solid var(--green-500)" : "none",
                }}>{e.icon}</div>
                <div className="pg-card" style={{ padding: 10, background: e.current ? "var(--bg-soft)" : "var(--paper)" }}>
                  <div className="pg-row pg-row--between">
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{e.t}</span>
                    <span className="pg-mono" style={{ fontSize: 10, color: "var(--text-mute)" }}>{e.time}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4, lineHeight: 1.5 }}>{e.body}</div>
                </div>
              </div>
            ))}
          </div>

          {/* add evidence */}
          <button className="pg-btn pg-btn--ghost pg-btn--block" style={{ marginTop: 16, border: "1.5px dashed var(--border-strong)" }}>
            + Anexar mais evidências
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 4. SOLICITAR REEMBOLSO
// ---------------------------------------------------------------------
const Refund = ({ go }) => {
  const [type, setType] = useStateP3("partial");
  const [amount, setAmount] = useStateP3(80);
  const [reason, setReason] = useStateP3(null);
  const total = 240;
  const reasons = [
    "Cobrança a mais não combinada",
    "Item danificado durante transporte",
    "Item faltando no destino",
    "Serviço incompleto / não finalizado",
    "Outro",
  ];

  return (
    <div className="pg-screen" data-screen-label="C18 Solicitar reembolso">
      <StatusBarP3 />
      <TopBarP3 onBack={() => go("receipt")} title="Solicitar reembolso" />
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: 20 }}>
          {/* order */}
          <div className="pg-card pg-card--soft" style={{ padding: 14, marginBottom: 20 }}>
            <div className="pg-row pg-row--between">
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Pedido #PG-2618</div>
                <div style={{ fontSize: 11, color: "var(--text-mute)" }}>JM Transportes · 02 abr</div>
              </div>
              <div className="pg-mono" style={{ fontSize: 16, fontWeight: 700 }}>R$ {total}</div>
            </div>
          </div>

          {/* type */}
          <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>TIPO DE REEMBOLSO</div>
          <div className="pg-segmented" style={{ marginBottom: 20 }}>
            <button className={`pg-segmented-item${type === "partial" ? " is-active" : ""}`} onClick={() => setType("partial")}>Parcial</button>
            <button className={`pg-segmented-item${type === "full" ? " is-active" : ""}`} onClick={() => { setType("full"); setAmount(total); }}>Total</button>
          </div>

          {/* amount input (partial) */}
          {type === "partial" && (
            <div style={{ background: "var(--bg-soft)", borderRadius: 14, padding: 20, textAlign: "center", marginBottom: 20 }}>
              <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-soft)", marginBottom: 4 }}>VOCÊ QUER DE VOLTA</div>
              <div className="pg-row" style={{ justifyContent: "center", gap: 4 }}>
                <span className="pg-mono" style={{ fontSize: 26, fontWeight: 700 }}>R$</span>
                <input type="number" value={amount} max={total} onChange={(e) => setAmount(Math.min(total, +e.target.value))}
                  style={{ width: 120, fontSize: 42, fontWeight: 700, fontFamily: "var(--font-mono)", border: "none", background: "transparent", textAlign: "center", outline: "none" }} />
              </div>
              <input type="range" min={0} max={total} step={5} value={amount} onChange={(e) => setAmount(+e.target.value)} className="pg-range" style={{ marginTop: 12 }} />
              <div className="pg-row pg-row--between" style={{ fontSize: 10, color: "var(--text-mute)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                <span>R$ 0</span><span>R$ {total} (total)</span>
              </div>
            </div>
          )}

          {type === "full" && (
            <div style={{ background: "var(--night-900)", color: "#fff", borderRadius: 14, padding: 20, textAlign: "center", marginBottom: 20 }}>
              <div className="pg-h-eyebrow" style={{ margin: 0, color: "rgba(255,255,255,0.5)" }}>REEMBOLSO TOTAL</div>
              <div className="pg-mono" style={{ fontSize: 38, fontWeight: 800, color: "var(--green-500)", marginTop: 6 }}>R$ {total}</div>
            </div>
          )}

          {/* reason */}
          <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>MOTIVO</div>
          <div className="pg-stack pg-stack--sm" style={{ marginBottom: 20 }}>
            {reasons.map(r => {
              const active = reason === r;
              return (
                <button key={r} onClick={() => setReason(r)}
                  className="pg-choice" style={{ borderColor: active ? "var(--night-900)" : "var(--border)", background: active ? "var(--night-900)" : "var(--paper)", color: active ? "#fff" : "var(--text)" }}>
                  <span className={`pg-choice-bullet${active ? " is-active" : ""}`}></span>
                  <span className="pg-choice-body"><span className="pg-choice-title" style={{ color: "inherit", fontSize: 14 }}>{r}</span></span>
                </button>
              );
            })}
          </div>

          {/* refund destination */}
          <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>VOCÊ RECEBE EM</div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="pg-row pg-row--between" style={{ fontSize: 13 }}>
                <span>Forma original (Pix)</span>
                <span className="pg-mono">até 7 dias úteis</span>
              </div>
              <div className="pg-row pg-row--between" style={{ fontSize: 13 }}>
                <span>Saldo PAGORA Wallet</span>
                <span className="pg-tag pg-tag--green" style={{ fontSize: 9 }}>INSTANTÂNEO · +5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" disabled={!reason} onClick={() => go("dispute")}>
          Solicitar reembolso de R$ {amount}
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 5. CONFIGURAÇÕES
// ---------------------------------------------------------------------
const Settings = ({ go }) => {
  const [notif, setNotif] = useStateP3({ orders: true, promos: false, news: true, prov: true });
  const [theme, setTheme] = useStateP3("auto");
  const [lang, setLang] = useStateP3("pt-BR");

  return (
    <div className="pg-screen" data-screen-label="C19 Configurações">
      <StatusBarP3 />
      <TopBarP3 onBack={() => go("profile")} title="Configurações" />
      <div className="pg-viewport" style={{ paddingBottom: 40 }}>
        <SettingsGroup title="CONTA">
          <SettingsItem label="Editar perfil" sub="Nome, foto, telefone" arrow onClick={() => go("edit-profile")} />
          <SettingsItem label="Email e senha" sub="joao@email.com" arrow />
          <SettingsItem label="Endereços" sub="3 cadastrados" arrow onClick={() => go("addresses")} />
          <SettingsItem label="Métodos de pagamento" sub="2 cartões + Pix" arrow />
        </SettingsGroup>

        <SettingsGroup title="NOTIFICAÇÕES">
          <SettingsToggle label="Pedidos e tracking" sub="Status, ETA, conclusão" v={notif.orders} onChange={(v) => setNotif({ ...notif, orders: v })} />
          <SettingsToggle label="Mensagens de prestadores" sub="Chat e atualizações" v={notif.prov} onChange={(v) => setNotif({ ...notif, prov: v })} />
          <SettingsToggle label="Promoções e cupons" sub="Descontos exclusivos" v={notif.promos} onChange={(v) => setNotif({ ...notif, promos: v })} />
          <SettingsToggle label="Novidades PAGORA" sub="Recursos e eventos" v={notif.news} onChange={(v) => setNotif({ ...notif, news: v })} />
        </SettingsGroup>

        <SettingsGroup title="APARÊNCIA">
          <SettingsItem label="Tema" sub={theme === "auto" ? "Automático" : theme === "light" ? "Claro" : "Escuro"} arrow />
          <SettingsItem label="Idioma" sub={lang === "pt-BR" ? "Português (Brasil)" : "English"} arrow />
          <SettingsItem label="Modo idoso" sub="Botões maiores, alto contraste" arrow onClick={() => go("accessibility")} />
        </SettingsGroup>

        <SettingsGroup title="PRIVACIDADE">
          <SettingsItem label="Localização" sub="Sempre" arrow />
          <SettingsItem label="Dados e LGPD" sub="Exportar, gerenciar" arrow onClick={() => go("legal")} />
          <SettingsToggle label="Personalização por uso" sub="Recomendações baseadas em histórico" v={true} onChange={() => {}} />
        </SettingsGroup>

        <SettingsGroup title="SUPORTE">
          <SettingsItem label="Central de ajuda" arrow onClick={() => go("help")} />
          <SettingsItem label="Termos de uso" arrow onClick={() => go("legal")} />
          <SettingsItem label="Política de privacidade" arrow onClick={() => go("legal")} />
          <SettingsItem label="Sobre" sub="Versão 1.4.2" />
        </SettingsGroup>

        <div style={{ padding: "0 20px" }}>
          <button onClick={() => go("delete-account")} className="pg-btn pg-btn--block" style={{ height: 48, background: "transparent", color: "var(--orange-500)", fontWeight: 600, marginTop: 12 }}>
            Excluir conta
          </button>
          <button className="pg-btn pg-btn--block" style={{ height: 48, background: "transparent", color: "var(--text-mute)", marginTop: 4 }}>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingsGroup = ({ title, children }) => (
  <div style={{ marginTop: 24 }}>
    <div className="pg-h-eyebrow" style={{ margin: "0 20px 8px" }}>{title}</div>
    <div style={{ background: "var(--paper)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      {children}
    </div>
  </div>
);
const SettingsItem = ({ label, sub, arrow, onClick }) => (
  <button onClick={onClick}
    style={{ width: "100%", padding: "14px 20px", background: "transparent", border: "none", borderTop: "1px solid var(--border)", textAlign: "left", cursor: onClick ? "pointer" : "default", fontFamily: "inherit" }}>
    <div className="pg-row pg-row--between">
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>{sub}</div>}
      </div>
      {arrow && <span style={{ color: "var(--text-mute)", fontSize: 18 }}>›</span>}
    </div>
  </button>
);
const SettingsToggle = ({ label, sub, v, onChange }) => (
  <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)" }}>
    <div className="pg-row pg-row--between">
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>{sub}</div>}
      </div>
      <button className="pg-toggle" onClick={() => onChange(!v)}
        style={{ background: v ? "var(--night-900)" : "var(--ink-200)", border: "none", padding: 0, position: "relative", cursor: "pointer" }}>
        <span style={{ position: "absolute", top: 2, left: v ? 20 : 2, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 200ms" }} />
      </button>
    </div>
  </div>
);

// ---------------------------------------------------------------------
// 6. AJUDA / FAQ / CENTRAL
// ---------------------------------------------------------------------
const Help = ({ go }) => {
  const [search, setSearch] = useStateP3("");
  const [open, setOpen] = useStateP3(0);
  const cats = [
    { icon: "📦", t: "Sobre pedidos", n: 18 },
    { icon: "💳", t: "Pagamentos", n: 12 },
    { icon: "🚚", t: "Frete e mudança", n: 24 },
    { icon: "🔧", t: "Guincho", n: 9 },
    { icon: "🪣", t: "Caçamba", n: 7 },
    { icon: "👤", t: "Minha conta", n: 11 },
  ];
  const faqs = [
    { q: "Como funciona o orçamento?", a: "Você descreve o serviço, prestadores próximos avaliam e te enviam propostas em até 2h. Você compara preço, avaliação e o que está incluso, e escolhe quem prefere." },
    { q: "Quando pago?", a: "O pagamento só é cobrado depois que você aceita uma proposta. Aceitamos Pix, cartão (até 12x) e boleto. O valor fica retido até 24h após o serviço." },
    { q: "Posso cancelar?", a: "Sim, a qualquer momento. Cancelamentos com motivo justificado (atraso, no-show, conduta) não têm taxa. Outros motivos têm taxa de R$ 25." },
    { q: "Tem seguro?", a: "Todos os fretes incluem seguro mínimo de R$ 1.500. Para cargas de valor maior, contrate o seguro estendido na hora do pedido." },
    { q: "E se algo quebrar?", a: "Você tem 24h para abrir uma disputa pelo recibo. Anexe fotos e nosso time analisa em até 24h. Se procedente, ressarcimos integralmente." },
  ];

  return (
    <div className="pg-screen" data-screen-label="C20 Ajuda Central">
      <StatusBarP3 />
      <TopBarP3 onBack={() => go("profile")} title="Central de ajuda" />
      <div className="pg-viewport" style={{ paddingBottom: 40 }}>
        <div style={{ padding: 20 }}>
          {/* search */}
          <div className="pg-input-wrap" style={{ marginBottom: 24 }}>
            <span className="pg-input-icon">🔍</span>
            <input className="pg-input pg-input--with-icon" placeholder="Como podemos ajudar?" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {/* quick contact */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 28 }}>
            <button className="pg-card" style={{ padding: 16, textAlign: "center", cursor: "pointer", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>💬</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Falar com humano</div>
              <div style={{ fontSize: 11, color: "var(--text-mute)" }}>resposta em &lt; 2 min</div>
            </button>
            <button className="pg-card" style={{ padding: 16, textAlign: "center", cursor: "pointer", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>📧</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Email</div>
              <div style={{ fontSize: 11, color: "var(--text-mute)" }}>resposta em 24h</div>
            </button>
          </div>

          {/* categories */}
          <div className="pg-h-eyebrow" style={{ margin: "0 0 12px" }}>POR CATEGORIA</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 28 }}>
            {cats.map(c => (
              <button key={c.t} className="pg-card" style={{ padding: 14, textAlign: "left", cursor: "pointer", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{c.t}</div>
                <div style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{c.n} ARTIGOS</div>
              </button>
            ))}
          </div>

          {/* FAQ accordion */}
          <div className="pg-h-eyebrow" style={{ margin: "0 0 12px" }}>PERGUNTAS FREQUENTES</div>
          <div style={{ background: "var(--paper)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            {faqs.map((f, i) => (
              <div key={i} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <button onClick={() => setOpen(open === i ? -1 : i)}
                  style={{ width: "100%", padding: "16px 16px", background: "transparent", border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                  <div className="pg-row pg-row--between">
                    <span style={{ fontSize: 14, fontWeight: 600, paddingRight: 12 }}>{f.q}</span>
                    <span style={{ color: "var(--text-mute)", fontSize: 18, transform: open === i ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>⌄</span>
                  </div>
                </button>
                {open === i && (
                  <div style={{ padding: "0 16px 16px", fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>{f.a}</div>
                )}
              </div>
            ))}
          </div>

          <div className="pg-card pg-card--soft" style={{ padding: 14, marginTop: 20, fontSize: 12, color: "var(--text-soft)", lineHeight: 1.6 }}>
            🟢 Suporte 7 dias por semana, 7h-23h. Em emergências, use o botão <button onClick={() => go("sos")} style={{ color: "var(--orange-500)", fontWeight: 700, background: "none", border: "none", padding: 0, cursor: "pointer" }}>SOS</button>.
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 7. TERMOS / LGPD
// ---------------------------------------------------------------------
const Legal = ({ go }) => {
  const [tab, setTab] = useStateP3("lgpd");

  return (
    <div className="pg-screen" data-screen-label="C21 Termos LGPD">
      <StatusBarP3 />
      <TopBarP3 onBack={() => go("settings")} title="Termos e privacidade" />
      <div className="pg-viewport" style={{ paddingBottom: 40 }}>
        <div style={{ padding: "16px 20px 0" }}>
          <div className="pg-segmented">
            <button className={`pg-segmented-item${tab === "lgpd" ? " is-active" : ""}`} onClick={() => setTab("lgpd")}>LGPD</button>
            <button className={`pg-segmented-item${tab === "terms" ? " is-active" : ""}`} onClick={() => setTab("terms")}>Termos</button>
            <button className={`pg-segmented-item${tab === "privacy" ? " is-active" : ""}`} onClick={() => setTab("privacy")}>Privacidade</button>
          </div>
        </div>

        {tab === "lgpd" && (
          <div style={{ padding: 20 }}>
            <div className="pg-card pg-card--padded" style={{ background: "var(--bg-soft)", borderColor: "transparent", marginBottom: 20 }}>
              <div className="pg-row" style={{ gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: "var(--green-500)", color: "var(--night-900)", display: "grid", placeItems: "center", fontSize: 20, fontWeight: 800 }}>🔒</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Seus dados, suas regras</div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>Você controla o que compartilhamos.</div>
                </div>
              </div>
            </div>

            <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>DIREITOS DO TITULAR (LGPD)</div>
            <div className="pg-stack pg-stack--sm" style={{ marginBottom: 24 }}>
              {[
                { i: "📥", t: "Acessar seus dados", s: "Solicite uma cópia completa em CSV/JSON" },
                { i: "✏️", t: "Corrigir dados incorretos", s: "Edite ou peça correção" },
                { i: "🗑", t: "Apagar dados", s: "Solicite remoção parcial ou total" },
                { i: "⏸", t: "Pausar tratamento", s: "Restrinja o uso temporariamente" },
                { i: "📤", t: "Portabilidade", s: "Exportar para outro serviço" },
                { i: "❌", t: "Revogar consentimento", s: "Para finalidades específicas" },
              ].map(r => (
                <button key={r.t} className="pg-card" style={{ width: "100%", padding: 14, textAlign: "left", cursor: "pointer", border: "1px solid var(--border)" }}>
                  <div className="pg-row" style={{ gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{r.i}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{r.t}</div>
                      <div style={{ fontSize: 12, color: "var(--text-mute)" }}>{r.s}</div>
                    </div>
                    <span style={{ color: "var(--text-mute)" }}>›</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>O QUE COLETAMOS</div>
            <div style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              {[
                { k: "Identificação", v: "Nome, CPF, telefone, email" },
                { k: "Localização", v: "GPS durante uso ativo" },
                { k: "Pagamento", v: "Tokens de cartão (não armazenamos número)" },
                { k: "Uso", v: "Pedidos, avaliações, mensagens" },
                { k: "Dispositivo", v: "Modelo, OS, app version" },
              ].map((d, i) => (
                <div key={d.k} className="pg-row" style={{ padding: "12px 14px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                  <div style={{ width: 100, fontSize: 12, color: "var(--text-soft)", fontFamily: "var(--font-mono)" }}>{d.k}</div>
                  <div style={{ fontSize: 13, flex: 1 }}>{d.v}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, fontSize: 11, color: "var(--text-mute)", textAlign: "center" }}>
              DPO: privacidade@pagora.com.br · ANPD: anpd.gov.br
            </div>
          </div>
        )}

        {(tab === "terms" || tab === "privacy") && (
          <div style={{ padding: 20 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0 }}>VERSÃO 4.2 · 12 MARÇO 2026</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "8px 0 16px", letterSpacing: "-0.01em" }}>{tab === "terms" ? "Termos de uso" : "Política de privacidade"}</h2>

            {[
              { h: "1. Sobre a PAGORA", b: "A PAGORA é um marketplace que conecta clientes a prestadores autônomos de serviços de logística (fretes, guinchos, caçambas). Não somos transportadora — somos uma plataforma de intermediação." },
              { h: "2. Cadastro e conta", b: "Para usar a PAGORA, você precisa ter ao menos 18 anos e fornecer informações verdadeiras. A conta é pessoal e intransferível." },
              { h: "3. Pedidos e pagamentos", b: "Os preços são definidos pelos prestadores, não pela PAGORA. Cobramos uma taxa de serviço apenas do prestador (visível para vocês). O pagamento é retido até a confirmação do serviço." },
              { h: "4. Cancelamentos", b: "Você pode cancelar a qualquer momento. Taxas variam conforme o motivo — leia detalhes na política de cancelamento." },
              { h: "5. Responsabilidades", b: "Prestadores são autônomos. A PAGORA garante o pagamento e mediação de disputas, mas a execução do serviço é responsabilidade do prestador escolhido." },
              { h: "6. Resolução de disputas", b: "Em caso de problema, abra uma disputa no app dentro de 24h após o serviço. Nossa equipe analisa em até 24h e propõe uma resolução." },
            ].map(s => (
              <div key={s.h} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{s.h}</div>
                <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>{s.b}</div>
              </div>
            ))}

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 24, fontSize: 11, color: "var(--text-mute)", textAlign: "center" }}>
              Documento completo · Versão integral em <strong style={{ color: "var(--text)" }}>pagora.com.br/legal</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 8. EDITAR PERFIL
// ---------------------------------------------------------------------
const EditProfile = ({ go }) => {
  const [name, setName] = useStateP3("Joana Silva");
  const [phone, setPhone] = useStateP3("11 9 9876-5432");
  const [email, setEmail] = useStateP3("joana@email.com");
  const [bio, setBio] = useStateP3("");

  return (
    <div className="pg-screen" data-screen-label="C22 Editar perfil">
      <StatusBarP3 />
      <TopBarP3 onBack={() => go("profile")} title="Editar perfil" right={
        <button style={{ background: "none", border: "none", color: "var(--green-700)", fontWeight: 700, fontSize: 14, cursor: "pointer" }} onClick={() => go("profile")}>Salvar</button>
      } />
      <div className="pg-viewport" style={{ paddingBottom: 40 }}>
        <div style={{ padding: 20 }}>

          {/* avatar */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <div style={{
                width: 100, height: 100, borderRadius: 50,
                background: "linear-gradient(135deg, #22E3A3, #0FA77A)",
                display: "grid", placeItems: "center",
                fontSize: 38, fontWeight: 700, color: "var(--night-900)", fontFamily: "var(--font-mono)",
              }}>JS</div>
              <button style={{
                position: "absolute", bottom: 0, right: 0,
                width: 32, height: 32, borderRadius: 16,
                background: "var(--night-900)", color: "var(--green-500)",
                border: "3px solid var(--paper)", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
              }}>📷</button>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-soft)" }}>Toque para trocar a foto</div>
          </div>

          <div className="pg-stack" style={{ gap: 16 }}>
            <div className="pg-field">
              <label className="pg-label">Nome completo</label>
              <input className="pg-input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="pg-field">
              <label className="pg-label">Telefone</label>
              <input className="pg-input" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ fontFamily: "var(--font-mono)" }} />
              <div className="pg-helper">✓ Verificado</div>
            </div>
            <div className="pg-field">
              <label className="pg-label">Email</label>
              <input className="pg-input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
              <div className="pg-helper">✓ Verificado</div>
            </div>
            <div className="pg-field">
              <label className="pg-label">CPF</label>
              <input className="pg-input" value="123.***.***-45" disabled style={{ fontFamily: "var(--font-mono)", color: "var(--text-mute)" }} />
              <div className="pg-helper">CPF não pode ser alterado · entre em contato com suporte se houver erro</div>
            </div>
            <div className="pg-field">
              <label className="pg-label">Sobre você (opcional)</label>
              <textarea className="pg-textarea" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Fale algo sobre você que prestadores possam ver..." />
              <div className="pg-helper">{bio.length}/200 caracteres</div>
            </div>
          </div>

          {/* sensitive section */}
          <div style={{ marginTop: 32 }}>
            <div className="pg-h-eyebrow" style={{ margin: "0 0 8px" }}>VERIFICAÇÃO</div>
            <div className="pg-card" style={{ padding: 0 }}>
              <SettingsItem label="Selfie de verificação" sub="Aprovada · 12 mar 2026" arrow />
              <SettingsItem label="CPF / Receita Federal" sub="Validado" arrow />
              <SettingsItem label="Documento com foto" sub="Pendente" arrow />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 9. EXCLUIR CONTA — flow de saída
// ---------------------------------------------------------------------
const DeleteAccount = ({ go }) => {
  const [step, setStep] = useStateP3(1);
  const [reason, setReason] = useStateP3(null);
  const [confirm, setConfirm] = useStateP3("");

  if (step === 1) {
    return (
      <div className="pg-screen" data-screen-label="C23 Excluir conta">
        <StatusBarP3 />
        <TopBarP3 onBack={() => go("settings")} title="Excluir conta" />
        <div className="pg-viewport" style={{ paddingBottom: 100 }}>
          <div style={{ padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 12px", letterSpacing: "-0.02em" }}>Vai mesmo?</h1>
            <p style={{ color: "var(--text-soft)", fontSize: 14, lineHeight: 1.5 }}>
              Antes de prosseguir, queremos entender o que aconteceu para melhorar.
            </p>

            {/* alternatives */}
            <div className="pg-card pg-card--padded" style={{ marginTop: 24, textAlign: "left" }}>
              <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>ANTES DE EXCLUIR, EXPERIMENTE</div>
              <div className="pg-stack pg-stack--sm" style={{ marginTop: 12 }}>
                <button className="pg-row pg-row--between" style={{ padding: "10px 0", background: "none", border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit", borderTop: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>🔕 Pausar notificações</div>
                    <div style={{ fontSize: 11, color: "var(--text-mute)" }}>Manter conta sem receber emails</div>
                  </div>
                  <span style={{ color: "var(--text-mute)" }}>›</span>
                </button>
                <button className="pg-row pg-row--between" style={{ padding: "10px 0", background: "none", border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit", borderTop: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>🆘 Falar com o suporte</div>
                    <div style={{ fontSize: 11, color: "var(--text-mute)" }}>Resolver o que está incomodando</div>
                  </div>
                  <span style={{ color: "var(--text-mute)" }}>›</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)", display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="pg-btn pg-btn--ghost pg-btn--lg pg-btn--block" style={{ color: "var(--orange-500)" }} onClick={() => setStep(2)}>
            Continuar com a exclusão
          </button>
          <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" onClick={() => go("settings")}>Voltar e manter conta</button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    const reasons = [
      "Não uso mais a PAGORA",
      "Encontrei outro serviço melhor",
      "Tive uma má experiência",
      "Preocupação com privacidade",
      "Estou criando outra conta",
      "Outro",
    ];
    return (
      <div className="pg-screen" data-screen-label="C23 Excluir conta motivo">
        <StatusBarP3 />
        <TopBarP3 onBack={() => setStep(1)} title="Por quê?" />
        <div className="pg-viewport" style={{ paddingBottom: 100 }}>
          <div style={{ padding: 20 }}>
            <p className="pg-h-sub" style={{ margin: "0 0 20px", fontSize: 14 }}>
              Sua resposta nos ajuda a melhorar. Não vamos te julgar.
            </p>
            <div className="pg-stack pg-stack--sm">
              {reasons.map(r => {
                const active = reason === r;
                return (
                  <button key={r} onClick={() => setReason(r)}
                    className="pg-choice" style={{ borderColor: active ? "var(--night-900)" : "var(--border)", background: active ? "var(--night-900)" : "var(--paper)", color: active ? "#fff" : "var(--text)" }}>
                    <span className={`pg-choice-bullet${active ? " is-active" : ""}`}></span>
                    <span className="pg-choice-body"><span className="pg-choice-title" style={{ color: "inherit", fontSize: 14 }}>{r}</span></span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
          <button className="pg-btn pg-btn--danger pg-btn--lg pg-btn--block" disabled={!reason} onClick={() => setStep(3)}>Continuar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pg-screen" data-screen-label="C23 Excluir conta confirmar">
      <StatusBarP3 />
      <TopBarP3 onBack={() => setStep(2)} title="Confirmação final" />
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: 20 }}>
          <div className="pg-card pg-card--padded" style={{ background: "var(--orange-50)", borderColor: "var(--orange-500)", marginBottom: 20 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, color: "var(--orange-600)" }}>⚠️ AÇÃO IRREVERSÍVEL</div>
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6, color: "var(--text-soft)" }}>
              <div>→ Todo seu histórico de pedidos será apagado</div>
              <div>→ Endereços, favoritos e preferências serão removidos</div>
              <div>→ Saldo de carteira (R$ 38,40) será <strong>perdido</strong></div>
              <div>→ Disputas em aberto serão arquivadas</div>
              <div>→ Você pode recriar com o mesmo email após 30 dias</div>
            </div>
          </div>

          <div className="pg-field">
            <label className="pg-label">Para confirmar, digite <strong style={{ fontFamily: "var(--font-mono)" }}>EXCLUIR</strong></label>
            <input className="pg-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="EXCLUIR" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }} />
          </div>

          <div className="pg-card pg-card--soft" style={{ padding: 14, marginTop: 20, fontSize: 12, color: "var(--text-soft)" }}>
            💡 Antes de excluir definitivamente, você receberá um email com link para recuperar nas próximas 7 dias.
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--danger pg-btn--lg pg-btn--block" disabled={confirm !== "EXCLUIR"} onClick={() => go("landing")}>
          Excluir minha conta permanentemente
        </button>
      </div>
    </div>
  );
};

window.PagoraPhase3 = { Dispute, Refund, ServiceDone, Tip, Settings, Help, Legal, DeleteAccount, EditProfile };
