// =====================================================================
// PAGORA — RLS e autorização, exercitadas contra Postgres real
// =====================================================================
// Cada bloco aqui corresponde a uma vulnerabilidade concreta encontrada na
// auditoria da 0002. Os testes rodam com `set role authenticated` e o claim
// `sub` populado — o mesmo caminho que o PostgREST usa —, então o que passa
// aqui é o que um usuário logado consegue fazer via API REST.
// =====================================================================
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupDatabase, expectRejection, type TestDb } from './harness';

let t: TestDb;

beforeAll(async () => {
  t = await setupDatabase();
});
afterAll(async () => {
  await t?.close();
});

async function makeRequestWithQuote(clientId: string, providerId: string, priceCents = 30_000) {
  const { rows: req } = await t.db.query<{ id: string }>(
    `insert into pagora.service_requests (client_id, service, payload)
     values ($1, 'frete', '{}'::jsonb) returning id`,
    [clientId],
  );
  const { rows: quote } = await t.db.query<{ id: string }>(
    `insert into pagora.quotes (request_id, provider_id, price_cents, status)
     values ($1, $2, $3, 'sent') returning id`,
    [req[0]!.id, providerId, priceCents],
  );
  return { requestId: req[0]!.id, quoteId: quote[0]!.id };
}

/**
 * `accept_quote` roda como o cliente (usa auth.uid() internamente), então
 * precisa ser chamada dentro de actAs — chamar solta dá "unauthenticated".
 */
async function acceptAs(clientId: string, quoteId: string) {
  return await t.actAs(clientId, async () => {
    const { rows } = await t.db.query<{ id: string }>('select id from pagora.accept_quote($1)', [
      quoteId,
    ]);
    return rows[0]!.id;
  });
}

// ===========================================================================
describe('[C2] price tampering — cliente reescrevendo o preço da proposta', () => {
  it('cliente NÃO consegue baixar o price_cents de uma proposta do próprio pedido', async () => {
    const clientId = await t.createUser();
    const providerId = await t.createProvider();
    const { quoteId } = await makeRequestWithQuote(clientId, providerId, 30_000);

    await t.actAs(clientId, async () => {
      // A policy `quotes_client_view` da 0002 permitia exatamente isto.
      // O UPDATE agora não afeta linha nenhuma (sem policy) ou é negado.
      await t.db
        .query('update pagora.quotes set price_cents = 1 where id = $1', [quoteId])
        .catch(() => null);
    });

    const { rows } = await t.db.query<{ price_cents: number }>(
      'select price_cents from pagora.quotes where id = $1',
      [quoteId],
    );
    expect(rows[0]!.price_cents).toBe(30_000);
  });

  it('mesmo se tentasse, aceitar cobra o preço que está na linha da proposta', async () => {
    const clientId = await t.createUser();
    const providerId = await t.createProvider();
    const { quoteId } = await makeRequestWithQuote(clientId, providerId, 45_000);

    const order = await t.actAs(clientId, async () => {
      await t.db
        .query('update pagora.quotes set price_cents = 100 where id = $1', [quoteId])
        .catch(() => null);
      const { rows } = await t.db.query<{ price_cents: number; platform_fee_cents: number }>(
        'select * from pagora.accept_quote($1)',
        [quoteId],
      );
      return rows[0]!;
    });

    expect(order.price_cents).toBe(45_000);
    expect(order.platform_fee_cents).toBe(6_750);
  });

  it('o prestador continua podendo ajustar o PRÓPRIO preço enquanto a proposta vive', async () => {
    const clientId = await t.createUser();
    const providerId = await t.createProvider();
    const { quoteId } = await makeRequestWithQuote(clientId, providerId, 30_000);

    await t.actAs(providerId, async () => {
      await t.db.query('update pagora.quotes set price_cents = 28_000 where id = $1', [quoteId]);
    });

    const { rows } = await t.db.query<{ price_cents: number }>(
      'select price_cents from pagora.quotes where id = $1',
      [quoteId],
    );
    expect(rows[0]!.price_cents).toBe(28_000);
  });

  it('prestador não consegue marcar a própria proposta como aceita', async () => {
    const clientId = await t.createUser();
    const providerId = await t.createProvider();
    const { quoteId } = await makeRequestWithQuote(clientId, providerId);

    await t.actAs(providerId, async () => {
      await t.db
        .query("update pagora.quotes set status = 'accepted' where id = $1", [quoteId])
        .catch(() => null);
    });

    const { rows } = await t.db.query<{ status: string }>(
      'select status from pagora.quotes where id = $1',
      [quoteId],
    );
    expect(rows[0]!.status).toBe('sent');
  });
});

