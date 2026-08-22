// =====================================================================
// PAGORA — invariantes financeiras e de segurança
// =====================================================================
// Estes testes não exercitam comportamento: eles travam PROPRIEDADES.
//
// A integridade financeira do Pagora depende de um punhado de constraints e
// policies no Postgres. Nenhuma delas é verificável rodando código TypeScript,
// e todas são removíveis com uma linha numa migration futura — normalmente por
// alguém tentando destravar um erro em desenvolvimento.
//
// Aqui a remoção quebra o build. Não substitui teste de integração contra um
// banco de verdade (ver "próximos passos" no relatório), mas é a diferença
// entre perder a proteção em silêncio e perder com aviso.
// =====================================================================
import { describe, it, expect } from 'vitest';

import enums from '../../supabase/migrations/0005_financial_enums.sql?raw';
import hardening from '../../supabase/migrations/0006_rls_hardening.sql?raw';
import schema from '../../supabase/migrations/0007_financial_schema.sql?raw';
import rpcs from '../../supabase/migrations/0008_financial_rpcs.sql?raw';

const normalize = (sql: string) => sql.replace(/\s+/g, ' ').toLowerCase();

describe('idempotência de webhook', () => {
  it('payment_events tem a unique que impede aplicar o mesmo evento duas vezes', () => {
    // Sem esta constraint, um reenvio de PAYMENT_RECEIVED — que o Asaas faz por
    // design até receber 200 — creditaria o prestador de novo.
    expect(normalize(schema)).toContain(
      'constraint payment_events_idempotency unique (gateway, gateway_event_id)',
    );
  });

  it('o ledger tem a segunda linha de defesa: um lançamento por (payment, kind, bucket)', () => {
    expect(normalize(schema)).toContain(
      'wallet_tx_one_per_payment_kind on pagora.wallet_transactions (payment_id, kind, bucket)',
    );
  });

  it('confirm_payment é reentrante — repetir depois de pago é no-op, não erro', () => {
    const fn = rpcs.slice(
      rpcs.indexOf('function pagora.confirm_payment'),
      rpcs.indexOf('function pagora.settle_order'),
    );
    expect(normalize(fn)).toContain("if v_payment.status = 'paid' then return v_payment");
  });

  it('confirm_payment confere o valor informado pelo gateway antes de creditar', () => {
    const fn = rpcs.slice(
      rpcs.indexOf('function pagora.confirm_payment'),
      rpcs.indexOf('function pagora.settle_order'),
    );
    expect(normalize(fn)).toContain('amount_mismatch');
    expect(normalize(fn)).toContain(
      'if p_amount_cents is distinct from v_payment.amount_cents then',
    );
  });
});

describe('integridade do saldo', () => {
  it('carteira não pode ficar negativa', () => {
    expect(normalize(schema)).toContain('check (balance_cents >= 0 and pending_cents >= 0)');
  });

  it('cada lançamento fecha: saldo depois = saldo antes + movimento', () => {
    expect(normalize(schema)).toContain(
      'check (balance_after_cents = balance_before_cents + amount_cents)',
    );
  });

  it('o ledger é append-only — sem UPDATE e sem DELETE', () => {
    expect(normalize(schema)).toContain('before update or delete on pagora.wallet_transactions');
    expect(normalize(schema)).toContain('reject_ledger_mutation');
  });

  it('o dinheiro do pedido fecha: bruto = comissão + líquido do prestador', () => {
    expect(normalize(schema)).toContain(
      'check (price_cents = platform_fee_cents + provider_amount_cents)',
    );
    expect(normalize(schema)).toContain(
      'check (amount_cents = platform_fee_cents + provider_amount_cents)',
    );
  });

  it('saque debita na SOLICITAÇÃO, não na confirmação', () => {
    const fn = rpcs.slice(
      rpcs.indexOf('function pagora.request_withdrawal'),
      rpcs.indexOf('function pagora.confirm_withdrawal'),
    );
    // O débito tem que estar dentro de request_withdrawal; se estivesse só em
    // confirm_withdrawal, dois saques simultâneos passariam pela checagem de
    // saldo antes de qualquer débito.
    expect(normalize(fn)).toContain("p_kind => 'withdrawal'");
    expect(normalize(fn)).toContain('p_amount_cents => -p_amount_cents');
    expect(normalize(fn)).toContain('insufficient_balance');
  });

  it('só existe um saque em voo por prestador', () => {
    expect(normalize(schema)).toContain(
      "withdrawals_one_inflight_per_provider on pagora.withdrawals (provider_id) where status in ('requested', 'processing')",
    );
  });

  it('saque repetido com a mesma chave devolve o original', () => {
    expect(normalize(schema)).toContain(
      'withdrawals_idempotency_uniq on pagora.withdrawals (provider_id, idempotency_key)',
    );
  });

  it('comissão em SQL usa aritmética decimal exata, não ponto flutuante', () => {
    // `p_gross_cents * 0.15` em float divergiria de (x*15)/100 do TypeScript
    // em valores de fronteira. numeric mantém os dois idênticos.
    expect(normalize(rpcs)).toContain(
      'round((p_gross_cents::numeric * pagora.platform_fee_bps()) / 10000)::int',
    );
  });

  it('a comissão do banco é a mesma do TypeScript', () => {
    expect(normalize(rpcs)).toContain('returns int language sql immutable as $$ select 1500 $$');
  });
});

