import { useT } from '../../i18n/LanguageContext'

export function Loading({ rows = 4 }) {
  const { t } = useT()
  return (
    <div role="status" aria-live="polite" className="space-y-2">
      <span className="sr-only">{t('state.loading')}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-stone/15" />
      ))}
    </div>
  )
}

export function EmptyState({ title, body }) {
  const { t } = useT()
  return (
    <div className="rounded-md border border-dashed border-stone/40 px-6 py-10 text-center">
      <p className="font-display text-warm">{title ?? t('state.emptyTitle')}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-stone">{body ?? t('state.emptyBody')}</p>
    </div>
  )
}

/**
 * Error copy says what happened and what to do, and shows the backend's own
 * code so Person 2 can be told exactly which endpoint failed.
 */
export function ErrorState({ error, onRetry }) {
  const { t } = useT()
  return (
    <div className="rounded-md border border-rust/40 bg-rust/10 px-5 py-4">
      <p className="font-display text-warm">{t('state.errorTitle')}</p>
      <p className="mt-1 text-sm text-warm/80">{error?.message ?? 'Unexpected failure.'}</p>
      {error?.code && <p className="mt-1 font-mono text-xs text-stone">{error.code}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost mt-3">
          {t('state.retry')}
        </button>
      )}
    </div>
  )
}

/** Renders the right state for a useApi result and hides the branching. */
export function AsyncBlock({ loading, error, isEmpty, onRetry, empty, children }) {
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (isEmpty) return empty ?? <EmptyState />
  return children
}
