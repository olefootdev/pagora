import { describe, it, expect } from 'vitest';
import { needsOnboarding, tidyName, validateProfile } from './profile.service';

describe('validateProfile', () => {
  it('aceita só o primeiro nome — muita gente se apresenta assim', () => {
    // Exigir sobrenome trava o cadastro por preciosismo.
    expect(validateProfile({ fullName: 'Marina' })).toEqual({});
  });

  it('recusa nome vazio ou de uma letra', () => {
    expect(validateProfile({ fullName: '' }).fullName).toBeTruthy();
    expect(validateProfile({ fullName: '  ' }).fullName).toBeTruthy();
    expect(validateProfile({ fullName: 'J' }).fullName).toBeTruthy();
  });

  it('número em nome é telefone colado no campo errado', () => {
    expect(validateProfile({ fullName: '11987654321' }).fullName).toBe('Só o nome, sem números.');
    expect(validateProfile({ fullName: 'Marina 2' }).fullName).toBeTruthy();
  });

  it('cidade é opcional, mas se vier tem que estar inteira', () => {
    expect(validateProfile({ fullName: 'Marina' }).city).toBeUndefined();
    expect(validateProfile({ fullName: 'Marina', city: '' }).city).toBeUndefined();
    expect(validateProfile({ fullName: 'Marina', city: 'S' }).city).toBeTruthy();
    expect(validateProfile({ fullName: 'Marina', city: 'Santo André' }).city).toBeUndefined();
  });

  it('UF precisa existir', () => {
    expect(validateProfile({ fullName: 'Marina', state: 'SP' }).state).toBeUndefined();
    expect(validateProfile({ fullName: 'Marina', state: 'sp' }).state).toBeUndefined();
    expect(validateProfile({ fullName: 'Marina', state: 'XX' }).state).toBe('UF inválida.');
  });

  it('acento não é número — nome brasileiro passa', () => {
    for (const nome of ['João', 'Conceição', "D'Ávila", 'Müller']) {
      expect(validateProfile({ fullName: nome })).toEqual({});
    }
  });
});

describe('tidyName', () => {
  it('conserta o que o teclado do celular produz', () => {
    expect(tidyName('joão da silva')).toBe('João da Silva');
    expect(tidyName('JOÃO DA SILVA')).toBe('João da Silva');
    expect(tidyName('  marina   alves  ')).toBe('Marina Alves');
  });

  it('partícula no começo é nome, não partícula', () => {
    // "Da Silva" como nome inteiro começa com maiúscula.
    expect(tidyName('da silva')).toBe('Da Silva');
  });

  it('mantém as partículas minúsculas no meio', () => {
    expect(tidyName('maria dos santos e souza')).toBe('Maria dos Santos e Souza');
  });
});

describe('needsOnboarding', () => {
  it('perfil recém-criado precisa se apresentar', () => {
    expect(needsOnboarding({ onboarded_at: null })).toBe(true);
  });

  it('quem já passou não volta — nem se deixou a cidade em branco', () => {
    // Olhar `full_name` em vez de `onboarded_at` jogaria de volta ao passo
    // toda vez que a pessoa abrisse o app.
    expect(needsOnboarding({ onboarded_at: '2026-08-26T10:00:00.000Z' })).toBe(false);
  });

  it('sem perfil ainda não é hora de decidir nada', () => {
    // `null` é "ainda carregando", não "precisa de onboarding" — tratar como
    // precisando piscaria a tela de boas-vindas em cada abertura.
    expect(needsOnboarding(null)).toBe(false);
  });
});
