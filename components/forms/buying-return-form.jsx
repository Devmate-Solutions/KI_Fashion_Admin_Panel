"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TrashIcon, SearchIcon, Loader2Icon, PackageIcon } from "lucide-react"
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

export default function BuyingReturnForm({ onSave }) {
  const [suppliers, setSuppliers] = useState([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [selectedSupplierId, setSelectedSupplierId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [availableProducts, setAvailableProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const searchTimeoutRef = useRef(null)

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

  // Load products when supplier is selected
  useEffect(() => {
    if (!selectedSupplierId) {
      setAvailableProducts([])
      setSearchQuery("")
      return
    }

    const loadProducts = async () => {
      try {
        setLoadingProducts(true)
        // Load all products from this supplier (empty search = all products)
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

  // Add product to return (simplified - no batch detection)
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
      reason: ""
    }])

    setSearchQuery("")
    setSearchResults([])
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
        if (numValue < 1) return item
      }
      
      return { ...item, [field]: value }
    }))
  }

  function removeItem(id) {
    setSelectedItems(prev => prev.filter(item => item.id !== id))
  }

  // Calculate totals by supplier
  const supplierTotals = selectedItems.reduce((acc, item) => {
    const supplierId = item.supplierId || 'unknown'
    if (!acc[supplierId]) {
      acc[supplierId] = {
        supplierName: item.supplierName,
        totalAmount: 0,
        items: []
      }
    }
    const amount = item.returnQty * item.costPrice
    acc[supplierId].totalAmount += amount
    acc[supplierId].items.push(item)
    return acc
  }, {})

  const grandTotal = Object.values(supplierTotals).reduce((sum, s) => sum + s.totalAmount, 0)

  async function handleSave() {
    if (selectedItems.length === 0) {
      toast.error("Please add products to return")
      return
    }

    try {
      setSubmitting(true)

      // Group by supplier and create separate returns
      for (const [supplierId, supplierData] of Object.entries(supplierTotals)) {
        const payload = {
          supplierId,
          items: supplierData.items.map(item => ({
            productId: item.productId,
            quantity: item.returnQty,
            reason: item.reason || ""
          })),
          returnDate: new Date().toISOString(),
          cashRefund: 0,
          accountCredit: supplierData.totalAmount,
          notes: `Product return - ${supplierData.items.length} item(s)`
        }

        await returnsAPI.createProductReturn(payload)
      }
      
      toast.success("Return(s) created successfully")
      if (onSave) onSave()
      setSelectedItems([])
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
        <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
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

      {/* Search Section */}
      {selectedSupplierId && (
        <div className="space-y-4">
          <div>
            <Label>Search or Browse Products</Label>
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

          {/* Products List */}
          {loadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading products...</span>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
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
        </div>
      )}

      {/* Selected Items Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="text-left p-3 font-medium">Product</th>
              <th className="text-left p-3 font-medium">Supplier</th>
              <th className="text-right p-3 font-medium">Available</th>
              <th className="text-right p-3 font-medium w-32">Return Qty</th>
              <th className="text-right p-3 font-medium">Cost Price</th>
              <th className="text-right p-3 font-medium">Total</th>
              <th className="text-center p-3 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody>
            {selectedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  <PackageIcon className="h-8 w-8 mx-auto mb-2" />
                  <p>Search and click products to add them for return</p>
                </td>
              </tr>
            ) : (
              selectedItems.map((item) => (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.productCode}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="text-sm">{item.supplierName}</p>
                  </td>
                  <td className="p-3 text-right">
                    <Badge variant="outline">{item.availableQty}</Badge>
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="1"
                      max={item.availableQty}
                      value={item.returnQty}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers
                        const sanitized = value.replace(/[^0-9]/g, '');
                        updateItem(item.id, "returnQty", sanitized === "" ? "" : Number(sanitized));
                      }}
                      className="h-8 text-right tabular-nums"
                    />
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary by Supplier */}
      {selectedItems.length > 0 && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">Return Summary by Supplier</Label>
          {Object.entries(supplierTotals).map(([supplierId, data]) => (
            <div key={supplierId} className="p-4 border rounded-lg bg-muted/30">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{data.supplierName}</p>
                  <p className="text-sm text-muted-foreground">{data.items.length} item(s)</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Amount to be credited</p>
                  <p className="text-lg font-bold">£{data.totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
          
          <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
            <div className="flex justify-between items-center">
              <p className="font-semibold">Grand Total Return Value</p>
              <p className="text-2xl font-bold">£{grandTotal.toFixed(2)}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This amount will be credited to supplier accounts (reduces what you owe them)
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => setSelectedItems([])}
          disabled={submitting || selectedItems.length === 0}
        >
          Clear All
        </Button>
        <Button
          onClick={handleSave}
          disabled={submitting || selectedItems.length === 0}
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
    </div>
  )
}
