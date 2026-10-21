export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', onConfirm, onCancel, danger }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <section className="modal confirm-modal" role="alertdialog" aria-modal="true">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
