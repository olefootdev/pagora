// =====================================================================
// PAGORA — Meus dados / Boas-vindas
// =====================================================================
// Uma tela, dois momentos:
//
//   - `boas-vindas`, logo depois do código do SMS. É a primeira vez que o
//     app pergunta o nome de alguém. Até esta tela existir, quem entrava
//     virava um registro sem nome: a home continuava dizendo "Bem-vindo ao
//     Pagora" para quem já tinha feito dez pedidos, e o transportador que ia
//     à casa da pessoa não sabia com quem falar.
//   - `meus-dados`, pela Conta, para corrigir depois.
//
// Duas telas separadas dariam dois formulários para manter em sincronia, e
// eles fariam a MESMA pergunta. O que muda entre os momentos é o texto do
// topo, o botão e a saída — não os campos.
//
// A cidade é OPCIONAL de propósito. Ela melhora o que o app mostra em
// "Perto", mas exigi-la no primeiro minuto troca um cadastro concluído por
// um campo a mais entre a pessoa e o pedido dela.
// =====================================================================

import { useState } from 'react';
import {
  Body,
  Button,
  Card,
  Dock,
  ErrorNote,
  Field,
  IconButton,
  Screen,
  SectionTitle,
  Skeleton,
} from '../ui/kit';
import {
  saveMyProfile,
  UFS,
  validateProfile,
  type ProfileErrors,
} from '../domains/profile/profile.service';
import { formatPhoneForDisplay } from '../domains/validation/br';
import { refreshProfile, useProfile } from '../hooks/useProfile';
import { useSession } from '../hooks/useSession';
import { track } from '../lib/analytics';
import { loadErrorMessage, withTimeout } from '../lib/timeout';
import type { GoFn } from '../types';

export const MeusDados = ({ go, welcome = false }: { go: GoFn; welcome?: boolean }) => {
  const { user } = useSession();
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <Screen label={welcome ? 'Boas-vindas' : 'Meus dados'}>
        <Body>
          <Skeleton count={2} height={110} />
        </Body>
      </Screen>
    );
  }

  if (!user || !profile) {
    return (
      <Screen label="Meus dados">
        <Body>
          <ErrorNote message="Entre de novo para editar seus dados." />
          <Button variant="primary" block onClick={() => go('login')}>
            Entrar
          </Button>
        </Body>
      </Screen>
    );
  }

  // `key` no perfil: se o perfil chegar depois do primeiro render, o
  // formulário renasce com os valores certos em vez de ficar vazio.
  return <Form key={profile.id} go={go} welcome={welcome} profile={profile} />;
};

const Form = ({
  go,
  welcome,
  profile,
}: {
  go: GoFn;
  welcome: boolean;
  profile: {
    id: string;
    full_name: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    onboarded_at: string | null;
  };
}) => {
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [state, setState] = useState(profile.state ?? '');
  const [tocado, setTocado] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft = { fullName, city, state };
  const errors: ProfileErrors = validateProfile(draft);
  const podeEnviar = Object.keys(errors).length === 0;

  async function salvar() {
    setTocado(true);
    if (!podeEnviar) return;
    setBusy(true);
    setError(null);
    try {
      await withTimeout(saveMyProfile(profile.id, draft, Boolean(profile.onboarded_at)));
      track(welcome ? 'onboarding_concluido' : 'perfil_editado', {});
      // Relê antes de sair: o portão olha o perfil, e sair sem atualizar
      // devolveria a pessoa para as boas-vindas que ela acabou de concluir.
      await refreshProfile();
      go(welcome ? 'inicio' : 'conta');
    } catch (e) {
      setError(loadErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Erro só depois da primeira tentativa: acusar campo vazio antes de a
  // pessoa digitar é o app reclamando de algo que ela ainda ia fazer.
  const err = (campo: keyof ProfileErrors) => (tocado ? (errors[campo] ?? null) : null);

  return (
    <Screen label={welcome ? 'Boas-vindas' : 'Meus dados'}>
      {welcome ? (
        /* Sem botão de voltar: não há para onde voltar depois do código do
           SMS, e um botão que não leva a lugar nenhum é pior que nenhum. */
        <div className="px-hero">
          <div className="px-eyebrow" style={{ color: 'var(--x-hero-ink-dim)' }}>
            Falta só isto
          </div>
          <h1 className="px-hero-title" style={{ marginTop: 10 }}>
            Como podemos te chamar?
          </h1>
          <p className="px-hero-sub">
            Seu nome aparece para o transportador que aceitar o seu pedido — e só depois de você
            escolher a proposta dele.
          </p>
        </div>
      ) : (
        <header className="px-head px-head--sticky">
          <IconButton icon="arrow-left" label="Voltar" onClick={() => go('conta')} />
          <div className="px-head-title">Meus dados</div>
        </header>
      )}

      <Body>
        <Card>
          <Field
            label="Como você se chama?"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={err('fullName')}
            placeholder="Seu nome"
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            maxLength={80}
          />

          <div className="px-row" style={{ gap: 12, alignItems: 'flex-start', marginTop: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Field
                label="Cidade (opcional)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                error={err('city')}
                placeholder="Onde você está"
                autoComplete="address-level2"
                autoCapitalize="words"
                enterKeyHint="done"
                maxLength={60}
              />
            </div>
            <div style={{ width: 96, flexShrink: 0 }}>
              <div className="px-fieldset">
                <label className="px-label" htmlFor="uf">
                  UF
                </label>
                <select
                  id="uf"
                  className="px-input"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="">—</option>
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* O telefone é a conta e não se edita aqui: trocar de número é
            trocar de login, e isso não cabe num campo de formulário. */}
        {profile.phone && (
          <Card>
            <SectionTitle>Seu telefone</SectionTitle>
            <p className="px-data" style={{ marginTop: 6, fontSize: 16 }}>
              {formatPhoneForDisplay(profile.phone)}
            </p>
            <p className="px-opt-s" style={{ marginTop: 8 }}>
              É com ele que você entra no Pagora. Para trocar, fale com a gente.
            </p>
          </Card>
        )}

        {error && <ErrorNote message={error} />}
      </Body>

      <Dock>
        <Button
          variant="primary"
          size="lg"
          block
          busy={busy}
          busyLabel="Salvando…"
          onClick={() => void salvar()}
        >
          {welcome ? 'Começar a usar' : 'Salvar'}
        </Button>
      </Dock>
    </Screen>
  );
};
