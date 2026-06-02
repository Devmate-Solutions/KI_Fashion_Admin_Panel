"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTableFiltered from "@/components/reports/PrintableTableFiltered"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import { exportToPDF } from "@/lib/utils/pdfExport"
import { useProfitLossReport } from "@/lib/hooks/useReports"
import { getDefaultDateRange } from "@/lib/utils/getDefaultDateRange"
import { useAuthStore } from "@/store/store"
import toast from "react-hot-toast"

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(date) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-GB")
}

export default function ProfitLossReportPage() {
  const user = useAuthStore((s) => s.user)
  const isEmployee = user?.role === "employee"

  const [dateRange, setDateRange] = useState(() => {
    const defaults = getDefaultDateRange()
    if (isEmployee) {
      return { from: defaults.to, to: defaults.to }
    }
    return defaults
  })

  const { data, isLoading, isError, error, refetch } = useProfitLossReport({
    startDate: dateRange.from,
    endDate: dateRange.to,
  })

  const reportData = data?.plData || []
  const summary = data?.summary || {}

  const handleExport = async () => {
    try {
      const result = await exportToExcelWithTotals(
        reportData,
        columns,
        totalsRow,
        `Profit_Loss_Report_${dateRange.from}_${dateRange.to}`
      )
      if (result.success) {
        toast.success("Report exported successfully!")
      } else {
        toast.error("Failed to export report")
      }
    } catch (error) {
      toast.error("Export failed: " + error.message)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const result = await exportToPDF({
        title: "Profit & Loss Report",
        columns: columns,
        data: reportData,
        totalsRow: totalsRow,
        dateRange: dateRange,
        filename: `Profit_Loss_Report_${dateRange.from}_${dateRange.to}`
      })
      if (result.success) {
        toast.success("PDF report generated!")
      } else {
        toast.error("Failed to generate PDF")
      }
    } catch (err) {
      toast.error("PDF generation failed: " + err.message)
    }
  }

  const columns = [
    {
      header: "Product Code",
      accessor: "productCode",
      filterType: "autocomplete",
      render: (row) => {
        const productCode = row.productCode || "—"
        const productId = row.productId
        if (productId && productCode !== "—") {
          return (
            <Link
              href={`/stock/${productId}/packets`}
              className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              {productCode}
            </Link>
          )
        }
        return <span className="font-mono text-xs">{productCode}</span>
      },
      pdfValue: (row) => row.productCode || "—"
    },

    {
      header: "Date",
      accessor: "date",
      filterType: "date-picker",

      render: (row) => formatDate(row.date),
      pdfValue: (row) => formatDate(row.date)

    },
    {
      header: "Invoice No.",
      accessor: "invoiceNumber",
      filterType: "text",

      render: (row) => (
        <Link
          href={`/selling?saleId=${row.saleId}`}
          className="text-blue-600 hover:underline font-medium"
        >
          {row.invoiceNumber || "N/A"}
        </Link>
      ),
      pdfValue: (row) => row.invoiceNumber || "N/A",
    },
    {
      header: "Customer",
      accessor: "customerName",
      filterType: "autocomplete",

      pdfValue: (row) => row.customerName || "Walk-in"
    },
    {
      header: "Product Name",
      accessor: "productName",
      filterType: "autocomplete",

      pdfValue: (row) => row.productName || "—"
    },
    {
      header: "Items Sold",
      accessor: "itemsSold",
      filterType: "text",

      align: "right",
      pdfValue: (row) => row.itemsSold || 0
    },
    {
      header: "Selling Price",
      accessor: "sellingPrice",
      filterType: "text",

      align: "right",
      render: (row) => currency(row.sellingPrice || 0),
      pdfValue: (row) => currency(row.sellingPrice || 0)
    },
    {
      header: "Cost Price",
      accessor: "averageCost",
      filterType: "text",

      align: "right",
      render: (row) => currency(row.averageCost || 0),
      pdfValue: (row) => currency(row.averageCost || 0)
    },
    {
      header: "PNL",
      accessor: "pnl",
      filterType: "text",

      align: "right",
      render: (row) => {
        const pnl = row.pnl || 0
        const isProfit = pnl > 0
        const isLoss = pnl < 0
        return (
          <span
            className={`font-semibold ${isProfit ? "text-green-600" : isLoss ? "text-red-600" : "text-gray-600"
              }`}
          >
            {isProfit ? "+" : ""}{currency(pnl)}
          </span>
        )
      },
      pdfValue: (row) => {
        const pnl = row.pnl || 0
        return `${pnl >= 0 ? "+" : ""}${currency(pnl)}`
      }
    },
  ]

  const totalsRow = {
    productName: "TOTAL",

    itemsSold: reportData.reduce(
      (sum, row) => sum + Number(row.itemsSold || 0),
      0
    ),

    sellingPrice: currency(
      reportData.reduce(
        (sum, row) => sum + Number(row.sellingPrice || 0),
        0
      )
    ),

    averageCost: currency(
      reportData.reduce(
        (sum, row) => sum + Number(row.averageCost || 0),
        0
      )
    ),

    pnl: currency(
      reportData.reduce(
        (sum, row) => sum + Number(row.pnl || 0),
        0
      )
    ),
  }

  const computeTotals = (rows) => {
    const itemsSold = rows.reduce(
      (sum, row) => sum + Number(row.itemsSold || 0),
      0
    )

    const sellingPrice = rows.reduce(
      (sum, row) => sum + Number(row.sellingPrice || 0),
      0
    )

    const averageCost = rows.reduce(
      (sum, row) => sum + Number(row.averageCost || 0),
      0
    )

    const pnl = rows.reduce(
      (sum, row) => sum + Number(row.pnl || 0),
      0
    )

    return {
      productName: "TOTAL",

      itemsSold,

      sellingPrice: currency(sellingPrice),

      averageCost: currency(averageCost),

      pnl: currency(pnl),
    }
  }

  const summaryCards = [
    {
      label: "Total Transactions",
      value: reportData.length,
      subtext: "items sold",
    },
    {
      label: "Total Profit",
      value: currency(summary.totalProfit || 0),
      color: "text-green-600",
    },
    {
      label: "Total Loss",
      value: currency(summary.totalLoss || 0),
      color: "text-red-600",
    },
    {
      label: "Net P&L",
      value: currency(summary.netPnL || 0),
      color: (summary.netPnL || 0) > 0 ? "text-green-600" : "text-red-600",
    },
  ]

  return (
    <ReportLayout
      title="Profit & Loss Report"
      description="Transaction-wise profit and loss analysis"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      onExport={handleExport}
      onDownloadPDF={handleDownloadPDF}
      loading={isLoading}
      error={isError ? error : null}
      summary={summaryCards}
      hideDateFilter={isEmployee}
    >

      <PrintableTableFiltered enableColumnFilters={true}
        columns={columns}
        data={reportData}
        loading={isLoading}
        showTotals={true}
        computeTotals={computeTotals}
        totalsRow={totalsRow}
        searchableColumns={[columns[0].accessor]}
        totalColumns={[{ title: "Net Profit/Loss", value: "pnl" }]}
      />
    </ReportLayout>
  )
}
