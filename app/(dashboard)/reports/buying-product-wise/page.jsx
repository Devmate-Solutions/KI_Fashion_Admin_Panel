"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useBuyingProductWiseReport } from "@/lib/hooks/useReports"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import toast from "react-hot-toast"

function formatNumber(n) {
  const num = Number(n || 0)
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Format with pound symbol
function currency(n) {
  return `£${formatNumber(n)}`
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

export default function BuyingProductWiseReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, refetch } = useBuyingProductWiseReport({
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

  const columns = [
     {
      header: "TC",
      accessor: "tc",
      render: (row) => <span className="font-mono text-xs">{row.tc}</span>,
    },
    {
      header: "Transaction Date",
      accessor: "transactionDate",
      render: (row) => formatDate(row.transactionDate),
    },
    {
      header: "Transaction Type",
      accessor: "transactionType",
      render: () => "Buying",
    },
   
    {
      header: "Supplier Name",
      accessor: "supplierName",
    },
     {
      header: "Product",
      accessor: "productName",
      render: (row) => (
        <span className="font-mono text-xs">{row.productName}</span>
      ),
    },
    {
      header: "Product Code",
      accessor: "productCode",
      render: (row) => (
        <span className="font-mono text-xs">{row.productCode || row.sku || "—"}</span>
      ),
    },
    {
      header: "Items Bought",
      accessor: "quantity",
      align: "right",
    },
    {
      header: "CPI",
      accessor: "costPrice",
      align: "right",
      render: (row) => currency(row.costPrice || 0),
    },
    {
      header: "Total",
      accessor: "totalPrice",
      align: "right",
      render: (row) => currency(row.totalPrice || (row.quantity * row.costPrice) || 0),
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

  return (
    <ReportLayout
      title="Daily Buying Product Wise Report"
      description="Purchases breakdown by individual products"
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
      />
    </ReportLayout>
  )
}
