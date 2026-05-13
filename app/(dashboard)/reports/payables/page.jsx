"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { usePayablesReport } from "@/lib/hooks/useReports"
import { Badge } from "@/components/ui/badge"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import { exportToPDF } from "@/lib/utils/pdfExport"
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

export default function PayablesReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())
  const router = useRouter()

  const { data, isLoading, isError, error, refetch } = usePayablesReport({
    ...(dateRange.from ? { startDate: dateRange.from } : {}),
    endDate: dateRange.to,
  })

  const payablesData = useMemo(() => {
    return data?.suppliers || data?.payables || []
  }, [data])

  const totals = useMemo(() => {
    return {
      suppliers: payablesData.length,
      totalPurchases: payablesData.reduce((sum, s) => sum + (s.totalPurchases || s.totalAmount || 0), 0),
      totalPaid: payablesData.reduce((sum, s) => sum + (s.totalPaid || s.amountPaid || 0), 0),
      outstanding: payablesData.reduce((sum, s) => sum + (s.outstanding || s.balance || s.remainingBalance || 0), 0),
    }
  }, [payablesData])

  const handleExport = async () => {
    try {
      const result = await exportToExcelWithTotals(
        payablesData,
        columns,
        totalsRow,
        `Payables_Report_${dateRange.to}`
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
        title: "Payable Report",
        columns: columns,
        data: payablesData,
        totalsRow: totalsRow,
        dateRange: dateRange,
        filename: `Payables_Report_${dateRange.to}`
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
      header: "Name",
      accessor: "name",
      render: (row) => (
        <div>
          <div className="font-medium">{row.company || row.name || row.supplierName || "—"}</div>
          <div className="text-xs text-muted-foreground">
            {[row.email, row.phone].filter(Boolean).join(" | ") || "—"}
          </div>
        </div>
      ),
      pdfValue: (row) => row.company || row.name || row.supplierName || "—"
    },
    {
      header: "Total Purchases",
      accessor: "totalPurchases",
      align: "right",
      render: (row) => formatNumber(row.totalPurchases || row.totalAmount || 0),
      pdfValue: (row) => formatNumber(row.totalPurchases || row.totalAmount || 0)
    },
    {
      header: "Total Paid",
      accessor: "totalPaid",
      align: "right",
      render: (row) => formatNumber(row.totalPaid || row.amountPaid || 0),
      pdfValue: (row) => formatNumber(row.totalPaid || row.amountPaid || 0)
    },
    {
      header: "RemainingBalance",
      accessor: "remainingBalance",
      align: "right",
      render: (row) => {
        const outstanding = row.remainingBalance || row.outstanding || row.balance || 0
        return (
          <span className={outstanding > 0 ? "text-red-600 font-semibold" : "text-green-600"}>
            {formatNumber(outstanding)}
          </span>
        )
      },
      pdfValue: (row) => formatNumber(row.remainingBalance || row.outstanding || row.balance || 0)
    },
  ]

  const summary = [
    {
      label: "Total Purchases",
      value: formatNumber(totals.totalPurchases),
      color: "text-blue-600",
    },
    {
      label: "Total Paid",
      value: formatNumber(totals.totalPaid),
      color: "text-green-600",
    },
    {
      label: "Total Remaining Balance",
      value: formatNumber(totals.outstanding),
      color: "text-red-600",
    },
  ]

  const totalsRow = {
    name: "TOTAL",
    totalPurchases: formatNumber(totals.totalPurchases),
    totalPaid: formatNumber(totals.totalPaid),
    remainingBalance: formatNumber(totals.outstanding),
  }

  return (
    <ReportLayout
      title="Payable Report"
      description="Supplier outstanding amounts and aging analysis"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      onExport={handleExport}
      onDownloadPDF={handleDownloadPDF}
      loading={isLoading}
      error={isError ? error : null}
      summary={summary}
      showBeginningButton={true}
    >
      <PrintableTable
        columns={columns}
        data={payablesData}
        loading={isLoading}
        showTotals={true}
        totalsRow={totalsRow}
        totalColumns={[{ title: "Total Payable", value: "remainingBalance" }]}
        onRowClick={(row) => router.push(`/supplier-ledger?supplierId=${row._id}`)}
      />
    </ReportLayout>
  )
}
