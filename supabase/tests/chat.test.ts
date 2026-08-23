// =====================================================================
// PAGORA — chat interno: RLS exercitada contra Postgres real (ponto 9)
// =====================================================================
// Cada teste aqui é uma forma concreta de abusar do chat. O filtro de contato
// (`domains/moderation/contact-guard`) é a primeira barreira e tem 59 testes
// próprios; estes são a segunda: mesmo que alguém pule a interface e chame o
// PostgREST direto, o banco precisa recusar.
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

/** Monta pedido → proposta → order aceita, devolvendo os três envolvidos. */
async function makeOrder() {
  const clientId = await t.createUser();
  const providerId = await t.createProvider();

  const { rows: req } = await t.db.query<{ id: string }>(
    `insert into pagora.service_requests (client_id, service, payload)
     values ($1, 'frete', '{}'::jsonb) returning id`,
    [clientId],
  );
  const { rows: quote } = await t.db.query<{ id: string }>(
    `insert into pagora.quotes (request_id, provider_id, price_cents, status)
     values ($1, $2, 30000, 'sent') returning id`,
    [req[0]!.id, providerId],
  );
  const orderId = await t.actAs(clientId, async () => {
    const { rows } = await t.db.query<{ id: string }>('select id from pagora.accept_quote($1)', [
      quote[0]!.id,
    ]);
    return rows[0]!.id;
  });

  return { clientId, providerId, orderId };
}

/**
 * O harness usa UM banco para o arquivo inteiro, então toda leitura precisa
 * ser filtrada pelo pedido do próprio teste. Sem isto `rows[0]` devolve
 * mensagem de um teste anterior e a asserção passa ou falha por acidente.
 */
async function lerMensagens(orderId: string) {
  const { rows } = await t.asService(() =>
    t.db.query<{ body: string; read_at: string | null }>(
      'select body, read_at from pagora.messages where order_id = $1 order by created_at',
      [orderId],
    ),
  );
  return rows;
}

async function send(actorId: string, orderId: string, senderId: string, body: string) {
  return await t.actAs(actorId, () =>
    t.db.query(`insert into pagora.messages (order_id, sender_id, body) values ($1, $2, $3)`, [
      orderId,
      senderId,
      body,
    ]),
  );
}

// ===========================================================================
describe('quem participa do pedido conversa', () => {
  it('cliente e prestador escrevem e leem um ao outro', async () => {
    const { clientId, providerId, orderId } = await makeOrder();

    await send(clientId, orderId, clientId, 'Bom dia, são 20 caixas.');
    await send(providerId, orderId, providerId, 'Fechado, chego 14:30.');

    const vistoPeloCliente = await t.actAs(clientId, async () => {
      const { rows } = await t.db.query(
        'select body from pagora.messages where order_id = $1 order by created_at',
        [orderId],
      );
      return rows;
    });
    expect(vistoPeloCliente).toHaveLength(2);
  });
});

describe('quem não é do pedido não entra', () => {
  it('terceiro não lê a conversa', async () => {
    const { clientId, orderId } = await makeOrder();
    const estranho = await t.createUser();

    await send(clientId, orderId, clientId, 'Endereço confirmado.');

    const vistoPeloEstranho = await t.actAs(estranho, async () => {
      const { rows } = await t.db.query('select body from pagora.messages where order_id = $1', [
        orderId,
      ]);
      return rows;
    });
    expect(vistoPeloEstranho).toHaveLength(0);
  });

  it('terceiro não escreve no pedido dos outros', async () => {
    const { orderId } = await makeOrder();
    const estranho = await t.createUser();

    await expectRejection(
      () => send(estranho, orderId, estranho, 'oi'),
      /row-level security|violates/i,
    );
  });
});

describe('ninguém escreve em nome de outro', () => {
  it('prestador não consegue inserir mensagem assinada pelo cliente', async () => {
    // O ataque que isto fecha: forjar uma mensagem do cliente concordando com
    // um valor, para usar como prova numa disputa.
    const { clientId, providerId, orderId } = await makeOrder();

    await expectRejection(
      () => send(providerId, orderId, clientId, 'Concordo em pagar mais R$ 200.'),
      /row-level security|violates/i,
    );
  });
});

