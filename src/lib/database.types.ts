// Tipos do schema `pagora` no Supabase. Hand-crafted aqui porque o gerador
// automático do MCP só enxerga schemas expostos no PostgREST.
// Depois que `pagora` for adicionado em Settings → API → "Exposed schemas",
// regenerar via `supabase gen types typescript --schema pagora` e validar.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ---------------------------------------------------------------------------
// Enums (espelho exato dos enums Postgres)
// ---------------------------------------------------------------------------
export type UserRole = 'client' | 'provider' | 'admin';
export type ServiceType = 'frete' | 'guincho' | 'cacamba';
export type RequestStatus = 'open' | 'quoting' | 'accepted' | 'cancelled' | 'expired';
export type QuoteStatus = 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';
export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'settled'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'disputed';
export type DisputeStatus =
  | 'open'
  | 'responded'
  | 'resolved_client'
  | 'resolved_provider'
  | 'resolved_split';
export type WalletTxKind =
  | 'order_credit'
  | 'platform_fee'
  | 'withdrawal'
  | 'dispute_refund'
  | 'bonus'
  | 'adjustment'
  | 'order_hold'
  | 'order_release'
  | 'withdrawal_reversal'
  | 'chargeback';

// Enums financeiros (migration 0005_financial_enums.sql)
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded' | 'chargeback';
export type PaymentMethod = 'pix' | 'credit_card' | 'boleto';
export type PaymentGateway = 'asaas';
export type WithdrawalStatus = 'requested' | 'processing' | 'paid' | 'failed' | 'cancelled';
export type LedgerDirection = 'credit' | 'debit';

/** Em qual bolso do prestador o lançamento mexe (migration 0007). */
export type LedgerBucket = 'available' | 'pending';

// ---------------------------------------------------------------------------
// Row / Insert / Update por tabela
// ---------------------------------------------------------------------------
type ProfileRow = {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  onboarded_at: string | null;
  blocked_at: string | null;
  created_at: string;
  updated_at: string;
};
type ProfileInsert = Partial<ProfileRow> & { id: string };
type ProfileUpdate = Partial<ProfileRow>;

type ProviderRow = {
  profile_id: string;
  display_name: string;
  bio: string | null;
  cnh_number: string | null;
  cnh_category: string | null;
  cnh_verified_at: string | null;
  services: ServiceType[];
  vehicle_type: string | null;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_color: string | null;
  capacity_kg: number | null;
  service_areas: string[] | null;
  pix_key: string | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  selfie_url: string | null;
  doc_url: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  created_at: string;
  updated_at: string;
};
type ProviderInsert = Partial<ProviderRow> & {
  profile_id: string;
  display_name: string;
  services: ServiceType[];
};
type ProviderUpdate = Partial<ProviderRow>;

type ServiceRequestRow = {
  id: string;
  client_id: string;
  service: ServiceType;
  status: RequestStatus;
  payload: Json;
  origin_city: string | null;
  origin_state: string | null;
  dest_city: string | null;
  dest_state: string | null;
  scheduled_for: string | null;
  estimate_low_cents: number | null;
  estimate_high_cents: number | null;
  estimate_breakdown: Json | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};
type ServiceRequestInsert = Partial<ServiceRequestRow> & {
  client_id: string;
  service: ServiceType;
};
type ServiceRequestUpdate = Partial<ServiceRequestRow>;

type QuoteRow = {
  id: string;
  request_id: string;
  provider_id: string;
  status: QuoteStatus;
  price_cents: number;
  eta_minutes: number | null;
  notes: string | null;
  includes: string[] | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};
type QuoteInsert = Partial<QuoteRow> & {
  request_id: string;
  provider_id: string;
  price_cents: number;
};
type QuoteUpdate = Partial<QuoteRow>;

