"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useCashInHandReport } from "@/lib/hooks/useReports"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import { getDefaultDateRange } from "@/lib/utils/getDefaultDateRange"
import toast from "react-hot-toast"

function currency(n) {
    const num = Number(n || 0)
    return `${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(date) {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("en-GB")
}

/** Filter out Ledger rows that were auto-created at sale time (already counted in Sales row) */
function applyDuplicateFilter(rows) {
    return rows.filter(r => !(r.transactionType === "Ledger" && r.isSaleTimePayment === true))
}

/** Recompute running balance from scratch on filtered rows */
function recomputeRunningBalance(rows) {
    let running = 0
    return rows.map((r) => {
        const inflow =
            (Number(r.salesCash || 0) + Number(r.salesBank || 0)) +
            (Number(r.ledgerCash || 0) + Number(r.ledgerBank || 0))
        const outflow = Number(r.expenseCash || 0) + Number(r.expenseBank || 0)
        running += inflow - outflow
        return { ...r, totalCashInHand: running }
    })
}

// Dash placeholder for columns that don't apply to a transaction type
const DASH = <span className="text-muted-foreground">—</span>

export default function CashInHandReportPage() {
    const [dateRange, setDateRange] = useState(getDefaultDateRange())
    const [hideDuplicates, setHideDuplicates] = useState(false)

    const { data, isLoading, isError, error, refetch } = useCashInHandReport({
        startDate: dateRange.from,
        endDate: dateRange.to,
    })

    const rawTransactions = useMemo(() => data?.transactions || [], [data])
    const serverSummary = useMemo(() => data?.summary || {}, [data])

    // Apply duplicate filter when toggled
    const transactions = useMemo(() => {
        if (!hideDuplicates) return rawTransactions
        return recomputeRunningBalance(applyDuplicateFilter(rawTransactions))
    }, [rawTransactions, hideDuplicates])

    // Recompute summary from the (possibly filtered) transactions
    const summary = useMemo(() => {
        if (!hideDuplicates) return serverSummary
        const s = { totalSalesCash: 0, totalSalesBank: 0, totalLedgerCash: 0, totalLedgerBank: 0, totalExpenseCash: 0, totalExpenseBank: 0 }
        for (const t of transactions) {
            if (t.transactionType === "Sales") { s.totalSalesCash += Number(t.salesCash || 0); s.totalSalesBank += Number(t.salesBank || 0) }
            if (t.transactionType === "Ledger") { s.totalLedgerCash += Number(t.ledgerCash || 0); s.totalLedgerBank += Number(t.ledgerBank || 0) }
            if (t.transactionType === "Expense") { s.totalExpenseCash += Number(t.expenseCash || 0); s.totalExpenseBank += Number(t.expenseBank || 0) }
        }
        s.netCashInHand = (s.totalSalesCash + s.totalSalesBank) + (s.totalLedgerCash + s.totalLedgerBank) - (s.totalExpenseCash + s.totalExpenseBank)
        return s
    }, [hideDuplicates, serverSummary, transactions])

    // Summary card values
    const totalCashIn = (summary.totalSalesCash || 0) + (summary.totalSalesBank || 0)
    const totalLedgerIn = (summary.totalLedgerCash || 0) + (summary.totalLedgerBank || 0)
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
                    Ledger: "bg-blue-100 text-blue-700",
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
        // Ledger columns (buyer payments received)
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
        // Running cumulative cash-in-hand balance
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
            label: "Buyer Payments Received",
            value: currency(totalLedgerIn),
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
            subtext: "Sales + Buyer Payments − Expenses",
        },
    ]

    return (
        <ReportLayout
            title="Cash in Hand Report"
            description="Unified view of sales inflows, buyer payments, and expenses for the selected period"
            dateRange={dateRange}
            onDateChange={setDateRange}
            onRefresh={refetch}
            onExport={handleExport}
            loading={isLoading}
            error={isError ? error : null}
            summary={summaryCards}
        >
            {/* Toggle for hiding duplicate same-day ledger entries */}
            <div className="flex items-center gap-2 mb-3 print:hidden">
                <input
                    id="hideDuplicates"
                    type="checkbox"
                    checked={hideDuplicates}
                    onChange={(e) => setHideDuplicates(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="hideDuplicates" className="text-sm font-medium select-none cursor-pointer">
                    Hide sale-day duplicates
                </label>
                <span className="text-xs text-muted-foreground">
                    (removes ledger entries that duplicate at-sale payments on the same day)
                </span>
            </div>

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