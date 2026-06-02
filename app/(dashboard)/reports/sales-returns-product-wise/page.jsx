"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTableFiltered from "@/components/reports/PrintableTableFiltered"
import { useSalesReturnsProductWiseReport } from "@/lib/hooks/useReports"
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

const STATUS_COLORS = {
  approved: "text-green-600",
  pending: "text-amber-600",
  rejected: "text-red-600",
}

export default function SalesReturnsProductWiseReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, isError, error, refetch } = useSalesReturnsProductWiseReport({
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
            saleId: ret.sale?._id,
            buyerName: ret.buyer?.company || ret.buyer?.name || "—",
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
    value: productData.reduce(
      (sum, p) => sum + Number(p.totalValue || 0),
      0
    ),
  }), [productData])

  const computeTotals = (rows) => {
  const returnedQuantity = rows.reduce(
    (sum, r) => sum + Number(r.returnedQuantity || 0),
    0
  )

  const totalValue = rows.reduce(
    (sum, r) => sum + Number(r.totalValue || 0),
    0
  )

  return {
    buyerName: "",

    returnedQuantity,

    totalValue: currency(totalValue),
  }
}

  const columns = [

    {
      header: "Return Date",
      accessor: "returnDate",
      filterType: "date-picker",
      render: (row) => formatDate(row.returnDate),
      pdfValue: (row) => formatDate(row.returnDate)
    },
    {
      header: "Sale #",
      accessor: "saleNumber",
      filterType: "text",

      render: (row) => {
        const displayText = row.saleNumber
        const saleId = row.saleId
        if (saleId && displayText && displayText !== "—") {
          return (
            <Link
              href={`/selling/${saleId}`}
              className="font-mono text-xs text-blue-600 hover:underline"
            >
              {displayText}
            </Link>
          )
        }
        return <span className="font-mono text-xs">{displayText}</span>
      },
      pdfValue: (row) => row.saleNumber || "—"
    },
    {
      header: "Buyer",
      accessor: "buyerName",
      filterType: "autocomplete",

      pdfValue: (row) => row.buyerName || "—"
    },
    {
      header: "Product Code",
      accessor: "productCode",
      filterType: "autocomplete",

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
      filterType: "autocomplete",

      pdfValue: (row) => row.productName || "—"
    },
    {
      header: "Returned Qty",
      accessor: "returnedQuantity",
      align: "right",
      filterType: "text",

      pdfValue: (row) => row.returnedQuantity || 0
    },
    {
      header: "Unit Price",
      accessor: "unitPrice",
      filterType: "text",

      align: "right",
      render: (row) => currency(row.unitPrice || 0),
      pdfValue: (row) => currency(row.unitPrice || 0)
    },
    {
      header: "Total Value",
      accessor: "totalValue",
      filterType: "text",

      align: "right",
      render: (row) => (
        <span className="text-red-600 font-medium">
          {currency((row.returnedQuantity || 0) * (row.unitPrice || 0))}
        </span>
      ),
      pdfValue: (row) => currency((row.returnedQuantity || 0) * (row.unitPrice || 0))
    },
    {
      header: "Status",
      accessor: "returnStatus",
      render: (row) => (
        <span className={`font-medium capitalize ${STATUS_COLORS[row.returnStatus] || ""}`}>
          {row.returnStatus}
        </span>
      ),
      pdfValue: (row) => (row.returnStatus || "—").toUpperCase()
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
      color: "text-red-600",
    },
  ]

  const totalsRow = {
    buyerName: "",
    returnedQuantity: totals.quantity,
    totalValue: currency(totals.value),
  }

  const handleDownloadPDF = async () => {
    try {
      const result = await exportToPDF({
        title: "Sales Returns (Product Wise)",
        columns: columns,
        data: productData,
        totalsRow: totalsRow,
        dateRange: dateRange,
        filename: `Sales_Returns_Product_Wise_${dateRange.from}_${dateRange.to}`
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
      onDownloadPDF={handleDownloadPDF}
      loading={isLoading}
      error={isError ? error : null}
      summary={summary}
    >
      <PrintableTableFiltered
        columns={columns}
        data={productData}
        loading={isLoading}
        showTotals={true}
        totalsRow={totalsRow}
        computeTotals={computeTotals}

        grandTotalSection={totalsRow}
        totalColumns={[{ title: "Total Return Value", value: "totalValue" }]}
      />
    </ReportLayout>
  )
}
