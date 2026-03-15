"use client"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import BackButton from "@/components/BackButton"
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
import TruncatedBadgeList from "@/components/ui/TruncatedBadgeList"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Edit, RotateCcw, Trash2, FilePen } from "lucide-react"
import EditConfirmedOrderModal from "@/components/modals/EditConfirmedOrderModal"
import { useAuthStore } from "@/store/store"
import { useSearchParams } from "next/navigation"
import BritishDatePicker from "@/components/BritishDatePicker"
import { Label } from "@/components/ui/label"

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
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super-admin'
  const initialTab = Number(searchParams.get("tab") ?? 0)
  const [activeTab, setActiveTab] = useState(Number.isNaN(initialTab) ? 0 : initialTab)

  useEffect(() => {
    const urlTab = Number(searchParams.get("tab") ?? 0)
    const normalizedTab = Number.isNaN(urlTab) ? 0 : urlTab
    if (normalizedTab !== activeTab) {
      setActiveTab(normalizedTab)
    }
  }, [searchParams, activeTab])

  const handleTabChange = (tabIndex) => {
    setActiveTab(tabIndex)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", String(tabIndex))
    router.replace(`?${params.toString()}`)
  }

  const [editConfirmedOrder, setEditConfirmedOrder] = useState(null) // { orderId, orderNumber, supplierId }

  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const today = new Date().toISOString().split("T")[0]
  const [dateRange, setDateRange] = useState({ from: today, to: today })

  // When searching, fetch more results for better client-side filtering
  // When not searching, use normal pagination
  const { data: purchasesData, isLoading: purchasesLoading } = usePurchases({
    page: searchQuery.trim() ? 1 : page, // Always start at page 1 when searching
    limit: searchQuery.trim() ? 500 : 20, // Fetch more results when searching to enable client-side filtering
    startDate: dateRange.from || undefined,
    endDate: dateRange.to || undefined,
  })
  
  // Get all rows from API and flatten items into individual rows
  const allBuyingRows = useMemo(() => {
    const purchases = purchasesData?.rows ?? []
    const flattened = []
    
    purchases.forEach(purchase => {
      if (purchase.items && purchase.items.length > 0) {
        purchase.items.forEach((item, itemIndex) => {
          flattened.push({
            ...purchase,
            // Keep original purchase data but add item-specific fields
            currentItem: item,
            itemIndex,
            // Override fields to show item-level data
            productName: item.productName,
            productCode: item.productCode,
            productId: item.product?._id?.toString() || (typeof item.product === 'string' ? item.product : null),
            quantity: item.quantity,
            landedPrice: item.landedPrice,
            primaryColor: item.primaryColor,
            size: item.size,
            productImage: item.productImage,
            // Generate unique ID for the row
            rowId: `${purchase.id}_item_${itemIndex}`
          })
        })
      } else {
        // Keep purchase without items as-is, but ensure it has a unique rowId
        flattened.push({
          ...purchase,
          rowId: purchase.id || purchase._id || `purchase-${purchase.purchaseNumber || Date.now()}-${Math.random()}`
        })
      }
    })
    
    return flattened
  }, [purchasesData?.rows])
  
  // Apply client-side filtering by Supplier name and Product names
  const buyingRows = useMemo(() => {
    if (!searchQuery.trim()) {
      return allBuyingRows
    }
    
    const query = searchQuery.trim().toLowerCase()
    
    return allBuyingRows.filter((row) => {
      // Search by supplier name
      const supplierMatch = row.supplierName?.toLowerCase().includes(query)
      
      // Search by product name/code (now at row level)
      const productName = row.productName?.toLowerCase() || ""
      const productCode = row.productCode?.toLowerCase() || ""
      const productMatch = productName.includes(query) || productCode.includes(query)
      
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
          <div className="flex flex-col gap-0.5">
            {row.dispatchOrderId ? (
              <a
                href={`/dispatch-orders/${row.dispatchOrderId}`}
                className="text-sm font-semibold text-primary hover:underline transition-colors"
                onClick={(e) => {
                  e.preventDefault()
                  router.push(`/dispatch-orders/${row.dispatchOrderId}`)
                }}
              >
                {row.purchaseNumber || "—"}
              </a>
            ) : (
              <span className="text-sm font-semibold text-foreground">{row.purchaseNumber || "—"}</span>
            )}
          </div>
        ),
      },
      {
        header: "Date",
        accessor: "purchaseDate",
        render: (row) => (
          <span className="font-medium text-foreground">
            {row.purchaseDate ? new Date(row.purchaseDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
          </span>
        ),
      },
      {
        header: "Supplier",
        accessor: "supplierName",
        render: (row) => (
          <span className="font-semibold text-foreground">{row.supplierName || "—"}</span>
        ),
      },
      {
        header: "Products",
        accessor: "productsSearch",
        render: (row) => {
          if (!row.currentItem) return <span className="text-sm text-muted-foreground">No product</span>

          return (
            <div className="flex items-center gap-3">
              <ProductImageGallery
                images={getImageArray(row.currentItem)}
                alt={row.productName || row.productCode || "Product"}
                size="sm"
                maxVisible={1}
                showCount={true}
              />
              <div className="flex flex-col gap-0">
                {row.productId ? (
                  <Link
                    href={`/stock/${row.productId}/packets`}
                    className="font-semibold text-sm text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {row.productName || "—"}
                  </Link>
                ) : (
                  <span className="font-semibold text-sm text-foreground">{row.productName || "—"}</span>
                )}
                <span className="text-xs text-muted-foreground">{row.productCode || "—"}</span>
              </div>
            </div>
          )
        },
      },
      {
        header: "Colors",
        accessor: "colors",
        render: (row, { isExpanded } = {}) => {
          if (!row.currentItem) return <span className="text-muted-foreground">—</span>

          const item = row.currentItem

          const extractColors = (value) => {
            const extracted = []
            if (!value) return extracted
            if (Array.isArray(value)) {
              value.forEach(color => {
                if (color && typeof color === 'string' && color.trim()) extracted.push(color.trim())
                else if (color && typeof color === 'object' && color.name) extracted.push(color.name.trim())
              })
            } else if (typeof value === 'string' && value.trim()) {
              extracted.push(value.trim())
            } else if (typeof value === 'object' && value.name) {
              extracted.push(value.name.trim())
            }
            return extracted
          }

          const colors = new Set()
          if (item.primaryColor) extractColors(item.primaryColor).forEach(c => colors.add(c))
          if (item.primaryColorDisplay) extractColors(item.primaryColorDisplay).forEach(c => colors.add(c))
          if (item.color) extractColors(item.color).forEach(c => colors.add(c))
          if (item.packets && Array.isArray(item.packets)) {
            item.packets.forEach(packet => {
              if (packet.composition && Array.isArray(packet.composition)) {
                packet.composition.forEach(comp => {
                  if (comp.color) extractColors(comp.color).forEach(c => colors.add(c))
                  if (comp.primaryColor) extractColors(comp.primaryColor).forEach(c => colors.add(c))
                })
              }
            })
          }

          const colorArray = Array.from(colors).filter(Boolean)
          if (colorArray.length === 0) return <span className="text-muted-foreground">—</span>

          if (isExpanded) {
            return (
              <div className="flex flex-wrap gap-1">
                {colorArray.map((color, idx) => (
                  <span key={idx} className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium">{color}</span>
                ))}
              </div>
            )
          }

          return <TruncatedBadgeList items={colorArray} max={3} colorClass="bg-blue-100 text-blue-800" />
        },
      },
      {
        header: "Sizes",
        accessor: "sizes",
        render: (row, { isExpanded } = {}) => {
          const item = row.currentItem
          if (!item) return <span className="text-muted-foreground">—</span>

          const sizes = new Set()
          // Check current item's size fields
          if (item.size) {
            if (Array.isArray(item.size)) item.size.forEach(s => { if (s && s.trim()) sizes.add(s.trim()) })
            else if (typeof item.size === 'string' && item.size.trim()) sizes.add(item.size.trim())
          }
          if (item.sizeArray && Array.isArray(item.sizeArray)) {
            item.sizeArray.forEach(s => { if (s && s.trim()) sizes.add(s.trim()) })
          }
          if (item.packets && item.packets.length > 0) {
            item.packets.forEach(packet => {
              if (packet.composition) {
                packet.composition.forEach(comp => { if (comp.size && comp.size.trim()) sizes.add(comp.size.trim()) })
              }
            })
          }

          const sizeArray = Array.from(sizes).filter(Boolean)
          if (sizeArray.length === 0) return <span className="text-muted-foreground">—</span>

          if (isExpanded) {
            return (
              <div className="flex flex-wrap gap-1">
                {sizeArray.map((size, idx) => (
                  <span key={idx} className="inline-block px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-medium">{size}</span>
                ))}
              </div>
            )
          }

          return <TruncatedBadgeList items={sizeArray} max={3} colorClass="bg-green-100 text-green-800" />
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
          return <span className="tabular-nums text-sm font-semibold text-foreground">{totalBoxes}</span>
        },
      },
      // {
      //   header: "Ex. Rate",
      //   accessor: "exchangeRate",
      //   render: (row) => (
      //     <span className="tabular-nums text-sm">
      //       {row.exchangeRate ? row.exchangeRate.toFixed(2) : "—"}
      //     </span>
      //   ),
      // },
      // {
      //   header: "Supplier Amount",
      //   accessor: "supplierPaymentTotal",
      //   render: (row) => (
      //     <span className="tabular-nums font-medium text-sm">
      //       {row.supplierPaymentTotal != null ? row.supplierPaymentTotal.toFixed(2) : "—"}
      //     </span>
      //   ),
      // },
      {
        header: "Landed Price",
        accessor: "landedPrice",
        render: (row) => (
          <span className="tabular-nums font-semibold text-sm text-foreground">
            {row?.landedPrice != null ? row?.landedPrice.toFixed(2) : "—"}
          </span>
        ),
      },
      {
        header: "Actions",
        accessor: "actions",
        render: (row) => {
          const isConfirmedOrder = ['confirmed', 'picked_up', 'in_transit', 'delivered'].includes(row.status)
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  if (row.dispatchOrderId) {
                    router.push(`/dispatch-orders/${row.dispatchOrderId}`)
                  }
                }}
                className="h-8 px-3 text-xs gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
                title="View purchase"
              >
                <Edit className="h-3.5 w-3.5" />
                View
              </Button>
              {isConfirmedOrder && row.dispatchOrderId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditConfirmedOrder({
                      orderId: row.dispatchOrderId,
                      orderNumber: row.purchaseNumber || row.orderNumber || row.dispatchOrderId,
                      supplierId: row.supplierId || row.supplier?._id || null,
                    })
                  }}
                  className="h-8 px-3 text-xs gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                  title={isSuperAdmin ? "Edit confirmed order financial fields" : "Request edit of confirmed order"}
                >
                  <FilePen className="h-3.5 w-3.5" />
                  {isSuperAdmin ? "Edit" : "Request Edit"}
                </Button>
              )}
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
  const { data: returnsData, isLoading: returnsLoading, refetch: refetchReturns } = useReturns({ limit: 100 })
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
        header: "Order #",
        accessor: "dispatchOrder",
        render: (r) => {
          const displayText = r.dispatchOrder?.orderNumber || r.dispatchOrder?._id?.slice(-8) || "—"
          const orderId = r.dispatchOrder?._id
          if (orderId && displayText !== "—") {
            return (
              <Link
                href={`/dispatch-orders/${orderId}`}
                className="font-mono text-xs text-blue-600 hover:underline"
              >
                {displayText}
              </Link>
            )
          }
          return <span className="font-mono text-xs">{displayText}</span>
        },
      },
      {
        header: "Buying Date",
        accessor: "dispatchOrder.purchaseDate",
        render: (r) => {
          // First try dispatch order dates
          let dateValue = r.dispatchOrder?.purchaseDate ||
            r.dispatchOrder?.createdAt ||
            r.dispatchOrder?.confirmedAt ||
            r.dispatchOrder?.dispatchDate;
          
          // Fallback to batch deduction dates if no dispatch order
          if (!dateValue && r.items?.[0]?.batchDeductions?.[0]) {
            // Use the date from first batch deduction
            const firstBatch = r.items[0].batchDeductions[0];
            if (firstBatch.createdAt) {
              dateValue = firstBatch.createdAt;
            }
          }
          
          // Last resort: use return date
          if (!dateValue) {
            dateValue = r.returnedAt;
          }
          
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
    ],
    [router],
  )

  // Loading state
  if (purchasesLoading) {
    return (
      <div className="space-y-6">
        {/* <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Buying</h1>
            <p className="text-sm text-muted-foreground">Manage supplier purchases and monitor payment status.</p>
          </div>
        </header> */}
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
    <div className="space-y-6 p-2">
      {/* Enhanced Page Header */}
      <div className="mb-3">
        <BackButton fallbackPath="/home" label="Back" />
      </div>
      

      {/* Internal tabs using shared Tabs component */}
      {/* {JSON.stringify(buyingRows)} */}
      <Tabs
        tabs={[
          {
            label: "Buying",
            content: (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end gap-3 mb-4">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">From Date</Label>
                    <BritishDatePicker
                      value={dateRange.from || null}
                      onChange={(date) => {
                        setDateRange(r => ({ ...r, from: date ? date.toISOString().split("T")[0] : "" }))
                        setPage(1)
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">To Date</Label>
                    <BritishDatePicker
                      value={dateRange.to || null}
                      onChange={(date) => {
                        setDateRange(r => ({ ...r, to: date ? date.toISOString().split("T")[0] : "" }))
                        setPage(1)
                      }}
                    />
                  </div>
                  {(dateRange.from || dateRange.to) && (
                    <Button variant="outline" size="sm" onClick={() => { setDateRange({ from: "", to: "" }); setPage(1) }}>
                      Clear
                    </Button>
                  )}
                </div>
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
                    expandableRow={true}
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
                    onClick={() => router.push('/buying/return')}
                    className="bg-rose-600 hover:bg-rose-700"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Create Product Return
                  </Button>
                </div>
                <DataTable
                  title="Return History"
                  columns={buyingReturnColumns}
                  data={buyingReturnRows}
                  loading={returnsLoading}
                  onRowClick={(row) => setSelectedReturn(row)}
                />
              </div>
            ),
          },
        ]}
        // Tab state sync
        defaultTab={Number(searchParams.get("tab") ?? 0)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
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
          refetchReturns() // Refresh the returns list
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
      {/* <Dialog open={showRevertDialog} onOpenChange={setShowRevertDialog}> ... */}

      {/* Edit Confirmed Order Modal — super-admin only */}
      {editConfirmedOrder && (
        <EditConfirmedOrderModal
          orderId={editConfirmedOrder.orderId}
          orderNumber={editConfirmedOrder.orderNumber}
          supplierId={editConfirmedOrder.supplierId}
          onClose={() => setEditConfirmedOrder(null)}
          onSuccess={() => setEditConfirmedOrder(null)}
        />
      )}
    </div>
  )
}

