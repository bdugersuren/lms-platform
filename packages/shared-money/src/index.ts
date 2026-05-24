export type CurrencyCode = 'MNT' | 'USD';
export type MoneyString = string;

const MONEY_PATTERN = /^-?\d+(\.\d{1,2})?$/;

export function normalizeMoneyInput(value: string | number): MoneyString {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Money amount must be finite');
    return value.toFixed(2);
  }

  const normalized = value.trim().replace(/,/g, '');
  if (!MONEY_PATTERN.test(normalized)) {
    throw new Error(`Invalid money amount: ${value}`);
  }

  const [whole, fraction = ''] = normalized.split('.');
  return `${whole}.${fraction.padEnd(2, '0').slice(0, 2)}`;
}

export function isMoneyString(value: unknown): value is MoneyString {
  return typeof value === 'string' && MONEY_PATTERN.test(value);
}

export function assertPositiveMoney(value: string | number): MoneyString {
  const normalized = normalizeMoneyInput(value);
  if (Number(normalized) <= 0) throw new Error('Money amount must be positive');
  return normalized;
}

export function formatMoney(
  value: string | number | null | undefined,
  currency: CurrencyCode | string = 'MNT',
  locale = 'mn-MN',
): string {
  if (value === null || value === undefined) return currency === 'MNT' ? '₮0' : `0 ${currency}`;
  const normalized = normalizeMoneyInput(value);
  const formatted = Number(normalized).toLocaleString(locale, {
    minimumFractionDigits: Number(normalized) % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return currency === 'MNT' ? `₮${formatted}` : `${formatted} ${currency}`;
}
