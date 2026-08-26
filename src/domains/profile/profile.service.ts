// =====================================================================
// PAGORA — O perfil da pessoa
// =====================================================================
// `ensure_profile` (0001) cria a linha com `(id, phone, email)` e mais nada.
// `full_name` nasce nulo, e até agora NENHUM lugar do app escrevia em
// `profiles` — verificado varrendo o `src` inteiro. O efeito: quem entra com
// o código do SMS vira um registro sem nome, a home continua dizendo
// "Bem-vindo ao Pagora" para quem já fez dez pedidos, e o transportador que
// vai à casa da pessoa não sabe com quem vai falar.
//
// A coluna `onboarded_at` está no schema desde a 0001 e nunca foi escrita —
// o passo de boas-vindas estava previsto e ficou para trás. É ela que marca
// "esta pessoa já se apresentou", e é por isso que o gate não olha para
// `full_name`: quem tem nome mas nunca passou pelo passo é diferente de quem
// passou e preferiu não preencher a cidade.
//
// A permissão já existe: `profiles_update_self` desde a 0002, e a 0006
// concede exatamente as colunas usadas aqui.
// =====================================================================

import { supabase } from '../../lib/supabase';
import { loadErrorMessage } from '../../lib/timeout';
import type { Tables } from '../../lib/database.types';

export type Profile = Tables<'profiles'>;

export type ProfileDraft = {
  fullName: string;
  city?: string | undefined;
  state?: string | undefined;
};

/** Erros de preenchimento, por campo. Vazio quer dizer pronto para enviar. */
export type ProfileErrors = Partial<Record<'fullName' | 'city' | 'state', string>>;

/**
 * O nome tem que ser utilizável por outra pessoa.
 *
 * Não exigimos sobrenome: muita gente se apresenta pelo primeiro nome, e
 * barrar isso trava o cadastro por preciosismo. Exigimos que pareça um nome —
 * o suficiente para o transportador saber quem procurar.
 */
export function validateProfile(draft: ProfileDraft): ProfileErrors {
  const errors: ProfileErrors = {};
  const nome = draft.fullName.trim();

  if (nome.length < 2) {
    errors.fullName = 'Digite seu nome.';
  } else if (nome.length > 80) {
    errors.fullName = 'Nome muito longo.';
  } else if (/\d/.test(nome)) {
    // Número em nome é quase sempre o telefone colado no campo errado.
    errors.fullName = 'Só o nome, sem números.';
  } else if (!/\p{L}/u.test(nome)) {
    errors.fullName = 'Digite seu nome.';
  }

  const cidade = draft.city?.trim();
  if (cidade && cidade.length < 2) {
    errors.city = 'Cidade incompleta.';
  }

  const uf = draft.state?.trim();
  if (uf && !UFS.includes(uf.toUpperCase())) {
    errors.state = 'UF inválida.';
  }

  return errors;
}

/**
 * Capitaliza o que a pessoa digitou com o teclado do celular.
 *
 * "joão da silva" e "JOÃO DA SILVA" viram "João da Silva". As partículas
 * ficam minúsculas porque é assim que se escreve um nome em português — e o
 * nome aparece em proposta, chat e comprovante, onde caixa alta grita.
 */
const PARTICULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

export function tidyName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR')
    .split(' ')
    .map((parte, i) =>
      i > 0 && PARTICULAS.has(parte)
        ? parte
        : parte.charAt(0).toLocaleUpperCase('pt-BR') + parte.slice(1),
    )
    .join(' ');
}

/**
 * Grava o perfil e marca a pessoa como apresentada.
 *
 * `onboarded_at` só é escrito na primeira vez: editar os dados depois não
 * deve mexer na data em que a pessoa entrou de verdade no produto.
 */
export async function saveMyProfile(
  userId: string,
  draft: ProfileDraft,
  jaApresentado = false,
): Promise<Profile> {
  const errors = validateProfile(draft);
  const primeiro = Object.values(errors)[0];
  if (primeiro) throw new Error(primeiro);

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: tidyName(draft.fullName),
      city: draft.city?.trim() || null,
      state: draft.state?.trim().toUpperCase() || null,
      // Só na primeira vez: editar os dados depois não deve mexer na data em
      // que a pessoa entrou de verdade no produto.
      ...(jaApresentado ? {} : { onboarded_at: new Date().toISOString() }),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(loadErrorMessage(error));
  return data;
}

/** As 27 UFs. Usadas para validar e para montar o seletor. */
export const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

/**
 * Esta pessoa já se apresentou?
 *
 * Olha `onboarded_at`, não `full_name`. Quem passou pelo passo e deixou a
 * cidade em branco não pode ser jogado de volta para ele a cada abertura do
 * app — e quem tem nome vindo de outro caminho ainda não escolheu nada.
 */
export function needsOnboarding(profile: Pick<Profile, 'onboarded_at'> | null): boolean {
  return profile !== null && !profile.onboarded_at;
}
