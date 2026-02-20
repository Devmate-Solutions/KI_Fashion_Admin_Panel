"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useSalesReturnsReport } from "@/lib/hooks/useReports"
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

export default function SalesReturnsReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, refetch } = useSalesReturnsReport({
    startDate: dateRange.from,
    endDate: dateRange.to,
  })

  const returnsData = useMemo(() => {
    return data?.returns || []
  }, [data])

  const totals = useMemo(() => {
    return {
      count: returnsData.length,
      totalValue: returnsData.reduce((sum, r) => sum + (r.totalReturnValue || 0), 0),
      itemsReturned: returnsData.reduce((sum, r) => sum + (r.items?.length || 0), 0),
    }
  }, [returnsData])

  const columns = [
    {
      header: "Date",
      accessor: "returnedAt",
      render: (row) => formatDate(row.returnedAt || row.createdAt),
    },
    {
      header: "Return ID",
      accessor: "_id",
      render: (row) => (
        <span className="font-mono text-xs">{row._id?.slice(-8) || "—"}</span>
      ),
    },
    {
      header: "Sale #",
      accessor: "sale",
      render: (row) => (
        <span className="font-mono text-xs">{row.sale?.saleNumber || "—"}</span>
      ),
    },
    {
      header: "Buyer",
      accessor: "buyer",
      render: (row) => row.buyer?.name || row.buyer?.company || "—",
    },
    {
      header: "Items",
      accessor: "items",
      render: (row) => `${row.items?.length || 0} item(s)`,
    },
    {
      header: "Return Value",
      accessor: "totalReturnValue",
      align: "right",
      render: (row) => (
        <span className="font-semibold text-red-600">
          {currency(row.totalReturnValue || 0)}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => {
        const statusStyles = {
          approved: "bg-emerald-100 text-emerald-700",
          pending: "bg-amber-100 text-amber-700",
          rejected: "bg-red-100 text-red-700",
        }
        return (
          <Badge className={statusStyles[row.status] || statusStyles.pending}>
            {row.status || "pending"}
          </Badge>
        )
      },
    },
    {
      header: "Reason",
      accessor: "reason",
      render: (row) => {
        const reason = row.items?.[0]?.reason || row.notes || "—"
        return (
          <div className="max-w-xs truncate" title={reason}>
            {reason}
          </div>
        )
      },
    },
  ]

  const summary = [
    {
      label: "Total Returns",
      value: totals.count,
      subtext: "return requests",
    },
    {
      label: "Items Returned",
      value: totals.itemsReturned,
      subtext: "products",
    },
    {
      label: "Total Return Value",
      value: currency(totals.totalValue),
      color: "text-red-600",
    },
    {
      label: "Avg Return Value",
      value: currency(totals.count > 0 ? totals.totalValue / totals.count : 0),
      color: "text-blue-600",
    },
  ]

  const totalsRow = {
    buyer: "",
    items: totals.itemsReturned + " item(s)",
    totalReturnValue: currency(totals.totalValue),
  }

  return (
    <ReportLayout
      title="Daily Sales Return Report"
      description="Customer returns and refunds for the selected date range"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      loading={isLoading}
      summary={summary}
    >
      <PrintableTable
        columns={columns}
        data={returnsData}
        loading={isLoading}
        showTotals={true}
        totalsRow={totalsRow}
      />
    </ReportLayout>
  )
}
