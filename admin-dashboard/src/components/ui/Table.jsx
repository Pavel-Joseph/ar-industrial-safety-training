/**
 * columns: [{ key, header, render?, className?, align? }]
 * Rows stay keyboard reachable when onRowClick is given.
 */
export function Table({ columns, rows, rowKey, onRowClick, caption }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-stone/40 text-left">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`pb-2 pr-4 text-xs font-medium text-stone ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter') onRowClick(row)
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
              className={`border-b border-stone/20 last:border-0 ${
                onRowClick ? 'cursor-pointer hover:bg-graphite/40' : ''
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`py-3 pr-4 align-middle ${col.className ?? ''}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
