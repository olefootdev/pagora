// =====================================================================
// PAGORA — Avisos
// =====================================================================
// A ponta que faltava do loop. O prestador não sabia que chegou pedido; o
// cliente não sabia que chegou proposta. Sem isso o marketplace dependia das
// duas pontas recarregarem a tela — e quem recarrega uma tela que nunca muda
// para de recarregar.
//
// Nada aqui depende de migration: o realtime de `service_requests`, `quotes` e
// `orders` está ligado desde a 0002, e os avisos são DERIVADOS dessas linhas
// (ver `domains/notifications/feed.ts`).
//
// O que ainda falta, e não é banco: avisar quem está com o app fechado. Isso é
// push ou WhatsApp — infraestrutura externa, outra conversa.
// =====================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  Body,
  Button,
  Card,
  Chip,
  Empty,
  ErrorNote,
  Screen,
  ScreenHead,
  Skeleton,
  Stack,
  cx,
} from '../ui/kit';
import { ClientNav } from '../ui/area';
import { Icon } from '../icons';
import { supabase } from '../lib/supabase';
import {
  buildClientFeed,
  countUnseen,
  readLastSeen,
  writeLastSeen,
  type Notice,
} from '../domains/notifications/feed';
import { listMyRequests } from '../domains/orders/request.service';
import { listMyOrders } from '../domains/orders/order.service';
import { useSession } from '../hooks/useSession';
import { loadErrorMessage, withTimeout } from '../lib/timeout';
import type { GoFn } from '../types';
import type { Tables } from '../lib/database.types';

// =====================================================================
// CARGA
// =====================================================================

async function loadClientNotices(userId: string): Promise<Notice[]> {
  const [requests, orders] = await Promise.all([
    listMyRequests(userId),
    listMyOrders('client', userId),
  ]);

  const abertos = requests.filter((r) => r.status === 'open' || r.status === 'quoting');

  let quotesByRequest = new Map<string, Tables<'quotes'>[]>();
  if (abertos.length > 0) {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .in(
        'request_id',
        abertos.map((r) => r.id),
      )
      .in('status', ['pending', 'sent']);
    if (error) throw error;

    quotesByRequest = (data ?? []).reduce((map, q) => {
      const list = map.get(q.request_id) ?? [];
      list.push(q);
      map.set(q.request_id, list);
      return map;
    }, new Map<string, Tables<'quotes'>[]>());
  }

  return buildClientFeed({ requests: abertos, orders, quotesByRequest });
}

// =====================================================================
// HOOK — usado pela tela e pelo selo da barra
// =====================================================================

