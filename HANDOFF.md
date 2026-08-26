# PAGORA — Estado da sessão (handoff)

> 📄 **Começando agora?** Leia primeiro
> [`docs/status-refatoracao-2026-08-25.md`](docs/status-refatoracao-2026-08-25.md).
> Ele tem o estado da refatoração de UI/UX, a decisão que está aberta esperando
> o dono do produto, e as armadilhas que já custaram tempo nesta sessão.
> **Nada da refatoração foi commitado** — 34 arquivos na árvore de trabalho.

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

### FASE 8 — Refatoração de UI/UX (agosto/2026)

> Auditoria completa do que existia, seguida da jornada nova. Decisão do
> usuário em 25/08: **convivência** (nada some antes da substituta existir) e
> **verde como cor de ação**, laranja reservado para urgência.

**Sistema visual novo — `src/ui/`**

- `tokens.css`: escuro por padrão, escopado em `.pgx`. Não vaza para as telas
  antigas — por isso as 51 rotas continuam no ar sem alteração.
- `kit.tsx`: primitivos em React (`Button`, `Card`, `Field`, `Option`, `Sheet`,
  `Chip`, `Num`, `Timeline`, `RouteLine`…). Acaba o estilo inline
  sobrescrevendo classe, que era o sintoma de classe que nunca cobriu a
  variante necessária.
- `art.tsx`: silhuetas de veículo e caçamba com **escala real compartilhada** —
  a van ocupa metade da carreta na tela porque ocupa metade dela na rua. A
  caçamba de 3 m³ é desenhada menor que a de 8 m³.
- `area.tsx`: uma barra por área (cliente / prestador), em vez de uma barra
  servindo 37 rotas.
- Tipografia: **Archivo** (display) + **IBM Plex Sans** (corpo) + **IBM Plex
  Mono** (dado). Sai a Nunito, arredondada e com voz de app de delivery.

**Jornada nova — `src/flows/`**

Seis telas viram três. Toque na opção avança (não existe "Continuar"
desabilitado esperando escolha); veículo, ajudante e acesso viram detalhes
opcionais com padrão inferido pelo tipo de carga.

| Rota                         | O que é                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `/inicio`                    | Abre pela pergunta, não pelo saldo da carteira          |
| `/pedido/:necessidade`       | Três passos: o quê → onde → quem pode fazer             |
| `/escolher/:requestId`       | Propostas ao vivo, com rótulo de recomendação           |
| `/acompanhar/:orderId`       | Mapa protagonista, timeline, segurança                  |
| `/pedidos` `/conta` `/perto` | Área do cliente                                         |
| `/parceiro*`                 | Casa do prestador: oportunidades, viagem, ganhos, conta |

**Domínio novo — testado**

- `domains/intent/`: lê texto livre ("preciso retirar 3 toneladas de entulho")
  e devolve a necessidade com os termos que a justificam. Tabela de vocabulário
  legível, **não** classificador estatístico.
- `domains/orders/recommend.ts`: rótulos "mais rápido / melhor custo-benefício /
  mais econômico". Regra inegociável: **empate não produz vencedor**, e o
  rótulo perdido NÃO desce para a segunda colocada.
- `domains/pricing/service-pricing.ts`: guincho e caçamba saíram de
  `extra.tsx`, em centavos, **sem fallback silencioso** e com os mesmos
  números que já estavam no ar.
- `domains/providers/`: lista de prestadores aprovados de verdade.
- `lib/timeout.ts`: limite de espera e tradução de erro de rede.
- `routes.ts`: resolução de rota com segmento, testável fora do router.

**Bugs corrigidos no caminho**

1. **Guincho gravava o tipo de acesso como endereço.** `addressesFor` usava
   `s.location ?? s.currentLoc`, e `location` é `'rua' | 'garagem' | …`. Todo
   pedido de guincho saía com `origin_city = null` e o prestador não conseguia
   filtrar por região. Coberto por regressão.
2. **Sem rede, a tela ficava em esqueleto para sempre.** Descoberto verificando
   com o host do Supabase inacessível. O usuário do Pagora está numa obra —
   sinal ruim é o estado normal. Agora há limite de 15 s, mensagem que diz o
   que houve e botão de tentar de novo.
3. **`[object Object]` na tela.** O supabase-js rejeita com objeto simples, não
   `Error`. `loadErrorMessage` normaliza num lugar só.
4. **Cascata de CSS.** `.pgx button { color: inherit }` vale (0,1,1) e vencia
   `.px-btn--primary` (0,1,0): dentro de um bloco de texto cinza, o rótulo do
   botão verde ficava cinza sobre verde.
