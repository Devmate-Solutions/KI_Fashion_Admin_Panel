/**
 * Export data to Excel file with premium formatting using xlsx-js-style
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column definitions with accessor and header
 * @param {string} filename - Name of the file to download
 */
export async function exportToExcel(data, columns, filename = "export") {
  try {
    // Use xlsx-js-style for styling support
    const XLSX = await import("xlsx-js-style")
    
    // 1. Prepare Workbook
    const workbook = XLSX.utils.book_new()
    
    // 2. Prepare Data Rows (Starting with Metadata)
    const aoa = []
    
    // Report Title Row
    const title = filename.split("_").join(" ").toUpperCase()
    aoa.push([{ v: title, s: STYLE_TITLE }])
    
    // Metadata Row
    const timestamp = new Date().toLocaleString("en-GB")
    aoa.push([{ v: `Generated at: ${timestamp}`, s: STYLE_METADATA }])
    
    // Empty row for spacing
    aoa.push([])
    
    // 3. Prepare Headers
    const headers = columns.map(col => ({
      v: col.header,
      s: STYLE_HEADER
    }))
    aoa.push(headers)
    
    // 4. Transform Data
    data.forEach((row) => {
      const dataRow = columns.map((col) => {
        if (col.accessor) {
          const rawValue = row[col.accessor]
          const cell = getFormattedCell(rawValue, col, row)
          return cell
        }
        return { v: "" }
      })
      aoa.push(dataRow)
    })

    // 5. Create Worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(aoa)
    
    // 6. Merges (Merge Title and Metadata across columns)
    const colCount = columns.length
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }, // Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } }  // Metadata
    ]

    // 7. Auto-size columns
    const maxWidths = {}
    aoa.forEach((row, rowIndex) => {
      if (rowIndex < 3) return // Skip title/metadata
      row.forEach((cell, colIndex) => {
        if (!cell) return
        const val = cell.v !== undefined ? String(cell.v) : ""
        const length = val.length
        const colHeader = columns[colIndex]?.header || colIndex
        if (!maxWidths[colHeader] || length > maxWidths[colHeader]) {
          maxWidths[colHeader] = Math.min(length, 60)
        }
      })
    })

    worksheet["!cols"] = columns.map((col) => ({
      wch: Math.max(maxWidths[col.header] || 10, 12),
    }))

    // 8. Auto-filter & Frozen Panes
    // Header row is row index 3 (4th row)
    const headerRowIdx = 3
    worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: headerRowIdx, c: 0 }, e: { r: aoa.length - 1, c: colCount - 1 } }) }
    worksheet["!freeze"] = { xSplit: 0, ySplit: headerRowIdx + 1 }

    // 9. Finalize and Download
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report")
    XLSX.writeFile(workbook, `${filename}.xlsx`)
    
    return { success: true }
  } catch (error) {
    console.error("Excel export error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Export table with totals row and premium formatting
 */
export async function exportToExcelWithTotals(data, columns, totalsRow, filename = "export") {
  try {
    const XLSX = await import("xlsx-js-style")
    const workbook = XLSX.utils.book_new()
    const aoa = []
    
    // Title & Metadata
    const title = filename.split("_").join(" ").toUpperCase()
    aoa.push([{ v: title, s: STYLE_TITLE }])
    aoa.push([{ v: `Generated at: ${new Date().toLocaleString("en-GB")}`, s: STYLE_METADATA }])
    aoa.push([])
    
    // Headers
    aoa.push(columns.map(col => ({ v: col.header, s: STYLE_HEADER })))
    
    // Data
    data.forEach((row) => {
      aoa.push(columns.map((col) => {
        if (col.accessor) {
          return getFormattedCell(row[col.accessor], col, row)
        }
        return { v: "" }
      }))
    })

    // Totals Row
    if (totalsRow) {
      const totalRow = columns.map((col, idx) => {
        if (idx === 0) return { v: "TOTAL", s: STYLE_TOTAL }
        if (col.accessor && totalsRow[col.accessor] !== undefined) {
          const rawVal = totalsRow[col.accessor]
          const cell = getFormattedCell(rawVal, col, totalsRow)
          cell.s = STYLE_TOTAL
          return cell
        }
        return { v: "", s: STYLE_TOTAL }
      })
      aoa.push(totalRow)
    }

    const worksheet = XLSX.utils.aoa_to_sheet(aoa)
    const colCount = columns.length
    
    // Layout
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } }
    ]
    
    // Column widths
    const maxWidths = {}
    aoa.forEach((row, ri) => {
      if (ri < 3) return
      row.forEach((cell, ci) => {
        const val = cell?.v !== undefined ? String(cell.v) : ""
        if (!maxWidths[ci] || val.length > maxWidths[ci]) maxWidths[ci] = Math.min(val.length, 60)
      })
    })
    worksheet["!cols"] = columns.map((_, i) => ({ wch: Math.max(maxWidths[i] || 10, 12) }))
    
    // Filter & Freeze
    worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: aoa.length - 2, c: colCount - 1 } }) }
    worksheet["!freeze"] = { xSplit: 0, ySplit: 4 }

    XLSX.utils.book_append_sheet(workbook, worksheet, "Report")
    XLSX.writeFile(workbook, `${filename}.xlsx`)
    
    return { success: true }
  } catch (error) {
    console.error("Excel export error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Specialized Month-end Export with Top Summary
 */
export async function exportMonthEndToExcel(data, columns, totalsRow, summary, filename = "month_end_report") {
  try {
    const XLSX = await import("xlsx-js-style")
    const workbook = XLSX.utils.book_new()
    const aoa = []
    
    // 1. Title & Spacing
    const title = "MONTH-END DETAILED REPORT"
    aoa.push([{ v: title, s: STYLE_TITLE }])
    aoa.push([])
    
    // 2. Summary Section (Starts at Row 3)
    // Row 3: Header
    aoa.push(["", { v: "Summary", s: STYLE_SUMMARY_HEADER }])
    
    // Row 4: Date Range
    aoa.push(["", { v: "Date Range", s: STYLE_SUMMARY_LABEL }, { v: summary.dateRange || "—", s: STYLE_SUMMARY_VALUE }])
    
    // Row 5: Total Sell
    aoa.push(["", { v: "Total Sell", s: STYLE_SUMMARY_LABEL }, { v: summary.totalSell, s: STYLE_SUMMARY_VALUE }])
    
    // Row 6: Sell in Loss
    aoa.push(["", 
      { v: "Sell in Loss", s: STYLE_SUMMARY_LABEL }, 
      { v: summary.sellInLossValue, s: STYLE_SUMMARY_VALUE },
      { v: summary.sellInLossPercent, s: STYLE_SUMMARY_PERCENT }
    ])
    
    // Row 7: Sell in Profit
    aoa.push(["", 
      { v: "Sell in Profit", s: STYLE_SUMMARY_LABEL }, 
      { v: summary.sellInProfitValue, s: STYLE_SUMMARY_VALUE },
      { v: summary.sellInProfitPercent, s: STYLE_SUMMARY_PERCENT }
    ])
    
    // Row 8: Profit / Net Profit Box
    aoa.push(["", 
      { v: "Profit", s: STYLE_SUMMARY_LABEL }, 
      { v: summary.totalProfit, s: STYLE_SUMMARY_VALUE },
      { v: "Net Profit", s: STYLE_SUMMARY_LABEL_ALT },
      { v: summary.netProfit, s: STYLE_SUMMARY_VALUE_ALT },
      { v: summary.netProfitPercent, s: STYLE_SUMMARY_PERCENT_ALT }
    ])
    
    // Row 9: Loss
    aoa.push(["", { v: "Loss", s: STYLE_SUMMARY_LABEL }, { v: summary.totalLoss, s: STYLE_SUMMARY_VALUE_RED }])
    
    // Row 10: Return
    aoa.push(["", { v: "Return", s: STYLE_SUMMARY_LABEL }, { v: summary.totalReturn || 0, s: STYLE_SUMMARY_VALUE }])
    
    // Row 11: C/Amount
    aoa.push(["", { v: "C/Amount", s: STYLE_SUMMARY_LABEL }, { v: summary.cAmount, s: STYLE_SUMMARY_VALUE_BOLD }])
    
    // Row 12: Commission
    aoa.push(["", { v: "Commission", s: STYLE_SUMMARY_LABEL }, { v: summary.commission || 0, s: STYLE_SUMMARY_VALUE }])
    
    // Spacing
    aoa.push([])
    aoa.push([])
    
    // 3. Main Data Table
    const tableHeaderRowIdx = aoa.length
    aoa.push(columns.map(col => ({ v: col.header, s: STYLE_HEADER })))
    
    data.forEach((row) => {
      aoa.push(columns.map((col) => {
        if (col.accessor) {
          return getFormattedCell(row[col.accessor], col, row)
        }
        return { v: "" }
      }))
    })

    // 4. Totals Row
    if (totalsRow) {
      aoa.push(columns.map((col, idx) => {
        if (idx === 0) return { v: "TOTAL", s: STYLE_TOTAL }
        if (col.accessor && totalsRow[col.accessor] !== undefined) {
          const cell = getFormattedCell(totalsRow[col.accessor], col, totalsRow)
          cell.s = STYLE_TOTAL
          return cell
        }
        return { v: "", s: STYLE_TOTAL }
      }))
    }

    const worksheet = XLSX.utils.aoa_to_sheet(aoa)
    const colCount = columns.length
    
    // 5. Layout & Formatting
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }, // Title
      { s: { r: 2, c: 1 }, e: { r: 2, c: 2 } }            // Summary Header
    ]
    
    // Column widths
    const maxWidths = {}
    aoa.forEach((row, ri) => {
      if (ri < tableHeaderRowIdx) return
      row.forEach((cell, ci) => {
        const val = cell?.v !== undefined ? String(cell.v) : ""
        if (!maxWidths[ci] || val.length > maxWidths[ci]) maxWidths[ci] = Math.min(val.length, 60)
      })
    })
    worksheet["!cols"] = columns.map((_, i) => ({ wch: Math.max(maxWidths[i] || 10, 12) }))
    
    // Filter & Freeze
    worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: tableHeaderRowIdx, c: 0 }, e: { r: aoa.length - 2, c: colCount - 1 } }) }
    worksheet["!freeze"] = { xSplit: 0, ySplit: tableHeaderRowIdx + 1 }

    XLSX.utils.book_append_sheet(workbook, worksheet, "Month-end Report")
    XLSX.writeFile(workbook, `${filename}.xlsx`)
    
    return { success: true }
  } catch (error) {
    console.error("Excel export error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Determine cell value, type, and format
 */
function getFormattedCell(value, col, row) {
  // 0. Handle explicit string type to prevent any auto-conversion
  if (col.type === "string") {
    return { v: value !== undefined && value !== null ? String(value) : "", t: "s" }
  }

  // If value is already a formatted currency string, extract the number
  if (typeof value === "string" && (value.includes("£") || value.includes("$"))) {
    const num = parseFloat(value.replace(/[^0-9.-]/g, ""))
    if (!isNaN(num)) return { v: num, t: "n", z: "\"£\"#,##0.00" }
  }

  // 1. Try custom excelValue
  if (col.excelValue && typeof col.excelValue === "function") {
    const v = col.excelValue(row)
    if (v === "NaN" || (typeof v === "number" && isNaN(v))) return { v: "" }
    return { v, ...getCellProps(v) }
  }

  // 2. Try pdfValue (if value is not already a string)
  if (col.pdfValue && typeof col.pdfValue === "function" && typeof value !== "string") {
    try {
      const v = col.pdfValue(row)
      
      // Handle potential NaN from pdfValue
      if (v === "NaN" || (v && v.toString().includes("NaN"))) {
        return { v: value ?? "", ...getCellProps(value) }
      }

      if (typeof v === "string" && (v.includes("£") || v.includes("$"))) {
        const num = parseFloat(v.replace(/[^0-9.-]/g, ""))
        if (!isNaN(num)) return { v: num, t: "n", z: "\"£\"#,##0.00" }
      }
      return { v, ...getCellProps(v) }
    } catch (e) {
      return { v: value ?? "", ...getCellProps(value) }
    }
  }

  // 3. Fallback to raw value with type detection
  return { v: value ?? "", ...getCellProps(value) }
}

function getCellProps(value) {
  if (typeof value === "number") {
    if (isNaN(value)) return { v: "", t: "s" }
    // Use integer format for whole numbers, decimal format for others
    const z = Number.isInteger(value) ? "#,##0" : "#,##0.00"
    return { t: "n", z }
  }
  
  if (value instanceof Date) return { t: "d", z: "dd/mm/yyyy" }
  
  if (typeof value === "string") {
    // Check for ISO date format
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) return { t: "d", z: "dd/mm/yyyy", v: date }
    }
    // Refined number detection: Only auto-convert if it contains a decimal point
    // This prevents product codes like "793" from being treated as numbers
    // but still allows strings that look like prices/decimals to be numeric in Excel.
    if (/^-?\d+\.\d+$/.test(value) && value.length > 0 && value.length < 15) {
      const num = parseFloat(value)
      if (!isNaN(num)) return { t: "n", z: "#,##0.00", v: num }
    }
  }
  
  return { t: "s" }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const STYLE_TITLE = {
  font: { bold: true, sz: 16, color: { rgb: "1e3a8a" } },
  alignment: { horizontal: "center", vertical: "center" }
}

const STYLE_METADATA = {
  font: { italic: true, sz: 10, color: { rgb: "64748b" } },
  alignment: { horizontal: "center" }
}

const STYLE_HEADER = {
  fill: { fgColor: { rgb: "1e40af" } },
  font: { bold: true, color: { rgb: "ffffff" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "ffffff" } },
    bottom: { style: "thin", color: { rgb: "ffffff" } },
    left: { style: "thin", color: { rgb: "ffffff" } },
    right: { style: "thin", color: { rgb: "ffffff" } }
  }
}