// ===========================================================================
describe('[C1] orders — somente leitura pelo browser', () => {
  async function anOrder() {
    const clientId = await t.createUser();
    const providerId = await t.createProvider();
    const { quoteId } = await makeRequestWithQuote(clientId, providerId, 30_000);
    const orderId = await acceptAs(clientId, quoteId);
    return { clientId, providerId, orderId };
  }

  it('cliente não zera a comissão da plataforma', async () => {
    const { clientId, orderId } = await anOrder();
    await t.actAs(clientId, async () => {
      await t.db
        .query('update pagora.orders set platform_fee_cents = 0 where id = $1', [orderId])
        .catch(() => null);
    });
    const { rows } = await t.db.query<{ platform_fee_cents: number }>(
      'select platform_fee_cents from pagora.orders where id = $1',
      [orderId],
    );
    expect(rows[0]!.platform_fee_cents).toBe(4_500);
  });

  it('cliente não marca o pedido como pago sem pagar', async () => {
    const { clientId, orderId } = await anOrder();
    await t.actAs(clientId, async () => {
      await t.db
        .query("update pagora.orders set status = 'paid' where id = $1", [orderId])
        .catch(() => null);
    });
    const { rows } = await t.db.query<{ status: string }>(
      'select status from pagora.orders where id = $1',
      [orderId],
    );
    expect(rows[0]!.status).toBe('pending_payment');
  });

  it('prestador não marca como concluído para liberar o próprio saldo', async () => {
    const { providerId, orderId } = await anOrder();
    await t.actAs(providerId, async () => {
      await t.db
        .query("update pagora.orders set status = 'settled' where id = $1", [orderId])
        .catch(() => null);
    });
    const { rows } = await t.db.query<{ status: string }>(
      'select status from pagora.orders where id = $1',
      [orderId],
    );
    expect(rows[0]!.status).toBe('pending_payment');
  });
});

// ===========================================================================
describe('IDOR — usuário A acessando recurso de B', () => {
  it('A não enxerga o pedido de B', async () => {
    const a = await t.createUser();
    const b = await t.createUser();
    const providerId = await t.createProvider();
    const { quoteId } = await makeRequestWithQuote(b, providerId);
    const orderId_ = await acceptAs(b, quoteId);
    const o = [{ id: orderId_ }];

    const visible = await t.actAs(a, async () => {
      const { rows } = await t.db.query('select id from pagora.orders where id = $1', [o[0]!.id]);
      return rows;
    });
    expect(visible).toEqual([]);
  });

  it('A não enxerga a carteira nem o extrato de um prestador', async () => {
    const a = await t.createUser();
    const providerId = await t.createProvider();

    const seen = await t.actAs(a, async () => {
      const w = await t.db.query('select * from pagora.wallets where provider_id = $1', [
        providerId,
      ]);
      const tx = await t.db.query(
        'select * from pagora.wallet_transactions where provider_id = $1',
        [providerId],
      );
      return { wallets: w.rows.length, tx: tx.rows.length };
    });
    expect(seen).toEqual({ wallets: 0, tx: 0 });
  });

  it('A não enxerga o pagamento de B', async () => {
    const a = await t.createUser();
    const b = await t.createUser();
    const providerId = await t.createProvider();
    const { quoteId } = await makeRequestWithQuote(b, providerId);
    const orderId_ = await acceptAs(b, quoteId);
    const o = [{ id: orderId_ }];
    await t.db.query('select pagora.prepare_payment($1, $2)', [o[0]!.id, b]);

    const visible = await t.actAs(a, async () => {
      const { rows } = await t.db.query('select id from pagora.payments where order_id = $1', [
        o[0]!.id,
      ]);
      return rows;
    });
    expect(visible).toEqual([]);
  });

  it('ninguém lê o payload cru dos webhooks — nem o dono do pedido', async () => {
    const b = await t.createUser();
    const rows = await t.actAs(b, async () => {
      const r = await t.db.query('select * from pagora.payment_events').catch(() => ({ rows: [] }));
      return r.rows;
    });
    expect(rows).toEqual([]);
  });
});

