import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ensureProfile } from '../lib/auth';
import type { Tables } from '../lib/database.types';
import { useSession } from './useSession';

type Profile = Tables<'profiles'>;

// Hook para o profile do Pagora do usuário logado.
// Chama ensure_profile() (lazy-create) na primeira vez que o usuário aparece.
export function useProfile(): { profile: Profile | null; loading: boolean; error: Error | null } {
  const { user, loading: sessionLoading } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      // Sync state for logged-out users (rule fires on this, but it's the canonical pattern)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(null);

      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);

    setError(null);

    (async () => {
      try {
        // 1. tenta buscar direto (mais barato)
        const { data: row, error: selectErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (selectErr) throw selectErr;

        if (row) {
          if (!cancelled) setProfile(row as Profile);
        } else {
          // 2. não existe ainda → cria via RPC (security definer)
          const created = (await ensureProfile()) as Profile;
          if (!cancelled) setProfile(created);
        }
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, sessionLoading]);

  return { profile, loading, error };
}
