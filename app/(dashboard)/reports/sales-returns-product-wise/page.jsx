"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useSalesReturnsProductWiseReport } from "@/lib/hooks/useReports"
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

const STATUS_COLORS = {
  approved: "text-green-600",
  pending: "text-amber-600",
  rejected: "text-red-600",
}

export default function SalesReturnsProductWiseReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, refetch } = useSalesReturnsProductWiseReport({
    startDate: dateRange.from,
    endDate: dateRange.to,
  })

  const productData = useMemo(() => {
    const returns = data?.returns || []
    const flatData = []
    returns.forEach((ret) => {
      if (ret.items && ret.items.length > 0) {
        ret.items.forEach((item) => {
          flatData.push({
            ...item,
            sno: flatData.length + 1,
            returnDate: ret.returnedAt || ret.createdAt,
            saleNumber: ret.sale?.saleNumber || "—",
            buyerName: ret.buyer?.name || ret.buyer?.company || "—",
            returnStatus: ret.status || "—",
            productCode: item.product?.productCode || item.product?.sku || "—",
            productName: item.product?.name || "—",
            productId: item.product?._id,
            itemReason: item.reason || ret.notes || "—",
          })
        })
      }
    })
    return flatData
  }, [data])

  const totals = useMemo(() => ({
    quantity: productData.reduce((sum, p) => sum + (p.returnedQuantity || 0), 0),
    value: productData.reduce((sum, p) => sum + ((p.returnedQuantity || 0) * (p.unitPrice || 0)), 0),
  }), [productData])

  const columns = [
    {
      header: "Sno",
      accessor: "sno",
      render: (row) => row.sno,
    },
    {
      header: "Return Date",
      accessor: "returnDate",
      render: (row) => formatDate(row.returnDate),
    },
    {
      header: "Sale #",
      accessor: "saleNumber",
      render: (row) => <span className="font-mono text-xs">{row.saleNumber}</span>,
    },
    {
      header: "Buyer",
      accessor: "buyerName",
    },
    {
      header: "Product Code",
      accessor: "productCode",
      render: (row) => {
        const { productCode, productId } = row
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
      header: "Product Name",
      accessor: "productName",
    },
    {
      header: "Returned Qty",
      accessor: "returnedQuantity",
      align: "right",
    },
    {
      header: "Unit Price",
      accessor: "unitPrice",
      align: "right",
      render: (row) => currency(row.unitPrice || 0),
    },
    {
      header: "Total Value",
      accessor: "totalValue",
      align: "right",
      render: (row) => (
        <span className="text-red-600 font-medium">
          {currency((row.returnedQuantity || 0) * (row.unitPrice || 0))}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "returnStatus",
      render: (row) => (
        <span className={`font-medium capitalize ${STATUS_COLORS[row.returnStatus] || ""}`}>
          {row.returnStatus}
        </span>
      ),
    },
    {
      header: "Reason",
      accessor: "itemReason",
    },
  ]

  const summary = [
    {
      label: "Total Returns",
      value: (data?.returns || []).length,
      subtext: "return transactions",
    },
    {
      label: "Items Returned",
      value: productData.length,
      subtext: "product lines",
    },
    {
      label: "Total Qty Returned",
      value: totals.quantity.toLocaleString(),
      subtext: "units",
    },
    {
      label: "Total Return Value",
      value: currency(totals.value),
      color: "text-red-600",
    },
  ]

  const totalsRow = {
    buyerName: "",
    returnedQuantity: totals.quantity,
    totalValue: currency(totals.value),
  }

  const handleExport = async () => {
    try {
      const result = await exportToExcelWithTotals(
        productData,
        columns,
        totalsRow,
        `Sales_Returns_Product_Wise_${dateRange.from}_${dateRange.to}`
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

  return (
    <ReportLayout
      title="Sales Returns (Product Wise)"
      description="Returned sale items breakdown by individual product"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      onExport={handleExport}
      loading={isLoading}
      summary={summary}
    >
      <PrintableTable
        columns={columns}
        data={productData}
        loading={isLoading}
        showTotals={true}
        totalsRow={totalsRow}
        grandTotalSection={totalsRow}
        totalColumns={[{ title: "Total Return Value", value: "totalValue" }]}
      />
    </ReportLayout>
  )
}