type OrderRow = {
  id: string;
  quote_id: string;
  request_id: string;
  client_id: string;
  provider_id: string;
  status: OrderStatus;
  price_cents: number;
  platform_fee_cents: number;
  provider_amount_cents: number;
  gateway_fee_cents: number;
  paid_at: string | null;
  settled_at: string | null;
  refunded_at: string | null;
  client_confirmed_at: string | null;
  pickup_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};
type OrderInsert = Partial<OrderRow> & {
  quote_id: string;
  request_id: string;
  client_id: string;
  provider_id: string;
  price_cents: number;
};
type OrderUpdate = Partial<OrderRow>;

type MessageRow = {
  id: string;
  order_id: string;
  sender_id: string;
  body: string;
  /** Preenchido pelo DESTINATÁRIO. O autor não consegue marcar a própria. */
  read_at: string | null;
  created_at: string;
};
/** `read_at` é a única coluna com `grant update` — ver 0010. */
type MessageUpdate = { read_at?: string | null };
type MessageInsert = {
  order_id: string;
  /** Amarrado a auth.uid() pelo with check da policy; mandar outro id falha. */
  sender_id: string;
  body: string;
};

type ReviewRow = {
  id: string;
  order_id: string;
  client_id: string;
  provider_id: string;
  stars: number;
  comment: string | null;
  tags: string[] | null;
  created_at: string;
};
type ReviewInsert = Partial<ReviewRow> & {
  order_id: string;
  client_id: string;
  provider_id: string;
  stars: number;
};
type ReviewUpdate = Partial<ReviewRow>;

type WalletRow = {
  provider_id: string;
  /** Saldo LIBERADO — o que pode virar saque. */
  balance_cents: number;
  /** Recebido do cliente e ainda retido até o serviço ser confirmado. */
  pending_cents: number;
  withdrawn_total_cents: number;
  gateway: PaymentGateway;
  gateway_wallet_id: string | null;
  gateway_account_id: string | null;
  total_received_cents: number;
  currency: string;
  status: 'active' | 'blocked' | 'closed';
  created_at: string;
  updated_at: string;
};
type WalletInsert = Partial<WalletRow> & { provider_id: string };
type WalletUpdate = Partial<WalletRow>;

type WalletTransactionRow = {
  id: string;
  provider_id: string;
  kind: WalletTxKind;
  bucket: LedgerBucket;
  direction: LedgerDirection;
  amount_cents: number;
  balance_before_cents: number;
  balance_after_cents: number;
  order_id: string | null;
  payment_id: string | null;
  withdrawal_id: string | null;
  gateway_reference: string | null;
  description: string | null;
  metadata: Json | null;
  created_at: string;
};

