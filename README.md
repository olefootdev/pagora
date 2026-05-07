# Pagora Web — Protótipo Vite

Protótipo visual completo do Pagora, migrado de HTML+Babel para Vite+React.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Acesse http://localhost:5173

## Build

```bash
npm run build
# output em dist/
```

## Deploy na Cloudflare Pages

### Via Dashboard (recomendado)

1. Acesse https://dash.cloudflare.com → Pages → Create a project
2. Conecte o repositório GitHub (ou faça upload direto da pasta `dist/`)
3. Configure:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `pagora-web` (se o repo for o monorepo `/pagora`)
4. Clique em **Save and Deploy**

### Via CLI (Wrangler)

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy dist --project-name=pagora
```

### Deploy direto (sem git)

```bash
npm run build
npx wrangler pages deploy dist --project-name=pagora
```

## Estrutura

```
src/
  globals.js      # expõe React no window para os JSX legados
  icons.jsx       # ícones SVG
  core.jsx        # StatusBar, TopBar, Logo, Landing
  frete.jsx       # fluxo frete (4 passos)
  other.jsx       # prestador landing/signup/dash, admin
  extra.jsx       # guincho, caçamba, propostas
  app.jsx         # cliente autenticado (login, home, tracking...)
  app2.jsx        # mapa, notificações, perfil, carteira...
  locator.jsx     # localizador prestador em tempo real
  phase1-6.jsx    # fases completas cliente + prestador + admin
  App.jsx         # roteador principal (hash routing)
  main.jsx        # entry point
  pagora.css      # design system completo
```

## Telas disponíveis (70+)

Navegue pelo menu lateral no desktop ou acesse via hash:
- `/#landing` — Landing page
- `/#frete-1` — Início do fluxo de frete
- `/#provider-landing` — Área do prestador
- `/#admin-dash` — Dashboard admin
- ... e mais 66 telas
