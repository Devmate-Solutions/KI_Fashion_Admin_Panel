"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useProductSummaryReport } from "@/lib/hooks/useReports"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import { exportToPDF } from "@/lib/utils/pdfExport"
import toast from "react-hot-toast"

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatNumber(n) {
  const num = Number(n || 0)
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getDefaultDateRange() {
  const today = new Date()
  return {
    from: "",
    to: today.toLocaleDateString('en-CA'),
  }
}

export default function ProductSummaryReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const reportParams = useMemo(() => {
    return {
      ...(dateRange.from ? { startDate: dateRange.from } : {}),
      ...(dateRange.to ? { endDate: dateRange.to } : {}),
      activityOnly: true,
    }
  }, [dateRange.from, dateRange.to])

  const { data, isLoading, isError, error, refetch } = useProductSummaryReport(reportParams)

  const productData = useMemo(() => {
    return Array.isArray(data) ? data : data?.products || []
  }, [data])

  const totals = useMemo(() => {
    return {
      products: productData.length,
      totalBought: productData.reduce((sum, p) => sum + (p.itemsBought || 0), 0),
      totalSold: productData.reduce((sum, p) => sum + (p.itemsSold || 0), 0),
      totalInHand: productData.reduce((sum, p) => sum + (p.stockInHand || p.itemsRemaining || 0), 0),
      totalValue: productData.reduce((sum, p) => sum + (p.totalPrice || 0), 0),
      totalSalesValue: productData.reduce((sum, p) => sum + (p.totalSales || 0), 0),
    }
  }, [productData])

  const handleExport = async () => {
    try {
      const result = await exportToExcelWithTotals(
        productData,
        columns,
        totalsRow,
        `Product_Summary_Report_${dateRange.to || "all"}`
      )
      if (result.success) {
        toast.success("Report exported successfully!")
      } else {
        toast.error("Failed to export report")
      }
    } catch (err) {
      toast.error("Export failed: " + err.message)
    }
  }

  const columns = [
    {
      header: "Supplier Name",
      accessor: "supplierName",
      type: "string",
      render: (row) => row.supplierName || "—",
    },
    {
      header: "Product Code",
      accessor: "productCode",
      type: "string",
      render: (row) => {
        const code = row.productCode || row.sku || "—"
        const id = row.productId || row._id
        if (id && code !== "—") {
          return (
            <Link
              href={`/stock/product-history?productId=${id}`}
              className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              {code}
            </Link>
          )
        }
        return <span className="font-mono text-xs">{code}</span>
      },
    },
    {
      header: "Product Description",
      accessor: "productName",
      type: "string",
      render: (row) => {
        const name = row.productName || "—"
        const id = row.productId || row._id
        if (id && name !== "—") {
          return (
            <Link
              href={`/stock`}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {name}
            </Link>
          )
        }
        return <span>{name}</span>
      },
    },
    {
      header: "Color",
      accessor: "color",
      type: "string",
      render: (row) => row.color || "—",
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
      header: "Stock in Hand",
      accessor: "stockInHand",
      align: "right",
      render: (row) => (row.stockInHand || row.itemsRemaining || 0).toLocaleString(),
    },
    {
      header: "Total Value",
      accessor: "totalPrice",
      align: "right",
      render: (row) => currency(row.totalPrice || 0),
    },
    {
      header: "Total Sales",
      accessor: "totalSales",
      align: "right",
      render: (row) => currency(row.totalSales || 0),
    },
    {
      header: "Landed Price",
      accessor: "landedPrice",
      align: "right",
      render: (row) => currency(row.landedPrice || 0),
    },
    {
      header: "Min Sell Price",
      accessor: "minSellingPrice",
      align: "right",
      render: (row) => currency(row.minSellingPrice || 0),
    },
    {
      header: "% Sold",
      accessor: "percentage",
      align: "right",
      render: (row) => `${(row.percentage || 0).toFixed(1)}%`,
    },
  ]

  const summary = [
    {
      label: "Total Products",
      value: totals.products.toLocaleString(),
      subtext: "active SKUs",
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
    // {
    //   label: "Stock in Hand",
    //   value: totals.totalInHand.toLocaleString(),
    //   color: "text-blue-600",
    //   subtext: "units remaining",
    // },
    {
      label: "Stock Value",
      value: currency(totals.totalValue),
      color: "text-purple-600",
    },
    {
      label: "Sales Revenue",
      value: currency(totals.totalSalesValue),
      color: "text-green-600",
    },
  ]

  const totalsRow = {
    supplierName: "",
    productCode: "",
    productName: "",
    color: "",
    itemsBought: totals.totalBought,
    itemsSold: totals.totalSold,
    stockInHand: totals.totalInHand,
    totalPrice: currency(totals.totalValue),
    totalSales: currency(totals.totalSalesValue),
    landedPrice: "",
    minSellingPrice: "",
    percentage: "",
  }

  const handleDownloadPDF = async () => {
    try {
      const result = await exportToPDF({
        title: "Product Summary Report",
        columns: columns,
        data: productData,
        totalsRow: totalsRow,
        dateRange: dateRange,
        filename: `Product_Summary_Report_${dateRange.to || "all"}`
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

  return (
    <ReportLayout
      title="Product Summary Report"
      description=""
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      onExport={handleExport}
      onDownloadPDF={handleDownloadPDF}
      loading={isLoading}
      error={isError ? error : null}
      summary={summary}
      showBeginningButton={true}
    >
      <PrintableTable
        columns={columns}
        data={productData}
        loading={isLoading}
        enableSearch={true}
        searchableColumns={["supplierName", "productCode", "productName", "color"]}
        showTotals={true}
        totalsRow={totalsRow}
        totalColumns={[{ title: "Total Value", value: "totalPrice" }]}
      />
    </ReportLayout>
  )
}
