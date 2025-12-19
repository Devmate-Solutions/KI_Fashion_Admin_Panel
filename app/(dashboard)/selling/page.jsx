"use client"

import { useMemo, useState } from "react"
import Tabs from "@/components/tabs"
import DataTable from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useSales, useDeleteSale } from "@/lib/hooks/useSales"
import { useSaleReturns } from "@/lib/hooks/useSaleReturns"
import SaleReturnDetailModal from "@/components/modals/SaleReturnDetailModal"
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

export default function SellingPage() {
  const router = useRouter()

  // Fetch sales data
  const { data: sellingRows = [], isLoading: salesLoading } = useSales()

  // Mutations
  const deleteSaleMutation = useDeleteSale()

  const sellingColumns = useMemo(
    () => [
      {
        header: "Date",
        accessor: "date",
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-medium">
              {row.date ? new Date(row.date).toLocaleDateString('en-GB') : "—"}
            </span>
            {row._original?.saleNumber && (
              <span className="text-xs text-muted-foreground">SN {row._original.saleNumber}</span>
            )}
            {row._original?.isManualSale && (
              <Badge className="bg-blue-500/15 text-blue-600 border-blue-200 text-xs mt-1 w-fit">
                Manual Sale
              </Badge>
            )}
          </div>
        ),
      },
      {
        header: "Customer",
        accessor: "customerName",
        render: (row) => (
          <span className="font-medium">
            {row.customerName || row._original?.manualCustomer?.name || "—"}
          </span>
        ),
      },
      {
        header: "Products",
        accessor: "items",
        render: (row) => (
          <div className="flex flex-col gap-2">
            {row.items && row.items.length > 0 ? (
              <>
                {row.items.slice(0, 3).map((item, idx) => {
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <ProductImageGallery
                        images={getImageArray(item)}
                        alt={item.product?.name || item.productCode || "Product"}
                        size="sm"
                        maxVisible={2}
                        showCount={true}
                      />
                      <div className="text-xs leading-tight">
                        <div className="font-semibold text-sm">{item.product?.name || item.productCode || "—"}</div>
                        {item.product?.sku && (
                          <div className="text-muted-foreground">SKU: {item.product.sku}</div>
                        )}
                        <div className="text-muted-foreground/70">
                          Qty: {item.quantity || 0} × {currency(item.unitPrice || 0)}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
        header: "Grand Total",
        accessor: "total",
        render: (row) => <span className="tabular-nums font-medium">{currency(row.total || 0)}</span>,
      },
      {
        header: "Paid",
        accessor: "cash",
        render: (row) => <span className="tabular-nums">{currency((row.cash || 0) + (row.bankCash || 0))}</span>,
      },
      {
        header: "Remaining",
        accessor: "balance",
        render: (row) => <span className="tabular-nums">{currency(row.balance || 0)}</span>,
      },
      {
        header: "Status",
        accessor: "paymentStatus",
        render: (row) => {
          const statusStyles = {
            paid: "bg-emerald-500/15 text-emerald-600 border-emerald-200",
            partial: "bg-amber-500/15 text-amber-600 border-amber-200",
            pending: "bg-sky-500/15 text-sky-600 border-sky-200",
            overdue: "bg-rose-500/15 text-rose-600 border-rose-200",
          }
          return (
            <Badge
              variant="outline"
              className={statusStyles[row.paymentStatus] || statusStyles.pending}
            >
              {row.paymentStatus || "pending"}
            </Badge>
          )
        },
      },
    ],
    [],
  )

  // Handle Add New Sale
  function handleAddNew() {
    router.push('/selling/new')
  }

  // Handle Edit Sale
  function handleEdit(sale) {
    console.log('Edit sale:', sale)
    alert('Edit functionality will be available soon. Please create a new sale for now.')
  }

  // Handle Delete Sale
  async function handleDelete(sale) {
    if (window.confirm(`Are you sure you want to delete sale #${String(sale.id).slice(-6)}?`)) {
      try {
        await deleteSaleMutation.mutateAsync(sale.id)
      } catch (error) {
        console.error('Error deleting sale:', error)
      }
    }
  }

  // Sales Return
  const { data: salesReturnData, isLoading: salesReturnLoading } = useSaleReturns()
  const salesReturnRows = salesReturnData || []
  const [selectedReturn, setSelectedReturn] = useState(null)

  const salesReturnColumns = useMemo(
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
        header: "Sale Number",
        accessor: "sale",
        render: (r) => (
          <div className="flex flex-col">
            <span className="font-medium">
              {r.sale?.saleNumber || "—"}
            </span>
            {r.sale?._id && (
              <a
                href={`/selling`}
                className="text-xs text-blue-600 hover:underline mt-1"
                onClick={(e) => {
                  e.preventDefault()
                  // Could navigate to sale detail if we had that page
                }}
              >
                View Sale →
              </a>
            )}
          </div>
        ),
      },
      {
        header: "Buyer",
        accessor: "buyer",
        render: (r) => (
          <span>{r.buyer?.name || r.buyer?.company || "—"}</span>
        ),
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
        header: "Items",
        accessor: "items",
        render: (r) => (
          <span>{r.items?.length || 0} item(s)</span>
        ),
      },
      {
        header: "Total Value",
        accessor: "totalReturnValue",
        render: (r) => (
          <span className="tabular-nums font-medium">
            {currency(r.totalReturnValue || 0)}
          </span>
        ),
      },
      {
        header: "Status",
        accessor: "status",
        render: (r) => (
          <Badge
            variant={
              r.status === 'approved' ? 'default' :
                r.status === 'rejected' ? 'destructive' : 'secondary'
            }
          >
            {r.status || 'pending'}
          </Badge>
        ),
      },
      {
        header: "Actions",
        accessor: "actions",
        render: (r) => (
          <button
            onClick={() => setSelectedReturn(r)}
            className="text-sm text-blue-600 hover:underline"
          >
            View Details
          </button>
        ),
      },
    ],
    [],
  )

  // Loading state
  if (salesLoading) {
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
            <h1 className="text-lg font-semibold">Selling</h1>
            <p className="text-sm text-muted-foreground">Manage customer sales and monitor payment status.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span>Backend connected</span>
            </div>
            <span className="rounded-full border border-border px-3 py-1">
              Total: {sellingRows.length || 0}
            </span>
          </div>
        </div>
      </header>

      {/* Internal tabs using shared Tabs component */}
      <Tabs
        tabs={[
          {
            label: "Selling",
            content: (
              <div className="space-y-4">
                <div className="">
                  <DataTable
                    title="Selling"
                    columns={sellingColumns}
                    data={sellingRows}
                    onAddNew={handleAddNew}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    loading={salesLoading}
                  />
                </div>
              </div>
            ),
          },
          {
            label: "Returns",
            content: (
              <div className="space-y-4">
                <DataTable
                  title="Sale Returns"
                  columns={salesReturnColumns}
                  data={salesReturnRows}
                  loading={salesReturnLoading}
                />
              </div>
            ),
          },
        ]}
      />

      {/* Sale Return Detail Modal */}
      <SaleReturnDetailModal
        open={!!selectedReturn}
        onClose={() => setSelectedReturn(null)}
        returnId={selectedReturn?._id}
        returnData={selectedReturn}
        onAction={() => {
          // Refresh data will be handled by query invalidation in hooks
        }}
      />
    </div>
  )
}
