// =====================================================================
// PAGORA — ações de pedido (transições de estado)
// =====================================================================
// Um componente só, usado pelo cliente e pelo prestador. Qual botão aparece
// sai de `ORDER_TRANSITIONS` + `TRANSITION_ACTORS`, o espelho da tabela
// `pagora.order_status_transitions`.
//
// Isso é conveniência de interface, não segurança: o servidor recusa de novo,
// e é a recusa dele que vale. Se este espelho ficar desatualizado, o pior que
// acontece é um botão aparecer e dar erro ao ser clicado — o teste de paridade
// em `order.status.test.ts` existe justamente para que nem isso ocorra.
// =====================================================================
import { useState } from 'react';
import { Icon } from '../icons';
import {
  ORDER_STATUS_LABELS,
  canActorTransition,
  type TransitionActor,
} from '../domains/orders/order.status';
import { advanceOrder, type RequestableStatus } from '../domains/orders/order.service';
import { FunctionError } from '../lib/functions';
import type { OrderStatus } from '../lib/database.types';

/** Rótulo do botão e tom, por estado de destino. */
const ACTION_UI: Record<
  RequestableStatus,
  { label: string; icon: string; hint?: string; danger?: boolean }
> = {
  en_route: { label: 'Estou a caminho', icon: 'navigation' },
  in_progress: { label: 'Iniciei o serviço', icon: 'bolt' },
  completed: { label: 'Concluí o serviço', icon: 'check', hint: 'O cliente confirma em seguida' },
  settled: {
    label: 'Confirmar conclusão',
    icon: 'check-circle',
    hint: 'Libera o pagamento ao prestador. Só confirme se o serviço foi entregue.',
  },
  cancelled: { label: 'Cancelar pedido', icon: 'close', danger: true },
};

/** Ordem em que oferecemos as ações — a mais provável primeiro. */
const CANDIDATES: RequestableStatus[] = [
  'en_route',
  'in_progress',
  'completed',
  'settled',
  'cancelled',
];

export type OrderActionsProps = {
  orderId: string;
  status: OrderStatus;
  actor: TransitionActor;
  onChanged?: (status: OrderStatus) => void;
};

export const OrderActions = ({ orderId, status, actor, onChanged }: OrderActionsProps) => {
  const [busy, setBusy] = useState<RequestableStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<RequestableStatus | null>(null);

  const available = CANDIDATES.filter((to) => canActorTransition(status, to, actor));

  async function run(to: RequestableStatus) {
    setBusy(to);
    setError(null);
    try {
      const result = await advanceOrder(orderId, to);
      onChanged?.(result.status);
    } catch (e) {
      setError(e instanceof FunctionError ? e.message : 'Não foi possível atualizar o pedido.');
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  if (available.length === 0) {
    return (
      <div className="pg-row" style={{ gap: 8, padding: '12px 0', color: 'var(--text-mute)' }}>
        <Icon name="info" size={16} />
        <span style={{ fontSize: 13 }}>{ORDER_STATUS_LABELS[status]}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {error && (
        <div
          className="pg-row"
          style={{
            gap: 8,
            padding: 12,
            borderRadius: 10,
            background: 'var(--ink-100)',
            alignItems: 'flex-start',
          }}
          role="alert"
        >
          <Icon name="alert" size={16} />
          <span style={{ fontSize: 13 }}>{error}</span>
        </div>
      )}

      {available.map((to) => {
        const ui = ACTION_UI[to];
        // Liberar dinheiro e cancelar pedem confirmação: as duas são
        // irreversíveis do ponto de vista do usuário.
        const needsConfirm = to === 'settled' || to === 'cancelled';

        if (confirming === to) {
          return (
            <div key={to} className="pg-card pg-card--padded" style={{ display: 'grid', gap: 10 }}>
              <strong style={{ fontSize: 14 }}>{ui.label}?</strong>
              {ui.hint && (
                <span style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.5 }}>
                  {ui.hint}
                </span>
              )}
              <div className="pg-row" style={{ gap: 8 }}>
                <button
                  className={`pg-btn ${ui.danger ? 'pg-btn--ghost' : 'pg-btn--accent'}`}
                  style={{ flex: 1 }}
                  disabled={busy !== null}
                  onClick={() => void run(to)}
                >
                  {busy === to ? 'Enviando…' : 'Sim, confirmar'}
                </button>
                <button
                  className="pg-btn pg-btn--ghost"
                  style={{ flex: 1 }}
                  disabled={busy !== null}
                  onClick={() => setConfirming(null)}
                >
                  Voltar
                </button>
              </div>
            </div>
          );
        }

        return (
          <button
            key={to}
            className={`pg-btn ${ui.danger ? 'pg-btn--ghost' : 'pg-btn--accent'}`}
            disabled={busy !== null}
            onClick={() => (needsConfirm ? setConfirming(to) : void run(to))}
          >
            <Icon name={ui.icon} size={16} />
            {busy === to ? 'Enviando…' : ui.label}
          </button>
        );
      })}
    </div>
  );
};
