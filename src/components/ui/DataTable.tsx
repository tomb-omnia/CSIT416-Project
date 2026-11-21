// <DataTable>: sortable columns, row click, empty state. Search and filters sit above it on each page.

import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  sort?: (row: T) => string | number
  className?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  initialSort,
  rowClassName,
  selectedKey,
  expanded,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (r: T) => string
  onRowClick?: (r: T) => void
  empty: ReactNode
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  rowClassName?: (r: T) => string
  selectedKey?: string | null
  expanded?: (r: T) => ReactNode | null
}) {
  const [sort, setSort] = useState(initialSort ?? null)
  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sort) return rows
    const get = col.sort
    return [...rows].sort((a, b) => {
      const x = get(a)
      const y = get(b)
      const r = x < y ? -1 : x > y ? 1 : 0
      return sort.dir === 'asc' ? r : -r
    })
  }, [rows, sort, columns])

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`whitespace-nowrap px-4 py-2.5 text-left font-semibold text-slate-700 ${c.className ?? ''}`} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                {c.sort ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-accent-700"
                    onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'asc' }))}
                  >
                    {c.header}
                    {sort?.key === c.key ? sort.dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />}
                  </button>
                ) : (
                  c.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">
                {empty}
              </td>
            </tr>
          )}
          {sorted.map((r) => {
            const k = rowKey(r)
            const ex = expanded?.(r)
            return (
              <FragmentRow key={k}>
                <tr
                  className={`${onRowClick ? 'cursor-pointer hover:bg-accent-50/50' : ''} ${selectedKey === k ? 'bg-accent-50' : ''} ${rowClassName?.(r) ?? ''}`}
                  onClick={() => onRowClick?.(r)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      onRowClick(r)
                    }
                  }}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-2.5 align-top ${c.className ?? ''}`}>
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
                {ex && (
                  <tr className="bg-slate-50">
                    <td colSpan={columns.length} className="px-4 py-4">
                      {ex}
                    </td>
                  </tr>
                )}
              </FragmentRow>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FragmentRow({ children }: { children: ReactNode }) {
  return <>{children}</>
}
