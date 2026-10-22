import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../services/api.js';
import { centsToBRL } from '../utils/money.js';
import { currentMonth, monthLabel } from '../utils/date.js';
import MonthPicker from '../components/MonthPicker.jsx';
import CategoryBarList from '../components/CategoryBarList.jsx';
import PersonalTransactionList from '../components/PersonalTransactionList.jsx';
import PersonalTransactionFormModal from '../components/PersonalTransactionFormModal.jsx';
import FixedExpenseFormModal from '../components/FixedExpenseFormModal.jsx';
import PersonalTrend from '../components/PersonalTrend.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';

export default function PersonalPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [month, setMonth] = useState(currentMonth());
  const [categories, setCategories] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [monthExpenses, setMonthExpenses] = useState([]);
  const [fixedTemplates, setFixedTemplates] = useState([]);
  const [activityTab, setActivityTab] = useState('recent');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalType, setModalType] = useState(null);
  const [editingTx, setEditingTx] = useState(null);
  const [fixedModalOpen, setFixedModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toDeleteTx, setToDeleteTx] = useState(null);
  const [toDeleteFixed, setToDeleteFixed] = useState(null);

  const toast = useToast();

  useEffect(() => {
    api
      .get('/users')
      .then((users) => {
        setMembers(users);
        const preferred = users.find((u) => u.id === user?.id) || users[0];
        setOwnerId(preferred?.id ?? null);
      })
      .catch(() => {});
  }, [user]);

  const load = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    setError('');
    try {
      const [dash, cats, fixed, expenses] = await Promise.all([
        api.get(`/personal/${ownerId}/dashboard`, { month }),
        api.get('/categories', { active: true, scope: 'PERSONAL' }),
        api.get(`/personal/${ownerId}/fixed-expenses`),
        api.get(`/personal/${ownerId}/transactions`, { month, type: 'EXPENSE', pageSize: 200 }),
      ]);
      setDashboard(dash);
      setCategories(cats);
      setFixedTemplates(fixed);
      setMonthExpenses(expenses.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o módulo pessoal.');
    } finally {
      setLoading(false);
    }
  }, [ownerId, month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setCategoryFilter(null);
  }, [ownerId, month]);

  function selectCategory(item) {
    setCategoryFilter({ id: item.categoryId, name: item.categoryName });
    setActivityTab('expenses');
  }

  function openCreate(type) {
    setEditingTx(null);
    setModalType(type);
  }

  function openEdit(transaction) {
    setEditingTx(transaction);
    setModalType(transaction.type);
  }

  function closeTransactionModal() {
    setModalType(null);
    setEditingTx(null);
  }

  async function handleSubmitTransaction(payload) {
    setSubmitting(true);
    try {
      if (editingTx) {
        await api.put(`/personal/${ownerId}/transactions/${editingTx.id}`, payload);
        toast.success('Movimentação atualizada.');
      } else {
        await api.post(`/personal/${ownerId}/transactions`, payload);
        toast.success('Movimentação registrada.');
      }
      closeTransactionModal();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeleteTransaction() {
    try {
      await api.delete(`/personal/${ownerId}/transactions/${toDeleteTx.id}`);
      toast.success('Movimentação excluída.');
      setToDeleteTx(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível excluir.');
    }
  }

  async function handleCreateFixed(payload) {
    setSubmitting(true);
    try {
      await api.post(`/personal/${ownerId}/fixed-expenses`, payload);
      setFixedModalOpen(false);
      toast.success('Gasto fixo criado.');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível salvar o gasto fixo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleFixedActive(template) {
    try {
      await api.patch(`/personal/${ownerId}/fixed-expenses/${template.id}/status`, { active: !template.active });
      toast.success(template.active ? 'Gasto fixo pausado.' : 'Gasto fixo reativado.');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível atualizar.');
    }
  }

  async function confirmDeleteFixed() {
    try {
      await api.delete(`/personal/${ownerId}/fixed-expenses/${toDeleteFixed.id}`);
      toast.success('Gasto fixo excluído.');
      setToDeleteFixed(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível excluir.');
    }
  }

  const activeMember = members.find((m) => m.id === ownerId);
  const totalFixedCents = fixedTemplates.filter((f) => f.active).reduce((sum, f) => sum + f.amountCents, 0);

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">MÓDULO PESSOAL</p>
          <h1>{activeMember ? activeMember.name : 'Pessoal'}</h1>
        </div>
        <div className="top-actions">
          <MonthPicker value={month} onChange={setMonth} />
        </div>
      </header>

      {members.length > 0 && (
        <div className="segmented" style={{ '--segments': members.length, maxWidth: 320 }}>
          {members.map((m) => (
            <button key={m.id} type="button" className={m.id === ownerId ? 'selected' : ''} onClick={() => setOwnerId(m.id)}>
              {m.name}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="state-banner">Carregando…</div>}
      {!loading && error && <div className="state-banner error">{error}</div>}

      {!loading && !error && dashboard && (
        <>
          <section className="balance-card">
            <div>
              <span>Saldo pessoal em {monthLabel(month)}</span>
              <strong>{centsToBRL(dashboard.netCents)}</strong>
              <small>Entradas e saídas valem só para este mês — não acumula de um mês para o outro.</small>
            </div>
            <div className="house-icon">◐</div>
          </section>

          <section className="stat-grid">
            <article className="stat">
              <div className="stat-icon in">↑</div>
              <div>
                <span>Entradas no mês</span>
                <strong>{centsToBRL(dashboard.incomeCents)}</strong>
              </div>
            </article>
            <article className="stat">
              <div className="stat-icon out">↓</div>
              <div>
                <span>Saídas no mês</span>
                <strong>{centsToBRL(dashboard.expenseCents)}</strong>
              </div>
            </article>
            <article className="stat">
              <div className="stat-icon net">↗</div>
              <div>
                <span>Resultado do mês</span>
                <strong>{centsToBRL(dashboard.netCents)}</strong>
              </div>
            </article>
            <article className="stat">
              <div className="stat-icon inv">◎</div>
              <div>
                <span>Investido no mês</span>
                <strong>{centsToBRL(dashboard.investmentCents)}</strong>
              </div>
            </article>
          </section>

          <section className="quick-actions">
            <button className="btn primary" onClick={() => openCreate('INCOME')}>
              + Entrada
            </button>
            <button className="btn danger" onClick={() => openCreate('EXPENSE')}>
              − Saída
            </button>
            <button className="btn invest" onClick={() => openCreate('INVESTMENT')}>
              ◎ Investir
            </button>
          </section>

          <section className="content-grid">
            <article className="panel spending">
              <div className="panel-title">
                <div>
                  <span className="eyebrow">{monthLabel(month).toUpperCase()}</span>
                  <h2>Gastos por categoria</h2>
                </div>
              </div>
              <CategoryBarList
                items={dashboard.expensesByCategory}
                onSelect={selectCategory}
                selectedId={activityTab === 'expenses' ? categoryFilter?.id : undefined}
              />
            </article>

            <article className="panel recent">
              <div className="panel-title">
                <div>
                  <span className="eyebrow">{activityTab === 'recent' ? 'RECENTES' : monthLabel(month).toUpperCase()}</span>
                  <h2>{activityTab === 'recent' ? 'Últimas movimentações' : 'Gastos do mês'}</h2>
                </div>
              </div>
              <div className="segmented" style={{ '--segments': 2, marginTop: 0, marginBottom: 16 }}>
                <button
                  type="button"
                  className={activityTab === 'recent' ? 'selected' : ''}
                  onClick={() => {
                    setActivityTab('recent');
                    setCategoryFilter(null);
                  }}
                >
                  Recentes
                </button>
                <button type="button" className={activityTab === 'expenses' ? 'selected' : ''} onClick={() => setActivityTab('expenses')}>
                  Gastos do mês
                </button>
              </div>

              {activityTab === 'expenses' && categoryFilter && (
                <div className="filter-chip">
                  Filtrando por <strong>{categoryFilter.name}</strong>
                  <button type="button" onClick={() => setCategoryFilter(null)} aria-label="Limpar filtro">
                    ×
                  </button>
                </div>
              )}

              {activityTab === 'recent' ? (
                <PersonalTransactionList items={dashboard.recentTransactions} onEdit={openEdit} onDelete={setToDeleteTx} />
              ) : (
                <PersonalTransactionList
                  items={categoryFilter ? monthExpenses.filter((t) => t.categoryId === categoryFilter.id) : monthExpenses}
                  onEdit={openEdit}
                  onDelete={setToDeleteTx}
                />
              )}
            </article>
          </section>

          <section className="panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">HISTÓRICO</span>
                <h2>Acompanhamento dos últimos meses</h2>
              </div>
            </div>
            <PersonalTrend items={dashboard.monthlyTrend} />
          </section>

          <section className="panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">RECORRENTE</span>
                <h2>Gastos fixos</h2>
              </div>
              <button className="link-btn" onClick={() => setFixedModalOpen(true)}>
                + Novo
              </button>
            </div>

            {fixedTemplates.length > 0 && (
              <div className="fixed-total">
                Total mensal em gastos fixos: <strong>{centsToBRL(totalFixedCents)}</strong>
              </div>
            )}

            {fixedTemplates.length === 0 ? (
              <EmptyState title="Nenhum gasto fixo cadastrado" description="Ex: assinaturas, aluguel, mensalidades." />
            ) : (
              <div className="fixed-list">
                {fixedTemplates.map((f) => (
                  <div className={`fixed-row ${f.active ? '' : 'fixed-paused'}`} key={f.id}>
                    <div>
                      <strong>{f.description}</strong>
                      <span>
                        {f.categoryName} • dia {f.dayOfMonth} • desde {monthLabel(f.startMonth)}
                      </span>
                    </div>
                    <strong className="amount expense">{centsToBRL(f.amountCents)}</strong>
                    <div className="fixed-actions">
                      <button className="link-btn" onClick={() => toggleFixedActive(f)}>
                        {f.active ? 'Pausar' : 'Reativar'}
                      </button>
                      <button className="link-btn danger" onClick={() => setToDeleteFixed(f)}>
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <PersonalTransactionFormModal
        open={modalType !== null}
        categories={categories}
        initial={editingTx}
        defaultType={modalType}
        onCancel={closeTransactionModal}
        onSubmit={handleSubmitTransaction}
        submitting={submitting}
      />

      <FixedExpenseFormModal
        open={fixedModalOpen}
        categories={categories}
        onCancel={() => setFixedModalOpen(false)}
        onSubmit={handleCreateFixed}
        submitting={submitting}
      />

      <ConfirmDialog
        open={!!toDeleteTx}
        title="Excluir movimentação"
        message={`Tem certeza que deseja excluir "${toDeleteTx?.description}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={confirmDeleteTransaction}
        onCancel={() => setToDeleteTx(null)}
      />

      <ConfirmDialog
        open={!!toDeleteFixed}
        title="Excluir gasto fixo"
        message={`Isso para a geração de novos meses para "${toDeleteFixed?.description}". Lançamentos já gerados continuam na lista.`}
        confirmLabel="Excluir"
        danger
        onConfirm={confirmDeleteFixed}
        onCancel={() => setToDeleteFixed(null)}
      />
    </>
  );
}