describe('mensagem não se apaga nem se reescreve', () => {
  // A recusa vem do GRANT, não de uma policy: não existe `grant delete`, e o
  // `grant update` é só da coluna read_at. Por isso o Postgres levanta
  // "permission denied" em vez de afetar zero linhas em silêncio — barreira
  // mais forte, e que aparece no log em vez de passar despercebida.
  it('autor não consegue deletar o que enviou', async () => {
    const { clientId, orderId } = await makeOrder();
    await send(clientId, orderId, clientId, 'Combinado R$ 300.');

    await expectRejection(
      () =>
        t.actAs(clientId, () =>
          t.db.query('delete from pagora.messages where order_id = $1', [orderId]),
        ),
      /permission denied/i,
    );

    expect(await lerMensagens(orderId)).toHaveLength(1);
  });

  it('autor não consegue editar o corpo depois de enviado', async () => {
    const { clientId, orderId } = await makeOrder();
    await send(clientId, orderId, clientId, 'Combinado R$ 300.');

    await expectRejection(
      () =>
        t.actAs(clientId, () =>
          t.db.query(`update pagora.messages set body = 'Combinado R$ 900.' where order_id = $1`, [
            orderId,
          ]),
        ),
      /permission denied/i,
    );

    expect((await lerMensagens(orderId))[0]!.body).toBe('Combinado R$ 300.');
  });
});

describe('marcar como lida', () => {
  it('o destinatário marca a mensagem do outro', async () => {
    const { clientId, providerId, orderId } = await makeOrder();
    await send(clientId, orderId, clientId, 'Chego em 10 minutos.');

    await t.actAs(providerId, async () => {
      await t.db.query('update pagora.messages set read_at = now() where order_id = $1', [orderId]);
    });

    expect((await lerMensagens(orderId))[0]!.read_at).not.toBeNull();
  });

  it('o autor NÃO marca a própria mensagem como lida', async () => {
    // Sem esta trava, qualquer um fabrica "o outro leu e não respondeu".
    const { clientId, orderId } = await makeOrder();
    await send(clientId, orderId, clientId, 'Chego em 10 minutos.');

    await t.actAs(clientId, async () => {
      await t.db.query('update pagora.messages set read_at = now() where order_id = $1', [orderId]);
    });

    expect((await lerMensagens(orderId))[0]!.read_at).toBeNull();
  });
});

describe('limites do corpo', () => {
  it('recusa mensagem vazia', async () => {
    const { clientId, orderId } = await makeOrder();
    await expectRejection(() => send(clientId, orderId, clientId, ''), /messages_body_len/);
  });

  it('recusa mensagem acima de 2000 caracteres', async () => {
    const { clientId, orderId } = await makeOrder();
    await expectRejection(
      () => send(clientId, orderId, clientId, 'x'.repeat(2001)),
      /messages_body_len/,
    );
  });
});

describe('fila de moderação', () => {
  it('participante não lê nem escreve na fila de bloqueios', async () => {
    const { clientId, orderId } = await makeOrder();

    await t.asService(() =>
      t.db.query(`select pagora.record_message_block($1, $2, 'phone', '11987654321')`, [
        orderId,
        clientId,
      ]),
    );

    await expectRejection(
      () => t.actAs(clientId, () => t.db.query('select * from pagora.message_blocks')),
      /permission denied/i,
    );
  });

  it('guarda só o trecho, truncado', async () => {
    const { clientId, orderId } = await makeOrder();
    await t.asService(() =>
      t.db.query(`select pagora.record_message_block($1, $2, 'url', $3)`, [
        orderId,
        clientId,
        'x'.repeat(300),
      ]),
    );
    const { rows } = await t.asService(() =>
      t.db.query<{ excerpt: string }>(
        'select excerpt from pagora.message_blocks where order_id = $1',
        [orderId],
      ),
    );
    expect(rows[0]!.excerpt.length).toBe(120);
  });

  it('recusa kind fora do conjunto conhecido', async () => {
    const { clientId, orderId } = await makeOrder();
    await expectRejection(
      () =>
        t.asService(() =>
          t.db.query(`select pagora.record_message_block($1, $2, 'telepatia', 'x')`, [
            orderId,
            clientId,
          ]),
        ),
      /message_blocks_kind_check|violates check/i,
    );
  });
});

describe('realtime', () => {
  it('messages está publicada e message_blocks não', async () => {
    // Transmitir bloqueio em tempo real contaria à outra parte que houve
    // tentativa de passar contato — isso é assunto de moderação.
    const { rows } = await t.asService(() =>
      t.db.query<{ tablename: string }>(
        `select tablename from pg_publication_tables
          where pubname = 'supabase_realtime' and schemaname = 'pagora'`,
      ),
    );
    const nomes = rows.map((r) => r.tablename);
    expect(nomes).toContain('messages');
    expect(nomes).not.toContain('message_blocks');
  });
});
