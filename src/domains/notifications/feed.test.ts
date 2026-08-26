import { describe, it, expect } from 'vitest';
import {
  buildClientFeed,
  buildProviderFeed,
  countUnseen,
  readLastSeen,
  writeLastSeen,
  type Notice,
} from './feed';
import type { OrderStatus, ServiceType, Tables } from '../../lib/database.types';

// --- fábricas mínimas --------------------------------------------------
// Só os campos que o feed lê. Montar a linha inteira do banco em cada teste
// esconderia o que de fato importa para a regra sob teste.

function req(
  id: string,
  over: Partial<Tables<'service_requests'>> = {},
): Tables<'service_requests'> {
  return {
    id,
    service: 'frete' as ServiceType,
    origin_city: 'São Paulo',
    created_at: '2026-08-20T10:00:00.000Z',
    ...over,
  } as Tables<'service_requests'>;
}

function quote(id: string, requestId: string, createdAt: string): Tables<'quotes'> {
  return { id, request_id: requestId, created_at: createdAt } as Tables<'quotes'>;
}

function order(id: string, status: OrderStatus, updatedAt: string): Tables<'orders'> {
  return { id, status, updated_at: updatedAt } as Tables<'orders'>;
}

const semQuotes = new Map<string, Tables<'quotes'>[]>();

describe('buildClientFeed — propostas', () => {
  it('agrupa as propostas de um pedido num aviso só', () => {
    // Cinco propostas no mesmo frete são uma boa notícia, não cinco.
    const feed = buildClientFeed({
      requests: [req('r1')],
      orders: [],
      quotesByRequest: new Map([
        [
          'r1',
          [
            quote('q1', 'r1', '2026-08-20T11:00:00.000Z'),
            quote('q2', 'r1', '2026-08-20T12:00:00.000Z'),
          ],
        ],
      ]),
    });
    expect(feed).toHaveLength(1);
    expect(feed[0]?.title).toBe('Você recebeu 2 propostas');
  });

  it('uma proposta fica no singular', () => {
    const feed = buildClientFeed({
      requests: [req('r1')],
      orders: [],
      quotesByRequest: new Map([['r1', [quote('q1', 'r1', '2026-08-20T11:00:00.000Z')]]]),
    });
    expect(feed[0]?.title).toBe('Você recebeu uma proposta');
  });

  it('usa a data da proposta mais recente', () => {
    const feed = buildClientFeed({
      requests: [req('r1')],
      orders: [],
      quotesByRequest: new Map([
        [
          'r1',
          [
            quote('q1', 'r1', '2026-08-20T11:00:00.000Z'),
            quote('q2', 'r1', '2026-08-22T09:00:00.000Z'),
          ],
        ],
      ]),
    });
    expect(feed[0]?.at).toBe('2026-08-22T09:00:00.000Z');
  });

  it('pedido sem proposta não vira aviso', () => {
    expect(
      buildClientFeed({ requests: [req('r1')], orders: [], quotesByRequest: semQuotes }),
    ).toHaveLength(0);
  });

  it('carrega contagem e serviço — é o que a faixa da home compõe', () => {
    const feed = buildClientFeed({
      requests: [req('r1', { service: 'cacamba' as ServiceType })],
      orders: [],
      quotesByRequest: new Map([
        [
          'r1',
          [
            quote('q1', 'r1', '2026-08-20T11:00:00.000Z'),
            quote('q2', 'r1', '2026-08-20T12:00:00.000Z'),
          ],
        ],
      ]),
    });
    expect(feed[0]?.count).toBe(2);
    expect(feed[0]?.serviceLabel).toBe('Caçamba');
  });

  it('leva à tela de escolher, que é onde a ação acontece', () => {
    const feed = buildClientFeed({
      requests: [req('r1')],
      orders: [],
      quotesByRequest: new Map([['r1', [quote('q1', 'r1', '2026-08-20T11:00:00.000Z')]]]),
    });
    expect(feed[0]?.route).toBe('escolher/r1');
    expect(feed[0]?.actionable).toBe(true);
  });
});

