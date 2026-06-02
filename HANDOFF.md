# PAGORA — Estado da sessão (handoff)

> Última atualização: maio 2026. Próxima sessão começa com Google Maps API key.

---

## ✅ Fases concluídas

### FASE 0 — Limpeza

- Deletados `phase2.jsx` (665 LOC mock) e `phase5.jsx` (964 LOC dashboards inventados)
- Trim `phase1/3/4/6` → só componentes salvos
- Rename `app_original` → `cliente-auth`, `app2` → `cliente-mapa`
- `App.jsx`: 89 → 49 rotas
- **11.308 → 6.176 LOC (−45%)**

### FASE 1 — Refundação técnica

- **TypeScript strict** em todos os 14 arquivos (`.jsx` → `.tsx`)
- `window.PagoraXxx` eliminado — ES modules em todos os arquivos
- React Router v7 (HashRouter)
- Zustand store em `src/store.ts`
- ESLint + Prettier + Husky + Vitest configurados
- 4 testes de pricing (calcFrete), incluindo doc do bug `van=baú` (`0||50`)
- **311 → 0 erros TS strict**

### FASE 2 — Backend Supabase

- Schema `pagora.*` aplicado no projeto `kigmdcjpgmvsyiuqadct`
- 9 tabelas + 7 enums + 3 RPCs (`ensure_profile`, `become_provider`, `accept_quote`)
- RLS deny-by-default em todas as tabelas
- Phone OTP funcionando com test numbers (zero custo Twilio)
- Cliente supabase-js + hooks `useSession`/`useProfile`
- Login screen wireada ponta-a-ponta — **smoke test passou**:
  `(11) 99999-9999` + `123456` → `auth.users` row → `pagora.profiles` row → `/onboarding`

### FASE 4a — Polish foundation

- Fonts: Inter+JetBrains → **Plus Jakarta Sans + Nunito + JetBrains Mono**
- 162 → 23 hex hardcoded migrados para `var(--*)` (perl com lookbehind protegendo SVG attrs)
- Os 23 restantes são SVG `fill=`/`stroke=`/`color=` em paths/circles — só morrem quando Locator/ProvidersMap virarem GoogleMaps real (FASE 3)

---

## 🔴 Pendente — VOCÊ precisa fazer

### 1. Revogar PAT do Supabase

👉 https://supabase.com/dashboard/account/tokens
Procura `sbp_f1a7cfc...` e clica **Revoke**. Esse token deu acesso total à conta — usei pra setar PostgREST + Auth via Management API. Não preciso mais.

### 2. Limpar lixo no Olefoot

Durante o incidente do MCP scoped pro projeto errado, criei 9 tabelas `pagora.*` no projeto **Olefoot** por engano (não toquei em `public.*`, mas é poluição):

```sql
-- No SQL Editor do projeto xtuveikgwlgbcleloxia (Olefoot):
DROP SCHEMA IF EXISTS pagora CASCADE;
```

### 3. Criar Google Maps API key

Pra próxima sessão atacar FASE 3 (Maps).

**Passos:**

1. https://console.cloud.google.com/google/maps-apis/credentials
2. Garante billing ativo (free tier $200/mês cobre Pagora MVP confortavelmente)
3. **Create credentials → API Key**
4. **Restrict key:**
   - Application restrictions → HTTP referrers:
     - `http://localhost:5173/*`
     - Seu domínio futuro (ex: `https://pagora.com.br/*`)
   - API restrictions → habilitar SÓ:
     - Maps JavaScript API
     - Directions API
     - Places API (New)
     - Geocoding API
5. Adiciona em `.env.local`:
   ```
   VITE_GOOGLE_MAPS_API_KEY=AIza...
   ```

---

## 📋 Roadmap pendente (por sessão)

### FASE 3 — Maps (próxima sessão)

