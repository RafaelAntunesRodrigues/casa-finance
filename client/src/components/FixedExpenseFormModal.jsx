import { useEffect, useState } from 'react';
import { brlInputToCents } from '../utils/money.js';
import { currentMonth } from '../utils/date.js';

function buildEmptyForm() {
  return {
    description: '',
    amount: '',
    dayOfMonth: '5',
    startMonth: currentMonth(),
    categoryId: '',
  };
}

export default function FixedExpenseFormModal({ open, categories, onCancel, onSubmit, submitting }) {
  const [form, setForm] = useState(buildEmptyForm());
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(buildEmptyForm());
    setFieldErrors({});
  }, [open]);

  if (!open) return null;

  const expenseCategories = categories.filter((c) => c.kind === 'EXPENSE' || c.kind === 'BOTH');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const errors = {};
    const amountCents = brlInputToCents(form.amount);
    if (!Number.isInteger(amountCents) || amountCents <= 0) errors.amount = 'Informe um valor maior que zero';
    if (!form.description.trim()) errors.description = 'Informe a descrição';
    if (!form.categoryId) errors.categoryId = 'Selecione uma categoria';
    const day = Number(form.dayOfMonth);
    if (!Number.isInteger(day) || day < 1 || day > 28) errors.dayOfMonth = 'Use um dia entre 1 e 28';
    if (!form.startMonth) errors.startMonth = 'Informe o mês inicial';
    return errors;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    onSubmit({
      description: form.description.trim(),
      amountCents: brlInputToCents(form.amount),
      categoryId: Number(form.categoryId),
      dayOfMonth: Number(form.dayOfMonth),
      startMonth: form.startMonth,
    });
  }

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <section className="modal">
        <div className="modal-head">
          <div>
            <span className="eyebrow">NOVO GASTO FIXO</span>
            <h2>Repete todo mês</h2>
          </div>
          <button className="close" onClick={onCancel} aria-label="Fechar">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="f-description">
            Descrição
            <input
              id="f-description"
              placeholder="Ex: Assinatura streaming"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
            {fieldErrors.description && <small className="field-error">{fieldErrors.description}</small>}
          </label>

          <label htmlFor="f-amount">
            Valor
            <div className="money-input">
              <span>R$</span>
              <input
                id="f-amount"
                inputMode="decimal"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => update('amount', e.target.value)}
              />
            </div>
            {fieldErrors.amount && <small className="field-error">{fieldErrors.amount}</small>}
          </label>

          <label htmlFor="f-category">
            Categoria
            <select id="f-category" value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)}>
              <option value="">Selecione…</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && <small className="field-error">{fieldErrors.categoryId}</small>}
          </label>

          <div className="two-col">
            <label htmlFor="f-day">
              Dia do vencimento
              <input
                id="f-day"
                type="number"
                min="1"
                max="28"
                value={form.dayOfMonth}
                onChange={(e) => update('dayOfMonth', e.target.value)}
              />
              {fieldErrors.dayOfMonth && <small className="field-error">{fieldErrors.dayOfMonth}</small>}
            </label>
            <label htmlFor="f-start">
              A partir de
              <input
                id="f-start"
                type="month"
                value={form.startMonth}
                onChange={(e) => update('startMonth', e.target.value)}
              />
              {fieldErrors.startMonth && <small className="field-error">{fieldErrors.startMonth}</small>}
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? 'Salvando…' : 'Salvar gasto fixo'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
