# PAGORA — 10 melhorias de uso e conversão

> **26/08/2026.** Plano pedido pelo dono do produto: layout mais útil, simples,
> direto e intuitivo — pensando no prestador que muitas vezes é uma pessoa
> simples — e mais comercial. Sem criação de texto decorativo, sem ícone novo.
> Cada proposta está ancorada no que o código já tem.

---

## ✅ TODAS AS 10 EXECUTADAS em 26/08/2026

514 testes, `tsc` limpo, ESLint 0 problemas, build limpo. O que cada uma
virou no código está anotado abaixo de cada proposta.

**O que mudou em relação ao plano, e por quê:**

- **O `need` passou a ser gravado no payload** (`types.ts`). Sem ele, "pedir
  de novo" de uma mudança abriria as perguntas de carga — `service` é de
  muitos para um. Pedidos antigos caem no genérico (`carga`), que é
  recuperável no passo 1.
- **A #10 virou medição, não opinião.** Auditei os alvos pelo DOM: nenhum
  abaixo de 44px. O que estava fora da régua era o TEXTO das ações (15,5px)
  e o rótulo da barra (10,5px). Corrigidos para 16px e 11,5px; o botão
  pequeno subiu de 40 para 44px de altura.
- **`rate` e `receipt` deixaram de redirecionar** para `pedidos`: agora têm
  substituta de verdade (`avaliar/:id` e `comprovante/:id`).

## Pós-execução — FEITO em 26/08/2026

**528 testes**, `tsc` limpo, ESLint 0 problemas, build limpo.

### 1 · Captura da indicação (`src/domains/referral/referral.ts`, 13 testes)

Verificado no navegador que o link `#/inicio?ref=abc12345` **abria a tela e
descartava o `ref` em silêncio** — todo compartilhamento até a v1.1 estaria
perdido sem volta. Agora a indicação é guardada por 90 dias, com três regras
que são de produto:

- **Primeiro toque vence.** Quem apresentou o app foi quem mandou o primeiro
  link; um segundo link não rouba a indicação. Se o negócio preferir último
  toque, é um `if` que muda.
- **A forma é validada** (8 hex). Sem isso, qualquer valor colado no link
  entraria no armazenamento de quem clicou.
- **Ninguém indica a si mesmo** (`referralAppliesTo`).

O prazo de 90 dias é por quanto tempo SEGURAMOS a indicação pendente — não é
a expiração da comissão, que segue indefinida como decisão comercial.

### 2 · As três telas órfãs ligadas

Elas existiam e quase ninguém chegava nelas:

| Ligação              | Antes                                         | Agora                                                       |
| -------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| Feed de avisos       | `settled` era passivo e levava a `acompanhar` | "Como foi o serviço?" → `avaliar/:id`                       |
| Confirmar entrega    | recarregava a mesma tela                      | vai direto para a avaliação, com o serviço fresco na cabeça |
| Histórico de Pedidos | pedido concluído só levava a `acompanhar`     | dois botões: **Avaliar** e **Comprovante**                  |
| Topo de Pedidos      | nada                                          | card **Pedir de novo**, derivado do que já está carregado   |

### 3 · Os avisos do transportador ligados — 26/08/2026

**531 testes**, `tsc` limpo, ESLint 0 problemas, build limpo.

`buildProviderFeed` estava escrito e testado desde 25/08 **sem nenhum
consumidor** — código morto. Agora é a quinta aba da área do prestador
(`parceiro-avisos`), pelo mesmo motivo que o cliente tem a dele: Oportunidades
responde _"o que posso pegar agora"_, Avisos responde _"o que mudou desde que
eu olhei"_.

Três dos quatro estados que ele precisa saber **não existiam em tela nenhuma**
— principalmente _pagamento confirmado — pode sair_, que é o único aviso que
faz o caminhão andar.

**Dois defeitos que a ligação expôs, e que já foram corrigidos:**

| Defeito                                        | Efeito                                                                                                   | Correção                                                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| O "lido" era compartilhado pelos dois feeds    | Quem é cliente **e** transportador perdia o "pagamento confirmado" por ter aberto os avisos de cliente   | `readLastSeen`/`writeLastSeen` passaram a receber escopo (`cliente` \| `transportador`)                            |
| Aviso de pedido encerrado levava para a Viagem | Viagem mostra **um** serviço, o que está em andamento: finalizado/cancelado/em disputa abriam tela vazia | Cada estado aponta para onde o dado mora — `settled` e `disputed` → Ganhos, `cancelled` → Pedidos, `paid` → Viagem |

