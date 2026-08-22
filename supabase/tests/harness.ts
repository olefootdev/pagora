// =====================================================================
// PAGORA — harness de teste de integração contra Postgres REAL
// =====================================================================
// Roda as migrations num Postgres de verdade (PGlite: PostgreSQL 18 compilado
// para WASM), em processo, sem Docker.
//
// O QUE ISSO PROVA
//   • as migrations aplicam — sintaxe, constraints, plpgsql, ordem de enum
//   • as policies de RLS fazem o que dizem, exercitadas com `set role`
//   • a aritmética financeira do SQL bate com a do TypeScript
//   • idempotência e travas de saldo funcionam de fato
//
// O QUE ISSO **NÃO** PROVA
//   • PGlite tem uma conexão só: concorrência real (dois clientes disputando a
//     mesma linha) não é observável. O que dá para testar é o efeito
//     serializado — a segunda tentativa encontra o estado já mudado e falha.
//     Corrida de verdade só com o banco do Supabase e conexões paralelas.
//   • GoTrue, PostgREST e o Asaas não existem aqui. `auth.uid()` é um shim.
//   • Os privilégios de PGlite não são idênticos aos do Supabase: aqui o
//     usuário default é superusuário, então SECURITY DEFINER ignora RLS —
//     o mesmo efeito que `postgres`/`service_role` têm em produção (BYPASSRLS),
//     mas pela razão errada.
// =====================================================================
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

/**
 * Objetos que o Supabase provê e que o Postgres puro não tem.
 * Tudo aqui é ANDAIME DE TESTE — nenhuma linha entra em migration.
 */
const SUPABASE_SHIM = `
  -- Papéis do PostgREST.
  create role anon          nologin;
  create role authenticated nologin;
  create role service_role  nologin bypassrls;
  grant anon, authenticated, service_role to current_user;

  create schema if not exists auth;
  grant usage on schema auth to anon, authenticated, service_role;

  create table auth.users (
    id    uuid primary key default gen_random_uuid(),
    phone text,
    email text
  );

  -- Réplica do auth.uid() do Supabase: lê o "sub" do JWT injetado pelo
  -- PostgREST como parâmetro de sessão. Nos testes, quem injeta é actAs().
  create or replace function auth.uid() returns uuid
  language sql stable as $shim$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $shim$;

  grant execute on function auth.uid() to anon, authenticated, service_role;

  -- Realtime: a 0002 faz "alter publication supabase_realtime add table ...".
  create publication supabase_realtime;
`;

export type Sql = PGlite;

export type TestDb = {
  db: PGlite;
  /** Executa como um usuário autenticado específico (aplica RLS). */
  actAs<T>(userId: string | null, fn: () => Promise<T>): Promise<T>;
  /** Executa com privilégio total (equivale ao service_role / Edge Function). */
  asService<T>(fn: () => Promise<T>): Promise<T>;
  /** Cria auth.users + pagora.profiles e devolve o id. */
  createUser(opts?: { phone?: string; role?: 'client' | 'provider' | 'admin' }): Promise<string>;
  /** Cria prestador aprovado, com carteira. */
  createProvider(opts?: { phone?: string; services?: string[] }): Promise<string>;
  close(): Promise<void>;
};

export async function setupDatabase(): Promise<TestDb> {
  const db = await PGlite.create({ extensions: { citext, pgcrypto } });

  await db.exec('create extension if not exists citext;');
  await db.exec('create extension if not exists pgcrypto;');
  await db.exec(SUPABASE_SHIM);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    try {
      // Cada migration numa transação — igual ao `supabase db push`. É isso que
      // torna o teste capaz de pegar o erro de "enum novo usado na mesma
      // transação em que foi criado".
      await db.exec(`begin; ${sql} ; commit;`);
    } catch (e) {
      await db.exec('rollback;').catch(() => {});
      throw new Error(`Migration ${file} falhou:\n${(e as Error).message}`, { cause: e });
    }
  }

  const currentUser = (await db.query<{ u: string }>('select current_user as u')).rows[0]!.u;

  async function actAs<T>(userId: string | null, fn: () => Promise<T>): Promise<T> {
    // Escopo de SESSÃO, não `set local`: cada query do PGlite roda em sua
    // própria transação implícita, e um `set local` morreria no fim da
    // primeira. É o mesmo motivo pelo qual o PostgREST usa `set_config` com
    // escopo de transação só porque mantém a requisição inteira numa
    // transação — aqui não temos essa garantia.
    await db.exec('set role authenticated;');
    await db.query('select set_config($1, $2, false)', ['request.jwt.claim.sub', userId ?? '']);
    try {
      return await fn();
    } finally {
      await db.exec(`set role ${currentUser};`);
      await db.query('select set_config($1, $2, false)', ['request.jwt.claim.sub', '']);
    }
  }

  async function asService<T>(fn: () => Promise<T>): Promise<T> {
    return await fn();
  }

  async function createUser(
    opts: { phone?: string; role?: 'client' | 'provider' | 'admin' } = {},
  ): Promise<string> {
    const phone = opts.phone ?? `+5511${Math.floor(Math.random() * 1e9)}`;
    const { rows } = await db.query<{ id: string }>(
      'insert into auth.users (phone) values ($1) returning id',
      [phone],
    );
    const id = rows[0]!.id;
    await db.query('insert into pagora.profiles (id, phone, role, cpf) values ($1, $2, $3, $4)', [
      id,
      phone,
      opts.role ?? 'client',
      String(Math.floor(Math.random() * 1e11)),
    ]);
    return id;
  }

  async function createProvider(
    opts: { phone?: string; services?: string[] } = {},
  ): Promise<string> {
    const id = await createUser({ role: 'provider', ...(opts.phone ? { phone: opts.phone } : {}) });
    // O driver do PGlite não serializa array JS para literal de array do
    // Postgres — montamos `{frete,guincho}` na mão.
    const services = `{${(opts.services ?? ['frete']).join(',')}}`;
    await db.query(
      `insert into pagora.providers (profile_id, display_name, services, approved_at, pix_key)
       values ($1, $2, $3::pagora.service_type[], now(), $4)`,
      [id, `Prestador ${id.slice(0, 8)}`, services, `pix-${id.slice(0, 8)}`],
    );
    await db.query('insert into pagora.wallets (provider_id) values ($1)', [id]);
    return id;
  }

  return {
    db,
    actAs,
    asService,
    createUser,
    createProvider,
    close: () => db.close(),
  };
}

/** Açúcar: espera que a promise rejeite com uma mensagem que casa com o regex. */
export async function expectRejection(fn: () => Promise<unknown>, pattern: RegExp): Promise<void> {
  let message: string | null = null;
  try {
    await fn();
  } catch (e) {
    message = (e as Error).message;
  }
  if (message === null) {
    throw new Error(`Esperava rejeição casando com ${pattern}, mas a operação teve sucesso`);
  }
  if (!pattern.test(message)) {
    throw new Error(`Esperava ${pattern}, recebeu: ${message}`);
  }
}
