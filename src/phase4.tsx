// =====================================================================
// FASE 4 PRESTADOR — Onboarding
// =====================================================================
import { useState as useStateP4, useMemo as useMemoP4 } from 'react';
import { Icon } from './icons';
import { StatusBar as SBp4, TopBar as TBp4 } from './core';
import type { ScreenProps } from './types';
import { parsePlate, PLATE_ERROR_MESSAGES, plateKey, formatPlate } from './lib/placa';
import { minimumCNH, cnhCovers, type BodyType } from './lib/conformidade';
import { isValidCPF, formatCPF } from './lib/documentos';
import { ExigenciasPreview } from './exigencias';
import { supabase } from './lib/supabase';
import { track } from './lib/analytics';
import type { ServiceType } from './lib/database.types';

const SERVICE_ENUM: readonly ServiceType[] = ['frete', 'guincho', 'cacamba'];
const isServiceType = (id: string): id is ServiceType =>
  (SERVICE_ENUM as readonly string[]).includes(id);

type ProvData = {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  cnh: string;
  cnhCat: string;
  plate: string;
  model: string;
  year: string;
  color: string;
  bodyType: string;
  capacity: number;
  /**
   * Peso Bruto Total. Campo novo e não redundante com `capacity`: capacidade é
   * carga útil, PBT é veículo carregado. Quem define categoria de CNH e
   * exigência de RNTRC é o PBT — sem ele, conformidade.ts não tem o que avaliar.
   */
  pbt: number;
  /** Serviços que o candidato presta. Coluna NOT NULL em provider_applications. */
  services: string[];
  /** Região de atuação, texto livre. Também NOT NULL na tabela. */
  regions: string;
};

// Dados bancários e upload de documento saíram deste formulário de propósito.
//
// Banco/agência/conta/Pix: o candidato só recebe depois de ter pedido
// concluído, o que exige aprovação e login. Guardar dado de pagamento de quem
// ainda não foi aprovado é passivo sem contrapartida — e numa tabela que
// aceita INSERT anônimo. `providers` já tem essas colunas desde a 0001, e é lá
// que entram, com o prestador autenticado escrevendo na própria linha.
//
// Selfie e documento: o upload não existe (falta Storage). Marcar
// `selfie = true` sem arquivo por trás registraria uma verificação que não
// aconteceu — exatamente o que o PAGORA CHECK existe para evitar.

// Mapeia o rótulo do select para a carroceria que a matriz de conformidade
// entende. Mantido aqui, junto do select, para que mexer nas opções da tela
// force olhar para este mapa — se ficasse em conformidade.ts, uma opção nova
// cairia silenciosamente em 'outro'.
const BODY_TYPE_BY_LABEL: Record<string, BodyType> = {
  'Van pequena': 'van',
  'Van média': 'van',
  'Caminhão 3/4': 'bau',
  'Caminhão Toco': 'carroceria',
  'Guincho prancha': 'prancha',
  'Guincho asa-delta': 'lanca',
  'Caminhão caçamba': 'basculante',
};

