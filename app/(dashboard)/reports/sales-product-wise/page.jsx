"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useSalesProductWiseReport } from "@/lib/hooks/useReports"

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

export default function SalesProductWiseReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, refetch } = useSalesProductWiseReport({
    startDate: dateRange.from,
    endDate: dateRange.to,
  })

  const productData = useMemo(() => {
    return data?.products || []
  }, [data])

  const totals = useMemo(() => {
    return {
      quantity: productData.reduce((sum, p) => sum + (p.totalQuantity || 0), 0),
      revenue: productData.reduce((sum, p) => sum + (p.totalRevenue || 0), 0),
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
      header: "Qty Sold",
      accessor: "totalQuantity",
      align: "right",
      render: (row) => row.totalQuantity || 0,
    },
    {
      header: "Unit Price",
      accessor: "avgUnitPrice",
      align: "right",
      render: (row) => currency(row.avgUnitPrice || row.unitPrice || 0),
    },
    {
      header: "Total Revenue",
      accessor: "totalRevenue",
      align: "right",
      render: (row) => (
        <span className="font-semibold">{currency(row.totalRevenue || 0)}</span>
      ),
    },
    {
      header: "% of Total",
      accessor: "percentage",
      align: "right",
      render: (row) => {
        const percentage = totals.revenue > 0 
          ? ((row.totalRevenue || 0) / totals.revenue * 100).toFixed(1)
          : 0
        return `${percentage}%`
      },
    },
  ]

  const summary = [
    {
      label: "Total Products",
      value: productData.length,
      subtext: "unique products sold",
    },
    {
      label: "Total Quantity",
      value: totals.quantity.toLocaleString(),
      subtext: "units sold",
    },
    {
      label: "Total Revenue",
      value: currency(totals.revenue),
      color: "text-green-600",
    },
    {
      label: "Avg per Product",
      value: currency(productData.length > 0 ? totals.revenue / productData.length : 0),
      color: "text-blue-600",
    },
  ]

  const totalsRow = {
    productName: "",
    totalQuantity: totals.quantity,
    totalRevenue: currency(totals.revenue),
    percentage: "100%",
  }

  return (
    <ReportLayout
      title="Daily Sale Product-wise Report"
      description="Sales breakdown by individual products"
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