**Uma mudança de rótulo:** a primeira aba do prestador passou de
"Oportunidades" para **"Pedidos"**. Com cinco abas em 375 px a palavra longa
truncava (`Oportunid…`) — e a própria tela já chama a lista de "3 pedidos
abertos". O **título da tela continua "Oportunidades"**, que é onde a palavra
cabe inteira.

**O que ficou de fora, de propósito:** o cabeçalho de desktop
(`DesktopHeader`, em `App.tsx`) não mostra selo de não lidos — nem o do
cliente, que já era assim antes desta sessão. O app é de telefone e a barra de
telefone tem o selo; ligar o selo no desktop obrigaria a consultar avisos em
toda rota, inclusive nas públicas.

## Os 3 princípios que regem tudo abaixo

1. **Menos digitação, mais toque.** Quem está de luva, no sol, digita mal e
   odeia formulário. Toda entrada de texto precisa de uma alternativa de um
   toque (valor sugerido, voz, repetir o que já foi feito).
2. **Número antes de palavra.** O prestador decide por R$ e km; o cliente por
   R$ e min. Onde houver decisão, o número é o elemento — texto é apoio.
3. **Nada some, nada é inventado.** Card sem dado real não exibe dado de
   mentira: exibe o caminho para o dado existir ("sob consulta", estado
   vazio honesto). É o que constrói a confiança que vende.

---

## Páginas que PRECISAM ser construídas

O levantamento de hoje achou um efeito colateral da aposentadoria de ontem:
`favorites`, `addresses`, `wallet` e `refer` redirecionam para **Conta**, mas a
Conta tem só 4 linhas (indicar, prestador, ajuda, termos) — **as funções
sumiram junto com as telas maquete**. E `rate`/`receipt` nunca tiveram
substituta. As páginas a construir:

| Página                                        | Onde                  | Base que já existe                                                              |
| --------------------------------------------- | --------------------- | ------------------------------------------------------------------------------- |
| **Minha Rede** (substitui "Indicar o Pagora") | Conta                 | Link com `ref` já sai no compartilhamento; repasse 3%/0,5% já decidido em 19/08 |
| **Endereços recentes**                        | Conta                 | Deriváveis dos pedidos — zero armazenamento novo                                |
| **Avaliar o serviço**                         | pós-entrega           | Tabela `reviews` existe desde a 0001                                            |
| **Comprovante do serviço**                    | pedido concluído      | Derivável de order + quote + provider                                           |
| **Cadastro em análise**                       | área do transportador | `provider_applications` consultável por telefone                                |

---

## As 10 propostas

### ✅ 1 · "Indicar o Pagora" vira **MINHA REDE**

> **Feito.** `src/flows/minha-rede.tsx` · rota `minha-rede` · a linha da Conta aponta para lá.

Números no lugar de texto: **quantos indicados**, **quanto rendeu**, o link
grande para compartilhar. Os percentuais já estão decididos (3% de quem
cadastrou prestador, 0,5% de quem cadastrou cliente) — a tela mostra isso como
dois números, não como parágrafo.
**Honestidade obrigatória:** hoje o link carrega `?ref=` mas **ninguém grava**
— não existe coluna `referred_by`. Fase 1: a tela nasce com o link + os
percentuais + estado vazio honesto ("seus indicados aparecem aqui"). Fase 2:
a contagem real vem com o módulo do divulgador (v1.1, já estimado em 3
semanas). Construir a tela agora cria a expectativa certa e o hábito de
compartilhar antes de o dinheiro circular.

### ✅ 2 · **Pedir de novo** — recompra em um toque

> **Feito.** `src/domains/orders/repeat.ts` (14 testes) · card na home · `Pedido` aceita `repeatFrom`.

O payload do último pedido está gravado em `service_requests`. Um card na home
e em Pedidos: o serviço, o trajeto e **um botão** que reabre o fluxo já
preenchido. É a proposta mais comercial da lista: cliente de caçamba pede
caçamba de novo, e hoje ele redigita tudo.

### ✅ 3 · **Proposta em um toque** para o prestador

> **Feito.** valor nasce da estimativa · o botão do card diz "Propor R$ X" e o da folha diz o LÍQUIDO.

