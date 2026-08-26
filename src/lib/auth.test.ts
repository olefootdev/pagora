import { describe, it, expect } from 'vitest';
import { authErrorMessage, normalizePhone } from './auth';

describe('authErrorMessage', () => {
  it('não deixa "Failed to fetch" chegar à tela', () => {
    // O bug real: com o projeto do Supabase pausado, a PRIMEIRA tela do app
    // mostrava esse texto, em inglês, para quem só queria entrar.
    const msg = authErrorMessage(new TypeError('Failed to fetch'));
    expect(msg).not.toMatch(/failed to fetch/i);
    expect(msg).toContain('conexão');
  });

  it('código errado e código vencido dizem a mesma coisa — e a saída', () => {
    // O Supabase devolve a MESMA mensagem para os dois casos. Fingir que
    // sabemos qual foi seria chute; o que importa é o próximo passo.
    for (const raw of ['Token has expired or is invalid', 'Invalid token']) {
      const msg = authErrorMessage(new Error(raw));
      expect(msg).toBe('Código incorreto ou expirado. Peça um novo código.');
    }
  });

  it('reenvio bloqueado devolve o tempo que o servidor pediu', () => {
    const msg = authErrorMessage(
      new Error('For security purposes, you can only request this after 47 seconds.'),
    );
    expect(msg).toBe('Aguarde 47 segundos para pedir outro código.');
  });

  it('excesso de tentativas sem tempo explícito', () => {
    expect(authErrorMessage(new Error('Request rate limit reached'))).toMatch(/Muitas tentativas/);
  });

  it('número inválido aponta o que conferir', () => {
    expect(authErrorMessage(new Error('Invalid phone number'))).toMatch(/DDD/);
  });

  it('falha do provedor de SMS não vira culpa do usuário', () => {
    expect(authErrorMessage(new Error('Error sending sms: provider failure'))).toMatch(/SMS/);
  });

  it('o que não é de auth cai no tradutor comum', () => {
    expect(authErrorMessage(new Error('JWT expired'))).toMatch(/sessão expirou/i);
  });

  it('erro sem forma de Error não quebra', () => {
    expect(authErrorMessage(null)).toBeTruthy();
    expect(authErrorMessage(undefined)).toBeTruthy();
    expect(authErrorMessage({ message: 'algo' })).toBeTruthy();
  });
});

describe('normalizePhone', () => {
  it('aceita os formatos que as pessoas digitam', () => {
    expect(normalizePhone('11987654321')).toBe('+5511987654321');
    expect(normalizePhone('(11) 98765-4321')).toBe('+5511987654321');
    expect(normalizePhone('+5511987654321')).toBe('+5511987654321');
  });

  it('recusa o que não é telefone', () => {
    expect(() => normalizePhone('123')).toThrow(/inválido/i);
  });
});
