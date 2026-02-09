"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TrashIcon, SearchIcon, Loader2Icon, PackageIcon, BoxIcon, ScissorsIcon, LayersIcon, AlertTriangleIcon, CheckCircleIcon, InfoIcon } from "lucide-react"
import { Label } from "@/components/ui/label"
import { returnsAPI } from "@/lib/api/endpoints/returns"
import { suppliersAPI } from "@/lib/api/endpoints/suppliers"
import toast from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

export default function BuyingReturnForm({ onSave }) {
  const [suppliers, setSuppliers] = useState([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [selectedSupplierId, setSelectedSupplierId] = useState("")
  const [returnMode, setReturnMode] = useState("items") // "items" or "packets"

  // Item-based return state
  const [searchQuery, setSearchQuery] = useState("")
  const [availableProducts, setAvailableProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])

  // Item Item Variant Dialog State
  const [variantDialogOpen, setVariantDialogOpen] = useState(false)
  const [editingItemIndex, setEditingItemIndex] = useState(null)
  const [tempVariantReturns, setTempVariantReturns] = useState([]) // [{size, color, quantity, max}]

  // Packet validation state (NEW)
  const [packetValidation, setPacketValidation] = useState({})
  const [validatingPackets, setValidatingPackets] = useState(false)

  // Packet-based return state
  const [packetSearchQuery, setPacketSearchQuery] = useState("")
  const [availablePackets, setAvailablePackets] = useState([])
  const [loadingPackets, setLoadingPackets] = useState(false)
  const [selectedPackets, setSelectedPackets] = useState([])

  // Break packet dialog state
  const [breakDialogOpen, setBreakDialogOpen] = useState(false)
  const [breakingPacket, setBreakingPacket] = useState(null)
  const [itemsToBreakReturn, setItemsToBreakReturn] = useState([])

  const [submitting, setSubmitting] = useState(false)

  // Load suppliers on mount
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const response = await suppliersAPI.getAll()
        const suppliersList = response.data?.data || response.data || []
        setSuppliers(suppliersList)
      } catch (error) {
        console.error("Error loading suppliers:", error)
        toast.error("Failed to load suppliers")
      } finally {
        setLoadingSuppliers(false)
      }
    }
    loadSuppliers()
  }, [])

  // Load products when supplier is selected (for item-based returns)
  useEffect(() => {
    if (!selectedSupplierId || returnMode !== "items") {
      setAvailableProducts([])
      return
    }

    const loadProducts = async () => {
      try {
        setLoadingProducts(true)
        const response = await returnsAPI.getProductsForReturn({
          supplierId: selectedSupplierId,
          search: ""
        })
        const products = response.data?.data || response.data || []
        setAvailableProducts(products)
      } catch (error) {
        console.error("Error loading products:", error)
        toast.error("Failed to load products")
        setAvailableProducts([])
      } finally {
        setLoadingProducts(false)
      }
    }
    loadProducts()
  }, [selectedSupplierId, returnMode])

  // Load packets when supplier is selected (for packet-based returns)
  useEffect(() => {
    if (!selectedSupplierId || returnMode !== "packets") {
      setAvailablePackets([])
      return
    }

    const loadPackets = async () => {
      try {
        setLoadingPackets(true)
        const response = await returnsAPI.getPacketStocksForReturn({
          supplierId: selectedSupplierId,
          includeLoose: 'true'
        })
        const packets = response.data?.data || response.data || []
        setAvailablePackets(packets)
      } catch (error) {
        console.error("Error loading packets:", error)
        toast.error("Failed to load packets")
        setAvailablePackets([])
      } finally {
        setLoadingPackets(false)
      }
    }
    loadPackets()
  }, [selectedSupplierId, returnMode])

  // Validate packet stock for selected items with variants (NEW)
  useEffect(() => {
    if (returnMode !== "items" || selectedItems.length === 0) {
      setPacketValidation({})
      return
    }

    // Only validate items with returnComposition
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
            supplierId: selectedSupplierId,
            returnComposition: item.returnComposition,
            quantity: item.returnQty
          })

          const result = response.data?.data || response.data
          newValidation[item.productId] = {
            valid: result.valid,
            errors: result.errors || [],
            warnings: result.warnings || [],
            plannedAdjustments: result.plannedAdjustments || [],
            packetStockSummary: result.packetStockSummary || {}
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

    // Debounce the validation
    const timer = setTimeout(validateItems, 500)
    return () => clearTimeout(timer)
  }, [selectedItems, selectedSupplierId, returnMode])

  // Check if all validations pass
  const allValidationsPass = Object.values(packetValidation).every(v => v.valid)
  const hasValidationErrors = Object.values(packetValidation).some(v => !v.valid)

  // Filter products based on search query
  const filteredProducts = searchQuery.length > 0
    ? availableProducts.filter(product => {
      const query = searchQuery.toLowerCase()
      return (
        product.name.toLowerCase().includes(query) ||
        (product.productCode || product.sku || "").toLowerCase().includes(query)
      )
    })
    : availableProducts

  // Filter packets based on search query
  const filteredPackets = packetSearchQuery.length > 0
    ? availablePackets.filter(packet => {
      const query = packetSearchQuery.toLowerCase()
      return (
        packet.barcode?.toLowerCase().includes(query) ||
        packet.product?.name?.toLowerCase().includes(query) ||
        packet.product?.productCode?.toLowerCase().includes(query)
      )
    })
    : availablePackets

  // Add product to return (item-based)
  function addProduct(product) {
    const existing = selectedItems.find(item => item.productId === product._id)
    if (existing) {
      toast.error("Product already added")
      return
    }

    setSelectedItems(prev => [...prev, {
      id: Date.now(),
      productId: product._id,
      productName: product.name,
      productCode: product.productCode || product.sku,
      supplierId: selectedSupplierId,
      supplierName: suppliers.find(s => s._id === selectedSupplierId)?.name || "Unknown",
      availableQty: product.currentStock,
      returnQty: 1,
      costPrice: product.averageCostPrice || 0,
      reason: "",
      variantComposition: product.variantComposition || [], // Store available variants
      returnComposition: [] // Store selected variants for return
    }])

    setSearchQuery("")
  }

  // Add packet to return (packet-based)
  function addPacket(packet) {
    const existing = selectedPackets.find(p => p.packetStockId === packet._id)
    if (existing) {
      toast.error("Packet already added")
      return
    }

    const pricePerItem = packet.isLoose
      ? (packet.landedPricePerPacket || packet.costPricePerPacket || 0)
      : (packet.landedPricePerPacket / packet.totalItemsPerPacket || 0)

    setSelectedPackets(prev => [...prev, {
      id: Date.now(),
      packetStockId: packet._id,
      barcode: packet.barcode,
      productName: packet.product?.name || "Unknown",
      productCode: packet.product?.productCode || packet.product?.sku || "",
      productId: packet.product?._id,
      isLoose: packet.isLoose,
      composition: packet.composition || [],
      totalItemsPerPacket: packet.totalItemsPerPacket,
      availablePackets: packet.availablePackets,
      returnQty: 1,
      returnType: packet.isLoose ? "loose" : "full", // "full", "partial", or "loose"
      pricePerPacket: packet.landedPricePerPacket || packet.costPricePerPacket || 0,
      pricePerItem: pricePerItem,
      itemsToReturn: [], // For partial returns
      reason: ""
    }])

    setPacketSearchQuery("")
  }

  // Open break dialog for partial return
  function openBreakDialog(packet) {
    setBreakingPacket(packet)
    // Initialize items to return with 0 quantities
    setItemsToBreakReturn(packet.composition.map(c => ({
      size: c.size,
      color: c.color,
      maxQuantity: c.quantity,
      quantity: 0
    })))
    setBreakDialogOpen(true)
  }

  // Confirm break and partial return
  function confirmBreakReturn() {
    const itemsWithQty = itemsToBreakReturn.filter(i => i.quantity > 0)
    if (itemsWithQty.length === 0) {
      toast.error("Select at least one item to return")
      return
    }

    // Update the packet entry
    setSelectedPackets(prev => prev.map(p => {
      if (p.id !== breakingPacket.id) return p
      const totalItems = itemsWithQty.reduce((sum, i) => sum + i.quantity, 0)
      return {
        ...p,
        returnType: "partial",
        itemsToReturn: itemsWithQty.map(i => ({
          size: i.size,
          color: i.color,
          quantity: i.quantity
        })),
        returnQty: totalItems
      }
    }))

    setBreakDialogOpen(false)
    setBreakingPacket(null)
    setItemsToBreakReturn([])
    toast.success("Partial return configured")
  }

  // Open Variant Dialog for Item Return
  const openVariantDialog = (item, index) => {
    if (!item.variantComposition || item.variantComposition.length === 0) {
      return toast.error("No variant information available for this product")
    }
    setEditingItemIndex(index)

    // Initialize from existing selection or defaults
    const initialVariants = item.variantComposition.map(v => {
      const existing = item.returnComposition?.find(rc => rc.size === v.size && rc.color === v.color)
      return {
        size: v.size,
        color: v.color,
        max: v.quantity, // Available in inventory
        quantity: existing ? existing.quantity : 0
      }
    })

    setTempVariantReturns(initialVariants)
    setVariantDialogOpen(true)
  }

  const confirmVariantReturn = () => {
    const totalQty = tempVariantReturns.reduce((sum, v) => sum + v.quantity, 0)
    if (totalQty === 0) {
      // Clear selection?
      updateItem(selectedItems[editingItemIndex].id, "returnQty", 0)
    } else {
      // Update return composition
      const composition = tempVariantReturns
        .filter(v => v.quantity > 0)
        .map(v => ({ size: v.size, color: v.color, quantity: v.quantity }))

      setSelectedItems(prev => prev.map((item, i) => {
        if (i !== editingItemIndex) return item
        return {
          ...item,
          returnComposition: composition,
          returnQty: totalQty
        }
      }))
    }
    setVariantDialogOpen(false)
  }

  function updateItem(id, field, value) {
    setSelectedItems(prev => prev.map(item => {
      if (item.id !== id) return item

      if (field === "returnQty") {
        const numValue = Number(value)
        if (numValue > item.availableQty) {
          toast.error(`Max ${item.availableQty} available`)
          return item
        }
        if (numValue < 0) return item

        // If updating Qty manually and variants exist, clear variants?
        // Or warn? For now, allow override but clear composition to avoid mismatch
        // Pragmatic: If variants are set, disable manual Qty input?
        // See render
      }

      return { ...item, [field]: value }
    }))
  }

  function updatePacket(id, field, value) {
    setSelectedPackets(prev => prev.map(packet => {
      if (packet.id !== id) return packet

      if (field === "returnQty") {
        const numValue = Number(value)
        const maxQty = packet.isLoose ? packet.availablePackets : packet.availablePackets
        if (numValue > maxQty) {
          toast.error(`Max ${maxQty} available`)
          return packet
        }
        if (numValue < 1) return packet
      }

      return { ...packet, [field]: value }
    }))
  }

  function removeItem(id) {
    setSelectedItems(prev => prev.filter(item => item.id !== id))
  }

  function removePacket(id) {
    setSelectedPackets(prev => prev.filter(p => p.id !== id))
  }

  // Calculate totals for items
  const itemTotals = selectedItems.reduce((acc, item) => {
    const amount = item.returnQty * item.costPrice
    return {
      totalAmount: acc.totalAmount + amount,
      totalItems: acc.totalItems + item.returnQty
    }
  }, { totalAmount: 0, totalItems: 0 })

  // Calculate totals for packets
  const packetTotals = selectedPackets.reduce((acc, packet) => {
    let amount = 0
    let items = 0

    if (packet.returnType === "partial") {
      items = packet.itemsToReturn.reduce((sum, i) => sum + i.quantity, 0)
      amount = items * packet.pricePerItem
    } else if (packet.isLoose) {
      items = packet.returnQty
      amount = packet.returnQty * packet.pricePerPacket
    } else {
      items = packet.returnQty * packet.totalItemsPerPacket
      amount = packet.returnQty * packet.pricePerPacket
    }

    return {
      totalAmount: acc.totalAmount + amount,
      totalItems: acc.totalItems + items,
      totalPackets: acc.totalPackets + (packet.isLoose ? 0 : packet.returnQty)
    }
  }, { totalAmount: 0, totalItems: 0, totalPackets: 0 })

  const grandTotal = returnMode === "items" ? itemTotals.totalAmount : packetTotals.totalAmount

  async function handleSave() {
    if (returnMode === "items" && selectedItems.length === 0) {
      toast.error("Please add products to return")
      return
    }
    if (returnMode === "packets" && selectedPackets.length === 0) {
      toast.error("Please add packets to return")
      return
    }

    // Check for packet validation errors (only for items with returnComposition)
    if (returnMode === "items" && hasValidationErrors) {
      toast.error("Please fix packet stock errors before submitting")
      return
    }

    try {
      setSubmitting(true)

      if (returnMode === "items") {
        // Process item-based returns
        const payload = {
          supplierId: selectedSupplierId,
          items: selectedItems.map(item => ({
            productId: item.productId,
            quantity: item.returnQty,
            reason: item.reason || "",
            returnComposition: item.returnComposition || [] // Send composition
          })),
          returnDate: new Date().toISOString(),
          cashRefund: 0,
          accountCredit: itemTotals.totalAmount,
          notes: `Product return - ${selectedItems.length} item(s)`
        }

        const response = await returnsAPI.createProductReturn(payload)
        
        // Show packet adjustment summary if available
        const summary = response.data?.data?.summary || response.data?.summary
        if (summary?.packetAdjustments?.count > 0) {
          toast.success(
            `Return created! ${summary.packetAdjustments.totalItemsAdjusted} items adjusted across ${summary.packetAdjustments.count} packet(s)`,
            { duration: 5000 }
          )
        } else {
          toast.success("Return created successfully")
        }

        // Show warnings if any
        if (summary?.warnings?.length > 0) {
          summary.warnings.forEach(warn => {
            toast(warn, { icon: '⚠️', duration: 4000 })
          })
        }
      } else {
        // Process packet-based returns
        for (const packet of selectedPackets) {
          const payload = {
            supplierId: selectedSupplierId,
            packetStockId: packet.packetStockId,
            quantity: packet.returnQty,
            returnType: packet.returnType,
            itemsToReturn: packet.itemsToReturn || [],
            reason: packet.reason || "",
            notes: `Packet return - ${packet.barcode}`
          }

          await returnsAPI.createPacketReturn(payload)
        }
        toast.success("Return(s) created successfully")
      }

      if (onSave) onSave()
      setSelectedItems([])
      setSelectedPackets([])
      setPacketValidation({})
    } catch (error) {
      console.error("Error creating return:", error)
      toast.error(error.response?.data?.message || "Failed to create return")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Supplier Selection */}
      <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
        <Label htmlFor="supplier">Select Supplier *</Label>
        <Select value={selectedSupplierId} onValueChange={(v) => {
          setSelectedSupplierId(v)
          setSelectedItems([])
          setSelectedPackets([])
        }}>
          <SelectTrigger id="supplier" disabled={loadingSuppliers}>
            <SelectValue placeholder="Choose supplier..." />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier._id} value={supplier._id}>
                {supplier.name || supplier.company} {supplier.contactPerson && `(${supplier.contactPerson})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Select which supplier's products you're returning
        </p>
      </div>

      {/* Return Mode Tabs */}
      {selectedSupplierId && (
        <Tabs value={returnMode} onValueChange={(v) => {
          setReturnMode(v)
          setSelectedItems([])
          setSelectedPackets([])
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="items" className="flex items-center gap-2">
              <BoxIcon className="h-4 w-4" />
              Return by Items
            </TabsTrigger>
            <TabsTrigger value="packets" className="flex items-center gap-2">
              <PackageIcon className="h-4 w-4" />
              Return by Packets
            </TabsTrigger>
          </TabsList>

          {/* Item-based Returns */}
          <TabsContent value="items" className="space-y-4 mt-4">
            <div>
              <Label>Search Products</Label>
              <div className="relative mt-2">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter products by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading products...</span>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                <div className="divide-y">
                  {filteredProducts.map((product) => (
                    <div
                      key={product._id}
                      className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => addProduct(product)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.productCode || product.sku}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1">
                            {product.variantComposition && product.variantComposition.length > 0 ?
                              `${product.variantComposition.length} Variants Available` : "No Variants"}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="mb-1">
                            {product.currentStock} in stock
                          </Badge>
                          <p className="text-sm font-medium">
                            Cost: £{product.averageCostPrice?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <PackageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{searchQuery ? "No products match your search" : "No products available from this supplier"}</p>
              </div>
            )}

            {/* Selected Items Table */}
            {selectedItems.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Product</th>
                      <th className="text-right p-3 font-medium">Available</th>
                      <th className="text-right p-3 font-medium w-36">Return Qty</th>
                      <th className="text-right p-3 font-medium">Cost</th>
                      <th className="text-right p-3 font-medium">Total</th>
                      <th className="text-center p-3 font-medium w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item, idx) => (
                      <tr key={item.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">{item.productCode}</p>
                          {item.returnComposition && item.returnComposition.length > 0 && (
                            <div className="mt-1 text-xs text-amber-700 bg-amber-50 p-1 rounded inline-block">
                              Returning: {item.returnComposition.map(v => `${v.size}/${v.color}×${v.quantity}`).join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Badge variant="outline">{item.availableQty}</Badge>
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <Input
                              type="number"
                              min="1"
                              max={item.availableQty}
                              value={item.returnQty}
                              onChange={(e) => updateItem(item.id, "returnQty", Number(e.target.value))}
                              className="h-8 w-20 text-right tabular-nums"
                              disabled={item.returnComposition && item.returnComposition.length > 0}
                            />
                            {/* Variant Button */}
                            {item.variantComposition && item.variantComposition.length > 0 && (
                              <Button
                                size="icon"
                                variant={item.returnComposition && item.returnComposition.length > 0 ? "default" : "outline"}
                                className="h-8 w-8"
                                onClick={() => openVariantDialog(item, idx)}
                                title="Select Variants"
                              >
                                <LayersIcon className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right tabular-nums font-medium">
                          £{item.costPrice.toFixed(2)}
                        </td>
                        <td className="p-3 text-right tabular-nums font-semibold">
                          £{(item.returnQty * item.costPrice).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Packet Stock Validation Display (NEW) */}
            {selectedItems.length > 0 && Object.keys(packetValidation).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <PackageIcon className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Packet Stock Adjustments</Label>
                  {validatingPackets && (
                    <Loader2Icon className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </div>

                {Object.entries(packetValidation).map(([productId, validation]) => {
                  const item = selectedItems.find(i => i.productId === productId)
                  if (!item || !item.returnComposition?.length) return null

                  return (
                    <div key={productId} className={`p-3 border rounded-lg ${
                      validation.valid 
                        ? 'border-green-200 bg-green-50/50' 
                        : 'border-red-200 bg-red-50/50'
                    }`}>
                      <div className="flex items-start gap-2">
                        {validation.valid ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5" />
                        ) : (
                          <AlertTriangleIcon className="h-4 w-4 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.productName}</p>
                          
                          {/* Errors */}
                          {validation.errors?.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {validation.errors.map((err, i) => (
                                <p key={i} className="text-xs text-red-700">{err}</p>
                              ))}
                            </div>
                          )}

                          {/* Warnings */}
                          {validation.warnings?.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {validation.warnings.map((warn, i) => (
                                <p key={i} className="text-xs text-amber-700">{warn}</p>
                              ))}
                            </div>
                          )}

                          {/* Planned Adjustments */}
                          {validation.valid && validation.plannedAdjustments?.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              <p className="font-medium text-green-700 mb-1">Packets to be adjusted:</p>
                              <div className="flex flex-wrap gap-1">
                                {validation.plannedAdjustments.map((adj, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs font-mono">
                                    {adj.barcode?.substring(0, 12)}...
                                    {adj.isLoose ? ' (loose)' : ''}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Summary info */}
                {!validatingPackets && (
                  <Alert variant={hasValidationErrors ? "destructive" : "default"} className="bg-muted/30">
                    <InfoIcon className="h-4 w-4" />
                    <AlertTitle className="text-sm">
                      {hasValidationErrors 
                        ? "Some items cannot be returned" 
                        : "Packet stock will be synchronized"}
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                      {hasValidationErrors 
                        ? "Please adjust the quantities or select different variants for the items with errors."
                        : "When you submit this return, the packet stock will be automatically adjusted to match the inventory reduction."}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </TabsContent>

          {/* Packet-based Returns */}
          <TabsContent value="packets" className="space-y-4 mt-4">
            <div>
              <Label>Search Packets</Label>
              <div className="relative mt-2">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by barcode or product name..."
                  value={packetSearchQuery}
                  onChange={(e) => setPacketSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {loadingPackets ? (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading packets...</span>
              </div>
            ) : filteredPackets.length > 0 ? (
              <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                <div className="divide-y">
                  {filteredPackets.map((packet) => (
                    <div
                      key={packet._id}
                      className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => addPacket(packet)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium font-mono text-sm">{packet.barcode}</p>
                            {packet.isLoose && (
                              <Badge variant="outline" className="text-xs">Loose</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {packet.product?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {packet.composition?.map(c => `${c.color}/${c.size}×${c.quantity}`).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="mb-1">
                            {packet.availablePackets} {packet.isLoose ? 'items' : 'packets'}
                          </Badge>
                          <p className="text-sm font-medium">
                            £{(packet.landedPricePerPacket || packet.costPricePerPacket || 0).toFixed(2)}
                            {!packet.isLoose && '/pkt'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <PackageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{packetSearchQuery ? "No packets match your search" : "No packets available from this supplier"}</p>
              </div>
            )}

            {/* Selected Packets Table */}
            {selectedPackets.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Packet</th>
                      <th className="text-center p-3 font-medium">Type</th>
                      <th className="text-right p-3 font-medium">Available</th>
                      <th className="text-right p-3 font-medium w-28">Return</th>
                      <th className="text-right p-3 font-medium">Total</th>
                      <th className="text-center p-3 font-medium w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPackets.map((packet) => {
                      let returnValue = 0
                      let returnItemCount = 0

                      if (packet.returnType === "partial") {
                        returnItemCount = packet.itemsToReturn.reduce((sum, i) => sum + i.quantity, 0)
                        returnValue = returnItemCount * packet.pricePerItem
                      } else if (packet.isLoose) {
                        returnItemCount = packet.returnQty
                        returnValue = packet.returnQty * packet.pricePerPacket
                      } else {
                        returnItemCount = packet.returnQty * packet.totalItemsPerPacket
                        returnValue = packet.returnQty * packet.pricePerPacket
                      }

                      return (
                        <tr key={packet.id} className="border-b hover:bg-muted/30">
                          <td className="p-3">
                            <p className="font-medium font-mono text-sm">{packet.barcode}</p>
                            <p className="text-xs text-muted-foreground">{packet.productName}</p>
                            {packet.returnType === "partial" && (
                              <p className="text-xs text-primary">
                                Returning: {packet.itemsToReturn.map(i => `${i.color}/${i.size}×${i.quantity}`).join(', ')}
                              </p>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {packet.isLoose ? (
                              <Badge variant="outline">Loose</Badge>
                            ) : packet.returnType === "partial" ? (
                              <Badge variant="secondary">Break</Badge>
                            ) : (
                              <Badge>Full</Badge>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Badge variant="outline">{packet.availablePackets}</Badge>
                          </td>
                          <td className="p-2">
                            {packet.returnType === "partial" ? (
                              <div className="text-right text-sm font-medium">
                                {returnItemCount} items
                              </div>
                            ) : (
                              <Input
                                type="number"
                                min="1"
                                max={packet.availablePackets}
                                value={packet.returnQty}
                                onChange={(e) => updatePacket(packet.id, "returnQty", Number(e.target.value))}
                                className="h-8 text-right tabular-nums"
                              />
                            )}
                          </td>
                          <td className="p-3 text-right tabular-nums font-semibold">
                            £{returnValue.toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex gap-1 justify-center">
                              {!packet.isLoose && packet.returnType !== "partial" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openBreakDialog(packet)
                                  }}
                                  className="h-8 w-8 text-primary hover:bg-primary/10"
                                  title="Break packet for partial return"
                                >
                                  <ScissorsIcon className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removePacket(packet.id)}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Summary */}
      {(selectedItems.length > 0 || selectedPackets.length > 0) && (
        <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold">Total Return Value</p>
              <p className="text-sm text-muted-foreground">
                {returnMode === "items"
                  ? `${selectedItems.length} product(s), ${itemTotals.totalItems} items`
                  : `${selectedPackets.length} packet(s), ${packetTotals.totalItems} items`
                }
              </p>
            </div>
            <p className="text-2xl font-bold">£{grandTotal.toFixed(2)}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            This amount will be credited to supplier account (reduces what you owe them)
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => {
            setSelectedItems([])
            setSelectedPackets([])
          }}
          disabled={submitting || (selectedItems.length === 0 && selectedPackets.length === 0)}
        >
          Clear All
        </Button>
        <Button
          onClick={handleSave}
          disabled={submitting || (selectedItems.length === 0 && selectedPackets.length === 0)}
          className="min-w-[140px]"
        >
          {submitting ? (
            <>
              <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Process Return (£${grandTotal.toFixed(2)})`
          )}
        </Button>
      </div>

      {/* Break Packet Dialog */}
      <Dialog open={breakDialogOpen} onOpenChange={setBreakDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Break Packet for Partial Return</DialogTitle>
            <DialogDescription>
              Select which items from this packet to return to the supplier.
              Remaining items will become loose stock.
            </DialogDescription>
          </DialogHeader>

          {breakingPacket && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-mono text-sm font-medium">{breakingPacket.barcode}</p>
                <p className="text-sm text-muted-foreground">{breakingPacket.productName}</p>
              </div>

              <div className="space-y-3">
                <Label>Select items to return:</Label>
                {itemsToBreakReturn.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{item.color} / {item.size}</p>
                        <p className="text-xs text-muted-foreground">Max: {item.maxQuantity}</p>
                      </div>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max={item.maxQuantity}
                      value={item.quantity}
                      onChange={(e) => {
                        const value = Math.min(Number(e.target.value), item.maxQuantity)
                        setItemsToBreakReturn(prev => prev.map((p, i) =>
                          i === index ? { ...p, quantity: Math.max(0, value) } : p
                        ))
                      }}
                      className="w-20 h-8 text-right"
                    />
                  </div>
                ))}
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm font-medium text-amber-700">
                  Items to return: {itemsToBreakReturn.reduce((sum, i) => sum + i.quantity, 0)}
                </p>
                <p className="text-sm text-amber-600">
                  Remaining items will be moved to loose stock
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBreakDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmBreakReturn}>
              Confirm Break & Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Selection Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Item Variants</DialogTitle>
            <DialogDescription>
              Specify quantity for each size/color to return.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
            {tempVariantReturns.map((variant, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-medium">{variant.size} / {variant.color}</div>
                  <div className="text-xs text-muted-foreground">Available in stock: {variant.max}</div>
                </div>
                <Input
                  type="number"
                  min="0"
                  max={variant.max}
                  className="w-20 h-8 text-right"
                  value={variant.quantity > 0 ? variant.quantity : ""}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0)
                    setTempVariantReturns(prev => prev.map((v, i) =>
                      i === idx ? { ...v, quantity: val } : v
                    ))
                  }}
                />
              </div>
            ))}

            <div className="flex justify-between items-center bg-muted p-2 rounded">
              <span className="font-semibold">Total Quantity:</span>
              <span className="font-bold">{tempVariantReturns.reduce((sum, v) => sum + v.quantity, 0)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmVariantReturn}>Confirm Selection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
