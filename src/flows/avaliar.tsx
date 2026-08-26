// =====================================================================
// PAGORA — Avaliar o serviço
// =====================================================================
// A tela que alimenta o que vende o marketplace: a nota do transportador.
// Hoje todo mundo aparece "sem avaliações" porque ninguém nunca escreveu na
// tabela `reviews`.
//
// O desenho segue a regra de quem usa o app com pressa:
//   - Estrela GRANDE, um toque. Nada de slider, nada de nota de 0 a 10.
//   - Comentário é OPCIONAL e pode ser ditado.
//   - Enviar é um botão só, e o rótulo diz a nota escolhida.
// =====================================================================

import { useEffect, useState } from 'react';
import {
  Body,
  Button,
  Card,
  Dock,
  Empty,
  ErrorNote,
  IconButton,
  Screen,
  SectionTitle,
  TextArea,
  cx,
} from '../ui/kit';
import { Icon } from '../icons';
import { VoiceButton } from '../ui/anchor-card';
import { getOrder } from '../domains/orders/order.service';
import { getMyReview, submitReview } from '../domains/orders/review.service';
import { getProvider, type AvailableProvider } from '../domains/providers/provider.service';
import { useSession } from '../hooks/useSession';
import { track } from '../lib/analytics';
import { loadErrorMessage, withTimeout } from '../lib/timeout';
import type { GoFn } from '../types';
import type { Tables } from '../lib/database.types';

/** O que cada nota quer dizer — some a dúvida de "4 é bom ou ruim?". */
const SENTIDO: Record<number, string> = {
  1: 'Muito ruim',
  2: 'Ruim',
  3: 'Deu para o gasto',
  4: 'Bom',
  5: 'Excelente',
};

export const Avaliar = ({ go, orderId }: { go: GoFn; orderId?: string | undefined }) => {
  const { user } = useSession();
  const [order, setOrder] = useState<Tables<'orders'> | null>(null);
  const [provider, setProvider] = useState<AvailableProvider | null>(null);
  const [ja, setJa] = useState<Tables<'reviews'> | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  // Sem id não há o que carregar: o estado inicial já sabe disso, e o
  // efeito não precisa desligá-lo com um setState síncrono.
  const [loading, setLoading] = useState(Boolean(orderId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    void (async () => {
      try {
        const o = await withTimeout(getOrder(orderId));
        if (cancelled) return;
        setOrder(o);
        if (o) {
          const [prov, review] = await withTimeout(
            Promise.all([getProvider(o.provider_id), getMyReview(o.id)]),
          );
          if (cancelled) return;
          setProvider(prov);
          setJa(review);
        }
      } catch (e) {
        if (!cancelled) setError(loadErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function enviar() {
    if (!order || !user || stars < 1) return;
    setBusy(true);
    setError(null);
    try {
      await withTimeout(
        submitReview({
          orderId: order.id,
          clientId: user.id,
          providerId: order.provider_id,
          stars,
          comment,
        }),
      );
      track('servico_avaliado', { order_id: order.id, estrelas: stars });
      setEnviado(true);
    } catch (e) {
      setError(loadErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const nome = provider?.display_name ?? 'o transportador';

  if (enviado || ja) {
    return (
      <Shell go={go}>
        <Empty
          icon="check-circle"
          title="Obrigado pela avaliação"
          sub={`Sua nota entra na média de ${nome} e ajuda o próximo cliente a escolher.`}
          action={
            <Button variant="primary" onClick={() => go('pedidos')}>
              Ver meus pedidos
            </Button>
          }
        />
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell go={go}>
        <Card>
          <SectionTitle>Carregando…</SectionTitle>
        </Card>
      </Shell>
    );
  }

  if (!order) {
    return (
      <Shell go={go}>
        <ErrorNote message={error ?? 'Não encontramos este serviço.'} />
      </Shell>
    );
  }

  return (
    <Shell
      go={go}
      dock={
        <Dock>
          <Button
            variant="primary"
            size="lg"
            block
            busy={busy}
            busyLabel="Enviando…"
            disabled={stars < 1}
            onClick={() => void enviar()}
          >
            {stars > 0
              ? `Enviar ${stars} ${stars === 1 ? 'estrela' : 'estrelas'}`
              : 'Escolha a nota'}
          </Button>
        </Dock>
      }
    >
      <div>
        <h1 className="px-title">Como foi com {nome}?</h1>
      </div>

      {/* Cinco alvos grandes. Toque, não arraste. */}
      <div className="px-stars" role="radiogroup" aria-label="Nota do serviço">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'} — ${SENTIDO[n]}`}
            className={cx('px-star', n <= stars && 'is-on')}
            onClick={() => setStars(n)}
          >
            <Icon name="star" size={34} />
          </button>
        ))}
      </div>

      <p className="px-stars-sentido" aria-live="polite">
        {stars > 0 ? SENTIDO[stars] : 'Toque nas estrelas'}
      </p>

      <div style={{ position: 'relative' }}>
        <TextArea
          label="Quer contar mais? (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Chegou no horário, cuidou da carga…"
          className="px-textarea--voice"
        />
        <VoiceButton
          onText={(t) => setComment((c) => (c ? `${c} ${t}` : t))}
          label="Ditar o comentário"
          className="px-voice-corner"
        />
      </div>

      {error && <ErrorNote message={error} />}
    </Shell>
  );
};

const Shell = ({
  go,
  children,
  dock,
}: {
  go: GoFn;
  children: React.ReactNode;
  dock?: React.ReactNode;
}) => (
  <Screen label="Avaliar">
    <header className="px-head px-head--sticky">
      <IconButton icon="arrow-left" label="Voltar" onClick={() => go('pedidos')} />
      <div className="px-head-title">Avaliar</div>
    </header>
    <Body>{children}</Body>
    {dock}
  </Screen>
);
