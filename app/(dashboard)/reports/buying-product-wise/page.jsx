"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useBuyingProductWiseReport } from "@/lib/hooks/useReports"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import { exportToPDF } from "@/lib/utils/pdfExport"
import { getDefaultDateRange } from "@/lib/utils/getDefaultDateRange"
import toast from "react-hot-toast"

function formatNumber(n) {
  const num = Number(n || 0)
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Format with pound symbol
function currency(n) {
  return `${formatNumber(n)}`
}

function formatDate(date) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-GB")
}

export default function BuyingProductWiseReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, isError, error, refetch } = useBuyingProductWiseReport({
    startDate: dateRange.from,
    endDate: dateRange.to,
  })

  const productData = useMemo(() => {
    // Flatten purchase items into individual rows
    const purchases = data?.purchases || []
    const flatData = []
    purchases.forEach((purchase) => {
      if (purchase.items && purchase.items.length > 0) {
        purchase.items.forEach((item) => {
          flatData.push({
            ...item,
            sno: flatData.length + 1,
            transactionDate: purchase.dispatchDate || purchase.createdAt,
            supplierName: purchase.supplier?.name || purchase.supplier?.company || "—",
            tc: purchase.orderNumber || "—",
          })
        })
      }
    })
    return flatData
  }, [data])

  const totals = useMemo(() => {
    return {
      quantity: productData.reduce((sum, p) => sum + (p.quantity || 0), 0),
      cost: productData.reduce((sum, p) => sum + (p.totalPrice || p.quantity * p.costPrice || 0), 0),
    }
  }, [productData])

  const handleExport = async () => {
    try {
      const result = await exportToExcelWithTotals(
        productData,
        columns,
        totalsRow,
        `Buying_Product_Wise_Report_${dateRange.from}_${dateRange.to}`
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

  const handleDownloadPDF = async () => {
    try {
      const result = await exportToPDF({
        title: "Daily Buying Product Wise Report",
        columns: columns,
        data: productData,
        totalsRow: totalsRow,
        dateRange: dateRange,
        filename: `Buying_Product_Wise_Report_${dateRange.from}_${dateRange.to}`
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

  const columns = [
    {
      header: "TC",
      accessor: "tc",
      render: (row) => <span className="font-mono text-xs">{row.tc}</span>,
      pdfValue: (row) => row.tc || "—"
    },
    {
      header: "Transaction Date",
      accessor: "transactionDate",
      render: (row) => formatDate(row.transactionDate),
      pdfValue: (row) => formatDate(row.transactionDate)
    },
    {
      header: "Transaction Type",
      accessor: "transactionType",
      render: () => "Buying",
      pdfValue: () => "Buying"
    },

    {
      header: "Supplier Name",
      accessor: "supplierName",
      pdfValue: (row) => row.supplierName || "—"
    },
    {
      header: "Product",
      accessor: "productName",
      render: (row) => (
        <span className="font-mono text-xs">{row.productName}</span>
      ),
      pdfValue: (row) => row.productName || "—"
    },
    {
      header: "Product Code",
      accessor: "productCode",
      render: (row) => {
        const productCode = row.productCode || row.sku || "—"
        const productId = row.productId || row.product?._id
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
      header: "Items Bought",
      accessor: "quantity",
      align: "right",
      pdfValue: (row) => row.quantity || 0
    },
    {
      header: "CPI",
      accessor: "costPrice",
      align: "right",
      render: (row) => currency(row.costPrice || 0),
      pdfValue: (row) => currency(row.costPrice || 0)
    },
    {
      header: "Total",
      accessor: "totalPrice",
      align: "right",
      render: (row) => currency(row.totalPrice || (row.quantity * row.costPrice) || 0),
      pdfValue: (row) => currency(row.totalPrice || (row.quantity * row.costPrice) || 0)
    },
  ]

  const summary = [
    {
      label: "Total Items",
      value: productData.length,
      subtext: "product transactions",
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
  ]

  const totalsRow = {
    supplierName: "",
    quantity: totals.quantity,
    totalPrice: currency(totals.cost),
  }

  const grandTotalSection = {
    supplierName: "",
    quantity: totals.remaining,
    totalPrice: currency(totals.cost),
  }

  return (
    <ReportLayout
      title="Daily Buying Product Wise Report"
      description="Purchases breakdown by individual products"
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
        totalColumns={[{ title: "Total", value: "totalPrice" }]}

      />
    </ReportLayout>
  )
}
