/* @jsxRuntime classic */
// =====================================================================
// FASE 1 CLIENTE — Pré-pedido / cotação
// 6 telas: Comparador, Filtros, Contraproposta, Agendar, Paradas, Itens
// =====================================================================
const { useState: useStateP1 } = React;
const { Icon: IconP1 } = window;
const StatusBarP1 = window.StatusBar;
const TopBarP1 = window.TopBar;

// ---------------------------------------------------------------------
// 1. COMPARADOR — 2 a 3 prestadores lado a lado
// ---------------------------------------------------------------------
const Compare = ({ go }) => {
  const [sel, setSel] = useStateP1(["p1", "p2"]);
  const all = [
    { id: "p1", name: "Carlos Mudanças", initials: "CM", price: 210, eta: "45 min", rating: 4.7, reviews: 89, vehicle: "Furgão 8m³", helpers: 1, free: ["Içamento", "Embalagem básica"], lvl: "Ouro" },
    { id: "p2", name: "JM Transportes", initials: "JM", price: 240, eta: "1h 10", rating: 4.9, reviews: 142, vehicle: "Baú 12m³", helpers: 2, free: ["Embalagem", "Desmontagem", "Seguro R$3k"], lvl: "Platina" },
    { id: "p3", name: "Frete Já SP", initials: "FJ", price: 295, eta: "2h", rating: 4.8, reviews: 256, vehicle: "Toco 16m³", helpers: 2, free: ["Seguro R$5k", "Cobertor"], lvl: "Ouro" },
  ];
  const toggle = (id) => {
    setSel(s => s.includes(id) ? s.filter(x => x !== id) : (s.length < 3 ? [...s, id] : s));
  };
  const selected = all.filter(p => sel.includes(p.id));
  const minPrice = Math.min(...selected.map(p => p.price));
  const bestRating = Math.max(...selected.map(p => p.rating));

  return (
    <div className="pg-screen" data-screen-label="C1 Comparador de prestadores">
      <StatusBarP1 />
      <TopBarP1 onBack={() => go("proposals")} title="Comparar propostas" />
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: "16px 20px 0" }}>
          <div className="pg-h-eyebrow" style={{ margin: 0 }}>SELECIONE ATÉ 3 PARA COMPARAR</div>
          <div className="pg-stack pg-stack--sm" style={{ marginTop: 10 }}>
            {all.map(p => {
              const active = sel.includes(p.id);
              return (
                <button key={p.id} onClick={() => toggle(p.id)}
                  className={`pg-card ${active ? "" : ""}`}
                  style={{
                    padding: "10px 12px", textAlign: "left", cursor: "pointer", width: "100%",
                    border: `1.5px solid ${active ? "var(--night-900)" : "var(--border)"}`,
                    background: active ? "var(--bg-soft)" : "var(--paper)",
                  }}>
                  <div className="pg-row" style={{ gap: 10 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      border: `2px solid ${active ? "var(--night-900)" : "var(--border-strong)"}`,
                      background: active ? "var(--night-900)" : "transparent",
                      display: "grid", placeItems: "center", flexShrink: 0,
                    }}>
                      {active && <span style={{ color: "var(--green-500)", fontSize: 13, fontWeight: 800, lineHeight: 1 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                    <div className="pg-mono" style={{ fontSize: 13, fontWeight: 700 }}>R$ {p.price}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Comparison table */}
        <div style={{ padding: "20px 0 0" }}>
          <div className="pg-h-eyebrow" style={{ margin: "0 20px 10px" }}>COMPARATIVO ({selected.length})</div>

          <div style={{ overflowX: "auto", padding: "0 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: `120px repeat(${selected.length}, 1fr)`, minWidth: 320 + selected.length * 140, gap: 0, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--paper)" }}>
              {/* header row */}
              <div style={cellHeadStyle}></div>
              {selected.map(p => (
                <div key={p.id} style={{ ...cellHeadStyle, textAlign: "center", padding: 12 }}>
                  <div style={{
                    width: 36, height: 36, margin: "0 auto", borderRadius: 10,
                    background: "var(--night-900)", color: "var(--green-500)",
                    display: "grid", placeItems: "center", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 12,
                  }}>{p.initials}</div>
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>{p.name}</div>
                </div>
              ))}

              {/* Price row */}
              <div style={cellLabelStyle}>Preço</div>
              {selected.map(p => (
                <div key={p.id} style={cellStyle}>
                  <span className="pg-mono" style={{ fontSize: 16, fontWeight: 700 }}>R$ {p.price}</span>
                  {p.price === minPrice && selected.length > 1 && <div className="pg-tag pg-tag--green" style={{ fontSize: 9, marginTop: 4 }}>MAIS BARATO</div>}
                </div>
              ))}

              {/* ETA */}
              <div style={cellLabelStyle}>Chegada</div>
              {selected.map(p => <div key={p.id} style={cellStyle}>{p.eta}</div>)}

              {/* Rating */}
              <div style={cellLabelStyle}>Avaliação</div>
              {selected.map(p => (
                <div key={p.id} style={cellStyle}>
                  ★ {p.rating} <span style={{ color: "var(--text-mute)", fontSize: 11 }}>({p.reviews})</span>
                  {p.rating === bestRating && selected.length > 1 && <div className="pg-tag pg-tag--green" style={{ fontSize: 9, marginTop: 4 }}>MELHOR</div>}
                </div>
              ))}

              {/* Vehicle */}
              <div style={cellLabelStyle}>Veículo</div>
              {selected.map(p => <div key={p.id} style={cellStyle}>{p.vehicle}</div>)}

              {/* Helpers */}
              <div style={cellLabelStyle}>Ajudantes</div>
              {selected.map(p => <div key={p.id} style={cellStyle}>{p.helpers}</div>)}

              {/* Level */}
              <div style={cellLabelStyle}>Nível</div>
              {selected.map(p => <div key={p.id} style={cellStyle}><span className="pg-tag pg-tag--dark" style={{ fontSize: 10 }}>{p.lvl}</span></div>)}

              {/* Free items */}
              <div style={cellLabelStyle}>Inclui</div>
              {selected.map(p => (
                <div key={p.id} style={{ ...cellStyle, fontSize: 11, lineHeight: 1.5 }}>
                  {p.free.map(f => <div key={f}>✓ {f}</div>)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 20px" }}>
          <div className="pg-card pg-card--soft" style={{ padding: 14, fontSize: 12, color: "var(--text-soft)" }}>
            <strong style={{ color: "var(--text)" }}>💡 Dica:</strong> O preço é importante, mas considere também avaliação e o que está incluso. Embalagem inclusa pode economizar R$ 80–150.
          </div>
        </div>
      </div>

      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" onClick={() => go("proposals")}>
          Voltar para escolher
        </button>
      </div>
    </div>
  );
};

const cellHeadStyle = { background: "var(--bg-soft)", borderBottom: "1px solid var(--border)", padding: "10px 12px", fontSize: 11, color: "var(--text-mute)", fontWeight: 600 };
const cellLabelStyle = { background: "var(--bg-soft)", padding: "10px 12px", fontSize: 11, color: "var(--text-soft)", fontWeight: 600, borderTop: "1px solid var(--border)" };
const cellStyle = { padding: "10px 12px", fontSize: 13, borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)", textAlign: "center" };

// ---------------------------------------------------------------------
// 2. FILTROS AVANÇADOS — bottom sheet style screen
// ---------------------------------------------------------------------
const FiltersAdv = ({ go }) => {
  const [radius, setRadius] = useStateP1(8);
  const [priceMax, setPriceMax] = useStateP1(400);
  const [vehicles, setVehicles] = useStateP1(["bau", "furgao"]);
  const [rating, setRating] = useStateP1(4);
  const [period, setPeriod] = useStateP1("any");
  const [verified, setVerified] = useStateP1(true);
  const [hasInsurance, setHasInsurance] = useStateP1(false);

  const toggleV = (id) => setVehicles(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);

  return (
    <div className="pg-screen" data-screen-label="C2 Filtros avançados">
      <StatusBarP1 />
      <TopBarP1 onBack={() => go("map")} title="Filtros" right={
        <button onClick={() => { setRadius(15); setPriceMax(500); setVehicles([]); setRating(0); setPeriod("any"); setVerified(false); setHasInsurance(false); }}
          style={{ background: "none", border: "none", color: "var(--text-soft)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Limpar</button>
      }/>
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: "20px" }}>

          {/* Distance */}
          <div className="pg-stack" style={{ marginBottom: 24 }}>
            <div className="pg-row pg-row--between">
              <span className="pg-label" style={{ fontSize: 14 }}>Raio de busca</span>
              <span className="pg-mono" style={{ fontSize: 14, fontWeight: 700 }}>{radius} km</span>
            </div>
            <input type="range" min={1} max={50} value={radius} onChange={(e) => setRadius(+e.target.value)} className="pg-range" />
            <div className="pg-row pg-row--between" style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>
              <span>1 KM</span><span>50 KM</span>
            </div>
          </div>

          {/* Price */}
          <div className="pg-stack" style={{ marginBottom: 24 }}>
            <div className="pg-row pg-row--between">
              <span className="pg-label" style={{ fontSize: 14 }}>Preço máximo</span>
              <span className="pg-mono" style={{ fontSize: 14, fontWeight: 700 }}>R$ {priceMax}</span>
            </div>
            <input type="range" min={50} max={1000} step={10} value={priceMax} onChange={(e) => setPriceMax(+e.target.value)} className="pg-range" />
          </div>

          {/* Vehicle */}
          <div style={{ marginBottom: 24 }}>
            <div className="pg-label" style={{ fontSize: 14, marginBottom: 12 }}>Tipo de veículo</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { id: "moto", t: "Moto", s: "até 20kg" },
                { id: "carro", t: "Carro", s: "até 200kg" },
                { id: "furgao", t: "Furgão", s: "até 1t" },
                { id: "bau", t: "Baú", s: "até 4t" },
                { id: "toco", t: "Toco", s: "até 7t" },
                { id: "guincho", t: "Guincho", s: "veículos" },
              ].map(v => {
                const active = vehicles.includes(v.id);
                return (
                  <button key={v.id} onClick={() => toggleV(v.id)}
                    className="pg-tile" style={{ textAlign: "left", border: `1.5px solid ${active ? "var(--night-900)" : "var(--border)"}`, background: active ? "var(--night-900)" : "var(--paper)", color: active ? "#fff" : "var(--text)" }}>
                    <div className="pg-tile-title" style={{ color: "inherit" }}>{v.t}</div>
                    <div className="pg-tile-sub" style={{ color: active ? "rgba(255,255,255,0.65)" : "var(--text-mute)" }}>{v.s}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rating */}
          <div style={{ marginBottom: 24 }}>
            <div className="pg-label" style={{ fontSize: 14, marginBottom: 12 }}>Avaliação mínima</div>
            <div className="pg-segmented">
              {[0, 3, 4, 4.5].map(r => (
                <button key={r} className={`pg-segmented-item${rating === r ? " is-active" : ""}`} onClick={() => setRating(r)}>
                  {r === 0 ? "Qualquer" : `★ ${r}+`}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div style={{ marginBottom: 24 }}>
            <div className="pg-label" style={{ fontSize: 14, marginBottom: 12 }}>Disponibilidade</div>
            <div className="pg-segmented">
              {[
                { id: "any", t: "Qualquer" },
                { id: "now", t: "Agora" },
                { id: "today", t: "Hoje" },
                { id: "week", t: "Esta semana" },
              ].map(p => (
                <button key={p.id} className={`pg-segmented-item${period === p.id ? " is-active" : ""}`} onClick={() => setPeriod(p.id)}>{p.t}</button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="pg-stack" style={{ marginBottom: 12 }}>
            <ToggleRow active={verified} onChange={setVerified} title="Apenas verificados" sub="Documentos validados pela PAGORA" />
            <ToggleRow active={hasInsurance} onChange={setHasInsurance} title="Inclui seguro" sub="Cobertura mínima de R$ 3.000" />
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" onClick={() => go("map")}>
          Aplicar filtros · ver 12 prestadores
        </button>
      </div>
    </div>
  );
};

const ToggleRow = ({ active, onChange, title, sub }) => (
  <div className="pg-row pg-row--between" style={{ padding: "12px 0", borderTop: "1px solid var(--border)" }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>{sub}</div>
    </div>
    <button className={`pg-toggle${active ? " is-on" : ""}`} onClick={() => onChange(!active)}
      style={{ background: active ? "var(--night-900)" : "var(--ink-200)", border: "none", padding: 0, position: "relative", cursor: "pointer" }}>
      <span className="pg-toggle-knob" style={{ position: "absolute", top: 2, left: active ? 20 : 2, background: "#fff", transition: "left 200ms" }} />
    </button>
  </div>
);

// ---------------------------------------------------------------------
// 3. CONTRAPROPOSTA — sugerir preço alternativo
// ---------------------------------------------------------------------
const Counter = ({ go }) => {
  const original = 295;
  const [offer, setOffer] = useStateP1(250);
  const [msg, setMsg] = useStateP1("Posso pagar à vista no Pix se fechar.");
  const diff = original - offer;
  const pct = ((diff / original) * 100).toFixed(0);

  return (
    <div className="pg-screen" data-screen-label="C3 Negociar contraproposta">
      <StatusBarP1 />
      <TopBarP1 onBack={() => go("proposals")} title="Fazer contraproposta" />
      <div className="pg-viewport">
        <div style={{ padding: 20 }}>

          {/* provider summary */}
          <div className="pg-card pg-card--padded" style={{ marginBottom: 20 }}>
            <div className="pg-row" style={{ gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--night-900)", color: "var(--green-500)", display: "grid", placeItems: "center", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 13 }}>FJ</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Frete Já SP</div>
                <div style={{ fontSize: 12, color: "var(--text-mute)" }}>★ 4.8 · 256 avaliações</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>PROPOSTA</div>
                <div className="pg-mono" style={{ fontSize: 18, fontWeight: 700 }}>R$ {original}</div>
              </div>
            </div>
          </div>

          <div className="pg-h-eyebrow" style={{ margin: "0 0 14px" }}>SUA OFERTA</div>

          {/* large offer input */}
          <div style={{ background: "var(--bg-soft)", borderRadius: 16, padding: 24, textAlign: "center", marginBottom: 16 }}>
            <div className="pg-mono" style={{ fontSize: 12, color: "var(--text-soft)", marginBottom: 6 }}>VOCÊ OFERECE</div>
            <div className="pg-row" style={{ justifyContent: "center", gap: 6 }}>
              <span className="pg-mono" style={{ fontSize: 28, fontWeight: 700 }}>R$</span>
              <input type="number" value={offer} onChange={(e) => setOffer(+e.target.value)}
                style={{ width: 140, fontSize: 48, fontWeight: 700, fontFamily: "var(--font-mono)", border: "none", background: "transparent", textAlign: "center", outline: "none" }} />
            </div>
            <div className="pg-mono" style={{ fontSize: 13, color: diff > 0 ? "var(--green-700)" : "var(--orange-600)", marginTop: 8 }}>
              {diff > 0 ? `−R$ ${diff} (${pct}% abaixo)` : diff < 0 ? `+R$ ${-diff}` : "preço cheio"}
            </div>
          </div>

          {/* slider */}
          <input type="range" min={original * 0.5} max={original * 1.1} step={5} value={offer} onChange={(e) => setOffer(+e.target.value)} className="pg-range" style={{ marginBottom: 8 }} />
          <div className="pg-row pg-row--between" style={{ fontSize: 10, color: "var(--text-mute)", fontFamily: "var(--font-mono)", marginBottom: 24 }}>
            <span>R$ {Math.round(original * 0.5)}</span>
            <span>R$ {Math.round(original * 1.1)}</span>
          </div>

          {/* quick chips */}
          <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>SUGESTÕES RÁPIDAS</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            {[0.85, 0.90, 0.95].map(m => (
              <button key={m} onClick={() => setOffer(Math.round(original * m))}
                style={{ flex: 1, padding: "10px 12px", border: `1.5px solid ${offer === Math.round(original * m) ? "var(--night-900)" : "var(--border)"}`, borderRadius: 10, background: "var(--paper)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                <div className="pg-mono">R$ {Math.round(original * m)}</div>
                <div style={{ fontSize: 10, color: "var(--text-mute)", marginTop: 2 }}>−{Math.round((1 - m) * 100)}%</div>
              </button>
            ))}
          </div>

          {/* message */}
          <div className="pg-field">
            <label className="pg-label">Justificativa (opcional)</label>
            <textarea className="pg-textarea" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Diga o porquê — flexibilidade, pagamento à vista, fidelidade..." />
            <div className="pg-helper">Ofertas com justificativa são 3× mais aceitas.</div>
          </div>

          <div className="pg-card pg-card--soft" style={{ padding: 12, fontSize: 12, color: "var(--text-soft)", marginTop: 20 }}>
            ⚠️ O prestador tem 30 minutos para aceitar, recusar ou enviar uma nova proposta.
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" onClick={() => go("proposals")}>
          Enviar contraproposta de R$ {offer}
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 4. AGENDAR — calendário + horário
// ---------------------------------------------------------------------
const Schedule = ({ go }) => {
  const [day, setDay] = useStateP1(15);
  const [time, setTime] = useStateP1("09:00");
  const [period, setPeriod] = useStateP1("morning");
  const monthDays = Array.from({ length: 30 }, (_, i) => i + 1);
  const weekStart = 0; // sun
  const offset = 3; // month starts on Wed
  const slots = period === "morning" ? ["07:00", "08:00", "09:00", "10:00", "11:00"] :
                period === "afternoon" ? ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00"] :
                ["18:00", "19:00", "20:00", "21:00"];

  return (
    <div className="pg-screen" data-screen-label="C4 Agendar para depois">
      <StatusBarP1 />
      <TopBarP1 onBack={() => go("frete-4")} title="Agendar serviço" />
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: 20 }}>
          <div className="pg-h-eyebrow" style={{ margin: 0 }}>ESCOLHA A DATA</div>

          {/* month nav */}
          <div className="pg-row pg-row--between" style={{ margin: "16px 0 12px" }}>
            <button style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 18 }}>‹</button>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Abril 2026</div>
            <button style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 18 }}>›</button>
          </div>

          {/* weekday headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
            {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map(d => (
              <div key={d} style={{ fontSize: 10, color: "var(--text-mute)", fontFamily: "var(--font-mono)", fontWeight: 700, textAlign: "center" }}>{d}</div>
            ))}
          </div>

          {/* days grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 24 }}>
            {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
            {monthDays.map(d => {
              const isPast = d < 7;
              const active = d === day;
              const isToday = d === 6;
              return (
                <button key={d} disabled={isPast} onClick={() => setDay(d)}
                  style={{
                    aspectRatio: "1", border: "none",
                    borderRadius: 10,
                    background: active ? "var(--night-900)" : isToday ? "var(--bg-soft)" : "transparent",
                    color: active ? "var(--green-500)" : isPast ? "var(--text-mute)" : "var(--text)",
                    fontWeight: active || isToday ? 700 : 500,
                    fontSize: 14, fontFamily: "var(--font-mono)",
                    cursor: isPast ? "not-allowed" : "pointer",
                    opacity: isPast ? 0.35 : 1,
                    position: "relative",
                  }}>
                  {d}
                  {isToday && !active && <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: 2, background: "var(--green-500)" }} />}
                </button>
              );
            })}
          </div>

          {/* time period segmented */}
          <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>HORÁRIO</div>
          <div className="pg-segmented" style={{ marginBottom: 12 }}>
            <button className={`pg-segmented-item${period === "morning" ? " is-active" : ""}`} onClick={() => { setPeriod("morning"); setTime("09:00"); }}>Manhã</button>
            <button className={`pg-segmented-item${period === "afternoon" ? " is-active" : ""}`} onClick={() => { setPeriod("afternoon"); setTime("14:00"); }}>Tarde</button>
            <button className={`pg-segmented-item${period === "evening" ? " is-active" : ""}`} onClick={() => { setPeriod("evening"); setTime("19:00"); }}>Noite</button>
          </div>

          {/* time slots */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
            {slots.map(s => {
              const active = s === time;
              return (
                <button key={s} onClick={() => setTime(s)}
                  style={{
                    height: 44, border: `1.5px solid ${active ? "var(--night-900)" : "var(--border)"}`, borderRadius: 10,
                    background: active ? "var(--night-900)" : "var(--paper)",
                    color: active ? "var(--green-500)" : "var(--text)",
                    fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 14, cursor: "pointer",
                  }}>{s}</button>
              );
            })}
          </div>

          <div className="pg-card pg-card--soft" style={{ padding: 14 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>VOCÊ AGENDOU</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>15 de abril, quarta · {time}</div>
            <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4 }}>Janela de tolerância: ±30 min</div>
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" onClick={() => go("frete-summary")}>Confirmar agendamento</button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 5. PARADAS EXTRAS — múltiplos pontos
// ---------------------------------------------------------------------
const Stops = ({ go }) => {
  const [stops, setStops] = useStateP1([
    { id: 1, type: "origin", addr: "Av. Paulista, 1000", det: "Apto 304" },
    { id: 2, type: "stop", addr: "R. Augusta, 250", det: "Buscar caixa extra" },
    { id: 3, type: "dest", addr: "R. Cardeal Arcoverde, 880", det: "Apto 12B" },
  ]);

  const addStop = () => {
    const dest = stops.findIndex(s => s.type === "dest");
    setStops(s => [
      ...s.slice(0, dest),
      { id: Date.now(), type: "stop", addr: "", det: "" },
      ...s.slice(dest),
    ]);
  };
  const remove = (id) => setStops(s => s.filter(x => x.id !== id));
  const update = (id, k, v) => setStops(s => s.map(x => x.id === id ? { ...x, [k]: v } : x));

  return (
    <div className="pg-screen" data-screen-label="C5 Adicionar paradas">
      <StatusBarP1 />
      <TopBarP1 onBack={() => go("frete-2")} title="Trajeto com paradas" />
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: 20 }}>
          <div className="pg-card pg-card--soft" style={{ padding: 12, marginBottom: 20, fontSize: 12, color: "var(--text-soft)" }}>
            💡 Cada parada extra adiciona ~R$ 25 ao orçamento e aumenta o tempo total.
          </div>

          <div style={{ position: "relative" }}>
            {/* connecting line */}
            <div style={{ position: "absolute", left: 13, top: 22, bottom: 22, width: 2, background: "var(--border-strong)", borderLeft: "2px dashed var(--border-strong)" }} />

            <div className="pg-stack pg-stack--sm" style={{ position: "relative" }}>
              {stops.map((s, i) => {
                const color = s.type === "origin" ? "var(--green-500)" : s.type === "dest" ? "var(--orange-500)" : "var(--ink-300)";
                const fill = s.type === "stop" ? "transparent" : color;
                const labelType = s.type === "origin" ? "ORIGEM" : s.type === "dest" ? "DESTINO" : `PARADA ${stops.filter((x, j) => x.type === "stop" && j <= i).length}`;
                return (
                  <div key={s.id} className="pg-row" style={{ alignItems: "flex-start", gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 14, marginTop: 12,
                      border: `2px solid ${color}`, background: fill,
                      display: "grid", placeItems: "center", flexShrink: 0,
                      color: s.type === "stop" ? color : "#fff",
                      fontWeight: 700, fontSize: 11, fontFamily: "var(--font-mono)",
                      position: "relative", zIndex: 1,
                    }}>
                      {s.type === "origin" ? "A" : s.type === "dest" ? "B" : (i)}
                    </div>
                    <div style={{ flex: 1 }} className="pg-card" >
                      <div className="pg-row pg-row--between" style={{ marginBottom: 4 }}>
                        <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9, color }}>{labelType}</div>
                        {s.type === "stop" && (
                          <button onClick={() => remove(s.id)} style={{ background: "none", border: "none", color: "var(--orange-500)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Remover</button>
                        )}
                      </div>
                      <input className="pg-input" style={{ height: 40 }} value={s.addr} onChange={(e) => update(s.id, "addr", e.target.value)} placeholder="Endereço" />
                      <input className="pg-input" style={{ height: 36, marginTop: 6, fontSize: 13 }} value={s.det} onChange={(e) => update(s.id, "det", e.target.value)} placeholder="Detalhes (opcional)" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* add stop button */}
            <button onClick={addStop}
              style={{ marginTop: 12, marginLeft: 38, padding: "10px 14px", border: "1.5px dashed var(--border-strong)", borderRadius: 10, background: "transparent", color: "var(--text-soft)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              + Adicionar parada
            </button>
          </div>

          {/* trip summary */}
          <div className="pg-card pg-card--padded" style={{ marginTop: 24 }}>
            <div className="pg-row pg-row--between">
              <div>
                <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>ROTA</div>
                <div className="pg-mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{18.4 + (stops.length - 2) * 3.2} km</div>
              </div>
              <div>
                <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>TEMPO EST.</div>
                <div className="pg-mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{Math.round(45 + (stops.length - 2) * 12)} min</div>
              </div>
              <div>
                <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>PARADAS</div>
                <div className="pg-mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{stops.filter(s => s.type === "stop").length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" onClick={() => go("frete-3")}>Continuar</button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 6. ITENS DA MUDANÇA — checklist do que vai
// ---------------------------------------------------------------------
const Items = ({ go }) => {
  const [items, setItems] = useStateP1({
    "Sofá 3 lugares": 1, "Cama de casal": 1, "Guarda-roupa": 1,
    "Geladeira": 1, "Caixas (média)": 12, "Mesa": 0, "Cadeiras": 0,
    "TV 50\"": 0, "Máquina de lavar": 0,
  });
  const [other, setOther] = useStateP1("");

  const inc = (k) => setItems(it => ({ ...it, [k]: (it[k] || 0) + 1 }));
  const dec = (k) => setItems(it => ({ ...it, [k]: Math.max(0, (it[k] || 0) - 1) }));

  const total = Object.values(items).reduce((a, b) => a + b, 0);
  const volume = Math.round(total * 0.35 * 10) / 10;

  return (
    <div className="pg-screen" data-screen-label="C6 Itens da mudança">
      <StatusBarP1 />
      <TopBarP1 onBack={() => go("frete-1")} title="O que vai na mudança" />
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: 20 }}>
          <p className="pg-h-sub" style={{ margin: "0 0 20px", fontSize: 14 }}>
            Liste o que será transportado. Isso ajuda o prestador a escolher o veículo certo e dar uma cotação precisa.
          </p>

          {/* category tabs */}
          <div className="pg-segmented" style={{ marginBottom: 16 }}>
            <button className="pg-segmented-item is-active">Móveis</button>
            <button className="pg-segmented-item">Eletros</button>
            <button className="pg-segmented-item">Caixas</button>
          </div>

          <div className="pg-stack pg-stack--sm">
            {Object.entries(items).map(([k, v]) => (
              <div key={k} className="pg-row pg-row--between" style={{ padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 10, background: v > 0 ? "var(--bg-soft)" : "var(--paper)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{k}</div>
                  <div style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>~{itemVolume(k)} m³</div>
                </div>
                <div className="pg-row" style={{ gap: 0 }}>
                  <button onClick={() => dec(k)} disabled={v === 0}
                    style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--paper)", cursor: "pointer", opacity: v === 0 ? 0.4 : 1, fontSize: 18, lineHeight: 1 }}>−</button>
                  <div className="pg-mono" style={{ width: 36, textAlign: "center", fontWeight: 700, fontSize: 15 }}>{v}</div>
                  <button onClick={() => inc(k)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: v > 0 ? "var(--night-900)" : "var(--paper)", color: v > 0 ? "var(--green-500)" : "var(--text)", cursor: "pointer", fontSize: 18, lineHeight: 1, fontWeight: 700 }}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            <label className="pg-label">Outros itens (opcional)</label>
            <textarea className="pg-textarea" value={other} onChange={(e) => setOther(e.target.value)} placeholder="Ex: 2 pranchas de surf, 1 piano vertical, plantas grandes..." />
          </div>

          <div className="pg-card pg-card--padded" style={{ marginTop: 20, background: "var(--night-900)", color: "#fff", borderColor: "var(--night-900)" }}>
            <div className="pg-row pg-row--between">
              <div>
                <div className="pg-h-eyebrow" style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: 9 }}>TOTAL DE ITENS</div>
                <div className="pg-mono" style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{total}</div>
              </div>
              <div>
                <div className="pg-h-eyebrow" style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: 9 }}>VOLUME EST.</div>
                <div className="pg-mono" style={{ fontSize: 24, fontWeight: 700, marginTop: 2, color: "var(--green-500)" }}>{volume} m³</div>
              </div>
              <div>
                <div className="pg-h-eyebrow" style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: 9 }}>VEÍCULO IDEAL</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{volume < 4 ? "Furgão" : volume < 8 ? "Baú 8m³" : volume < 14 ? "Baú 12m³" : "Toco 16m³"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" onClick={() => go("frete-2")}>Continuar com {total} itens</button>
      </div>
    </div>
  );
};

const itemVolume = (k) => {
  const map = { "Sofá 3 lugares": 1.8, "Cama de casal": 1.5, "Guarda-roupa": 2.2, "Geladeira": 1.0, "Caixas (média)": 0.08, "Mesa": 1.2, "Cadeiras": 0.3, "TV 50\"": 0.2, "Máquina de lavar": 0.7 };
  return map[k] || 0.5;
};

window.PagoraPhase1 = { Compare, FiltersAdv, Counter, Schedule, Stops, Items };
