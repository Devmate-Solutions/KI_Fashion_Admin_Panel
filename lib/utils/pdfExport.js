import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

/**
 * Export data to PDF file using jsPDF and jspdf-autotable
 * @param {Object} options - Export options
 * @param {string} options.title - Report title
 * @param {Array} options.columns - Column definitions
 * @param {Array} options.data - Data to export
 * @param {Object} options.totalsRow - Optional totals row
 * @param {Object} options.dateRange - Optional date range { from, to }
 * @param {string} options.filename - Filename (without extension)
 */
export async function exportToPDF({
  title,
  columns,
  data,
  totalsRow = null,
  dateRange = null,
  filename = "report",
  mode = "open" // "download" or "open"
}) {
  try {
    const doc = new jsPDF("p", "mm", "a4")
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // Helper to format currency if it's a number
    const formatValue = (val) => {
      if (typeof val === 'number') {
        return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }
      return val ?? ""
    }

    // 1. Header Section
    doc.setFontSize(22)
    doc.setTextColor(40, 40, 40)
    doc.text("KI FASHION", pageWidth / 2, 15, { align: "center" })
    
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text("Business Management System", pageWidth / 2, 21, { align: "center" })
    
    // Horizontal Line
    doc.setDrawColor(200, 200, 200)
    doc.line(15, 25, pageWidth - 15, 25)

    // 2. Report Info
    doc.setFontSize(16)
    doc.setTextColor(0, 0, 0)
    doc.text(title, 15, 35)
    
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    
    const now = new Date()
    doc.text(`Generated: ${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString('en-GB')}`, pageWidth - 15, 35, { align: "right" })
    
    if (dateRange) {
      const from = dateRange.from ? new Date(dateRange.from).toLocaleDateString('en-GB') : "Beginning"
      const to = dateRange.to ? new Date(dateRange.to).toLocaleDateString('en-GB') : "Present"
      doc.text(`Period: ${from} to ${to}`, 15, 42)
    }

    // 3. Prepare Table Data
    const tableHeaders = columns.map(col => col.header)
    
    const tableData = data.map(row => {
      return columns.map(col => {
        // If there's a specific pdfValue function, use it
        if (col.pdfValue) return col.pdfValue(row)
        
        // Otherwise use the accessor
        const value = row[col.accessor]
        
        // Handle special cases or basic formatting
        if (col.accessor === 'date' || col.accessor?.toLowerCase().includes('date')) {
          return value ? new Date(value).toLocaleDateString('en-GB') : "—"
        }
        
        return formatValue(value)
      })
    })

    // Add Totals Row if provided
    if (totalsRow) {
      const totalsData = columns.map((col, idx) => {
        if (idx === 0) return "TOTAL"
        return formatValue(totalsRow[col.accessor] || "")
      })
      tableData.push(totalsData)
    }

    // 4. Generate Table
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 48,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 133, 244], // Blue color
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: columns.reduce((acc, col, idx) => {
        if (col.align === 'right') {
          acc[idx] = { halign: 'right' }
        } else if (col.align === 'center') {
          acc[idx] = { halign: 'center' }
        }
        return acc
      }, {}),
      didParseCell: function (data) {
        // Style the totals row
        if (totalsRow && data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [230, 230, 230]
        }
      },
      margin: { top: 30, bottom: 20 },
    })

    // 5. Footer (Page numbers)
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      )
    }

    // 6. Save or Open PDF
    if (mode === "open") {
      const blobUrl = doc.output("bloburl")
      window.open(blobUrl, "_blank")
    } else {
      doc.save(`${filename}.pdf`)
    }
    
    return { success: true }
  } catch (error) {
    console.error("PDF export error:", error)
    return { success: false, error: error.message }
  }
}
