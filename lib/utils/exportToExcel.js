/**
 * Export data to Excel file using xlsx library
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column definitions with accessor and header
 * @param {string} filename - Name of the file to download (without extension)
 */
export async function exportToExcel(data, columns, filename = "export") {
  try {
    // Dynamically import xlsx to reduce bundle size
    const XLSX = await import("xlsx")
    
    // Transform data according to columns
    const transformedData = data.map((row) => {
      const newRow = {}
      columns.forEach((col) => {
        if (col.accessor) {
          // Use the header as the key for Excel columns
          newRow[col.header] = row[col.accessor] ?? ""
        }
      })
      return newRow
    })

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(transformedData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report")

    // Auto-size columns
    const maxWidths = {}
    columns.forEach((col) => {
      maxWidths[col.header] = col.header.length
    })
    
    transformedData.forEach((row) => {
      Object.entries(row).forEach(([key, value]) => {
        const length = String(value).length
        if (!maxWidths[key] || length > maxWidths[key]) {
          maxWidths[key] = Math.min(length, 50) // Cap at 50 characters
        }
      })
    })

    worksheet["!cols"] = columns.map((col) => ({
      wch: Math.max(maxWidths[col.header] || 10, 10),
    }))

    // Generate Excel file
    XLSX.writeFile(workbook, `${filename}.xlsx`)
    
    return { success: true }
  } catch (error) {
    console.error("Excel export error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Export table with totals row
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column definitions
 * @param {Object} totalsRow - Object with totals for each column
 * @param {string} filename - Name of the file
 */
export async function exportToExcelWithTotals(data, columns, totalsRow, filename = "export") {
  try {
    const XLSX = await import("xlsx")
    
    // Transform data
    const transformedData = data.map((row) => {
      const newRow = {}
      columns.forEach((col) => {
        if (col.accessor) {
          newRow[col.header] = row[col.accessor] ?? ""
        }
      })
      return newRow
    })

    // Add totals row
    if (totalsRow) {
      const totalRow = {}
      columns.forEach((col, idx) => {
        if (idx === 0) {
          totalRow[col.header] = "TOTAL"
        } else if (col.accessor && totalsRow[col.accessor]) {
          totalRow[col.header] = totalsRow[col.accessor]
        } else {
          totalRow[col.header] = ""
        }
      })
      transformedData.push(totalRow)
    }

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(transformedData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report")

    // Auto-size columns
    const maxWidths = {}
    columns.forEach((col) => {
      maxWidths[col.header] = col.header.length
    })
    
    transformedData.forEach((row) => {
      Object.entries(row).forEach(([key, value]) => {
        const length = String(value).length
        if (!maxWidths[key] || length > maxWidths[key]) {
          maxWidths[key] = Math.min(length, 50)
        }
      })
    })

    worksheet["!cols"] = columns.map((col) => ({
      wch: Math.max(maxWidths[col.header] || 10, 10),
    }))

    XLSX.writeFile(workbook, `${filename}.xlsx`)
    
    return { success: true }
  } catch (error) {
    console.error("Excel export error:", error)
    return { success: false, error: error.message }
  }
}