// --- Financeiro (migration 0007_financial_schema.sql) -----------------------
type PaymentRow = {
  id: string;
  order_id: string;
  client_id: string;
  provider_id: string;
  gateway: PaymentGateway;
  gateway_payment_id: string | null;
  gateway_customer_id: string | null;
  amount_cents: number;
  platform_fee_cents: number;
  gateway_fee_cents: number;
  provider_amount_cents: number;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  pix_payload: string | null;
  pix_qr_code: string | null;
  invoice_url: string | null;
  expires_at: string | null;
  paid_at: string | null;
  failed_at: string | null;
  refunded_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

type WithdrawalRow = {
  id: string;
  provider_id: string;
  amount_cents: number;
  gateway: PaymentGateway;
  gateway_transfer_id: string | null;
  status: WithdrawalStatus;
  pix_key: string | null;
  requested_at: string;
  processed_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
};

type PaymentEventRow = {
  id: string;
  payment_id: string | null;
  withdrawal_id: string | null;
  gateway: PaymentGateway;
  gateway_event_id: string;
  event_type: string;
  payload: Json;
  processed_at: string | null;
  process_error: string | null;
  created_at: string;
};

type OrderStatusTransitionRow = {
  from_status: OrderStatus;
  to_status: OrderStatus;
  note: string | null;
};

type ProviderReviewPublicRow = {
  id: string;
  provider_id: string;
  stars: number;
  comment: string | null;
  tags: string[] | null;
  created_at: string;
};

// `payments`, `withdrawals` e `order_status_transitions` são somente-leitura
// pelo browser: a RLS da 0007 não tem policy de escrita e não existe GRANT.
// `never` deixa isso visível no compilador, não só em runtime.
type ReadOnlyWrite = never;
type WalletTransactionInsert = Partial<WalletTransactionRow> & {
  provider_id: string;
  kind: WalletTxKind;
  amount_cents: number;
  balance_after_cents: number;
};
type WalletTransactionUpdate = Partial<WalletTransactionRow>;

type DisputeRow = {
  id: string;
  order_id: string;
  opened_by: string;
  status: DisputeStatus;
  client_reason: string;
  client_evidence_urls: string[] | null;
  provider_response: string | null;
  provider_evidence_urls: string[] | null;
  responded_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  refund_cents: number | null;
  penalty_cents: number | null;
  sla_due_at: string;
  created_at: string;
  updated_at: string;
};
type DisputeInsert = Partial<DisputeRow> & {
  order_id: string;
  opened_by: string;
  client_reason: string;
};
type DisputeUpdate = Partial<DisputeRow>;

type ProviderApplicationRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  services: ServiceType[];
  vehicle: string | null;
  regions: string;
  source: string;
  utm_campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  decision: 'approved' | 'rejected' | null;
  decision_notes: string | null;
  created_at: string;
};
type ProviderApplicationInsert = {
  full_name: string;
  phone: string;
  services: ServiceType[];
  regions: string;
  email?: string | null;
  vehicle?: string | null;
  source?: string;
  utm_campaign?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  user_agent?: string | null;
};
type ProviderApplicationUpdate = Partial<ProviderApplicationRow>;

type WaitlistRow = {
  id: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  cep: string | null;
  services: ServiceType[] | null;
  source: string;
  utm_campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  created_at: string;
};
type WaitlistInsert = {
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  cep?: string | null;
  services?: ServiceType[] | null;
  source?: string;
  utm_campaign?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  user_agent?: string | null;
};
type WaitlistUpdate = Partial<WaitlistRow>;

// ---------------------------------------------------------------------------
// Database — formato esperado pelo SupabaseClient<Database>
// ---------------------------------------------------------------------------
// postgrest-js (>=2) exige Relationships: [] em cada tabela pra inferir Insert/Update.
// Sem isso o .from() degrada pro overload genérico que retorna never[].
type Rel = { Relationships: [] };

