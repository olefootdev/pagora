/* @jsxRuntime classic */
// =====================================================================
// FASE 4 PRESTADOR — Onboarding + operação
// =====================================================================
const { useState: useStateP4, useEffect: useEffectP4, useMemo: useMemoP4 } = React;
const SBp4 = window.StatusBar;
const TBp4 = window.TopBar;

// ---------------------------------------------------------------------
// 1. CADASTRO MULTI-STEP — 5 passos
// ---------------------------------------------------------------------
const ProvSignup = ({ go }) => {
  const [step, setStep] = useStateP4(1);
  const [data, setData] = useStateP4({
    name: "", cpf: "", phone: "", email: "",
    cnh: "", cnhCat: "B",
    plate: "", model: "", year: "", color: "", bodyType: "Van pequena", capacity: 800,
    bank: "Nubank", agency: "", account: "", pixKey: "",
    selfie: false, doc: false,
  });
  const update = (k, v) => setData(d => ({ ...d, [k]: v }));
  const total = 5;
  const titles = [
    "Vamos começar",
    "CNH e habilitação",
    "Seu veículo",
    "Conta para receber",
    "Selfie e documento",
  ];
  const subs = [
    "Crie sua conta de prestador em 5 minutos",
    "Precisamos verificar sua habilitação",
    "Conte-nos sobre o veículo de trabalho",
    "Onde vamos depositar seus ganhos",
    "Última etapa: validação de identidade",
  ];

  const next = () => step < total ? setStep(step + 1) : go("prov-pending");
  const back = () => step > 1 ? setStep(step - 1) : go("provider-landing");

  return (
    <div className="pg-screen" data-screen-label={`P4-1.${step} Cadastro prestador`}>
      <SBp4 />
      <TBp4 onBack={back} title={`Passo ${step} de ${total}`} />

      {/* progress bar */}
      <div style={{ background: "var(--paper)", padding: "0 20px 16px", borderBottom: "1px solid var(--border)" }}>
        <div className="pg-row" style={{ gap: 4 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i < step ? "var(--green-500)" : "var(--ink-200)",
              transition: "background 200ms",
            }} />
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="pg-h-eyebrow" style={{ margin: 0, color: "var(--green-700)" }}>ETAPA {step}/{total}</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "4px 0 4px", letterSpacing: "-0.02em" }}>{titles[step-1]}</h1>
          <p style={{ fontSize: 13, color: "var(--text-soft)", margin: 0 }}>{subs[step-1]}</p>
        </div>
      </div>

      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: 20 }}>
          {step === 1 && (
            <div className="pg-stack">
              <div className="pg-field">
                <label className="pg-label">Nome completo</label>
                <input className="pg-input" placeholder="João da Silva" value={data.name} onChange={(e) => update("name", e.target.value)} />
              </div>
              <div className="pg-field">
                <label className="pg-label">CPF</label>
                <input className="pg-input" placeholder="000.000.000-00" value={data.cpf} onChange={(e) => update("cpf", e.target.value)} style={{ fontFamily: "var(--font-mono)" }} />
              </div>
              <div className="pg-field">
                <label className="pg-label">Telefone (WhatsApp)</label>
                <input className="pg-input" placeholder="(11) 99999-9999" value={data.phone} onChange={(e) => update("phone", e.target.value)} style={{ fontFamily: "var(--font-mono)" }} />
              </div>
              <div className="pg-field">
                <label className="pg-label">Email</label>
                <input className="pg-input" type="email" placeholder="seu@email.com" value={data.email} onChange={(e) => update("email", e.target.value)} />
              </div>
              <div className="pg-card pg-card--soft" style={{ padding: 14, fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5 }}>
                🔒 Seus dados são criptografados. A PAGORA nunca compartilha CPF ou contato com terceiros.
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="pg-stack">
              <div className="pg-field">
                <label className="pg-label">Número de registro CNH</label>
                <input className="pg-input" placeholder="00000000000" value={data.cnh} onChange={(e) => update("cnh", e.target.value)} style={{ fontFamily: "var(--font-mono)" }} />
              </div>
              <div className="pg-field">
                <label className="pg-label">Categoria</label>
                <div className="pg-row" style={{ gap: 8 }}>
                  {["A", "B", "C", "D", "E"].map(c => (
                    <button key={c} onClick={() => update("cnhCat", c)}
                      style={{
                        flex: 1, height: 44, borderRadius: 10,
                        border: `1.5px solid ${data.cnhCat === c ? "var(--night-900)" : "var(--border)"}`,
                        background: data.cnhCat === c ? "var(--night-900)" : "var(--paper)",
                        color: data.cnhCat === c ? "#fff" : "var(--text)",
                        fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 16, cursor: "pointer",
                      }}>{c}</button>
                  ))}
                </div>
                <div className="pg-helper">A=moto · B=carro · C=caminhão leve · D=ônibus · E=caminhão pesado</div>
              </div>

              {/* upload CNH */}
              <div>
                <label className="pg-label" style={{ marginBottom: 6 }}>Foto da CNH (frente e verso)</label>
                <div className="pg-row" style={{ gap: 10 }}>
                  {["Frente", "Verso"].map(s => (
                    <button key={s} className="pg-card" style={{
                      flex: 1, height: 120, padding: 0, cursor: "pointer",
                      border: "1.5px dashed var(--border-strong)", background: "var(--bg-soft)",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      <div style={{ fontSize: 28 }}>📷</div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{s}</div>
                      <div className="pg-mono" style={{ fontSize: 9, color: "var(--text-mute)" }}>TOQUE PARA CAPTURAR</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pg-card pg-card--soft" style={{ padding: 14, fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5 }}>
                ⚠️ A CNH precisa estar válida. Verificamos no Detran em até 24h.
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="pg-stack">
              <div className="pg-field">
                <label className="pg-label">Tipo de veículo</label>
                <select className="pg-input" value={data.bodyType} onChange={(e) => update("bodyType", e.target.value)}>
                  <option>Van pequena</option>
                  <option>Van média</option>
                  <option>Caminhão 3/4</option>
                  <option>Caminhão Toco</option>
                  <option>Guincho prancha</option>
                  <option>Guincho asa-delta</option>
                  <option>Caminhão caçamba</option>
                </select>
              </div>
              <div className="pg-row" style={{ gap: 10 }}>
                <div className="pg-field" style={{ flex: 2 }}>
                  <label className="pg-label">Placa</label>
                  <input className="pg-input" placeholder="ABC-1D23" value={data.plate} onChange={(e) => update("plate", e.target.value.toUpperCase())} style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase" }} />
                </div>
                <div className="pg-field" style={{ flex: 1 }}>
                  <label className="pg-label">Ano</label>
                  <input className="pg-input" placeholder="2020" value={data.year} onChange={(e) => update("year", e.target.value)} style={{ fontFamily: "var(--font-mono)" }} />
                </div>
              </div>
              <div className="pg-field">
                <label className="pg-label">Marca / modelo</label>
                <input className="pg-input" placeholder="Mercedes-Benz Sprinter" value={data.model} onChange={(e) => update("model", e.target.value)} />
              </div>
              <div className="pg-field">
                <label className="pg-label">Cor</label>
                <input className="pg-input" placeholder="Branca" value={data.color} onChange={(e) => update("color", e.target.value)} />
              </div>
              <div className="pg-field">
                <label className="pg-label">Capacidade de carga (kg)</label>
                <input type="range" min={200} max={5000} step={50} value={data.capacity} onChange={(e) => update("capacity", +e.target.value)} className="pg-range" />
                <div className="pg-row pg-row--between" style={{ marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>200kg</span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{data.capacity} kg</span>
                  <span style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>5000kg</span>
                </div>
              </div>
              {/* upload veículo */}
              <div>
                <label className="pg-label" style={{ marginBottom: 6 }}>Fotos do veículo (4)</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {["Frente", "Lateral", "Traseira", "Interior"].map(s => (
                    <button key={s} className="pg-card" style={{
                      height: 90, padding: 0, cursor: "pointer",
                      border: "1.5px dashed var(--border-strong)", background: "var(--bg-soft)",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                    }}>
                      <div style={{ fontSize: 24 }}>📸</div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{s}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="pg-stack">
              <div className="pg-field">
                <label className="pg-label">Banco</label>
                <select className="pg-input" value={data.bank} onChange={(e) => update("bank", e.target.value)}>
                  <option>Nubank</option><option>Itaú</option><option>Bradesco</option><option>Caixa</option>
                  <option>Santander</option><option>Banco do Brasil</option><option>Inter</option><option>C6 Bank</option>
                </select>
              </div>
              <div className="pg-row" style={{ gap: 10 }}>
                <div className="pg-field" style={{ flex: 1 }}>
                  <label className="pg-label">Agência</label>
                  <input className="pg-input" placeholder="0000" value={data.agency} onChange={(e) => update("agency", e.target.value)} style={{ fontFamily: "var(--font-mono)" }} />
                </div>
                <div className="pg-field" style={{ flex: 2 }}>
                  <label className="pg-label">Conta corrente</label>
                  <input className="pg-input" placeholder="00000-0" value={data.account} onChange={(e) => update("account", e.target.value)} style={{ fontFamily: "var(--font-mono)" }} />
                </div>
              </div>
              <div className="pg-divider"/>
              <div className="pg-field">
                <label className="pg-label">Ou use uma chave Pix (recomendado)</label>
                <input className="pg-input" placeholder="CPF, telefone, email ou aleatória" value={data.pixKey} onChange={(e) => update("pixKey", e.target.value)} />
                <div className="pg-helper">⚡ Saques via Pix são instantâneos, sem taxa</div>
              </div>
              <div className="pg-card pg-card--soft" style={{ padding: 14, fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5 }}>
                💳 A conta precisa estar no seu nome (CPF cadastrado). Caso contrário, a transferência será recusada.
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="pg-stack">
              {/* selfie */}
              <button onClick={() => update("selfie", !data.selfie)} className="pg-card pg-card--padded" style={{
                cursor: "pointer", textAlign: "left",
                border: data.selfie ? "1.5px solid var(--green-500)" : "1.5px dashed var(--border-strong)",
                background: data.selfie ? "var(--green-50)" : "var(--paper)",
              }}>
                <div className="pg-row" style={{ gap: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 28, background: data.selfie ? "var(--green-500)" : "var(--ink-100)", display: "grid", placeItems: "center", fontSize: 24 }}>
                    {data.selfie ? "✓" : "🤳"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Selfie de verificação</div>
                    <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>
                      {data.selfie ? "Foto enviada · revisão em 24h" : "Tire uma selfie segurando sua CNH"}
                    </div>
                  </div>
                </div>
              </button>

              {/* RG / doc */}
              <button onClick={() => update("doc", !data.doc)} className="pg-card pg-card--padded" style={{
                cursor: "pointer", textAlign: "left",
                border: data.doc ? "1.5px solid var(--green-500)" : "1.5px dashed var(--border-strong)",
                background: data.doc ? "var(--green-50)" : "var(--paper)",
              }}>
                <div className="pg-row" style={{ gap: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 28, background: data.doc ? "var(--green-500)" : "var(--ink-100)", display: "grid", placeItems: "center", fontSize: 24 }}>
                    {data.doc ? "✓" : "📄"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Comprovante de residência</div>
                    <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>
                      {data.doc ? "Documento enviado" : "Conta de luz, água ou telefone (≤90 dias)"}
                    </div>
                  </div>
                </div>
              </button>

              <div className="pg-divider"/>

              {/* terms */}
              <label className="pg-row" style={{ gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ marginTop: 4, width: 18, height: 18, accentColor: "var(--night-900)" }} />
                <span style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5 }}>
                  Concordo com os <a href="#" style={{ color: "var(--green-700)", fontWeight: 600 }}>Termos do Prestador</a> e a <a href="#" style={{ color: "var(--green-700)", fontWeight: 600 }}>Política de comissão</a> (15% por pedido + R$ 2 de taxa fixa).
                </span>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" onClick={next}>
          {step === total ? "Enviar para análise" : "Continuar"}
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 2. APROVAÇÃO PENDENTE
// ---------------------------------------------------------------------
const ProvPending = ({ go }) => {
  const items = [
    { t: "Dados pessoais", s: "CPF validado na Receita", done: true },
    { t: "CNH", s: "Em análise no Detran", done: false, current: true },
    { t: "Veículo", s: "Crédito de placa pendente", done: false },
    { t: "Selfie + comprovante", s: "Validação biométrica", done: false },
    { t: "Conta bancária", s: "Conta vinculada ao CPF", done: true },
  ];

  return (
    <div className="pg-screen" data-screen-label="P4-2 Aprovação pendente">
      <SBp4 />
      <TBp4 onBack={() => go("provider-landing")} title="" />
      <div className="pg-viewport">
        <div style={{ padding: 28, textAlign: "center" }}>
          {/* animated waiting */}
          <div className="pg-anim-in" style={{ position: "relative", width: 120, height: 120, margin: "20px auto 24px" }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "var(--green-50)", display: "grid", placeItems: "center", fontSize: 50,
            }}>⏳</div>
            <svg width="120" height="120" style={{ position: "absolute", inset: 0 }} viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="56" fill="none" stroke="var(--green-500)" strokeWidth="2" strokeDasharray="80 250">
                <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="3s" repeatCount="indefinite"/>
              </circle>
            </svg>
          </div>

          <div className="pg-h-eyebrow" style={{ margin: 0, color: "var(--green-700)" }}>ANÁLISE EM CURSO</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "8px 0 12px", letterSpacing: "-0.02em" }}>Estamos quase lá!</h1>
          <p style={{ color: "var(--text-soft)", fontSize: 14, lineHeight: 1.5, maxWidth: 320, margin: "0 auto" }}>
            Sua documentação está em revisão. <strong>Tempo médio: 18 horas.</strong> Avisaremos por email e push.
          </p>

          {/* SLA */}
          <div className="pg-card pg-card--padded" style={{ marginTop: 24, background: "var(--night-900)", color: "#fff", borderColor: "transparent", textAlign: "left" }}>
            <div className="pg-row pg-row--between">
              <div>
                <div className="pg-h-eyebrow" style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: 9 }}>TEMPO RESTANTE ESTIMADO</div>
                <div className="pg-mono" style={{ fontSize: 30, fontWeight: 700, color: "var(--green-500)", marginTop: 4 }}>17h 42min</div>
              </div>
              <div className="pg-mono" style={{ fontSize: 30 }}>⚡</div>
            </div>
          </div>

          {/* checklist */}
          <div style={{ marginTop: 24, textAlign: "left" }}>
            <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>STATUS DA VERIFICAÇÃO</div>
            <div className="pg-card" style={{ padding: 0 }}>
              {items.map((it, i) => (
                <div key={i} className="pg-row" style={{ padding: "14px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)", gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 14,
                    background: it.done ? "var(--green-500)" : it.current ? "transparent" : "var(--ink-100)",
                    border: it.current ? "2px solid var(--green-500)" : "none",
                    color: it.done ? "var(--night-900)" : "var(--text-mute)",
                    display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, flexShrink: 0,
                    position: "relative",
                  }}>
                    {it.done ? "✓" : it.current ? <span className="pg-anim-in" style={{ width: 10, height: 10, borderRadius: 5, background: "var(--green-500)" }}/> : i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{it.t}</div>
                    <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>{it.s}</div>
                  </div>
                  {it.current && <span className="pg-tag pg-tag--green" style={{ fontSize: 9 }}>EM ANÁLISE</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24, padding: 16, background: "var(--bg-soft)", borderRadius: 12, fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5, textAlign: "left" }}>
            💡 Enquanto isso, <button onClick={() => go("prov-public")} style={{ color: "var(--green-700)", fontWeight: 700, background: "none", border: "none", padding: 0, cursor: "pointer" }}>complete seu perfil público</button> para receber pedidos mais rápido depois.
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 3. DOCUMENTOS REJEITADOS
// ---------------------------------------------------------------------
const ProvRejected = ({ go }) => {
  const issues = [
    { t: "Foto da CNH borrada", s: "A imagem do verso está fora de foco. Tire em local bem iluminado, sem reflexos.", action: "Reenviar CNH" },
    { t: "Comprovante de residência expirado", s: "Aceitamos contas com até 90 dias. O documento enviado é de fevereiro.", action: "Reenviar comprovante" },
  ];

  return (
    <div className="pg-screen" data-screen-label="P4-3 Documentos rejeitados">
      <SBp4 />
      <TBp4 onBack={() => go("provider-landing")} title="Documentos rejeitados" />
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: 24 }}>
          <div className="pg-card pg-card--padded" style={{ background: "var(--orange-50)", borderColor: "var(--orange-500)", marginBottom: 20 }}>
            <div className="pg-row" style={{ gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 25, background: "var(--orange-500)", color: "#fff", display: "grid", placeItems: "center", fontSize: 24 }}>!</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Pendências encontradas</div>
                <div style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 2 }}>Corrija para continuar a análise</div>
              </div>
            </div>
          </div>

          <div className="pg-h-eyebrow" style={{ margin: "0 0 12px" }}>{issues.length} ITENS PARA CORRIGIR</div>
          <div className="pg-stack">
            {issues.map((iss, i) => (
              <div key={i} className="pg-card pg-card--padded">
                <div className="pg-row" style={{ gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 15, background: "var(--orange-500)",
                    color: "#fff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}>✕</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{iss.t}</div>
                    <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4, lineHeight: 1.5 }}>{iss.s}</div>
                    <button className="pg-btn pg-btn--primary pg-btn--sm" style={{ marginTop: 12 }}>📷 {iss.action}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pg-card pg-card--soft" style={{ padding: 14, marginTop: 20, fontSize: 12, color: "var(--text-soft)", lineHeight: 1.6 }}>
            💬 Precisa de ajuda? Fale com o time de onboarding pelo WhatsApp <strong>(11) 9 4002-8922</strong>.
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" onClick={() => go("prov-pending")}>Reenviar tudo</button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 4. PEDIDO RECEBIDO — aceitar/recusar
// ---------------------------------------------------------------------
const ProvOrderDetail = ({ go }) => {
  const [seconds, setSeconds] = useStateP4(89);
  useEffectP4(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return (
    <div className="pg-screen" data-screen-label="P4-4 Pedido recebido">
      <SBp4 />
      <TBp4 onBack={() => go("provider-dash")} title={`Pedido #PG-2701`} right={
        <span className="pg-tag pg-tag--orange" style={{ fontSize: 10 }}>NOVO</span>
      }/>
      <div className="pg-viewport" style={{ paddingBottom: 110 }}>
        {/* countdown */}
        <div style={{ background: seconds < 30 ? "var(--orange-500)" : "var(--night-900)", color: "#fff", padding: "16px 20px", textAlign: "center" }}>
          <div className="pg-mono" style={{ fontSize: 11, opacity: 0.6 }}>VOCÊ TEM</div>
          <div className="pg-mono" style={{ fontSize: 32, fontWeight: 800, marginTop: 2 }}>
            {Math.floor(seconds / 60).toString().padStart(2, "0")}:{(seconds % 60).toString().padStart(2, "0")}
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>para responder antes de cair pra outro prestador</div>
        </div>

        <div style={{ padding: 20 }}>
          {/* offer summary */}
          <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
            <div className="pg-row pg-row--between" style={{ marginBottom: 14 }}>
              <span className="pg-tag pg-tag--green" style={{ fontSize: 10 }}>FRETE · MUDANÇA RESIDENCIAL</span>
              <span className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)" }}>2.4 KM DE VOCÊ</span>
            </div>
            <div className="pg-row pg-row--between" style={{ alignItems: "baseline" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-soft)" }}>Cliente sugere</div>
                <div className="pg-mono" style={{ fontSize: 30, fontWeight: 700, marginTop: 2 }}>R$ 220 <span style={{ color: "var(--text-mute)", fontSize: 14, fontWeight: 500 }}>– 280</span></div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>VOCÊ RECEBE</div>
                <div className="pg-mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--green-700)" }}>~ R$ 185</div>
                <div style={{ fontSize: 10, color: "var(--text-mute)" }}>após comissão 15%</div>
              </div>
            </div>
          </div>

          {/* customer */}
          <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
            <div className="pg-row" style={{ gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: "var(--ink-200)", display: "grid", placeItems: "center", fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)" }}>JS</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Joana S.</div>
                <div className="pg-row" style={{ gap: 8, fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>
                  <span>★ 4,9</span><span>·</span><span>14 pedidos</span><span>·</span><span>responde rápido</span>
                </div>
              </div>
            </div>
          </div>

          {/* route */}
          <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9, marginBottom: 12 }}>TRAJETO · 18,4 KM · ~1H 50</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="pg-row" style={{ gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 12, height: 12, borderRadius: 6, background: "var(--green-500)", border: "2px solid var(--paper)", boxShadow: "0 0 0 1.5px var(--green-500)", marginTop: 4, flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>ORIGEM</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>Rua das Flores, 234, Apto 502</div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)" }}>Pinheiros · São Paulo · 3º andar c/ elevador</div>
                </div>
              </div>
              <div style={{ marginLeft: 5, width: 2, height: 16, background: "var(--border)", borderRadius: 1 }}/>
              <div className="pg-row" style={{ gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: "var(--night-900)", marginTop: 4, flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>DESTINO</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>Av. Brasil, 1820, Casa</div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)" }}>Jardim América · Santo André · térreo</div>
                </div>
              </div>
            </div>
          </div>

          {/* what to move */}
          <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9, marginBottom: 10 }}>O QUE VAI</div>
            <div className="pg-row" style={{ gap: 8, flexWrap: "wrap" }}>
              {["1× Geladeira", "1× Sofá 3 lug", "1× Cama queen", "2× Guarda-roupas", "8× Caixas"].map(it => (
                <span key={it} style={{ padding: "6px 10px", background: "var(--bg-soft)", borderRadius: 8, fontSize: 12, fontWeight: 500 }}>{it}</span>
              ))}
            </div>
            <div className="pg-divider" style={{ margin: "12px 0" }}/>
            <div className="pg-row pg-row--between" style={{ fontSize: 12 }}>
              <span style={{ color: "var(--text-soft)" }}>Volume estimado</span>
              <span className="pg-mono" style={{ fontWeight: 700 }}>~12 m³ · 480 kg</span>
            </div>
          </div>

          {/* schedule */}
          <div className="pg-card pg-card--soft" style={{ padding: 14, fontSize: 13, marginBottom: 16 }}>
            <div className="pg-row pg-row--between">
              <span style={{ color: "var(--text-soft)" }}>📅 Agendado para</span>
              <span style={{ fontWeight: 700 }}>Hoje · 14:00</span>
            </div>
          </div>

          {/* notes */}
          <div className="pg-card pg-card--padded">
            <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9, marginBottom: 8 }}>OBSERVAÇÕES DA CLIENTE</div>
            <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6, fontStyle: "italic" }}>
              "Olha, é só o segundo andar mas o elevador é pequeno. Já desmontei o guarda-roupa. Tem um portão eletrônico, te aviso pra abrir."
            </div>
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 12, background: "var(--paper)", display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="pg-row" style={{ gap: 8 }}>
          <button className="pg-btn pg-btn--ghost pg-btn--lg" style={{ flex: 1 }} onClick={() => go("provider-dash")}>Recusar</button>
          <button className="pg-btn pg-btn--ghost pg-btn--lg" style={{ flex: 1 }} onClick={() => go("prov-quote")}>Negociar valor</button>
        </div>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" onClick={() => go("prov-nav")}>
          Aceitar por R$ 220
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 5. ENVIAR COTAÇÃO
// ---------------------------------------------------------------------
const ProvQuote = ({ go }) => {
  const [price, setPrice] = useStateP4(240);
  const [eta, setEta] = useStateP4(45);
  const [extras, setExtras] = useStateP4({ icamento: false, helper: true, mounting: false, packing: false });
  const [notes, setNotes] = useStateP4("Posso fazer hoje mesmo, levo carrinho hidráulico e cintas.");
  const commission = Math.round(price * 0.15);
  const youGet = price - commission - 2;

  return (
    <div className="pg-screen" data-screen-label="P4-5 Enviar cotação">
      <SBp4 />
      <TBp4 onBack={() => go("prov-order")} title="Sua proposta" />
      <div className="pg-viewport" style={{ paddingBottom: 110 }}>
        <div style={{ padding: 20 }}>
          {/* price input */}
          <div style={{ background: "var(--night-900)", color: "#fff", borderRadius: 16, padding: 24, textAlign: "center", marginBottom: 16 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, color: "rgba(255,255,255,0.5)" }}>SEU PREÇO PARA O CLIENTE</div>
            <div className="pg-row" style={{ justifyContent: "center", alignItems: "baseline", gap: 8, marginTop: 8 }}>
              <span className="pg-mono" style={{ fontSize: 20, opacity: 0.6 }}>R$</span>
              <input type="number" value={price} onChange={(e) => setPrice(+e.target.value)}
                style={{ width: 160, fontSize: 56, fontWeight: 800, fontFamily: "var(--font-mono)", border: "none", background: "transparent", color: "#fff", textAlign: "center", outline: "none", letterSpacing: "-0.02em" }}/>
            </div>
            <div className="pg-row pg-row--between" style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-mono)" }}>
              <span>CLIENTE SUGERIU R$ 220–280</span>
              <span style={{ color: price > 280 ? "var(--orange-500)" : price < 220 ? "var(--green-500)" : "rgba(255,255,255,0.6)" }}>
                {price > 280 ? "ACIMA DO RANGE" : price < 220 ? "ABAIXO" : "DENTRO DO RANGE ✓"}
              </span>
            </div>
          </div>

          {/* breakdown */}
          <div className="pg-card pg-card--padded" style={{ marginBottom: 20 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9, marginBottom: 10 }}>VOCÊ RECEBE LÍQUIDO</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              <div className="pg-row pg-row--between"><span style={{ color: "var(--text-soft)" }}>Valor do serviço</span><span className="pg-mono">R$ {price}</span></div>
              <div className="pg-row pg-row--between"><span style={{ color: "var(--text-soft)" }}>Comissão PAGORA (15%)</span><span className="pg-mono" style={{ color: "var(--orange-600)" }}>− R$ {commission}</span></div>
              <div className="pg-row pg-row--between"><span style={{ color: "var(--text-soft)" }}>Taxa fixa</span><span className="pg-mono" style={{ color: "var(--orange-600)" }}>− R$ 2</span></div>
              <div className="pg-divider" style={{ margin: "6px 0" }}/>
              <div className="pg-row pg-row--between" style={{ fontSize: 16 }}>
                <span style={{ fontWeight: 700 }}>Líquido pra você</span>
                <span className="pg-mono" style={{ fontWeight: 800, color: "var(--green-700)" }}>R$ {youGet}</span>
              </div>
            </div>
          </div>

          {/* eta */}
          <div className="pg-h-eyebrow" style={{ margin: "0 0 8px" }}>QUANDO POSSO COMEÇAR</div>
          <div className="pg-row" style={{ gap: 8, marginBottom: 20 }}>
            {[15, 30, 45, 60, 90].map(m => (
              <button key={m} onClick={() => setEta(m)}
                style={{
                  flex: 1, height: 52, borderRadius: 10,
                  border: `1.5px solid ${eta === m ? "var(--night-900)" : "var(--border)"}`,
                  background: eta === m ? "var(--night-900)" : "var(--paper)",
                  color: eta === m ? "#fff" : "var(--text)",
                  fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 12,
                }}>
                <div>{m}min</div>
              </button>
            ))}
          </div>

          {/* extras included */}
          <div className="pg-h-eyebrow" style={{ margin: "0 0 8px" }}>O QUE ESTÁ INCLUSO</div>
          <div className="pg-stack pg-stack--sm" style={{ marginBottom: 20 }}>
            {[
              ["icamento", "Içamento por janela", "+R$ 80"],
              ["helper", "Ajudante para carga/descarga", "incluso"],
              ["mounting", "Montagem de móveis no destino", "+R$ 60"],
              ["packing", "Embalagens (manta, plástico)", "+R$ 25"],
            ].map(([k, t, p]) => (
              <label key={k} className="pg-row" style={{ padding: "10px 14px", background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", gap: 12 }}>
                <input type="checkbox" checked={extras[k]} onChange={(e) => setExtras({ ...extras, [k]: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--night-900)" }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t}</span>
                <span className="pg-mono" style={{ fontSize: 11, color: p === "incluso" ? "var(--green-700)" : "var(--text-mute)" }}>{p}</span>
              </label>
            ))}
          </div>

          {/* notes */}
          <div className="pg-field">
            <label className="pg-label">Mensagem para a cliente</label>
            <textarea className="pg-textarea" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="pg-helper">Aumenta sua chance em até 40%. Seja conciso e profissional.</div>
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" onClick={() => go("provider-dash")}>
          Enviar proposta de R$ {price}
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 6. MODO NAVEGAÇÃO — a caminho/cheguei/iniciei/concluí
// ---------------------------------------------------------------------
const ProvNav = ({ go }) => {
  const [stage, setStage] = useStateP4(0); // 0 a caminho · 1 cheguei · 2 carregando · 3 transportando · 4 entregando
  const stages = [
    { t: "A caminho da origem", s: "12 min até o local", action: "Cheguei na origem", actionColor: "var(--green-500)" },
    { t: "No local de origem", s: "Confirme com a cliente e inicie a carga", action: "Iniciar carregamento", actionColor: "var(--green-500)" },
    { t: "Carregando", s: "Tire fotos do checklist", action: "Carga concluída · sair", actionColor: "var(--green-500)" },
    { t: "A caminho do destino", s: "23 min restantes", action: "Cheguei no destino", actionColor: "var(--green-500)" },
    { t: "Descarregando", s: "Finalize com fotos e assinatura", action: "Concluir serviço", actionColor: "var(--green-500)" },
  ];
  const cur = stages[stage];

  return (
    <div className="pg-screen" data-screen-label={`P4-6.${stage} Modo navegação`} style={{ background: "#0d1419" }}>
      <SBp4 dark/>

      {/* big map */}
      <div style={{ position: "relative", flex: 1, background: "#1a2530", overflow: "hidden", minHeight: 0 }}>
        <svg width="100%" height="100%" viewBox="0 0 390 500" preserveAspectRatio="xMidYMid slice" style={{ display: "block" }}>
          <defs>
            <pattern id="pgnight" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="390" height="500" fill="#1a2530"/>
          <rect width="390" height="500" fill="url(#pgnight)"/>
          {/* roads */}
          <path d="M0 180 L390 180" stroke="rgba(255,255,255,0.1)" strokeWidth="20"/>
          <path d="M0 320 L390 320" stroke="rgba(255,255,255,0.1)" strokeWidth="14"/>
          <path d="M120 0 L120 500" stroke="rgba(255,255,255,0.1)" strokeWidth="16"/>
          <path d="M270 0 L270 500" stroke="rgba(255,255,255,0.1)" strokeWidth="12"/>
          {/* route */}
          <path id="pg-nav-path" d="M 50 420 L 50 320 L 120 320 L 120 180 L 270 180 L 270 80" stroke="#22E3A3" strokeWidth="6" fill="none" strokeLinecap="round"/>

          <g transform="translate(50 420)">
            <circle r="12" fill="#22E3A3"/>
          </g>
          <g transform="translate(270 80)">
            <circle r="12" fill="#fff"/>
            <circle r="5" fill="#070E1A"/>
          </g>

          {/* truck icon, animated */}
          <g>
            <circle r="26" fill="#22E3A3"/>
            <circle r="26" fill="#22E3A3" opacity="0.3">
              <animate attributeName="r" from="26" to="46" dur="1.6s" repeatCount="indefinite"/>
              <animate attributeName="opacity" from="0.5" to="0" dur="1.6s" repeatCount="indefinite"/>
            </circle>
            <text textAnchor="middle" y="6" fontSize="22" fill="#070E1A">🚚</text>
            <animateMotion dur="20s" repeatCount="indefinite">
              <mpath xlinkHref="#pg-nav-path"/>
            </animateMotion>
          </g>
        </svg>

        {/* top bar floating */}
        <div style={{ position: "absolute", top: 12, left: 16, right: 16, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button onClick={() => go("provider-dash")} className="pg-iconbtn" style={{ background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>←</button>
          <div style={{ background: "rgba(0,0,0,0.85)", color: "#fff", padding: "10px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)" }}>
            ⚡ {stage < 1 ? "12 MIN" : stage === 3 ? "23 MIN" : "NO LOCAL"}
          </div>
          <button className="pg-iconbtn" style={{ background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>📞</button>
        </div>

        {/* turn instruction (when traveling) */}
        {(stage === 0 || stage === 3) && (
          <div className="pg-anim-in" style={{
            position: "absolute", top: 70, left: "50%", transform: "translateX(-50%)",
            background: "var(--night-900)", color: "#fff", padding: "12px 18px", borderRadius: 14, display: "flex", alignItems: "center", gap: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}>
            <div style={{ fontSize: 28 }}>↰</div>
            <div>
              <div className="pg-mono" style={{ fontSize: 18, fontWeight: 700 }}>800m</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>vire à esquerda em Av. Paulista</div>
            </div>
          </div>
        )}
      </div>

      {/* sheet */}
      <div style={{ background: "var(--paper)", borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -20, position: "relative", zIndex: 5, paddingTop: 8, flexShrink: 0 }}>
        <div style={{ width: 40, height: 4, background: "var(--ink-300)", borderRadius: 2, margin: "0 auto 12px" }} />
        <div style={{ padding: "0 20px 16px" }}>
          <div className="pg-h-eyebrow" style={{ margin: 0, color: "var(--green-700)" }}>{`ETAPA ${stage + 1}/5 · #PG-2701`}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, letterSpacing: "-0.015em" }}>{cur.t}</div>
          <div style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 2 }}>{cur.s}</div>

          {/* customer mini-card */}
          <div className="pg-row" style={{ marginTop: 14, padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 10, gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: "var(--ink-200)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)" }}>JS</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Joana Silva</div>
              <div style={{ fontSize: 11, color: "var(--text-mute)" }}>Rua das Flores, 234, Apto 502</div>
            </div>
            <button className="pg-iconbtn" style={{ background: "var(--green-500)", color: "var(--night-900)" }}>💬</button>
            <button className="pg-iconbtn" style={{ background: "var(--green-500)", color: "var(--night-900)" }}>📞</button>
          </div>

          <div className="pg-row" style={{ gap: 8, marginTop: 14 }}>
            <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ flex: 1 }} onClick={() => go("prov-extras")}>+ Cobrar extra</button>
            <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ flex: 1 }} onClick={() => go("prov-checklist")}>📋 Checklist</button>
          </div>

          <button className="pg-btn pg-btn--accent pg-btn--lg pg-btn--block" style={{ marginTop: 12 }}
            onClick={() => stage < 4 ? setStage(stage + 1) : go("prov-complete")}>
            {cur.action} →
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 7. CHECKLIST PRÉ/PÓS — fotos
// ---------------------------------------------------------------------
const ProvChecklist = ({ go }) => {
  const [phase, setPhase] = useStateP4("pre"); // pre or post
  const [done, setDone] = useStateP4({});
  const items = phase === "pre" ? [
    { id: "p1", t: "Foto da fachada da origem", s: "Comprove que chegou no local certo" },
    { id: "p2", t: "Foto da carga antes do transporte", s: "Documente o estado dos itens" },
    { id: "p3", t: "Foto da geladeira (item especial)", s: "Detalhe ítens frágeis ou de alto valor" },
    { id: "p4", t: "Verificação de protocolos de segurança", s: "Cintas, mantas e calços" },
  ] : [
    { id: "po1", t: "Foto dos itens descarregados", s: "Estado de chegada" },
    { id: "po2", t: "Foto da fachada do destino", s: "Confirmar entrega" },
    { id: "po3", t: "Assinatura da cliente", s: "Confirmação digital de recebimento" },
  ];
  const total = items.length;
  const completed = items.filter(it => done[it.id]).length;

  return (
    <div className="pg-screen" data-screen-label="P4-7 Checklist">
      <SBp4 />
      <TBp4 onBack={() => go("prov-nav")} title="Checklist do serviço" />

      <div style={{ padding: "12px 20px 0", borderBottom: "1px solid var(--border)", background: "var(--paper)" }}>
        <div className="pg-segmented">
          <button className={`pg-segmented-item${phase === "pre" ? " is-active" : ""}`} onClick={() => setPhase("pre")}>Pré-serviço</button>
          <button className={`pg-segmented-item${phase === "post" ? " is-active" : ""}`} onClick={() => setPhase("post")}>Pós-serviço</button>
        </div>
        <div className="pg-row pg-row--between" style={{ padding: "14px 0 12px" }}>
          <span className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)" }}>PROGRESSO</span>
          <span className="pg-mono" style={{ fontSize: 11, fontWeight: 700 }}>{completed}/{total}</span>
        </div>
        <div style={{ height: 6, background: "var(--ink-100)", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ width: `${(completed / total) * 100}%`, height: "100%", background: "var(--green-500)", transition: "width 300ms" }}/>
        </div>
      </div>

      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: 20 }}>
          <div className="pg-stack pg-stack--sm">
            {items.map(it => (
              <button key={it.id} onClick={() => setDone(d => ({ ...d, [it.id]: !d[it.id] }))}
                className="pg-card pg-card--padded" style={{ textAlign: "left", cursor: "pointer", border: done[it.id] ? "1.5px solid var(--green-500)" : "1px solid var(--border)", background: done[it.id] ? "var(--green-50)" : "var(--paper)" }}>
                <div className="pg-row" style={{ gap: 12, alignItems: "center" }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: 10,
                    background: done[it.id] ? "var(--green-500)" : "var(--bg-soft)",
                    display: "grid", placeItems: "center", flexShrink: 0,
                    color: done[it.id] ? "var(--night-900)" : "var(--text-mute)",
                    fontSize: 24,
                  }}>{done[it.id] ? "✓" : "📷"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{it.t}</div>
                    <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>{it.s}</div>
                    {done[it.id] && <div style={{ fontSize: 11, color: "var(--green-700)", fontFamily: "var(--font-mono)", marginTop: 4, fontWeight: 700 }}>✓ FOTO ENVIADA</div>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="pg-card pg-card--soft" style={{ padding: 14, marginTop: 20, fontSize: 12, color: "var(--text-soft)", lineHeight: 1.6 }}>
            🔒 As fotos protegem você em caso de disputa. São compartilhadas apenas com a cliente e suporte.
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" disabled={completed < total} onClick={() => go("prov-nav")}>
          {completed < total ? `Faltam ${total - completed} fotos` : "Confirmar e voltar"}
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 8. CUSTOS EXTRAS DURANTE SERVIÇO
// ---------------------------------------------------------------------
const ProvExtras = ({ go }) => {
  const [items, setItems] = useStateP4([
    { id: 1, t: "Içamento por janela (3º andar)", v: 80 },
  ]);
  const [showAdd, setShowAdd] = useStateP4(false);
  const [newT, setNewT] = useStateP4("");
  const [newV, setNewV] = useStateP4("");

  const presets = [
    "Içamento (R$ 80)", "Ajudante extra (R$ 50)", "Espera +30min (R$ 30)",
    "Pedágio (R$ 18)", "Embalagem extra (R$ 25)", "Estacionamento (R$ 15)",
  ];

  const total = items.reduce((s, i) => s + i.v, 0);

  return (
    <div className="pg-screen" data-screen-label="P4-8 Custos extras">
      <SBp4 />
      <TBp4 onBack={() => go("prov-nav")} title="Cobrar extras" />
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: 20 }}>
          {/* warning */}
          <div className="pg-card pg-card--padded" style={{ background: "var(--orange-50)", borderColor: "var(--orange-500)", marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--orange-600)" }}>⚠️ Cliente precisa aprovar</div>
            <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4, lineHeight: 1.5 }}>
              Cobranças não combinadas previamente <strong>precisam de aprovação no app</strong> antes de serem cobradas. Caso contrário, abre disputa.
            </div>
          </div>

          {/* current items */}
          {items.length > 0 && (
            <>
              <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>EXTRAS ADICIONADOS</div>
              <div className="pg-card" style={{ padding: 0, marginBottom: 16 }}>
                {items.map((it, i) => (
                  <div key={it.id} className="pg-row pg-row--between" style={{ padding: "12px 14px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{it.t}</div>
                      <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>Aguardando aprovação</div>
                    </div>
                    <span className="pg-mono" style={{ fontSize: 14, fontWeight: 700 }}>+ R$ {it.v}</span>
                    <button onClick={() => setItems(items.filter(x => x.id !== it.id))} style={{ marginLeft: 10, background: "none", border: "none", color: "var(--text-mute)", cursor: "pointer", fontSize: 18 }}>×</button>
                  </div>
                ))}
                <div className="pg-row pg-row--between" style={{ padding: "14px 14px", borderTop: "1px solid var(--border)", background: "var(--bg-soft)" }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Total extra</span>
                  <span className="pg-mono" style={{ fontSize: 18, fontWeight: 800, color: "var(--green-700)" }}>R$ {total}</span>
                </div>
              </div>
            </>
          )}

          {/* add new */}
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)} className="pg-btn pg-btn--ghost pg-btn--block" style={{ border: "1.5px dashed var(--border-strong)", height: 56 }}>
              + Adicionar custo extra
            </button>
          ) : (
            <div className="pg-card pg-card--padded">
              <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 12 }}>NOVO CUSTO EXTRA</div>
              <div className="pg-stack pg-stack--sm">
                {/* presets */}
                <div className="pg-row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {presets.map(p => (
                    <button key={p} onClick={() => {
                      const m = p.match(/^(.+?) \(R\$ (\d+)\)$/);
                      if (m) { setNewT(m[1]); setNewV(m[2]); }
                    }} style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 100, background: "var(--paper)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                      {p}
                    </button>
                  ))}
                </div>
                <div className="pg-field">
                  <label className="pg-label">Descrição</label>
                  <input className="pg-input" placeholder="Ex: Içamento por janela" value={newT} onChange={(e) => setNewT(e.target.value)} />
                </div>
                <div className="pg-field">
                  <label className="pg-label">Valor (R$)</label>
                  <input className="pg-input" placeholder="0" value={newV} onChange={(e) => setNewV(e.target.value)} type="number" style={{ fontFamily: "var(--font-mono)" }}/>
                </div>
                <div className="pg-row" style={{ gap: 8, marginTop: 6 }}>
                  <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ flex: 1 }} onClick={() => { setShowAdd(false); setNewT(""); setNewV(""); }}>Cancelar</button>
                  <button className="pg-btn pg-btn--primary pg-btn--sm" style={{ flex: 1 }}
                    disabled={!newT || !newV}
                    onClick={() => {
                      setItems([...items, { id: Date.now(), t: newT, v: +newV }]);
                      setShowAdd(false); setNewT(""); setNewV("");
                    }}>Adicionar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" disabled={items.length === 0} onClick={() => go("prov-nav")}>
          Enviar para aprovação ({items.length})
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 9. CONFIRMAR CONCLUSÃO — assinatura
// ---------------------------------------------------------------------
const ProvComplete = ({ go }) => {
  const [signed, setSigned] = useStateP4(false);
  const [photo, setPhoto] = useStateP4(false);
  const [code, setCode] = useStateP4("");

  return (
    <div className="pg-screen" data-screen-label="P4-9 Confirmar conclusão">
      <SBp4 />
      <TBp4 onBack={() => go("prov-nav")} title="Finalizar serviço" />
      <div className="pg-viewport" style={{ paddingBottom: 110 }}>
        <div style={{ padding: 20 }}>
          {/* summary */}
          <div className="pg-card pg-card--padded" style={{ background: "var(--night-900)", color: "#fff", borderColor: "transparent", marginBottom: 20 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, color: "rgba(255,255,255,0.5)" }}>VOCÊ VAI RECEBER</div>
            <div className="pg-mono" style={{ fontSize: 36, fontWeight: 800, color: "var(--green-500)", marginTop: 6 }}>R$ 251,30</div>
            <div className="pg-divider" style={{ margin: "12px 0", borderColor: "rgba(255,255,255,0.1)" }}/>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
              <div className="pg-row pg-row--between" style={{ marginBottom: 4 }}><span>Serviço</span><span className="pg-mono">R$ 220</span></div>
              <div className="pg-row pg-row--between" style={{ marginBottom: 4 }}><span>Içamento aprovado</span><span className="pg-mono">+ R$ 80</span></div>
              <div className="pg-row pg-row--between" style={{ marginBottom: 4 }}><span>Comissão (15%)</span><span className="pg-mono" style={{ color: "var(--orange-500)" }}>− R$ 45</span></div>
              <div className="pg-row pg-row--between"><span>Taxa fixa</span><span className="pg-mono" style={{ color: "var(--orange-500)" }}>− R$ 2</span></div>
            </div>
            <div style={{ fontSize: 11, color: "var(--green-500)", marginTop: 12, fontFamily: "var(--font-mono)" }}>⚡ DEPÓSITO EM ATÉ 30 MIN VIA PIX</div>
          </div>

          {/* required steps */}
          <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>FALTA APENAS</div>
          <div className="pg-stack pg-stack--sm" style={{ marginBottom: 20 }}>
            {/* photo */}
            <button onClick={() => setPhoto(!photo)} className="pg-card pg-card--padded" style={{
              cursor: "pointer", textAlign: "left",
              border: photo ? "1.5px solid var(--green-500)" : "1.5px dashed var(--border-strong)",
              background: photo ? "var(--green-50)" : "var(--paper)",
            }}>
              <div className="pg-row" style={{ gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: photo ? "var(--green-500)" : "var(--ink-100)", color: photo ? "var(--night-900)" : "var(--text-mute)", display: "grid", placeItems: "center", fontSize: 18 }}>
                  {photo ? "✓" : "📷"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Foto final dos itens entregues</div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>{photo ? "Foto enviada" : "Toque para tirar"}</div>
                </div>
              </div>
            </button>

            {/* signature */}
            <div className="pg-card pg-card--padded" style={{
              border: signed ? "1.5px solid var(--green-500)" : "1px solid var(--border)",
              background: signed ? "var(--green-50)" : "var(--paper)",
            }}>
              <div className="pg-row pg-row--between" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Assinatura da cliente</span>
                {signed && <span className="pg-tag pg-tag--green" style={{ fontSize: 9 }}>✓ ASSINADO</span>}
              </div>
              <div onClick={() => setSigned(true)} style={{
                height: 110, background: "var(--paper)", border: "1px dashed var(--border)", borderRadius: 8,
                display: "grid", placeItems: "center", cursor: "pointer",
                position: "relative", overflow: "hidden",
              }}>
                {signed ? (
                  <svg width="200" height="60" viewBox="0 0 200 60">
                    <path d="M 10 40 Q 30 20 50 30 T 90 35 Q 110 15 130 25 T 170 30 L 190 38" stroke="var(--night-900)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-mute)" }}>
                    <div style={{ fontSize: 24 }}>✍️</div>
                    <div style={{ fontSize: 11, marginTop: 4, fontFamily: "var(--font-mono)" }}>TOQUE PARA SIMULAR</div>
                  </div>
                )}
              </div>
              {signed && <div className="pg-mono" style={{ fontSize: 10, color: "var(--text-mute)", marginTop: 6 }}>JOANA SILVA · {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>}
            </div>

            {/* delivery code */}
            <div className="pg-card pg-card--padded">
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Código de confirmação</div>
              <div style={{ fontSize: 12, color: "var(--text-soft)", marginBottom: 10 }}>Peça à cliente o código de 4 dígitos exibido no app dela</div>
              <div className="pg-row" style={{ gap: 8 }}>
                {[0, 1, 2, 3].map(i => (
                  <input key={i} maxLength={1} value={code[i] || ""}
                    onChange={(e) => {
                      const newCode = code.split("");
                      newCode[i] = e.target.value;
                      setCode(newCode.join(""));
                    }}
                    style={{
                      flex: 1, height: 60, fontSize: 28, fontWeight: 700, fontFamily: "var(--font-mono)",
                      textAlign: "center", border: "1.5px solid var(--border)", borderRadius: 12, background: "var(--paper)",
                      outline: "none",
                    }}/>
                ))}
              </div>
              <button style={{ marginTop: 10, background: "none", border: "none", color: "var(--green-700)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Cliente esqueceu? Usar foto da CNH
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--accent pg-btn--lg pg-btn--block"
          disabled={!signed || !photo || code.length < 4}
          onClick={() => go("provider-dash")}>
          Confirmar conclusão e receber
        </button>
      </div>
    </div>
  );
};

window.PagoraPhase4 = {
  ProvSignup, ProvPending, ProvRejected, ProvOrderDetail,
  ProvQuote, ProvNav, ProvChecklist, ProvExtras, ProvComplete,
};
