"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2 as TrashIcon, Search, Loader2 as Loader2Icon, Package as PackageIcon, CheckCircle as CheckCircleIcon, AlertTriangle as AlertTriangleIcon, Layers as LayersIcon, ShoppingCart, ChevronDown, Info as InfoIcon, Unlink as UnlinkIcon } from "lucide-react"
import { Label } from "@/components/ui/label"
import { returnsAPI } from "@/lib/api/endpoints/returns"
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

export default function BuyingReturnFormFrictionless({ onSave }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState({ packets: [], products: [] })
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [packetsExpanded, setPacketsExpanded] = useState(true)
  const [selectedItems, setSelectedItems] = useState([])
  const [returnDate, setReturnDate] = useState(new Date())
  const router = useRouter()
  
  // Variant Selection Dialog
  const [variantDialogOpen, setVariantDialogOpen] = useState(false)
  const [currentProduct, setCurrentProduct] = useState(null)
  const [variantSelections, setVariantSelections] = useState([])

  // Packet partial return dialog
  const [packetItemDialogOpen, setPacketItemDialogOpen] = useState(false)
  const [currentPacketItem, setCurrentPacketItem] = useState(null)
  const [packetItemSelections, setPacketItemSelections] = useState([])

  // Packet validation state
  const [packetValidation, setPacketValidation] = useState({})
  const [validatingPackets, setValidatingPackets] = useState(false)

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
      setSearchResults({ packets: [], products: [] })
      setShowResults(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearching(true)
        const response = await returnsAPI.universalSearch(searchQuery.trim())
        const data = response.data?.data || response.data || {}
        
        setSearchResults({
          packets: data.packets || [],
          products: data.products || []
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

  // Validate packet stock for items with variants
  useEffect(() => {
    if (selectedItems.length === 0) {
      setPacketValidation({})
      return
    }

    const itemsWithComposition = selectedItems.filter(
      item => item.returnComposition && item.returnComposition.length > 0
    )

    if (itemsWithComposition.length === 0) {
      setPacketValidation({})
      return
    }

    const validateItems = async () => {
      setValidatingPackets(true)
      const newValidation = {}

      for (const item of itemsWithComposition) {
        try {
          const response = await returnsAPI.validateReturnComposition({
            productId: item.productId,
            supplierId: item.supplierId,
            returnComposition: item.returnComposition,
            quantity: item.returnQty
          })

          const result = response.data?.data || response.data
          newValidation[item.productId] = {
            valid: result.valid,
            errors: result.errors || [],
            warnings: result.warnings || [],
            plannedAdjustments: result.plannedAdjustments || []
          }
        } catch (error) {
          console.error("Packet validation error:", error)
          newValidation[item.productId] = {
            valid: false,
            errors: [error.response?.data?.message || "Validation failed"],
            warnings: [],
            plannedAdjustments: []
          }
        }
      }

      setPacketValidation(newValidation)
      setValidatingPackets(false)
    }

    const timer = setTimeout(validateItems, 500)
    return () => clearTimeout(timer)
  }, [selectedItems])

  const allValidationsPass = Object.values(packetValidation).every(v => v.valid)
  const hasValidationErrors = Object.values(packetValidation).some(v => !v.valid)

  // Add packet to return list
  const addPacket = (packet) => {
    const existing = selectedItems.find(item => 
      item.type === 'packet' && item.packetStockId === packet._id
    )
    
    if (existing) {
      // Prevent duplicate add if already set to partial return mode
      if (existing.returnMode === 'partial_items') {
        toast.error("This packet is already set for partial return. Edit items or remove it first.")
        setSearchQuery("")
        setShowResults(false)
        searchInputRef.current?.focus()
        return
      }
      toast("Packet already added - increasing quantity", { icon: '📦' })
      updateItem(existing.id, "returnQty", existing.returnQty + 1)
      setSearchQuery("")
      setShowResults(false)
      searchInputRef.current?.focus()
      return
    }

    const newItem = {
      id: Date.now(),
      type: 'packet',
      packetStockId: packet._id,
      barcode: packet.barcode,
      productId: packet.productId,
      productName: packet.productName,
      productCode: packet.productCode,
      supplierId: packet.supplierId,
      supplierName: packet.supplierName,
      isLoose: packet.isLoose,
      composition: packet.composition || [],
      totalItemsPerPacket: packet.totalItemsPerPacket,
      availableQty: packet.availablePackets,
      returnQty: 1,
      costPrice: packet.supplierCostPrice || packet.costPrice || packet.pricePerItem || 0,
      pricePerItem: packet.pricePerItem,
      reason: ""
    }

    setSelectedItems(prev => [...prev, newItem])
    toast.success(`✓ ${packet.barcode} added`)
    setSearchQuery("")
    setShowResults(false)
    searchInputRef.current?.focus()
  }

  // Open variant selection for product
  const openVariantDialog = (product) => {
    if (!product.variantComposition || product.variantComposition.length === 0) {
      // No variants - add directly with quantity 1
      const existing = selectedItems.find(item => 
        item.type === 'product' && 
        item.productId === product.productId && 
        item.supplierId === product.supplierId
      )
      
      if (existing) {
        toast("Product already added", { icon: '📦' })
        return
      }

      const newItem = {
        id: Date.now(),
        type: 'product',
        productId: product.productId,
        productName: product.productName,
        productCode: product.productCode,
        supplierId: product.supplierId,
        supplierName: product.supplierName,
        availableQty: product.availableStock,
        returnQty: 1,
        costPrice: product.supplierCostPrice || product.costPrice || product.averageCostPrice || 0,
        returnComposition: [],
        reason: ""
      }

      setSelectedItems(prev => [...prev, newItem])
      toast.success("Product added")
      setSearchQuery("")
      setShowResults(false)
      searchInputRef.current?.focus()
      return
    }

    setCurrentProduct(product)
    
    const initialVariants = product.variantComposition.map(v => ({
      size: v.size,
      color: v.color,
      max: v.quantity,
      quantity: 0
    }))

    setVariantSelections(initialVariants)
    setVariantDialogOpen(true)
    setShowResults(false)
  }

  const confirmVariantSelection = () => {
    const selectedVariants = variantSelections.filter(v => v.quantity > 0)
    
    if (selectedVariants.length === 0) {
      toast.error("Please select at least one variant")
      return
    }

    const totalQty = selectedVariants.reduce((sum, v) => sum + v.quantity, 0)
    
    const existing = selectedItems.find(item => 
      item.type === 'product' && 
      item.productId === currentProduct.productId && 
      item.supplierId === currentProduct.supplierId
    )

    if (existing) {
      // Update existing
      setSelectedItems(prev => prev.map(item => {
        if (item.id !== existing.id) return item
        return {
          ...item,
          returnComposition: selectedVariants.map(v => ({
            size: v.size,
            color: v.color,
            quantity: v.quantity
          })),
          returnQty: totalQty
        }
      }))
      toast.success("Variant selection updated")
    } else {
      // Add new
      const newItem = {
        id: Date.now(),
        type: 'product',
        productId: currentProduct.productId,
        productName: currentProduct.productName,
        productCode: currentProduct.productCode,
        supplierId: currentProduct.supplierId,
        supplierName: currentProduct.supplierName,
        availableQty: currentProduct.availableStock,
        returnQty: totalQty,
        costPrice: currentProduct.supplierCostPrice || currentProduct.costPrice || currentProduct.averageCostPrice || 0,
        returnComposition: selectedVariants.map(v => ({
          size: v.size,
          color: v.color,
          quantity: v.quantity
        })),
        reason: ""
      }

      setSelectedItems(prev => [...prev, newItem])
      toast.success("Product added with variants")
    }

    setVariantDialogOpen(false)
    setCurrentProduct(null)
    setSearchQuery("")
    searchInputRef.current?.focus()
  }

  const updateItem = (id, field, value) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.id !== id) return item

      if (field === "returnQty") {
        const numValue = Number(value)
        if (numValue > item.availableQty) {
          toast.error(`Max ${item.availableQty} available`)
          return item
        }
        if (numValue < 1) return item
      }

      return { ...item, [field]: value }
    }))
  }

  const removeItem = (id) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id))
    searchInputRef.current?.focus()
  }

  // Open dialog to select individual items from a packet for partial return
  const openPacketItemDialog = (item) => {
    setCurrentPacketItem(item)
    const initialSelections = (item.composition || []).map(c => ({
      size: c.size,
      color: c.color,
      max: c.quantity,
      quantity: item.returnComposition
        ? (item.returnComposition.find(r => r.size === c.size && r.color === c.color)?.quantity || 0)
        : 0
    }))
    setPacketItemSelections(initialSelections)
    setPacketItemDialogOpen(true)
  }

  // Confirm partial item selection from packet
  const confirmPacketItemSelection = () => {
    const selected = packetItemSelections.filter(v => v.quantity > 0)
    if (selected.length === 0) {
      toast.error("Please select at least one item")
      return
    }
    const totalQty = selected.reduce((sum, v) => sum + v.quantity, 0)
    setSelectedItems(prev => prev.map(item => {
      if (item.id !== currentPacketItem.id) return item
      return {
        ...item,
        returnMode: 'partial_items',
        returnComposition: selected.map(v => ({
          size: v.size,
          color: v.color,
          quantity: v.quantity
        })),
        returnQty: totalQty
      }
    }))
    toast.success(`${totalQty} individual item(s) selected from packet`)
    setPacketItemDialogOpen(false)
    setCurrentPacketItem(null)
  }

  // Switch a packet item back to full packet return mode
  const switchToFullPacketReturn = (itemId) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      return {
        ...item,
        returnMode: undefined,
        returnComposition: undefined,
        returnQty: 1
      }
    }))
  }

  // Calculate totals
  const totals = selectedItems.reduce((acc, item) => {
    let amount = 0
    let items = 0

    if (item.type === 'packet') {
      if (item.returnMode === 'partial_items') {
        items = item.returnQty
        amount = item.returnQty * (item.pricePerItem || item.costPrice / (item.totalItemsPerPacket || 1))
      } else if (item.isLoose) {
        items = item.returnQty
        amount = item.returnQty * item.costPrice
      } else {
        items = item.returnQty * item.totalItemsPerPacket
        amount = item.returnQty * item.costPrice
      }
    } else {
      items = item.returnQty
      amount = item.returnQty * item.costPrice
    }

    return {
      totalAmount: acc.totalAmount + amount,
      totalItems: acc.totalItems + items
    }
  }, { totalAmount: 0, totalItems: 0 })

  // Group items by supplier for submission
  const groupBySupplier = () => {
    const groups = new Map()

    selectedItems.forEach(item => {
      if (!groups.has(item.supplierId)) {
        groups.set(item.supplierId, {
          supplierId: item.supplierId,
          supplierName: item.supplierName,
          packets: [],
          products: []
        })
      }

      const group = groups.get(item.supplierId)
      
      if (item.type === 'packet') {
        group.packets.push(item)
      } else {
        group.products.push(item)
      }
    })

    return Array.from(groups.values())
  }

  const handleSave = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please add items to return")
      return
    }

    if (hasValidationErrors) {
      toast.error("Please fix validation errors before submitting")
      return
    }

    try {
      setSubmitting(true)

      const supplierGroups = groupBySupplier()

      const breakResults = []

      // Process each supplier group
      for (const group of supplierGroups) {
        // Process packets
        for (const item of group.packets) {
          const isPartial = item.returnMode === 'partial_items'
          const perItemPrice = item.pricePerItem || item.costPrice / (item.totalItemsPerPacket || 1)
          const totalAmount = isPartial
            ? item.returnQty * perItemPrice
            : item.isLoose
              ? item.returnQty * item.costPrice
              : item.returnQty * item.costPrice

          const payload = {
            supplierId: group.supplierId,
            packetStockId: item.packetStockId,
            quantity: isPartial ? item.returnQty : item.returnQty,
            returnType: isPartial ? 'partial' : (item.isLoose ? 'loose' : 'full'),
            itemsToReturn: isPartial ? item.returnComposition : [],
            reason: item.reason || "",
            notes: isPartial
              ? `Partial packet return - ${item.barcode} (${item.returnQty} items)`
              : `Barcode return - ${item.barcode}`,
            costPrice: isPartial ? perItemPrice : item.costPrice,
            totalAmount: totalAmount,
            returnDate: returnDate.toISOString()
          }

          const response = await returnsAPI.createPacketReturn(payload)

          if (response?.status === 202) {
            toast.success('Backdated packet return request submitted for approval.')
            router.push('/my-requests')
            if (onSave) onSave()
            return
          }

          // Capture break results for partial returns
          if (isPartial) {
            const packetDetails = response.data?.data?.packetDetails || response.data?.packetDetails
            const breakResult = packetDetails?.breakResult
            if (breakResult) {
              breakResults.push({
                barcode: item.barcode,
                itemsReturned: breakResult.totalItemsReturned,
                looseStocksCreated: breakResult.looseStocksCreated || [],
                remainingItems: breakResult.remainingItems || []
              })
            }
          }
        }

        // Process products (if any)
        if (group.products.length > 0) {
          const totalCreditAmount = group.products.reduce((sum, i) => sum + (i.returnQty * i.costPrice), 0)
          
          const payload = {
            supplierId: group.supplierId,
            items: group.products.map(item => ({
              productId: item.productId,
              quantity: item.returnQty,
              reason: item.reason || "",
              returnComposition: item.returnComposition || [],
              costPrice: item.costPrice,
              totalAmount: item.returnQty * item.costPrice
            })),
            returnDate: returnDate.toISOString(),
            cashRefund: 0,
            accountCredit: totalCreditAmount,
            notes: `Product return - ${group.products.length} item(s)`
          }

          const response = await returnsAPI.createProductReturn(payload)

          if (response?.status === 202) {
            toast.success('Backdated product return request submitted for approval.')
            router.push('/my-requests')
            if (onSave) onSave()
            return
          }
          
          const summary = response.data?.data?.summary || response.data?.summary
          if (summary?.packetAdjustments?.count > 0) {
            toast.success(
              `${summary.packetAdjustments.totalItemsAdjusted} items adjusted across ${summary.packetAdjustments.count} packet(s)`,
              { duration: 4000 }
            )
          }
          // Show warnings about packet stock that couldn't be adjusted
          if (summary?.warnings?.length > 0) {
            toast(summary.warnings.join('\n'), {
              icon: '⚠️',
              duration: 6000,
              style: { maxWidth: '500px' }
            })
          }
        }
      }

      const itemCount = selectedItems.length
      const supplierCount = supplierGroups.length
      toast.success(`✓ Return processed! ${itemCount} item(s) returned to ${supplierCount} supplier(s)`, {
        duration: 3000
      })

      // Show break results for partial packet returns
      for (const br of breakResults) {
        const looseCount = br.looseStocksCreated.reduce((sum, ls) => sum + ls.quantity, 0)
        if (looseCount > 0) {
          const looseDetails = br.looseStocksCreated.map(ls => `${ls.size}/${ls.color} ×${ls.quantity}`).join(', ')
          toast(
            `Packet ${br.barcode} broken: ${br.itemsReturned} returned, ${looseCount} items moved to loose stock (${looseDetails})`,
            { icon: '📦', duration: 6000, style: { maxWidth: '500px' } }
          )
        }
      }

      if (onSave) onSave()
      setSelectedItems([])
      setPacketValidation({})
      setSearchQuery("")
      searchInputRef.current?.focus()

    } catch (error) {
      console.error("Error creating return:", error)
      const errorMsg = error.response?.data?.message || "Failed to create return"
      // Surface concurrent break errors clearly
      if (errorMsg.includes('concurrent operation') || errorMsg.includes('no longer available')) {
        toast.error("A packet was modified by another user. Please clear and re-add items to refresh.", { duration: 5000 })
      } else {
        toast.error(errorMsg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const totalResults = searchResults.packets.length + searchResults.products.length

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
                Search by product name, code, barcode, or supplier name - no supplier selection needed!
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
              placeholder="Type product name, code, barcode, or supplier..."
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

                 {/* Products */}
                {searchResults.products.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-muted/50 font-semibold text-sm flex items-center gap-2">
                      <LayersIcon className="h-4 w-4" />
                      Products ({searchResults.products.length})
                    </div>
                    {searchResults.products.map((product) => (
                      <div
                        key={product._id}
                        className="px-4 py-3 hover:bg-muted/50 cursor-pointer border-b transition-colors"
                        onClick={() => openVariantDialog(product)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{product.productName}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.productCode} • {product.supplierName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {product.variantComposition?.length || 0} variants
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <Badge variant="outline">
                              {product.availableStock} in stock
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Packets */}
                {searchResults.packets.length > 0 && (
                  <div>
                    <div 
                      className="px-4 py-2 bg-muted/50 font-semibold text-sm flex items-center justify-between cursor-pointer hover:bg-muted"
                      onClick={() => setPacketsExpanded(!packetsExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        <PackageIcon className="h-4 w-4" />
                        Packets ({searchResults.packets.length})
                      </div>
                      <ChevronDown 
                        className={`h-4 w-4 transition-transform duration-200 ${
                          packetsExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                    {packetsExpanded && searchResults.packets.map((packet) => (
                      <div
                        key={packet._id}
                        className="px-4 py-3 hover:bg-muted/50 cursor-pointer border-b transition-colors"
                        onClick={() => addPacket(packet)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-mono text-sm font-semibold text-primary">
                              {packet.barcode}
                            </p>
                            <p className="font-medium">{packet.productName}</p>
                            <p className="text-sm text-muted-foreground">
                              {packet.productCode} • {packet.supplierName}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <Badge variant="secondary">
                              {packet.availablePackets} {packet.isLoose ? 'items' : 'pkts'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

               
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Start typing to search across all products, packets, and suppliers. Click any result to add it to your return.
          </p>
        </CardContent>
      </Card>

      {/* Selected Items */}
      {selectedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Items to Return ({selectedItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedItems.map((item) => {
                const validation = packetValidation[item.productId]
                
                return (
                  <div
                    key={item.id}
                    className={`p-4 border rounded-lg ${
                      validation && !validation.valid ? 'border-red-300 bg-red-50/50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {item.type === 'packet' ? (
                            <PackageIcon className="h-4 w-4 text-primary flex-shrink-0" />
                          ) : (
                            <LayersIcon className="h-4 w-4 text-amber-600 flex-shrink-0" />
                          )}
                          <p className="font-medium truncate">{item.productName}</p>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {item.productCode} • {item.supplierName}
                        </p>
                        
                        {item.type === 'packet' && (
                          <p className="text-sm text-muted-foreground font-mono">
                            Barcode: {item.barcode} {item.isLoose && '(Loose)'}
                            {item.returnMode === 'partial_items' && (
                              <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300">Partial</Badge>
                            )}
                          </p>
                        )}

                        {item.type === 'packet' && item.returnMode === 'partial_items' && item.returnComposition && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.returnComposition.map((v, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {v.size}/{v.color} ×{v.quantity}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Break indicator: show what becomes loose stock */}
                        {item.type === 'packet' && item.returnMode === 'partial_items' && item.composition?.length > 0 && (() => {
                          const remaining = item.composition.map(c => {
                            const returned = item.returnComposition?.find(r => r.size === c.size && r.color === c.color)
                            const qty = c.quantity - (returned?.quantity || 0)
                            return { size: c.size, color: c.color, quantity: qty }
                          }).filter(r => r.quantity > 0)
                          const totalLoose = remaining.reduce((sum, r) => sum + r.quantity, 0)
                          if (totalLoose === 0) return null
                          return (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                              <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                                <UnlinkIcon className="h-3 w-3" />
                                Packet will be broken — {totalLoose} item{totalLoose !== 1 ? 's' : ''} become loose stock:
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {remaining.map((r, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs text-amber-600 border-amber-300">
                                    {r.size}/{r.color} ×{r.quantity}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )
                        })()}

                        {item.type !== 'packet' && item.returnComposition && item.returnComposition.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.returnComposition.map((v, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {v.size}/{v.color} ×{v.quantity}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {item.type === 'packet' && !item.isLoose && item.composition?.length > 0 && (
                          <div className="mt-2">
                            {item.returnMode === 'partial_items' ? (
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => openPacketItemDialog(item)}
                                >
                                  Edit items
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-muted-foreground"
                                  onClick={() => switchToFullPacketReturn(item.id)}
                                >
                                  Return full packet instead
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => openPacketItemDialog(item)}
                              >
                                Return individual items instead
                              </Button>
                            )}
                          </div>
                        )}

                        {validation && !validation.valid && (
                          <div className="mt-2">
                            {validation.errors.map((err, idx) => (
                              <p key={idx} className="text-xs text-red-600">⚠ {err}</p>
                            ))}
                          </div>
                        )}

                        {validation && validation.valid && validation.warnings?.length > 0 && (
                          <div className="mt-2">
                            {validation.warnings.map((warn, idx) => (
                              <p key={idx} className="text-xs text-amber-600">⚠ {warn}</p>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          {item.type === 'packet' && item.returnMode !== 'partial_items' && (
                            <div className="flex items-center gap-2 mb-1">
                              <Label className="text-xs text-muted-foreground">Qty:</Label>
                              <Input
                                type="number"
                                min="1"
                                max={item.availableQty}
                                value={item.returnQty}
                                onChange={(e) => updateItem(item.id, "returnQty", Number(e.target.value))}
                                className="h-8 w-20 text-right"
                              />
                            </div>
                          )}
                          {item.type === 'packet' && item.returnMode === 'partial_items' && (
                            <Badge variant="outline" className="text-sm mb-1">
                              {item.returnQty} items
                            </Badge>
                          )}
                          {item.type === 'product' && (
                            <Badge variant="outline" className="text-sm mb-1">
                              {item.returnQty} items
                            </Badge>
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

            {/* Validation Summary */}
            {Object.keys(packetValidation).length > 0 && !hasValidationErrors && (() => {
              const allWarnings = Object.values(packetValidation).flatMap(v => v.warnings || [])
              const hasWarnings = allWarnings.length > 0
              return hasWarnings ? (
                <Alert className="mt-4 bg-amber-50 border-amber-200">
                  <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-sm text-amber-700">Ready to submit (with warnings)</AlertTitle>
                  <AlertDescription className="text-xs text-amber-600">
                    Inventory will be adjusted. Some packet stock may not be fully adjusted.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="mt-4 bg-green-50 border-green-200">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-sm text-green-700">Ready to submit</AlertTitle>
                  <AlertDescription className="text-xs text-green-600">
                    All items validated. Packet stock will be automatically adjusted.
                  </AlertDescription>
                </Alert>
              )
            })()
            }

            {validatingPackets && (
              <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                Validating packet stock...
              </div>
            )}
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
                  {selectedItems.length} item(s) • {totals.totalItems} pieces • {groupBySupplier().length} supplier(s)
                </p>
              </div>
              <p className="text-3xl font-bold text-primary">{totals.totalItems} items</p>
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
                disabled={submitting || hasValidationErrors}
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
              Items will be credited to respective supplier accounts
            </p>
          </CardContent>
        </Card>
      )}

      {/* Packet Partial Return Dialog */}
      <Dialog open={packetItemDialogOpen} onOpenChange={setPacketItemDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Select Items to Return from Packet</DialogTitle>
            <DialogDescription>
              Choose individual items to return from {currentPacketItem?.barcode}
              <br />
              <span className="text-xs">Product: {currentPacketItem?.productName} • Supplier: {currentPacketItem?.supplierName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
            {packetItemSelections.map((variant, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
                <div>
                  <div className="font-medium">
                    {variant.size} / {variant.color}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    In packet: {variant.max}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setPacketItemSelections(prev => prev.map((v, i) =>
                        i === idx ? { ...v, quantity: Math.max(0, v.quantity - 1) } : v
                      ))
                    }}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    max={variant.max}
                    className="w-20 h-8 text-center"
                    value={variant.quantity > 0 ? variant.quantity : ""}
                    onChange={(e) => {
                      const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), variant.max)
                      setPacketItemSelections(prev => prev.map((v, i) =>
                        i === idx ? { ...v, quantity: val } : v
                      ))
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setPacketItemSelections(prev => prev.map((v, i) =>
                        i === idx ? { ...v, quantity: Math.min(v.max, v.quantity + 1) } : v
                      ))
                    }}
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg border border-primary/20">
              <span className="font-semibold">Items to return:</span>
              <span className="font-bold text-lg">
                {packetItemSelections.reduce((sum, v) => sum + v.quantity, 0)} of {packetItemSelections.reduce((sum, v) => sum + v.max, 0)}
              </span>
            </div>

            {/* Break warning with remaining items preview */}
            {(() => {
              const totalSelected = packetItemSelections.reduce((sum, v) => sum + v.quantity, 0)
              const totalInPacket = packetItemSelections.reduce((sum, v) => sum + v.max, 0)
              if (totalSelected === 0) return null
              const remaining = packetItemSelections
                .map(v => ({ size: v.size, color: v.color, quantity: v.max - v.quantity }))
                .filter(v => v.quantity > 0)
              const totalRemaining = remaining.reduce((sum, v) => sum + v.quantity, 0)
              const isFullReturn = totalRemaining === 0

              return (
                <Alert className={isFullReturn ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}>
                  <InfoIcon className={`h-4 w-4 ${isFullReturn ? 'text-blue-600' : 'text-amber-600'}`} />
                  <AlertTitle className={`text-sm ${isFullReturn ? 'text-blue-700' : 'text-amber-700'}`}>
                    {isFullReturn
                      ? 'All items selected — full packet will be returned'
                      : `Packet will be broken — ${totalRemaining} item${totalRemaining !== 1 ? 's' : ''} become loose stock`}
                  </AlertTitle>
                  {!isFullReturn && (
                    <AlertDescription className="mt-2">
                      <p className="text-xs text-amber-600 mb-1">Remaining items will be converted to individual loose stock entries:</p>
                      <div className="flex flex-wrap gap-1">
                        {remaining.map((r, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-100">
                            {r.size}/{r.color} ×{r.quantity}
                          </Badge>
                        ))}
                      </div>
                    </AlertDescription>
                  )}
                </Alert>
              )
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPacketItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPacketItemSelection}>
              Confirm Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Selection Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Select Items to Return</DialogTitle>
            <DialogDescription>
              Choose colors and sizes to return for {currentProduct?.productName}
              <br />
              <span className="text-xs">Supplier: {currentProduct?.supplierName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
            {variantSelections.map((variant, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
                <div>
                  <div className="font-medium">
                    {variant.size} / {variant.color}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Available: {variant.max}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setVariantSelections(prev => prev.map((v, i) =>
                        i === idx ? { ...v, quantity: Math.max(0, v.quantity - 1) } : v
                      ))
                    }}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    max={variant.max}
                    className="w-20 h-8 text-center"
                    value={variant.quantity > 0 ? variant.quantity : ""}
                    onChange={(e) => {
                      const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), variant.max)
                      setVariantSelections(prev => prev.map((v, i) =>
                        i === idx ? { ...v, quantity: val } : v
                      ))
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setVariantSelections(prev => prev.map((v, i) =>
                        i === idx ? { ...v, quantity: Math.min(v.max, v.quantity + 1) } : v
                      ))
                    }}
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg border border-primary/20">
              <span className="font-semibold">Total Items:</span>
              <span className="font-bold text-lg">
                {variantSelections.reduce((sum, v) => sum + v.quantity, 0)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmVariantSelection}>
              Add to Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
