import { describe, it, expect } from 'vitest';
import { hoursUntil, slaLabel } from './dispute.service';

const AGORA = new Date('2026-08-26T10:00:00.000Z').getTime();
const daquiA = (horas: number) => new Date(AGORA + horas * 3_600_000).toISOString();

describe('hoursUntil', () => {
  it('conta as horas que faltam', () => {
    expect(hoursUntil(daquiA(24), AGORA)).toBeCloseTo(24);
    expect(hoursUntil(daquiA(0.5), AGORA)).toBeCloseTo(0.5);
  });

  it('prazo vencido é negativo, não zero', () => {
    // Zerar esconderia HÁ QUANTO tempo venceu, que é o que o admin precisa.
    expect(hoursUntil(daquiA(-3), AGORA)).toBeCloseTo(-3);
  });
});

describe('slaLabel', () => {
  it('acima de uma hora, conta em horas', () => {
    expect(slaLabel(daquiA(24), AGORA)).toBe('Faltam 24 h para responder');
    expect(slaLabel(daquiA(2.4), AGORA)).toBe('Faltam 2 h para responder');
  });

  it('abaixo de uma hora, conta em minutos — "faltam 0 h" não apressa ninguém', () => {
    expect(slaLabel(daquiA(0.5), AGORA)).toBe('Faltam 30 min para responder');
  });

  it('nunca diz "faltam 0 min" enquanto ainda dá tempo', () => {
    // Um segundo é pouco, mas não é nada: arredondar para baixo diria que o
    // prazo acabou quando ele não acabou.
    expect(slaLabel(new Date(AGORA + 1000).toISOString(), AGORA)).toBe(
      'Faltam 1 min para responder',
    );
  });

  it('vencido diz que venceu, sem número negativo na tela', () => {
    expect(slaLabel(daquiA(-1), AGORA)).toBe('Prazo encerrado');
    expect(slaLabel(daquiA(0), AGORA)).toBe('Prazo encerrado');
  });
});
