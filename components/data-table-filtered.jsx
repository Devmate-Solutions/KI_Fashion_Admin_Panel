"use client"

import React, { useMemo, useState, useEffect } from "react"
import { ChevronRight, ChevronDown, FileText, Loader2, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

// Import your custom UI filter components
import AutocompleteFilter from "@/components/ui/autocomplete-filter"
import BritishDatePicker from "@/components/BritishDatePicker"

function normalize(v) {
    return String(v ?? "").toLowerCase()
}

export default function DataTableFiltered({
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
    pageSize = 99999,
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
    onFilteredDataChange,
}) {
    const [query, setQuery] = useState("")
    const [internalSort, setInternalSort] = useState({ key: null, dir: "asc" })
    const sort = sortConfig || internalSort

    const [expandedRowId, setExpandedRowId] = useState(null)

    // Internal state for managing column filters client-side
    const [columnFilters, setColumnFilters] = useState({})



    // Automatically compute unique options for autocomplete columns (ported from PrintableTable)
    const autocompleteOptions = useMemo(() => {
        const options = {}
        if (manualPagination) return options // Handled by server if manual pagination is active

        const safeData = Array.isArray(data) ? data : []
        const safeColumns = Array.isArray(columns) ? columns : []

        safeColumns.forEach(c => {
            if ((c.filterType === "autocomplete" || c.filter?.type === "autocomplete") && c.accessor) {
                const uniqueVals = Array.from(
                    new Set(
                        safeData
                            .map(row => {
                                if (typeof c.filterValue === 'function') return c.filterValue(row)
                                return row[c.accessor]
                            })
                            .filter(val => val !== null && val !== undefined && String(val).trim() !== "")
                    )
                )
                options[c.accessor] = uniqueVals.map(v => String(v))
            }
        })
        return options
    }, [data, columns, manualPagination])

    // Check active state for resetting options
    const hasActiveColumnFilters = useMemo(() => {
        const hasInternalActive = Object.values(columnFilters).some(v => v && String(v).trim() !== "")
        const hasExternalActive = (columns || []).some(col => col.filter && String(col.filter.value || "").trim() !== "")
        return hasInternalActive || hasExternalActive
    }, [columnFilters, columns])

    const handleResetColumnFilters = () => {
        setColumnFilters({})
            ; (columns || []).forEach(col => {
                if (col.filter?.onChange) col.filter.onChange("")
            })
    }

    // Combined dynamic client-side sorting and multi-type filtering
    const filtered = useMemo(() => {
        const safeData = Array.isArray(data) ? data : []
        const safeColumns = Array.isArray(columns) ? columns : []

        if (manualPagination) return safeData

        const getFilterString = (row, key) => {
            const col = safeColumns.find((c) => c.accessor === key)
            if (col && typeof col.filterValue === "function") {
                return normalize(col.filterValue(row))
            }
            return normalize(row[key])
        }

        // 1. Global text search match
        const q = normalize(query)
        let base = q
            ? safeData.filter((row) => safeColumns.some((c) => c.accessor && normalize(row[c.accessor]).includes(q)))
            : safeData

        // 2. Multi-conditional Column-level filtering
        if (enableColumnFilters) {
            safeColumns.forEach((c) => {
                if (!c.accessor) return

                // Evaluate external or internal values
                const val = c.filter?.value !== undefined ? c.filter.value : columnFilters[c.accessor]
                if (!val) return

                const type = c.filterType || c.filter?.type

                if (type === "autocomplete") {
                    if (String(val).trim() !== "") {
                        const fv = normalize(val)
                        base = base.filter((row) => getFilterString(row, c.accessor) === fv)
                    }
                } else if (type === "date-picker") {
                    if (val) {
                        // Standardize the picked date into a simple YYYY-MM-DD string
                        const filterStr = typeof val === "string" ? val : new Date(val).toLocaleDateString("en-CA")

                        base = base.filter((row) => {
                            // 1. Prioritize our custom filterValue (This fixes your BuyingPage!)
                            if (c.filterValue) {
                                return c.filterValue(row) === filterStr
                            }

                            // 2. Fallback if no filterValue is provided
                            if (!row[c.accessor]) return false
                            const rowDate = new Date(row[c.accessor])
                            return !isNaN(rowDate) && rowDate.toLocaleDateString("en-CA") === filterStr
                        })
                    }
                } else {
                    // Standard plain text contains matching pattern
                    if (String(val).trim() !== "") {
                        const fv = normalize(val)
                        base = base.filter((row) => getFilterString(row, c.accessor).includes(fv))
                    }
                }
            })
        }

        // 3. Sorting Execution 
        if (sort.key) {
            const dir = sort.dir === "asc" ? 1 : -1
            base = [...base].sort((a, b) => {
                let av = a[sort.key]
                let bv = b[sort.key]

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
    }, [data, columns, query, sort, manualPagination, enableColumnFilters, columnFilters])

    useEffect(() => {
        if (onFilteredDataChange) {
            onFilteredDataChange(filtered)
        }
    }, [filtered, onFilteredDataChange])

    const slice = filtered;

    function toggleSort(key) {
        if (disableSorting) return

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


    const hasHeader = title || enableSearch || onAddNew

    // Helper row render method logic mapped cleanly for standard data rendering layout
    function renderColumnFilterItem(c) {
        if (!c.accessor) return null

        const val = c.filter?.value !== undefined ? c.filter.value : (columnFilters[c.accessor] || "")
        const updateValue = (newVal) => {
            if (c.filter?.onChange) {
                c.filter.onChange(newVal)
            } else {
                setColumnFilters(p => ({ ...p, [c.accessor]: newVal }))
            }
        }

        const type = c.filterType || c.filter?.type

        if (type === "autocomplete") {
            return (
                <div className="w-full min-w-[120px]">
                    <AutocompleteFilter
                        options={autocompleteOptions[c.accessor] || []}
                        value={val}
                        onChange={updateValue}
                        placeholder={`Filter...`}
                    />
                </div>
            )
        }

        if (type === "date-picker") {
            return (
                <div className="w-full min-w-[120px]">
                    <BritishDatePicker
                        // Safely parse incoming strings back to Date objects for the UI
                        value={val ? new Date(val) : null}
                        onChange={(date) => {
                            // Standardize outgoing values to flat YYYY-MM-DD strings
                            const dateStr = date ? date.toLocaleDateString("en-CA") : ""
                            updateValue(dateStr)
                        }}
                    />
                </div>
            )
        }

        // Default Fallback Plain Input Elements Block Text Matcher
        return (
            <div className="relative w-full">
                <input
                    type="text"
                    value={val}
                    onChange={(e) => updateValue(e.target.value)}
                    placeholder={`Filter...`}
                    className="w-full h-8 px-2 pr-6 text-xs border border-border rounded bg-background focus:ring-1 focus:ring-ring outline-none"
                />
                {val && String(val).trim() !== "" && (
                    <button
                        type="button"
                        onClick={() => updateValue("")}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm hover:bg-muted/50 focus:outline-none"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>
        )
    }

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
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
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
            )}

            <div className="overflow-x-auto">
                {loading && (!Array.isArray(data) || data.length === 0) ? (
                    <div className="flex flex-col items-center justify-center p-8 sm:p-12 animate-in fade-in duration-300">
                        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                        <p className="text-sm text-muted-foreground font-medium">Loading data...</p>
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
                            {/* <thead className="bg-muted/30 sticky top-0 z-50">
                                <tr className="border-b border-border">
                                    {expandableRow && <th className={cn("hidden sm:table-cell w-8", compact ? "px-1.5 py-1" : "px-2 py-2.5 sm:py-3")}></th>}
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
                                        {expandableRow && <th className="hidden sm:table-cell w-8 px-1 py-1"></th>}
                                        {Array.isArray(columns) && columns.map((c, colIdx) => (
                                            <th
                                                key={`filter-${c.accessor || c.header || colIdx}`}
                                                className={cn("px-1 py-1 font-normal whitespace-nowrap align-middle", c.className)}
                                            >
                                                {c.accessor && (c.filterType || c.filter) ? renderColumnFilterItem(c) : null}
                                            </th>
                                        ))}
                                        {!hideActions && (onEdit || onDelete) && <th className="px-1 py-1"></th>}
                                    </tr>
                                )}
                            </thead> */}

                            <thead className="bg-muted/30 sticky top-0 z-[100]">
                                <tr className="border-b border-border">
                                    {expandableRow && <th className={cn("hidden sm:table-cell w-8", compact ? "px-1.5 py-1" : "px-2 py-2.5 sm:py-3")}></th>}
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
                                    <tr className="border-b border-border bg-background relative z-[100]">
                                        {expandableRow && <th className="hidden sm:table-cell w-8 px-1 py-1"></th>}
                                        {Array.isArray(columns) && columns.map((c, colIdx) => (
                                            <th
                                                key={`filter-${c.accessor || c.header || colIdx}`}
                                                // Overflow-visible guarantees dropdowns aren't clipped inside the cell!
                                                className={cn("px-1 py-1 font-normal whitespace-nowrap align-middle overflow-visible", c.className)}
                                            >
                                                {c.accessor && (c.filterType || c.filter) ? renderColumnFilterItem(c) : null}
                                            </th>
                                        ))}
                                        {!hideActions && (onEdit || onDelete) && <th className="px-1 py-1"></th>}
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
                                                        />
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
                                                                    aria-label={`Edit item`}
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
                                                                    aria-label={`Delete item`}
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
                                                    <tr>{renderExpandedRow(row)}</tr>
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

            {/* Pagination Section */}
            {/* {paginate && pageCount > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4 border-t border-border">
                    <div className="text-[10px] sm:text-xs text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
                        Showing {displayStart + 1} to {displayEnd} of {displayTotal} entries
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap order-1 sm:order-2 justify-center sm:justify-end w-full sm:w-auto">
                        <button
                            className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium border border-border rounded-md hover:bg-muted active:scale-95 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[36px] sm:min-h-[32px]"
                            onClick={() => setPage(1)}
                            disabled={page === 1}
                        >
                            First
                        </button>
                        <button
                            className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium border border-border rounded-md hover:bg-muted active:scale-95 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[36px] sm:min-h-[32px]"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Prev
                        </button>

                        <div className="flex items-center gap-0.5 sm:gap-1">
                            {(() => {
                                const pages = []
                                const maxVisible = 5
                                let startPage = Math.max(1, page - Math.floor(maxVisible / 2))
                                let endPage = Math.min(pageCount, startPage + maxVisible - 1)

                                if (endPage - startPage < maxVisible - 1) {
                                    startPage = Math.max(1, endPage - maxVisible + 1)
                                }

                                if (startPage > 1) {
                                    pages.push(
                                        <button
                                            key={1}
                                            className={`px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium border border-border rounded-md hover:bg-muted active:scale-95 transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[36px] sm:min-h-[32px] ${page === 1 ? 'bg-primary text-primary-foreground' : ''}`}
                                            onClick={() => setPage(1)}
                                        >
                                            1
                                        </button>
                                    )
                                    if (startPage > 2) {
                                        pages.push(<span key="ellipsis1" className="px-0.5 sm:px-1 text-[10px] sm:text-xs text-muted-foreground">...</span>)
                                    }
                                }

                                for (let i = startPage; i <= endPage; i++) {
                                    pages.push(
                                        <button
                                            key={i}
                                            className={`px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium border border-border rounded-md hover:bg-muted active:scale-95 transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[36px] sm:min-h-[32px] ${page === i ? 'bg-primary text-primary-foreground' : ''}`}
                                            onClick={() => setPage(i)}
                                        >
                                            {i}
                                        </button>
                                    )
                                }

                                if (endPage < pageCount) {
                                    if (endPage < pageCount - 1) {
                                        pages.push(<span key="ellipsis2" className="px-0.5 sm:px-1 text-[10px] sm:text-xs text-muted-foreground">...</span>)
                                    }
                                    pages.push(
                                        <button
                                            key={pageCount}
                                            className={`px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium border border-border rounded-md hover:bg-muted active:scale-95 transition-all duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[36px] sm:min-h-[32px] ${page === pageCount ? 'bg-primary text-primary-foreground' : ''}`}
                                            onClick={() => setPage(pageCount)}
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
                        >
                            Next
                        </button>
                        <button
                            className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium border border-border rounded-md hover:bg-muted active:scale-95 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[36px] sm:min-h-[32px]"
                            onClick={() => setPage(pageCount)}
                            disabled={page === pageCount}
                        >
                            Last
                        </button>
                    </div>
                </div>
            )} */}
        </div>
    )
}