describe('buildClientFeed — estados', () => {
  it('não avisa o nascimento do pedido', () => {
    // `pending_payment` é o que o usuário acabou de causar, olhando a tela.
    // Avisar seria contar o que ele acabou de fazer.
    const feed = buildClientFeed({
      requests: [],
      orders: [order('o1', 'pending_payment', '2026-08-20T10:00:00.000Z')],
      quotesByRequest: semQuotes,
    });
    expect(feed).toHaveLength(0);
  });

  it('avisa o que ele não causou', () => {
    for (const s of ['paid', 'en_route', 'in_progress', 'completed'] as OrderStatus[]) {
      const feed = buildClientFeed({
        requests: [],
        orders: [order('o1', s, '2026-08-20T10:00:00.000Z')],
        quotesByRequest: semQuotes,
      });
      expect(feed).toHaveLength(1);
    }
  });

  it('"concluído" pede ação — é o que libera o pagamento', () => {
    const feed = buildClientFeed({
      requests: [],
      orders: [order('o1', 'completed', '2026-08-20T10:00:00.000Z')],
      quotesByRequest: semQuotes,
    });
    expect(feed[0]?.actionable).toBe(true);
    expect(feed[0]?.body).toContain('Confirme');
  });

  it('serviço liberado convida a avaliar, não a voltar ao acompanhamento', () => {
    // Sem isto a tela de avaliar existe e ninguém chega nela: o feed é o
    // único lugar que fala com quem já fechou o pedido.
    const feed = buildClientFeed({
      requests: [],
      orders: [order('o1', 'settled', '2026-08-20T10:00:00.000Z')],
      quotesByRequest: semQuotes,
    });
    expect(feed[0]?.route).toBe('avaliar/o1');
    expect(feed[0]?.actionable).toBe(true);
    expect(feed[0]?.title).toContain('Como foi');
  });

  it('mudança de estado do mesmo pedido gera avisos distintos', () => {
    // Sem o estado e a data no id, o segundo aviso seria engolido como
    // duplicata do primeiro e o usuário nunca saberia que o caminhão saiu.
    const a = buildClientFeed({
      requests: [],
      orders: [order('o1', 'paid', '2026-08-20T10:00:00.000Z')],
      quotesByRequest: semQuotes,
    });
    const b = buildClientFeed({
      requests: [],
      orders: [order('o1', 'en_route', '2026-08-20T11:00:00.000Z')],
      quotesByRequest: semQuotes,
    });
    expect(a[0]?.id).not.toBe(b[0]?.id);
  });
});

describe('buildProviderFeed', () => {
  it('pedido aberto que ele ainda não respondeu é oportunidade', () => {
    const feed = buildProviderFeed({
      openRequests: [req('r1', { service: 'cacamba' as ServiceType })],
      orders: [],
      myQuotes: new Map(),
    });
    expect(feed).toHaveLength(1);
    expect(feed[0]?.title).toContain('caçamba');
    expect(feed[0]?.route).toBe('parceiro');
  });

  it('pedido que ele já respondeu não é oportunidade, é espera', () => {
    const feed = buildProviderFeed({
      openRequests: [req('r1')],
      orders: [],
      myQuotes: new Map([['r1', quote('q1', 'r1', '2026-08-20T11:00:00.000Z')]]),
    });
    expect(feed).toHaveLength(0);
  });

  it('pagamento confirmado é o aviso que faz ele sair de casa', () => {
    const feed = buildProviderFeed({
      openRequests: [],
      orders: [order('o1', 'paid', '2026-08-20T10:00:00.000Z')],
      myQuotes: new Map(),
    });
    expect(feed[0]?.title).toContain('pode sair');
    expect(feed[0]?.actionable).toBe(true);
    expect(feed[0]?.route).toBe('parceiro-viagem');
  });

  it('aviso de pedido encerrado NÃO leva para a Viagem', () => {
    // Viagem mostra um serviço só, o que está em andamento. Mandar um pedido
    // finalizado para lá abre uma tela vazia — o aviso vira beco sem saída.
    const feed = buildProviderFeed({
      openRequests: [],
      orders: [
        order('o1', 'settled', '2026-08-20T10:00:00.000Z'),
        order('o2', 'cancelled', '2026-08-20T09:00:00.000Z'),
        order('o3', 'disputed', '2026-08-20T08:00:00.000Z'),
      ],
      myQuotes: new Map(),
    });
    const rotas = feed.map((n) => n.route);
    expect(rotas).not.toContain('parceiro-viagem');
    expect(rotas).toEqual(['parceiro-ganhos', 'parceiro', 'parceiro-ganhos']);
  });

  it('estado que não é dele não vira aviso', () => {
    // "A caminho" foi ELE quem marcou. Avisá-lo disso é ruído.
    const feed = buildProviderFeed({
      openRequests: [],
      orders: [order('o1', 'en_route', '2026-08-20T10:00:00.000Z')],
      myQuotes: new Map(),
    });
    expect(feed).toHaveLength(0);
  });
});

