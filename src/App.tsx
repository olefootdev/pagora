import { HashRouter, useNavigate, useLocation } from 'react-router-dom';

import { usePagoraStore } from './store';
import type { GoFn } from './types';

import { Landing, ServicePicker, Logo } from './core';
import { Frete1, Frete2, Frete3, Frete4, FreteSummary, FreteConfirm } from './frete';
import {
  Guincho1,
  Guincho2,
  Guincho3,
  Guincho4,
  Cacamba1,
  Cacamba2,
  Cacamba3,
  Proposals,
} from './extra';
import {
  ProviderLanding,
  ProviderSignup,
  ProviderConfirm,
  ProviderDash,
  AdminDash,
  HowItWorks,
} from './other';
import {
  BottomNav,
  Login,
  Onboarding,
  HomeAuth,
  Tracking,
  Chat,
  Rate,
  Receipt,
} from './cliente-auth';
import {
  ProvidersMap,
  Notifications,
  Favorites,
  Addresses,
  Refer,
  Profile,
  Wallet,
  HistoryList,
  Recurring,
  Joint,
  Accessibility,
} from './cliente-mapa';
import { Locator } from './locator';
import { Compare } from './phase1';
import { ServiceDone } from './phase3';
import { ProvSignup } from './phase4';
import { AdminDispute } from './phase6';
import { PrivacyPolicy, Terms } from './legal';

// =====================================================================
// PAGORA — Router (HashRouter) + Zustand store
// FASE 1b: hash routing real, estado em store, screens continuam recebendo `go` como prop
// =====================================================================

const ALL_SCREENS = [
  'landing',
  'how',
  'services',
  'frete-1',
  'frete-2',
  'frete-3',
  'frete-4',
  'frete-summary',
  'frete-confirm',
  'guincho-1',
  'guincho-2',
  'guincho-3',
  'guincho-4',
  'cacamba-1',
  'cacamba-2',
  'cacamba-3',
  'proposals',
  'compare',
  'provider-landing',
  'provider-signup',
  'provider-confirm',
  'provider-dash',
  'prov-signup',
  'admin-dash',
  'admin-dispute',
  'login',
  'onboarding',
  'home',
  'tracking',
  'chat',
  'rate',
  'receipt',
  'map',
  'notifications',
  'favorites',
  'addresses',
  'refer',
  'profile',
  'wallet',
  'history-list',
  'recurring',
  'joint',
  'accessibility',
  'locator',
  'service-done',
  'privacidade',
  'termos',
];

type NavGroup = { t: string; screens: ReadonlyArray<readonly [string, string]> };
const groups: NavGroup[] = [
  {
    t: 'Cliente · marketing',
    screens: [
      ['landing', 'Landing'],
      ['how', 'Como funciona'],
      ['services', 'Selecionar serviço'],
      ['privacidade', 'Privacidade (LGPD)'],
      ['termos', 'Termos de uso'],
    ],
  },
  {
    t: 'Cliente · autenticado',
    screens: [
      ['login', 'Login + OTP'],
      ['onboarding', 'Onboarding'],
      ['home', 'Home autenticada'],
      ['tracking', 'Tracking ao vivo'],
      ['locator', 'Localizador prestador'],
      ['chat', 'Chat com prestador'],
      ['rate', 'Avaliar serviço'],
      ['receipt', 'Recibo'],
      ['map', 'Mapa prestadores'],
      ['notifications', 'Notificações'],
      ['history-list', 'Pedidos'],
      ['favorites', 'Favoritos'],
      ['addresses', 'Endereços'],
      ['profile', 'Perfil'],
      ['wallet', 'Carteira'],
      ['refer', 'Indicar amigo'],
      ['recurring', 'Recorrentes'],
      ['joint', 'Dividir frete'],
      ['accessibility', 'Acessibilidade'],
      ['service-done', 'Serviço concluído'],
    ],
  },
  {
    t: 'Fluxo Frete',
    screens: [
      ['frete-1', 'Frete · 1 Carga'],
      ['frete-2', 'Frete · 2 Trajeto'],
      ['frete-3', 'Frete · 3 Veículo'],
      ['frete-4', 'Frete · 4 Quando'],
      ['frete-summary', 'Resumo + Orçamento'],
      ['frete-confirm', 'Confirmação enviada'],
      ['proposals', 'Comparar propostas'],
      ['compare', 'Comparador lado a lado'],
    ],
  },
  {
    t: 'Outros fluxos de cotação',
    screens: [
      ['guincho-1', 'Guincho · 1 Problema'],
      ['guincho-2', 'Guincho · 2 Veículo'],
      ['guincho-3', 'Guincho · 3 Local'],
      ['guincho-4', 'Guincho · 4 Urgência'],
      ['cacamba-1', 'Caçamba · 1 Material'],
      ['cacamba-2', 'Caçamba · 2 Tamanho'],
      ['cacamba-3', 'Caçamba · 3 Local'],
    ],
  },
  {
    t: 'Prestador',
    screens: [
      ['provider-landing', 'Landing prestador'],
      ['provider-signup', 'Cadastro (simples)'],
      ['prov-signup', 'Cadastro multi-step'],
      ['provider-confirm', 'Cadastro enviado'],
      ['provider-dash', 'Dashboard prestador'],
    ],
  },
  {
    t: 'Admin',
    screens: [
      ['admin-dash', 'Dashboard operações'],
      ['admin-dispute', 'Detalhe disputa'],
    ],
  },
];

