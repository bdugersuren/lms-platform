export function formatDate(
  dateStr: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
  locale = 'mn-MN',
): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(locale, options);
}

export function formatDateTime(
  dateStr: string | Date | null | undefined,
  locale = 'mn-MN',
): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString(locale);
}

export function formatMnt(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '₮0';
  return '₮' + Number(amount).toLocaleString('mn-MN', { minimumFractionDigits: 0 });
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = 'MNT',
  locale = 'mn-MN',
): string {
  if (amount === null || amount === undefined) return '₮0';
  return Number(amount).toLocaleString(locale, { minimumFractionDigits: 0 }) + ' ' + currency;
}
