"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DataTable from "@/components/data-table"
import { useDispatchOrders } from "@/lib/hooks/useDispatchOrders"
import { Eye, Plus } from "lucide-react"

const statusStyles = {
  pending: "bg-sky-500/15 text-sky-600 border-sky-200",
  confirmed: "bg-emerald-500/15 text-emerald-600 border-emerald-200",
  picked_up: "bg-blue-500/15 text-blue-600 border-blue-200",
  in_transit: "bg-amber-500/15 text-amber-600 border-amber-200",
  delivered: "bg-green-500/15 text-green-600 border-green-200",
  cancelled: "bg-rose-500/15 text-rose-600 border-rose-200",
}

export default function DispatchOrdersPage() {
  const router = useRouter()

  const params = useMemo(() => {
    const p = { limit: 100, status: 'pending' }
    return p
  }, [])

  const { data: dispatchOrders = [], isLoading } = useDispatchOrders(params)

  const columns = useMemo(() => [
    {
      header: "Order Number",
      accessor: "orderNumber",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.orderNumber || "—"}</span>
          {row.dispatchDate && (
            <span className="text-xs text-muted-foreground">
              {new Date(row.dispatchDate).toLocaleDateString('en-GB')}
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
          <div className="flex flex-col">
            <span className="font-medium">{supplier.name || supplier.company || "—"}</span>
            {supplier.company && supplier.name && (
              <span className="text-xs text-muted-foreground">{supplier.company}</span>
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
        return <span>{logistics.name || "—"}</span>
      },
    },
    {
      header: "Boxes",
      accessor: "totalBoxes",
      render: (row) => <span>{row.totalBoxes || 0}</span>,
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
        if (row.status === 'confirmed' && row.confirmedQuantities && Array.isArray(row.confirmedQuantities)) {
          // Sum confirmed quantities
          remainingQuantity = row.confirmedQuantities.reduce((sum, cq) => {
            return sum + (cq.quantity || 0)
          }, 0)
        } else if (totalReturned > 0) {
          // For other statuses, subtract returned items
          remainingQuantity = totalQuantity - totalReturned
        }
        
        return (
          <div className="flex flex-col">
            <span className="font-medium">{remainingQuantity}</span>
            {totalReturned > 0 && (
              <span className="text-xs text-red-600">
                ({totalReturned} returned)
              </span>
            )}
          </div>
        )
      },
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => {
        const status = row.status || "pending"
        return (
          <Badge className={statusStyles[status] || statusStyles.pending}>
            {status.replace("_", " ").toUpperCase()}
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
            onClick={() => router.push(`/dispatch-orders/${row._id}`)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        </div>
      ),
    },
  ], [router])

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dispatch Orders</h1>
          <p className="text-sm text-muted-foreground">
            Manage pending dispatch orders from suppliers. Confirmed orders appear in the Buying page.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={dispatchOrders}
        loading={isLoading}
        enableSearch={true}
        paginate={true}
        pageSize={20}
      />
    </div>
  )
}

