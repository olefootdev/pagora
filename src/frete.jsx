/* @jsxRuntime classic */
/* global React, Icon */
const { useState: useStateF, useMemo: useMemoF } = React;

// Pricing model (rough — for demo)
const calcFrete = (s) => {
  const km = s.distance || 15;
  const baseKm = km * 12;
  const vehicle = { van: 0, bau: 50, grande: 130 }[s.vehicle] || 50;
  const helpers = (s.helpers || 0) * 50;
  const access = (s.originAccess?.needHelp ? 30 : 0) + (s.destAccess?.needHelp ? 30 : 0);
  const noElev = (s.originAccess?.type === "apt" && !s.originAccess?.elevator ? 25 : 0)
              + (s.destAccess?.type === "apt" && !s.destAccess?.elevator ? 25 : 0);
  const baseFee = 30;
  let total = baseKm + vehicle + helpers + access + noElev + baseFee;
  if (s.urgency === "today") total = Math.round(total * 1.3);
  const low = Math.round(total);
  const high = Math.round(total * 1.25);
  return { low, high, breakdown: { baseKm, vehicle, helpers, access, noElev, baseFee, urgency: s.urgency === "today" ? "+30%" : "—" } };
};

// =====================================================================
// FRETE 1 — Cargo type
// =====================================================================
const Frete1 = ({ go, state, set }) => {
  const opts = [
    { id: "mudanca-res", t: "Mudança residencial completa", s: "Casa ou apartamento inteiro" },
    { id: "mudanca-com", t: "Mudança comercial / escritório", s: "Empresa, loja, consultório" },
    { id: "moveis", t: "Móveis e eletrodomésticos", s: "Compra ou itens avulsos" },
    { id: "carga-geral", t: "Carga geral / mercadorias", s: "Caixas, lotes, encomendas" },
    { id: "construcao", t: "Materiais de construção", s: "Tijolos, areia, telhas, placas" },
    { id: "outro", t: "Outro tipo de carga", s: "Detalhe nas observações" },
  ];
  return (
    <div className="pg-screen" data-screen-label="03 Frete · Carga">
      <StatusBar />
      <TopBar onBack={() => go("services")} title="Frete" progress={20} />
      <div className="pg-page">
        <div className="pg-page-body">
          <div>
            <div className="pg-h-eyebrow">PASSO 1 DE 4 · CARGA</div>
            <h1 className="pg-h-title">O que você vai transportar?</h1>
            <p className="pg-h-sub">Isso ajuda o prestador a saber o tipo de veículo e cuidados.</p>
          </div>
          <div className="pg-stack pg-stack--sm">
            {opts.map(o => (
              <button key={o.id} className={`pg-choice${state.cargo === o.id ? " is-active" : ""}`}
                onClick={() => set({ cargo: o.id })}>
                <span className="pg-choice-bullet" />
                <div className="pg-choice-body">
                  <div className="pg-choice-title">{o.t}</div>
                  <div className="pg-choice-sub">{o.s}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="pg-page-foot">
          <button className="pg-btn pg-btn--primary pg-btn--block" disabled={!state.cargo} onClick={() => go("frete-2")}>
            Continuar <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// Sub: address with access details
// =====================================================================
const AccessBlock = ({ label, value, onChange }) => {
  const v = value || {};
  const set = (patch) => onChange({ ...v, ...patch });
  return (
    <div className="pg-stack pg-stack--sm">
      <div className="pg-segmented">
        {[
          { id: "house", t: "Casa térrea", icon: "home" },
          { id: "apt", t: "Apartamento", icon: "building" },
          { id: "comm", t: "Comércio", icon: "store" },
        ].map(o => (
          <button key={o.id} className={`pg-segmented-item${v.type === o.id ? " is-active" : ""}`}
            onClick={() => set({ type: o.id })}>
            {o.t}
          </button>
        ))}
      </div>

      {v.type === "apt" && (
        <div className="pg-row" style={{ gap: 10 }}>
          <div className="pg-field" style={{ flex: 1 }}>
            <span className="pg-label">Andar</span>
            <input type="number" min="0" max="40" className="pg-input" placeholder="3"
              value={v.floor || ""} onChange={e => set({ floor: e.target.value })} />
          </div>
          <button
            type="button"
            onClick={() => set({ elevator: !v.elevator })}
            className={`pg-choice${v.elevator ? " is-active" : ""}`}
            style={{ flex: 1.2, padding: "10px 12px" }}
          >
            <span className="pg-choice-bullet is-square" />
            <div className="pg-choice-body">
              <div className="pg-choice-title" style={{ fontSize: 14 }}>Tem elevador</div>
            </div>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => set({ needHelp: !v.needHelp })}
        className={`pg-choice${v.needHelp ? " is-active" : ""}`}
        style={{ padding: "12px 14px" }}
      >
        <span className="pg-choice-bullet is-square" />
        <div className="pg-choice-body">
          <div className="pg-choice-title" style={{ fontSize: 14 }}>Precisa ajudante para {label}</div>
          <div className="pg-choice-sub">+R$ 30 estimado</div>
        </div>
      </button>
    </div>
  );
};

// =====================================================================
// FRETE 2 — Origin & destination
// =====================================================================
const Frete2 = ({ go, state, set }) => {
  const valid = state.origin && state.dest && state.originAccess?.type && state.destAccess?.type;
  return (
    <div className="pg-screen" data-screen-label="04 Frete · Trajeto">
      <StatusBar />
      <TopBar onBack={() => go("frete-1")} title="Frete" progress={40} />
      <div className="pg-page">
        <div className="pg-page-body">
          <div>
            <div className="pg-h-eyebrow">PASSO 2 DE 4 · TRAJETO</div>
            <h1 className="pg-h-title">De onde para onde?</h1>
            <p className="pg-h-sub">Detalhes de acesso evitam surpresas no dia.</p>
          </div>

          {/* Origin */}
          <div className="pg-card pg-card--padded" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="pg-row" style={{ gap: 8 }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8, background: "var(--green-50)",
                color: "var(--green-700)", display: "grid", placeItems: "center",
              }}><Icon name="pin-fill" size={16} /></span>
              <span className="pg-h-eyebrow" style={{ margin: 0 }}>ORIGEM · COLETA</span>
            </div>
            <div className="pg-input-wrap">
              <span className="pg-input-icon"><Icon name="search" size={18} /></span>
              <input className="pg-input pg-input--with-icon" placeholder="Endereço de coleta"
                value={state.origin || ""} onChange={e => set({ origin: e.target.value })} />
            </div>
            <AccessBlock label="carregar" value={state.originAccess} onChange={v => set({ originAccess: v })} />
          </div>

          {/* Distance display */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, color: "var(--text-mute)", fontSize: 12, fontFamily: "var(--font-mono)",
            letterSpacing: "0.06em",
          }}>
            <Icon name="ruler" size={14} />
            <span>~{state.distance || 15} km · 35 min de carro</span>
          </div>

          {/* Destination */}
          <div className="pg-card pg-card--padded" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="pg-row" style={{ gap: 8 }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8, background: "var(--night-900)",
                color: "var(--green-500)", display: "grid", placeItems: "center",
              }}><Icon name="navigation" size={14} /></span>
              <span className="pg-h-eyebrow" style={{ margin: 0 }}>DESTINO · ENTREGA</span>
            </div>
            <div className="pg-input-wrap">
              <span className="pg-input-icon"><Icon name="search" size={18} /></span>
              <input className="pg-input pg-input--with-icon" placeholder="Endereço de entrega"
                value={state.dest || ""} onChange={e => set({ dest: e.target.value })} />
            </div>
            <AccessBlock label="descarregar" value={state.destAccess} onChange={v => set({ destAccess: v })} />
          </div>
        </div>

        <div className="pg-page-foot">
          <button className="pg-btn pg-btn--primary pg-btn--block" disabled={!valid} onClick={() => go("frete-3")}>
            Continuar <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// FRETE 3 — Vehicle & helpers
// =====================================================================
const Frete3 = ({ go, state, set }) => {
  const veh = [
    { id: "van", t: "Van / Fiorino", s: "Cargas pequenas", meta: "até 1 m³" },
    { id: "bau", t: "Caminhão baú", s: "Mudanças e cargas médias", meta: "até 15 m³" },
    { id: "grande", t: "Caminhão grande", s: "Mudanças completas", meta: "até 30 m³" },
  ];
  const helpers = state.helpers ?? 1;
  return (
    <div className="pg-screen" data-screen-label="05 Frete · Veículo">
      <StatusBar />
      <TopBar onBack={() => go("frete-2")} title="Frete" progress={60} />
      <div className="pg-page">
        <div className="pg-page-body">
          <div>
            <div className="pg-h-eyebrow">PASSO 3 DE 4 · VEÍCULO</div>
            <h1 className="pg-h-title">Quanto tem para transportar?</h1>
            <p className="pg-h-sub">Em dúvida? Escolha o tamanho médio — o prestador confirma na proposta.</p>
          </div>

          <div className="pg-stack pg-stack--sm">
            {veh.map(v => (
              <button key={v.id} className={`pg-tile${state.vehicle === v.id ? " is-active" : ""}`}
                onClick={() => set({ vehicle: v.id })}>
                <div className="pg-row pg-row--between">
                  <div className="pg-tile-icon"><Icon name="truck" size={22} /></div>
                  <span className="pg-tile-meta">{v.meta}</span>
                </div>
                <div>
                  <div className="pg-tile-title">{v.t}</div>
                  <div className="pg-tile-sub">{v.s}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="pg-card pg-card--padded">
            <div className="pg-row pg-row--between">
              <div>
                <div className="pg-h-eyebrow" style={{ margin: 0 }}>AJUDANTES</div>
                <div style={{ fontSize: 14, color: "var(--text-soft)", marginTop: 4 }}>
                  Cada ajudante: +R$ 50
                </div>
              </div>
              <div className="pg-row" style={{ gap: 6 }}>
                <button className="pg-iconbtn" onClick={() => set({ helpers: Math.max(0, helpers - 1) })} aria-label="Menos">
                  <Icon name="minus" />
                </button>
                <span className="pg-mono" style={{ minWidth: 24, textAlign: "center", fontWeight: 700, fontSize: 20 }}>{helpers}</span>
                <button className="pg-iconbtn" onClick={() => set({ helpers: Math.min(4, helpers + 1) })} aria-label="Mais">
                  <Icon name="plus" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pg-page-foot">
          <button className="pg-btn pg-btn--primary pg-btn--block" disabled={!state.vehicle} onClick={() => go("frete-4")}>
            Continuar <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// FRETE 4 — Date & notes
// =====================================================================
const Frete4 = ({ go, state, set }) => {
  const opts = [
    { id: "today", t: "Hoje (urgente)", s: "Acréscimo de 30%", icon: "bolt" },
    { id: "tomorrow", t: "Amanhã", s: "Mais propostas disponíveis", icon: "sun-on" },
    { id: "week", t: "Próximos 7 dias", s: "Flexível, melhor preço", icon: "calendar" },
    { id: "scheduled", t: "Agendar data específica", s: "Escolha dia e hora", icon: "calendar" },
  ];
  return (
    <div className="pg-screen" data-screen-label="06 Frete · Data">
      <StatusBar />
      <TopBar onBack={() => go("frete-3")} title="Frete" progress={80} />
      <div className="pg-page">
        <div className="pg-page-body">
          <div>
            <div className="pg-h-eyebrow">PASSO 4 DE 4 · QUANDO</div>
            <h1 className="pg-h-title">Quando você precisa?</h1>
            <p className="pg-h-sub">Quanto mais flexível, melhor o preço.</p>
          </div>

          <div className="pg-stack pg-stack--sm">
            {opts.map(o => (
              <button key={o.id} className={`pg-choice${state.urgency === o.id ? " is-active" : ""}`}
                onClick={() => set({ urgency: o.id })}>
                <span style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: state.urgency === o.id ? "rgba(255,255,255,0.1)" : "var(--ink-100)",
                  color: state.urgency === o.id ? "#fff" : "var(--text)",
                  display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  <Icon name={o.icon} size={18} />
                </span>
                <div className="pg-choice-body">
                  <div className="pg-choice-title">{o.t}</div>
                  <div className="pg-choice-sub">{o.s}</div>
                </div>
              </button>
            ))}
          </div>

          {state.urgency === "scheduled" && (
            <div className="pg-row" style={{ gap: 10 }}>
              <div className="pg-field" style={{ flex: 1 }}>
                <span className="pg-label">Data</span>
                <input className="pg-input" type="date" defaultValue="2026-04-29"
                  onChange={e => set({ scheduledDate: e.target.value })}/>
              </div>
              <div className="pg-field" style={{ flex: 1 }}>
                <span className="pg-label">Hora</span>
                <input className="pg-input" type="time" defaultValue="09:00"
                  onChange={e => set({ scheduledTime: e.target.value })}/>
              </div>
            </div>
          )}

          <div className="pg-field">
            <span className="pg-label">Observações (opcional)</span>
            <textarea className="pg-textarea" placeholder="Ex.: geladeira grande, sofá 3 lugares, peças desmontadas, piano…"
              value={state.notes || ""} onChange={e => set({ notes: e.target.value })} />
            <span className="pg-helper">Quanto mais detalhe, mais preciso o orçamento.</span>
          </div>

          <div className="pg-row" style={{ gap: 10 }}>
            <button className="pg-btn pg-btn--ghost" style={{ flex: 1 }}>
              <Icon name="camera" size={18} /> Tirar foto
            </button>
            <button className="pg-btn pg-btn--ghost" style={{ flex: 1 }}>
              <Icon name="package" size={18} /> Galeria
            </button>
          </div>
        </div>

        <div className="pg-page-foot">
          <button className="pg-btn pg-btn--primary pg-btn--block" disabled={!state.urgency} onClick={() => go("frete-summary")}>
            Ver orçamento estimado <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// SUMMARY — estimate + breakdown
// =====================================================================
const FreteSummary = ({ go, state }) => {
  const price = useMemoF(() => calcFrete(state), [state]);
  const accessLabel = (a) => {
    if (!a?.type) return "—";
    const map = { house: "Casa térrea", apt: `Apartamento, ${a.floor || "—"}º andar`, comm: "Comércio" };
    return map[a.type] + (a.type === "apt" ? (a.elevator ? " · com elevador" : " · sem elevador") : "");
  };
  const cargoMap = {
    "mudanca-res": "Mudança residencial completa",
    "mudanca-com": "Mudança comercial",
    "moveis": "Móveis e eletrodomésticos",
    "carga-geral": "Carga geral / mercadorias",
    "construcao": "Materiais de construção",
    "outro": "Outro tipo de carga",
  };
  const vehicleMap = {
    van: "Van / Fiorino (até 1 m³)",
    bau: "Caminhão baú (até 15 m³)",
    grande: "Caminhão grande (até 30 m³)",
  };
  const urgencyMap = {
    today: "Hoje (urgente)",
    tomorrow: "Amanhã",
    week: "Nos próximos 7 dias",
    scheduled: `${state.scheduledDate || "29/04/2026"} às ${state.scheduledTime || "09:00"}`,
  };
  return (
    <div className="pg-screen" data-screen-label="07 Frete · Resumo">
      <StatusBar />
      <TopBar onBack={() => go("frete-4")} title="Resumo" />
      <div className="pg-page">
        <div className="pg-page-body">
          {/* Price card — dark, premium */}
          <div className="pg-card pg-card--dark" style={{ padding: 22, position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute", top: 0, right: 0, width: 140, height: 140,
              background: "radial-gradient(circle at top right, rgba(34,227,163,0.18), transparent 60%)",
            }} />
            <div className="pg-h-eyebrow" style={{ color: "var(--green-500)", margin: 0 }}>VALOR BASE ESTIMADO</div>
            <div style={{
              fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 38,
              letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: 8,
            }}>
              R$ {price.low}<span style={{ color: "rgba(255,255,255,0.4)" }}> – </span>R$ {price.high}
            </div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 8 }}>
              Range estimado · prestador envia valor final na proposta
            </div>

            <hr className="pg-divider--dashed" style={{ margin: "16px 0", borderColor: "rgba(255,255,255,0.16)" }} />

            <div className="pg-stack pg-stack--sm" style={{ fontSize: 14 }}>
              {[
                ["Distância", `${state.distance || 15} km`, `R$ ${price.breakdown.baseKm}`],
                ["Veículo", vehicleMap[state.vehicle], `R$ ${price.breakdown.vehicle}`],
                ["Ajudantes", `${state.helpers || 0} pessoa(s)`, `R$ ${price.breakdown.helpers}`],
                ["Acesso difícil", state.originAccess?.needHelp || state.destAccess?.needHelp ? "Sim" : "Não", `R$ ${price.breakdown.access}`],
                ["Sem elevador", price.breakdown.noElev ? "Sim" : "Não", `R$ ${price.breakdown.noElev}`],
                ["Taxa base", "Plataforma", `R$ ${price.breakdown.baseFee}`],
                state.urgency === "today" && ["Urgência", "Hoje", price.breakdown.urgency],
              ].filter(Boolean).map((row, i) => (
                <div key={i} className="pg-row pg-row--between" style={{ color: "rgba(255,255,255,0.85)" }}>
                  <span style={{ color: "rgba(255,255,255,0.55)" }}>{row[0]} · {row[1]}</span>
                  <span className="pg-mono pg-num">{row[2]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Why it can vary */}
          <div className="pg-card" style={{
            background: "var(--orange-50)", borderColor: "rgba(255,122,26,0.3)",
            display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <span style={{ color: "var(--orange-600)", marginTop: 2 }}><Icon name="alert" size={18} /></span>
            <div style={{ fontSize: 13, color: "var(--ink-800)", lineHeight: 1.5 }}>
              <strong>Valor pode variar conforme:</strong> volume real da carga, dificuldade no local, necessidade de embalagem extra, e disponibilidade no horário escolhido.
            </div>
          </div>

          {/* Resumo do pedido */}
          <div className="pg-card pg-card--padded">
            <div className="pg-h-eyebrow" style={{ margin: 0 }}>SEU PEDIDO</div>
            <div className="pg-stack pg-stack--sm" style={{ marginTop: 14, fontSize: 14 }}>
              {[
                ["Tipo", cargoMap[state.cargo] || "—", "package"],
                ["Origem", `${state.origin || "—"}`, "pin-fill"],
                ["", accessLabel(state.originAccess), null],
                ["Destino", `${state.dest || "—"}`, "navigation"],
                ["", accessLabel(state.destAccess), null],
                ["Veículo", vehicleMap[state.vehicle], "truck"],
                ["Ajudantes", `${state.helpers || 0}`, "users"],
                ["Quando", urgencyMap[state.urgency] || "—", "calendar"],
                state.notes && ["Observações", state.notes, "edit"],
              ].filter(Boolean).map((row, i) => (
                <div key={i} className="pg-row" style={{ alignItems: "flex-start", gap: 10 }}>
                  <span style={{
                    width: 22, color: "var(--text-mute)", flexShrink: 0,
                    paddingTop: 2,
                  }}>{row[2] && <Icon name={row[2]} size={16} />}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {row[0] && <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-mute)" }}>{row[0]}</div>}
                    <div style={{ color: "var(--text)", overflowWrap: "anywhere" }}>{row[1]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Process explainer */}
          <div className="pg-card pg-card--soft">
            <div className="pg-row" style={{ gap: 8, marginBottom: 10 }}>
              <Icon name="clock" size={16} />
              <strong style={{ fontSize: 14 }}>O que acontece depois</strong>
            </div>
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8, fontSize: 13, color: "var(--text-soft)" }}>
              <li>1. Prestadores avaliam (15 min – 2 h)</li>
              <li>2. Você recebe propostas no WhatsApp</li>
              <li>3. Compara e contrata direto</li>
            </ol>
          </div>
        </div>

        <div className="pg-page-foot">
          <button className="pg-btn pg-btn--accent pg-btn--block pg-btn--lg" onClick={() => go("frete-confirm")}>
            <Icon name="whatsapp" size={20} /> Solicitar orçamentos
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-mute)" }}>
            Sem cobrança agora · pagamento direto com prestador
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// CONFIRMATION
// =====================================================================
const FreteConfirm = ({ go, state, reset }) => {
  const [email, setEmail] = useStateF("");
  const [sent, setSent] = useStateF(false);
  return (
    <div className="pg-screen" data-screen-label="08 Frete · Enviado">
      <StatusBar />
      <TopBar transparent right={
        <button className="pg-iconbtn" onClick={() => { reset(); go("landing"); }}>
          <Icon name="close" />
        </button>
      } />
      <div className="pg-viewport">
        <div style={{ padding: "8px 24px 24px", textAlign: "center" }}>
          <div className="pg-anim-in" style={{ display: "inline-block", marginTop: 12 }}>
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="34" className="pg-check-circle" />
              <path d="M22 37 l10 10 l18 -22" className="pg-check-path" />
            </svg>
          </div>
          <h1 style={{ margin: "16px 0 6px", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Solicitação enviada!
          </h1>
          <p style={{ margin: 0, color: "var(--text-soft)", fontSize: 15, maxWidth: "32ch", marginInline: "auto" }}>
            Seu pedido <span className="pg-mono pg-bold">#PG-1247</span> foi enviado para prestadores especializados na sua região.
          </p>
        </div>

        {/* Live status */}
        <div style={{ padding: "0 20px 20px" }}>
          <div className="pg-card pg-card--padded">
            <div className="pg-row pg-row--between">
              <div className="pg-h-eyebrow" style={{ margin: 0 }}>STATUS DO PEDIDO</div>
              <span className="pg-tag pg-tag--green">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green-600)" }} />
                Aguardando propostas
              </span>
            </div>
            <div style={{ marginTop: 16, position: "relative" }}>
              {[
                { t: "Solicitação enviada", s: "Há instantes", done: true },
                { t: "Prestadores avaliando", s: "Equipamento, rota, disponibilidade", done: false, current: true },
                { t: "Propostas recebidas", s: "Você compara e escolhe" },
                { t: "Serviço contratado", s: "Pagamento direto com prestador" },
              ].map((step, i, arr) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 12, paddingBottom: i < arr.length - 1 ? 16 : 0, position: "relative" }}>
                  {i < arr.length - 1 && (
                    <span style={{
                      position: "absolute", left: 15, top: 28, bottom: 0, width: 2,
                      background: step.done ? "var(--green-500)" : "var(--border)",
                    }} />
                  )}
                  <span style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: step.done ? "var(--green-500)" : step.current ? "var(--night-900)" : "var(--paper)",
                    border: step.done || step.current ? "none" : "1.5px solid var(--border-strong)",
                    color: step.done ? "var(--night-900)" : step.current ? "var(--green-500)" : "var(--text-mute)",
                    display: "grid", placeItems: "center", zIndex: 1,
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {step.done ? <Icon name="check" size={14} strokeWidth={3} />
                     : step.current ? <span style={{ width: 8, height: 8, background: "var(--green-500)", borderRadius: "50%" }} />
                     : i + 1}
                  </span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: step.done || step.current ? "var(--text)" : "var(--text-mute)" }}>
                      {step.t}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-mute)" }}>{step.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Email capture */}
        <div style={{ padding: "0 20px 20px" }}>
          <div className="pg-card pg-card--padded" style={{ background: "var(--night-900)", color: "#fff", borderColor: "var(--night-900)" }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Quer acompanhar por email também?</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
              Te avisamos quando cada proposta chegar. Sem spam.
            </div>
            {sent ? (
              <div className="pg-row" style={{ marginTop: 12, color: "var(--green-500)" }}>
                <Icon name="check-circle" size={18} />
                <span style={{ fontSize: 14 }}>Pronto, você receberá os updates.</span>
              </div>
            ) : (
              <div className="pg-row" style={{ marginTop: 12, gap: 8 }}>
                <input
                  type="email"
                  className="pg-input"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.16)", color: "#fff" }}
                />
                <button className="pg-btn pg-btn--accent" onClick={() => setSent(true)} disabled={!email.includes("@")}>Enviar</button>
              </div>
            )}
          </div>
        </div>

        {/* While you wait */}
        <div style={{ padding: "0 20px 20px" }}>
          <div className="pg-h-eyebrow" style={{ marginBottom: 10 }}>ENQUANTO AGUARDA</div>
          <div className="pg-stack pg-stack--sm">
            {[
              ["Organize os itens a transportar", "package"],
              ["Tenha forma de pagamento (Pix recomendado)", "money"],
              ["Confirme o horário com responsáveis nos endereços", "users"],
            ].map((it, i) => (
              <div key={i} className="pg-card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "var(--ink-100)", display: "grid", placeItems: "center",
                }}><Icon name={it[1]} size={16} /></span>
                <span style={{ fontSize: 14 }}>{it[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom actions */}
        <div style={{ padding: "8px 20px 32px", display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="pg-btn pg-btn--accent pg-btn--block" onClick={() => go("proposals")}>
            <Icon name="check-circle" size={18} /> Ver propostas recebidas
          </button>
          <button className="pg-btn pg-btn--ghost pg-btn--block">
            <Icon name="phone" size={18} /> Falar com suporte
          </button>
          <button className="pg-btn pg-btn--primary pg-btn--block" onClick={() => { reset(); go("services"); }}>
            Fazer nova cotação
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// Generic stub for guincho/cacamba (since scope is Frete)
// =====================================================================
const Stub = ({ go, title, sub }) => (
  <div className="pg-screen" data-screen-label={`Stub · ${title}`}>
    <StatusBar />
    <TopBar onBack={() => go("services")} title={title} />
    <div className="pg-page">
      <div className="pg-page-body" style={{ alignItems: "center", justifyContent: "center", textAlign: "center", paddingTop: 60 }}>
        <span style={{
          width: 64, height: 64, borderRadius: 16,
          background: "var(--ink-100)", display: "grid", placeItems: "center",
        }}><Icon name="wrench" size={28} /></span>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h2>
        <p style={{ color: "var(--text-soft)", maxWidth: "32ch", textAlign: "center" }}>{sub}</p>
        <button className="pg-btn pg-btn--ghost" onClick={() => go("services")}>Voltar para serviços</button>
      </div>
    </div>
  </div>
);

window.PagoraFrete = { Frete1, Frete2, Frete3, Frete4, FreteSummary, FreteConfirm, Stub, calcFrete };
