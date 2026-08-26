// =====================================================================
// PAGORA — Prestadores disponíveis
// =====================================================================
// O passo "quem pode fazer" precisa mostrar gente de verdade. Até aqui a tela
// de mapa e a de propostas ordenavam um array fixo no próprio arquivo — o
// cliente via "Carlos Mudanças, 4.7" existisse ou não um Carlos.
//
// Sobre confiança: a `providers_public_read` da 0002 só devolve prestador com
// `approved_at` preenchido. Ou seja, quem aparece nesta lista passou pela
// aprovação do admin. Não é preciso filtrar nada aqui, e não se deve —
// repetir o filtro no client daria a impressão de que ELE é a proteção.
// =====================================================================

import { supabase } from '../../lib/supabase';
import type { ServiceType, Tables } from '../../lib/database.types';

export type AvailableProvider = Pick<
  Tables<'providers'>,
  | 'profile_id'
  | 'display_name'
  | 'vehicle_type'
  | 'vehicle_model'
  | 'capacity_kg'
  | 'rating_avg'
  | 'rating_count'
  | 'service_areas'
>;

const COLUMNS =
  'profile_id, display_name, vehicle_type, vehicle_model, capacity_kg, rating_avg, rating_count, service_areas';

/**
 * Prestadores aprovados que atendem este serviço.
 *
 * `city` é filtro opcional e SEMPRE degradante: quando a cidade não bate com
 * nenhuma área atendida, devolvemos a lista sem o filtro em vez de uma lista
 * vazia. Tela vazia num marketplace jovem lê como "não existe ninguém", e o
 * usuário desiste — quando a verdade é só que ninguém declarou aquela cidade.
 */
export async function listAvailableProviders(
  service: ServiceType,
  city?: string | null,
  limit = 8,
): Promise<AvailableProvider[]> {
  const base = () =>
    supabase
      .from('providers')
      .select(COLUMNS)
      .contains('services', [service])
      .not('approved_at', 'is', null)
      .order('rating_avg', { ascending: false, nullsFirst: false })
      .limit(limit);

  if (city) {
    const { data, error } = await base().contains('service_areas', [city]);
    if (error) throw error;
    if (data && data.length > 0) return data as unknown as AvailableProvider[];
  }

  const { data, error } = await base();
  if (error) throw error;
  return (data ?? []) as unknown as AvailableProvider[];
}

/** Quantos prestadores aprovados atendem este serviço. Barato: só o count. */
export async function countAvailableProviders(service: ServiceType): Promise<number> {
  const { count, error } = await supabase
    .from('providers')
    .select('profile_id', { count: 'exact', head: true })
    .contains('services', [service])
    .not('approved_at', 'is', null);

  if (error) throw error;
  return count ?? 0;
}

export async function getProvider(profileId: string): Promise<AvailableProvider | null> {
  const { data, error } = await supabase
    .from('providers')
    .select(COLUMNS)
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as AvailableProvider) ?? null;
}

/** Iniciais para o avatar quando não há foto. "Carlos Mudanças" → "CM". */
export function initialsOf(name: string | null | undefined): string {
  if (!name) return '··';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '··';
}
