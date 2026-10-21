import { centsToBRL } from '../utils/money.js';
import { formatDateBR } from '../utils/date.js';
import EmptyState from './EmptyState.jsx';

export default function RecentTransactions({ items }) {
  if (!items || items.length === 0) {
    return <EmptyState title="Nenhuma movimentação ainda" description="Registre a primeira entrada ou saída." />;
  }

  return (
    <div>
      {items.map((t) => (
        <div className="transaction" key={t.id}>
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
      ))}
    </div>
  );
}
