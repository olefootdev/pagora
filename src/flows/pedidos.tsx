// =====================================================================
// PAGORA — Meus pedidos (cliente)
// =====================================================================
// Uma lista só. Hoje o mesmo conteúdo mora em duas telas: `history-list`, que
// é maquete e está no menu, e `meus-pedidos`, que fala com o banco e só é
// alcançável por um botão dentro da maquete. Quem chega pelo menu vê dados
// que não são dele.
//
// Esta junta as duas e organiza pelo que o usuário precisa fazer, não pela
// tabela de origem: primeiro o que exige ação dele, depois o que está
// andando, por último o histórico.
// =====================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  Body,
  Button,
  Card,
  Chip,
  Empty,
  ErrorNote,
  Num,
  Screen,
  ScreenHead,
  SectionTitle,
  Skeleton,
  Stack,
} from '../ui/kit';
import { ClientNav } from '../ui/area';
import { Icon } from '../icons';
import { formatCents } from '../domains/money';
import { orderCode } from '../domains/orders/order-code';
import { track } from '../lib/analytics';
import { listMyRequests } from '../domains/orders/request.service';
import { findRepeatable, repeatLabel } from '../domains/orders/repeat';
import { listMyOrders } from '../domains/orders/order.service';
import { isTerminal, ORDER_STATUS_LABELS } from '../domains/orders/order.status';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';
import { loadErrorMessage, withTimeout } from '../lib/timeout';
import type { GoFn } from '../types';
import type { Tables } from '../lib/database.types';

const SERVICE_LABEL: Record<string, string> = {
  frete: 'Frete',
  guincho: 'Guincho',
  cacamba: 'Caçamba',
};

/** Quantas propostas cada pedido já recebeu — o número que decide o toque. */
async function countQuotesByRequest(requestIds: string[]): Promise<Map<string, number>> {
  if (requestIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('quotes')
    .select('request_id')
    .in('request_id', requestIds)
    .in('status', ['pending', 'sent']);

  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.request_id, (counts.get(row.request_id) ?? 0) + 1);
  }
  return counts;
}

