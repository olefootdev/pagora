import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildShareUrl, shareOrCopy, copyText, shareFeedback } from './share';

const ORIGIN = 'https://pagora.com.br';

describe('buildShareUrl — o app usa HashRouter', () => {
  it('põe a rota depois do #', () => {
    expect(buildShareUrl('landing', {}, ORIGIN)).toBe('https://pagora.com.br/#/landing');
  });

  it('põe a query DEPOIS do hash, não antes', () => {
    // Esta é a regressão que importa. Com `?ref=X#/landing` o link abre a tela
    // certa e o parâmetro nunca chega ao router — falha silenciosa, do tipo
    // que só aparece quando alguém reclama que a indicação não contou.
    const url = buildShareUrl('landing', { ref: 'MARINA30' }, ORIGIN);
    expect(url).toBe('https://pagora.com.br/#/landing?ref=MARINA30');
    expect(url.indexOf('?')).toBeGreaterThan(url.indexOf('#'));
  });

  it('aceita a rota com ou sem barra e sem duplicar', () => {
    for (const r of ['tracking', '/tracking', '#/tracking']) {
      expect(buildShareUrl(r, {}, ORIGIN)).toBe('https://pagora.com.br/#/tracking');
    }
  });

  it('escapa valor de parâmetro', () => {
    expect(buildShareUrl('landing', { ref: 'a b&c=d' }, ORIGIN)).toBe(
      'https://pagora.com.br/#/landing?ref=a+b%26c%3Dd',
    );
  });

  it('encadeia múltiplos parâmetros', () => {
    expect(buildShareUrl('tracking', { id: 'PG-1247', t: 'abc' }, ORIGIN)).toBe(
      'https://pagora.com.br/#/tracking?id=PG-1247&t=abc',
    );
  });
});

describe('shareOrCopy', () => {
  const payload = { title: 'PAGORA', text: 'Acompanhe', url: `${ORIGIN}/#/tracking` };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubNavigator(nav: Record<string, unknown>) {
    vi.stubGlobal('navigator', nav);
  }

  it('usa a bandeja nativa quando existe', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share });
    expect(await shareOrCopy(payload)).toBe('shared');
    expect(share).toHaveBeenCalledWith(payload);
  });

  it('desistir da bandeja não é falha', async () => {
    // AbortError é a pessoa fechando a bandeja. Tratar como erro faria o app
    // mostrar "não deu para compartilhar" depois de uma escolha deliberada.
    const abort = new Error('user cancelled');
    abort.name = 'AbortError';
    stubNavigator({ share: vi.fn().mockRejectedValue(abort) });
    expect(await shareOrCopy(payload)).toBe('dismissed');
  });

  it('sem bandeja, copia o link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ clipboard: { writeText } });
    expect(await shareOrCopy(payload)).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(payload.url);
  });

  it('erro que não é desistência cai para o clipboard em vez de morrer', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({
      share: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
      clipboard: { writeText },
    });
    expect(await shareOrCopy(payload)).toBe('copied');
  });

  it('clipboard indisponível (http puro) cai no fallback de textarea', async () => {
    // Sem contexto seguro `navigator.clipboard` é undefined. Sem fallback o
    // botão não faria nada e não diria nada.
    stubNavigator({});
    const exec = vi.fn().mockReturnValue(true);
    vi.stubGlobal('document', {
      ...document,
      execCommand: exec,
      createElement: document.createElement.bind(document),
      body: document.body,
    });
    expect(await shareOrCopy(payload)).toBe('copied');
    expect(exec).toHaveBeenCalledWith('copy');
  });
});

describe('copyText', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('copia texto solto, como o código de indicação', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copyText('MARINA30')).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('MARINA30');
  });
});

describe('shareFeedback', () => {
  it('silencia quando o sistema já respondeu ou a pessoa desistiu', () => {
    expect(shareFeedback('shared')).toBeNull();
    expect(shareFeedback('dismissed')).toBeNull();
  });

  it('avisa quando copiou ou falhou', () => {
    expect(shareFeedback('copied')).toBe('Link copiado');
    expect(shareFeedback('failed')).toBe('Não deu para compartilhar');
  });
});
