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

function buildPrintHtml(receipt) {
  const distributionRows = (receipt.distributions || []).map((distribution) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${distribution.isAdvance ? "SUPPLIER ADVANCE" : (distribution.orderNumber || distribution.dispatchOrderId?.orderNumber || "-")}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatNumber(distribution.amountApplied)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatNumber(distribution.previousBalance)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatNumber(distribution.newBalance)}</td>
    </tr>
  `).join("")

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Supplier Payment Receipt - ${receipt.receiptNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 860px; margin: 0 auto; padding: 24px; color: #111827; }
        .header { border-bottom: 2px solid #1f2937; padding-bottom: 16px; margin-bottom: 24px; }
        .header h1 { margin: 0 0 4px 0; font-size: 24px; }
        .meta { color: #6b7280; font-size: 13px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 14px; }
        .card h3 { margin: 0 0 10px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; }
        .card p { margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
        th { background: #111827; color: white; padding: 10px; text-align: left; font-size: 12px; }
        .right { text-align: right; }
        .footer { margin-top: 24px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>SUPPLIER PAYMENT RECEIPT</h1>
        <div class="meta">Receipt ${receipt.receiptNumber}</div>
      </div>

      <div class="grid">
        <div class="card">
          <h3>Supplier</h3>
          <p><strong>${receipt.supplierId?.name || "Unknown Supplier"}</strong></p>
          ${receipt.supplierId?.company ? `<p>${receipt.supplierId.company}</p>` : ""}
          ${receipt.supplierId?.supplierId ? `<p>ID: ${receipt.supplierId.supplierId}</p>` : ""}
        </div>
        <div class="card">
          <h3>Receipt Details</h3>
          <p><strong>Total:</strong> ${formatNumber(receipt.totalAmount)}</p>
          <p><strong>Date:</strong> ${formatDateTime({ paymentDate: receipt.paymentDate })}</p>
          <p><strong>Method:</strong> ${(receipt.paymentMethodSummary || "cash").toUpperCase()}</p>
          <p><strong>Created By:</strong> ${receipt.createdBy?.name || "System"}</p>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3>Balance Before</h3>
          <p><strong>${formatNumber(Math.abs(receipt.balanceBefore || 0))}</strong></p>
        </div>
        <div class="card">
          <h3>Balance After</h3>
          <p><strong>${formatNumber(Math.abs(receipt.balanceAfter || 0))}</strong></p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Dispatch Order</th>
            <th class="right">Amount Applied</th>
            <th class="right">Previous Balance</th>
            <th class="right">New Balance</th>
          </tr>
        </thead>
        <tbody>
          ${distributionRows}
        </tbody>
      </table>

      ${receipt.notes ? `<div class="card" style="margin-top: 18px;"><h3>Notes</h3><p>${receipt.notes}</p></div>` : ""}

      <div class="footer">
        <p>Orders affected: ${receipt.ordersAffected || 0}</p>
        <p>Advance amount: ${formatNumber(receipt.advanceAmount || 0)}</p>
      </div>
    </body>
    </html>
  `
}

export default function SupplierPaymentReceiptModal({ open, onOpenChange, receipt }) {
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
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Supplier Payment Receipt</DialogTitle>
              {receipt && <p className="text-sm text-muted-foreground font-mono mt-1">{receipt.receiptNumber}</p>}
            </div>
          </div>
        </DialogHeader>

        {receipt ? (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Supplier</p>
                <p className="font-semibold">{receipt.supplierId?.name || "Unknown Supplier"}</p>
                {receipt.supplierId?.company && <p className="text-sm text-muted-foreground">{receipt.supplierId.company}</p>}
                {receipt.supplierId?.supplierId && <p className="text-sm text-muted-foreground">Supplier ID: {receipt.supplierId.supplierId}</p>}
              </div>
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Receipt Details</p>
                <p className="font-semibold">{formatNumber(receipt.totalAmount)}</p>
                <p className="text-sm text-muted-foreground">{formatDateTime({ paymentDate: receipt.paymentDate })}</p>
                <p className="text-sm text-muted-foreground uppercase">{receipt.paymentMethodSummary || "cash"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Balance Before</p>
                <p className={`text-lg font-bold ${(receipt.balanceBefore || 0) >= 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatNumber(Math.abs(receipt.balanceBefore || 0))} 
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Balance After</p>
                <p className={`text-lg font-bold ${(receipt.balanceAfter || 0) >= 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatNumber(Math.abs(receipt.balanceAfter || 0))} 
                </p>
              </div>
            </div>

            <div className="rounded-lg border divide-y">
              {(receipt.distributions || []).map((distribution, index) => {
                const orderNumber = distribution.orderNumber || distribution.dispatchOrderId?.orderNumber || "-"
                return (
                  <div key={`${orderNumber}-${index}`} className="px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={distribution.isAdvance ? "border-amber-300 bg-amber-50 text-amber-700" : "border-blue-300 bg-blue-50 text-blue-700"}>
                          {distribution.isAdvance ? "Advance" : "Dispatch Order"}
                        </Badge>
                        <span className="font-medium">{distribution.isAdvance ? "Supplier advance" : orderNumber}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Previous: {formatNumber(distribution.previousBalance)} | New: {formatNumber(distribution.newBalance)}
                        {distribution.ledgerEntryId?.entryNumber ? ` | Entry ${distribution.ledgerEntryId.entryNumber}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold tabular-nums">{formatNumber(distribution.amountApplied)}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Orders Affected</p>
                <p className="text-lg font-bold">{receipt.ordersAffected || 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Advance Amount</p>
                <p className="text-lg font-bold text-amber-700">{formatNumber(receipt.advanceAmount || 0)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Created By</p>
                <p className="text-lg font-bold">{receipt.createdBy?.name || "System"}</p>
              </div>
            </div>

            {receipt.notes ? (
              <div className="rounded-lg border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Notes</p>
                <p className="text-sm mt-1">{receipt.notes}</p>
              </div>
            ) : null}
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