describe('ordenação', () => {
  it('mais recente primeiro', () => {
    const feed = buildClientFeed({
      requests: [],
      orders: [
        order('o1', 'paid', '2026-08-20T10:00:00.000Z'),
        order('o2', 'en_route', '2026-08-24T10:00:00.000Z'),
        order('o3', 'in_progress', '2026-08-22T10:00:00.000Z'),
      ],
      quotesByRequest: semQuotes,
    });
    expect(feed.map((n) => n.at)).toEqual([
      '2026-08-24T10:00:00.000Z',
      '2026-08-22T10:00:00.000Z',
      '2026-08-20T10:00:00.000Z',
    ]);
  });

  it('a ordem não depende da ordem de entrada', () => {
    const orders = [
      order('o1', 'paid', '2026-08-20T10:00:00.000Z'),
      order('o2', 'en_route', '2026-08-24T10:00:00.000Z'),
    ];
    const a = buildClientFeed({ requests: [], orders, quotesByRequest: semQuotes });
    const b = buildClientFeed({
      requests: [],
      orders: [...orders].reverse(),
      quotesByRequest: semQuotes,
    });
    expect(a.map((n) => n.id)).toEqual(b.map((n) => n.id));
  });
});

describe('countUnseen', () => {
  const feed: Notice[] = [
    {
      id: 'a',
      kind: 'estado',
      title: '',
      body: '',
      at: '2026-08-24T10:00:00.000Z',
      route: '',
      icon: '',
      actionable: false,
    },
    {
      id: 'b',
      kind: 'estado',
      title: '',
      body: '',
      at: '2026-08-20T10:00:00.000Z',
      route: '',
      icon: '',
      actionable: false,
    },
  ];

  it('sem visita anterior, tudo é novo', () => {
    expect(countUnseen(feed, null)).toBe(2);
  });

  it('conta só o que veio depois da última visita', () => {
    expect(countUnseen(feed, '2026-08-22T00:00:00.000Z')).toBe(1);
  });

  it('visita mais recente que tudo zera o contador', () => {
    expect(countUnseen(feed, '2026-08-25T00:00:00.000Z')).toBe(0);
  });

  it('lista vazia é zero, não erro', () => {
    expect(countUnseen([], null)).toBe(0);
  });
});

describe('escopo do lido', () => {
  it('cliente e transportador não compartilham o "visto"', () => {
    // A mesma pessoa pode ser os dois. Sem separar, abrir os avisos de
    // cliente marcaria como visto o "pagamento confirmado" que o
    // transportador ainda não leu.
    writeLastSeen('u1', '2026-08-26T10:00:00.000Z', 'cliente');
    expect(readLastSeen('u1', 'cliente')).toBe('2026-08-26T10:00:00.000Z');
    expect(readLastSeen('u1', 'transportador')).toBeNull();
  });

  it('o padrão é cliente — compatível com quem já usava', () => {
    writeLastSeen('u2', '2026-08-26T11:00:00.000Z');
    expect(readLastSeen('u2', 'cliente')).toBe('2026-08-26T11:00:00.000Z');
  });
});
