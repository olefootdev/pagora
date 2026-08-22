// =====================================================================
// PAGORA — fluxo financeiro ponta a ponta contra Postgres real
// =====================================================================
// Percorre o caminho que o critério de sucesso da retomada define:
//   pedido → proposta → aceite → pagamento → execução → confirmação →
//   liberação de saldo → saque → ledger consistente
// =====================================================================
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupDatabase, expectRejection, type TestDb } from './harness';
import { splitFees } from '../../src/domains/money';

let t: TestDb;

beforeAll(async () => {
  t = await setupDatabase();
});
afterAll(async () => {
  await t?.close();
});

/** Monta um pedido pago, devolvendo os ids envolvidos. */
async function buildPaidOrder(priceCents: number) {
  const clientId = await t.createUser();
  const providerId = await t.createProvider();

  const { rows: reqRows } = await t.db.query<{ id: string }>(
    `insert into pagora.service_requests (client_id, service, payload)
     values ($1, 'frete', '{}'::jsonb) returning id`,
    [clientId],
  );
  const requestId = reqRows[0]!.id;

  const { rows: quoteRows } = await t.db.query<{ id: string }>(
    `insert into pagora.quotes (request_id, provider_id, price_cents, status)
     values ($1, $2, $3, 'sent') returning id`,
    [requestId, providerId, priceCents],
  );
  const quoteId = quoteRows[0]!.id;

  const order = await t.actAs(clientId, async () => {
    const { rows } = await t.db.query('select * from pagora.accept_quote($1)', [quoteId]);
    return rows[0] as Record<string, number | string>;
  });

  const { rows: payRows } = await t.db.query('select * from pagora.prepare_payment($1, $2)', [
    order.id,
    clientId,
  ]);
  const payment = payRows[0] as Record<string, number | string>;

  return { clientId, providerId, requestId, quoteId, order, payment };
}

async function wallet(providerId: string) {
  const { rows } = await t.db.query<{ balance_cents: number; pending_cents: number }>(
    'select balance_cents, pending_cents from pagora.wallets where provider_id = $1',
    [providerId],
  );
  return rows[0]!;
}

describe('caminho feliz completo', () => {
  it('R$ 300 percorre pedido → pagamento → liberação → saque com ledger fechado', async () => {
    const { clientId, providerId, order, payment } = await buildPaidOrder(30_000);

    // --- Decomposição financeira: 300 → 45 / 255 ---
    expect(order.price_cents).toBe(30_000);
    expect(order.platform_fee_cents).toBe(4_500);
    expect(order.provider_amount_cents).toBe(25_500);
    expect(payment.amount_cents).toBe(30_000);
    expect(payment.status).toBe('pending');

    // --- Cliente paga: webhook confirma ---
    await t.db.query('select pagora.confirm_payment($1, $2, $3, $4)', [
      payment.id,
      30_000,
      199,
      'asaas-ref-1',
    ]);

    const afterPayment = await wallet(providerId);
    // O dinheiro entrou RETIDO, não disponível. Este é o coração do desenho.
    expect(afterPayment.pending_cents).toBe(25_500);
    expect(afterPayment.balance_cents).toBe(0);

    const { rows: paidOrder } = await t.db.query<{ status: string }>(
      'select status from pagora.orders where id = $1',
      [order.id],
    );
    expect(paidOrder[0]!.status).toBe('paid');

    // --- Prestador executa ---
    for (const status of ['en_route', 'in_progress', 'completed']) {
      await t.db.query('select pagora.advance_order_status($1, $2, $3)', [
        order.id,
        status,
        providerId,
      ]);
    }

    // Ainda retido: concluir não é o mesmo que o cliente confirmar.
    expect((await wallet(providerId)).balance_cents).toBe(0);

    // --- Cliente confirma: LIBERA ---
    await t.db.query('select pagora.settle_order($1, $2)', [order.id, clientId]);

    const afterSettle = await wallet(providerId);
    expect(afterSettle.pending_cents).toBe(0);
    expect(afterSettle.balance_cents).toBe(25_500);

    // --- Saque ---
    await t.db.query('select pagora.request_withdrawal($1, $2, $3, $4)', [
      providerId,
      25_500,
      'idem-key-1',
      'pix@teste',
    ]);
    expect((await wallet(providerId)).balance_cents).toBe(0);

    // --- Ledger consistente: saldo materializado == soma dos lançamentos ---
    const { rows: audit } = await t.db.query('select * from pagora.audit_wallet_integrity()');
    expect(audit).toEqual([]);
  });

  it('o extrato do prestador mostra bruto e comissão separados', async () => {
    const { providerId, payment } = await buildPaidOrder(30_000);
    await t.db.query('select pagora.confirm_payment($1, $2, $3, $4)', [
      payment.id,
      30_000,
      0,
      null,
    ]);

    const { rows } = await t.db.query<{ kind: string; amount_cents: number; bucket: string }>(
      `select kind, amount_cents, bucket from pagora.wallet_transactions
        where provider_id = $1 order by created_at, amount_cents desc`,
      [providerId],
    );

    expect(rows).toEqual([
      { kind: 'order_hold', amount_cents: 30_000, bucket: 'pending' },
      { kind: 'platform_fee', amount_cents: -4_500, bucket: 'pending' },
    ]);
  });
});

