"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useCashInHandReport } from "@/lib/hooks/useReports"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import toast from "react-hot-toast"

function currency(n) {
  const num = Number(n || 0)
  return `${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

// Dash placeholder for columns that don't apply to a transaction type
const DASH = <span className="text-muted-foreground">—</span>

export default function CashInHandReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, refetch } = useCashInHandReport({
    startDate: dateRange.from,
    endDate: dateRange.to,
  })

  const transactions = useMemo(() => data?.transactions || [], [data])
  const summary = useMemo(() => data?.summary || {}, [data])

  // Summary card values
  const totalCashIn = (summary.totalSalesCash || 0) + (summary.totalSalesBank || 0)
  const totalLedgerOut = (summary.totalLedgerCash || 0) + (summary.totalLedgerBank || 0)
  const totalExpenseOut = (summary.totalExpenseCash || 0) + (summary.totalExpenseBank || 0)
  const netCashInHand = summary.netCashInHand || 0

  const handleExport = async () => {
    try {
      const result = await exportToExcelWithTotals(
        transactions,
        columns,
        totalsRow,
        `Cash_In_Hand_Report_${dateRange.from}_${dateRange.to}`
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
      header: "ID",
      accessor: "id",
      render: (row) => (
        <span className="">{row.id || "—"}</span>
      ),
    },
    {
      header: "Transaction Type",
      accessor: "transactionType",
      render: (row) => {
        const styles = {
          Sales: "bg-emerald-100 text-emerald-700",
          "Ledger": "bg-blue-100 text-blue-700",
          Expense: "bg-red-100 text-red-700",
        }
        const cls = styles[row.transactionType] || "bg-gray-100 text-gray-700"
        return (
          <div>

            {row.transactionType}
          </div>
          
        )
      },
    },
    {
      header: "Date",
      accessor: "date",
      render: (row) => formatDate(row.date),
    },
    {
      header: "Name",
      accessor: "name",
      render: (row) => row.name || "—",
    },
    // Sales columns
    {
      header: "Sales Cash",
      accessor: "salesCash",
      align: "right",
      render: (row) =>
        row.transactionType === "Sales"
          ? <span className="text-emerald-700 font-medium">{currency(row.salesCash)}</span>
          : DASH,
    },
    {
      header: "Sales Bank",
      accessor: "salesBank",
      align: "right",
      render: (row) =>
        row.transactionType === "Sales"
          ? <span className="text-emerald-700 font-medium">{currency(row.salesBank)}</span>
          : DASH,
    },
    {
      header: "Sales Remaining",
      accessor: "salesRemainingBalance",
      align: "right",
      render: (row) =>
        row.transactionType === "Sales"
          ? <span className={row.salesRemainingBalance > 0 ? "text-amber-600" : "text-muted-foreground"}>
              {currency(row.salesRemainingBalance)}
            </span>
          : DASH,
    },
    // Ledger columns
    {
      header: "Ledger Cash",
      accessor: "ledgerCash",
      align: "right",
      render: (row) =>
        row.transactionType === "Ledger"
          ? <span className="text-blue-700 font-medium">{currency(row.ledgerCash)}</span>
          : DASH,
    },
    {
      header: "Ledger Bank",
      accessor: "ledgerBank",
      align: "right",
      render: (row) =>
        row.transactionType === "Ledger"
          ? <span className="text-blue-700 font-medium">{currency(row.ledgerBank)}</span>
          : DASH,
    },
    // Expense columns
    {
      header: "Expense Cash",
      accessor: "expenseCash",
      align: "right",
      render: (row) =>
        row.transactionType === "Expense"
          ? <span className="text-red-700 font-medium">{currency(row.expenseCash)}</span>
          : DASH,
    },
    {
      header: "Expense Bank",
      accessor: "expenseBank",
      align: "right",
      render: (row) =>
        row.transactionType === "Expense"
          ? <span className="text-red-700 font-medium">{currency(row.expenseBank)}</span>
          : DASH,
    },
    // Running net (same value for all rows = period net)
    {
      header: "Cash in Hand",
      accessor: "totalCashInHand",
      align: "right",
      render: (row) => {
        const val = row.totalCashInHand || 0
        return (
          <span className={`font-bold ${val >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {currency(val)}
          </span>
        )
      },
    },
  ]

  // Column totals row (summing numeric columns)
  const totalsRow = {
    sno: "TOTAL",
    salesCash: summary.totalSalesCash || 0,
    salesBank: summary.totalSalesBank || 0,
    salesRemainingBalance: transactions.reduce((s, t) => s + (t.salesRemainingBalance || 0), 0),
    ledgerCash: summary.totalLedgerCash || 0,
    ledgerBank: summary.totalLedgerBank || 0,
    expenseCash: summary.totalExpenseCash || 0,
    expenseBank: summary.totalExpenseBank || 0,
    totalCashInHand: netCashInHand,
  }

  const summaryCards = [
    {
      label: "Total Cash In (Sales)",
      value: currency(totalCashIn),
      color: "text-emerald-600",
      subtext: `Cash: ${currency(summary.totalSalesCash || 0)} | Bank: ${currency(summary.totalSalesBank || 0)}`,
    },
    {
      label: "Ledger Paid Out",
      value: currency(totalLedgerOut),
      color: "text-blue-600",
      subtext: `Cash: ${currency(summary.totalLedgerCash || 0)} | Bank: ${currency(summary.totalLedgerBank || 0)}`,
    },
    {
      label: "Expenses Paid Out",
      value: currency(totalExpenseOut),
      color: "text-red-600",
      subtext: `Cash: ${currency(summary.totalExpenseCash || 0)} | Bank: ${currency(summary.totalExpenseBank || 0)}`,
    },
    {
      label: "Net Cash in Hand",
      value: currency(netCashInHand),
      color: netCashInHand >= 0 ? "text-emerald-700" : "text-red-600",
      subtext: "Sales − Ledger Payments − Expenses",
    },
  ]

  return (
    <ReportLayout
      title="Cash in Hand Report"
      description="Unified view of sales inflows, supplier payments, and expenses for the selected period"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      onExport={handleExport}
      loading={isLoading}
      summary={summaryCards}
    >
        {/* {JSON.stringify(transactions)} */}
      <PrintableTable
        columns={columns}
        data={transactions}
        loading={isLoading}
        enableSearch={true}
        enableSort={false}
        showTotals={true}
        totalsRow={totalsRow}
        totalColumns={[
          { title: "Total Transactions", key: "sno", value: transactions.length },
        ]}
        searchableColumns={["id", "name", "transactionType"]}
        pageSize={100}
      />

    </ReportLayout>
  )
}