// ---------------------------------------------------------------------
// CADASTRO MULTI-STEP — 5 passos
// ---------------------------------------------------------------------
const ProvSignup = ({ go }: ScreenProps) => {
  const [step, setStep] = useStateP4<number>(1);
  const [data, setData] = useStateP4<ProvData>({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    cnh: '',
    cnhCat: 'B',
    plate: '',
    model: '',
    year: '',
    color: '',
    bodyType: 'Van pequena',
    capacity: 800,
    pbt: 3500,
    services: [],
    regions: '',
  });
  const [status, setStatus] = useStateP4<'idle' | 'sending' | 'err'>('idle');
  const [errorMsg, setErrorMsg] = useStateP4('');
  const update = <K extends keyof ProvData>(k: K, v: ProvData[K]) =>
    setData((d) => ({ ...d, [k]: v }));
  const toggleService = (id: string) =>
    update(
      'services',
      data.services.includes(id)
        ? data.services.filter((x) => x !== id)
        : [...data.services, id],
    );
  const total = 4;

  // Placa só é avaliada depois que o prestador digitou os 7 caracteres. Gritar
  // "inválida" no segundo caractere é hostil e não ajuda ninguém.
  const plateCheck = useMemoP4(() => {
    const raw = data.plate.replace(/[^A-Za-z0-9]/g, '');
    if (raw.length < 7) return null;
    return parsePlate(data.plate);
  }, [data.plate]);

  // CNH declarada no passo 2 × veículo descrito no passo 3. Pegar a
  // incompatibilidade aqui evita uma recusa na análise por algo que o
  // prestador poderia ter corrigido em 5 segundos.
  const cnhCheck = useMemoP4(() => {
    const required = minimumCNH({
      pbtKg: data.pbt,
      capacityKg: data.capacity,
      bodyType: BODY_TYPE_BY_LABEL[data.bodyType] ?? 'outro',
      hasTrailer: false,
    });
    if (!required) return null;
    return { required, ok: cnhCovers(data.cnhCat, required) };
  }, [data.pbt, data.capacity, data.bodyType, data.cnhCat]);

  // Trava só o passo do veículo, e só por placa inválida. PBT e CNH geram
  // aviso, não bloqueio: são corrigíveis na análise e travar o cadastro por
  // eles perderia prestador por excesso de rigor.
  // CPF é validado por dígito verificador, sem consultar ninguém. Só avalia
  // depois dos 11 dígitos, pela mesma razão da placa.
  const cpfCheck = useMemoP4(() => {
    const d = data.cpf.replace(/\D/g, '');
    if (d.length < 11) return null;
    return isValidCPF(d);
  }, [data.cpf]);

  const titles = ['Vamos começar', 'CNH e habilitação', 'Seu veículo', 'Onde você atende'];
  const subs = [
    'Conte quem você é e o que você faz',
    'Precisamos verificar sua habilitação',
    'Conte-nos sobre o veículo de trabalho',
    'Última etapa: sua região de atuação',
  ];

  const canAdvance = (() => {
    if (status === 'sending') return false;
    // Passo 1: nome, telefone e ao menos um serviço são obrigatórios na tabela.
    // CPF inválido trava porque ele vira chave de consulta ao RNTRC depois.
    if (step === 1) {
      return (
        data.name.trim().length > 2 &&
        data.phone.replace(/\D/g, '').length >= 10 &&
        data.services.some(isServiceType) &&
        cpfCheck !== false
      );
    }
    // Passo 3: só placa malformada trava. PBT e CNH geram aviso — são
    // corrigíveis na análise, e travar por eles perderia prestador por excesso
    // de rigor.
    if (step === 3) return plateCheck === null || plateCheck.ok;
    if (step === 4) return data.regions.trim().length > 2;
    return true;
  })();

  // ---------------------------------------------------------------------
  // Envio
  // ---------------------------------------------------------------------
  // Destino é `provider_applications`, NÃO `providers`. A 0004 explica: o
  // candidato ainda não tem conta, e `providers.profile_id` referencia
  // `auth.users`. Esta tabela é a caixa de entrada pública; o admin aprova e
  // só então o fluxo migra.
  const submit = async () => {
    if (status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const services = data.services.filter(isServiceType);
      if (services.length === 0) {
        setStatus('err');
        setErrorMsg('Selecione ao menos um serviço no primeiro passo.');
        return;
      }

      const phone = data.phone.trim();
      const cpfDigits = data.cpf.replace(/\D/g, '') || null;

      // Não há checagem de duplicata aqui de propósito.
      //
      // `provider_applications` tem RLS forçado e ZERO policy de SELECT: um
      // `select ... where phone = ...` como anon sempre volta vazio, por mais
      // duplicatas que existam. O formulário curto em other.tsx faz essa
      // consulta e ela nunca encontrou nada — código morto que dá falsa
      // sensação de proteção.
      //
      // Quem realmente barra é o trigger `enforce_public_form_rate_limit`
      // (migration hardening_public_forms): 5 envios por IP e 3 por telefone
      // a cada hora. Ele roda dentro do banco, onde enxerga as linhas, e é
      // tratado no catch abaixo.

      const parsed = parsePlate(data.plate);
      const { error } = await supabase.from('provider_applications').insert({
        full_name: data.name.trim(),
        phone,
        email: data.email.trim() || null,
        services,
        regions: data.regions.trim(),
        // `vehicle` é a coluna legada em texto livre, mantida para o admin que
        // já lê a fila do formulário curto no mesmo lugar.
        vehicle: [data.bodyType, data.model, data.year].filter(Boolean).join(' · ') || null,
        cpf: cpfDigits,
        cnh_number: data.cnh.replace(/\D/g, '') || null,
        cnh_category: data.cnhCat || null,
        plate: parsed.ok ? parsed.plate : data.plate.trim() || null,
        // Forma canônica Mercosul: é o que permite deduplicar o mesmo caminhão
        // cadastrado em formatos diferentes.
        plate_key: plateKey(data.plate),
        vehicle_model: data.model.trim() || null,
        vehicle_year: data.year ? Number(data.year) : null,
        vehicle_color: data.color.trim() || null,
        body_type: BODY_TYPE_BY_LABEL[data.bodyType] ?? 'outro',
        pbt_kg: data.pbt || null,
        capacity_kg: data.capacity || null,
        source: 'onboarding-completo',
        user_agent:
          typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
      });
      if (error) throw error;

      track('prestador_cadastrado', {
        tipo: services.join(','),
        regiao: data.regions.trim(),
        origem: 'onboarding-completo',
      });
      go('provider-confirm');
    } catch (err) {
      setStatus('err');
      const bruto = err instanceof Error ? err.message : '';
      // O trigger de rate limit devolve uma mensagem técnica. Traduzir aqui
      // evita mostrar "rate_limit_exceeded" para um caminhoneiro.
      setErrorMsg(
        bruto.includes('rate_limit_exceeded')
          ? 'Já recebemos um cadastro com esse telefone há pouco. Aguarde nosso retorno no WhatsApp.'
          : bruto || 'Não conseguimos enviar. Verifique sua conexão e tente novamente.',
      );
    }
  };

  const next = () => (step < total ? setStep(step + 1) : submit());
  const back = () => (step > 1 ? setStep(step - 1) : go('provider-landing'));

  return (
    <div className="pg-screen" data-screen-label={`P4-1.${step} Cadastro prestador`}>
      <SBp4 />
      <TBp4 onBack={back} title={`Passo ${step} de ${total}`} />

      {/* progress bar */}
      <div
        style={{
          background: 'var(--paper)',
          padding: '0 20px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="pg-row" style={{ gap: 4 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i < step ? 'var(--green-500)' : 'var(--ink-200)',
                transition: 'background 200ms',
              }}
            />
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="pg-h-eyebrow" style={{ margin: 0, color: 'var(--green-700)' }}>
            ETAPA {step}/{total}
          </div>
          <h1
            style={{ fontSize: 24, fontWeight: 700, margin: '4px 0 4px', letterSpacing: '-0.02em' }}
          >
            {titles[step - 1]}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: 0 }}>{subs[step - 1]}</p>
        </div>
      </div>

      <div className="pg-viewport" style={{ paddingBottom: 100 }}>
        <div style={{ padding: 20 }}>
          {step === 1 && (
            <div className="pg-stack">
              <div className="pg-field">
                <label className="pg-label">Nome completo</label>
                <input
                  className="pg-input"
                  placeholder="João da Silva"
                  value={data.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>
              <div className="pg-field">
                <label className="pg-label">CPF</label>
                <input
                  className="pg-input"
                  placeholder="000.000.000-00"
                  value={formatCPF(data.cpf)}
                  onChange={(e) => update('cpf', e.target.value.replace(/\D/g, '').slice(0, 11))}
                  inputMode="numeric"
                  aria-invalid={cpfCheck === false}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    borderColor:
                      cpfCheck === false
                        ? 'var(--danger)'
                        : cpfCheck === true
                          ? 'var(--green-500)'
                          : undefined,
                  }}
                />
                {cpfCheck === false && (
                  <span className="pg-helper is-error">
                    CPF inválido — confira os números digitados.
                  </span>
                )}
                {cpfCheck === true && (
                  <span className="pg-helper" style={{ color: 'var(--green-700)' }}>
                    CPF válido
                  </span>
                )}
              </div>
              <div className="pg-field">
                <label className="pg-label">Telefone (WhatsApp)</label>
                <input
                  className="pg-input"
                  placeholder="(11) 99999-9999"
                  value={data.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <div className="pg-field">
                <label className="pg-label">Email</label>
                <input
                  className="pg-input"
                  type="email"
                  placeholder="seu@email.com"
                  value={data.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              </div>
              <div className="pg-field">
                <label className="pg-label">Que serviços você presta?</label>
                <div className="pg-stack pg-stack--sm" style={{ marginTop: 4 }}>
                  {[
                    { id: 'frete', icon: 'truck', t: 'Frete / Mudança' },
                    { id: 'guincho', icon: 'tow', t: 'Guincho' },
                    { id: 'cacamba', icon: 'dumpster', t: 'Caçamba' },
                  ].map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggleService(o.id)}
                      className={`pg-choice${data.services.includes(o.id) ? ' is-active' : ''}`}
                    >
                      <span className="pg-choice-bullet is-square" />
                      <span
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: data.services.includes(o.id)
                            ? 'rgba(255,255,255,0.1)'
                            : 'var(--ink-100)',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <Icon name={o.icon} size={16} />
                      </span>
                      <div className="pg-choice-body">
                        <div className="pg-choice-title" style={{ fontSize: 15 }}>
                          {o.t}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reaproveita o mesmo componente do formulário curto: o candidato
                  vê o que vão pedir antes de investir os 4 passos. */}
              <ExigenciasPreview services={data.services} />

              <div
                className="pg-card pg-card--soft"
                style={{ padding: 14, fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.5 }}
              >
                <Icon name="lock" size={14} color="currentColor" /> Seus dados são criptografados. A
                PAGORA nunca compartilha CPF ou contato com terceiros.
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="pg-stack">
              <div className="pg-field">
                <label className="pg-label">Número de registro CNH</label>
                <input
                  className="pg-input"
                  placeholder="00000000000"
                  value={data.cnh}
                  onChange={(e) => update('cnh', e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <div className="pg-field">
                <label className="pg-label">Categoria</label>
                <div className="pg-row" style={{ gap: 8 }}>
                  {['A', 'B', 'C', 'D', 'E'].map((c) => (
                    <button
                      key={c}
                      onClick={() => update('cnhCat', c)}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 10,
                        border: `1.5px solid ${data.cnhCat === c ? 'var(--night-900)' : 'var(--border)'}`,
                        background: data.cnhCat === c ? 'var(--night-900)' : 'var(--paper)',
                        color: data.cnhCat === c ? '#fff' : 'var(--text)',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 16,
                        cursor: 'pointer',
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="pg-helper">
                  A=moto · B=carro · C=caminhão leve · D=ônibus · E=caminhão pesado
                </div>
              </div>

              {/* upload CNH */}
              <div>
                <label className="pg-label" style={{ marginBottom: 6 }}>
                  Foto da CNH (frente e verso)
                </label>
                <div className="pg-row" style={{ gap: 10 }}>
                  {['Frente', 'Verso'].map((s) => (
                    <button
                      key={s}
                      className="pg-card"
                      style={{
                        flex: 1,
                        height: 120,
                        padding: 0,
                        cursor: 'pointer',
                        border: '1.5px dashed var(--border-strong)',
                        background: 'var(--bg-soft)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Icon name="camera" size={28} color="currentColor" />
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{s}</div>
                      <div className="pg-mono" style={{ fontSize: 9, color: 'var(--text-mute)' }}>
                        TOQUE PARA CAPTURAR
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="pg-card pg-card--soft"
                style={{ padding: 14, fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.5 }}
              >
                <Icon name="alert" size={14} color="var(--orange-600)" /> A CNH precisa estar
                válida. Verificamos no Detran em até 24h.
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="pg-stack">
              <div className="pg-field">
                <label className="pg-label">Tipo de veículo</label>
                <select
                  className="pg-input"
                  value={data.bodyType}
                  onChange={(e) => update('bodyType', e.target.value)}
                >
                  <option>Van pequena</option>
                  <option>Van média</option>
                  <option>Caminhão 3/4</option>
                  <option>Caminhão Toco</option>
                  <option>Guincho prancha</option>
                  <option>Guincho asa-delta</option>
                  <option>Caminhão caçamba</option>
                </select>
              </div>
              <div className="pg-row" style={{ gap: 10 }}>
                <div className="pg-field" style={{ flex: 2 }}>
                  <label className="pg-label">Placa</label>
                  <input
                    className="pg-input"
                    placeholder="ABC-1D23"
                    value={data.plate}
                    onChange={(e) => update('plate', e.target.value.toUpperCase())}
                    maxLength={8}
                    aria-invalid={plateCheck ? !plateCheck.ok : undefined}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      borderColor:
                        plateCheck && !plateCheck.ok
                          ? 'var(--danger)'
                          : plateCheck?.ok
                            ? 'var(--green-500)'
                            : undefined,
                    }}
                  />
                  {plateCheck && !plateCheck.ok && (
                    <span className="pg-helper is-error">
                      {PLATE_ERROR_MESSAGES[plateCheck.reason]}
                    </span>
                  )}
                  {plateCheck?.ok && plateCheck.corrections.length > 0 && (
                    // Correção nunca é silenciosa: mostramos o que entendemos
                    // para que o prestador desminta se estivermos errados.
                    <span className="pg-helper" style={{ color: 'var(--green-700)' }}>
                      Entendemos <strong>{plateCheck.plate}</strong> · confirme se está certo
                    </span>
                  )}
                  {plateCheck?.ok && plateCheck.corrections.length === 0 && (
                    <span className="pg-helper" style={{ color: 'var(--green-700)' }}>
                      Placa {plateCheck.format === 'mercosul' ? 'Mercosul' : 'antiga'} válida
                    </span>
                  )}
                </div>
                <div className="pg-field" style={{ flex: 1 }}>
                  <label className="pg-label">Ano</label>
                  <input
                    className="pg-input"
                    placeholder="2020"
                    value={data.year}
                    onChange={(e) => update('year', e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>
              <div className="pg-field">
                <label className="pg-label">Marca / modelo</label>
                <input
                  className="pg-input"
                  placeholder="Mercedes-Benz Sprinter"
                  value={data.model}
                  onChange={(e) => update('model', e.target.value)}
                />
              </div>
              <div className="pg-field">
                <label className="pg-label">Cor</label>
                <input
                  className="pg-input"
                  placeholder="Branca"
                  value={data.color}
                  onChange={(e) => update('color', e.target.value)}
                />
              </div>
              <div className="pg-field">
                <label className="pg-label">Capacidade de carga (kg)</label>
                <input
                  type="range"
                  min={200}
                  max={5000}
                  step={50}
                  value={data.capacity}
                  onChange={(e) => update('capacity', +e.target.value)}
                  className="pg-range"
                />
                <div className="pg-row pg-row--between" style={{ marginTop: 6 }}>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-mute)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    200kg
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {data.capacity} kg
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-mute)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    5000kg
                  </span>
                </div>
              </div>

              <div className="pg-field">
                <label className="pg-label">Peso Bruto Total — PBT (kg)</label>
                <input
                  className="pg-input"
                  inputMode="numeric"
                  placeholder="3500"
                  value={data.pbt || ''}
                  onChange={(e) => update('pbt', +e.target.value.replace(/\D/g, '') || 0)}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                <span className="pg-helper">
                  Está no CRLV do veículo. É o peso com carga — diferente da capacidade acima.
                  Define sua categoria de CNH e se a ANTT exige RNTRC.
                </span>
              </div>

              {cnhCheck && !cnhCheck.ok && (
                <div
                  className="pg-card pg-card--soft"
                  style={{
                    padding: 14,
                    fontSize: 12,
                    lineHeight: 1.5,
                    borderLeft: '3px solid var(--orange-600)',
                  }}
                >
                  <Icon name="alert" size={14} color="var(--orange-600)" />{' '}
                  <strong>Sua CNH categoria {data.cnhCat} não habilita este veículo.</strong> Para
                  PBT de {data.pbt.toLocaleString('pt-BR')} kg é preciso categoria{' '}
                  {cnhCheck.required}. Revise o PBT ou a categoria no passo anterior — assim seu
                  cadastro não é recusado na análise.
                </div>
              )}

              {/* upload veículo */}
              <div>
                <label className="pg-label" style={{ marginBottom: 6 }}>
                  Fotos do veículo (4)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {['Frente', 'Lateral', 'Traseira', 'Interior'].map((s) => (
                    <button
                      key={s}
                      className="pg-card"
                      style={{
                        height: 90,
                        padding: 0,
                        cursor: 'pointer',
                        border: '1.5px dashed var(--border-strong)',
                        background: 'var(--bg-soft)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      <Icon name="camera" size={24} color="currentColor" />
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{s}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="pg-stack">
              <div className="pg-field">
                <label className="pg-label">Regiões que você atende</label>
                <textarea
                  className="pg-textarea"
                  placeholder="Ex.: São Paulo capital e Grande SP"
                  value={data.regions}
                  onChange={(e) => update('regions', e.target.value)}
                />
                <span className="pg-helper">
                  Cidades ou bairros. Quanto mais específico, melhor o encaixe com os pedidos.
                </span>
              </div>

              {/* Revisão antes do envio: o candidato vê exatamente o que vai
                  para a análise. Erro de digitação em placa ou PBT custa uma
                  recusa, e recusa custa um prestador. */}
              <div className="pg-card pg-card--padded">
                <div className="pg-h-eyebrow" style={{ margin: '0 0 10px' }}>
                  CONFIRA ANTES DE ENVIAR
                </div>
                <div className="pg-stack pg-stack--sm" style={{ fontSize: 13 }}>
                  {[
                    ['Nome', data.name || '—'],
                    ['CPF', data.cpf ? formatCPF(data.cpf) : '—'],
                    ['WhatsApp', data.phone || '—'],
                    [
                      'Serviços',
                      data.services.length
                        ? data.services
                            .map((s) => ({ frete: 'Frete', guincho: 'Guincho', cacamba: 'Caçamba' })[s] ?? s)
                            .join(', ')
                        : '—',
                    ],
                    ['CNH', data.cnh ? `${data.cnh} · categoria ${data.cnhCat}` : `categoria ${data.cnhCat}`],
                    ['Veículo', [data.bodyType, data.model, data.year].filter(Boolean).join(' · ')],
                    ['Placa', plateCheck?.ok ? formatPlate(plateCheck.plate) : data.plate || '—'],
                    ['PBT', data.pbt ? `${data.pbt.toLocaleString('pt-BR')} kg` : '—'],
                    ['Capacidade', `${data.capacity.toLocaleString('pt-BR')} kg`],
                  ].map(([rotulo, valor]) => (
                    <div key={rotulo} className="pg-row pg-row--between" style={{ gap: 12 }}>
                      <span style={{ color: 'var(--text-mute)' }}>{rotulo}</span>
                      <span style={{ fontWeight: 600, textAlign: 'right' }}>{valor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {cnhCheck && !cnhCheck.ok && (
                <div
                  className="pg-card pg-card--soft"
                  style={{
                    padding: 14,
                    fontSize: 12,
                    lineHeight: 1.5,
                    borderLeft: '3px solid var(--orange-600)',
                  }}
                >
                  <Icon name="alert" size={14} color="var(--orange-600)" /> Sua CNH categoria{' '}
                  {data.cnhCat} não habilita um veículo de {data.pbt.toLocaleString('pt-BR')} kg de
                  PBT. Você pode enviar assim mesmo — nossa equipe confere na análise.
                </div>
              )}

              {/* Pagamento e documentos entram depois da aprovação, quando o
                  prestador tem conta. Dizer isso aqui evita a pergunta
                  "cadê a parte do banco?". */}
              <div
                className="pg-card pg-card--soft"
                style={{ padding: 14, fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.5 }}
              >
                <Icon name="info" size={14} color="currentColor" /> Dados bancários e fotos dos
                documentos são pedidos <strong>depois da aprovação</strong>, já dentro da sua conta.
                Não pedimos conta de quem ainda não foi aprovado.
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="pg-page-foot"
        style={{ borderTop: '1px solid var(--border)', padding: 16, background: 'var(--paper)' }}
      >
        {status === 'err' && (
          <div
            role="alert"
            style={{
              marginBottom: 10,
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.25)',
              color: 'var(--danger)',
              fontSize: 12,
              lineHeight: 1.45,
            }}
          >
            {errorMsg}
          </div>
        )}
        <button
          className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block"
          onClick={next}
          disabled={!canAdvance}
          style={canAdvance ? undefined : { opacity: 0.5, cursor: 'not-allowed' }}
        >
          {status === 'sending'
            ? 'Enviando…'
            : step === total
              ? 'Enviar para análise'
              : 'Continuar'}
        </button>
      </div>
    </div>
  );
};

export { ProvSignup };
