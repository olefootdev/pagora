// =====================================================================
// PAGORA — schemas de formulário (zod)
// =====================================================================
// Estes schemas rodam no CLIENT, e servem para dar erro imediato e legível ao
// usuário. Eles NÃO são a validação de verdade.
//
// A validação que conta está no banco: constraints (`check`, `unique`,
// `not null`), policies de RLS e as funções `SECURITY DEFINER`. Qualquer coisa
// aqui é contornável abrindo o DevTools e chamando o PostgREST direto — o que
// significa que um campo só protegido por zod não está protegido.
//
// Regra prática ao adicionar campo novo: se aceitar lixo naquele campo causa
// prejuízo, a regra tem que existir também numa constraint. Se causa só uma
// tela feia, zod basta.
// =====================================================================
import { z } from 'zod';
import {
  isValidCEP,
  isValidCNPJ,
  isValidCPF,
  isValidMobilePhone,
  isValidPlate,
  onlyDigits,
} from './br';

const required = (label: string) => `${label} é obrigatório`;

export const cpfSchema = z
  .string()
  .min(1, required('CPF'))
  .refine(isValidCPF, 'CPF inválido — confira os números');

export const cnpjSchema = z
  .string()
  .min(1, required('CNPJ'))
  .refine(isValidCNPJ, 'CNPJ inválido — confira os números');

export const phoneSchema = z
  .string()
  .min(1, required('Telefone'))
  .refine(isValidMobilePhone, 'Use um celular com DDD: (11) 99999-9999');

export const cepSchema = z.string().min(1, required('CEP')).refine(isValidCEP, 'CEP inválido');

export const plateSchema = z
  .string()
  .min(1, required('Placa'))
  .refine(isValidPlate, 'Placa inválida — use ABC1234 ou ABC1D23');

export const fullNameSchema = z
  .string()
  .trim()
  .min(3, 'Digite seu nome completo')
  // Sobrenome importa: o nome vai para o cadastro no gateway de pagamento,
  // que recusa pessoa física sem nome completo.
  .refine((v) => v.split(/\s+/).length >= 2, 'Inclua nome e sobrenome');

export const emailSchema = z.string().trim().email('E-mail inválido');

export const otpSchema = z
  .string()
  .refine((v) => onlyDigits(v).length === 6, 'O código tem 6 dígitos');

export const vehicleYearSchema = z.coerce
  .number()
  .int('Ano inválido')
  .min(1980, 'Ano muito antigo')
  // A constraint da 0001 é `between 1980 and 2100`; o limite aqui é mais
  // apertado de propósito — "2100" é sempre erro de digitação, não um veículo.
  .max(new Date().getFullYear() + 1, 'Ano no futuro');

// ---------------------------------------------------------------------
// Formulários completos
// ---------------------------------------------------------------------
export const loginSchema = z.object({
  phone: phoneSchema,
});
export type LoginForm = z.infer<typeof loginSchema>;

export const otpVerifySchema = z.object({
  code: otpSchema,
});
export type OtpVerifyForm = z.infer<typeof otpVerifySchema>;

export const SERVICE_VALUES = ['frete', 'guincho', 'cacamba'] as const;

export const providerSignupSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
  email: emailSchema.optional().or(z.literal('')),
  cpf: cpfSchema,
  services: z.array(z.enum(SERVICE_VALUES)).min(1, 'Escolha pelo menos um serviço'),
  vehicleType: z.string().trim().min(2, required('Tipo de veículo')),
  vehiclePlate: plateSchema,
  vehicleModel: z.string().trim().min(2, required('Modelo')),
  vehicleYear: vehicleYearSchema,
  cep: cepSchema,
  regions: z.string().trim().min(2, 'Informe as regiões que você atende'),
  pixKey: z.string().trim().min(1, 'Informe sua chave Pix'),
});
export type ProviderSignupForm = z.infer<typeof providerSignupSchema>;

export const waitlistSchema = z
  .object({
    email: emailSchema.optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    city: z.string().trim().optional(),
    cep: z.string().optional().or(z.literal('')),
  })
  // Espelha a constraint `waitlist_has_contact` da 0003. Sem isto, o usuário
  // só descobriria o problema pelo erro cru do Postgres.
  .refine((v) => Boolean(v.email) || Boolean(v.phone), {
    message: 'Informe e-mail ou telefone para avisarmos você',
    path: ['email'],
  })
  .refine((v) => !v.phone || isValidMobilePhone(v.phone), {
    message: 'Celular inválido',
    path: ['phone'],
  })
  .refine((v) => !v.cep || isValidCEP(v.cep), { message: 'CEP inválido', path: ['cep'] });
export type WaitlistForm = z.infer<typeof waitlistSchema>;

/** Primeira mensagem de erro de um ZodError, na ordem dos campos. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Confira os dados informados';
}
