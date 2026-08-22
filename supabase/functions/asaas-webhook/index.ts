// =====================================================================
// PAGORA — asaas-webhook
// =====================================================================
// Este é o arquivo mais perigoso do projeto: é a única porta pela qual uma
// requisição externa consegue liberar dinheiro. Cinco travas, nesta ordem:
//
//  1. AUTENTICIDADE — token compartilhado no header, comparado em tempo
//     constante. Sem ele, qualquer um posta PAYMENT_RECEIVED.
//  2. REGISTRO ANTES DO EFEITO — o evento é gravado em payment_events antes de
//     qualquer processamento. A unique(gateway, gateway_event_id) transforma
//     reenvio em no-op.
//  3. RECONCILIAÇÃO — o payment é localizado pelo NOSSO externalReference e
//     confrontado com o gateway_payment_id já registrado. Um evento apontando
//     para uma cobrança de outro pedido é rejeitado.
//  4. CONFERÊNCIA DE VALOR — confirm_payment compara o valor informado com o
//     valor cobrado. Divergiu, não credita.
//  5. REENTRÂNCIA — todas as funções chamadas aqui são no-op quando o estado
//     final já foi atingido.
//
// Resposta: 200 mesmo em evento ignorado. O Asaas reenvia enquanto não receber
// 200, e reenviar um evento que já foi corretamente descartado não melhora
// nada. 5xx fica reservado a falha real de processamento, onde o reenvio ajuda.
// =====================================================================
import { adminClient, handle, json, logEvent, timingSafeEqual } from '../_shared/http.ts';
import { gatewayAmountToCents } from '../_shared/money.ts';

type AsaasWebhookBody = {
  id?: string;
  event?: string;
  payment?: {
    id?: string;
    value?: number | string;
    netValue?: number | string;
    externalReference?: string;
    status?: string;
  };
  transfer?: {
    id?: string;
    externalReference?: string;
    status?: string;
    failReason?: string;
  };
};

Deno.serve((req) =>
  handle(req, async (req, origin) => {
    if (req.method !== 'POST') return json({ error: 'method' }, 405, origin);

    // ---------------- Trava 1: autenticidade ----------------
    const expected = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    if (!expected) {
      logEvent('webhook_misconfigured');
      return json({ error: 'webhook não configurado' }, 500, origin);
    }
    const received = req.headers.get('asaas-access-token') ?? '';
    if (!timingSafeEqual(received, expected)) {
      logEvent('webhook_rejected_bad_token');
      // 401 sem detalhe: não confirmamos se o token existe ou está errado.
      return json({ error: 'unauthorized' }, 401, origin);
    }

    const body = (await req.json().catch(() => null)) as AsaasWebhookBody | null;
    if (!body?.event || !body?.id) {
      logEvent('webhook_malformed');
      return json({ received: true, ignored: 'payload sem event/id' }, 200, origin);
    }

    const db = adminClient();
    const eventType = body.event;

    // ---------------- Trava 3 (parte 1): localizar o alvo ----------------
    // `externalReference` é o id da NOSSA linha, gravado por nós na criação da
    // cobrança. Confiar no id do gateway como chave primária de busca deixaria
    // um evento forjado escolher o alvo livremente.
    const ourPaymentId = body.payment?.externalReference ?? null;
    const ourWithdrawalId = body.transfer?.externalReference ?? null;

    // ---------------- Trava 2: registrar antes de agir ----------------
    const { data: recorded, error: recordErr } = await db
      .rpc('record_payment_event', {
        p_gateway_event_id: body.id,
        p_event_type: eventType,
        p_payload: body,
        p_payment_id: ourPaymentId,
        p_withdrawal_id: ourWithdrawalId,
      })
      .single();

    if (recordErr) {
      logEvent('webhook_record_failed', { event_type: eventType, message: recordErr.message });
      // 500 aqui é correto: não conseguimos nem registrar, queremos o reenvio.
      return json({ error: 'falha ao registrar evento' }, 500, origin);
    }

    const { event_id: eventId, already_processed: alreadyProcessed } = recorded as {
      event_id: string;
      already_processed: boolean;
    };

    if (alreadyProcessed) {
      logEvent('webhook_duplicate', { event_type: eventType, event_id: eventId });
      return json({ received: true, duplicate: true }, 200, origin);
    }

    try {
      const outcome = await process(db, eventType, body, ourPaymentId, ourWithdrawalId);
      await db.rpc('mark_event_processed', { p_event_id: eventId, p_error: null });
      logEvent('webhook_processed', { event_type: eventType, event_id: eventId, ...outcome });
      return json({ received: true, ...outcome }, 200, origin);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // O evento fica com processed_at nulo e process_error preenchido: some
      // do fluxo automático, aparece no painel de falhas de webhook, e pode ser
      // reprocessado sem risco de duplicar (as funções são reentrantes).
      await db.rpc('mark_event_processed', { p_event_id: eventId, p_error: message });
      logEvent('webhook_process_failed', { event_type: eventType, event_id: eventId, message });
      return json({ error: 'falha ao processar evento' }, 500, origin);
    }
  }),
);

