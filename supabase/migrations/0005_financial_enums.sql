-- ============================================================================
-- PAGORA — 0005: enums financeiros e ampliação da máquina de estados
-- ============================================================================
-- Esta migration contém APENAS definição de tipos, e existe separada de
-- propósito.
--
-- `ALTER TYPE ... ADD VALUE` não pode ter o novo valor usado na mesma
-- transação em que foi adicionado ("unsafe use of new value of enum type").
-- Como o Supabase roda cada arquivo de migration numa transação, qualquer
-- policy, constraint ou função que mencione 'paid', 'settled' etc. precisa
-- estar num arquivo POSTERIOR a este. Daí a 0006 (RLS) e a 0007 (tabelas)
-- virem depois.
--
-- Nada aqui altera dados existentes: `ADD VALUE ... IF NOT EXISTS` é
-- idempotente e valores de enum só são acrescentados ao fim do domínio.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- order_status — a 0001 tinha 5 estados e nenhum deles distinguia
-- "cliente pagou" de "prestador pode sacar". Sem essa distinção, o marketplace
-- não consegue reter o valor durante a execução do serviço.
--
--   pending_payment → paid → en_route → in_progress → completed → settled
--                                                          ↘ disputed
--   qualquer um → cancelled / expired / refunded (conforme regras da 0008)
-- ---------------------------------------------------------------------------
-- Sem cláusula AFTER: os valores são só acrescentados ao fim do domínio.
-- A ordem interna do enum é irrelevante aqui — a validação de transição é
-- feita por tabela explícita em `pagora.order_status_transitions` (0007),
-- nunca por comparação de ordem (`status > 'paid'`), justamente para que
-- inserir um estado novo no meio do fluxo não mude nenhuma regra existente.
alter type pagora.order_status add value if not exists 'paid';
alter type pagora.order_status add value if not exists 'en_route';
alter type pagora.order_status add value if not exists 'settled';
alter type pagora.order_status add value if not exists 'expired';
alter type pagora.order_status add value if not exists 'refunded';

-- ---------------------------------------------------------------------------
-- payment_status — ciclo de vida da cobrança no gateway
-- ---------------------------------------------------------------------------
do $$ begin
  create type pagora.payment_status as enum (
    'pending',    -- cobrança criada, Pix emitido, aguardando o cliente
    'paid',       -- gateway confirmou o recebimento
    'failed',     -- recusada
    'expired',    -- Pix venceu sem pagamento
    'refunded',   -- estornada integralmente
    'chargeback'  -- contestada depois de liquidada
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- payment_method — hoje só Pix; cartão entra sem alterar o modelo
-- ---------------------------------------------------------------------------
do $$ begin
  create type pagora.payment_method as enum ('pix', 'credit_card', 'boleto');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- withdrawal_status — saque do prestador
-- ---------------------------------------------------------------------------
do $$ begin
  create type pagora.withdrawal_status as enum (
    'requested',   -- saldo já reservado, transferência ainda não enviada
    'processing',  -- enviada ao gateway
    'paid',        -- gateway confirmou
    'failed',      -- devolve o saldo reservado
    'cancelled'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- wallet_tx_kind — tipos de lançamento que faltavam no ledger
-- A 0001 tinha: order_credit, platform_fee, withdrawal, dispute_refund,
-- bonus, adjustment. Faltava representar dinheiro que entrou mas ainda não
-- está liberado, e a devolução de saque que falhou.
-- ---------------------------------------------------------------------------
alter type pagora.wallet_tx_kind add value if not exists 'order_hold';
alter type pagora.wallet_tx_kind add value if not exists 'order_release';
alter type pagora.wallet_tx_kind add value if not exists 'withdrawal_reversal';
alter type pagora.wallet_tx_kind add value if not exists 'chargeback';

-- ---------------------------------------------------------------------------
-- ledger_direction — sinal explícito do lançamento
-- ---------------------------------------------------------------------------
do $$ begin
  create type pagora.ledger_direction as enum ('credit', 'debit');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- payment_gateway — um só por enquanto (Asaas), mas nomeado na linha para que
-- uma troca futura não exija reinterpretar dados históricos.
-- ---------------------------------------------------------------------------
do $$ begin
  create type pagora.payment_gateway as enum ('asaas');
exception when duplicate_object then null; end $$;
