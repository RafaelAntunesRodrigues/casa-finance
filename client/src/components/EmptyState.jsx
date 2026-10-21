export default function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">⌂</div>
      <strong>{title}</strong>
      {description && <span>{description}</span>}
    </div>
  );
}
