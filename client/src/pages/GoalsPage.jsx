import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../services/api.js';
import { currentMonth, monthLabel } from '../utils/date.js';
import MonthPicker from '../components/MonthPicker.jsx';
import GoalCard from '../components/GoalCard.jsx';
import GoalFormModal from '../components/GoalFormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../hooks/useToast.jsx';

export default function GoalsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [goals, setGoals] = useState([]);
  const [houseCategories, setHouseCategories] = useState([]);
  const [personalCategories, setPersonalCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [goalsList, houseCats, personalCats, users] = await Promise.all([
        api.get('/goals', { month }),
        api.get('/categories', { active: true, scope: 'HOUSE' }),
        api.get('/categories', { active: true, scope: 'PERSONAL' }),
        api.get('/users'),
      ]);
      setGoals(goalsList);
      setHouseCategories(houseCats);
      setPersonalCategories(personalCats);
      setMembers(users);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as metas.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(goal) {
    setEditing(goal);
    setModalOpen(true);
  }

  async function handleSubmit(payload) {
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/goals/${editing.id}`, payload);
        toast.success('Meta atualizada.');
      } else {
        await api.post('/goals', payload);
        toast.success('Meta criada.');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível salvar a meta.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(goal) {
    try {
      await api.patch(`/goals/${goal.id}/status`, { active: !goal.active });
      toast.success(goal.active ? 'Meta pausada.' : 'Meta reativada.');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível atualizar a meta.');
    }
  }

  async function confirmDelete() {
    try {
      await api.delete(`/goals/${toDelete.id}`);
      toast.success('Meta excluída.');
      setToDelete(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível excluir a meta.');
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">CONTROLE FINANCEIRO DA CASA</p>
          <h1>Metas</h1>
        </div>
        <div className="top-actions">
          <MonthPicker value={month} onChange={setMonth} />
        </div>
      </header>

      <section className="quick-actions">
        <button className="btn primary" onClick={openCreate}>
          + Nova meta
        </button>
      </section>

      {loading && <div className="state-banner">Carregando…</div>}
      {!loading && error && <div className="state-banner error">{error}</div>}

      {!loading && !error && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">{monthLabel(month).toUpperCase()}</span>
              <h2>Metas do mês</h2>
            </div>
          </div>

          {goals.length === 0 ? (
            <EmptyState
              title="Nenhuma meta para este mês"
              description="Crie uma meta de economia ou um limite de gasto por categoria."
            />
          ) : (
            <div className="goal-list">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={openEdit}
                  onToggleActive={toggleActive}
                  onDelete={setToDelete}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <GoalFormModal
        open={modalOpen}
        month={month}
        houseCategories={houseCategories}
        personalCategories={personalCategories}
        members={members}
        initial={editing}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Excluir meta"
        message={`Tem certeza que deseja excluir a meta "${toDelete?.name}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
