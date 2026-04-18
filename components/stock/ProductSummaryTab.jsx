"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import ProductImageGallery from "@/components/ui/ProductImageGallery"
import { Label } from "@/components/ui/label"
import BritishDatePicker from "@/components/BritishDatePicker"
import PrintableTable from "@/components/reports/PrintableTable"
import { useProductSummaryReport } from "@/lib/hooks/useReports"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import toast from "react-hot-toast"
import { Download, Printer, RefreshCcw, Filter, X } from "lucide-react"

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ProductSummaryTab() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Build params — only include dates if both are set
  const params = useMemo(() => {
    const p = {}
    if (startDate && endDate) {
      p.startDate = startDate
      p.endDate = endDate
      p.activityOnly = true
    }
    return p
  }, [startDate, endDate])

  const { data, isLoading, refetch } = useProductSummaryReport(params)

  const products = useMemo(() => data?.products || [], [data])
  const summary = useMemo(() => data?.summary || {}, [data])

  const columns = [
    {
      header: "Image",
      accessor: "image",
      render: (row) => row.productId ? (
        <ProductImageGallery
          productId={String(row.productId)}
          size="sm"
          maxVisible={1}
          showCount={false}
        />
      ) : null,
    },
    {
      header: "Supplier",
      accessor: "supplierName",
      render: (row) => row.supplierName || "—",
    },
    {
      header: "Product",
      accessor: "productCode",
      render: (row) => (
        <Link
          href={`/stock/product-history?productId=${row.productId}&tab=3`}
          className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          {row.productCode || "—"}
        </Link>
      ),
    },
    {
      header: "Product Description",
      accessor: "productName",
      render: (row) => row.productName || "—",
    },
   
    {
      header: "Items Bought",
      accessor: "itemsBought",
      align: "right",
      render: (row) => (row.itemsBought || 0).toLocaleString(),
    },
    {
      header: "Items Sold",
      accessor: "itemsSold",
      align: "right",
      render: (row) => (row.itemsSold || 0).toLocaleString(),
    },
    {
      header: "Items Remaining",
      accessor: "itemsRemaining",
      align: "right",
      render: (row) => (row.itemsRemaining || 0).toLocaleString(),
    },
    {
      header: "Total Price",
      accessor: "totalPrice",
      align: "right",
      render: (row) => currency(row.totalPrice),
    },
    {
      header: "Total Sales",
      accessor: "totalSales",
      align: "right",
      render: (row) => currency(row.totalSales),
    },
    {
      header: "Percentage %",
      accessor: "percentage",
      align: "right",
      render: (row) => `${Number(row.percentage || 0).toFixed(2)}%`,
    },
    {
      header: "Landed Price",
      accessor: "landedPrice",
      align: "right",
      render: (row) => currency(row.landedPrice),
    },
    {
      header: "Min Selling Price",
      accessor: "minSellingPrice",
      align: "right",
      render: (row) => currency(row.minSellingPrice),
    },
  ]

  const totalsRow = useMemo(() => ({
    image: "",
    supplierName: "",
    productCode: "",
    productName: "",
    color: "",
    itemsBought: (summary.totalItemsBought || 0).toLocaleString(),
    itemsSold: (summary.totalItemsSold || 0).toLocaleString(),
    itemsRemaining: ((summary.totalItemsBought || 0) - (summary.totalItemsSold || 0)).toLocaleString(),
    totalPrice: currency(summary.totalStockValue),
    totalSales: currency(summary.totalSalesValue),
    percentage: "",
    landedPrice: "",
    minSellingPrice: "",
  }), [summary])

  const handleExport = async () => {
    try {
      const dateLabel = startDate && endDate
        ? `${startDate}_to_${endDate}`
        : "All_Time"
      const result = await exportToExcelWithTotals(
        products,
        columns,
        totalsRow,
        `Product_Summary_${dateLabel}`
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

  const clearDates = () => {
    setStartDate("")
    setEndDate("")
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Product Summary</h3>
          <span className="text-sm text-muted-foreground">
            {startDate && endDate
              ? `${new Date(startDate).toLocaleDateString("en-GB")} — ${new Date(endDate).toLocaleDateString("en-GB")}`
              : "All Time"}
          </span>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            {showFilters ? "Hide Filters" : "Date Filter"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-green-700 border-green-300 hover:bg-green-50"
            onClick={handleExport}
            disabled={products.length === 0}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-blue-700 border-blue-300 hover:bg-blue-50"
            onClick={() => window.print()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>
        </div>
      </div>

      {/* Date Range Filter (collapsible) */}
      {showFilters && (
        <div className="no-print flex flex-wrap items-end gap-4 p-4 rounded-lg border border-border bg-muted/30">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <BritishDatePicker value={startDate} onChange={setStartDate} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <BritishDatePicker value={endDate} onChange={setEndDate} />
          </div>
          {startDate && endDate && (
            <Button variant="ghost" size="sm" onClick={clearDates}>
              <X className="mr-1 h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Total Products" value={summary.totalProducts || 0} />
        <SummaryCard label="Items Bought" value={(summary.totalItemsBought || 0).toLocaleString()} />
        <SummaryCard label="Items Sold" value={(summary.totalItemsSold || 0).toLocaleString()} />
        <SummaryCard label="Stock in Hand" value={(summary.totalStockInHand || 0).toLocaleString()} />
        <SummaryCard label="Stock Value" value={currency(summary.totalStockValue)} />
        <SummaryCard label="Sales Value" value={currency(summary.totalSalesValue)} />
      </div>

      {/* Table */}
      <PrintableTable
        columns={columns}
        data={products}
        loading={isLoading}
        enableSearch={true}
        enableSort={true}
        enableColumnFilters={true}
        searchableColumns={["supplierName", "productCode", "productName", "color"]}
        pageSize={50}
        showTotals={true}
        totalsRow={totalsRow}
        totalColumns={[{ title: "Total Products", value: "itemsBought" }]}
      />
    </div>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  )
}
