"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useSalesProductWiseReport } from "@/lib/hooks/useReports"
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

export default function SalesProductWiseReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, refetch } = useSalesProductWiseReport({
    startDate: dateRange.from,
    endDate: dateRange.to,
  })

  const productData = useMemo(() => {
    // Flatten sales items into individual rows
    const sales = data?.sales || []
    const flatData = []
    sales.forEach((sale, saleIdx) => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          flatData.push({
            ...item,
            sno: flatData.length + 1,
            transactionDate: sale.saleDate,
            buyerName: sale.buyer?.name || sale.buyer?.company || "Walk-in",
            supplierName: item.product?.supplier?.name || item.product?.supplier?.company || "—",
            productCode: item.product?.productCode || item.product?.sku || "—",
            productName: item.product?.name || "—",
          })
        })
      }
    })
    return flatData
  }, [data])

  const totals = useMemo(() => {
    return {
      quantity: productData.reduce((sum, p) => sum + (p.quantity || 0), 0),
      revenue: productData.reduce((sum, p) => sum + (p.totalPrice || p.quantity * p.unitPrice || 0), 0),
    }
  }, [productData])

  const handleExport = async () => {
    try {
      const result = await exportToExcelWithTotals(
        productData,
        columns,
        totalsRow,
        `Sales_Product_Wise_Report_${dateRange.from}_${dateRange.to}`
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
      header: "Sno",
      accessor: "sno",
      render: (row) => row.sno,
    },
    {
      header: "Transaction Date",
      accessor: "transactionDate",
      render: (row) => formatDate(row.transactionDate),
    },
    {
      header: "Transaction Type",
      accessor: "transactionType",
      render: () => "Sales",
    },
    {
      header: "Supplier Name",
      accessor: "supplierName",
    },
    {
      header: "Buyer Name",
      accessor: "buyerName",
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
    },
    {
      header: "Items Sold",
      accessor: "quantity",
      align: "right",
    },
    {
      header: "CPI",
      accessor: "unitPrice",
      align: "right",
      render: (row) => currency(row.unitPrice || 0),
    },
    {
      header: "Total",
      accessor: "totalPrice",
      align: "right",
      render: (row) => currency(row.totalPrice || (row.quantity * row.unitPrice) || 0),
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
      subtext: "units sold",
    },
    {
      label: "Total Revenue",
      value: currency(totals.revenue),
      color: "text-green-600",
    },
  ]

  const totalsRow = {
    buyerName: "",
    quantity: totals.quantity,
    totalPrice: currency(totals.revenue),
  }

  return (
    <ReportLayout
      title="Daily Sales Product Wise Report"
      description="Sales breakdown by individual products"
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
        totalColumns={[{ title: "Total", value: "totalPrice" }]}

      />
    </ReportLayout>
  )
}

