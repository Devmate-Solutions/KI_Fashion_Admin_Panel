"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useStockInHandReport } from "@/lib/hooks/useReports"
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

export default function StockInHandReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, refetch } = useStockInHandReport({
    asOfDate: dateRange.to,
  })

  const stockData = useMemo(() => {
    return data?.products || data?.stockLevels || []
  }, [data])

  const totals = useMemo(() => {
    return {
      items: stockData.length,
      totalStock: stockData.reduce((sum, p) => sum + (p.currentStock || p.stockInHand || 0), 0),
      totalValue: stockData.reduce((sum, p) => sum + (p.totalValue || p.value || 0), 0),
      lowStock: stockData.filter(p => p.needsReorder || (p.currentStock || p.stockInHand || 0) <= (p.reorderLevel || 10)).length,
    }
  }, [stockData])

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
      header: "Stock in Hand",
      accessor: "currentStock",
      align: "right",
      render: (row) => {
        const stock = row.currentStock || row.stockInHand || 0
        const isLow = stock <= (row.reorderLevel || 10)
        return (
          <span className={isLow ? "text-red-600 font-semibold" : ""}>
            {stock}
          </span>
        )
      },
    },
    {
      header: "Reorder Level",
      accessor: "reorderLevel",
      align: "right",
      render: (row) => row.reorderLevel || 10,
    },
    {
      header: "Avg Cost",
      accessor: "averageCostPrice",
      align: "right",
      render: (row) => currency(row.averageCostPrice || row.costPrice || 0),
    },
    {
      header: "Stock Value",
      accessor: "totalValue",
      align: "right",
      render: (row) => (
        <span className="font-semibold">
          {currency(row.totalValue || row.value || 0)}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => {
        const stock = row.currentStock || row.stockInHand || 0
        const isLow = stock <= (row.reorderLevel || 10)
        const isOut = stock === 0
        
        if (isOut) {
          return <Badge className="bg-red-100 text-red-700">Out of Stock</Badge>
        }
        if (isLow) {
          return <Badge className="bg-amber-100 text-amber-700">Low Stock</Badge>
        }
        return <Badge className="bg-emerald-100 text-emerald-700">In Stock</Badge>
      },
    },
  ]

  const summary = [
    {
      label: "Total Products",
      value: totals.items,
      subtext: "in inventory",
    },
    {
      label: "Total Stock",
      value: totals.totalStock.toLocaleString(),
      subtext: "units",
    },
    {
      label: "Stock Value",
      value: currency(totals.totalValue),
      color: "text-blue-600",
    },
    {
      label: "Low Stock Items",
      value: totals.lowStock,
      color: "text-red-600",
      subtext: "need reorder",
    },
  ]

  const totalsRow = {
    productName: "",
    currentStock: totals.totalStock,
    totalValue: currency(totals.totalValue),
  }

  return (
    <ReportLayout
      title="Stock in Hand Report"
      description={`Current inventory levels as of ${formatDate(dateRange.to)}`}
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      loading={isLoading}
      summary={summary}
    >
      <PrintableTable
        columns={columns}
        data={stockData}
        loading={isLoading}
        showTotals={true}
        totalsRow={totalsRow}
      />
    </ReportLayout>
  )
}
