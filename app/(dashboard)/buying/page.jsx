"use client"

import { useMemo, useState, useEffect } from "react"
import Tabs from "@/components/tabs"
import DataTable from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { usePurchases } from "@/lib/hooks/usePurchases"
import { useReturns } from "@/lib/hooks/useReturns"
import { useDeletePurchase } from "@/lib/hooks/usePurchases"
import { useRevertToPending } from "@/lib/hooks/useDispatchOrders"
import ReturnDetailModal from "@/components/modals/ReturnDetailModal"
import BuyingReturnModal from "@/components/modals/BuyingReturnModal"
import ProductImageGallery from "@/components/ui/ProductImageGallery"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Edit, RotateCcw, Trash2 } from "lucide-react"

// Helper to get image array from various sources (same pattern as BuyingReturnModal)
const getImageArray = (item) => {
  if (Array.isArray(item.product?.images) && item.product.images.length > 0) {
    return item.product.images;
  }
  if (item.productImage) {
    return Array.isArray(item.productImage) ? item.productImage : [item.productImage];
  }
  if (item.productType?.images && Array.isArray(item.productType.images) && item.productType.images.length > 0) {
    return item.productType.images;
  }
  return [];
};
import { Package } from "lucide-react"

// Currency util to match other tabs' formatting
function currency(n) {
  const num = Number(n || 0)
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function BuyingPage() {
  const router = useRouter()

  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")

  // When searching, fetch more results for better client-side filtering
  // When not searching, use normal pagination
  const { data: purchasesData, isLoading: purchasesLoading } = usePurchases({
    page: searchQuery.trim() ? 1 : page, // Always start at page 1 when searching
    limit: searchQuery.trim() ? 500 : 20, // Fetch more results when searching to enable client-side filtering
  })
  
  // Get all rows from API
  const allBuyingRows = purchasesData?.rows ?? []
  
  // Apply client-side filtering by Supplier name and Product names
  const buyingRows = useMemo(() => {
    if (!searchQuery.trim()) {
      return allBuyingRows
    }
    
    const query = searchQuery.trim().toLowerCase()
    
    return allBuyingRows.filter((row) => {
      // Search by supplier name
      const supplierMatch = row.supplierName?.toLowerCase().includes(query)
      
      // Search by product names (check all items in the purchase)
      const productMatch = row.items?.some((item) => {
        const productName = item.productName?.toLowerCase() || ""
        const productCode = item.productCode?.toLowerCase() || ""
        return productName.includes(query) || productCode.includes(query)
      })
      
      return supplierMatch || productMatch
    })
  }, [allBuyingRows, searchQuery])
  
  // Calculate pagination - use filtered results when searching
  const pagination = useMemo(() => {
    if (!searchQuery.trim()) {
      // No search - use API pagination
      return purchasesData?.pagination || {}
    }
    
    // Search active - calculate pagination from filtered results
    const pageSize = 20
    const totalFiltered = buyingRows.length
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
    const currentPageNum = Math.min(page, totalPages)
    
    return {
      currentPage: currentPageNum,
      totalPages,
      totalItems: totalFiltered,
      pageSize,
    }
  }, [buyingRows, searchQuery, page, purchasesData?.pagination])
  
  // Get paginated rows for display
  const displayRows = useMemo(() => {
    if (!searchQuery.trim()) {
      return buyingRows // API already paginated
    }
    
    // Client-side pagination for filtered results
    const pageSize = 20
    const startIndex = ((pagination.currentPage || 1) - 1) * pageSize
    return buyingRows.slice(startIndex, startIndex + pageSize)
  }, [buyingRows, searchQuery, pagination.currentPage])

  const deliveryMetrics = purchasesData?.metrics ?? {
    total: buyingRows.length,
    pending: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  }

  const [selectedReturn, setSelectedReturn] = useState(null)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRevertDialog, setShowRevertDialog] = useState(false)

  const deletePurchaseMutation = useDeletePurchase()
  const revertToPendingMutation = useRevertToPending()

  const buyingColumns = useMemo(() => {
    const statusStyles = {
      paid: "bg-emerald-500/15 text-emerald-600 border-emerald-200",
      partial: "bg-amber-500/15 text-amber-600 border-amber-200",
      pending: "bg-sky-500/15 text-sky-600 border-sky-200",
      overdue: "bg-rose-500/15 text-rose-600 border-rose-200",
    }

    return [
      {
        header: "Buying ID",
        accessor: "purchaseNumber",
        render: (row) => (
          <div className="flex flex-col">
            {/* <span className="font-medium text-sm">
              {row.purchaseNumber || "—"}
            </span> */}
            {row.dispatchOrderId && (
              <a
                href={`/dispatch-orders/${row.dispatchOrderId}`}
                className="text-xs text-blue-600 hover:underline mt-1"
                onClick={(e) => {
                  e.preventDefault()
                  router.push(`/dispatch-orders/${row.dispatchOrderId}`)
                }}
              >
                {row.purchaseNumber || "—"}
              </a>
            )}
          </div>
        ),
      },
      {
        header: "Date",
        accessor: "purchaseDate",
        render: (row) => (
          <span className="font-medium">
            {row.purchaseDate ? new Date(row.purchaseDate).toLocaleDateString('en-GB') : "—"}
          </span>
        ),
      },
      {
        header: "Supplier",
        accessor: "supplierName",
        render: (row) => (
          <span className="font-medium">{row.supplierName || "—"}</span>
        ),
      },
      {
        header: "Products",
        accessor: "productsSearch",
        render: (row) => (
          <div className="flex flex-col gap-2">
            {row.items && row.items.length > 0 ? (
              <>
                {row.items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <ProductImageGallery
                      images={getImageArray(item)}
                      alt={item.productName || item.productCode || "Product"}
                      size="sm"
                      maxVisible={1}
                      showCount={true}
                    />
                    <div className="text-xs leading-tight">
                      <div className="font-semibold text-sm">{item.productName || "—"}</div>
                      <div className="text-muted-foreground">{item.productCode || "—"}</div>
                      {item.quantity && (
                        <div className="text-muted-foreground/70">
                          Qty: {item.quantity}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {row.items.length > 3 && (
                  <span className="text-[11px] text-muted-foreground">
                    +{row.items.length - 3} more item{row.items.length - 3 === 1 ? "" : "s"}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">No products</span>
            )}
          </div>
        ),
      },
      {
        header: "Colors",
        accessor: "colors",
        render: (row) => {
          if (!row.items || row.items.length === 0) return <span className="text-muted-foreground">—</span>

          // Helper function to extract colors from a value (array, string, or object)
          const extractColors = (value) => {
            const extracted = []
            if (!value) return extracted

            if (Array.isArray(value)) {
              value.forEach(color => {
                if (color && typeof color === 'string' && color.trim()) {
                  extracted.push(color.trim())
                } else if (color && typeof color === 'object' && color.name) {
                  extracted.push(color.name.trim())
                }
              })
            } else if (typeof value === 'string' && value.trim()) {
              extracted.push(value.trim())
            } else if (typeof value === 'object' && value.name) {
              extracted.push(value.name.trim())
            }
            return extracted
          }

          // Collect unique colors from all items - check ALL sources to get complete color list
          // Match what's shown in detail page: aggregate all colors from item-level data
          const colors = new Set()
          row.items.forEach(item => {
            // Check ALL sources for each item to get complete color list
            // PRIORITY 1: Check item.primaryColor (array or string) - this is what detail page uses
            if (item.primaryColor) {
              extractColors(item.primaryColor).forEach(color => colors.add(color))
            }

            // PRIORITY 2: Also check primaryColorDisplay (may have additional colors)
            if (item.primaryColorDisplay) {
              extractColors(item.primaryColorDisplay).forEach(color => colors.add(color))
            }

            // PRIORITY 3: Also check color field (alternative name, may have additional colors)
            if (item.color) {
              extractColors(item.color).forEach(color => colors.add(color))
            }

            // PRIORITY 4: Check packets composition for additional colors (important for variant tracking)
            if (item.packets && Array.isArray(item.packets)) {
              item.packets.forEach(packet => {
                if (packet.composition && Array.isArray(packet.composition)) {
                  packet.composition.forEach(comp => {
                    if (comp.color) {
                      extractColors(comp.color).forEach(color => colors.add(color))
                    }
                    if (comp.primaryColor) {
                      extractColors(comp.primaryColor).forEach(color => colors.add(color))
                    }
                  })
                }
              })
            }

            // DO NOT fallback to product.primaryColor or product.color - item data should match detail page
          })

          const colorArray = Array.from(colors).filter(Boolean)
          if (colorArray.length === 0) return <span className="text-muted-foreground">—</span>

          // Show all colors (up to 3 visible, rest in tooltip)
          const visibleColors = colorArray.slice(0, 3)
          const remainingColors = colorArray.slice(3)

          return (
            <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
              {visibleColors.map((color, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200"
                >
                  {color}
                </Badge>
              ))}
              {remainingColors.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200"
                  title={remainingColors.join(', ')}
                >
                  +{remainingColors.length}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        header: "Sizes",
        accessor: "sizes",
        render: (row) => {
          if (!row.items || row.items.length === 0) return <span className="text-muted-foreground">—</span>

          // Collect unique sizes from all items - check ALL sources to get complete size list
          // Match what's shown in detail page: aggregate all sizes from item-level data
          const sizes = new Set()
          row.items.forEach(item => {
            // Check ALL sources for each item to get complete size list
            // PRIORITY 1: Check item.size (array or string) - this is what detail page uses
            if (item.size) {
              if (Array.isArray(item.size)) {
                item.size.forEach(s => {
                  if (s && s.trim()) sizes.add(s.trim())
                })
              } else if (typeof item.size === 'string' && item.size.trim()) {
                sizes.add(item.size.trim())
              }
            }

            // PRIORITY 2: Also check sizeArray (may have additional sizes)
            if (item.sizeArray && Array.isArray(item.sizeArray)) {
              item.sizeArray.forEach(size => {
                if (size && size.trim()) sizes.add(size.trim())
              })
            }

            // PRIORITY 3: Also check packets composition for additional sizes (important for variant tracking)
            if (item.packets && item.packets.length > 0) {
              item.packets.forEach(packet => {
                if (packet.composition && packet.composition.length > 0) {
                  packet.composition.forEach(comp => {
                    if (comp.size && comp.size.trim()) {
                      sizes.add(comp.size.trim())
                    }
                  })
                }
              })
            }

            // DO NOT fallback to product.size - item data should match detail page
          })

          const sizeArray = Array.from(sizes).filter(Boolean)
          if (sizeArray.length === 0) return <span className="text-muted-foreground">—</span>

          // Show all sizes (up to 3 visible, rest in tooltip)
          const visibleSizes = sizeArray.slice(0, 3)
          const remainingSizes = sizeArray.slice(3)

          return (
            <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
              {visibleSizes.map((size, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 border-green-200"
                >
                  {size}
                </Badge>
              ))}
              {remainingSizes.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 border-green-200"
                  title={remainingSizes.join(', ')}
                >
                  +{remainingSizes.length}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        header: "Boxes",
        accessor: "totalBoxes",
        render: (row) => {
          // Match Dispatch Orders approach: purchases are created from dispatch orders
          // so they should have totalBoxes at root level, same as dispatch orders
          let totalBoxes = row.totalBoxes

          // If not at root, check other possible locations
          if (totalBoxes === undefined || totalBoxes === null) {
            totalBoxes = row.raw?.totalBoxes
          }

          // Check dispatchOrder if populated
          if ((totalBoxes === undefined || totalBoxes === null) && row.dispatchOrder) {
            totalBoxes = row.dispatchOrder.totalBoxes
          }

          // Check raw dispatchOrder
          if ((totalBoxes === undefined || totalBoxes === null) && row.raw?.dispatchOrder) {
            totalBoxes = row.raw.dispatchOrder.totalBoxes
          }

          // Parse if string
          if (typeof totalBoxes === 'string') {
            const parsed = parseInt(totalBoxes)
            totalBoxes = isNaN(parsed) ? 0 : parsed
          }

          // Default to 0 if still undefined/null (match Dispatch Orders behavior)
          totalBoxes = totalBoxes ?? 0

          // Display exactly like Dispatch Orders: show the number (including 0)
          return <span className="tabular-nums text-sm font-medium">{totalBoxes}</span>
        },
      },
      {
        header: "Ex. Rate",
        accessor: "exchangeRate",
        render: (row) => (
          <span className="tabular-nums text-sm">
            {row.exchangeRate ? row.exchangeRate.toFixed(2) : "—"}
          </span>
        ),
      },
      {
        header: "Supplier Amount",
        accessor: "supplierPaymentTotal",
        render: (row) => (
          <span className="tabular-nums font-medium text-sm">
            {row.supplierPaymentTotal != null ? row.supplierPaymentTotal.toFixed(2) : "—"}
          </span>
        ),
      },
      {
        header: "Actions",
        accessor: "actions",
        render: (row) => {
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  if (row.dispatchOrderId) {
                    router.push(`/dispatch-orders/${row.dispatchOrderId}`)
                  }
                }}
                className="h-8 px-2 text-xs"
                title="Edit purchase"
              >
                <Edit className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              {/* Revert and Delete buttons commented out */}
              {/* {row.dispatchOrderId && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedPurchase(row)
                      setShowRevertDialog(true)
                    }}
                    className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    title="Revert to pending"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Revert
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedPurchase(row)
                      setShowDeleteDialog(true)
                    }}
                    className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete purchase"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </>
              )} */}
            </div>
          )
        },
      },
    ]
  }, [router])

  // Handle Add New Purchase
  function handleAddNew() {
    router.push('buying/new')
  }

  // Buying Return
  const { data: returnsData, isLoading: returnsLoading } = useReturns()
  const buyingReturnRows = returnsData || []

  const buyingReturnColumns = useMemo(
    () => [
      {
        header: "Return ID",
        accessor: "_id",
        render: (r) => (
          <span className="font-mono text-xs">
            {r._id ? String(r._id).slice(-8) : "—"}
          </span>
        ),
      },
      {
        header: "Buying Date",
        accessor: "dispatchOrder.purchaseDate",
        render: (r) => {
          // Prioritize purchaseDate, then createdAt, then dispatchDate
          const dateValue = r.dispatchOrder?.purchaseDate ||
            r.dispatchOrder?.createdAt ||
            r.dispatchOrder?.dispatchDate ||
            r.dispatchOrder?.confirmedAt
          return (
            <span>
              {dateValue ? new Date(dateValue).toLocaleDateString('en-GB') : "—"}
            </span>
          )
        },
      },
      {
        header: "Return Date",
        accessor: "returnedAt",
        render: (r) => (
          <span>
            {r.returnedAt ? new Date(r.returnedAt).toLocaleDateString('en-GB') : "—"}
          </span>
        ),
      },
      {
        header: "Supplier",
        accessor: "supplier",
        render: (r) => (
          <span>{r.supplier?.name || r.supplier?.company || "—"}</span>
        ),
      },
      {
        header: "Amount",
        accessor: "totalReturnValue",
        render: (r) => (
          <span className="tabular-nums font-medium">
            {currency(r.totalReturnValue || 0)}
          </span>
        ),
      },
      {
        header: "Dispatch Order",
        accessor: "dispatchOrder",
        render: (r) => (
          <div className="flex flex-col">
            <span className="font-medium text-sm">
              {r.dispatchOrder?.orderNumber || "—"}
            </span>
            {r.dispatchOrder?._id && (
              <a
                href={`/dispatch-orders/${r.dispatchOrder._id}`}
                className="text-xs text-blue-600 hover:underline mt-1"
                onClick={(e) => {
                  e.preventDefault()
                  router.push(`/dispatch-orders/${r.dispatchOrder._id}`)
                }}
              >
                View Order →
              </a>
            )}
          </div>
        ),
      },
    ],
    [router],
  )

  // Loading state
  if (purchasesLoading) {
    return (
      <div className="mx-auto max-w-[1600px] p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1600px] p-4">
      {/* Page header to match other sections */}
      <header className="mb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Buying</h1>
            <p className="text-sm text-muted-foreground">Manage supplier purchases and monitor payment status.</p>
          </div>
          {/* {JSON.stringify(buyingRows)} */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span>Backend connected</span>
            </div>
            <span className="rounded-full border border-border px-3 py-1">
              Total: {deliveryMetrics.total || 0}
            </span>
            <span className="rounded-full border border-border px-3 py-1">
              Pending: {deliveryMetrics.pending || 0}
            </span>
            <span className="rounded-full border border-border px-3 py-1">
              Dispatched: {deliveryMetrics.shipped || 0}
            </span>
            <span className="rounded-full border border-border px-3 py-1">
              Delivered: {deliveryMetrics.delivered || 0}
            </span>
          </div>
        </div>
      </header>

      {/* Internal tabs using shared Tabs component */}
      {/* {JSON.stringify(buyingRows)} */}
      <Tabs
        tabs={[
          {
            label: "Buying",
            content: (
              <div className="space-y-4">
                <div className="">
                  <DataTable
                    title="Buying"
                    columns={buyingColumns}
                    data={displayRows}
                    onAddNew={handleAddNew}
                    loading={purchasesLoading}
                    manualPagination={true}
                    currentPage={pagination.currentPage || page || 1}
                    totalPages={pagination.totalPages || 1}
                    totalItems={pagination.totalItems || buyingRows.length}
                    onPageChange={(newPage) => {
                      setPage(newPage)
                    }}
                    onSearch={(query) => {
                      setSearchQuery(query)
                      setPage(1) // Reset to first page when searching
                    }}
                    pageSize={20}
                  />
                </div>


              </div>
            ),
          },
          {
            label: "Buying Return",
            content: (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Return History</h2>
                  <Button
                    onClick={() => setShowReturnModal(true)}
                    className="bg-rose-600 hover:bg-rose-700"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Create Product Return
                  </Button>
                </div>
                <DataTable
                  title="Return History"
                  columns={buyingReturnColumns}
                  data={buyingReturnRows}
                  loading={returnsLoading}
                />

                <details className="rounded-[4px] border border-border bg-card p-3">
                  <summary className="cursor-pointer text-sm">Legacy reference: Buying Return</summary>
                  <div className="mt-3 overflow-hidden rounded-[4px] border border-border">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Buying_%20Buying%20Return-DuuycgQyN5UwFOCHTkGDA2GMvr8nAv.png"
                      alt="Legacy Buying Return screen"
                      className="h-auto w-full"
                    />
                  </div>
                </details>
              </div>
            ),
          },
        ]}
      />

      {/* Return Detail Modal */}
      <ReturnDetailModal
        open={!!selectedReturn}
        onClose={() => setSelectedReturn(null)}
        returnId={selectedReturn?._id}
        returnData={selectedReturn}
      />

      {/* Buying Return Modal */}
      <BuyingReturnModal
        open={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        onSuccess={() => {
          setShowReturnModal(false)
          // TODO: Add refetch/refresh logic for returns data
        }}
      />

      {/* Delete Confirmation Dialog - Commented out */}
      {/* <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Purchase</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this purchase? This action cannot be undone.
              {selectedPurchase && (
                <div className="mt-2 text-sm">
                  <p><strong>Purchase ID:</strong> {selectedPurchase.purchaseNumber || "—"}</p>
                  <p><strong>Supplier:</strong> {selectedPurchase.supplierName || "—"}</p>
                  <p><strong>Grand Total:</strong> {currency(selectedPurchase.grandTotal || 0)}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setSelectedPurchase(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (selectedPurchase?._id) {
                  try {
                    await deletePurchaseMutation.mutateAsync(selectedPurchase._id)
                    setShowDeleteDialog(false)
                    setSelectedPurchase(null)
                  } catch (error) {
                    console.error('Error deleting purchase:', error)
                  }
                }
              }}
              disabled={deletePurchaseMutation.isPending}
            >
              {deletePurchaseMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}

      {/* Revert to Pending Confirmation Dialog - Commented out */}
      {/* <Dialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert to Pending</DialogTitle>
            <DialogDescription>
              Are you sure you want to revert this purchase back to pending status? This will change the dispatch order status back to pending.
              {selectedPurchase && (
                <div className="mt-2 text-sm">
                  <p><strong>Purchase ID:</strong> {selectedPurchase.purchaseNumber || "—"}</p>
                  <p><strong>Supplier:</strong> {selectedPurchase.supplierName || "—"}</p>
                  <p><strong>Grand Total:</strong> {currency(selectedPurchase.grandTotal || 0)}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRevertDialog(false)
                setSelectedPurchase(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={async () => {
                if (selectedPurchase?.dispatchOrderId) {
                  try {
                    await revertToPendingMutation.mutateAsync(selectedPurchase.dispatchOrderId)
                    setShowRevertDialog(false)
                    setSelectedPurchase(null)
                  } catch (error) {
                    console.error('Error reverting purchase:', error)
                  }
                }
              }}
              disabled={revertToPendingMutation.isPending}
            >
              {revertToPendingMutation.isPending ? "Reverting..." : "Revert to Pending"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
    </div>
  )
}

