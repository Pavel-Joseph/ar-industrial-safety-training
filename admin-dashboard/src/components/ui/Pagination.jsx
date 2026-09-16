export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-stone">
      <p>
        Showing {first}–{last} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-ghost px-2 py-1 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </button>
        <span className="text-warm/70">
          Page {page} of {pages}
        </span>
        <button
          type="button"
          className="btn-ghost px-2 py-1 disabled:opacity-40"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
