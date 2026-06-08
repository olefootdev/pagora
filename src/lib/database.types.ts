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
  | 'in_progress'
  | 'completed'
  | 'cancelled'
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
  | 'adjustment';

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
  balance_cents: number;
  pending_cents: number;
  withdrawn_total_cents: number;
  updated_at: string;
};
type WalletInsert = Partial<WalletRow> & { provider_id: string };
type WalletUpdate = Partial<WalletRow>;

type WalletTransactionRow = {
  id: string;
  provider_id: string;
  kind: WalletTxKind;
  amount_cents: number;
  balance_after_cents: number;
  order_id: string | null;
  description: string | null;
  metadata: Json | null;
  created_at: string;
};
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
    };
    Views: Record<string, never>;
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
    };
    Enums: {
      user_role: UserRole;
      service_type: ServiceType;
      request_status: RequestStatus;
      quote_status: QuoteStatus;
      order_status: OrderStatus;
      dispute_status: DisputeStatus;
      wallet_tx_kind: WalletTxKind;
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
