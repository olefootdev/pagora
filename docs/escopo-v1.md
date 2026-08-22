# PAGORA — Recorte da v1

**Documento:** proposta de escopo
**Base:** auditoria do repositório `pagora-web` em 19/08/2026
**Status:** três decisões tomadas em 19/08/2026 — ver seção 6

---

## 1. Por que este documento

A lista de 23 pontos que recebi trata coisas muito diferentes como se fossem
do mesmo tamanho. "Tirar opção de ligar para prestador" são duas horas.
"Regras de comissionamento" é um subsistema financeiro que não existe.
Colocados lado a lado numa lista numerada, os dois parecem tarefas
equivalentes — e é assim que cronograma estoura.

O que segue é a lista relida contra o código, agrupada por dependência, com
uma proposta do que entra na v1 e do que espera.

---

## 2. Onde o produto está hoje

A base técnica está mais madura do que a aparência do app sugere. São 19.314
linhas de TypeScript em modo strict, `tsc --noEmit` limpo, 165 testes
unitários passando. O motor financeiro — ledger append-only, comissão em
centavos inteiros, máquina de estados do pedido, saque — está escrito e coberto
por testes que rodam contra Postgres de verdade.

O fluxo que fecha valor já funciona ponta a ponta: o cliente publica um
pedido, o prestador vê em `/oportunidades` e envia proposta com o líquido
visível antes de enviar, o cliente aceita e a order nasce. Isso não é maquete.

O resto é. As telas de propostas, comparador, tracking, histórico, painel do
prestador e painel do admin continuam com dados fixos no código. O chat é uma
lista em `useState` que responde sozinha depois de 1,1 segundo. O mapa é um SVG
desenhado à mão. São seis anos-luz de distância entre o que está pronto por
baixo e o que dá para mostrar para um usuário.

Três coisas estão paradas por motivo externo, não por engenharia:

- As migrations `0005` a `0009` foram escritas e testadas em PGlite, mas nunca
  rodaram contra o banco de produção. Todo o modelo financeiro está do lado de
  lá dessa parede.
- Não existe chave do Google Maps. A biblioteca (`@vis.gl/react-google-maps`)
  já está integrada e o app degrada para a ilustração estática quando a chave
  falta. É um dia de trabalho no momento em que a chave existir.
- Pagamento está congelado até a conta bancária da empresa abrir. Decisão de
  negócio tomada em agosto, não é dívida técnica.

---

## 3. A lista relida

### 3.1 O que é ajuste de superfície (≤ 1 semana somando tudo)

Pontos 7, 8, 13, 14, 17 e 6. Remover os quatro botões de "Ligar", criar link de
compartilhamento, encurtar o onboarding, plugar a chave do Maps, abrir espaço
de banner na home e polir a rolagem no mobile.

Junto, é menos de uma semana. Nenhum depende de decisão de ninguém, com exceção
da chave do Maps. É o tipo de item que deve entrar na primeira semana só para
tirar da lista e parar de ocupar espaço na conversa.

Um detalhe do ponto 13: o texto do onboarding hoje promete que os prestadores
"enviam orçamentos pelo WhatsApp". Enquanto isso estiver escrito, o ponto 10
não está fechado.

### 3.2 O que é reescrita de tela (2 a 4 semanas)

**Ponto 12 — landing comercial.** A landing atual comunica como engenheiro:
honesta, sóbria, sem imagem nenhuma. Vende mal. Reescrever é uma semana de dev,
mas depende de copy e de banco de imagens que ainda não existem. Se as imagens
não chegarem, a semana de dev não começa.

**Ponto 16 — mapas de verdade.** Locator com polyline de Directions, mapa de
prestadores com markers e InfoWindow, autocomplete de endereço com Places nas
telas de frete. Duas semanas. É o item de maior retorno visual de toda a lista:
mapa estático é o que mais denuncia protótipo.

**Ponto 2 — buscador de prestador.** Hoje os filtros do mapa ordenam um array
fixo. Precisa virar query geoespacial contra a tabela `providers`, com raio,
categoria e disponibilidade. Uma semana, e depende da 21.

**Ponto 4 — dark/light.** Parece CSS, não é. O app foi construído dark-only e
carrega a classe `is-dark` espalhada manualmente em cerca de quarenta lugares,
mais 23 cores hex cravadas em atributos SVG. Fazer o toggle direito significa
terminar a migração para tokens que ficou pela metade. Uma semana, e é a
semana mais chata da lista.

### 3.3 O que não existe (o grosso do custo)