describe('o browser não escreve dinheiro nem estado', () => {
  it('a 0006 derruba os privilégios amplos herdados do default privileges', () => {
    // Sem este revoke, os `revoke update (coluna)` da 0002 são inócuos: no
    // Postgres o privilégio de tabela não é afetado por revogação de coluna.
    expect(normalize(hardening)).toContain(
      'revoke insert, update, delete on all tables in schema pagora from authenticated',
    );
  });

  it('orders perde a policy de UPDATE que permitia reescrever preço e status', () => {
    expect(normalize(hardening)).toContain('drop policy if exists orders_update_party');
  });

  it('a policy que deixava o cliente reescrever o preço da proposta some', () => {
    expect(normalize(hardening)).toContain('drop policy if exists quotes_client_view');
  });

  it('o prestador perde a escrita direta em disputes', () => {
    expect(normalize(hardening)).toContain('drop policy if exists disputes_party_update');
  });

  it('as colunas de dinheiro nunca são concedidas ao papel authenticated', () => {
    const grants = hardening.match(/grant (insert|update) \([^)]*\)/gi) ?? [];
    const forbidden = [
      'platform_fee_cents',
      'provider_amount_cents',
      'price_cents',
      'balance_cents',
      'refund_cents',
      'penalty_cents',
      'approved_at',
      'rating_avg',
    ];
    for (const grant of grants) {
      // `price_cents` é concedido em `quotes` de propósito: é o prestador
      // definindo o próprio preço, o que é legítimo.
      const isQuotePrice = grant.includes('price_cents') && grant.includes('eta_minutes');
      for (const column of forbidden) {
        if (isQuotePrice && column === 'price_cents') continue;
        expect(grant.toLowerCase(), `GRANT expõe coluna proibida: ${grant}`).not.toContain(column);
      }
    }
  });

  it('nenhuma função que move dinheiro é concedida a authenticated', () => {
    const moneyFunctions = [
      'post_ledger_entry',
      'prepare_payment',
      'confirm_payment',
      'settle_order',
      'request_withdrawal',
      'confirm_withdrawal',
      'fail_withdrawal',
      'refund_order',
      'attach_provider_wallet',
      'advance_order_status',
    ];
    const grantBlock = normalize(rpcs);
    for (const fn of moneyFunctions) {
      const grantsToAuth = new RegExp(
        `grant execute on function pagora\\.${fn}\\([^)]*\\) to [^;]*authenticated`,
      );
      expect(grantsToAuth.test(grantBlock), `${fn} não pode ser chamável pelo browser`).toBe(false);
    }
  });

  it('as novas tabelas financeiras não têm policy de escrita', () => {
    const policies = schema.match(/create policy \w+ on pagora\.\w+\s+for (\w+)/gi) ?? [];
    for (const policy of policies) {
      expect(policy.toLowerCase()).toMatch(/for select/);
    }
  });
});

describe('máquina de estados', () => {
  it('advance_order_status valida o caminho E o ator, separadamente', () => {
    const fn = rpcs.slice(
      rpcs.indexOf('function pagora.advance_order_status'),
      rpcs.indexOf('function pagora.prepare_payment'),
    );
    expect(normalize(fn)).toContain('invalid_transition');
    expect(normalize(fn)).toContain('forbidden_transition');
    expect(normalize(fn)).toContain('from pagora.order_status_transitions');
  });

  it('prepare_payment lê o preço da order — não aceita valor do cliente', () => {
    const fn = rpcs.slice(
      rpcs.indexOf('function pagora.prepare_payment'),
      rpcs.indexOf('function pagora.attach_gateway_payment'),
    );
    // A assinatura tem exatamente dois parâmetros: pedido e ator. Não há por
    // onde um valor entrar.
    expect(normalize(rpcs)).toContain(
      'function pagora.prepare_payment( p_order_id uuid, p_actor_id uuid )',
    );
    expect(normalize(fn)).toContain('pagora.compute_amounts(v_order.price_cents)');
  });

  it('os enums novos vivem numa migration separada das que os usam', () => {
    // ALTER TYPE ... ADD VALUE não pode ter o valor usado na mesma transação.
    expect(normalize(enums)).toContain("add value if not exists 'paid'");
    expect(normalize(enums)).not.toContain('create table');
    expect(normalize(enums)).not.toContain('create policy');
  });
});

describe('nenhum segredo no bundle do frontend', () => {
  // Varre TODO o src/ em tempo de teste. Um `VITE_ASAAS_API_KEY` acrescentado
  // por conveniência num sábado quebra aqui na segunda.
  const sources = import.meta.glob('../**/*.{ts,tsx}', { query: '?raw', eager: true }) as Record<
    string,
    { default: string }
  >;

  const FORBIDDEN = [
    'service_role',
    'SUPABASE_SERVICE_ROLE',
    'ASAAS_API_KEY',
    'VITE_ASAAS',
    'ASAAS_WEBHOOK_TOKEN',
    'access_token:',
  ];

  it('varre uma quantidade plausível de arquivos (o glob não pode falhar em silêncio)', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10);
  });

  /**
   * Remove comentários antes de varrer. Documentar que uma função é
   * `grant ... to service_role` é justamente o que queremos que exista no
   * código; o que não pode existir é a string em posição executável.
   */
  const stripComments = (code: string) =>
    code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  it.each(FORBIDDEN)('nenhum arquivo de src/ menciona %s fora de comentário', (needle) => {
    const offenders = Object.entries(sources)
      .filter(([path]) => !path.includes('.test.'))
      .filter(([, mod]) => stripComments(mod.default).includes(needle))
      .map(([path]) => path);

    expect(offenders, `segredo vazando em: ${offenders.join(', ')}`).toEqual([]);
  });

  it('o client do browser usa a anon key, e só ela', () => {
    const supabaseClient = Object.entries(sources).find(([p]) => p.endsWith('lib/supabase.ts'));
    expect(supabaseClient).toBeDefined();
    expect(supabaseClient![1].default).toContain('VITE_SUPABASE_ANON_KEY');
  });
});
