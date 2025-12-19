"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusIcon, TrashIcon, UserPlusIcon, SearchIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { buyersAPI } from "@/lib/api/endpoints/buyers"
import { salesAPI } from "@/lib/api/endpoints/sales"
import { productsAPI } from "@/lib/api/endpoints/products"
import { productTypesAPI } from "@/lib/api/endpoints/productTypes"
import { useBuyers } from "@/lib/hooks/useBuyers"
import ProductImageGallery from "@/components/ui/ProductImageGallery"
import ProductSelectionModal from "@/components/modals/ProductSelectionModal"

// Helper to get image array from various sources
const getImageArray = (row) => {
  if (row.photo) {
    return Array.isArray(row.photo) ? row.photo : [row.photo];
  }
  if (Array.isArray(row.images) && row.images.length > 0) {
    return row.images;
  }
  if (row.image) {
    return [row.image];
  }
  return [];
};

// A multi-section selling form: buyer/metadata, products cart, and payment summary.
// Enhanced with keyboard shortcuts and better UX
// Integrated with backend APIs for buyers and sales
// Matches buying-form.jsx structure and design

export default function SaleForm({ onSave }) {
  // Loading and error states
  const [isLoadingBuyers, setIsLoadingBuyers] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  // Buyers (from API)
  const [buyers, setBuyers] = useState([])
  const [buyerId, setBuyerId] = useState("")
  const [isManualCustomer, setIsManualCustomer] = useState(false)
  const [showAddBuyer, setShowAddBuyer] = useState(false)
  const [newBuyerName, setNewBuyerName] = useState("")
  const [newBuyerPhone, setNewBuyerPhone] = useState("")
  const [newBuyerPhoneAreaCode, setNewBuyerPhoneAreaCode] = useState("")
  const [isCreatingBuyer, setIsCreatingBuyer] = useState(false)
  const newBuyerPhoneInputRef = useRef(null)
  const manualCustomerPhoneInputRef = useRef(null)

  // Product Selection Modal
  const [showProductModal, setShowProductModal] = useState(false)

  // Manual customer fields
  const [manualCustomer, setManualCustomer] = useState({
    name: "",
    phone: "",
    phoneAreaCode: "",
    email: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "Pakistan"
    }
  })

  // Products
  const [products, setProducts] = useState([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [productsError, setProductsError] = useState(null)

  // Product types
  const [productTypes, setProductTypes] = useState([])

  // Product code lookup state
  const lookupTimeoutRefs = useRef({})

  // Product name lookup state
  const nameLookupTimeoutRefs = useRef({})

  // Metadata fields
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0])
  const [saleType, setSaleType] = useState("retail")

  // Cart rows
  const [rows, setRows] = useState([])

  // Payment section
  const [discount, setDiscount] = useState(0)
  const [cash, setCash] = useState(0)
  const [bank, setBank] = useState(0)

  // Refs for keyboard navigation
  const cashInputRef = useRef(null)
  const bankInputRef = useRef(null)
  const saveButtonRef = useRef(null)

  // Fetch all buyers
  useEffect(() => {
    async function fetchAllBuyers() {
      try {
        setIsLoadingBuyers(true)
        setError(null)

        const response = await buyersAPI.getAll({
          isActive: true,
          limit: 1000
        })

        let buyersList = []
        if (response.data?.data && Array.isArray(response.data.data)) {
          buyersList = response.data.data
        } else if (response.data && Array.isArray(response.data)) {
          buyersList = response.data
        } else if (Array.isArray(response)) {
          buyersList = response
        }

        const normalizedBuyers = buyersList.map(buyer => ({
          id: buyer._id || buyer.id,
          name: buyer.name,
          company: buyer.company || '',
          phone: buyer.phone || '',
          email: buyer.email || '',
          buyerId: buyer._id || buyer.id,
          _original: buyer
        }))

        setBuyers(normalizedBuyers)
      } catch (err) {
        console.error('Error fetching buyers:', err)
        setError('Failed to load buyers. Please refresh the page.')
      } finally {
        setIsLoadingBuyers(false)
      }
    }

    fetchAllBuyers()
  }, [])

  // Fetch products (all products for selling)
  useEffect(() => {
    let cancelled = false

    async function fetchProducts() {
      try {
        setIsLoadingProducts(true)
        setProductsError(null)

        const response = await productsAPI.getAll({
          limit: 500
        })

        let rawList = response.data?.data || response.data || []

        let normalized = rawList.map((product) => ({
          id: product._id || product.id,
          name: product.name || product.productName || product.productCode || product.sku || "Unnamed Product",
          productCode: product.productCode || product.sku || product.code || "",
          color: product.color || product.colour || "",
          size: product.size || product.dimension || "",
          images: Array.isArray(product.images)
            ? product.images
            : product.image
              ? [product.image]
              : [],
          pricing: product.pricing || {},
          defaultPrice: product.pricing?.sellingPrice || product.sellingPrice || product.unitPrice || 0,
          _original: product,
        }))

        if (!cancelled) {
          setProducts(normalized)
        }
      } catch (err) {
        console.error('Error fetching products:', err)
        if (!cancelled) {
          setProducts([])
          setProductsError('Failed to load products.')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProducts(false)
        }
      }
    }

    fetchProducts()

    return () => {
      cancelled = true
    }
  }, [])

  // Add new buyer (Quick add with API integration)
  async function handleAddBuyer() {
    if (!newBuyerName.trim()) {
      setError('Please enter buyer name')
      return
    }

    if (!newBuyerPhone.trim()) {
      setError('Please enter buyer phone')
      return
    }

    try {
      setIsCreatingBuyer(true)
      setError(null)

      const response = await buyersAPI.create({
        name: newBuyerName.trim(),
        phone: newBuyerPhone.trim(),
        phoneAreaCode: newBuyerPhoneAreaCode.trim() || undefined
      })

      const newBuyer = response.data?.data || response.data

      if (newBuyer) {
        const normalizedBuyer = {
          id: newBuyer._id || newBuyer.id,
          name: newBuyer.name,
          company: newBuyer.company || '',
          phone: newBuyer.phone || '',
          email: newBuyer.email || '',
          buyerId: newBuyer._id || newBuyer.id,
          _original: newBuyer
        }

        setBuyers(prev => [...prev, normalizedBuyer])
        setBuyerId(String(normalizedBuyer.id))
        setIsManualCustomer(false)
        setNewBuyerName("")
        setNewBuyerPhone("")
        setShowAddBuyer(false)
      }
    } catch (err) {
      console.error('Error creating buyer:', err)
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to create buyer. Please try again.'
      setError(errorMessage)
    } finally {
      setIsCreatingBuyer(false)
    }
  }

  // Fetch product types
  useEffect(() => {
    async function fetchProductTypes() {
      try {
        const response = await productTypesAPI.getAll({ limit: 1000 })
        const typesList = response.data?.data || response.data || []
        setProductTypes(typesList)
      } catch (err) {
        console.error('Error fetching product types:', err)
      }
    }
    fetchProductTypes()
  }, [])

  // Add new row to cart
  function addRow() {
    const newRow = {
      id: Date.now(),
      productId: "",
      productName: "",
      productCode: "",
      productType: "",
      unitPrice: 0,
      quantity: 1,
      photo: null,
    }
    setRows((r) => [...r, newRow])
  }

  function updateRow(id, field, value) {
    setRows((r) =>
      r.map((row) => {
        if (row.id !== id) return row

        const updated = { ...row, [field]: value }

        // Auto-calculate total when quantity or unitPrice changes
        const unitPrice = Number(updated.unitPrice || 0)
        const quantity = Number(updated.quantity || 0)
        updated.totalPrice = unitPrice * quantity

        return updated
      }),
    )
  }

  function removeRow(id) {
    setRows((r) => r.filter((x) => x.id !== id))
  }

  // Handle product selection from modal
  function handleProductSelect(product) {
    const newRow = {
      id: Date.now(),
      productId: product.id,
      productName: product.name,
      productCode: product.productCode,
      productType: product.productType?._id || product.productType?.id || product.productType, // Handle object or ID
      productTypeName: product.productType?.name || product.productType, // Store name for display
      unitPrice: Number(product.defaultPrice || 0).toFixed(2), // Fix to 2 decimals
      quantity: 1,
      photo: product.images?.[0] || product.image,
      totalPrice: product.defaultPrice * 1 // initial total
    }

    setRows((r) => [...r, newRow])
  }

  // Derived totals
  const totals = useMemo(() => {
    const grandTotal = rows.reduce((sum, row) => sum + Number(row.totalPrice || 0), 0)
    const totalAfterDiscount = Math.max(0, grandTotal - Number(discount || 0))
    const paid = Number(cash || 0) + Number(bank || 0)
    const remaining = Math.max(0, totalAfterDiscount - paid)
    return { grandTotal, totalAfterDiscount, paid, remaining }
  }, [rows, discount, cash, bank])

  // Keyboard shortcuts
  function handlePaymentKeyDown(e, field) {
    if (e.key === "Enter") {
      e.preventDefault()
      if (field === "discount") {
        cashInputRef.current?.focus()
      } else if (field === "cash") {
        bankInputRef.current?.focus()
      } else if (field === "bank") {
        saveButtonRef.current?.focus()
      }
    }
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault()
      handleSave()
    }
  }

  // Save sale to backend
  async function handleSave() {
    // Validation
    if (!isManualCustomer && !buyerId) {
      setError('Please select a buyer or enter manual customer details')
      return
    }

    if (isManualCustomer && !manualCustomer.name.trim()) {
      setError('Please enter manual customer name')
      return
    }

    if (rows.length === 0) {
      setError('Please add at least one product')
      return
    }

    const invalidRows = rows.filter(row =>
      !row.productName ||
      !row.productCode ||
      !row.productType ||
      !row.unitPrice ||
      row.unitPrice <= 0 ||
      !row.quantity ||
      row.quantity <= 0
    )

    if (invalidRows.length > 0) {
      setError('Please fill in product name, code, product type, unit price, and quantity for all rows')
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const totalPaid = Number(cash || 0) + Number(bank || 0)
      const paymentStatus = totals.remaining <= 0
        ? 'paid'
        : totalPaid > 0
          ? 'partial'
          : 'pending'

      // For rows without productId, try to find product by name or code
      const itemsWithProducts = await Promise.all(rows.map(async (row) => {
        let productId = row.productId

        if (!productId && (row.productName || row.productCode)) {
          try {
            if (row.productCode) {
              try {
                const codeResponse = await productsAPI.lookupByCode(row.productCode)
                const product = codeResponse.data?.data || codeResponse.data
                if (product) {
                  productId = product._id || product.id
                }
              } catch (codeErr) {
                if (row.productName) {
                  const nameResponse = await productsAPI.search(row.productName)
                  const productsList = nameResponse.data?.data || nameResponse.data || []
                  const product = productsList.find(p =>
                    p.name?.toLowerCase() === row.productName.trim().toLowerCase()
                  ) || productsList[0]
                  if (product) {
                    productId = product._id || product.id
                  }
                }
              }
            } else if (row.productName) {
              const nameResponse = await productsAPI.search(row.productName)
              const productsList = nameResponse.data?.data || nameResponse.data || []
              const product = productsList.find(p =>
                p.name?.toLowerCase() === row.productName.trim().toLowerCase()
              ) || productsList[0]
              if (product) {
                productId = product._id || product.id
              }
            }
          } catch (searchErr) {
            console.error('Error searching for product:', searchErr)
          }
        }

        if (!productId) {
          try {
            const productData = {
              name: row.productName.trim(),
              sku: (row.productCode || `AUTO-${Date.now()}`).toUpperCase(),
              productType: row.productType,
              category: 'General',
              specifications: {
                color: row.primaryColor || undefined
              },
              pricing: {
                costPrice: Number(row.unitPrice || 0) * 0.8, // Estimate cost at 80% of selling price
                sellingPrice: Number(row.unitPrice || 0),
              },
              unit: 'piece'
            }

            const createResponse = await productsAPI.create(productData)
            const createdProduct = createResponse.data?.data || createResponse.data
            if (createdProduct) {
              productId = createdProduct._id || createdProduct.id
              console.log(`Created new product: ${row.productName} with ID: ${productId}`)
            } else {
              throw new Error(`Failed to create product "${row.productName}"`)
            }
          } catch (createErr) {
            console.error('Error creating product:', createErr)
            const errorMessage = createErr.response?.data?.message ||
              createErr.response?.data?.error ||
              createErr.message ||
              `Failed to create product "${row.productName}"`
            throw new Error(errorMessage)
          }
        }

        const unitPrice = Number(row.unitPrice || 0)
        const quantity = Number(row.quantity)
        const totalPrice = unitPrice * quantity

        return {
          product: productId,
          quantity: quantity,
          unitPrice: unitPrice,
          totalPrice: totalPrice,
          discount: 0,
          taxRate: 0
        }
      }))

      // Calculate subtotal and grandTotal
      const subtotal = itemsWithProducts.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
      const grandTotal = Math.max(0, subtotal - Number(discount || 0))

      const payload = {
        saleDate: saleDate,
        items: itemsWithProducts,
        subtotal: subtotal,
        totalDiscount: Number(discount || 0),
        totalTax: 0,
        shippingCost: 0,
        grandTotal: grandTotal,
        cashPayment: Number(cash || 0),
        bankPayment: Number(bank || 0),
        paymentStatus,
        paymentMethod: cash > 0 ? 'cash' : bank > 0 ? 'online' : 'credit',
        saleType: saleType,
        notes: `Manual entry - ${isManualCustomer ? manualCustomer.name : buyers.find(b => String(b.id) === String(buyerId))?.name || 'Customer'}`,
      }

      // Add buyer or manualCustomer
      if (isManualCustomer) {
        payload.manualCustomer = manualCustomer
      } else {
        payload.buyer = buyerId
      }

      const response = await salesAPI.create(payload)

      if (onSave) {
        onSave(response.data?.data || response.data)
      }

    } catch (err) {
      console.error('Error saving sale:', err)

      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to save sale. Please try again.'

      setError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium">Error:</span>
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Loading State for Buyers */}
      {isLoadingBuyers && (
        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <span className="text-sm text-muted-foreground">Loading buyers...</span>
          </div>
        </div>
      )}

      {/* Section 1: Selling Details */}
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Selling Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sale-date">Sale Date</Label>
            <Input
              id="sale-date"
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sale-type">Sale Type</Label>
            <Select value={saleType} onValueChange={setSaleType}>
              <SelectTrigger id="sale-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
                <SelectItem value="bulk">Bulk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buyer">Customer / Distributor</Label>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Select
                  value={isManualCustomer ? "manual" : (buyerId || undefined)}
                  onValueChange={(value) => {
                    if (value === "manual") {
                      setIsManualCustomer(true)
                      setBuyerId("")
                    } else {
                      setIsManualCustomer(false)
                      setBuyerId(value)
                    }
                  }}
                  disabled={isLoadingBuyers}
                >
                  <SelectTrigger id="buyer" className="flex-1">
                    <SelectValue placeholder={isLoadingBuyers ? "Loading..." : "Select customer..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {buyers.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name} {b.company ? `(${b.company})` : ''}
                      </SelectItem>
                    ))}
                    <SelectItem value="manual">Manual Customer</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowAddBuyer(true)}
                  title="Add new buyer"
                  disabled={isLoadingBuyers}
                >
                  <UserPlusIcon className="h-4 w-4" />
                </Button>
              </div>
              {isManualCustomer && (
                <div className="space-y-2 mt-2 p-3 border border-border rounded-md bg-muted/30">
                  <div className="space-y-2">
                    <Label htmlFor="manual-name">Customer Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="manual-name"
                      value={manualCustomer.name}
                      onChange={(e) => setManualCustomer({ ...manualCustomer, name: e.target.value })}
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="manual-phone">Phone</Label>
                      <div className="flex gap-2">
                        <Input
                          id="manual-phone-area-code"
                          value={manualCustomer.phoneAreaCode || ""}
                          onChange={(e) => {
                            const value = e.target.value
                            setManualCustomer({ ...manualCustomer, phoneAreaCode: value })
                            if (value.length >= 5 && manualCustomerPhoneInputRef.current) {
                              manualCustomerPhoneInputRef.current.focus()
                            }
                          }}
                          maxLength={5}
                          className="w-24"
                        />
                        <Input
                          ref={manualCustomerPhoneInputRef}
                          id="manual-phone"
                          value={manualCustomer.phone}
                          onChange={(e) => setManualCustomer({ ...manualCustomer, phone: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual-email">Email</Label>
                      <Input
                        id="manual-email"
                        type="email"
                        value={manualCustomer.email}
                        onChange={(e) => setManualCustomer({ ...manualCustomer, email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Products Cart */}
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Products</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowProductModal(true)}
              size="sm"
              className="gap-2"
            >
              <SearchIcon className="h-4 w-4" />
              Browse Inventory
            </Button>
            <Button
              type="button"
              onClick={addRow}
              size="sm"
              className="gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left p-3 font-medium min-w-[150px]">Name</th>
                <th className="text-left p-3 font-medium min-w-[120px]">Code</th>
                <th className="text-left p-3 font-medium min-w-[80px]">Image</th>
                <th className="text-left p-3 font-medium min-w-[150px]">Product Type</th>
                <th className="text-right p-3 font-medium min-w-[100px]">Unit Price</th>
                <th className="text-right p-3 font-medium min-w-[100px]">Quantity</th>
                <th className="text-right p-3 font-medium min-w-[100px]">Total</th>
                <th className="text-center p-3 font-medium w-20">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm">No products added yet</p>
                      <p className="text-xs">Click "Add Product" to get started</p>
                    </div>
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                  {/* Name */}
                  <td className="p-2">
                    <Input
                      value={row.productName}
                      onChange={(e) => {
                        const name = e.target.value
                        updateRow(row.id, "productName", name)

                        if (nameLookupTimeoutRefs.current[row.id]) {
                          clearTimeout(nameLookupTimeoutRefs.current[row.id])
                        }

                        if (name.trim().length >= 2) {
                          nameLookupTimeoutRefs.current[row.id] = setTimeout(async () => {
                            try {
                              const response = await productsAPI.search(name.trim())
                              const productsList = response.data?.data || response.data || []

                              let product = productsList.find(p =>
                                p.name?.toLowerCase() === name.trim().toLowerCase()
                              ) || productsList[0]

                              if (product) {
                                const unitPrice = Number(
                                  product.pricing?.sellingPrice || product.sellingPrice || product.unitPrice || 0
                                )

                                setRows(prev => prev.map(r =>
                                  r.id === row.id ? {
                                    ...r,
                                    productId: product._id || product.id,
                                    productName: product.name || name,
                                    productCode: product.productCode || product.sku || r.productCode,
                                    productType: product.productType || r.productType,
                                    productTypeName: product.productType?.name || r.productTypeName,
                                    unitPrice: Number(unitPrice || 0).toFixed(2),
                                    photo: product.images?.[0] || product.image || r.photo
                                  } : r
                                ))
                              }
                            } catch (err) {
                              console.error('Product name lookup error:', err)
                            }
                          }, 500)
                        }
                      }}
                      placeholder="Enter product name"
                      className="h-8 text-sm"
                    />
                  </td>

                  {/* Code */}
                  <td className="p-2">
                    <Input
                      value={row.productCode}
                      onChange={(e) => {
                        const code = e.target.value
                        updateRow(row.id, "productCode", code)

                        if (lookupTimeoutRefs.current[row.id]) {
                          clearTimeout(lookupTimeoutRefs.current[row.id])
                        }

                        if (code.trim().length >= 2) {
                          lookupTimeoutRefs.current[row.id] = setTimeout(async () => {
                            try {
                              const response = await productsAPI.lookupByCode(code.trim())
                              const product = response.data?.data || response.data

                              if (product) {
                                const unitPrice = Number(
                                  product.pricing?.sellingPrice || product.sellingPrice || product.unitPrice || 0
                                )

                                setRows(prev => prev.map(r =>
                                  r.id === row.id ? {
                                    ...r,
                                    productId: product._id || product.id,
                                    productName: product.name || r.productName,
                                    productCode: product.productCode || product.sku || code,
                                    productType: product.productType || r.productType,
                                    productTypeName: product.productType?.name || r.productTypeName,
                                    unitPrice: Number(unitPrice || 0).toFixed(2),
                                    photo: product.images?.[0] || product.image || r.photo
                                  } : r
                                ))
                              }
                            } catch (err) {
                              console.error('Product lookup error:', err)
                            }
                          }, 500)
                        }
                      }}
                      className="h-8 text-sm"
                    />
                  </td>

                  {/* Image */}
                  <td className="p-2">
                    <ProductImageGallery
                      images={getImageArray(row)}
                      alt={row.productName || row.productCode || "Product"}
                      size="sm"
                      maxVisible={2}
                      showCount={true}
                    />
                  </td>

                  {/* Product Type */}
                  <td className="p-2">
                    <div className="h-8 flex items-center px-3 text-sm bg-muted/50 rounded-md border border-transparent text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                      {(() => {
                        const typeId = typeof row.productType === 'object' ? (row.productType._id || row.productType.id) : row.productType;
                        const type = productTypes.find(t => String(t._id || t.id) === String(typeId));
                        return type?.name || row.productTypeName || "—";
                      })()}
                    </div>
                  </td>

                  {/* Unit Price */}
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.unitPrice}
                      onChange={(e) => updateRow(row.id, "unitPrice", Number(e.target.value))}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value)
                        if (!isNaN(val)) {
                          updateRow(row.id, "unitPrice", Number(val.toFixed(2)))
                        }
                      }}
                      className="h-8 text-sm text-right tabular-nums"
                    />
                  </td>

                  {/* Quantity */}
                  <td className="p-2">
                    <Input
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, "quantity", Number(e.target.value))}
                      className="h-8 text-sm text-right tabular-nums"
                    />
                  </td>

                  {/* Total */}
                  <td className="p-2">
                    <div className="text-right text-sm font-medium tabular-nums">
                      £{(Number(row.unitPrice || 0) * Number(row.quantity || 0)).toFixed(2)}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="p-2 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(row.id)}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      title="Remove row"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            <kbd className="px-2 py-1 bg-muted rounded text-xs">Tab</kbd> to navigate between fields
          </div>
        )}
      </section>

      {/* Section 3: Payment Summary */}
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Payment Summary</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Left: Calculated totals */}
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-md">
              <span className="text-sm font-medium">Grand Total</span>
              <span className="text-lg font-semibold tabular-nums">
                £{totals.grandTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md">
              <span className="text-sm font-medium">Total After Discount</span>
              <span className="text-lg font-semibold tabular-nums text-blue-700 dark:text-blue-400">
                £{totals.totalAfterDiscount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Middle: Input fields */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value || 0))}
                onKeyDown={(e) => handlePaymentKeyDown(e, "discount")}
                placeholder="0.00"
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cash">Cash Payment</Label>
              <Input
                id="cash"
                ref={cashInputRef}
                type="number"
                step="0.01"
                value={cash}
                onChange={(e) => setCash(Number(e.target.value || 0))}
                onKeyDown={(e) => handlePaymentKeyDown(e, "cash")}
                placeholder="0.00"
                className="text-lg"
              />
            </div>
          </div>

          {/* Right: More inputs and remaining */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="bank">Bank Payment</Label>
              <Input
                id="bank"
                ref={bankInputRef}
                type="number"
                step="0.01"
                value={bank}
                onChange={(e) => setBank(Number(e.target.value || 0))}
                onKeyDown={(e) => handlePaymentKeyDown(e, "bank")}
                placeholder="0.00"
                className="text-lg"
              />
            </div>
            <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md border-2 border-amber-200 dark:border-amber-900">
              <span className="text-sm font-medium">Remaining Balance</span>
              <span className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400">
                £{totals.remaining.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd>
              <span>Next field</span>
              <span className="text-muted-foreground/50">•</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+S</kbd>
              <span>Save</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRows([])
                setDiscount(0)
                setCash(0)
                setBank(0)
                setError(null)
              }}
              disabled={isSaving}
            >
              Reset Form
            </Button>
            <Button
              ref={saveButtonRef}
              type="button"
              onClick={handleSave}
              size="lg"
              className="gap-2 min-w-[140px]"
              disabled={isSaving || isLoadingBuyers}
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                'Save Selling'
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Add Buyer Dialog */}
      <Dialog open={showAddBuyer} onOpenChange={setShowAddBuyer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Buyer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-buyer-name">Buyer Name <span className="text-red-500">*</span></Label>
              <Input
                id="new-buyer-name"
                value={newBuyerName}
                onChange={(e) => setNewBuyerName(e.target.value)}
                placeholder="Enter buyer name"
                disabled={isCreatingBuyer}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-buyer-phone">Phone <span className="text-red-500">*</span></Label>
              <div className="flex gap-2">
                <Input
                  id="new-buyer-phone-area-code"
                  value={newBuyerPhoneAreaCode}
                  onChange={(e) => setNewBuyerPhoneAreaCode(e.target.value)}
                  maxLength={5}
                  className="w-24"
                  disabled={isCreatingBuyer}
                />
                <Input
                  id="new-buyer-phone"
                  value={newBuyerPhone}
                  onChange={(e) => setNewBuyerPhone(e.target.value)}
                  className="flex-1"
                  disabled={isCreatingBuyer}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddBuyer(false)
                setNewBuyerName("")
                setNewBuyerPhone("")
                setNewBuyerPhoneAreaCode("")
              }}
              disabled={isCreatingBuyer}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddBuyer}
              disabled={isCreatingBuyer || !newBuyerName.trim() || !newBuyerPhone.trim()}
            >
              {isCreatingBuyer ? 'Creating...' : 'Create Buyer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Selection Modal */}
      <ProductSelectionModal
        open={showProductModal}
        onClose={() => setShowProductModal(false)}
        products={products}
        onSelect={handleProductSelect}
      />
    </div>
  )
}
