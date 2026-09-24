import { describe, it, expect } from 'vitest';
import {
  minimumCNH,
  cnhCovers,
  requirementsFor,
  evaluateCheck,
  licenseCoversMunicipality,
  checkSummary,
  RNTRC_PBT_THRESHOLD_KG,
  type HeldCredential,
  type OperationContext,
  type VehicleProfile,
} from './conformidade';

const vehicle = (over: Partial<VehicleProfile> = {}): VehicleProfile => ({
  pbtKg: 3000,
  capacityKg: 1500,
  bodyType: 'bau',
  hasTrailer: false,
  ...over,
});

const ctx = (over: Partial<OperationContext> = {}): OperationContext => ({
  service: 'frete',
  remunerated: true,
  ...over,
});

const verified = (kind: HeldCredential['kind'], expiresAt?: string): HeldCredential => ({
  kind,
  status: 'verificado',
  expiresAt: expiresAt ?? null,
});

describe('minimumCNH — CTB art. 143', () => {
  it('moto exige A', () => {
    expect(minimumCNH(vehicle({ bodyType: 'moto' }))).toBe('A');
  });

  it('até 3.500 kg de PBT exige B', () => {
    expect(minimumCNH(vehicle({ pbtKg: 3500 }))).toBe('B');
    expect(minimumCNH(vehicle({ pbtKg: 1200 }))).toBe('B');
  });

  it('acima de 3.500 kg exige C', () => {
    expect(minimumCNH(vehicle({ pbtKg: 3501 }))).toBe('C');
    expect(minimumCNH(vehicle({ pbtKg: 12000 }))).toBe('C');
  });

  it('cavalo mecânico exige E independente do PBT isolado', () => {
    expect(minimumCNH(vehicle({ bodyType: 'cavalo_mecanico', pbtKg: 8000 }))).toBe('E');
  });

  it('reboque acima de 6.000 kg exige E', () => {
    expect(minimumCNH(vehicle({ pbtKg: 6001, hasTrailer: true }))).toBe('E');
  });

  it('sem PBT não afirma nada', () => {
    expect(minimumCNH(vehicle({ pbtKg: null }))).toBeNull();
  });
});

describe('cnhCovers — abrangência', () => {
  it('E habilita C e B', () => {
    expect(cnhCovers('E', 'C')).toBe(true);
    expect(cnhCovers('E', 'B')).toBe(true);
  });

  it('B não habilita C', () => {
    expect(cnhCovers('B', 'C')).toBe(false);
  });

  it('categoria combinada vale pela mais abrangente', () => {
    expect(cnhCovers('AE', 'C')).toBe(true);
    expect(cnhCovers('AB', 'C')).toBe(false);
  });

  it('moto é requisito disjunto — C não habilita A', () => {
    expect(cnhCovers('C', 'A')).toBe(false);
    expect(cnhCovers('AC', 'A')).toBe(true);
  });

  it('CNH ausente nunca cobre', () => {
    expect(cnhCovers(null, 'B')).toBe(false);
    expect(cnhCovers('', 'B')).toBe(false);
  });
});

describe('requirementsFor — os três regimes regulatórios', () => {
  it('FRETE acima do limiar exige RNTRC e vínculo de frota', () => {
    const reqs = requirementsFor(ctx(), vehicle({ pbtKg: RNTRC_PBT_THRESHOLD_KG + 1 }));
    const kinds = reqs.map((r) => r.kind);
    expect(kinds).toContain('rntrc');
    expect(kinds).toContain('antt_frota');
  });

  it('FRETE abaixo do limiar NÃO exige RNTRC', () => {
    // É a regra que o cliente pediu: não exigir indiscriminadamente.
    const reqs = requirementsFor(ctx(), vehicle({ pbtKg: RNTRC_PBT_THRESHOLD_KG - 1 }));
    expect(reqs.map((r) => r.kind)).not.toContain('rntrc');
  });

  it('CAÇAMBA exige licença municipal de resíduos e NÃO exige RNTRC', () => {
    // A descoberta que muda o desenho: RNTRC é o documento errado aqui.
    const reqs = requirementsFor(ctx({ service: 'cacamba' }), vehicle({ pbtKg: 16000 }));
    const kinds = reqs.map((r) => r.kind);
    expect(kinds).toContain('licenca_residuos');
    expect(kinds).not.toContain('rntrc');
  });

  it('GUINCHO exige autorização de socorro, não RNTRC', () => {
    const reqs = requirementsFor(ctx({ service: 'guincho' }), vehicle({ pbtKg: 8000 }));
    const kinds = reqs.map((r) => r.kind);
    expect(kinds).toContain('autorizacao_socorro');
    expect(kinds).not.toContain('rntrc');
  });

  it('GUINCHO com prancha volta a exigir RNTRC (veículo como carga)', () => {
    const reqs = requirementsFor(
      ctx({ service: 'guincho' }),
      vehicle({ bodyType: 'prancha', pbtKg: 9000 }),
    );
    expect(reqs.map((r) => r.kind)).toContain('rntrc');
  });

  it('CNH e CRLV são exigidos nos três serviços', () => {
    for (const service of ['frete', 'guincho', 'cacamba'] as const) {
      const kinds = requirementsFor(ctx({ service }), vehicle()).map((r) => r.kind);
      expect(kinds).toContain('cnh');
      expect(kinds).toContain('crlv');
    }
  });
});

