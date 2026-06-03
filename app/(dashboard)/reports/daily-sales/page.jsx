"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTableFiltered from "@/components/reports/PrintableTableFiltered"
import { useDailySalesReport } from "@/lib/hooks/useReports"
import { Badge } from "@/components/ui/badge"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import { exportToPDF } from "@/lib/utils/pdfExport"
import { getDefaultDateRange } from "@/lib/utils/getDefaultDateRange"
import { useAuthStore } from "@/store/store"
import toast from "react-hot-toast"

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(date) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-GB")
}

function resolveSaleVat(row) {
  const vat = Number(row?.vat || 0)
  if (vat > 0) return vat

  const totalVAT = Number(row?.totalVAT || 0)
  if (totalVAT > 0) return totalVAT

  const totalTax = Number(row?.totalTax || 0)
  if (totalTax > 0) return totalTax

  const subtotal = Number(row?.subtotal || 0)
  const discount = Number(row?.discount || row?.totalDiscount || 0)
  const grandTotal = Number(row?.grandTotal || 0)
  const shipping = Number(row?.shippingCost || row?.buyerShippingCharge || 0)
  const fallbackVat = grandTotal - (subtotal - discount) - shipping

  return fallbackVat > 0 ? fallbackVat : 0
}

export default function DailySalesReportPage() {
  const user = useAuthStore((s) => s.user)
  const isEmployee = user?.role === "employee"

  const [dateRange, setDateRange] = useState(() => {
    const defaults = getDefaultDateRange()
    if (isEmployee) {
      return { from: defaults.to, to: defaults.to }
    }
    return defaults
  })

  const { data, isLoading, isError, error, refetch } = useDailySalesReport({
    startDate: dateRange.from,
    endDate: dateRange.to,
  })

  const salesData = useMemo(() => {
    return data?.sales || []
  }, [data])

  const totals = useMemo(() => {
    return {
      subtotal: salesData.reduce((sum, s) => sum + (s.subtotal || 0), 0),
      discount: salesData.reduce((sum, s) => sum + (s.discount || 0), 0),
      grandTotal: salesData.reduce((sum, s) => sum + (s.grandTotal || 0), 0),
      bankPayment: salesData.reduce((sum, s) => sum + (s.bankPayment || 0), 0),
      cashPayment: salesData.reduce((sum, s) => sum + (s.cashPayment || 0), 0),
      vat: salesData.reduce((sum, s) => sum + resolveSaleVat(s), 0),
    }
  }, [salesData])

  const handleExport = async () => {
    try {
      const result = await exportToExcelWithTotals(
        salesData,
        columns,
        totalsRow,
        `Daily_Sales_Report_${dateRange.from}_${dateRange.to}`
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
        title: "Daily Sales Report",
        columns: columns.filter(c => c.header !== "Transaction Type"),
        data: salesData,
        totalsRow: totalsRow,
        dateRange: dateRange,
        filename: `Daily_Sales_Report_${dateRange.from}_${dateRange.to}`
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
      header: "ID",
      accessor: "saleNumber",
      filterType: "text",
      render: (row) => {
        const displayText = row.saleNumber || "—"
        if (row._id && displayText !== "—") {
          return (
            <Link
              href={`/selling/${row._id}`}
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
      header: "Transaction Type",
      accessor: "transactionType",
      // filterType: "text",
      render: (row) => {
        if (row.saleOrigin === 'website') return 'Website Sale';
        // if (row.saleOrigin === 'crm_manual' || row.saleOrigin === 'crm_buyer') return 'CRM Sale';
        return 'CRM Sale';
      },
      pdfValue: (row) => {
        if (row.saleOrigin === 'website') return 'Website Sale';
        return 'CRM Sale'
        // if (row.saleOrigin === 'crm_manual' || row.saleOrigin === 'crm_buyer') return 'CRM Sale';
        // return 'Sale Invoice';
      }
    },
    {
      header: "Invoice Date",
      accessor: "saleDate",
      filterType: "date-picker",
      render: (row) => formatDate(row.saleDate),
      pdfValue: (row) => formatDate(row.saleDate)
    },
    {
      header: "Name",
      accessor: "buyer",
      filterType: "autocomplete",
      render: (row) => {
        const buyer = row.buyer
        if (!buyer) return "Walk-in"
        if (typeof buyer === 'string') return buyer
        return buyer.company || buyer.name || "Walk-in"
      },
      pdfValue: (row) => {
        const buyer = row.buyer
        if (!buyer) return "Walk-in"
        if (typeof buyer === 'string') return buyer
        return buyer.company || buyer.name || "Walk-in"
      }
    },
    {
      header: "Total",
      accessor: "subtotal",
      filterType: "text",
      align: "right",
      render: (row) => currency(row.subtotal || 0),
      pdfValue: (row) => currency(row.subtotal || 0)
    },
    {
      header: "Discount",
      accessor: "discount",
      filterType: "text",
      align: "right",
      render: (row) => currency(row.discount || 0),
      pdfValue: (row) => currency(row.discount || 0)
    },
    {
      header: "VAT",
      accessor: "vat",
      filterType: "text",
      align: "right",
      render: (row) => currency(resolveSaleVat(row)),
      pdfValue: (row) => currency(resolveSaleVat(row))
    },
    {
      header: "Grand Total",
      accessor: "grandTotal",
      filterType: "text",
      align: "right",
      render: (row) => currency(row.grandTotal || 0),
      pdfValue: (row) => currency(row.grandTotal || 0)
    },
    {
      header: "Bank Cash",
      accessor: "bankPayment",
      filterType: "text",
      align: "right",
      render: (row) => currency(row.bankPayment || 0),
      pdfValue: (row) => currency(row.bankPayment || 0)
    },
    {
      header: "Cash",
      accessor: "cashPayment",
      filterType: "text",
      align: "right",
      render: (row) => currency(row.cashPayment || 0),
      pdfValue: (row) => currency(row.cashPayment || 0)
    },
    {
      header: "Remaining",
      accessor: "remaining",
      filterType: "text",
      align: "right",
      render: (row) => {
        const total = row.grandTotal || 0
        const paid = (row.bankPayment || 0) + (row.cashPayment || 0)
        return currency(total - paid)
      },
      pdfValue: (row) => {
        const total = row.grandTotal || 0
        const paid = (row.bankPayment || 0) + (row.cashPayment || 0)
        return currency(total - paid)
      }
    },
  ]

  const summary = [
    {
      label: "Total Sales",
      value: salesData.length,
      subtext: "transactions",
    },
    {
      label: "Total Amount",
      value: currency(totals.grandTotal),
      color: "text-blue-600",
    },
    {
      label: "Total Discount",
      value: currency(totals.discount),
      color: "text-orange-600",
    },
    {
      label: "Amount Received",
      value: currency(totals.bankPayment + totals.cashPayment),
      color: "text-green-600",
    },
  ]

  const totalsRow = {
    saleNumber: "TOTAL",
    subtotal: currency(totals.subtotal),
    discount: currency(totals.discount),
    vat: currency(totals.vat),
    grandTotal: currency(totals.grandTotal),
    bankPayment: currency(totals.bankPayment),
    cashPayment: currency(totals.cashPayment),
    remaining: currency(totals.grandTotal - (totals.bankPayment + totals.cashPayment)),
  }

  const computeTotals = (rows) => ({
    saleNumber: "TOTAL",
    subtotal: currency(rows.reduce((s, r) => s + (r.subtotal || 0), 0)),
    discount: currency(rows.reduce((s, r) => s + (r.discount || 0), 0)),
    vat: currency(rows.reduce((s, r) => s + resolveSaleVat(r), 0)),
    grandTotal: currency(rows.reduce((s, r) => s + (r.grandTotal || 0), 0)),
    bankPayment: currency(rows.reduce((s, r) => s + (r.bankPayment || 0), 0)),
    cashPayment: currency(rows.reduce((s, r) => s + (r.cashPayment || 0), 0)),
    remaining: currency(
      rows.reduce((s, r) => s + ((r.grandTotal || 0) - (r.bankPayment || 0) - (r.cashPayment || 0)), 0)
    ),
  })

  return (
    <ReportLayout
      title="Daily Sales Invoice Wise Report"
      description="All sales transactions for the selected date range"
      dateRange={dateRange}
      onDateChange={setDateRange}
      hideDateFilter={isEmployee}
      onRefresh={refetch}
      onExport={handleExport}
      onDownloadPDF={handleDownloadPDF}
      loading={isLoading}
      error={isError ? error : null}
      summary={summary}
    >
      <PrintableTableFiltered enableColumnFilters={true}
        columns={columns}
        data={salesData}
        loading={isLoading}
        showTotals={true}
        computeTotals={computeTotals}
        totalsRow={totalsRow}
        searchableColumns={[columns[0].accessor]}
        totalColumns={[{ title: "Total Sales", value: "subtotal" }]}
      />
    </ReportLayout>
  )
}