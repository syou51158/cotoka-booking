export function formatCurrency(
  amount: number,
  currency = "JPY",
  locale = "ja-JP",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDuration(mins: number) {
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (hours > 0) {
    return `${hours}h${remaining > 0 ? ` ${remaining}m` : ""}`;
  }
  return `${remaining}m`;
}
