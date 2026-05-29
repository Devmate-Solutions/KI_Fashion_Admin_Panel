"use client"

import React, { useMemo, useState, useEffect } from "react"
import { ChevronRight, ChevronDown, FileText, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

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
  disableSorting = false,
  expandableRow = false,
  renderExpandedRow,
  expandedRowAsColumns = false,
  onDownloadPDF = null,
  rowClassName,
  compact = false,
  enableColumnFilters = false,
  onSortChange,
  sortConfig,
}) {
  const [query, setQuery] = useState("")
  const [internalPage, setInternalPage] = useState(1)
  const [internalSort, setInternalSort] = useState({ key: null, dir: "asc" })
  const sort = sortConfig || internalSort
  
  const [pageInput, setPageInput] = useState("")
  const [expandedRowId, setExpandedRowId] = useState(null)

  const page = manualPagination ? currentPage : internalPage
  const setPage = manualPagination ? (onPageChange || (() => { })) : setInternalPage

  // Clear page input when page changes externally
  useEffect(() => {
    setPageInput("")
  }, [page])

  const hasActiveColumnFilters = (columns || []).some(col =>
    col.filter && String(col.filter.value || "").trim() !== ""
  )

  const handleResetColumnFilters = () => {
    (columns || []).forEach(col => {
      if (col.filter?.onChange) col.filter.onChange("")
    })
  }

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
    
    const cur = sort
    let nextSort
    if (cur.key !== key) {
      nextSort = { key, dir: "asc", direction: "asc" }
    } else {
      const nextDir = (cur.dir || cur.direction) === "asc" ? "desc" : "asc"
      nextSort = { key, dir: nextDir, direction: nextDir }
    }
    
    if (!sortConfig) {
      setInternalSort(nextSort)
    }
    if (onSortChange) {
      onSortChange(nextSort)
    }
  }

  // Calculate stats for display
  const displayStart = manualPagination ? (page - 1) * pageSize : start
  const displayEnd = manualPagination ? displayStart + filtered.length : Math.min(start + effectivePageSize, filtered.length)
  const displayTotal = manualPagination ? (totalItems || filtered.length) : filtered.length

  const hasHeader = title || enableSearch || onAddNew

  return (
    <div className="rounded-lg border border-border bg-card transition-shadow duration-300">
      {hasHeader && (
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
            {/* {onDownloadPDF && (
              <button
                className="h-9 sm:h-10 rounded-md border border-input bg-red-600 px-3 text-white hover:bg-red-700 active:scale-95 transition-all duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                onClick={onDownloadPDF}
                title="Download PDF"
              >
                <FileText className="h-4 w-4" />
              </button>
            )} */}
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
      )}

      <div className="overflow-x-auto">
        {loading && (!Array.isArray(data) || data.length === 0) ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 animate-in fade-in duration-300">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground font-medium">Loading inventory data...</p>
          </div>
        ) : !Array.isArray(data) || data.length === 0 ? (
          <div className="text-center p-8 sm:p-12 animate-in fade-in duration-300">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted/50 mb-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707-.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mb-2 font-medium">No data available</p>

            {hasActiveColumnFilters ? (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-3">
                  No results match your current column filters.
                </p>
                <button
                  onClick={handleResetColumnFilters}
                  className="mt-1 px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-all duration-200 active:scale-95 min-h-[44px] inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Clear Column Filters
                </button>
              </div>
            ) : (
              onAddNew && (
                <button
                  onClick={onAddNew}
                  className="mt-4 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 hover:shadow-lg transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 min-h-[44px]"
                >
                  Add First Entry
                </button>
              )
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/30 sticky top-0 ">
                <tr className="border-b border-border">
                  {expandableRow && (
                    <th className={cn("hidden sm:table-cell w-8", compact ? "px-1.5 py-1" : "px-2 py-2.5 sm:py-3")}></th>
                  )}
                  {Array.isArray(columns) && columns.map((c) => (
                    <th key={c.accessor || c.header} className={cn("font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap", compact ? "px-2 py-1 text-[9px] sm:text-[10px]" : "px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs", c.className)}>
                      {disableSorting ? (
                        <span className="flex items-center gap-1">{c.header}</span>
                      ) : (
                        <button
                          onClick={() => c.accessor && toggleSort(c.accessor)}
                          className={cn("flex items-center gap-1 hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded", compact ? "min-h-0 py-0.5" : "min-h-[44px]")}
                          title={c.accessor ? "Sort" : undefined}
                          aria-label={c.accessor ? `Sort by ${c.header}` : undefined}
                        >
                          <span>{c.header}</span>
                          {c.accessor ? (
                            <span aria-hidden className="ml-1 flex items-center">
                              {sort.key === c.accessor ? (
                                (sort.dir || sort.direction) === "asc" ? (
                                  <ArrowUp className="w-3 h-3" />
                                ) : (
                                  <ArrowDown className="w-3 h-3" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-50" />
                              )}
                            </span>
                          ) : null}
                        </button>
                      )}
                    </th>
                  ))}
                  {!hideActions && (onEdit || onDelete) && (
                    <th className={cn("font-semibold text-muted-foreground uppercase tracking-wider w-24 sm:w-32 whitespace-nowrap", compact ? "px-2 py-1 text-[9px] sm:text-[10px]" : "px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs")}>
                      Actions
                    </th>
                  )}
                </tr>
                {enableColumnFilters && (
                  <tr className="border-b border-border bg-background">
                    {expandableRow && (
                      <th className={cn("hidden sm:table-cell w-8 px-1 py-1")}></th>
                    )}
                    {Array.isArray(columns) && columns.map((c, colIdx) => (
                      <th
                        key={`filter-${c.accessor || c.header || colIdx}`}
                        className={cn(
                          "px-1 py-1 font-normal whitespace-nowrap align-middle",
                          c.className
                        )}
                      >
                        {c.filter ? (
                          c.filter.render ? (
                            c.filter.render()
                          ) : c.filter.type === "select" ? (
                            <select
                              value={c.filter.value || ""}
                              onChange={(e) => c.filter.onChange(e.target.value)}
                              className="w-full h-7 px-1.5 text-[11px] border border-border rounded bg-background focus:ring-1 focus:ring-ring outline-none"
                            >
                              <option value="">All</option>
                              {c.filter.options?.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : c.filter.type === "number-range" ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                placeholder="Min"
                                value={c.filter.minValue || ""}
                                onChange={(e) => c.filter.onMinChange(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && c.filter.onSubmit) {
                                    e.preventDefault();
                                    c.filter.onSubmit();
                                  }
                                }}
                                className="w-full h-7 px-1 text-[10px] border border-border rounded bg-background focus:ring-1 focus:ring-ring outline-none min-w-0"
                              />
                              <span className="text-[10px] text-muted-foreground">-</span>
                              <input
                                type="number"
                                placeholder="Max"
                                value={c.filter.maxValue || ""}
                                onChange={(e) => c.filter.onMaxChange(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && c.filter.onSubmit) {
                                    e.preventDefault();
                                    c.filter.onSubmit();
                                  }
                                }}
                                className="w-full h-7 px-1 text-[10px] border border-border rounded bg-background focus:ring-1 focus:ring-ring outline-none min-w-0"
                              />
                            </div>
                          ) : c.filter.type === "date-range" ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                placeholder="Start"
                                value={c.filter.startDateValue || ""}
                                onChange={(e) => c.filter.onStartDateChange(e.target.value)}
                                className="w-full h-7 px-1 text-[9px] border border-border rounded bg-background focus:ring-1 focus:ring-ring outline-none min-w-0"
                              />
                              <span className="text-[10px] text-muted-foreground">-</span>
                              <input
                                type="date"
                                placeholder="End"
                                value={c.filter.endDateValue || ""}
                                onChange={(e) => c.filter.onEndDateChange(e.target.value)}
                                className="w-full h-7 px-1 text-[9px] border border-border rounded bg-background focus:ring-1 focus:ring-ring outline-none min-w-0"
                              />
                            </div>
                          ) : (
                            <input
                              type={c.filter.type || "text"}
                              value={c.filter.value || ""}
                              onChange={(e) => c.filter.onChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && c.filter.onSubmit) {
                                  e.preventDefault();
                                  c.filter.onSubmit();
                                }
                              }}
                              className="w-full h-7 px-1.5 text-[11px] border border-border rounded bg-background focus:ring-1 focus:ring-ring outline-none"
                            />
                          )
                        ) : null}
                      </th>
                    ))}
                    {!hideActions && (onEdit || onDelete) && (
                      <th className="px-1 py-1"></th>
                    )}
                  </tr>
                )}
              </thead>
<tbody className="divide-y divide-border">
                {Array.isArray(slice) && slice.map((row, idx) => {
                  const uniqueKey = row.rowId || row.id || row._id || `row-${idx}-${row.purchaseNumber || row.orderNumber || ''}`
                  const isExpanded = expandableRow && expandedRowId === uniqueKey
                  const totalColSpan = (Array.isArray(columns) ? columns.length : 0) + (expandableRow ? 1 : 0) + ((!hideActions && (onEdit || onDelete)) ? 1 : 0)
                  return (
                    <React.Fragment key={uniqueKey}>
                      <tr
                        className={cn(
                          "hover:bg-muted/20 transition-all duration-150 ease-in-out align-middle",
                          onRowClick || expandableRow ? 'cursor-pointer' : '',
                          isExpanded ? 'bg-muted/10 align-top' : '',
                          typeof rowClassName === "function" ? rowClassName(row) : rowClassName
                        )}
                        onClick={() => {
                          if (expandableRow) {
                            setExpandedRowId(isExpanded ? null : uniqueKey)
                          } else if (onRowClick) {
                            onRowClick(row)
                          }
                        }}
                        aria-expanded={expandableRow ? isExpanded : undefined}
                        data-row-id={row.rowId || row.id || row._id}
                      >
                        {expandableRow && (
                          <td className={cn("hidden sm:table-cell w-8 align-middle", compact ? "px-1.5 py-1" : "px-2 py-2.5 sm:py-3")}>
                            <button
                              className="p-0.5 rounded hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedRowId(isExpanded ? null : uniqueKey)
                              }}
                              aria-label={isExpanded ? "Collapse row" : "Expand row"}
                              tabIndex={0}
                            >
                              {/* {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                           } */}
                            </button>
                          </td>
                        )}
                        {Array.isArray(columns) && columns.map((c) => (
                          <td key={c.accessor || c.header} className={cn("whitespace-nowrap align-middle", compact ? "px-2 py-1 text-[10px] sm:text-xs" : "px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm", c.className)}>
                            {c.render ? c.render(row, { isExpanded }) : (c.cell ? c.cell(row) : String(row[c.accessor] ?? ""))}
                          </td>
                        ))}
                        {!hideActions && (onEdit || onDelete) && (
                          <td className={cn("align-middle", compact ? "px-2 py-1" : "px-3 sm:px-4 py-2.5 sm:py-3")}>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              {onEdit && (
                                <button
                                  className={cn("border border-border rounded-md hover:bg-muted active:scale-95 transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", compact ? "text-[10px] px-1.5 py-0.5 min-h-0" : "text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 min-h-[36px] sm:min-h-[32px]")}
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
                                  className={cn("border border-border rounded-md text-destructive hover:bg-destructive/10 active:scale-95 transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", compact ? "text-[10px] px-1.5 py-0.5 min-h-0" : "text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 min-h-[36px] sm:min-h-[32px]")}
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
                      {isExpanded && renderExpandedRow && (
                        expandedRowAsColumns ? (
                          <tr>
                            {renderExpandedRow(row)}
                          </tr>
                        ) : (
                          <tr>
                            <td colSpan={totalColSpan} className="p-0 border-t-0">
                              <div className="px-4 py-3 bg-muted/5 border-l-4 border-primary">
                                {renderExpandedRow(row)}
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </React.Fragment>
                  )
                })}
                {(!Array.isArray(slice) || slice.length === 0) && (
                  <tr>
                    <td colSpan={(Array.isArray(columns) ? columns.length : 0) + (expandableRow ? 1 : 0) + ((!hideActions && (onEdit || onDelete)) ? 1 : 0)} className="px-4 py-8 sm:py-12 text-center text-muted-foreground text-sm">
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