**Ponto 9 — chat interno com bloqueio de números.** Não existe tabela de
mensagens, não existe RLS, não existe realtime, não existe moderação. São duas
semanas para ter algo que se sustente: schema, política de acesso, canal
realtime, filtro de padrões de telefone e e-mail, e uma fila para o admin
revisar o que o filtro pegou.

**Ponto 10 — zero WhatsApp.** Tecnicamente são três dias: existem oito pontos de
saída para o WhatsApp no código. O problema não é técnico. Hoje o WhatsApp é
o canal onde o negócio efetivamente fecha. Arrancá-lo antes do chat interno
estar de pé não deixa o produto mais controlado, deixa o produto mudo. **O 10
sai depois do 9, nunca antes.**

**Pontos 19 e 20 — comissionamento do divulgador.** Decidido em 19/08: os 15%
da plataforma continuam como estão, e o repasse ao divulgador sai de dentro
deles. Em um serviço de R$ 1.000, a PAGORA cobra R$ 150, repassa R$ 30 a quem
cadastrou o prestador e R$ 5 a quem cadastrou o cliente, e retém R$ 115.

Isso muda a natureza do problema, e para melhor. O cliente não paga nada a mais,
o prestador não recebe nada a menos, e o gateway não vê diferença. O módulo de
divulgador deixa de tocar o fluxo de pagamento e vira uma divisão de receita no
ledger. Cai o risco, cai a superfície de teste, e o módulo passa a poder ser
construído depois do lançamento sem retrabalho no que já existe.

Ainda são três semanas — schema de referral, janela de atribuição, cálculo,
expiração, extrato e backoffice do divulgador — e a recomendação de deixar fora
da v1 continua de pé. É trabalho para uma engrenagem que só produz dinheiro
quando houver volume dos dois lados do marketplace, e hoje não há nem um lado.

Duas coisas ficam registradas como pendência de definição:

- **Piso de margem.** Com os dois divulgadores presentes, a PAGORA fica com
  11,5% do serviço. Precisa estar claro que 11,5% é o pior caso e que ele cobre
  o custo de gateway, suporte e disputa.
- **Prazo do "não vitalício".** O ponto 19 diz que o recebimento tem fim, mas
  não diz quando. Sem um número — 12 meses após o cadastro, 24, N pedidos — não
  dá para escrever a regra de expiração. É a única definição que ainda falta
  para este módulo.

**Ponto 18 — os quatro backoffices.** O de cliente existe e é o mais completo.
O de prestador e o de admin existem como casca com dados falsos. O de divulgador
não existe em nenhuma forma. Ligar os três primeiros ao banco são quatro
semanas. O quarto sai junto com o 19/20, ou seja, sai da v1.

**Ponto 22 — KYC.** Nada implementado. Duas semanas para o módulo manual:
upload de documento, fila de análise, aprovação e reprovação com motivo,
trilha de auditoria. Fazer automático com provedor externo custa mais e exige
CNPJ ativo — não faz sentido antes do banco.

**Ponto 23 — saques.** O código do lado do banco já existe e está testado. O
que falta é aplicar as migrations e construir a tela onde o admin aprova o saque
e registra o comprovante do Pix feito à mão. Uma semana, depois da 21.

### 3.4 O que depende do banco abrir

**Ponto 11 — resolvido, fica Asaas.** Decidido em 19/08. O gateway já
implementado é o Asaas — quatro Edge Functions, webhook idempotente, testes de
fluxo de dinheiro — e não haverá migração para Mercado Pago. Isso tira uma
semana e meia de reescrita do plano.

O que sobra é uma pendência de validação, não de código: nada disso jamais falou
com o Asaas de verdade, porque não existe conta lá. Vale checar se o sandbox do
Asaas abre sem CNPJ ativo. Se abrir, dá para validar a integração inteira —
cobrança Pix, QR, webhook, conciliação — antes de a conta bancária da empresa
existir, e o pagamento deixa de ser o último item da fila para virar um item
paralelo. Se não abrir, continua atrás do banco.

### 3.5 O que não é trabalho de engenharia

Pontos 1 e 15 — plano de negócios e contas de e-mail profissionais. Ambos
importantes, nenhum consome dev. O plano de negócios é seu; para e-mail, Google
Workspace resolve em uma tarde por volta de R$ 30 por caixa/mês.

---

## 4. Riscos

**O ponto 3 já foi resolvido, com um resto.** A sobretaxa de urgência de 30% no
frete saiu em 19/08. O campo de urgência continua sendo coletado e enviado ao
prestador, porque ele precisa saber que é para hoje; o que saiu foi o efeito no
preço. O teste que garantia o +30% foi virado ao contrário em vez de deletado:
hoje ele garante que "hoje" custa igual a "agendado" em toda a matriz de veículo
e distância.

