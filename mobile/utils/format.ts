// mobile/utils/format.ts
export function formatAmount(amount: number | string, currency = 'EUR'): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '0,00 \u20ac';
  // Per valori molto grandi usa notazione compatta
  if (Math.abs(n) >= 1_000_000) {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
  }).format(n);
}

export function formatDate(str: string | undefined): string {
  if (!str) return '-';
  const d = new Date(str);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateShort(str: string): string {
  const d = new Date(str);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}
