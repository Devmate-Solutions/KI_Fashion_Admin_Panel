"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpIcon, 
  ArrowDownIcon,
  PackageIcon,
  DatabaseIcon,
  AlertCircleIcon
} from "lucide-react"
import { returnsAPI } from "@/lib/api/endpoints/returns"
import toast from "react-hot-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * PacketReconciliationReport
 * 
 * Displays discrepancies between Inventory stock counts and PacketStock totals.
 * Helps admins identify products where packet configurations are out of sync.
 */
export default function PacketReconciliationReport() {
  const [loading, setLoading] = useState(true)
  const [discrepancies, setDiscrepancies] = useState([])
  const [summary, setSummary] = useState({
    inventoryHigherCount: 0,
    packetsHigherCount: 0,
    totalDifference: 0
  })

  const fetchDiscrepancies = async () => {
    try {
      setLoading(true)
      const response = await returnsAPI.getStockDiscrepancies()
      const data = response.data?.data || response.data || {}
      
      setDiscrepancies(data.discrepancies || [])
      setSummary(data.summary || {
        inventoryHigherCount: 0,
        packetsHigherCount: 0,
        totalDifference: 0
      })
    } catch (error) {
      console.error("Error fetching discrepancies:", error)
      toast.error("Failed to load stock discrepancies")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDiscrepancies()
  }, [])

  const hasDiscrepancies = discrepancies.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <PackageIcon className="h-5 w-5" />
            Packet Stock Reconciliation
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Compare Inventory counts with PacketStock totals to find discrepancies
          </p>
        </div>
        <Button
          onClick={fetchDiscrepancies}
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Discrepancies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${hasDiscrepancies ? 'text-amber-600' : 'text-green-600'}`}>
              {discrepancies.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {hasDiscrepancies ? 'Products with mismatched stock' : 'All synced!'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <ArrowUpIcon className="h-3 w-3 text-blue-500" />
              Inventory Higher
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary.inventoryHigherCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Inventory &gt; Packets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <ArrowDownIcon className="h-3 w-3 text-red-500" />
              Packets Higher
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary.packetsHigherCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Packets &gt; Inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Item Difference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalDifference}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Absolute difference
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Banner */}
      {!loading && (
        <Card className={hasDiscrepancies 
          ? 'border-amber-200 bg-amber-50/50' 
          : 'border-green-200 bg-green-50/50'
        }>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {hasDiscrepancies ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">
                      {discrepancies.length} product(s) have stock discrepancies
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      These products have different item counts in Inventory vs PacketStock. 
                      This can happen when returns are processed without variant information.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">
                      All products are synchronized
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Inventory and PacketStock counts match for all products.
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discrepancy Table */}
      {loading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading discrepancy data...</p>
            </div>
          </CardContent>
        </Card>
      ) : hasDiscrepancies ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Discrepancy Details</CardTitle>
            <CardDescription>
              Products where Inventory count differs from total items in PacketStock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1 justify-center">
                            <DatabaseIcon className="h-3 w-3" />
                            Inventory
                          </TooltipTrigger>
                          <TooltipContent>
                            Current stock from Inventory collection
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1 justify-center">
                            <PackageIcon className="h-3 w-3" />
                            Packets
                          </TooltipTrigger>
                          <TooltipContent>
                            Total items calculated from PacketStock records
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="text-center">Difference</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discrepancies.map((item, index) => (
                    <TableRow key={item.productId || index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {item.productCode}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {item.inventoryStock}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {item.packetStock}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-mono font-bold ${
                          item.difference > 0 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {item.difference > 0 ? '+' : ''}{item.difference}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {item.status === 'inventory_higher' ? (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                                  Inv Higher
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-red-100 text-red-800">
                                  <ArrowDownIcon className="h-3 w-3 mr-1" />
                                  Pkt Higher
                                </Badge>
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              {item.status === 'inventory_higher' 
                                ? 'Inventory shows more items than packets. This can happen when returns don\'t adjust packet stock.'
                                : 'PacketStock shows more items than inventory. This shouldn\'t happen normally.'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Help Section */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircleIcon className="h-4 w-4" />
            Understanding Discrepancies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Inventory Higher than Packets:</p>
            <p>
              This occurs when items are returned to suppliers without updating packet stock. 
              With the new packet-aware return system, this should automatically sync when 
              returns include variant composition (color/size).
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Packets Higher than Inventory:</p>
            <p>
              This is unusual and may indicate a system issue. It could occur if packets 
              were added without proper inventory updates, or if there's a data migration issue.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Resolution:</p>
            <p>
              For future returns, always provide variant details (color/size) when returning items. 
              For existing discrepancies, you may need to manually adjust packet stock or use 
              the packet break feature to align stock levels.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