5. **Dados de demonstração vazando para pedido real.** O `initialState` do
   store trazia "Av. Paulista, 1000" e data 29/04/2026 — num fluxo que grava
   pedido de verdade, endereço falso já preenchido é o pior padrão possível.
6. **Code splitting desfeito.** `flows/pedido.tsx` era importado estática e
   dinamicamente; o chunk do fluxo colava no de entrada. O type guard foi para
   o domínio e o bundle de entrada caiu de 298 kB para 257 kB.
7. **Diagnóstico errado.** Falha de rede aparecia como "não encontramos este
   transporte" — mentira que vira ligação para o suporte.

**Acessibilidade verificada, não presumida**

Contraste AA medido com composição de alpha (todos passam), nenhum alvo de
toque abaixo de 44 px, um `<h1>` por tela sem salto de nível, todo botão de
ícone com nome acessível, todo campo com rótulo, estado nunca comunicado só
por cor.

**413 testes** (era 253), `tsc --noEmit` limpo, ESLint com 0 erros.

**Sobretaxa de urgência do guincho: removida em 25/08/2026.** Era a última
pendência comercial do escopo. `GUINCHO_URGENCY_SURCHARGE_CENTS = 0`, o teste
que garantia o +50% foi invertido em vez de deletado, e a tela antiga
(`extra.tsx`) foi alinhada junto — enquanto duas telas do mesmo serviço
convivem, elas não podem discordar sobre preço. A regra agora é uma só nos
três serviços: quem precisa agora paga o mesmo que quem agenda.

---

### FASE 9 — Distância real, mapa, aposentadoria e avisos (25/08/2026)

Quatro frentes que **não dependem das migrations** — todas rodam contra o
schema `0001`–`0004` que já está no ar.

**1. Places Autocomplete e distância real**

