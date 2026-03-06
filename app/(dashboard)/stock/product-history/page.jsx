"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import BackButton from "@/components/BackButton"
import ProductImageGallery from "@/components/ui/ProductImageGallery"
import PrintableTable from "@/components/reports/PrintableTable"
import { useProductHistoryReport } from "@/lib/hooks/useReports"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import toast from "react-hot-toast"
import { Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import MainContentWrapper from "@/components/MainContentWrapper"

function currency(n) {
  const num = Number(n || 0)
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TYPE_STYLES = {
  Selling: "bg-green-100 text-green-800",
  Buying: "bg-blue-100 text-blue-800",
  SellingReturn: "bg-orange-100 text-orange-800",
  BuyingReturn: "bg-red-100 text-red-800",
}

export default function ProductHistoryPage() {
  const searchParams = useSearchParams()
  const productId = searchParams.get("productId")
  const fromTab = searchParams.get("tab")
  const fallbackPath = fromTab ? `/stock?tab=${fromTab}` : "/stock"

  const { data, isLoading } = useProductHistoryReport({ productId })

  const transactions = useMemo(() => data?.transactions || [], [data])

  const summary = useMemo(() => {
    let totalBought = 0, totalSold = 0, totalBuyReturn = 0, totalSellReturn = 0
    for (const t of transactions) {
      if (t.transactionType === "Buying") totalBought += t.quantity || 0
      else if (t.transactionType === "Selling") totalSold += t.quantity || 0
      else if (t.transactionType === "BuyingReturn") totalBuyReturn += t.quantity || 0
      else if (t.transactionType === "SellingReturn") totalSellReturn += t.quantity || 0
    }
    return { totalBought, totalSold, totalBuyReturn, totalSellReturn, count: transactions.length }
  }, [transactions])

  const columns = [
    {
      header: "Image",
      accessor: "image",
      render: () => productId ? (
        <ProductImageGallery
          productId={productId}
          size="sm"
          maxVisible={1}
          showCount={false}
        />
      ) : null,
    },
    {
      header: "ID",
      accessor: "id",
      render: (row) => <span className="font-mono text-xs">{String(row.id).slice(-8)}</span>,
    },
    {
      header: "Transaction Type",
      accessor: "transactionType",
      render: (row) => (
        <Badge variant="outline" className={TYPE_STYLES[row.transactionType] || ""}>
          {row.transactionType}
        </Badge>
      ),
    },
    {
      header: "Party Name",
      accessor: "partyName",
      render: (row) => row.partyName || "—",
    },
    {
      header: "Transaction Date",
      accessor: "transactionDate",
      render: (row) =>
        row.transactionDate
          ? new Date(row.transactionDate).toLocaleDateString("en-GB")
          : "—",
    },
    {
      header: "Qty",
      accessor: "quantity",
      align: "right",
      render: (row) => row.quantity ?? 0,
    },
    {
      header: "Total",
      accessor: "total",
      align: "right",
      render: (row) => currency(row.total),
    },
    {
      header: "Discount",
      accessor: "discount",
      align: "right",
      render: (row) => currency(row.discount),
    },
    {
      header: "Total After Discount",
      accessor: "totalAfterDiscount",
      align: "right",
      render: (row) => currency(row.totalAfterDiscount),
    },
  ]

  const totalsRow = {
    id: "",
    image: "",
    transactionType: "TOTAL",
    partyName: "",
    transactionDate: "",
    quantity: transactions.reduce((s, r) => s + (r.quantity || 0), 0),
    total: currency(transactions.reduce((s, r) => s + (r.total || 0), 0)),
    discount: currency(transactions.reduce((s, r) => s + (r.discount || 0), 0)),
    totalAfterDiscount: currency(transactions.reduce((s, r) => s + (r.totalAfterDiscount || 0), 0)),
  }

  const handleExport = () => {
    if (!transactions.length) return toast.error("No data to export")
    exportToExcelWithTotals({
      data: transactions.map((t) => ({
        ID: t.id,
        "Transaction Type": t.transactionType,
        "Party Name": t.partyName,
        "Transaction Date": t.transactionDate
          ? new Date(t.transactionDate).toLocaleDateString("en-GB")
          : "",
        Qty: t.quantity,
        Total: t.total,
        Discount: t.discount,
        "Total After Discount": t.totalAfterDiscount,
      })),
      fileName: "Product_History",
      totals: totalsRow,
    })
  }

  const handlePrint = () => window.print()

  if (!productId) {
    return (
      <MainContentWrapper>
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackPath={fallbackPath} />
          <h1 className="text-2xl font-bold">Product History</h1>
        </div>
        <p className="text-muted-foreground">No product selected. Please go back and select a product from the Product Summary table.</p>
      </MainContentWrapper>
    )
  }

  return (
    <MainContentWrapper>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:mb-2">
        <div className="flex items-center gap-4">
          <BackButton fallbackPath={fallbackPath} />
          <h1 className="text-2xl font-bold">Product History</h1>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 print:grid-cols-5 print:gap-2 print:mb-2">
        {[
          { label: "Total Transactions", value: summary.count },
          { label: "Items Bought", value: summary.totalBought },
          { label: "Items Sold", value: summary.totalSold },
          { label: "Buying Returns", value: summary.totalBuyReturn },
          { label: "Selling Returns", value: summary.totalSellReturn },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-lg font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <PrintableTable
        columns={columns}
        data={transactions}
        loading={isLoading}
        enableSearch={true}
        enableSort={true}
        searchableColumns={["id", "transactionType", "partyName"]}
        showTotals={true}
        totalsRow={totalsRow}
        totalColumns={[{ title: "Total After Discount", value: "totalAfterDiscount" }]}
        pageSize={50}
      />
    </MainContentWrapper>
  )
}
