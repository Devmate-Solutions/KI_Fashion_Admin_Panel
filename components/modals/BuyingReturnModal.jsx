"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package, Trash2, Search, ChevronDown, X } from "lucide-react"
import { suppliersAPI } from "@/lib/api/endpoints/suppliers"
import { returnsAPI } from "@/lib/api/endpoints/returns"
import { useCreateProductReturn } from "@/lib/hooks/useReturns"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function BuyingReturnModal({ open, onClose, onSuccess }) {
  const [suppliers, setSuppliers] = useState([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [selectedSupplierId, setSelectedSupplierId] = useState("")
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [notes, setNotes] = useState("")

  // Search and dropdown states
  const [supplierSearch, setSupplierSearch] = useState("")
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const [productDropdownOpen, setProductDropdownOpen] = useState(false)

  const createReturnMutation = useCreateProductReturn()

  // Load suppliers
  useEffect(() => {
    if (!open) return

    const loadSuppliers = async () => {
      try {
        setLoadingSuppliers(true)
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
  }, [open])

  // Load products when supplier changes
  useEffect(() => {
    if (!selectedSupplierId) {
      setProducts([])
      return
    }

    const loadProducts = async () => {
      try {
        setLoadingProducts(true)
        const response = await returnsAPI.getProductsForReturn({
          supplierId: selectedSupplierId,
          search: ""
        })
        const productsList = response.data?.data || response.data || []
        setProducts(productsList)
      } catch (error) {
        console.error("Error loading products:", error)
        toast.error("Failed to load products")
        setProducts([])
      } finally {
        setLoadingProducts(false)
      }
    }

    loadProducts()
  }, [selectedSupplierId])

  // Get selected supplier
  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s._id === selectedSupplierId)
  }, [suppliers, selectedSupplierId])

  // Filter suppliers based on search
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers
    const query = supplierSearch.toLowerCase()
    return suppliers.filter(s =>
      (s.name || '').toLowerCase().includes(query) ||
      (s.company || '').toLowerCase().includes(query) ||
      (s.email || '').toLowerCase().includes(query)
    )
  }, [suppliers, supplierSearch])

  // Flatten product options with batch info
  const productOptions = useMemo(() => {
    const options = []

    products.forEach(product => {
      if (!product.batches || product.batches.length === 0) return

      product.batches.forEach(batch => {
        const dateStr = batch.confirmedAt ? new Date(batch.confirmedAt).toLocaleDateString() : 'Unknown Date'
        const orderNumber = batch.orderNumber || 'Manual Entry'

        options.push({
          id: `${product._id}|${batch.batchId}`,
          productId: product._id,
          batchId: batch.batchId,
          productName: product.name,
          productCode: product.productCode || product.sku || '',
          orderNumber: orderNumber,
          dateStr: dateStr,
          dispatchOrderId: batch.dispatchOrderId,
          remainingQuantity: batch.remainingQuantity,
          costPrice: batch.costPrice || 0
        })
      })
    })

    return options
  }, [products])

  // Filter product options based on search and already selected products
  const filteredProductOptions = useMemo(() => {
    let options = productOptions

    // If products are already selected, only show from the same dispatch order
    if (selectedProducts.length > 0) {
      const lockedOrderId = selectedProducts[0].dispatchOrderId
      options = options.filter(opt => opt.dispatchOrderId === lockedOrderId)
    }

    // Filter by search query
    if (productSearch.trim()) {
      const query = productSearch.toLowerCase()
      options = options.filter(opt =>
        opt.productName.toLowerCase().includes(query) ||
        opt.productCode.toLowerCase().includes(query) ||
        opt.orderNumber.toLowerCase().includes(query)
      )
    }

    // Filter out already selected products
    options = options.filter(opt => {
      return !selectedProducts.some(p => p.productId === opt.productId && p.batchId === opt.batchId)
    })

    return options
  }, [productOptions, selectedProducts, productSearch])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedSupplierId("")
      setProducts([])
      setSelectedProducts([])
      setNotes("")
      setSupplierSearch("")
      setProductSearch("")
      setSupplierDropdownOpen(false)
      setProductDropdownOpen(false)
    }
  }, [open])

  // Reset selected products when supplier changes
  useEffect(() => {
    setSelectedProducts([])
    setProductSearch("")
  }, [selectedSupplierId])

  const selectSupplier = (supplier) => {
    setSelectedSupplierId(supplier._id)
    setSupplierSearch("")
    setSupplierDropdownOpen(false)
  }

  const clearSupplier = () => {
    setSelectedSupplierId("")
    setSupplierSearch("")
  }

  const addProductToReturn = (option) => {
    if (selectedProducts.some(p => p.productId === option.productId && p.batchId === option.batchId)) {
      toast.error("Item already added")
      return
    }

    if (selectedProducts.length > 0 && selectedProducts[0].dispatchOrderId !== option.dispatchOrderId) {
      toast.error("You can only return items from one Dispatch Order at a time.")
      return
    }

    setSelectedProducts(prev => [...prev, {
      productId: option.productId,
      batchId: option.batchId,
      dispatchOrderId: option.dispatchOrderId,
      orderNumber: option.orderNumber,
      productName: option.productName,
      productCode: option.productCode,
      currentStock: option.remainingQuantity,
      costPrice: option.costPrice,
      quantity: 1,
      reason: ""
    }])

    setProductSearch("")
    setProductDropdownOpen(false)
  }

  const updateProduct = (productId, batchId, field, value) => {
    setSelectedProducts(prev => prev.map(p => {
      if (p.productId !== productId || p.batchId !== batchId) return p

      if (field === "quantity") {
        const numValue = Number(value)
        if (numValue > p.currentStock) {
          toast.error(`Maximum ${p.currentStock} available in this batch`)
          return p
        }
        if (numValue < 1) return p
      }

      return { ...p, [field]: value }
    }))
  }

  const removeProduct = (productId, batchId) => {
    setSelectedProducts(prev => prev.filter(p => !(p.productId === productId && p.batchId === batchId)))
  }

  const calculateTotal = () => {
    return selectedProducts.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0)
  }

  const handleSubmit = async () => {
    if (!selectedSupplierId) {
      toast.error("Please select a supplier")
      return
    }

    if (selectedProducts.length === 0) {
      toast.error("Please add at least one product")
      return
    }

    try {
      const payload = {
        supplierId: selectedSupplierId,
        items: selectedProducts.map(p => ({
          productId: p.productId,
          batchId: p.batchId,
          quantity: p.quantity,
          reason: p.reason || ""
        })),
        returnDate: new Date().toISOString(),
        cashRefund: 0,
        accountCredit: calculateTotal(),
        notes: notes || `Product return - ${selectedProducts.length} item(s)`
      }

      await createReturnMutation.mutateAsync(payload)

      toast.success("Return created successfully")
      if (onSuccess) onSuccess()
      onClose()
    } catch (error) {
      console.error("Error creating return:", error)
      toast.error(error.response?.data?.message || "Failed to create return")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[1100px] w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-6 w-6" />
            Create Buying Return
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Supplier Selection - Simple Searchable Dropdown */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Supplier *</Label>
            <div className="relative">
              {selectedSupplier ? (
                // Selected supplier display
                <div className="flex items-center justify-between h-11 px-3 border rounded-md bg-muted/30">
                  <span className="font-medium">{selectedSupplier.name || selectedSupplier.company}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSupplier}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                // Search input
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={loadingSuppliers ? "Loading suppliers..." : "Search suppliers by name..."}
                    value={supplierSearch}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value)
                      setSupplierDropdownOpen(true)
                    }}
                    onFocus={() => setSupplierDropdownOpen(true)}
                    disabled={loadingSuppliers}
                    className="pl-9 h-11"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              )}

              {/* Supplier dropdown */}
              {supplierDropdownOpen && !selectedSupplier && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border rounded-md shadow-lg">
                  <ScrollArea className="max-h-[250px]">
                    {filteredSuppliers.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        {suppliers.length === 0 ? "No suppliers available" : "No suppliers match your search"}
                      </div>
                    ) : (
                      <div className="py-1">
                        {filteredSuppliers.map((supplier) => (
                          <button
                            key={supplier._id}
                            type="button"
                            onClick={() => selectSupplier(supplier)}
                            className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex flex-col"
                          >
                            <span className="font-medium">{supplier.name || supplier.company || 'Unknown'}</span>
                            {supplier.email && (
                              <span className="text-xs text-muted-foreground">{supplier.email}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>
            {/* Click outside to close */}
            {supplierDropdownOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSupplierDropdownOpen(false)}
              />
            )}
          </div>

          {/* Product Selection - Simple Searchable Dropdown */}
          {selectedSupplierId && (
            <div className="space-y-2">
              <Label className="text-base font-medium">Add Product</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={loadingProducts ? "Loading products..." : "Search products by name, code, or order..."}
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    setProductDropdownOpen(true)
                  }}
                  onFocus={() => setProductDropdownOpen(true)}
                  disabled={loadingProducts}
                  className="pl-9 h-11"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                {/* Product dropdown */}
                {productDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border rounded-md shadow-lg">
                    <ScrollArea className="max-h-[300px]">
                      {filteredProductOptions.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                          {products.length === 0
                            ? "No products available for returns from this supplier"
                            : productSearch
                              ? "No products match your search"
                              : "All available products have been added"}
                        </div>
                      ) : (
                        <div className="py-1">
                          {filteredProductOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => addProductToReturn(option)}
                              className="w-full px-3 py-2.5 text-left hover:bg-accent transition-colors border-b last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{option.productName}</span>
                                <Badge variant="outline" className="text-[10px] ml-2">
                                  {option.orderNumber}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Code: {option.productCode || '—'} | Qty: {option.remainingQuantity} | Cost: {option.costPrice?.toFixed(2)}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>
              {/* Click outside to close */}
              {productDropdownOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProductDropdownOpen(false)}
                />
              )}

              {selectedProducts.length > 0 && (
                <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                  ★ Restricted to Order: <strong>{selectedProducts[0].orderNumber}</strong> — Clear table to select a different order
                </p>
              )}
            </div>
          )}

          {/* Selected Products Table */}
          {selectedProducts.length > 0 && (
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/80">
                  <tr>
                    <th className="text-left p-3 font-semibold">Product</th>
                    <th className="text-right p-3 font-semibold w-24">Available</th>
                    <th className="text-right p-3 font-semibold w-28">Return Qty</th>
                    <th className="text-right p-3 font-semibold w-24">Cost</th>
                    <th className="text-right p-3 font-semibold w-28">Total</th>
                    <th className="text-center p-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.map(product => (
                    <tr key={`${product.productId}-${product.batchId}`} className="border-t hover:bg-muted/30">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{product.productName}</div>
                          <div className="text-xs text-muted-foreground">{product.productCode}</div>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {product.currentStock}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Input
                          type="text"
                          inputMode="numeric"
                          min="1"
                          max={product.currentStock}
                          value={product.quantity}
                          onChange={(e) => {
                            const value = e.target.value;
                            const sanitized = value.replace(/[^0-9]/g, '');
                            updateProduct(product.productId, product.batchId, "quantity", sanitized === "" ? 1 : Number(sanitized));
                          }}
                          className="h-9 text-right w-full"
                        />
                      </td>
                      <td className="p-3 text-right font-medium tabular-nums">
                        {product.costPrice?.toFixed(2) || '0.00'}
                      </td>
                      <td className="p-3 text-right font-semibold tabular-nums text-green-700">
                        {(product.quantity * product.costPrice).toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeProduct(product.productId, product.batchId)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/50">
                    <td colSpan={4} className="p-3 text-right font-semibold text-base">
                      Total Return Value:
                    </td>
                    <td className="p-3 text-right text-xl font-bold text-green-700 tabular-nums">
                      {calculateTotal().toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-medium">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this return..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Info message */}
          {selectedProducts.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> The return value of <strong>{calculateTotal().toFixed(2)}</strong> will be credited to the supplier's account.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={createReturnMutation.isPending}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createReturnMutation.isPending || selectedProducts.length === 0}
            className="px-6 bg-rose-600 hover:bg-rose-700"
          >
            {createReturnMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Create Return
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
