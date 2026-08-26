// =====================================================================
// PAGORA — campo de formulário com máscara e erro acessível
// =====================================================================
// Componente único para os ~33 inputs do app, que hoje são `<input>` cru com
// `onChange` direto no estado.
//
// O que ele resolve além de aparência:
//   • `aria-invalid` + `aria-describedby` ligando o campo à mensagem de erro,
//     para que leitor de tela anuncie o motivo em vez de só "inválido"
//   • `inputMode` correto, para o teclado do celular abrir em numérico onde
//     faz sentido — num app usado na rua isso é a diferença entre preencher e
//     desistir
//   • máscara aplicada na digitação, com o valor CRU entregue ao formulário:
//     a máscara é da tela, o banco recebe dígitos
// =====================================================================
import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import {
  maskCEP,
  maskCNPJ,
  maskCPF,
  maskCurrency,
  maskPhone,
  maskPlate,
  onlyDigits,
} from '../domains/validation/br';

export type MaskKind = 'cpf' | 'cnpj' | 'phone' | 'cep' | 'plate' | 'currency' | 'none';

const MASKS: Record<Exclude<MaskKind, 'none'>, (v: string) => string> = {
  cpf: maskCPF,
  cnpj: maskCNPJ,
  phone: maskPhone,
  cep: maskCEP,
  plate: maskPlate,
  currency: maskCurrency,
};

/** Teclado que o celular deve abrir para cada máscara. */
const INPUT_MODES: Record<MaskKind, InputHTMLAttributes<HTMLInputElement>['inputMode']> = {
  cpf: 'numeric',
  cnpj: 'numeric',
  phone: 'tel',
  cep: 'numeric',
  currency: 'decimal',
  plate: 'text',
  none: 'text',
};

export type FieldProps = {
  label: string;
  value: string;
  onChange: (masked: string) => void;
  mask?: MaskKind;
  error?: string | undefined;
  hint?: ReactNode;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'number';
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
};

export const Field = ({
  label,
  value,
  onChange,
  mask = 'none',
  error,
  hint,
  placeholder,
  type = 'text',
  autoComplete,
  disabled,
  required,
  maxLength,
}: FieldProps) => {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const apply = (raw: string) => (mask === 'none' ? raw : MASKS[mask](raw));

  return (
    <label htmlFor={id} style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>
        {label}
        {required && (
          <span aria-hidden="true" style={{ marginLeft: 3 }}>
            *
          </span>
        )}
      </span>

      <input
        id={id}
        value={value}
        onChange={(e) => onChange(apply(e.target.value))}
        placeholder={placeholder}
        type={type}
        inputMode={INPUT_MODES[mask]}
        autoComplete={autoComplete}
        disabled={disabled}
        maxLength={maxLength}
        // `aria-invalid` sozinho faz o leitor dizer "inválido" e parar aí.
        // O `describedby` é o que faz ele ler QUAL é o problema.
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        style={{
          padding: '12px 14px',
          borderRadius: 10,
          border: `1px solid ${error ? 'var(--red-500, #e5484d)' : 'var(--ink-200, rgba(0,0,0,0.12))'}`,
          fontSize: 16, // < 16px faz o Safari do iPhone dar zoom ao focar
          fontFamily: 'inherit',
          width: '100%',
          background: disabled ? 'var(--ink-100)' : 'transparent',
          color: 'var(--text)',
        }}
      />

      {error ? (
        <span id={errorId} role="alert" style={{ fontSize: 12, color: 'var(--red-500, #e5484d)' }}>
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} style={{ fontSize: 12, color: 'var(--text-mute)' }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
};

/** Reexport: telas que montam payload precisam do valor sem máscara. */
export { onlyDigits };
