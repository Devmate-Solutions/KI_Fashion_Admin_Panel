"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { usePayablesReport } from "@/lib/hooks/useReports"
import { Badge } from "@/components/ui/badge"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
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
    to: today.toISOString().split("T")[0],
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

  const columns = [
    {
      header: "Name",
      accessor: "name",
      render: (row) => (
        <div>
          <div className="font-medium">{row.name || row.supplierName || "—"}</div>
          <div className="text-xs text-muted-foreground">
            {[row.email, row.phone].filter(Boolean).join(" | ") || "—"}
          </div>
        </div>
      ),
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
    },
  ]

  const summary = [
    {
      label: "Total Remaining Balance",
      value: formatNumber(totals.outstanding),
      color: "text-red-600",
    },
  ]

  const totalsRow = {
    name: "",
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
        totalColumns={[{ title: "Total", value: "remainingBalance" }]}
        onRowClick={(row) => router.push(`/supplier-ledger?supplierId=${row._id}`)}
      />
    </ReportLayout>
  )
}
