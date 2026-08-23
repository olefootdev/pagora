import { HashRouter, useNavigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, type ComponentType } from 'react';

import { usePagoraStore } from './store';
import type { GoFn } from './types';

// `core` fica ESTÁTICO: a landing é a primeira pintura e o Logo é usado pelo
// cabeçalho em todas as rotas. Carregá-lo sob demanda só adiaria o que sempre
// é necessário.
import { Landing, ServicePicker, Logo } from './core';

// =====================================================================
// Code splitting POR ARQUIVO DE DOMÍNIO, não por tela.
//
// As telas moram em poucos arquivos grandes (cliente-auth ~2.7k LOC,
// cliente-mapa ~2.5k). Dividir por rota não reduziria nada — cada rota puxaria
// o arquivo inteiro de qualquer forma. Dividindo por módulo, quem abre a
// landing não baixa o fluxo de frete, o painel do prestador nem o mapa.
//
// `lazy` exige default export; os arquivos exportam nomeado, daí o `.then`.
// =====================================================================
// O cast final para `M[K]` preserva o tipo das props do componente original,
// de modo que `<Login go={go} />` continua sendo verificado. Em runtime o valor
// é um componente lazy, que o React renderiza igual — só precisa estar dentro
// de um <Suspense>.
function lazyFrom<M, K extends keyof M>(loader: () => Promise<M>, key: K): M[K] {
  return lazy(() =>
    loader().then((m) => ({ default: m[key] as unknown as ComponentType<unknown> })),
  ) as unknown as M[K];
}

const freteModule = () => import('./frete');
const Frete1 = lazyFrom(freteModule, 'Frete1');
const Frete2 = lazyFrom(freteModule, 'Frete2');
const Frete3 = lazyFrom(freteModule, 'Frete3');
const Frete4 = lazyFrom(freteModule, 'Frete4');
const FreteSummary = lazyFrom(freteModule, 'FreteSummary');
const FreteConfirm = lazyFrom(freteModule, 'FreteConfirm');

const extraModule = () => import('./extra');
const Guincho1 = lazyFrom(extraModule, 'Guincho1');
const Guincho2 = lazyFrom(extraModule, 'Guincho2');
const Guincho3 = lazyFrom(extraModule, 'Guincho3');
const Guincho4 = lazyFrom(extraModule, 'Guincho4');
const Cacamba1 = lazyFrom(extraModule, 'Cacamba1');
const Cacamba2 = lazyFrom(extraModule, 'Cacamba2');
const Cacamba3 = lazyFrom(extraModule, 'Cacamba3');
const Proposals = lazyFrom(extraModule, 'Proposals');

const otherModule = () => import('./other');
const ProviderLanding = lazyFrom(otherModule, 'ProviderLanding');
const ProviderSignup = lazyFrom(otherModule, 'ProviderSignup');
const ProviderConfirm = lazyFrom(otherModule, 'ProviderConfirm');
const ProviderDash = lazyFrom(otherModule, 'ProviderDash');
const AdminDash = lazyFrom(otherModule, 'AdminDash');
const HowItWorks = lazyFrom(otherModule, 'HowItWorks');

const authModule = () => import('./cliente-auth');
const BottomNav = lazyFrom(authModule, 'BottomNav');
const Login = lazyFrom(authModule, 'Login');
const Onboarding = lazyFrom(authModule, 'Onboarding');
const HomeAuth = lazyFrom(authModule, 'HomeAuth');
const Tracking = lazyFrom(authModule, 'Tracking');
const Chat = lazyFrom(authModule, 'Chat');
const Rate = lazyFrom(authModule, 'Rate');
const Receipt = lazyFrom(authModule, 'Receipt');

const mapaModule = () => import('./cliente-mapa');
const ProvidersMap = lazyFrom(mapaModule, 'ProvidersMap');
const Notifications = lazyFrom(mapaModule, 'Notifications');
const Favorites = lazyFrom(mapaModule, 'Favorites');
const Addresses = lazyFrom(mapaModule, 'Addresses');
const Refer = lazyFrom(mapaModule, 'Refer');
const Profile = lazyFrom(mapaModule, 'Profile');
const Wallet = lazyFrom(mapaModule, 'Wallet');
const HistoryList = lazyFrom(mapaModule, 'HistoryList');
const Recurring = lazyFrom(mapaModule, 'Recurring');
const Joint = lazyFrom(mapaModule, 'Joint');
const Accessibility = lazyFrom(mapaModule, 'Accessibility');

const Locator = lazyFrom(() => import('./locator'), 'Locator');
const Compare = lazyFrom(() => import('./phase1'), 'Compare');
const ServiceDone = lazyFrom(() => import('./phase3'), 'ServiceDone');
const ProvSignup = lazyFrom(() => import('./phase4'), 'ProvSignup');
const AdminDispute = lazyFrom(() => import('./phase6'), 'AdminDispute');

const legalModule = () => import('./legal');
const PrivacyPolicy = lazyFrom(legalModule, 'PrivacyPolicy');
const Terms = lazyFrom(legalModule, 'Terms');

const Checkout = lazyFrom(() => import('./screens/checkout'), 'Checkout');
const ProviderFinanceiro = lazyFrom(
  () => import('./screens/provider-financeiro'),
  'ProviderFinanceiro',
);
const AdminFinanceiro = lazyFrom(() => import('./screens/admin-financeiro'), 'AdminFinanceiro');
const MeusPedidos = lazyFrom(() => import('./screens/meus-pedidos'), 'MeusPedidos');
const Oportunidades = lazyFrom(() => import('./screens/oportunidades'), 'Oportunidades');

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
  // Núcleo transacional
  'checkout',
  'prov-financeiro',
  'admin-financeiro',
  'meus-pedidos',
  'oportunidades',
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
  'checkout',
  'meus-pedidos',
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
  'meus-pedidos': 'history-list',
  checkout: 'history-list',
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

