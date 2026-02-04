"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import ProductImageGallery from "@/components/ui/ProductImageGallery"
import { Loader2, RefreshCcw, ChevronDown, ChevronUp } from "lucide-react"
import { useCreateSaleReturn } from "@/lib/hooks/useSaleReturns"
import toast from "react-hot-toast"

export default function CreateSaleReturnModal({ open, onClose, sale }) {
    const [selectedItems, setSelectedItems] = useState({}) // { itemIndex: { quantity, reason, selected, isPartial } }
    const [variantReturns, setVariantReturns] = useState({}) // { itemIndex: { "size_color": quantity } }
    const [expandedItems, setExpandedItems] = useState({}) // { itemIndex: boolean }
    const [notes, setNotes] = useState("")
    const createMutation = useCreateSaleReturn()

    // Reset state on open
    useEffect(() => {
        if (open) {
            setSelectedItems({})
            setVariantReturns({})
            setExpandedItems({})
            setNotes("")
        }
    }, [open, sale])

    if (!sale) return null

    const getImageArray = (item) => {
        if (Array.isArray(item.product?.images) && item.product.images.length > 0) return item.product.images
        if (item.productImage) return Array.isArray(item.productImage) ? item.productImage : [item.productImage]
        return []
    }

    const handleSelectionChange = (idx, checked) => {
        setSelectedItems(prev => ({
            ...prev,
            [idx]: {
                ...prev[idx],
                selected: checked,
                quantity: checked ? (prev[idx]?.quantity || sale.items[idx].quantity) : (prev[idx]?.quantity || 0),
                isPartial: prev[idx]?.isPartial || false
            }
        }))
    }

    const handleQuantityChange = (idx, val) => {
        const qty = parseFloat(val)

        if (qty < 0) return

        setSelectedItems(prev => ({
            ...prev,
            [idx]: {
                ...prev[idx],
                quantity: qty,
                selected: qty > 0,
                isPartial: false // Manual override implies no automatic variant sync
            }
        }))
    }

    const handleVariantChange = (idx, size, color, qty) => {
        const key = `${size}_${color}`
        const newVariantReturns = {
            ...variantReturns[idx],
            [key]: parseFloat(qty) || 0
        }

        setVariantReturns(prev => ({
            ...prev,
            [idx]: newVariantReturns
        }))

        // Calculate total return fraction for packet
        const item = sale.items[idx]
        if (item.totalItemsPerPacket) {
            const totalItemsReturned = Object.values(newVariantReturns).reduce((a, b) => a + b, 0)
            const packetFraction = totalItemsReturned / item.totalItemsPerPacket

            setSelectedItems(prev => ({
                ...prev,
                [idx]: {
                    ...prev[idx],
                    quantity: packetFraction,
                    selected: packetFraction > 0,
                    isPartial: true
                }
            }))
        }
    }

    const toggleExpand = (idx) => {
        setExpandedItems(prev => ({ ...prev, [idx]: !prev[idx] }))
        if (!variantReturns[idx]) {
            setVariantReturns(prev => ({ ...prev, [idx]: {} }))
        }
    }

    const handleReasonChange = (idx, val) => {
        setSelectedItems(prev => ({
            ...prev,
            [idx]: {
                ...prev[idx],
                reason: val
            }
        }))
    }

    const handleSubmit = () => {
        const itemsToReturn = Object.entries(selectedItems)
            .filter(([_, data]) => data.selected && data.quantity > 0)
            .map(([idx, data]) => {
                const itemIdx = parseInt(idx)

                const returnObj = {
                    itemIndex: itemIdx,
                    returnedQuantity: parseFloat(data.quantity),
                    reason: data.reason || ""
                }

                // Add detailed composition if partial/variant based return
                if (data.isPartial && variantReturns[idx]) {
                    const composition = Object.entries(variantReturns[idx])
                        .filter(([_, qty]) => qty > 0)
                        .map(([key, qty]) => {
                            const [size, color] = key.split('_')
                            return { size, color, quantity: qty }
                        })

                    if (composition.length > 0) {
                        returnObj.returnComposition = composition
                    }
                }

                return returnObj
            })

        if (itemsToReturn.length === 0) {
            return toast.error("Please select items to return")
        }

        // Validation
        for (const item of itemsToReturn) {
            const originalItem = sale.items[item.itemIndex]
            if (item.returnedQuantity > originalItem.quantity) {
                return toast.error(`Return quantity cannot exceed original quantity for ${originalItem.product?.name || 'item'}`)
            }
        }

        createMutation.mutate({
            saleId: sale._id,
            items: itemsToReturn,
            notes
        }, {
            onSuccess: () => {
                toast.success("Return created successfully")
                onClose()
            },
            onError: (error) => {
                toast.error(error.message || "Failed to create return")
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RefreshCcw className="h-5 w-5 text-blue-600" />
                        Create Return for Sale #{sale.saleNumber || String(sale._id).slice(-6)}
                    </DialogTitle>
                    <DialogDescription>
                        Select items to return to stock.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="p-3 w-[40px]">
                                        {/* Checkbox */}
                                    </th>
                                    <th className="p-3 text-left">Product</th>
                                    <th className="p-3 text-left">Type</th>
                                    <th className="p-3 text-right">Sold Qty</th>
                                    <th className="p-3 w-[150px]">Return Qty</th>
                                    <th className="p-3">Reason</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {sale.items?.map((item, idx) => {
                                    const isSelected = selectedItems[idx]?.selected || false
                                    const returnQty = selectedItems[idx]?.quantity ?? (isSelected ? item.quantity : 0)
                                    const isPacket = item.isPacketSale

                                    return (
                                        <tr key={idx} className={isSelected ? "bg-blue-50/30" : ""}>
                                            <td className="p-3 align-top pt-4">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(c) => handleSelectionChange(idx, c)}
                                                />
                                            </td>
                                            <td className="p-3 align-top">
                                                <div className="flex gap-3">
                                                    <ProductImageGallery
                                                        images={getImageArray(item)}
                                                        alt={item.product?.name || "Product"}
                                                        size="sm"
                                                        maxVisible={1}
                                                        showCount={false}
                                                    />
                                                    <div>
                                                        <div className="font-medium">{item.product?.name || item.productCode || "—"}</div>
                                                        <div className="text-xs text-muted-foreground">{item.product?.sku}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 align-top">
                                                {isPacket ? (
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <Badge variant="outline" className="text-blue-600 border-blue-200">Packet</Badge>
                                                        <button
                                                            onClick={() => toggleExpand(idx)}
                                                            className="text-xs flex items-center gap-1 text-blue-600 hover:underline mt-1"
                                                        >
                                                            {expandedItems[idx] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                            {expandedItems[idx] ? "Hide Items" : "Return Items"}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <Badge variant="outline" className="text-amber-600 border-amber-200">Loose</Badge>
                                                )}
                                                {isPacket && item.packetBarcode && (
                                                    <div className="text-xs text-muted-foreground mt-1">{item.packetBarcode}</div>
                                                )}
                                            </td>
                                            <td className="p-3 text-right align-top pt-4">
                                                {item.quantity}
                                            </td>
                                            <td className="p-3 align-top">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max={item.quantity}
                                                    step={isPacket ? "0.01" : "1"}
                                                    value={returnQty || ""}
                                                    onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                                    disabled={!isSelected || selectedItems[idx]?.isPartial}
                                                    className="h-8 mb-2"
                                                />

                                                {/* Variant Breakdown for Packets */}
                                                {isPacket && expandedItems[idx] && (
                                                    <div className="bg-slate-50 p-3 rounded border text-xs space-y-2 mt-2 min-w-[200px]">
                                                        <div className="font-semibold text-slate-700 mb-2 border-b pb-1">Select Items to Return:</div>
                                                        {item.packetComposition?.map((comp, vIdx) => {
                                                            const key = `${comp.size}_${comp.color}`
                                                            const currentQty = variantReturns[idx]?.[key] || 0
                                                            const maxQty = comp.quantity * item.quantity // Total variants sold

                                                            return (
                                                                <div key={vIdx} className="flex items-center justify-between gap-2 mb-1">
                                                                    <span className="font-medium">{comp.size} / {comp.color}</span>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-muted-foreground text-[10px] mr-1">Max: {maxQty}</span>
                                                                        <Input
                                                                            type="number"
                                                                            min="0"
                                                                            max={maxQty}
                                                                            className="h-7 w-16 text-right px-1"
                                                                            placeholder="0"
                                                                            value={currentQty > 0 ? currentQty : ""}
                                                                            onChange={(e) => handleVariantChange(idx, comp.size, comp.color, e.target.value)}
                                                                            disabled={!isSelected}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                        <div className="text-[10px] text-blue-600 font-medium text-right border-t pt-2 mt-2">
                                                            Returning: {Object.values(variantReturns[idx] || {}).reduce((a, b) => a + b, 0)} items
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 align-top">
                                                <Input
                                                    placeholder="Reason..."
                                                    value={selectedItems[idx]?.reason || ""}
                                                    onChange={(e) => handleReasonChange(idx, e.target.value)}
                                                    disabled={!isSelected}
                                                    className="h-8"
                                                />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <Label htmlFor="returnNotes">Return Notes</Label>
                        <Textarea
                            id="returnNotes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional notes about this return..."
                            className="mt-1"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={createMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Return
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
