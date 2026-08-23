import { describe, it, expect, vi, beforeEach } from 'vitest';

// O mock precisa existir antes do import do service, que resolve `supabase`
// no topo do módulo.
const insert = vi.fn();
const from = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => from(...args),
  },
}));

const { sendMessage } = await import('./message.service');

/** Encadeamento mínimo do postgrest-js: .insert().select().single() */
function mockInsertOk(row: Record<string, unknown>) {
  insert.mockReturnValue({
    select: () => ({ single: () => Promise.resolve({ data: row, error: null }) }),
  });
  from.mockReturnValue({ insert });
}

beforeEach(() => {
  insert.mockReset();
  from.mockReset();
  mockInsertOk({ id: 'm1', order_id: 'o1', sender_id: 'u1', body: 'ok', read_at: null });
});

describe('mensagem bloqueada não chega ao banco', () => {
  // A garantia que importa: não basta a tela avisar o usuário. Se o insert
  // acontecesse mesmo assim, o telefone ficaria gravado na conversa e bastaria
  // rolar o histórico para lê-lo.
  it.each([
    ['telefone', 'me liga 11987654321'],
    ['e-mail', 'manda em carlos@gmail.com'],
    ['link', 'olha bit.ly/abc123'],
    ['@ de rede', 'me acha no @carlosmudancas'],
    ['ditado por extenso', 'anota um um nove oito sete seis cinco quatro'],
  ])('%s: bloqueia sem chamar o banco', async (_rotulo, texto) => {
    const r = await sendMessage('o1', 'u1', texto);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe('blocked');
    expect(from).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('devolve o motivo e os achados para a tela mostrar', async () => {
    const r = await sendMessage('o1', 'u1', 'liga 11987654321');
    expect(r.ok).toBe(false);
    if (!r.ok && r.kind === 'blocked') {
      expect(r.reason).toMatch(/telefone/i);
      expect(r.findings.length).toBeGreaterThan(0);
    }
  });
});

describe('mensagem legítima passa', () => {
  it.each([
    'Chego às 14:30 com 20 caixas.',
    'Consigo no dia 01/03/2026.',
    'Fica R$ 450,00 então?',
    'Apartamento 401, terceiro andar, sem elevador.',
  ])('envia: %s', async (texto) => {
    const r = await sendMessage('o1', 'u1', texto);
    expect(r.ok).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('grava o corpo aparado e amarra order e remetente', async () => {
    await sendMessage('o1', 'u1', '   Chego em 20 minutos.   ');
    expect(insert).toHaveBeenCalledWith({
      order_id: 'o1',
      sender_id: 'u1',
      body: 'Chego em 20 minutos.',
    });
  });
});

describe('o guard analisa o texto original, não o aparado', () => {
  it('espaço nas pontas não muda o veredito', async () => {
    // Espaço é separador de telefone. Se o guard rodasse no texto já aparado,
    // a contagem de separadores mudaria e o limiar poderia inverter.
    const a = await sendMessage('o1', 'u1', '11 98765 4321');
    const b = await sendMessage('o1', 'u1', '  11 98765 4321  ');
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
  });
});

describe('validações locais', () => {
  it('recusa mensagem vazia sem ir ao banco', async () => {
    const r = await sendMessage('o1', 'u1', '    ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe('error');
    expect(insert).not.toHaveBeenCalled();
  });

  it('recusa acima do limite antes do banco recusar', async () => {
    // O banco tem o mesmo teto (constraint messages_body_len). Barrar aqui
    // evita uma ida de rede para receber um erro em inglês do Postgres.
    const r = await sendMessage('o1', 'u1', 'x'.repeat(2001));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/2000/);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('erro do banco vira mensagem, não exceção', () => {
  it('propaga o erro do PostgREST como resultado', async () => {
    insert.mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: null,
            error: { message: 'new row violates row-level security' },
          }),
      }),
    });
    from.mockReturnValue({ insert });

    const r = await sendMessage('o1', 'u1', 'Chego em 20 minutos.');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.kind).toBe('error');
      expect(r.reason).toMatch(/row-level security/);
    }
  });
});
