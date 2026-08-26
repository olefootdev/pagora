# Briefing para o Claude Fable 5 — Pagora 2030

> Prompt redigido pelo dono do produto em 25/08/2026, salvo aqui para não se
> perder. **Leia a seção "Divergências" antes de enviar** — o design system
> descrito no prompt não bate com o que está implementado.

---

## ⚠️ Divergências entre o prompt e o código

Conferido em `src/ui/tokens.css` na data acima. Se o prompt for enviado como
está, o Fable vai projetar sobre uma base que não existe.

| No prompt                              | No código                                                | Consequência                                                                                                                                   |
| -------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Laranja `#FF7A1A` = **ação principal** | Laranja = **urgência e pendência**; a ação é o **verde** | A mais grave. Inverte a semântica de cor do sistema inteiro — hoje laranja nunca aparece num botão de ação, e verde nunca aparece num status.  |
| **Inter** para corpo                   | **IBM Plex Sans**                                        | Inter foi substituída de propósito. É a fonte "segura" padrão; o sistema foi movido para Plex, que tem caráter técnico e pareia com a Archivo. |
| **JetBrains Mono** para códigos        | **IBM Plex Mono**                                        | JetBrains é resíduo do `pagora.css` legado.                                                                                                    |
| Texto `#101B16`                        | `#0a1a16` (tema claro)                                   | Diferença desprezível — o valor do código tem viés de verde de propósito.                                                                      |
| Archivo 800/900                        | Archivo 500–800 carregadas                               | 900 não está no `<link>` do Google Fonts. Ou carrega, ou o navegador sintetiza e o traço engorda errado.                                       |

**O que conferiu:** Archivo como display, fundo branco, botões grandes, hero de
informação direto. Esses quatro estão implementados como descritos.

### Sugestão

Duas correções no prompt resolvem:

1. Trocar por: _"Verde `#22E3A3` (ação, rota, estado ativo). Laranja `#FF7A1A`
   reservado para urgência e pendência — nunca em botão de ação."_
2. Trocar Inter → IBM Plex Sans e JetBrains Mono → IBM Plex Mono.

E vale acrescentar uma linha mandando o Fable ler
`docs/status-refatoracao-2026-08-25.md` primeiro. Sem isso ele projeta do zero,
e existe uma base de 479 testes, uma jornada de três passos já construída e uma
decisão de tema em aberto que ele precisa conhecer para não desfazer.

---

## Prompt, como redigido

Você é o head de produto e UX de um app de fretes e caçambas chamado Pagora —
um "Uber dos fretes" para transporte pesado no Brasil. Eu já defini o design
system da marca, então não crie uma identidade nova, use esta como base:

- Cores: Verde Energia `#22E3A3`, Verde Profundo `#0FA77A` (gradiente em
  elementos de destaque), Laranja Energia `#FF7A1A` (ação principal), fundo
  branco, texto quase-preto `#101B16`.
- Tipografia: Archivo (peso 800/900) para títulos, Inter para corpo e labels,
  JetBrains Mono para códigos de rastreio.
- Princípio já validado: fundo branco, botões grandes, hero de informação
  direto, zero curva de aprendizado.

### O desafio

Quero que você projete a experiência do Pagora como se fosse 2030: não
visualmente futurista, mas radicalmente mais fácil do que qualquer app de
logística existe hoje. O critério de sucesso é literal — uma pessoa que nunca
usou o app consegue contratar um frete, ou aceitar um serviço, em menos tempo e
com menos decisões do que leva hoje em qualquer concorrente.

Existem dois usuários, com jornadas opostas:

1. **Quem contrata** — precisa de uma caçamba, um frete, um transporte de carga
   pesada. Hoje isso envolve ligar, negociar, esperar confirmação. Quero que em
   2030 isso vire quase um comando único.
2. **Quem é contratado** — motoristas e operadores de caçamba/caminhão que vivem
   de aceitar corridas. Eles decidem em segundos, muitas vezes dirigindo ou com
   uma mão ocupada. A interface precisa respeitar isso.

### O que eu quero que você entregue

1. **Princípios de UX para 2030** (não genéricos). Não me dê "design
   minimalista" e "IA personalizada" soltos. Me diga, especificamente para
   logística pesada, quais fricções de hoje desaparecem em 2030 e como — por
   exemplo: como a pessoa descreve o que precisa transportar sem preencher
   formulário, como o preço fica óbvio sem negociação, como o motorista aceita
   sem precisar ler nada.
2. **Duas jornadas lado a lado.** Para "contratar" e "ser contratado", mapeie a
   jornada em etapas (do primeiro toque até o serviço concluído), mostrando
   quantos toques/decisões cada uma exige hoje vs. na sua proposta 2030. Seja
   concreto sobre o que foi eliminado e por quê.
3. **Telas-chave.** Liste as telas essenciais de cada jornada (não precisa
   desenhar, descreva o que cada uma mostra e por que aquilo é a única
   informação necessária naquele momento).
4. **Um elemento de assinatura por jornada.** Uma interação específica que se
   tornaria a marca registrada do Pagora — algo que, se alguém visse um print
   sem logo, reconheceria como "isso só pode ser o Pagora".
5. **Microcopy de exemplo.** 2–3 exemplos reais de texto de interface (botões,
   confirmações, mensagens de erro) no tom certo para motoristas e operadores —
   direto, sem jargão corporativo.

### Restrições

- Nada de tecnologia mágica ou não plausível (sem "IA lê sua mente"). Use
  tendências reais já em curso hoje — matching em tempo real, voz, visão
  computacional, pagamento invisível — levadas a um estado maduro de 2030.
- A "facilidade" não pode virar opacidade: a pessoa que contrata precisa
  entender o preço e o motorista precisa saber o que está aceitando, mesmo com
  menos telas.
- Pense em quem usa o app com luvas, sob sol, com pressa entre uma corrida e
  outra — não em um usuário sentado testando cada função com calma.

Estruture a resposta em markdown com os 5 blocos acima.
