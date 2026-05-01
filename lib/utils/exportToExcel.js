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
