/* =====================================================================
   PAGORA — Service worker
   =====================================================================
   O app é usado por quem dirige: pátio de obra, subsolo, estrada com 3G
   ruim. Sem service worker, qualquer oscilação de sinal troca o Pagora pela
   tela de erro do navegador — e a pessoa conclui que o app quebrou.

   O QUE ELE FAZ, e o que NÃO faz:

   - Faz o app ABRIR sem rede: casca, JavaScript, CSS, fontes e as fotos da
     frota vêm do cache.
   - NÃO inventa dados. Pedido, proposta e conversa vêm do Supabase e
     continuam precisando de rede — offline, as telas mostram o mesmo estado
     de erro honesto de sempre. Cachear resposta de API aqui significaria
     mostrar preço velho como se fosse atual, e preço errado é o bug
     fundador deste produto.

   Estratégias, por tipo de pedido:

   - Navegação (o HTML): rede primeiro, cache depois. O HTML não tem hash no
     nome, então servir do cache primeiro deixaria a pessoa presa numa versão
     antiga do app sem nenhuma forma de sair.
   - Estático com hash (`/assets/*`): cache primeiro, para sempre. O Vite põe
     o hash do conteúdo no nome; se mudou o conteúdo, mudou a URL. Não existe
     versão velha para vazar.
   - Ícone e manifest: cache primeiro com revalidação em segundo plano.
   - Supabase e qualquer outra origem: passa direto, sem tocar.
   ===================================================================== */

// Trocar esta versão descarta os caches antigos na ativação.
const VERSAO = 'pagora-v1';
const CASCA = `${VERSAO}-casca`;
const ESTATICO = `${VERSAO}-estatico`;

// O mínimo para a casca subir offline. O resto entra conforme é usado — uma
// lista fixa de assets com hash ficaria velha a cada build.
const ESSENCIAL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CASCA)
      // `addAll` falha inteiro se um item falhar; aqui um ícone ausente não
      // pode impedir o service worker de instalar.
      .then((cache) => Promise.allSettled(ESSENCIAL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Estático versionado pelo Vite: o nome já carrega o hash do conteúdo. */
function temHash(url) {
  return url.pathname.startsWith('/assets/');
}

function ehIconeOuManifest(url) {
  return /\.(png|svg|webmanifest|ico)$/.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Só GET. POST/PATCH são escrita — cachear seria inventar resultado.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Outra origem (Supabase, Google Fonts, Maps): não é nosso, não mexemos.
  if (url.origin !== self.location.origin) return;

  // --- Navegação: rede primeiro ---------------------------------------
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone();
          void caches.open(CASCA).then((c) => c.put('/index.html', copia));
          return resposta;
        })
        .catch(async () => {
          const cache = await caches.open(CASCA);
          // A rota real vive no hash (`#/inicio`), então uma casca serve
          // todas as telas — o roteador resolve o resto no cliente.
          return (await cache.match('/index.html')) ?? (await cache.match('/')) ?? Response.error();
        }),
    );
    return;
  }

  // --- Estático com hash: cache primeiro, definitivo -------------------
  if (temHash(url)) {
    event.respondWith(
      caches.match(request).then(
        (emCache) =>
          emCache ??
          fetch(request).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone();
              void caches.open(ESTATICO).then((c) => c.put(request, copia));
            }
            return resposta;
          }),
      ),
    );
    return;
  }

  // --- Ícone e manifest: cache primeiro, atualiza atrás ----------------
  if (ehIconeOuManifest(url)) {
    event.respondWith(
      caches.open(ESTATICO).then(async (cache) => {
        const emCache = await cache.match(request);
        const daRede = fetch(request)
          .then((resposta) => {
            if (resposta.ok) void cache.put(request, resposta.clone());
            return resposta;
          })
          .catch(() => emCache);
        return emCache ?? daRede;
      }),
    );
  }
});

// A tela pede a troca quando o usuário aceita atualizar.
self.addEventListener('message', (event) => {
  if (event.data === 'pular-espera') void self.skipWaiting();
});