async function process(
  // deno-lint-ignore no-explicit-any
  db: any,
  eventType: string,
  body: AsaasWebhookBody,
  ourPaymentId: string | null,
  ourWithdrawalId: string | null,
): Promise<Record<string, unknown>> {
  switch (eventType) {
    // -------- Cobrança recebida --------
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_CONFIRMED': {
      if (!ourPaymentId) return { ignored: 'evento sem externalReference' };

      // Trava 3 (parte 2): a linha tem que existir E o id do gateway tem que
      // ser o mesmo que registramos ao criar a cobrança.
      const { data: payment } = await db
        .from('payments')
        .select('id, gateway_payment_id, amount_cents, status')
        .eq('id', ourPaymentId)
        .maybeSingle();

      if (!payment) return { ignored: 'payment não encontrado' };

      const gatewayId = body.payment?.id;
      if (payment.gateway_payment_id && gatewayId && payment.gateway_payment_id !== gatewayId) {
        throw new Error(
          `gateway_payment_id divergente: esperado ${payment.gateway_payment_id}, recebido ${gatewayId}`,
        );
      }

      // Trava 4: valor. `gatewayAmountToCents` rejeita formato inesperado em
      // vez de silenciosamente virar NaN → 0.
      const receivedCents = gatewayAmountToCents(body.payment?.value);
      const netCents =
        body.payment?.netValue !== undefined
          ? gatewayAmountToCents(body.payment.netValue)
          : receivedCents;
      const gatewayFeeCents = Math.max(receivedCents - netCents, 0);

      const { error } = await db.rpc('confirm_payment', {
        p_payment_id: payment.id,
        p_amount_cents: receivedCents,
        p_gateway_fee_cents: gatewayFeeCents,
        p_gateway_ref: gatewayId ?? null,
      });
      if (error) throw new Error(error.message);

      return { action: 'payment_confirmed', paymentId: payment.id };
    }

    // -------- Cobrança vencida / estornada --------
    case 'PAYMENT_OVERDUE': {
      if (!ourPaymentId) return { ignored: 'sem externalReference' };
      await db
        .from('payments')
        .update({ status: 'expired' })
        .eq('id', ourPaymentId)
        .eq('status', 'pending');
      return { action: 'payment_expired', paymentId: ourPaymentId };
    }

    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_CHARGEBACK_REQUESTED': {
      if (!ourPaymentId) return { ignored: 'sem externalReference' };
      const { data: payment } = await db
        .from('payments')
        .select('id, order_id, status')
        .eq('id', ourPaymentId)
        .maybeSingle();
      if (!payment) return { ignored: 'payment não encontrado' };

      // Estorno NÃO é automatizado até o fim: reverter saldo já sacado exige
      // decisão humana. Marcamos e deixamos para o painel admin.
      const { error } = await db.rpc('refund_order', {
        p_order_id: payment.order_id,
        p_actor_id: null,
        p_reason: `Gateway: ${eventType}`,
      });
      if (error) throw new Error(error.message);
      return { action: 'order_refunded', orderId: payment.order_id };
    }

    // -------- Transferências (saques) --------
    case 'TRANSFER_DONE': {
      if (!ourWithdrawalId) return { ignored: 'sem externalReference' };
      const { error } = await db.rpc('confirm_withdrawal', {
        p_withdrawal_id: ourWithdrawalId,
        p_transfer_id: body.transfer?.id ?? null,
      });
      if (error) throw new Error(error.message);
      return { action: 'withdrawal_paid', withdrawalId: ourWithdrawalId };
    }

    case 'TRANSFER_FAILED':
    case 'TRANSFER_CANCELLED': {
      if (!ourWithdrawalId) return { ignored: 'sem externalReference' };
      const { error } = await db.rpc('fail_withdrawal', {
        p_withdrawal_id: ourWithdrawalId,
        p_reason: body.transfer?.failReason ?? eventType,
      });
      if (error) throw new Error(error.message);
      return { action: 'withdrawal_failed', withdrawalId: ourWithdrawalId };
    }

    default:
      // Evento conhecido pelo Asaas e irrelevante para nós. Fica registrado em
      // payment_events e marcado como processado — o log de auditoria guarda
      // tudo, o fluxo financeiro ignora.
      return { ignored: `evento não tratado: ${eventType}` };
  }
}
