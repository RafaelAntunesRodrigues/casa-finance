export function centsToBRL(cents) {
  return ((cents ?? 0) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/** Converte string digitada ("2.459,90" ou "2459,90") em centavos inteiros. */
export function brlInputToCents(value) {
  if (value === null || value === undefined || value === '') return NaN;
  const normalized = String(value).trim().replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return NaN;
  return Math.round(parsed * 100);
}

export function centsToInputString(cents) {
  return ((cents ?? 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
