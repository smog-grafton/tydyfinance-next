export const formatUGX = (amount: number): string =>
  new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    currencyDisplay: 'code',
    maximumFractionDigits: 0,
  }).format(amount)

export const formatKampalaDate = (date: string | null | undefined): string => {
  if (typeof date !== 'string' || !date.trim()) return '—'

  const value = date.trim()
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+03:00` : value)
  if (Number.isNaN(parsed.getTime())) return '—'

  return new Intl.DateTimeFormat('en-UG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Kampala',
  }).format(parsed)
}

/** A machine-readable calendar date for native date inputs in Tydy's business timezone. */
export const kampalaDateInput = (instant = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Africa/Kampala',
  }).formatToParts(instant)
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]))

  return `${value.year}-${value.month}-${value.day}`
}
