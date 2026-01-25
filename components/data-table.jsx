"use client"

import { useMemo, useState, useEffect } from "react"

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
  disableSorting = false, // New prop to disable column sorting
}) {
  const [query, setQuery] = useState("")
  const [internalPage, setInternalPage] = useState(1)
  const [sort, setSort] = useState({ key: null, dir: "asc" })
  const [pageInput, setPageInput] = useState("")

  const page = manualPagination ? currentPage : internalPage
  const setPage = manualPagination ? (onPageChange || (() => { })) : setInternalPage

  // Clear page input when page changes externally
  useEffect(() => {
    setPageInput("")
  }, [page])

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
    if (disableSorting) return // Early return if sorting is disabled
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
    <div className="rounded-lg border border-border bg-card transition-shadow duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-border">
        {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
        <div className="flex items-center gap-2 flex-wrap">
          {enableSearch && (
            <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-0">
              <input
                type="search"
                className="h-9 sm:h-10 w-full sm:w-44 md:w-64 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-transparent min-w-0 transition-all duration-200 ease-in-out hover:border-ring/50"
                placeholder="Search..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  // Don't trigger search on every keystroke - only update local state
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setPage(1)
                    if (onSearch) onSearch(query)
                  }
                }}
              />
              <button
                className="h-9 sm:h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring flex-shrink-0"
                onClick={() => {
                  setPage(1)
                  if (onSearch) onSearch(query)
                }}
                title="Search"
                aria-label="Search"
              >
                Search
              </button>
            </div>
          )}
          {onAddNew && (
            <button
              className="h-9 sm:h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring whitespace-nowrap"
              onClick={onAddNew}
            >
              Add New
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0 overflow-y-visible">
        {loading ? (
          <div className="flex items-center justify-center p-8 sm:p-12">
            <div className="text-center animate-in fade-in duration-300">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-3 border-primary border-t-transparent mx-auto mb-4 shadow-lg"></div>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Loading data...</p>
            </div>
          </div>
        ) : !Array.isArray(data) || data.length === 0 ? (
          <div className="text-center p-8 sm:p-12 animate-in fade-in duration-300">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted/50 mb-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mb-2 font-medium">No data available</p>
            {onAddNew && (
              <button
                onClick={onAddNew}
                className="mt-4 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 hover:shadow-lg transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 min-h-[44px]"
              >
                Add First Entry
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/30 sticky top-0 z-10">
                <tr className="border-b border-border">
                  {Array.isArray(columns) && columns.map((c) => (
                    <th key={c.accessor || c.header} className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-semibold text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {disableSorting ? (
                        <span className="flex items-center gap-1">{c.header}</span>
                      ) : (
                        <button
                          onClick={() => c.accessor && toggleSort(c.accessor)}
                          className="flex items-center gap-1 hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded min-h-[44px]"
                          title={c.accessor ? "Sort" : undefined}
                          aria-label={c.accessor ? `Sort by ${c.header}` : undefined}
                        >
                          <span>{c.header}</span>
                          {sort.key === c.accessor ? (
                            <span aria-hidden className="text-[10px]" aria-label={sort.dir === "asc" ? "Ascending" : "Descending"}>
                              {sort.dir === "asc" ? "▲" : "▼"}
                            </span>
                          ) : null}
                        </button>
                      )}
                    </th>
                  ))}
                  {!hideActions && (onEdit || onDelete) && <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-semibold text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider w-24 sm:w-32 whitespace-nowrap">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Array.isArray(slice) && slice.map((row, idx) => {
                  // Use rowId first, then id, then fallback to index with row identifier
                  const uniqueKey = row.rowId || row.id || row._id || `row-${idx}-${row.purchaseNumber || row.orderNumber || ''}`
                  return (
                  <tr
                    key={uniqueKey}
                    className={`hover:bg-muted/20 transition-all duration-150 ease-in-out ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onRowClick && onRowClick(row)}
                    data-row-id={row.rowId || row.id || row._id}
                  >
                    {Array.isArray(columns) && columns.map((c) => (
                      <td key={c.accessor || c.header} className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
                        {c.render ? c.render(row) : String(row[c.accessor] ?? "")}
                      </td>
                    ))}
                    {!hideActions && (onEdit || onDelete) && (
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {onEdit && (
                            <button
                              className="text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 border border-border rounded-md hover:bg-muted active:scale-95 transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[36px] sm:min-h-[32px]"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEdit(row)
                              }}
                              aria-label={`Edit ${row.name || row.id || 'item'}`}
                            >
                              Edit
                            </button>
                          )}
                          {onDelete && (
                            <button
                              className="text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 border border-border rounded-md text-destructive hover:bg-destructive/10 active:scale-95 transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[36px] sm:min-h-[32px]"
                              onClick={(e) => {
                                e.stopPropagation()
                                onDelete(row)
                              }}
                              aria-label={`Delete ${row.name || row.id || 'item'}`}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  )
                })}
                {(!Array.isArray(slice) || slice.length === 0) && (
                  <tr>
                    <td colSpan={(Array.isArray(columns) ? columns.length : 0) + ((!hideActions && (onEdit || onDelete)) ? 1 : 0)} className="px-4 py-8 sm:py-12 text-center text-muted-foreground text-sm">
                      No results found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {paginate && pageCount > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4 border-t border-border">
          <div className="text-[10px] sm:text-xs text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
            Showing {displayStart + 1} to {displayEnd} of {displayTotal} entries
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap order-1 sm:order-2 justify-center sm:justify-end w-full sm:w-auto">
            <button
              className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium border border-border rounded-md hover:bg-muted active:scale-95 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[36px] sm:min-h-[32px]"
              onClick={() => setPage(1)}
              disabled={page === 1}
              title="First page"
              aria-label="First page"
            >
              First
            </button>
            <button
              className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium border border-border rounded-md hover:bg-muted active:scale-95 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[36px] sm:min-h-[32px]"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              title="Previous page"
              aria-label="Previous page"
            >
              Prev
            </button>

            {/* Page number buttons */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {(() => {
                const pages = []
                const maxVisible = 5
                let startPage = Math.max(1, page - Math.floor(maxVisible / 2))
                let endPage = Math.min(pageCount, startPage + maxVisible - 1)

                // Adjust start if we're near the end
                if (endPage - startPage < maxVisible - 1) {
                  startPage = Math.max(1, endPage - maxVisible + 1)
                }

                // Show first page if not in range
                if (startPage > 1) {
                  pages.push(
                    <button
                      key={1}
                      className={`px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium border border-border rounded-md hover:bg-muted active:scale-95 transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[36px] sm:min-h-[32px] ${page === 1 ? 'bg-primary text-primary-foreground' : ''
                        }`}
                      onClick={() => setPage(1)}
                      aria-label="Page 1"
                    >
                      1
                    </button>
                  )
                  if (startPage > 2) {
                    pages.push(<span key="ellipsis1" className="px-0.5 sm:px-1 text-[10px] sm:text-xs text-muted-foreground">...</span>)
                  }
                }

                // Show pages in range
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      className={`px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium border border-border rounded-md hover:bg-muted active:scale-95 transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[36px] sm:min-h-[32px] ${page === i ? 'bg-primary text-primary-foreground' : ''
                        }`}
                      onClick={() => setPage(i)}
                      aria-label={`Page ${i}`}
                    >
                      {i}
                    </button>
                  )
                }

                // Show last page if not in range
                if (endPage < pageCount) {
                  if (endPage < pageCount - 1) {
                    pages.push(<span key="ellipsis2" className="px-0.5 sm:px-1 text-[10px] sm:text-xs text-muted-foreground">...</span>)
                  }
                  pages.push(
                    <button
                      key={pageCount}
                      className={`px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium border border-border rounded-md hover:bg-muted active:scale-95 transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[36px] sm:min-h-[32px] ${page === pageCount ? 'bg-primary text-primary-foreground' : ''
                        }`}
                      onClick={() => setPage(pageCount)}
                      aria-label={`Page ${pageCount}`}
                    >
                      {pageCount}
                    </button>
                  )
                }

                return pages
              })()}
            </div>

            <button
              className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium border border-border rounded-md hover:bg-muted active:scale-95 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[36px] sm:min-h-[32px]"
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
              title="Next page"
              aria-label="Next page"
            >
              Next
            </button>
            <button
              className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium border border-border rounded-md hover:bg-muted active:scale-95 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[36px] sm:min-h-[32px]"
              onClick={() => setPage(pageCount)}
              disabled={page === pageCount}
              title="Last page"
              aria-label="Last page"
            >
              Last
            </button>

            {/* Direct page jump input - Hidden on mobile */}
            <div className="hidden sm:flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Go to:</span>
              <input
                type="number"
                min="1"
                max={pageCount}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const pageNum = parseInt(pageInput)
                    if (pageNum >= 1 && pageNum <= pageCount) {
                      setPage(pageNum)
                      setPageInput("")
                    }
                  }
                }}
                className="w-14 h-8 px-2 text-xs text-center border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none min-h-[32px]"
                placeholder={page.toString()}
                aria-label="Go to page number"
              />
              <button
                className="px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted active:scale-95 transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[32px]"
                onClick={() => {
                  const pageNum = parseInt(pageInput)
                  if (pageNum >= 1 && pageNum <= pageCount) {
                    setPage(pageNum)
                    setPageInput("")
                  }
                }}
                title="Jump to page"
                aria-label="Jump to page"
              >
                Go
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
