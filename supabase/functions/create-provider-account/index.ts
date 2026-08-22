// =====================================================================
// PAGORA — create-provider-account
// =====================================================================
// Onboarding financeiro do prestador: cria a subconta no Asaas e guarda o
// vínculo. É o que torna o split possível — sem `walletId`, a cobrança do
// cliente até funciona, mas o valor inteiro cai na conta da PAGORA e a
// liquidação vira transferência manual.
//
// SOBRE A API KEY DA SUBCONTA: o Asaas devolve `apiKey` uma única vez, na
// criação. Ela NÃO é gravada no Postgres. Uma credencial em coluna é uma
// credencial a uma policy mal escrita de distância de vazar, e o fluxo atual
// (cobrança com split + transferência pela conta principal) não precisa dela.
// Se um fluxo futuro precisar, o destino é o cofre de secrets — não uma tabela.
// =====================================================================
import {
  BusinessError,
  adminClient,
  handle,
  json,
  logEvent,
  requireUser,
} from '../_shared/http.ts';
import { AsaasError, createAccount } from '../_shared/asaas.ts';

Deno.serve((req) =>
  handle(req, async (req, origin) => {
    if (req.method !== 'POST') throw new BusinessError('Método não suportado', 405);

    const userId = await requireUser(req);
    const db = adminClient();

    const { data: provider } = await db
      .from('providers')
      .select('profile_id, display_name, approved_at')
      .eq('profile_id', userId)
      .maybeSingle();

    if (!provider) throw new BusinessError('Você não é um prestador cadastrado', 403);
    if (!provider.approved_at) {
      throw new BusinessError('Aguarde a aprovação do cadastro para habilitar recebimentos', 403);
    }

    // Já vinculado: no-op idempotente.
    const { data: wallet } = await db
      .from('wallets')
      .select('provider_id, gateway_wallet_id')
      .eq('provider_id', userId)
      .maybeSingle();

    if (wallet?.gateway_wallet_id) {
      return json({ walletId: wallet.gateway_wallet_id, created: false }, 200, origin);
    }

    const { data: profile } = await db
      .from('profiles')
      .select('full_name, cpf, phone, email')
      .eq('id', userId)
      .single();

    const missing = ['cpf', 'phone'].filter((f) => !profile?.[f as 'cpf' | 'phone']);
    if (missing.length) {
      throw new BusinessError(`Complete o cadastro antes: faltam ${missing.join(', ')}`, 422);
    }

    const body = (await req.json().catch(() => ({}))) as {
      incomeValue?: number;
      postalCode?: string;
      address?: string;
      addressNumber?: string;
      province?: string;
    };

    try {
      const account = await createAccount({
        name: provider.display_name ?? profile!.full_name ?? 'Prestador PAGORA',
        email: profile!.email ?? `${userId}@prestador.pagora.local`,
        cpfCnpj: profile!.cpf!,
        mobilePhone: profile!.phone!,
        // Renda declarada é exigência de KYC do gateway.
        incomeValue: body.incomeValue ?? 2000,
        postalCode: body.postalCode ?? undefined,
        address: body.address ?? undefined,
        addressNumber: body.addressNumber ?? undefined,
        province: body.province ?? undefined,
      });

      // Grava só os identificadores. `account.apiKey` morre com o escopo desta
      // função — nunca é logado nem retornado.
      const { error } = await db.rpc('attach_provider_wallet', {
        p_provider_id: userId,
        p_wallet_id: account.walletId,
        p_account_id: account.id,
      });
      if (error) throw new Error(error.message);

      logEvent('provider_account_created', { provider_id: userId, account_id: account.id });

      return json({ walletId: account.walletId, created: true }, 201, origin);
    } catch (e) {
      if (e instanceof AsaasError) {
        logEvent('provider_account_gateway_error', { provider_id: userId, status: e.status });
        throw new BusinessError(
          'O gateway recusou o cadastro. Confira CPF, telefone e endereço.',
          422,
        );
      }
      throw e;
    }
  }),
);
