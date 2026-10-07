export function formatRupiah(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'Rp0';
  const rounded = Math.round(value);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded).replace(/\s+/g, '');
}

export function formatDate(isoString: string | undefined | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string | undefined | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '0,0%';
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export function calculateEstimatedSellingPrice(
  hppPerPortion: number,
  targetFoodCostPct: number,
  rounding: 'NONE' | '500' | '1000' = '500'
): number {
  if (!hppPerPortion || !targetFoodCostPct || targetFoodCostPct <= 0) return 0;
  const rawPrice = (hppPerPortion / (targetFoodCostPct / 100));

  if (rounding === 'NONE') {
    return Math.round(rawPrice);
  }
  if (rounding === '500') {
    return Math.ceil(rawPrice / 500) * 500;
  }
  if (rounding === '1000') {
    return Math.ceil(rawPrice / 1000) * 1000;
  }
  return Math.round(rawPrice);
}
