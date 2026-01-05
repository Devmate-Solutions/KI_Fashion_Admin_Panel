"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useReturn } from "@/lib/hooks/useReturns"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
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

export default function ReturnDetailModal({ open, onClose, returnId, returnData }) {
  const router = useRouter()
  const { data: returnDoc, isLoading } = useReturn(returnId)
  
  // Use provided data or fetched data
  const returnInfo = returnData || returnDoc

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] 2xl:max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Return Details</DialogTitle>
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
              <p className="text-sm text-muted-foreground">Return Date</p>
              <p className="font-medium">
                {returnInfo.returnedAt 
                  ? new Date(returnInfo.returnedAt).toLocaleDateString('en-GB') 
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Supplier</p>
              <p className="font-medium">
                {returnInfo.supplier?.name || returnInfo.supplier?.company || "—"}
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
              <p className="text-sm text-muted-foreground">Dispatch Order</p>
              {returnInfo.dispatchOrder?._id ? (
                <a
                  href={`/dispatch-orders/${returnInfo.dispatchOrder._id}`}
                  className="text-blue-600 hover:underline font-medium"
                  onClick={(e) => {
                    e.preventDefault()
                    router.push(`/dispatch-orders/${returnInfo.dispatchOrder._id}`)
                    onClose()
                  }}
                >
                  {returnInfo.dispatchOrder?.orderNumber || "View Order →"}
                </a>
              ) : (
                <p className="font-medium">—</p>
              )}
            </div>
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
                    <th className="text-left p-3 font-medium">Item Index</th>
                    <th className="text-right p-3 font-medium">Original Qty</th>
                    <th className="text-right p-3 font-medium">Returned Qty</th>
                    <th className="text-right p-3 font-medium">Cost Price</th>
                    <th className="text-right p-3 font-medium">Landed Price</th>
                    <th className="text-right p-3 font-medium">Line Total</th>
                    <th className="text-left p-3 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {returnInfo.items && returnInfo.items.length > 0 ? (
                    returnInfo.items.map((item, idx) => {
                      const lineTotal = (item.landedPrice || item.costPrice || 0) * (item.returnedQuantity || 0)
                      // Get product from dispatchOrder items using itemIndex
                      const dispatchOrderItem = returnInfo.dispatchOrder?.items?.[item.itemIndex];
                      const product = dispatchOrderItem?.product || item.product || null;
                      const productName = product?.name || item.productName || "—";
                      const itemWithProduct = { ...item, product };
                      return (
                        <tr key={idx} className="border-t">
                          <td className="p-3">
                            <ProductImageGallery
                              images={getImageArray(itemWithProduct)}
                              alt={productName}
                              size="sm"
                              maxVisible={3}
                              showCount={true}
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-medium">{productName}</div>
                            {item.product?.sku && (
                              <div className="text-xs text-muted-foreground">{item.product.sku}</div>
                            )}
                          </td>
                          <td className="p-3">{item.itemIndex}</td>
                          <td className="p-3 text-right tabular-nums">{item.originalQuantity || 0}</td>
                          <td className="p-3 text-right tabular-nums font-medium">{item.returnedQuantity || 0}</td>
                          <td className="p-3 text-right tabular-nums">{currency(item.costPrice || 0)}</td>
                          <td className="p-3 text-right tabular-nums">{currency(item.landedPrice || item.costPrice || 0)}</td>
                          <td className="p-3 text-right tabular-nums font-medium">{currency(lineTotal)}</td>
                          <td className="p-3 text-muted-foreground">{item.reason || "—"}</td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-muted-foreground">
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
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

