import { HashRouter, useNavigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect, type ComponentType } from 'react';

import { resolveRoute } from './routes';
import { parseReferral, rememberReferral } from './domains/referral/referral';
import { needsOnboarding } from './domains/profile/profile.service';
import { useProfile } from './hooks/useProfile';
import { AvisoAtualizacao } from './ui/instalar';
import { LimiteDeErro } from './ui/tela-quebrada';
import { aquecerTelas } from './lib/pwa';
import type { GoFn } from './types';

// `core` fica ESTÁTICO: a landing é a primeira pintura e o Logo é usado pelo
// cabeçalho em todas as rotas. Carregá-lo sob demanda só adiaria o que sempre
// é necessário.
import { Landing, Logo } from './core';
import { isNeedKind } from './domains/intent/intent';

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

const otherModule = () => import('./other');
const ProviderLanding = lazyFrom(otherModule, 'ProviderLanding');
const HowItWorks = lazyFrom(otherModule, 'HowItWorks');

const AdminDispute = lazyFrom(() => import('./phase6'), 'AdminDispute');

const legalModule = () => import('./legal');
const PrivacyPolicy = lazyFrom(legalModule, 'PrivacyPolicy');
const Terms = lazyFrom(legalModule, 'Terms');

// =====================================================================
// Jornada refatorada (2026). Convive com as rotas antigas: nenhuma delas é
// removida antes de a substituta existir e falar com o banco. Ver a auditoria
// e o ledger "preservar / refatorar / aposentar".
// =====================================================================
const Inicio = lazyFrom(() => import('./flows/inicio'), 'Inicio');
const Pedido = lazyFrom(() => import('./flows/pedido'), 'Pedido');
const Escolher = lazyFrom(() => import('./flows/escolher'), 'Escolher');
const Acompanhar = lazyFrom(() => import('./flows/acompanhar'), 'Acompanhar');
const PedidosCliente = lazyFrom(() => import('./flows/pedidos'), 'Pedidos');
const Conta = lazyFrom(() => import('./flows/conta'), 'Conta');
const Avisos = lazyFrom(() => import('./flows/avisos'), 'Avisos');
const Entrar = lazyFrom(() => import('./flows/entrar'), 'Entrar');
const Conversa = lazyFrom(() => import('./flows/conversa'), 'Conversa');
const MinhaRede = lazyFrom(() => import('./flows/minha-rede'), 'MinhaRede');
const Comprovante = lazyFrom(() => import('./flows/comprovante'), 'Comprovante');
const Avaliar = lazyFrom(() => import('./flows/avaliar'), 'Avaliar');
const Disputa = lazyFrom(() => import('./flows/disputa'), 'Disputa');
const MeusDados = lazyFrom(() => import('./flows/meus-dados'), 'MeusDados');
const CadastroTransportador = lazyFrom(
  () => import('./flows/cadastro-transportador'),
  'CadastroTransportador',
);
const Perto = lazyFrom(() => import('./flows/perto'), 'Perto');

const parceiroModule = () => import('./flows/parceiro');
const ParceiroOportunidades = lazyFrom(parceiroModule, 'ParceiroOportunidades');
const ParceiroViagem = lazyFrom(parceiroModule, 'ParceiroViagem');
const ParceiroAvisos = lazyFrom(parceiroModule, 'ParceiroAvisos');
const ParceiroGanhos = lazyFrom(parceiroModule, 'ParceiroGanhos');
const ParceiroConta = lazyFrom(parceiroModule, 'ParceiroConta');

const Checkout = lazyFrom(() => import('./screens/checkout'), 'Checkout');
const ProviderFinanceiro = lazyFrom(
  () => import('./screens/provider-financeiro'),
  'ProviderFinanceiro',
);
const AdminFinanceiro = lazyFrom(() => import('./screens/admin-financeiro'), 'AdminFinanceiro');

// =====================================================================
// PAGORA — Router (HashRouter)
// =====================================================================

/**
 * Telas de cliente e de transportador. Cada uma traz a própria barra
 * (`AreaNav`); estes conjuntos servem só ao cabeçalho de desktop, que
 * precisa saber qual navegação mostrar.
 */
