"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2 as TrashIcon, ScanLine as ScanBarcodeIcon, Loader2 as Loader2Icon, Package as PackageIcon, CheckCircle as CheckCircleIcon, AlertTriangle as AlertTriangleIcon, Info as InfoIcon, Layers as LayersIcon, Plus as PlusIcon } from "lucide-react"
import { Label } from "@/components/ui/label"
import { returnsAPI } from "@/lib/api/endpoints/returns"
import { suppliersAPI } from "@/lib/api/endpoints/suppliers"
import toast from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function BuyingReturnFormImproved({ onSave }) {
  const [suppliers, setSuppliers] = useState([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [selectedSupplierId, setSelectedSupplierId] = useState("")

  // Quick Barcode Return State
  const [barcodeInput, setBarcodeInput] = useState("")
  const [scanningBarcode, setScanningBarcode] = useState(false)
  const [scannedPacket, setScannedPacket] = useState(null)
  const barcodeInputRef = useRef(null)

  // Manual Product Return State
  const [searchQuery, setSearchQuery] = useState("")
  const [availableProducts, setAvailableProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])

  // Variant Selection Dialog
  const [variantDialogOpen, setVariantDialogOpen] = useState(false)
  const [currentProduct, setCurrentProduct] = useState(null)
  const [variantSelections, setVariantSelections] = useState([])

  // Packet validation state
  const [packetValidation, setPacketValidation] = useState({})
  const [validatingPackets, setValidatingPackets] = useState(false)

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

  // Auto-focus barcode input when supplier is selected
  useEffect(() => {
    if (selectedSupplierId && barcodeInputRef.current) {
      barcodeInputRef.current.focus()
    }
  }, [selectedSupplierId])

  // Load products when supplier is selected (for manual selection)
  useEffect(() => {
    if (!selectedSupplierId) {
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
  }, [selectedSupplierId])

  // Validate packet stock for selected items with variants
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
            supplierId: selectedSupplierId,
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
  }, [selectedItems, selectedSupplierId])

  const allValidationsPass = Object.values(packetValidation).every(v => v.valid)
  const hasValidationErrors = Object.values(packetValidation).some(v => !v.valid)

  // Handle barcode scan/entry
  const handleBarcodeSubmit = async (e) => {
    e?.preventDefault()
    
    if (!barcodeInput.trim()) {
      return
    }

    if (!selectedSupplierId) {
      toast.error("Please select a supplier first")
      return
    }

    try {
      setScanningBarcode(true)
      
      // Fetch packet by barcode
      const response = await returnsAPI.getPacketStocksForReturn({
        supplierId: selectedSupplierId,
        search: barcodeInput.trim(),
        includeLoose: 'true'
      })

      const packets = response.data?.data || response.data || []
      const packet = packets.find(p => p.barcode === barcodeInput.trim())

      if (!packet) {
        toast.error("Packet not found or not from this supplier")
        setBarcodeInput("")
        barcodeInputRef.current?.focus()
        return
      }

      if (packet.availablePackets === 0) {
        toast.error("No items available in this packet")
        setBarcodeInput("")
        barcodeInputRef.current?.focus()
        return
      }

      // Check if already added
      const existing = selectedItems.find(item => 
        item.barcode === packet.barcode && item.mode === 'barcode'
      )
      if (existing) {
        toast("Packet already added - increasing quantity", { icon: '📦' })
        updateItem(existing.id, "returnQty", existing.returnQty + 1)
        setBarcodeInput("")
        barcodeInputRef.current?.focus()
        return
      }

      // Add packet to return list
      const pricePerItem = packet.isLoose
        ? (packet.landedPricePerPacket || packet.costPricePerPacket || 0)
        : (packet.landedPricePerPacket / packet.totalItemsPerPacket || 0)

      const newItem = {
        id: Date.now(),
        mode: 'barcode', // Flag to indicate this is barcode-scanned
        packetStockId: packet._id,
        barcode: packet.barcode,
        productId: packet.product?._id,
        productName: packet.product?.name || "Unknown",
        productCode: packet.product?.productCode || packet.product?.sku || "",
        isLoose: packet.isLoose,
        composition: packet.composition || [],
        totalItemsPerPacket: packet.totalItemsPerPacket,
        availableQty: packet.availablePackets,
        returnQty: 1,
        costPrice: packet.isLoose ? packet.landedPricePerPacket : (packet.landedPricePerPacket || 0),
        pricePerItem: pricePerItem,
        supplierId: selectedSupplierId,
        supplierName: suppliers.find(s => s._id === selectedSupplierId)?.name || "Unknown",
        reason: ""
      }

      setSelectedItems(prev => [...prev, newItem])
      
      toast.success(`✓ ${packet.barcode} added`, { 
        duration: 1500,
        icon: '✅'
      })
      
      setBarcodeInput("")
      barcodeInputRef.current?.focus()

    } catch (error) {
      console.error("Barcode scan error:", error)
      toast.error("Failed to fetch packet")
    } finally {
      setScanningBarcode(false)
    }
  }

  // Open variant selection dialog
  const openVariantDialog = (product) => {
    if (!product.variantComposition || product.variantComposition.length === 0) {
      toast.error("No variant information available for this product")
      return
    }

    setCurrentProduct(product)
    
    // Initialize variant selections
    const initialVariants = product.variantComposition.map(v => ({
      size: v.size,
      color: v.color,
      max: v.quantity,
      quantity: 0
    }))

    setVariantSelections(initialVariants)
    setVariantDialogOpen(true)
  }

  const confirmVariantSelection = () => {
    const selectedVariants = variantSelections.filter(v => v.quantity > 0)
    
    if (selectedVariants.length === 0) {
      toast.error("Please select at least one variant")
      return
    }

    const totalQty = selectedVariants.reduce((sum, v) => sum + v.quantity, 0)
    
    // Check if this product is already added
    const existing = selectedItems.find(item => 
      item.productId === currentProduct._id && item.mode === 'variant'
    )

    if (existing) {
      // Update existing item
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
      // Add new item
      const newItem = {
        id: Date.now(),
        mode: 'variant', // Flag to indicate this is variant-based
        productId: currentProduct._id,
        productName: currentProduct.name,
        productCode: currentProduct.productCode || currentProduct.sku,
        supplierId: selectedSupplierId,
        supplierName: suppliers.find(s => s._id === selectedSupplierId)?.name || "Unknown",
        availableQty: currentProduct.currentStock,
        returnQty: totalQty,
        costPrice: currentProduct.averageCostPrice || 0,
        variantComposition: currentProduct.variantComposition,
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
    
    // Refocus barcode input
    setTimeout(() => barcodeInputRef.current?.focus(), 100)
  }

  // Filter products based on search
  const filteredProducts = searchQuery.length > 0
    ? availableProducts.filter(product => {
      const query = searchQuery.replace(/\s+/g, "").toLowerCase()
      const rawQuery = searchQuery.toLowerCase()
      return (
        (product.name || "").replace(/\s+/g, "").toLowerCase().includes(query) ||
        (product.productCode || product.sku || "").toLowerCase().includes(rawQuery)
      )
    })
    : []

  function updateItem(id, field, value) {
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

  function removeItem(id) {
    setSelectedItems(prev => prev.filter(item => item.id !== id))
    
    // Refocus barcode input
    setTimeout(() => barcodeInputRef.current?.focus(), 100)
  }

  // Calculate totals
  const totals = selectedItems.reduce((acc, item) => {
    let amount = 0
    let items = 0

    if (item.mode === 'barcode') {
      if (item.isLoose) {
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

  async function handleSave() {
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

      // Group items by mode
      const barcodeItems = selectedItems.filter(i => i.mode === 'barcode')
      const variantItems = selectedItems.filter(i => i.mode === 'variant')

      // Process barcode returns
      for (const item of barcodeItems) {
        const payload = {
          supplierId: selectedSupplierId,
          packetStockId: item.packetStockId,
          quantity: item.returnQty,
          returnType: item.isLoose ? 'loose' : 'full',
          itemsToReturn: [],
          reason: item.reason || "",
          notes: `Barcode return - ${item.barcode}`
        }

        await returnsAPI.createPacketReturn(payload)
      }

      // Process variant returns (if any)
      if (variantItems.length > 0) {
        const payload = {
          supplierId: selectedSupplierId,
          items: variantItems.map(item => ({
            productId: item.productId,
            quantity: item.returnQty,
            reason: item.reason || "",
            returnComposition: item.returnComposition || []
          })),
          returnDate: new Date().toISOString(),
          cashRefund: 0,
          accountCredit: variantItems.reduce((sum, i) => sum + (i.returnQty * i.costPrice), 0),
          notes: `Variant-based return - ${variantItems.length} item(s)`
        }

        const response = await returnsAPI.createProductReturn(payload)
        
        // Show packet adjustment summary if available
        const summary = response.data?.data?.summary || response.data?.summary
        if (summary?.packetAdjustments?.count > 0) {
          toast.success(
            `${summary.packetAdjustments.totalItemsAdjusted} items adjusted across ${summary.packetAdjustments.count} packet(s)`,
            { duration: 4000 }
          )
        }
      }

      const itemCount = barcodeItems.length + variantItems.length
      toast.success(`✓ Return processed! ${itemCount} item(s) returned`, {
        duration: 3000
      })

      if (onSave) onSave()
      setSelectedItems([])
      setPacketValidation({})
      setBarcodeInput("")
      
      // Refocus for next scan
      setTimeout(() => barcodeInputRef.current?.focus(), 100)

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
      <Card>
        <CardHeader>
          <CardTitle>Select Supplier</CardTitle>
          <CardDescription>Choose which supplier you're returning products to</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedSupplierId} onValueChange={(v) => {
            setSelectedSupplierId(v)
            setSelectedItems([])
            setBarcodeInput("")
          }}>
            <SelectTrigger disabled={loadingSuppliers}>
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
        </CardContent>
      </Card>

      {selectedSupplierId && (
        <>
          {/* Quick Barcode Scanner - Primary Mode */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanBarcodeIcon className="h-5 w-5" />
                Quick Barcode Return
              </CardTitle>
              <CardDescription>
                Scan or enter barcode to return entire packets (fastest method)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBarcodeSubmit} className="flex gap-3">
                <div className="flex-1">
                  <Input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="Scan or type barcode..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="h-12 text-lg"
                    disabled={scanningBarcode}
                    autoComplete="off"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={scanningBarcode || !barcodeInput.trim()}
                  className="min-w-[120px]"
                >
                  {scanningBarcode ? (
                    <>
                      <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <ScanBarcodeIcon className="h-4 w-4 mr-2" />
                      Add
                    </>
                  )}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-3">
                Press Enter or click Add after scanning. Scans multiple barcodes quickly for batch returns.
              </p>
            </CardContent>
          </Card>

          {/* Manual Product Selection with Variants - Secondary Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayersIcon className="h-5 w-5" />
                Return by Color/Size
              </CardTitle>
              <CardDescription>
                For returning specific items from packets (select colors and sizes)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  placeholder="Search products by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10"
                />
              </div>

              {loadingProducts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="border rounded-lg max-h-[250px] overflow-y-auto">
                  <div className="divide-y">
                    {filteredProducts.map((product) => (
                      <div
                        key={product._id}
                        className="p-3 hover:bg-muted/50 cursor-pointer transition-colors flex justify-between items-center"
                        onClick={() => openVariantDialog(product)}
                      >
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.productCode || product.sku}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1">
                            {product.variantComposition?.length || 0} variants • {product.currentStock} in stock
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Select
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : searchQuery ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No products match your search
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Selected Items List */}
          {selectedItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Items to Return ({selectedItems.length})</CardTitle>
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
                              {item.mode === 'barcode' ? (
                                <ScanBarcodeIcon className="h-4 w-4 text-primary flex-shrink-0" />
                              ) : (
                                <LayersIcon className="h-4 w-4 text-amber-600 flex-shrink-0" />
                              )}
                              <p className="font-medium truncate">{item.productName}</p>
                            </div>
                            
                            {item.mode === 'barcode' && (
                              <p className="text-sm text-muted-foreground font-mono">
                                Barcode: {item.barcode} {item.isLoose && '(Loose)'}
                              </p>
                            )}
                            
                            {item.returnComposition && item.returnComposition.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {item.returnComposition.map((v, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {v.size}/{v.color} ×{v.quantity}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {validation && !validation.valid && (
                              <div className="mt-2">
                                {validation.errors.map((err, idx) => (
                                  <p key={idx} className="text-xs text-red-600">⚠ {err}</p>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <div className="flex items-center gap-2 mb-1">
                                {item.mode === 'barcode' ? (
                                  <>
                                    <Label className="text-xs text-muted-foreground">Qty:</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max={item.availableQty}
                                      value={item.returnQty}
                                      onChange={(e) => updateItem(item.id, "returnQty", Number(e.target.value))}
                                      className="h-8 w-20 text-right"
                                    />
                                  </>
                                ) : (
                                  <Badge variant="outline" className="text-sm">
                                    {item.returnQty} items
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-semibold">
                                £{((item.mode === 'barcode' 
                                  ? (item.isLoose ? item.returnQty * item.costPrice : item.returnQty * item.costPrice)
                                  : item.returnQty * item.costPrice
                                )).toFixed(2)}
                              </p>
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
                {Object.keys(packetValidation).length > 0 && !hasValidationErrors && (
                  <Alert className="mt-4 bg-green-50 border-green-200">
                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-sm text-green-700">Ready to submit</AlertTitle>
                    <AlertDescription className="text-xs text-green-600">
                      All items validated. Packet stock will be automatically adjusted.
                    </AlertDescription>
                  </Alert>
                )}

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
                    <p className="text-lg font-semibold">Total Return Value</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedItems.length} item(s) • {totals.totalItems} pieces
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-primary">£{totals.totalAmount.toFixed(2)}</p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedItems([])
                      setBarcodeInput("")
                      barcodeInputRef.current?.focus()
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
                      `Process Return (£${totals.totalAmount.toFixed(2)})`
                    )}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-3">
                  Amount will be credited to supplier account
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Variant Selection Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Select Items to Return</DialogTitle>
            <DialogDescription>
              Choose colors and sizes to return for {currentProduct?.name}
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
