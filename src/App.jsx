/* @jsxRuntime classic */
import { useState, useEffect } from 'react';

const ALL_SCREENS = [
  "landing", "how", "services",
  "frete-1", "frete-2", "frete-3", "frete-4", "frete-summary", "frete-confirm",
  "guincho-1", "guincho-2", "guincho-3", "guincho-4",
  "cacamba-1", "cacamba-2", "cacamba-3",
  "proposals",
  "provider-landing", "provider-signup", "provider-confirm", "provider-dash",
  "admin-dash",
  "login", "onboarding", "home", "tracking", "chat", "rate", "receipt",
  "map", "notifications", "favorites", "addresses",
  "refer", "profile", "wallet", "history-list",
  "recurring", "joint", "accessibility",
  "locator",
  "compare", "filters-adv", "counter", "schedule", "stops", "items",
  "coupon", "pay-success", "pay-fail", "call", "share-route", "sos", "cancel", "report",
  "dispute", "refund", "service-done", "tip", "settings", "help", "legal", "delete-account", "edit-profile",
  "prov-signup", "prov-pending", "prov-rejected", "prov-order", "prov-quote", "prov-nav", "prov-checklist", "prov-extras", "prov-complete",
  "prov-earning", "prov-withdraw", "prov-statement", "prov-invoice", "prov-advance", "prov-metrics", "prov-reviews", "prov-levels", "prov-bonuses", "prov-public", "prov-availability", "prov-support", "prov-docs",
  "admin-dispute", "admin-order", "admin-users", "admin-coupons", "admin-config",
];

const groups = [
  { t: "Cliente · marketing", screens: [["landing","Landing"],["how","Como funciona"],["services","Selecionar serviço"]] },
  { t: "Cliente · autenticado", screens: [["login","Login + OTP"],["onboarding","Onboarding"],["home","Home autenticada"],["tracking","Tracking ao vivo"],["locator","Localizador prestador"],["chat","Chat com prestador"],["rate","Avaliar serviço"],["receipt","Recibo"],["map","Mapa prestadores"],["notifications","Notificações"],["history-list","Pedidos"],["favorites","Favoritos"],["addresses","Endereços"],["profile","Perfil"],["wallet","Carteira"],["refer","Indicar amigo"],["recurring","Recorrentes"],["joint","Dividir frete"],["accessibility","Acessibilidade"]] },
  { t: "Fluxo Frete", screens: [["frete-1","Frete · 1 Carga"],["frete-2","Frete · 2 Trajeto"],["frete-3","Frete · 3 Veículo"],["frete-4","Frete · 4 Quando"],["frete-summary","Resumo + Orçamento"],["frete-confirm","Confirmação enviada"],["proposals","Comparar propostas"]] },
  { t: "Cliente · pré-pedido (F1)", screens: [["compare","Comparador lado a lado"],["filters-adv","Filtros avançados"],["counter","Contraproposta"],["schedule","Agendar"],["stops","Paradas extras"],["items","Itens da mudança"]] },
  { t: "Cliente · pagamento e durante (F2)", screens: [["coupon","Cupom"],["pay-success","Pagamento OK"],["pay-fail","Pagamento falhou"],["call","Ligar prestador"],["share-route","Compartilhar rota"],["sos","SOS / emergência"],["cancel","Cancelar pedido"],["report","Reportar problema"]] },
  { t: "Cliente · pós e conta (F3)", screens: [["service-done","Serviço concluído"],["tip","Gorjeta"],["dispute","Disputa"],["refund","Reembolso"],["settings","Configurações"],["help","Ajuda / FAQ"],["legal","Termos / LGPD"],["edit-profile","Editar perfil"],["delete-account","Excluir conta"]] },
  { t: "Prestador · operação (F4)", screens: [["prov-signup","Cadastro multi-step"],["prov-pending","Aprovação pendente"],["prov-rejected","Documentos rejeitados"],["prov-order","Pedido recebido"],["prov-quote","Enviar cotação"],["prov-nav","Modo navegação"],["prov-checklist","Checklist + fotos"],["prov-extras","Custos extras"],["prov-complete","Confirmar conclusão"]] },
  { t: "Prestador · finanças e perfil (F5)", screens: [["prov-earning","Detalhe ganhos"],["prov-withdraw","Saque Pix"],["prov-statement","Extrato"],["prov-invoice","Nota fiscal MEI"],["prov-advance","Antecipação"],["prov-metrics","Métricas"],["prov-reviews","Avaliações"],["prov-levels","Níveis"],["prov-bonuses","Bonificações"],["prov-public","Perfil público"],["prov-availability","Disponibilidade"],["prov-support","Suporte"],["prov-docs","Documentos"]] },
  { t: "Admin · gestão (F6)", screens: [["admin-dispute","Detalhe disputa"],["admin-order","Detalhe pedido"],["admin-users","Usuários"],["admin-coupons","Cupons"],["admin-config","Sistema"]] },
  { t: "Outros fluxos", screens: [["guincho-1","Guincho · 1 Problema"],["guincho-2","Guincho · 2 Veículo"],["guincho-3","Guincho · 3 Local"],["guincho-4","Guincho · 4 Urgência"],["cacamba-1","Caçamba · 1 Material"],["cacamba-2","Caçamba · 2 Tamanho"],["cacamba-3","Caçamba · 3 Local"]] },
  { t: "Prestador", screens: [["provider-landing","Landing prestador"],["provider-signup","Cadastro"],["provider-confirm","Cadastro enviado"],["provider-dash","Dashboard prestador"]] },
  { t: "Admin", screens: [["admin-dash","Dashboard operações"]] },
];

