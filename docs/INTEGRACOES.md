# PAGORA — APIs, integrações e onde cada credencial vive

Levantado do código e do banco em 01/10/2026.

> **Esta versão corrige um documento anterior** que listava SMS, Asaas e
> geocoding como "não existe". Os três estão implementados. O engano veio de
> procurar só no código de uma branch desatualizada, e de assumir que
> configuração de painel (Supabase Auth) seria visível no repositório.
> Verifique o estado real antes de contratar qualquer coisa.

## Onde cada credencial vive

Três lugares, e confundi-los é a fonte de erro mais comum:

| Lugar                                                   | O que vai ali                          | Por quê                                     |
| ------------------------------------------------------- | -------------------------------------- | ------------------------------------------- |
| **Cloudflare Pages → Settings → Environment variables** | tudo que começa com `VITE_`            | é o que builda e publica o site             |
| **Supabase → Edge Functions → Secrets**                 | `ASAAS_*`, `SUPABASE_SERVICE_ROLE_KEY` | nunca pode chegar ao navegador              |
| **Supabase → Authentication → Providers**               | provedor de SMS                        | o OTP é enviado pelo Supabase, não pelo app |

**Nada disso vai em secret do GitHub.** O deploy é pela integração nativa do
Cloudflare — ver `.github/DEPLOY.md`. O workflow em `.github/workflows/ci.yml`
só roda typecheck, lint e teste, e não usa credencial nenhuma.

> **A regra que não pode ser quebrada:** variável `VITE_*` é **pública**. Ela é
> compilada dentro do JavaScript e qualquer visitante lê no navegador. Chave do
> Asaas e `service_role` do Supabase **nunca** podem ser `VITE_*`.

---

## Estado real de cada integração

| Serviço               | Para quê                      | Estado                        | Onde configurar                                |
| --------------------- | ----------------------------- | ----------------------------- | ---------------------------------------------- |
| **Supabase**          | banco, RLS, auth              | ✅ operando                   | `VITE_SUPABASE_URL` · `VITE_SUPABASE_ANON_KEY` |
| **SMS / OTP**         | login por telefone            | ✅ **operando**               | Supabase → Auth → Providers                    |
| **Cloudflare Pages**  | hospedagem, build, CDN        | ⚠️ falta conectar ao Git      | painel do Cloudflare                           |
| **Asaas**             | Pix, cobrança, split, saque   | ⚠️ código pronto, falta chave | Edge Function secrets                          |
| **Google Places**     | autocomplete e distância real | ⚠️ código pronto, falta chave | `VITE_GOOGLE_MAPS_API_KEY`                     |
| **CartoDB / OSM**     | tiles do mapa                 | ✅ sem chave, sem custo       | nada a fazer                                   |
| **GA4 / Meta Pixel**  | analytics                     | opcional                      | `VITE_GA4_ID` · `VITE_META_PIXEL_ID`           |
| **Consulta de placa** | marca, modelo, PBT            | ❌ manual por decisão         | —                                              |
| **ANTT / RNTRC**      | situação do transportador     | ❌ não é API aberta           | homologação                                    |
| **BrasilAPI CNPJ**    | razão social de ETC/CTC       | ❌ não integrado              | grátis, sem chave                              |

---

## SMS e login — funcionando

Cinco contas no banco, **todas com telefone confirmado**, com acessos em
setembro. O provedor está configurado no painel do Supabase (não visível pelo
repositório, por isso o engano anterior).

Há **um admin** cadastrado. O papel vem da coluna `pagora.profiles.role`, e
mudá-lo exige SQL com `service_role`: a 0002 revoga `update (role)` de
`authenticated`, justamente para ninguém se auto-promover.

Quem se cadastra entra como `client`. Virar `admin` é ação manual — não existe
fila de aprovação para isso. Prestador é outro caminho: `provider_applications`
→ triagem → `approve_provider()`.

Telas de admin, já no código:

