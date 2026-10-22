import { centsToBRL } from '../utils/money.js';
import EmptyState from './EmptyState.jsx';

export default function CategoryBarList({ items, onSelect, selectedId }) {
  if (!items || items.length === 0) {
    return <EmptyState title="Sem gastos no mês" description="Os gastos por categoria aparecerão aqui." />;
  }

  const max = Math.max(...items.map((i) => i.amountCents));
  const Row = onSelect ? 'button' : 'div';

  return (
    <div>
      {items.map((item) => (
        <Row
          type={onSelect ? 'button' : undefined}
          className={`chart-row${onSelect ? ' chart-row-clickable' : ''}${selectedId === item.categoryId ? ' chart-row-selected' : ''}`}
          key={item.categoryId}
          onClick={onSelect ? () => onSelect(item) : undefined}
        >
          <span>{item.categoryName}</span>
          <div className="bar">
            <i style={{ width: `${max ? (item.amountCents / max) * 100 : 0}%` }} />
          </div>
          <strong>{centsToBRL(item.amountCents)}</strong>
        </Row>
      ))}
    </div>
  );
}