export function useNotices(userId: string | undefined) {
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setNotices(await withTimeout(loadClientNotices(userId)));
      setError(null);
    } catch (e) {
      setError(loadErrorMessage(e));
      setNotices([]);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    // `load` é assíncrona: todo setState dela acontece DEPOIS do await, não
    // no corpo do efeito. A regra não modela a fronteira do await e marca a
    // chamada mesmo assim — mesma exceção já usada em hooks/useProfile.ts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [userId, load]);

  // Um canal para as duas tabelas que geram aviso. Quotes cobre "chegou
  // proposta"; orders cobre "mudou o estado do seu transporte".
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`avisos-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'pagora', table: 'quotes' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'pagora', table: 'orders' }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const unseen = userId && notices ? countUnseen(notices, readLastSeen(userId)) : 0;

  return { notices, error, unseen, reload: load };
}

// =====================================================================
// TELA
// =====================================================================

export const Avisos = ({ go }: { go: GoFn }) => {
  const { user, loading: sessionLoading } = useSession();
  const { notices, error, reload } = useNotices(user?.id);

  // Abrir a tela é o ato de "ver". Marcar no fechamento faria o selo continuar
  // aceso enquanto o usuário lê a lista.
  useEffect(() => {
    if (!user || !notices || notices.length === 0) return;
    const newest = notices[0]?.at;
    if (newest) writeLastSeen(user.id, newest);
  }, [user, notices]);

  if (!sessionLoading && !user) {
    return (
      <Screen label="Avisos">
        <ScreenHead title="Avisos" />
        <Body>
          <Empty
            icon="bell"
            title="Entre para receber avisos"
            sub="Avisamos quando chegar proposta e quando seu transporte mudar de estado."
            action={
              <Button variant="primary" onClick={() => go('login')}>
                Entrar
              </Button>
            }
          />
        </Body>
        <ClientNav active="avisos" go={go} />
      </Screen>
    );
  }

  const acao = (notices ?? []).filter((n) => n.actionable);
  const resto = (notices ?? []).filter((n) => !n.actionable);

  return (
    <Screen label="Avisos">
      <ScreenHead title="Avisos" sticky />
      <Body>
        {error && <ErrorNote message={error} onRetry={() => void reload()} />}

        {notices === null ? (
          <Skeleton count={3} height={84} />
        ) : notices.length === 0 ? (
          <Empty
            icon="bell"
            title="Nenhum aviso por aqui"
            sub="Quando chegar proposta ou seu transporte mudar de estado, aparece aqui — sem precisar atualizar."
            action={
              <Button variant="outline" onClick={() => go('inicio')}>
                Pedir um transporte
              </Button>
            }
          />
        ) : (
          <>
            {acao.length > 0 && (
              <section className="px-stack">
                <div className="px-row px-row--between">
                  <h2 className="px-sectitle">Precisa de você</h2>
                  <Chip tone="urgent">{acao.length}</Chip>
                </div>
                <Stack gap="tight">
                  {acao.map((n) => (
                    <NoticeRow key={n.id} notice={n} go={go} />
                  ))}
                </Stack>
              </section>
            )}

            {resto.length > 0 && (
              <section className="px-stack">
                <h2 className="px-sectitle">Acompanhamento</h2>
                <Stack gap="tight">
                  {resto.map((n) => (
                    <NoticeRow key={n.id} notice={n} go={go} />
                  ))}
                </Stack>
              </section>
            )}

            <Card>
              <div className="px-row px-row--top">
                <Icon name="info" size={19} style={{ color: 'var(--x-info)', flexShrink: 0 }} />
                <p className="px-opt-s" style={{ marginTop: 0 }}>
                  Estes avisos chegam enquanto o Pagora está aberto. Aviso com o aplicativo fechado
                  ainda não existe — estamos trabalhando nisso.
                </p>
              </div>
            </Card>
          </>
        )}
      </Body>

      <ClientNav active="avisos" go={go} />
    </Screen>
  );
};

/** A linha de um aviso. Compartilhada com a aba de avisos do transportador —
 *  é o mesmo objeto `Notice` dos dois lados. */
export const NoticeRow = ({ notice, go }: { notice: Notice; go: GoFn }) => (
  <button className={cx('px-opt', notice.actionable && 'is-on')} onClick={() => go(notice.route)}>
    <span className="px-opt-art" aria-hidden="true">
      <Icon name={notice.icon} size={20} />
    </span>
    <span className="px-opt-text">
      <span className="px-opt-t">{notice.title}</span>
      <span className="px-opt-s">{notice.body}</span>
      <span className="px-opt-s" style={{ marginTop: 4 }}>
        {relativeTime(notice.at)}
      </span>
    </span>
    <span className="px-opt-end">
      <Icon name="arrow-right" size={18} />
    </span>
  </button>
);

/**
 * "há 8 min", "há 3 h", "ontem". Data absoluta num aviso obriga o usuário a
 * fazer a conta de cabeça para saber se aquilo é novo.
 */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';

  const min = Math.floor((now - then) / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;

  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;

  const d = Math.floor(h / 24);
  if (d === 1) return 'ontem';
  if (d < 7) return `há ${d} dias`;

  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
