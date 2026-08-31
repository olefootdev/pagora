// =====================================================================
// PAGORA — Conta (cliente)
// =====================================================================
// Endereços, favoritos, carteira, indicação e acessibilidade eram cinco
// destinos do menu, cada um com uma tela inteira e todos com dados fixos no
// código. Aqui viram linhas de uma tela só, ligadas às telas reais quando
// elas existem.
//
// Vale para navegação em geral: item de menu é caro. Ele ocupa espaço
// permanente na barra e sugere que há conteúdo suficiente ali. Cinco itens
// que abrem listas vazias custam mais confiança do que entregam função.
// =====================================================================

import {
  Avatar,
  Body,
  Button,
  Card,
  Chip,
  Screen,
  ScreenHead,
  SectionTitle,
  Stack,
} from '../ui/kit';
import { ClientNav } from '../ui/area';
import { LinhaInstalar } from '../ui/instalar';
import { Icon } from '../icons';
import { initialsOf } from '../domains/providers/provider.service';
import { useProfile } from '../hooks/useProfile';
import { formatPhoneForDisplay } from '../domains/validation/br';
import { useSession } from '../hooks/useSession';
import { supabase } from '../lib/supabase';
import type { GoFn } from '../types';

type Linha = {
  id: string;
  label: string;
  sub: string;
  icon: string;
  onClick: () => void;
  chip?: string;
};

export const Conta = ({ go }: { go: GoFn }) => {
  const { user, loading } = useSession();
  const { profile } = useProfile();

  if (!loading && !user) {
    return (
      <Screen label="Conta">
        <ScreenHead title="Conta" />
        <Body>
          <Card>
            <SectionTitle>Entre para pedir transporte</SectionTitle>
            <p className="px-opt-s" style={{ marginTop: 6 }}>
              Usamos seu telefone para o transportador falar com você e para guardar seus pedidos.
            </p>
            <Button
              variant="primary"
              size="lg"
              block
              style={{ marginTop: 14 }}
              onClick={() => go('login')}
            >
              Entrar com telefone
            </Button>
          </Card>

          <Card>
            <SectionTitle>Tem caminhão, guincho ou caçamba?</SectionTitle>
            <p className="px-opt-s" style={{ marginTop: 6 }}>
              Cadastre-se para receber pedidos da sua região e enviar propostas.
            </p>
            <Button
              variant="outline"
              block
              style={{ marginTop: 14 }}
              onClick={() => go('provider-landing')}
            >
              Quero ser transportador
            </Button>
          </Card>
        </Body>
        <ClientNav active="conta" go={go} />
      </Screen>
    );
  }

  const linhas: Linha[] = [
    {
      id: 'dados',
      label: 'Meus dados',
      sub: 'Nome e cidade',
      icon: 'user',
      onClick: () => go('meus-dados'),
    },
    {
      id: 'rede',
      label: 'Minha Rede',
      sub: 'Seu link e quanto rende cada indicação',
      icon: 'gift',
      onClick: () => go('minha-rede'),
    },
    {
      id: 'prestador',
      label: 'Tenho um veículo',
      sub: 'Receber pedidos como transportador',
      icon: 'truck',
      onClick: () => go('parceiro'),
    },
    {
      id: 'ajuda',
      label: 'Ajuda e suporte',
      sub: 'Falar com a gente',
      icon: 'headset',
      onClick: () => window.open('mailto:suporte@pagora.com.br', '_blank', 'noopener'),
    },
    {
      id: 'termos',
      label: 'Termos de uso',
      sub: 'E política de privacidade',
      icon: 'doc',
      onClick: () => go('termos'),
    },
  ];

  return (
    <Screen label="Conta">
      <ScreenHead title="Conta" sticky />
      <Body>
        <div className="px-row" style={{ gap: 14 }}>
          <Avatar initials={initialsOf(profile?.full_name)} large src={profile?.avatar_url} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--x-display)',
                fontWeight: 700,
                fontSize: 19,
                letterSpacing: '-0.025em',
              }}
            >
              {profile?.full_name || 'Sua conta'}
            </div>
            <div className="px-data" style={{ color: 'var(--x-ink-dim)', marginTop: 3 }}>
              {formatPhoneForDisplay(profile?.phone ?? user?.phone ?? '')}
            </div>
          </div>
          {profile?.role === 'provider' && <Chip tone="on">Transportador</Chip>}
          {profile?.role === 'admin' && <Chip tone="info">Admin</Chip>}
        </div>

        <LinhaInstalar />

        <Stack gap="tight">
          {linhas.map((l) => (
            <button key={l.id} className="px-opt" onClick={l.onClick}>
              <span className="px-opt-art" aria-hidden="true">
                <Icon name={l.icon} size={20} />
              </span>
              <span className="px-opt-text">
                <span className="px-opt-t">{l.label}</span>
                <span className="px-opt-s">{l.sub}</span>
              </span>
              <span className="px-opt-end">
                <Icon name="arrow-right" size={18} />
              </span>
            </button>
          ))}
        </Stack>

        {profile?.role === 'admin' && (
          <Button
            variant="outline"
            block
            iconStart="settings"
            onClick={() => go('admin-financeiro')}
          >
            Operação financeira
          </Button>
        )}

        <Button
          variant="quiet"
          block
          onClick={() => {
            void supabase.auth.signOut().then(() => go('inicio'));
          }}
        >
          Sair da conta
        </Button>
      </Body>

      <ClientNav active="conta" go={go} />
    </Screen>
  );
};
