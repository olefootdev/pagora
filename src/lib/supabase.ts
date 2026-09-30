import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// =====================================================================
// Cliente Supabase — inicialização PREGUIÇOSA
// =====================================================================
// Por que não criar o cliente no topo do módulo, como antes:
//
// `import.meta.env.VITE_*` é substituído por literal em tempo de BUILD. Sem as
// variáveis definidas, o antigo
//
//     if (!url || !anonKey) throw new Error(...)
//
// virava `if (!undefined || !undefined) throw ...` — condição estaticamente
// verdadeira. O Rollup então tratava TODO o código seguinte como inalcançável
// e o eliminava. Resultado: `npm run build` sem `.env` produzia um bundle de
// ~330 kB só com bibliotecas, sem uma linha do app, e sem falhar.
//
// Em produção isso é página branca — e o deploy passa verde, porque o build
// "funcionou". Foi o que aconteceu no episódio do Cloudflare.
//
// Com a inicialização preguiçosa o `throw` fica dentro de uma função, não há
// código morto em nível de módulo, e a checagem continua valendo: a falta da
// variável explode na primeira chamada real, com a mesma mensagem.
//
// Efeito colateral bem-vindo: módulos que só importam `supabase` sem usar
// (telas puras, testes) param de quebrar na importação.
// =====================================================================

let client: SupabaseClient<Database> | null = null;

export const isSupabaseConfigured = (): boolean =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

const getClient = (): SupabaseClient<Database> => {
  if (client) return client;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const schema = import.meta.env.VITE_SUPABASE_SCHEMA ?? 'pagora';

  if (!url || !anonKey) {
    throw new Error(
      'Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local. Copie de .env.example.',
    );
  }

  // O cliente já vem apontado para o schema `pagora`. Qualquer
  // `supabase.from('profiles')` vai bater em `pagora.profiles` e respeitar RLS.
  // Para acessar outros schemas, usar `supabase.schema('public').from(...)`.
  client = createClient<Database>(url, anonKey, {
    db: { schema: schema as 'pagora' },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
};

/**
 * Mesma API de sempre — `supabase.from(...)`, `supabase.auth`, `supabase.rpc(...)`.
 * O proxy só adia a construção até o primeiro acesso a uma propriedade.
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    const c = getClient();
    const value = Reflect.get(c, prop, receiver);
    // Métodos precisam do `this` original; sem o bind, `supabase.from(...)`
    // executaria com o proxy como contexto e quebraria no supabase-js.
    return typeof value === 'function' ? value.bind(c) : value;
  },
  has: (_target, prop) => prop in getClient(),
});
