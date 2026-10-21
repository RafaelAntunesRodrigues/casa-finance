import { useEffect, useState } from 'react';
import { brlInputToCents, centsToInputString } from '../utils/money.js';

function buildEmptyForm(month) {
  return {
    name: '',
    target: '',
    categoryId: '',
    recurrence: 'MONTHLY',
    month,
  };
}

export default function GoalFormModal({ open, month, categories, initial, onCancel, onSubmit, submitting }) {
  const [form, setForm] = useState(buildEmptyForm(month));
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        target: centsToInputString(initial.targetCents),
        categoryId: initial.categoryId ? String(initial.categoryId) : '',
        recurrence: initial.recurrence,
        month: initial.month || month,
      });
    } else {
      setForm(buildEmptyForm(month));
    }
    setFieldErrors({});
  }, [open, initial, month]);

  if (!open) return null;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const errors = {};
    const targetCents = brlInputToCents(form.target);
    if (!Number.isInteger(targetCents) || targetCents <= 0) {
      errors.target = 'Informe um valor maior que zero';
    }
    if (!form.name.trim()) errors.name = 'Informe um nome para a meta';
    if (form.recurrence === 'ONCE' && !form.month) {
      errors.month = 'Informe o mês desta meta';
    }
    return errors;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    onSubmit({
      name: form.name.trim(),
      targetCents: brlInputToCents(form.target),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      recurrence: form.recurrence,
      month: form.recurrence === 'ONCE' ? form.month : null,
    });
  }

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <section className="modal">
        <div className="modal-head">
          <div>
            <span className="eyebrow">{initial ? 'EDITAR' : 'NOVA'} META</span>
            <h2>{form.categoryId ? 'Limite de gasto' : 'Alvo de economia'}</h2>
          </div>
          <button className="close" onClick={onCancel} aria-label="Fechar">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="goal-name">
            Nome da meta
            <input
              id="goal-name"
              placeholder="Ex: Guardar para a casa"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
            {fieldErrors.name && <small className="field-error">{fieldErrors.name}</small>}
          </label>

          <label htmlFor="goal-target">
            Valor alvo
            <div className="money-input">
              <span>R$</span>
              <input
                id="goal-target"
                inputMode="decimal"
                placeholder="0,00"
                value={form.target}
                onChange={(e) => update('target', e.target.value)}
              />
            </div>
            {fieldErrors.target && <small className="field-error">{fieldErrors.target}</small>}
          </label>

          <label htmlFor="goal-category">
            Categoria (opcional)
            <select
              id="goal-category"
              value={form.categoryId}
              onChange={(e) => update('categoryId', e.target.value)}
            >
              <option value="">Nenhuma — meta de economia (saldo do mês)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <small className="field-hint">
              {form.categoryId
                ? 'Com categoria: a meta vira um limite de gasto (quanto você gastou nessa categoria vs o valor alvo).'
                : 'Sem categoria: a meta compara o resultado do mês (entradas − saídas − investimentos) com o valor alvo.'}
            </small>
          </label>

          <div className="segmented" style={{ '--segments': 2 }}>
            <button
              type="button"
              className={form.recurrence === 'MONTHLY' ? 'selected' : ''}
              onClick={() => update('recurrence', 'MONTHLY')}
            >
              Repete todo mês
            </button>
            <button
              type="button"
              className={form.recurrence === 'ONCE' ? 'selected' : ''}
              onClick={() => update('recurrence', 'ONCE')}
            >
              Só este mês
            </button>
          </div>

          {form.recurrence === 'ONCE' && (
            <label htmlFor="goal-month">
              Mês da meta
              <input
                id="goal-month"
                type="month"
                value={form.month}
                onChange={(e) => update('month', e.target.value)}
              />
              {fieldErrors.month && <small className="field-error">{fieldErrors.month}</small>}
            </label>
          )}

          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? 'Salvando…' : 'Salvar meta'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
