// =====================================================================
// PAGORA — create-payment
// =====================================================================
// Fluxo: React → esta função → Postgres (prepare_payment) → Asaas → Postgres.
//
// O corpo aceito é `{ orderId }`. E SÓ. Não existe parâmetro de valor, de
// comissão ou de líquido do prestador — se o cliente enviar `{ amount: 1 }`
// junto, o campo é simplesmente ignorado porque não há onde encaixá-lo.
// O preço sai da order, que copiou da quote aceita; a decomposição sai de
// `pagora.compute_amounts()`.
// =====================================================================
import {
  BusinessError,
  adminClient,
  handle,
  json,
  logEvent,
  requireUser,
} from '../_shared/http.ts';
import { createPixCharge, findOrCreateCustomer, getPixQrCode } from '../_shared/asaas.ts';

Deno.serve((req) =>
  handle(req, async (req, origin) => {
    if (req.method !== 'POST') throw new BusinessError('Método não suportado', 405);

    const userId = await requireUser(req);

    const body = (await req.json().catch(() => ({}))) as { orderId?: string };
    const orderId = body.orderId;
    if (!orderId || typeof orderId !== 'string') {
      throw new BusinessError('orderId é obrigatório');
    }

    const db = adminClient();

    // 1. O banco decide todo o dinheiro. Também valida que a order pertence ao
    //    usuário e que está em pending_payment. Idempotente: se já existe
    //    cobrança viva, devolve a mesma.
    const { data: payment, error: prepErr } = await db.rpc('prepare_payment', {
      p_order_id: orderId,
      p_actor_id: userId,
    });
    if (prepErr) throw new BusinessError(translate(prepErr.message), 400);
    if (!payment) throw new BusinessError('Não foi possível preparar o pagamento');

    // Cobrança já emitida: devolve o Pix existente em vez de criar outro.
    if (payment.gateway_payment_id) {
      logEvent('payment_reused', { payment_id: payment.id, order_id: orderId });
      return json(presentable(payment), 200, origin);
    }

    // 2. Dados do pagador e da subconta do prestador.
    const { data: client } = await db
      .from('profiles')
      .select('id, full_name, cpf, phone, email')
      .eq('id', userId)
      .single();

    if (!client?.cpf) {
      throw new BusinessError('Informe seu CPF no perfil antes de pagar', 422);
    }

    const { data: wallet } = await db
      .from('wallets')
      .select('gateway_wallet_id')
      .eq('provider_id', payment.provider_id)
      .maybeSingle();

    const customer = await findOrCreateCustomer({
      name: client.full_name ?? 'Cliente PAGORA',
      cpfCnpj: client.cpf,
      mobilePhone: client.phone ?? undefined,
      email: client.email ?? undefined,
      externalReference: client.id,
    });

    // 3. Split: o prestador recebe o líquido; a comissão fica na conta
    //    principal. Sem walletId (prestador ainda não onboardado no gateway) a
    //    cobrança segue sem split e a liquidação vira transferência — o
    //    pagamento do cliente não é bloqueado por pendência do prestador.
    const walletId = wallet?.gateway_wallet_id ?? null;
    if (!walletId) {
      logEvent('payment_without_split', {
        payment_id: payment.id,
        provider_id: payment.provider_id,
      });
    }

    const charge = await createPixCharge({
      customerId: customer.id,
      valueCents: payment.amount_cents,
      description: `PAGORA — pedido ${payment.order_id}`,
      externalReference: payment.id,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      split: walletId ? { walletId, fixedValueCents: payment.provider_amount_cents } : null,
      // A chave amarra o retry de rede à NOSSA linha de payment: um timeout
      // seguido de nova tentativa não gera dois Pix.
      idempotencyKey: `pagora-payment-${payment.id}`,
    });

    const qr = await getPixQrCode(charge.id);

    // 4. Persiste o que voltou. Só aqui a cobrança fica utilizável.
    const { data: updated, error: attachErr } = await db.rpc('attach_gateway_payment', {
      p_payment_id: payment.id,
      p_gateway_id: charge.id,
      p_pix_payload: qr.payload,
      p_pix_qr_code: qr.encodedImage,
      p_invoice_url: charge.invoiceUrl ?? null,
      p_expires_at: qr.expirationDate ?? null,
    });
    if (attachErr) throw new BusinessError(translate(attachErr.message), 400);

    logEvent('payment_created', {
      payment_id: payment.id,
      order_id: payment.order_id,
      amount_cents: payment.amount_cents,
      platform_fee_cents: payment.platform_fee_cents,
      split: Boolean(walletId),
    });

    return json(presentable(updated ?? payment), 201, origin);
  }),
);

/**
 * O que o frontend recebe. Deliberadamente NÃO inclui `provider_amount_cents`
 * nem `gateway_fee_cents`: o cliente não tem por que saber quanto o prestador
 * leva, e cada campo exposto é um campo que alguém vai acabar tentando
 * mandar de volta.
 */
function presentable(p: Record<string, unknown>) {
  return {
    paymentId: p.id,
    orderId: p.order_id,
    status: p.status,
    amountCents: p.amount_cents,
    method: p.payment_method,
    pixPayload: p.pix_payload,
    pixQrCode: p.pix_qr_code,
    invoiceUrl: p.invoice_url,
    expiresAt: p.expires_at,
  };
}

/** Traduz erros de regra do Postgres para mensagem de usuário. */
function translate(message: string): string {
  if (message.includes('order_not_found')) return 'Pedido não encontrado';
  if (message.includes('forbidden')) return 'Este pedido não é seu';
  if (message.includes('order_not_payable')) return 'Este pedido não está aguardando pagamento';
  return 'Não foi possível gerar a cobrança';
}