// ===========================================================================
describe('escalonamento de privilégio', () => {
  it('usuário não consegue se promover a admin', async () => {
    const user = await t.createUser();
    await t.actAs(user, async () => {
      await t.db
        .query("update pagora.profiles set role = 'admin' where id = $1", [user])
        .catch(() => null);
    });
    const { rows } = await t.db.query<{ role: string }>(
      'select role from pagora.profiles where id = $1',
      [user],
    );
    expect(rows[0]!.role).toBe('client');
  });

  it('prestador não se auto-aprova', async () => {
    const id = await t.createUser({ role: 'provider' });
    await t.db.query(
      `insert into pagora.providers (profile_id, display_name, services)
       values ($1, 'Teste', '{frete}'::pagora.service_type[])`,
      [id],
    );

    await t.actAs(id, async () => {
      await t.db
        .query('update pagora.providers set approved_at = now() where profile_id = $1', [id])
        .catch(() => null);
    });

    const { rows } = await t.db.query<{ approved_at: string | null }>(
      'select approved_at from pagora.providers where profile_id = $1',
      [id],
    );
    expect(rows[0]!.approved_at).toBeNull();
  });

  it('prestador não infla a própria nota', async () => {
    const providerId = await t.createProvider();
    await t.actAs(providerId, async () => {
      await t.db
        .query('update pagora.providers set rating_avg = 5.0 where profile_id = $1', [providerId])
        .catch(() => null);
    });
    const { rows } = await t.db.query<{ rating_avg: string }>(
      'select rating_avg from pagora.providers where profile_id = $1',
      [providerId],
    );
    expect(Number(rows[0]!.rating_avg)).toBe(0);
  });

  it('usuário não se credita saldo', async () => {
    const providerId = await t.createProvider();
    await t.actAs(providerId, async () => {
      await t.db
        .query('update pagora.wallets set balance_cents = 999999 where provider_id = $1', [
          providerId,
        ])
        .catch(() => null);
      await t.db
        .query(
          `insert into pagora.wallet_transactions
             (provider_id, kind, bucket, direction, amount_cents, balance_before_cents, balance_after_cents)
           values ($1, 'bonus', 'available', 'credit', 999999, 0, 999999)`,
          [providerId],
        )
        .catch(() => null);
    });

    const { rows } = await t.db.query<{ balance_cents: number }>(
      'select balance_cents from pagora.wallets where provider_id = $1',
      [providerId],
    );
    expect(rows[0]!.balance_cents).toBe(0);
  });

  it('as funções que movem dinheiro não são executáveis por um usuário logado', async () => {
    const providerId = await t.createProvider();
    await t.actAs(providerId, async () => {
      for (const call of [
        `select pagora.post_ledger_entry('${providerId}'::uuid, 'bonus', 'available', 100000)`,
        `select pagora.request_withdrawal('${providerId}'::uuid, 100, 'x')`,
      ]) {
        await expectRejection(
          () => t.db.query(call),
          /permission denied|não existe|does not exist/i,
        );
      }
    });
  });
});

// ===========================================================================
describe('[C3] disputas — prestador não julga a própria causa', () => {
  it('prestador não escreve status nem refund_cents direto', async () => {
    const clientId = await t.createUser();
    const providerId = await t.createProvider();
    const { quoteId } = await makeRequestWithQuote(clientId, providerId);
    const orderId_ = await acceptAs(clientId, quoteId);
    const o = [{ id: orderId_ }];
    const orderId = o[0]!.id;

    await t.db.query('select pagora.prepare_payment($1, $2)', [orderId, clientId]);
    const { rows: p } = await t.db.query<{ id: string; amount_cents: number }>(
      'select id, amount_cents from pagora.payments where order_id = $1',
      [orderId],
    );
    await t.db.query('select pagora.confirm_payment($1, $2, 0, null)', [
      p[0]!.id,
      p[0]!.amount_cents,
    ]);

    const { rows: d } = await t.db.query<{ id: string }>(
      `insert into pagora.disputes (order_id, opened_by, client_reason)
       values ($1, $2, 'não apareceu') returning id`,
      [orderId, clientId],
    );

    await t.actAs(providerId, async () => {
      await t.db
        .query(
          `update pagora.disputes set status = 'resolved_provider', refund_cents = 0 where id = $1`,
          [d[0]!.id],
        )
        .catch(() => null);
    });

    const { rows } = await t.db.query<{ status: string }>(
      'select status from pagora.disputes where id = $1',
      [d[0]!.id],
    );
    expect(rows[0]!.status).toBe('open');
  });
});

