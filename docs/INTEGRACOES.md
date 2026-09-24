# PAGORA — APIs, integrações e secrets

Levantado em 24/09/2026 a partir do código e do schema.

## Onde cada secret vive

Três lugares diferentes, e confundi-los é a fonte de erro mais comum:

| Lugar | O que vai ali | Por quê |
|---|---|---|
| **GitHub → Settings → Secrets → Actions** | tudo que começa com `VITE_` + credenciais do Cloudflare | `VITE_*` é gravado dentro do bundle no build |
| **Supabase → Authentication → Providers** | provedor de SMS (Twilio etc.) | o OTP é enviado pelo Supabase, não pelo app |
| **Supabase → Edge Functions → Secrets** | chave do Asaas, qualquer credencial de servidor | nunca pode chegar ao navegador |

> **A regra que não pode ser quebrada:** qualquer variável `VITE_*` é **pública**.
> Ela é compilada dentro do JavaScript e qualquer visitante lê no navegador.
> Chave de gateway de pagamento, `service_role` do Supabase e token de API
> **nunca** podem ser `VITE_*`. Se precisar delas, o lugar é Edge Function.

---

## Fase 1 — subir a captação (landing + waitlist + cadastro de prestador)

| Serviço | Para quê | Secret / variável | Onde pegar | Custo |
|---|---|---|---|---|
| **Supabase** | banco, RLS, auth | `VITE_SUPABASE_URL`<br>`VITE_SUPABASE_ANON_KEY` | Project → Settings → API | Free até ~500 MB |
| **Cloudflare Pages** | hospedagem + CDN | `CLOUDFLARE_ACCOUNT_ID`<br>`CLOUDFLARE_API_TOKEN` | Dashboard → sidebar direita<br>My Profile → API Tokens | Grátis |
| **WhatsApp** | botões de contato | `VITE_PAGORA_WPP_NUMBER` | o número da central, E.164 sem `+` | Grátis (só deep link `wa.me`) |
| **Domínio** | `pagorapro.com` | — | registrador onde foi comprado | anuidade |

**Escopo do token Cloudflare:** o template "Edit Cloudflare Workers" funciona, mas
reduza para `Account → Cloudflare Pages → Edit`. É o único secret genuinamente
sensível desta fase.

**A anon key NÃO é secreta.** Ela vai no bundle por desenho. O que protege o
banco é a RLS. Está em "secrets" só porque é assim que se passa variável de
build no Actions.

---

## Fase 2 — analytics (opcional, não bloqueia nada)

| Serviço | Secret | Onde pegar | Custo |
|---|---|---|---|
| **Google Analytics 4** | `VITE_GA4_ID` | Admin → Data streams → Measurement ID (`G-…`) | Grátis |
| **Meta Pixel** | `VITE_META_PIXEL_ID` | Events Manager → Data sources → Pixel ID | Grátis |

Secret ausente = script não carrega. Sem erro, sem request para Google ou Meta.
O `index.html` checa antes de injetar.

---

## Fase 3 — app transacional (pedido → pagamento → rastreio)

| Serviço | Para quê | Onde configurar | Estado hoje |
|---|---|---|---|
| **Provedor de SMS**<br>(Twilio, MessageBird, Zenvia) | OTP de login | Supabase → Authentication → Providers → Phone | Código pronto (`lib/auth.ts`), provedor não contratado |
| **Asaas** | Pix, cobrança, split, saque | Edge Function secret `ASAAS_API_KEY` | **Só no schema.** Zero código de integração |
| **Supabase Storage** | CNH, selfie, documento | já incluso no Supabase | Bucket não criado |
| **Geocoding** | endereço → lat/lng | a definir | Não existe |

### Sobre o SMS

É o gargalo silencioso do login: sem provedor contratado, `signInWithOtp` falha
e **ninguém entra na conta**. Custo é por mensagem, e SMS no Brasil não é
barato. Vale avaliar login por e-mail (magic link, grátis no Supabase) para o
MVP e deixar SMS para quando o volume justificar.

### Sobre o Asaas

