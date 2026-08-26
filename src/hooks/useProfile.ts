import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '../lib/supabase';
import { ensureProfile } from '../lib/auth';
import type { Tables } from '../lib/database.types';
import { useSession } from './useSession';

type Profile = Tables<'profiles'>;

// =====================================================================
// PAGORA — O perfil, uma vez só
// =====================================================================
// Antes cada tela montava o próprio estado e buscava de novo: trocar de aba
// refazia a consulta, e o perfil piscava entre uma tela e outra.
//
// O motivo de mudar agora é mais duro que desempenho. `ensure_profile` (0001)
// NÃO tem `on conflict`: ela procura, não acha, e insere. Duas chamadas ao
// mesmo tempo passam as duas pela procura e a segunda estoura na chave
// primária. Com o portão de boas-vindas, o App passa a ler o perfil junto com
// a tela — seriam exatamente essas duas chamadas simultâneas, no primeiro
// login de cada pessoa, que é o pior momento possível para falhar.
//
// Uma fonte só, com a busca em voo compartilhada, elimina a corrida.
// =====================================================================

type State = { profile: Profile | null; loading: boolean; error: Error | null };

let state: State = { profile: null, loading: true, error: null };
let carregadoPara: string | null = null;
let emVoo: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: Partial<State>): void {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

async function load(userId: string, forcar = false): Promise<void> {
  if (!forcar && carregadoPara === userId && state.profile) return;
  // A mesma busca serve todos os interessados — inclusive o `ensure_profile`
  // que só pode acontecer uma vez.
  if (emVoo && !forcar) return emVoo;

  emVoo = (async () => {
    publish({ loading: true, error: null });
    try {
      // Buscar direto é mais barato que a RPC, e é o caso comum.
      const { data: row, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;

      const profile = row ?? ((await ensureProfile()) as Profile);
      carregadoPara = userId;
      publish({ profile, loading: false });
    } catch (e) {
      publish({ error: e as Error, loading: false });
    } finally {
      emVoo = null;
    }
  })();

  return emVoo;
}

function reset(): void {
  carregadoPara = null;
  emVoo = null;
  publish({ profile: null, loading: false, error: null });
}

/**
 * Relê o perfil do banco e avisa todas as telas.
 *
 * Usado depois de salvar os dados: sem isto, a home continuaria dizendo
 * "Bem-vindo ao Pagora" para quem acabou de digitar o próprio nome.
 */
export function refreshProfile(): Promise<void> {
  return carregadoPara ? load(carregadoPara, true) : Promise.resolve();
}

export function useProfile(): State {
  const { user, loading: sessionLoading } = useSession();
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      // Trocar de conta (ou sair) não pode deixar o perfil anterior na tela.
      if (carregadoPara !== null || state.profile || state.loading) reset();
      return;
    }
    if (carregadoPara !== null && carregadoPara !== user.id) reset();
    void load(user.id);
  }, [user, sessionLoading]);

  return snapshot;
}
