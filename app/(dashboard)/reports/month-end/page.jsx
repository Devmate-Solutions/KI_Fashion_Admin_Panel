"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useMonthEndDetailedReport } from "@/lib/hooks/useReports"
import { exportMonthEndToExcel } from "@/lib/utils/exportToExcel"
import { exportToPDF } from "@/lib/utils/pdfExport"
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

export default function MonthEndReportPage() {
    const [dateRange, setDateRange] = useState(() => getDefaultDateRange())

    const { data: reportData, isLoading, isError, error, refetch } = useMonthEndDetailedReport({
        startDate: dateRange.from,
        endDate: dateRange.to,
    })

    const data = useMemo(() => reportData || [], [reportData])

    const handleExport = async () => {
        try {
            // Calculate Summary Data for Excel
            const totalSell = data.reduce((s, r) => s + (r.totalSell || 0), 0)
            const sellInLossValue = data.filter(r => r.pnl < 0).reduce((s, r) => s + (r.totalSell || 0), 0)
            const sellInProfitValue = data.filter(r => r.pnl >= 0).reduce((s, r) => s + (r.totalSell || 0), 0)

            const totalProfit = data.filter(r => r.pnl > 0).reduce((s, r) => s + (r.pnl || 0), 0)
            const totalLoss = data.filter(r => r.pnl < 0).reduce((s, r) => s + (r.pnl || 0), 0)
            const netProfit = data.reduce((s, r) => s + (r.pnl || 0), 0)

            const summary = {
                dateRange: `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`,
                totalSell,
                sellInLossValue,
                sellInLossPercent: totalSell > 0 ? (sellInLossValue / totalSell) : 0,
                sellInProfitValue,
                sellInProfitPercent: totalSell > 0 ? (sellInProfitValue / totalSell) : 0,
                totalProfit,
                totalLoss,
                netProfit,
                netProfitPercent: totalSell > 0 ? (netProfit / totalSell) : 0,
                cAmount: totalSell - sellInLossValue,
                commission: 0, // Placeholder as analyzed
                totalReturn: 0 // Placeholder
            }

            const result = await exportMonthEndToExcel(
                data,
                columns,
                totalsRow,
                summary,
                `Month_End_Report_${dateRange.from}_${dateRange.to}`
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

    const handleDownloadPDF = async () => {
        try {
            const result = await exportToPDF({
                title: "Month-end Detailed Report",
                columns: columns,
                data: data,
                totalsRow: totalsRow,
                dateRange: dateRange,
                filename: `Month_End_Report_${dateRange.from}_${dateRange.to}`,
                orientation: 'landscape'
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
            header: "Date",
            accessor: "date",
            render: (row) => formatDate(row.date),
            pdfValue: (row) => formatDate(row.date)
        },
        {
            header: "SellingID",
            accessor: "sellingId",
            render: (row) => (
                <Link href={`/selling/${row.saleId}`} className="text-blue-600 hover:underline font-mono text-[11px]">
                    {row.sellingId}
                </Link>
            ),
            pdfValue: (row) => row.sellingId
        },
        {
            header: "Buyer",
            accessor: "buyer",
            render: (row) => row.buyer || "—",
            pdfValue: (row) => row.buyer || "—"
        },
        {
            header: "Product Code",
            accessor: "productCode",
            render: (row) => (
                <Link href={`/stock/product-history?productId=${row.productId}`} className="text-blue-600 hover:underline font-medium">
                    {row.productCode}
                </Link>
            ),
            pdfValue: (row) => row.productCode
        },
        {
            header: "Item Sold",
            accessor: "itemSold",
            align: "center",
            render: (row) => row.itemSold,
            pdfValue: (row) => row.itemSold
        },
        {
            header: "Selling Price",
            accessor: "sellingPrice",
            align: "right",
            render: (row) => currency(row.sellingPrice),
            pdfValue: (row) => currency(row.sellingPrice)
        },
        {
            header: "Total Sell",
            accessor: "totalSell",
            align: "right",
            render: (row) => <span className="font-semibold">{currency(row.totalSell)}</span>,
            pdfValue: (row) => currency(row.totalSell)
        },
        {
            header: "Landed Price",
            accessor: "landedPrice",
            align: "right",
            render: (row) => currency(row.landedPrice),
            pdfValue: (row) => currency(row.landedPrice)
        },
        {
            header: "Difference",
            accessor: "difference",
            align: "right",
            render: (row) => (
                <span className={row.difference >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {currency(row.difference)}
                </span>
            ),
            pdfValue: (row) => currency(row.difference)
        },
        {
            header: "PNL",
            accessor: "pnl",
            align: "right",
            render: (row) => (
                <span className={`font-bold ${row.pnl >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {currency(row.pnl)}
                </span>
            ),
            pdfValue: (row) => currency(row.pnl)
        },
        // {
        //     header: "BuyingID",
        //     accessor: "buyingId",
        //     render: (row) => row.buyingId || "—",
        //     pdfValue: (row) => row.buyingId || "—"
        // },
        // {
        //     header: "Supplier",
        //     accessor: "supplier",
        //     render: (row) => row.supplier || "—",
        //     pdfValue: (row) => row.supplier || "—"
        // },
        {
            header: "Remarks",
            accessor: "remarks",
            render: (row) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${row.remarks === 'Profit' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {row.remarks}
                </span>
            ),
            pdfValue: (row) => row.remarks
        },
        {
            header: "Sell in Loss",
            accessor: "sellInLoss",
            align: "right",
            render: (row) => currency(row.sellInLoss),
            pdfValue: (row) => currency(row.sellInLoss)
        },
    ]

    const totalsRow = {
        date: "TOTAL",
        itemSold: data.reduce((s, r) => s + (r.itemSold || 0), 0),
        totalSell: currency(data.reduce((s, r) => s + (r.totalSell || 0), 0)),
        pnl: currency(data.reduce((s, r) => s + (r.pnl || 0), 0)),
        sellInLoss: currency(data.reduce((s, r) => s + (r.sellInLoss || 0), 0)),
    }

    const summaryCards = [
        {
            label: "Total Items Sold",
            value: data.reduce((s, r) => s + (r.itemSold || 0), 0),
            color: "text-blue-600",
        },
        {
            label: "Total Sales Revenue",
            value: currency(data.reduce((s, r) => s + (r.totalSell || 0), 0)),
            color: "text-emerald-600",
        },
        {
            label: "Total Net Profit/Loss",
            value: currency(data.reduce((s, r) => s + (r.pnl || 0), 0)),
            color: data.reduce((s, r) => s + (r.pnl || 0), 0) >= 0 ? "text-emerald-700" : "text-red-600",
        },
        {
            label: "Total Landed Cost",
            value: currency(data.reduce((s, r) => s + (r.sellInLoss || 0), 0)),
            color: "text-amber-700",
        },
    ]

    return (
        <ReportLayout
            title="Month-end Detailed Report"
            description="Detailed line-item analysis of sales with profitability and supplier information"
            dateRange={dateRange}
            onDateChange={setDateRange}
            onRefresh={refetch}
            onExport={handleExport}
            onDownloadPDF={handleDownloadPDF}
            loading={isLoading}
            error={isError ? error : null}
            summary={summaryCards}
        >
            <PrintableTable
                columns={columns}
                data={data}
                loading={isLoading}
                enableSearch={true}
                showTotals={true}
                totalsRow={totalsRow}
                totalColumns={[
                    { title: "Total Revenue", value: "totalSell" },
                    { title: "Total PNL", value: "pnl" },
                ]}
                searchableColumns={["sellingId", "buyer", "productCode", "buyingId", "supplier"]}
                pageSize={100}
            />
        </ReportLayout>
    )
}