export type Database = {
  pagora: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: ProfileInsert; Update: ProfileUpdate } & Rel;
      providers: { Row: ProviderRow; Insert: ProviderInsert; Update: ProviderUpdate } & Rel;
      service_requests: {
        Row: ServiceRequestRow;
        Insert: ServiceRequestInsert;
        Update: ServiceRequestUpdate;
      } & Rel;
      quotes: { Row: QuoteRow; Insert: QuoteInsert; Update: QuoteUpdate } & Rel;
      orders: { Row: OrderRow; Insert: OrderInsert; Update: OrderUpdate } & Rel;
      reviews: { Row: ReviewRow; Insert: ReviewInsert; Update: ReviewUpdate } & Rel;
      messages: { Row: MessageRow; Insert: MessageInsert; Update: MessageUpdate } & Rel;
      // `message_blocks` é material de moderação: a 0010 revoga select de
      // authenticated, então o cliente não a enxerga e ela não entra aqui.
      wallets: { Row: WalletRow; Insert: WalletInsert; Update: WalletUpdate } & Rel;
      wallet_transactions: {
        Row: WalletTransactionRow;
        Insert: WalletTransactionInsert;
        Update: WalletTransactionUpdate;
      } & Rel;
      disputes: { Row: DisputeRow; Insert: DisputeInsert; Update: DisputeUpdate } & Rel;
      waitlist: { Row: WaitlistRow; Insert: WaitlistInsert; Update: WaitlistUpdate } & Rel;
      provider_applications: {
        Row: ProviderApplicationRow;
        Insert: ProviderApplicationInsert;
        Update: ProviderApplicationUpdate;
      } & Rel;
      payments: { Row: PaymentRow; Insert: ReadOnlyWrite; Update: ReadOnlyWrite } & Rel;
      withdrawals: { Row: WithdrawalRow; Insert: ReadOnlyWrite; Update: ReadOnlyWrite } & Rel;
      // Leitura restrita a admin pela policy `payment_events_admin_only`.
      payment_events: { Row: PaymentEventRow; Insert: ReadOnlyWrite; Update: ReadOnlyWrite } & Rel;
      order_status_transitions: {
        Row: OrderStatusTransitionRow;
        Insert: ReadOnlyWrite;
        Update: ReadOnlyWrite;
      } & Rel;
    };
    Views: {
      provider_reviews_public: { Row: ProviderReviewPublicRow } & Rel;
    };
    Functions: {
      ensure_profile: { Args: Record<string, never>; Returns: ProfileRow };
      become_provider: {
        Args: {
          p_display_name: string;
          p_services: ServiceType[];
          p_vehicle_type?: string | null;
          p_service_areas?: string[];
        };
        Returns: ProviderRow;
      };
      accept_quote: { Args: { p_quote_id: string }; Returns: OrderRow };
      current_user_role: { Args: Record<string, never>; Returns: UserRole };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_provider: { Args: Record<string, never>; Returns: boolean };
      // As funções abaixo são as ÚNICAS expostas ao browser entre as da 0008.
      // Todas as que movem dinheiro (prepare_payment, confirm_payment,
      // post_ledger_entry, request_withdrawal, settle_order, refund_order…)
      // são `grant execute ... to service_role` e por isso não aparecem aqui:
      // se alguém tentar chamá-las do frontend, o TypeScript recusa antes de o
      // Postgres recusar.
      respond_dispute: {
        Args: { p_dispute_id: string; p_response: string; p_evidence?: string[] };
        Returns: DisputeRow;
      };
      compute_amounts: {
        Args: { p_gross_cents: number };
        Returns: { platform_fee_cents: number; provider_amount_cents: number }[];
      };
      order_financial_trail: { Args: { p_order_id: string }; Returns: Json };
      // Ações administrativas — protegidas por pagora.is_admin() dentro da
      // própria função, não por policy (a 0006 removeu as policies amplas).
      approve_provider: {
        Args: { p_provider_id: string; p_approve: boolean; p_reason?: string | null };
        Returns: ProviderRow;
      };
      set_profile_blocked: {
        Args: { p_profile_id: string; p_blocked: boolean };
        Returns: ProfileRow;
      };
      resolve_dispute: {
        Args: { p_dispute_id: string; p_resolution: DisputeStatus; p_notes?: string | null };
        Returns: DisputeRow;
      };
      audit_wallet_integrity: {
        Args: Record<string, never>;
        Returns: {
          provider_id: string;
          bucket: LedgerBucket;
          wallet_cents: number;
          ledger_cents: number;
        }[];
      };
      platform_fee_bps: { Args: Record<string, never>; Returns: number };
    };
    Enums: {
      user_role: UserRole;
      service_type: ServiceType;
      request_status: RequestStatus;
      quote_status: QuoteStatus;
      order_status: OrderStatus;
      dispute_status: DisputeStatus;
      wallet_tx_kind: WalletTxKind;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      payment_gateway: PaymentGateway;
      withdrawal_status: WithdrawalStatus;
      ledger_direction: LedgerDirection;
    };
  };
};

// Helper types — facilitam usar nas telas
export type Tables<T extends keyof Database['pagora']['Tables']> =
  Database['pagora']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['pagora']['Tables']> =
  Database['pagora']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['pagora']['Tables']> =
  Database['pagora']['Tables'][T]['Update'];
