// =====================================================================
// PAGORA — Testes da leitura de intenção
// =====================================================================
// Os casos são frases reais do vocabulário de quem contrata transporte, não
// exemplos limpos escritos para o teste passar. Vários vêm sem acento e sem
// pontuação de propósito: é assim que se digita com o telefone na mão.
// =====================================================================

import { describe, it, expect } from 'vitest';
import {
  readIntent,
  bestNeed,
  extractHints,
  isNeedKind,
  NEED_KINDS,
  NEED_LABEL,
  NEED_SERVICE,
  normalize,
} from './intent';

describe('normalize', () => {
  it('tira acento e caixa', () => {
    expect(normalize('Mudança RESIDENCIAL')).toBe('mudanca residencial');
  });

  it('colapsa espaço repetido', () => {
    expect(normalize('  preciso   de   frete ')).toBe('preciso de frete');
  });
});

describe('readIntent — o serviço certo', () => {
  it('entulho vira caçamba', () => {
    const r = readIntent('preciso retirar 3 toneladas de entulho de uma obra');
    expect(r.needs[0]?.kind).toBe('entulho');
    expect(r.needs[0]?.service).toBe('cacamba');
  });

  it('sofá vira mudança, que é frete', () => {
    const r = readIntent('preciso levar um sofa para outro endereco');
    expect(r.needs[0]?.kind).toBe('mudanca');
    expect(r.needs[0]?.service).toBe('frete');
  });

  it('carro quebrado vira guincho', () => {
    const r = readIntent('meu carro quebrou na marginal e preciso de guincho');
    expect(r.needs[0]?.kind).toBe('veiculo');
    expect(r.needs[0]?.service).toBe('guincho');
  });

  it('tijolo vira material de construção', () => {
    const r = readIntent('levar tijolos e cimento para a obra');
    // "obra" também pontua entulho — material tem que ganhar mesmo assim,
    // porque dois termos de peso 2 superam um de peso 1.
    expect(r.needs[0]?.kind).toBe('material');
  });

  it('encomenda vira carga', () => {
    expect(readIntent('transportar mercadorias em palete').needs[0]?.kind).toBe('carga');
  });

  it('empilhadeira vira máquina', () => {
    expect(readIntent('preciso transportar uma empilhadeira').needs[0]?.kind).toBe('maquina');
  });

  it('acento escrito não muda o resultado', () => {
    expect(readIntent('mudança de apartamento').needs[0]?.kind).toBe('mudanca');
    expect(readIntent('mudanca de apartamento').needs[0]?.kind).toBe('mudanca');
  });
});

describe('readIntent — o que NÃO pode acontecer', () => {
  it('texto vazio não sugere nada', () => {
    expect(readIntent('').needs).toEqual([]);
    expect(readIntent('  ').needs).toEqual([]);
  });

  it('"descarga" não dispara "carga"', () => {
    // Casamento por palavra inteira. Sem ele, toda menção a carga e descarga
    // viraria sugestão de transporte de mercadoria.
    const r = readIntent('preciso de ajudante para descarga');
    expect(r.needs.find((n) => n.kind === 'carga')).toBeUndefined();
  });

  it('pista fraca sozinha não passa de meio caminho', () => {
    // "obra" tem peso 1: sugere, mas não com confiança de decidir sozinho.
    const r = readIntent('trabalho numa obra');
    expect(r.needs[0]?.confidence).toBeLessThan(0.5);
    expect(bestNeed(r)).toBeNull();
  });
});

describe('bestNeed — quando seguir sem perguntar', () => {
  it('termo decisivo autoriza seguir direto', () => {
    const need = bestNeed(readIntent('preciso de uma cacamba'));
    expect(need?.kind).toBe('entulho');
    expect(need?.confidence).toBe(1);
  });

  it('empate devolve null — perguntar é mais rápido que errar', () => {
    const reading = {
      needs: [
        {
          kind: 'carga' as const,
          service: 'frete' as const,
          label: '',
          confidence: 0.7,
          matched: [],
        },
        {
          kind: 'mudanca' as const,
          service: 'frete' as const,
          label: '',
          confidence: 0.7,
          matched: [],
        },
      ],
      hints: {},
    };
    expect(bestNeed(reading)).toBeNull();
  });

  it('devolve os termos que justificam a sugestão', () => {
    const need = bestNeed(readIntent('tenho entulho de demolicao no quintal'));
    expect(need?.matched).toContain('entulho');
    expect(need?.matched).toContain('demolicao');
  });
});

describe('extractHints — o que já dá para preencher sozinho', () => {
  it('lê tonelagem', () => {
    expect(extractHints('3 toneladas de entulho').tons).toBe(3);
    expect(extractHints('2,5 t de areia').tons).toBe(2.5);
  });

  it('lê volume em m³ nas formas que aparecem', () => {
    expect(extractHints('caçamba de 5m³').cubicMeters).toBe(5);
    expect(extractHints('preciso de 7 m3').cubicMeters).toBe(7);
    expect(extractHints('10 metros cubicos').cubicMeters).toBe(10);
  });

  it('lê ajudantes e limita a 4 — é o teto do pedido', () => {
    expect(extractHints('com 2 ajudantes').helpers).toBe(2);
    expect(extractHints('preciso de 9 carregadores').helpers).toBe(4);
  });

  it('reconhece urgência escrita', () => {
    expect(extractHints('preciso hoje').urgent).toBe(true);
    expect(extractHints('e urgente').urgent).toBe(true);
    expect(extractHints('semana que vem').urgent).toBeUndefined();
  });

  it('número sem unidade não vira pista', () => {
    const h = extractHints('rua 3 de maio 250');
    expect(h.tons).toBeUndefined();
    expect(h.cubicMeters).toBeUndefined();
  });

  it('volume em m³ sozinho puxa caçamba, que é como se vende', () => {
    const r = readIntent('preciso de 5 m3');
    expect(r.needs[0]?.kind).toBe('entulho');
    expect(r.hints.cubicMeters).toBe(5);
  });
});

describe('isNeedKind — guarda do segmento da URL', () => {
  it('aceita toda necessidade conhecida', () => {
    for (const k of NEED_KINDS) expect(isNeedKind(k)).toBe(true);
  });

  it('recusa o resto', () => {
    // `/pedido/<qualquer-coisa>` vem de link colado à mão e de robô de busca.
    for (const lixo of ['frete', 'Entulho', '', null, undefined, 42, {}]) {
      expect(isNeedKind(lixo)).toBe(false);
    }
  });

  it('toda necessidade tem rótulo e serviço — nenhuma tela cai em undefined', () => {
    for (const k of NEED_KINDS) {
      expect(NEED_LABEL[k]).toBeTruthy();
      expect(['frete', 'guincho', 'cacamba']).toContain(NEED_SERVICE[k]);
    }
  });
});
