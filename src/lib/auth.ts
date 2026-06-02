import { supabase } from './supabase';

// =====================================================================
// PAGORA — Auth helpers (OTP via SMS)
// =====================================================================

/** Aceita 11999999999, (11)99999-9999, +5511999999999. Retorna E.164. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return '+' + digits;
  if (digits.startsWith('55') && digits.length >= 12) return '+' + digits;
  if (digits.length === 11) return '+55' + digits;
  if (digits.length === 10) return '+55' + digits; // sem 9 inicial
  throw new Error('Telefone inválido — use formato (11) 99999-9999');
}

/** Envia OTP por SMS pro número. Cria a auth.users na primeira vez. */
export async function signInWithPhone(rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
  return { phone };
}

/** Verifica o OTP de 6 dígitos e abre sessão. Retorna o user id. */
export async function verifyOtp(rawPhone: string, token: string): Promise<string> {
  const phone = normalizePhone(rawPhone);
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw error;
  if (!data.user) throw new Error('Sessão não foi aberta após verifyOtp');
  return data.user.id;
}

/** Lazy-cria pagora.profiles pro usuário corrente (chama RPC). */
export async function ensureProfile() {
  const { data, error } = await supabase.rpc('ensure_profile' as never);
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
