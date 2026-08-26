import { describe, it, expect, vi, afterEach } from 'vitest';
import { DEFAULT_TIMEOUT_MS, loadErrorMessage, TimeoutError, withTimeout } from './timeout';

afterEach(() => {
  vi.useRealTimers();
});

describe('withTimeout', () => {
  it('devolve o valor quando a promessa resolve a tempo', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1_000)).resolves.toBe('ok');
  });

  it('propaga o erro original quando a promessa rejeita a tempo', async () => {
    const boom = new Error('erro do servidor');
    await expect(withTimeout(Promise.reject(boom), 1_000)).rejects.toThrow('erro do servidor');
  });

  it('rejeita com TimeoutError quando estoura o limite', async () => {
    vi.useFakeTimers();
    // Promessa que nunca resolve — é exatamente o caso do host que não
    // responde, e o que deixava a tela em esqueleto para sempre.
    const travada = new Promise<string>(() => {});
    const p = withTimeout(travada, 5_000);
    const assertion = expect(p).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(5_001);
    await assertion;
  });

  it('não deixa o timer pendurado quando resolve antes', async () => {
    vi.useFakeTimers();
    const clear = vi.spyOn(globalThis, 'clearTimeout');
    await withTimeout(Promise.resolve(1), 5_000);
    expect(clear).toHaveBeenCalled();
  });

  it('a rejeição passa intacta — normalizar é trabalho de loadErrorMessage', async () => {
    // Envolver em `new Error(String(erro))` destruía o erro do supabase-js,
    // que é objeto simples: virava "[object Object]" antes de qualquer
    // tradução acontecer.
    const postgrest = { message: 'Failed to fetch', code: '' };
    await expect(withTimeout(Promise.reject(postgrest), 1_000)).rejects.toBe(postgrest);
  });

  it('o limite padrão é generoso o bastante para 3G ruim', () => {
    expect(DEFAULT_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
  });
});

describe('loadErrorMessage', () => {
  it('espera esgotada diz o que fazer', () => {
    expect(loadErrorMessage(new TimeoutError())).toContain('tente de novo');
  });

  it('falha de rede não vaza "Failed to fetch" para o usuário', () => {
    const msg = loadErrorMessage(new TypeError('Failed to fetch'));
    expect(msg).not.toContain('Failed to fetch');
    expect(msg).toContain('conexão');
  });

  it('reconhece o erro de DNS do navegador', () => {
    expect(loadErrorMessage(new Error('net::ERR_NAME_NOT_RESOLVED'))).toContain('conexão');
  });

  it('sessão expirada manda entrar de novo', () => {
    expect(loadErrorMessage(new Error('JWT expired'))).toContain('Entre novamente');
  });

  it('erro do domínio passa inteiro — ele já foi escrito para o usuário', () => {
    expect(loadErrorMessage(new Error('Esta proposta expirou'))).toBe('Esta proposta expirou');
  });

  it('erro sem mensagem ainda produz texto útil', () => {
    expect(loadErrorMessage(new Error(''))).toBe('Não foi possível carregar. Tente de novo.');
  });

  it('erro do supabase-js não vaza "[object Object]" para a tela', () => {
    // `PostgrestError` é objeto simples, não instância de Error. Um
    // `String(erro)` nele produzia "[object Object]" na tela de
    // acompanhamento — foi assim que este caso apareceu.
    const postgrest = {
      message: 'invalid input syntax for type uuid: "nao-existe"',
      code: '22P02',
      details: null,
      hint: null,
    };
    const msg = loadErrorMessage(postgrest);
    expect(msg).not.toContain('[object Object]');
    expect(msg).toContain('uuid');
  });

  it('erro de rede do supabase-js vira a mensagem de conexão', () => {
    expect(loadErrorMessage({ message: 'TypeError: Failed to fetch' })).toContain('conexão');
  });

  it('objeto de erro sem `message` cai nos outros campos antes de desistir', () => {
    expect(loadErrorMessage({ error_description: 'Cadastro não aprovado' })).toBe(
      'Cadastro não aprovado',
    );
    expect(loadErrorMessage({ details: 'Detalhe do banco' })).toBe('Detalhe do banco');
  });

  it('erro de sessão é traduzido mesmo vindo em objeto', () => {
    expect(loadErrorMessage({ error_description: 'invalid token' })).toContain('Entre novamente');
  });

  it('objeto sem nenhum campo conhecido não produz lixo', () => {
    expect(loadErrorMessage({ codigo: 42 })).toBe('Não foi possível carregar. Tente de novo.');
    expect(loadErrorMessage(null)).toBe('Não foi possível carregar. Tente de novo.');
    expect(loadErrorMessage(undefined)).toBe('Não foi possível carregar. Tente de novo.');
  });
});
