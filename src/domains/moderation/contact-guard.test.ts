import { describe, it, expect } from 'vitest';
import { guardMessage, normalizeDigits } from './contact-guard';

const bloqueia = (t: string) => guardMessage(t).blocked;
const tipos = (t: string) => [...new Set(guardMessage(t).findings.map((f) => f.kind))].sort();

// =====================================================================
// O bloco que mais importa. Um filtro que bloqueia conversa legítima é pior
// que filtro nenhum: a pessoa desiste do chat e vai combinar por fora — que é
// exatamente o que o ponto 9 quer evitar. Estes casos são o contrato.
// =====================================================================
describe('conversa legítima de frete precisa passar', () => {
  const legitimas = [
    'Chego às 14:30, pode ser?',
    'São 20 caixas e 3 móveis grandes.',
    'Apartamento 401, bloco 2, terceiro andar.',
    'O elevador tem 1,20m de largura.',
    'Consigo fazer por R$ 450,00 à vista.',
    'Rua das Acácias, 1523 — perto do mercado.',
    'Levo 2 ajudantes, chegamos entre 8h e 9h.',
    'A geladeira tem 180cm de altura e pesa uns 90kg.',
    'São 15 sacos de cimento de 50kg cada.',
    'Pedido #PG-1247 confirmado.',
    'Tenho disponibilidade dia 12, 13 e 14 de março.',
    'Meu caminhão é de 3,5 toneladas.',
    'Pode ser 7h da manhã?',
    'CPF do contrato é o que está no cadastro.',
    'Consigo no dia 01/03/2026.',
    'Fica pra 12-03 então.',
    'Pode ser 5.4.26?',
    'Entre 01/03 e 05/03 tenho agenda.',
  ];

  it.each(legitimas)('passa: %s', (msg) => {
    const v = guardMessage(msg);
    expect(v.blocked, `bloqueou indevidamente: ${JSON.stringify(v.findings)}`).toBe(false);
  });
});

describe('o veredito não pode depender do que vem depois dos dígitos', () => {
  // Regressão do bug encontrado durante a implementação: separador sobrando no
  // fim do bloco entrava na contagem, então a mesma sequência bloqueava ou não
  // conforme houvesse uma palavra em seguida.
  it.each([
    ['11987654321', '11987654321 me liga'],
    ['(11) 98765-4321', '(11) 98765-4321.'],
    ['98765-4321', '98765-4321 '],
  ])('%s e "%s" têm o mesmo veredito', (sozinho, comSufixo) => {
    expect(guardMessage(sozinho).blocked).toBe(guardMessage(comSufixo).blocked);
  });

  it('data mascarada não vira telefone com nem sem sufixo', () => {
    expect(bloqueia('01/03/2026')).toBe(false);
    expect(bloqueia('01/03/2026 fechado')).toBe(false);
  });
});

describe('a exceção de data não pode virar brecha', () => {
  it('telefone com pontos continua bloqueado apesar de parecer data no miolo', () => {
    // "11.9.8765.4321" contém "11.9.8765", que sem as âncoras seria lido como
    // data e sairia mascarado — o telefone passaria inteiro.
    expect(bloqueia('11.9.8765.4321')).toBe(true);
  });

  it('telefone com hífen não é confundido com data', () => {
    expect(bloqueia('11-98765-4321')).toBe(true);
  });
});

describe('telefone em formato normal', () => {
  const formatos = [
    '11987654321',
    '(11) 98765-4321',
    '11 98765-4321',
    '11 9 8765 4321',
    '+55 11 98765 4321',
    '98765-4321',
    '3456-7890',
    'me liga no 11987654321',
    'anota aí: (011) 98765.4321',
  ];

  it.each(formatos)('bloqueia: %s', (msg) => {
    expect(bloqueia(msg)).toBe(true);
    expect(tipos(msg)).toContain('phone');
  });
});

describe('evasão', () => {
  it('dígitos espalhados um a um', () => {
    expect(bloqueia('1 1 9 8 7 6 5 4 3 2 1')).toBe(true);
  });

  it('dígitos separados por ponto', () => {
    expect(bloqueia('11.9.8765.4321')).toBe(true);
  });

  it('telefone ditado por extenso', () => {
    expect(bloqueia('meu numero e um um nove oito sete seis cinco quatro tres dois um')).toBe(true);
  });

  it('"meia" conta como seis — é como brasileiro dita telefone', () => {
    expect(bloqueia('nove oito sete meia cinco quatro tres dois')).toBe(true);
  });

  it('dígitos fullwidth', () => {
    expect(bloqueia('１１９８７６５４３２１')).toBe(true);
  });

  it('dígitos árabe-índicos', () => {
    expect(bloqueia('١١٩٨٧٦٥٤٣٢١')).toBe(true);
  });
});

