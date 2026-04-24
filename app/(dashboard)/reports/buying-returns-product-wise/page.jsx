"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useBuyingReturnsProductWiseReport } from "@/lib/hooks/useReports"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import { exportToPDF } from "@/lib/utils/pdfExport"
import { getDefaultDateRange } from "@/lib/utils/getDefaultDateRange"
import toast from "react-hot-toast"

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(date) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-GB")
}

export default function BuyingReturnsProductWiseReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, isError, error, refetch } = useBuyingReturnsProductWiseReport({
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
            orderNumber: ret.dispatchOrder?.orderNumber || "—",
            dispatchOrderId: ret.dispatchOrder?._id,
            supplierName: ret.supplier?.name || ret.supplier?.company || "—",
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

  const totals = useMemo(() => {
    const returns = data?.returns || []
    return {
      quantity: productData.reduce((sum, p) => sum + (p.returnedQuantity || 0), 0),
      value: productData.reduce((sum, p) => sum + ((p.returnedQuantity || 0) * (p.costPrice || 0)), 0),
      cashRefund: returns.reduce((sum, r) => sum + (r.cashRefund || 0), 0),
      accountCredit: returns.reduce((sum, r) => sum + (r.accountCredit || 0), 0),
    }
  }, [productData, data])

  const columns = [
    {
      header: "Sno",
      accessor: "sno",
      render: (row) => row.sno,
      pdfValue: (row) => row.sno
    },
    {
      header: "Return Date",
      accessor: "returnDate",
      render: (row) => formatDate(row.returnDate),
      pdfValue: (row) => formatDate(row.returnDate)
    },
    {
      header: "Order #",
      accessor: "orderNumber",
      render: (row) => {
        const displayText = row.orderNumber
        const orderId = row.dispatchOrderId
        if (orderId && displayText && displayText !== "—") {
          return (
            <Link
              href={`/dispatch-orders/${orderId}`}
              className="font-mono text-xs text-blue-600 hover:underline"
            >
              {displayText}
            </Link>
          )
        }
        return <span className="font-mono text-xs">{displayText}</span>
      },
      pdfValue: (row) => row.orderNumber || "—"
    },
    {
      header: "Supplier",
      accessor: "supplierName",
      pdfValue: (row) => row.supplierName || "—"
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
      pdfValue: (row) => row.productCode || row.sku || "—"
    },
    {
      header: "Product Name",
      accessor: "productName",
      pdfValue: (row) => row.productName || "—"
    },
    {
      header: "Returned Qty",
      accessor: "returnedQuantity",
      align: "right",
      pdfValue: (row) => row.returnedQuantity || 0
    },
    {
      header: "Cost Price",
      accessor: "costPrice",
      align: "right",
      render: (row) => currency(row.costPrice || 0),
      pdfValue: (row) => currency(row.costPrice || 0)
    },
    {
      header: "Total Value",
      accessor: "totalValue",
      align: "right",
      render: (row) => (
        <span className="text-green-600 font-medium">
          {currency((row.returnedQuantity || 0) * (row.costPrice || 0))}
        </span>
      ),
      pdfValue: (row) => currency((row.returnedQuantity || 0) * (row.costPrice || 0))
    },
    {
      header: "Reason",
      accessor: "itemReason",
      pdfValue: (row) => row.itemReason || "—"
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
      color: "text-green-600",
    },
    {
      label: "Cash Refund",
      value: currency(totals.cashRefund),
      color: "text-blue-600",
    },
  ]

  const totalsRow = {
    supplierName: "",
    returnedQuantity: totals.quantity,
    totalValue: currency(totals.value),
  }

  const handleDownloadPDF = async () => {
    try {
      const result = await exportToPDF({
        title: "Buying Returns (Product Wise)",
        columns: columns,
        data: productData,
        totalsRow: totalsRow,
        dateRange: dateRange,
        filename: `Buying_Returns_Product_Wise_${dateRange.from}_${dateRange.to}`
      })
      if (result.success) {
        toast.success("PDF report downloaded!")
      } else {
        toast.error("Failed to generate PDF")
      }
    } catch (err) {
      toast.error("PDF generation failed: " + err.message)
    }
  }

  const handleExport = async () => {
    try {
      const result = await exportToExcelWithTotals(
        productData,
        columns,
        totalsRow,
        `Buying_Returns_Product_Wise_${dateRange.from}_${dateRange.to}`
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
      title="Buying Returns (Product Wise)"
      description="Supplier return items breakdown by individual product"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      onExport={handleExport}
      onDownloadPDF={handleDownloadPDF}
      loading={isLoading}
      error={isError ? error : null}
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