/* @jsxRuntime classic */
// =====================================================================
// FASE 5 PRESTADOR — Financeiro, performance, perfil
// =====================================================================
const { useState: useStateP5, useMemo: useMemoP5 } = React;
const SBp5 = window.StatusBar;
const TBp5 = window.TopBar;

// ---------------------------------------------------------------------
// 1. DETALHE GANHOS POR PEDIDO
// ---------------------------------------------------------------------
const ProvEarning = ({ go }) => (
  <div className="pg-screen" data-screen-label="P5-1 Detalhe ganhos">
    <SBp5 />
    <TBp5 onBack={() => go("provider-dash")} title="Pedido #PG-2701" />
    <div className="pg-viewport" style={{ paddingBottom: 100 }}>
      <div style={{ padding: 20 }}>
        <div className="pg-card pg-card--padded" style={{ background: "var(--night-900)", color: "#fff", borderColor: "transparent", marginBottom: 20 }}>
          <div className="pg-h-eyebrow" style={{ margin: 0, color: "rgba(255,255,255,0.5)" }}>VOCÊ RECEBEU</div>
          <div className="pg-mono" style={{ fontSize: 40, fontWeight: 800, color: "var(--green-500)", marginTop: 6 }}>R$ 251,30</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 6 }}>Crédito instantâneo via Pix em 02 abr · 16:14</div>
        </div>

        <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>BREAKDOWN COMPLETO</div>
        <div className="pg-card" style={{ padding: 0, marginBottom: 20 }}>
          {[
            ["Serviço base (frete)", 220, false],
            ["Içamento aprovado", 80, false, true],
            ["Gorjeta da cliente", 24, false, true],
            ["Subtotal", 324, "subtotal"],
            ["Comissão PAGORA (15%)", -45, true],
            ["Taxa fixa", -2, true],
            ["IRRF retido na fonte", -25.70, true],
            ["Líquido recebido", 251.30, "total"],
          ].map(([t, v, kind, bonus], i) => (
            <div key={i} className="pg-row pg-row--between" style={{
              padding: "12px 14px",
              borderTop: i === 0 ? "none" : "1px solid var(--border)",
              background: kind === "total" ? "var(--green-50)" : kind === "subtotal" ? "var(--bg-soft)" : "transparent",
            }}>
              <span style={{ fontSize: 13, fontWeight: kind === "total" ? 700 : 500 }}>
                {bonus && <span style={{ color: "var(--green-700)", marginRight: 6 }}>+</span>}{t}
              </span>
              <span className="pg-mono" style={{ fontSize: kind === "total" ? 16 : 13, fontWeight: 700, color: kind === "total" ? "var(--green-700)" : kind === true ? "var(--orange-600)" : "var(--text)" }}>
                {v < 0 ? "−" : ""} R$ {Math.abs(v).toFixed(2).replace(".", ",")}
              </span>
            </div>
          ))}
        </div>

        <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>CLIENTE & SERVIÇO</div>
        <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
          <div className="pg-row pg-row--between" style={{ marginBottom: 8 }}>
            <span style={{ color: "var(--text-soft)", fontSize: 13 }}>Cliente</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Joana Silva</span>
          </div>
          <div className="pg-row pg-row--between" style={{ marginBottom: 8 }}>
            <span style={{ color: "var(--text-soft)", fontSize: 13 }}>Avaliação recebida</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#B8930F" }}>★ 5,0</span>
          </div>
          <div className="pg-row pg-row--between" style={{ marginBottom: 8 }}>
            <span style={{ color: "var(--text-soft)", fontSize: 13 }}>Duração</span>
            <span className="pg-mono" style={{ fontSize: 13, fontWeight: 600 }}>1h 47min</span>
          </div>
          <div className="pg-row pg-row--between">
            <span style={{ color: "var(--text-soft)", fontSize: 13 }}>Distância total</span>
            <span className="pg-mono" style={{ fontSize: 13, fontWeight: 600 }}>18,4 km</span>
          </div>
        </div>

        <div className="pg-row" style={{ gap: 8 }}>
          <button className="pg-btn pg-btn--ghost pg-btn--block" style={{ flex: 1 }} onClick={() => go("prov-invoice")}>📄 Nota fiscal</button>
          <button className="pg-btn pg-btn--ghost pg-btn--block" style={{ flex: 1 }}>⬇ Comprovante</button>
        </div>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------
