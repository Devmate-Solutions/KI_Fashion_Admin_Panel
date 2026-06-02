"use client"

import { useState, useMemo } from "react"
import { ChevronUp, ChevronDown, ArrowUpDown, X } from "lucide-react"
import AutocompleteFilter from "@/components/ui/autocomplete-filter"
import BritishDatePicker from "@/components/BritishDatePicker"

function normalize(v) {
  return String(v ?? "").toLowerCase()
}

export default function PrintableTableFiltered({
  columns: externalColumns,
  data,
  loading = false,
  enableSearch = true,
  enableSort = true,
  enableColumnFilters = true,
  pageSize = 99999,
  showTotals = false,
  totalsRow = null,
  grandTotalSection = null,
  searchableColumns,
  totalColumns = [],
  onRowClick,
  computeTotals,   

}) {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState({ key: null, dir: "asc" })
  const [page, setPage] = useState(1)

  // Internal state for column filters
  const [columnFilters, setColumnFilters] = useState({})

  // Automatically compute unique options for autocomplete columns
  const autocompleteOptions = useMemo(() => {
    const options = {}
    const safeData = Array.isArray(data) ? data : []
    const safeColumns = Array.isArray(externalColumns) ? externalColumns : []

    safeColumns.forEach(c => {
      if (c.filterType === "autocomplete" && c.accessor) {
        const uniqueVals = Array.from(
          new Set(
            safeData
              .map(row => {
                if (typeof c.pdfValue === 'function') return c.pdfValue(row)
                return row[c.accessor]
              })
              .filter(val => val !== null && val !== undefined && String(val).trim() !== "")
          )
        )
        options[c.accessor] = uniqueVals.map(v => String(v))
      }
    })
    return options
  }, [data, externalColumns])

  const filtered = useMemo(() => {
    const safeData = Array.isArray(data) ? data : []
    const safeColumns = Array.isArray(externalColumns) ? externalColumns : []

    const getFilterString = (row, key) => {
      const col = safeColumns.find((c) => c.accessor === key)
      if (col && typeof col.pdfValue === "function") {
        return normalize(col.pdfValue(row))
      }
      return normalize(row[key])
    }

    const getSortValue = (row, key) => {
      let val = row[key]
      if (typeof val === "object" && val !== null) {
        const col = safeColumns.find((c) => c.accessor === key)
        if (col && typeof col.pdfValue === "function") {
          val = col.pdfValue(row)
        }
      }
      return val
    }

    // Global search filter
    const q = normalize(query)
    let base = q
      ? safeData.filter((row) => {
        const keysToSearch =
          searchableColumns && searchableColumns.length > 0
            ? searchableColumns
            : safeColumns.map((c) => c.accessor).filter(Boolean)
        return keysToSearch.some((key) => getFilterString(row, key).includes(q))
      })
      : safeData

    // Column-level filters
    if (enableColumnFilters) {
      safeColumns.forEach((c) => {
        if (!c.accessor) return

        const val = columnFilters[c.accessor]
        if (!val) return

        if (c.filterType === "autocomplete") {
          if (String(val).trim() !== "") {
            const fv = normalize(val)
            base = base.filter((row) => getFilterString(row, c.accessor) === fv)
          }
        } else if (c.filterType === "date-picker") {
          if (val) {
            const filterDate = new Date(val)
            if (!isNaN(filterDate)) {
              const filterStr = filterDate.toLocaleDateString("en-GB")
              base = base.filter((row) => {
                if (!row[c.accessor]) return false
                const rowDate = new Date(row[c.accessor])
                if (isNaN(rowDate)) return false
                return rowDate.toLocaleDateString("en-GB") === filterStr
              })
            }
          }
        } else {
          // Default: plain text contains
          if (String(val).trim() !== "") {
            const fv = normalize(val)
            base = base.filter((row) => getFilterString(row, c.accessor).includes(fv))
          }
        }
      })
    }

    // Sorting
    if (enableSort && sort.key) {
      const dir = sort.dir === "asc" ? 1 : -1
      base = [...base].sort((a, b) => {
        const av = getSortValue(a, sort.key)
        const bv = getSortValue(b, sort.key)
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
  }, [data, externalColumns, query, sort, enableSort, enableColumnFilters, columnFilters])


  
  const liveTotalsRow = useMemo(() => {
    if (typeof computeTotals === "function") {
      return computeTotals(filtered)
    }
    return totalsRow
  }, [filtered, computeTotals, totalsRow])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const start = (page - 1) * pageSize

  function toggleSort(key) {
    if (!enableSort) return
    setPage(1)
    setSort((cur) => {
      if (cur.key !== key) return { key, dir: "asc" }
      return { key, dir: cur.dir === "asc" ? "desc" : "asc" }
    })
  }

  function renderColumnFilter(c) {
    if (!c.accessor) return null
    const val = columnFilters[c.accessor] || ""

    if (c.filterType === "autocomplete") {
      return (
        <div className="w-full min-w-[120px]">
          <AutocompleteFilter
            options={autocompleteOptions[c.accessor] || []}
            value={val}
            onChange={(newVal) => setColumnFilters(p => ({ ...p, [c.accessor]: newVal }))}
            placeholder={`Filter ${c.header}...`}
          />
        </div>
      )
    }

    if (c.filterType === "date-picker") {
      return (
        <div className="w-full min-w-[120px]">
          <BritishDatePicker
            value={val}
            onChange={(newVal) => setColumnFilters(p => ({ ...p, [c.accessor]: newVal }))}
          />
        </div>
      )
    }

    if (!c.filterType || c.filterType === "text") {
      return (
        <div className="relative w-full">
          <input
            type="text"
            value={val}
            onChange={(e) => setColumnFilters(p => ({ ...p, [c.accessor]: e.target.value }))}
            placeholder={`Filter ${c.header}...`}
            className="w-full h-8 px-2 pr-6 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-ring outline-none"
          />
          {val && String(val).trim() !== "" && (
            <button
              type="button"
              onClick={() => setColumnFilters(p => ({ ...p, [c.accessor]: "" }))}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm hover:bg-muted/50 focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )
    }

    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const hasActiveColumnFilters = Object.values(columnFilters).some(v => v && String(v).trim() !== "")

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Top Totals Summary Bar */}
      {showTotals && liveTotalsRow  && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5 border-b border-border bg-muted/60 print:bg-gray-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-sm text-foreground">{totalColumns[0]?.title}:</span>
            <span className="font-semibold tabular-nums text-sm">{liveTotalsRow[totalColumns[0]?.value]}</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto max-h-[calc(100vh-260px)] print:overflow-visible print:max-h-none">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 print:bg-gray-100 sticky top-0 z-10">
            {/* Header row */}
            <tr>
              {Array.isArray(externalColumns) &&
                externalColumns.map((c) => (
                  <th
                    key={c.accessor || c.header}
                    className={[
                      "px-2 py-1.5 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground border border-border",
                      c.align === "right" ? "text-right" : "",
                      c.align === "center" ? "text-center" : "",
                      c.className || "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div
                      className={[
                        "flex items-center gap-1",
                        c.align === "right"
                          ? "justify-end"
                          : c.align === "center"
                            ? "justify-center"
                            : "justify-start",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="truncate">{c.header}</span>

                      {/* Sort button — only shown when sort is enabled and column has an accessor */}
                      {enableSort && c.accessor && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSort(c.accessor) }}
                          className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground no-print"
                          title={`Sort by ${c.header}`}
                        >
                          {sort.key === c.accessor ? (
                            sort.dir === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                          )}
                        </button>
                      )}
                    </div>
                  </th>
                ))}
            </tr>

            {/* Column filter row */}
            {enableColumnFilters && (
              <tr className="border-b border-border bg-background no-print relative z-10">
                {Array.isArray(externalColumns) &&
                  externalColumns.map((c, colIdx) => (
                    <th
                      key={`filter-${c.accessor || c.header || colIdx}`}
                      className={[
                        "px-1 py-1 font-normal whitespace-nowrap align-middle border border-border",
                        c.className || "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {c.accessor && c.filterType ? renderColumnFilter(c) : null}
                    </th>
                  ))}
              </tr>
            )}
          </thead>

          <tbody>
            {Array.isArray(filtered) && filtered.length > 0 ? (
              filtered.map((row, idx) => {
                const isVisibleOnScreen = idx >= start && idx < start + pageSize
                return (
                  <tr
                    key={`row-${row.id ?? row._id ?? ''}-${idx}`}
                    className={[
                      idx % 2 === 0 ? "bg-gray-50" : "bg-white",
                      "hover:bg-stone-200 print:hover:bg-transparent transition-colors",
                      !isVisibleOnScreen ? "print-only-row" : "",
                      onRowClick ? "cursor-pointer" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {Array.isArray(externalColumns) &&
                      externalColumns.map((c) => (
                        <td
                          key={c.accessor || c.header}
                          className={[
                            "px-2 py-1.5 border border-border",
                            c.align === "right" ? "text-right tabular-nums" : "",
                            c.align === "center" ? "text-center" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {c.render ? c.render(row) : String(row[c.accessor] ?? "—")}
                        </td>
                      ))}
                  </tr>
                )
              })
            ) : (
              <tr>
                <td
                  colSpan={externalColumns?.length || 1}
                  className="px-2 py-8 text-center text-muted-foreground border border-border"
                >
                  {hasActiveColumnFilters
                    ? "No results match your current column filters."
                    : "No data available"}
                </td>
              </tr>
            )}

            {/* Totals row */}
            {showTotals && liveTotalsRow  && (
              <tr className="bg-muted/50 font-semibold border-t-2 border-border print:bg-gray-100">
                {Array.isArray(externalColumns) &&
                  externalColumns.map((c, idx) => (
                    <td
                      key={c.accessor || c.header}
                      className={[
                        "px-2 py-1.5 border border-border",
                        c.align === "right" ? "text-right tabular-nums" : "",
                        c.align === "center" ? "text-center" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {idx === 0 ? "TOTAL" : (liveTotalsRow[c.accessor] ?? "")}
                    </td>
                  ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="no-print flex items-center justify-between p-3 border-t border-border bg-muted/30">
          <div className="text-xs text-muted-foreground">
            Showing {start + 1} to {Math.min(start + pageSize, filtered.length)} of {filtered.length}
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
        @media screen {
          .print-only-row {
            display: none !important;
          }
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .no-print-style {
            all: unset;
          }
          .print-only-row {
            display: table-row !important;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}