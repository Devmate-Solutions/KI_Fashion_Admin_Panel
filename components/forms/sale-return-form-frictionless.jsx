"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Trash2 as TrashIcon, Search, Loader2 as Loader2Icon, ShoppingBag, CheckCircle as CheckCircleIcon, ChevronDown, ChevronUp, User, Package } from "lucide-react"
import { Label } from "@/components/ui/label"
import { saleReturnsAPI } from "@/lib/api/endpoints/saleReturns"
import toast from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import BritishDatePicker from "@/components/BritishDatePicker"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

export default function SaleReturnFormFrictionless({ onSave }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState({ sales: [], buyers: [] })
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [salesExpanded, setSalesExpanded] = useState(true)
  const [selectedItems, setSelectedItems] = useState([])
  const [returnDate, setReturnDate] = useState(new Date())
  const router = useRouter()
  
  // Item Selection Dialog (for selecting items from a sale)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [currentSale, setCurrentSale] = useState(null)
  const [itemSelections, setItemSelections] = useState([])

  const [submitting, setSubmitting] = useState(false)
  const searchInputRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const resultsRef = useRef(null)

  // Auto-focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults({ sales: [], buyers: [] })
      setShowResults(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearching(true)
        const response = await saleReturnsAPI.universalSearch(searchQuery.trim())
        const data = response.data?.data || response.data || {}
        
        setSearchResults({
          sales: data.sales || [],
          buyers: data.buyers || []
        })
        setShowResults(true)
      } catch (error) {
        console.error("Search error:", error)
        toast.error("Search failed")
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target) &&
          !searchInputRef.current.contains(event.target)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Open item selection dialog for a sale
  const openItemDialog = (sale) => {
    setCurrentSale(sale)
    
    const initialItems = sale.items.map(item => {
      // For packet sales, quantity is total items (e.g. 4 items = 1 packet of 4)
      // Convert to packet counts for proper limits
      const itemsPerPacket = item.totalItemsPerPacket || 1
      const packetsSold = item.isPacketSale ? Math.floor(item.quantity / itemsPerPacket) : item.quantity
      const packetsReturned = item.isPacketSale ? item.alreadyReturned : item.alreadyReturned
      const returnablePackets = item.isPacketSale ? Math.floor(item.returnableQty / itemsPerPacket) : item.returnableQty

      return {
        itemIndex: item.itemIndex,
        product: item.product,
        productName: item.productName,
        productCode: item.productCode,
        quantity: item.quantity,
        alreadyReturned: item.alreadyReturned,
        returnableQty: item.returnableQty,
        packetsSold,
        returnablePackets,
        returnQty: 0,
        unitPrice: item.unitPrice,
        variant: item.variant,
        isPacketSale: item.isPacketSale,
        packetBarcode: item.packetBarcode,
        packetComposition: item.packetComposition,
        totalItemsPerPacket: item.totalItemsPerPacket,
        reason: "",
        returnMode: 'whole_packets',
        variantSelections: {},
        partialExpanded: false
      }
    })

    setItemSelections(initialItems)
    setItemDialogOpen(true)
    setShowResults(false)
  }

  const confirmItemSelection = () => {
    // Filter items that have a return qty > 0 OR have partial variant selections
    const selectedFromSale = itemSelections.filter(item => {
      if (item.isPacketSale && item.returnMode === 'partial_items') {
        const totalVariantItems = Object.values(item.variantSelections || {}).reduce((a, b) => a + b, 0)
        return totalVariantItems > 0
      }
      return item.returnQty > 0
    })
    
    if (selectedFromSale.length === 0) {
      toast.error("Please select at least one item to return")
      return
    }

    // Validate return quantities
    for (const item of selectedFromSale) {
      if (item.isPacketSale && item.returnMode === 'partial_items') {
        // Validate individual variant selections don't exceed available items
        const totalVariantItems = Object.values(item.variantSelections || {}).reduce((a, b) => a + b, 0)
        const maxItems = item.returnableQty // returnableQty is already in individual items
        if (totalVariantItems > maxItems) {
          toast.error(`Cannot return more than ${maxItems} items from packet for ${item.productName}`)
          return
        }
      } else if (item.isPacketSale) {
        // Whole-packet mode: validate against returnable packets
        if (item.returnQty > item.returnablePackets) {
          toast.error(`Cannot return more than ${item.returnablePackets} packet(s) of ${item.productName}`)
          return
        }
      } else if (item.returnQty > item.returnableQty) {
        toast.error(`Cannot return more than ${item.returnableQty} of ${item.productName}`)
        return
      }
    }

    // Add items to the return list
    const newItems = selectedFromSale.map(item => {
      let returnQty = item.returnQty
      let returnCompositionDetails = undefined
      let returnMode = item.isPacketSale ? item.returnMode : 'whole_packets'

      if (item.isPacketSale && item.returnMode === 'partial_items') {
        // Build composition from variant selections
        returnCompositionDetails = Object.entries(item.variantSelections || {})
          .filter(([_, qty]) => qty > 0)
          .map(([key, qty]) => {
            const [size, color] = key.split('_')
            return { size, color, quantity: qty }
          })
        // For partial returns, returnQty = actual individual items selected
        const totalVariantItems = Object.values(item.variantSelections || {}).reduce((a, b) => a + b, 0)
        returnQty = totalVariantItems
      }

      return {
        id: Date.now() + Math.random(),
        saleId: currentSale._id,
        saleNumber: currentSale.saleNumber,
        buyer: currentSale.buyer,
        itemIndex: item.itemIndex,
        product: item.product,
        productName: item.productName,
        productCode: item.productCode,
        originalQuantity: item.quantity,
        alreadyReturned: item.alreadyReturned,
        returnableQty: item.returnableQty,
        returnablePackets: item.returnablePackets,
        returnQty,
        unitPrice: item.unitPrice,
        variant: item.variant,
        isPacketSale: item.isPacketSale,
        packetBarcode: item.packetBarcode,
        packetComposition: item.packetComposition,
        totalItemsPerPacket: item.totalItemsPerPacket,
        reason: item.reason,
        returnMode,
        returnCompositionDetails
      }
    })

    setSelectedItems(prev => [...prev, ...newItems])
    toast.success(`${selectedFromSale.length} item(s) added to return`)
    setItemDialogOpen(false)
    setCurrentSale(null)
    setSearchQuery("")
    searchInputRef.current?.focus()
  }

  const updateItem = (id, field, value) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.id !== id) return item

      if (field === "returnQty") {
        const numValue = Number(value)
        // For partial item returns, max is in individual items; for whole-packet, max is packets
        const maxReturn = (item.isPacketSale && item.returnMode !== 'partial_items')
          ? (item.returnablePackets || item.returnableQty)
          : item.returnableQty
        if (numValue > maxReturn) {
          toast.error(`Max ${maxReturn}${item.isPacketSale && item.returnMode !== 'partial_items' ? ' packet(s)' : ' item(s)'} available`)
          return item
        }
        if (numValue < 0) return item
      }

      return { ...item, [field]: value }
    }))
  }

  const removeItem = (id) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id))
    searchInputRef.current?.focus()
  }

  // Calculate totals
  const totals = selectedItems.reduce((acc, item) => {
    let refundAmount, pieceCount
    if (item.isPacketSale && item.returnMode === 'partial_items') {
      // Partial return: returnQty is individual items, unitPrice is per-item
      refundAmount = item.returnQty * item.unitPrice
      pieceCount = item.returnQty
    } else if (item.isPacketSale) {
      // Whole-packet return: returnQty is packets, unitPrice is per-item
      refundAmount = item.returnQty * (item.totalItemsPerPacket || 1) * item.unitPrice
      pieceCount = item.returnQty * (item.totalItemsPerPacket || 1)
    } else {
      refundAmount = item.returnQty * item.unitPrice
      pieceCount = item.returnQty
    }

    return {
      totalRefund: acc.totalRefund + refundAmount,
      totalItems: acc.totalItems + Math.round(pieceCount)
    }
  }, { totalRefund: 0, totalItems: 0 })

  // Group items by sale for submission
  const groupBySale = () => {
    const groups = new Map()

    selectedItems.forEach(item => {
      if (!groups.has(item.saleId)) {
        groups.set(item.saleId, {
          saleId: item.saleId,
          saleNumber: item.saleNumber,
          buyer: item.buyer,
          items: []
        })
      }

      const group = groups.get(item.saleId)
      group.items.push(item)
    })

    return Array.from(groups.values())
  }

  const handleSave = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please add items to return")
      return
    }

    // Validate all items have reasons
    const itemsWithoutReason = selectedItems.filter(item => !item.reason || item.reason.trim() === "")
    if (itemsWithoutReason.length > 0) {
      toast.error("Please provide return reason for all items")
      return
    }

    try {
      setSubmitting(true)

      const saleGroups = groupBySale()

      for (const group of saleGroups) {
        const itemsData = group.items.map(item => ({
          itemIndex: item.itemIndex,
          product: item.product,
          originalQuantity: item.originalQuantity,
          returnedQuantity: item.returnQty,
          unitPrice: item.unitPrice,
          reason: item.reason,
          // Tell backend this is a partial item return (returnedQuantity is in items, not packets)
          isPartialReturn: item.returnMode === 'partial_items' || false,
          // For partial item returns, send explicit composition; for whole-packet, backend auto-derives
          returnComposition: item.returnMode === 'partial_items' && item.returnCompositionDetails
            ? item.returnCompositionDetails
            : undefined
        }))

        const payload = {
          sale: group.saleId,
          items: itemsData,
          notes: `Sale return processed - ${group.items.length} item(s) from ${group.saleNumber}`,
          returnDate: returnDate.toISOString()
        }

        const response = await saleReturnsAPI.create(payload)

        if (response?.status === 202) {
          toast.success('Backdated sale return request submitted for approval of super admin.')
          router.push('/my-requests')
          if (onSave) onSave()
          return
        }
      }

      const itemCount = selectedItems.length
      const saleCount = saleGroups.length
      const totalItems = totals.totalItems
      
      toast.success(`✓ Return processed! ${itemCount} line item(s) (${totalItems} pieces) from ${saleCount} sale(s)`, {
        duration: 3000
      })

      if (onSave) onSave()
      setSelectedItems([])
      setSearchQuery("")
      searchInputRef.current?.focus()

    } catch (error) {
      console.error("Error creating return:", error)
      const msg = error.response?.data?.message || error.message || "Failed to create return"
      // Map technical backend errors to user-friendly messages
      if (msg.includes("composition total") || msg.includes("don't add up")) {
        toast.error("The return item quantities don't match the packet contents. Please review your selection.")
      } else if (msg.includes("returnComposition must be provided")) {
        toast.error("Please specify which items you're returning from the packet.")
      } else if (msg.includes("Original quantity mismatch")) {
        toast.error("Sale data has changed. Please refresh and try again.")
      } else {
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const totalResults = searchResults.sales.length + searchResults.buyers.length

  return (
    <div className="space-y-6">
      {/* Universal Search */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Universal Search
              </CardTitle>
              <CardDescription>
                Search by sale number, invoice number, or customer name - find sales to process returns!
              </CardDescription>
            </div>
            <div className="w-[200px]">
              <Label className="text-xs mb-1 block">Return Date</Label>
              <BritishDatePicker
                selected={returnDate}
                onChange={setReturnDate}
                restrictByRole={true}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Type sale number, invoice number, or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => totalResults > 0 && setShowResults(true)}
              className="h-12 text-lg pr-10"
              autoComplete="off"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Search Results Dropdown */}
            {showResults && totalResults > 0 && (
              <div 
                ref={resultsRef}
                className="absolute z-50 w-full mt-2 bg-white border-2 border-primary rounded-lg shadow-lg max-h-[500px] overflow-y-auto"
              >

                {/* Sales */}
                {searchResults.sales.length > 0 && (
                  <div>
                    <div 
                      className="px-4 py-2 bg-muted/50 font-semibold text-sm flex items-center justify-between cursor-pointer hover:bg-muted"
                      onClick={() => setSalesExpanded(!salesExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4" />
                        Sales ({searchResults.sales.length})
                      </div>
                      <ChevronDown 
                        className={`h-4 w-4 transition-transform duration-200 ${
                          salesExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                    {salesExpanded && searchResults.sales.map((sale) => (
                      <div
                        key={sale._id}
                        className="px-4 py-3 hover:bg-muted/50 cursor-pointer border-b transition-colors"
                        onClick={() => openItemDialog(sale)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-mono text-sm font-semibold text-primary">
                              {sale.saleNumber}
                            </p>
                            <p className="font-medium">
                              {sale.isManualSale 
                                ? sale.buyer?.name || 'Walk-in Customer' 
                                : sale.buyer?.name || 'Unknown'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(sale.saleDate).toLocaleDateString()} • {sale.items.length} returnable item(s)
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <Badge variant="outline">
                              {sale.deliveryStatus}
                            </Badge>
                            <p className="text-sm font-medium mt-1">
                              £{sale.grandTotal.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Buyers */}
                {searchResults.buyers.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-muted/50 font-semibold text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customers ({searchResults.buyers.length})
                    </div>
                    {searchResults.buyers.map((buyer) => (
                      <div
                        key={buyer._id}
                        className="px-4 py-3 hover:bg-muted/50 cursor-pointer border-b transition-colors"
                        onClick={() => {
                          setSearchQuery(buyer.name)
                          setShowResults(false)
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{buyer.name}</p>
                            {buyer.company && (
                              <p className="text-sm text-muted-foreground">{buyer.company}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {buyer.phone} • {buyer.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        
        </CardContent>
      </Card>

      {/* Selected Items */}
      {selectedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Items to Return ({selectedItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedItems.map((item) => {
                return (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{item.productName}</p>
                          {item.variant && (
                            <Badge variant="secondary" className="text-xs">
                              {item.variant.size}/{item.variant.color}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {item.productCode} • Sale: {item.saleNumber}
                        </p>
                        
                        {item.isPacketSale && (
                          <p className="text-sm text-muted-foreground font-mono">
                            Barcode: {item.packetBarcode}
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground mt-1">
                          Sold: {item.originalQuantity} • Already returned: {item.alreadyReturned} • Available: {item.returnableQty}
                        </p>

                        <div className="mt-2">
                          <Label className="text-xs text-muted-foreground">Return Reason</Label>
                          <Textarea
                            placeholder="Why is this being returned?"
                            value={item.reason}
                            onChange={(e) => updateItem(item.id, "reason", e.target.value)}
                            className="h-16 mt-1"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <Label className="text-xs text-muted-foreground">Qty:</Label>
                            <Input
                              type="number"
                              min="0"
                              max={item.isPacketSale && item.returnMode !== 'partial_items' ? item.returnablePackets : item.returnableQty}
                              value={item.returnQty}
                              onChange={(e) => updateItem(item.id, "returnQty", Number(e.target.value))}
                              className="h-8 w-20 text-right"
                            />
                          </div>
                          <p className="text-sm font-semibold">
                            £{(item.isPacketSale && item.returnMode !== 'partial_items'
                              ? item.returnQty * (item.totalItemsPerPacket || 1) * item.unitPrice
                              : item.returnQty * item.unitPrice
                            ).toFixed(2)}
                          </p>
                          {item.isPacketSale && item.returnMode !== 'partial_items' && item.returnQty > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {item.returnQty} pkt × {item.totalItemsPerPacket} items × £{item.unitPrice.toFixed(2)}
                            </p>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary and Actions */}
      {selectedItems.length > 0 && (
        <Card className="border-2 border-primary">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-lg font-semibold">Return Summary</p>
                <p className="text-sm text-muted-foreground">
                  {selectedItems.length} line item(s) • {totals.totalItems} pieces • {groupBySale().length} sale(s)
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Refund</p>
                <p className="text-3xl font-bold text-primary">£{totals.totalRefund.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedItems([])
                  setSearchQuery("")
                  searchInputRef.current?.focus()
                }}
                disabled={submitting}
                className="flex-1"
              >
                Clear All
              </Button>
              <Button
                onClick={handleSave}
                disabled={submitting}
                className="flex-1 h-12 text-base"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2Icon className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Process Return (${totals.totalItems} items)`
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-3">
              Stock will be restored and customer accounts will be credited
            </p>
          </CardContent>
        </Card>
      )}

      {/* Item Selection Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Items to Return</DialogTitle>
            <DialogDescription>
              Choose items from sale {currentSale?.saleNumber}
              <br />
              <span className="text-xs">Customer: {currentSale?.buyer?.name || 'Walk-in'}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
            {itemSelections.map((item, idx) => {
              const isPartialMode = item.isPacketSale && item.returnMode === 'partial_items'
              const totalVariantSelected = isPartialMode
                ? Object.values(item.variantSelections || {}).reduce((a, b) => a + b, 0)
                : 0

              return (
                <div key={idx} className="p-3 border rounded-lg hover:bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">
                        {item.productName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.productCode}
                        {item.variant && ` • ${item.variant.size}/${item.variant.color}`}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Sold: {item.isPacketSale ? `${item.packetsSold} packet(s)` : item.quantity} • Already returned: {item.alreadyReturned} • Available: {item.isPacketSale ? `${item.returnablePackets} packet(s)` : item.returnableQty}
                      </div>
                      {item.isPacketSale && item.packetBarcode && (
                        <div className="text-xs text-muted-foreground font-mono mt-1">
                          Barcode:  {item.packetBarcode}
                        </div>
                      )}
                      {item.isPacketSale && item.totalItemsPerPacket && (
                        <div className="text-xs text-blue-600 mt-1">
                          <Package className="h-3 w-3 inline mr-1" />
                          {item.totalItemsPerPacket} items per packet
                        </div>
                      )}
                      <div className="text-sm font-medium mt-1">
                        £{item.unitPrice.toFixed(2)} per item{item.isPacketSale ? ` (£${(item.unitPrice * (item.totalItemsPerPacket || 1)).toFixed(2)} per packet)` : ''}
                      </div>
                    </div>

                    {/* Qty controls — only shown for whole-packet / loose mode */}
                    {!isPartialMode && (
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setItemSelections(prev => prev.map((v, i) =>
                              i === idx ? { ...v, returnQty: Math.max(0, v.returnQty - 1) } : v
                            ))
                          }}
                          disabled={item.returnQty <= 0}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          max={item.isPacketSale ? item.returnablePackets : item.returnableQty}
                          className="w-20 h-8 text-center"
                          value={item.returnQty > 0 ? item.returnQty : ""}
                          onChange={(e) => {
                            const maxVal = item.isPacketSale ? item.returnablePackets : item.returnableQty
                            const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), maxVal)
                            setItemSelections(prev => prev.map((v, i) =>
                              i === idx ? { ...v, returnQty: val } : v
                            ))
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setItemSelections(prev => prev.map((v, i) => {
                              const maxVal = v.isPacketSale ? v.returnablePackets : v.returnableQty
                              return i === idx ? { ...v, returnQty: Math.min(maxVal, v.returnQty + 1) } : v
                            }
                            ))
                          }}
                        >
                          +
                        </Button>
                        {item.isPacketSale && (
                          <span className="text-xs text-muted-foreground ml-1">packet(s)</span>
                        )}
                      </div>
                    )}

                    {/* Summary for partial mode */}
                    {isPartialMode && totalVariantSelected > 0 && (
                      <div className="ml-4 text-right">
                        <div className="text-sm font-semibold text-blue-600">
                          {totalVariantSelected} item(s)
                        </div>
                        <div className="text-xs text-muted-foreground">
                          from {item.returnableQty} available
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expandable partial item selection for packets */}
                  {item.isPacketSale && item.packetComposition?.length > 0 && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setItemSelections(prev => prev.map((v, i) => {
                            if (i !== idx) return v
                            const newPartialExpanded = !v.partialExpanded
                            return {
                              ...v,
                              partialExpanded: newPartialExpanded,
                              returnMode: newPartialExpanded ? 'partial_items' : 'whole_packets',
                              // Reset packet qty when switching to partial
                              returnQty: newPartialExpanded ? 0 : v.returnQty
                            }
                          }))
                        }}
                        className="text-xs flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        {item.partialExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {item.partialExpanded ? 'Return whole packets instead' : 'Return individual items from packet'}
                      </button>

                      {item.partialExpanded && (
                        <div className="bg-blue-50/50 p-3 rounded-md border border-blue-100 mt-2 space-y-2">
                          <div className="text-xs font-semibold text-slate-700 border-b pb-1 mb-2">
                            Select individual items to return:
                          </div>
                          {item.packetComposition.map((comp, vIdx) => {
                            const key = `${comp.size}_${comp.color}`
                            const currentQty = item.variantSelections?.[key] || 0
                            const maxQty = comp.quantity * item.returnablePackets

                            return (
                              <div key={vIdx} className="flex items-center justify-between gap-2">
                                <div>
                                  <span className="text-sm font-medium">{comp.size} / {comp.color}</span>
                                  <span className="text-xs text-muted-foreground ml-2">(max {maxQty})</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setItemSelections(prev => prev.map((v, i) => {
                                        if (i !== idx) return v
                                        const newQty = Math.max(0, (v.variantSelections?.[key] || 0) - 1)
                                        return { ...v, variantSelections: { ...v.variantSelections, [key]: newQty } }
                                      }))
                                    }}
                                  >
                                    -
                                  </Button>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={maxQty}
                                    className="w-16 h-7 text-center text-sm"
                                    value={currentQty > 0 ? currentQty : ""}
                                    onChange={(e) => {
                                      const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), maxQty)
                                      setItemSelections(prev => prev.map((v, i) => {
                                        if (i !== idx) return v
                                        return { ...v, variantSelections: { ...v.variantSelections, [key]: val } }
                                      }))
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setItemSelections(prev => prev.map((v, i) => {
                                        if (i !== idx) return v
                                        const newQty = Math.min(maxQty, (v.variantSelections?.[key] || 0) + 1)
                                        return { ...v, variantSelections: { ...v.variantSelections, [key]: newQty } }
                                      }))
                                    }}
                                  >
                                    +
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                          <div className="text-xs font-medium text-right border-t pt-2 mt-2 text-blue-600">
                            Returning {totalVariantSelected} of {item.returnableQty} items
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg border border-primary/20">
              <span className="font-semibold">Total Items to Return:</span>
              <span className="font-bold text-lg">
                {itemSelections.reduce((sum, v) => {
                  if (v.isPacketSale && v.returnMode === 'partial_items') {
                    return sum + Object.values(v.variantSelections || {}).reduce((a, b) => a + b, 0)
                  }
                  return sum + (v.isPacketSale ? v.returnQty * (v.totalItemsPerPacket || 1) : v.returnQty)
                }, 0)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmItemSelection}>
              Add to Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
