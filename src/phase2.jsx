/* @jsxRuntime classic */
// =====================================================================
// FASE 2 CLIENTE — Pagamento + durante o serviço
// =====================================================================
const { useState: useStateP2, useEffect: useEffectP2 } = React;
const StatusBarP2 = window.StatusBar;
const TopBarP2 = window.TopBar;

// ---------------------------------------------------------------------
// 1. CUPOM / VOUCHER
// ---------------------------------------------------------------------
const Coupon = ({ go }) => {
  const [code, setCode] = useStateP2("");
  const [applied, setApplied] = useStateP2(null);
  const coupons = [
    { code: "PRIMEIRA15", name: "1ª mudança", desc: "15% off · até R$ 50", value: "−15%", expires: "30 abr", best: true },
    { code: "PIX10", name: "Pagou no Pix", desc: "10% extra de desconto", value: "−10%", expires: "permanente" },
    { code: "INDICOU20", name: "Você indicou", desc: "R$ 20 por indicação ativa", value: "−R$ 20", expires: "60 dias" },
    { code: "SEMANA", name: "Frete na semana", desc: "5% off seg-qui", value: "−5%", expires: "permanente" },
  ];
  const apply = (c) => { setApplied(c); setCode(c.code); };

  return (
    <div className="pg-screen" data-screen-label="C7 Cupom voucher">
      <StatusBarP2 />
      <TopBarP2 onBack={() => go("frete-summary")} title="Cupons e descontos" />
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: 20 }}>
          {/* manual code input */}
          <div className="pg-field" style={{ marginBottom: 24 }}>
            <label className="pg-label">Tem um código?</label>
            <div className="pg-row" style={{ gap: 8 }}>
              <input className="pg-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DIGITAR CÓDIGO" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }} />
              <button className="pg-btn pg-btn--primary" disabled={!code} onClick={() => { const found = coupons.find(c => c.code === code); if (found) setApplied(found); }}>Aplicar</button>
            </div>
          </div>

          <div className="pg-h-eyebrow" style={{ margin: "0 0 12px" }}>DISPONÍVEIS PARA VOCÊ ({coupons.length})</div>

          <div className="pg-stack pg-stack--sm">
            {coupons.map(c => {
              const isApplied = applied?.code === c.code;
              return (
                <div key={c.code} className="pg-card" style={{ padding: 0, overflow: "hidden", border: `1.5px solid ${isApplied ? "var(--green-500)" : "var(--border)"}` }}>
                  <div className="pg-row" style={{ gap: 0, alignItems: "stretch" }}>
                    {/* Left ticket stub */}
                    <div style={{
                      width: 92, padding: "16px 12px", background: "var(--night-900)",
                      color: "var(--green-500)", textAlign: "center",
                      display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
                      position: "relative",
                    }}>
                      <div className="pg-mono" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{c.value}</div>
                      <div className="pg-h-eyebrow" style={{ margin: "4px 0 0", fontSize: 8, color: "rgba(34,227,163,0.6)" }}>OFF</div>
                      {/* perforation */}
                      <div style={{ position: "absolute", right: -6, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, borderRadius: 6, background: "var(--paper)" }} />
                    </div>
                    <div style={{ flex: 1, padding: 14, position: "relative" }}>
                      <div className="pg-row pg-row--between" style={{ marginBottom: 4 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                        {c.best && <span className="pg-tag pg-tag--green" style={{ fontSize: 9 }}>MELHOR</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-soft)", marginBottom: 8 }}>{c.desc}</div>
                      <div className="pg-row pg-row--between">
                        <span style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{c.code} · exp {c.expires}</span>
                        <button onClick={() => apply(c)}
                          style={{
                            padding: "6px 12px", borderRadius: 8, border: "none",
                            background: isApplied ? "var(--green-500)" : "var(--night-900)",
                            color: isApplied ? "var(--night-900)" : "var(--green-500)",
                            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                          }}>
                          {isApplied ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="check" size={12} strokeWidth={2.5} color="var(--night-900)" /> Aplicado</span> : "Usar"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pg-card pg-card--soft" style={{ padding: 14, marginTop: 20, fontSize: 12, color: "var(--text-soft)" }}>
            ℹ️ Apenas um cupom por pedido. Cupons não acumulam com promoções automáticas.
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" disabled={!applied} onClick={() => go("frete-summary")}>
          {applied ? `Aplicar ${applied.value} de desconto` : "Selecione um cupom"}
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 2. PAGAMENTO OK — full-screen success
// ---------------------------------------------------------------------
const PaySuccess = ({ go }) => {
  useEffectP2(() => {
    const t = setTimeout(() => {}, 0);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="pg-screen is-dark" data-screen-label="C8 Pagamento confirmado" style={{ background: "var(--night-900)", color: "#fff" }}>
      <StatusBarP2 dark />
      <div className="pg-viewport" style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center" }}>
          {/* big check */}
          <div className="pg-anim-in" style={{ width: 120, height: 120, borderRadius: 60, background: "var(--green-500)", display: "grid", placeItems: "center", marginBottom: 32 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <path d="M16 32 L28 44 L48 22" stroke="var(--night-900)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div className="pg-h-eyebrow" style={{ color: "rgba(255,255,255,0.5)", margin: 0 }}>PAGAMENTO CONFIRMADO</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 12px", letterSpacing: "-0.02em" }}>R$ 240,00 pagos</h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.5, maxWidth: 280 }}>
            Pix recebido às 14:23. Seu prestador <strong style={{ color: "#fff" }}>JM Transportes</strong> já foi notificado.
          </p>

          {/* receipt mini */}
          <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "16px 20px", marginTop: 32, width: "100%", maxWidth: 320 }}>
            <Row k="Pedido" v="#PG-2741" mono />
            <Row k="Forma" v="Pix" />
            <Row k="Valor" v="R$ 240,00" mono />
            <Row k="Cupom PIX10" v="−R$ 24,00" green />
            <Row k="Total cobrado" v="R$ 216,00" mono bold />
          </div>

          <div style={{ marginTop: 28, display: "flex", gap: 6, alignItems: "center", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
            <Icon name="mail" size={14} color="rgba(255,255,255,0.5)" /><span>Recibo enviado para joao@email.com</span>
          </div>
        </div>
      </div>
      <div style={{ padding: 16, paddingBottom: 24, display: "flex", flexDirection: "column", gap: 8 }}>
        <button className="pg-btn pg-btn--accent pg-btn--lg pg-btn--block" onClick={() => go("tracking")}>Acompanhar serviço ao vivo</button>
        <button className="pg-btn pg-btn--ghost pg-btn--lg pg-btn--block" style={{ color: "rgba(255,255,255,0.7)" }} onClick={() => go("receipt")}>Ver recibo completo</button>
      </div>
    </div>
  );
};
const Row = ({ k, v, mono, bold, green }) => (
  <div className="pg-row pg-row--between" style={{ padding: "6px 0", fontSize: 13 }}>
    <span style={{ color: "rgba(255,255,255,0.6)" }}>{k}</span>
    <span style={{ color: green ? "var(--green-500)" : "#fff", fontFamily: mono ? "var(--font-mono)" : "inherit", fontWeight: bold ? 700 : 500 }}>{v}</span>
  </div>
);

// ---------------------------------------------------------------------
// 3. PAGAMENTO FALHOU — retry / trocar
// ---------------------------------------------------------------------
const PayFail = ({ go }) => {
  return (
    <div className="pg-screen" data-screen-label="C9 Pagamento falhou">
      <StatusBarP2 />
      <TopBarP2 onBack={() => go("frete-summary")} title="" />
      <div className="pg-viewport">
        <div style={{ padding: "20px 28px", textAlign: "center" }}>
          {/* alert icon */}
          <div style={{ width: 96, height: 96, borderRadius: 48, background: "var(--orange-50)", margin: "16px auto 24px", display: "grid", placeItems: "center" }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="var(--orange-500)" strokeWidth="3"/>
              <path d="M24 14 V26" stroke="var(--orange-500)" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="24" cy="33" r="2" fill="var(--orange-500)"/>
            </svg>
          </div>

          <div className="pg-h-eyebrow" style={{ margin: 0, color: "var(--orange-600)" }}>PAGAMENTO RECUSADO</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 8px", letterSpacing: "-0.02em" }}>Não foi possível processar</h1>
          <p style={{ color: "var(--text-soft)", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
            Seu cartão Visa final ••4711 foi recusado pelo banco. Não se preocupe — o pedido <strong>não foi enviado</strong> ainda.
          </p>

          {/* error code */}
          <div style={{ background: "var(--orange-50)", borderRadius: 10, padding: 12, marginBottom: 24, textAlign: "left" }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9, color: "var(--orange-600)" }}>MOTIVO PROVÁVEL</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>Saldo insuficiente ou limite excedido</div>
            <div style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)", marginTop: 6 }}>cód: insufficient_funds (51)</div>
          </div>

          <div className="pg-h-eyebrow" style={{ margin: "0 0 12px", textAlign: "left" }}>O QUE FAZER</div>

          <div className="pg-stack pg-stack--sm" style={{ textAlign: "left" }}>
            <ActionRow icon="refresh" t="Tentar de novo" s="Mesmo cartão, mesmo valor" onClick={() => go("frete-summary")} />
            <ActionRow icon="credit-card" t="Trocar método" s="Outro cartão, Pix ou boleto" onClick={() => go("frete-summary")} />
            <ActionRow icon="phone" t="Falar com seu banco" s="Liberar a transação" />
            <ActionRow icon="headset" t="Ajuda PAGORA" s="Suporte humano em 2 min" onClick={() => go("help")} />
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" onClick={() => go("frete-summary")}>Tentar novamente</button>
      </div>
    </div>
  );
};
const ActionRow = ({ icon, t, s, onClick }) => (
  <button onClick={onClick} className="pg-card" style={{ width: "100%", padding: 14, textAlign: "left", cursor: "pointer", border: "1px solid var(--border)" }}>
    <div className="pg-row" style={{ gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--bg-soft)", border: "1px solid var(--border)", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name={icon} size={18} color="var(--text-soft)" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{t}</div>
        <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>{s}</div>
      </div>
      <Icon name="arrow-right" size={16} color="var(--text-mute)" />
    </div>
  </button>
);

// ---------------------------------------------------------------------
// 4. LIGAR PARA PRESTADOR — modal-style call screen
// ---------------------------------------------------------------------
const CallProvider = ({ go }) => {
  const [seconds, setSeconds] = useStateP2(0);
  const [muted, setMuted] = useStateP2(false);
  const [speaker, setSpeaker] = useStateP2(false);
  useEffectP2(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const fmt = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

  return (
    <div className="pg-screen is-dark" data-screen-label="C10 Ligar prestador" style={{ background: "linear-gradient(180deg, #1a2942 0%, #070E1A 100%)", color: "#fff" }}>
      <StatusBarP2 dark />
      <div className="pg-viewport" style={{ display: "flex", flexDirection: "column", padding: "20px 24px" }}>

        <div style={{ textAlign: "center", paddingTop: 32, marginBottom: "auto" }}>
          <div className="pg-mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>CHAMADA SEGURA · PAGORA</div>
          <div style={{
            width: 128, height: 128, borderRadius: 64, margin: "32px auto 24px",
            background: "var(--green-500)", color: "var(--night-900)",
            display: "grid", placeItems: "center",
            fontSize: 40, fontWeight: 800, fontFamily: "var(--font-mono)",
            boxShadow: "0 0 0 12px rgba(34,227,163,0.15), 0 0 0 24px rgba(34,227,163,0.08)",
          }}>
            JM
            <div style={{
              position: "absolute", marginTop: 130, width: 24, height: 24, borderRadius: 12,
              background: "var(--green-500)", border: "3px solid #1a2942",
              animation: "pgPulse 1.5s ease-in-out infinite",
            }} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>JM Transportes</h1>
          <div style={{ marginTop: 8, color: "rgba(255,255,255,0.7)", fontSize: 14 }}>Pedido #PG-2741 · em rota</div>
          <div className="pg-mono" style={{ marginTop: 16, fontSize: 22, color: "var(--green-500)", fontWeight: 700 }}>{fmt(seconds)}</div>
          <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 5 }}><Icon name="lock" size={11} color="rgba(255,255,255,0.5)" /> Número mascarado · sua privacidade preservada</div>
        </div>

        {/* controls */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
          <CallBtn icon={muted ? "mic-off" : "mic"} label={muted ? "Mudo" : "Microfone"} active={muted} onClick={() => setMuted(!muted)} />
          <CallBtn icon="keyboard" label="Teclado" />
          <CallBtn icon="volume" label="Viva-voz" active={speaker} onClick={() => setSpeaker(!speaker)} />
        </div>

        {/* hangup */}
        <button onClick={() => go("tracking")}
          style={{ height: 64, borderRadius: 32, background: "var(--orange-500)", color: "#fff", border: "none", fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.02em" }}>
          ↓ Desligar
        </button>
      </div>
    </div>
  );
};
const CallBtn = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} style={{
    aspectRatio: "1", borderRadius: 14, border: "none",
    background: active ? "var(--green-500)" : "rgba(255,255,255,0.1)",
    color: active ? "var(--night-900)" : "#fff",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    cursor: "pointer", fontFamily: "inherit", gap: 6,
  }}>
    <Icon name={icon} size={26} color={active ? "var(--night-900)" : "#fff"} />
    <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
  </button>
);

// ---------------------------------------------------------------------
// 5. COMPARTILHAR ROTA
// ---------------------------------------------------------------------
const ShareRoute = ({ go }) => {
  const [copied, setCopied] = useStateP2(false);
  const url = "pagora.app/track/2741?k=ax9k";
  const contacts = [
    { name: "Mãe", num: "11 9 9876-5432", initials: "M", color: "#E5640A" },
    { name: "Lucas (irmão)", num: "11 9 5544-3322", initials: "L", color: "#0FA77A" },
    { name: "Ana", num: "11 9 8877-2233", initials: "A", color: "#7E57C2" },
    { name: "Trabalho · Carla", num: "11 9 1122-3344", initials: "C", color: "#3A6B9C" },
  ];
  return (
    <div className="pg-screen" data-screen-label="C11 Compartilhar rota">
      <StatusBarP2 />
      <TopBarP2 onBack={() => go("tracking")} title="Compartilhar rota" />
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: 20 }}>
          <div className="pg-card pg-card--padded" style={{ background: "var(--bg-soft)", borderColor: "transparent", marginBottom: 24 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9, display: "flex", alignItems: "center", gap: 5 }}><Icon name="eye" size={11} color="currentColor" /> LINK COM ACOMPANHAMENTO AO VIVO</div>
            <div className="pg-row pg-row--between" style={{ marginTop: 10, gap: 8 }}>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, flex: 1, overflowWrap: "anywhere" }}>{url}</code>
              <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                style={{ padding: "8px 14px", borderRadius: 8, background: copied ? "var(--green-500)" : "var(--night-900)", color: copied ? "var(--night-900)" : "var(--green-500)", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-soft)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="clock" size={12} color="var(--text-soft)" /> Link expira em <strong>2h</strong> após o término · sem necessidade de cadastro</span>
            </div>
          </div>

          {/* permissions */}
          <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>O QUE QUEM RECEBER VAI VER</div>
          <div className="pg-card" style={{ padding: 0, marginBottom: 24 }}>
            <PermRow t="Localização do prestador no mapa" on />
            <PermRow t="Status do serviço (a caminho, em rota...)" on />
            <PermRow t="ETA estimado" on />
            <PermRow t="Endereços (origem e destino)" off />
            <PermRow t="Seu nome e telefone" off />
          </div>

          <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>ENVIAR PARA</div>
          <div className="pg-stack pg-stack--sm">
            {contacts.map(c => (
              <button key={c.num} className="pg-card" style={{ width: "100%", padding: "10px 12px", textAlign: "left", cursor: "pointer", border: "1px solid var(--border)" }}>
                <div className="pg-row" style={{ gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, background: c.color, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>{c.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-mute)" }}>{c.num}</div>
                  </div>
                  <span style={{ color: "var(--text-mute)", fontSize: 18 }}>›</span>
                </div>
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 24 }}>
            {[{ t: "WhatsApp", c: "#25D366" }, { t: "SMS", c: "#0FA77A" }, { t: "Email", c: "#3A6B9C" }, { t: "Mais", c: "#7E57C2" }].map(b => (
              <button key={b.t} style={{ padding: "12px 8px", borderRadius: 12, background: "var(--paper)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--text)" }}>
                <div style={{ width: 28, height: 28, margin: "0 auto 6px", borderRadius: 8, background: b.c }} />
                {b.t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
const PermRow = ({ t, on }) => (
  <div className="pg-row pg-row--between" style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
    <span style={{ fontSize: 13 }}>{t}</span>
    <button className="pg-toggle" style={{ background: on ? "var(--night-900)" : "var(--ink-200)", border: "none", padding: 0, position: "relative", cursor: "pointer" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 200ms" }} />
    </button>
  </div>
);

// ---------------------------------------------------------------------
// 6. SOS / EMERGÊNCIA
// ---------------------------------------------------------------------
const SOS = ({ go }) => {
  const [holding, setHolding] = useStateP2(false);
  const [progress, setProgress] = useStateP2(0);
  const [activated, setActivated] = useStateP2(false);

  useEffectP2(() => {
    if (holding && progress < 100) {
      const t = setTimeout(() => setProgress(p => Math.min(100, p + 4)), 50);
      return () => clearTimeout(t);
    }
    if (progress >= 100 && !activated) setActivated(true);
    if (!holding && progress < 100) {
      const t = setTimeout(() => setProgress(p => Math.max(0, p - 6)), 30);
      return () => clearTimeout(t);
    }
  }, [holding, progress, activated]);

  if (activated) {
    return (
      <div className="pg-screen" data-screen-label="C12 SOS ativado" style={{ background: "var(--orange-500)", color: "#fff" }}>
        <StatusBarP2 dark />
        <div className="pg-viewport" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: "rgba(0,0,0,0.25)", display: "grid", placeItems: "center", margin: "0 auto 16px", animation: "pgPulse 1.2s ease-in-out infinite" }}><Icon name="siren" size={40} color="#fff" /></div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>SOS ATIVADO</h1>
          <p style={{ fontSize: 16, margin: "12px 0 28px", opacity: 0.9 }}>
            Você está conectada com o atendimento de emergência da PAGORA.
          </p>

          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 14, padding: 18, textAlign: "left", marginBottom: 16 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9, color: "rgba(255,255,255,0.7)" }}>EM CURSO</div>
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7 }}>
              {[["Localização compartilhada",true],["Pedido pausado",true],["Atendente Marina está conectando...",true],["190 em standby",false],["Contatos de emergência avisados",false]].map(([t,done])=>(
                <div key={t} style={{ display:"flex", alignItems:"center", gap:8 }}><Icon name={done?"check-circle":"clock"} size={13} color={done?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.4)"} />{t}</div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button style={{ background: "rgba(0,0,0,0.3)", border: "none", color: "#fff", padding: 14, borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><Icon name="headset" size={18} color="#fff" /> Atendente</button>
            <button style={{ background: "#000", border: "none", color: "#fff", padding: 14, borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><Icon name="phone" size={18} color="#fff" /> 190</button>
          </div>

          <button onClick={() => { setActivated(false); setProgress(0); go("tracking"); }} style={{ marginTop: 24, background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "12px 16px", borderRadius: 10, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Cancelar emergência (falso alarme)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pg-screen" data-screen-label="C12 SOS hold to activate">
      <StatusBarP2 />
      <TopBarP2 onBack={() => go("tracking")} title="Emergência" />
      <div className="pg-viewport" style={{ padding: 24 }}>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <div className="pg-h-eyebrow" style={{ margin: 0, color: "var(--orange-600)", display:"flex", alignItems:"center", gap:5 }}><Icon name="alert" size={12} color="var(--orange-600)" /> ATIVAÇÃO DE EMERGÊNCIA</div>
          <h1 className="pg-h-title" style={{ marginTop: 8 }}>Você está em perigo?</h1>
          <p className="pg-h-sub" style={{ fontSize: 14 }}>
            Pressione e segure o botão por <strong>2 segundos</strong> para ativar. Não use por engano — temos câmeras e gravação em tempo real.
          </p>
        </div>

        {/* big SOS button */}
        <div style={{ display: "flex", justifyContent: "center", margin: "40px 0" }}>
          <button
            onMouseDown={() => setHolding(true)} onMouseUp={() => setHolding(false)} onMouseLeave={() => setHolding(false)}
            onTouchStart={() => setHolding(true)} onTouchEnd={() => setHolding(false)}
            style={{
              width: 200, height: 200, borderRadius: 100,
              background: "var(--orange-500)", border: "none", color: "#fff",
              fontSize: 36, fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
              letterSpacing: "0.06em", position: "relative", overflow: "hidden",
              boxShadow: holding ? "0 0 0 16px rgba(229,100,10,0.2)" : "0 12px 40px rgba(229,100,10,0.4)",
              transition: "box-shadow 200ms",
            }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: 100,
              background: "rgba(0,0,0,0.3)",
              clipPath: `polygon(0 ${100 - progress}%, 100% ${100 - progress}%, 100% 100%, 0 100%)`,
              transition: "clip-path 50ms linear",
            }} />
            <span style={{ position: "relative" }}>SOS</span>
          </button>
        </div>

        <div style={{ textAlign: "center", color: "var(--text-mute)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
          {holding ? `MANTENHA... ${progress}%` : "PRESSIONE E SEGURE"}
        </div>

        {/* alternative actions */}
        <div className="pg-stack pg-stack--sm" style={{ marginTop: 36 }}>
          <button className="pg-card" style={{ width: "100%", padding: 14, textAlign: "left", cursor: "pointer", border: "1px solid var(--border)" }}>
            <div className="pg-row" style={{ gap: 12 }}>
              <div style={{ width:40, height:40, borderRadius:11, background:"var(--bg-soft)", border:"1px solid var(--border)", display:"grid", placeItems:"center", flexShrink:0 }}><Icon name="phone" size={18} color="var(--text-soft)" /></div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>Ligar 190 direto</div><div style={{ fontSize: 12, color: "var(--text-mute)" }}>Polícia militar</div></div>
              <Icon name="arrow-right" size={16} color="var(--text-mute)" />
            </div>
          </button>
          <button className="pg-card" style={{ width: "100%", padding: 14, textAlign: "left", cursor: "pointer", border: "1px solid var(--border)" }}
            onClick={() => go("report")}>
            <div className="pg-row" style={{ gap: 12 }}>
              <div style={{ width:40, height:40, borderRadius:11, background:"var(--bg-soft)", border:"1px solid var(--border)", display:"grid", placeItems:"center", flexShrink:0 }}><Icon name="alert" size={18} color="var(--text-soft)" /></div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>Reportar problema (sem urgência)</div><div style={{ fontSize: 12, color: "var(--text-mute)" }}>Comportamento, atraso, conduta</div></div>
              <Icon name="arrow-right" size={16} color="var(--text-mute)" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 7. CANCELAR PEDIDO — motivos
// ---------------------------------------------------------------------
const CancelOrder = ({ go }) => {
  const [reason, setReason] = useStateP2(null);
  const [details, setDetails] = useStateP2("");
  const reasons = [
    { id: "delay", t: "Prestador está atrasando muito", fee: 0 },
    { id: "noshow", t: "Prestador não apareceu", fee: 0 },
    { id: "price", t: "Encontrei outro mais barato", fee: 25 },
    { id: "plan", t: "Mudei de planos / não preciso mais", fee: 25 },
    { id: "wrong", t: "Pedi serviço errado", fee: 25 },
    { id: "service", t: "Comportamento do prestador", fee: 0 },
    { id: "other", t: "Outro motivo", fee: 25 },
  ];
  const sel = reasons.find(r => r.id === reason);
  const fee = sel?.fee || 0;

  return (
    <div className="pg-screen" data-screen-label="C13 Cancelar pedido">
      <StatusBarP2 />
      <TopBarP2 onBack={() => go("tracking")} title="Cancelar pedido" />
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: 20 }}>
          {/* order ref */}
          <div className="pg-card pg-card--soft" style={{ padding: 14, marginBottom: 20 }}>
            <div className="pg-row pg-row--between">
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Pedido #PG-2741</div>
                <div style={{ fontSize: 11, color: "var(--text-mute)" }}>JM Transportes · em rota há 12 min</div>
              </div>
              <div className="pg-mono" style={{ fontSize: 14, fontWeight: 700 }}>R$ 240</div>
            </div>
          </div>

          <div className="pg-h-eyebrow" style={{ margin: "0 0 12px" }}>POR QUE VOCÊ ESTÁ CANCELANDO?</div>

          <div className="pg-stack pg-stack--sm">
            {reasons.map(r => {
              const active = reason === r.id;
              return (
                <button key={r.id} onClick={() => setReason(r.id)}
                  className="pg-choice" style={{ borderColor: active ? "var(--night-900)" : "var(--border)", background: active ? "var(--night-900)" : "var(--paper)", color: active ? "#fff" : "var(--text)" }}>
                  <span className={`pg-choice-bullet${active ? " is-active" : ""}`} style={{ borderColor: active ? "#fff" : "var(--border-strong)" }}></span>
                  <span className="pg-choice-body">
                    <span className="pg-choice-title" style={{ color: "inherit", fontSize: 14 }}>{r.t}</span>
                  </span>
                  {r.fee > 0 ? (
                    <span className="pg-tag pg-tag--orange" style={{ fontSize: 10 }}>TAXA R$ {r.fee}</span>
                  ) : (
                    <span className="pg-tag pg-tag--green" style={{ fontSize: 10 }}>SEM TAXA</span>
                  )}
                </button>
              );
            })}
          </div>

          {reason === "other" && (
            <div className="pg-field" style={{ marginTop: 16 }}>
              <label className="pg-label">Conte mais</label>
              <textarea className="pg-textarea" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Mín. 20 caracteres..." />
            </div>
          )}

          {/* summary */}
          {reason && (
            <div className="pg-card pg-card--padded" style={{ marginTop: 24 }}>
              <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>O QUE VAI ACONTECER</div>
              <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.8, color: "var(--text-soft)" }}>
                <div>{fee > 0 ? `→ Taxa de cancelamento de R$ ${fee} cobrada` : "→ Cancelamento gratuito (motivo justificado)"}</div>
                <div>→ Estorno de R$ {240 - fee} em até 7 dias úteis</div>
                <div>→ Prestador será notificado</div>
                {fee === 0 && <div>→ Equipe da PAGORA pode entrar em contato</div>}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)", display: "flex", flexDirection: "column", gap: 8 }}>
        <button className="pg-btn pg-btn--danger pg-btn--lg pg-btn--block" disabled={!reason} onClick={() => go("home")}>
          Cancelar pedido {fee > 0 ? `(R$ ${fee})` : "(grátis)"}
        </button>
        <button className="pg-btn pg-btn--ghost pg-btn--block" onClick={() => go("tracking")} style={{ height: 40 }}>Voltar ao acompanhamento</button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 8. REPORTAR ATRASO / PROBLEMA
// ---------------------------------------------------------------------
const ReportIssue = ({ go }) => {
  const [issue, setIssue] = useStateP2(null);
  const [photos, setPhotos] = useStateP2([]);
  const [desc, setDesc] = useStateP2("");
  const issues = [
    { id: "delay", icon: "clock", t: "Atraso significativo", s: "Mais de 30 min do ETA" },
    { id: "wrong-vehicle", icon: "truck", t: "Veículo errado", s: "Diferente do contratado" },
    { id: "damage", icon: "package", t: "Dano em item", s: "Algo quebrou ou amassou" },
    { id: "missing", icon: "search", t: "Item faltando", s: "Não chegou no destino" },
    { id: "behavior", icon: "alert", t: "Conduta inadequada", s: "Tratamento ou linguagem" },
    { id: "extra-charge", icon: "money", t: "Cobrança extra indevida", s: "Valor combinado mudou" },
  ];

  return (
    <div className="pg-screen" data-screen-label="C14 Reportar problema">
      <StatusBarP2 />
      <TopBarP2 onBack={() => go("tracking")} title="Reportar problema" />
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: 20 }}>
          <p className="pg-h-sub" style={{ margin: "0 0 20px", fontSize: 14 }}>
            Vamos investigar e responder em até 24h. Em caso de emergência, use o <button onClick={() => go("sos")} style={{ background: "none", border: "none", color: "var(--orange-500)", fontWeight: 700, padding: 0, cursor: "pointer" }}>SOS</button>.
          </p>

          <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>QUAL O PROBLEMA?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
            {issues.map(i => {
              const active = issue === i.id;
              return (
                <button key={i.id} onClick={() => setIssue(i.id)}
                  style={{
                    padding: 12, textAlign: "left",
                    border: `1.5px solid ${active ? "var(--night-900)" : "var(--border)"}`,
                    borderRadius: 10, background: active ? "var(--night-900)" : "var(--paper)",
                    color: active ? "#fff" : "var(--text)", cursor: "pointer",
                  }}>
                  <div style={{ marginBottom: 8 }}><Icon name={i.icon} size={20} color={active ? "rgba(255,255,255,0.9)" : "var(--text-soft)"} /></div>
                  <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{i.t}</div>
                  <div style={{ fontSize: 11, marginTop: 2, color: active ? "rgba(255,255,255,0.6)" : "var(--text-mute)" }}>{i.s}</div>
                </button>
              );
            })}
          </div>

          {issue && (
            <>
              <div className="pg-field" style={{ marginBottom: 20 }}>
                <label className="pg-label">Descreva o que aconteceu</label>
                <textarea className="pg-textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Conte com detalhes — horário, comportamento, item afetado..." style={{ minHeight: 120 }} />
                <div className="pg-helper">{desc.length} caracteres · mínimo 30</div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div className="pg-label" style={{ marginBottom: 8 }}>Fotos como evidência (opcional)</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {photos.map((p, i) => (
                    <div key={i} style={{ aspectRatio: "1", borderRadius: 10, background: `linear-gradient(135deg, ${["#9CA3AF", "#D6DEE8", "#B7C2D0"][i % 3]}, #fff)`, position: "relative" }}>
                      <button onClick={() => setPhotos(ps => ps.filter((_, j) => j !== i))}
                        style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>×</button>
                    </div>
                  ))}
                  {photos.length < 4 && (
                    <button onClick={() => setPhotos(p => [...p, "x"])}
                      style={{ aspectRatio: "1", borderRadius: 10, border: "1.5px dashed var(--border-strong)", background: "transparent", cursor: "pointer", color: "var(--text-soft)", fontSize: 24 }}>+</button>
                  )}
                </div>
                <div className="pg-helper" style={{ marginTop: 6 }}>Até 4 fotos · ajudam muito na análise</div>
              </div>

              {/* expectation */}
              <div className="pg-h-eyebrow" style={{ margin: "0 0 8px" }}>O QUE VOCÊ ESPERA?</div>
              <div className="pg-stack pg-stack--sm">
                {[
                  { id: "refund", t: "Reembolso parcial ou total", s: "Devolução do valor pago" },
                  { id: "redo", t: "Refazer o serviço", s: "Outro prestador termina o trabalho" },
                  { id: "warning", t: "Apenas reportar", s: "Que a PAGORA tome providências" },
                ].map(o => (
                  <button key={o.id} className="pg-card" style={{ width: "100%", padding: 12, textAlign: "left", cursor: "pointer", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{o.t}</div>
                    <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>{o.s}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" disabled={!issue || desc.length < 30} onClick={() => go("tracking")}>
          Enviar reporte
        </button>
      </div>
    </div>
  );
};

window.PagoraPhase2 = { Coupon, PaySuccess, PayFail, CallProvider, ShareRoute, SOS, CancelOrder, ReportIssue };
