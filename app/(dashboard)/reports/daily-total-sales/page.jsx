"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useDailySalesReport } from "@/lib/hooks/useReports"
import { Badge } from "@/components/ui/badge"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import toast from "react-hot-toast"

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
  return {
    from: today.toISOString().split("T")[0],
    to: today.toISOString().split("T")[0],
  }
}

export default function DailySalesReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, refetch } = useDailySalesReport({
    startDate: dateRange.from,
    endDate: dateRange.to,
  })

  const salesData = useMemo(() => {
    return data?.sales || []
  }, [data])

  const totals = useMemo(() => {
    return {
      subtotal: salesData.reduce((sum, s) => sum + (s.subtotal || 0), 0),
      discount: salesData.reduce((sum, s) => sum + (s.discount || 0), 0),
      grandTotal: salesData.reduce((sum, s) => sum + (s.grandTotal || 0), 0),
      bankPayment: salesData.reduce((sum, s) => sum + (s.bankPayment || 0), 0),
      cashPayment: salesData.reduce((sum, s) => sum + (s.cashPayment || 0), 0),
    }
  }, [salesData])

  const handleExport = async () => {
    try {
      const result = await exportToExcelWithTotals(
        salesData,
        columns,
        totalsRow,
        `Daily_Sales_Report_${dateRange.from}_${dateRange.to}`
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
      header: "ID",
      accessor: "saleNumber",
      render: (row) => (
        <span className="font-mono text-xs">{row.saleNumber || "—"}</span>
      ),
    },
    {
      header: "Transaction Type",
      accessor: "transactionType",
      render: () => "Sale Invoice",
    },
    {
      header: "Date",
      accessor: "saleDate",
      render: (row) => formatDate(row.saleDate),
    },
    {
      header: "Name",
      accessor: "buyer",
      render: (row) => row.buyer?.name || row.buyer?.company || "Walk-in",
    },
    {
      header: "Total",
      accessor: "subtotal",
      align: "right",
      render: (row) => currency(row.subtotal || 0),
    },
    {
      header: "Discount",
      accessor: "discount",
      align: "right",
      render: (row) => currency(row.discount || 0),
    },
    {
      header: "Total After Disc.",
      accessor: "grandTotal",
      align: "right",
      render: (row) => currency(row.grandTotal || 0),
    },
    {
      header: "Bank Cash",
      accessor: "bankPayment",
      align: "right",
      render: (row) => currency(row.bankPayment || 0),
    },
    {
      header: "Cash",
      accessor: "cashPayment",
      align: "right",
      render: (row) => currency(row.cashPayment || 0),
    },
    {
      header: "Remaining",
      accessor: "remaining",
      align: "right",
      render: (row) => currency(row.grandTotal - (row.bankPayment + row.cashPayment) || 0),
    },
  ]

  const summary = [
    {
      label: "Total Sales",
      value: salesData.length,
      subtext: "transactions",
    },
    {
      label: "Total Amount",
      value: currency(totals.grandTotal),
      color: "text-blue-600",
    },
    {
      label: "Total Discount",
      value: currency(totals.discount),
      color: "text-orange-600",
    },
    {
      label: "Amount Received",
      value: currency(totals.bankPayment + totals.cashPayment),
      color: "text-green-600",
    },
  ]

  const totalsRow = {
    saleNumber: "TOTAL",
    subtotal: totals.subtotal,
    discount: totals.discount,
    grandTotal: totals.grandTotal,
    bankPayment: totals.bankPayment,
    cashPayment: totals.cashPayment,
    remaining: totals.grandTotal - (totals.bankPayment + totals.cashPayment),
  }

  return (
    <ReportLayout
      title="Daily Sales Invoice Wise Report"
      description="All sales transactions for the selected date range"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      onExport={handleExport}
      loading={isLoading}
      summary={summary}
    >
      <PrintableTable
        columns={columns}
        data={salesData}
        loading={isLoading}
        showTotals={true}
        totalsRow={totalsRow}
        searchableColumns={[columns[0].accessor]}
        totalColumns={[{ title: "Total", value: "remaining" }]}
      />
    </ReportLayout>
  )
}
