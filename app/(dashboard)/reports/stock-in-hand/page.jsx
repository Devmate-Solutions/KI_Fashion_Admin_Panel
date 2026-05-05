"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useStockInHandReport } from "@/lib/hooks/useReports"
import { Badge } from "@/components/ui/badge"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import { exportToPDF } from "@/lib/utils/pdfExport"
import toast from "react-hot-toast"

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function formatDate(date) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-GB")
}

function getDefaultDateRange() {
  const today = new Date()
  return {
    from: today.toLocaleDateString('en-CA'),
    to: today.toLocaleDateString('en-CA'),
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
      totalLandedValue: stockData.reduce((sum, p) => {
        const remaining = toNumber(p.currentStock ?? p.stockInHand)
        const landedPerItem = toNumber(p.landedPrice ?? p.averageCostPrice ?? p.costPrice ?? p.averageLandedPrice)
        return sum + (remaining * landedPerItem)
      }, 0),
      totalMinSellValue: stockData.reduce((sum, p) => {
        const remaining = toNumber(p.currentStock ?? p.stockInHand)
        const minSellPerItem = toNumber(
          p.minSellPrice ??
          p.product?.pricing?.minSellingPrice ??
          p.product?.pricing?.sellingPrice
        )
        return sum + (remaining * minSellPerItem)
      }, 0),
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

  const handleDownloadPDF = async () => {
    try {
      const result = await exportToPDF({
        title: "Stock in Hand Report",
        columns: columns,
        data: stockData,
        totalsRow: totalsRow,
        dateRange: dateRange,
        filename: `Stock_In_Hand_Report_${dateRange.to}`
      })
      if (result.success) {
        toast.success("PDF report generated!")
      } else {
        toast.error("Failed to generate PDF")
      }
    } catch (err) {
      toast.error("PDF generation failed: " + err.message)
    }
  }

  const columns = [
    {
      header: "Supplier",
      accessor: "supplierName",
      type: "string",
      render: (row) => {
        const companyName = row.supplierCompany;
        const contactName = row.supplierName;

        if ((!companyName || companyName === "—") && (!contactName || contactName === "—")) {
          return <div className="text-muted-foreground">—</div>;
        }

        return (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {companyName !== "—" ? companyName : contactName}
            </span>
            {companyName && contactName && companyName !== contactName && companyName !== "—" && contactName !== "—" && (
              <span className="text-[11px] text-muted-foreground leading-tight">
                {contactName}
              </span>
            )}
          </div>
        );
      },
      pdfValue: (row) => {
        const companyName = row.supplierCompany;
        const contactName = row.supplierName;
        if (companyName && contactName && companyName !== contactName && companyName !== "—" && contactName !== "—") {
          return `${companyName} (${contactName})`;
        }
        return companyName !== "—" ? companyName : contactName;
      }
    },
    {
      header: "Product Code",
      accessor: "productCode",
      type: "string",
      render: (row) => {
        const productCode = row.productCode || row.sku || row.product?.productCode || row.product?.sku || "—"
        const productId = row.productId || row._id || row.product?._id
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
      pdfValue: (row) => row.productCode || row.sku || row.product?.productCode || row.product?.sku || "—"
    },
    {
      header: "Product Description",
      accessor: "productName",
      type: "string",
      render: (row) => row.productName || row.name || row.description || "—",
      pdfValue: (row) => row.productName || row.name || row.description || "—"
    },
    {
      header: "Color",
      accessor: "color",
      type: "string",
      render: (row) => {
        // Try to get color from multiple sources
        if (row.color) return row.color;
        if (row.variantComposition && row.variantComposition.length > 0) {
          return row.variantComposition.map(v => v.color).join(", ");
        }
        return "—";
      },
      pdfValue: (row) => {
        if (row.color) return row.color;
        if (row.variantComposition && row.variantComposition.length > 0) {
          return row.variantComposition.map(v => v.color).join(", ");
        }
        return "—";
      }
    },
    {
      header: "Items Bought",
      accessor: "itemsBought",
      align: "right",
      render: (row) => row.itemsBought || 0,
      pdfValue: (row) => row.itemsBought || 0
    },
    {
      header: "Items Sold",
      accessor: "itemsSold",
      align: "right",
      render: (row) => (row.itemsSold || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      pdfValue: (row) => (row.itemsSold || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
      pdfValue: (row) => row.currentStock || row.stockInHand || 0
    },
    {
      header: "Min Sell Price",
      accessor: "minSellPrice",
      align: "right",
      render: (row) => {
        const minSellPrice = toNumber(
          row.minSellPrice ??
          row.product?.pricing?.minSellingPrice ??
          row.product?.pricing?.sellingPrice
        )
        return currency(minSellPrice)
      },
      pdfValue: (row) => {
        const minSellPrice = toNumber(
          row.minSellPrice ??
          row.product?.pricing?.minSellingPrice ??
          row.product?.pricing?.sellingPrice
        )
        return currency(minSellPrice)
      }
    },
    {
      header: "Landed Price",
      accessor: "landedPrice",
      align: "right",
      render: (row) => {
        const price = row.landedPrice || row.averageCostPrice || row.costPrice || row.averageLandedPrice || 0
        return currency(price)
      },
      pdfValue: (row) => {
        const price = row.landedPrice || row.averageCostPrice || row.costPrice || row.averageLandedPrice || 0
        return currency(price)
      }
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
    landedPrice: currency(totals.totalLandedValue),
    minSellPrice: "",
  }

  return (
    <ReportLayout
      title="Stock in Hand Report"
      description={`Current inventory levels as of ${formatDate(dateRange.to)}`}
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
        data={stockData}
        loading={isLoading}
        showTotals={true}
        totalsRow={totalsRow}
        totalColumns={[{ title: "Stock In Hand", value: "landedPrice" }]}
        searchableColumns={["supplierName", "productCode", "productName"]}
      />
    </ReportLayout>
  )
}
