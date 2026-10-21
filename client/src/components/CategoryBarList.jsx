import { centsToBRL } from '../utils/money.js';
import EmptyState from './EmptyState.jsx';

export default function CategoryBarList({ items }) {
  if (!items || items.length === 0) {
    return <EmptyState title="Sem gastos no mês" description="Os gastos por categoria aparecerão aqui." />;
  }

  const max = Math.max(...items.map((i) => i.amountCents));

  return (
    <div>
      {items.map((item) => (
        <div className="chart-row" key={item.categoryId}>
          <span>{item.categoryName}</span>
          <div className="bar">
            <i style={{ width: `${max ? (item.amountCents / max) * 100 : 0}%` }} />
          </div>
          <strong>{centsToBRL(item.amountCents)}</strong>
        </div>
      ))}
    </div>
  );
}
