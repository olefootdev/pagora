/* @jsxRuntime classic */
/* global React, Icon */
const { useState: useStateG, useMemo: useMemoG, useEffect: useEffectG } = React;

// Pricing centralizado em window.PagoraPricing (src/lib/pricing.js)
const calcGuincho = (s) => window.PagoraPricing.calcGuincho(s);
const calcCacamba = (s) => window.PagoraPricing.calcCacamba(s);

// =====================================================================
// GUINCHO 1 — Tipo de problema
// =====================================================================
const Guincho1 = ({ go, state, set }) => {
  useEffectG(() => {
    window.PagoraAnalytics?.track("simulacao_iniciada", { tipo_servico: "guincho" });
  }, []);
  const opts = [
    { id: "pane", t: "Pane mecânica / Não liga", s: "Carro travou, motor não dá partida", icon: "wrench" },
    { id: "pneu", t: "Pneu furado", s: "Pode não precisar guincho — confirme com prestador", icon: "alert" },
    { id: "acidente", t: "Acidente / Batida", s: "Guincho especial pode ser necessário", icon: "alert" },
    { id: "combustivel", t: "Falta de combustível", s: "Reabastecimento ou guincho até posto", icon: "fuel" },
    { id: "chave", t: "Chave quebrada / Trancado", s: "Chaveiro ou remoção do veículo", icon: "key" },
    { id: "outro", t: "Outro problema", s: "Detalhe nas observações", icon: "info" },
  ];
  return (
    <div className="pg-screen" data-screen-label="G1 Guincho · Problema">
      <StatusBar />
      <TopBar onBack={() => go("services")} title="Guincho" progress={25} />
      <div className="pg-page">
        <div className="pg-page-body">
          <div>
            <div className="pg-h-eyebrow">PASSO 1 DE 4 · PROBLEMA</div>
            <h1 className="pg-h-title">O que aconteceu com o veículo?</h1>
            <p className="pg-h-sub">Cada situação exige um equipamento diferente — isso ajuda o prestador a chegar preparado.</p>
          </div>
          <div className="pg-stack pg-stack--sm">
            {opts.map(o => (
              <button key={o.id} className={`pg-choice${state.problem === o.id ? " is-active" : ""}`}
                onClick={() => set({ problem: o.id })}>
                <span style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: state.problem === o.id ? "rgba(255,255,255,0.1)" : "var(--ink-100)",
                  color: state.problem === o.id ? "#fff" : "var(--text)",
                  display: "grid", placeItems: "center",
                }}><Icon name={o.icon} size={18} /></span>
                <div className="pg-choice-body">
                  <div className="pg-choice-title">{o.t}</div>
                  <div className="pg-choice-sub">{o.s}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="pg-page-foot">
          <button className="pg-btn pg-btn--primary pg-btn--block" disabled={!state.problem} onClick={() => go("guincho-2")}>
            Continuar <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// GUINCHO 2 — Tipo de veículo
// =====================================================================
const Guincho2 = ({ go, state, set }) => {
  const opts = [
    { id: "popular", t: "Carro popular", s: "Até 1.0 (Onix, Mobi, Kwid)" },
    { id: "medio", t: "Carro médio", s: "1.4 a 2.0 (Civic, Corolla, HB20)" },
    { id: "grande", t: "Carro grande / SUV", s: "Compass, Tucson, Hilux SW4" },
    { id: "pickup", t: "Caminhonete / Pickup", s: "Hilux, Ranger, S10" },
    { id: "moto", t: "Moto", s: "Qualquer cilindrada" },
    { id: "van", t: "Van / Utilitário", s: "Sprinter, Master, Ducato" },
  ];
  return (
    <div className="pg-screen" data-screen-label="G2 Guincho · Veículo">
      <StatusBar />
      <TopBar onBack={() => go("guincho-1")} title="Guincho" progress={50} />
      <div className="pg-page">
        <div className="pg-page-body">
          <div>
            <div className="pg-h-eyebrow">PASSO 2 DE 4 · VEÍCULO</div>
            <h1 className="pg-h-title">Que tipo de veículo?</h1>
            <p className="pg-h-sub">SUVs e pickups exigem plataforma reforçada. Motos vão em asa-delta.</p>
          </div>
          <div className="pg-stack pg-stack--sm">
            {opts.map(o => (
              <button key={o.id} className={`pg-choice${state.vehicleType === o.id ? " is-active" : ""}`}
                onClick={() => set({ vehicleType: o.id })}>
                <span className="pg-choice-bullet" />
                <div className="pg-choice-body">
                  <div className="pg-choice-title">{o.t}</div>
                  <div className="pg-choice-sub">{o.s}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="pg-field">
            <span className="pg-label">Detalhes do veículo (opcional)</span>
            <textarea className="pg-textarea" placeholder="Ex.: Civic 2015 prata, placa ABC-1234, está travado em garagem subterrânea"
              value={state.vehicleNotes || ""} onChange={e => set({ vehicleNotes: e.target.value })} />
          </div>
        </div>
        <div className="pg-page-foot">
          <button className="pg-btn pg-btn--primary pg-btn--block" disabled={!state.vehicleType} onClick={() => go("guincho-3")}>
            Continuar <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// GUINCHO 3 — Local e destino
// =====================================================================
const Guincho3 = ({ go, state, set }) => {
  const locOpts = [
    { id: "rua", t: "Na rua", s: "Fácil acesso", icon: "navigation" },
    { id: "garagem", t: "Garagem / estacionamento", s: "Pode exigir manobra especial", icon: "building" },
    { id: "dificil", t: "Local de difícil acesso", s: "Subsolo, ladeira, espaço apertado", icon: "alert" },
    { id: "expressa", t: "Via expressa / rodovia", s: "Requer cuidado e sinalização", icon: "bolt" },
  ];
  const destOpts = [
    { id: "oficina", t: "Oficina específica", s: "Você indica o endereço" },
    { id: "casa", t: "Minha residência", s: "Levar para casa" },
    { id: "sugerir", t: "Sugerir oficina próxima", s: "Prestador indica parceira" },
  ];
  const valid = state.currentLoc && state.location && state.destType;
  return (
    <div className="pg-screen" data-screen-label="G3 Guincho · Local">
      <StatusBar />
      <TopBar onBack={() => go("guincho-2")} title="Guincho" progress={75} />
      <div className="pg-page">
        <div className="pg-page-body">
          <div>
            <div className="pg-h-eyebrow">PASSO 3 DE 4 · LOCAL</div>
            <h1 className="pg-h-title">Onde está e para onde levar?</h1>
          </div>

          <div className="pg-card pg-card--padded" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="pg-row" style={{ gap: 8 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--orange-50)", color: "var(--orange-600)", display: "grid", placeItems: "center" }}>
                <Icon name="pin-fill" size={16} />
              </span>
              <span className="pg-h-eyebrow" style={{ margin: 0 }}>LOCAL ATUAL DO VEÍCULO</span>
            </div>
            <div className="pg-input-wrap">
              <span className="pg-input-icon"><Icon name="search" size={18} /></span>
              <input className="pg-input pg-input--with-icon" placeholder="Endereço onde está o veículo"
                value={state.currentLoc || ""} onChange={e => set({ currentLoc: e.target.value })} />
            </div>
            <div className="pg-stack pg-stack--sm">
              {locOpts.map(o => (
                <button key={o.id} className={`pg-choice${state.location === o.id ? " is-active" : ""}`}
                  onClick={() => set({ location: o.id })}>
                  <span style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: state.location === o.id ? "rgba(255,255,255,0.1)" : "var(--ink-100)",
                    color: state.location === o.id ? "#fff" : "var(--text)",
                    display: "grid", placeItems: "center",
                  }}><Icon name={o.icon} size={16} /></span>
                  <div className="pg-choice-body">
                    <div className="pg-choice-title" style={{ fontSize: 15 }}>{o.t}</div>
                    <div className="pg-choice-sub">{o.s}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="pg-card pg-card--padded" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="pg-row" style={{ gap: 8 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--night-900)", color: "var(--green-500)", display: "grid", placeItems: "center" }}>
                <Icon name="navigation" size={14} />
              </span>
              <span className="pg-h-eyebrow" style={{ margin: 0 }}>PARA ONDE LEVAR</span>
            </div>
            <div className="pg-stack pg-stack--sm">
              {destOpts.map(o => (
                <button key={o.id} className={`pg-choice${state.destType === o.id ? " is-active" : ""}`}
                  onClick={() => set({ destType: o.id })}>
                  <span className="pg-choice-bullet" />
                  <div className="pg-choice-body">
                    <div className="pg-choice-title" style={{ fontSize: 15 }}>{o.t}</div>
                    <div className="pg-choice-sub">{o.s}</div>
                  </div>
                </button>
              ))}
            </div>
            {state.destType && state.destType !== "sugerir" && (
              <div className="pg-input-wrap">
                <span className="pg-input-icon"><Icon name="search" size={18} /></span>
                <input className="pg-input pg-input--with-icon"
                  placeholder={state.destType === "oficina" ? "Endereço da oficina" : "Endereço da residência"}
                  value={state.destAddr || ""} onChange={e => set({ destAddr: e.target.value })} />
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-mute)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
            <Icon name="ruler" size={14} />
            <span>~{state.distance || 8} km · 18 min de remoção</span>
          </div>
        </div>
        <div className="pg-page-foot">
          <button className="pg-btn pg-btn--primary pg-btn--block" disabled={!valid} onClick={() => go("guincho-4")}>
            Continuar <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// GUINCHO 4 — Urgência + orçamento
// =====================================================================
const Guincho4 = ({ go, state, set }) => {
  const price = useMemoG(() => calcGuincho(state), [state]);
  const opts = [
    { id: "now", t: "Agora (urgente)", s: "Acréscimo de 50% · 30–45 min", icon: "bolt" },
    { id: "wait", t: "Posso aguardar até 2h", s: "Mais propostas, melhor preço", icon: "clock" },
    { id: "schedule", t: "Agendar para outra hora", s: "Para casos não emergenciais", icon: "calendar" },
  ];
  return (
    <div className="pg-screen" data-screen-label="G4 Guincho · Urgência">
      <StatusBar />
      <TopBar onBack={() => go("guincho-3")} title="Guincho" progress={100} />
      <div className="pg-page">
        <div className="pg-page-body">
          <div>
            <div className="pg-h-eyebrow">PASSO 4 DE 4 · QUANDO</div>
            <h1 className="pg-h-title">Quando você precisa?</h1>
            <p className="pg-h-sub">Veículo parado em via expressa? Marque "Agora".</p>
          </div>
          <div className="pg-stack pg-stack--sm">
            {opts.map(o => (
              <button key={o.id} className={`pg-choice${state.urgency === o.id ? " is-active" : ""}`}
                onClick={() => set({ urgency: o.id })}>
                <span style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: state.urgency === o.id ? "rgba(255,255,255,0.1)" : "var(--ink-100)",
                  color: state.urgency === o.id ? "#fff" : "var(--text)",
                  display: "grid", placeItems: "center",
                }}><Icon name={o.icon} size={18} /></span>
                <div className="pg-choice-body">
                  <div className="pg-choice-title">{o.t}</div>
                  <div className="pg-choice-sub">{o.s}</div>
                </div>
              </button>
            ))}
          </div>

          {/* live price */}
          <div className="pg-card pg-card--dark" style={{ padding: 22, position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute", top: 0, right: 0, width: 140, height: 140,
              background: "radial-gradient(circle at top right, rgba(255,122,26,0.18), transparent 60%)",
            }} />
            <div className="pg-h-eyebrow" style={{ color: "var(--orange-500)", margin: 0 }}>VALOR ESTIMADO</div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 36, letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: 8 }}>
              R$ {price.low}<span style={{ color: "rgba(255,255,255,0.4)" }}> – </span>R$ {price.high}
            </div>
            <hr className="pg-divider--dashed" style={{ margin: "16px 0", borderColor: "rgba(255,255,255,0.16)" }} />
            <div className="pg-stack pg-stack--sm" style={{ fontSize: 14 }}>
              {[
                ["Distância", `${state.distance || 8} km`, `R$ ${price.breakdown.baseKm}`],
                ["Tipo de veículo", "—", `R$ ${price.breakdown.veh}`],
                ["Local", "—", `R$ ${price.breakdown.access}`],
                ["Taxa base", "—", `R$ ${price.breakdown.baseFee}`],
                state.urgency === "now" && ["Urgência", "Agora", price.breakdown.urgency],
              ].filter(Boolean).map((row, i) => (
                <div key={i} className="pg-row pg-row--between" style={{ color: "rgba(255,255,255,0.85)" }}>
                  <span style={{ color: "rgba(255,255,255,0.55)" }}>{row[0]}</span>
                  <span className="pg-mono pg-num">{row[2]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pg-card" style={{ background: "var(--orange-50)", borderColor: "rgba(255,122,26,0.3)", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ color: "var(--orange-600)", marginTop: 2 }}><Icon name="alert" size={18} /></span>
            <div style={{ fontSize: 13, color: "var(--ink-800)", lineHeight: 1.5 }}>
              <strong>Pode variar conforme:</strong> dificuldade real no local, horário (madrugada custa mais), tempo de espera.
            </div>
          </div>
        </div>
        <div className="pg-page-foot">
          <button
            className="pg-btn pg-btn--accent pg-btn--block pg-btn--lg"
            disabled={!state.urgency}
            onClick={() => {
              const W = window.PagoraWhatsApp;
              const A = window.PagoraAnalytics;
              A?.track("pedido_enviado", {
                valor: price.low,
                tipo: "guincho",
                adicionais: state.urgency === "now" ? ["urgencia"] : [],
              });
              A?.track("whatsapp_clicado", { origem: "guincho-4" });
              if (W) W.abrirWhatsApp(W.mensagemGuincho(state, price));
              go("proposals");
            }}
          >
            <Icon name="whatsapp" size={20} /> {state.urgency === "now" ? "Solicitar guincho urgente" : "Solicitar orçamentos"}
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-mute)" }}>
            {state.urgency === "now" ? "Tempo médio: 30–45 min" : "Sem cobrança agora · pagamento direto com prestador"}
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// CAÇAMBA 1 — Material
// =====================================================================
const Cacamba1 = ({ go, state, set }) => {
  useEffectG(() => {
    window.PagoraAnalytics?.track("simulacao_iniciada", { tipo_servico: "cacamba" });
  }, []);
  const opts = [
    { id: "construcao", t: "Entulho de construção", s: "Tijolos, concreto, argamassa" },
    { id: "demolicao", t: "Entulho de demolição", s: "Madeira, gesso, cerâmica" },
    { id: "terra", t: "Terra e pedras", s: "Movimentação de solo" },
    { id: "moveis", t: "Móveis e objetos grandes", s: "Sofás, eletros velhos" },
    { id: "vegetal", t: "Resíduos vegetais", s: "Galhos, folhas, poda" },
    { id: "outro", t: "Outro tipo", s: "Detalhe nas observações" },
  ];
  return (
    <div className="pg-screen" data-screen-label="C1 Caçamba · Material">
      <StatusBar />
      <TopBar onBack={() => go("services")} title="Caçamba" progress={33} />
      <div className="pg-page">
        <div className="pg-page-body">
          <div>
            <div className="pg-h-eyebrow">PASSO 1 DE 3 · MATERIAL</div>
            <h1 className="pg-h-title">Que tipo de entulho?</h1>
            <p className="pg-h-sub">O destino correto depende do material — alguns têm taxa extra de descarte.</p>
          </div>
          <div className="pg-stack pg-stack--sm">
            {opts.map(o => (
              <button key={o.id} className={`pg-choice${state.material === o.id ? " is-active" : ""}`}
                onClick={() => set({ material: o.id })}>
                <span className="pg-choice-bullet" />
                <div className="pg-choice-body">
                  <div className="pg-choice-title">{o.t}</div>
                  <div className="pg-choice-sub">{o.s}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="pg-card" style={{ background: "var(--orange-50)", borderColor: "rgba(255,122,26,0.3)", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ color: "var(--orange-600)", marginTop: 2 }}><Icon name="alert" size={18} /></span>
            <div style={{ fontSize: 13, color: "var(--ink-800)", lineHeight: 1.5 }}>
              <strong>Materiais perigosos não são aceitos:</strong> tintas, solventes, químicos, amianto, lâmpadas, baterias.
            </div>
          </div>
        </div>
        <div className="pg-page-foot">
          <button className="pg-btn pg-btn--primary pg-btn--block" disabled={!state.material} onClick={() => go("cacamba-2")}>
            Continuar <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// CAÇAMBA 2 — Tamanho + tempo
// =====================================================================
const Cacamba2 = ({ go, state, set }) => {
  const sizes = [
    { id: "p3", t: "3 m³ · pequena", s: "~300 tijolos · pequena reforma", price: "R$ 180", popular: false },
    { id: "p5", t: "5 m³ · média", s: "~500 tijolos · reforma média", price: "R$ 280", popular: true },
    { id: "p8", t: "8 m³ · grande", s: "~800 tijolos · grande obra", price: "R$ 380", popular: false },
  ];
  const times = [
    { id: "d1", t: "1 dia", s: "Incluído no valor", extra: "+R$ 0" },
    { id: "d3", t: "2–3 dias", s: "Mais flexibilidade", extra: "+R$ 60" },
    { id: "d7", t: "1 semana", s: "Para obras maiores", extra: "+R$ 120" },
  ];
  return (
    <div className="pg-screen" data-screen-label="C2 Caçamba · Tamanho">
      <StatusBar />
      <TopBar onBack={() => go("cacamba-1")} title="Caçamba" progress={66} />
      <div className="pg-page">
        <div className="pg-page-body">
          <div>
            <div className="pg-h-eyebrow">PASSO 2 DE 3 · TAMANHO</div>
            <h1 className="pg-h-title">Qual o tamanho ideal?</h1>
            <p className="pg-h-sub">Em dúvida? Use referência: 1 metro cúbico ≈ 1 carrinho de mão.</p>
          </div>

          <div className="pg-stack pg-stack--sm">
            {sizes.map(s => (
              <button key={s.id} className={`pg-tile${state.size === s.id ? " is-active" : ""}`}
                onClick={() => set({ size: s.id })}>
                <div className="pg-row pg-row--between">
                  <div className="pg-tile-icon"><Icon name="dumpster" size={22} /></div>
                  <div className="pg-row" style={{ gap: 6 }}>
                    {s.popular && <span className="pg-tag pg-tag--green">POPULAR</span>}
                    <span className="pg-tile-meta">{s.price}</span>
                  </div>
                </div>
                <div>
                  <div className="pg-tile-title">{s.t}</div>
                  <div className="pg-tile-sub">{s.s}</div>
                </div>
              </button>
            ))}
          </div>

          <div>
            <div className="pg-h-eyebrow" style={{ marginBottom: 10 }}>POR QUANTO TEMPO?</div>
            <div className="pg-stack pg-stack--sm">
              {times.map(o => (
                <button key={o.id} className={`pg-choice${state.duration === o.id ? " is-active" : ""}`}
                  onClick={() => set({ duration: o.id })}>
                  <span className="pg-choice-bullet" />
                  <div className="pg-choice-body">
                    <div className="pg-row pg-row--between">
                      <div className="pg-choice-title" style={{ fontSize: 15 }}>{o.t}</div>
                      <span className="pg-mono" style={{ fontSize: 13, fontWeight: 600 }}>{o.extra}</span>
                    </div>
                    <div className="pg-choice-sub">{o.s}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="pg-page-foot">
          <button className="pg-btn pg-btn--primary pg-btn--block" disabled={!state.size || !state.duration} onClick={() => go("cacamba-3")}>
            Continuar <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// CAÇAMBA 3 — Local + data + orçamento
// =====================================================================
const Cacamba3 = ({ go, state, set }) => {
  const price = useMemoG(() => calcCacamba(state), [state]);
  return (
    <div className="pg-screen" data-screen-label="C3 Caçamba · Local">
      <StatusBar />
      <TopBar onBack={() => go("cacamba-2")} title="Caçamba" progress={100} />
      <div className="pg-page">
        <div className="pg-page-body">
          <div>
            <div className="pg-h-eyebrow">PASSO 3 DE 3 · LOCAL</div>
            <h1 className="pg-h-title">Onde colocar e quando?</h1>
          </div>

          <div className="pg-card pg-card--padded" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="pg-row" style={{ gap: 8 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--green-50)", color: "var(--green-700)", display: "grid", placeItems: "center" }}>
                <Icon name="pin-fill" size={16} />
              </span>
              <span className="pg-h-eyebrow" style={{ margin: 0 }}>LOCAL DE COLOCAÇÃO</span>
            </div>
            <div className="pg-input-wrap">
              <span className="pg-input-icon"><Icon name="search" size={18} /></span>
              <input className="pg-input pg-input--with-icon" placeholder="Endereço onde colocar a caçamba"
                value={state.address || ""} onChange={e => set({ address: e.target.value })} />
            </div>
            <div className="pg-segmented">
              {[
                { id: "calcada", t: "Calçada" },
                { id: "garagem", t: "Garagem" },
                { id: "obra", t: "Dentro da obra" },
              ].map(o => (
                <button key={o.id} className={`pg-segmented-item${state.placement === o.id ? " is-active" : ""}`}
                  onClick={() => set({ placement: o.id })}>{o.t}</button>
              ))}
            </div>
            <div className="pg-helper">Verifique se há autorização da prefeitura para colocação em via pública.</div>
          </div>

          <div className="pg-card pg-card--padded">
            <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 12 }}>QUANDO COLOCAR</div>
            <div className="pg-row" style={{ gap: 10 }}>
              <div className="pg-field" style={{ flex: 1 }}>
                <span className="pg-label">Data</span>
                <input className="pg-input" type="date" defaultValue="2026-04-29"
                  onChange={e => set({ scheduledDate: e.target.value })} />
              </div>
              <div className="pg-field" style={{ flex: 1 }}>
                <span className="pg-label">Período</span>
                <select className="pg-select" defaultValue="manha"
                  onChange={e => set({ period: e.target.value })}>
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                </select>
              </div>
            </div>
          </div>

          {/* live price */}
          <div className="pg-card pg-card--dark" style={{ padding: 22 }}>
            <div className="pg-h-eyebrow" style={{ color: "var(--green-500)", margin: 0 }}>VALOR ESTIMADO</div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 36, letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: 8 }}>
              R$ {price.low}<span style={{ color: "rgba(255,255,255,0.4)" }}> – </span>R$ {price.high}
            </div>
            <hr className="pg-divider--dashed" style={{ margin: "16px 0", borderColor: "rgba(255,255,255,0.16)" }} />
            <div className="pg-stack pg-stack--sm" style={{ fontSize: 14 }}>
              <div className="pg-row pg-row--between" style={{ color: "rgba(255,255,255,0.85)" }}>
                <span style={{ color: "rgba(255,255,255,0.55)" }}>Caçamba</span>
                <span className="pg-mono pg-num">R$ {price.breakdown.sizePrice}</span>
              </div>
              <div className="pg-row pg-row--between" style={{ color: "rgba(255,255,255,0.85)" }}>
                <span style={{ color: "rgba(255,255,255,0.55)" }}>Tempo extra</span>
                <span className="pg-mono pg-num">R$ {price.breakdown.time}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="pg-page-foot">
          <button
            className="pg-btn pg-btn--accent pg-btn--block pg-btn--lg"
            disabled={!state.address || !state.placement}
            onClick={() => {
              const W = window.PagoraWhatsApp;
              const A = window.PagoraAnalytics;
              A?.track("pedido_enviado", { valor: price.low, tipo: "cacamba", adicionais: [] });
              A?.track("whatsapp_clicado", { origem: "cacamba-3" });
              if (W) W.abrirWhatsApp(W.mensagemCacamba(state, price));
              go("proposals");
            }}
          >
            <Icon name="whatsapp" size={20} /> Solicitar orçamentos
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// PROPOSALS — Comparar propostas recebidas
// =====================================================================
const Proposals = ({ go, reset }) => {
  const [selected, setSelected] = useStateG(null);
  const [sort, setSort] = useStateG("price");

  const proposals = [
    {
      id: "p1", name: "JM Transportes", initials: "JM",
      rating: 4.9, reviews: 142, years: 6,
      price: 240, time: "Disponível 09:00",
      msg: "Posso fazer com 1 ajudante meu, baú médio. Pix preferido.",
      verified: true, fast: true,
    },
    {
      id: "p2", name: "Carlos Mudanças", initials: "CM",
      rating: 4.7, reviews: 89, years: 12,
      price: 210, time: "Disponível 10:30",
      msg: "Tenho disponibilidade. Trabalho com a esposa e filho como ajudantes.",
      verified: true, cheapest: true,
    },
    {
      id: "p3", name: "Frete Já SP", initials: "FJ",
      rating: 4.8, reviews: 256, years: 4,
      price: 295, time: "Disponível 09:00",
      msg: "Equipe completa, caminhão baú novo, seguro contra danos.",
      verified: true, premium: true,
    },
    {
      id: "p4", name: "Roberto Frota", initials: "RF",
      rating: 4.5, reviews: 47, years: 2,
      price: 260, time: "Disponível 14:00",
      msg: "Posso atender à tarde. Ajudante adicional sob demanda.",
      verified: false,
    },
  ];

  const sorted = [...proposals].sort((a, b) => {
    if (sort === "price") return a.price - b.price;
    if (sort === "rating") return b.rating - a.rating;
    return 0;
  });

  return (
    <div className="pg-screen" data-screen-label="10 Comparar propostas">
      <StatusBar />
      <TopBar
        onBack={() => go("landing")}
        title="Propostas recebidas"
        right={
          <button className="pg-iconbtn" aria-label="Filtrar"><Icon name="filter" /></button>
        }
      />

      {/* Header live */}
      <div style={{ background: "var(--night-900)", color: "#fff", padding: "16px 20px 18px", flexShrink: 0 }}>
        <div className="pg-row pg-row--between">
          <div>
            <div className="pg-mono" style={{ fontSize: 11, letterSpacing: "0.16em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
              PEDIDO #PG-1247
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>Frete · 15 km · Amanhã 09:00</div>
          </div>
          <span className="pg-tag pg-tag--green" style={{ background: "rgba(34,227,163,0.16)", color: "var(--green-500)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green-500)", animation: "pg-pulse 1.4s ease-in-out infinite" }} />
            {proposals.length} propostas
          </span>
        </div>
        <div className="pg-row" style={{ marginTop: 14, gap: 16, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
          <span><Icon name="ruler" size={13} /> 15 km</span>
          <span><Icon name="truck" size={13} /> Caminhão baú</span>
          <span><Icon name="users" size={13} /> 1 ajudante</span>
        </div>
      </div>

      {/* Sort */}
      <div style={{ padding: "14px 20px 0", flexShrink: 0 }}>
        <div className="pg-row pg-row--between">
          <div className="pg-h-eyebrow">ORDENAR POR</div>
          <span className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)" }}>Recebidas em 38 min</span>
        </div>
        <div className="pg-segmented" style={{ marginTop: 8 }}>
          <button className={`pg-segmented-item${sort === "price" ? " is-active" : ""}`} onClick={() => setSort("price")}>Menor preço</button>
          <button className={`pg-segmented-item${sort === "rating" ? " is-active" : ""}`} onClick={() => setSort("rating")}>Melhor avaliado</button>
          <button className={`pg-segmented-item${sort === "time" ? " is-active" : ""}`} onClick={() => setSort("time")}>Disponibilidade</button>
        </div>
      </div>

      <div className="pg-viewport">
        <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Range reminder */}
          <div className="pg-card pg-card--soft" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Icon name="info" size={16} />
            <div style={{ fontSize: 13, color: "var(--text-soft)" }}>
              Sua estimativa era <strong style={{ color: "var(--text)" }}>R$ 280–350</strong>. Compare propostas e negocie direto.
            </div>
          </div>

          {sorted.map(p => {
            const isSelected = selected === p.id;
            return (
              <div key={p.id} className="pg-card pg-card--padded"
                style={{
                  borderColor: isSelected ? "var(--night-900)" : "var(--border)",
                  boxShadow: isSelected ? "0 0 0 1px var(--night-900) inset" : undefined,
                  position: "relative", overflow: "hidden",
                }}>
                {p.cheapest && (
                  <div style={{
                    position: "absolute", top: 0, left: 0,
                    background: "var(--green-500)", color: "var(--night-900)",
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    padding: "3px 10px 3px 12px", borderBottomRightRadius: 8,
                  }}>MENOR PREÇO</div>
                )}
                {p.fast && !p.cheapest && (
                  <div style={{
                    position: "absolute", top: 0, left: 0,
                    background: "var(--orange-500)", color: "#fff",
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    padding: "3px 10px 3px 12px", borderBottomRightRadius: 8,
                  }}>MAIS RÁPIDO</div>
                )}

                <div className="pg-row" style={{ gap: 12, marginTop: (p.cheapest || p.fast) ? 14 : 0 }}>
                  {/* avatar */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: "var(--night-900)", color: "var(--green-500)",
                    display: "grid", placeItems: "center",
                    fontWeight: 700, fontFamily: "var(--font-mono)", flexShrink: 0,
                  }}>{p.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pg-row" style={{ gap: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</span>
                      {p.verified && (
                        <span title="Verificado" style={{ color: "var(--green-700)" }}><Icon name="shield" size={14} /></span>
                      )}
                    </div>
                    <div className="pg-row" style={{ gap: 8, fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>
                      <span><Icon name="star" size={12} /> {p.rating} ({p.reviews})</span>
                      <span>·</span>
                      <span>{p.years} anos</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="pg-h-eyebrow" style={{ margin: 0 }}>VALOR FINAL</div>
                    <div className="pg-mono" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>R$ {p.price}</div>
                  </div>
                </div>

                <hr className="pg-divider" style={{ margin: "14px 0" }} />

                <div className="pg-row" style={{ gap: 8, fontSize: 13, color: "var(--text-soft)" }}>
                  <Icon name="clock" size={14} />
                  <span>{p.time}</span>
                </div>
                <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--text)", lineHeight: 1.5, fontStyle: "italic" }}>
                  “{p.msg}”
                </p>

                <div className="pg-row" style={{ marginTop: 14, gap: 8 }}>
                  <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ flex: 1 }}>
                    <Icon name="whatsapp" size={16} /> Conversar
                  </button>
                  <button
                    className={`pg-btn pg-btn--sm ${isSelected ? "pg-btn--accent" : "pg-btn--primary"}`}
                    style={{ flex: 1.2 }}
                    onClick={() => setSelected(p.id)}
                  >
                    {isSelected ? <><Icon name="check" size={16} strokeWidth={3} /> Selecionado</> : "Aceitar proposta"}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Help */}
          <div style={{ padding: "8px 4px", textAlign: "center", color: "var(--text-mute)", fontSize: 13 }}>
            Não gostou? <button style={{ background: "none", border: "none", color: "var(--text)", textDecoration: "underline", cursor: "pointer", padding: 0, fontSize: 13, fontFamily: "inherit" }}
              onClick={() => { reset && reset(); go("services"); }}>
              Refazer cotação
            </button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)" }}>
          <button className="pg-btn pg-btn--accent pg-btn--block pg-btn--lg" onClick={() => go("frete-confirm")}>
            <Icon name="check-circle" size={20} /> Contratar prestador selecionado
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-mute)" }}>
            Pagamento direto · combinem detalhes pelo WhatsApp
          </div>
        </div>
      )}
    </div>
  );
};

window.PagoraExtra = {
  Guincho1, Guincho2, Guincho3, Guincho4,
  Cacamba1, Cacamba2, Cacamba3,
  Proposals,
};
