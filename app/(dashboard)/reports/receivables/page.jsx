"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useReceivablesReport } from "@/lib/hooks/useReports"
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
      outstanding: receivablesData.reduce((sum, c) => sum + (c.outstanding || c.ledgerBalance || 0), 0),
    }
  }, [receivablesData])

  const columns = [
    {
      header: "#",
      accessor: "index",
      render: (row, idx) => idx + 1,
    },
    {
      header: "Customer Name",
      accessor: "name",
      render: (row) => (
        <div>
          <div className="font-medium">{row.name || "—"}</div>
          {row.company && (
            <div className="text-xs text-muted-foreground">{row.company}</div>
          )}
        </div>
      ),
    },
    {
      header: "Total Sales",
      accessor: "totalSales",
      align: "right",
      render: (row) => currency(row.totalSales || 0),
    },
    {
      header: "Amount Received",
      accessor: "amountReceived",
      align: "right",
      render: (row) => currency(row.amountReceived || row.amountGiven || 0),
    },
    {
      header: "Outstanding",
      accessor: "outstanding",
      align: "right",
      render: (row) => {
        const outstanding = row.outstanding || row.ledgerBalance || 0
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
      render: (row) => formatDate(row.lastPaymentDate || row.lastPurchaseDate),
    },
    {
      header: "Age (Days)",
      accessor: "agingDays",
      align: "right",
      render: (row) => {
        const days = row.agingDays || getAgingDays(row.lastPaymentDate || row.lastPurchaseDate)
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
        const outstanding = row.outstanding || row.ledgerBalance || 0
        const days = row.agingDays || getAgingDays(row.lastPaymentDate || row.lastPurchaseDate)
        
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
      label: "Total Customers",
      value: totals.customers,
      subtext: "with transactions",
    },
    {
      label: "Total Sales",
      value: currency(totals.totalSales),
      color: "text-blue-600",
    },
    {
      label: "Amount Received",
      value: currency(totals.totalReceived),
      color: "text-green-600",
    },
    {
      label: "Total Receivables",
      value: currency(totals.outstanding),
      color: "text-red-600",
    },
  ]

  const totalsRow = {
    name: "",
    totalSales: currency(totals.totalSales),
    amountReceived: currency(totals.totalReceived),
    outstanding: currency(totals.outstanding),
  }

  return (
    <ReportLayout
      title="Receivables Report"
      description="Customer outstanding amounts and aging analysis"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      loading={isLoading}
      summary={summary}
    >
      <PrintableTable
        columns={columns}
        data={receivablesData}
        loading={isLoading}
        showTotals={true}
        totalsRow={totalsRow}
      />
    </ReportLayout>
  )
}
