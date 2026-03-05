"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import BackButton from "@/components/BackButton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DataTable from "@/components/data-table"
import { useDispatchOrders } from "@/lib/hooks/useDispatchOrders"
import { useAuthStore } from "@/store/store"
import { Eye, Search, Package, Clock, CheckCircle2, AlertCircle, Filter, Truck } from "lucide-react"
import { cn } from "@/lib/utils"

const statusStyles = {
  pending: "bg-sky-500/15 text-sky-600 border-sky-200",
  "pending-approval": "bg-amber-500/15 text-amber-600 border-amber-200",
  confirmed: "bg-emerald-500/15 text-emerald-600 border-emerald-200",
  picked_up: "bg-blue-500/15 text-blue-600 border-blue-200",
  in_transit: "bg-amber-500/15 text-amber-600 border-amber-200",
  delivered: "bg-green-500/15 text-green-600 border-green-200",
  cancelled: "bg-rose-500/15 text-rose-600 border-rose-200",
}

const statusFilters = [
  { value: "all", label: "All Orders", icon: Package },
  { value: "pending", label: "Pending", icon: Clock },
  { value: "pending-approval", label: "Pending Approval", icon: AlertCircle },
  { value: "confirmed", label: "Confirmed", icon: CheckCircle2 },
]

export default function DispatchOrdersPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super-admin'
  const [statusFilter, setStatusFilter] = useState("all")

  const params = useMemo(() => {
    // Show all active and pending orders for admins
    let status = 'pending,pending-approval,confirmed'
    if (statusFilter !== "all") {
      status = statusFilter
    }
    const p = { limit: 100, status }
    return p
  }, [statusFilter])

  const { data: dispatchOrders = [], isLoading } = useDispatchOrders(params)
  const [searchQuery, setSearchQuery] = useState("")

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return dispatchOrders
    const query = searchQuery.toLowerCase()
    return dispatchOrders.filter(order => {
      const orderNumber = (order.orderNumber || "").toLowerCase()
      const supplierName = (order.supplier?.name || order.supplier?.company || "").toLowerCase()
      const logisticsName = (order.logisticsCompany?.name || "").toLowerCase()
      return orderNumber.includes(query) || supplierName.includes(query) || logisticsName.includes(query)
    })
  }, [dispatchOrders, searchQuery])

  const columns = useMemo(() => [
    {
      header: "Order Number",
      accessor: "orderNumber",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-foreground">{row.orderNumber || "—"}</span>
          {row.dispatchDate && (
            <span className="text-xs text-muted-foreground font-medium">
              {new Date(row.dispatchDate).toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Supplier",
      accessor: "supplierName",
      render: (row) => {
        const supplier = row.supplier || {}
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-foreground">{supplier.name || supplier.company || "—"}</span>
            {supplier.company && supplier.name && (
              <span className="text-xs text-muted-foreground font-medium">{supplier.company}</span>
            )}
          </div>
        )
      },
    },
    {
      header: "Boxes",
      accessor: "totalBoxes",
      render: (row) => (
        <span className="font-semibold text-foreground tabular-nums">{row.totalBoxes || 0}</span>
      ),
    },
   
    {
      header: "Quantity",
      accessor: "totalQuantity",
      render: (row) => {
        // Calculate remaining quantity after returns
        const totalQuantity = row.totalQuantity || 0
        let totalReturned = 0

        // Sum up all returned quantities from returnedItems
        if (row.returnedItems && Array.isArray(row.returnedItems)) {
          totalReturned = row.returnedItems.reduce((sum, returned) => {
            return sum + (returned.quantity || 0)
          }, 0)
        }

        // For confirmed orders, use confirmedQuantities if available
        let remainingQuantity = totalQuantity
        // if (row.status === 'confirmed' ) {
        //   // Sum confirmed quantities
        //   remainingQuantity = row.confirmedQuantities.reduce((sum, cq) => {
        //     return sum + (cq.quantity || 0)
        //   }, 0)
        // } else if (totalReturned > 0) {
        //   // For other statuses, subtract returned items
        // }
        remainingQuantity = totalQuantity - totalReturned

        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-foreground tabular-nums">{remainingQuantity.toLocaleString()}</span>
            {totalReturned > 0 && (
              <span className="text-xs text-rose-600 font-medium">
                ({totalReturned.toLocaleString()} returned)
              </span>
            )}
          </div>
        )
      },
    },
     {
      header: "Logistics",
      accessor: "logisticsCompany",
      render: (row) => {
        const logistics = row.logisticsCompany || {}
        return <span className="font-medium text-foreground text-gray-400">{logistics.name || "—"}</span>
      },
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => {
        const status = row.status || "pending"
        const statusLabel = status.replace(/_/g, " ").replace(/-/g, " ").toUpperCase()
        return (
          <Badge 
            className={cn(
              "font-semibold px-2.5 py-1 rounded-md border",
              statusStyles[status] || statusStyles.pending
            )}
          >
            {statusLabel}
          </Badge>
        )
      },
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/dispatch-orders/${row._id}`)
            }}
            className="hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Eye className="h-4 w-4 mr-1.5" />
            View
          </Button>
        </div>
      ),
    },
  ], [router])

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="mb-3">
        <BackButton fallbackPath="/home" label="Back" />
      </div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Dispatch Orders</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage pending, pending-approval, and confirmed dispatch orders from suppliers.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Data Table with Filters */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4 p-3 sm:p-4 border-b border-border">
          {/* Filters - Left Side */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground flex-shrink-0">
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Filter by status:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {statusFilters.map((filter) => {
                const Icon = filter.icon
                const isActive = statusFilter === filter.value
                return (
                  <button
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className={cn(
                      "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 h-10",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground hover:bg-muted border border-border"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="whitespace-nowrap">{filter.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          {/* Search - Right Side, Desktop Only */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                className="h-10 w-64 rounded-md border border-input bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 hover:border-ring/50"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              className="h-10 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0"
              onClick={() => setSearchQuery("")}
            >
              Search
            </button>
          </div>
        </div>
        <div className="[&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none [&>div>div:first-child]:!hidden">
          <DataTable
            columns={columns}
            data={filteredData}
            loading={isLoading}
            enableSearch={false}
            paginate={true}
            pageSize={20}
            onRowClick={(row) => router.push(`/dispatch-orders/${row._id}`)}
          />
        </div>
      </div>
    </div>
  )
}

