import { centsToBRL } from '../utils/money.js';
import { formatDateBR } from '../utils/date.js';
import EmptyState from './EmptyState.jsx';

export default function TransactionList({ items, onEdit, onDelete }) {
  if (items.length === 0) {
    return <EmptyState title="Nenhuma movimentação" description="Ajuste os filtros ou registre uma nova entrada/saída." />;
  }

  return (
    <>
      <table className="transactions-table">
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Data</th>
            <th>Responsável</th>
            <th className="align-right">Valor</th>
            <th aria-label="Ações" />
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id}>
              <td>{t.description}</td>
              <td>{t.categoryName}</td>
              <td>{formatDateBR(t.transactionDate)}</td>
              <td>{t.createdByName}</td>
              <td className={`align-right amount ${t.type === 'INCOME' ? 'income' : 'expense'}`}>
                {t.type === 'INCOME' ? '+ ' : '− '}
                {centsToBRL(t.amountCents)}
              </td>
              <td className="row-actions">
                <button className="link-btn" onClick={() => onEdit(t)}>
                  Editar
                </button>
                <button className="link-btn danger" onClick={() => onDelete(t)}>
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="transaction-cards">
        {items.map((t) => (
          <div className="transaction-card" key={t.id}>
            <div className="transaction-card-main">
              <div className={`t-icon ${t.type === 'INCOME' ? 'income' : 'expense'}`}>
                {t.categoryName.charAt(0).toUpperCase()}
              </div>
              <div className="t-main">
                <strong>{t.description}</strong>
                <span>
                  {t.categoryName} • {formatDateBR(t.transactionDate)} • {t.createdByName}
                </span>
              </div>
              <strong className={`amount ${t.type === 'INCOME' ? 'income' : 'expense'}`}>
                {t.type === 'INCOME' ? '+ ' : '− '}
                {centsToBRL(t.amountCents)}
              </strong>
            </div>
            <div className="transaction-card-actions">
              <button className="link-btn" onClick={() => onEdit(t)}>
                Editar
              </button>
              <button className="link-btn danger" onClick={() => onDelete(t)}>
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
