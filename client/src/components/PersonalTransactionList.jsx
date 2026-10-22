import { centsToBRL } from '../utils/money.js';
import { formatDateBR } from '../utils/date.js';
import { typeClass, typeSign } from '../utils/transactionType.js';
import EmptyState from './EmptyState.jsx';

function kindBadge(t) {
  if (t.expenseKind === 'FIXED') return 'Fixo';
  if (t.expenseKind === 'INSTALLMENT') return `Parcela ${t.installmentNumber}/${t.installmentTotal}`;
  return null;
}

export default function PersonalTransactionList({ items, onDelete }) {
  if (!items || items.length === 0) {
    return <EmptyState title="Nenhuma movimentação" description="Registre uma entrada, saída ou investimento pessoal." />;
  }

  return (
    <div>
      {items.map((t) => {
        const badge = kindBadge(t);
        return (
          <div className="transaction" key={t.id}>
            <div className={`t-icon ${typeClass(t.type)}`}>{t.categoryName.charAt(0).toUpperCase()}</div>
            <div className="t-main">
              <strong>{t.description}</strong>
              <span>
                {t.categoryName} • {formatDateBR(t.transactionDate)}
                {badge ? ` • ${badge}` : ''}
              </span>
            </div>
            <div className="personal-tx-end">
              <strong className={`amount ${typeClass(t.type)}`}>
                {typeSign(t.type)}
                {centsToBRL(t.amountCents)}
              </strong>
              {onDelete && (
                <button className="link-btn danger" onClick={() => onDelete(t)}>
                  Excluir
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
