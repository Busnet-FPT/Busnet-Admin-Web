export function formatCurrency(amount: number): string {
  return `${new Intl.NumberFormat('en-US').format(amount)} VND`
}

export function formatDate(value?: string | null): string {
  if (!value) return '-'
  try {
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(value))
  } catch {
    return '-'
  }
}