- `domains/geo/distance.ts` decide QUAL distância usar e registra COMO ela foi
  obtida: rota real → linha reta corrigida → padrão do domínio. O rótulo do
  extrato muda junto ("12,4 km por via" / "3,2 km aproximados" / "15,0 km
  estimados"), porque esconder a diferença transforma estimativa em promessa
  quebrada.
- `URBAN_ROAD_FACTOR = 13/10` é escolha de modelagem, nomeada e testada, usada
  **só** quando a rota real falha. Linha reta pura subestima todo trajeto
  urbano de forma sistemática, e subestimar preço faz prestador recusar pedido.
- `ui/address-field.tsx` + `hooks/usePlaces.ts`: com chave, sugere endereço e
  grava coordenada, cidade e UF; **sem chave, é um input de texto comum** — o
  comportamento de hoje, preservado inteiro. O SDK só carrega na tela de
  endereço, não na landing: a chave é cobrada por carregamento.
- `localityFor` passou a preferir o dado estruturado do Places à heurística
  `guessCity`.

  Efeito medido no navegador, no mesmo trajeto: **R$ 360,00 → R$ 218,40**.
  Estava sendo cobrado como 15 km um percurso de 3.

**2. Mapa real**

- `PagoraMap` ganhou `colorScheme` (escuro — o mapa claro do Google sobre
  `#0B0D0F` é um retângulo branco) e `fitToContent`, que enquadra a rota
  inteira em vez de abrir centrado com zoom fixo.
- `tripGeometry` monta marcadores e rota a partir do que o pedido guardou.
  Caçamba tem um ponto só e **não** ganha rota inventada; pedido sem
  coordenada cai na ilustração, e o texto alternativo diz isso.

**3. Telas duplicadas aposentadas**

`proposals`, `compare`, `history-list`, `provider-dash`, `admin-dash` e
`prov-signup` saíram. `phase1.tsx` e `phase4.tsx` foram deletados; os
componentes mortos saíram de `extra.tsx`, `other.tsx` e `cliente-mapa.tsx`.

Aposentar **não foi deletar a rota**: `RETIRED_ROUTES` em `routes.ts`
redireciona cada uma para a substituta, porque link de `#/history-list` já foi
compartilhado por WhatsApp. Há teste garantindo que toda substituta existe e
que nenhuma é, ela mesma, uma rota aposentada — senão vira laço.

**4. Centro de avisos**

- `domains/notifications/feed.ts` **deriva** os avisos das linhas que o usuário
  já pode ler. Não cria tabela: o realtime de `quotes` e `orders` está ligado
  desde a `0002`.
- Regras que os testes protegem: propostas do mesmo pedido viram **um** aviso
  (cinco cartões seriam spam do próprio app); `pending_payment` não avisa
  (é o que o usuário acabou de causar); "a caminho" não avisa o prestador
  (foi ele quem marcou).
- O "lido" mora no `localStorage` por usuário — o único estado não derivável, e
  barato demais para justificar migration.
- Aba "Avisos" na barra do cliente, com selo de não lidos.

**Bugs corrigidos no caminho**

- `guessCity('Rua da Obra, 500')` devolvia `'500'` como cidade. Nenhum
  prestador atende a cidade "500", então o pedido sumia de todo filtro por
  região.
- Caçamba gravava `dest_city` recalculado do mesmo texto da origem, podendo
  divergir do dado estruturado. Agora o destino espelha a origem — é um
  endereço só.
- `providerNetCents` deriva o líquido do prestador quando a coluna da `0007`
  não existe. Um `?? 0` mostrava "Você recebe R$ 0,00" num serviço de R$ 300.

**476 testes** (era 416), `tsc` limpo, ESLint 0 erros.

**Ainda depende da chave do Google:** sugestão de endereço, coordenada e rota
real. Sem ela tudo degrada para o que o app já fazia — nada quebra, e a
estimativa continua rotulada honestamente como estimada.

---

### FASE 10 — Home refeita em tema claro (25/08/2026)

A crítica do usuário foi direta e correta: a refatoração passou pela home sem
resolvê-la. Era uma pilha de blocos do mesmo peso — cabeçalho pequeno, campo,
grade, card. Funcionava e não dizia nada.

A nova copia a ESTRUTURA da referência de rastreio que o produto elegeu, com
três diferenças que são do Pagora:

1. **Fundo branco, hero em gradiente verde.** A referência é amarelo sobre
   preto; aqui o contraste vem do verde saturado contra a página clara.
2. **O hero tem TRÊS estados.** A primeira versão tinha dois, e isso era um
   erro de concepção: "logado sem pedido" caía no estado de visitante, e quem
   já era cliente levava o discurso de vendas de novo toda vez que abria o app.
   Hoje são: visitante (proposta de valor + selos), cliente ocioso ("O que você
   vai transportar hoje?" + atalho para as propostas pendentes) e cliente com
   transporte em andamento (status, código e régua de quatro marcos — o estado
   da referência). A referência do Behance **só sabe existir no terceiro**.
3. **As duas pontas do marketplace na primeira tela.** Quem contrata acha pelos
   círculos; quem quer ser contratado acha pela faixa escura. Estava enterrado
   em Conta.

O campo de busca fica ancorado por cima da borda do hero: lugar fixo, que não
se move quando a laje troca de estado.

**Tema claro por escopo de token.** `<Screen light>` acrescenta `.is-light`, que
redefine os MESMOS tokens `--x-*`. Card, botão, chip e campo continuam sendo os
componentes de sempre — eles nunca souberam a cor, só o nome dela. É assim que
o resto do app vira claro quando for a hora: uma prop por tela, não uma
reescrita.

O verde muda de tom entre os temas de propósito: `#22e3a3` sobre branco dá
1.9:1 e é ilegível. Claro usa `#08996f`. Mesma função, dois valores.

**Bugs encontrados no caminho**

- `--x-safe-t` **nunca existiu** — só `--x-safe-b`. Um token indefinido dentro
  de um `padding` ABREVIADO invalida a declaração inteira: o hero perdia também
  o recuo lateral e encostava nas bordas. O token agora existe, e ele importa
  por si: o hero sangra até o topo e passa por baixo do recorte da câmera.
- `useLiveOrder` fazia `setState` síncrono no corpo do efeito. Não era só
  estilo: em troca de conta, o pedido do usuário anterior aparecia por um
  quadro. Agora o resultado guarda de quem ele é e a leitura confere.
- A arte de veículo preenche a 16% da cor, calibrada para fundo escuro. Sobre
  claro virava fantasma — corrigido com regra que vence o atributo de
  apresentação do SVG.

**479 testes** (era 476), `tsc` limpo, ESLint 0 erros.

Defeitos corrigidos depois de ver a área interna logada: o selo do sino cobria
o próprio sino justamente quando havia aviso, e os cards de pedido saíam com os
textos colados ("FreteAguardando propostas") — `<span>` sem `display: block`,
o mesmo erro cometido três vezes nesta sessão.

⚠️ **Inconsistência aberta, de propósito:** a home é clara e o resto do app
continua escuro. Trocar de aba pisca entre os dois. O mecanismo para resolver
está pronto (`<Screen light>`), mas converter as outras sete telas é decisão
estética que ainda não foi tomada.

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
