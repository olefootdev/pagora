# Migrations do PAGORA

## Ordem de aplicação

| Arquivo | Registrado no banco como | Origem |
|---|---|---|
| `0001_initial_schema.sql` | `0001` | repo |
| `0002_rls_policies.sql` | `0002` | repo |
| `0003_waitlist.sql` | `0003` | repo |
| `0004_provider_applications.sql` | `0004` | repo |
| `20260924160000_reconcile_orphan_schema.sql` | `0005`–`0011` | **reconciliação** |
| `20260924155422_geolocation.sql` | `20260924155422` | repo |
| `20260924155545_pagora_check.sql` | `20260924155545` | repo |

A numeração parece fora de ordem e é de propósito — veja abaixo.

## Por que existe o arquivo de reconciliação

Em 24/09/2026 o banco registrava **11 migrations aplicadas** e o repositório
tinha apenas as 4 primeiras. As sete do meio foram aplicadas direto no Supabase
sem commit dos arquivos:

```
0005 financial_enums          0009 hardening_public_forms
0006 rls_hardening            0010 chat
0007 financial_schema         0011 onboarding_simples
0008 financial_rpcs
```

Na prática, o repositório não reproduzia o banco: recriar o projeto do zero
perderia pagamento, saque, ledger, chat, disputas e verificação de conta.

`20260924160000_reconcile_orphan_schema.sql` captura tudo isso num arquivo só,
gerado por introspecção do catálogo do Postgres. Ele **não reconstrói o
histórico** — as sete viram uma, e quem fez cada mudança se perdeu. O que ele
devolve é a capacidade de recriar o banco.

### Como foi conferido

- os 27 corpos de função batem com `pg_proc.prosrc` do banco, hash a hash
- as 7 tabelas batem em conjunto de colunas e de constraints
- os `grant`/`revoke` refletem os ACLs reais, então aplicar não altera permissão
- todo o arquivo é `if not exists` / `create or replace` / `drop ... if exists`,
  então rodar contra o banco atual é no-op

### Por que o timestamp é maior que o dos dois arquivos seguintes

`20260924160000` (16:00) é posterior a `20260924155422` (15:54) e
`20260924155545` (15:55) porque geolocalização e PAGORA CHECK foram aplicados
antes de a reconciliação ser escrita. **A ordem lógica é a da tabela acima**: a
reconciliação descreve o estado 0005–0011, que precede os dois.

Num banco novo, aplique na ordem da tabela, não na ordem alfabética dos nomes.

## Numeração daqui em diante

Use timestamp (`YYYYMMDDHHMMSS_nome.sql`), que é a convenção do Supabase CLI e
não colide entre duas máquinas trabalhando em paralelo. A numeração sequencial
`000N` foi o que causou a colisão que motivou este documento: geolocalização e
PAGORA CHECK nasceram como `0005` e `0006`, números já ocupados no banco.

## Regra que evita o problema se repetir

**Migration aplicada no Supabase tem que estar commitada no mesmo dia.** O banco
não é a fonte de verdade do schema — o repositório é. Quando os dois divergem,
quem perde é quem precisar recriar o ambiente.

Para conferir se divergiram:

```sql
-- no SQL Editor: lista o que o banco acha que aplicou
select version, name from supabase_migrations.schema_migrations order by version;
```

Compare com `ls supabase/migrations/`. Todo `version` sem arquivo correspondente
é dívida.
