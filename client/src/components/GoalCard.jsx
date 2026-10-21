import { centsToBRL } from '../utils/money.js';

export default function GoalCard({ goal, onEdit, onToggleActive, onDelete }) {
  const { progress } = goal;
  const isSavings = progress.kind === 'SAVINGS';
  const barPercentage = Math.max(0, Math.min(100, progress.percentage));
  const statusClass = progress.achieved ? 'goal-ok' : 'goal-off';

  return (
    <article className={`goal-card ${statusClass}`}>
      <div className="goal-card-head">
        <div>
          <strong>{goal.name}</strong>
          <span className="goal-meta">
            {isSavings ? 'Alvo de economia' : `Limite em ${goal.categoryName}`} •{' '}
            {goal.recurrence === 'MONTHLY' ? 'Repete todo mês' : `Só em ${goal.month}`}
          </span>
        </div>
        <span className="goal-status">{progress.achieved ? '✓' : '!'}</span>
      </div>

      <div className="goal-bar">
        <i style={{ width: `${barPercentage}%` }} />
      </div>

      <div className="goal-numbers">
        <span>
          {centsToBRL(progress.currentCents)} de {centsToBRL(goal.targetCents)}
        </span>
        <strong>{progress.percentage}%</strong>
      </div>

      <div className="goal-actions">
        <button className="link-btn" onClick={() => onEdit(goal)}>
          Editar
        </button>
        <button className="link-btn" onClick={() => onToggleActive(goal)}>
          {goal.active ? 'Pausar' : 'Reativar'}
        </button>
        <button className="link-btn danger" onClick={() => onDelete(goal)}>
          Excluir
        </button>
      </div>
    </article>
  );
}
