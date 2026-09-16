/**
 * A stat tile that never looks empty. Every tile carries a headline number, a
 * percentage derived from the same data, and a thin meter so the share is
 * readable at a glance rather than only as text.
 */
export function StatCard({ label, value, percent, percentLabel, footnote, Icon, tone = 'warm' }) {
  const meter = Math.max(0, Math.min(100, Number(percent) || 0))
  const barColour = tone === 'steelLight' ? 'bg-steelLight' : tone === 'rust' ? 'bg-rust' : 'bg-copper'

  return (
    <article className="panel px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-stone">{label}</p>
        {Icon && (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-graphite/70 text-warm/80">
            <Icon size={14} aria-hidden="true" />
          </span>
        )}
      </div>

      <p className="mt-3 font-display text-3xl leading-none tabular-nums text-warm">{value}</p>

      {percent != null && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-sm tabular-nums text-warm/90">{meter}%</span>
            <span className="text-[11px] text-stone">{percentLabel}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone/25">
            <div className={`h-full rounded-full ${barColour}`} style={{ width: `${meter}%` }} />
          </div>
        </div>
      )}

      {footnote && <p className="mt-2.5 text-[11px] text-stone">{footnote}</p>}
    </article>
  )
}
