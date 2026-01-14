"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import DataTable from "@/components/data-table"
import { Package, Search, Check } from "lucide-react"
import ProductImageGallery from "@/components/ui/ProductImageGallery"

// Currency util
function currency(n) {
    const num = Number(n || 0)
    return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ProductSelectionModal({ open, onClose, products = [], onSelect }) {
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [searchTerm, setSearchTerm] = useState("")

    // Filter products based on search term
    const filteredProducts = useMemo(() => {
        if (!searchTerm.trim()) return products

        const search = searchTerm.toLowerCase()
        return products.filter(product => {
            // Search in product name
            const nameMatch = product.name?.toLowerCase().includes(search)
            
            // Search in product code
            const codeMatch = product.productCode?.toLowerCase().includes(search) || 
                             product.sku?.toLowerCase().includes(search)
            
            // Search in supplier name
            const supplierName = product._original?.supplier?.name || 
                               product._original?.supplier?.company || 
                               product.supplier?.name || 
                               product.supplier?.company || ""
            const supplierMatch = supplierName.toLowerCase().includes(search)
            
            return nameMatch || codeMatch || supplierMatch
        })
    }, [products, searchTerm])

    const columns = useMemo(
        () => [
            {
                header: "Image",
                accessor: "image",
                render: (row) => (
                    <ProductImageGallery
                        images={row.images}
                        alt={row.name}
                        size="sm"
                        maxVisible={1}
                        showCount={false}
                    />
                ),
            },
            {
                header: "Product Details",
                accessor: "name",
                render: (row) => (
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">{row.name}</span>
                        <span className="text-xs text-muted-foreground">Code: {row.productCode}</span>
                        {row.season && Array.isArray(row.season) && row.season.length > 0 && (
                            <Badge variant="outline" className="w-fit mt-1 text-[10px] h-5 px-1">
                                {row.season.join(", ")}
                            </Badge>
                        )}
                    </div>
                ),
            },
            {
                header: "Supplier",
                accessor: "supplier",
                render: (row) => {
                    const supplier = row._original?.supplier
                    const supplierName = supplier?.name || supplier?.companyName || row._original?.supplierName || "-"
                    return (
                        <span className="text-sm text-muted-foreground">{supplierName}</span>
                    )
                },
            },
            {
                header: "Stock",
                accessor: "stock",
                render: (row) => {
                    const inventory = row._original?.inventory || {}
                    const availableStock = inventory.availableStock !== undefined 
                        ? inventory.availableStock 
                        : inventory.currentStock !== undefined 
                        ? inventory.currentStock 
                        : row._original?.stock !== undefined
                        ? row._original.stock
                        : row._original?.quantity !== undefined
                        ? row._original.quantity
                        : 0

                    return (
                        <span className={`tabular-nums font-medium ${availableStock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {availableStock}
                        </span>
                    )
                },
            },
            // {
            //     header: "Avg Landed Price",
            //     accessor: "avgLandedCost",
            //     render: (row) => {
            //         const inventory = row._original?.inventory || {}
            //         const avgCost = inventory.averageCostPrice || 0
            //         return (
            //             <span className="tabular-nums text-muted-foreground">
            //                 {avgCost > 0 ? currency(avgCost) : '-'}
            //             </span>
            //         )
            //     },
            // },
            {
                header: "Min Sell Price",
                accessor: "minSellPrice",
                render: (row) => {
                    const inventory = row._original?.inventory || {}
                    const avgCost = inventory.averageCostPrice || 0
                    const minSellPrice = avgCost > 0 ? avgCost * 1.20 : 0
                    return (
                        <span className="tabular-nums font-medium text-amber-600">
                            {minSellPrice > 0 ? currency(minSellPrice) : '-'}
                        </span>
                    )
                },
            },
            // {
            //     header: "Price",
            //     accessor: "defaultPrice",
            //     render: (row) => (
            //         <span className="tabular-nums font-medium">{currency(row.defaultPrice || 0)}</span>
            //     ),
            // },
            // {
            //     header: "Action",
            //     accessor: "actions",
            //     render: (row) => (
            //         <Button
            //             size="sm"
            //             variant="ghost"
            //             className="h-8 w-8 p-0"
            //             onClick={(e) => {
            //                 e.stopPropagation()
            //                 onSelect(row)
            //                 onClose()
            //             }}
            //         >
            //             <Check className="h-4 w-4 text-emerald-600" />
            //         </Button>
            //     ),
            // }
        ],
        [onSelect, onClose],
    )

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="w-full max-w-[1080px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Select Product from Inventory
                    </DialogTitle>
                </DialogHeader>

                <div className="px-6 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search by name, code, or supplier..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-6 pt-2">
                    <DataTable
                        columns={columns}
                        data={filteredProducts}
                        enableSearch={false}
                        onRowClick={(row) => {
                            onSelect(row)
                            onClose()
                        }}
                        rowClassName={() => "cursor-pointer hover:bg-muted/50"}
                    />
                </div>

                <DialogFooter className="p-4 border-t bg-muted/20">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