Hoje o prestador DIGITA um valor. A estimativa do cliente já chega no card —
o botão vira **"Propor R$ 280"** (pré-preenchido, editável). Quem quer ajustar,
ajusta; quem quer velocidade, toca uma vez. Menos digitação = mais propostas =
mais fechamento.

### ✅ 4 · **Voz onde se digita** — chat e observações

> **Feito.** `VoiceButton` extraído · chat e observações concatenam em vez de substituir.

O `useVoice` já existe e funciona (está no campo da home). Reusar no compose
do chat e nas observações do pedido. Pessoa simples fala melhor do que digita;
o microfone já tem ícone e já degrada sozinho onde não há suporte.

### ✅ 5 · **Código falável do pedido**

> **Feito.** `src/domains/orders/order-code.ts` (8 testes) · aplicado em 6 telas.

`#A7F3C210` é impossível de ditar por telefone. Derivar um código curto
falável (letras e números sem ambiguidade, ex. `PAG-4821`) do id — só
exibição, determinístico, zero banco. O prestador liga para o cliente e fala
o código; hoje ele soletra hexadecimal.

### ✅ 6 · **Endereços recentes** — sem cadastro de endereço

> **Feito.** `src/domains/orders/recent-addresses.ts` (9 testes) · sugestões no foco do `AddressField`.

Não existe tabela de endereços e não precisa existir agora: os últimos
endereços usados **estão nos pedidos**. No passo de trajeto, uma linha "usar
de novo" com os 2–3 últimos. Zero formulário novo, zero migration.

### ✅ 7 · **Avaliar o serviço** — a página que fecha o ciclo

> **Feito.** `src/flows/avaliar.tsx` + `review.service.ts` · alvos de 56px.

Estrela grande, um toque, comentário **opcional e por voz**. A tabela
`reviews` existe desde a 0001; a policy exige pedido `completed` (exercitável
após as migrations, a tela fica pronta antes). Sem avaliação não existe o
"4,9 ★ · 347 transportes" que vende o marketplace inteiro.

### ✅ 8 · **Comprovante do serviço** — o recibo que faz propaganda

> **Feito.** `src/flows/comprovante.tsx` · 100% derivado, sem tabela nova.

Pedido concluído gera uma tela limpa: valor, trajeto, transportador, data,
código falável — e o botão de compartilhar que já existe. Todo comprovante
enviado num grupo de WhatsApp de obra é mídia grátis. Derivável 100% de dados
existentes.

### ✅ 9 · **"Cadastro em análise" visível**

> **Feito.** o gate do transportador consulta `provider_applications` pelo telefone.

Quem enviou o cadastro de transportador e volta ao app cai hoje no mesmo
"faça seu cadastro" — parece que o envio se perdeu. O gate da área do
transportador consulta `provider_applications` pelo telefone e mostra o
estado: **em análise**, com o prazo (24 h) que a tela de cadastro prometeu.
Reduz abandono no funil que traz a oferta do marketplace.

### ✅ 10 · **Modo luva na área do transportador**

> **Feito.** auditoria por DOM · botão 16px, botão pequeno 44px, rótulo da barra 11,5px.

Auditoria de alvos e tamanhos nas 4 abas do parceiro: botão principal sempre
`lg`, fonte mínima 16 nas ações, o **líquido sempre antes do bruto** e nunca
menor que ele. Não é tela nova — é passar as telas existentes pela régua de
quem usa o app com a mão suja no pátio.

---

## Ordem sugerida (custo × retorno)

| #   | Proposta                | Custo  | Depende de                       |
| --- | ----------------------- | ------ | -------------------------------- |
| 3   | Proposta em um toque    | horas  | nada                             |
| 4   | Voz no chat/observações | horas  | nada                             |
| 5   | Código falável          | horas  | nada                             |
| 2   | Pedir de novo           | ~1 dia | nada                             |
| 6   | Endereços recentes      | ~1 dia | nada                             |
| 10  | Modo luva               | ~1 dia | nada                             |
| 9   | Cadastro em análise     | ~1 dia | nada                             |
| 1   | Minha Rede (fase 1)     | ~1 dia | contagem real: módulo divulgador |
| 8   | Comprovante             | ~1 dia | nada                             |
| 7   | Avaliar                 | ~1 dia | exercitar: migrations            |

Sete das dez não dependem de nada externo. As três últimas ficam prontas e
esperam o que já está na fila (migrations, módulo divulgador).