describe('paridade da aritmética: SQL x TypeScript', () => {
  // A comissão é calculada nos dois lados — no banco (autoridade) e no client
  // (exibição). Se divergirem em um centavo, o cliente vê um número e paga
  // outro. Este teste compara os dois em toda a faixa relevante.
  it('compute_amounts() bate com splitFees() em 400 valores', async () => {
    const values: number[] = [];
    for (let cents = 1; cents <= 200_000; cents += 499) values.push(cents);

    const { rows } = await t.db.query<{
      gross: number;
      platform_fee_cents: number;
      provider_amount_cents: number;
    }>(
      `select v as gross, c.platform_fee_cents, c.provider_amount_cents
         from unnest($1::int[]) as v,
              lateral pagora.compute_amounts(v) c`,
      [values],
    );

    expect(rows.length).toBe(values.length);
    for (const row of rows) {
      const ts = splitFees(row.gross);
      expect(row.platform_fee_cents, `bruto ${row.gross}`).toBe(ts.platformFeeCents);
      expect(row.provider_amount_cents, `bruto ${row.gross}`).toBe(ts.providerAmountCents);
    }
  });

  it('valores de fronteira .5 arredondam para cima nos dois lados', async () => {
    const boundaries = [10, 30, 50, 70, 90, 110, 130, 1_010, 3_030];
    for (const gross of boundaries) {
      const { rows } = await t.db.query<{ platform_fee_cents: number }>(
        'select platform_fee_cents from pagora.compute_amounts($1)',
        [gross],
      );
      expect(rows[0]!.platform_fee_cents, `bruto ${gross}`).toBe(splitFees(gross).platformFeeCents);
    }
  });
});

describe('idempotência', () => {
  it('confirmar o mesmo pagamento duas vezes credita UMA vez', async () => {
    const { providerId, payment } = await buildPaidOrder(50_000);

    await t.db.query('select pagora.confirm_payment($1, $2, $3, $4)', [payment.id, 50_000, 0, 'r']);
    const after1 = await wallet(providerId);

    // Reenvio do webhook — o Asaas repete até receber 200.
    await t.db.query('select pagora.confirm_payment($1, $2, $3, $4)', [payment.id, 50_000, 0, 'r']);
    const after2 = await wallet(providerId);

    expect(after2).toEqual(after1);

    const { rows } = await t.db.query<{ n: string }>(
      'select count(*) as n from pagora.wallet_transactions where payment_id = $1',
      [payment.id],
    );
    expect(Number(rows[0]!.n)).toBe(2); // order_hold + platform_fee, e só
  });

  it('o mesmo evento de webhook não é registrado duas vezes', async () => {
    const { payment } = await buildPaidOrder(10_000);

    const first = await t.db.query<{ event_id: string; already_processed: boolean }>(
      'select * from pagora.record_payment_event($1, $2, $3, $4)',
      ['evt_dup_1', 'PAYMENT_RECEIVED', JSON.stringify({ id: 'evt_dup_1' }), payment.id],
    );
    expect(first.rows[0]!.already_processed).toBe(false);

    await t.db.query('select pagora.mark_event_processed($1, null)', [first.rows[0]!.event_id]);

    const second = await t.db.query<{ event_id: string; already_processed: boolean }>(
      'select * from pagora.record_payment_event($1, $2, $3, $4)',
      ['evt_dup_1', 'PAYMENT_RECEIVED', JSON.stringify({ id: 'evt_dup_1' }), payment.id],
    );
    expect(second.rows[0]!.already_processed).toBe(true);
    expect(second.rows[0]!.event_id).toBe(first.rows[0]!.event_id);

    const { rows } = await t.db.query<{ n: string }>(
      "select count(*) as n from pagora.payment_events where gateway_event_id = 'evt_dup_1'",
    );
    expect(Number(rows[0]!.n)).toBe(1);
  });

  it('saque repetido com a mesma chave devolve o original, sem debitar de novo', async () => {
    const { clientId, providerId, order, payment } = await buildPaidOrder(40_000);
    await t.db.query('select pagora.confirm_payment($1, $2, 0, null)', [payment.id, 40_000]);
    for (const s of ['en_route', 'in_progress', 'completed']) {
      await t.db.query('select pagora.advance_order_status($1, $2, $3)', [order.id, s, providerId]);
    }
    await t.db.query('select pagora.settle_order($1, $2)', [order.id, clientId]);

    const before = await wallet(providerId);
    expect(before.balance_cents).toBe(34_000);

    const w1 = await t.db.query<{ id: string }>(
      'select id from pagora.request_withdrawal($1, $2, $3, null)',
      [providerId, 10_000, 'same-key'],
    );
    const w2 = await t.db.query<{ id: string }>(
      'select id from pagora.request_withdrawal($1, $2, $3, null)',
      [providerId, 10_000, 'same-key'],
    );

    expect(w2.rows[0]!.id).toBe(w1.rows[0]!.id);
    expect((await wallet(providerId)).balance_cents).toBe(24_000); // debitou UMA vez
  });
});

