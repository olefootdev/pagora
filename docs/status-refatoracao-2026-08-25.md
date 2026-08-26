# PAGORA — Status da refatoração de UI/UX

> **Snapshot de 25/08/2026.** Escrito para quem pegar o trabalho a partir daqui.
> O último commit é `6bcbf74`. **Nada desta sessão foi commitado** — são 34
> arquivos modificados/novos na árvore de trabalho.

---

## 1. Onde o trabalho parou

A refatoração pedida foi feita: existe um sistema visual novo (`src/ui/`), uma
jornada de três passos (`src/flows/`), e a home foi reconstruída em tema claro
seguindo a referência de rastreio que o produto elegeu.

**A última coisa entregue foi a home interna**, e ela é o ponto quente: o
usuário cobrou — com razão — que a refatoração tinha passado por ela sem
resolvê-la. Foi refeita duas vezes na mesma sessão, e a segunda vez corrigiu um
erro de concepção meu (ver seção 4).

**A pergunta aberta na mesa** está na seção 5. Nada mais deve ser construído
sobre a home antes dela ser respondida.

---

## 2. Verificação — o estado é bom

```
479 testes passando  (28 arquivos)
tsc --noEmit         limpo
eslint               0 erros, 5 avisos (todos em arquivos legados)
vite build           limpo
```

Os 5 avisos são variáveis não usadas em `cliente-mapa.tsx`, `frete.tsx`,
`icons.tsx` e `locator.tsx` — arquivos legados que estão na fila de
aposentadoria. Não introduza avisos novos.

```bash
npm test          # tudo
npm run test:db   # integração contra Postgres real via PGlite
npm run typecheck
npm run lint
npm run dev
```

---

## 3. O que foi feito nesta sessão

### 3.1 Auditoria

Documento publicado com arquitetura atual, inventário de telas (real × maquete),
problemas de UX numerados com evidência, e a nova arquitetura de navegação.
As conclusões dela guiaram todo o resto.

### 3.2 Sobretaxa de urgência do guincho — removida

Era a última pendência comercial em aberto. `GUINCHO_URGENCY_SURCHARGE_CENTS = 0`
em `src/domains/pricing/service-pricing.ts`. O teste que garantia o +50% foi
**invertido, não deletado** — hoje prova que "agora" custa igual a "agendado".
A tela antiga (`extra.tsx`) foi alinhada junto: enquanto duas telas do mesmo
serviço convivem, elas não podem discordar sobre preço.

Regra agora única nos três serviços: `urgency` é coletado e enviado ao
prestador, mas **não entra no preço**.

### 3.3 Distância real (`src/domains/geo/`)

O maior erro de preço que o produto tinha: **todo frete era calculado sobre
15 km fixos**, de 2 km a 60 km igualmente.

`resolveDistance()` escolhe a melhor distância disponível e **registra como ela
foi obtida**: rota real → linha reta corrigida → padrão. O rótulo do extrato
muda junto ("12,4 km por via" / "3,2 km aproximados" / "15,0 km estimados").

`URBAN_ROAD_FACTOR = 13/10` é escolha de modelagem, nomeada e testada, usada
**só** quando a rota real falha. Linha reta pura subestima todo trajeto urbano
de forma sistemática, e subestimar preço faz prestador recusar pedido.

Efeito medido no navegador, mesmo trajeto: **R$ 360,00 → R$ 218,40**.

### 3.4 Places Autocomplete e mapa real

`src/ui/address-field.tsx` + `src/hooks/usePlaces.ts`. Com chave do Google,
sugere endereço e grava coordenada, cidade e UF. **Sem chave, é um input de
texto comum** — o comportamento anterior, preservado inteiro.

`PagoraMap` ganhou `colorScheme` (escuro) e `fitToContent`. `tripGeometry()`
monta marcadores e rota a partir do que o pedido guardou; caçamba tem um ponto
só e não ganha rota inventada.