```
/admin-financeiro    painel que lê o ledger
/admin-dispute       resolução de disputas
```

---

## Asaas — implementado, falta a chave

Cinco Edge Functions em `supabase/functions/`:

```
create-payment            cria a cobrança
asaas-webhook             recebe a confirmação e chama as RPCs do banco
request-withdrawal        saque do prestador
advance-order             transição de status
create-provider-account   conta do prestador no gateway
_shared/                  asaas.ts, http.ts, money.ts
```

O webhook valida assinatura e chama `record_payment_event` → `confirm_payment`,
além de `confirm_withdrawal`, `fail_withdrawal` e `refund_order`.

Secrets que elas leem (Supabase → Edge Functions → Secrets):

```
ASAAS_API_KEY             chave da conta Asaas (sandbox primeiro)
ASAAS_ENV                 sandbox | production
ASAAS_WEBHOOK_TOKEN       valida que o webhook veio mesmo do Asaas
PAGORA_ALLOWED_ORIGINS    domínios autorizados a chamar as funções
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas
automaticamente pelo runtime — não precisa criar.

**O que falta:** conta no Asaas, as quatro secrets, `supabase functions deploy`,
e registrar a URL do webhook no painel do Asaas:

```
https://mibdmoralhjmwfuxmxiu.supabase.co/functions/v1/asaas-webhook
```

As funções do banco que movem dinheiro têm grant **apenas para `service_role`**.
O frontend não as alcança nem com sessão válida — é por isso que a Edge Function
existe, e por isso a chave do Asaas vive lá e não no bundle.

---

## Google Places — implementado, degrada sem chave

`src/hooks/usePlaces.ts` e `src/domains/geo/distance.ts`.

Sem `VITE_GOOGLE_MAPS_API_KEY` **nada quebra**: o hook devolve vazio, o
autocomplete some e a distância cai para linha reta corrigida por fator urbano,
ou para o padrão do domínio. O `DistanceSource` registra qual foi usada
(`route`, `straight`, `default`) para a tela poder dizer ao cliente que o valor
é estimativa.

Com a chave: autocomplete de endereço e distância real de via — que é o que
torna o orçamento confiável, já que o preço é por quilômetro.

Restrinja a chave por referrer HTTP (`pagorapro.com/*` e a porta local de
desenvolvimento) no Google Cloud Console. Ela é pública por natureza.

---

## O que ainda exige contratação

| Prioridade                    | Serviço                                        | Bloqueia              |
| ----------------------------- | ---------------------------------------------- | --------------------- |
| **Agora**                     | conectar Cloudflare Pages ao Git               | o site ir ao ar       |
| **Antes de cobrar**           | conta Asaas + 4 secrets + deploy das functions | pagamento e saque     |
| **Quando o preço importar**   | chave do Google Maps                           | precisão do orçamento |
| **Começar cedo, usar depois** | consulta formal à ANTT                         | selo automatizado     |

### Sobre a ANTT

O web service existe (`ConsultarSituacaoTransportador`,
`ConsultarFrotaTransportador`) mas é de uso restrito, com certificado digital e
autenticação mútua. Não se resolve gerando chave — é processo administrativo,
possivelmente de meses. Abrir a consulta cedo evita que vire gargalo.

**Enquanto não houver integração, o selo não pode dizer "verificado junto à
ANTT".** O que existe é verificação documental por um admin. A coluna
`transporter_registrations.antt_source` separa `manual` de `webservice`
justamente para essa distinção não se perder.

---

## Já resolvidos, sem conta e sem chave

| Serviço                                    | Observação                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **CartoDB / OpenStreetMap**                | tiles do mapa. Escolhido em vez de Mapbox e Google porque não exige chave nem cobra por carregamento. Atribuição obrigatória, já no código |
| **Validação de CPF, CNPJ, placa, RENAVAM** | aritmética local em `src/domains/validation/br.ts`                                                                                         |
