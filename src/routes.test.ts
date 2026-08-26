import { describe, it, expect } from 'vitest';
import { ALL_SCREENS, RETIRED_ROUTES, resolveRoute, SEGMENT_ROUTES } from './routes';

describe('resolveRoute', () => {
  it('resolve rota simples com e sem barra inicial', () => {
    expect(resolveRoute('/inicio')).toEqual({ route: 'inicio' });
    expect(resolveRoute('inicio')).toEqual({ route: 'inicio' });
  });

  it('as rotas reais que restam continuam resolvendo para si', () => {
    for (const alive of ['checkout', 'prov-financeiro', 'admin-financeiro', 'login', 'chat']) {
      expect(resolveRoute(`/${alive}`).route).toBe(alive);
    }
  });

  it('lê o segmento das rotas que aceitam um', () => {
    expect(resolveRoute('/pedido/entulho')).toEqual({ route: 'pedido', slug: 'entulho' });
    expect(resolveRoute('/acompanhar/abc-123')).toEqual({ route: 'acompanhar', slug: 'abc-123' });
    expect(resolveRoute('/escolher/xyz')).toEqual({ route: 'escolher', slug: 'xyz' });
  });

  it('rota desconhecida cai na landing, não em tela em branco', () => {
    expect(resolveRoute('/nao-existe')).toEqual({ route: 'landing' });
    expect(resolveRoute('')).toEqual({ route: 'landing' });
    expect(resolveRoute('/')).toEqual({ route: 'landing' });
  });

  it('segmento em rota que não aceita segmento não vira rota', () => {
    // `/home/qualquer-coisa` não é `/home`: aceitar seria dar duas URLs para
    // a mesma tela e quebrar a contagem de acesso.
    expect(resolveRoute('/home/lixo')).toEqual({ route: 'landing' });
  });

  it('rota de segmento sem segmento resolve a própria rota', () => {
    // A tela decide o que fazer — no caso de `/pedido`, voltar ao início.
    expect(resolveRoute('/pedido')).toEqual({ route: 'pedido' });
  });

  it('barra sobrando no fim não muda a rota', () => {
    expect(resolveRoute('/inicio/')).toEqual({ route: 'inicio' });
    expect(resolveRoute('/acompanhar/abc/')).toEqual({ route: 'acompanhar', slug: 'abc' });
  });

  it('decodifica o segmento', () => {
    expect(resolveRoute('/escolher/a%20b').slug).toBe('a b');
  });

  it('escape inválido não derruba a tela', () => {
    // Aplicativo de mensagem trunca link e deixa `%` solto.
    // `decodeURIComponent` estouraria; preferimos o valor cru.
    expect(resolveRoute('/acompanhar/abc%').slug).toBe('abc%');
  });
});

describe('rotas aposentadas', () => {
  it('cada uma leva à substituta, não à landing', () => {
    // Um link de `#/history-list` já foi compartilhado por WhatsApp. Abrir a
    // landing sem explicação é pior que abrir a tela que faz a mesma coisa.
    expect(resolveRoute('/history-list')).toEqual({
      route: 'pedidos',
      retiredFrom: 'history-list',
    });
    expect(resolveRoute('/proposals').route).toBe('pedidos');
    expect(resolveRoute('/provider-dash').route).toBe('parceiro');
    expect(resolveRoute('/admin-dash').route).toBe('admin-financeiro');
    expect(resolveRoute('/prov-signup').route).toBe('provider-signup');
  });

  it('o wizard antigo cai no fluxo do SERVIÇO certo, não numa home genérica', () => {
    // Link de `#/cacamba-1` compartilhado por WhatsApp precisa abrir caçamba.
    expect(resolveRoute('/cacamba-1')).toEqual({
      route: 'pedido',
      slug: 'entulho',
      retiredFrom: 'cacamba-1',
    });
    expect(resolveRoute('/frete-3').slug).toBe('carga');
    expect(resolveRoute('/guincho-2').slug).toBe('veiculo');
    expect(resolveRoute('/tracking').route).toBe('pedidos');
    expect(resolveRoute('/profile').route).toBe('conta');
  });

  it('nenhuma aposentada continua no inventário', () => {
    for (const antiga of Object.keys(RETIRED_ROUTES)) {
      expect(ALL_SCREENS as readonly string[]).not.toContain(antiga);
    }
  });

  it('toda substituta EXISTE — aposentar para o vazio seria pior', () => {
    for (const nova of Object.values(RETIRED_ROUTES)) {
      // A substituta pode ser rota de segmento ("pedido/carga"): o que vale
      // é o resultado da resolução apontar para uma rota do inventário.
      const r = resolveRoute(nova);
      expect(ALL_SCREENS as readonly string[]).toContain(r.route);
      expect(r.retiredFrom).toBeUndefined();
    }
  });

  it('nenhuma substituta é, ela mesma, uma rota aposentada', () => {
    // Evita cadeia de redirecionamento e o laço infinito que ela viraria.
    for (const nova of Object.values(RETIRED_ROUTES)) {
      expect(RETIRED_ROUTES[nova]).toBeUndefined();
    }
  });

  it('marca de onde veio, para a tela poder avisar', () => {
    expect(resolveRoute('/inicio').retiredFrom).toBeUndefined();
    expect(resolveRoute('/proposals').retiredFrom).toBe('proposals');
  });
});

describe('inventário de rotas', () => {
  it('não há rota duplicada', () => {
    expect(new Set(ALL_SCREENS).size).toBe(ALL_SCREENS.length);
  });

  it('toda rota de segmento está no inventário', () => {
    for (const r of SEGMENT_ROUTES) {
      expect(ALL_SCREENS as readonly string[]).toContain(r);
    }
  });
});
