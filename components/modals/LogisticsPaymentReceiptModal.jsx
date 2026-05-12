"use client"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Printer, FileText, Box } from "lucide-react"

function formatNumber(n) {
  const num = Number(n || 0)
  return num.toFixed(2)
}

function formatDateTime(value) {
  const dateTime = value?.createdAt || value?.date || value?.paymentDate
  if (!dateTime) return "-"
  const d = new Date(dateTime)
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })
  const date = d.toLocaleDateString("en-GB")
  return `${date} ${time}`
}

function buildPrintHtml(receipt) {
  const distributionRows = (receipt.distributions || []).map((distribution) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${distribution.orderNumber || distribution.dispatchOrderId?.orderNumber || "-"}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${distribution.boxesCount || 0}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${distribution.shippingInfo?.destination || "-"}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">£${formatNumber(distribution.amountApplied)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">£${formatNumber(distribution.previousBalance)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">£${formatNumber(distribution.newBalance)}</td>
    </tr>
  `).join("")

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Logistics Payment Receipt - ${receipt.receiptNumber}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        body { 
          font-family: 'Segoe UI', IBM Plex Sans, Arial, sans-serif; 
          width: 100%; 
          margin: 0; 
          padding: 0; 
          color: #111827; 
          line-height: 1.5;
          font-size: 13px;
        }
        .container {
          max-width: 180mm;
          margin: 0 auto;
        }
        .header { 
          border-bottom: 3px solid #111827; 
          padding-bottom: 10px; 
          margin-bottom: 25px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em; }
        .receipt-no { font-family: monospace; font-size: 16px; font-weight: 600; color: #4b5563; }
        
        .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #f9fafb; }
        .card h3 { margin: 0 0 8px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }
        .card p { margin: 3px 0; font-size: 14px; }

        .info-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin: 0 0 18px 0;
          border: 1px solid #d1d5db;
        }
        .info-table th,
        .info-table td {
          border: 1px solid #d1d5db;
          padding: 8px 10px;
          font-size: 12px;
          vertical-align: middle;
        }
        .info-table th {
          width: 20%;
          background: #f3f4f6;
          color: #4b5563;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 700;
          text-align: left;
        }
        .info-table td {
          color: #111827;
          font-weight: 600;
        }
        
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #111827; color: white; padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
        .right { text-align: right; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 11px; display: flex; justify-content: space-between; }
        
        .summary-box {
          margin-top: 20px;
          display: flex;
          justify-content: flex-end;
        }
        .summary-table {
          width: 250px;
        }
        .summary-table tr td {
          padding: 8px 0;
          font-size: 14px;
        }
        .summary-table tr td:last-child {
          text-align: right;
          font-weight: 700;
        }
        .total-row {
          border-top: 2px solid #111827;
          font-size: 18px !important;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <h1>LOGISTICS PAYMENT RECEIPT</h1>
            <p style="margin: 5px 0 0 0; color: #6b7280;">KI FASHION - Logistics Payment Copy</p>
          </div>
          <div class="receipt-no">${receipt.receiptNumber}</div>
        </div>

        <table class="info-table" aria-label="Receipt summary information">
          <tbody>
            <tr>
              <th>Logistics Company</th>
              <td>${receipt.logisticsCompanyId?.name || "Unknown Company"}</td>
              <th>Date</th>
              <td>${formatDateTime({ paymentDate: receipt.paymentDate })}</td>
            </tr>
            <tr>
              <th>Contact</th>
              <td>${receipt.logisticsCompanyId?.email || "-"}</td>
              <th>Method</th>
              <td>${(receipt.paymentMethod || "cash").toUpperCase()}</td>
            </tr>
            <tr>
              <th>Total Amount</th>
              <td>£${formatNumber(receipt.totalAmount)}</td>
              <th>Total Boxes</th>
              <td>${receipt.totalBoxes || 0}</td>
            </tr>
            <tr>
              <th>Balance Before</th>
              <td>£${formatNumber(Math.abs(receipt.balanceBefore || 0))}</td>
              <th>Balance After</th>
              <td>£${formatNumber(Math.abs(receipt.balanceAfter || 0))}</td>
            </tr>
          </tbody>
        </table>

        <table>
          <thead>
            <tr>
              <th>Order Number</th>
              <th class="right">Boxes</th>
              <th>Destination</th>
              <th class="right">Amount Applied</th>
              <th class="right">Previous Balance</th>
              <th class="right">Remaining Balance</th>
            </tr>
          </thead>
          <tbody>
            ${distributionRows}
          </tbody>
        </table>
       
      </div>
    </body>
    </html>
  `;
}

export default function LogisticsPaymentReceiptModal({ open, onOpenChange, receipt }) {
  const handlePrint = () => {
    if (!receipt) return
    const printWindow = window.open("", "_blank")
    if (!printWindow) return
    printWindow.document.write(buildPrintHtml(receipt))
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[920px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <DialogTitle>Logistics Payment Receipt</DialogTitle>
              {receipt && <p className="text-sm text-muted-foreground font-mono mt-1">{receipt.receiptNumber}</p>}
            </div>
          </div>
        </DialogHeader>

        {receipt ? (
          <div className="space-y-4 py-2">
            {/* Header Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Logistics Company</p>
                <p className="font-semibold">{receipt.logisticsCompanyId?.name || "Unknown Company"}</p>
                {receipt.logisticsCompanyId?.email && <p className="text-sm text-muted-foreground">{receipt.logisticsCompanyId.email}</p>}
                {receipt.logisticsCompanyId?.phone && <p className="text-sm text-muted-foreground">{receipt.logisticsCompanyId.phone}</p>}
              </div>
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Receipt Details</p>
                <p className="font-semibold">£{formatNumber(receipt.totalAmount)}</p>
                <p className="text-sm text-muted-foreground">{formatDateTime({ paymentDate: receipt.paymentDate })}</p>
                <Badge variant={receipt.paymentMethod === 'cash' ? 'default' : 'secondary'}>
                  {(receipt.paymentMethod || "cash").toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg bg-blue-50 p-3 border border-blue-100">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Total Boxes</p>
                <p className="text-xl font-bold text-blue-600">{receipt.totalBoxes || 0}</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-3 border border-purple-100">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Orders Affected</p>
                <p className="text-xl font-bold text-purple-600">{receipt.ordersAffected || 0}</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 border border-red-100">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Balance Before</p>
                <p className={`text-xl font-bold ${(receipt.balanceBefore || 0) >= 0 ? "text-red-600" : "text-green-600"}`}>
                  £{formatNumber(Math.abs(receipt.balanceBefore || 0))}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-3 border border-green-100">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Balance After</p>
                <p className={`text-xl font-bold ${(receipt.balanceAfter || 0) >= 0 ? "text-red-600" : "text-green-600"}`}>
                  £{formatNumber(Math.abs(receipt.balanceAfter || 0))}
                </p>
              </div>
            </div>

            {/* Distributions Table */}
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Order Number</th>
                      <th className="px-4 py-3 text-right font-semibold">Boxes</th>
                      <th className="px-4 py-3 text-left font-semibold">Destination</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount Applied</th>
                      <th className="px-4 py-3 text-right font-semibold">Prev. Balance</th>
                      <th className="px-4 py-3 text-right font-semibold">New Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(receipt.distributions || []).map((distribution, index) => {
                      const orderNumber = distribution.orderNumber || distribution.dispatchOrderId?.orderNumber || "-"
                      return (
                        <tr key={`${orderNumber}-${index}`} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-blue-600">{orderNumber}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <div className="flex items-center justify-end gap-1">
                              <Box className="h-4 w-4 text-muted-foreground" />
                              {distribution.boxesCount || 0}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {distribution.shippingInfo?.destination || "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-green-600">
                            £{formatNumber(distribution.amountApplied)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                            £{formatNumber(distribution.previousBalance)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className={formatNumber(distribution.newBalance) > 0 ? "text-red-600 font-semibold" : "text-green-600"}>
                              £{formatNumber(distribution.newBalance)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {receipt.notes && (
              <div className="rounded-lg bg-muted/30 p-3 text-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</p>
                <p className="text-muted-foreground">{receipt.notes}</p>
              </div>
            )}

            {/* Receipt Metadata */}
            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <p>Receipt #: {receipt.receiptNumber}</p>
              <p>Created by: {receipt.createdBy?.name || "System"}</p>
              <p>Status: <Badge variant="outline" className="ml-1">{receipt.status}</Badge></p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>No receipt data available</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
