# PAGORA — Aplicação do design system aprovado em todo o sistema

> **25/08/2026.** A referência é o canvas "Home Interna Pagora" **na versão que o
> dono do produto salvou** — inclusive a edição dele (marca-d'água do caminhão
> removida do hero). Este plano parte dela, não da minha cópia.

---

## 1. O que o design aprovado define

| Elemento          | Especificação                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Fundo do app      | Branco `#ffffff`, texto `#0a1a16`                                                                                                    |
| Hero              | Gradiente profundo `168deg: #0ca877 → #076b4e 40% → #04412f 72% → #022119`, texto branco, cantos inferiores 26px, engole o cabeçalho |
| Ação ancorada     | Card branco sobre a borda do hero, 2 andares: descrever (texto/voz) + faixa de propostas pendentes                                   |
| Ícones de serviço | **Frota, não carga**: silhuetas sólidas de veículo, escala real entre elas                                                           |
| Cards de serviço  | Nome + **preço de partida** vindo do motor de preço real; "sob consulta" onde não há preço                                           |
| Confiança         | Informação verificável ("CNH e documento conferidos"), não slogan                                                                    |
| Laranja           | Só urgência/pendência (badge de avisos) — decisão verde × laranja **em aberto** na 3ª prancheta                                      |
| Barra inferior    | Clara, ativo em verde                                                                                                                |
| Tipografia        | Archivo (display) · IBM Plex Sans (corpo) · IBM Plex Mono (dados)                                                                    |

## 2. Por que a aplicação é barata — o achado central

O levantamento no código mostrou que a fundação já está pronta:

- **As 12 telas novas usam só tokens.** Em todos os `src/flows/` existe **uma
  única** cor cravada fora do sistema (`#08996f` em `inicio.tsx`). Converter
  tema = redefinir tokens, não caçar hex em tela.
- **O mecanismo de tema já existe**: `.is-light` redefine os mesmos `--x-*`;
  `<Screen light>` já funciona (a home usa).
- **19 ocorrências de `<Screen>`** em 9 arquivos — a conversão nominal é
  mecânica.
- As silhuetas de veículo em escala real **já existem** em `ui/art.tsx` — falta
  a variante sólida e trocar carga→veículo nos 3 consumidores (`inicio`,
  `pedido`, `parceiro`).

**A lacuna real é outra:** a jornada nova navega para **8 telas legadas** que
não falam o sistema — e `login` recebe **5 rotas de entrada**. A porta do app é
a tela mais antiga dele.

## 3. Fases

### FASE A — Fundação ✅ CONCLUÍDA em 26/08/2026

Tudo abaixo entregue, com a home (`inicio.tsx`) reescrita como tela de
referência sobre os primitivos novos — os itens 3–6 sem consumidor seriam
código morto, a classe de erro que esta sessão já cometeu uma vez.

O que saiu diferente do planejado, e por quê:

- **Guincho parte de R$ 160, não R$ 180.** "A partir de" tem que ser o menor
  preço real, e o menor é a moto (sobretaxa negativa: pesa menos). Partir do
  carro popular seria propaganda enganosa — há teste garantindo que o valor
  exibido é o mínimo entre todos os portes.
- **`formatCentsCompact`**: "R$ 180" em vez de "R$ 180,00" no preço de
  partida; valores com centavos reais continuam íntegros ("R$ 218,40").
- **A voz veio da Fase E para cá**: `useVoice` (Web Speech API, pt-BR) com a
  regra de sempre — sem suporte, o microfone nem renderiza.
- O caption "preços de partida em 15 km" virou só "preços de partida": caçamba
  e guincho não usam 15 km, e o rótulo mentiria.

(planejamento original: ≈1 dia)

1. **Claro vira padrão** das telas novas: default no `Screen` (escuro passa a
   opt-out), em vez de espalhar `light` 19 vezes.
2. Tokens do hero: `--x-hero-grad`, `--x-hero-ink` (branco), `--x-hero-deep`
   (`#022119`).
3. `ui/hero.tsx`: componente `<Hero>` com avatar+sino+slot — usado por
   `inicio`, `acompanhar` e `parceiro`.
4. `<AnchorCard>`: o card de 2 andares ancorado (descrever+voz / faixa de
   propostas ligada ao realtime que já existe).
5. `art.tsx`: variante **sólida** das 6 silhuetas do canvas (poliguindaste,
   baú, van, plataforma com carga, guincho com carro, prancha 5 eixos).
6. Domínio: `startingPriceCents(service)` derivado do pricing real, com testes
   (caçamba 180 · guincho 180 · frete 210 · mudança 260 · máquina → `null`).
   **Nunca número cravado em tela.**

