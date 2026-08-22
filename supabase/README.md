# PAGORA — backend (Postgres + Edge Functions)

## Ordem das migrations

| Arquivo                      | O que faz                                                       |
| ---------------------------- | --------------------------------------------------------------- |
| `0001_initial_schema.sql`    | 9 tabelas, 7 enums, 3 RPCs                                      |
| `0002_rls_policies.sql`      | RLS inicial                                                     |
| `0003_waitlist.sql`          | Lista de espera (insert anônimo)                                |
| `0004_provider_applications` | Cadastro público de prestador                                   |
| **`0005_financial_enums`**   | Só `ALTER TYPE ... ADD VALUE` e `CREATE TYPE`                   |
| **`0006_rls_hardening`**     | Fecha as brechas de escrita da 0002                             |
| **`0007_financial_schema`**  | `payments`, `payment_events`, `withdrawals`, ledger, transições |
| **`0008_financial_rpcs`**    | Funções server-side de dinheiro                                 |

> A 0005 existe separada por uma restrição do Postgres: um valor de enum
> adicionado com `ALTER TYPE ... ADD VALUE` **não pode ser usado na mesma
> transação**. Como o Supabase roda cada migration numa transação, qualquer
> policy ou constraint que mencione `'paid'`, `'settled'` etc. precisa estar num
> arquivo posterior. **Não junte a 0005 com a 0006/0007.**

## Aplicar

```bash
supabase link --project-ref kigmdcjpgmvsyiuqadct
supabase db push
```

Depois do push, confirmar no Dashboard → Settings → API → **Exposed schemas**
que `pagora` continua listado.

## Gerar os tipos TypeScript

O `src/lib/database.types.ts` é mantido à mão desde a 0001 e **deve deixar de
ser**. Com o projeto linkado:

```bash
export PAGORA_SUPABASE_PROJECT_ID=kigmdcjpgmvsyiuqadct
npm run db:types
```

Isso escreve `src/lib/database.generated.ts`. A migração é incremental de
propósito: gere, compare com o arquivo manual, e só então troque os imports.
`npm run db:types:check` falha se o gerado divergir do commitado — é o que
entra no CI para pegar schema alterado sem regeneração de tipo.

## Secrets das Edge Functions

Nenhum destes valores pode existir com prefixo `VITE_`. O prefixo expõe a
variável no bundle do browser.

```bash
supabase secrets set ASAAS_API_KEY='...'          # chave da conta principal
supabase secrets set ASAAS_ENV='sandbox'          # ou 'production'
supabase secrets set ASAAS_WEBHOOK_TOKEN='...'    # token que você define
supabase secrets set PAGORA_ALLOWED_ORIGINS='http://localhost:5173,https://pagora.com.br'
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas
automaticamente pelo runtime.

## Deploy das funções

```bash
npm run fn:deploy
```

O webhook precisa rodar **sem verificação de JWT** — quem chama é o Asaas, que
não tem sessão. A autenticação dele é o header `asaas-access-token`:

```bash
supabase functions deploy asaas-webhook --no-verify-jwt
```

## Configurar o webhook no Asaas

Painel do Asaas → Integrações → Webhooks:

- **URL**: `https://kigmdcjpgmvsyiuqadct.supabase.co/functions/v1/asaas-webhook`
- **Token de autenticação**: o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
- **Eventos**: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`,
  `PAYMENT_REFUNDED`, `TRANSFER_DONE`, `TRANSFER_FAILED`

## Testes de integração (sem Docker)

```bash
npm run test:db
```

`supabase/tests/harness.ts` sobe um **PostgreSQL 18 real** (PGlite, compilado
para WASM) dentro do processo do Vitest, aplica as 8 migrations e expõe
`actAs(userId, fn)` — que faz `set role authenticated` e injeta o claim `sub`,
o mesmo caminho do PostgREST. É assim que as policies de RLS são exercitadas
de verdade, e não por leitura do texto do SQL.

**Limite honesto:** PGlite tem uma conexão só. Corrida real — dois clientes
disputando a mesma linha no mesmo instante — não é observável aqui. O que os
testes cobrem é o efeito serializado (a segunda tentativa encontra o estado já
mudado e falha) e as travas declarativas (unique parcial, constraint de saldo).
Concorrência de verdade só com o Postgres do Supabase e conexões paralelas.

O shim de `auth.uid()`, os papéis `anon`/`authenticated`/`service_role` e a
publication `supabase_realtime` são **andaime de teste** e não existem em
nenhuma migration.

## Conferir a saúde financeira

```sql
-- Deve retornar ZERO linhas. Cada linha é um saldo que não bate com o ledger.
select * from pagora.audit_wallet_integrity();

-- Webhooks que chegaram e não foram aplicados.
select gateway_event_id, event_type, process_error, created_at
  from pagora.payment_events
 where processed_at is null
 order by created_at desc;

-- "Onde está o dinheiro deste pedido?" (só admin)
select pagora.order_financial_trail('<order-uuid>');
```
