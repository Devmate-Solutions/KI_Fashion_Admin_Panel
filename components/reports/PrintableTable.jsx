"use client"

import { useState, useMemo } from "react"
import { ChevronUp, ChevronDown, Filter } from "lucide-react"

function normalize(v) {
  return String(v ?? "").toLowerCase()
}

export default function PrintableTable({
  columns,
  data,
  loading = false,
  enableSearch = true,
  enableSort = false,
  enableColumnFilters = true,
  pageSize = 50,
  showTotals = false,
  totalsRow = null,
  grandTotalSection = null,
  searchableColumns,
  totalColumns = [],
  onRowClick,
}) {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState({ key: null, dir: "asc" })
  const [page, setPage] = useState(1)
  const [columnFilters, setColumnFilters] = useState({})

  const filtered = useMemo(() => {
    const safeData = Array.isArray(data) ? data : []
    const safeColumns = Array.isArray(columns) ? columns : []


    // Global search filter
    const q = normalize(query)
    let base = q
      ? safeData.filter((row) => searchableColumns.some((key) => normalize(row[key]).includes(q))
      )
      : safeData


    // Column-specific filters
    // if (enableColumnFilters) {
    //   Object.entries(columnFilters).forEach(([key, filterValue]) => {
    //     if (filterValue && filterValue.trim()) {
    //       const fv = normalize(filterValue)
    //       base = base.filter((row) => normalize(row[key]).includes(fv))
    //     }
    //   })
    // }

    // Sorting
    if (enableSort && sort.key) {
      const dir = sort.dir === "asc" ? 1 : -1
      base = [...base].sort((a, b) => {
        const av = a[sort.key]
        const bv = b[sort.key]
        if (av === bv) return 0
        if (av === null || av === undefined) return 1
        if (bv === null || bv === undefined) return -1
        if (typeof av === "number" && typeof bv === "number") {
          return (av - bv) * dir
        }
        return String(av).localeCompare(String(bv)) * dir
      })
    }
    return base
  }, [data, columns, query, sort, enableSort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const start = (page - 1) * pageSize
  const slice = filtered.slice(start, start + pageSize)

  function toggleSort(key) {
    if (!enableSort) return
    setPage(1)
    setSort((cur) => {
      if (cur.key !== key) return { key, dir: "asc" }
      return { key, dir: cur.dir === "asc" ? "desc" : "asc" }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Top Totals Summary Bar - Above Search (compact horizontal display) */}
      {showTotals && totalsRow && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5 border-b border-border bg-muted/60 print:bg-gray-100">
          {/* {JSON.stringify(totalsRow)} */}
          <div className="flex flex-wrap items-center">
          <span className="font-semibold text-sm text-foreground">{totalColumns[0].title}:</span>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground"></span>
            <span className="font-semibold tabular-nums">{totalsRow[totalColumns[0].value]}</span>
          </div>
          </div>

          {/* Search - Hidden in print */}
          {enableSearch && (
            <div className="no-print flex items-center gap-2 ">
              <input
                type="search"
                className="h-8 flex-1 max-w-xs rounded border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                placeholder="Search in table..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
              />
              <span className="text-xs text-muted-foreground">
                {filtered.length} record{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}


      {/* Table */}
      <div className="overflow-auto max-h-[calc(100vh-260px)] print:overflow-visible print:max-h-none">
        <table className="w-full text-sm">
          <thead className="bg-muted print:bg-gray-100">
            <tr>
              {Array.isArray(columns) &&
                columns.map((c) => (
                  <th
                    key={c.accessor || c.header}
                    className={`px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b border-border ${c.align === "right" ? "text-right" : ""
                      } ${c.align === "center" ? "text-center" : ""}`}
                  >
                    {enableSort && c.accessor ? (
                      <button
                        onClick={() => toggleSort(c.accessor)}
                        className="flex items-center gap-1 hover:text-foreground transition-colors no-print-style"
                      >
                        <span>{c.header}</span>
                        {sort.key === c.accessor && (
                          <span className="no-print">
                            {sort.dir === "asc" ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </span>
                        )}
                      </button>
                    ) : (
                      <span>{c.header}</span>
                    )}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {Array.isArray(slice) && slice.length > 0 ? (
              slice.map((row, idx) => (
                <tr
                  key={row.id ?? row._id ?? idx}
                  className={`border-b border-border hover:bg-muted/30 print:hover:bg-transparent${onRowClick ? ' cursor-pointer' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {Array.isArray(columns) &&
                    columns.map((c) => (
                      <td
                        key={c.accessor || c.header}
                        className={`px-3 py-2.5 ${c.align === "right" ? "text-right tabular-nums" : ""
                          } ${c.align === "center" ? "text-center" : ""}`}
                      >
                        {c.render ? c.render(row) : String(row[c.accessor] ?? "—")}
                      </td>
                    ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns?.length || 1}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No data available
                </td>
              </tr>
            )}

            {/* Bottom Totals Row - Inside Table (at end of data) */}
            {showTotals && totalsRow && (
              <tr className="bg-muted/50 font-semibold border-t-2 border-border print:bg-gray-100">
                {Array.isArray(columns) &&
                  columns.map((c, idx) => (
                    <td
                      key={c.accessor || c.header}
                      className={`px-3 py-2.5 ${c.align === "right" ? "text-right tabular-nums" : ""
                        } ${c.align === "center" ? "text-center" : ""}`}
                    >
                      {idx === 0 ? "TOTAL" : totalsRow[c.accessor] ?? ""}
                    </td>
                  ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination - Hidden in print */}
      {pageCount > 1 && (
        <div className="no-print flex items-center justify-between p-3 border-t border-border bg-muted/30">
          <div className="text-xs text-muted-foreground">
            Showing {start + 1} to {Math.min(start + pageSize, filtered.length)} of{" "}
            {filtered.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              className="px-2 py-1 text-xs border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              First
            </button>
            <button
              className="px-2 py-1 text-xs border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <span className="px-3 py-1 text-xs">
              Page {page} of {pageCount}
            </span>
            <button
              className="px-2 py-1 text-xs border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
            >
              Next
            </button>
            <button
              className="px-2 py-1 text-xs border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setPage(pageCount)}
              disabled={page === pageCount}
            >
              Last
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .no-print-style {
            all: unset;
          }
        }
      `}</style>
    </div>
  )
}
