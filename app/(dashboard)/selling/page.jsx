"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import BackButton from "@/components/BackButton"
import Tabs from "@/components/tabs"
import DataTable from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useSales, useDeleteSale } from "@/lib/hooks/useSales"
import { useSaleReturns } from "@/lib/hooks/useSaleReturns"
import { useBuyers } from "@/lib/hooks/useBuyers"
import SaleReturnDetailModal from "@/components/modals/SaleReturnDetailModal"
import CustomerPaymentModal from "@/components/modals/CustomerPaymentModal"
import ProductImageGallery from "@/components/ui/ProductImageGallery"
import { Plus, RotateCcw } from "lucide-react"
import { useAuthStore } from "@/store/store"
import DeleteRequestDialog from "@/components/modals/DeleteRequestDialog"
import { useSearchParams } from "next/navigation"
import BritishDatePicker from "@/components/BritishDatePicker"
import { Label } from "@/components/ui/label"
import { exportToPDF } from "@/lib/utils/pdfExport"
import toast from "react-hot-toast"

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

function formatLocalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function SellingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === "super-admin"
  const [deleteRequestTarget, setDeleteRequestTarget] = useState(null)
  const initialTab = Number(searchParams.get("tab") ?? 0)
  const [activeTab, setActiveTab] = useState(initialTab)
  const today = formatLocalDate(new Date())
  const [dateRange, setDateRange] = useState({ from: "", to: "" })

  // Fetch sales data
  const { data: sellingRows = [], isLoading: salesLoading } = useSales({
    limit: 500,
    startDate: dateRange.from,
    endDate: dateRange.to,
  })

  const filteredSellingRows = useMemo(() => {
    const fromBoundary = dateRange.from ? new Date(dateRange.from) : null
    const toBoundary = dateRange.to ? new Date(dateRange.to) : null

    if (fromBoundary && Number.isNaN(fromBoundary.getTime())) return []
    if (toBoundary && Number.isNaN(toBoundary.getTime())) return []

    if (fromBoundary) fromBoundary.setHours(0, 0, 0, 0)
    if (toBoundary) toBoundary.setHours(23, 59, 59, 999)

    return sellingRows.filter((row) => {
      const rowDate = new Date(row?.date)
      if (Number.isNaN(rowDate.getTime())) return false
      if (fromBoundary && rowDate < fromBoundary) return false
      if (toBoundary && rowDate > toBoundary) return false
      return true
    })
  }, [sellingRows, dateRange.from, dateRange.to])

  // Fetch buyers for payment modal
  const { data: buyers = [] } = useBuyers({ limit: 100 })

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
              <a
                href={`/selling/${row.id}`}
                className="text-xs text-blue-600 hover:underline mt-1"
                onClick={(e) => {
                  e.preventDefault()
                  router.push(`/selling/${row.id}`)
                }}
              >
                SN {row._original.saleNumber}
              </a>
            )}
            {row._original?.isManualSale && (
              <Badge className="bg-blue-500/15 text-blue-600 border-blue-200 text-xs mt-1 w-fit">
                Manual Sale
              </Badge>
            )}
          </div>
        ),
        pdfValue: (row) => row.date ? new Date(row.date).toLocaleDateString('en-GB') : "—"
      },
      {
        header: "Buyer",
        accessor: "customerName",
        render: (row) => {
          const company = row.companyName;
          const name = row.customerName;
          const hasCompany = company && company !== "—" && company !== name;

          if (!hasCompany) {
            return <span className="font-medium">{name || "—"}</span>;
          }

          return (
            <div className="flex flex-col">
              <span className="font-medium">
                {company}
              </span>
              <span className="text-[11px] text-muted-foreground leading-tight">
                {name || "—"}
              </span>
            </div>
          );
        },
        pdfValue: (row) => {
          const company = row.companyName;
          const name = row.customerName;
          return company && company !== "—" ? `${company} (${name})` : name || "—";
        }
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
                        maxVisible={1}
                        showCount={true}
                      />
                      <div className="text-xs leading-tight">
                        {item.product?._id || item.productId ? (
                          <Link
                            href={`/stock/${item.product?._id || item.productId}/packets`}
                            className="font-semibold text-sm text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.product?.name || item.productCode || "—"}
                          </Link>
                        ) : (
                          <div className="font-semibold text-sm">{item.product?.name || item.productCode || "—"}</div>
                        )}
                        {item.isPacketSale ? (
                          <div className="text-[10px] text-blue-600 font-medium">
                            Packet: {item.packetBarcode || '—'}
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-600 font-medium">
                            Loose Item
                          </div>
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
        pdfValue: (row) => (row.items || []).map(item => `${item.product?.name || item.productCode || "—"} (x${item.quantity})`).join(", ")
      },
      {
        header: "Total",
        accessor: "total",
        render: (row) => <span className="tabular-nums font-medium">{currency(row.total || 0)}</span>,
        pdfValue: (row) => row.total || 0
      },
      {
        header: "Cash Paid",
        accessor: "cash",
        render: (row) => <span className="tabular-nums">{currency((row.cash || 0))}</span>,
        pdfValue: (row) => (row.cash || 0)
      },
      {
        header: "Bank Paid",
        accessor: "bank",
        render: (row) => <span className="tabular-nums">{currency((row.bankCash || 0))}</span>,
        pdfValue: (row) => (row.bankCash || 0)
      },
      {
        header: "Discount",
        accessor: "discount",
        render: (row) => <span className="tabular-nums">{currency((row.discount || 0))}</span>,
        pdfValue: (row) => (row.discount || 0)
      },
      {
        header: "Balance",
        accessor: "balance",
        render: (row) => <span className="tabular-nums">{currency(row.balance || 0)}</span>,
        pdfValue: (row) => row.balance || 0
      },
      // {
      //   header: "Status",
      //   accessor: "paymentStatus",
      //   render: (row) => {
      //     const statusStyles = {
      //       paid: "bg-emerald-500/15 text-emerald-600 border-emerald-200",
      //       partial: "bg-amber-500/15 text-amber-600 border-amber-200",
      //       pending: "bg-sky-500/15 text-sky-600 border-sky-200",
      //       overdue: "bg-rose-500/15 text-rose-600 border-rose-200",
      //     }
      //     return (
      //       <Badge
      //         variant="outline"
      //         className={statusStyles[row.paymentStatus] || statusStyles.pending}
      //       >
      //         {row.paymentStatus || "pending"}
      //       </Badge>
      //     )
      //   },
      //   pdfValue: (row) => (row.paymentStatus || "pending").toUpperCase()
      // },
    ],
    [],
  )

  const handleDownloadPDF = async () => {
    try {
      const result = await exportToPDF({
        title: "Sales Report",
        columns: sellingColumns,
        data: filteredSellingRows,
        dateRange: dateRange,
        filename: `Sales_Report_${dateRange.from || 'All'}_${dateRange.to || 'All'}`
      })
      if (result.success) {
        toast.success("PDF report generated!")
      } else {
        toast.error("Failed to generate PDF")
      }
    } catch (err) {
      toast.error("PDF generation failed: " + err.message)
    }
  }

  // Handle Add New Sale
  function handleAddNew() {
    router.push('/selling/new')
  }

  // Handle Edit Sale - Navigate to full edit page
  function handleEdit(sale) {
    router.push(`/selling/${sale.id}/edit`)
  }

  // Handle Delete Sale
  async function handleDelete(sale) {
    if (!isSuperAdmin) {
      // Non-super-admin: open delete request dialog
      setDeleteRequestTarget(sale)
      return
    }
    if (window.confirm(`Are you sure you want to delete sale #${String(sale.id).slice(-6)}?`)) {
      try {
        await deleteSaleMutation.mutateAsync(sale.id)
      } catch (error) {
        console.error('Error deleting sale:', error)
      }
    }
  }

  // Sales Return
  const { data: salesReturnData, isLoading: salesReturnLoading } = useSaleReturns({
    limit: 500,
    startDate: dateRange.from,
    endDate: dateRange.to,
  })
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
        pdfValue: (r) => r._id ? String(r._id).slice(-8) : "—"
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
                href={`/selling/${r.sale._id}`}
                className="text-xs text-blue-600 hover:underline mt-1"
                onClick={(e) => {
                  e.preventDefault()
                  router.push(`/selling/${r.sale._id}`)
                }}
              >
                View Sale →
              </a>
            )}
          </div>
        ),
        pdfValue: (r) => r.sale?.saleNumber || "—"
      },
      {
        header: "Buyer",
        accessor: "buyer",
        render: (r) => (
          <span>{r.buyer?.name || r.buyer?.company || "—"}</span>
        ),
        pdfValue: (r) => r.buyer?.name || r.buyer?.company || "—"
      },
      {
        header: "Return Date",
        accessor: "returnedAt",
        render: (r) => (
          <span>
            {r.returnedAt ? new Date(r.returnedAt).toLocaleDateString('en-GB') : "—"}
          </span>
        ),
        pdfValue: (r) => r.returnedAt ? new Date(r.returnedAt).toLocaleDateString('en-GB') : "—"
      },
      {
        header: "Items",
        accessor: "items",
        render: (r) => (
          <span>
            {Array.isArray(r.items)
              ? r.items.reduce((sum, item) => {
                const saleItem = r.sale?.items?.[item.itemIndex]
                const isWholePacket = saleItem?.isPacketSale && !item.isPartialReturn
                const multiplier = isWholePacket ? (saleItem?.totalItemsPerPacket || 1) : 1
                return sum + ((item.returnedQuantity || 0) * multiplier)
              }, 0)
              : 0} item(s)
          </span>
        ),
        pdfValue: (r) => {
          const count = Array.isArray(r.items)
            ? r.items.reduce((sum, item) => {
              const saleItem = r.sale?.items?.[item.itemIndex]
              const isWholePacket = saleItem?.isPacketSale && !item.isPartialReturn
              const multiplier = isWholePacket ? (saleItem?.totalItemsPerPacket || 1) : 1
              return sum + ((item.returnedQuantity || 0) * multiplier)
            }, 0)
            : 0
          return `${count} item(s)`
        }
      },
      {
        header: "Total Value",
        accessor: "totalReturnValue",
        render: (r) => (
          <span className="tabular-nums font-medium">
            {currency(r.totalReturnValue || 0)}
          </span>
        ),
        pdfValue: (r) => currency(r.totalReturnValue || 0)
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
        pdfValue: (r) => (r.status || 'pending').toUpperCase()
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

  // Tab state sync
  const handleTabChange = (idx) => {
    setActiveTab(idx)
    router.replace(`/selling?tab=${idx}`, { scroll: false })
  }

  // Loading state
  if (salesLoading) {
    return (
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Selling</h1>
            <p className="text-sm text-muted-foreground">Manage customer sales and monitor payment status.</p>
          </div>
        </header>
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
    <div className="mx-auto  p-4">
      {/* Page header to match other sections */}
      <header className="mb-4 sticky">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="">
            <BackButton fallbackPath="/home" label="Back" />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Button
              onClick={() => setPaymentModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white text-sm"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Payment
            </Button>

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
                <div className="flex flex-row items-end gap-3 mb-4">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <Label className="text-xs">From Date</Label>
                    <BritishDatePicker
                      value={dateRange.from || null}
                      onChange={(date) => {
                        setDateRange(r => ({ ...r, from: date ? formatLocalDate(date) : "" }))
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <Label className="text-xs">To Date</Label>
                    <BritishDatePicker
                      value={dateRange.to || null}
                      onChange={(date) => {
                        setDateRange(r => ({ ...r, to: date ? formatLocalDate(date) : "" }))
                      }}
                    />
                  </div>
                  {/* {(dateRange.from || dateRange.to) && (
                    <Button variant="outline" size="sm" onClick={() => setDateRange({ from: "", to: "" })}>
                      Clear
                    </Button>
                  )} */}
                </div>
                <div className="">
                  <DataTable
                    title="Selling"
                    columns={sellingColumns}
                    data={filteredSellingRows}
                    onAddNew={handleAddNew}
                    onDownloadPDF={handleDownloadPDF}
                    loading={salesLoading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </div>
              </div>
            ),
          },
          // {
          //   label: "Sale Returns",
          //   content: (
          //     <div className="space-y-4">
          //       <div className="flex items-center justify-between mb-4">
          //         <h2 className="text-lg font-semibold">Return History</h2>
          //         <Button
          //           onClick={() => router.push('/selling/return')}
          //           className="bg-rose-600 hover:bg-rose-700"
          //         >
          //           <RotateCcw className="h-4 w-4 mr-2" />
          //           Create Sale Return
          //         </Button>
          //       </div>
          //       <DataTable
          //         title="Return History"
          //         columns={salesReturnColumns}
          //         data={salesReturnRows}
          //         loading={salesReturnLoading}
          //       />
          //     </div>
          //   ),
          // },
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
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

      {/* Customer Payment Modal */}
      <CustomerPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        entities={buyers}
        onSuccess={() => {
          // Data refresh handled by query invalidation in the modal
        }}
      />

      {/* Delete Request Dialog (non-super-admin) */}
      <DeleteRequestDialog
        open={!!deleteRequestTarget}
        onClose={() => setDeleteRequestTarget(null)}
        entityType="sale"
        entityId={deleteRequestTarget?.id}
        entityRef={deleteRequestTarget?.invoiceNumber || String(deleteRequestTarget?.id).slice(-6)}
        entitySummary={deleteRequestTarget ? {
          "Invoice": deleteRequestTarget.invoiceNumber || String(deleteRequestTarget.id).slice(-6),
          "Buyer": deleteRequestTarget.buyer?.name || deleteRequestTarget.buyerName || "Unknown",
          "Amount": currency(deleteRequestTarget.totalAmount || deleteRequestTarget.grandTotal),
          "Date": deleteRequestTarget.date ? new Date(deleteRequestTarget.date).toLocaleDateString("en-GB") : "—",
        } : {}}
        onSuccess={() => setDeleteRequestTarget(null)}
      />
    </div>
  )
}
