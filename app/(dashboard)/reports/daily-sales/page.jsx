"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useDailySalesReport } from "@/lib/hooks/useReports"
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
      total: salesData.reduce((sum, s) => sum + (s.grandTotal || 0), 0),
      paid: salesData.reduce((sum, s) => sum + (s.amountPaid || 0), 0),
      balance: salesData.reduce((sum, s) => sum + (s.balance || 0), 0),
    }
  }, [salesData])

  const columns = [
    {
      header: "Date",
      accessor: "saleDate",
      render: (row) => formatDate(row.saleDate),
    },
    {
      header: "Sale #",
      accessor: "saleNumber",
      render: (row) => (
        <span className="font-mono text-xs">{row.saleNumber || "—"}</span>
      ),
    },
    {
      header: "Customer",
      accessor: "buyer",
      render: (row) => row.buyer?.name || row.buyer?.company || "Walk-in",
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
      accessor: "paymentStatus",
      render: (row) => {
        const statusStyles = {
          paid: "bg-emerald-100 text-emerald-700",
          partial: "bg-amber-100 text-amber-700",
          pending: "bg-sky-100 text-sky-700",
        }
        return (
          <Badge className={statusStyles[row.paymentStatus] || statusStyles.pending}>
            {row.paymentStatus || "pending"}
          </Badge>
        )
      },
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
      value: currency(totals.total),
      color: "text-blue-600",
    },
    {
      label: "Amount Received",
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
      title="Daily Sale Report"
      description="All sales transactions for the selected date range"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      loading={isLoading}
      summary={summary}
    >
      <PrintableTable
        columns={columns}
        data={salesData}
        loading={isLoading}
        showTotals={true}
        totalsRow={totalsRow}
      />
    </ReportLayout>
  )
}
