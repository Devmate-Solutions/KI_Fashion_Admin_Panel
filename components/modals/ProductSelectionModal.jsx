"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
                header: "Stock",
                accessor: "stock",
                render: (row) => {
                    // Try to get stock from inventoryInfo if available (from lookup), or fallback to row data
                    // The products passed from sale-form might not have full inventory info unless enriched
                    // But sale-form fetches products using productsAPI.getAll which usually returns inventory stats
                    // Let's inspect the `products` structure in sale-form.jsx again.
                    // It maps: productCode, color, size, defaultPrice.
                    // It doesn't seem to explicitly map 'stock' or 'inventory'.
                    // I might need to rely on what's available or fetching.
                    // However, for the purpose of "Select Product", just showing what we have is good.
                    // If we can't show stock, we can skip it or show a placeholder.
                    // Actually, sale-form.jsx products array is:
                    // { id, name, productCode, color, size, images, pricing, defaultPrice, _original }
                    // The _original object contains the full product data.
                    // Let's assume _original.inventory.availableStock or similar exists.

                    const inventory = row._original?.inventory || {}
                    const stock = inventory.availableStock !== undefined ? inventory.availableStock : (inventory.currentStock || 0)

                    return (
                        <span className={`tabular-nums font-medium ${stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {stock}
                        </span>
                    )
                },
            },
            {
                header: "Price",
                accessor: "defaultPrice",
                render: (row) => (
                    <span className="tabular-nums font-medium">{currency(row.defaultPrice || 0)}</span>
                ),
            },
            {
                header: "Action",
                accessor: "actions",
                render: (row) => (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                            e.stopPropagation()
                            onSelect(row)
                            onClose()
                        }}
                    >
                        <Check className="h-4 w-4 text-emerald-600" />
                    </Button>
                ),
            }
        ],
        [onSelect, onClose],
    )

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Select Product from Inventory
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-6 pt-2">
                    <DataTable
                        columns={columns}
                        data={products}
                        enableSearch={true}
                        searchPlaceholder="Search by name, code, or type..."
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
