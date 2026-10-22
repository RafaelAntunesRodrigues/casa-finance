import { useEffect, useState } from 'react';
import { brlInputToCents } from '../utils/money.js';
import { todayISO } from '../utils/date.js';

const EMPTY_FORM = {
  type: 'EXPENSE',
  expenseKind: 'NORMAL',
  amount: '',
  installments: '2',
  transactionDate: todayISO(),
  categoryId: '',
  description: '',
};

const TYPE_LABEL = { INCOME: 'Entrada', EXPENSE: 'Saída', INVESTMENT: 'Investimento' };

export default function PersonalTransactionFormModal({ open, categories, defaultType, onCancel, onSubmit, submitting }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY_FORM, type: defaultType || EMPTY_FORM.type });
    setFieldErrors({});
  }, [open, defaultType]);

  if (!open) return null;

  const availableCategories = categories.filter((c) => c.kind === form.type || c.kind === 'BOTH');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const errors = {};
    const amountCents = brlInputToCents(form.amount);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      errors.amount = 'Informe um valor maior que zero';
    }
    if (!form.transactionDate) errors.transactionDate = 'Informe a data';
    if (!form.categoryId) errors.categoryId = 'Selecione uma categoria';
    if (!form.description.trim()) errors.description = 'Informe a descrição';
    if (form.type === 'EXPENSE' && form.expenseKind === 'INSTALLMENT') {
      const n = Number(form.installments);
      if (!Number.isInteger(n) || n < 2 || n > 60) {
        errors.installments = 'Use entre 2 e 60 parcelas';
      }
    }
    return errors;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      type: form.type,
      amountCents: brlInputToCents(form.amount),
      categoryId: Number(form.categoryId),
      description: form.description.trim(),
      transactionDate: form.transactionDate,
    };
    if (form.type === 'EXPENSE') {
      payload.expenseKind = form.expenseKind;
      if (form.expenseKind === 'INSTALLMENT') {
        payload.installments = Number(form.installments);
      }
    }
    onSubmit(payload);
  }

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <section className="modal">
        <div className="modal-head">
          <div>
            <span className="eyebrow">NOVA MOVIMENTAÇÃO PESSOAL</span>
            <h2>{TYPE_LABEL[form.type]}</h2>
          </div>
          <button className="close" onClick={onCancel} aria-label="Fechar">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="segmented" style={{ '--segments': 3 }}>
            <button type="button" className={form.type === 'INCOME' ? 'selected' : ''} onClick={() => update('type', 'INCOME')}>
              Entrada
            </button>
            <button type="button" className={form.type === 'EXPENSE' ? 'selected' : ''} onClick={() => update('type', 'EXPENSE')}>
              Saída
            </button>
            <button type="button" className={form.type === 'INVESTMENT' ? 'selected' : ''} onClick={() => update('type', 'INVESTMENT')}>
              Investimento
            </button>
          </div>

          {form.type === 'EXPENSE' && (
            <div className="segmented" style={{ '--segments': 2 }}>
              <button
                type="button"
                className={form.expenseKind === 'NORMAL' ? 'selected' : ''}
                onClick={() => update('expenseKind', 'NORMAL')}
              >
                Normal
              </button>
              <button
                type="button"
                className={form.expenseKind === 'INSTALLMENT' ? 'selected' : ''}
                onClick={() => update('expenseKind', 'INSTALLMENT')}
              >
                Parcelado
              </button>
            </div>
          )}

          <label htmlFor="p-amount">
            {form.expenseKind === 'INSTALLMENT' ? 'Valor total da compra' : 'Valor'}
            <div className="money-input">
              <span>R$</span>
              <input
                id="p-amount"
                inputMode="decimal"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => update('amount', e.target.value)}
              />
            </div>
            {fieldErrors.amount && <small className="field-error">{fieldErrors.amount}</small>}
          </label>

          {form.type === 'EXPENSE' && form.expenseKind === 'INSTALLMENT' && (
            <label htmlFor="p-installments">
              Quantidade de parcelas
              <input
                id="p-installments"
                type="number"
                min="2"
                max="60"
                value={form.installments}
                onChange={(e) => update('installments', e.target.value)}
              />
              {fieldErrors.installments && <small className="field-error">{fieldErrors.installments}</small>}
              <small className="field-hint">Uma parcela é lançada por mês, a partir da data informada.</small>
            </label>
          )}

          <div className="two-col">
            <label htmlFor="p-date">
              Data {form.type === 'EXPENSE' && form.expenseKind === 'INSTALLMENT' ? '(1ª parcela)' : ''}
              <input
                id="p-date"
                type="date"
                value={form.transactionDate}
                onChange={(e) => update('transactionDate', e.target.value)}
              />
              {fieldErrors.transactionDate && <small className="field-error">{fieldErrors.transactionDate}</small>}
            </label>
            <label htmlFor="p-category">
              Categoria
              <select id="p-category" value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)}>
                <option value="">Selecione…</option>
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId && <small className="field-error">{fieldErrors.categoryId}</small>}
            </label>
          </div>

          <label htmlFor="p-description">
            Descrição
            <input id="p-description" value={form.description} onChange={(e) => update('description', e.target.value)} />
            {fieldErrors.description && <small className="field-error">{fieldErrors.description}</small>}
          </label>

          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? 'Salvando…' : 'Salvar movimentação'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