/**
 * Placeholder enquanto o módulo da tela é baixado. Ocupa o mesmo espaço da
 * tela real para o layout não pular quando o conteúdo chega.
 */
function ScreenSkeleton() {
  return (
    <div
      className="pg-screen"
      aria-busy="true"
      aria-live="polite"
      style={{ display: 'grid', placeItems: 'center', flex: 1 }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>Carregando…</span>
    </div>
  );
}

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
    // Reset de scroll dos containers internos (não da página). Precisa citar
    // os DOIS: `.pg-screen-scroll` é o scroller de todas as telas desde o
    // ponto 6, e `.pg-viewport` continua sendo o de dentro nas telas que têm
    // uma área rolável própria (chat, mapa). Mirar só um deixa a tela nova
    // abrindo no meio, na altura em que a anterior tinha parado.
    setTimeout(() => {
      document
        .querySelectorAll('.pg-screen-scroll, .pg-viewport')
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
      // Núcleo transacional
      case 'checkout':
        return <Checkout go={go} orderId={params.orderId as string | undefined} />;
      case 'prov-financeiro':
        return <ProviderFinanceiro go={go} />;
      case 'admin-financeiro':
        return <AdminFinanceiro go={go} />;
      case 'meus-pedidos':
        return <MeusPedidos go={go} />;
      case 'oportunidades':
        return <Oportunidades go={go} />;
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
        // O chat pertence a um pedido. Sem `orderId` a tela abre em estado
        // vazio explicando isso, em vez de mostrar conversa de ninguém.
        return <Chat go={go} orderId={params.orderId as string | undefined} />;
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

  const isConsumer = CONSUMER_SCREENS.has(route);
  const activeTab = NAV_TAB[route] || 'home';

  return (
    <div className="pg-app">
      <DesktopHeader route={route} isConsumer={isConsumer} activeTab={activeTab} go={go} />
      <div className="pg-stage">
        <div className="pg-phone-wrap">
          <div className="pg-phone">
            {/* O estilo saiu do inline para `.pg-screen-scroll` no CSS. Era
                `overflow: hidden` e recortava o rodapé em janelas baixas —
                ponto 6. Agora rola. */}
            <div className="pg-screen-scroll">
              {/* Um Suspense por tela: a chave força o fallback a reaparecer
                  ao trocar de rota para um módulo ainda não baixado, em vez de
                  segurar a tela anterior congelada. */}
              <Suspense key={route} fallback={<ScreenSkeleton />}>
                {renderScreen()}
              </Suspense>
            </div>
            {/* O BottomNav mora em cliente-auth (2.7k LOC). Carregá-lo com
                fallback nulo evita que a barra puxe o módulo inteiro na
                landing, onde ela nem aparece. */}
            {isConsumer && (
              <Suspense fallback={null}>
                <BottomNav active={activeTab} go={go} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Desktop Header — aparece apenas ≥1024px (CSS controla); em mobile some
// e o BottomNav assume a navegação.
// =====================================================================
const PUBLIC_NAV: ReadonlyArray<readonly [string, string]> = [
  ['landing', 'Início'],
  ['how', 'Como funciona'],
  ['services', 'Solicitar'],
  ['provider-landing', 'Sou prestador'],
];
const CONSUMER_NAV: ReadonlyArray<readonly [string, string]> = [
  ['home', 'Início'],
  ['history-list', 'Pedidos'],
  ['map', 'Mapa'],
  ['notifications', 'Avisos'],
  ['profile', 'Perfil'],
];

function DesktopHeader({
  route,
  isConsumer,
  activeTab,
  go,
}: {
  route: string;
  isConsumer: boolean;
  activeTab: string;
  go: GoFn;
}) {
  const isProvider = route.startsWith('provider') || route === 'prov-signup';
  const isAdmin = route.startsWith('admin');

  let nav: ReadonlyArray<readonly [string, string]>;
  let activeId = route;
  if (isConsumer) {
    nav = CONSUMER_NAV;
    activeId = activeTab;
  } else if (isProvider) {
    nav = [
      ['provider-landing', 'Sobre prestador'],
      ['provider-signup', 'Cadastro'],
      ['provider-dash', 'Painel'],
    ];
  } else if (isAdmin) {
    nav = [
      ['admin-dash', 'Operações'],
      ['admin-dispute', 'Disputa'],
    ];
  } else {
    nav = PUBLIC_NAV;
  }

  return (
    <header className="pg-deskhead">
      <div className="pg-deskhead-inner">
        <button className="pg-deskhead-brand" onClick={() => go(isConsumer ? 'home' : 'landing')}>
          <Logo dark size={26} />
        </button>
        <nav className="pg-deskhead-nav">
          {nav.map(([id, label]) => (
            <button
              key={id}
              onClick={() => go(id)}
              className={`pg-deskhead-link${activeId === id ? ' is-active' : ''}`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="pg-deskhead-cta">
          {isConsumer || isProvider || isAdmin ? (
            <button className="pg-btn pg-btn--sm" onClick={() => go('landing')}>
              Sair
            </button>
          ) : (
            <>
              <button
                className="pg-btn pg-btn--sm"
                style={{
                  background: 'transparent',
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.16)',
                }}
                onClick={() => go('provider-landing')}
              >
                Sou prestador
              </button>
              <button
                className="pg-btn pg-btn--sm"
                style={{
                  background: 'var(--green-500)',
                  color: 'var(--night-900)',
                  border: 'none',
                  fontWeight: 700,
                }}
                onClick={() => go('login')}
              >
                Entrar
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}