- [ ] #47 Setup Google Maps + `@vis.gl/react-google-maps`
- [ ] #48 Locator real: GoogleMap + Directions polyline + marker animado
- [ ] #49 ProvidersMap real: markers + InfoWindow + filtros
- [ ] #50 Frete2 com PlacesAutocomplete (origem/destino)

### FASE 4 — Polish (depois de Maps)

- [ ] #53 Componentes primitivos `<Button>` `<Card>` `<Input>` `<Field>` `<Sheet>` `<Modal>`
- [ ] #54 Masks (`imask`) + `react-hook-form` + `zod` no Login/Frete/ProvSignup
- [ ] #55 A11y pass (ARIA, focus trap, Esc, keyboard nav)
- [ ] #56 Responsivo desktop (breakpoints sm/md/lg)
- [ ] #57 Page transitions (Framer Motion ou view-transitions)

### FASE 5 — Painéis prestador & admin (a decidir)

- Prestador: pedidos, ganhos, saque Pix
- Admin: disputas (shell pronto), aprovação de prestador, métricas básicas

### Adiados explicitamente

- Pix / pagamento real
- Disputa fim-a-fim
- WhatsApp Business API
- Push notifications
- React Native / PWA

---

## 🗂️ Estado do código

```
pagora-web/
├── HANDOFF.md                    ← você está aqui
├── supabase/
│   └── migrations/
│       ├── 0001_initial_schema.sql   ← aplicado em kigmdcjpgmvsyiuqadct
│       └── 0002_rls_policies.sql     ← aplicado em kigmdcjpgmvsyiuqadct
├── src/
│   ├── App.tsx              # router + Zustand
│   ├── main.tsx
│   ├── store.ts             # usePagoraStore (Zustand)
│   ├── types.ts             # ScreenProps, FlowScreenProps, etc.
│   ├── lib/
│   │   ├── supabase.ts      # cliente scoped a schema 'pagora'
│   │   ├── auth.ts          # signInWithPhone, verifyOtp, ensureProfile
│   │   └── database.types.ts # tipos hand-crafted
│   ├── hooks/
│   │   ├── useSession.ts
│   │   └── useProfile.ts    # lazy ensure_profile()
│   ├── pagora.css           # tokens + utilities (Plus Jakarta Sans agora)
│   ├── icons.tsx, core.tsx
│   ├── frete.tsx, extra.tsx
│   ├── other.tsx, cliente-auth.tsx, cliente-mapa.tsx, locator.tsx
│   └── phase1.tsx, phase3.tsx, phase4.tsx, phase6.tsx
├── .env.local               # gitignored, tem VITE_SUPABASE_*
├── .env.example
├── tsconfig.json            # strict + allowJs + noUncheckedIndexedAccess
├── vitest.config.ts
├── eslint.config.js
└── package.json
```

**Comandos pra rodar:**

```bash
npm run dev         # vite dev server
npm test            # vitest
npm run typecheck   # tsc --noEmit
npm run build       # vite build
npm run lint        # eslint
npm run format      # prettier --write
```

---

## 🐛 Bug conhecido (documentado, não corrigido)

`src/frete.tsx` — `calcFrete`:

```js
const VEHICLE_PRICE = { van: 0, bau: 50, grande: 130 };
const vehicle = VEHICLE_PRICE[s.vehicle ?? ''] || 50;
// BUG: van retorna 0, mas 0 || 50 === 50 → user paga preço de baú.
// Fix exige autorização de produto (muda preço final pra usuários de van).
```

Teste em `src/frete.test.ts` documenta com `expect(van.low).toBe(bau.low)` — quando fixar, vira `.not.toBe()`.

---

## 📚 Documentos de referência

- `pagora-design-system.md` — paleta, fonts, componentes spec
- `docs/pagora_layouts_CORRIGIDO.md` — layouts originais
- `pagora-identidadevisual.pdf` — brand guidelines

Quando voltar com a chave Google: cola num arquivo `.env.local`, me dá um "vai" e ataco o Locator real primeiro.