O schema inteiro assume Asaas: `payment_gateway` é um enum de um valor só,
`payments`, `withdrawals` e `payment_events` têm coluna `gateway` com default
`'asaas'`, e as funções `confirm_payment` / `record_payment_event` esperam o
formato de webhook dele.

Mas **não existe nenhum código chamando o Asaas**. O que falta:

1. Conta Asaas + chave de API (sandbox primeiro)
2. Edge Function que recebe o webhook e chama `record_payment_event` →
   `confirm_payment`
3. Edge Function que cria a cobrança e chama `attach_gateway_payment`

As funções do banco que movem dinheiro têm grant **apenas para `service_role`** —
o frontend não as alcança por desenho. Isso não é limitação a contornar, é a
proteção: a chave do Asaas e a `service_role` ficam na Edge Function, nunca no
navegador.

### Sobre geocoding

O mapa precisa de `base_lat`/`base_lng` no prestador e `origin_lat`/`origin_lng`
no pedido. Hoje nada preenche esses campos. Opções:

| Opção | Custo | Observação |
|---|---|---|
| **Nominatim** (OpenStreetMap) | Grátis | Limite de 1 req/s, exige User-Agent próprio; uso pesado viola os termos |
| **BrasilAPI CEP** | Grátis, sem chave | Devolve endereço, **não** coordenada — resolve só metade |
| **Google Geocoding** | Pago por request | Melhor cobertura no Brasil |
| **Coordenada do navegador** | Grátis | `navigator.geolocation` resolve a posição do cliente, não do endereço digitado |

Para o MVP, `navigator.geolocation` no cliente + Nominatim no cadastro do
prestador cobre o caso sem custo.

---

## Fase 4 — PAGORA CHECK automatizado

Hoje a verificação é **documental e manual** — admin confere e registra. Estas
integrações automatizam, e nenhuma bloqueia o lançamento.

| Serviço | Para quê | Custo | Estado |
|---|---|---|---|
| **Consulta veicular por placa**<br>(DadosAPI, PlacaAPI, outros) | preencher marca, modelo, ano, PBT | por consulta | Decisão do cliente: manual primeiro |
| **ANTT / RNTRC** | situação do transportador, vínculo de frota | homologação | **Não é API aberta.** Exige certificado digital e autorização |
| **BrasilAPI CNPJ** | razão social e situação cadastral de ETC/CTC | **Grátis, sem chave** | Não integrado |

### Sobre a ANTT

O web service existe (`ConsultarSituacaoTransportador`,
`ConsultarFrotaTransportador`) mas é de uso restrito, com certificado digital e
autenticação mútua. Não se resolve gerando uma chave.

**É a frente mais lenta do projeto** — processo administrativo que pode levar
meses. Se depender dela para lançar, ela vira o gargalo. Vale abrir a consulta
formal cedo e seguir com verificação manual enquanto isso.

**Enquanto não houver integração, o selo não pode dizer "verificado junto à
ANTT".** O que existe é um admin conferindo PDF. A coluna
`transporter_registrations.antt_source` separa `manual` de `webservice`
justamente para essa distinção não se perder.

---

## Já resolvidos, sem conta e sem chave

| Serviço | Para quê | Observação |
|---|---|---|
| **CartoDB / OpenStreetMap** | tiles do mapa | Sem chave. Atribuição obrigatória, já no código |
| **Validação de CPF, CNPJ, placa, RENAVAM** | conformidade | Aritmética local — `src/lib/documentos.ts` e `placa.ts` |

Escolher CartoDB em vez de Mapbox ou Google Maps foi deliberado: os dois exigem
chave e cobram por carregamento. O mapa funciona sem custo e sem cadastro.

---

## Resumo do que falta contratar

| Prioridade | Serviço | Bloqueia |
|---|---|---|
| **Agora** | Cloudflare (conta + token) | o deploy |
| **Agora** | Domínio `pagorapro.com` apontado | o endereço público |
| **Antes do login** | Provedor de SMS, ou trocar para magic link | qualquer acesso a conta |
| **Antes de cobrar** | Asaas + 2 Edge Functions | pedido, pagamento, saque |
| **Antes do mapa real** | Geocoding | prestadores próximos |
| **Começar cedo, usar depois** | Consulta ANTT | selo automatizado |