export const Pedidos = ({ go }: { go: GoFn }) => {
  const { user, loading: sessionLoading } = useSession();
  const [requests, setRequests] = useState<Tables<'service_requests'>[]>([]);
  const [orders, setOrders] = useState<Tables<'orders'>[]>([]);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  // `loaded` marca que a busca terminou; `loading` é derivado dele e da
  // sessão. Guardar `loading` em estado obrigava a chamar setState dentro do
  // efeito para o caso "sem sessão" — render em cascata para dizer que não há
  // nada a carregar.
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading = sessionLoading || (user != null && !loaded);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [reqs, ords] = await withTimeout(
        Promise.all([listMyRequests(user.id), listMyOrders('client', user.id)]),
      );
      const open = reqs.filter((r) => r.status === 'open' || r.status === 'quoting');
      setRequests(reqs);
      setOrders(ords);
      setCounts(await withTimeout(countQuotesByRequest(open.map((r) => r.id))));
      setError(null);
    } catch (e) {
      setError(loadErrorMessage(e));
    } finally {
      setLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    if (sessionLoading || !user) return;
    // `load` é assíncrona: todo setState dela acontece DEPOIS do await, não
    // no corpo do efeito. A regra não modela a fronteira do await e marca a
    // chamada mesmo assim — mesma exceção já usada em hooks/useProfile.ts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user, sessionLoading, load]);

  if (!sessionLoading && !user) {
    return (
      <Screen label="Meus pedidos">
        <ScreenHead title="Pedidos" />
        <Body>
          <Empty
            icon="user"
            title="Entre para ver seus pedidos"
            sub="Seus pedidos ficam ligados à sua conta, com as propostas recebidas."
            action={
              <Button variant="primary" onClick={() => go('login')}>
                Entrar
              </Button>
            }
          />
        </Body>
        <ClientNav active="pedidos" go={go} />
      </Screen>
    );
  }

  const aguardando = requests.filter((r) => r.status === 'open' || r.status === 'quoting');
  // Derivado do que já foi carregado: nenhuma consulta extra para oferecer
  // a recompra.
  const repetir = findRepeatable(requests);
  const andando = orders.filter((o) => !isTerminal(o.status));
  const historico = orders.filter((o) => isTerminal(o.status));

  const vazio =
    !loading && aguardando.length === 0 && andando.length === 0 && historico.length === 0;

  return (
    <Screen label="Meus pedidos">
      <ScreenHead title="Pedidos" sticky />
      <Body>
        {error && <ErrorNote message={error} onRetry={() => void load()} />}

        {loading ? (
          <Skeleton count={3} height={92} />
        ) : vazio ? (
          <Empty
            icon="package"
            title="Nenhum pedido ainda"
            sub="Quando você pedir um transporte, ele aparece aqui com as propostas recebidas."
            action={
              <Button variant="primary" onClick={() => go('inicio')}>
                Pedir um transporte
              </Button>
            }
          />
        ) : (
          <>
            {repetir && (
              <button
                className="px-repeat"
                onClick={() => {
                  track('pedido_repetido', { need: repetir.need, from: repetir.from.id });
                  go(`pedido/${repetir.need}`, { repeatFrom: repetir.state });
                }}
              >
                <span className="px-repeat-art" aria-hidden="true">
                  <Icon name="refresh" size={20} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="px-repeat-t">Pedir de novo</span>
                  <span className="px-repeat-s">{repeatLabel(repetir.from)}</span>
                </span>
                <Icon
                  name="arrow-right"
                  size={18}
                  style={{ color: 'var(--x-action)', flexShrink: 0 }}
                />
              </button>
            )}

            {andando.length > 0 && (
              <section className="px-stack">
                <SectionTitle>Em andamento</SectionTitle>
                <Stack gap="tight">
                  {andando.map((o) => (
                    <button key={o.id} className="px-opt" onClick={() => go(`acompanhar/${o.id}`)}>
                      <span className="px-opt-art" aria-hidden="true">
                        <Icon name="truck" size={20} />
                      </span>
                      <span className="px-opt-text">
                        <span className="px-opt-t">{ORDER_STATUS_LABELS[o.status]}</span>
                        <span className="px-opt-s">
                          {orderCode(o.id)} · {formatCents(o.price_cents)}
                        </span>
                      </span>
                      <span className="px-opt-end">
                        <Icon name="arrow-right" size={18} />
                      </span>
                    </button>
                  ))}
                </Stack>
              </section>
            )}

            {aguardando.length > 0 && (
              <section className="px-stack">
                <SectionTitle>Aguardando propostas</SectionTitle>
                <Stack gap="tight">
                  {aguardando.map((r) => {
                    const n = counts.get(r.id) ?? 0;
                    return (
                      <Card
                        key={r.id}
                        tone={n > 0 ? 'action' : 'default'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => go(`escolher/${r.id}`)}
                      >
                        <div className="px-row px-row--between" style={{ marginBottom: 10 }}>
                          <span className="px-eyebrow">
                            {SERVICE_LABEL[r.service] ?? r.service}
                            {r.origin_city ? ` · ${r.origin_city}` : ''}
                          </span>
                          {n > 0 ? (
                            <Chip tone="on">{n === 1 ? '1 proposta' : `${n} propostas`}</Chip>
                          ) : (
                            <Chip>procurando</Chip>
                          )}
                        </div>

                        {r.estimate_low_cents != null ? (
                          <Num
                            size="sm"
                            value={`${formatCents(r.estimate_low_cents)} a ${formatCents(
                              r.estimate_high_cents ?? r.estimate_low_cents,
                            )}`}
                            unit="estimativa — o valor final é o da proposta aceita"
                          />
                        ) : (
                          <div className="px-opt-t">Publicado, aguardando propostas</div>
                        )}

                        <Button
                          variant={n > 0 ? 'primary' : 'outline'}
                          block
                          size="sm"
                          style={{ marginTop: 14 }}
                          icon="arrow-right"
                        >
                          {n > 0 ? 'Ver e escolher' : 'Acompanhar'}
                        </Button>
                      </Card>
                    );
                  })}
                </Stack>
              </section>
            )}

            {historico.length > 0 && (
              <section className="px-stack">
                <SectionTitle>Histórico</SectionTitle>
                <Stack gap="tight">
                  {historico.map((o) => (
                    <Card key={o.id}>
                      <div className="px-row" style={{ gap: 12 }}>
                        <span className="px-opt-art" aria-hidden="true">
                          <Icon
                            name={o.status === 'settled' ? 'check-circle' : 'close'}
                            size={20}
                          />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="px-opt-t">{ORDER_STATUS_LABELS[o.status]}</span>
                          <span className="px-opt-s">
                            {orderCode(o.id)} · {formatCents(o.price_cents)}
                          </span>
                        </span>
                      </div>

                      {/* Concluído tem duas ações e nenhuma delas é "voltar
                          ao acompanhamento": dar a nota e guardar o
                          comprovante. */}
                      {o.status === 'settled' ? (
                        <div className="px-row" style={{ gap: 8, marginTop: 12 }}>
                          <Button
                            variant="primary"
                            block
                            iconStart="star"
                            onClick={() => go(`avaliar/${o.id}`)}
                          >
                            Avaliar
                          </Button>
                          <Button
                            variant="outline"
                            block
                            iconStart="doc"
                            onClick={() => go(`comprovante/${o.id}`)}
                          >
                            Comprovante
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          block
                          style={{ marginTop: 12 }}
                          onClick={() => go(`acompanhar/${o.id}`)}
                        >
                          Ver detalhes
                        </Button>
                      )}
                    </Card>
                  ))}
                </Stack>
              </section>
            )}
          </>
        )}
      </Body>

      <ClientNav active="pedidos" go={go} />
    </Screen>
  );
};
