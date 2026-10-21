export const TYPE_LABEL = { INCOME: 'Entrada', EXPENSE: 'Saída', INVESTMENT: 'Investimento' };
export const TYPE_CLASS = { INCOME: 'income', EXPENSE: 'expense', INVESTMENT: 'investment' };
export const TYPE_SIGN = { INCOME: '+ ', EXPENSE: '− ', INVESTMENT: '− ' };

export function typeClass(type) {
  return TYPE_CLASS[type] || 'expense';
}

export function typeSign(type) {
  return TYPE_SIGN[type] || '';
}

export function typeLabel(type) {
  return TYPE_LABEL[type] || type;
}