// 2. SAQUE / PIX INSTANTÂNEO
// ---------------------------------------------------------------------
const ProvWithdraw = ({ go }) => {
  const [amount, setAmount] = useStateP5(580);
  const balance = 1247.80;
  const fee = amount > 500 ? 0 : 2;
  const net = amount - fee;

  return (
    <div className="pg-screen" data-screen-label="P5-2 Saque Pix">
      <SBp5 />
      <TBp5 onBack={() => go("provider-dash")} title="Sacar agora" />
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: 20 }}>
          <div className="pg-card pg-card--padded" style={{ background: "var(--night-900)", color: "#fff", borderColor: "transparent", marginBottom: 20 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, color: "rgba(255,255,255,0.5)" }}>SALDO DISPONÍVEL</div>
            <div className="pg-mono" style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>R$ {balance.toFixed(2).replace(".", ",")}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>+ R$ 340 a liberar nos próximos 7 dias</div>
          </div>

          <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>QUANTO QUER SACAR</div>
          <div style={{ background: "var(--bg-soft)", borderRadius: 14, padding: 24, textAlign: "center", marginBottom: 16 }}>
            <div className="pg-row" style={{ justifyContent: "center", alignItems: "baseline", gap: 6 }}>
              <span className="pg-mono" style={{ fontSize: 22 }}>R$</span>
              <input type="number" value={amount} onChange={(e) => setAmount(Math.min(balance, +e.target.value))} max={balance}
                style={{ width: 200, fontSize: 56, fontWeight: 800, fontFamily: "var(--font-mono)", border: "none", background: "transparent", textAlign: "center", outline: "none" }}/>
            </div>
            <input type="range" min={50} max={balance} step={10} value={amount} onChange={(e) => setAmount(+e.target.value)} className="pg-range" style={{ marginTop: 16 }}/>
          </div>

          <div className="pg-row" style={{ gap: 6, marginBottom: 20 }}>
            {[100, 250, 500, balance].map((v, i) => (
              <button key={i} onClick={() => setAmount(v)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid var(--border)", background: amount === v ? "var(--night-900)" : "var(--paper)", color: amount === v ? "#fff" : "var(--text)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                {i === 3 ? "TUDO" : `R$ ${v}`}
              </button>
            ))}
          </div>

          <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9, marginBottom: 10 }}>PARA</div>
            <div className="pg-row pg-row--between">
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Pix · Nubank</div>
                <div className="pg-mono" style={{ fontSize: 12, color: "var(--text-mute)" }}>chave: ***@email.com</div>
              </div>
              <button style={{ background: "none", border: "none", color: "var(--green-700)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Trocar</button>
            </div>
          </div>

          <div className="pg-card pg-card--soft" style={{ padding: 14, marginBottom: 16, fontSize: 13 }}>
            <div className="pg-row pg-row--between" style={{ marginBottom: 4 }}>
              <span style={{ color: "var(--text-soft)" }}>Valor solicitado</span>
              <span className="pg-mono">R$ {amount.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="pg-row pg-row--between" style={{ marginBottom: 4 }}>
              <span style={{ color: "var(--text-soft)" }}>Taxa Pix {fee === 0 && <span style={{ color: "var(--green-700)" }}>(grátis acima R$ 500)</span>}</span>
              <span className="pg-mono">{fee === 0 ? "GRÁTIS" : `− R$ ${fee},00`}</span>
            </div>
            <div className="pg-divider" style={{ margin: "8px 0" }}/>
            <div className="pg-row pg-row--between" style={{ fontSize: 15 }}>
              <span style={{ fontWeight: 700 }}>Você recebe</span>
              <span className="pg-mono" style={{ fontWeight: 800, color: "var(--green-700)" }}>R$ {net.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>

          <div style={{ padding: 12, background: "var(--green-50)", borderRadius: 10, fontSize: 12, color: "var(--green-700)", fontWeight: 600, textAlign: "center" }}>
            ⚡ Cai na sua conta em até 30 segundos
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--accent pg-btn--lg pg-btn--block" onClick={() => go("provider-dash")}>
          Sacar R$ {net.toFixed(2).replace(".", ",")} agora
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 3. EXTRATO COM FILTROS
// ---------------------------------------------------------------------
const ProvStatement = ({ go }) => {
  const [period, setPeriod] = useStateP5("month");
  const [type, setType] = useStateP5("all");

  const tx = [
    { d: "Hoje", items: [
      { t: "Pedido #PG-2701 · J. Silva", v: 251.30, k: "income", time: "16:14" },
      { t: "Saque via Pix", v: -580, k: "withdraw", time: "12:30" },
    ]},
    { d: "Ontem", items: [
      { t: "Pedido #PG-2698 · M. Costa", v: 187.50, k: "income", time: "14:22" },
      { t: "Bônus 10 corridas/semana", v: 50, k: "bonus", time: "00:01" },
    ]},
    { d: "30 abr", items: [
      { t: "Pedido #PG-2680 · L. Souza", v: 165, k: "income", time: "11:08" },
      { t: "Antecipação de 5 corridas", v: -480, k: "withdraw", time: "08:45" },
      { t: "Taxa antecipação (3,2%)", v: -15.36, k: "fee", time: "08:45" },
    ]},
    { d: "29 abr", items: [
      { t: "Pedido #PG-2674 · A. Lima", v: 304, k: "income", time: "16:50" },
    ]},
  ];

  return (
    <div className="pg-screen" data-screen-label="P5-3 Extrato filtros">
      <SBp5 />
      <TBp5 onBack={() => go("provider-dash")} title="Extrato" right={<button style={{ background: "none", border: "none", color: "var(--green-700)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>⬇ CSV</button>}/>

      <div style={{ padding: "12px 20px 0", borderBottom: "1px solid var(--border)", background: "var(--paper)" }}>
        <div className="pg-segmented" style={{ marginBottom: 12 }}>
          {["week", "month", "year"].map(p => (
            <button key={p} className={`pg-segmented-item${period === p ? " is-active" : ""}`} onClick={() => setPeriod(p)}>
              {p === "week" ? "Semana" : p === "month" ? "Mês" : "Ano"}
            </button>
          ))}
        </div>
        <div className="pg-row" style={{ gap: 6, paddingBottom: 12, overflowX: "auto" }}>
          {[
            ["all", "Todos"], ["income", "Recebimentos"], ["withdraw", "Saques"], ["bonus", "Bônus"], ["fee", "Taxas"],
          ].map(([k, t]) => (
            <button key={k} onClick={() => setType(k)} style={{ padding: "6px 14px", borderRadius: 100, border: "1px solid var(--border)", background: type === k ? "var(--night-900)" : "var(--paper)", color: type === k ? "#fff" : "var(--text)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t}</button>
          ))}
        </div>
      </div>

      <div className="pg-viewport" style={{ paddingBottom: 80 }}>
        <div style={{ padding: 20 }}>
          <div className="pg-card pg-card--padded" style={{ marginBottom: 16, background: "var(--night-900)", color: "#fff", borderColor: "transparent" }}>
            <div className="pg-row pg-row--between">
              <div>
                <div className="pg-h-eyebrow" style={{ margin: 0, color: "rgba(255,255,255,0.5)" }}>NETO ABRIL</div>
                <div className="pg-mono" style={{ fontSize: 26, fontWeight: 800, marginTop: 2, color: "var(--green-500)" }}>R$ 4.832,40</div>
              </div>
              <div className="pg-row" style={{ gap: 16 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono)" }}>RECEBIDO</div>
                  <div className="pg-mono" style={{ fontSize: 14, fontWeight: 700 }}>+ R$ 5.547</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono)" }}>TAXAS</div>
                  <div className="pg-mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--orange-500)" }}>− R$ 715</div>
                </div>
              </div>
            </div>
          </div>

          {tx.map(g => (
            <div key={g.d} style={{ marginBottom: 18 }}>
              <div className="pg-h-eyebrow" style={{ margin: "0 0 8px" }}>{g.d.toUpperCase()}</div>
              <div className="pg-card" style={{ padding: 0 }}>
                {g.items.filter(it => type === "all" || it.k === type).map((it, i) => {
                  const colors = { income: "var(--green-700)", bonus: "var(--green-700)", withdraw: "var(--text)", fee: "var(--orange-600)" };
                  const icons = { income: "↓", bonus: "✦", withdraw: "↑", fee: "%" };
                  return (
                    <div key={i} className="pg-row" style={{ padding: "12px 14px", gap: 12, borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 16, background: "var(--bg-soft)", display: "grid", placeItems: "center", color: colors[it.k], fontSize: 14, fontWeight: 700 }}>{icons[it.k]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{it.t}</div>
                        <div className="pg-mono" style={{ fontSize: 10, color: "var(--text-mute)", marginTop: 2 }}>{it.time}</div>
                      </div>
                      <span className="pg-mono" style={{ fontSize: 14, fontWeight: 700, color: it.v > 0 ? "var(--green-700)" : "var(--text)" }}>
                        {it.v > 0 ? "+" : ""}R$ {Math.abs(it.v).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 4. NOTA FISCAL / MEI
// ---------------------------------------------------------------------
const ProvInvoice = ({ go }) => {
  const [auto, setAuto] = useStateP5(true);
  return (
    <div className="pg-screen" data-screen-label="P5-4 Nota fiscal MEI">
      <SBp5 />
      <TBp5 onBack={() => go("provider-dash")} title="Nota fiscal & MEI" />
      <div className="pg-viewport" style={{ paddingBottom: 40 }}>
        <div style={{ padding: 20 }}>
          <div className="pg-card pg-card--padded" style={{ background: "linear-gradient(135deg, var(--green-50), var(--paper))", borderColor: "var(--green-500)", marginBottom: 20 }}>
            <div className="pg-row pg-row--between">
              <div>
                <div className="pg-h-eyebrow" style={{ margin: 0, color: "var(--green-700)" }}>VOCÊ É MEI</div>
                <div className="pg-mono" style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>12.345.678/0001-90</div>
                <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>Carlos Mudanças ME · Ativo</div>
              </div>
              <div style={{ fontSize: 32 }}>📋</div>
            </div>
          </div>

          <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
            <div className="pg-row pg-row--between">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Emissão automática de NF</div>
                <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>Geramos para cada pedido concluído</div>
              </div>
              <button className="pg-toggle" onClick={() => setAuto(!auto)} style={{ background: auto ? "var(--night-900)" : "var(--ink-200)", border: "none", padding: 0, position: "relative", cursor: "pointer" }}>
                <span style={{ position: "absolute", top: 2, left: auto ? 20 : 2, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 200ms" }}/>
              </button>
            </div>
          </div>

          <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>LIMITE MEI 2026</div>
          <div className="pg-card pg-card--padded" style={{ marginBottom: 20 }}>
            <div className="pg-row pg-row--between" style={{ alignItems: "baseline", marginBottom: 10 }}>
              <span className="pg-mono" style={{ fontSize: 22, fontWeight: 700 }}>R$ 32.840 <span style={{ color: "var(--text-mute)", fontSize: 13, fontWeight: 500 }}>/ 81.000</span></span>
              <span style={{ fontSize: 12, color: "var(--green-700)", fontWeight: 700 }}>40,5%</span>
            </div>
            <div style={{ height: 8, background: "var(--ink-100)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: "40.5%", height: "100%", background: "var(--green-500)" }}/>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 10, lineHeight: 1.5 }}>
              No ritmo atual, você atinge o limite em <strong>novembro 2026</strong>. Considere migrar para ME se passar.
            </div>
          </div>

          <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>NOTAS RECENTES</div>
          <div className="pg-card" style={{ padding: 0 }}>
            {[
              { n: "NFS-e 1247", v: 251.30, d: "02 abr · J. Silva", st: "emitida" },
              { n: "NFS-e 1246", v: 187.50, d: "01 abr · M. Costa", st: "emitida" },
              { n: "NFS-e 1245", v: 165.00, d: "30 abr · L. Souza", st: "emitida" },
              { n: "NFS-e 1244", v: 304.00, d: "29 abr · A. Lima", st: "pendente" },
            ].map((nf, i) => (
              <div key={i} className="pg-row" style={{ padding: "12px 14px", gap: 12, borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-soft)", display: "grid", placeItems: "center", fontSize: 14 }}>📄</div>
                <div style={{ flex: 1 }}>
                  <div className="pg-mono" style={{ fontSize: 13, fontWeight: 700 }}>{nf.n}</div>
                  <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>{nf.d}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="pg-mono" style={{ fontSize: 13, fontWeight: 700 }}>R$ {nf.v.toFixed(2).replace(".", ",")}</div>
                  <span className={`pg-tag ${nf.st === "emitida" ? "pg-tag--green" : "pg-tag--orange"}`} style={{ fontSize: 9, marginTop: 2 }}>{nf.st.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 5. ANTECIPAÇÃO
// ---------------------------------------------------------------------
const ProvAdvance = ({ go }) => {
  const available = 2840;
  const [amount, setAmount] = useStateP5(1500);
  const fee = +(amount * 0.032).toFixed(2);
  const net = +(amount - fee).toFixed(2);

  return (
    <div className="pg-screen" data-screen-label="P5-5 Antecipação">
      <SBp5 />
      <TBp5 onBack={() => go("provider-dash")} title="Antecipar recebíveis" />
      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: 20 }}>
          <div className="pg-card pg-card--padded" style={{ marginBottom: 20 }}>
            <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>VALOR DISPONÍVEL PARA ANTECIPAR</div>
            <div className="pg-mono" style={{ fontSize: 30, fontWeight: 800, marginTop: 4 }}>R$ {available.toFixed(2).replace(".", ",")}</div>
            <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4 }}>De 14 corridas concluídas, ainda em janela de retenção</div>
          </div>

          <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>QUANTO QUER ANTECIPAR</div>
          <div style={{ background: "var(--bg-soft)", borderRadius: 14, padding: 22, textAlign: "center", marginBottom: 20 }}>
            <div className="pg-mono" style={{ fontSize: 36, fontWeight: 800 }}>R$ {amount.toFixed(2).replace(".", ",")}</div>
            <input type="range" min={100} max={available} step={50} value={amount} onChange={(e) => setAmount(+e.target.value)} className="pg-range" style={{ marginTop: 16 }}/>
          </div>

          <div className="pg-card pg-card--soft" style={{ padding: 14, marginBottom: 16 }}>
            <div className="pg-row pg-row--between" style={{ fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: "var(--text-soft)" }}>Você antecipa</span>
              <span className="pg-mono">R$ {amount.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="pg-row pg-row--between" style={{ fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: "var(--text-soft)" }}>Taxa antecipação <strong>3,2%</strong></span>
              <span className="pg-mono" style={{ color: "var(--orange-600)" }}>− R$ {fee.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="pg-divider" style={{ margin: "8px 0" }}/>
            <div className="pg-row pg-row--between" style={{ fontSize: 16 }}>
              <span style={{ fontWeight: 700 }}>Líquido na conta</span>
              <span className="pg-mono" style={{ fontWeight: 800, color: "var(--green-700)" }}>R$ {net.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>

          <div className="pg-card pg-card--padded" style={{ background: "var(--orange-50)", borderColor: "var(--orange-500)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--orange-600)", marginBottom: 6 }}>⚠️ Importante</div>
            <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.6 }}>
              Em caso de cancelamento ou disputa nas próximas 7 corridas, o valor antecipado é descontado do próximo recebimento.
            </div>
          </div>
        </div>
      </div>
      <div className="pg-page-foot" style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--paper)" }}>
        <button className="pg-btn pg-btn--accent pg-btn--lg pg-btn--block" onClick={() => go("provider-dash")}>
          Antecipar e receber R$ {net.toFixed(2).replace(".", ",")}
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 6. MÉTRICAS DETALHADAS
// ---------------------------------------------------------------------
const ProvMetrics = ({ go }) => {
  const [period, setPeriod] = useStateP5("week");
  const data = [4, 7, 5, 9, 12, 8, 6]; // pedidos por dia
  const max = Math.max(...data);

  return (
    <div className="pg-screen" data-screen-label="P5-6 Métricas">
      <SBp5 />
      <TBp5 onBack={() => go("provider-dash")} title="Métricas" />
      <div style={{ padding: "12px 20px 0", borderBottom: "1px solid var(--border)", background: "var(--paper)" }}>
        <div className="pg-segmented">
          {[["week","Semana"],["month","Mês"],["year","Ano"]].map(([k,t]) => (
            <button key={k} className={`pg-segmented-item${period === k ? " is-active" : ""}`} onClick={() => setPeriod(k)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="pg-viewport" style={{ paddingBottom: 40 }}>
        <div style={{ padding: 20 }}>
          {/* hero stat */}
          <div className="pg-card pg-card--padded" style={{ background: "var(--night-900)", color: "#fff", borderColor: "transparent", marginBottom: 16 }}>
            <div className="pg-row pg-row--between" style={{ alignItems: "flex-start" }}>
              <div>
                <div className="pg-h-eyebrow" style={{ margin: 0, color: "rgba(255,255,255,0.5)" }}>FATURAMENTO {period === "week" ? "SEMANAL" : period === "month" ? "MENSAL" : "ANUAL"}</div>
                <div className="pg-mono" style={{ fontSize: 32, fontWeight: 800, color: "var(--green-500)", marginTop: 4 }}>R$ 1.847</div>
                <div style={{ fontSize: 12, color: "var(--green-500)", marginTop: 4, fontWeight: 600 }}>↑ 23% vs semana passada</div>
              </div>
            </div>
            {/* mini chart */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginTop: 18, height: 70 }}>
              {data.map((v, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: "100%", height: `${(v / max) * 60}px`, background: i === 4 ? "var(--green-500)" : "rgba(34,227,163,0.3)", borderRadius: 3 }}/>
                  <span className="pg-mono" style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>{["S","T","Q","Q","S","S","D"][i]}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[
              { k: "Pedidos", v: "47", sub: "↑ 12%", c: "var(--green-700)" },
              { k: "Aceitação", v: "94%", sub: "Top 10%", c: "var(--green-700)" },
              { k: "Avaliação", v: "4,9", sub: "★", c: "#B8930F" },
              { k: "No-shows", v: "0", sub: "Excelente", c: "var(--green-700)" },
              { k: "Cancelamentos", v: "2%", sub: "Aceitável", c: "var(--orange-600)" },
              { k: "Tempo médio", v: "1h 32", sub: "Por pedido", c: "var(--text)" },
            ].map(s => (
              <div key={s.k} className="pg-card pg-card--padded">
                <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 9 }}>{s.k.toUpperCase()}</div>
                <div className="pg-mono" style={{ fontSize: 20, fontWeight: 800, marginTop: 6 }}>{s.v}</div>
                <div style={{ fontSize: 11, color: s.c, marginTop: 2, fontWeight: 600 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>HORÁRIOS MAIS LUCRATIVOS</div>
          <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
            {[
              ["Manhã (7-12h)", 28, "R$ 612"],
              ["Tarde (12-18h)", 65, "R$ 1.023"],
              ["Noite (18-23h)", 12, "R$ 212"],
            ].map(([t, p, v]) => (
              <div key={t} style={{ marginBottom: 10 }}>
                <div className="pg-row pg-row--between" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{t}</span>
                  <span className="pg-mono" style={{ fontSize: 12, fontWeight: 700 }}>{v}</span>
                </div>
                <div style={{ height: 6, background: "var(--ink-100)", borderRadius: 3 }}>
                  <div style={{ width: `${p}%`, height: "100%", background: "var(--green-500)", borderRadius: 3 }}/>
                </div>
              </div>
            ))}
          </div>

          <div className="pg-card pg-card--soft" style={{ padding: 14, fontSize: 12, color: "var(--text-soft)", lineHeight: 1.6 }}>
            💡 <strong>Insight:</strong> Suas tardes são <strong>3,4× mais lucrativas</strong>. Considere ficar online entre 12-18h para maximizar ganhos.
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 7. AVALIAÇÕES + RESPONDER
// ---------------------------------------------------------------------
const ProvReviews = ({ go }) => {
  const reviews = [
    { id: 1, n: "Joana S.", r: 5, d: "Hoje", t: "Atendimento impecável! Carlos é educado, pontual e profissional. Cuidou super bem da geladeira.", reply: null, tags: ["Pontual", "Cuidadoso"] },
    { id: 2, n: "Marcelo C.", r: 5, d: "Ontem", t: "Tudo certo. Recomendo!", reply: "Obrigado, Marcelo! Espero atender de novo 😊", tags: ["Rápido"] },
    { id: 3, n: "Letícia S.", r: 4, d: "30 abr", t: "Boa experiência. Demorou um pouco mais que o esperado mas fez tudo certo.", reply: null, tags: ["Cuidadoso"] },
    { id: 4, n: "Anônimo", r: 3, d: "28 abr", t: "Ok. Achei o preço meio alto pra distância.", reply: null, tags: [] },
  ];

  const dist = [
    { s: 5, n: 78 }, { s: 4, n: 14 }, { s: 3, n: 5 }, { s: 2, n: 2 }, { s: 1, n: 1 },
  ];
  const total = dist.reduce((s, d) => s + d.n, 0);

  return (
    <div className="pg-screen" data-screen-label="P5-7 Avaliações">
      <SBp5 />
      <TBp5 onBack={() => go("provider-dash")} title="Suas avaliações" />
      <div className="pg-viewport" style={{ paddingBottom: 40 }}>
        <div style={{ padding: 20 }}>
          {/* hero rating */}
          <div className="pg-card pg-card--padded" style={{ marginBottom: 16 }}>
            <div className="pg-row" style={{ gap: 20, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div className="pg-mono" style={{ fontSize: 48, fontWeight: 800, lineHeight: 1, color: "#B8930F" }}>4,9</div>
                <div style={{ marginTop: 4 }}>{"★".repeat(5)}</div>
                <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 4, fontFamily: "var(--font-mono)" }}>{total} AVAL.</div>
              </div>
              <div style={{ flex: 1 }}>
                {dist.map(d => (
                  <div key={d.s} className="pg-row" style={{ gap: 8, marginBottom: 4, fontSize: 11 }}>
                    <span className="pg-mono" style={{ width: 16 }}>{d.s}★</span>
                    <div style={{ flex: 1, height: 6, background: "var(--ink-100)", borderRadius: 3 }}>
                      <div style={{ width: `${(d.n / total) * 100}%`, height: "100%", background: d.s >= 4 ? "var(--green-500)" : d.s === 3 ? "#FBC02D" : "var(--orange-500)", borderRadius: 3 }}/>
                    </div>
                    <span className="pg-mono" style={{ width: 24, textAlign: "right", color: "var(--text-mute)" }}>{d.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* tag highlights */}
          <div className="pg-h-eyebrow" style={{ margin: "0 0 8px" }}>CLIENTES DESTACAM</div>
          <div className="pg-row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
            {[["Pontual", 42], ["Cuidadoso", 38], ["Rápido", 31], ["Educado", 28], ["Honesto", 19]].map(([t, n]) => (
              <span key={t} style={{ padding: "8px 12px", background: "var(--bg-soft)", borderRadius: 100, fontSize: 12, fontWeight: 600 }}>
                {t} <span style={{ color: "var(--text-mute)", fontFamily: "var(--font-mono)", fontSize: 10 }}>{n}×</span>
              </span>
            ))}
          </div>

          <div className="pg-h-eyebrow" style={{ margin: "0 0 12px" }}>AVALIAÇÕES RECENTES</div>
          <div className="pg-stack pg-stack--sm">
            {reviews.map(r => (
              <div key={r.id} className="pg-card pg-card--padded">
                <div className="pg-row pg-row--between" style={{ marginBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{r.n}</span>
                    <span style={{ fontSize: 11, color: "var(--text-mute)", marginLeft: 8 }}>{r.d}</span>
                  </div>
                  <span style={{ color: "#B8930F", fontSize: 13 }}>{"★".repeat(r.r)}{"☆".repeat(5 - r.r)}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.5 }}>{r.t}</div>
                {r.tags.length > 0 && (
                  <div className="pg-row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {r.tags.map(t => <span key={t} style={{ padding: "3px 8px", background: "var(--green-50)", color: "var(--green-700)", borderRadius: 100, fontSize: 10, fontWeight: 700 }}>{t}</span>)}
                  </div>
                )}
                {r.reply ? (
                  <div style={{ marginTop: 10, padding: 10, background: "var(--bg-soft)", borderRadius: 8, fontSize: 12 }}>
                    <div className="pg-h-eyebrow" style={{ margin: 0, fontSize: 8, marginBottom: 4 }}>SUA RESPOSTA</div>
                    <div style={{ color: "var(--text-soft)", lineHeight: 1.5 }}>{r.reply}</div>
                  </div>
                ) : (
                  <button className="pg-btn pg-btn--ghost pg-btn--sm" style={{ marginTop: 10, width: "100%" }}>↩ Responder publicamente</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 8. PROGRAMA DE NÍVEIS
// ---------------------------------------------------------------------
const ProvLevels = ({ go }) => {
  const current = "Prata";
  const progress = 68;

  return (
    <div className="pg-screen is-dark" data-screen-label="P5-8 Níveis" style={{ background: "var(--night-900)", color: "#fff" }}>
      <SBp5 dark />
      <TBp5 dark onBack={() => go("provider-dash")} title="Programa de níveis" />
      <div className="pg-viewport" style={{ paddingBottom: 40 }}>
        <div style={{ padding: 20 }}>
          {/* badge atual */}
          <div style={{ textAlign: "center", padding: "20px 0 32px" }}>
            <div style={{
              width: 130, height: 130, margin: "0 auto 16px",
              borderRadius: "50%", background: "linear-gradient(135deg, #C0C0C0, #8A8A8A)",
              display: "grid", placeItems: "center",
              position: "relative", boxShadow: "0 12px 40px rgba(192,192,192,0.3)",
            }}>
              <div style={{ fontSize: 56 }}>🥈</div>
            </div>
            <div className="pg-h-eyebrow" style={{ color: "rgba(255,255,255,0.5)", margin: 0 }}>SEU NÍVEL ATUAL</div>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: "4px 0 8px", letterSpacing: "-0.02em" }}>{current}</h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>87 corridas · ★ 4,9 · 6 meses ativo</p>
          </div>

          {/* progress to next */}
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 18, marginBottom: 24 }}>
            <div className="pg-row pg-row--between" style={{ marginBottom: 10 }}>
              <span className="pg-mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>PRÓXIMO NÍVEL: OURO 🥇</span>
              <span className="pg-mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--green-500)" }}>{progress}%</span>
            </div>
            <div style={{ height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #FFD700, #FFA500)", borderRadius: 5 }}/>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 12, lineHeight: 1.5 }}>
              Faltam <strong style={{ color: "#fff" }}>13 corridas</strong> em 30 dias mantendo ★ 4,8+ para subir.
            </div>
          </div>

          {/* níveis */}
          <div className="pg-h-eyebrow" style={{ color: "rgba(255,255,255,0.5)", margin: "0 0 12px" }}>TODOS OS NÍVEIS</div>
          <div className="pg-stack pg-stack--sm">
            {[
              { n: "Bronze", e: "🥉", req: "0 corridas", bonus: "Sem bônus", c: "#CD7F32" },
              { n: "Prata", e: "🥈", req: "50+ corridas · ★ 4,5", bonus: "+5% no preço, prioridade fila", c: "#C0C0C0", current: true },
              { n: "Ouro", e: "🥇", req: "100+ corridas · ★ 4,8", bonus: "+10% preço, antecipação grátis", c: "#FFD700" },
              { n: "Diamante", e: "💎", req: "300+ corridas · ★ 4,9", bonus: "+15%, suporte VIP, badge no perfil", c: "#B9F2FF" },
            ].map(lv => (
              <div key={lv.n} style={{
                padding: 16, borderRadius: 12,
                background: lv.current ? "rgba(34,227,163,0.1)" : "rgba(255,255,255,0.04)",
                border: lv.current ? "1.5px solid var(--green-500)" : "1px solid rgba(255,255,255,0.08)",
              }}>
                <div className="pg-row" style={{ gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 24, background: `${lv.c}30`, display: "grid", placeItems: "center", fontSize: 24 }}>{lv.e}</div>
                  <div style={{ flex: 1 }}>
                    <div className="pg-row" style={{ gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 800 }}>{lv.n}</span>
                      {lv.current && <span style={{ background: "var(--green-500)", color: "var(--night-900)", padding: "2px 8px", borderRadius: 100, fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)" }}>VOCÊ ESTÁ AQUI</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2, fontFamily: "var(--font-mono)" }}>{lv.req}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 6 }}>{lv.bonus}</div>
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

// ---------------------------------------------------------------------
// 9. BONIFICAÇÕES ATIVAS
// ---------------------------------------------------------------------
const ProvBonuses = ({ go }) => (
  <div className="pg-screen" data-screen-label="P5-9 Bonificações">
    <SBp5 />
    <TBp5 onBack={() => go("provider-dash")} title="Bônus & Desafios" />
    <div className="pg-viewport" style={{ paddingBottom: 40 }}>
      <div style={{ padding: 20 }}>
        <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>DESAFIOS ATIVOS</div>
        <div className="pg-stack pg-stack--sm" style={{ marginBottom: 28 }}>
          {[
            { t: "10 corridas até domingo", e: "🏁", p: 70, of: "7/10", v: "+ R$ 50", left: "2 dias" },
            { t: "Trabalhe na madrugada (0-5h)", e: "🌙", p: 0, of: "0/3", v: "+ R$ 80", left: "esta semana" },
            { t: "Mantenha ★ 4,9+ por 30 dias", e: "⭐", p: 88, of: "26/30 dias", v: "Badge Diamante", left: "4 dias" },
          ].map(c => (
            <div key={c.t} className="pg-card pg-card--padded">
              <div className="pg-row" style={{ gap: 14 }}>
                <div style={{ width: 50, height: 50, borderRadius: 25, background: "var(--bg-soft)", display: "grid", placeItems: "center", fontSize: 24 }}>{c.e}</div>
                <div style={{ flex: 1 }}>
                  <div className="pg-row pg-row--between" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{c.t}</span>
                    <span className="pg-mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--green-700)" }}>{c.v}</span>
                  </div>
                  <div className="pg-row pg-row--between" style={{ fontSize: 11, color: "var(--text-mute)", marginBottom: 6 }}>
                    <span className="pg-mono">{c.of}</span>
                    <span>termina em {c.left}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--ink-100)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${c.p}%`, height: "100%", background: c.p > 0 ? "var(--green-500)" : "transparent" }}/>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>BÔNUS RECEBIDOS</div>
        <div className="pg-card" style={{ padding: 0 }}>
          {[
            { t: "Bônus de boas-vindas", v: 100, d: "Há 6 meses" },
            { t: "Desafio: 20 corridas/mês", v: 80, d: "Mês passado" },
            { t: "Indicação de Pedro H.", v: 50, d: "Há 2 meses" },
          ].map((b, i) => (
            <div key={i} className="pg-row pg-row--between" style={{ padding: "12px 14px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>🎉 {b.t}</div>
                <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>{b.d}</div>
              </div>
              <span className="pg-mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--green-700)" }}>+ R$ {b.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------
// 10. PERFIL PÚBLICO EDITÁVEL
// ---------------------------------------------------------------------
const ProvPublic = ({ go }) => {
  const [bio, setBio] = useStateP5("Trabalho com mudanças há 8 anos. Cuidado, pontualidade e profissionalismo.");
  const [services, setServices] = useStateP5({ frete: true, mudanca: true, pequenosobj: false });

  return (
    <div className="pg-screen" data-screen-label="P5-10 Perfil público">
      <SBp5 />
      <TBp5 onBack={() => go("provider-dash")} title="Seu perfil público" right={
        <button style={{ background: "none", border: "none", color: "var(--green-700)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Salvar</button>
      } />
      <div className="pg-viewport" style={{ paddingBottom: 40 }}>
        {/* preview */}
        <div style={{ padding: 20, background: "var(--bg-soft)" }}>
          <div className="pg-h-eyebrow" style={{ margin: 0, marginBottom: 8 }}>PRÉVIA · COMO CLIENTES VEEM VOCÊ</div>
          <div className="pg-card pg-card--padded">
            <div className="pg-row" style={{ gap: 12 }}>
              <div style={{ width: 60, height: 60, borderRadius: 30, background: "linear-gradient(135deg, #22E3A3, #0FA77A)", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 700, color: "var(--night-900)", fontFamily: "var(--font-mono)" }}>CM</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Carlos Mudanças</div>
                <div className="pg-row" style={{ gap: 6, fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>
                  <span style={{ color: "#B8930F", fontWeight: 700 }}>★ 4,9</span><span>·</span><span>87 corridas</span>
                  <span className="pg-tag pg-tag--green" style={{ fontSize: 9 }}>🥈 PRATA</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 12, lineHeight: 1.5 }}>{bio}</div>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          <div className="pg-stack" style={{ gap: 18 }}>
            <div className="pg-field">
              <label className="pg-label">Sua bio</label>
              <textarea className="pg-textarea" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200}/>
              <div className="pg-helper">{bio.length}/200 — fale do seu diferencial</div>
            </div>

            <div className="pg-field">
              <label className="pg-label">Serviços que você oferece</label>
              <div className="pg-stack pg-stack--sm">
                {[
                  ["frete", "Fretes pequenos (até 800kg)"],
                  ["mudanca", "Mudanças residenciais/comerciais"],
                  ["pequenosobj", "Pequenos objetos & encomendas"],
                ].map(([k, t]) => (
                  <label key={k} className="pg-row" style={{ padding: "10px 14px", background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", gap: 12 }}>
                    <input type="checkbox" checked={services[k]} onChange={(e) => setServices({ ...services, [k]: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--night-900)" }}/>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{t}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pg-field">
              <label className="pg-label">Região de atendimento</label>
              <div className="pg-row" style={{ gap: 6, flexWrap: "wrap" }}>
                {["São Paulo · Centro", "Pinheiros", "Vila Madalena", "Itaim", "Moema"].map(r => (
                  <span key={r} className="pg-tag pg-tag--green" style={{ fontSize: 11 }}>{r} ×</span>
                ))}
                <button style={{ padding: "5px 10px", border: "1px dashed var(--border-strong)", borderRadius: 100, background: "var(--paper)", fontSize: 11, color: "var(--text-soft)", cursor: "pointer", fontFamily: "inherit" }}>+ adicionar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 11. DISPONIBILIDADE
// ---------------------------------------------------------------------
const ProvAvailability = ({ go }) => {
  const [online, setOnline] = useStateP5(true);
  const [days, setDays] = useStateP5({ seg: true, ter: true, qua: true, qui: true, sex: true, sab: true, dom: false });

  return (
    <div className="pg-screen" data-screen-label="P5-11 Disponibilidade">
      <SBp5 />
      <TBp5 onBack={() => go("provider-dash")} title="Disponibilidade" />
      <div className="pg-viewport" style={{ paddingBottom: 40 }}>
        <div style={{ padding: 20 }}>
          <div onClick={() => setOnline(!online)} className="pg-card pg-card--padded" style={{
            background: online ? "var(--green-500)" : "var(--ink-100)",
            color: online ? "var(--night-900)" : "var(--text)",
            borderColor: "transparent", cursor: "pointer", marginBottom: 24,
          }}>
            <div className="pg-row" style={{ gap: 14, alignItems: "center" }}>
              <div style={{ position: "relative", width: 44, height: 44 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 22, background: online ? "rgba(7,14,26,0.15)" : "rgba(0,0,0,0.05)", animation: online ? "pg-pulse 1.6s infinite" : "none" }}/>
                <div style={{ position: "absolute", inset: 8, borderRadius: 14, background: online ? "var(--night-900)" : "var(--ink-300)" }}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.01em" }}>{online ? "ONLINE" : "OFFLINE"}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{online ? "Recebendo pedidos · vai ficar online?" : "Toque para começar a receber"}</div>
              </div>
              <span style={{ fontSize: 22 }}>{online ? "🟢" : "⚪"}</span>
            </div>
          </div>

          <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>HORÁRIOS DE TRABALHO</div>
          <div className="pg-card pg-card--padded" style={{ marginBottom: 20 }}>
            <div className="pg-row pg-row--between" style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Início e fim do dia</span>
              <span className="pg-mono" style={{ fontSize: 14, fontWeight: 700 }}>07:00 → 22:00</span>
            </div>
            <div className="pg-row" style={{ gap: 4 }}>
              {Array.from({ length: 24 }).map((_, h) => {
                const active = h >= 7 && h < 22;
                return <div key={h} style={{ flex: 1, height: 24, background: active ? "var(--green-500)" : "var(--ink-100)", borderRadius: 2 }}/>;
              })}
            </div>
            <div className="pg-row pg-row--between" style={{ marginTop: 4, fontSize: 9, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>
              <span>0H</span><span>6H</span><span>12H</span><span>18H</span><span>24H</span>
            </div>
          </div>

          <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>DIAS DA SEMANA</div>
          <div className="pg-row" style={{ gap: 6, marginBottom: 24 }}>
            {[["seg","S"],["ter","T"],["qua","Q"],["qui","Q"],["sex","S"],["sab","S"],["dom","D"]].map(([k, l]) => (
              <button key={k} onClick={() => setDays({ ...days, [k]: !days[k] })}
                style={{
                  flex: 1, height: 56, borderRadius: 12,
                  border: `1.5px solid ${days[k] ? "var(--night-900)" : "var(--border)"}`,
                  background: days[k] ? "var(--night-900)" : "var(--paper)",
                  color: days[k] ? "#fff" : "var(--text)",
                  cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                }}>
                <span className="pg-mono" style={{ fontSize: 14, fontWeight: 700 }}>{l}</span>
                <span className="pg-mono" style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>{k.toUpperCase()}</span>
              </button>
            ))}
          </div>

          <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>FÉRIAS / FOLGAS PROGRAMADAS</div>
          <div className="pg-card pg-card--padded">
            <button className="pg-btn pg-btn--ghost pg-btn--block" style={{ border: "1.5px dashed var(--border-strong)" }}>
              + Programar período de folga
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 12. SUPORTE PRESTADOR
// ---------------------------------------------------------------------
const ProvSupport = ({ go }) => (
  <div className="pg-screen" data-screen-label="P5-12 Suporte prestador">
    <SBp5 />
    <TBp5 onBack={() => go("provider-dash")} title="Suporte" />
    <div className="pg-viewport" style={{ paddingBottom: 40 }}>
      <div style={{ padding: 20 }}>
        <div className="pg-card pg-card--padded" style={{ background: "var(--night-900)", color: "#fff", borderColor: "transparent", marginBottom: 20 }}>
          <div className="pg-h-eyebrow" style={{ margin: 0, color: "var(--green-500)" }}>VOCÊ É PRATA</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>Suporte prioritário</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Resposta média: 4 minutos</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
          {[
            { i: "💬", t: "Chat ao vivo", s: "< 4 min" },
            { i: "📞", t: "Ligar suporte", s: "0800 grátis" },
            { i: "📧", t: "Email", s: "< 12h" },
            { i: "🆘", t: "Emergência", s: "24/7", urgent: true },
          ].map(c => (
            <button key={c.t} className="pg-card" style={{ padding: 16, textAlign: "center", cursor: "pointer", border: c.urgent ? "1.5px solid var(--orange-500)" : "1px solid var(--border)" }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>{c.i}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{c.t}</div>
              <div style={{ fontSize: 11, color: c.urgent ? "var(--orange-600)" : "var(--text-mute)", marginTop: 2, fontFamily: "var(--font-mono)" }}>{c.s.toUpperCase()}</div>
            </button>
          ))}
        </div>

        <div className="pg-h-eyebrow" style={{ margin: "0 0 10px" }}>ASSUNTOS COMUNS</div>
        <div className="pg-card" style={{ padding: 0 }}>
          {[
            ["Cliente não apareceu", "Como cobrar pelo no-show"],
            ["Como contestar uma avaliação", "Procedimento de revisão"],
            ["Atraso de pagamento", "Verifique status do Pix"],
            ["Documentos vencendo", "Como renovar CNH"],
            ["Atualizar veículo", "Trocar para outro"],
          ].map(([t, s], i) => (
            <button key={t} className="pg-row" style={{ width: "100%", padding: "14px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)", background: "transparent", border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t}</div>
                <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>{s}</div>
              </div>
              <span style={{ color: "var(--text-mute)", fontSize: 18 }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------
// 13. DOCUMENTOS (RENOVAR)
// ---------------------------------------------------------------------
const ProvDocs = ({ go }) => {
  const docs = [
    { t: "CNH", n: "12345678901", st: "ok", exp: "12/02/2029", left: "2 anos" },
    { t: "CRLV (licenciamento)", n: "ABC-1D23 · 2024", st: "warning", exp: "30/06/2026", left: "53 dias" },
    { t: "Comprovante de residência", n: "Conta de luz", st: "ok", exp: "15/04/2026", left: "atualizado" },
    { t: "Seguro do veículo", n: "Porto Seguro", st: "expired", exp: "10/03/2026", left: "vencido há 12 dias" },
    { t: "Antecedentes criminais", n: "Federal e estadual", st: "ok", exp: "08/01/2027", left: "9 meses" },
  ];

  return (
    <div className="pg-screen" data-screen-label="P5-13 Documentos">
      <SBp5 />
      <TBp5 onBack={() => go("provider-dash")} title="Meus documentos" />
      <div className="pg-viewport" style={{ paddingBottom: 40 }}>
        <div style={{ padding: 20 }}>
          {docs.some(d => d.st === "expired") && (
            <div className="pg-card pg-card--padded" style={{ background: "var(--orange-50)", borderColor: "var(--orange-500)", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--orange-600)" }}>⚠️ Você tem documento vencido</div>
              <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4, lineHeight: 1.5 }}>Você pode receber novos pedidos, mas em <strong>3 dias</strong> sua conta será suspensa até regularizar.</div>
            </div>
          )}

          <div className="pg-stack pg-stack--sm">
            {docs.map(d => {
              const colors = { ok: "var(--green-700)", warning: "var(--orange-600)", expired: "var(--danger)" };
              const tags = { ok: "OK", warning: "VENCE EM BREVE", expired: "VENCIDO" };
              const tagBg = { ok: "var(--green-50)", warning: "var(--orange-50)", expired: "rgba(220,38,38,0.08)" };
              return (
                <div key={d.t} className="pg-card pg-card--padded">
                  <div className="pg-row pg-row--between" style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{d.t}</div>
                    <span style={{ padding: "3px 8px", background: tagBg[d.st], color: colors[d.st], borderRadius: 100, fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{tags[d.st]}</span>
                  </div>
                  <div className="pg-mono" style={{ fontSize: 11, color: "var(--text-mute)", marginBottom: 8 }}>{d.n}</div>
                  <div className="pg-row pg-row--between" style={{ fontSize: 12, color: "var(--text-soft)" }}>
                    <span>Validade: <strong style={{ fontFamily: "var(--font-mono)" }}>{d.exp}</strong></span>
                    <span style={{ color: colors[d.st], fontWeight: 600 }}>{d.left}</span>
                  </div>
                  {d.st !== "ok" && (
                    <button className="pg-btn pg-btn--primary pg-btn--sm pg-btn--block" style={{ marginTop: 12 }}>
                      📷 Renovar agora
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

window.PagoraPhase5 = {
  ProvEarning, ProvWithdraw, ProvStatement, ProvInvoice, ProvAdvance,
  ProvMetrics, ProvReviews, ProvLevels, ProvBonuses,
  ProvPublic, ProvAvailability, ProvSupport, ProvDocs,
};