const STYLE_TOTAL = {
  fill: { fgColor: { rgb: "f1f5f9" } },
  font: { bold: true },
  border: {
    top: { style: "medium", color: { rgb: "1e40af" } }
  }
}

const STYLE_SUMMARY_HEADER = {
  fill: { fgColor: { rgb: "f59e0b" } },
  font: { bold: true, sz: 12 },
  alignment: { horizontal: "center" },
  border: {
    top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" }
  }
}

const STYLE_SUMMARY_LABEL = {
  fill: { fgColor: { rgb: "f8fafc" } },
  font: { bold: false },
  border: {
    top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" }
  }
}

const STYLE_SUMMARY_LABEL_ALT = {
  fill: { fgColor: { rgb: "ffffff" } },
  font: { bold: false },
  alignment: { horizontal: "center" },
  border: {
    top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" }
  }
}

const STYLE_SUMMARY_VALUE = {
  font: { bold: false },
  alignment: { horizontal: "right" },
  border: {
    top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" }
  },
  numFmt: "#,##0.00"
}

const STYLE_SUMMARY_VALUE_RED = {
  font: { bold: false, color: { rgb: "ef4444" } },
  alignment: { horizontal: "right" },
  border: {
    top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" }
  },
  numFmt: "#,##0.00"
}

const STYLE_SUMMARY_VALUE_BOLD = {
  font: { bold: true },
  alignment: { horizontal: "right" },
  border: {
    top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" }
  },
  numFmt: "#,##0.00"
}

const STYLE_SUMMARY_VALUE_ALT = {
  font: { bold: true, color: { rgb: "1e3a8a" } },
  alignment: { horizontal: "center" },
  border: {
    top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "medium" }, right: { style: "medium" }
  },
  numFmt: "#,##0.00"
}

const STYLE_SUMMARY_PERCENT = {
  font: { sz: 9, color: { rgb: "64748b" } },
  alignment: { horizontal: "center" },
  numFmt: "0.00%"
}

const STYLE_SUMMARY_PERCENT_ALT = {
  font: { bold: true, color: { rgb: "1e3a8a" } },
  alignment: { horizontal: "center" },
  border: {
    top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "medium" }, right: { style: "medium" }
  },
  numFmt: "0.00%"
}
