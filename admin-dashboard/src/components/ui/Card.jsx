export function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`panel p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-base font-semibold leading-tight">{title}</h2>}
            {subtitle && <p className="mt-1 text-xs text-stone">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
