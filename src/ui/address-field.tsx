// =====================================================================
// PAGORA — Campo de endereço
// =====================================================================
// Um componente, dois comportamentos, mesma aparência:
//
//   COM chave do Google  → sugere endereços e grava coordenada + cidade.
//   SEM chave            → input de texto comum, como o app faz hoje.
//
// A degradação não é "modo reduzido": é o comportamento atual preservado
// inteiro. Ninguém fica sem publicar pedido porque a chave não foi criada.
//
// A coordenada é o que destrava a distância real — e a distância real é o
// maior erro de preço que restava no produto (todo frete era calculado sobre
// 15 km fixos).
// =====================================================================

import { useEffect, useRef, useState } from 'react';
import { Field, cx } from './kit';
import { Icon } from '../icons';
import { usePlaces, type ResolvedPlace } from '../hooks/usePlaces';

export type AddressValue = {
  address: string;
  geo?: { lat: number; lng: number } | null;
  city?: string | null;
  state?: string | null;
};

export type AddressFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  icon?: string;
  autoComplete?: string;
  /**
   * Endereços que a pessoa já usou. Aparecem no foco com o campo vazio —
   * o momento exato em que ela ia começar a digitar de novo.
   */
  recents?: AddressValue[];
  /**
   * Chamado a cada mudança. Quando vem de uma sugestão escolhida, `geo` e
   * `city` vêm preenchidos; quando é texto livre, vêm nulos — e a tela sabe
   * que a distância vai cair no caminho aproximado.
   */
  onChange: (value: AddressValue) => void;
};

export const AddressField = ({
  label,
  value,
  placeholder,
  icon = 'pin',
  autoComplete,
  recents,
  onChange,
}: AddressFieldProps) => {
  const { enabled, suggestions, search, resolve } = usePlaces();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resolved, setResolved] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Clique fora fecha a lista. Sem isto ela fica pendurada sobre o próximo
  // campo e o usuário toca numa sugestão querendo tocar no input de baixo.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  function handleType(text: string) {
    setResolved(false);
    // Texto livre: sem coordenada. A tela precisa saber para não continuar
    // exibindo a distância do endereço anterior.
    onChange({ address: text, geo: null, city: null, state: null });
    search(text);
    setOpen(true);
  }

  async function pick(id: string) {
    setBusy(true);
    setOpen(false);
    const place: ResolvedPlace | null = await resolve(id);
    setBusy(false);
    if (!place) return;
    setResolved(true);
    onChange({
      address: place.address,
      geo: place.geo,
      city: place.city,
      state: place.state,
    });
  }

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <Field
        label={label}
        icon={icon}
        value={value}
        placeholder={placeholder}
        // Com sugestão do Google ligada, o autocomplete do navegador brigaria
        // pelo mesmo espaço na tela — duas listas sobrepostas.
        autoComplete={enabled ? 'off' : autoComplete}
        onChange={(e) => handleType(e.target.value)}
        onFocus={() => setOpen(suggestions.length > 0 || (!value && (recents?.length ?? 0) > 0))}
        aria-expanded={open && suggestions.length > 0}
        aria-autocomplete={enabled ? 'list' : undefined}
        role={enabled ? 'combobox' : undefined}
        hint={
          resolved
            ? 'Endereço confirmado — a distância vai ser calculada pela rota real.'
            : undefined
        }
      />

      {/* Confirmação silenciosa de que a coordenada foi gravada. Não é
          enfeite: é a diferença entre preço estimado e preço calculado. */}
      {resolved && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 14,
            top: 40,
            color: 'var(--x-action)',
            display: 'flex',
          }}
        >
          <Icon name="check-circle" size={19} />
        </span>
      )}

      {busy && (
        <span className="px-sr" role="status">
          Buscando endereço…
        </span>
      )}

      {/* Recentes: só com o campo vazio e sem sugestão do Google na frente.
          Quem começou a digitar já decidiu que quer outro endereço. */}
      {open && !value && suggestions.length === 0 && recents && recents.length > 0 && (
        <ul className="px-suggest" role="listbox" aria-label="Endereços usados recentemente">
          {recents.map((r) => (
            <li key={r.address}>
              <button
                type="button"
                className="px-suggest-item"
                role="option"
                aria-selected="false"
                onClick={() => {
                  setResolved(Boolean(r.geo));
                  onChange(r);
                  setOpen(false);
                }}
              >
                <Icon name="clock" size={17} aria-hidden="true" />
                <span>
                  <span className="px-suggest-main">{r.address}</span>
                  <span className="px-suggest-sub">
                    {r.geo ? 'Usado antes · endereço confirmado' : 'Usado antes'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && suggestions.length > 0 && (
        <ul
          className="px-suggest"
          role="listbox"
          aria-label={`Sugestões para ${label.toLowerCase()}`}
        >
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={cx('px-suggest-item')}
                role="option"
                aria-selected="false"
                onClick={() => void pick(s.id)}
              >
                <Icon name="pin" size={17} aria-hidden="true" />
                <span>
                  <span className="px-suggest-main">{s.main}</span>
                  {s.secondary && <span className="px-suggest-sub">{s.secondary}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
