// =====================================================================
// PAGORA — cliente Asaas
// =====================================================================
// GATEWAY ESCOLHIDO: Asaas.
//
// Motivo, em uma linha: é o único da lista curta que resolve os três problemas
// do Pagora com um fornecedor só — Pix nativo, split de pagamento por
// walletId, e subconta para o prestador (o que dá a ele um destino de
// transferência sem a PAGORA virar custodiante do dinheiro dos outros).
//
// Não existe camada de abstração para múltiplos gateways aqui, de propósito.
// Uma interface genérica escrita antes do segundo gateway existir é sempre
// modelada no formato do primeiro, e só descobre o que errou quando o segundo
// chega. O acoplamento está contido nestes arquivos e nas colunas
// `gateway_*` — trocar significa reescrever este módulo, não o domínio.
//
// A API key NUNCA sai daqui. Não é retornada em resposta, não vai a log, não
// existe com prefixo VITE_.
// =====================================================================

const ASAAS_ENV = Deno.env.get('ASAAS_ENV') ?? 'sandbox';

const BASE_URL =
  ASAAS_ENV === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';

function apiKey(): string {
  const key = Deno.env.get('ASAAS_API_KEY');
  if (!key) {
    throw new Error('ASAAS_API_KEY não configurada nos secrets da Edge Function');
  }
  return key;
}

export class AsaasError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'AsaasError';
  }
}

async function request<T>(
  path: string,
  init: { method: string; body?: unknown; idempotencyKey?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    access_token: apiKey(),
    'User-Agent': 'pagora-edge/1.0',
  };
  // O Asaas aceita chave de idempotência por requisição — sem ela, um retry de
  // rede depois de um timeout cria uma segunda cobrança para o mesmo pedido.
  if (init.idempotencyKey) headers['access-token-idempotency'] = init.idempotencyKey;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const text = await res.text();
  const parsed = parseJsonOrRaw(text);

  if (!res.ok) {
    // A mensagem carrega o corpo do erro do gateway, mas nunca o access_token.
    throw new AsaasError(`Asaas ${init.method} ${path} → ${res.status}`, res.status, parsed);
  }
  return parsed as T;
}

/** Corpo do gateway em JSON; se vier outra coisa, preserva o texto cru. */
function parseJsonOrRaw(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// ---------------------------------------------------------------------
// Clientes (pagadores)
// ---------------------------------------------------------------------
export type AsaasCustomer = { id: string };

export async function findOrCreateCustomer(input: {
  name: string;
  cpfCnpj: string;
  mobilePhone?: string;
  email?: string;
  externalReference: string;
}): Promise<AsaasCustomer> {
  const found = await request<{ data?: AsaasCustomer[] }>(
    `/customers?externalReference=${encodeURIComponent(input.externalReference)}`,
    { method: 'GET' },
  );
  const existing = found.data?.[0];
  if (existing) return existing;

  return await request<AsaasCustomer>('/customers', { method: 'POST', body: input });
}

// ---------------------------------------------------------------------
// Cobranças com split
// ---------------------------------------------------------------------
export type AsaasPayment = {
  id: string;
  status: string;
  value: number;
  netValue?: number;
  invoiceUrl?: string;
  dueDate?: string;
};

export type AsaasPixQrCode = {
  encodedImage: string;
  payload: string;
  expirationDate?: string;
};

export async function createPixCharge(input: {
  customerId: string;
  valueCents: number;
  description: string;
  externalReference: string;
  dueDate: string;
  /**
   * Split para a subconta do prestador. `fixedValue` em reais.
   * Se o prestador ainda não tem subconta, `null` → o valor inteiro fica na
   * conta principal e a liquidação para ele vira transferência manual.
   */
  split: { walletId: string; fixedValueCents: number } | null;
  idempotencyKey: string;
}): Promise<AsaasPayment> {
  const { centsToGatewayAmount } = await import('./money.ts');

  const body: Record<string, unknown> = {
    customer: input.customerId,
    billingType: 'PIX',
    value: centsToGatewayAmount(input.valueCents),
    dueDate: input.dueDate,
    description: input.description,
    // É por aqui que o webhook reencontra a nossa linha de payments.
    externalReference: input.externalReference,
  };

  if (input.split) {
    body.split = [
      {
        walletId: input.split.walletId,
        fixedValue: centsToGatewayAmount(input.split.fixedValueCents),
      },
    ];
  }

  return await request<AsaasPayment>('/payments', {
    method: 'POST',
    body,
    idempotencyKey: input.idempotencyKey,
  });
}

export async function getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  return await request<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`, { method: 'GET' });
}

export async function getPayment(paymentId: string): Promise<AsaasPayment> {
  return await request<AsaasPayment>(`/payments/${paymentId}`, { method: 'GET' });
}

// ---------------------------------------------------------------------
// Subcontas (prestadores)
// ---------------------------------------------------------------------
export type AsaasAccount = {
  id: string;
  walletId: string;
  /**
   * O Asaas devolve a API key da subconta UMA ÚNICA VEZ, na criação.
   * Ela não é persistida no Postgres — ver comentário em
   * `pagora.attach_provider_wallet()`. Se o fluxo passar a precisar dela,
   * o destino é o cofre de secrets, nunca uma coluna.
   */
  apiKey?: string;
};

export async function createAccount(input: {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone: string;
  incomeValue: number;
  address?: string;
  addressNumber?: string;
  province?: string;
  postalCode?: string;
}): Promise<AsaasAccount> {
  return await request<AsaasAccount>('/accounts', { method: 'POST', body: input });
}

// ---------------------------------------------------------------------
// Transferências (saques)
// ---------------------------------------------------------------------
export type AsaasTransfer = { id: string; status: string };

export async function createPixTransfer(input: {
  valueCents: number;
  pixAddressKey: string;
  pixAddressKeyType: string;
  description: string;
  idempotencyKey: string;
}): Promise<AsaasTransfer> {
  const { centsToGatewayAmount } = await import('./money.ts');

  return await request<AsaasTransfer>('/transfers', {
    method: 'POST',
    body: {
      value: centsToGatewayAmount(input.valueCents),
      pixAddressKey: input.pixAddressKey,
      pixAddressKeyType: input.pixAddressKeyType,
      description: input.description,
      operationType: 'PIX',
    },
    idempotencyKey: input.idempotencyKey,
  });
}
