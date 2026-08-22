# PAGORA — Estado da sessão (handoff)

> Última atualização: **14/08/2026**. Núcleo transacional (Pix + ledger + saque)
> implementado no código; **falta aplicar as migrations e configurar o Asaas**.

---

## 🔴 O QUE VOCÊ PRECISA FAZER ANTES DE QUALQUER COISA

As migrations `0005`–`0008` e as quatro Edge Functions estão escritas mas
**nunca foram executadas contra um Postgres** — não havia Docker nem acesso ao
projeto remoto na sessão em que foram criadas. Trate-as como código não
testado até rodar:

```bash
supabase link --project-ref kigmdcjpgmvsyiuqadct
supabase db push          # aplica 0005 → 0008
npm run db:types          # gera os tipos de verdade e compara com o manual
```

Depois, os secrets e o deploy das funções: ver `supabase/README.md`.

⚠️ A `0006_rls_hardening.sql` **revoga privilégios de escrita** de todas as
tabelas do schema. Se alguma tela quebrar com "permission denied", é isso —
e é intencional. A coluna que faltou precisa entrar num `grant ... (coluna)`
explícito, nunca num `grant all`.

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

### FASE 5 — Núcleo transacional (agosto/2026)

- **Bug de preço corrigido**: `van` custa R$ 0 de sobretaxa, não R$ 50. O
  fallback silencioso saiu; veículo desconhecido agora estoura.
- **Domínio extraído**: `src/domains/{money,pricing,orders,payments,wallets}`.
  Dinheiro é inteiro em centavos, com a aritmética espelhada bit a bit em SQL.
- **RLS endurecida** (`0006`): quatro brechas fechadas — cliente podia
  reescrever o preço da proposta e o status do pedido; prestador podia resolver
  a própria disputa. `orders` virou somente-leitura via PostgREST.
- **Modelo financeiro** (`0007`): `payments`, `payment_events` (idempotência de
  webhook), `withdrawals`, ledger append-only com buckets `pending`/`available`,
  e a máquina de estados como tabela.
- **Funções server-side** (`0008`): 22 funções, todas as que movem dinheiro
  concedidas só a `service_role`.
- **Edge Functions**: `create-payment`, `asaas-webhook`, `request-withdrawal`,
  `create-provider-account`, `advance-order`.
- **Telas transacionais reais** (`src/screens/`): `checkout` (Pix com QR,
  copia-e-cola e confirmação por Realtime), `meus-pedidos`, `prov-financeiro`
  (saldo, extrato, saque) e `admin-financeiro` (aprovação, trilha do dinheiro,
  saúde do webhook).
- **155 testes** (era 4), sendo 39 de integração contra Postgres real via
  PGlite — as migrations rodam de verdade em `npm run test:db`.

### FASE 6 — Acabamento (agosto/2026)

> **Pagamento está PARADO por decisão de negócio** — retoma quando a conta
> bancária da empresa abrir. As migrations `0005`–`0008` e as Edge Functions do
> Asaas continuam escritas e testadas; não precisam ser aplicadas agora.

- **Migration 0009**: rate limit nos formulários públicos (5/hora por IP,
  3/hora por telefone) e `providers.rating_avg` finalmente calculado por
  trigger — a coluna existia desde a 0001 e mostrava 0 para todo mundo.
- **Validação brasileira** (`src/domains/validation/`): CPF e CNPJ com dígito
  verificador real, celular, CEP, placa (antiga e Mercosul), chave Pix.
  39 testes.
- **Formulários que escrevem no banco** ganharam validação e máscara:
  cadastro de prestador e login. O login exigia `phone.length >= 14`, que conta
  caracteres da máscara — agora exige celular plausível antes de gastar SMS.
- **Code splitting por módulo**: bundle de entrada 807 kB → **452 kB**
  (gzip 212 → 130 kB).
- **Google Maps** integrado com degradação: sem `VITE_GOOGLE_MAPS_API_KEY` as
  telas caem na ilustração estática e nada quebra.
- **210 testes.**

---

### FASE 7 — Fluxo de descoberta (agosto/2026)

O loop agora fecha sem pagamento: **publicar → propor → aceitar**.

- `PublishRequestButton` nas três telas de resumo grava `service_request` de
  verdade. O WhatsApp virou botão secundário, não sumiu.
- Tela **Oportunidades** (`/oportunidades`): prestador vê pedidos abertos e
  envia proposta, com o líquido depois da comissão visível **antes** de enviar.
- **Meus pedidos** passou a listar pedidos aguardando proposta, mostrar as
  propostas recebidas com nota do prestador, e aceitar — o aceite cria a order
  e leva ao checkout.

Caminho completo hoje: pedido publicado → prestador propõe → cliente aceita →
order nasce em `pending_payment` → checkout Pix. Só o último passo depende da
conta bancária.

---

**As telas antigas continuam mock.** `proposals`, `compare`, `tracking`,
`history-list`, `provider-dash` e `admin-dash` seguem com dados fixos no
código. As telas novas são as únicas que falam com o banco; cada painel antigo
ganhou um botão levando à versão real. Unificar as duas é o trabalho que resta
depois de ligar o fluxo de descoberta (criar pedido → receber propostas).

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

## ✅ Bug de preço — CORRIGIDO (agosto/2026)

O antigo `VEHICLE_PRICE[x] || 50` transformava `van: 0` em 50 e cobrava preço
de baú de quem escolhia van. A regra agora vive em
`src/domains/pricing/frete-pricing.ts`, sem fallback: veículo ausente ou
desconhecido levanta `PricingInputError` em vez de virar o preço de outro.

**Impacto comercial:** frete de van ficou R$ 50 mais barato. O teste em
`src/frete.test.ts` virou regressão permanente (`bau.low - van.low === 50`).
Se a intenção do produto era mesmo cobrar R$ 50 na van, o certo é mudar
`VEHICLE_SURCHARGE_CENTS.van` para `5_000` — não reintroduzir o `||`.

---

## 📚 Documentos de referência

- `pagora-design-system.md` — paleta, fonts, componentes spec
- `docs/pagora_layouts_CORRIGIDO.md` — layouts originais
- `pagora-identidadevisual.pdf` — brand guidelines

Quando voltar com a chave Google: cola num arquivo `.env.local`, me dá um "vai" e ataco o Locator real primeiro.
