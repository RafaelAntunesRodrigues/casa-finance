import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../services/api.js';
import { useToast } from '../hooks/useToast.jsx';

const KIND_LABEL = { INCOME: 'Entrada', EXPENSE: 'Saída', BOTH: 'Ambos' };

const EMPTY_FORM = { name: '', kind: 'EXPENSE' };

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCategories(await api.get('/categories'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as categorias.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(category) {
    setEditingId(category.id);
    setForm({ name: category.name, kind: category.kind });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Informe o nome da categoria.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, form);
        toast.success('Categoria atualizada.');
      } else {
        await api.post('/categories', form);
        toast.success('Categoria criada.');
      }
      cancelEdit();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível salvar a categoria.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(category) {
    try {
      await api.patch(`/categories/${category.id}/status`, { active: !category.active });
      toast.success(category.active ? 'Categoria inativada.' : 'Categoria reativada.');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível atualizar a categoria.');
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">CONTROLE FINANCEIRO DA CASA</p>
          <h1>Categorias</h1>
        </div>
      </header>

      <section className="panel">
        <form className="category-form" onSubmit={handleSubmit}>
          <label htmlFor="cat-name">
            Nome
            <input
              id="cat-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label htmlFor="cat-kind">
            Tipo
            <select
              id="cat-kind"
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
            >
              <option value="EXPENSE">Saída</option>
              <option value="INCOME">Entrada</option>
              <option value="BOTH">Ambos</option>
            </select>
          </label>
          <div className="category-form-actions">
            <button type="submit" className="btn primary" disabled={submitting}>
              {editingId ? 'Salvar alterações' : '+ Nova categoria'}
            </button>
            {editingId && (
              <button type="button" className="btn ghost" onClick={cancelEdit}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      {loading && <div className="state-banner">Carregando…</div>}
      {!loading && error && <div className="state-banner error">{error}</div>}

      {!loading && !error && (
        <section className="panel">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Status</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className={c.active ? '' : 'muted-row'}>
                  <td>{c.name}</td>
                  <td>{KIND_LABEL[c.kind]}</td>
                  <td>{c.active ? 'Ativa' : 'Inativa'}</td>
                  <td className="row-actions">
                    <button className="link-btn" onClick={() => startEdit(c)}>
                      Editar
                    </button>
                    <button className="link-btn danger" onClick={() => toggleActive(c)}>
                      {c.active ? 'Inativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
