import { describe, it, expect, beforeEach } from 'vitest';
import {
  forgetReferral,
  parseReferral,
  PENDING_REFERRAL_DAYS,
  readReferral,
  referralAppliesTo,
  rememberReferral,
} from './referral';

beforeEach(() => {
  forgetReferral();
});

describe('parseReferral', () => {
  it('lê o ref no formato que o compartilhamento produz', () => {
    expect(parseReferral('?ref=abc12345')).toBe('abc12345');
    expect(parseReferral('ref=abc12345')).toBe('abc12345');
  });

  it('normaliza caixa — o link pode chegar maiúsculo de um app de mensagem', () => {
    expect(parseReferral('?ref=ABC12345')).toBe('abc12345');
  });

  it('recusa o que não tem a forma de um ref', () => {
    // Guardar valor arbitrário de terceiro no armazenamento é como se
    // planta lixo (ou coisa pior) no app de quem clicou.
    for (const ruim of ['?ref=', '?ref=abc', '?ref=abc123456', '?ref=<script>', '?ref=zzzzzzzz']) {
      expect(parseReferral(ruim)).toBeNull();
    }
  });

  it('sem ref na query, null', () => {
    expect(parseReferral('?utm_source=whatsapp')).toBeNull();
    expect(parseReferral('')).toBeNull();
  });
});

describe('rememberReferral / readReferral', () => {
  it('guarda e devolve', () => {
    rememberReferral('abc12345');
    expect(readReferral()?.ref).toBe('abc12345');
  });

  it('PRIMEIRO toque vence — o segundo link não rouba a indicação', () => {
    rememberReferral('aaaaaaaa');
    rememberReferral('bbbbbbbb');
    expect(readReferral()?.ref).toBe('aaaaaaaa');
  });

  it('esquece depois do prazo', () => {
    const chegada = new Date('2026-01-01T00:00:00.000Z');
    rememberReferral('abc12345', chegada);

    const dentro = new Date(chegada.getTime() + (PENDING_REFERRAL_DAYS - 1) * 86_400_000);
    expect(readReferral(dentro)?.ref).toBe('abc12345');

    const fora = new Date(chegada.getTime() + (PENDING_REFERRAL_DAYS + 1) * 86_400_000);
    expect(readReferral(fora)).toBeNull();
  });

  it('lixo no armazenamento não derruba a leitura', () => {
    localStorage.setItem('pagora:ref-pendente', 'isto não é json');
    expect(readReferral()).toBeNull();
    localStorage.setItem('pagora:ref-pendente', '{"ref":123}');
    expect(readReferral()).toBeNull();
    localStorage.setItem('pagora:ref-pendente', '{"ref":"abc12345","at":"data ruim"}');
    expect(readReferral()).toBeNull();
  });

  it('data no futuro é descartada — relógio errado não vira indicação eterna', () => {
    const futuro = new Date(Date.now() + 10 * 86_400_000);
    rememberReferral('abc12345', futuro);
    expect(readReferral(new Date())).toBeNull();
  });

  it('esquecer limpa', () => {
    rememberReferral('abc12345');
    forgetReferral();
    expect(readReferral()).toBeNull();
  });
});

describe('referralAppliesTo', () => {
  it('ninguém indica a si mesmo', () => {
    const id = 'abc12345-4b8e-4c11-9d22-6e5f1a2b3c4d';
    expect(referralAppliesTo(id, 'abc12345')).toBe(false);
  });

  it('indicação de outra pessoa vale', () => {
    expect(referralAppliesTo('abc12345-4b8e-4c11-9d22-6e5f1a2b3c4d', 'ffffffff')).toBe(true);
  });

  it('compara sem hífen e sem caixa — o uuid pode vir dos dois jeitos', () => {
    expect(referralAppliesTo('ABC12345-4B8E-4C11-9D22-6E5F1A2B3C4D', 'abc12345')).toBe(false);
  });
});