export default function App() {
  const initial = window.location.hash.replace("#", "") || "landing";
  const [route, setRoute] = useState(ALL_SCREENS.includes(initial) ? initial : "landing");
  const [params, setParams] = useState({});
  const [state, setState] = useState({
    cargo: null, origin: "Av. Paulista, 1000, São Paulo",
    dest: "Rua Augusta, 500, São Paulo", distance: 15,
    originAccess: { type: "apt", floor: "3", elevator: true, needHelp: true },
    destAccess: { type: "house", needHelp: false },
    vehicle: "bau", helpers: 1, urgency: "scheduled",
    scheduledDate: "2026-04-29", scheduledTime: "09:00",
    notes: "",
  });

  const go = (next, p = {}) => {
    setParams(p);
    setRoute(next);
    window.location.hash = next;
    setTimeout(() => {
      document.querySelectorAll(".pg-viewport").forEach(v => v.scrollTo({ top: 0, behavior: "instant" }));
    }, 0);
  };

  const setS = (patch) => setState(s => ({ ...s, ...patch }));
  const reset = () => setState({
    cargo: null, origin: "", dest: "", distance: 15,
    originAccess: {}, destAccess: {},
    vehicle: null, helpers: 1, urgency: null, notes: "",
  });

  useEffect(() => {
    const onHash = () => {
      const r = window.location.hash.replace("#", "") || "landing";
      if (ALL_SCREENS.includes(r)) setRoute(r);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const renderScreen = () => {
    const { Landing, ServicePicker } = window.PagoraCore;
    const { Frete1, Frete2, Frete3, Frete4, FreteSummary, FreteConfirm } = window.PagoraFrete;
    const { ProviderLanding, ProviderSignup, ProviderConfirm, ProviderDash, AdminDash, HowItWorks } = window.PagoraOther;
    const { Guincho1, Guincho2, Guincho3, Guincho4, Cacamba1, Cacamba2, Cacamba3, Proposals } = window.PagoraExtra;
    const { Login, Onboarding, HomeAuth, Tracking, Chat, Rate, Receipt } = window.PagoraApp;
    const { ProvidersMap, Notifications, Favorites, Addresses, Refer, Profile, Wallet, HistoryList, Recurring, Joint, Accessibility } = window.PagoraApp2;
    const { Locator } = window.PagoraLocator;
    const { Compare, FiltersAdv, Counter, Schedule, Stops, Items } = window.PagoraPhase1;
    const { Coupon, PaySuccess, PayFail, CallProvider, ShareRoute, SOS, CancelOrder, ReportIssue } = window.PagoraPhase2;
    const { Dispute, Refund, ServiceDone, Tip, Settings, Help, Legal, DeleteAccount, EditProfile } = window.PagoraPhase3;
    const { ProvSignup, ProvPending, ProvRejected, ProvOrderDetail, ProvQuote, ProvNav, ProvChecklist, ProvExtras, ProvComplete } = window.PagoraPhase4;
    const { ProvEarning, ProvWithdraw, ProvStatement, ProvInvoice, ProvAdvance, ProvMetrics, ProvReviews, ProvLevels, ProvBonuses, ProvPublic, ProvAvailability, ProvSupport, ProvDocs } = window.PagoraPhase5;
    const { AdminDispute, AdminOrder, AdminUsers, AdminCoupons, AdminConfig } = window.PagoraPhase6;

    switch (route) {
      case "landing": return React.createElement(Landing, { go });
      case "how": return React.createElement(HowItWorks, { go });
      case "services": return React.createElement(ServicePicker, { go, preselect: params.preselect });
      case "frete-1": return React.createElement(Frete1, { go, state, set: setS });
      case "frete-2": return React.createElement(Frete2, { go, state, set: setS });
      case "frete-3": return React.createElement(Frete3, { go, state, set: setS });
      case "frete-4": return React.createElement(Frete4, { go, state, set: setS });
      case "frete-summary": return React.createElement(FreteSummary, { go, state });
      case "frete-confirm": return React.createElement(FreteConfirm, { go, state, reset });
      case "guincho-1": return React.createElement(Guincho1, { go, state, set: setS });
      case "guincho-2": return React.createElement(Guincho2, { go, state, set: setS });
      case "guincho-3": return React.createElement(Guincho3, { go, state, set: setS });
      case "guincho-4": return React.createElement(Guincho4, { go, state, set: setS });
      case "cacamba-1": return React.createElement(Cacamba1, { go, state, set: setS });
      case "cacamba-2": return React.createElement(Cacamba2, { go, state, set: setS });
      case "cacamba-3": return React.createElement(Cacamba3, { go, state, set: setS });
      case "proposals": return React.createElement(Proposals, { go, reset });
      case "provider-landing": return React.createElement(ProviderLanding, { go });
      case "provider-signup": return React.createElement(ProviderSignup, { go });
      case "provider-confirm": return React.createElement(ProviderConfirm, { go });
      case "provider-dash": return React.createElement(ProviderDash, { go });
      case "admin-dash": return React.createElement(AdminDash, { go });
      case "login": return React.createElement(Login, { go });
      case "onboarding": return React.createElement(Onboarding, { go });
      case "home": return React.createElement(HomeAuth, { go });
      case "tracking": return React.createElement(Tracking, { go });
      case "chat": return React.createElement(Chat, { go });
      case "rate": return React.createElement(Rate, { go });
      case "receipt": return React.createElement(Receipt, { go });
      case "map": return React.createElement(ProvidersMap, { go });
      case "notifications": return React.createElement(Notifications, { go });
      case "favorites": return React.createElement(Favorites, { go });
      case "addresses": return React.createElement(Addresses, { go });
      case "refer": return React.createElement(Refer, { go });
      case "profile": return React.createElement(Profile, { go });
      case "wallet": return React.createElement(Wallet, { go });
      case "history-list": return React.createElement(HistoryList, { go });
      case "recurring": return React.createElement(Recurring, { go });
      case "joint": return React.createElement(Joint, { go });
      case "accessibility": return React.createElement(Accessibility, { go });
      case "locator": return React.createElement(Locator, { go });
      case "compare": return React.createElement(Compare, { go });
      case "filters-adv": return React.createElement(FiltersAdv, { go });
      case "counter": return React.createElement(Counter, { go });
      case "schedule": return React.createElement(Schedule, { go });
      case "stops": return React.createElement(Stops, { go });
      case "items": return React.createElement(Items, { go });
      case "coupon": return React.createElement(Coupon, { go });
      case "pay-success": return React.createElement(PaySuccess, { go });
      case "pay-fail": return React.createElement(PayFail, { go });
      case "call": return React.createElement(CallProvider, { go });
      case "share-route": return React.createElement(ShareRoute, { go });
      case "sos": return React.createElement(SOS, { go });
      case "cancel": return React.createElement(CancelOrder, { go });
      case "report": return React.createElement(ReportIssue, { go });
      case "dispute": return React.createElement(Dispute, { go });
      case "refund": return React.createElement(Refund, { go });
      case "service-done": return React.createElement(ServiceDone, { go });
      case "tip": return React.createElement(Tip, { go });
      case "settings": return React.createElement(Settings, { go });
      case "help": return React.createElement(Help, { go });
      case "legal": return React.createElement(Legal, { go });
      case "delete-account": return React.createElement(DeleteAccount, { go });
      case "edit-profile": return React.createElement(EditProfile, { go });
      case "prov-signup": return React.createElement(ProvSignup, { go });
      case "prov-pending": return React.createElement(ProvPending, { go });
      case "prov-rejected": return React.createElement(ProvRejected, { go });
      case "prov-order": return React.createElement(ProvOrderDetail, { go });
      case "prov-quote": return React.createElement(ProvQuote, { go });
      case "prov-nav": return React.createElement(ProvNav, { go });
      case "prov-checklist": return React.createElement(ProvChecklist, { go });
      case "prov-extras": return React.createElement(ProvExtras, { go });
      case "prov-complete": return React.createElement(ProvComplete, { go });
      case "prov-earning": return React.createElement(ProvEarning, { go });
      case "prov-withdraw": return React.createElement(ProvWithdraw, { go });
      case "prov-statement": return React.createElement(ProvStatement, { go });
      case "prov-invoice": return React.createElement(ProvInvoice, { go });
      case "prov-advance": return React.createElement(ProvAdvance, { go });
      case "prov-metrics": return React.createElement(ProvMetrics, { go });
      case "prov-reviews": return React.createElement(ProvReviews, { go });
      case "prov-levels": return React.createElement(ProvLevels, { go });
      case "prov-bonuses": return React.createElement(ProvBonuses, { go });
      case "prov-public": return React.createElement(ProvPublic, { go });
      case "prov-availability": return React.createElement(ProvAvailability, { go });
      case "prov-support": return React.createElement(ProvSupport, { go });
      case "prov-docs": return React.createElement(ProvDocs, { go });
      case "admin-dispute": return React.createElement(AdminDispute, { go });
      case "admin-order": return React.createElement(AdminOrder, { go });
      case "admin-users": return React.createElement(AdminUsers, { go });
      case "admin-coupons": return React.createElement(AdminCoupons, { go });
      case "admin-config": return React.createElement(AdminConfig, { go });
      default: return React.createElement(Landing, { go });
    }
  };

  const { Logo } = window.PagoraCore || {};

  return (
    <div className="pg-app">
      <div className="pg-stage">
        <div className="pg-pane">
          <div>{Logo && React.createElement(Logo, { size: 20 })}</div>
          <div>
            <div className="pg-pane-eyebrow">PROTÓTIPO · MOBILE</div>
            <h1>Logística pesada com orçamento honesto.</h1>
            <p>Marketplace que conecta clientes a prestadores de frete, guincho e caçamba — sem matching automático nem preço-armadilha.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {groups.map(g => (
              <div key={g.t}>
                <div className="pg-pane-eyebrow" style={{ marginBottom: 8 }}>{g.t}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {g.screens.map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => go(id)}
                      style={{
                        textAlign: "left", padding: "8px 12px", borderRadius: 8,
                        border: "none", background: route === id ? "var(--night-900)" : "transparent",
                        color: route === id ? "#fff" : "var(--text-soft)",
                        fontSize: 14, cursor: "pointer", fontWeight: route === id ? 600 : 500,
                        fontFamily: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}
                    >
                      <span>{label}</span>
                      {route === id && <span style={{ color: "var(--green-500)", fontSize: 11, fontFamily: "var(--font-mono)" }}>●</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="pg-pane-stats">
            <div>
              <div className="pg-pane-stat-num">2 h</div>
              <div className="pg-pane-stat-lbl">PRIMEIRA PROPOSTA</div>
            </div>
            <div>
              <div className="pg-pane-stat-num">R$ 0</div>
              <div className="pg-pane-stat-lbl">SEM TAXA AO CLIENTE</div>
            </div>
          </div>
        </div>
        <div className="pg-phone-wrap">
          <div className="pg-phone">
            {renderScreen()}
          </div>
        </div>
      </div>
    </div>
  );
}
