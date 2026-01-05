"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package, Trash2, Plus } from "lucide-react"
import { suppliersAPI } from "@/lib/api/endpoints/suppliers"
import { returnsAPI } from "@/lib/api/endpoints/returns"
import toast from "react-hot-toast"

export default function BuyingReturnModal({ open, onClose, onSuccess }) {
  const [suppliers, setSuppliers] = useState([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [selectedSupplierId, setSelectedSupplierId] = useState("")
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

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

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedSupplierId("")
      setProducts([])
      setSelectedProducts([])
      setNotes("")
    }
  }, [open])

  const addProductToReturn = (productId) => {
    const product = products.find(p => p._id === productId)
    if (!product) return

    if (selectedProducts.some(p => p.productId === productId)) {
      toast.error("Product already added")
      return
    }

    setSelectedProducts(prev => [...prev, {
      productId: product._id,
      productName: product.name,
      productCode: product.productCode || product.sku,
      currentStock: product.currentStock || 0,
      costPrice: product.averageCostPrice || 0,
      quantity: 1,
      reason: ""
    }])
  }

  const updateProduct = (productId, field, value) => {
    setSelectedProducts(prev => prev.map(p => {
      if (p.productId !== productId) return p
      
      if (field === "quantity") {
        const numValue = Number(value)
        if (numValue > p.currentStock) {
          toast.error(`Maximum ${p.currentStock} available`)
          return p
        }
        if (numValue < 1) return p
      }
      
      return { ...p, [field]: value }
    }))
  }

  const removeProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId))
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
      setSubmitting(true)

      const payload = {
        supplierId: selectedSupplierId,
        items: selectedProducts.map(p => ({
          productId: p.productId,
          quantity: p.quantity,
          reason: p.reason || ""
        })),
        returnDate: new Date().toISOString(),
        cashRefund: 0,
        accountCredit: calculateTotal(),
        notes: notes || `Product return - ${selectedProducts.length} item(s)`
      }

      await returnsAPI.createProductReturn(payload)
      
      toast.success("Return created successfully")
      if (onSuccess) onSuccess()
      onClose()
    } catch (error) {
      console.error("Error creating return:", error)
      toast.error(error.response?.data?.message || "Failed to create return")
    } finally {
      setSubmitting(false)
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
          {/* Supplier Selection */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier *</Label>
            <Select 
              value={selectedSupplierId} 
              onValueChange={setSelectedSupplierId}
              disabled={loadingSuppliers}
            >
              <SelectTrigger id="supplier">
                <SelectValue placeholder="Select supplier..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier._id} value={supplier._id}>
                    {supplier.name || supplier.company}
                    {supplier.contactPerson && ` (${supplier.contactPerson})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Selection */}
          {selectedSupplierId && (
            <div className="space-y-2">
              <Label htmlFor="product">Add Product</Label>
              <Select onValueChange={addProductToReturn} disabled={loadingProducts}>
                <SelectTrigger id="product">
                  <SelectValue placeholder={loadingProducts ? "Loading products..." : "Select product to return..."} />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem 
                      key={product._id} 
                      value={product._id}
                      disabled={selectedProducts.some(p => p.productId === product._id)}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span>{product.name} ({product.productCode || product.sku})</span>
                        <span className="text-xs text-muted-foreground ml-4">
                          Stock: {product.currentStock} | £{product.averageCostPrice?.toFixed(2) || "0.00"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <tr key={product.productId} className="border-t">
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
                            // Allow only numbers
                            const sanitized = value.replace(/[^0-9]/g, '');
                            updateProduct(product.productId, "quantity", sanitized === "" ? "" : Number(sanitized));
                          }}
                          className="h-8 text-right"
                        />
                      </td>
                      <td className="p-2 text-right font-medium">
                        £{product.costPrice.toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-semibold">
                        £{(product.quantity * product.costPrice).toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeProduct(product.productId)}
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
                      £{calculateTotal().toFixed(2)}
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
                <strong>Note:</strong> The return value of £{calculateTotal().toFixed(2)} will be credited to the supplier's account (reducing your payable amount).
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedProducts.length === 0}
          >
            {submitting ? (
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
