"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useProfitLossReport } from "@/lib/hooks/useReports"

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getDefaultDateRange() {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  return {
    from: firstOfMonth.toISOString().split("T")[0],
    to: today.toISOString().split("T")[0],
  }
}

export default function ProfitLossReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, refetch } = useProfitLossReport({
    startDate: dateRange.from,
    endDate: dateRange.to,
  })

  const reportData = useMemo(() => {
    if (!data) return []
    
    const items = []
    
    // Revenue Section
    items.push({ category: "REVENUE", description: "", amount: "", isHeader: true })
    items.push({ category: "", description: "Total Sales Revenue", amount: currency(data.totalSales || 0) })
    items.push({ category: "", description: "Less: Sales Returns", amount: `(${currency(data.salesReturns || 0)})` })
    items.push({ category: "", description: "Net Sales Revenue", amount: currency((data.totalSales || 0) - (data.salesReturns || 0)), isBold: true })
    
    // Cost of Goods Sold
    items.push({ category: "COST OF GOODS SOLD", description: "", amount: "", isHeader: true })
    items.push({ category: "", description: "Purchases", amount: currency(data.totalPurchases || 0) })
    items.push({ category: "", description: "Less: Purchase Returns", amount: `(${currency(data.purchaseReturns || 0)})` })
    items.push({ category: "", description: "Net Purchases", amount: currency((data.totalPurchases || 0) - (data.purchaseReturns || 0)), isBold: true })
    
    // Gross Profit
    const grossProfit = (data.totalSales || 0) - (data.salesReturns || 0) - (data.totalPurchases || 0) + (data.purchaseReturns || 0)
    items.push({ category: "GROSS PROFIT", description: "", amount: currency(grossProfit), isTotal: true })
    
    // Operating Expenses
    items.push({ category: "OPERATING EXPENSES", description: "", amount: "", isHeader: true })
    if (data.expensesByCategory && data.expensesByCategory.length > 0) {
      data.expensesByCategory.forEach((exp) => {
        items.push({ category: "", description: exp._id || exp.category || "Other", amount: currency(exp.totalAmount || 0) })
      })
    }
    items.push({ category: "", description: "Total Operating Expenses", amount: currency(data.totalExpenses || 0), isBold: true })
    
    // Net Profit
    const netProfit = grossProfit - (data.totalExpenses || 0)
    items.push({ category: "NET PROFIT / (LOSS)", description: "", amount: currency(netProfit), isTotal: true, isProfit: netProfit >= 0 })
    
    return items
  }, [data])

  const columns = [
    {
      header: "Category",
      accessor: "category",
      render: (row) => (
        <span className={`${row.isHeader ? "font-bold text-primary" : ""} ${row.isTotal ? "font-bold text-lg" : ""}`}>
          {row.category}
        </span>
      ),
    },
    {
      header: "Description",
      accessor: "description",
      render: (row) => (
        <span className={row.isBold ? "font-semibold" : ""}>
          {row.description}
        </span>
      ),
    },
    {
      header: "Amount (£)",
      accessor: "amount",
      align: "right",
      render: (row) => (
        <span className={`
          ${row.isHeader ? "" : ""}
          ${row.isTotal ? "font-bold text-lg" : ""}
          ${row.isBold ? "font-semibold" : ""}
          ${row.isProfit === false ? "text-red-600" : ""}
          ${row.isProfit === true ? "text-green-600" : ""}
        `}>
          {row.amount}
        </span>
      ),
    },
  ]

  const summary = [
    {
      label: "Total Revenue",
      value: currency(data?.totalSales || 0),
      color: "text-blue-600",
    },
    {
      label: "Total Costs",
      value: currency((data?.totalPurchases || 0) + (data?.totalExpenses || 0)),
      color: "text-orange-600",
    },
    {
      label: "Net Profit/Loss",
      value: currency(data?.netProfit || 0),
      color: (data?.netProfit || 0) >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Profit Margin",
      value: `${data?.profitMargin || 0}%`,
      color: "text-purple-600",
    },
  ]

  return (
    <ReportLayout
      title="Profit & Loss Report"
      description="Revenue, expenses, and net profit/loss for the selected period"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      loading={isLoading}
      summary={summary}
    >
      <PrintableTable
        columns={columns}
        data={reportData}
        loading={isLoading}
        enableSearch={false}
        enableSort={false}
      />
    </ReportLayout>
  )
}
