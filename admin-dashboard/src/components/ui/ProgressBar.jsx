/** Segmented bar. Ten blocks read as a fraction faster than a smooth fill. */
export function ProgressBar({ value = 0, segments = 10, label }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0))
  const filled = Math.round((safe / 100) * segments)

  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Training progress'}
        className="flex gap-[3px]"
      >
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3 rounded-[2px] ${i < filled ? 'bg-warm' : 'bg-stone/30'}`}
          />
        ))}
      </div>
      <span className="font-display text-sm tabular-nums text-warm">{safe}%</span>
    </div>
  )
}
