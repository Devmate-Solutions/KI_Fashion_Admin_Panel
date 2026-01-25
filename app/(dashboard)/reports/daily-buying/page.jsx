"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useDailyBuyingReport } from "@/lib/hooks/useReports"
import { Badge } from "@/components/ui/badge"

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
      total: purchaseData.reduce((sum, p) => sum + (p.grandTotal || 0), 0),
      paid: purchaseData.reduce((sum, p) => sum + (p.amountPaid || 0), 0),
      balance: purchaseData.reduce((sum, p) => sum + ((p.grandTotal || 0) - (p.amountPaid || 0)), 0),
    }
  }, [purchaseData])

  const columns = [
    {
      header: "Date",
      accessor: "dispatchDate",
      render: (row) => formatDate(row.dispatchDate || row.createdAt),
    },
    {
      header: "Order #",
      accessor: "orderNumber",
      render: (row) => (
        <span className="font-mono text-xs">{row.orderNumber || row._id?.slice(-8) || "—"}</span>
      ),
    },
    {
      header: "Supplier",
      accessor: "supplier",
      render: (row) => row.supplier?.name || row.supplier?.company || "—",
    },
    {
      header: "Items",
      accessor: "items",
      render: (row) => `${row.items?.length || 0} item(s)`,
    },
    {
      header: "Total",
      accessor: "grandTotal",
      align: "right",
      render: (row) => currency(row.grandTotal),
    },
    {
      header: "Paid",
      accessor: "amountPaid",
      align: "right",
      render: (row) => currency(row.amountPaid || 0),
    },
    {
      header: "Balance",
      accessor: "balance",
      align: "right",
      render: (row) => {
        const balance = (row.grandTotal || 0) - (row.amountPaid || 0)
        return (
          <span className={balance > 0 ? "text-red-600" : "text-green-600"}>
            {currency(balance)}
          </span>
        )
      },
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => {
        const statusStyles = {
          confirmed: "bg-emerald-100 text-emerald-700",
          pending: "bg-amber-100 text-amber-700",
          draft: "bg-gray-100 text-gray-700",
        }
        return (
          <Badge className={statusStyles[row.status] || statusStyles.pending}>
            {row.status || "pending"}
          </Badge>
        )
      },
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
      value: currency(totals.paid),
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
    amountPaid: currency(totals.paid),
    balance: currency(totals.balance),
  }

  return (
    <ReportLayout
      title="Daily Buying Report"
      description="All purchase orders for the selected date range"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
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
