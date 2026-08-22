// =====================================================================
// PAGORA — serviço de carteira do prestador (frontend)
// =====================================================================
import { supabase } from '../../lib/supabase';
import { callFunction, newIdempotencyKey } from '../../lib/functions';
import type { Tables } from '../../lib/database.types';

export type WalletSummary = {
  /** Sacável agora. */
  availableCents: number;
  /** Recebido do cliente, retido até o serviço ser confirmado. */
  pendingCents: number;
  totalReceivedCents: number;
  withdrawnTotalCents: number;
  /** Falso enquanto o prestador não tiver subconta no gateway. */
  gatewayReady: boolean;
  status: 'active' | 'blocked' | 'closed';
};

export async function getWallet(providerId: string): Promise<WalletSummary | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('provider_id', providerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    availableCents: data.balance_cents,
    pendingCents: data.pending_cents,
    totalReceivedCents: data.total_received_cents,
    withdrawnTotalCents: data.withdrawn_total_cents,
    gatewayReady: Boolean(data.gateway_wallet_id),
    status: data.status,
  };
}

/** Extrato: o ledger, na ordem em que aconteceu. */
export async function getLedger(
  providerId: string,
  limit = 50,
): Promise<Tables<'wallet_transactions'>[]> {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getWithdrawals(providerId: string): Promise<Tables<'withdrawals'>[]> {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export type WithdrawalRequest = {
  withdrawalId: string;
  amountCents: number;
  status: string;
  requestedAt: string;
};

/**
 * Solicita saque.
 *
 * `idempotencyKey` é gerada aqui e deve ser REUSADA em qualquer retry da mesma
 * intenção do usuário — a tela guarda a chave enquanto o botão está em estado
 * de envio. Gerar chave nova a cada tentativa anularia a proteção: seriam duas
 * intenções distintas aos olhos do servidor.
 */
export async function requestWithdrawal(input: {
  amountCents: number;
  idempotencyKey?: string;
  pixKey?: string;
  pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';
}): Promise<WithdrawalRequest> {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Valor de saque inválido');
  }

  return await callFunction<WithdrawalRequest>('request-withdrawal', {
    amountCents: input.amountCents,
    idempotencyKey: input.idempotencyKey ?? newIdempotencyKey(),
    pixKey: input.pixKey,
    pixKeyType: input.pixKeyType ?? 'CPF',
  });
}

/** Cria a subconta do prestador no gateway. Idempotente. */
export async function enableGatewayPayouts(input?: {
  incomeValue?: number;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  province?: string;
}): Promise<{ walletId: string; created: boolean }> {
  return await callFunction('create-provider-account', input ?? {});
}
