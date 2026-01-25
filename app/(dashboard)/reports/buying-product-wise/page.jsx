"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useBuyingProductWiseReport } from "@/lib/hooks/useReports"

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getDefaultDateRange() {
  const today = new Date()
  return {
    from: today.toISOString().split("T")[0],
    to: today.toISOString().split("T")[0],
  }
}

export default function BuyingProductWiseReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, refetch } = useBuyingProductWiseReport({
    startDate: dateRange.from,
    endDate: dateRange.to,
  })

  const productData = useMemo(() => {
    return data?.products || []
  }, [data])

  const totals = useMemo(() => {
    return {
      quantity: productData.reduce((sum, p) => sum + (p.totalQuantity || 0), 0),
      cost: productData.reduce((sum, p) => sum + (p.totalCost || 0), 0),
    }
  }, [productData])

  const columns = [
    {
      header: "#",
      accessor: "index",
      render: (row, idx) => idx + 1,
    },
    {
      header: "Product Code",
      accessor: "productCode",
      render: (row) => (
        <span className="font-mono text-xs">{row.productCode || row.sku || "—"}</span>
      ),
    },
    {
      header: "Product Name",
      accessor: "productName",
      render: (row) => row.productName || row.name || "—",
    },
    {
      header: "Qty Bought",
      accessor: "totalQuantity",
      align: "right",
      render: (row) => row.totalQuantity || 0,
    },
    {
      header: "Unit Cost",
      accessor: "avgCostPrice",
      align: "right",
      render: (row) => currency(row.avgCostPrice || row.costPrice || 0),
    },
    {
      header: "Total Cost",
      accessor: "totalCost",
      align: "right",
      render: (row) => (
        <span className="font-semibold">{currency(row.totalCost || 0)}</span>
      ),
    },
    {
      header: "% of Total",
      accessor: "percentage",
      align: "right",
      render: (row) => {
        const percentage = totals.cost > 0 
          ? ((row.totalCost || 0) / totals.cost * 100).toFixed(1)
          : 0
        return `${percentage}%`
      },
    },
  ]

  const summary = [
    {
      label: "Total Products",
      value: productData.length,
      subtext: "unique products bought",
    },
    {
      label: "Total Quantity",
      value: totals.quantity.toLocaleString(),
      subtext: "units purchased",
    },
    {
      label: "Total Cost",
      value: currency(totals.cost),
      color: "text-orange-600",
    },
    {
      label: "Avg per Product",
      value: currency(productData.length > 0 ? totals.cost / productData.length : 0),
      color: "text-blue-600",
    },
  ]

  const totalsRow = {
    productName: "",
    totalQuantity: totals.quantity,
    totalCost: currency(totals.cost),
    percentage: "100%",
  }

  return (
    <ReportLayout
      title="Daily Buying Product-wise Report"
      description="Purchases breakdown by individual products"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      loading={isLoading}
      summary={summary}
    >
      <PrintableTable
        columns={columns}
        data={productData}
        loading={isLoading}
        showTotals={true}
        totalsRow={totalsRow}
      />
    </ReportLayout>
  )
}