// ===========================================================================
describe('máquina de estados no banco', () => {
  async function paidOrder() {
    const clientId = await t.createUser();
    const providerId = await t.createProvider();
    const { quoteId } = await makeRequestWithQuote(clientId, providerId, 20_000);
    const orderId_ = await acceptAs(clientId, quoteId);
    const o = [{ id: orderId_ }];
    const orderId = o[0]!.id;
    const { rows: p } = await t.db.query<{ id: string }>(
      'select id from pagora.prepare_payment($1, $2)',
      [orderId, clientId],
    );
    await t.db.query('select pagora.confirm_payment($1, 20000, 0, null)', [p[0]!.id]);
    return { clientId, providerId, orderId };
  }

  it('rejeita transição inexistente no grafo', async () => {
    const { clientId, orderId } = await paidOrder();
    await expectRejection(
      () =>
        t.db.query('select pagora.advance_order_status($1, $2, $3)', [
          orderId,
          'settled',
          clientId,
        ]),
      /invalid_transition/,
    );
  });

  it('prestador não faz a transição que é do cliente', async () => {
    const { providerId, orderId } = await paidOrder();
    for (const s of ['en_route', 'in_progress', 'completed']) {
      await t.db.query('select pagora.advance_order_status($1, $2, $3)', [orderId, s, providerId]);
    }
    await expectRejection(
      () =>
        t.db.query('select pagora.advance_order_status($1, $2, $3)', [
          orderId,
          'settled',
          providerId,
        ]),
      /forbidden_transition/,
    );
  });

  it('cliente não declara execução de serviço', async () => {
    const { clientId, orderId } = await paidOrder();
    await expectRejection(
      () =>
        t.db.query('select pagora.advance_order_status($1, $2, $3)', [
          orderId,
          'en_route',
          clientId,
        ]),
      /forbidden_transition/,
    );
  });

  it('repetir a transição já aplicada é no-op, não erro (webhook reenviado)', async () => {
    const { providerId, orderId } = await paidOrder();
    await t.db.query('select pagora.advance_order_status($1, $2, $3)', [
      orderId,
      'en_route',
      providerId,
    ]);
    const again = await t.db.query<{ status: string }>(
      'select status from pagora.advance_order_status($1, $2, $3)',
      [orderId, 'en_route', providerId],
    );
    expect(again.rows[0]!.status).toBe('en_route');
  });

  it('não se liquida pedido que nunca foi pago', async () => {
    const clientId = await t.createUser();
    const providerId = await t.createProvider();
    const { quoteId } = await makeRequestWithQuote(clientId, providerId);
    const orderId_ = await acceptAs(clientId, quoteId);
    const o = [{ id: orderId_ }];
    await expectRejection(
      () => t.db.query('select pagora.settle_order($1, $2)', [o[0]!.id, clientId]),
      /cannot_settle_unpaid_order/,
    );
  });
});

// ===========================================================================
describe('webhook forjado', () => {
  it('valor divergente do cobrado NÃO libera dinheiro', async () => {
    const clientId = await t.createUser();
    const providerId = await t.createProvider();
    const { quoteId } = await makeRequestWithQuote(clientId, providerId, 30_000);
    const orderId_ = await acceptAs(clientId, quoteId);
    const o = [{ id: orderId_ }];
    const { rows: p } = await t.db.query<{ id: string }>(
      'select id from pagora.prepare_payment($1, $2)',
      [o[0]!.id, clientId],
    );

    await expectRejection(
      () => t.db.query('select pagora.confirm_payment($1, $2, 0, null)', [p[0]!.id, 100]),
      /amount_mismatch/,
    );

    const { rows: w } = await t.db.query<{ pending_cents: number }>(
      'select pending_cents from pagora.wallets where provider_id = $1',
      [providerId],
    );
    expect(w[0]!.pending_cents).toBe(0);
  });

  it('pagamento inexistente não credita ninguém', async () => {
    await expectRejection(
      () =>
        t.db.query('select pagora.confirm_payment($1, 100, 0, null)', [
          '00000000-0000-0000-0000-000000000000',
        ]),
      /payment_not_found/,
    );
  });
});

// ===========================================================================
describe('proteções estruturais', () => {
  it('todas as tabelas do schema têm RLS habilitada e forçada', async () => {
    const { rows } = await t.db.query<{ tablename: string }>(
      `select c.relname as tablename from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'pagora' and c.relkind = 'r'
          and (c.relrowsecurity = false or c.relforcerowsecurity = false)`,
    );
    expect(rows.map((r) => r.tablename)).toEqual([]);
  });

  it('as tabelas financeiras não têm nenhuma policy de escrita', async () => {
    const { rows } = await t.db.query<{ tablename: string; policyname: string }>(
      `select tablename, policyname from pg_policies
        where schemaname = 'pagora'
          and tablename in ('orders','wallets','wallet_transactions','payments','withdrawals','payment_events')
          and cmd <> 'SELECT'`,
    );
    expect(rows).toEqual([]);
  });

  it('authenticated não tem privilégio de escrita nas tabelas de dinheiro', async () => {
    const { rows } = await t.db.query<{ table_name: string; privilege_type: string }>(
      `select table_name, privilege_type from information_schema.table_privileges
        where table_schema = 'pagora' and grantee = 'authenticated'
          and privilege_type in ('INSERT','UPDATE','DELETE')
          and table_name in ('orders','wallets','wallet_transactions','payments','withdrawals','payment_events')`,
    );
    expect(rows).toEqual([]);
  });
});