describe('travas de saldo', () => {
  it('não dá para sacar mais do que o saldo disponível', async () => {
    const providerId = await t.createProvider();
    await expectRejection(
      () =>
        t.db.query('select pagora.request_withdrawal($1, $2, $3, null)', [providerId, 100, 'k1']),
      /insufficient_balance/,
    );
  });

  it('saldo RETIDO não é sacável', async () => {
    const { providerId, payment } = await buildPaidOrder(30_000);
    await t.db.query('select pagora.confirm_payment($1, $2, 0, null)', [payment.id, 30_000]);

    expect((await wallet(providerId)).pending_cents).toBe(25_500);

    // O dinheiro existe, mas não neste bolso.
    await expectRejection(
      () =>
        t.db.query('select pagora.request_withdrawal($1, $2, $3, null)', [
          providerId,
          25_500,
          'k2',
        ]),
      /insufficient_balance/,
    );
  });

  it('dois saques que somados excedem o saldo: o segundo falha', async () => {
    const { clientId, providerId, order, payment } = await buildPaidOrder(20_000);
    await t.db.query('select pagora.confirm_payment($1, $2, 0, null)', [payment.id, 20_000]);
    for (const s of ['en_route', 'in_progress', 'completed']) {
      await t.db.query('select pagora.advance_order_status($1, $2, $3)', [order.id, s, providerId]);
    }
    await t.db.query('select pagora.settle_order($1, $2)', [order.id, clientId]);
    expect((await wallet(providerId)).balance_cents).toBe(17_000);

    await t.db.query('select pagora.request_withdrawal($1, $2, $3, null)', [
      providerId,
      17_000,
      'w-a',
    ]);
    // Segundo saque do mesmo valor: saldo já foi debitado na solicitação.
    await expectRejection(
      () =>
        t.db.query('select pagora.request_withdrawal($1, $2, $3, null)', [
          providerId,
          17_000,
          'w-b',
        ]),
      /insufficient_balance|one_inflight/,
    );
  });

  it('saque que falha devolve o saldo com lançamento próprio', async () => {
    const { clientId, providerId, order, payment } = await buildPaidOrder(20_000);
    await t.db.query('select pagora.confirm_payment($1, $2, 0, null)', [payment.id, 20_000]);
    for (const s of ['en_route', 'in_progress', 'completed']) {
      await t.db.query('select pagora.advance_order_status($1, $2, $3)', [order.id, s, providerId]);
    }
    await t.db.query('select pagora.settle_order($1, $2)', [order.id, clientId]);

    const { rows } = await t.db.query<{ id: string }>(
      'select id from pagora.request_withdrawal($1, $2, $3, null)',
      [providerId, 17_000, 'w-fail'],
    );
    expect((await wallet(providerId)).balance_cents).toBe(0);

    await t.db.query('select pagora.fail_withdrawal($1, $2)', [rows[0]!.id, 'chave Pix inválida']);
    expect((await wallet(providerId)).balance_cents).toBe(17_000);

    const { rows: ledger } = await t.db.query<{ kind: string }>(
      'select kind from pagora.wallet_transactions where withdrawal_id = $1 order by created_at',
      [rows[0]!.id],
    );
    // Estorno é lançamento novo, não edição do débito: o histórico preserva
    // que houve tentativa.
    expect(ledger.map((r) => r.kind)).toEqual(['withdrawal', 'withdrawal_reversal']);
  });

  it('o ledger é append-only', async () => {
    const { providerId, payment } = await buildPaidOrder(10_000);
    await t.db.query('select pagora.confirm_payment($1, $2, 0, null)', [payment.id, 10_000]);

    await expectRejection(
      () =>
        t.db.query(
          'update pagora.wallet_transactions set amount_cents = 999 where provider_id = $1',
          [providerId],
        ),
      /append-only/,
    );
    await expectRejection(
      () =>
        t.db.query('delete from pagora.wallet_transactions where provider_id = $1', [providerId]),
      /append-only/,
    );
  });
});
