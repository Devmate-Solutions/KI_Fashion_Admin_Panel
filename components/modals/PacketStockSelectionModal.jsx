"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Package, Search, Loader2, Box, Layers } from "lucide-react"
import { packetStockAPI } from "@/lib/api/endpoints/packetStock"
import ProductImageGallery from "@/components/ui/ProductImageGallery"

// Currency util
function currency(n) {
    const num = Number(n || 0)
    return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PacketStockSelectionModal({ open, onClose, onSelect }) {
    const [searchTerm, setSearchTerm] = useState("")
    const [packetStocks, setPacketStocks] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [filter, setFilter] = useState("all") // all, packets, loose

    // Fetch packet stocks when modal opens
    useEffect(() => {
        if (!open) return

        async function fetchPacketStocks() {
            try {
                setIsLoading(true)
                setError(null)

                const params = {
                    hasStock: 'true',
                    limit: 200
                }

                if (filter === 'packets') {
                    params.isLoose = 'false'
                } else if (filter === 'loose') {
                    params.isLoose = 'true'
                }

                const response = await packetStockAPI.getAll(params)
                const data = response.data?.data || response.data || []
                setPacketStocks(data)
            } catch (err) {
                console.error('Error fetching packet stocks:', err)
                setError('Failed to load inventory')
            } finally {
                setIsLoading(false)
            }
        }

        fetchPacketStocks()
    }, [open, filter])

    // Filter by search term and sort by supplier name alphabetically
    const filteredStocks = useMemo(() => {
        let result = packetStocks

        if (searchTerm.trim()) {
            const search = searchTerm.replace(/\s+/g, "").toLowerCase()
            const rawSearch = searchTerm.toLowerCase()
            result = packetStocks.filter(ps => {
                const productName = (ps.product?.name || "").replace(/\s+/g, "").toLowerCase()
                const productCode = ps.product?.productCode?.toLowerCase() || ps.product?.sku?.toLowerCase() || ''
                const barcode = ps.barcode?.toLowerCase() || ''
                const supplierName = ps.supplier?.name?.toLowerCase() || ps.supplier?.company?.toLowerCase() || ''

                return (
                    productName.includes(search) ||
                    productCode.includes(rawSearch) ||
                    barcode.includes(rawSearch) ||
                    supplierName.includes(rawSearch)
                )
            })
        }

        return [...result].sort((a, b) => {
            const nameA = (a.supplier?.name || a.supplier?.company || '').toLowerCase()
            const nameB = (b.supplier?.name || b.supplier?.company || '').toLowerCase()
            return nameA.localeCompare(nameB)
        })
    }, [packetStocks, searchTerm])

    // Handle selection
    function handleSelect(packetStock) {
        const totalItems = packetStock.totalItemsPerPacket || 1
        const suggestedPricePerItem = Number(packetStock.suggestedSellingPrice || 0) / totalItems

        const compositionText = packetStock.composition?.map(c =>
            `${c.size || '?'}/${c.color || '?'}×${c.quantity || 0}`
        ).join(', ') || ''

        const cartRow = {
            id: Date.now(),
            productId: packetStock.product?._id,
            productName: packetStock.product?.name || 'Unknown Product',
            productCode: packetStock.product?.productCode || packetStock.product?.sku || '',
            season: packetStock.product?.season || [],
            unitPrice: Number(suggestedPricePerItem).toFixed(2),
            quantity: 1,
            photo: packetStock.product?.images?.[0] || null,
            totalPrice: Number(suggestedPricePerItem * totalItems),
            isPacketSale: true,
            packetStockId: packetStock._id,
            packetBarcode: packetStock.barcode,
            packetComposition: packetStock.composition,
            totalItemsPerPacket: packetStock.totalItemsPerPacket,
            availablePackets: packetStock.availablePackets - (packetStock.reservedPackets || 0),
            isLoose: packetStock.isLoose,
            compositionText: compositionText,
            supplierName: packetStock.supplier?.name || ''
        }

        onSelect(cartRow)
        onClose()
    }

    useEffect(() => {
        if (!open) {
            setSearchTerm("")
            setError(null)
        }
    }, [open])

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="w-full max-w-[900px] h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
                <DialogHeader className="p-6 pb-3 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Browse Available Stock (Packets & Loose Items)
                    </DialogTitle>
                    {/* <DialogDescription>
                        <p>This stock is reserved and cannot be sold in normal selling entries</p>
                    </DialogDescription> */}
                </DialogHeader>

                <div className="px-6 pt-3 pb-3 border-b space-y-3 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search by product name, code, barcode, or supplier..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant={filter === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter("all")}
                            className="gap-1"
                        >
                            <Layers className="h-3.5 w-3.5" />
                            All
                        </Button>
                        <Button
                            variant={filter === "packets" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter("packets")}
                            className="gap-1"
                        >
                            <Box className="h-3.5 w-3.5" />
                            Packets Only
                        </Button>
                        <Button
                            variant={filter === "loose" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter("loose")}
                            className="gap-1"
                        >
                            <Package className="h-3.5 w-3.5" />
                            Loose Items Only
                        </Button>
                    </div>
                </div>

                <ScrollArea className="flex-1 overflow-hidden">
                    <div className="px-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : error ? (
                            <div className="text-center py-12 text-destructive">{error}</div>
                        ) : filteredStocks.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p>No stock available</p>
                                <p className="text-sm">Try adjusting your search or filter</p>
                            </div>
                        ) : (
                            <div className="space-y-2 py-4">
                                {filteredStocks.map((ps) => {
                                    const actualAvailable = ps.availablePackets - (ps.reservedPackets || 0)
                                    const totalItems = ps.totalItemsPerPacket || 1
                                    const pricePerItem = Number(ps.suggestedSellingPrice || 0) / totalItems

                                    return (
                                        <div
                                            key={ps._id}
                                            onClick={() => handleSelect(ps)}
                                            className="flex items-center gap-4 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex-shrink-0">
                                                <ProductImageGallery
                                                    images={ps.product?.images || []}
                                                    alt={ps.product?.name || 'Product'}
                                                    size="sm"
                                                    maxVisible={1}
                                                    showCount={false}
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-2">
                                                    <span className="font-medium text-sm truncate">
                                                        {ps.product?.name || 'Unknown Product'}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] flex-shrink-0 ${ps.isLoose ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                                                    >
                                                        {ps.isLoose ? 'LOOSE' : 'PACKET'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-muted-foreground font-mono">{ps.barcode}</span>
                                                    {ps.product?.productCode && (
                                                        <>
                                                            <span className="text-muted-foreground">•</span>
                                                            <span className="text-xs text-muted-foreground">Code: {ps.product.productCode}</span>
                                                        </>
                                                    )}
                                                </div>
                                                {ps.composition && ps.composition.length > 0 && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {ps.composition.map(c => `${c.size || '?'}/${c.color || '?'}×${c.quantity || 0}`).join(', ')}
                                                        <span className="ml-1 text-emerald-600">({totalItems} items/pkt)</span>
                                                    </div>
                                                )}
                                                {ps.supplier?.company && (
                                                    <div className="text-xs text-muted-foreground mt-0.5">Supplier: {ps.supplier.company}</div>
                                                )}
                                            </div>

                                            <div className="flex-shrink-0 text-right">
                                                <div className={`text-sm font-semibold tabular-nums ${actualAvailable > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {actualAvailable} {ps.isLoose ? 'items' : 'pkts'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">{currency(ps.suggestedSellingPrice || 0)}/pkt</div>
                                                <div className="text-[10px] text-muted-foreground">({currency(pricePerItem)}/item)</div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="p-4 border-t bg-muted/20 shrink-0">
                    <div className="flex items-center justify-between w-full">
                        <span className="text-sm text-muted-foreground">{filteredStocks.length} item(s) found</span>
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
