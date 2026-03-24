"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useStockInHandReport } from "@/lib/hooks/useReports"
import { Badge } from "@/components/ui/badge"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import toast from "react-hot-toast"

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

  const { data, isLoading, isError, error, refetch } = useStockInHandReport({
    asOfDate: dateRange.to,
  })

  const stockData = useMemo(() => {
    return data?.products || data?.stockLevels || []
  }, [data])

  const totals = useMemo(() => {
    return {
      items: stockData.length,
      totalStock: stockData.reduce((sum, p) => sum + (p.currentStock || p.stockInHand || 0), 0),
      totalBought: stockData.reduce((sum, p) => sum + (p.itemsBought || 0), 0),
      totalSold: stockData.reduce((sum, p) => sum + (p.itemsSold || 0), 0),
      totalValue: stockData.reduce((sum, p) => sum + (p.totalValue || p.value || 0), 0),
      lowStock: stockData.filter(p => p.needsReorder || (p.currentStock || p.stockInHand || 0) <= (p.reorderLevel || 10)).length,
    }
  }, [stockData])

  const handleExport = async () => {
    try {
      const result = await exportToExcelWithTotals(
        stockData,
        columns,
        totalsRow,
        `Stock_In_Hand_Report_${dateRange.to}`
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
      header: "Supplier Name",
      accessor: "supplierName",
      render: (row) => row.supplierName || "—",
    },
    {
      header: "Product Code",
      accessor: "productCode",
      render: (row) => {
        const productCode = row.productCode || row.sku || "—"
        const productId = row.productId || row._id
        if (productId && productCode !== "—") {
          return (
            <Link
              href={`/stock/${productId}/packets`}
              className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              {productCode}
            </Link>
          )
        }
        return <span className="font-mono text-xs">{productCode}</span>
      },
    },
    {
      header: "Product Description",
      accessor: "productName",
      render: (row) => row.productName || row.name || row.description || "—",
    },
    {
      header: "Color",
      accessor: "color",
      render: (row) => {
        // Try to get color from multiple sources
        if (row.color) return row.color;
        if (row.variantComposition && row.variantComposition.length > 0) {
          return row.variantComposition.map(v => v.color).join(", ");
        }
        return "—";
      },
    },
    {
      header: "Items Bought",
      accessor: "itemsBought",
      align: "right",
      render: (row) => row.itemsBought || 0,
    },
    {
      header: "Items Sold",
      accessor: "itemsSold",
      align: "right",
      render: (row) => row.itemsSold || 0,
    },
    {
      header: "Remaining",
      accessor: "currentStock",
      align: "right",
      render: (row) => {
        const stock = row.currentStock || row.stockInHand || 0
        const isLow = stock <= (row.reorderLevel || row.minimumStock || 10)
        return (
          <span className={isLow ? "text-red-600 font-semibold" : ""}>
            {stock}
          </span>
        )
      },
    },
    {
      header: "Min Sell Price",
      accessor: "minSellPrice",
      align: "right",
      render: (row) => {
        const landedPrice = row.landedPrice || row.averageCostPrice || row.costPrice || 0
        const minSellPrice = landedPrice * 1.2
        return currency(minSellPrice)
      },
    },
    {
      header: "Landed Price",
      accessor: "landedPrice",
      align: "right",
      render: (row) => currency(row.landedPrice || row.averageCostPrice || row.costPrice || 0),
    },
  ]

  const summary = [
    {
      label: "Total Products",
      value: totals.items,
      subtext: "in inventory",
    },
    {
      label: "Total Bought",
      value: totals.totalBought.toLocaleString(),
      subtext: "units purchased",
    },
    {
      label: "Total Sold",
      value: totals.totalSold.toLocaleString(),
      subtext: "units sold",
    },
    {
      label: "Remaining Stock",
      value: totals.totalStock.toLocaleString(),
      color: "text-blue-600",
      subtext: "units in hand",
    },
  ]

  const totalsRow = {
    productName: "",
    itemsBought: totals.totalBought,
    itemsSold: totals.totalSold,
    currentStock: totals.totalStock,
    totalValue: currency(totals.totalValue),
    landedPrice: currency(totals.totalValue),
    minSellPrice: currency(totals.totalValue),
  }

  return (
    <ReportLayout
      title="Stock in Hand Report"
      description={`Current inventory levels as of ${formatDate(dateRange.to)}`}
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      onExport={handleExport}
      loading={isLoading}
      error={isError ? error : null}
      summary={summary}
    >
      <PrintableTable
        columns={columns}
        data={stockData}
        loading={isLoading}
        showTotals={true}
        totalsRow={totalsRow}
        totalColumns={[{ title: "Total Stock", value: "minSellPrice" }]}
        searchableColumns={["supplierName", "productCode", "productName"]}
      />
    </ReportLayout>
  )
}
