// =====================================================================
// FASE 4 PRESTADOR — Onboarding
// =====================================================================
import { useState as useStateP4 } from 'react';
import { Icon } from './icons';
import { StatusBar as SBp4, TopBar as TBp4 } from './core';
import type { ScreenProps } from './types';

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
  bank: string;
  agency: string;
  account: string;
  pixKey: string;
  selfie: boolean;
  doc: boolean;
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
    bank: 'Nubank',
    agency: '',
    account: '',
    pixKey: '',
    selfie: false,
    doc: false,
  });
  const update = <K extends keyof ProvData>(k: K, v: ProvData[K]) =>
    setData((d) => ({ ...d, [k]: v }));
  const total = 5;
  const titles = [
    'Vamos começar',
    'CNH e habilitação',
    'Seu veículo',
    'Conta para receber',
    'Selfie e documento',
  ];
  const subs = [
    'Crie sua conta de prestador em 5 minutos',
    'Precisamos verificar sua habilitação',
    'Conte-nos sobre o veículo de trabalho',
    'Onde vamos depositar seus ganhos',
    'Última etapa: validação de identidade',
  ];

  // Após o último passo segue pro fluxo de confirmação genérico do prestador (provider-confirm em other.jsx)
  const next = () => (step < total ? setStep(step + 1) : go('provider-confirm'));
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
                  value={data.cpf}
                  onChange={(e) => update('cpf', e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
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
                    style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                  />
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
                <label className="pg-label">Banco</label>
                <select
                  className="pg-input"
                  value={data.bank}
                  onChange={(e) => update('bank', e.target.value)}
                >
                  <option>Nubank</option>
                  <option>Itaú</option>
                  <option>Bradesco</option>
                  <option>Caixa</option>
                  <option>Santander</option>
                  <option>Banco do Brasil</option>
                  <option>Inter</option>
                  <option>C6 Bank</option>
                </select>
              </div>
              <div className="pg-row" style={{ gap: 10 }}>
                <div className="pg-field" style={{ flex: 1 }}>
                  <label className="pg-label">Agência</label>
                  <input
                    className="pg-input"
                    placeholder="0000"
                    value={data.agency}
                    onChange={(e) => update('agency', e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <div className="pg-field" style={{ flex: 2 }}>
                  <label className="pg-label">Conta corrente</label>
                  <input
                    className="pg-input"
                    placeholder="00000-0"
                    value={data.account}
                    onChange={(e) => update('account', e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>
              <div className="pg-divider" />
              <div className="pg-field">
                <label className="pg-label">Ou use uma chave Pix (recomendado)</label>
                <input
                  className="pg-input"
                  placeholder="CPF, telefone, email ou aleatória"
                  value={data.pixKey}
                  onChange={(e) => update('pixKey', e.target.value)}
                />
                <div className="pg-helper">
                  <Icon name="bolt" size={12} color="currentColor" /> Saques via Pix são
                  instantâneos, sem taxa
                </div>
              </div>
              <div
                className="pg-card pg-card--soft"
                style={{ padding: 14, fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.5 }}
              >
                <Icon name="credit-card" size={14} color="currentColor" /> A conta precisa estar no
                seu nome (CPF cadastrado). Caso contrário, a transferência será recusada.
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="pg-stack">
              {/* selfie */}
              <button
                onClick={() => update('selfie', !data.selfie)}
                className="pg-card pg-card--padded"
                style={{
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: data.selfie
                    ? '1.5px solid var(--green-500)'
                    : '1.5px dashed var(--border-strong)',
                  background: data.selfie ? 'var(--green-50)' : 'var(--paper)',
                }}
              >
                <div className="pg-row" style={{ gap: 14 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      background: data.selfie ? 'var(--green-500)' : 'var(--ink-100)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {data.selfie ? (
                      <Icon name="check" size={24} strokeWidth={2.5} color="var(--green-700)" />
                    ) : (
                      <Icon name="camera" size={24} color="currentColor" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Selfie de verificação</div>
                    <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
                      {data.selfie
                        ? 'Foto enviada · revisão em 24h'
                        : 'Tire uma selfie segurando sua CNH'}
                    </div>
                  </div>
                </div>
              </button>

              {/* RG / doc */}
              <button
                onClick={() => update('doc', !data.doc)}
                className="pg-card pg-card--padded"
                style={{
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: data.doc
                    ? '1.5px solid var(--green-500)'
                    : '1.5px dashed var(--border-strong)',
                  background: data.doc ? 'var(--green-50)' : 'var(--paper)',
                }}
              >
                <div className="pg-row" style={{ gap: 14 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      background: data.doc ? 'var(--green-500)' : 'var(--ink-100)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {data.doc ? (
                      <Icon name="check" size={24} strokeWidth={2.5} color="var(--green-700)" />
                    ) : (
                      <Icon name="doc" size={24} color="currentColor" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Comprovante de residência</div>
                    <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
                      {data.doc ? 'Documento enviado' : 'Conta de luz, água ou telefone (≤90 dias)'}
                    </div>
                  </div>
                </div>
              </button>

              <div className="pg-divider" />

              {/* terms */}
              <label
                className="pg-row"
                style={{ gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  defaultChecked
                  style={{ marginTop: 4, width: 18, height: 18, accentColor: 'var(--night-900)' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.5 }}>
                  Concordo com os{' '}
                  <a href="#" style={{ color: 'var(--green-700)', fontWeight: 600 }}>
                    Termos do Prestador
                  </a>{' '}
                  e a{' '}
                  <a href="#" style={{ color: 'var(--green-700)', fontWeight: 600 }}>
                    Política de comissão
                  </a>{' '}
                  (15% por pedido + R$ 2 de taxa fixa).
                </span>
              </label>
            </div>
          )}
        </div>
      </div>

      <div
        className="pg-page-foot"
        style={{ borderTop: '1px solid var(--border)', padding: 16, background: 'var(--paper)' }}
      >
        <button className="pg-btn pg-btn--primary pg-btn--lg pg-btn--block" onClick={next}>
          {step === total ? 'Enviar para análise' : 'Continuar'}
        </button>
      </div>
    </div>
  );
};

export { ProvSignup };
