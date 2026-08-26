// =====================================================================
// PAGORA — Cadastro de transportador
// =====================================================================
// Porte do cadastro legado para o design system. A lógica que protege o
// funil veio inteira, sem mudança:
//
//   - Erro por campo só depois do campo tocado — validar na primeira letra
//     ensina a ignorar a mensagem.
//   - Telefone vira E.164 antes de gravar; a dedup por telefone (24h) depende
//     disso, aqui e no trigger da 0009.
//   - "Rodoviário" pode ser marcado mas não basta: o enum do banco só aceita
//     frete/guincho/caçamba, e o erro diz isso ANTES do envio.
//
// O que mudou de jornada: o sucesso é um ESTADO desta tela, não uma
// navegação para a tela legada de confirmação — uma tela a menos no app.
// =====================================================================

import { useState } from 'react';
import {
  Body,
  Button,
  Card,
  Chip,
  Dock,
  Empty,
  Field,
  IconButton,
  Screen,
  SectionTitle,
  cx,
} from '../ui/kit';
import { Icon } from '../icons';
import { FrotaBauArt, FrotaCacambaArt, FrotaGuinchoArt } from '../ui/art';
import { supabase } from '../lib/supabase';
import { isValidMobilePhone, maskPhone, toE164 } from '../domains/validation/br';
import { fullNameSchema, isServiceType } from '../domains/validation/schemas';
import { track } from '../lib/analytics';
import { loadErrorMessage, withTimeout } from '../lib/timeout';
import type { GoFn } from '../types';

const SERVICOS: ReadonlyArray<{
  id: string;
  label: string;
  art: (p: { size?: number }) => React.ReactElement;
  soon?: boolean;
}> = [
  { id: 'frete', label: 'Frete', art: FrotaBauArt },
  { id: 'guincho', label: 'Guincho', art: FrotaGuinchoArt },
  { id: 'cacamba', label: 'Caçamba', art: FrotaCacambaArt },
];

export const CadastroTransportador = ({ go }: { go: GoFn }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [vehicle, setVehicle] = useState('');
  const [regions, setRegions] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));
  const toggle = (id: string) =>
    setServices((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const fieldErrors = {
    name: fullNameSchema.safeParse(name).success ? null : 'Informe nome e sobrenome',
    phone: isValidMobilePhone(phone) ? null : 'Use um celular com DDD: (11) 99999-9999',
    services: services.some(isServiceType) ? null : 'Escolha pelo menos um serviço',
    regions: regions.trim().length >= 2 ? null : 'Informe as regiões que você atende',
  };
  const errorFor = (f: keyof typeof fieldErrors) => (touched[f] ? fieldErrors[f] : null);
  const valid = Object.values(fieldErrors).every((e) => e === null);

  async function submit() {
    if (!valid || status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const chosen = services.filter(isServiceType);

      // E.164, não o texto com máscara: sem isto a dedup por telefone —
      // aqui e no trigger da 0009 — para de funcionar.
      const phoneE164 = toE164(phone);
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await withTimeout(
        Promise.resolve(
          supabase
            .from('provider_applications')
            .select('id', { count: 'exact', head: true })
            .eq('phone', phoneE164)
            .gte('created_at', since),
        ),
      );
      if ((count ?? 0) > 0) {
        setStatus('err');
        setErrorMsg('Já recebemos um cadastro com esse telefone hoje. Aguarde nosso retorno.');
        return;
      }

      const { error } = await withTimeout(
        Promise.resolve(
          supabase.from('provider_applications').insert({
            full_name: name.trim(),
            phone: phoneE164,
            services: chosen,
            vehicle: vehicle.trim() || null,
            regions: regions.trim(),
            source: 'app',
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
          }),
        ),
      );
      if (error) throw error;

      track('prestador_cadastrado', { tipo: chosen.join(','), regiao: regions });
      setStatus('ok');
    } catch (err) {
      setStatus('err');
      setErrorMsg(loadErrorMessage(err));
    }
  }

  if (status === 'ok') {
    return (
      <Screen label="Cadastro de transportador">
        <Body>
          <Empty
            icon="check-circle"
            title="Cadastro recebido"
            sub="A Pagora confere CNH, documento e veículo em até 24 h — é o que permite mostrar “verificado” ao cliente. A confirmação chega no seu WhatsApp."
            action={
              <Button variant="primary" onClick={() => go('inicio')}>
                Voltar ao início
              </Button>
            }
          />
        </Body>
      </Screen>
    );
  }

  return (
    <Screen label="Cadastro de transportador">
      <header className="px-head px-head--sticky">
        <IconButton icon="arrow-left" label="Voltar" onClick={() => go('provider-landing')} />
        <div className="px-head-title">Cadastro de transportador</div>
      </header>

      <Body>
        <div>
          <h1 className="px-title">Receba pedidos da sua região</h1>
          <p className="px-opt-s" style={{ marginTop: 8 }}>
            2 minutos. Aprovação manual em até 24 h, com confirmação no WhatsApp.
          </p>
        </div>

        <Field
          label="Nome completo"
          placeholder="Como aparece nos documentos"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => touch('name')}
          error={errorFor('name') ?? undefined}
        />

        <Field
          label="Celular (WhatsApp)"
          icon="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 98765-4321"
          value={phone}
          onChange={(e) => setPhone(maskPhone(e.target.value))}
          onBlur={() => touch('phone')}
          error={errorFor('phone') ?? undefined}
        />

        <section aria-labelledby="cad-servicos">
          <SectionTitle id="cad-servicos">O que você faz?</SectionTitle>
          <div className="px-fleet" style={{ marginTop: 12 }}>
            {SERVICOS.map((s) => {
              const on = services.includes(s.id);
              const Art = s.art;
              return (
                <button
                  key={s.id}
                  className={cx('px-fleet-card', on && 'is-on')}
                  onClick={() => {
                    toggle(s.id);
                    touch('services');
                  }}
                  aria-pressed={on}
                >
                  <span aria-hidden="true">
                    <Art size={56} />
                  </span>
                  <span>
                    <span className="px-fleet-name">{s.label}</span>
                    <span className="px-fleet-price">{on ? 'selecionado' : ' '}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {errorFor('services') && (
            <p role="alert" className="px-opt-s" style={{ color: 'var(--x-danger)', marginTop: 8 }}>
              {errorFor('services')}
            </p>
          )}
        </section>

        <Field
          label="Veículo (opcional)"
          placeholder="Ex.: caminhão baú 3/4, ano 2019"
          value={vehicle}
          onChange={(e) => setVehicle(e.target.value)}
        />

        <Field
          label="Regiões que atende"
          placeholder="Ex.: zona leste de SP, Guarulhos"
          value={regions}
          onChange={(e) => setRegions(e.target.value)}
          onBlur={() => touch('regions')}
          error={errorFor('regions') ?? undefined}
        />

        {status === 'err' && (
          <Card tone="urgent">
            <div className="px-row px-row--top">
              <Icon name="alert" size={19} style={{ color: 'var(--x-urgent)', flexShrink: 0 }} />
              <p className="px-opt-s" style={{ marginTop: 0 }}>
                {errorMsg}
              </p>
            </div>
          </Card>
        )}

        <div className="px-row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Chip tone="on">Sem mensalidade</Chip>
          <Chip>Comissão só quando fecha</Chip>
        </div>
      </Body>

      <Dock>
        <Button
          variant="primary"
          size="lg"
          block
          busy={status === 'sending'}
          busyLabel="Enviando…"
          disabled={!valid}
          onClick={() => void submit()}
        >
          Enviar cadastro
        </Button>
      </Dock>
    </Screen>
  );
};