**Tudo isto está inerte até `VITE_GOOGLE_MAPS_API_KEY` existir.**

### 3.5 Seis rotas aposentadas

`proposals`, `compare`, `history-list`, `provider-dash`, `admin-dash`,
`prov-signup`. `phase1.tsx` e `phase4.tsx` deletados.

**Aposentar não foi deletar a rota:** `RETIRED_ROUTES` em `src/routes.ts`
redireciona cada uma para a substituta, porque link antigo já circulou por
WhatsApp. Há teste garantindo que toda substituta existe e que nenhuma é, ela
mesma, uma aposentada — senão vira laço.

### 3.6 Centro de avisos (`src/domains/notifications/`)

Sem migration nova: os avisos são **derivados** das linhas que o usuário já pode
ler, e o realtime de `quotes` e `orders` está ligado desde a `0002`.

Regras que os testes protegem, e que são de produto: propostas do mesmo pedido
viram **um** aviso; `pending_payment` não avisa (é o que o usuário acabou de
causar); "a caminho" não avisa o prestador (foi ele quem marcou).

⚠️ **`buildProviderFeed` está escrito e testado, e não está ligado a tela
nenhuma.** É código morto que eu deixei. O prestador não tem aba de avisos nem
selo. É a correção mais barata da lista de pendências.

### 3.7 Home reconstruída em tema claro

Copia a **estrutura** da referência de rastreio: a laje colorida que engoliu o
cabeçalho, o herói tipográfico com um degrau só, o cartão branco do código, a
régua de quatro marcos, os círculos de serviço.

Diferenças que são do Pagora:

- **Fundo branco, hero em gradiente verde** (a referência é amarelo sobre preto).
- **Três estados de hero**, não um (ver 4).
- **As duas pontas do marketplace na primeira tela** — quem contrata acha pelos
  círculos; quem tem veículo acha pela faixa escura. Estava enterrado em Conta.

O campo de busca fica **ancorado por cima da borda do hero**: lugar fixo, que
não se move quando a laje troca de estado.

**Tema claro por escopo de token.** `<Screen light>` acrescenta `.is-light`, que
redefine os MESMOS tokens `--x-*`. Card, botão, chip e campo continuam sendo os
componentes de sempre — eles nunca souberam a cor, só o nome dela.

O verde muda de tom entre os temas de propósito: `#22e3a3` sobre branco dá
1.9:1 e é ilegível. Claro usa `#08996f`.

---

## 4. O erro de concepção que foi corrigido — leia antes de mexer na home

A primeira versão da home tinha **dois** estados: visitante e com pedido em
andamento. Faltava o mais comum de todos — **cliente logado, sem transporte em
andamento**. Ele caía no estado de visitante e levava o discurso de vendas de
novo, toda vez que abrisse o app. Quem já é cliente não precisa que o Pagora se
apresente.

São três, e a distinção importa:

| Estado               | O que a laje mostra                                                    |
| -------------------- | ---------------------------------------------------------------------- |
| Visitante            | "O transporte que você precisa, agora" + selos de confiança            |
| Logado, ocioso       | "O que você vai transportar hoje?" + botão para as propostas pendentes |
| Logado, em andamento | Status grande, código do pedido, régua de quatro marcos                |

A referência do Behance **só sabe existir no terceiro estado**. Ela é um app de
rastreio de encomenda que outra pessoa despachou; o usuário é passivo. O do
Pagora precisa decidir entre propostas — tela que a referência não tem.

---

## 5. 🔴 DECISÃO ABERTA — esperando o usuário

