import { z } from 'zod';
import { isValidDate, isValidMonth } from '../utils/dates.js';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Usuário é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const transactionInputSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
  amountCents: z
    .number({ invalid_type_error: 'Valor é obrigatório' })
    .int('Valor deve ser um inteiro de centavos')
    .positive('Valor deve ser maior que zero'),
  categoryId: z.number({ invalid_type_error: 'Categoria é obrigatória' }).int().positive(),
  description: z.string().trim().min(1, 'Descrição é obrigatória'),
  transactionDate: z
    .string()
    .refine(isValidDate, { message: 'Data inválida, use o formato YYYY-MM-DD' }),
});

export const transactionQuerySchema = z.object({
  month: z.string().refine(isValidMonth, { message: 'Mês inválido, use YYYY-MM' }).optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  createdBy: z.coerce.number().int().positive().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

export const dashboardQuerySchema = z.object({
  month: z.string().refine(isValidMonth, { message: 'Mês inválido, use YYYY-MM' }).optional(),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  kind: z.enum(['INCOME', 'EXPENSE', 'BOTH'], {
    errorMap: () => ({ message: 'Tipo de categoria inválido' }),
  }),
});

export const categoryUpdateSchema = categoryInputSchema.partial();

export const categoryStatusSchema = z.object({
  active: z.boolean({ invalid_type_error: 'active deve ser booleano' }),
});

export function parseOrThrow(schema, data, ValidationErrorClass) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      fields[key] = issue.message;
    }
    const message = result.error.issues[0]?.message || 'Dados inválidos';
    throw new ValidationErrorClass(message, fields);
  }
  return result.data;
}
