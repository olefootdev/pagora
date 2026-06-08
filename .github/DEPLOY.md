# Deploy — Cloudflare Pages

Setup mínimo pra colocar pagora.com.br no ar via `git push origin main`.

## 1. Criar o projeto no Cloudflare

1. Dashboard Cloudflare → **Workers & Pages → Create application → Pages → Direct Upload**
2. Nome do projeto: `pagora` (precisa bater com `--project-name=pagora` no workflow)
3. Production branch: `main`
4. _Não conecte ao GitHub pelo Cloudflare_ — quem dispara o deploy é o GH Action

## 2. Secrets do GitHub

Settings → Secrets and variables → Actions → **New repository secret**. Necessários:

| Secret                   | Onde achar                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`   | Cloudflare → My Profile → API Tokens → "Edit Cloudflare Workers" template (escopo Pages: Edit) |
| `CLOUDFLARE_ACCOUNT_ID`  | Dashboard CF → home da conta, sidebar direita                                                  |
| `VITE_SUPABASE_URL`      | Supabase → Project → API → URL                                                                 |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project → API → `anon` `public`                                                     |
| `VITE_PAGORA_WPP_NUMBER` | Número da central, E.164 sem `+` (ex.: `5511999999999`)                                        |
| `VITE_GA4_ID`            | GA4 → Admin → Data streams → Measurement ID (`G-XXXXXXXXXX`)                                   |
| `VITE_META_PIXEL_ID`     | Meta Events Manager → Pixel ID (15-16 dígitos)                                                 |

Vars `VITE_*` são **inlined no bundle no momento do build**. Não dá pra trocar via dashboard do Cloudflare depois — precisa ser secret do GH Actions.

## 3. Domínio custom

Cloudflare Pages → projeto `pagora` → **Custom domains → Set up a custom domain** → `pagora.com.br` e `www.pagora.com.br`. Registrar DNS no painel do registrador (Registro.br ou onde for) apontando pros nameservers do Cloudflare, OU adicionando os 2 CNAMEs que o Pages mostrar.

## 4. Primeiro deploy

```bash
git push origin main
```

O workflow `.github/workflows/deploy.yml` roda typecheck → test → build → `wrangler pages deploy ./dist`. URL temporária: `pagora.pages.dev`.

## 5. Aplicar migrations Supabase antes do primeiro tráfego real

```bash
# Com a Supabase CLI linkada no projeto kigmdcjpgmvsyiuqadct:
supabase db push

# Ou cole cada arquivo no SQL Editor manualmente, em ordem:
#   supabase/migrations/0001_initial_schema.sql
#   supabase/migrations/0002_rls_policies.sql
#   supabase/migrations/0003_waitlist.sql
#   supabase/migrations/0004_provider_applications.sql
```

## 6. Pós-deploy

- Converter `public/og-image.svg` → `public/og-image.png` (rode `npx svgexport public/og-image.svg public/og-image.png 1200:630` e comite o PNG). Sem isso, prévias do WhatsApp/Facebook mostram broken image.
- Testar a URL no Facebook Debugger: <https://developers.facebook.com/tools/debug/>
- Testar no WhatsApp: mandar a URL pra si mesmo e checar a prévia.
