// =====================================================================
// PAGORA — request-withdrawal
// =====================================================================
// Ordem deliberada: RESERVA o saldo primeiro, transfere depois.
//
// O caminho intuitivo (transferir e depois debitar) tem uma janela em que dois
// pedidos simultâneos de saque leem o mesmo saldo, ambos passam na checagem, e
// os dois transferem. Reservando primeiro, o segundo pedido encontra o saldo já
// debitado e falha — que é o resultado correto.
//
// Se a transferência falhar depois da reserva, `fail_withdrawal()` devolve o
// valor com um lançamento próprio no ledger. O estado intermediário
// ('requested' com saldo reservado) é visível e reconciliável; o oposto —
// dinheiro transferido sem débito — não seria.
// =====================================================================
import {
  BusinessError,
  adminClient,
  handle,
  json,
  logEvent,
  requireUser,
} from '../_shared/http.ts';
import { AsaasError, createPixTransfer } from '../_shared/asaas.ts';

const PIX_KEY_TYPES = ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP'] as const;

Deno.serve((req) =>
  handle(req, async (req, origin) => {
    if (req.method !== 'POST') throw new BusinessError('Método não suportado', 405);

    const userId = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as {
      amountCents?: number;
      idempotencyKey?: string;
      pixKey?: string;
      pixKeyType?: string;
    };

    const amountCents = body.amountCents;
    if (!Number.isSafeInteger(amountCents) || (amountCents as number) <= 0) {
      throw new BusinessError('amountCents deve ser um inteiro positivo em centavos');
    }
    // A chave de idempotência é obrigatória e vem do cliente: é ela que faz um
    // retry do app (rede caiu depois do envio) não virar dois saques.
    const idempotencyKey = body.idempotencyKey;
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      throw new BusinessError('idempotencyKey é obrigatória');
    }
    const pixKeyType = (body.pixKeyType ?? 'CPF').toUpperCase();
    if (!(PIX_KEY_TYPES as readonly string[]).includes(pixKeyType)) {
      throw new BusinessError(`pixKeyType inválido. Use um de: ${PIX_KEY_TYPES.join(', ')}`);
    }

    const db = adminClient();

    // O ator é o próprio prestador — o id vem do JWT, nunca do corpo.
    const { data: provider } = await db
      .from('providers')
      .select('profile_id, approved_at, pix_key')
      .eq('profile_id', userId)
      .maybeSingle();

    if (!provider) throw new BusinessError('Você não é um prestador cadastrado', 403);
    if (!provider.approved_at) throw new BusinessError('Cadastro ainda não aprovado', 403);

    const pixKey = body.pixKey ?? provider.pix_key;
    if (!pixKey) throw new BusinessError('Cadastre uma chave Pix antes de sacar', 422);

    // 1. Reserva. Valida saldo, trava a carteira e grava o débito no ledger.
    const { data: withdrawal, error: reqErr } = await db.rpc('request_withdrawal', {
      p_provider_id: userId,
      p_amount_cents: amountCents,
      p_idempotency_key: idempotencyKey,
      p_pix_key: pixKey,
    });
    if (reqErr) throw new BusinessError(translate(reqErr.message), 400);
    if (!withdrawal) throw new BusinessError('Não foi possível registrar o saque');

    // Repetição da mesma chave: devolve o saque já existente sem tocar no
    // gateway de novo.
    if (withdrawal.gateway_transfer_id) {
      logEvent('withdrawal_reused', { withdrawal_id: withdrawal.id });
      return json(presentable(withdrawal), 200, origin);
    }

    logEvent('withdrawal_requested', {
      withdrawal_id: withdrawal.id,
      provider_id: userId,
      amount_cents: amountCents,
    });

    // 2. Transferência.
    try {
      const transfer = await createPixTransfer({
        valueCents: amountCents as number,
        pixAddressKey: pixKey,
        pixAddressKeyType: pixKeyType,
        description: `PAGORA — saque ${withdrawal.id}`,
        idempotencyKey: `pagora-withdrawal-${withdrawal.id}`,
      });

      await db
        .from('withdrawals')
        .update({ status: 'processing', gateway_transfer_id: transfer.id })
        .eq('id', withdrawal.id);

      logEvent('withdrawal_sent_to_gateway', {
        withdrawal_id: withdrawal.id,
        gateway_transfer_id: transfer.id,
      });

      return json(
        { ...presentable(withdrawal), status: 'processing', gatewayTransferId: transfer.id },
        201,
        origin,
      );
    } catch (e) {
      // Devolve a reserva imediatamente. Sem isso, o prestador ficaria com o
      // saldo preso até alguém notar.
      const reason =
        e instanceof AsaasError ? `gateway ${e.status}` : 'falha ao contatar o gateway';
      await db.rpc('fail_withdrawal', { p_withdrawal_id: withdrawal.id, p_reason: reason });
      logEvent('withdrawal_failed', { withdrawal_id: withdrawal.id, reason });
      throw new BusinessError('Não foi possível concluir o saque. Seu saldo foi devolvido.', 502);
    }
  }),
);

function presentable(w: Record<string, unknown>) {
  return {
    withdrawalId: w.id,
    amountCents: w.amount_cents,
    status: w.status,
    requestedAt: w.requested_at,
  };
}

function translate(message: string): string {
  if (message.includes('insufficient_balance') || message.includes('insufficient_funds')) {
    return 'Saldo disponível insuficiente';
  }
  if (message.includes('wallet_not_found')) return 'Carteira não encontrada';
  if (message.includes('wallet_not_active')) return 'Carteira bloqueada — fale com o suporte';
  if (message.includes('withdrawals_one_inflight_per_provider')) {
    return 'Você já tem um saque em andamento';
  }
  return 'Não foi possível solicitar o saque';
}
