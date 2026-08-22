// =====================================================================
// PAGORA — formulários públicos e reputação (migration 0009)
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

describe('rate limit dos formulários públicos', () => {
  it('permite os 5 primeiros envios do mesmo IP e barra o sexto', async () => {
    const ip = 'hash-ip-aaa';
    for (let i = 0; i < 5; i++) {
      await t.db.query('insert into pagora.waitlist (email, ip_hash, source) values ($1, $2, $3)', [
        `pessoa${i}@teste.com`,
        ip,
        'landing',
      ]);
    }

    await expectRejection(
      () =>
        t.db.query('insert into pagora.waitlist (email, ip_hash, source) values ($1, $2, $3)', [
          'spam@teste.com',
          ip,
          'landing',
        ]),
      /rate_limit_exceeded/,
    );
  });

  it('IP diferente não é afetado pelo bloqueio do vizinho', async () => {
    const { rows } = await t.db.query<{ id: string }>(
      'insert into pagora.waitlist (email, ip_hash, source) values ($1, $2, $3) returning id',
      ['outro@teste.com', 'hash-ip-bbb', 'landing'],
    );
    expect(rows[0]!.id).toBeTruthy();
  });

  it('o mesmo telefone é barrado no quarto envio, mesmo trocando de IP', async () => {
    // Trocar de IP é barato para quem está abusando; trocar de telefone não é.
    // Testado em provider_applications porque `waitlist` já tem unique parcial
    // em phone desde a 0003 — lá o segundo envio nem chega ao trigger.
    const phone = '+5511988887777';
    for (let i = 0; i < 3; i++) {
      await t.db.query(
        `insert into pagora.provider_applications (full_name, phone, services, regions, ip_hash)
         values ($1, $2, '{frete}'::pagora.service_type[], 'SP', $3)`,
        ['Insistente', phone, `ip-rotativo-${i}`],
      );
    }

    await expectRejection(
      () =>
        t.db.query(
          `insert into pagora.provider_applications (full_name, phone, services, regions, ip_hash)
           values ($1, $2, '{frete}'::pagora.service_type[], 'SP', $3)`,
          ['Insistente', phone, 'ip-rotativo-99'],
        ),
      /rate_limit_exceeded/,
    );
  });

  it('waitlist recusa telefone repetido pela unique da 0003, antes do trigger', async () => {
    const phone = '+5511900001111';
    await t.db.query('insert into pagora.waitlist (phone, source) values ($1, $2)', [
      phone,
      'landing',
    ]);
    await expectRejection(
      () =>
        t.db.query('insert into pagora.waitlist (phone, source) values ($1, $2)', [
          phone,
          'landing',
        ]),
      /duplicate key|waitlist_phone_uniq/,
    );
  });

  it('vale também para provider_applications', async () => {
    const ip = 'hash-ip-prestador';
    for (let i = 0; i < 5; i++) {
      await t.db.query(
        `insert into pagora.provider_applications (full_name, phone, services, regions, ip_hash)
         values ($1, $2, '{frete}'::pagora.service_type[], 'SP', $3)`,
        [`Prestador ${i}`, `+551199999${String(i).padStart(4, '0')}`, ip],
      );
    }

    await expectRejection(
      () =>
        t.db.query(
          `insert into pagora.provider_applications (full_name, phone, services, regions, ip_hash)
           values ($1, $2, '{frete}'::pagora.service_type[], 'SP', $3)`,
          ['Spam', '+5511977776666', ip],
        ),
      /rate_limit_exceeded/,
    );
  });

  it('envio sem ip_hash e sem telefone repetido continua passando', async () => {
    // Não queremos que a proteção derrube o caso legítimo de quem não teve o
    // IP capturado (bloqueador de script, proxy).
    const { rows } = await t.db.query<{ id: string }>(
      'insert into pagora.waitlist (email, source) values ($1, $2) returning id',
      ['sem-ip@teste.com', 'landing'],
    );
    expect(rows[0]!.id).toBeTruthy();
  });
});

describe('reputação do prestador', () => {
  async function completedOrderFor(providerId: string, clientId: string) {
    const { rows: req } = await t.db.query<{ id: string }>(
      `insert into pagora.service_requests (client_id, service, payload)
       values ($1, 'frete', '{}'::jsonb) returning id`,
      [clientId],
    );
    const { rows: quote } = await t.db.query<{ id: string }>(
      `insert into pagora.quotes (request_id, provider_id, price_cents, status)
       values ($1, $2, 20000, 'sent') returning id`,
      [req[0]!.id, providerId],
    );
    const orderId = await t.actAs(clientId, async () => {
      const { rows } = await t.db.query<{ id: string }>('select id from pagora.accept_quote($1)', [
        quote[0]!.id,
      ]);
      return rows[0]!.id;
    });
    await t.db.query("update pagora.orders set status = 'completed' where id = $1", [orderId]);
    return orderId;
  }

  async function rating(providerId: string) {
    const { rows } = await t.db.query<{ rating_avg: string; rating_count: number }>(
      'select rating_avg, rating_count from pagora.providers where profile_id = $1',
      [providerId],
    );
    return { avg: Number(rows[0]!.rating_avg), count: rows[0]!.rating_count };
  }

  it('prestador sem avaliação começa em zero', async () => {
    const providerId = await t.createProvider();
    expect(await rating(providerId)).toEqual({ avg: 0, count: 0 });
  });

  it('a média é recalculada a cada avaliação', async () => {
    const providerId = await t.createProvider();

    for (const stars of [5, 4, 3]) {
      const clientId = await t.createUser();
      const orderId = await completedOrderFor(providerId, clientId);
      await t.actAs(clientId, async () => {
        await t.db.query(
          `insert into pagora.reviews (order_id, client_id, provider_id, stars)
           values ($1, $2, $3, $4)`,
          [orderId, clientId, providerId, stars],
        );
      });
    }

    const result = await rating(providerId);
    expect(result.count).toBe(3);
    expect(result.avg).toBeCloseTo(4, 2); // (5+4+3)/3
  });

  it('remover uma avaliação corrige a média para baixo', async () => {
    const providerId = await t.createProvider();
    const ids: string[] = [];

    for (const stars of [5, 1]) {
      const clientId = await t.createUser();
      const orderId = await completedOrderFor(providerId, clientId);
      const { rows } = await t.db.query<{ id: string }>(
        `insert into pagora.reviews (order_id, client_id, provider_id, stars)
         values ($1, $2, $3, $4) returning id`,
        [orderId, clientId, providerId, stars],
      );
      ids.push(rows[0]!.id);
    }

    expect((await rating(providerId)).avg).toBeCloseTo(3, 2);

    // Média incremental erraria aqui: só recalcular do zero se recupera.
    await t.db.query('delete from pagora.reviews where id = $1', [ids[1]!]);
    expect(await rating(providerId)).toEqual({ avg: 5, count: 1 });
  });

  it('o prestador continua sem conseguir escrever a própria nota', async () => {
    const providerId = await t.createProvider();
    await t.actAs(providerId, async () => {
      await t.db
        .query(
          'update pagora.providers set rating_avg = 5, rating_count = 999 where profile_id = $1',
          [providerId],
        )
        .catch(() => null);
    });
    expect(await rating(providerId)).toEqual({ avg: 0, count: 0 });
  });
});