describe('e-mail', () => {
  it('formato comum', () => {
    expect(tipos('me manda em carlos@gmail.com')).toContain('email');
  });

  it('escrito por extenso para escapar do regex', () => {
    expect(bloqueia('carlos arroba gmail ponto com')).toBe(true);
  });
});

describe('link', () => {
  it.each([
    'https://wa.me/5511987654321',
    'www.meusite.com.br',
    'olha em meusite.com',
    'bit.ly/abc123',
    't.me/carlos',
  ])('bloqueia: %s', (msg) => {
    expect(bloqueia(msg)).toBe(true);
  });
});

describe('perfil de rede social', () => {
  it('bloqueia @usuario', () => {
    expect(tipos('me acha no @carlosmudancas')).toContain('handle');
  });

  it('não confunde e-mail com handle solto', () => {
    // "@gmail" dentro do e-mail não deve gerar um achado de handle separado
    // que faça a mensagem ao usuário falar de rede social em vez de e-mail.
    expect(guardMessage('carlos@gmail.com').reason).toMatch(/e-mail/i);
  });
});

describe('mensagem ao usuário', () => {
  it('explica o motivo e o porquê, sem culpar', () => {
    const v = guardMessage('me liga 11987654321');
    expect(v.reason).toContain('telefone');
    expect(v.reason).toContain('divergência');
  });

  it('telefone tem precedência quando há mais de um tipo', () => {
    const v = guardMessage('11987654321 ou carlos@gmail.com');
    expect(v.reason).toMatch(/telefone/i);
    expect(v.findings.length).toBeGreaterThan(1);
  });

  it('mensagem limpa não tem motivo', () => {
    expect(guardMessage('Chego em 20 minutos').reason).toBeNull();
  });
});

describe('normalizeDigits', () => {
  it('converte fullwidth para ASCII', () => {
    expect(normalizeDigits('９８７')).toBe('987');
  });

  it('converte árabe-índico para ASCII', () => {
    expect(normalizeDigits('٩٨٧')).toBe('987');
  });

  it('não mexe em texto comum', () => {
    expect(normalizeDigits('Chego às 14:30')).toBe('Chego às 14:30');
  });
});

describe('achados alimentam a fila de moderação', () => {
  it('guarda o trecho exato que disparou', () => {
    const v = guardMessage('liga (11) 98765-4321 depois');
    expect(v.findings[0]?.match).toContain('98765');
  });

  it('reporta todos os achados, não só o primeiro', () => {
    const v = guardMessage('11987654321 e carlos@gmail.com e bit.ly/x');
    expect(new Set(v.findings.map((f) => f.kind)).size).toBeGreaterThanOrEqual(3);
  });
});

// =====================================================================
// Falsos positivos aceitos de propósito. Não são bugs esquecidos: cada um foi
// pesado contra o buraco que a exceção abriria, e a decisão foi bloquear.
// Se algum incomodar de verdade em produção, o conserto é uma linha — mas
// que seja decisão consciente, com este teste mudando junto.
// =====================================================================
describe('trade-offs conhecidos', () => {
  it('CEP é bloqueado', () => {
    // 8 dígitos com um separador. Liberar a forma 5-3 abriria espaço para
    // telefone escrito como 5-3, e o endereço já está no pedido: não há razão
    // para repetir CEP no chat.
    expect(bloqueia('meu cep é 01310-100')).toBe(true);
  });

  it('data separada por espaço é bloqueada', () => {
    // A máscara cobre "/", "." e "-", que é como quase todo mundo escreve.
    // "12 03 2026" fica de fora e cai na regra forte.
    expect(bloqueia('dia 12 03 2026')).toBe(true);
  });

  it('lista longa de quantidades é bloqueada', () => {
    // Oito dígitos com três separadores tem exatamente a forma de telefone.
    // Frase construída, mas honesta: bloqueia.
    expect(bloqueia('levo 15 20 30 40')).toBe(true);
  });
});
