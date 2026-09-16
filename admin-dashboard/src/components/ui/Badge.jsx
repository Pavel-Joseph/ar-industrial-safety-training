const TONES = {
  pass: 'bg-steelLight/15 text-steelLight border-steelLight/40',
  fail: 'bg-rust/15 text-rust border-rust/40',
  neutral: 'bg-stone/15 text-warm/70 border-stone/40',
  offline: 'bg-copper/15 text-warm border-copper/50'
}

export function Badge({ tone = 'neutral', children }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
