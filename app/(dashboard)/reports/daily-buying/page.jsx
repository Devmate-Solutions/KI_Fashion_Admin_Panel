"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useDailyBuyingReport } from "@/lib/hooks/useReports"
import { Badge } from "@/components/ui/badge"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import toast from "react-hot-toast"

function formatNumber(n) {
  const num = Number(n || 0)
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Kept for backward compatibility - now without currency symbol
function currency(n) {
  return formatNumber(n)
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

export default function DailyBuyingReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, refetch } = useDailyBuyingReport({
    startDate: dateRange.from,
    endDate: dateRange.to,
  })

  const purchaseData = useMemo(() => {
    return data?.purchases || []
  }, [data])

  const totals = useMemo(() => {
    return {
      total: purchaseData.reduce((sum, p) => sum + (p.supplierPaymentTotal || 0), 0),
      discount: purchaseData.reduce((sum, p) => sum + (p.totalDiscount || 0), 0),
      cashPayment: purchaseData.reduce((sum, p) => sum + (p.cashPayment || 0), 0),
      bankPayment: purchaseData.reduce((sum, p) => sum + (p.bankPayment || 0), 0),
      totalPayment: purchaseData.reduce((sum, p) => sum + (p.totalPayment || 0), 0),
      balance: purchaseData.reduce((sum, p) => sum + (p.balance || 0), 0),
    }
  }, [purchaseData])

  const handleExport = async () => {
    try {
      const result = await exportToExcelWithTotals(
        purchaseData,
        columns,
        totalsRow,
        `Daily_Buying_Report_${dateRange.from}_${dateRange.to}`
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
      accessor: "orderNumber",
      render: (row) => (
        <span className="font-mono text-xs">{row.orderNumber || row._id?.slice(-8) || "—"}</span>
      ),
    },
    {
      header: "Transaction Type",
      accessor: "transactionType",
      render: () => "Buying Invoice",
    },
    {
      header: "Invoice Date",
      accessor: "dispatchDate",
      render: (row) => formatDate(row.dispatchDate || row.createdAt),
    },
    {
      header: "Name",
      accessor: "supplier",
      render: (row) => row.supplier?.name || row.supplier?.company || "—",
    },
    {
      header: "Total",
      accessor: "supplierPaymentTotal",
      align: "right",
      render: (row) => currency(row.supplierPaymentTotal + row.totalDiscount || 0),
    },
    {
      header: "Discount",
      accessor: "totalDiscount",
      align: "right",
      render: (row) => currency(row.totalDiscount || 0),
    },
    {
      header: "Total After Disc.",
      accessor: "totalAfterDiscount",
      align: "right",
      render: (row) => currency(row.supplierPaymentTotal || 0),
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
  ]

  const summary = [
    {
      label: "Total Orders",
      value: purchaseData.length,
      subtext: "purchase orders",
    },
    {
      label: "Total Amount",
      value: currency(totals.total),
      color: "text-blue-600",
    },
    {
      label: "Amount Paid",
      value: currency(totals.totalPayment),
      color: "text-green-600",
    },
    {
      label: "Outstanding",
      value: currency(totals.balance),
      color: "text-red-600",
    },
  ]

  const totalsRow = {
    grandTotal: currency(totals.total),
    discount: currency(totals.discount),
    totalAfterDiscount: currency(totals.total),
    bankPayment: currency(totals.bankPayment),
    cashPayment: currency(totals.cashPayment),
  }

  return (
    <ReportLayout
      title="Daily Buying Invoice Wise Report"
      description="All purchase orders for the selected date range"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      onExport={handleExport}
      loading={isLoading}
      summary={summary}
    >
      <PrintableTable
        columns={columns}
        data={purchaseData}
        loading={isLoading}
        showTotals={true}
        totalsRow={totalsRow}
      />
    </ReportLayout>
  )
}
