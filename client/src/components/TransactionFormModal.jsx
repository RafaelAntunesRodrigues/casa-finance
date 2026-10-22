import { useEffect, useState } from 'react';
import { brlInputToCents, centsToInputString } from '../utils/money.js';
import { todayISO } from '../utils/date.js';

const EMPTY_FORM = {
  type: 'EXPENSE',
  amount: '',
  transactionDate: todayISO(),
  categoryId: '',
  description: '',
};

const TYPE_LABEL = { INCOME: 'Entrada', EXPENSE: 'Saída' };

export default function TransactionFormModal({ open, categories, initial, defaultType, onCancel, onSubmit, submitting }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        type: initial.type,
        amount: centsToInputString(initial.amountCents),
        transactionDate: initial.transactionDate,
        categoryId: String(initial.categoryId),
        description: initial.description,
      });
    } else {
      setForm({ ...EMPTY_FORM, type: defaultType || EMPTY_FORM.type });
    }
    setFieldErrors({});
  }, [open, initial, defaultType]);

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
    return errors;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    onSubmit({
      type: form.type,
      amountCents: brlInputToCents(form.amount),
      categoryId: Number(form.categoryId),
      description: form.description.trim(),
      transactionDate: form.transactionDate,
    });
  }

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <section className="modal">
        <div className="modal-head">
          <div>
            <span className="eyebrow">{initial ? 'EDITAR' : 'NOVA'} MOVIMENTAÇÃO</span>
            <h2>{TYPE_LABEL[form.type]}</h2>
          </div>
          <button className="close" onClick={onCancel} aria-label="Fechar">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="segmented" style={{ '--segments': 2 }}>
            <button
              type="button"
              className={form.type === 'INCOME' ? 'selected' : ''}
              onClick={() => update('type', 'INCOME')}
            >
              Entrada
            </button>
            <button
              type="button"
              className={form.type === 'EXPENSE' ? 'selected' : ''}
              onClick={() => update('type', 'EXPENSE')}
            >
              Saída
            </button>
          </div>

          <label htmlFor="amount">
            Valor
            <div className="money-input">
              <span>R$</span>
              <input
                id="amount"
                inputMode="decimal"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => update('amount', e.target.value)}
              />
            </div>
            {fieldErrors.amount && <small className="field-error">{fieldErrors.amount}</small>}
          </label>

          <div className="two-col">
            <label htmlFor="transactionDate">
              Data
              <input
                id="transactionDate"
                type="date"
                value={form.transactionDate}
                onChange={(e) => update('transactionDate', e.target.value)}
              />
              {fieldErrors.transactionDate && <small className="field-error">{fieldErrors.transactionDate}</small>}
            </label>
            <label htmlFor="categoryId">
              Categoria
              <select
                id="categoryId"
                value={form.categoryId}
                onChange={(e) => update('categoryId', e.target.value)}
              >
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

          <label htmlFor="description">
            Descrição
            <input
              id="description"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
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