describe('evaluateCheck — decisão', () => {
  const smallFrete = vehicle({ pbtKg: 3000 }); // abaixo do limiar: sem RNTRC

  it('aprova e libera o selo quando todo obrigatório está verificado', () => {
    const r = evaluateCheck(ctx(), smallFrete, [verified('cnh'), verified('crlv')]);
    expect(r.status).toBe('aprovado');
    expect(r.badge).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it('bloqueia com obrigatório de confiança alta ausente', () => {
    const r = evaluateCheck(ctx(), smallFrete, [verified('cnh')]); // falta CRLV
    expect(r.status).toBe('bloqueado');
    expect(r.badge).toBe(false);
    expect(r.missing.map((m) => m.kind)).toContain('crlv');
  });

  it('bloqueia com credencial vencida', () => {
    const ontem = new Date(Date.now() - 86400_000).toISOString();
    const r = evaluateCheck(ctx(), smallFrete, [verified('cnh', ontem), verified('crlv')]);
    expect(r.status).toBe('bloqueado');
    expect(r.expired.map((e) => e.kind)).toContain('cnh');
  });

  it('bloqueia com credencial rejeitada na triagem', () => {
    const r = evaluateCheck(ctx(), smallFrete, [
      { kind: 'cnh', status: 'rejeitado' },
      verified('crlv'),
    ]);
    expect(r.status).toBe('bloqueado');
    expect(r.rejected.map((x) => x.kind)).toContain('cnh');
  });

  it('fica pendente (não bloqueado) com documento em análise', () => {
    const r = evaluateCheck(ctx(), smallFrete, [
      { kind: 'cnh', status: 'pendente' },
      verified('crlv'),
    ]);
    expect(r.status).toBe('pendente');
    expect(r.badge).toBe(false);
  });

  it('regra verificar_juridico NÃO bloqueia — vira triagem', () => {
    // Um caminhão grande sem RNTRC cadastrado não pode ser barrado por uma
    // regra que ainda não foi confirmada com o jurídico.
    const bigFrete = vehicle({ pbtKg: 20000 });
    const r = evaluateCheck(ctx(), bigFrete, [verified('cnh'), verified('crlv')]);
    expect(r.status).toBe('pendente');
    expect(r.needsLegalReview.map((x) => x.kind)).toContain('rntrc');
    expect(r.missing).toEqual([]); // não caiu em "faltando", caiu em revisão
  });

  it('avisa de vencimento próximo sem bloquear', () => {
    const em10dias = new Date(Date.now() + 10 * 86400_000).toISOString();
    const r = evaluateCheck(ctx(), smallFrete, [verified('cnh', em10dias), verified('crlv')]);
    expect(r.status).toBe('aprovado');
    expect(r.expiringSoon.map((x) => x.kind)).toContain('cnh');
  });

  it('ignora nível recomendado na decisão', () => {
    // RC-DC é recomendado no frete — sua ausência não pode derrubar ninguém.
    const r = evaluateCheck(ctx(), smallFrete, [verified('cnh'), verified('crlv')]);
    expect(r.status).toBe('aprovado');
    expect([...r.missing, ...r.needsLegalReview].map((x) => x.kind)).not.toContain('seguro_rcdc');
  });
});

describe('licenseCoversMunicipality', () => {
  it('compara ignorando acento e caixa', () => {
    expect(licenseCoversMunicipality(['São Paulo'], 'sao paulo')).toBe(true);
    expect(licenseCoversMunicipality(['sao paulo'], 'São Paulo')).toBe(true);
  });

  it('licença em São Paulo não cobre Guarulhos', () => {
    expect(licenseCoversMunicipality(['São Paulo'], 'Guarulhos')).toBe(false);
  });

  it('sem licença ou sem município não cobre', () => {
    expect(licenseCoversMunicipality([], 'São Paulo')).toBe(false);
    expect(licenseCoversMunicipality(null, 'São Paulo')).toBe(false);
    expect(licenseCoversMunicipality(['São Paulo'], null)).toBe(false);
  });
});

describe('checkSummary', () => {
  it('resume aprovado com o selo', () => {
    const r = evaluateCheck(ctx(), vehicle({ pbtKg: 3000 }), [verified('cnh'), verified('crlv')]);
    expect(checkSummary(r)).toContain('PAGORA CHECK');
  });

  it('resume pendência com contagem', () => {
    const r = evaluateCheck(ctx(), vehicle({ pbtKg: 3000 }), [verified('cnh')]);
    expect(checkSummary(r)).toContain('1 item');
  });
});
