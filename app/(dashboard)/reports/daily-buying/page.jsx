"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useDailyBuyingReport } from "@/lib/hooks/useReports"
import { Badge } from "@/components/ui/badge"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import { exportToPDF } from "@/lib/utils/pdfExport"
import { getDefaultDateRange } from "@/lib/utils/getDefaultDateRange"
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

export default function DailyBuyingReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, isError, error, refetch } = useDailyBuyingReport({
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

  const handleDownloadPDF = async () => {
    try {
      const result = await exportToPDF({
        title: "Daily Buying Invoice Wise Report",
        columns: columns,
        data: purchaseData,
        totalsRow: totalsRow,
        dateRange: dateRange,
        filename: `Daily_Buying_Report_${dateRange.from}_${dateRange.to}`
      })
      if (result.success) {
        toast.success("PDF report downloaded!")
      } else {
        toast.error("Failed to generate PDF")
      }
    } catch (err) {
      toast.error("PDF generation failed: " + err.message)
    }
  }

  const columns = [
    {
      header: "ID",
      accessor: "orderNumber",
      render: (row) => {
        const displayText = row.orderNumber || row._id?.slice(-8) || "—"
        if (row._id && displayText !== "—") {
          return (
            <Link
              href={`/dispatch-orders/${row._id}`}
              className="font-mono text-xs text-blue-600 hover:underline"
            >
              {displayText}
            </Link>
          )
        }
        return <span className="font-mono text-xs">{displayText}</span>
      },
      pdfValue: (row) => row.orderNumber || row._id?.slice(-8) || "—"
    },

    {
      header: "Transaction Type",
      accessor: "transactionType",
      render: () => "Buying Invoice",
      pdfValue: () => "Buying Invoice"
    },
    {
      header: "Invoice Date",
      accessor: "dispatchDate",
      render: (row) => formatDate(row.dispatchDate || row.createdAt),
      pdfValue: (row) => formatDate(row.dispatchDate || row.createdAt)
    },
    {
      header: "Name",
      accessor: "supplier",
      render: (row) => {
        const supplier = row.supplier
        if (!supplier) return "—"
        if (typeof supplier === 'string') return supplier
        return supplier.name || supplier.company || "—"
      },
      pdfValue: (row) => {
        const supplier = row.supplier
        if (!supplier) return "—"
        if (typeof supplier === 'string') return supplier
        return supplier.name || supplier.company || "—"
      }
    },
    {
      header: "Total",
      accessor: "supplierPaymentTotal",
      align: "right",
      render: (row) => currency(row.supplierPaymentTotal + row.totalDiscount || 0),
      pdfValue: (row) => currency(row.supplierPaymentTotal + row.totalDiscount || 0)
    },
    {
      header: "Discount",
      accessor: "totalDiscount",
      align: "right",
      render: (row) => currency(row.totalDiscount || 0),
      pdfValue: (row) => currency(row.totalDiscount || 0)
    },
    {
      header: "Total After Disc.",
      accessor: "totalAfterDiscount",
      align: "right",
      render: (row) => currency(row.supplierPaymentTotal || 0),
      pdfValue: (row) => currency(row.supplierPaymentTotal || 0)
    },
    {
      header: "Bank Cash",
      accessor: "bankPayment",
      align: "right",
      render: (row) => currency(row.bankPayment || 0),
      pdfValue: (row) => currency(row.bankPayment || 0)
    },
    {
      header: "Cash",
      accessor: "cashPayment",
      align: "right",
      render: (row) => currency(row.cashPayment || 0),
      pdfValue: (row) => currency(row.cashPayment || 0)
    },
    {
      header: "Remaining",
      accessor: "remaining",
      align: "right",
      render: (row) => {
        const total = row.supplierPaymentTotal || 0
        const paid = (row.bankPayment || 0) + (row.cashPayment || 0)
        return currency(total - paid)
      },
      pdfValue: (row) => {
        const total = row.supplierPaymentTotal || 0
        const paid = (row.bankPayment || 0) + (row.cashPayment || 0)
        return currency(total - paid)
      }
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
    remaining: currency(totals.balance),
  }

  return (
    <ReportLayout
      title="Daily Buying Invoice Wise Report"
      description="All purchase orders for the selected date range"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      onExport={handleExport}
      onDownloadPDF={handleDownloadPDF}
      loading={isLoading}
      error={isError ? error : null}
      summary={summary}
    >
      <PrintableTable
        columns={columns}
        data={purchaseData}
        loading={isLoading}
        showTotals={true}
        totalsRow={totalsRow}
        totalColumns={[{ title: "Total", value: "remaining" }]}

      />
    </ReportLayout>
  )
}
