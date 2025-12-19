"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSaleReturn, useApproveSaleReturn, useRejectSaleReturn } from "@/lib/hooks/useSaleReturns"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import ProductImageGallery from "@/components/ui/ProductImageGallery"

// Helper to get image array from various sources
const getImageArray = (item) => {
  if (Array.isArray(item.product?.images) && item.product.images.length > 0) {
    return item.product.images;
  }
  if (item.productImage) {
    return Array.isArray(item.productImage) ? item.productImage : [item.productImage];
  }
  return [];
};

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function SaleReturnDetailModal({ open, onClose, returnId, returnData, onAction }) {
  const router = useRouter()
  const { data: returnDoc, isLoading } = useSaleReturn(returnId)
  const approveMutation = useApproveSaleReturn()
  const rejectMutation = useRejectSaleReturn()
  const [rejectionNotes, setRejectionNotes] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)
  
  // Use provided data or fetched data
  const returnInfo = returnData || returnDoc

  const handleApprove = async () => {
    if (!returnId) return
    try {
      await approveMutation.mutateAsync(returnId)
      if (onAction) onAction()
      onClose()
    } catch (error) {
      console.error('Error approving return:', error)
    }
  }

  const handleReject = async () => {
    if (!returnId || !rejectionNotes.trim()) {
      alert('Please provide rejection notes')
      return
    }
    try {
      await rejectMutation.mutateAsync({ id: returnId, rejectionNotes })
      if (onAction) onAction()
      setShowRejectForm(false)
      setRejectionNotes("")
      onClose()
    } catch (error) {
      console.error('Error rejecting return:', error)
    }
  }

  if (isLoading && !returnData) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] 2xl:max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!returnInfo) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] 2xl:max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Return Not Found</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const isPending = returnInfo.status === 'pending'
  const canApprove = isPending && !approveMutation.isPending
  const canReject = isPending && !rejectMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] 2xl:max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sale Return Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Return Information */}
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Return ID</p>
              <p className="font-mono text-sm font-medium">
                {returnInfo._id ? String(returnInfo._id).slice(-8) : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge 
                variant={
                  returnInfo.status === 'approved' ? 'default' :
                  returnInfo.status === 'rejected' ? 'destructive' : 'secondary'
                }
              >
                {returnInfo.status || 'pending'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Return Date</p>
              <p className="font-medium">
                {returnInfo.returnedAt 
                  ? new Date(returnInfo.returnedAt).toLocaleDateString('en-GB') 
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Buyer</p>
              <p className="font-medium">
                {returnInfo.buyer?.name || returnInfo.buyer?.company || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Returned By</p>
              <p className="font-medium">
                {returnInfo.returnedBy?.name || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Return Value</p>
              <p className="text-lg font-semibold">
                {currency(returnInfo.totalReturnValue || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sale Number</p>
              {returnInfo.sale?._id ? (
                <a
                  href={`/selling`}
                  className="text-blue-600 hover:underline font-medium"
                  onClick={(e) => {
                    e.preventDefault()
                    router.push(`/selling`)
                    onClose()
                  }}
                >
                  {returnInfo.sale?.saleNumber || "View Sale →"}
                </a>
              ) : (
                <p className="font-medium">—</p>
              )}
            </div>
            {returnInfo.processedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Processed At</p>
                <p className="font-medium">
                  {new Date(returnInfo.processedAt).toLocaleDateString('en-GB')}
                </p>
              </div>
            )}
            {returnInfo.processedBy && (
              <div>
                <p className="text-sm text-muted-foreground">Processed By</p>
                <p className="font-medium">
                  {returnInfo.processedBy?.name || "—"}
                </p>
              </div>
            )}
            {returnInfo.rejectionNotes && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Rejection Notes</p>
                <p className="font-medium text-destructive">
                  {returnInfo.rejectionNotes}
                </p>
              </div>
            )}
          </div>

          {/* Returned Items */}
          <div>
            <h3 className="font-semibold mb-3">Returned Items</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Image</th>
                    <th className="text-left p-3 font-medium">Product</th>
                    <th className="text-right p-3 font-medium">Original Qty</th>
                    <th className="text-right p-3 font-medium">Returned Qty</th>
                    <th className="text-right p-3 font-medium">Unit Price</th>
                    <th className="text-right p-3 font-medium">Line Total</th>
                    <th className="text-left p-3 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {returnInfo.items && returnInfo.items.length > 0 ? (
                    returnInfo.items.map((item, idx) => {
                      const lineTotal = (item.unitPrice || 0) * (item.returnedQuantity || 0)
                      const product = item.product || null
                      const productName = product?.name || "—"
                      return (
                        <tr key={idx} className="border-t">
                          <td className="p-3">
                            <ProductImageGallery
                              images={getImageArray(item)}
                              alt={productName}
                              size="sm"
                              maxVisible={3}
                              showCount={true}
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-medium">{productName}</div>
                            {product?.sku && (
                              <div className="text-xs text-muted-foreground">{product.sku}</div>
                            )}
                          </td>
                          <td className="p-3 text-right tabular-nums">{item.originalQuantity || 0}</td>
                          <td className="p-3 text-right tabular-nums font-medium">{item.returnedQuantity || 0}</td>
                          <td className="p-3 text-right tabular-nums">{currency(item.unitPrice || 0)}</td>
                          <td className="p-3 text-right tabular-nums font-medium">{currency(lineTotal)}</td>
                          <td className="p-3 text-muted-foreground">{item.reason || "—"}</td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-muted-foreground">
                        No items returned
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {returnInfo.notes && (
            <div>
              <h3 className="font-semibold mb-2">Notes</h3>
              <div className="p-4 border rounded-lg bg-muted/30">
                <p className="text-sm whitespace-pre-wrap">{returnInfo.notes}</p>
              </div>
            </div>
          )}

          {/* Rejection Form */}
          {showRejectForm && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <Label htmlFor="rejection-notes">Rejection Notes *</Label>
              <Textarea
                id="rejection-notes"
                placeholder="Enter reason for rejection..."
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectForm(false)
                    setRejectionNotes("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={!rejectionNotes.trim() || rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {canApprove && (
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Approving...
                </>
              ) : (
                "Approve Return"
              )}
            </Button>
          )}
          {canReject && !showRejectForm && (
            <Button
              variant="destructive"
              onClick={() => setShowRejectForm(true)}
            >
              Reject Return
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

