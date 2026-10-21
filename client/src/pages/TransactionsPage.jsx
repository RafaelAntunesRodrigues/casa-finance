import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../services/api.js';
import { currentMonth } from '../utils/date.js';
import MonthPicker from '../components/MonthPicker.jsx';
import TransactionList from '../components/TransactionList.jsx';
import TransactionFormModal from '../components/TransactionFormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../hooks/useToast.jsx';

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [type, setType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const [result, setResult] = useState({ items: [], total: 0 });
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const toast = useToast();

  const filters = { month, type: type || undefined, categoryId: categoryId || undefined, createdBy: createdBy || undefined, q: q || undefined };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, cats, usersList] = await Promise.all([
        api.get('/transactions', { ...filters, page, pageSize: PAGE_SIZE }),
        api.get('/categories'),
        api.get('/users'),
      ]);
      setResult(list);
      setCategories(cats);
      setUsers(usersList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as movimentações.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, type, categoryId, createdBy, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  function resetToFirstPage(setter) {
    return (value) => {
      setPage(1);
      setter(value);
    };
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(transaction) {
    setEditing(transaction);
    setModalOpen(true);
  }

  async function handleSubmit(payload) {
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/transactions/${editing.id}`, payload);
        toast.success('Movimentação atualizada.');
      } else {
        await api.post('/transactions', payload);
        toast.success('Movimentação registrada.');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    try {
      await api.delete(`/transactions/${toDelete.id}`);
      toast.success('Movimentação excluída. O saldo foi recalculado.');
      setToDelete(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível excluir.');
    }
  }

  function exportCsvUrl() {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    return `/api/transactions/export.csv?${params.toString()}`;
  }

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">CONTROLE FINANCEIRO DA CASA</p>
          <h1>Movimentações</h1>
        </div>
        <div className="top-actions">
          <MonthPicker value={month} onChange={resetToFirstPage(setMonth)} />
        </div>
      </header>

      <section className="filters-bar">
        <select value={type} onChange={(e) => resetToFirstPage(setType)(e.target.value)}>
          <option value="">Todos os tipos</option>
          <option value="INCOME">Entradas</option>
          <option value="EXPENSE">Saídas</option>
        </select>
        <select value={categoryId} onChange={(e) => resetToFirstPage(setCategoryId)(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={createdBy} onChange={(e) => resetToFirstPage(setCreatedBy)(e.target.value)}>
          <option value="">Todos os usuários</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Buscar na descrição…"
          value={q}
          onChange={(e) => resetToFirstPage(setQ)(e.target.value)}
        />
        <a className="btn ghost" href={exportCsvUrl()} target="_blank" rel="noreferrer">
          Exportar CSV
        </a>
        <button className="btn primary" onClick={openCreate}>
          + Nova movimentação
        </button>
      </section>

      {loading && <div className="state-banner">Carregando…</div>}
      {!loading && error && <div className="state-banner error">{error}</div>}

      {!loading && !error && (
        <>
          <TransactionList items={result.items} onEdit={openEdit} onDelete={setToDelete} />

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button className="btn ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      <button className="fab" onClick={openCreate} aria-label="Nova movimentação">
        +
      </button>

      <TransactionFormModal
        open={modalOpen}
        categories={categories}
        initial={editing}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Excluir movimentação"
        message={`Tem certeza que deseja excluir "${toDelete?.description}"? O saldo será recalculado.`}
        confirmLabel="Excluir"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
