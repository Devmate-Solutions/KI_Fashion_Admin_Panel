"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import apiClient from "@/lib/api-client"
import toast from "react-hot-toast"
import { useQuery } from "@tanstack/react-query"

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(date) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-GB")
}

function getDefaultDateRange() {
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  return {
    from: thirtyDaysAgo.toISOString().split("T")[0],
    to: today.toISOString().split("T")[0],
  }
}

async function fetchProfitLossReport(startDate, endDate) {
  const response = await apiClient.get("/reports/profit-loss", {
    params: {
      startDate,
      endDate,
    },
  })
  return response.data.data || { plData: [], summary: {} }
}

export default function ProfitLossReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["profitLossReport", dateRange.from, dateRange.to],
    queryFn: () => fetchProfitLossReport(dateRange.from, dateRange.to),
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

  const columns = [
    {
      header: "Sno",
      accessor: "sno",
      align: "center",
      render: (row) => row.sno,
    },
    {
      header: "Transaction Date",
      accessor: "transactionDate",
      render: (row) => formatDate(row.transactionDate),
    },
    {
      header: "Invoice No.",
      accessor: "invoiceNumber",
      render: (row) => (
        <span className="font-mono text-xs">{row.invoiceNumber || "—"}</span>
      ),
    },
    {
      header: "Customer Name",
      accessor: "customerName",
      render: (row) => row.customerName || "—",
    },
    {
      header: "Product Code",
      accessor: "productCode",
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
    },
    {
      header: "Items Sold",
      accessor: "itemsSold",
      align: "right",
      render: (row) => row.itemsSold || 0,
    },
    {
      header: "Selling Price",
      accessor: "sellingPrice",
      align: "right",
      render: (row) => currency(row.sellingPrice || 0),
    },
    {
      header: "Total Sales",
      accessor: "totalSales",
      align: "right",
      render: (row) => currency(row.totalSales || 0),
    },
    {
      header: "Average Price",
      accessor: "averagePrice",
      align: "right",
      render: (row) => currency(row.averagePrice || 0),
    },
    {
      header: "Average Cost",
      accessor: "averageCost",
      align: "right",
      render: (row) => currency(row.averageCost || 0),
    },
    {
      header: "PNL",
      accessor: "pnl",
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
    },
  ]

  const totalsRow = {
    sno: "TOTAL",
    itemsSold: reportData.reduce((sum, row) => sum + (row.itemsSold || 0), 0),
    totalSales: reportData.reduce((sum, row) => sum + (row.totalSales || 0), 0),
    pnl: Number((reportData.reduce((sum, row) => sum + (row.pnl || 0), 0)).toFixed(2)),
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
      loading={isLoading}
      summary={summaryCards}
    >
      <PrintableTable
        columns={columns}
        data={reportData}
        loading={isLoading}
        showTotals={true}
        totalsRow={totalsRow}
        totalColumns={[{ title: "Total", value: "pnl" }]}

      />
    </ReportLayout>
  )
}
