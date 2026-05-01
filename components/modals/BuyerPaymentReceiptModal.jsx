"use client"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Printer, FileText } from "lucide-react"

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

export function buildPrintHtml(receipt) {
  const distributionRows = (receipt.distributions || []).map((distribution) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #d1d5db;">${distribution.isAdvance ? "ADVANCE" : (distribution.saleNumber || distribution.reference || "-")}</td>
      <td style="padding: 10px; border: 1px solid #d1d5db; text-align: right;">${formatNumber(distribution.amountApplied)}</td>
      <td style="padding: 10px; border: 1px solid #d1d5db; text-align: right;">${formatNumber(distribution.previousBalance)}</td>
      <td style="padding: 10px; border: 1px solid #d1d5db; text-align: right;">${formatNumber(distribution.newBalance)}</td>
    </tr>
  `).join("")

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Receipt - ${receipt.receiptNumber}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; width: 100%; margin: 0; padding: 0; color: #111827; line-height: 1.5; font-size: 13px; }
        .container { max-width: 180mm; margin: 0 auto; }
        .header { border-bottom: 3px solid #111827; padding-bottom: 10px; margin-bottom: 25px; display:flex; justify-content:space-between; align-items:flex-end; }
        .header h1 { margin:0; font-size:26px; font-weight:800 }
        .receipt-no { font-family: monospace; font-size: 16px; font-weight:600; color:#4b5563 }
        
        .info-table { width:100%; border-collapse: collapse; margin-bottom: 18px; border: 1px solid #d1d5db; }
        .info-table th { text-align:left; padding: 8px; background:#f3f4f6; color:#4b5563; font-size:12px; border: 1px solid #d1d5db; width: 20%; }
        .info-table td { padding:8px; font-weight:600; border: 1px solid #d1d5db; }
        
        .items-table { width:100%; border-collapse: collapse; margin-top:10px; border: 1px solid #d1d5db; }
        .items-table th { background:#111827; color:white; padding:12px 10px; text-align:left; font-size:11px; text-transform:uppercase; border: 1px solid #111827; }
        .items-table td { border: 1px solid #d1d5db; }
        
        .summary-table { width:100%; border-collapse: collapse; margin-top: -1px; border: 1px solid #d1d5db; }
        .summary-table td { padding: 12px 10px; font-size: 12px; border: 1px solid #d1d5db; }
        .summary-label { background: #f3f4f6; color: #4b5563; font-weight: 700; text-transform: uppercase; width: 20%; }
        .summary-value { font-weight: 700; text-align: right; width: 13.33%; }

        .right { text-align:right }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <h1>PAYMENT RECEIPT</h1>
            <p style="margin:5px 0 0 0; color:#6b7280;">KI FASHION - Customer Copy</p>
          </div>
          <div class="receipt-no">${receipt.receiptNumber}</div>
        </div>

        <table class="info-table">
          <tbody>
            <tr>
              <th>Customer</th>
              <td>${receipt.customer?.name || 'Unknown'}</td>
              <th>Date</th>
              <td>${formatDateTime({ date: receipt.date, paymentDate: receipt.paymentDate })}</td>
            </tr>
            <tr>
              <th>Company</th>
              <td>${receipt.customer?.company || '-'}</td>
              <th>Method</th>
              <td>${(receipt.payment?.paymentMethod || 'cash').toUpperCase()}</td>
            </tr>
            <tr>
              <th>Customer ID</th>
              <td>${receipt.customer?.customerId || '-'}</td>
              <th>Amount Paid</th>
              <td>${formatNumber(receipt.payment?.totalAmount || 0)}</td>
            </tr>
          </tbody>
        </table>

        <table class="items-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th class="right">Amount Applied</th>
              <th class="right">Previous</th>
              <th class="right">Remaining</th>
            </tr>
          </thead>
          <tbody>
            ${distributionRows}
          </tbody>
        </table>

        <table class="summary-table">
          <tr>
            <td class="summary-label">Total Balance Before</td>
            <td class="summary-value">${formatNumber(receipt.balances?.before || 0)}</td>
            <td class="summary-label">Amount Paid</td>
            <td class="summary-value">${formatNumber(receipt.payment?.totalAmount || 0)}</td>
            <td class="summary-label">Total Balance After</td>
            <td class="summary-value">${formatNumber(receipt.balances?.after || 0)}</td>
          </tr>
        </table>

      </div>
    </body>
    </html>
  `
}

export const printReceipt = (receipt) => {
  if (!receipt) return
  const printWindow = window.open("", "_blank")
  if (!printWindow) return
  printWindow.document.write(buildPrintHtml(receipt))
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 250)
}

export default function BuyerPaymentReceiptModal({ open, onOpenChange, receipt }) {
  const handlePrint = () => {
    printReceipt(receipt)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Payment Receipt</DialogTitle>
              {receipt && <p className="text-sm text-muted-foreground font-mono mt-1">{receipt.receiptNumber || receipt.payment?.paymentNumber}</p>}
            </div>
          </div>
        </DialogHeader>

        {receipt ? (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Customer</p>
                <p className="font-semibold">{receipt.customer?.name || 'Unknown'}</p>
                {receipt.customer?.company && <p className="text-sm text-muted-foreground">{receipt.customer.company}</p>}
                {receipt.customer?.customerId && <p className="text-sm text-muted-foreground">Customer ID: {receipt.customer.customerId}</p>}
              </div>
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Receipt Details</p>
                <p className="font-semibold">{formatNumber(receipt.payment?.totalAmount || 0)}</p>
                <p className="text-sm text-muted-foreground">{formatDateTime({ date: receipt.date, paymentDate: receipt.paymentDate })}</p>
                <p className="text-sm text-muted-foreground uppercase">{(receipt.payment?.paymentMethod || 'cash').toUpperCase()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Total Balance Before</p>
                <p className="text-lg font-bold">{formatNumber(receipt.balances?.before || 0)}</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-4 border-l-2 border-primary/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Amount Paid</p>
                <p className="text-lg font-bold text-primary">{formatNumber(receipt.payment?.totalAmount || 0)}</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Total Balance After</p>
                <p className="text-lg font-bold">{formatNumber(receipt.balances?.after || 0)}</p>
              </div>
            </div>

            <div className="rounded-lg border divide-y">
              {(receipt.distributions || []).map((distribution, index) => {
                const ref = distribution.saleNumber || distribution.reference || '-'
                return (
                  <div key={`${ref}-${index}`} className="px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={distribution.isAdvance ? "border-amber-300 bg-amber-50 text-amber-700" : "border-blue-300 bg-blue-50 text-blue-700"}>
                          {distribution.isAdvance ? "Advance" : "Sale"}
                        </Badge>
                        <span className="font-medium">{distribution.isAdvance ? "Advance" : ref}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Previous: {formatNumber(distribution.previousBalance)} | New: {formatNumber(distribution.newBalance)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold tabular-nums">{formatNumber(distribution.amountApplied)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handlePrint} disabled={!receipt}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