const NEW_CLIENT_SCREENS = new Set([
  'inicio',
  'minha-rede',
  'meus-dados',
  'boas-vindas',
  'comprovante',
  'avaliar',
  'pedido',
  'escolher',
  'acompanhar',
  'pedidos',
  'avisos',
  'conta',
  'perto',
]);
const NEW_PROVIDER_SCREENS = new Set([
  'parceiro',
  'parceiro-viagem',
  'parceiro-avisos',
  'parceiro-ganhos',
  'parceiro-conta',
  'disputa',
]);

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

/**
 * As telas do dia a dia, para o cache do service worker ter todas antes de a
 * rede sumir. Sem isto, "abre offline" valeria só para o que já foi aberto —
 * e a primeira vez que alguém precisasse de Pedidos no subsolo, não teria.
 *
 * Fora da lista de propósito: landing, admin e cadastro de transportador.
 * Ninguém precisa deles sem sinal, e baixá-los custaria dado de quem está
 * trabalhando.
 */
const TELAS_DO_DIA = [
  () => import('./flows/inicio'),
  () => import('./flows/pedidos'),
  () => import('./flows/avisos'),
  () => import('./flows/conta'),
  () => import('./flows/pedido'),
  () => import('./flows/acompanhar'),
  () => import('./flows/escolher'),
  () => import('./flows/parceiro'),
];

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  // Depois que a tela atual está de pé e o navegador está ocioso.
  useEffect(() => {
    aquecerTelas(TELAS_DO_DIA);
  }, []);

  // Indicação: o link da Minha Rede chega como `#/inicio?ref=abc12345`.
  // Guardar na chegada é o que impede que todo compartilhamento feito antes
  // do módulo do divulgador se perca — a atribuição não é recuperável depois.
  useEffect(() => {
    const ref = parseReferral(location.search);
    if (ref) rememberReferral(ref);
  }, [location.search]);

  // Rota derivada do path. Em HashRouter o pathname já vem sem o '#'.
  const { route, slug } = resolveRoute(location.pathname);

  // ---------------------------------------------------------------
  // Portão de apresentação
  // ---------------------------------------------------------------
  // `ensure_profile` cria a linha sem `full_name`, e até agora nada pedia o
  // nome. Quem já tem sessão aberta hoje está exatamente nesse estado — por
  // isso o portão vive aqui, e não na saída do login: gatilho no login só
  // pegaria quem entrasse de novo.
  //
  // Ele só vale para a área de dentro. Landing, termos e a própria tela de
  // boas-vindas seguem livres, senão o app se tranca fora de si mesmo.
  const { profile } = useProfile();
  const areaInterna =
    NEW_CLIENT_SCREENS.has(route) || NEW_PROVIDER_SCREENS.has(route) || route === 'chat';
  const precisaApresentar =
    needsOnboarding(profile) && areaInterna && route !== 'boas-vindas' && route !== 'meus-dados';

  useEffect(() => {
    // `replace`: as boas-vindas não são um lugar para onde voltar.
    if (precisaApresentar) navigate('/boas-vindas', { replace: true });
  }, [precisaApresentar, navigate]);
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
      // Prestador
      case 'provider-landing':
        return <ProviderLanding go={go} />;
      case 'provider-signup':
        return <CadastroTransportador go={go} />;
      case 'admin-dispute':
        return <AdminDispute go={go} />;
      // ---- Jornada refatorada -------------------------------------
      case 'inicio':
        return <Inicio go={go} />;
      case 'pedido': {
        // Sem necessidade no path o fluxo não sabe o que perguntar. Voltar
        // para o início é melhor que abrir um formulário genérico.
        if (!isNeedKind(slug)) return <Inicio go={go} />;
        return (
          <Pedido
            go={go}
            need={slug}
            intentText={params.intentText as string | undefined}
            hints={params.hints as never}
            repeatFrom={params.repeatFrom as never}
          />
        );
      }
      case 'escolher':
        return <Escolher go={go} requestId={slug} />;
      case 'acompanhar':
        return <Acompanhar go={go} orderId={slug} />;
      case 'pedidos':
        return <PedidosCliente go={go} />;
      case 'conta':
        return <Conta go={go} />;
      case 'minha-rede':
        return <MinhaRede go={go} />;
      case 'meus-dados':
        return <MeusDados go={go} />;
      case 'boas-vindas':
        return <MeusDados go={go} welcome />;
      case 'comprovante':
        return <Comprovante go={go} orderId={slug} />;
      case 'avaliar':
        return <Avaliar go={go} orderId={slug} />;
      case 'disputa':
        return <Disputa go={go} orderId={slug} />;
      case 'avisos':
        return <Avisos go={go} />;
      case 'perto':
        return <Perto go={go} />;
      case 'parceiro':
        return <ParceiroOportunidades go={go} />;
      case 'parceiro-avisos':
        return <ParceiroAvisos go={go} />;
      case 'parceiro-viagem':
        return <ParceiroViagem go={go} />;
      case 'parceiro-ganhos':
        return <ParceiroGanhos go={go} />;
      case 'parceiro-conta':
        return <ParceiroConta go={go} />;
      // Núcleo transacional
      case 'checkout':
        return <Checkout go={go} orderId={params.orderId as string | undefined} />;
      case 'prov-financeiro':
        return <ProviderFinanceiro go={go} />;
      case 'admin-financeiro':
        return <AdminFinanceiro go={go} />;
      // Cliente autenticado
      case 'login':
        return <Entrar go={go} />;
      case 'chat':
        // O chat pertence a um pedido. Sem `orderId` a tela abre em estado
        // vazio explicando isso, em vez de mostrar conversa de ninguém.
        return <Conversa go={go} orderId={params.orderId as string | undefined} />;
      case 'privacidade':
        return <PrivacyPolicy go={go} />;
      case 'termos':
        return <Terms go={go} />;
      default:
        return <Landing go={go} />;
    }
  };

  // O cabeçalho de desktop precisa saber qual navegação mostrar.
  const isConsumer = NEW_CLIENT_SCREENS.has(route) || route === 'chat' || route === 'checkout';

  return (
    <div className="pg-app">
      <AvisoAtualizacao />
      <DesktopHeader route={route} isConsumer={isConsumer} go={go} />
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
              {/* O limite tem que ficar POR FORA do Suspense: o erro que
                  importa é o do próprio carregamento do módulo, e ele sobe
                  pelo Suspense. Sem isto o app inteiro fica em branco quando
                  um pedaço não baixa — verificado offline. */}
              <LimiteDeErro chave={route}>
                <Suspense key={route} fallback={<ScreenSkeleton />}>
                  {renderScreen()}
                </Suspense>
              </LimiteDeErro>
            </div>
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
  ['inicio', 'Início'],
  ['pedidos', 'Pedidos'],
  ['avisos', 'Avisos'],
  ['perto', 'Perto'],
  ['parceiro', 'Sou transportador'],
];

function DesktopHeader({
  route,
  isConsumer,
  go,
}: {
  route: string;
  isConsumer: boolean;
  go: GoFn;
}) {
  // Conjunto explícito em vez de `startsWith('parceiro')`: o prefixo pegaria
  // qualquer rota futura que comece com a mesma palavra e a jogaria na
  // navegação de prestador sem ninguém decidir isso.
  const isProvider = route.startsWith('provider') || NEW_PROVIDER_SCREENS.has(route);
  const isAdmin = route.startsWith('admin');

  let nav: ReadonlyArray<readonly [string, string]>;
  const activeId = route;
  if (isConsumer) {
    nav = CONSUMER_NAV;
  } else if (isProvider) {
    nav = [
      ['parceiro', 'Oportunidades'],
      ['parceiro-viagem', 'Viagem'],
      ['parceiro-avisos', 'Avisos'],
      ['parceiro-ganhos', 'Ganhos'],
      ['parceiro-conta', 'Conta'],
    ];
  } else if (isAdmin) {
    nav = [
      ['admin-financeiro', 'Financeiro'],
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
