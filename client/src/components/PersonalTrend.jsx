import { centsToBRL } from '../utils/money.js';
import { monthLabel } from '../utils/date.js';

export default function PersonalTrend({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="trend-list">
      {items.map((m) => (
        <div className="trend-row" key={m.month}>
          <span className="trend-month">{monthLabel(m.month)}</span>
          <span className="trend-figure in">+{centsToBRL(m.incomeCents)}</span>
          <span className="trend-figure out">−{centsToBRL(m.expenseCents)}</span>
          <strong className={`trend-figure ${m.netCents >= 0 ? 'in' : 'out'}`}>
            {m.netCents >= 0 ? '+' : '−'}
            {centsToBRL(Math.abs(m.netCents))}
          </strong>
        </div>
      ))}
    </div>
  );
}
