# Deploy — Cloudflare Pages

O PAGORA sobe pela **integração nativa do Cloudflare Pages com o GitHub**: você
dá `git push` na `main` e o Cloudflare builda e publica sozinho.

> **Mudou em 30/09/2026.** Antes este arquivo mandava o oposto — publicar por
> GitHub Actions e _não_ conectar o Cloudflare ao repositório. Aquele caminho
> roda o deploy fora do Cloudflare e por isso exige `CLOUDFLARE_API_TOKEN` e
> `CLOUDFLARE_ACCOUNT_ID` como secrets, além de todas as `VITE_*`. Oito deploys
> falharam nessa configuração. A integração nativa faz o mesmo sem credencial
> nenhuma no GitHub.

## 1. Conectar o repositório

Cloudflare → **Workers & Pages** → **Create application** → **Pages** →
**Connect to Git** → autorize e escolha `olefootdev/pagora`.

| Campo                  | Valor                                            |
| ---------------------- | ------------------------------------------------ |
| Production branch      | `main`                                           |
| Framework preset       | None (ou Vite)                                   |
| Build command          | `npm run typecheck && npm test && npm run build` |
| Build output directory | `dist`                                           |
| Node version           | 22                                               |

O build command inclui typecheck e testes de propósito: se algo quebrar, o
Cloudflare aborta antes de publicar. É o mesmo portão que o CI do GitHub faz
nos PRs, aplicado também no deploy.

Para deploy mais rápido, `npm run build` sozinho também funciona — o portão
passa a existir só no PR.

## 2. Variáveis de ambiente

No projeto → **Settings → Environment variables** → **Production** (e
**Preview**, se quiser os previews funcionando):

| Nome                       | Valor                                       |
| -------------------------- | ------------------------------------------- |
| `VITE_SUPABASE_URL`        | `https://mibdmoralhjmwfuxmxiu.supabase.co`  |
| `VITE_SUPABASE_ANON_KEY`   | a chave `anon` em Supabase → Settings → API |
| `VITE_PAGORA_WPP_NUMBER`   | número da central, E.164 sem `+`            |
| `VITE_GOOGLE_MAPS_API_KEY` | opcional — Places e distância real de rota  |
| `VITE_GA4_ID`              | opcional — `G-XXXXXXXXXX`                   |
| `VITE_META_PIXEL_ID`       | opcional — ID numérico                      |

As duas primeiras são **obrigatórias**. Sem elas o build falha de propósito —
ver a guarda em `vite.config.js`. Isso é intencional: `VITE_*` é substituída por
literal em tempo de build, então variável ausente não daria erro, daria um app
que compila, publica, abre e não fala com o banco. Deploy verde escondendo
formulário que engole cadastro.

> A `anon key` **não é secreta**: ela é compilada dentro do JavaScript e
> qualquer visitante lê no navegador. Quem protege o banco é a RLS. Nunca
> coloque a `service_role` aqui — essa vive só em Edge Function.

## 3. Domínio

Projeto `pagora` → **Custom domains** → **Set up a custom domain** →
`pagorapro.com`, e repita para `www.pagorapro.com`.

Como o domínio já está no Cloudflare, o DNS é resolvido automaticamente.

## 4. Depois do primeiro deploy

```bash
# as variáveis entraram no bundle?
curl -s https://pagorapro.com/assets/index-*.js | grep -c mibdmoralhjmwfuxmxiu   # > 0

# o preview social responde?
curl -sI https://pagorapro.com/og-image.png | head -1                            # 200
```

E revalide a prévia em <https://developers.facebook.com/tools/debug/> — o
Facebook e o WhatsApp cacheiam `og:image` de forma agressiva, e uma primeira
leitura com 404 fica gravada.

O teste que prova tudo de uma vez: preencha a waitlist no site e confira se a
linha chegou em `pagora.waitlist`. Isso valida a chave, o schema exposto no
PostgREST e a RLS numa tacada.

## 5. Pré-requisitos no Supabase

- Migrations aplicadas em `mibdmoralhjmwfuxmxiu` — ver `supabase/migrations/README.md`
- **Settings → API → Exposed schemas** com `pagora` na lista

Sem o schema exposto, o PostgREST não enxerga as tabelas e nenhuma tela fala com
o banco, mesmo com a chave correta.

## O que o GitHub Actions faz agora

`.github/workflows/ci.yml` roda **só verificação**: typecheck, lint e testes, em
push na `main` e em todo PR. Não publica nada e não usa secret nenhum.
