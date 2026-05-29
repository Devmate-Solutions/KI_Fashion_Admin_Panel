"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useReceivablesReport } from "@/lib/hooks/useReports"
import { Badge } from "@/components/ui/badge"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import { exportToPDF } from "@/lib/utils/pdfExport"
import { useAuthStore } from "@/store/store"
import toast from "react-hot-toast"

function formatNumber(n) {
  const num = Number(n || 0)
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(date) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-GB")
}

function getAgingDays(date) {
  if (!date) return 0
  const now = new Date()
  const lastDate = new Date(date)
  const diffTime = Math.abs(now - lastDate)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function getDefaultDateRange() {
  const today = new Date()
  return {
    from: "",
    to: today.toLocaleDateString('en-CA'),
  }
}

export default function ReceivablesReportPage() {
  const user = useAuthStore((s) => s.user)
  const isEmployee = user?.role === "employee"

  const [dateRange, setDateRange] = useState(() => {
    const defaults = getDefaultDateRange()
    if (isEmployee) {
      return { from: defaults.to, to: defaults.to }
    }
    return defaults
  })
  const router = useRouter()

  const { data, isLoading, isError, error, refetch } = useReceivablesReport({
    asOfDate: dateRange.to,
    ...(dateRange.from ? { startDate: dateRange.from } : {}),
  })

  const receivablesData = useMemo(() => {
    return data?.customers || data?.receivables || []
  }, [data])

  const totals = useMemo(() => {
    return {
      customers: receivablesData.length,
      totalSales: receivablesData.reduce((sum, c) => sum + (c.totalSales || 0), 0),
      totalReceived: receivablesData.reduce((sum, c) => sum + (c.amountReceived || c.amountGiven || 0), 0),
      outstanding: receivablesData.reduce((sum, c) => sum + (c.outstanding || c.ledgerBalance || c.remainingBalance || 0), 0),
    }
  }, [receivablesData])

  const handleExport = async () => {
    try {
      const result = await exportToExcelWithTotals(
        receivablesData,
        columns,
        totalsRow,
        `Receivables_Report_${dateRange.to}`
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
        title: "Receivable Report",
        columns: columns,
        data: receivablesData,
        totalsRow: totalsRow,
        dateRange: dateRange,
        filename: `Receivables_Report_${dateRange.to}`
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
      header: "Customer ID",
      accessor: "buyerId",
      render: (row) => <div className="font-medium text-muted-foreground">{row.buyerId || "—"}</div>,
      pdfValue: (row) => row.buyerId || "—"
    },
    {
      header: "Name",
      accessor: "name",
      render: (row) => (
        <div>
          <div className="font-medium">{row.company || row.name || "—"}</div>
          <div className="text-[10px] text-muted-foreground">
            {row.company && row.name && row.company !== row.name ? `(${row.name})` : [row.email, row.phone].filter(Boolean).join(" | ") || "—"}
          </div>
        </div>
      ),
      pdfValue: (row) => row.company || row.name || "—"
    },
    // {
    //   header: "Total Sales",
    //   accessor: "totalSales",
    //   align: "right",
    //   render: (row) => `£${formatNumber(row.totalSales || 0)}`,
    //   pdfValue: (row) => `£${formatNumber(row.totalSales || 0)}`
    // },
    // {
    //   header: "Total Received",
    //   accessor: "amountReceived",
    //   align: "right",
    //   render: (row) => `£${formatNumber(row.amountReceived || row.amountGiven || 0)}`,
    //   pdfValue: (row) => `£${formatNumber(row.amountReceived || row.amountGiven || 0)}`
    // },
    {
      header: "Balance",
      accessor: "remainingBalance",
      align: "right",
      render: (row) => {
        const outstanding = row.remainingBalance || row.outstanding || row.ledgerBalance || 0
        return (
          <span className={outstanding > 0 ? "text-red-600 font-semibold" : "text-green-600"}>
            £{formatNumber(outstanding)}
          </span>
        )
      },
      pdfValue: (row) => `£${formatNumber(row.remainingBalance || row.outstanding || row.ledgerBalance || 0)}`
    },
  ]

  const summary = [
    {
      label: "Total Sales",
      value: `£${formatNumber(totals.totalSales)}`,
      color: "text-blue-600",
    },
    {
      label: "Total Received",
      value: `£${formatNumber(totals.totalReceived)}`,
      color: "text-green-600",
    },
    {
      label: "Total Remaining Balance",
      value: `£${formatNumber(totals.outstanding)}`,
      color: "text-red-600",
    },
  ]

  const totalsRow = {
    name: "TOTAL",
    totalSales: `£${formatNumber(totals.totalSales)}`,
    amountReceived: `£${formatNumber(totals.totalReceived)}`,
    remainingBalance: `£${formatNumber(totals.outstanding)}`,
  }

  return (
    <ReportLayout
      title="Receivable Report"
      description="Customer outstanding amounts and aging analysis"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      onExport={handleExport}
      onDownloadPDF={handleDownloadPDF}
      loading={isLoading}
      error={isError ? error : null}
      summary={summary}
      showBeginningButton={!isEmployee}
      hideDateFilter={isEmployee}
    >
      <PrintableTable
        columns={columns}
        data={receivablesData}
        loading={isLoading}
        enableSearch={false}
        showTotals={true}
        totalsRow={totalsRow}
        totalColumns={[{ title: "Total Receivable", value: "remainingBalance" }]}
        onRowClick={(row) => router.push(`/customer-ledger?buyerId=${row._id}`)}
      />
    </ReportLayout>
  )
}