### FASE B — Cliente ✅ CONCLUÍDA em 26/08/2026

As oito telas do cliente estão no tema claro: `inicio` (referência) ·
`pedidos` · `avisos` · `conta` · `perto` · `pedido` (3 passos) · `escolher` ·
`acompanhar`.

O que a fase deixou além da conversão:

- **`--x-art-fill`**: o preenchimento das silhuetas de contorno virou token
  (0.16 no escuro, 0.3 no claro). Era a armadilha nº 3 — resolvida na raiz,
  para todas as artes de uma vez, sem seletor por classe.
- **`COARSE_TRACK`/`coarseTrackIndex` subiram para o domínio**
  (`order.status.ts`): a régua de quatro marcos é usada pela home E pelo
  acompanhar, e flow importar de flow é acoplamento na direção errada.
- **`acompanhar` ganhou o hero de status da 2ª prancheta**: gradiente
  profundo, voltar/compartilhar como botões brancos, o ESTADO como título,
  transportador + placa na sublinha, régua de quatro marcos. O mapa vem logo
  abaixo e o bloco de status duplicado no corpo saiu.
- O CSS órfão dos círculos antigos (`px-circ*`) foi removido.

Ressalvas honestas: os estados verificados no navegador foram os alcançáveis
sem sessão (deslogado, fluxo de pedido completo, esqueleto e erro do
acompanhar; o hero de status foi verificado por injeção de markup — mesmo
CSS, dados de exemplo). O primeiro login real merece uma passada de olho.
Nota lateral: a tela de erro diagnosticou certo — "Sem conexão com o
servidor", não "pedido não encontrado" — porque o host do Supabase é
inacessível neste ambiente.

### FASE C — Transportador (≈1 dia)

As 4 abas de `parceiro`: hero escuro com o **líquido em número grande**,
oportunidades com silhueta do veículo pedido.

### FASE D — As legadas que a jornada usa ✅ CONCLUÍDA em 26/08/2026

| Tela                                 | O que aconteceu                                                                                                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `login`                              | **Reescrita** como `flows/entrar.tsx` — hero da marca, máscara/validação do domínio, código num campo só (`one-time-code`, aceita colar). Eventos `otp_enviado`/`login_ok` no funil. |
| `onboarding`                         | **Saiu da jornada** — login entrega direto em `/inicio`; os slides eram custo entre o código e a primeira ação. Rota redireciona.                                                    |
| `chat`                               | **Reescrita** como `flows/conversa.tsx` — `useChat` e moderação intactos; a bolha própria usa o verde profundo da marca.                                                             |
| `provider-signup`                    | **Reescrita** como `flows/cadastro-transportador.tsx` — validação, E.164 e dedup 24h intactos; frota sólida como seletor de serviço; sucesso é estado da tela, não navegação.        |
| `checkout`                           | **Reestilizada** — mesma lógica Pix/realtime, pele do sistema, valor no verde profundo.                                                                                              |
| `termos`/`privacidade`               | Reestilizadas (conteúdo LGPD intacto).                                                                                                                                               |
| `prov-financeiro`/`admin-financeiro` | Ficam para a fase de admin/desktop, como planejado.                                                                                                                                  |

### FASE E — Decisões e fim da dívida

- **Decisão pendente (sua):** verde × laranja como cor de ação — a 3ª
  prancheta do canvas existe para isso.
- **Voz no campo:** Web Speech API real, com degradação silenciosa onde não há
  suporte.
- **Aposentadoria em bloco** das ~28 rotas legadas restantes → `pagora.css`
  morre, tokens sobem ao `:root`, o app fica com **um** sistema. É o fim da
  história que a auditoria abriu.

## 4. O que NÃO recebe o sistema

- **Landing** (`#/landing`) — ordem explícita do dono do produto: não tocar.
- **Telas em fila de aposentadoria** — não se veste quem vai morrer; o caminho
  delas é a FASE E, não restyle.

## 5. Armadilhas conhecidas (desta sessão — não repetir)

1. `<span>` sem `display: block` cola textos (aconteceu 3×).
2. Token indefinido dentro de `padding` **abreviado** invalida a declaração
   inteira (caso `--x-safe-t`).
3. As artes preenchem a 16% da cor — calibradas para fundo escuro; sobre claro
   precisam da regra que vence o atributo do SVG.
4. Durante a transição os **dois CSS convivem** — verificar cada tela convertida
   no navegador, não confiar na cascata.
5. Preço em tela **sempre** vem do domínio com teste; o bug da van nasceu de
   número solto.

**Total estimado: 7–8 dias de dev**, entregável por fase — cada fase deixa o
app navegável e melhor que antes dela.
