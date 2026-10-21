import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  listTransactions,
  listTransactionsForExport,
  updateTransaction,
} from '../services/transactionService.js';
import {
  parseOrThrow,
  transactionInputSchema,
  transactionQuerySchema,
} from '../validation/schemas.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const filters = parseOrThrow(transactionQuerySchema, req.query, ValidationError);
  const result = listTransactions(filters);
  res.json(result);
});

export const create = asyncHandler(async (req, res) => {
  const payload = parseOrThrow(transactionInputSchema, req.body, ValidationError);
  const transaction = createTransaction({ ...payload, createdBy: req.session.userId });
  res.status(201).json(transaction);
});

export const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const payload = parseOrThrow(transactionInputSchema, req.body, ValidationError);
  const transaction = updateTransaction(id, payload);
  res.json(transaction);
});

export const remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  deleteTransaction(id);
  res.status(204).end();
});

export const getOne = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const transaction = getTransactionById(id);
  if (!transaction) throw new NotFoundError('Movimentação não encontrada');
  res.json(transaction);
});

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[";\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const exportCsv = asyncHandler(async (req, res) => {
  const filters = parseOrThrow(transactionQuerySchema, req.query, ValidationError);
  const rows = listTransactionsForExport(filters);

  const header = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)', 'Responsável'];
  const lines = [header.join(';')];

  for (const row of rows) {
    const tipo = row.type === 'INCOME' ? 'Entrada' : 'Saída';
    const valor = (row.amountCents / 100).toFixed(2).replace('.', ',');
    lines.push(
      [row.transactionDate, tipo, row.categoryName, row.description, valor, row.createdByName]
        .map(csvEscape)
        .join(';')
    );
  }

  const csv = '﻿' + lines.join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="movimentacoes.csv"');
  res.send(csv);
});
