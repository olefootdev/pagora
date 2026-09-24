// =====================================================================
// PAGORA — Prévia de exigências no cadastro
// =====================================================================
// Mostra ao prestador o que vão pedir dele ANTES de ele preencher o
// formulário inteiro.
//
// Por que existe: descobrir no passo 5 que falta licença municipal é o jeito
// mais caro de perder um cadastro — o prestador já investiu o tempo todo e
// vai embora. Quem sabe no passo 1 chega com o documento na mão, ou desiste
// cedo, o que também é melhor do que um cadastro incompleto na fila do admin.
//
// Regra de tom: isto informa, não intimida. Nada aqui bloqueia o cadastro.
// =====================================================================

import { Icon } from './icons';
import {
  previewRequirementsForMany,
  CREDENTIAL_LABELS,
  type ServiceType,
  type PreviewRequirement,
} from './lib/conformidade';

const SERVICE_LABELS: Record<ServiceType, string> = {
  frete: 'Frete',
  guincho: 'Guincho',
  cacamba: 'Caçamba',
};

const isServiceType = (s: string): s is ServiceType =>
  s === 'frete' || s === 'guincho' || s === 'cacamba';

type RowProps = { req: PreviewRequirement };

const RequirementRow = ({ req }: RowProps) => {
  const obrigatorio = req.level === 'obrigatorio';
  return (
    <div
      className="pg-row"
      style={{ gap: 10, alignItems: 'flex-start', padding: '8px 0' }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          flexShrink: 0,
          marginTop: 1,
          display: 'grid',
          placeItems: 'center',
          background: obrigatorio ? 'var(--night-900)' : 'var(--ink-100)',
          color: obrigatorio ? 'var(--green-500)' : 'var(--text-mute)',
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        {obrigatorio ? '!' : '·'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
          {CREDENTIAL_LABELS[req.kind]}
          {req.level === 'recomendado' && (
            <span
              className="pg-tag"
              style={{
                background: 'var(--ink-100)',
                padding: '1px 6px',
                fontSize: 9,
                marginLeft: 6,
                verticalAlign: 'middle',
              }}
            >
              OPCIONAL
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2, lineHeight: 1.4 }}>
          {req.reason}
          {/* Regra condicional não pode ser afirmada antes de existir veículo.
              Dizer "depende" é mais honesto do que exigir por precaução. */}
          {req.vehicleDependent && (
            <span style={{ color: 'var(--text-mute)' }}> Depende do seu veículo.</span>
          )}
        </div>
      </div>
    </div>
  );
};

export type ExigenciasPreviewProps = {
  /** IDs de serviço vindos da tela. Entradas fora do enum são ignoradas. */
  services: string[];
};

export const ExigenciasPreview = ({ services }: ExigenciasPreviewProps) => {
  const valid = services.filter(isServiceType);
  if (valid.length === 0) return null;

  const reqs = previewRequirementsForMany(valid);
  if (reqs.length === 0) return null;

  const obrigatorios = reqs.filter((r) => r.level !== 'recomendado');

  return (
    <div
      className="pg-card"
      style={{
        padding: '14px 16px',
        background: 'var(--bg-soft)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="pg-row" style={{ gap: 8, marginBottom: 4 }}>
        <Icon name="shield" size={16} />
        <span style={{ fontSize: 14, fontWeight: 700 }}>
          O que vamos pedir para {valid.map((s) => SERVICE_LABELS[s]).join(' + ')}
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-soft)', margin: '0 0 6px', lineHeight: 1.5 }}>
        {obrigatorios.length} {obrigatorios.length === 1 ? 'documento' : 'documentos'} para o selo
        PAGORA CHECK. Você não precisa de tudo agora — dá para enviar depois do cadastro.
      </p>

      <div style={{ borderTop: '1px dashed var(--border)', marginTop: 8 }}>
        {reqs.map((r) => (
          <RequirementRow key={r.kind} req={r} />
        ))}
      </div>

      {/* Caçamba é o caso em que a regra é municipal e a tela precisa dizer
          isso explicitamente — o prestador tende a assumir cobertura nacional. */}
      {valid.includes('cacamba') && (
        <div
          style={{
            marginTop: 10,
            padding: '10px 12px',
            background: 'var(--paper)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--text-soft)',
            lineHeight: 1.5,
          }}
        >
          <Icon name="info" size={13} /> A licença de resíduos vale{' '}
          <strong>por município</strong>. Se você atende mais de uma cidade, vamos pedir a licença
          de cada uma.
        </div>
      )}
    </div>
  );
};
