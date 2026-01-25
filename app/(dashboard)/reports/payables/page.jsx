"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { usePayablesReport } from "@/lib/hooks/useReports"
import { Badge } from "@/components/ui/badge"

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

export default function PayablesReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, refetch } = usePayablesReport({
    asOfDate: dateRange.to,
  })

  const payablesData = useMemo(() => {
    return data?.suppliers || data?.payables || []
  }, [data])

  const totals = useMemo(() => {
    return {
      suppliers: payablesData.length,
      totalPurchases: payablesData.reduce((sum, s) => sum + (s.totalPurchases || s.totalAmount || 0), 0),
      totalPaid: payablesData.reduce((sum, s) => sum + (s.amountPaid || 0), 0),
      outstanding: payablesData.reduce((sum, s) => sum + (s.outstanding || s.balance || 0), 0),
    }
  }, [payablesData])

  const columns = [
    {
      header: "#",
      accessor: "index",
      render: (row, idx) => idx + 1,
    },
    {
      header: "Supplier Name",
      accessor: "name",
      render: (row) => (
        <div>
          <div className="font-medium">{row.name || row.supplierName || "—"}</div>
          {row.company && (
            <div className="text-xs text-muted-foreground">{row.company}</div>
          )}
        </div>
      ),
    },
    {
      header: "Total Purchases",
      accessor: "totalPurchases",
      align: "right",
      render: (row) => currency(row.totalPurchases || row.totalAmount || 0),
    },
    {
      header: "Amount Paid",
      accessor: "amountPaid",
      align: "right",
      render: (row) => currency(row.amountPaid || 0),
    },
    {
      header: "Outstanding",
      accessor: "outstanding",
      align: "right",
      render: (row) => {
        const outstanding = row.outstanding || row.balance || 0
        return (
          <span className={outstanding > 0 ? "text-red-600 font-semibold" : "text-green-600"}>
            {currency(outstanding)}
          </span>
        )
      },
    },
    {
      header: "Last Payment",
      accessor: "lastPaymentDate",
      render: (row) => formatDate(row.lastPaymentDate),
    },
    {
      header: "Age (Days)",
      accessor: "agingDays",
      align: "right",
      render: (row) => {
        const days = row.agingDays || getAgingDays(row.lastPaymentDate)
        let colorClass = "text-green-600"
        if (days > 60) colorClass = "text-red-600"
        else if (days > 30) colorClass = "text-amber-600"
        return <span className={colorClass}>{days}</span>
      },
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => {
        const outstanding = row.outstanding || row.balance || 0
        const days = row.agingDays || getAgingDays(row.lastPaymentDate)
        
        if (outstanding <= 0) {
          return <Badge className="bg-emerald-100 text-emerald-700">Clear</Badge>
        }
        if (days > 60) {
          return <Badge className="bg-red-100 text-red-700">Overdue</Badge>
        }
        if (days > 30) {
          return <Badge className="bg-amber-100 text-amber-700">Due</Badge>
        }
        return <Badge className="bg-sky-100 text-sky-700">Current</Badge>
      },
    },
  ]

  const summary = [
    {
      label: "Total Suppliers",
      value: totals.suppliers,
      subtext: "with transactions",
    },
    {
      label: "Total Purchases",
      value: currency(totals.totalPurchases),
      color: "text-blue-600",
    },
    {
      label: "Amount Paid",
      value: currency(totals.totalPaid),
      color: "text-green-600",
    },
    {
      label: "Total Payables",
      value: currency(totals.outstanding),
      color: "text-red-600",
    },
  ]

  const totalsRow = {
    name: "",
    totalPurchases: currency(totals.totalPurchases),
    amountPaid: currency(totals.totalPaid),
    outstanding: currency(totals.outstanding),
  }

  return (
    <ReportLayout
      title="Payables Report"
      description="Supplier outstanding amounts and aging analysis"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      loading={isLoading}
      summary={summary}
    >
      <PrintableTable
        columns={columns}
        data={payablesData}
        loading={isLoading}
        showTotals={true}
        totalsRow={totalsRow}
      />
    </ReportLayout>
  )
}
