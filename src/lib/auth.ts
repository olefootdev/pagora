import { supabase } from './supabase';
import { loadErrorMessage } from './timeout';

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

/**
 * Mensagem de erro da porta de entrada.
 *
 * A tela Entrar mostrava `e.message` cru. Com o backend fora do ar isso vira
 * **"Failed to fetch"** em inglês, na primeira tela que a pessoa vê — foi
 * assim que este bug apareceu, verificado contra o projeto pausado.
 *
 * O supabase-js devolve as mensagens de auth em inglês, sempre. Traduzir aqui
 * é o mesmo padrão de `translateReviewError` e `translateDisputeError`: cada
 * domínio traduz o que só ele sabe interpretar, e delega o resto para
 * `loadErrorMessage`, que já cuida de rede e sessão.
 */
export function authErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');

  // Código errado e código vencido chegam na MESMA mensagem do Supabase.
  // Separá-los exigiria adivinhar; dizer as duas possibilidades é honesto e
  // já indica a saída (pedir outro).
  if (/token has expired|invalid token|otp.*(expired|invalid)|invalid.*otp/i.test(raw)) {
    return 'Código incorreto ou expirado. Peça um novo código.';
  }

  // O Supabase limita reenvio por segurança e devolve o tempo em segundos.
  const espera = raw.match(/only request this after (\d+) seconds?/i);
  if (espera) {
    return `Aguarde ${espera[1]} segundos para pedir outro código.`;
  }
  if (/rate limit|too many requests/i.test(raw)) {
    return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  }

  if (/invalid phone|phone.*invalid/i.test(raw)) {
    return 'Número inválido. Confira o DDD e os 9 dígitos.';
  }

  if (/sms|provider|twilio|messagebird/i.test(raw)) {
    return 'Não conseguimos enviar o SMS agora. Tente de novo em instantes.';
  }

  // Rede, sessão e o resto: um lugar só, o mesmo do resto do app.
  return loadErrorMessage(error);
}
