import {
  createFixedTemplate,
  createPersonalTransaction,
  deleteFixedTemplate,
  deletePersonalTransaction,
  getPersonalTransactionById,
  listFixedTemplates,
  listPersonalTransactions,
  listPersonalTransactionsForExport,
  setFixedTemplateStatus,
  updatePersonalTransaction,
} from '../services/personalTransactionService.js';
import {
  parseOrThrow,
  personalFixedTemplateInputSchema,
  personalFixedTemplateStatusSchema,
  personalTransactionInputSchema,
  personalTransactionQuerySchema,
} from '../validation/schemas.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const filters = parseOrThrow(personalTransactionQuerySchema, req.query, ValidationError);
  res.json(listPersonalTransactions({ ...filters, ownerId: req.ownerId }));
});

export const create = asyncHandler(async (req, res) => {
  const payload = parseOrThrow(personalTransactionInputSchema, req.body, ValidationError);
  const transaction = createPersonalTransaction({
    ...payload,
    ownerId: req.ownerId,
    createdBy: req.session.userId,
  });
  res.status(201).json(transaction);
});

export const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const payload = parseOrThrow(personalTransactionInputSchema, req.body, ValidationError);
  res.json(updatePersonalTransaction(id, payload));
});

export const remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  deletePersonalTransaction(id);
  res.status(204).end();
});

export const getOne = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const transaction = getPersonalTransactionById(id);
  if (!transaction) throw new NotFoundError('Movimentação não encontrada');
  res.json(transaction);
});

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[";\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const TIPO_LABEL = { INCOME: 'Entrada', EXPENSE: 'Saída', INVESTMENT: 'Investimento' };

export const exportCsv = asyncHandler(async (req, res) => {
  const filters = parseOrThrow(personalTransactionQuerySchema, req.query, ValidationError);
  const rows = listPersonalTransactionsForExport({ ...filters, ownerId: req.ownerId });

  const header = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)', 'Responsável'];
  const lines = [header.join(';')];
  for (const row of rows) {
    const valor = (row.amountCents / 100).toFixed(2).replace('.', ',');
    lines.push(
      [row.transactionDate, TIPO_LABEL[row.type] || row.type, row.categoryName, row.description, valor, row.createdByName]
        .map(csvEscape)
        .join(';')
    );
  }

  const csv = '﻿' + lines.join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="movimentacoes-pessoal.csv"');
  res.send(csv);
});

// ---------- Gastos fixos ----------

export const listFixed = asyncHandler(async (req, res) => {
  res.json(listFixedTemplates(req.ownerId));
});

export const createFixed = asyncHandler(async (req, res) => {
  const payload = parseOrThrow(personalFixedTemplateInputSchema, req.body, ValidationError);
  const template = createFixedTemplate({ ...payload, ownerId: req.ownerId, createdBy: req.session.userId });
  res.status(201).json(template);
});

export const updateFixedStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { active } = parseOrThrow(personalFixedTemplateStatusSchema, req.body, ValidationError);
  res.json(setFixedTemplateStatus(id, active));
});

export const removeFixed = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  deleteFixedTemplate(id);
  res.status(204).end();
});
