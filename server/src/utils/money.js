/**
 * Dinheiro sempre trafega/persiste em centavos inteiros (RNF04). Estas
 * funções fazem a ponte com a representação decimal usada só na exibição.
 */

export function isValidAmountCents(value) {
  return Number.isInteger(value) && value > 0;
}

export function centsToBRL(cents) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function reaisStringToCents(value) {
  if (typeof value === 'number') {
    return Math.round(value * 100);
  }
  const normalized = String(value).trim().replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return NaN;
  return Math.round(parsed * 100);
}
