"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import ProductImageGallery from "@/components/ui/ProductImageGallery"
import { Loader2, RefreshCcw, ChevronDown, ChevronUp, Package } from "lucide-react"
import { useCreateSaleReturn } from "@/lib/hooks/useSaleReturns"
import toast from "react-hot-toast"

function friendlyError(msg) {
    if (!msg) return "Failed to create return"
    if (msg.includes("Duplicate return request detected")) return "This return request was already submitted. Please refresh if you do not see it yet."
    if (msg.includes("composition total") || msg.includes("don't add up")) return "The return item quantities don't match the packet contents. Please review your selection."
    if (msg.includes("returnComposition must be provided")) return "Please specify which items you're returning from the packet."
    if (msg.includes("Original quantity mismatch")) return "Sale data has changed. Please refresh and try again."
    return msg
}

export default function CreateSaleReturnModal({ open, onClose, sale }) {
    const [selectedItems, setSelectedItems] = useState({})
    // selectedItems shape: { [itemIndex]: { selected, quantity, reason, returnMode: 'whole_packets'|'partial_items', variantSelections: {size_color: qty}, partialExpanded: bool } }
    const [notes, setNotes] = useState("")
    const createMutation = useCreateSaleReturn()
    const submitLockRef = useRef(false)

    useEffect(() => {
        if (open) {
            setSelectedItems({})
            setNotes("")
            submitLockRef.current = false
        }
    }, [open, sale])

    if (!sale) return null

    const getImageArray = (item) => {
        if (Array.isArray(item.product?.images) && item.product.images.length > 0) return item.product.images
        if (item.productImage) return Array.isArray(item.productImage) ? item.productImage : [item.productImage]
        return []
    }

    const handleSelectionChange = (idx, checked) => {
        const item = sale.items[idx]
        const itemsPerPacket = item.totalItemsPerPacket || 1
        const packetsCount = item.isPacketSale ? Math.floor(item.quantity / itemsPerPacket) : item.quantity
        setSelectedItems(prev => ({
            ...prev,
            [idx]: {
                ...prev[idx],
                selected: checked,
                quantity: checked ? (prev[idx]?.quantity || packetsCount) : 0,
                returnMode: prev[idx]?.returnMode || 'whole_packets',
                variantSelections: prev[idx]?.variantSelections || {},
                partialExpanded: prev[idx]?.partialExpanded || false
            }
        }))
    }

    const handleQuantityChange = (idx, val) => {
        const item = sale.items[idx]
        const itemsPerPacket = item.totalItemsPerPacket || 1
        const maxPackets = item.isPacketSale ? Math.floor(item.quantity / itemsPerPacket) : item.quantity
        const qty = parseInt(val) || 0
        if (qty < 0 || qty > maxPackets) return

        setSelectedItems(prev => ({
            ...prev,
            [idx]: {
                ...prev[idx],
                quantity: qty,
                selected: qty > 0,
                returnMode: 'whole_packets'
            }
        }))
    }

    const handleVariantChange = (idx, size, color, val) => {
        const key = `${size}_${color}`
        const item = sale.items[idx]
        const comp = item.packetComposition?.find(c => c.size === size && c.color === color)
        const packetsCount = Math.floor(item.quantity / (item.totalItemsPerPacket || 1))
        const maxQty = (comp?.quantity || 0) * packetsCount
        const qty = Math.min(Math.max(0, parseInt(val) || 0), maxQty)

        setSelectedItems(prev => {
            const newVariants = { ...(prev[idx]?.variantSelections || {}), [key]: qty }
            const totalItems = Object.values(newVariants).reduce((a, b) => a + b, 0)
            return {
                ...prev,
                [idx]: {
                    ...prev[idx],
                    variantSelections: newVariants,
                    quantity: totalItems, // Individual item count, not packet fraction
                    selected: totalItems > 0,
                    returnMode: 'partial_items'
                }
            }
        })
    }

    const togglePartialExpand = (idx) => {
        setSelectedItems(prev => {
            const current = prev[idx] || {}
            const newExpanded = !current.partialExpanded
            return {
                ...prev,
                [idx]: {
                    ...current,
                    partialExpanded: newExpanded,
                    returnMode: newExpanded ? 'partial_items' : 'whole_packets',
                    quantity: newExpanded ? 0 : (current.quantity || 0),
                    variantSelections: newExpanded ? (current.variantSelections || {}) : {}
                }
            }
        })
    }

    const handleReasonChange = (idx, val) => {
        setSelectedItems(prev => ({
            ...prev,
            [idx]: { ...prev[idx], reason: val }
        }))
    }

    const handleSubmit = () => {
        if (createMutation.isPending || submitLockRef.current) {
            return
        }

        submitLockRef.current = true

        const itemsToReturn = Object.entries(selectedItems)
            .filter(([_, data]) => data.selected && data.quantity > 0)
            .map(([idx, data]) => {
                const itemIdx = parseInt(idx)
                const saleItem = sale.items[itemIdx]

                const returnObj = {
                    itemIndex: itemIdx,
                    product: saleItem.product?._id || saleItem.product,
                    originalQuantity: saleItem.quantity,
                    returnedQuantity: parseFloat(data.quantity),
                    unitPrice: saleItem.unitPrice,
                    reason: data.reason || ""
                }

                // Add composition only for partial (item-level) returns; whole-packet returns handled by backend
                if (data.returnMode === 'partial_items' && data.variantSelections) {
                    const composition = Object.entries(data.variantSelections)
                        .filter(([_, qty]) => qty > 0)
                        .map(([key, qty]) => {
                            const [size, color] = key.split('_')
                            return { size, color, quantity: qty }
                        })
                    if (composition.length > 0) {
                        returnObj.returnComposition = composition
                        returnObj.isPartialReturn = true
                    }
                }

                return returnObj
            })

        if (itemsToReturn.length === 0) {
            submitLockRef.current = false
            return toast.error("Please select items to return")
        }

        // Validation
        for (const item of itemsToReturn) {
            const originalItem = sale.items[item.itemIndex]
            // For partial returns, qty is individual items; for whole-packet, qty is packets
            const maxReturn = item.isPartialReturn
                ? originalItem.quantity // total individual items
                : (originalItem.isPacketSale
                    ? Math.floor(originalItem.quantity / (originalItem.totalItemsPerPacket || 1))
                    : originalItem.quantity)
            if (item.returnedQuantity > maxReturn) {
                submitLockRef.current = false
                return toast.error(`Return quantity exceeds sold quantity for ${originalItem.product?.name || 'item'}`)
            }
        }

        createMutation.mutate({
            sale: sale._id,
            items: itemsToReturn,
            notes
        }, {
            onSuccess: () => {
                submitLockRef.current = false
                toast.success("Return created successfully")
                onClose()
            },
            onError: (error) => {
                submitLockRef.current = false
                const msg = error?.response?.data?.message || error?.message
                toast.error(friendlyError(msg))
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
                        Select items to return to stock. For packets, you can return whole packets or individual items.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-3">
                        {sale.items?.map((item, idx) => {
                            const state = selectedItems[idx] || {}
                            const isSelected = state.selected || false
                            const isPacket = item.isPacketSale
                            const isPartialMode = isPacket && state.partialExpanded
                            const totalVariantSelected = isPartialMode
                                ? Object.values(state.variantSelections || {}).reduce((a, b) => a + b, 0)
                                : 0
                            // For packet sales, quantity is total items; convert to actual packet count
                            const itemsPerPacket = item.totalItemsPerPacket || 1
                            const packetsCount = isPacket ? Math.floor(item.quantity / itemsPerPacket) : item.quantity

                            return (
                                <div key={idx} className={`border rounded-lg p-4 transition-colors ${isSelected ? "border-blue-300 bg-blue-50/30" : ""}`}>
                                    <div className="flex items-start gap-3">
                                        <div className="pt-1">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={(c) => handleSelectionChange(idx, c)}
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex gap-3 flex-1">
                                                    <ProductImageGallery
                                                        images={getImageArray(item)}
                                                        alt={item.product?.name || "Product"}
                                                        size="sm"
                                                        maxVisible={1}
                                                        showCount={false}
                                                    />
                                                    <div>
                                                        <div className="font-medium">{item.product?.name || item.productCode || "\u2014"}</div>
                                                        <div className="text-xs text-muted-foreground">{item.product?.sku}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {isPacket ? (
                                                                <Badge variant="outline" className="text-blue-600 border-blue-200">Packet</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-amber-600 border-amber-200">Loose</Badge>
                                                            )}
                                                            {isPacket && item.packetBarcode && (
                                                                <span className="text-xs text-muted-foreground font-mono">{item.packetBarcode}</span>
                                                            )}
                                                        </div>
                                                        {isPacket && item.totalItemsPerPacket && (
                                                            <div className="text-xs text-blue-600 mt-1">
                                                                <Package className="h-3 w-3 inline mr-1" />
                                                                {item.totalItemsPerPacket} items per packet \u2022 Sold: {packetsCount} packet(s)
                                                            </div>
                                                        )}
                                                        {!isPacket && (
                                                            <div className="text-xs text-muted-foreground mt-1">Sold: {item.quantity}</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Qty controls */}
                                                <div className="flex-shrink-0">
                                                    {!isPartialMode && (
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                type="button" variant="outline" size="icon" className="h-8 w-8"
                                                                disabled={!isSelected}
                                                                onClick={() => handleQuantityChange(idx, (state.quantity || 0) - 1)}
                                                            >-</Button>
                                                            <Input
                                                                type="number" min="0" max={packetsCount}
                                                                className="w-16 h-8 text-center"
                                                                value={(state.quantity || 0) > 0 ? (state.quantity || 0) : ""}
                                                                onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                                                disabled={!isSelected}
                                                            />
                                                            <Button
                                                                type="button" variant="outline" size="icon" className="h-8 w-8"
                                                                disabled={!isSelected}
                                                                onClick={() => handleQuantityChange(idx, (state.quantity || 0) + 1)}
                                                            >+</Button>
                                                            {isPacket && <span className="text-xs text-muted-foreground">packet(s)</span>}
                                                        </div>
                                                    )}
                                                    {isPartialMode && totalVariantSelected > 0 && (
                                                        <div className="text-right">
                                                            <div className="text-sm font-semibold text-blue-600">{totalVariantSelected} item(s)</div>
                                                            <div className="text-xs text-muted-foreground">from {item.quantity} total</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expandable partial item section for packets */}
                                            {isPacket && item.packetComposition?.length > 0 && isSelected && (
                                                <div className="mt-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePartialExpand(idx)}
                                                        className="text-xs flex items-center gap-1 text-blue-600 hover:underline"
                                                    >
                                                        {state.partialExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                        {state.partialExpanded ? 'Return whole packets instead' : 'Return individual items from packet'}
                                                    </button>

                                                    {state.partialExpanded && (
                                                        <div className="bg-blue-50/50 p-3 rounded-md border border-blue-100 mt-2 space-y-2">
                                                            <div className="text-xs font-semibold text-slate-700 border-b pb-1 mb-2">
                                                                Select individual items to return:
                                                            </div>
                                                            {item.packetComposition.map((comp, vIdx) => {
                                                                const key = `${comp.size}_${comp.color}`
                                                                const currentQty = state.variantSelections?.[key] || 0
                                                                const maxQty = comp.quantity * packetsCount

                                                                return (
                                                                    <div key={vIdx} className="flex items-center justify-between gap-2">
                                                                        <div>
                                                                            <span className="text-sm font-medium">{comp.size} / {comp.color}</span>
                                                                            <span className="text-xs text-muted-foreground ml-2">(max {maxQty})</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <Button type="button" variant="outline" size="icon" className="h-7 w-7"
                                                                                onClick={() => handleVariantChange(idx, comp.size, comp.color, currentQty - 1)}>-</Button>
                                                                            <Input type="number" min="0" max={maxQty} className="w-16 h-7 text-center text-sm"
                                                                                value={currentQty > 0 ? currentQty : ""}
                                                                                onChange={(e) => handleVariantChange(idx, comp.size, comp.color, e.target.value)} />
                                                                            <Button type="button" variant="outline" size="icon" className="h-7 w-7"
                                                                                onClick={() => handleVariantChange(idx, comp.size, comp.color, currentQty + 1)}>+</Button>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                            <div className="text-xs font-medium text-right border-t pt-2 mt-2 text-blue-600">
                                                                Returning {totalVariantSelected} of {item.quantity} items
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Reason */}
                                            {isSelected && (
                                                <div className="mt-3">
                                                    <Input
                                                        placeholder="Return reason..."
                                                        value={state.reason || ""}
                                                        onChange={(e) => handleReasonChange(idx, e.target.value)}
                                                        className="h-8"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
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