**A home é clara e as outras sete telas continuam escuras.** Trocar de aba pisca
entre branco e preto. É exatamente a inconsistência apontada na auditoria
("a landing é preta, o fluxo é branco, a home volta a ser preta, sem que isso
signifique nada") — e ela foi recriada.

O mecanismo para resolver está pronto: acrescentar `light` ao `<Screen>` de cada
tela. São sete: Pedidos, Avisos, Conta, Perto, o fluxo de pedido, Acompanhar e a
área do transportador.

**Não converta sem confirmação.** É decisão estética do dono do produto, e ele
elogiou a disposição atual dos serviços — vale perguntar antes de mexer no
resto.

---

## 6. Pendências que não dependem de credencial

Em ordem de custo/benefício:

1. **Ligar `buildProviderFeed` a uma tela.** Código morto hoje (ver 3.6).
2. **Segunda onda de aposentadoria** — sobraram ~28 rotas legadas com
   substituta funcionando (`services`, `frete-1…4`, `guincho-1…4`,
   `cacamba-1…3`, `home`, `tracking`, `locator`, `map`, `notifications`,
   `favorites`, `addresses`, `refer`, `profile`, `wallet`, `recurring`,
   `joint`, `accessibility`, `meus-pedidos`, `oportunidades`, `service-done`).
   **O ganho real:** hoje `pagora.css` (1.288 linhas) e `ui/tokens.css` (2.010)
   carregam juntos. Quando a última tela legada sair, o primeiro morre e os
   tokens sobem para o `:root`.
3. **Avaliar e recibo** — `rate` e `receipt` são as únicas telas antigas **sem
   substituta**. A tabela `reviews` e a policy de insert existem desde a
   `0001`/`0002`, mas a policy exige `orders.status = 'completed'`, que depende
   da Edge Function. A tela fica pronta e só é exercitável depois das migrations.
4. **Desktop e tablet** — o sistema novo para na moldura do telefone. Em 1280px
   o fundo da página ainda é token claro antigo e o esqueleto de carregamento
   pisca branco antes de cada tela.
5. **Acessibilidade** — passe sistemático nas telas novas.
6. **Microinterações** — Fase 9 do plano, nunca iniciada.

---

## 7. 🔴 Bloqueios externos — só o dono do produto resolve

### Migrations nunca aplicadas — o mais importante

As `0005`–`0010` foram testadas contra Postgres real via PGlite mas **nunca
rodaram no projeto do Supabase**.

```bash
supabase link --project-ref kigmdcjpgmvsyiuqadct
supabase db push
```

Depois, o primeiro admin só por SQL (a `0006` revoga de todos o direito de
escrever `profiles.role`):

```sql
update pagora.profiles set role = 'admin' where phone = '+55SEUNUMERO';
```

**O que funciona HOJE, sem migration:** o loop inteiro de descoberta —
publicar → propor → aceitar. `accept_quote` existe desde a `0001`.

**O que não funciona:** avançar o estado da viagem, confirmar entrega, chat
(`0010`), checkout/extrato/saque, e a nota do prestador (o trigger de
`rating_avg` é da `0009`, então **todo prestador aparece sem avaliação** e o
rótulo "melhor custo-benefício" nunca aparece).

⚠️ **Armadilha:** hoje a policy `orders_update_party` da `0002` deixa cliente e
prestador atualizarem o pedido direto pelo PostgREST. Dá para fazer a máquina de
estados funcionar por aí sem Edge Function — **não faça**. A `0006` deleta essa
policy de propósito (`orders` vira somente-leitura). Construir ali é escrever
código para jogar fora. E, mais grave: **essa brecha está aberta no banco de
produção agora.**

### Chave do Google Maps

Sem ela, `address-field`, `usePlaces` e o mapa real ficam inertes. Passo a passo
no `HANDOFF.md`.

### Asaas / conta bancária

Pagamento congelado por decisão de negócio. Não tente "terminar".

---

## 8. Como reconstruir a demo publicada

A área interna só existe logada e com dados. Para avaliá-la sem migrations,
existe um build de demonstração que troca **apenas** o cliente do Supabase por
um de dados fixos, via alias do Vite. **Nenhum código de produto é alterado.**

Os arquivos vivem no scratchpad da sessão (`demo/supabase.ts`, `env/.env`), não
no repositório. Para refazer:

1. Criar `demo/supabase.ts` exportando um `supabase` falso com o subconjunto
   encadeável que as telas usam: `.from().select().eq().in().order().limit()
.single().maybeSingle()`, `.rpc()`, `.auth.getSession()`,
   `.auth.onAuthStateChange()`, `.channel().on().subscribe()`,
   `.removeChannel()`.
2. Config de uso único com
   `resolve.alias: [{ find: /^.*\/lib\/supabase$/, replacement: DEMO + '/supabase.ts' }]`,
   `build.rollupOptions.output.inlineDynamicImports: true` e
   `cssCodeSplit: false`.
3. Inlinar JS+CSS num HTML só.

**Duas armadilhas na publicação como artefato:**

- O artefato monta o `<head>`, então **escape todo não-ASCII** no JS e no CSS —
  senão "você" vira "vocÃª".
- **Apague `dist-demo/` e o config antes de rodar o lint**, senão o ESLint
  lê o bundle minificado e cospe 1.840 erros.

---

## 9. Armadilhas encontradas — não repita

**`<span>` sem `display: block`.** Cometi este erro **três vezes** na mesma
sessão. Os componentes novos usam `<span>` como filhos para poder viver dentro
de `<button>`, e span é inline por padrão: "FreteAguardando propostas",
"EstimativaR$ 218,40", "Boa noite,Pagora". Se dois textos aparecem colados na
tela, é isto.

**Token indefinido dentro de shorthand.** `--x-safe-t` não existia — só
`--x-safe-b`. Um token indefinido dentro de um `padding` **abreviado** invalida
a declaração inteira, e o hero perdia também o recuo lateral. O CSS não avisa.

**Arte calibrada para fundo escuro.** As silhuetas em `src/ui/art.tsx` preenchem
a 16% da cor. Sobre fundo claro viram fantasma. A correção está em
`.is-light .px-circ-art [fill='currentColor']` — regra de folha de estilo vence
atributo de apresentação do SVG.

**`setState` síncrono em efeito.** O ESLint pega, e não é preciosismo: em troca
de conta, `useLiveOrder` mostrava o pedido do usuário anterior por um quadro.
A correção foi derivar (guardar de quem é o resultado e conferir na leitura).

**`Page.loadEventFired` em SPA de hash.** Trocar só o hash não dispara `load`.
Um script de captura por CDP trava para sempre esperando.

---

## 10. Mapa dos arquivos novos

```
src/ui/
  tokens.css          sistema visual + tema claro (.is-light) — 2.010 linhas
  kit.tsx             Screen, Body, Card, Button, Field, Chip, Num, Empty…
  area.tsx            barras de navegação por área + ClientNav com selo
  art.tsx             silhuetas de veículo e carga, com escala real
  map-canvas.tsx      mapa com degradação
  address-field.tsx   campo de endereço com Places

src/flows/
  inicio.tsx          home (tema claro, 3 estados de hero)
  pedido.tsx          jornada de 3 passos
  escolher.tsx        propostas com rótulo de recomendação
  acompanhar.tsx      mapa + timeline + tripGeometry
  pedidos.tsx  avisos.tsx  conta.tsx  perto.tsx
  parceiro.tsx        área do transportador

src/domains/
  geo/distance.ts     resolveDistance + rótulo por origem
  intent/intent.ts    leitura de texto livre → tipo de serviço
  notifications/feed.ts   avisos derivados
  orders/recommend.ts     mais rápido / custo-benefício / econômico
  providers/          serviço de prestador
  pricing/service-pricing.ts   guincho e caçamba em centavos

src/routes.ts         inventário + RETIRED_ROUTES + resolveRoute
```

---

## 11. Links publicados

- **Auditoria de UI/UX** — foi republicada de outro lugar depois que a publiquei;
  a cópia local está desatualizada. Reler antes de editar.
- **Capturas do app** (`Pagora Redesenhado`) — **desatualizada**, mostra a home
  escura de antes.
- **Área interna logada** (`Pagora por dentro`) — atual, é a que vale.
