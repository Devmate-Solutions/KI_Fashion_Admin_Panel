"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package, Trash2 } from "lucide-react"
import { suppliersAPI } from "@/lib/api/endpoints/suppliers"
import { returnsAPI } from "@/lib/api/endpoints/returns"
import { useCreateProductReturn } from "@/lib/hooks/useReturns"
import toast from "react-hot-toast"

export default function BuyingReturnModal({ open, onClose, onSuccess }) {
  const [suppliers, setSuppliers] = useState([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [selectedSupplierId, setSelectedSupplierId] = useState("")
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [notes, setNotes] = useState("")

  // Use mutation hook for return creation with cache invalidation
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

  // Group products by Dispatch Order for the Select
  const groupedProductOptions = useMemo(() => {
    const groups = {}

    products.forEach(product => {
      if (!product.batches || product.batches.length === 0) return

      product.batches.forEach(batch => {
        // Create a unique key for the group (Dispatch Order)
        const orderKey = batch.dispatchOrderId || 'unknown'

        if (!groups[orderKey]) {
          const dateStr = batch.confirmedAt ? new Date(batch.confirmedAt).toLocaleDateString() : 'Unknown Date'
          groups[orderKey] = {
            label: `Order: ${batch.orderNumber || 'Unknown'} (${dateStr})`,
            options: [],
            orderId: batch.dispatchOrderId
          }
        }

        // Add product as an option within this group
        groups[orderKey].options.push({
          value: `${product._id}|${batch.batchId}`, // Composite ID: ProductID | BatchID
          label: product.name,
          description: `Code: ${product.productCode || product.sku} | Qty: ${batch.remainingQuantity} | Cost: ${batch.costPrice.toFixed(2)}`,
          disabled: false,
          // Store extra data for easier retrieval
          data: {
            product,
            batch
          }
        })
      })
    })

    return Object.values(groups)
  }, [products])

  // Filter options based on already selected products (Single Order Constraint)
  const filteredGroups = useMemo(() => {
    // If no products selected, show all groups
    if (selectedProducts.length === 0) return groupedProductOptions

    // If products selected, find the "locked" dispatch order ID
    const lockedOrderId = selectedProducts[0].dispatchOrderId

    // Only return the group matching the locked order
    return groupedProductOptions.filter(group => group.orderId === lockedOrderId)
  }, [groupedProductOptions, selectedProducts])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedSupplierId("")
      setProducts([])
      setSelectedProducts([])
      setNotes("")
    }
  }, [open])

  // Reset selected products when supplier changes
  useEffect(() => {
    setSelectedProducts([])
  }, [selectedSupplierId])

  const addProductToReturn = (compositeId) => {
    const [productId, batchId] = compositeId.split('|')

    // Find the product and specific batch
    const product = products.find(p => p._id === productId)
    if (!product) return

    const batch = product.batches?.find(b => b.batchId === batchId)
    if (!batch) return

    if (selectedProducts.some(p => p.productId === productId && p.batchId === batchId)) {
      toast.error("Item already added")
      return
    }

    // Check if locking to a new order
    if (selectedProducts.length > 0 && selectedProducts[0].dispatchOrderId !== batch.dispatchOrderId) {
      toast.error("You can only return items from one Dispatch Order at a time.")
      return
    }

    setSelectedProducts(prev => [...prev, {
      productId: product._id,
      batchId: batch.batchId,
      dispatchOrderId: batch.dispatchOrderId,
      orderNumber: batch.orderNumber, // Stored for display/reference
      productName: product.name,
      productCode: product.productCode || product.sku,
      currentStock: batch.remainingQuantity, // Max returnable is strictly batch quantity
      costPrice: batch.costPrice, // Exact cost from batch
      quantity: 1,
      reason: ""
    }])
  }

  const updateProduct = (productId, batchId, field, value) => {
    setSelectedProducts(prev => prev.map(p => {
      // Must match both product and batch
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
          batchId: p.batchId, // Send batch ID for backend processing
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
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create Buying Return
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Supplier Selection - Standard Select */}
          <div className="space-y-2">
            <Label>Supplier *</Label>
            <Select
              value={selectedSupplierId}
              onValueChange={setSelectedSupplierId}
              disabled={loadingSuppliers}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingSuppliers ? "Loading..." : "Select supplier..."} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier._id} value={supplier._id}>
                    {supplier.name || supplier.company || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Selection - Grouped Select */}
          {selectedSupplierId && (
            <div className="space-y-2">
              <Label>Add Product (Limited to Single Dispatch Order)</Label>
              <Select
                onValueChange={(value) => {
                  if (value) addProductToReturn(value)
                }}
                disabled={loadingProducts}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingProducts ? "Loading products..." : selectedProducts.length > 0 ? "Add another item from this order..." : "Select product..."} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {products.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">No products found</div>
                  ) : filteredGroups.map((group) => (
                    <SelectGroup key={group.orderId}>
                      <SelectLabel className="sticky top-0 bg-secondary/90 z-10 font-bold text-primary">
                        {group.label}
                      </SelectLabel>
                      {group.options.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          disabled={selectedProducts.some(p =>
                            p.productId === option.data.product._id &&
                            p.batchId === option.data.batch.batchId
                          )}
                        >
                          <div className="flex flex-col gap-1 text-left">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              {selectedProducts.length > 0 && (
                <p className="text-xs text-muted-foreground text-amber-600">
                  * Restricted to Dispatch Order: {selectedProducts[0].orderNumber || 'Unknown'} (Clear table to change order)
                </p>
              )}
            </div>
          )}

          {/* Selected Products Table */}
          {selectedProducts.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Product</th>
                    <th className="text-right p-2">Stock</th>
                    <th className="text-right p-2 w-24">Qty</th>
                    <th className="text-right p-2">Cost</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-center p-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.map(product => (
                    <tr key={`${product.productId}-${product.batchId}`} className="border-t">
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{product.productName}</div>
                          <div className="text-xs text-muted-foreground">{product.productCode}</div>
                        </div>
                      </td>
                      <td className="p-2 text-right">
                        <Badge variant="outline">{product.currentStock}</Badge>
                      </td>
                      <td className="p-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          min="1"
                          max={product.currentStock}
                          value={product.quantity}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow only numbers, default to 1 if empty to prevent NaN
                            const sanitized = value.replace(/[^0-9]/g, '');
                            updateProduct(product.productId, product.batchId, "quantity", sanitized === "" ? 1 : Number(sanitized));
                          }}
                          className="h-8 text-right"
                        />
                      </td>
                      <td className="p-2 text-right font-medium">
                        {product.costPrice.toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-semibold">
                        {(product.quantity * product.costPrice).toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeProduct(product.productId, product.batchId)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/50">
                    <td colSpan={4} className="p-2 text-right font-semibold">
                      Total Return Value:
                    </td>
                    <td className="p-2 text-right text-lg font-bold">
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
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this return..."
              rows={3}
            />
          </div>

          {/* Info message */}
          {selectedProducts.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <p className="text-blue-800">
                <strong>Note:</strong> The return value of {calculateTotal().toFixed(2)} will be credited to the supplier's account (reducing your payable amount).
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={createReturnMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createReturnMutation.isPending || selectedProducts.length === 0}
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
