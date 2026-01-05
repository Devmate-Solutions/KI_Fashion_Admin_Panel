"use client"

import { useMemo, useState } from "react"

function normalize(v) {
  return String(v ?? "").toLowerCase()
}

export default function DataTable({
  title,
  columns,
  data,
  onAddNew,
  onEdit,
  onDelete,
  onRowClick,
  loading = false,
  hideActions = false,
  enableSearch = true,
  paginate = true,
  pageSize = 10,
  manualPagination = false,
  currentPage = 1,
  totalPages = 1,
  totalItems,
  onPageChange,
  onSearch,
}) {
  const [query, setQuery] = useState("")
  const [internalPage, setInternalPage] = useState(1)
  const [sort, setSort] = useState({ key: null, dir: "asc" })

  const page = manualPagination ? currentPage : internalPage
  const setPage = manualPagination ? (onPageChange || (() => { })) : setInternalPage

  const filtered = useMemo(() => {
    // Ensure data and columns are arrays
    const safeData = Array.isArray(data) ? data : []
    const safeColumns = Array.isArray(columns) ? columns : []

    // Server-side filtering logic should be handled by parent if manualPagination is true
    // But we still apply client-side filtering if user types in search box AND manualPagination is false?
    // Usually if server-side pagination is on, server-side search is also used.
    // For now, let's assume if manualPagination is true, 'data' is already filtered/paginated.
    if (manualPagination) return safeData

    const q = normalize(query)
    const base = q
      ? safeData.filter((row) => safeColumns.some((c) => c.accessor && normalize(row[c.accessor]).includes(q)))
      : safeData

    if (sort.key) {
      const dir = sort.dir === "asc" ? 1 : -1
      base.sort((a, b) => {
        const av = a[sort.key]
        const bv = b[sort.key]
        if (av === bv) return 0
        return av > bv ? dir : -dir
      })
    }
    return base
  }, [data, columns, query, sort, manualPagination])

  const effectivePageSize = paginate ? pageSize : filtered.length || 1
  const pageCount = manualPagination ? totalPages : (paginate ? Math.max(1, Math.ceil(filtered.length / effectivePageSize)) : 1)
  const start = manualPagination ? 0 : (paginate ? (page - 1) * effectivePageSize : 0)
  const slice = manualPagination ? filtered : (paginate ? filtered?.slice(start, start + effectivePageSize) : filtered)

  function toggleSort(key) {
    if (!manualPagination) setPage(1)
    setSort((cur) => {
      if (cur.key !== key) return { key, dir: "asc" }
      return { key, dir: cur.dir === "asc" ? "desc" : "asc" }
    })
  }

  // Calculate stats for display
  const displayStart = manualPagination ? (page - 1) * pageSize : start
  const displayEnd = manualPagination ? displayStart + filtered.length : Math.min(start + effectivePageSize, filtered.length)
  const displayTotal = manualPagination ? (totalItems || filtered.length) : filtered.length

  return (
    <div className="rounded-[4px] border border-border bg-card">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-border">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="flex items-center gap-2">
          {enableSearch && (
            <input
              type="search"
              className="h-8 w-44 md:w-64 rounded-[4px] border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              placeholder="Search..."
              value={query}
              onChange={(e) => {
                setPage(1)
                setQuery(e.target.value)
                if (onSearch) onSearch(e.target.value)
              }}
            />
          )}
          {onAddNew && (
            <button
              className="h-8 rounded-[4px] bg-primary px-3 text-sm text-primary-foreground hover:opacity-90"
              onClick={onAddNew}
            >
              Add New
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-sm text-muted-foreground">Loading data...</p>
            </div>
          </div>
        ) : !Array.isArray(data) || data.length === 0 ? (
          <div className="text-center p-12">
            <p className="text-muted-foreground">No data available</p>
            {onAddNew && (
              <button
                onClick={onAddNew}
                className="mt-4 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90"
              >
                Add First Entry
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium [&>th]:text-xs [&>th]:text-muted-foreground border-b border-border">
                {Array.isArray(columns) && columns.map((c) => (
                  <th key={c.accessor || c.header}>
                    <button
                      onClick={() => c.accessor && toggleSort(c.accessor)}
                      className="flex items-center gap-1"
                      title={c.accessor ? "Sort" : undefined}
                    >
                      <span>{c.header}</span>
                      {sort.key === c.accessor ? (
                        <span aria-hidden className="text-[10px]">
                          {sort.dir === "asc" ? "▲" : "▼"}
                        </span>
                      ) : null}
                    </button>
                  </th>
                ))}
                {!hideActions && (onEdit || onDelete) && <th className="w-32">Actions</th>}
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b [&>tr]:border-border">
              {Array.isArray(slice) && slice.map((row, idx) => (
                <tr
                  key={row.id ?? idx}
                  className={`hover:bg-muted/30 ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick && onRowClick(row)}
                  data-row-id={row.rowId || row.id}
                >
                  {Array.isArray(columns) && columns.map((c) => (
                    <td key={c.accessor || c.header} className="px-3 py-2 whitespace-nowrap">
                      {c.render ? c.render(row) : String(row[c.accessor] ?? "")}
                    </td>
                  ))}
                  {!hideActions && (onEdit || onDelete) && (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {onEdit && (
                          <button
                            className="text-xs px-2 py-1 border border-border rounded-[4px] hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEdit(row)
                            }}
                          >
                            Edit
                          </button>
                        )}
                        {onDelete && (
                          <button
                            className="text-xs px-2 py-1 border border-border rounded-[4px] text-destructive hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(row)
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {(!Array.isArray(slice) || slice.length === 0) && (
                <tr>
                  <td colSpan={(Array.isArray(columns) ? columns.length : 0) + ((!hideActions && (onEdit || onDelete)) ? 1 : 0)} className="px-3 py-6 text-center text-muted-foreground">
                    No results found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {paginate && pageCount > 1 && (
        <div className="flex items-center justify-between p-3 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Showing {displayStart + 1} to {displayEnd} of {displayTotal} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 text-xs border border-border rounded hover:bg-muted disabled:opacity-50"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="text-xs">
              Page {page} of {pageCount}
            </span>
            <button
              className="px-2 py-1 text-xs border border-border rounded hover:bg-muted disabled:opacity-50"
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
