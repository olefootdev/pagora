import { describe, it, expect } from 'vitest';
import {
  fitsCapacity,
  fitsBodyType,
  evaluateCandidate,
  matchFleet,
  explainEmptyResult,
  CAPACITY_SAFETY_MARGIN,
  type CandidateVehicle,
  type CargoRequirements,
} from './matching';
import type { HeldCredential, VehicleProfile } from './conformidade';

const profile = (over: Partial<VehicleProfile> = {}): VehicleProfile => ({
  pbtKg: 3000,
  capacityKg: 1000,
  bodyType: 'bau',
  hasTrailer: false,
  ...over,
});

const okCreds: HeldCredential[] = [
  { kind: 'cnh', status: 'verificado', expiresAt: null },
  { kind: 'crlv', status: 'verificado', expiresAt: null },
];

const candidate = (over: Partial<CandidateVehicle> = {}): CandidateVehicle => ({
  vehicleId: 'v1',
  providerId: 'p1',
  profile: profile(),
  credentials: okCreds,
  cnhCategory: 'B',
  ...over,
});

const cargo = (over: Partial<CargoRequirements> = {}): CargoRequirements => ({
  service: 'frete',
  ...over,
});

describe('fitsCapacity — margem de segurança', () => {
  it('aplica a folga de 10% sobre a capacidade declarada', () => {
    // 1000 kg de capacidade × 0.9 = 900 kg úteis
    expect(fitsCapacity(profile({ capacityKg: 1000 }), 900)).toBe(true);
    expect(fitsCapacity(profile({ capacityKg: 1000 }), 901)).toBe(false);
    expect(CAPACITY_SAFETY_MARGIN).toBe(0.9);
  });

  it('sem peso informado não descarta ninguém', () => {
    expect(fitsCapacity(profile(), null)).toBe(true);
    expect(fitsCapacity(profile(), undefined)).toBe(true);
  });

  it('sem capacidade cadastrada não dá para afirmar que cabe', () => {
    expect(fitsCapacity(profile({ capacityKg: null }), 500)).toBe(false);
  });
});

describe('fitsBodyType', () => {
  it('lista vazia aceita qualquer carroceria', () => {
    expect(fitsBodyType(profile({ bodyType: 'bau' }), [])).toBe(true);
    expect(fitsBodyType(profile({ bodyType: 'bau' }), null)).toBe(true);
  });

  it('filtra pela lista quando informada', () => {
    expect(fitsBodyType(profile({ bodyType: 'bau' }), ['bau', 'furgao'])).toBe(true);
    expect(fitsBodyType(profile({ bodyType: 'basculante' }), ['bau'])).toBe(false);
  });
});

describe('evaluateCandidate', () => {
  it('aprova candidato físico e regulatoriamente apto', () => {
    const r = evaluateCandidate(cargo({ weightKg: 500 }), candidate());
    expect(r.compatible).toBe(true);
  });

  it('recusa por capacidade e diz o motivo', () => {
    const r = evaluateCandidate(cargo({ weightKg: 5000 }), candidate());
    expect(r.compatible).toBe(false);
    if (!r.compatible) expect(r.reasons).toContain('capacidade_insuficiente');
  });

  it('distingue capacidade insuficiente de cadastro incompleto', () => {
    const r = evaluateCandidate(
      cargo({ weightKg: 500 }),
      candidate({ profile: profile({ capacityKg: null }) }),
    );
    expect(r.compatible).toBe(false);
    if (!r.compatible) expect(r.reasons).toContain('dados_veiculo_incompletos');
  });

  it('recusa por conformidade bloqueada', () => {
    const r = evaluateCandidate(
      cargo({ weightKg: 500 }),
      candidate({ credentials: [{ kind: 'cnh', status: 'verificado' }] }), // falta CRLV
    );
    expect(r.compatible).toBe(false);
    if (!r.compatible) expect(r.reasons).toContain('conformidade_bloqueada');
  });

  it('caçamba exige licença no município do PEDIDO', () => {
    const semLicenca = evaluateCandidate(
      cargo({ service: 'cacamba', municipality: 'Guarulhos' }),
      candidate({ licensedMunicipalities: ['São Paulo'] }),
    );
    expect(semLicenca.compatible).toBe(false);
    if (!semLicenca.compatible)
      expect(semLicenca.reasons).toContain('licenca_municipal_ausente');

    const comLicenca = evaluateCandidate(
      cargo({ service: 'cacamba', municipality: 'São Paulo' }),
      candidate({
        licensedMunicipalities: ['São Paulo'],
        credentials: [...okCreds, { kind: 'licenca_residuos', status: 'verificado' }],
      }),
    );
    expect(comLicenca.compatible).toBe(true);
  });

  it('acumula múltiplos motivos em vez de parar no primeiro', () => {
    const r = evaluateCandidate(
      cargo({ weightKg: 9000, acceptableBodyTypes: ['basculante'] }),
      candidate({ credentials: [] }),
    );
    expect(r.compatible).toBe(false);
    if (!r.compatible) {
      expect(r.reasons).toContain('capacidade_insuficiente');
      expect(r.reasons).toContain('carroceria_incompativel');
      expect(r.reasons).toContain('conformidade_bloqueada');
    }
  });
});

describe('matchFleet', () => {
  it('separa compatíveis de recusados e conta os motivos', () => {
    const report = matchFleet(cargo({ weightKg: 800 }), [
      candidate({ vehicleId: 'ok', profile: profile({ capacityKg: 2000 }) }),
      candidate({ vehicleId: 'pequeno', profile: profile({ capacityKg: 500 }) }),
      candidate({ vehicleId: 'sem-doc', profile: profile({ capacityKg: 2000 }), credentials: [] }),
    ]);

    expect(report.compatible.map((c) => c.vehicleId)).toEqual(['ok']);
    expect(report.rejected).toHaveLength(2);
    expect(report.rejectionBreakdown.capacidade_insuficiente).toBe(1);
    expect(report.rejectionBreakdown.conformidade_bloqueada).toBe(1);
  });

  it('frota vazia devolve relatório vazio sem explodir', () => {
    const report = matchFleet(cargo(), []);
    expect(report.compatible).toEqual([]);
    expect(report.rejected).toEqual([]);
  });
});

describe('explainEmptyResult', () => {
  it('não explica nada quando há compatíveis', () => {
    const report = matchFleet(cargo({ weightKg: 100 }), [candidate()]);
    expect(explainEmptyResult(report)).toBe('');
  });

  it('distingue "sem prestador cadastrado" de "nenhum compatível"', () => {
    const vazio = matchFleet(cargo(), []);
    expect(explainEmptyResult(vazio)).toContain('cadastrados');
  });

  it('explica capacidade com saída acionável para o cliente', () => {
    const report = matchFleet(cargo({ weightKg: 9000 }), [candidate()]);
    const msg = explainEmptyResult(report);
    expect(msg).toContain('menores que a sua carga');
    expect(msg).toContain('dividir');
  });

  it('explica falta de licença municipal na caçamba', () => {
    const report = matchFleet(cargo({ service: 'cacamba', municipality: 'Osasco' }), [
      candidate({ licensedMunicipalities: ['São Paulo'] }),
    ]);
    expect(explainEmptyResult(report)).toContain('município');
  });
});