Sobrou uma coisa que não estava na lista. O guincho tem uma segunda sobretaxa de
urgência, de **50%**, escrita em `extra.tsx:27` — `total * 1.5` quando o cliente
escolhe "agora". Não é o mesmo número nem o mesmo serviço, então não mexi nela.
Precisa de decisão: guincho às três da manhã é genuinamente mais caro de
entregar, e pode ser que essa sobretaxa deva ficar. Mas ter "urgência não custa
nada" no frete e "+50%" no guincho, sem isso estar escrito em lugar nenhum, é o
tipo de inconsistência que vira reclamação.

**O ponto 5 protege o prestador, não o cliente.** Termo de confirmação de carga
para evitar volume surpresa é a coisa certa a fazer, mas cria atrito no
único fluxo que hoje converte. Sugiro implementar como confirmação no aceite da
proposta, não como etapa nova no formulário.

**As migrations não aplicadas são o risco silencioso.** Nove arquivos de
migration, cinco deles nunca executados contra o Postgres de produção. A `0006`
revoga privilégios de escrita de todas as tabelas do schema — é intencional e
correto, mas significa que telas que hoje funcionam podem quebrar com
"permission denied" no dia em que rodar. Esse dia precisa acontecer cedo, com
tempo de sobra para consertar, e não na véspera de um lançamento.

---

## 5. Proposta de recorte

| Fase                 | Conteúdo                                                      | Pontos               | 1 dev   | 2 devs  |
| -------------------- | ------------------------------------------------------------- | -------------------- | ------- | ------- |
| **0 — Destravar**    | Aplicar migrations 0005–0009, validar RLS, gerar tipos        | 21                   | 1 sem   | 1 sem   |
| **1 — Higiene**      | Ligar, compartilhar, onboarding, banner, rolagem, chave Maps  | 6,7,8,13,14,17       | 1 sem   | 0,5 sem |
| **2 — Conversa**     | Chat interno com moderação, depois remover WhatsApp           | 9, 10                | 2,5 sem | 1,5 sem |
| **3 — Mapa e busca** | Locator, ProvidersMap, Places, busca real                     | 2, 16                | 3 sem   | 2 sem   |
| **4 — Vitrine**      | Landing comercial, termo de carga                             | 5, 12                | 1,5 sem | 1 sem   |
| **5 — Operação**     | Backoffices admin e prestador reais, KYC manual, saque manual | 18 (parcial), 22, 23 | 7 sem   | 4 sem   |
| **6 — Acabamento**   | Dark/light, QA, hardening                                     | 4                    | 1,5 sem | 1 sem   |

**Total da v1: 17,5 semanas com um dev, 11 com dois.** O ponto 3 saiu da conta
porque já está feito, e o ponto 11 saiu porque a decisão de ficar no Asaas
eliminou a reescrita.

Fora dessa conta ficam os pontos 19/20 e o backoffice de divulgador — 3 semanas,
que proponho tratar como v1.1. Agora que o repasse sai de dentro dos 15% e não
toca o pagamento, adiar esse módulo não cria dívida: ele encaixa depois sem
mexer no que já estiver rodando.

Os números acima são semanas de trabalho, não datas de calendário. Não coloquei
data porque duas das dependências — chave do Maps e conta bancária — não estão
sob controle do time, e cronograma com data falsa é pior que cronograma sem data.

Se a fase 0 começar na semana que vem, a fase 5 termina 18 semanas depois. Se a
fase 0 esperar um mês pela decisão, tudo desloca um mês. A conta é essa.

---

## 6. Decisões tomadas em 19/08/2026

1. **Comissão.** A plataforma cobra 15% sobre o serviço. Desses 15%, repassa 3%
   a quem cadastrou o prestador e 0,5% a quem cadastrou o cliente. O divulgador
   é pago pela PAGORA, não pelo cliente nem pelo prestador. Piso de margem em
   11,5%.

2. **Urgência.** A sobretaxa de 30% no frete está removida — código, cópia da
   tela e teste de regressão. O +50% do guincho segue de pé, aguardando decisão
   (ver seção 4).

3. **Gateway.** Fica o Asaas. Conta a ser criada; nada foi testado contra o
   ambiente real ainda.

### O que ainda falta definir

- **Prazo do "não vitalício"** (ponto 19). Quantos meses ou quantos pedidos o
  divulgador recebe antes da comissão expirar. Bloqueia só a v1.1.
- **Sobretaxa de urgência do guincho.** Fica em 50%, cai para zero, ou vira
  outro número.

Nenhuma das duas bloqueia a fase 0. Ela pode começar na segunda-feira.
