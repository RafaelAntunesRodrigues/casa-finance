import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../services/api.js';
import { centsToBRL } from '../utils/money.js';
import { currentMonth, monthLabel } from '../utils/date.js';
import MonthPicker from '../components/MonthPicker.jsx';
import CategoryBarList from '../components/CategoryBarList.jsx';
import RecentTransactions from '../components/RecentTransactions.jsx';
import TransactionFormModal from '../components/TransactionFormModal.jsx';
import { useToast } from '../hooks/useToast.jsx';

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalType, setModalType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, cats] = await Promise.all([
        api.get('/dashboard', { month }),
        api.get('/categories', { active: true }),
      ]);
      setData(dashboard);
      setCategories(cats);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o dashboard.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(payload) {
    setSubmitting(true);
    try {
      await api.post('/transactions', payload);
      setModalType(null);
      toast.success('Movimentação registrada com sucesso.');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">CONTROLE FINANCEIRO DA CASA</p>
          <h1>Visão geral</h1>
        </div>
        <div className="top-actions">
          <MonthPicker value={month} onChange={setMonth} />
        </div>
      </header>

      {loading && <div className="state-banner">Carregando…</div>}
      {!loading && error && <div className="state-banner error">{error}</div>}

      {!loading && !error && data && (
        <>
          <section className="balance-card">
            <div>
              <span>Saldo acumulado até {monthLabel(month)}</span>
              <strong>{centsToBRL(data.balanceCents)}</strong>
              <small>
                {data.netCents >= 0 ? '+ ' : '− '}
                {centsToBRL(Math.abs(data.netCents))} no mês
              </small>
            </div>
            <div className="house-icon">⌂</div>
          </section>

          <section className="stat-grid">
            <article className="stat">
              <div className="stat-icon in">↑</div>
              <div>
                <span>Entradas no mês</span>
                <strong>{centsToBRL(data.incomeCents)}</strong>
              </div>
            </article>
            <article className="stat">
              <div className="stat-icon out">↓</div>
              <div>
                <span>Saídas no mês</span>
                <strong>{centsToBRL(data.expenseCents)}</strong>
              </div>
            </article>
            <article className="stat">
              <div className="stat-icon net">↗</div>
              <div>
                <span>Resultado do mês</span>
                <strong>{centsToBRL(data.netCents)}</strong>
              </div>
            </article>
            <article className="stat">
              <div className="stat-icon inv">◎</div>
              <div>
                <span>Investido no mês</span>
                <strong>{centsToBRL(data.investmentCents)}</strong>
              </div>
            </article>
          </section>

          <section className="quick-actions">
            <button className="btn primary" onClick={() => setModalType('INCOME')}>
              + Adicionar entrada
            </button>
            <button className="btn danger" onClick={() => setModalType('EXPENSE')}>
              − Adicionar saída
            </button>
            <button className="btn invest" onClick={() => setModalType('INVESTMENT')}>
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
              <CategoryBarList items={data.expensesByCategory} />
            </article>

            <article className="panel recent">
              <div className="panel-title">
                <div>
                  <span className="eyebrow">RECENTES</span>
                  <h2>Últimas movimentações</h2>
                </div>
              </div>
              <RecentTransactions items={data.recentTransactions} />
            </article>
          </section>
        </>
      )}

      <button className="fab" onClick={() => setModalType('EXPENSE')} aria-label="Nova movimentação">
        +
      </button>

      <TransactionFormModal
        open={modalType !== null}
        categories={categories}
        initial={null}
        defaultType={modalType}
        onCancel={() => setModalType(null)}
        onSubmit={handleCreate}
        submitting={submitting}
      />
    </>
  );
}
