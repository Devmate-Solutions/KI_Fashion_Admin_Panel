"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useBuyingReturnsReport } from "@/lib/hooks/useReports"
import { Badge } from "@/components/ui/badge"
import { getDefaultDateRange } from "@/lib/utils/getDefaultDateRange"

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

export default function BuyingReturnsReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, isError, error, refetch } = useBuyingReturnsReport({
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
      cashRefund: returnsData.reduce((sum, r) => sum + (r.cashRefund || 0), 0),
      accountCredit: returnsData.reduce((sum, r) => sum + (r.accountCredit || 0), 0),
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
      header: "Order #",
      accessor: "dispatchOrder",
      render: (row) => (
        <span className="font-mono text-xs">
          {row.dispatchOrder?.orderNumber || row.dispatchOrder?._id?.slice(-8) || "—"}
        </span>
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
      header: "Return Value",
      accessor: "totalReturnValue",
      align: "right",
      render: (row) => (
        <span className="font-semibold text-green-600">
          {currency(row.totalReturnValue || 0)}
        </span>
      ),
    },
    {
      header: "Cash Refund",
      accessor: "cashRefund",
      align: "right",
      render: (row) => currency(row.cashRefund || 0),
    },
    {
      header: "Account Credit",
      accessor: "accountCredit",
      align: "right",
      render: (row) => currency(row.accountCredit || 0),
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
      subtext: "to suppliers",
    },
    {
      label: "Items Returned",
      value: totals.itemsReturned,
      subtext: "products",
    },
    {
      label: "Total Return Value",
      value: currency(totals.totalValue),
      color: "text-green-600",
    },
    {
      label: "Cash Refund",
      value: currency(totals.cashRefund),
      color: "text-blue-600",
    },
  ]

  const totalsRow = {
    supplier: "",
    items: totals.itemsReturned + " item(s)",
    totalReturnValue: currency(totals.totalValue),
    cashRefund: currency(totals.cashRefund),
    accountCredit: currency(totals.accountCredit),
  }

  return (
    <ReportLayout
      title="Daily Buying Return Report"
      description="Returns to suppliers for the selected date range"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      loading={isLoading}
      error={isError ? error : null}
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
