export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

export function formatDuration(seconds) {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export function formatPercent(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${Number(value).toFixed(digits)}%`
}

export function shortDay(dateString) {
  const d = new Date(`${dateString}T00:00:00Z`)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}
