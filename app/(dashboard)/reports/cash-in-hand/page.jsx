"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useCashInHandReport } from "@/lib/hooks/useReports"
import { exportToExcelWithTotals } from "@/lib/utils/exportToExcel"
import { exportToPDF } from "@/lib/utils/pdfExport"
import { getDefaultDateRange } from "@/lib/utils/getDefaultDateRange"
import { useAuthStore } from "@/store/store"
import toast from "react-hot-toast"

function currency(n) {
    const num = Number(n || 0)
    return `${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(date) {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("en-GB")
}

function resolveTransactionVat(row) {
    const directVat = Number(row?.vat || 0)
    if (directVat > 0) return directVat

    if (row?.transactionType !== "Sales") return 0

    const totalVat = Number(row?.saleTotalVAT || 0)
    if (totalVat > 0) return totalVat

    const totalTax = Number(row?.saleTotalTax || 0)
    if (totalTax > 0) return totalTax

    const subtotal = Number(row?.saleSubtotal || 0)
    const discount = Number(row?.saleDiscount || 0)
    const grandTotal = Number(row?.saleGrandTotal || 0)
    const shipping = Number(row?.saleShippingCost || 0)
    const fallbackVat = grandTotal - (subtotal - discount) - shipping

    return fallbackVat > 0 ? fallbackVat : 0
}

// Dash placeholder for columns that don't apply to a transaction type
const DASH = <span className="text-muted-foreground">—</span>

export default function CashInHandReportPage() {
    const user = useAuthStore((s) => s.user)
    const isEmployee = user?.role === "employee"

    const [dateRange, setDateRange] = useState(() => {
        const defaults = getDefaultDateRange()
        if (isEmployee) {
            return { from: defaults.to, to: defaults.to }
        }
        return defaults
    })

    const { data, isLoading, isError, error, refetch } = useCashInHandReport({
        startDate: dateRange.from,
        endDate: dateRange.to,
    })

    const transactions = useMemo(() => data?.transactions || [], [data])
    const summary = useMemo(() => data?.summary || {}, [data])

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

    const handleDownloadPDF = async () => {
        try {
            const result = await exportToPDF({
                title: "Cash in Hand Report",
                columns: columns,
                data: transactions,
                totalsRow: totalsRow,
                dateRange: dateRange,
                filename: `Cash_In_Hand_Report_${dateRange.from}_${dateRange.to}`
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
            header: "ID",
            accessor: "id",
            render: (row) => (
                <span className="">{row.id || "—"}</span>
            ),
            pdfValue: (row) => row.id || "—"
        },
        {
            header: "Transaction Type",
            accessor: "transactionType",
            render: (row) => row.transactionType === "Expense" ? (row.transactionTypeLabel || row.costType || "Expense") : row.transactionType,
            pdfValue: (row) => row.transactionType === "Expense" ? (row.transactionTypeLabel || row.costType || "Expense") : row.transactionType,
            excelValue: (row) => row.transactionType === "Expense" ? (row.transactionTypeLabel || row.costType || "Expense") : row.transactionType
        },
        {
            header: "Date",
            accessor: "date",
            render: (row) => formatDate(row.date),
            pdfValue: (row) => formatDate(row.date)
        },
        {
            header: "Name",
            accessor: "name",
            render: (row) => row.transactionType === "Expense" ? row.costType || row.name || "—" : row.company || row.name || "—",
            pdfValue: (row) => row.transactionType === "Expense" ? row.costType || row.name || "—" : row.company || row.name || "—",
            excelValue: (row) => row.transactionType === "Expense" ? row.costType || row.name || "—" : row.company || row.name || "—"
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
            pdfValue: (row) => row.transactionType === "Sales" ? currency(row.salesCash) : "—"
        },
        {
            header: "Sales Bank",
            accessor: "salesBank",
            align: "right",
            render: (row) =>
                row.transactionType === "Sales"
                    ? <span className="text-emerald-700 font-medium">{currency(row.salesBank)}</span>
                    : DASH,
            pdfValue: (row) => row.transactionType === "Sales" ? currency(row.salesBank) : "—"
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
            pdfValue: (row) => row.transactionType === "Sales" ? currency(row.salesRemainingBalance) : "—"
        },
        // VAT column (sales VAT collected or expense VAT paid)
        {
            header: "VAT",
            accessor: "vat",
            align: "right",
            render: (row) =>
                (row.transactionType === "Sales" || row.transactionType === "Expense")
                    ? <span className="font-medium">{currency(resolveTransactionVat(row))}</span>
                    : DASH,
            pdfValue: (row) => (row.transactionType === "Sales" || row.transactionType === "Expense") ? currency(resolveTransactionVat(row)) : "—"
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
            pdfValue: (row) => row.transactionType === "Ledger" ? currency(row.ledgerCash) : "—"
        },
        {
            header: "Ledger Bank",
            accessor: "ledgerBank",
            align: "right",
            render: (row) =>
                row.transactionType === "Ledger"
                    ? <span className="text-blue-700 font-medium">{currency(row.ledgerBank)}</span>
                    : DASH,
            pdfValue: (row) => row.transactionType === "Ledger" ? currency(row.ledgerBank) : "—"
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
            pdfValue: (row) => row.transactionType === "Expense" ? currency(row.expenseCash) : "—"
        },
        {
            header: "Expense Bank",
            accessor: "expenseBank",
            align: "right",
            render: (row) =>
                row.transactionType === "Expense"
                    ? <span className="text-red-700 font-medium">{currency(row.expenseBank)}</span>
                    : DASH,
            pdfValue: (row) => row.transactionType === "Expense" ? currency(row.expenseBank) : "—"
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
            pdfValue: (row) => currency(row.totalCashInHand || 0)
        },
    ]

    // Column totals row (summing numeric columns)
    const totalsRow = {
        sno: "TOTAL",
        salesCash: currency(summary.totalSalesCash || 0),
        salesBank: currency(summary.totalSalesBank || 0),
        salesRemainingBalance: currency(transactions.reduce((s, t) => s + (t.salesRemainingBalance || 0), 0)),
        ledgerCash: currency(summary.totalLedgerCash || 0),
        ledgerBank: currency(summary.totalLedgerBank || 0),
        expenseCash: currency(summary.totalExpenseCash || 0),
        expenseBank: currency(summary.totalExpenseBank || 0),
        vat: currency(transactions.reduce((s, t) => s + resolveTransactionVat(t), 0)),
        totalCashInHand: currency(netCashInHand),
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
            onDownloadPDF={handleDownloadPDF}
            loading={isLoading}
            error={isError ? error : null}
            summary={summaryCards}
            hideDateFilter={isEmployee}
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
                    { title: "Total Cash in Hand", value: "totalCashInHand" },
                ]}
                searchableColumns={["id", "name", "transactionType", "transactionTypeLabel"]}
                pageSize={100}
            />
        </ReportLayout>
    )
}