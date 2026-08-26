// =====================================================================
// PAGORA — Perto de você
// =====================================================================
// A intensidade intermediária do mapa: metade da tela para o mapa, metade
// para quem está nele. Serve para uma pergunta só — "existe alguém aqui que
// faça isso?" — e responde antes de o usuário gastar três telas descobrindo
// que não existe.
//
// Os filtros ordenam dados de verdade. O mapa antigo tinha filtro que
// reordenava um array fixo declarado no próprio arquivo: mudava a lista,
// nunca o resultado.
// =====================================================================

import { useEffect, useState } from 'react';
import {
  Avatar,
  Body,
  Card,
  Chip,
  Empty,
  ErrorNote,
  Rating,
  Screen,
  SectionTitle,
  Skeleton,
  Stack,
  cx,
} from '../ui/kit';
import { ClientNav } from '../ui/area';
import { Icon } from '../icons';
import { MapCanvas } from '../ui/map-canvas';
import {
  initialsOf,
  listAvailableProviders,
  type AvailableProvider,
} from '../domains/providers/provider.service';
import { useSession } from '../hooks/useSession';
import { loadErrorMessage, withTimeout } from '../lib/timeout';
import type { ServiceType } from '../lib/database.types';
import type { GoFn } from '../types';

const FILTERS: ReadonlyArray<{ id: ServiceType; label: string }> = [
  { id: 'frete', label: 'Frete' },
  { id: 'cacamba', label: 'Caçamba' },
  { id: 'guincho', label: 'Guincho' },
];

export const Perto = ({ go }: { go: GoFn }) => {
  const { user, loading: sessionLoading } = useSession();
  const [service, setService] = useState<ServiceType>('frete');
  const [rows, setRows] = useState<AvailableProvider[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sem sessão a lista não é buscada e nem esvaziada: o render trata o caso
    // pelo próprio `user`. Esvaziar aqui seria setState síncrono num efeito só
    // para descrever uma condição que já está disponível.
    if (sessionLoading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await withTimeout(listAvailableProviders(service, null, 20));
        if (!cancelled) setRows(list);
      } catch (e) {
        if (!cancelled) {
          setError(loadErrorMessage(e));
          setRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [service, user, sessionLoading]);

  return (
    <Screen label="Perto de você">
      <MapCanvas height={240} progress={0.6} alt="Mapa da sua região com transportadores." />

      <Body>
        <div className="px-row px-row--between">
          <SectionTitle>Transportadores verificados</SectionTitle>
          {rows && rows.length > 0 && <Chip tone="on">{rows.length}</Chip>}
        </div>

        <div className="px-row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={cx(
                'px-btn',
                'px-btn--sm',
                service === f.id ? 'px-btn--primary' : 'px-btn--outline',
              )}
              onClick={() => setService(f.id)}
              aria-pressed={service === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && <ErrorNote message={error} />}

        {!user ? (
          <Empty
            icon="pin"
            title="Entre para ver quem atende"
            sub="A lista de transportadores verificados fica disponível depois do login."
          />
        ) : rows === null ? (
          <Skeleton count={3} height={76} />
        ) : rows.length === 0 ? (
          <Empty
            icon="pin"
            title="Nenhum transportador nesta categoria ainda"
            sub="A base cresce toda semana. Publicar um pedido também é uma forma de atrair quem atende sua região."
          />
        ) : (
          <Stack gap="tight">
            {rows.map((p) => (
              <Card key={p.profile_id}>
                <div className="px-row">
                  <Avatar initials={initialsOf(p.display_name)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="px-opt-t">{p.display_name}</div>
                    <div className="px-row" style={{ gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                      <Rating value={p.rating_avg} count={p.rating_count} />
                      {p.vehicle_model && (
                        <span className="px-opt-s" style={{ marginTop: 0 }}>
                          {p.vehicle_model}
                        </span>
                      )}
                    </div>
                  </div>
                  <Chip tone="on" bare>
                    <Icon name="shield" size={12} /> Verificado
                  </Chip>
                </div>
              </Card>
            ))}
          </Stack>
        )}

        <p className="px-opt-s" style={{ marginTop: 0 }}>
          Você não contrata direto na lista: publique o pedido e receba propostas com preço fechado
          de quem atende sua região.
        </p>
      </Body>

      <ClientNav active="mapa" go={go} />
    </Screen>
  );
};
