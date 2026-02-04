"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useReceivablesReport } from "@/lib/hooks/useReports"
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
    from: today.toISOString().split("T")[0],
    to: today.toISOString().split("T")[0],
  }
}

export default function ReceivablesReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, refetch } = useReceivablesReport({
    asOfDate: dateRange.to,
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

  const columns = [
    {
      header: "Name",
      accessor: "name",
      render: (row) => (
        <div>
          <div className="font-medium">{row.name || "—"}</div>
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
        const outstanding = row.remainingBalance || row.outstanding || row.ledgerBalance || 0
        return (
          <span className={outstanding > 0 ? "text-red-600 font-semibold" : "text-green-600"}>
            £{formatNumber(outstanding)}
          </span>
        )
      },
    },
  ]

  const summary = [
    {
      label: "Total Remaining Balance",
      value: `£${formatNumber(totals.outstanding)}`,
      color: "text-red-600",
    },
  ]

  const totalsRow = {
    name: "",
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
      loading={isLoading}
      summary={summary}
    >
      <PrintableTable
        columns={columns}
        data={receivablesData}
        loading={isLoading}
        showTotals={true}
        totalsRow={totalsRow}
        totalColumns={[{ title: "Total", value: "remainingBalance" }]}

      />
    </ReportLayout>
  )
}
