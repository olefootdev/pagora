import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

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
export const supabase = createClient<Database>(url, anonKey, {
  db: { schema: schema as 'pagora' },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
