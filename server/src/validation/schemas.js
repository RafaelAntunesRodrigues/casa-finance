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
  scope: z.enum(['HOUSE', 'PERSONAL']).optional(),
});

export const categoryUpdateSchema = categoryInputSchema.partial();

export const categoryStatusSchema = z.object({
  active: z.boolean({ invalid_type_error: 'active deve ser booleano' }),
});

export const goalInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome da meta é obrigatório'),
    targetCents: z
      .number({ invalid_type_error: 'Valor alvo é obrigatório' })
      .int('Valor deve ser um inteiro de centavos')
      .positive('Valor deve ser maior que zero'),
    categoryId: z.number().int().positive().nullable().optional(),
    ownerId: z.number().int().positive().nullable().optional(),
    recurrence: z.enum(['MONTHLY', 'ONCE'], {
      errorMap: () => ({ message: 'Recorrência inválida' }),
    }),
    month: z
      .string()
      .refine(isValidMonth, { message: 'Mês inválido, use YYYY-MM' })
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.recurrence === 'ONCE' && !data.month) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['month'],
        message: 'Informe o mês para metas que não se repetem',
      });
    }
  });

export const goalQuerySchema = z.object({
  month: z.string().refine(isValidMonth, { message: 'Mês inválido, use YYYY-MM' }).optional(),
});

export const goalStatusSchema = z.object({
  active: z.boolean({ invalid_type_error: 'active deve ser booleano' }),
});

export const personalTransactionInputSchema = z
  .object({
    type: z.enum(['INCOME', 'EXPENSE', 'INVESTMENT'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
    expenseKind: z.enum(['NORMAL', 'INSTALLMENT']).optional(),
    amountCents: z
      .number({ invalid_type_error: 'Valor é obrigatório' })
      .int('Valor deve ser um inteiro de centavos')
      .positive('Valor deve ser maior que zero'),
    installments: z.number().int().min(2).max(60).optional(),
    categoryId: z.number({ invalid_type_error: 'Categoria é obrigatória' }).int().positive(),
    description: z.string().trim().min(1, 'Descrição é obrigatória'),
    transactionDate: z
      .string()
      .refine(isValidDate, { message: 'Data inválida, use o formato YYYY-MM-DD' }),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'EXPENSE' && !data.expenseKind) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expenseKind'],
        message: 'Informe o tipo de gasto (normal ou parcelado)',
      });
    }
    if (data.expenseKind === 'INSTALLMENT' && !data.installments) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['installments'],
        message: 'Informe a quantidade de parcelas',
      });
    }
  });

// Editar um lançamento pessoal (inclusive uma ocorrência de gasto fixo ou
// uma parcela isolada) nunca recalcula parcelamento/recorrência — só os
// campos do próprio registro. Por isso aceita os três expenseKind e não
// exige `installments`.
export const personalTransactionUpdateSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'INVESTMENT'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
  expenseKind: z.enum(['NORMAL', 'FIXED', 'INSTALLMENT']).optional(),
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

export const personalTransactionQuerySchema = z.object({
  month: z.string().refine(isValidMonth, { message: 'Mês inválido, use YYYY-MM' }).optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'INVESTMENT']).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

export const personalDashboardQuerySchema = z.object({
  month: z.string().refine(isValidMonth, { message: 'Mês inválido, use YYYY-MM' }).optional(),
});

export const personalFixedTemplateInputSchema = z.object({
  categoryId: z.number({ invalid_type_error: 'Categoria é obrigatória' }).int().positive(),
  description: z.string().trim().min(1, 'Descrição é obrigatória'),
  amountCents: z
    .number({ invalid_type_error: 'Valor é obrigatório' })
    .int('Valor deve ser um inteiro de centavos')
    .positive('Valor deve ser maior que zero'),
  dayOfMonth: z.number().int().min(1, 'Dia inválido').max(28, 'Use um dia entre 1 e 28'),
  startMonth: z.string().refine(isValidMonth, { message: 'Mês inválido, use YYYY-MM' }),
});

export const personalFixedTemplateStatusSchema = z.object({
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
