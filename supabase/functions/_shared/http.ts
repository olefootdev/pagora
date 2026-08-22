// =====================================================================
// PAGORA — utilidades HTTP compartilhadas pelas Edge Functions
// =====================================================================
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = (Deno.env.get('PAGORA_ALLOWED_ORIGINS') ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export function corsHeaders(origin: string | null): Record<string, string> {
  // Sem curinga: `*` combinado com credenciais permitiria qualquer página
  // disparar chamadas autenticadas em nome do usuário logado.
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed ?? '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

/**
 * Erro de regra de negócio: vira 4xx e a mensagem chega ao cliente.
 * Qualquer outra exceção vira 500 com mensagem genérica — nunca vazamos
 * stack trace ou detalhe de infraestrutura para o browser.
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

/** Cliente com service_role. Ignora RLS — só para dentro da Edge Function. */
export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes');
  return createClient(url, key, {
    db: { schema: 'pagora' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Valida o JWT do header Authorization e devolve o id do usuário.
 *
 * Este é o ponto onde "quem está pedindo" é decidido. Nenhuma função daqui
 * para baixo aceita um id de usuário vindo do corpo da requisição — se
 * aceitasse, qualquer pessoa poderia pagar, sacar ou concluir em nome de
 * outra apenas trocando um campo no JSON.
 */
export async function requireUser(req: Request): Promise<string> {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new BusinessError('Autenticação obrigatória', 401);
  }
  const token = header.slice('Bearer '.length);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY ausentes');

  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new BusinessError('Sessão inválida ou expirada', 401);
  }
  return data.user.id;
}

/** Comparação em tempo constante — evita descobrir o token byte a byte. */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  // O XOR do comprimento entra no acumulador para que tamanhos diferentes
  // também percorram o laço inteiro.
  let diff = bufA.length ^ bufB.length;
  const len = Math.max(bufA.length, bufB.length);
  for (let i = 0; i < len; i++) {
    diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Log estruturado. A lista de chaves proibidas existe porque o jeito mais
 * comum de vazar credencial é `console.log(payload)` num dia de plantão.
 */
const FORBIDDEN_LOG_KEYS = new Set([
  'apikey',
  'api_key',
  'access_token',
  'accesstoken',
  'authorization',
  'service_role_key',
  'password',
  'secret',
  'token',
  'pix_qr_code',
  'encodedimage',
]);

export function logEvent(event: string, fields: Record<string, unknown> = {}): void {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    safe[k] = FORBIDDEN_LOG_KEYS.has(k.toLowerCase()) ? '[redacted]' : v;
  }
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...safe }));
}

export async function handle(
  req: Request,
  fn: (req: Request, origin: string | null) => Promise<Response>,
): Promise<Response> {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }
  try {
    return await fn(req, origin);
  } catch (e) {
    if (e instanceof BusinessError) {
      logEvent('business_error', { message: e.message, status: e.status });
      return json({ error: e.message }, e.status, origin);
    }
    logEvent('unhandled_error', { message: e instanceof Error ? e.message : String(e) });
    return json({ error: 'Erro interno. Tente novamente.' }, 500, origin);
  }
}
