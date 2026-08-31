// =====================================================================
// PAGORA — Instalação e atualização
// =====================================================================
// Registro do service worker e a ponte para a tela avisar que existe versão
// nova. Fica fora do React de propósito: precisa rodar no carregamento, uma
// vez, sem depender de nenhuma tela estar montada.
// =====================================================================

const CAMINHO_SW = '/sw.js';

/** Chamado quando há uma versão nova esperando para assumir. */
type AoAtualizar = () => void;

let esperando: ServiceWorker | null = null;

export function registrarServiceWorker(aoAtualizar?: AoAtualizar): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  // Em desenvolvimento o service worker atrapalha mais do que ajuda: serve
  // módulo velho enquanto o Vite recarrega, e o bug parece do código.
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(CAMINHO_SW)
      .then((registro) => {
        registro.addEventListener('updatefound', () => {
          const novo = registro.installing;
          if (!novo) return;
          novo.addEventListener('statechange', () => {
            // `controller` existente quer dizer que já havia uma versão
            // rodando: então isto é atualização, não primeira instalação.
            if (novo.state === 'installed' && navigator.serviceWorker.controller) {
              esperando = novo;
              aoAtualizar?.();
            }
          });
        });
      })
      .catch(() => {
        // Sem service worker o app funciona igual, só perde o offline.
        // Falhar aqui nunca pode derrubar o carregamento.
      });

    // Quando a versão nova assume, recarrega uma vez para a tela passar a
    // usá-la. O guard evita laço se o navegador disparar o evento de novo.
    let recarregou = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (recarregou) return;
      recarregou = true;
      window.location.reload();
    });
  });
}

/** Manda a versão nova assumir agora. */
export function aplicarAtualizacao(): void {
  esperando?.postMessage('pular-espera');
}

// ---------------------------------------------------------------------
// Convite para instalar
// ---------------------------------------------------------------------
// O Chrome no Android dispara `beforeinstallprompt` e deixa guardar o evento
// para abrir o convite na hora certa. O iOS não tem equivalente: lá a
// instalação é manual, pelo menu Compartilhar.

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let convite: PromptEvent | null = null;

export function capturarConviteDeInstalacao(aoFicarDisponivel?: () => void): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    // Sem isto o Chrome mostra a própria barra, em momento que não
    // escolhemos — no meio do fluxo de pedido, por exemplo.
    e.preventDefault();
    convite = e as PromptEvent;
    aoFicarDisponivel?.();
  });
  window.addEventListener('appinstalled', () => {
    convite = null;
  });
}

export function podeInstalar(): boolean {
  return convite !== null;
}

/** Abre o convite nativo. Devolve se a pessoa aceitou. */
export async function instalar(): Promise<boolean> {
  if (!convite) return false;
  await convite.prompt();
  const { outcome } = await convite.userChoice;
  convite = null;
  return outcome === 'accepted';
}

/** Já está rodando instalado? */
export function rodandoInstalado(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS não implementa `display-mode: standalone` na matchMedia antiga.
    ('standalone' in window.navigator && Boolean(window.navigator.standalone))
  );
}

/** iOS instala pelo menu Compartilhar — lá o convite tem que ser instrução. */
export function ehIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS se apresenta como Mac; o toque é o que o denuncia.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

// ---------------------------------------------------------------------
// Aquecer o cache das telas
// ---------------------------------------------------------------------
// O service worker guarda o que passou pela rede. Sem aquecer, "funciona
// offline" valeria só para as telas que a pessoa já tinha aberto — e a
// primeira vez que ela precisasse de Pedidos no subsolo, não teria.
//
// Roda quando o navegador estiver ocioso e só em rede boa: baixar o app
// inteiro no 3G de quem está trabalhando seria cobrar dado alheio.

type Conexao = { saveData?: boolean; effectiveType?: string };

function redeBoaParaAquecer(): boolean {
  const c = (navigator as Navigator & { connection?: Conexao }).connection;
  if (!c) return true; // sem informação, assume que dá
  if (c.saveData) return false;
  return c.effectiveType === '4g' || c.effectiveType === undefined;
}

/**
 * Baixa em segundo plano os módulos das telas que a pessoa ainda não abriu.
 * As funções vêm do próprio `App`, que é quem conhece os `import()`.
 */
export function aquecerTelas(carregadores: ReadonlyArray<() => Promise<unknown>>): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;
  if (!redeBoaParaAquecer()) return;

  const agendar = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 3000));

  agendar(() => {
    // Em série, não em paralelo: um lote de downloads simultâneos disputa
    // banda com o que a pessoa está fazendo agora.
    void carregadores.reduce(
      (fila, carregar) =>
        fila.then(() =>
          carregar().then(
            () => undefined,
            () => undefined,
          ),
        ),
      Promise.resolve(),
    );
  });
}