const CONSUMER_SCREENS = new Set([
  'home',
  'tracking',
  'chat',
  'rate',
  'receipt',
  'map',
  'notifications',
  'favorites',
  'addresses',
  'refer',
  'profile',
  'wallet',
  'history-list',
  'recurring',
  'joint',
  'accessibility',
  'locator',
  'compare',
  'service-done',
  'services',
  'how',
  'frete-1',
  'frete-2',
  'frete-3',
  'frete-4',
  'frete-summary',
  'frete-confirm',
  'guincho-1',
  'guincho-2',
  'guincho-3',
  'guincho-4',
  'cacamba-1',
  'cacamba-2',
  'cacamba-3',
  'proposals',
]);

const NAV_TAB: Record<string, string> = {
  home: 'home',
  tracking: 'home',
  chat: 'home',
  rate: 'home',
  locator: 'home',
  compare: 'home',
  services: 'home',
  how: 'home',
  'frete-1': 'home',
  'frete-2': 'home',
  'frete-3': 'home',
  'frete-4': 'home',
  'frete-summary': 'home',
  'frete-confirm': 'home',
  'guincho-1': 'home',
  'guincho-2': 'home',
  'guincho-3': 'home',
  'guincho-4': 'home',
  'cacamba-1': 'home',
  'cacamba-2': 'home',
  'cacamba-3': 'home',
  proposals: 'home',
  map: 'map',
  'history-list': 'history-list',
  receipt: 'history-list',
  'service-done': 'history-list',
  recurring: 'history-list',
  joint: 'history-list',
  notifications: 'notifications',
  profile: 'profile',
  wallet: 'profile',
  refer: 'profile',
  addresses: 'profile',
  favorites: 'profile',
  accessibility: 'profile',
};

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  // Zustand store — substitui o useState gigante do passado
  const state = usePagoraStore();
  const setS = usePagoraStore((s) => s.patchState);
  const reset = usePagoraStore((s) => s.resetState);

  // Rota derivada do path. Em HashRouter o pathname já vem sem o '#'.
  const path = location.pathname.replace(/^\//, '');
  const route = (ALL_SCREENS as readonly string[]).includes(path) ? path : 'landing';
  const params = (location.state as Record<string, unknown> | null) || {};

  const go: GoFn = (next, p = {}) => {
    navigate('/' + next, { state: p });
    // Reset scroll do viewport interno (não da página)
    setTimeout(() => {
      document
        .querySelectorAll('.pg-viewport')
        .forEach((v) => v.scrollTo({ top: 0, behavior: 'instant' }));
    }, 0);
  };

  const renderScreen = () => {
    switch (route) {
      // Público / marketing
      case 'landing':
        return <Landing go={go} />;
      case 'how':
        return <HowItWorks go={go} />;
      case 'services':
        return <ServicePicker go={go} preselect={params.preselect as string | undefined} />;
      // Frete
      case 'frete-1':
        return <Frete1 go={go} state={state} set={setS} />;
      case 'frete-2':
        return <Frete2 go={go} state={state} set={setS} />;
      case 'frete-3':
        return <Frete3 go={go} state={state} set={setS} />;
      case 'frete-4':
        return <Frete4 go={go} state={state} set={setS} />;
      case 'frete-summary':
        return <FreteSummary go={go} state={state} />;
      case 'frete-confirm':
        return <FreteConfirm go={go} state={state} reset={reset} />;
      // Guincho / Caçamba
      case 'guincho-1':
        return <Guincho1 go={go} state={state} set={setS} />;
      case 'guincho-2':
        return <Guincho2 go={go} state={state} set={setS} />;
      case 'guincho-3':
        return <Guincho3 go={go} state={state} set={setS} />;
      case 'guincho-4':
        return <Guincho4 go={go} state={state} set={setS} />;
      case 'cacamba-1':
        return <Cacamba1 go={go} state={state} set={setS} />;
      case 'cacamba-2':
        return <Cacamba2 go={go} state={state} set={setS} />;
      case 'cacamba-3':
        return <Cacamba3 go={go} state={state} set={setS} />;
      // Propostas + comparador
      case 'proposals':
        return <Proposals go={go} reset={reset} />;
      case 'compare':
        return <Compare go={go} />;
      // Prestador
      case 'provider-landing':
        return <ProviderLanding go={go} />;
      case 'provider-signup':
        return <ProviderSignup go={go} />;
      case 'prov-signup':
        return <ProvSignup go={go} />;
      case 'provider-confirm':
        return <ProviderConfirm go={go} />;
      case 'provider-dash':
        return <ProviderDash go={go} />;
      // Admin
      case 'admin-dash':
        return <AdminDash go={go} />;
      case 'admin-dispute':
        return <AdminDispute go={go} />;
      // Cliente autenticado
      case 'login':
        return <Login go={go} />;
      case 'onboarding':
        return <Onboarding go={go} />;
      case 'home':
        return <HomeAuth go={go} />;
      case 'tracking':
        return <Tracking go={go} />;
      case 'chat':
        return <Chat go={go} />;
      case 'rate':
        return <Rate go={go} />;
      case 'receipt':
        return <Receipt go={go} />;
      case 'map':
        return <ProvidersMap go={go} />;
      case 'notifications':
        return <Notifications go={go} />;
      case 'favorites':
        return <Favorites go={go} />;
      case 'addresses':
        return <Addresses go={go} />;
      case 'refer':
        return <Refer go={go} />;
      case 'profile':
        return <Profile go={go} />;
      case 'wallet':
        return <Wallet go={go} />;
      case 'history-list':
        return <HistoryList go={go} />;
      case 'recurring':
        return <Recurring go={go} />;
      case 'joint':
        return <Joint go={go} />;
      case 'accessibility':
        return <Accessibility go={go} />;
      case 'locator':
        return <Locator go={go} />;
      case 'service-done':
        return <ServiceDone go={go} />;
      case 'privacidade':
        return <PrivacyPolicy go={go} />;
      case 'termos':
        return <Terms go={go} />;
      default:
        return <Landing go={go} />;
    }
  };

  return (
    <div className="pg-app">
      <div className="pg-stage">
        <div className="pg-pane">
          <div>
            <Logo size={20} />
          </div>
          <div>
            <div className="pg-pane-eyebrow">PROTÓTIPO · MOBILE</div>
            <h1>Logística pesada com orçamento honesto.</h1>
            <p>
              Marketplace que conecta clientes a prestadores de frete, guincho e caçamba — sem
              matching automático nem preço-armadilha.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {groups.map((g) => (
              <div key={g.t}>
                <div className="pg-pane-eyebrow" style={{ marginBottom: 8 }}>
                  {g.t}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {g.screens.map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => go(id)}
                      style={{
                        textAlign: 'left',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: route === id ? 'var(--night-900)' : 'transparent',
                        color: route === id ? '#fff' : 'var(--text-soft)',
                        fontSize: 14,
                        cursor: 'pointer',
                        fontWeight: route === id ? 600 : 500,
                        fontFamily: 'inherit',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>{label}</span>
                      {route === id && (
                        <span
                          style={{
                            color: 'var(--green-500)',
                            fontSize: 11,
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          ●
                        </span>
                      )}
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
            <div
              style={{
                flex: 1,
                overflow: 'hidden',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {renderScreen()}
            </div>
            {CONSUMER_SCREENS.has(route) && <BottomNav active={NAV_TAB[route] || 'home'} go={go} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}
