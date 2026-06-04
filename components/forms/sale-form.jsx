// "use client"

// import { useEffect, useMemo, useState, useRef } from "react"
// import { useRouter } from "next/navigation"
// import { toast } from "react-hot-toast"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { PlusIcon, TrashIcon, UserPlusIcon, SearchIcon, Calendar, Tag, Users, X, ChevronDown, Scissors } from "lucide-react"
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
// } from "@/components/ui/dialog"
// import { Label } from "@/components/ui/label"
// import { buyersAPI } from "@/lib/api/endpoints/buyers"
// import { salesAPI } from "@/lib/api/endpoints/sales"
// import { productsAPI } from "@/lib/api/endpoints/products"
// import { logisticsCompaniesAPI } from "@/lib/api/endpoints/logisticsCompanies"
// import { useBuyers } from "@/lib/hooks/useBuyers"
// import { MultiSelect } from "@/components/ui/multi-select"
// import { SEASON_OPTIONS, normalizeSeasonArray } from "@/lib/constants/seasons"
// import ProductImageGallery from "@/components/ui/ProductImageGallery"
// import ProductSelectionModal from "@/components/modals/ProductSelectionModal"
// import BritishDatePicker from "@/components/BritishDatePicker"
// import PacketStockSelectionModal from "@/components/modals/PacketStockSelectionModal"
// import BreakPacketDialog from "@/components/modals/BreakPacketDialog"
// import LooseStockBarcodeModal from "@/components/modals/LooseStockBarcodeModal"
// import { useBreakPacket } from "@/lib/hooks/usePacketStock"
// import { useAuthStore } from "@/store/store"
// import { useSubmitEditRequest } from "@/lib/hooks/useEditRequests"
// import { FilePen } from "lucide-react"

// const normalizeNameForCompare = (name) => {
//   return (name || "").replace(/\s+/g, "").toLowerCase();
// };

// // Helper to get image array from various sources
// const getImageArray = (row) => {
//   if (row.photo) {
//     return Array.isArray(row.photo) ? row.photo : [row.photo];
//   }
//   if (Array.isArray(row.images) && row.images.length > 0) {
//     return row.images;
//   }
//   if (row.image) {
//     return [row.image];
//   }
//   return [];
// };

// const getPacketQuantity = (item) => {
//   if (!item?.isPacketSale) {
//     return null
//   }

//   const explicitPacketQuantity = Number(item.packetQuantity)
//   if (Number.isFinite(explicitPacketQuantity) && explicitPacketQuantity > 0) {
//     return explicitPacketQuantity
//   }

//   const totalItemsPerPacket = Number(item.totalItemsPerPacket)
//   const quantity = Number(item.quantity)

//   if (
//     !Number.isFinite(totalItemsPerPacket) ||
//     totalItemsPerPacket <= 0 ||
//     !Number.isFinite(quantity) ||
//     quantity <= 0
//   ) {
//     return null
//   }

//   const derivedPacketQuantity = quantity / totalItemsPerPacket
//   return Number.isInteger(derivedPacketQuantity) && derivedPacketQuantity > 0
//     ? derivedPacketQuantity
//     : null
// }

// const getRowTotalPrice = (row) => {
//   const unitPrice = Number(row.unitPrice || 0)
//   const quantity = Number(row.quantity || 0)

//   if (row.isPacketSale && row.totalItemsPerPacket) {
//     return unitPrice * quantity * Number(row.totalItemsPerPacket || 0)
//   }

//   return unitPrice * quantity
// }

// const VAT_RATE = 20

// const roundCurrency = (value) => {
//   const normalized = Number(value)
//   if (!Number.isFinite(normalized)) return 0
//   return Math.round((normalized + Number.EPSILON) * 100) / 100
// }

// // A multi-section selling form: buyer/metadata, products cart, and payment summary.
// // Enhanced with keyboard shortcuts and better UX
// // Integrated with backend APIs for buyers and sales
// // Matches buying-form.jsx structure and design

// export default function SaleForm({ onSave, initialData, saleId }) {
//   const router = useRouter()
//   const isEditMode = !!saleId
//   const { user } = useAuthStore()
//   const isSuperAdmin = user?.role === 'super-admin'
//   const submitEditRequestMutation = useSubmitEditRequest()

//   // Edit request panel state (non-super-admin edit mode)
//   const [showEditRequestPanel, setShowEditRequestPanel] = useState(false)
//   const [editRequestReason, setEditRequestReason] = useState("")
//   const [pendingPayload, setPendingPayload] = useState(null)
//   const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

//   // Loading and error states
//   const [isLoadingBuyers, setIsLoadingBuyers] = useState(true)
//   const [isSaving, setIsSaving] = useState(false)
//   const [error, setError] = useState(null)
//   const [customerSearch, setCustomerSearch] = useState("")
//   const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)

//   // Buyers (from API)
//   const [buyers, setBuyers] = useState([])
//   const [buyerId, setBuyerId] = useState("")
//   const [isManualCustomer, setIsManualCustomer] = useState(false)
//   const [showAddBuyer, setShowAddBuyer] = useState(false)
//   const [newBuyerName, setNewBuyerName] = useState("")
//   const [newBuyerCompany, setNewBuyerCompany] = useState("")
//   const [newBuyerEmail, setNewBuyerEmail] = useState("")
//   const [newBuyerPhone, setNewBuyerPhone] = useState("")
//   const [newBuyerPhoneAreaCode, setNewBuyerPhoneAreaCode] = useState("")
//   const [newBuyerAddress, setNewBuyerAddress] = useState("")
//   const [isCreatingBuyer, setIsCreatingBuyer] = useState(false)
//   const newBuyerPhoneInputRef = useRef(null)
//   const manualCustomerPhoneInputRef = useRef(null)

//   // Product Selection Modal
//   const [showProductModal, setShowProductModal] = useState(false)

//   // Manual customer fields
//   const [manualCustomer, setManualCustomer] = useState({
//     name: "",
//     company: "",
//     phone: "",
//     phoneAreaCode: "",
//     email: "",
//     address: {
//       street: "",
//       city: "",
//       state: "",
//       zipCode: "",
//       country: "Pakistan"
//     }
//   })

//   // Products
//   const [products, setProducts] = useState([])
//   const [isLoadingProducts, setIsLoadingProducts] = useState(false)
//   const [productsError, setProductsError] = useState(null)

//   // Product code lookup state
//   const lookupTimeoutRefs = useRef({})

//   // Product name lookup state
//   const nameLookupTimeoutRefs = useRef({})

//   // Metadata fields
//   const [saleDate, setSaleDate] = useState(new Date().toLocaleDateString('en-CA'))
//   const [saleType, setSaleType] = useState("wholesale")
//   const [notes, setNotes] = useState("") // separate notes field for edit

//   // Cart rows
//   const [rows, setRows] = useState([])

//   // Barcode scanning
//   const [barcodeInput, setBarcodeInput] = useState("")
//   const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false)
//   const [barcodeError, setBarcodeError] = useState(null)
//   const barcodeInputRef = useRef(null)

//   // Packet breaking during sale
//   const [packetToBreak, setPacketToBreak] = useState(null)
//   const breakPacketMutation = useBreakPacket()
//   const [looseStockBarcodes, setLooseStockBarcodes] = useState([])
//   const [looseStockSourcePacket, setLooseStockSourcePacket] = useState(null)
//   const [showLooseStockBarcodeModal, setShowLooseStockBarcodeModal] = useState(false)

//   // Payment section
//   const [discount, setDiscount] = useState(null)
//   const [cash, setCash] = useState(null)
//   const [bank, setBank] = useState(null)
//   const [applyVat, setApplyVat] = useState(false)
//   const [addShippingCost, setAddShippingCost] = useState(false)
//   const [buyerShippingCharge, setBuyerShippingCharge] = useState(0)
//   const [shippingBoxes, setShippingBoxes] = useState(0)
//   const [logisticsCompanyId, setLogisticsCompanyId] = useState("")
//   const [logisticsCompanies, setLogisticsCompanies] = useState([])
//   const [isLoadingLogisticsCompanies, setIsLoadingLogisticsCompanies] = useState(false)

//   // Pre-populate form when initialData is provided (edit mode)
//   useEffect(() => {
//     if (!initialData) return

//     // Date
//     if (initialData.saleDate) setSaleDate(new Date(initialData.saleDate).toLocaleDateString('en-CA'))
//     // Type
//     if (initialData.saleType) setSaleType(initialData.saleType)
//     // Notes
//     if (initialData.notes) setNotes(initialData.notes)
//     // Payment
//     if (initialData.totalDiscount != null) setDiscount(initialData.totalDiscount)
//     if (initialData.cashPayment != null) setCash(initialData.cashPayment)
//     if (initialData.bankPayment != null) setBank(initialData.bankPayment)
//     setApplyVat(Number(initialData.vatRate || 0) > 0 || Number(initialData.totalVAT || 0) > 0)
//     const hasShipping = Boolean(initialData.addShippingCost) || Number(initialData.buyerShippingCharge || initialData.shippingCost || 0) > 0
//     setAddShippingCost(hasShipping)
//     setBuyerShippingCharge(Number(initialData.buyerShippingCharge ?? initialData.shippingCost ?? 0))
//     setShippingBoxes(Number(initialData.shippingBoxes || 0))
//     setLogisticsCompanyId(String(initialData.logisticsCompany?._id || initialData.logisticsCompany || ""))
//     // Buyer
//     if (initialData.buyer) {
//       const buyerIdVal = initialData.buyer?._id || initialData.buyer
//       setBuyerId(String(buyerIdVal))
//       setIsManualCustomer(false)
//     } else if (initialData.manualCustomer) {
//       setIsManualCustomer(true)
//       setManualCustomer(prev => ({ ...prev, ...initialData.manualCustomer }))
//     }
//     // Items → rows
//     if (Array.isArray(initialData.items) && initialData.items.length > 0) {
//       const mappedRows = initialData.items.map((item, idx) => {
//         const prod = item.product
//         const packetQuantity = getPacketQuantity(item)
//         const rowQuantity = item.isPacketSale ? packetQuantity ?? '' : item.quantity
//         return {
//           id: Date.now() + idx,
//           productId: prod?._id || prod || '',
//           productName: prod?.name || '',
//           productCode: prod?.productCode || prod?.sku || '',
//           season: prod?.season || [],
//           unitPrice: item.unitPrice,
//           quantity: rowQuantity,
//           photo: prod?.images?.[0] || null,
//           totalPrice: Number(item.totalPrice ?? getRowTotalPrice({
//             unitPrice: item.unitPrice,
//             quantity: rowQuantity,
//             isPacketSale: item.isPacketSale,
//             totalItemsPerPacket: item.totalItemsPerPacket,
//           })),
//           isPacketSale: item.isPacketSale || false,
//           packetStockId: item.packetStock?._id || item.packetStock || undefined,
//           packetBarcode: item.packetBarcode || undefined,
//           packetComposition: item.packetComposition || undefined,
//           totalItemsPerPacket: item.totalItemsPerPacket || undefined,
//           packetQuantity: packetQuantity || undefined,
//           originalItemQuantity: item.quantity,
//         }
//       })
//       setRows(mappedRows)
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [initialData])

//   // Refs for keyboard navigation
//   const cashInputRef = useRef(null)
//   const bankInputRef = useRef(null)
//   const saveButtonRef = useRef(null)

//   // Fetch all buyers
//   useEffect(() => {
//     async function fetchAllBuyers() {
//       try {
//         setIsLoadingBuyers(true)
//         setError(null)

//         const response = await buyersAPI.getAll({
//           isActive: true,
//           limit: 1000
//         })

//         let buyersList = []
//         if (response.data?.data && Array.isArray(response.data.data)) {
//           buyersList = response.data.data
//         } else if (response.data && Array.isArray(response.data)) {
//           buyersList = response.data
//         } else if (Array.isArray(response)) {
//           buyersList = response
//         }

//         const normalizedBuyers = buyersList.map(buyer => ({
//           id: buyer._id || buyer.id,
//           name: buyer.name,
//           company: buyer.company || '',
//           phone: buyer.phone || '',
//           email: buyer.email || '',
//           buyerId: buyer._id || buyer.id,
//           _original: buyer
//         }))

//         setBuyers(normalizedBuyers)
//       } catch (err) {
//         console.error('Error fetching buyers:', err)
//         setError('Failed to load buyers. Please refresh the page.')
//       } finally {
//         setIsLoadingBuyers(false)
//       }
//     }

//     fetchAllBuyers()
//   }, [])

//   // Fetch logistics companies for optional shipping tracking
//   useEffect(() => {
//     let cancelled = false

//     async function fetchLogisticsCompanies() {
//       try {
//         setIsLoadingLogisticsCompanies(true)
//         const response = await logisticsCompaniesAPI.getAll({ isActive: true, limit: 1000 })
//         let list = []
//         if (response.data?.data && Array.isArray(response.data.data)) {
//           list = response.data.data
//         } else if (response.data && Array.isArray(response.data)) {
//           list = response.data
//         } else if (Array.isArray(response)) {
//           list = response
//         }

//         if (!cancelled) {
//           setLogisticsCompanies(list)
//         }
//       } catch (err) {
//         console.error('Error fetching logistics companies:', err)
//         if (!cancelled) {
//           setLogisticsCompanies([])
//         }
//       } finally {
//         if (!cancelled) {
//           setIsLoadingLogisticsCompanies(false)
//         }
//       }
//     }

//     fetchLogisticsCompanies()

//     return () => {
//       cancelled = true
//     }
//   }, [])

//   // Fetch products (all products for selling)
//   useEffect(() => {
//     let cancelled = false

//     async function fetchProducts() {
//       try {
//         setIsLoadingProducts(true)
//         setProductsError(null)

//         const response = await productsAPI.getAll({
//           limit: 500
//         })

//         let rawList = response.data?.data || response.data || []

//         let normalized = rawList.map((product) => ({
//           id: product._id || product.id,
//           name: product.name || product.productName || product.productCode || product.sku || "Unnamed Product",
//           productCode: product.productCode || product.sku || product.code || "",
//           color: product.color || product.colour || "",
//           size: product.size || product.dimension || "",
//           images: Array.isArray(product.images)
//             ? product.images
//             : product.image
//               ? [product.image]
//               : [],
//           pricing: product.pricing || {},
//           defaultPrice: product.pricing?.sellingPrice || product.sellingPrice || product.unitPrice || 0,
//           _original: product,
//         }))

//         if (!cancelled) {
//           setProducts(normalized)
//         }
//       } catch (err) {
//         console.error('Error fetching products:', err)
//         if (!cancelled) {
//           setProducts([])
//           setProductsError('Failed to load products.')
//         }
//       } finally {
//         if (!cancelled) {
//           setIsLoadingProducts(false)
//         }
//       }
//     }

//     fetchProducts()

//     return () => {
//       cancelled = true
//     }
//   }, [])

//   // Add new buyer (Quick add with API integration)
//   async function handleAddBuyer() {
//     if (!newBuyerName.trim()) {
//       setError('Please enter buyer name')
//       return
//     }
//     if (!newBuyerPhone.trim()) {
//       setError('Please enter buyer phone')
//       return
//     }
//     // Optionally validate email format if provided
//     if (newBuyerEmail && !/^\S+@\S+\.\S+$/.test(newBuyerEmail)) {
//       setError('Please enter a valid email address')
//       return
//     }
//     try {
//       setIsCreatingBuyer(true)
//       setError(null)
//       const payload = {
//         name: newBuyerName.trim(),
//         phone: newBuyerPhone.trim(),
//         phoneAreaCode: newBuyerPhoneAreaCode.trim() || undefined,
//         company: newBuyerCompany.trim() || undefined,
//         email: newBuyerEmail.trim() || undefined,
//         address: newBuyerAddress.trim()
//           ? { street: newBuyerAddress.trim() }
//           : undefined,
//         createUserAccount: true
//       }
//       const response = await buyersAPI.create(payload)
//       const newBuyer = response.data?.data || response.data
//       if (newBuyer) {
//         const normalizedBuyer = {
//           id: newBuyer._id || newBuyer.id,
//           name: newBuyer.name,
//           company: newBuyer.company || '',
//           phone: newBuyer.phone || '',
//           email: newBuyer.email || '',
//           buyerId: newBuyer._id || newBuyer.id,
//           _original: newBuyer
//         }
//         setBuyers(prev => [...prev, normalizedBuyer])
//         setBuyerId(String(normalizedBuyer.id))
//         setIsManualCustomer(false)
//         setNewBuyerName("")
//         setNewBuyerCompany("")
//         setNewBuyerEmail("")
//         setNewBuyerPhone("")
//         setNewBuyerPhoneAreaCode("")
//         setNewBuyerAddress("")
//         setShowAddBuyer(false)
//       }
//     } catch (err) {
//       console.error('Error creating buyer:', err)
//       if (err.response?.status === 409) {
//         const message = err.response?.data?.message || 'A buyer with this name/company already exists.'
//         toast(message, { icon: '⚠️' })
//         setError(message)
//         return
//       }
//       const errorMessage = err.response?.data?.message ||
//         err.response?.data?.error ||
//         err.message ||
//         'Failed to create buyer. Please try again.'
//       setError(errorMessage)
//     } finally {
//       setIsCreatingBuyer(false)
//     }
//   }


//   // Add new row to cart
//   function addRow() {
//     const newRow = {
//       id: Date.now(),
//       productId: "",
//       productName: "",
//       productCode: "",
//       season: [],
//       unitPrice: 0,
//       quantity: 1,
//       photo: null,
//     }
//     setRows((r) => [...r, newRow])
//   }

//   function updateRow(id, field, value) {
//     setRows((r) =>
//       r.map((row) => {
//         if (row.id !== id) return row

//         const updated = { ...row, [field]: value }

//         // Auto-calculate total when quantity or unitPrice changes
//         updated.totalPrice = getRowTotalPrice(updated)

//         return updated
//       }),
//     )
//   }

//   function removeRow(id) {
//     setRows((r) => r.filter((x) => x.id !== id))
//   }

//   // Handle product selection from modal
//   function handleProductSelect(product) {
//     const newRow = {
//       id: Date.now(),
//       productId: product.id,
//       productName: product.name,
//       productCode: product.productCode,
//       season: Array.isArray(product.season)
//         ? product.season
//         : product.season
//           ? [product.season]
//           : product.productType
//             ? (Array.isArray(product.productType) ? product.productType : [product.productType])
//             : [],
//       unitPrice: Number(product.defaultPrice || 0).toFixed(2), // Fix to 2 decimals
//       quantity: 1,
//       photo: product.images?.[0] || product.image,
//       totalPrice: product.defaultPrice * 1 // initial total
//     }

//     setRows((r) => [...r, newRow])
//   }

//   // Handle barcode scan/input
//   async function handleBarcodeLookup(barcode) {
//     if (!barcode || !barcode.trim()) {
//       return
//     }

//     const trimmedBarcode = barcode.trim().toUpperCase()

//     // Validate barcode format
//     if (!trimmedBarcode.startsWith('PKT-') && !trimmedBarcode.startsWith('LSE-')) {
//       setBarcodeError('Invalid barcode format. Expected PKT-XXXXXXXX or LSE-XXXXXXXX')
//       setBarcodeInput('')
//       barcodeInputRef.current?.focus()
//       return
//     }

//     // Check if this barcode already exists in cart
//     const existingRowIndex = rows.findIndex(row => row.packetBarcode === trimmedBarcode)

//     if (existingRowIndex !== -1) {
//       // Barcode already in cart - increment quantity if within available limit
//       const existingRow = rows[existingRowIndex]
//       const newQty = (existingRow.quantity || 1) + 1

//       if (newQty > existingRow.availablePackets) {
//         setBarcodeError(`Cannot add more. Max available: ${existingRow.availablePackets} packets`)
//         setBarcodeInput('')
//         barcodeInputRef.current?.focus()
//         return
//       }

//       // Update quantity of existing row
//       updateRow(existingRow.id, 'quantity', newQty)
//       setBarcodeInput('') // Clear input
//       barcodeInputRef.current?.focus()
//       return
//     }

//     setIsLookingUpBarcode(true)
//     setBarcodeError(null)

//     try {
//       const response = await salesAPI.lookupBarcode(trimmedBarcode)
//       const packetData = response.data?.data

//       if (!packetData) {
//         setBarcodeError('Packet not found')
//         setBarcodeInput('')
//         barcodeInputRef.current?.focus()
//         return
//       }

//       if (packetData.availablePackets <= 0) {
//         setBarcodeError(`No stock available for ${packetData.product?.name || 'this packet'}`)
//         setBarcodeInput('')
//         barcodeInputRef.current?.focus()
//         return
//       }

//       // Calculate price per item from suggested packet price
//       const totalItems = packetData.totalItemsPerPacket || 1
//       const suggestedPricePerItem = Number(packetData.suggestedSellingPrice || 0) / totalItems

//       // Create cart row from packet data
//       const newRow = {
//         id: Date.now(),
//         productId: packetData.product?._id,
//         productName: packetData.product?.name || 'Unknown Product',
//         productCode: packetData.product?.productCode || packetData.product?.sku || '',
//         season: packetData.product?.season || [],
//         unitPrice: Number(suggestedPricePerItem).toFixed(2), // Price per item
//         quantity: 1, // Number of packets
//         photo: packetData.product?.images?.[0] || null,
//         totalPrice: Number(suggestedPricePerItem * totalItems), // 1 packet × items × price per item
//         // Packet-specific fields
//         isPacketSale: true,
//         packetStockId: packetData.packetStockId,
//         packetBarcode: packetData.barcode,
//         packetComposition: packetData.composition,
//         totalItemsPerPacket: packetData.totalItemsPerPacket,
//         availablePackets: packetData.availablePackets,
//         isLoose: packetData.isLoose,
//         compositionText: packetData.compositionText,
//         supplierName: packetData.supplier?.name || ''
//       }

//       setRows((r) => [...r, newRow])
//       setBarcodeInput('') // Clear input after successful scan
//       barcodeInputRef.current?.focus()

//     } catch (err) {
//       console.error('Barcode lookup error:', err)
//       const errorMessage = err.response?.data?.message || err.message || 'Failed to lookup barcode'
//       setBarcodeError(errorMessage)
//       setBarcodeInput('')
//       barcodeInputRef.current?.focus()
//     } finally {
//       setIsLookingUpBarcode(false)
//     }
//   }

//   // Handle barcode input key press
//   function handleBarcodeKeyDown(e) {
//     if (e.key === 'Enter') {
//       e.preventDefault()
//       handleBarcodeLookup(barcodeInput)
//     }
//   }

//   const selectedLogisticsCompany = useMemo(() => {
//     return logisticsCompanies.find(
//       (company) => String(company._id || company.id) === String(logisticsCompanyId)
//     )
//   }, [logisticsCompanies, logisticsCompanyId])

//   const logisticsBoxRate = Number(selectedLogisticsCompany?.rates?.boxRate || 0)
//   const computedLogisticsPayable = addShippingCost
//     ? Math.max(0, Number(shippingBoxes || 0) * logisticsBoxRate)
//     : 0
//   const effectiveBuyerShippingCharge = addShippingCost
//     ? Math.max(0, Number(buyerShippingCharge || 0))
//     : 0

//   // Derived totals
//   const totals = useMemo(() => {
//     // subtotal is just the sum of items
//     const subtotal = rows.reduce((sum, row) => sum + Number(row.totalPrice || 0), 0)
//     const discountValue = Number(discount || 0)
//     const discountedSubtotal = Math.max(0, subtotal - discountValue)
//     const totalVAT = applyVat
//       ? roundCurrency(discountedSubtotal * (VAT_RATE / 100))
//       : 0
//     // grandTotal includes shipping (logistics payable) and subtracts discount, VAT only on goods
//     const grandTotal = roundCurrency(Math.max(0, discountedSubtotal + totalVAT + computedLogisticsPayable))
//     const paid = Number(cash || 0) + Number(bank || 0)
//     const remaining = roundCurrency(grandTotal - paid)
//     return { subtotal, totalVAT, grandTotal, paid, remaining }
//   }, [rows, computedLogisticsPayable, discount, cash, bank, applyVat])

//   // Keyboard shortcuts
//   function handlePaymentKeyDown(e, field) {
//     if (e.key === "Enter") {
//       e.preventDefault()
//       if (field === "discount") {
//         cashInputRef.current?.focus()
//       } else if (field === "cash") {
//         bankInputRef.current?.focus()
//       } else if (field === "bank") {
//         saveButtonRef.current?.focus()
//       }
//     }
//     if (e.ctrlKey && e.key === "s") {
//       e.preventDefault()
//       handleSave()
//     }
//   }

//   // Save sale to backend
//   async function handleSave() {
//     // Validation
//     if (!isManualCustomer && !buyerId) {
//       setError('Please select a buyer or enter manual customer details')
//       return
//     }

//     if (isManualCustomer && !manualCustomer.name.trim()) {
//       setError('Please enter manual customer name')
//       return
//     }

//     if (rows.length === 0) {
//       setError('Please add at least one product')
//       return
//     }

//     const invalidRows = rows.filter(row =>
//       !row.productName ||
//       !row.productCode ||
//       !row.unitPrice ||
//       row.unitPrice <= 0 ||
//       !row.quantity ||
//       row.quantity <= 0
//     )

//     if (invalidRows.length > 0) {
//       setError('Please fill in product name, code, unit price, and quantity for all rows')
//       return
//     }

//     if (addShippingCost) {
//       if (!logisticsCompanyId) {
//         setError('Please select a logistics company when shipping is enabled')
//         return
//       }

//       if (!shippingBoxes || Number(shippingBoxes) < 1) {
//         setError('Number of boxes must be at least 1 when shipping is enabled')
//         return
//       }

//       if (Number(buyerShippingCharge || 0) < 0) {
//         setError('Shipping charge cannot be negative')
//         return
//       }
//     }

//     try {
//       setIsSaving(true)
//       setError(null)

//       const totalPaid = Number(cash || 0) + Number(bank || 0)
//       const paymentStatus = totals.remaining <= 0
//         ? 'paid'
//         : totalPaid > 0
//           ? 'partial'
//           : 'pending'

//       // For rows without productId, try to find product by name or code
//       const itemsWithProducts = await Promise.all(rows.map(async (row) => {
//         let productId = row.productId

//         if (!productId && (row.productName || row.productCode)) {
//           try {
//             if (row.productCode) {
//               try {
//                 const codeResponse = await productsAPI.lookupByCode(row.productCode)
//                 const product = codeResponse.data?.data || codeResponse.data
//                 if (product) {
//                   productId = product._id || product.id
//                 }
//               } catch (codeErr) {
//                 if (row.productName) {
//                   const nameResponse = await productsAPI.search(row.productName)
//                   const productsList = nameResponse.data?.data || nameResponse.data || []
//                   const product = productsList.find(p =>
//                     normalizeNameForCompare(p.name) === normalizeNameForCompare(row.productName)
//                   ) || productsList[0]
//                   if (product) {
//                     productId = product._id || product.id
//                   }
//                 }
//               }
//             } else if (row.productName) {
//               const nameResponse = await productsAPI.search(row.productName)
//               const productsList = nameResponse.data?.data || nameResponse.data || []
//               const product = productsList.find(p =>
//                 normalizeNameForCompare(p.name) === normalizeNameForCompare(row.productName)
//               ) || productsList[0]
//               if (product) {
//                 productId = product._id || product.id
//               }
//             }
//           } catch (searchErr) {
//             console.error('Error searching for product:', searchErr)
//           }
//         }

//         if (!productId) {
//           try {
//             const productData = {
//               name: row.productName.trim(),
//               sku: (row.productCode || `AUTO-${Date.now()}`).toUpperCase(),
//               season: normalizeSeasonArray(row.season || []),
//               category: 'General',
//               specifications: {
//                 color: row.primaryColor || undefined
//               },
//               pricing: {
//                 costPrice: Number(row.unitPrice || 0) * 0.8, // Estimate cost at 80% of selling price
//                 sellingPrice: Number(row.unitPrice || 0),
//               },
//               unit: 'piece'
//             }

//             const createResponse = await productsAPI.create(productData)
//             const createdProduct = createResponse.data?.data || createResponse.data
//             if (createdProduct) {
//               productId = createdProduct._id || createdProduct.id
//               console.log(`Created new product: ${row.productName} with ID: ${productId}`)
//             } else {
//               throw new Error(`Failed to create product "${row.productName}"`)
//             }
//           } catch (createErr) {
//             console.error('Error creating product:', createErr)
//             const errorMessage = createErr.response?.data?.message ||
//               createErr.response?.data?.error ||
//               createErr.message ||
//               `Failed to create product "${row.productName}"`
//             throw new Error(errorMessage)
//           }
//         }

//         const unitPrice = Number(row.unitPrice || 0)
//         const quantity = Number(row.quantity)

//         // Build base item
//         const item = {
//           product: productId,
//           quantity: quantity,
//           unitPrice: unitPrice,
//           discount: 0,
//           taxRate: 0
//         }

//         // Add packet-specific fields if this is a packet sale
//         if (row.isPacketSale) {
//           item.isPacketSale = true
//           item.packetStock = row.packetStockId
//           item.packetBarcode = row.packetBarcode
//           item.totalItemsPerPacket = row.totalItemsPerPacket
//           item.packetComposition = row.packetComposition
//           // For packets: quantity is packet count, actual items = packets × itemsPerPacket
//           item.quantity = quantity * (row.totalItemsPerPacket || 1)
//           item.packetQuantity = quantity // Store original packet count
//         }

//         return item
//       }))

//       // Calculate subtotal and grandTotal
//       const subtotal = itemsWithProducts.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
//       const discountValue = Number(discount || 0)
//       const discountedSubtotal = Math.max(0, subtotal - discountValue)
//       const totalVAT = applyVat
//         ? roundCurrency(discountedSubtotal * (VAT_RATE / 100))
//         : 0
//       const grandTotal = Math.max(0, discountedSubtotal + totalVAT + (addShippingCost ? computedLogisticsPayable : 0))

//       const payload = {
//         saleDate: saleDate,
//         items: itemsWithProducts,
//         totalDiscount: Number(discount || 0),
//         vatRate: applyVat ? VAT_RATE : 0,
//         totalVAT: totalVAT,
//         addShippingCost: addShippingCost,
//         buyerShippingCharge: addShippingCost ? computedLogisticsPayable : 0,
//         shippingCost: addShippingCost ? computedLogisticsPayable : 0,
//         shippingBoxes: addShippingCost ? Number(shippingBoxes || 0) : 0,
//         logisticsCompanyId: addShippingCost ? logisticsCompanyId : null,
//         logisticsBoxRateSnapshot: addShippingCost ? logisticsBoxRate : 0,
//         logisticsPayable: addShippingCost ? computedLogisticsPayable : 0,
//         cashPayment: Number(cash || 0),
//         bankPayment: Number(bank || 0),
//         paymentMethod: cash > 0 ? 'cash' : bank > 0 ? 'online' : 'credit',
//         saleType: saleType,
//         notes: notes.trim() || `Manual entry - ${isManualCustomer ? manualCustomer.name : buyers.find(b => String(b.id) === String(buyerId))?.name || 'Customer'}`,
//       }

//       // Add buyer or manualCustomer
//       if (isManualCustomer) {
//         payload.manualCustomer = manualCustomer
//       } else {
//         payload.buyer = buyerId
//       }

//       let response
//       if (isEditMode) {
//         if (!isSuperAdmin) {
//           // Non-super-admin: show edit request panel instead of saving directly
//           setPendingPayload(payload)
//           setShowEditRequestPanel(true)
//           setIsSaving(false)
//           return
//         }
//         response = await salesAPI.update(saleId, payload)
//       } else {
//         response = await salesAPI.create(payload)
//       }

//       if (response.status === 202) {
//         toast.success('Backdated sale request submitted for approval of super admin.')
//         router.push('/my-requests')
//         return
//       }

//       if (onSave) {
//         onSave(response.data?.data || response.data)
//       }

//     } catch (err) {
//       console.error('Error saving sale:', err)

//       const errorMessage = err.response?.data?.message ||
//         err.response?.data?.error ||
//         err.message ||
//         'Failed to save sale. Please try again.'

//       setError(errorMessage)
//     } finally {
//       setIsSaving(false)
//     }
//   }

//   async function handleSubmitEditRequest() {
//     if (!editRequestReason.trim() || !pendingPayload) return
//     setIsSubmittingRequest(true)
//     try {
//       const saleRef = initialData?.saleNumber || `#${String(saleId).slice(-6)}`
//       const requestedChanges = {}
//       if (initialData) {
//         if (pendingPayload.saleDate !== new Date(initialData.saleDate).toLocaleDateString('en-CA'))
//           requestedChanges.saleDate = { from: initialData.saleDate, to: pendingPayload.saleDate }
//         if (pendingPayload.saleType !== initialData.saleType)
//           requestedChanges.saleType = { from: initialData.saleType, to: pendingPayload.saleType }
//         if (String(pendingPayload.buyer || '') !== String(initialData.buyer?._id || initialData.buyer || ''))
//           requestedChanges.buyer = { from: initialData.buyer?.name || initialData.buyer, to: pendingPayload.buyer }
//         if (pendingPayload.totalDiscount !== (initialData.totalDiscount || 0))
//           requestedChanges.totalDiscount = { from: initialData.totalDiscount || 0, to: pendingPayload.totalDiscount }
//         if (Number(pendingPayload.vatRate || 0) !== Number(initialData.vatRate || 0))
//           requestedChanges.vatRate = { from: Number(initialData.vatRate || 0), to: Number(pendingPayload.vatRate || 0) }
//         if (Number(pendingPayload.totalVAT || 0) !== Number(initialData.totalVAT || 0))
//           requestedChanges.totalVAT = { from: Number(initialData.totalVAT || 0), to: Number(pendingPayload.totalVAT || 0) }
//         if (Boolean(pendingPayload.addShippingCost) !== Boolean(initialData.addShippingCost))
//           requestedChanges.addShippingCost = { from: Boolean(initialData.addShippingCost), to: Boolean(pendingPayload.addShippingCost) }
//         if (Number(pendingPayload.buyerShippingCharge || 0) !== Number(initialData.buyerShippingCharge ?? initialData.shippingCost ?? 0))
//           requestedChanges.buyerShippingCharge = {
//             from: Number(initialData.buyerShippingCharge ?? initialData.shippingCost ?? 0),
//             to: Number(pendingPayload.buyerShippingCharge || 0)
//           }
//         if (Number(pendingPayload.shippingBoxes || 0) !== Number(initialData.shippingBoxes || 0))
//           requestedChanges.shippingBoxes = { from: Number(initialData.shippingBoxes || 0), to: Number(pendingPayload.shippingBoxes || 0) }
//         if (String(pendingPayload.logisticsCompanyId || '') !== String(initialData.logisticsCompany?._id || initialData.logisticsCompany || ''))
//           requestedChanges.logisticsCompany = {
//             from: initialData.logisticsCompany?.name || initialData.logisticsCompany || '',
//             to: pendingPayload.logisticsCompanyId || ''
//           }
//         if (pendingPayload.cashPayment !== (initialData.cashPayment || 0))
//           requestedChanges.cashPayment = { from: initialData.cashPayment || 0, to: pendingPayload.cashPayment }
//         if (pendingPayload.bankPayment !== (initialData.bankPayment || 0))
//           requestedChanges.bankPayment = { from: initialData.bankPayment || 0, to: pendingPayload.bankPayment }
//         if (pendingPayload.notes !== (initialData.notes || ''))
//           requestedChanges.notes = { from: initialData.notes || '', to: pendingPayload.notes }
//         // Compare items (quantity and price changes)
//         const origItems = (initialData.items || []).map(item => ({
//           productId: String(item.product?._id || item.product || ''),
//           productName: item.product?.name || '',
//           productCode: item.product?.productCode || item.product?.sku || '',
//           unitPrice: item.unitPrice,
//           quantity: item.isPacketSale ? getPacketQuantity(item) ?? item.quantity : item.quantity,
//         }))
//         const newItems = rows.map((row) => ({
//           productId: String(row.productId || ''),
//           productName: row.productName || '',
//           productCode: row.productCode || '',
//           unitPrice: Number(row.unitPrice || 0),
//           quantity: Number(row.quantity || 0),
//         }))
//         if (JSON.stringify(origItems) !== JSON.stringify(newItems))
//           requestedChanges.items = { from: origItems, to: newItems }
//       }
//       await submitEditRequestMutation.mutateAsync({
//         entityType: 'sale',
//         entityId: saleId,
//         entityRef: saleRef,
//         requestType: 'edit',
//         requestedChanges,
//         rawPayload: pendingPayload,
//         reason: editRequestReason.trim(),
//       })
//       setShowEditRequestPanel(false)
//       setEditRequestReason("")
//       setPendingPayload(null)
//       // submitEditRequestMutation already toasts on success
//       router.push('/my-requests')
//     } catch {
//       // error toast handled by mutation hook
//     } finally {
//       setIsSubmittingRequest(false)
//     }
//   }

//   return (
//     <div className="space-y-6">
//       {/* Error Display */}
//       {error && (
//         <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
//           <div className="flex items-start gap-2">
//             <span className="text-sm font-medium">Error:</span>
//             <span className="text-sm">{error}</span>
//             <button
//               onClick={() => setError(null)}
//               className="ml-auto text-xs underline hover:no-underline"
//             >
//               Dismiss
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Loading State for Buyers */}
//       {isLoadingBuyers && (
//         <div className="rounded-lg border border-border bg-muted p-4">
//           <div className="flex items-center gap-2">
//             <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
//             <span className="text-sm text-muted-foreground">Loading buyers...</span>
//           </div>
//         </div>
//       )}

//       {/* Section 1: Selling Details - Enhanced Design */}
//       <section className="rounded-lg border border-border bg-card shadow-sm overflow-visible">
//         {/* Header */}
//         <div className="flex items-center gap-3 px-6 py-4 bg-muted/30 border-b border-border rounded-t-lg">
//           <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
//             <Tag className="h-5 w-5 text-primary" />
//           </div>
//           <div>
//             <h2 className="text-lg font-semibold text-foreground">Selling Details</h2>
//             <p className="text-xs text-muted-foreground mt-0.5">Enter sale information and customer details</p>
//           </div>
//         </div>

//         {/* Content */}
//         <div className="p-6 overflow-visible">
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {/* Sale Date */}
//             <div className="space-y-2">
//               <Label htmlFor="sale-date" className="text-sm font-semibold text-foreground flex items-center gap-2">
//                 <Calendar className="h-4 w-4 text-muted-foreground" />
//                 Sale Date
//               </Label>
//               <div className="relative">
//                 <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
//                   <Calendar className="h-5 w-5 text-muted-foreground" />
//                 </div>
//                 <BritishDatePicker
//                   value={saleDate ? new Date(saleDate) : new Date()}
//                   onChange={(date) => {
//                     if (date) {
//                       setSaleDate(date.toLocaleDateString('en-CA'));
//                     }
//                   }}
//                   restrictByRole={true}
//                   className="h-11 w-full pl-10 pr-3 text-base font-medium rounded-lg border border-input bg-background"
//                   placeholder="DD/MM/YYYY"
//                 />
//               </div>
//             </div>

//             {/* Sale Type */}
//             <div className="space-y-2">
//               <Label htmlFor="sale-type" className="text-sm font-semibold text-foreground flex items-center gap-2">
//                 <Tag className="h-4 w-4 text-muted-foreground" />
//                 Sale Type
//               </Label>
//               <Select value={saleType} onValueChange={setSaleType}>
//                 <SelectTrigger
//                   id="sale-type"
//                   className="h-11 w-full rounded-lg border border-input bg-background text-base font-medium text-foreground hover:border-ring/50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-all duration-200"
//                 >
//                   <SelectValue placeholder="Select sale type" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="retail">Retail</SelectItem>
//                   <SelectItem value="wholesale">Wholesale</SelectItem>
//                   <SelectItem value="bulk">Bulk</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>

//             {/* Customer / Buyer */}
//             <div className="space-y-2">
//               <Label htmlFor="buyer" className="text-sm font-semibold text-foreground flex items-center gap-2">
//                 Buyer
//               </Label>
//               <div className="flex gap-2">
//                 <div className="flex-1 relative">
//                   {/* Selected customer display */}
//                   {buyerId && !isManualCustomer ? (
//                     <div className="flex items-center justify-between h-11 px-3 border border-input rounded-lg bg-muted/30">
//                       <span className="font-medium text-base truncate">
//                         {buyers.find(b => String(b.id) === String(buyerId))?.company || 'Selected Buyer'}
//                       </span>
//                       <Button
//                         type="button"
//                         variant="ghost"
//                         size="sm"
//                         onClick={() => {
//                           setBuyerId('')
//                           setCustomerSearch('')
//                         }}
//                         className="h-8 w-8 p-0 ml-2"
//                       >
//                         <X className="h-5 w-5" />
//                       </Button>
//                     </div>
//                   ) : (
//                     /* Search input */
//                     <div className="relative">
//                       <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//                       <Input
//                         type="text"
//                         placeholder={isLoadingBuyers ? "Loading customers..." : "Search customer by name, company, phone..."}
//                         value={customerSearch}
//                         onChange={e => {
//                           setCustomerSearch(e.target.value)
//                           setCustomerDropdownOpen(true)
//                         }}
//                         onFocus={() => setCustomerDropdownOpen(true)}
//                         disabled={isLoadingBuyers}
//                         className="pl-9 pr-9 h-10"
//                         autoComplete="off"
//                       />
//                       <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//                     </div>
//                   )}

//                   {/* Customer dropdown */}
//                   {customerDropdownOpen && !buyerId && (
//                     <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border rounded-md shadow-lg">
//                       <div className="max-h-[250px] overflow-auto">
//                         {(() => {
//                           const filteredBuyers = buyers.filter(b => {
//                             if (!customerSearch.trim()) return true
//                             const search = customerSearch.toLowerCase()
//                             return (
//                               b.name?.toLowerCase().includes(search) ||
//                               b.company?.toLowerCase().includes(search) ||
//                               b.phone?.toLowerCase().includes(search) ||
//                               b.email?.toLowerCase().includes(search)
//                             )
//                           })

//                           if (filteredBuyers.length === 0) {
//                             return (
//                               <div className="p-3 text-sm text-muted-foreground text-center">
//                                 {buyers.length === 0 ? 'No customers available' : 'No customers match your search'}
//                               </div>
//                             )
//                           }

//                           return (
//                             <div className="py-1">
//                               {filteredBuyers.slice(0, 50).map((b) => (
//                                 <button
//                                   key={b.id}
//                                   type="button"
//                                   onClick={() => {
//                                     setBuyerId(String(b.id))
//                                     setIsManualCustomer(false)
//                                     setCustomerSearch('')
//                                     setCustomerDropdownOpen(false)
//                                   }}
//                                   className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex flex-col"
//                                 >
//                                   <span className="font-medium text-sm">
//                                     {b.company || 'Unknown'}
//                                     {/* {b.company && <span className="text-muted-foreground font-normal ml-1">({b.company})</span>} */}
//                                   </span>
//                                   {(b.phone || b.email) && (
//                                     <span className="text-xs text-muted-foreground">
//                                       {b.name}
//                                     </span>
//                                   )}
//                                 </button>
//                               ))}
//                               {filteredBuyers.length > 50 && (
//                                 <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t">
//                                   Showing first 50 results. Type to narrow down.
//                                 </div>
//                               )}
//                             </div>
//                           )
//                         })()}
//                       </div>
//                     </div>
//                   )}

//                   {/* Click outside to close */}
//                   {customerDropdownOpen && (
//                     <div
//                       className="fixed inset-0 z-40"
//                       onClick={() => setCustomerDropdownOpen(false)}
//                     />
//                   )}
//                 </div>
//                 <Button
//                   type="button"
//                   variant="outline"
//                   size="icon"
//                   onClick={() => setShowAddBuyer(true)}
//                   title="Add new customer"
//                   disabled={isLoadingBuyers}
//                   className="h-11 w-11 rounded-lg border border-input bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 flex-shrink-0"
//                 >
//                   <UserPlusIcon className="h-4 w-4" />
//                 </Button>
//               </div >
//               {isManualCustomer && (
//                 <div className="mt-4 p-4 border border-border rounded-lg bg-muted/30 space-y-4">
//                   <div className="flex items-center gap-2 pb-2 border-b border-border">
//                     <Users className="h-4 w-4 text-muted-foreground" />
//                     <span className="text-sm font-semibold text-foreground">Manual Buyer Details</span>
//                   </div>
//                   <div className="space-y-2">
//                     <Label htmlFor="manual-name" className="text-sm font-semibold text-foreground">
//                       Buyer Name <span className="text-destructive">*</span>
//                     </Label>
//                     <Input
//                       id="manual-name"
//                       value={manualCustomer.name}
//                       onChange={(e) => setManualCustomer({ ...manualCustomer, name: e.target.value })}
//                       placeholder="Enter customer name"
//                       className="h-11 text-base font-medium"
//                     />
//                   </div>
//                   <div className="space-y-2">
//                     <Label htmlFor="manual-company" className="text-sm font-semibold text-foreground">
//                       Company Name
//                     </Label>
//                     <Input
//                       id="manual-company"
//                       value={manualCustomer.company}
//                       onChange={(e) => setManualCustomer({ ...manualCustomer, company: e.target.value })}
//                       placeholder="Enter company name (optional)"
//                       className="h-11 text-base font-medium"
//                     />
//                   </div>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <div className="space-y-2">
//                       <Label htmlFor="manual-phone" className="text-sm font-semibold text-foreground">Phone</Label>
//                       <div className="flex gap-2">
//                         <Input
//                           id="manual-phone-area-code"
//                           value={manualCustomer.phoneAreaCode || ""}
//                           onChange={(e) => {
//                             const value = e.target.value
//                             setManualCustomer({ ...manualCustomer, phoneAreaCode: value })
//                             if (value.length >= 5 && manualCustomerPhoneInputRef.current) {
//                               manualCustomerPhoneInputRef.current.focus()
//                             }
//                           }}
//                           maxLength={5}
//                           className="w-24 h-11 text-base font-medium"
//                           placeholder="Area"
//                         />
//                         <Input
//                           ref={manualCustomerPhoneInputRef}
//                           id="manual-phone"
//                           value={manualCustomer.phone}
//                           onChange={(e) => setManualCustomer({ ...manualCustomer, phone: e.target.value })}
//                           className="flex-1 h-11 text-base font-medium"
//                           placeholder="Phone number"
//                         />
//                       </div>
//                     </div>
//                     <div className="space-y-2">
//                       <Label htmlFor="manual-email" className="text-sm font-semibold text-foreground">Email</Label>
//                       <Input
//                         id="manual-email"
//                         type="email"
//                         value={manualCustomer.email}
//                         onChange={(e) => setManualCustomer({ ...manualCustomer, email: e.target.value })}
//                         className="h-11 text-base font-medium"
//                         placeholder="customer@example.com"
//                       />
//                     </div>
//                   </div>
//                 </div>
//               )
//               }
//             </div >
//           </div >
//         </div >
//       </section >

//       {/* Section 2: Products Cart */}
//       < section className="rounded-lg border border-border bg-card p-6 shadow-sm" >
//         <div className="flex items-center justify-between mb-4">
//           <h2 className="text-base font-semibold">Products</h2>
//           <Button
//             type="button"
//             variant="outline"
//             onClick={() => setShowProductModal(true)}
//             size="sm"
//             className="gap-2"
//           >
//             <SearchIcon className="h-4 w-4" />
//             Browse Inventory
//           </Button>
//         </div>

//         {/* Barcode Scanner Input */}
//         <div className="mb-4 p-4 bg-muted/30 rounded-lg border border-dashed">
//           <div className="flex items-center gap-3">
//             <div className="flex-1">
//               <Label htmlFor="barcode-input" className="text-sm font-medium mb-1 block">
//                 Scan Packet Barcode
//               </Label>
//               <div className="flex gap-2">
//                 <Input
//                   ref={barcodeInputRef}
//                   id="barcode-input"
//                   type="text"
//                   placeholder="Scan or enter barcode (PKT-XXXXXXXX or LSE-XXXXXXXX)"
//                   value={barcodeInput}
//                   onChange={(e) => {
//                     setBarcodeInput(e.target.value.toUpperCase())
//                     setBarcodeError(null)
//                   }}
//                   onKeyDown={handleBarcodeKeyDown}
//                   disabled={isLookingUpBarcode}
//                   className="flex-1 font-mono"
//                 />
//                 <Button
//                   type="button"
//                   onClick={() => handleBarcodeLookup(barcodeInput)}
//                   disabled={isLookingUpBarcode || !barcodeInput.trim()}
//                   size="default"
//                 >
//                   {isLookingUpBarcode ? 'Looking up...' : 'Add'}
//                 </Button>
//               </div>
//               {barcodeError && (
//                 <p className="text-sm text-destructive mt-1">{barcodeError}</p>
//               )}
//             </div>
//           </div>
//         </div>

//         <div className="overflow-x-auto rounded-md border">
//           <table className="w-full text-sm">
//             <thead className="bg-muted/50">
//               <tr className="border-b">
//                 <th className="text-left p-3 font-medium min-w-[150px]">Name</th>
//                 <th className="text-left p-3 font-medium min-w-[120px]">Code</th>
//                 <th className="text-left p-3 font-medium min-w-[80px]">Image</th>
//                 <th className="text-right p-3 font-medium min-w-[100px]">Unit Price</th>
//                 <th className="text-right p-3 font-medium min-w-[100px]">Quantity</th>
//                 <th className="text-right p-3 font-medium min-w-[100px]">Total</th>
//                 <th className="text-center p-3 font-medium w-20">Action</th>
//               </tr>
//             </thead>
//             <tbody>
//               {rows.length === 0 && (
//                 <tr>
//                   <td colSpan={7} className="text-center py-12 text-muted-foreground">
//                     <div className="flex flex-col items-center gap-2">
//                       <p className="text-sm">No products added yet</p>
//                       <p className="text-xs">Scan a barcode or click "Add Product" to get started</p>
//                     </div>
//                   </td>
//                 </tr>
//               )}
//               {rows.map((row) => (
//                 <tr key={row.id} className={`border-b hover:bg-muted/30 transition-colors ${row.isPacketSale ? 'bg-blue-50/30' : ''}`}>
//                   {/* Name */}
//                   <td className="p-2">
//                     {row.isPacketSale ? (
//                       <div className="flex flex-col gap-1">
//                         <span className="font-medium text-sm">{row.productName}</span>
//                         <div className="flex flex-wrap items-center gap-1">
//                           <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
//                             {row.isLoose ? 'LOOSE' : 'PACKET'}
//                           </span>
//                           <span className="text-[10px] text-muted-foreground font-mono">
//                             {row.packetBarcode}
//                           </span>
//                         </div>
//                         {row.compositionText && (
//                           <span className="text-[10px] text-muted-foreground">
//                             {row.compositionText} ({row.totalItemsPerPacket} items)
//                           </span>
//                         )}
//                         <span className="text-[10px] text-emerald-600">
//                           {row.availablePackets} available
//                         </span>
//                       </div>
//                     ) : (
//                       <Input
//                         value={row.productName}
//                         onChange={(e) => {
//                           const name = e.target.value
//                           updateRow(row.id, "productName", name)

//                           if (nameLookupTimeoutRefs.current[row.id]) {
//                             clearTimeout(nameLookupTimeoutRefs.current[row.id])
//                           }

//                           if (name.trim().length >= 2) {
//                             nameLookupTimeoutRefs.current[row.id] = setTimeout(async () => {
//                               try {
//                                 const response = await productsAPI.search(name.trim())
//                                 const productsList = response.data?.data || response.data || []

//                                 let product = productsList.find(p =>
//                                   normalizeNameForCompare(p.name) === normalizeNameForCompare(name)
//                                 ) || productsList[0]

//                                 if (product) {
//                                   const unitPrice = Number(
//                                     product.pricing?.sellingPrice || product.sellingPrice || product.unitPrice || 0
//                                   )

//                                   setRows(prev => prev.map(r =>
//                                     r.id === row.id ? {
//                                       ...r,
//                                       productId: product._id || product.id,
//                                       productName: product.name || name,
//                                       productCode: product.productCode || product.sku || r.productCode,
//                                       season: Array.isArray(product.season)
//                                         ? product.season
//                                         : product.season
//                                           ? [product.season]
//                                           : product.productType
//                                             ? (Array.isArray(product.productType) ? product.productType : [product.productType])
//                                             : (r.season || []),
//                                       unitPrice: Number(unitPrice || 0).toFixed(2),
//                                       photo: product.images?.[0] || product.image || r.photo
//                                     } : r
//                                   ))
//                                 }
//                               } catch (err) {
//                                 console.error('Product name lookup error:', err)
//                               }
//                             }, 500)
//                           }
//                         }}
//                         placeholder="Enter product name"
//                         className="h-8 text-sm"
//                       />
//                     )}
//                   </td>

//                   {/* Code */}
//                   <td className="p-2">
//                     {row.isPacketSale ? (
//                       <span className="text-sm text-muted-foreground">{row.productCode}</span>
//                     ) : (
//                       <Input
//                         value={row.productCode}
//                         onChange={(e) => {
//                           const code = e.target.value
//                           updateRow(row.id, "productCode", code)

//                           if (lookupTimeoutRefs.current[row.id]) {
//                             clearTimeout(lookupTimeoutRefs.current[row.id])
//                           }

//                           if (code.trim().length >= 2) {
//                             lookupTimeoutRefs.current[row.id] = setTimeout(async () => {
//                               try {
//                                 const response = await productsAPI.lookupByCode(code.trim())
//                                 const product = response.data?.data || response.data

//                                 if (product) {
//                                   const unitPrice = Number(
//                                     product.pricing?.sellingPrice || product.sellingPrice || product.unitPrice || 0
//                                   )

//                                   setRows(prev => prev.map(r =>
//                                     r.id === row.id ? {
//                                       ...r,
//                                       productId: product._id || product.id,
//                                       productName: product.name || r.productName,
//                                       productCode: product.productCode || product.sku || code,
//                                       season: Array.isArray(product.season)
//                                         ? product.season
//                                         : product.season
//                                           ? [product.season]
//                                           : product.productType
//                                             ? (Array.isArray(product.productType) ? product.productType : [product.productType])
//                                             : (r.season || []),
//                                       unitPrice: Number(unitPrice || 0).toFixed(2),
//                                       photo: product.images?.[0] || product.image || r.photo
//                                     } : r
//                                   ))
//                                 }
//                               } catch (err) {
//                                 console.error('Product lookup error:', err)
//                               }
//                             }, 500)
//                           }
//                         }}
//                         className="h-8 text-sm"
//                       />
//                     )}
//                   </td>

//                   {/* Image */}
//                   <td className="p-2">
//                     <ProductImageGallery
//                       images={getImageArray(row)}
//                       alt={row.productName || row.productCode || "Product"}
//                       size="sm"
//                       maxVisible={2}
//                       showCount={true}
//                     />
//                   </td>

//                   {/* Unit Price */}
//                   <td className="p-2">
//                     {row.isPacketSale ? (
//                       <div className="flex flex-col items-end gap-1">
//                         <Input
//                           type="text"
//                           inputMode="decimal"
//                           step="0.01"
//                           min="0"
//                           // value={row.unitPrice}
//                           onChange={(e) => {
//                             const value = e.target.value;
//                             const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
//                             updateRow(row.id, "unitPrice", sanitized);
//                           }}
//                           onBlur={(e) => {
//                             const val = parseFloat(e.target.value)
//                             if (!isNaN(val)) {
//                               updateRow(row.id, "unitPrice", Number(val.toFixed(2)))
//                             }
//                           }}
//                           className="h-8 text-sm text-right tabular-nums w-24"
//                         />
//                         <span className="text-xs text-muted-foreground">per item</span>
//                       </div>
//                     ) : (
//                       <Input
//                         type="text"
//                         inputMode="decimal"
//                         step="0.01"
//                         min="0"
//                         // value={row.unitPrice}
//                         onChange={(e) => {
//                           const value = e.target.value;
//                           // Allow only numbers and one decimal point
//                           const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
//                           updateRow(row.id, "unitPrice", sanitized);
//                         }}
//                         onBlur={(e) => {
//                           const val = parseFloat(e.target.value)
//                           if (!isNaN(val)) {
//                             updateRow(row.id, "unitPrice", Number(val.toFixed(2)))
//                           }
//                         }}
//                         className="h-8 text-sm text-right tabular-nums"
//                       />
//                     )}
//                   </td>

//                   {/* Quantity */}
//                   <td className="p-2">
//                     {row.isPacketSale ? (
//                       <div className="flex flex-col items-end gap-1">
//                         <Input
//                           type="text"
//                           inputMode="numeric"
//                           value={row.quantity}
//                           onChange={(e) => {
//                             const sanitized = e.target.value.replace(/[^0-9]/g, '');
//                             if (sanitized === "") {
//                               updateRow(row.id, "quantity", "");
//                             } else {
//                               const num = parseInt(sanitized, 10);
//                               const clamped = Math.min(num, row.availablePackets || 999);
//                               updateRow(row.id, "quantity", clamped);
//                             }
//                           }}
//                           onBlur={() => {
//                             const val = parseInt(row.quantity, 10);
//                             const clamped = Math.min(Math.max(1, isNaN(val) ? 1 : val), row.availablePackets || 999);
//                             updateRow(row.id, "quantity", clamped);
//                           }}
//                           className="h-8 text-sm text-right tabular-nums w-20"
//                         />
//                         <span className="text-xs text-muted-foreground">
//                           {row.availablePackets} available
//                         </span>
//                       </div>
//                     ) : (
//                       <Input
//                         type="text"
//                         inputMode="numeric"
//                         value={row.quantity}
//                         onChange={(e) => {
//                           const sanitized = e.target.value.replace(/[^0-9]/g, '');
//                           updateRow(row.id, "quantity", sanitized === "" ? "" : Number(sanitized));
//                         }}
//                         onBlur={() => {
//                           const val = parseInt(row.quantity, 10);
//                           updateRow(row.id, "quantity", isNaN(val) || val < 1 ? 1 : val);
//                         }}
//                         className="h-8 text-sm text-right tabular-nums"
//                       />
//                     )}
//                   </td>

//                   {/* Total */}
//                   <td className="p-2">
//                     <div className="text-right text-sm font-medium tabular-nums">
//                       {row.isPacketSale && row.totalItemsPerPacket ? (
//                         <>
//                           £{(Number(row.unitPrice || 0) * Number(row.quantity || 0) * row.totalItemsPerPacket).toFixed(2)}
//                           <span className="block text-xs text-muted-foreground font-normal">
//                             {row.quantity} pkt × {row.totalItemsPerPacket} items × £{Number(row.unitPrice || 0).toFixed(2)}
//                           </span>
//                         </>
//                       ) : (
//                         <>£{(Number(row.unitPrice || 0) * Number(row.quantity || 0)).toFixed(2)}</>
//                       )}
//                     </div>
//                   </td>

//                   {/* Action */}
//                   <td className="p-2 text-center">
//                     <div className="flex items-center justify-center gap-1">
//                       {/* Break Packet button - only for non-loose packets */}
//                       {row.isPacketSale && !row.isLoose && (
//                         <Button
//                           type="button"
//                           variant="ghost"
//                           size="sm"
//                           onClick={() => {
//                             // Remove from cart and open break dialog
//                             removeRow(row.id)
//                             setPacketToBreak({
//                               _id: row.packetStockId,
//                               barcode: row.packetBarcode,
//                               product: {
//                                 _id: row.productId,
//                                 name: row.productName,
//                                 productCode: row.productCode
//                               },
//                               composition: row.packetComposition,
//                               totalItemsPerPacket: row.totalItemsPerPacket,
//                               availablePackets: row.availablePackets,
//                               suggestedSellingPrice: Number(row.unitPrice) * row.totalItemsPerPacket,
//                               supplier: { name: row.supplierName }
//                             })
//                           }}
//                           className="h-8 w-8 p-0 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-950/50 dark:hover:text-amber-400"
//                           title="Break packet to sell individual items"
//                         >
//                           <Scissors className="h-4 w-4" />
//                         </Button>
//                       )}
//                       <Button
//                         type="button"
//                         variant="ghost"
//                         size="sm"
//                         onClick={() => removeRow(row.id)}
//                         className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
//                         title="Remove row"
//                       >
//                         <TrashIcon className="h-4 w-4" />
//                       </Button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>

//         {
//           rows.length > 0 && (
//             <div className="mt-3 text-xs text-muted-foreground">
//               <kbd className="px-2 py-1 bg-muted rounded text-xs">Tab</kbd> to navigate between fields
//             </div>
//           )
//         }
//       </section >

//       {/* Section 3: Payment Summary */}
//       < section className="rounded-lg border border-border bg-card p-6 shadow-sm" >
//         <h2 className="text-base font-semibold mb-4">Payment Summary</h2>

//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {/* Left: Calculated totals */}
//           <div className="space-y-3">
//             <div className="flex justify-between items-center p-3 bg-muted/30 rounded-md border border-border/50">
//               <span className="text-sm font-medium text-muted-foreground">Net Total</span>
//               <span className="text-lg font-semibold tabular-nums">
//                 £{totals.subtotal.toFixed(2)}
//               </span>
//             </div>

//             {addShippingCost && (
//               <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-100 dark:border-orange-900/30">
//                 <span className="text-sm font-medium text-orange-800 dark:text-orange-300">Logistics Payable</span>
//                 <span className="text-base font-semibold tabular-nums text-orange-700 dark:text-orange-400">
//                   + £{computedLogisticsPayable.toFixed(2)}
//                 </span>
//               </div>
//             )}

//             {Number(discount || 0) > 0 && (
//               <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-950/20 rounded-md border border-rose-100 dark:border-rose-900/30">
//                 <span className="text-sm font-medium text-rose-800 dark:text-rose-300">Discount</span>
//                 <span className="text-base font-semibold tabular-nums text-rose-700 dark:text-rose-400">
//                   - £{Number(discount).toFixed(2)}
//                 </span>
//               </div>
//             )}

//             {applyVat && (
//               <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-100 dark:border-blue-900/30">
//                 <span className="text-sm font-medium text-blue-800 dark:text-blue-300">VAT (20%)</span>
//                 <span className="text-base font-semibold tabular-nums text-blue-700 dark:text-blue-400">
//                   + £{totals.totalVAT.toFixed(2)}
//                 </span>
//               </div>
//             )}

//             <div className="flex justify-between items-center p-3 bg-primary/5 dark:bg-primary/10 rounded-md border-2 border-primary/20">
//               <span className="text-sm font-bold text-primary">Grand Total</span>
//               <span className="text-xl font-bold tabular-nums text-primary">
//                 £{totals.grandTotal.toFixed(2)}
//               </span>
//             </div>
//           </div>

//           {/* Middle: Input fields */}
//           <div className="space-y-3">
//             <div className="rounded-md border border-border p-3 space-y-3">
//               <div className="flex items-start gap-3">
//                 <input
//                   type="checkbox"
//                   id="add-shipping-cost"
//                   checked={addShippingCost}
//                   onChange={(e) => {
//                     const checked = e.target.checked
//                     setAddShippingCost(checked)
//                     if (!checked) {
//                       setBuyerShippingCharge(0)
//                       setShippingBoxes(0)
//                       setLogisticsCompanyId("")
//                     }
//                   }}
//                   className="h-5 w-5 rounded border-border text-primary focus:ring-primary mt-0.5 flex-shrink-0"
//                 />
//                 <Label htmlFor="add-shipping-cost" className="text-sm font-semibold cursor-pointer">
//                   Add Shipping Cost
//                 </Label>
//               </div>

//               {addShippingCost && (
//                 <div className="space-y-3 pl-7">

//                   <div className="space-y-2">
//                     <Label htmlFor="shipping-boxes">Number of Boxes</Label>
//                     <Input
//                       id="shipping-boxes"
//                       type="text"
//                       inputMode="numeric"
//                       value={shippingBoxes}
//                       onChange={(e) => {
//                         const sanitized = e.target.value.replace(/[^0-9]/g, '')
//                         setShippingBoxes(sanitized === '' ? '' : Number(sanitized))
//                       }}
//                       onBlur={(e) => {
//                         const val = parseInt(e.target.value, 10)
//                         setShippingBoxes(!isNaN(val) ? val : 0)
//                       }}
//                       placeholder=""
//                     />
//                   </div>

//                   <div className="space-y-2">
//                     <Label htmlFor="sale-logistics-company">Logistics Company</Label>
//                     <Select
//                       value={logisticsCompanyId || undefined}
//                       onValueChange={(value) => setLogisticsCompanyId(value || "")}
//                       disabled={isLoadingLogisticsCompanies}
//                     >
//                       <SelectTrigger id="sale-logistics-company">
//                         <SelectValue placeholder={isLoadingLogisticsCompanies ? "Loading..." : "Select logistics company"} />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {logisticsCompanies.map((company) => (
//                           <SelectItem
//                             key={String(company._id || company.id)}
//                             value={String(company._id || company.id)}
//                           >
//                             {company.name}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                   </div>
//                 </div>
//               )}
//             </div>

//             <div className="rounded-md border border-border p-3 space-y-2">
//               <div className="flex items-start gap-3">
//                 <input
//                   type="checkbox"
//                   id="apply-vat"
//                   checked={applyVat}
//                   onChange={(e) => setApplyVat(e.target.checked)}
//                   className="h-5 w-5 rounded border-border text-primary focus:ring-primary mt-0.5 flex-shrink-0"
//                 />
//                 <Label htmlFor="apply-vat" className="text-sm font-semibold cursor-pointer">
//                   Apply VAT (20%)
//                 </Label>
//               </div>
//               <p className="text-xs text-muted-foreground pl-7">
//                 VAT applies to goods after discount. Shipping is excluded.
//               </p>
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="discount">Discount</Label>
//               <Input
//                 id="discount"
//                 type="text"
//                 inputMode="decimal"
//                 step="0.01"
//                 value={discount}
//                 onChange={(e) => {
//                   const value = e.target.value;
//                   // Allow only numbers and one decimal point
//                   const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
//                   setDiscount(sanitized);
//                 }}
//                 onBlur={(e) => {
//                   const val = parseFloat(e.target.value);
//                   setDiscount(!isNaN(val) ? val : 0);
//                 }}
//                 onKeyDown={(e) => handlePaymentKeyDown(e, "discount")}
//                 placeholder=""
//                 className="text-lg"
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="cash">Cash Payment</Label>
//               <Input
//                 id="cash"
//                 ref={cashInputRef}
//                 type="text"
//                 inputMode="decimal"
//                 step="0.01"
//                 value={cash}
//                 onChange={(e) => {
//                   const value = e.target.value;
//                   // Allow only numbers and one decimal point
//                   const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
//                   setCash(sanitized);
//                 }}
//                 onBlur={(e) => {
//                   const val = parseFloat(e.target.value);
//                   setCash(!isNaN(val) ? val : 0);
//                 }}
//                 onKeyDown={(e) => handlePaymentKeyDown(e, "cash")}
//                 placeholder=""
//                 className="text-lg"
//               />
//             </div>
//           </div>

//           {/* Right: More inputs and remaining */}
//           <div className="space-y-3">
//             <div className="space-y-2">
//               <Label htmlFor="bank">Bank Payment</Label>
//               <Input
//                 id="bank"
//                 ref={bankInputRef}
//                 type="text"
//                 inputMode="decimal"
//                 step="0.01"
//                 value={bank}
//                 onChange={(e) => {
//                   const value = e.target.value;
//                   // Allow only numbers and one decimal point
//                   const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
//                   setBank(sanitized);
//                 }}
//                 onBlur={(e) => {
//                   const val = parseFloat(e.target.value);
//                   setBank(!isNaN(val) ? val : 0);
//                 }}
//                 onKeyDown={(e) => handlePaymentKeyDown(e, "bank")}
//                 placeholder=""
//                 className="text-lg"
//               />
//             </div>
//             <div className={`flex justify-between items-center p-3 rounded-md border-2 ${totals.remaining < 0
//               ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900'
//               : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
//               }`}>
//               <span className="text-sm font-medium">
//                 {totals.remaining < 0 ? 'Remaining Balance' : 'Remaining Balance'}
//               </span>
//               <span className={`text-lg font-bold tabular-nums ${totals.remaining < 0
//                 ? 'text-green-700 dark:text-green-400'
//                 : 'text-amber-700 dark:text-amber-400'
//                 }`}>
//                 £{totals.remaining.toFixed(2)}
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* Edit request panel for non-super-admin in edit mode */}
//         {showEditRequestPanel && (
//           <div className="mt-4 flex flex-col gap-3 rounded-lg border border-violet-200 bg-violet-50/60 px-5 py-4">
//             <p className="text-sm text-violet-700 font-medium flex items-center gap-2">
//               <FilePen className="h-4 w-4" />
//               Your changes will be submitted as a request for Super Admin approval
//             </p>
//             <div className="flex items-center gap-2">
//               <input
//                 type="text"
//                 placeholder="Reason for change (required)"
//                 value={editRequestReason}
//                 onChange={(e) => setEditRequestReason(e.target.value)}
//                 className="flex-1 h-9 px-3 text-sm rounded-md border border-violet-300 focus:border-violet-500 focus:outline-none bg-white"
//               />
//             </div>
//             <div className="flex items-center justify-end gap-3">
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => { setShowEditRequestPanel(false); setEditRequestReason(""); setPendingPayload(null) }}
//                 disabled={isSubmittingRequest}
//                 className="gap-1.5"
//               >
//                 <X className="h-3.5 w-3.5" />
//                 Cancel
//               </Button>
//               <Button
//                 size="sm"
//                 onClick={handleSubmitEditRequest}
//                 disabled={isSubmittingRequest || !editRequestReason.trim()}
//                 className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
//               >
//                 {isSubmittingRequest ? (
//                   <>
//                     <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
//                     Submitting...
//                   </>
//                 ) : (
//                   <>
//                     <FilePen className="h-3.5 w-3.5" />
//                     Submit Edit Request
//                   </>
//                 )}
//               </Button>
//             </div>
//           </div>
//         )}

//         <div className="mt-6 pt-6 border-t flex items-center justify-between">
//           <div className="text-xs text-muted-foreground">
//             <div className="flex items-center gap-2">
//               <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd>
//               <span>Next field</span>
//               <span className="text-muted-foreground/50">•</span>
//               <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+S</kbd>
//               <span>Save</span>
//             </div>
//           </div>
//           <div className="flex gap-3">
//             <Button
//               type="button"
//               variant="outline"
//               onClick={() => {
//                 setRows([])
//                 setDiscount(0)
//                 setCash(0)
//                 setBank(0)
//                 setAddShippingCost(false)
//                 setBuyerShippingCharge(0)
//                 setShippingBoxes(0)
//                 setLogisticsCompanyId("")
//                 setError(null)
//               }}
//               disabled={isSaving}
//             >
//               Reset Form
//             </Button>
//             <Button
//               ref={saveButtonRef}
//               type="button"
//               onClick={handleSave}
//               size="lg"
//               className="gap-2 min-w-[140px]"
//               disabled={isSaving || isLoadingBuyers}
//             >
//               {isSaving ? (
//                 <>
//                   <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
//                   Saving...
//                 </>
//               ) : isEditMode ? (
//                 isSuperAdmin ? 'Update Sale' : 'Request Changes'
//               ) : (
//                 'Save Selling'
//               )}
//             </Button>
//           </div>
//         </div>
//       </section >

//       {/* Add Buyer Dialog */}
//       < Dialog open={showAddBuyer} onOpenChange={setShowAddBuyer} >
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Add New Buyer</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-4 py-4">
//             <div className="space-y-2">
//               <Label htmlFor="new-buyer-name">Buyer Name <span className="text-red-500">*</span></Label>
//               <Input
//                 id="new-buyer-name"
//                 value={newBuyerName}
//                 onChange={(e) => setNewBuyerName(e.target.value)}
//                 placeholder="Enter buyer name"
//                 disabled={isCreatingBuyer}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="new-buyer-company">Company Name</Label>
//               <Input
//                 id="new-buyer-company"
//                 value={newBuyerCompany}
//                 onChange={e => setNewBuyerCompany(e.target.value)}
//                 placeholder="Enter company name"
//                 disabled={isCreatingBuyer}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="new-buyer-email">Email <span className="text-red-500">*</span></Label>
//               <Input
//                 id="new-buyer-email"
//                 type="email"
//                 value={newBuyerEmail}
//                 onChange={e => setNewBuyerEmail(e.target.value)}
//                 placeholder="Enter email address"
//                 disabled={isCreatingBuyer}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="new-buyer-phone">Phone <span className="text-red-500">*</span></Label>
//               <div className="flex gap-2">
//                 <Input
//                   id="new-buyer-phone-area-code"
//                   value={newBuyerPhoneAreaCode}
//                   onChange={(e) => setNewBuyerPhoneAreaCode(e.target.value)}
//                   maxLength={5}
//                   className="w-24"
//                   disabled={isCreatingBuyer}
//                 />
//                 <Input
//                   id="new-buyer-phone"
//                   value={newBuyerPhone}
//                   onChange={(e) => setNewBuyerPhone(e.target.value)}
//                   className="flex-1"
//                   disabled={isCreatingBuyer}
//                 />
//               </div>
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="new-buyer-address">Address</Label>
//               <Input
//                 id="new-buyer-address"
//                 value={newBuyerAddress}
//                 onChange={(e) => setNewBuyerAddress(e.target.value)}
//                 placeholder="Enter address"
//                 disabled={isCreatingBuyer}
//               />
//             </div>
//           </div>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => {
//                 setShowAddBuyer(false)
//                 setNewBuyerName("")
//                 setNewBuyerCompany("")
//                 setNewBuyerEmail("")
//                 setNewBuyerPhone("")
//                 setNewBuyerPhoneAreaCode("")
//                 setNewBuyerAddress("")
//               }}
//               disabled={isCreatingBuyer}
//             >
//               Cancel
//             </Button>
//             <Button
//               onClick={handleAddBuyer}
//               disabled={isCreatingBuyer || !newBuyerName.trim() || !newBuyerEmail.trim() || !newBuyerPhone.trim()}
//             >
//               {isCreatingBuyer ? 'Creating...' : 'Create Buyer'}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog >

//       {/* Packet Stock Selection Modal */}
//       < PacketStockSelectionModal
//         open={showProductModal}
//         onClose={() => setShowProductModal(false)
//         }
//         onSelect={(cartRow) => {
//           // Check if packet barcode already exists in cart
//           const existingRowIndex = rows.findIndex(row => row.packetBarcode === cartRow.packetBarcode)

//           if (existingRowIndex !== -1) {
//             // Barcode already in cart - increment quantity if within available limit
//             const existingRow = rows[existingRowIndex]
//             const newQty = (existingRow.quantity || 1) + 1

//             if (newQty > existingRow.availablePackets) {
//               setError(`Cannot add more. Max available: ${existingRow.availablePackets} packets of ${existingRow.packetBarcode}`)
//               return
//             }

//             // Update quantity of existing row
//             updateRow(existingRow.id, 'quantity', newQty)
//           } else {
//             // New barcode - add to cart
//             setRows((r) => [...r, cartRow])
//           }
//         }}
//       />

//       {/* Break Packet Dialog - for selling partial packets */}
//       <BreakPacketDialog
//         open={!!packetToBreak}
//         onOpenChange={(open) => !open && setPacketToBreak(null)}
//         packet={packetToBreak}
//         onSuccess={(result) => {
//           const sourcePacketBarcode = packetToBreak?.barcode || null
//           const resolvedLooseStockBarcodes = Array.isArray(result?.looseStocks)
//             ? result.looseStocks.map((stock) => stock?.barcode).filter(Boolean)
//             : []
//           const fallbackBarcode = result?.looseStock?.barcode
//           if (fallbackBarcode && !resolvedLooseStockBarcodes.includes(fallbackBarcode)) {
//             resolvedLooseStockBarcodes.push(fallbackBarcode)
//           }
//           // After breaking, add the sold items to cart as individual item sales
//           if (result?.itemsSold && result.itemsSold.length > 0 && packetToBreak) {
//             // Calculate total items sold
//             const totalItemsSold = result.itemsSold.reduce((sum, item) => sum + item.quantity, 0)
//             const pricePerItem = Number(packetToBreak.suggestedSellingPrice) / (packetToBreak.totalItemsPerPacket || 1)

//             // Add broken items as a loose stock row (items sold individually)
//             const brokenRow = {
//               id: Date.now(),
//               productId: packetToBreak.product?._id,
//               productName: packetToBreak.product?.name || 'Unknown Product',
//               productCode: packetToBreak.product?.productCode || '',
//               unitPrice: Number(pricePerItem).toFixed(2),
//               quantity: totalItemsSold, // Number of individual items
//               photo: packetToBreak.product?.images?.[0] || null,
//               totalPrice: Number(pricePerItem * totalItemsSold),
//               // Mark as broken packet sale
//               isPacketSale: false, // Individual items, not packet
//               fromBrokenPacket: true,
//               originalPacketBarcode: packetToBreak.barcode,
//               looseStockBarcode: resolvedLooseStockBarcodes[0] || null,
//               itemsSoldBreakdown: result.itemsSold, // Keep breakdown for reference
//               supplierName: packetToBreak.supplier?.name || ''
//             }

//             setRows((r) => [...r, brokenRow])
//           }

//           if (resolvedLooseStockBarcodes.length > 0) {
//             setLooseStockBarcodes(resolvedLooseStockBarcodes)
//             setLooseStockSourcePacket(sourcePacketBarcode)
//             setShowLooseStockBarcodeModal(true)
//           }
//           setPacketToBreak(null)
//         }}
//         mode="sale"
//       />

//       <LooseStockBarcodeModal
//         open={showLooseStockBarcodeModal}
//         onOpenChange={(open) => {
//           setShowLooseStockBarcodeModal(open)
//           if (!open) {
//             setLooseStockBarcodes([])
//             setLooseStockSourcePacket(null)
//           }
//         }}
//         barcodes={looseStockBarcodes}
//         sourcePacketBarcode={looseStockSourcePacket}
//       />
//     </div >
//   )
// }
"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusIcon, TrashIcon, UserPlusIcon, SearchIcon, Calendar, Tag, Users, X, ChevronDown, Scissors } from "lucide-react"
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
import { logisticsCompaniesAPI } from "@/lib/api/endpoints/logisticsCompanies"
import { useBuyers } from "@/lib/hooks/useBuyers"
import { MultiSelect } from "@/components/ui/multi-select"
import { SEASON_OPTIONS, normalizeSeasonArray } from "@/lib/constants/seasons"
import ProductImageGallery from "@/components/ui/ProductImageGallery"
import ProductSelectionModal from "@/components/modals/ProductSelectionModal"
import BritishDatePicker from "@/components/BritishDatePicker"
import PacketStockSelectionModal from "@/components/modals/PacketStockSelectionModal"
import BreakPacketDialog from "@/components/modals/BreakPacketDialog"
import LooseStockBarcodeModal from "@/components/modals/LooseStockBarcodeModal"
import { useBreakPacket } from "@/lib/hooks/usePacketStock"
import { useAuthStore } from "@/store/store"
import { useSubmitEditRequest } from "@/lib/hooks/useEditRequests"
import { FilePen } from "lucide-react"
import AutocompleteFilter from "@/components/ui/autocomplete-filter"

const normalizeNameForCompare = (name) => {
  return (name || "").replace(/\s+/g, "").toLowerCase();
};

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

const getPacketQuantity = (item) => {
  if (!item?.isPacketSale) {
    return null
  }

  const explicitPacketQuantity = Number(item.packetQuantity)
  if (Number.isFinite(explicitPacketQuantity) && explicitPacketQuantity > 0) {
    return explicitPacketQuantity
  }

  const totalItemsPerPacket = Number(item.totalItemsPerPacket)
  const quantity = Number(item.quantity)

  if (
    !Number.isFinite(totalItemsPerPacket) ||
    totalItemsPerPacket <= 0 ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    return null
  }

  const derivedPacketQuantity = quantity / totalItemsPerPacket
  return Number.isInteger(derivedPacketQuantity) && derivedPacketQuantity > 0
    ? derivedPacketQuantity
    : null
}

const getRowTotalPrice = (row) => {
  const unitPrice = Number(row.unitPrice || 0)
  const quantity = Number(row.quantity || 0)

  if (row.isPacketSale && row.totalItemsPerPacket) {
    return unitPrice * quantity * Number(row.totalItemsPerPacket || 0)
  }

  return unitPrice * quantity
}

const VAT_RATE = 20

const roundCurrency = (value) => {
  const normalized = Number(value)
  if (!Number.isFinite(normalized)) return 0
  return Math.round((normalized + Number.EPSILON) * 100) / 100
}

export default function SaleForm({ onSave, initialData, saleId }) {
  const router = useRouter()
  const isEditMode = !!saleId
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super-admin'
  const submitEditRequestMutation = useSubmitEditRequest()

  // Edit request panel state (non-super-admin edit mode)
  const [showEditRequestPanel, setShowEditRequestPanel] = useState(false)
  const [editRequestReason, setEditRequestReason] = useState("")
  const [pendingPayload, setPendingPayload] = useState(null)
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

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
  const [newBuyerCompany, setNewBuyerCompany] = useState("")
  const [newBuyerEmail, setNewBuyerEmail] = useState("")
  const [newBuyerPhone, setNewBuyerPhone] = useState("")
  const [newBuyerPhoneAreaCode, setNewBuyerPhoneAreaCode] = useState("")
  const [newBuyerAddress, setNewBuyerAddress] = useState("")
  const [isCreatingBuyer, setIsCreatingBuyer] = useState(false)
  const newBuyerPhoneInputRef = useRef(null)
  const manualCustomerPhoneInputRef = useRef(null)

  // Refs for keyboard navigation and submission lock
  const cashInputRef = useRef(null)
  const bankInputRef = useRef(null)
  const saveButtonRef = useRef(null)
  const isSubmittingRef = useRef(false) // <-- SYNCHRONOUS SUBMIT LOCK

  // Autocomplete Derived Values
  const buyerOptions = useMemo(() => {
    return buyers.map(b => b.company || b.name).filter(Boolean);
  }, [buyers]);

  const selectedBuyerObj = useMemo(() => {
    return buyers.find((b) => String(b.id) === String(buyerId));
  }, [buyers, buyerId]);

  const currentBuyerName = selectedBuyerObj 
    ? (selectedBuyerObj.company || selectedBuyerObj.name) 
    : "";

  const handleBuyerChange = (val) => {
    if (!val) {
      setBuyerId("");
      setIsManualCustomer(false);
      return;
    }
    const found = buyers.find(b => (b.company || b.name) === val);
    if (found) {
      setBuyerId(String(found.id));
      setIsManualCustomer(false);
    } else {
      setBuyerId("");
    }
  };

  // Product Selection Modal
  const [showProductModal, setShowProductModal] = useState(false)

  // Manual customer fields
  const [manualCustomer, setManualCustomer] = useState({
    name: "",
    company: "",
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

  // Product code lookup state
  const lookupTimeoutRefs = useRef({})

  // Product name lookup state
  const nameLookupTimeoutRefs = useRef({})

  // Metadata fields
  const [saleDate, setSaleDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [saleType, setSaleType] = useState("wholesale")
  const [notes, setNotes] = useState("") 

  // Cart rows
  const [rows, setRows] = useState([])

  // Barcode scanning
  const [barcodeInput, setBarcodeInput] = useState("")
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false)
  const [barcodeError, setBarcodeError] = useState(null)
  const barcodeInputRef = useRef(null)

  // Packet breaking during sale
  const [packetToBreak, setPacketToBreak] = useState(null)
  const breakPacketMutation = useBreakPacket()
  const [looseStockBarcodes, setLooseStockBarcodes] = useState([])
  const [looseStockSourcePacket, setLooseStockSourcePacket] = useState(null)
  const [showLooseStockBarcodeModal, setShowLooseStockBarcodeModal] = useState(false)

  // Payment section
  const [discount, setDiscount] = useState(null)
  const [cash, setCash] = useState(null)
  const [bank, setBank] = useState(null)
  const [applyVat, setApplyVat] = useState(false)
  const [addShippingCost, setAddShippingCost] = useState(false)
  const [buyerShippingCharge, setBuyerShippingCharge] = useState(0)
  const [shippingBoxes, setShippingBoxes] = useState(0)
  const [logisticsCompanyId, setLogisticsCompanyId] = useState("")
  const [logisticsCompanies, setLogisticsCompanies] = useState([])
  const [isLoadingLogisticsCompanies, setIsLoadingLogisticsCompanies] = useState(false)

  // Pre-populate form when initialData is provided (edit mode)
  useEffect(() => {
    if (!initialData) return

    // Date
    if (initialData.saleDate) setSaleDate(new Date(initialData.saleDate).toLocaleDateString('en-CA'))
    // Type
    if (initialData.saleType) setSaleType(initialData.saleType)
    // Notes
    if (initialData.notes) setNotes(initialData.notes)
    // Payment
    if (initialData.totalDiscount != null) setDiscount(initialData.totalDiscount)
    if (initialData.cashPayment != null) setCash(initialData.cashPayment)
    if (initialData.bankPayment != null) setBank(initialData.bankPayment)
    setApplyVat(Number(initialData.vatRate || 0) > 0 || Number(initialData.totalVAT || 0) > 0)
    const hasShipping = Boolean(initialData.addShippingCost) || Number(initialData.buyerShippingCharge || initialData.shippingCost || 0) > 0
    setAddShippingCost(hasShipping)
    setBuyerShippingCharge(Number(initialData.buyerShippingCharge ?? initialData.shippingCost ?? 0))
    setShippingBoxes(Number(initialData.shippingBoxes || 0))
    setLogisticsCompanyId(String(initialData.logisticsCompany?._id || initialData.logisticsCompany || ""))
    // Buyer
    if (initialData.buyer) {
      const buyerIdVal = initialData.buyer?._id || initialData.buyer
      setBuyerId(String(buyerIdVal))
      setIsManualCustomer(false)
    } else if (initialData.manualCustomer) {
      setIsManualCustomer(true)
      setManualCustomer(prev => ({ ...prev, ...initialData.manualCustomer }))
    }
    // Items → rows
    if (Array.isArray(initialData.items) && initialData.items.length > 0) {
      const mappedRows = initialData.items.map((item, idx) => {
        const prod = item.product
        const packetQuantity = getPacketQuantity(item)
        const rowQuantity = item.isPacketSale ? packetQuantity ?? '' : item.quantity
        return {
          id: Date.now() + idx,
          productId: prod?._id || prod || '',
          productName: prod?.name || '',
          productCode: prod?.productCode || prod?.sku || '',
          season: prod?.season || [],
          unitPrice: item.unitPrice,
          quantity: rowQuantity,
          photo: prod?.images?.[0] || null,
          totalPrice: Number(item.totalPrice ?? getRowTotalPrice({
            unitPrice: item.unitPrice,
            quantity: rowQuantity,
            isPacketSale: item.isPacketSale,
            totalItemsPerPacket: item.totalItemsPerPacket,
          })),
          isPacketSale: item.isPacketSale || false,
          packetStockId: item.packetStock?._id || item.packetStock || undefined,
          packetBarcode: item.packetBarcode || undefined,
          packetComposition: item.packetComposition || undefined,
          totalItemsPerPacket: item.totalItemsPerPacket || undefined,
          packetQuantity: packetQuantity || undefined,
          originalItemQuantity: item.quantity,
        }
      })
      setRows(mappedRows)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData])

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

  // Fetch logistics companies for optional shipping tracking
  useEffect(() => {
    let cancelled = false

    async function fetchLogisticsCompanies() {
      try {
        setIsLoadingLogisticsCompanies(true)
        const response = await logisticsCompaniesAPI.getAll({ isActive: true, limit: 1000 })
        let list = []
        if (response.data?.data && Array.isArray(response.data.data)) {
          list = response.data.data
        } else if (response.data && Array.isArray(response.data)) {
          list = response.data
        } else if (Array.isArray(response)) {
          list = response
        }

        if (!cancelled) {
          setLogisticsCompanies(list)
        }
      } catch (err) {
        console.error('Error fetching logistics companies:', err)
        if (!cancelled) {
          setLogisticsCompanies([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLogisticsCompanies(false)
        }
      }
    }

    fetchLogisticsCompanies()

    return () => {
      cancelled = true
    }
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
    if (!newBuyerCompany.trim()) {
      setError('Please enter buyer phone')
      return
    }
    
    // Optionally validate email format if provided
    if (newBuyerEmail && !/^\S+@\S+\.\S+$/.test(newBuyerEmail)) {
      setError('Please enter a valid email address')
      return
    }
    try {
      setIsCreatingBuyer(true)
      setError(null)
      const payload = {
        name: newBuyerName.trim(),
        phone: newBuyerPhone.trim(),
        phoneAreaCode: newBuyerPhoneAreaCode.trim() || undefined,
        company: newBuyerCompany.trim() || undefined,
        email: newBuyerEmail.trim() || undefined,
        address: newBuyerAddress.trim()
          ? { street: newBuyerAddress.trim() }
          : undefined,
        createUserAccount: true
      }
      const response = await buyersAPI.create(payload)
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
        setNewBuyerCompany("")
        setNewBuyerEmail("")
        setNewBuyerPhone("")
        setNewBuyerPhoneAreaCode("")
        setNewBuyerAddress("")
        setShowAddBuyer(false)
      }
    } catch (err) {
      console.error('Error creating buyer:', err)
      if (err.response?.status === 409) {
        const message = err.response?.data?.message || 'A buyer with this name/company already exists.'
        toast(message, { icon: '⚠️' })
        setError(message)
        return
      }
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to create buyer. Please try again.'
      setError(errorMessage)
    } finally {
      setIsCreatingBuyer(false)
    }
  }

  // Add new row to cart
  function addRow() {
    const newRow = {
      id: Date.now(),
      productId: "",
      productName: "",
      productCode: "",
      season: [],
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
        updated.totalPrice = getRowTotalPrice(updated)

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
      season: Array.isArray(product.season)
        ? product.season
        : product.season
          ? [product.season]
          : product.productType
            ? (Array.isArray(product.productType) ? product.productType : [product.productType])
            : [],
      unitPrice: Number(product.defaultPrice || 0).toFixed(2), // Fix to 2 decimals
      quantity: 1,
      photo: product.images?.[0] || product.image,
      totalPrice: product.defaultPrice * 1 // initial total
    }

    setRows((r) => [...r, newRow])
  }

  // Handle barcode scan/input
  async function handleBarcodeLookup(barcode) {
    if (!barcode || !barcode.trim()) {
      return
    }

    const trimmedBarcode = barcode.trim().toUpperCase()

    // Validate barcode format
    if (!trimmedBarcode.startsWith('PKT-') && !trimmedBarcode.startsWith('LSE-')) {
      setBarcodeError('Invalid barcode format. Expected PKT-XXXXXXXX or LSE-XXXXXXXX')
      setBarcodeInput('')
      barcodeInputRef.current?.focus()
      return
    }

    // Check if this barcode already exists in cart
    const existingRowIndex = rows.findIndex(row => row.packetBarcode === trimmedBarcode)

    if (existingRowIndex !== -1) {
      // Barcode already in cart - increment quantity if within available limit
      const existingRow = rows[existingRowIndex]
      const newQty = (existingRow.quantity || 1) + 1

      if (newQty > existingRow.availablePackets) {
        setBarcodeError(`Cannot add more. Max available: ${existingRow.availablePackets} packets`)
        setBarcodeInput('')
        barcodeInputRef.current?.focus()
        return
      }

      // Update quantity of existing row
      updateRow(existingRow.id, 'quantity', newQty)
      setBarcodeInput('') // Clear input
      barcodeInputRef.current?.focus()
      return
    }

    setIsLookingUpBarcode(true)
    setBarcodeError(null)

    try {
      const response = await salesAPI.lookupBarcode(trimmedBarcode)
      const packetData = response.data?.data

      if (!packetData) {
        setBarcodeError('Packet not found')
        setBarcodeInput('')
        barcodeInputRef.current?.focus()
        return
      }

      if (packetData.availablePackets <= 0) {
        setBarcodeError(`No stock available for ${packetData.product?.name || 'this packet'}`)
        setBarcodeInput('')
        barcodeInputRef.current?.focus()
        return
      }

      // Calculate price per item from suggested packet price
      const totalItems = packetData.totalItemsPerPacket || 1
      const suggestedPricePerItem = Number(packetData.suggestedSellingPrice || 0) / totalItems

      // Create cart row from packet data
      const newRow = {
        id: Date.now(),
        productId: packetData.product?._id,
        productName: packetData.product?.name || 'Unknown Product',
        productCode: packetData.product?.productCode || packetData.product?.sku || '',
        season: packetData.product?.season || [],
        unitPrice: Number(suggestedPricePerItem).toFixed(2), // Price per item
        quantity: 1, // Number of packets
        photo: packetData.product?.images?.[0] || null,
        totalPrice: Number(suggestedPricePerItem * totalItems), // 1 packet × items × price per item
        // Packet-specific fields
        isPacketSale: true,
        packetStockId: packetData.packetStockId,
        packetBarcode: packetData.barcode,
        packetComposition: packetData.composition,
        totalItemsPerPacket: packetData.totalItemsPerPacket,
        availablePackets: packetData.availablePackets,
        isLoose: packetData.isLoose,
        compositionText: packetData.compositionText,
        supplierName: packetData.supplier?.name || ''
      }

      setRows((r) => [...r, newRow])
      setBarcodeInput('') // Clear input after successful scan
      barcodeInputRef.current?.focus()

    } catch (err) {
      console.error('Barcode lookup error:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to lookup barcode'
      setBarcodeError(errorMessage)
      setBarcodeInput('')
      barcodeInputRef.current?.focus()
    } finally {
      setIsLookingUpBarcode(false)
    }
  }

  // Handle barcode input key press
  function handleBarcodeKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBarcodeLookup(barcodeInput)
    }
  }

  const selectedLogisticsCompany = useMemo(() => {
    return logisticsCompanies.find(
      (company) => String(company._id || company.id) === String(logisticsCompanyId)
    )
  }, [logisticsCompanies, logisticsCompanyId])

  const logisticsBoxRate = Number(selectedLogisticsCompany?.rates?.boxRate || 0)
  const computedLogisticsPayable = addShippingCost
    ? Math.max(0, Number(shippingBoxes || 0) * logisticsBoxRate)
    : 0
  const effectiveBuyerShippingCharge = addShippingCost
    ? Math.max(0, Number(buyerShippingCharge || 0))
    : 0

  // Derived totals
  const totals = useMemo(() => {
    // subtotal is just the sum of items
    const subtotal = rows.reduce((sum, row) => sum + Number(row.totalPrice || 0), 0)
    const discountValue = Number(discount || 0)
    const discountedSubtotal = Math.max(0, subtotal - discountValue)
    const totalVAT = applyVat
      ? roundCurrency(discountedSubtotal * (VAT_RATE / 100))
      : 0
    // grandTotal includes shipping (logistics payable) and subtracts discount, VAT only on goods
    const grandTotal = roundCurrency(Math.max(0, discountedSubtotal + totalVAT + computedLogisticsPayable))
    const paid = Number(cash || 0) + Number(bank || 0)
    const remaining = roundCurrency(grandTotal - paid)
    return { subtotal, totalVAT, grandTotal, paid, remaining }
  }, [rows, computedLogisticsPayable, discount, cash, bank, applyVat])

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
    // 1. INSTANT SYNCHRONOUS LOCK
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSaving(true);

    try {
      // --- Validation ---
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
        !row.unitPrice ||
        row.unitPrice <= 0 ||
        !row.quantity ||
        row.quantity <= 0
      )

      if (invalidRows.length > 0) {
        setError('Please fill in product name, code, unit price, and quantity for all rows')
        return
      }

      if (addShippingCost) {
        if (!logisticsCompanyId) {
          setError('Please select a logistics company when shipping is enabled')
          return
        }

        if (!shippingBoxes || Number(shippingBoxes) < 1) {
          setError('Number of boxes must be at least 1 when shipping is enabled')
          return
        }

        if (Number(buyerShippingCharge || 0) < 0) {
          setError('Shipping charge cannot be negative')
          return
        }
      }

      // --- Clear previous errors ---
      setError(null);

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
                    normalizeNameForCompare(p.name) === normalizeNameForCompare(row.productName)
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
                normalizeNameForCompare(p.name) === normalizeNameForCompare(row.productName)
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
              season: normalizeSeasonArray(row.season || []),
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

        // Build base item
        const item = {
          product: productId,
          quantity: quantity,
          unitPrice: unitPrice,
          discount: 0,
          taxRate: 0
        }

        // Add packet-specific fields if this is a packet sale
        if (row.isPacketSale) {
          item.isPacketSale = true
          item.packetStock = row.packetStockId
          item.packetBarcode = row.packetBarcode
          item.totalItemsPerPacket = row.totalItemsPerPacket
          item.packetComposition = row.packetComposition
          // For packets: quantity is packet count, actual items = packets × itemsPerPacket
          item.quantity = quantity * (row.totalItemsPerPacket || 1)
          item.packetQuantity = quantity // Store original packet count
        }

        return item
      }))

      // Calculate subtotal and grandTotal
      const subtotal = itemsWithProducts.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
      const discountValue = Number(discount || 0)
      const discountedSubtotal = Math.max(0, subtotal - discountValue)
      const totalVAT = applyVat
        ? roundCurrency(discountedSubtotal * (VAT_RATE / 100))
        : 0
      const grandTotal = Math.max(0, discountedSubtotal + totalVAT + (addShippingCost ? computedLogisticsPayable : 0))

      const payload = {
        saleDate: saleDate,
        items: itemsWithProducts,
        totalDiscount: Number(discount || 0),
        vatRate: applyVat ? VAT_RATE : 0,
        totalVAT: totalVAT,
        addShippingCost: addShippingCost,
        buyerShippingCharge: addShippingCost ? computedLogisticsPayable : 0,
        shippingCost: addShippingCost ? computedLogisticsPayable : 0,
        shippingBoxes: addShippingCost ? Number(shippingBoxes || 0) : 0,
        logisticsCompanyId: addShippingCost ? logisticsCompanyId : null,
        logisticsBoxRateSnapshot: addShippingCost ? logisticsBoxRate : 0,
        logisticsPayable: addShippingCost ? computedLogisticsPayable : 0,
        cashPayment: Number(cash || 0),
        bankPayment: Number(bank || 0),
        paymentMethod: cash > 0 ? 'cash' : bank > 0 ? 'online' : 'credit',
        saleType: saleType,
        notes: notes.trim() || `Manual entry - ${isManualCustomer ? manualCustomer.name : buyers.find(b => String(b.id) === String(buyerId))?.name || 'Customer'}`,
      }

      // Add buyer or manualCustomer
      if (isManualCustomer) {
        payload.manualCustomer = manualCustomer
      } else {
        payload.buyer = buyerId
      }

      let response
      if (isEditMode) {
        if (!isSuperAdmin) {
          // Non-super-admin: show edit request panel instead of saving directly
          setPendingPayload(payload)
          setShowEditRequestPanel(true)
          return
        }
        response = await salesAPI.update(saleId, payload)
      } else {
        response = await salesAPI.create(payload)
      }

      if (response.status === 202) {
        toast.success('Backdated sale request submitted for approval of super admin.')
        router.push('/my-requests')
        return
      }

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
      // 2. ALWAYS RELEASE THE LOCK
      isSubmittingRef.current = false;
      setIsSaving(false);
    }
  }

  async function handleSubmitEditRequest() {
    if (!editRequestReason.trim() || !pendingPayload) return
    setIsSubmittingRequest(true)
    try {
      const saleRef = initialData?.saleNumber || `#${String(saleId).slice(-6)}`
      const requestedChanges = {}
      if (initialData) {
        if (pendingPayload.saleDate !== new Date(initialData.saleDate).toLocaleDateString('en-CA'))
          requestedChanges.saleDate = { from: initialData.saleDate, to: pendingPayload.saleDate }
        if (pendingPayload.saleType !== initialData.saleType)
          requestedChanges.saleType = { from: initialData.saleType, to: pendingPayload.saleType }
        if (String(pendingPayload.buyer || '') !== String(initialData.buyer?._id || initialData.buyer || ''))
          requestedChanges.buyer = { from: initialData.buyer?.name || initialData.buyer, to: pendingPayload.buyer }
        if (pendingPayload.totalDiscount !== (initialData.totalDiscount || 0))
          requestedChanges.totalDiscount = { from: initialData.totalDiscount || 0, to: pendingPayload.totalDiscount }
        if (Number(pendingPayload.vatRate || 0) !== Number(initialData.vatRate || 0))
          requestedChanges.vatRate = { from: Number(initialData.vatRate || 0), to: Number(pendingPayload.vatRate || 0) }
        if (Number(pendingPayload.totalVAT || 0) !== Number(initialData.totalVAT || 0))
          requestedChanges.totalVAT = { from: Number(initialData.totalVAT || 0), to: Number(pendingPayload.totalVAT || 0) }
        if (Boolean(pendingPayload.addShippingCost) !== Boolean(initialData.addShippingCost))
          requestedChanges.addShippingCost = { from: Boolean(initialData.addShippingCost), to: Boolean(pendingPayload.addShippingCost) }
        if (Number(pendingPayload.buyerShippingCharge || 0) !== Number(initialData.buyerShippingCharge ?? initialData.shippingCost ?? 0))
          requestedChanges.buyerShippingCharge = {
            from: Number(initialData.buyerShippingCharge ?? initialData.shippingCost ?? 0),
            to: Number(pendingPayload.buyerShippingCharge || 0)
          }
        if (Number(pendingPayload.shippingBoxes || 0) !== Number(initialData.shippingBoxes || 0))
          requestedChanges.shippingBoxes = { from: Number(initialData.shippingBoxes || 0), to: Number(pendingPayload.shippingBoxes || 0) }
        if (String(pendingPayload.logisticsCompanyId || '') !== String(initialData.logisticsCompany?._id || initialData.logisticsCompany || ''))
          requestedChanges.logisticsCompany = {
            from: initialData.logisticsCompany?.name || initialData.logisticsCompany || '',
            to: pendingPayload.logisticsCompanyId || ''
          }
        if (pendingPayload.cashPayment !== (initialData.cashPayment || 0))
          requestedChanges.cashPayment = { from: initialData.cashPayment || 0, to: pendingPayload.cashPayment }
        if (pendingPayload.bankPayment !== (initialData.bankPayment || 0))
          requestedChanges.bankPayment = { from: initialData.bankPayment || 0, to: pendingPayload.bankPayment }
        if (pendingPayload.notes !== (initialData.notes || ''))
          requestedChanges.notes = { from: initialData.notes || '', to: pendingPayload.notes }
        // Compare items (quantity and price changes)
        const origItems = (initialData.items || []).map(item => ({
          productId: String(item.product?._id || item.product || ''),
          productName: item.product?.name || '',
          productCode: item.product?.productCode || item.product?.sku || '',
          unitPrice: item.unitPrice,
          quantity: item.isPacketSale ? getPacketQuantity(item) ?? item.quantity : item.quantity,
        }))
        const newItems = rows.map((row) => ({
          productId: String(row.productId || ''),
          productName: row.productName || '',
          productCode: row.productCode || '',
          unitPrice: Number(row.unitPrice || 0),
          quantity: Number(row.quantity || 0),
        }))
        if (JSON.stringify(origItems) !== JSON.stringify(newItems))
          requestedChanges.items = { from: origItems, to: newItems }
      }
      await submitEditRequestMutation.mutateAsync({
        entityType: 'sale',
        entityId: saleId,
        entityRef: saleRef,
        requestType: 'edit',
        requestedChanges,
        rawPayload: pendingPayload,
        reason: editRequestReason.trim(),
      })
      setShowEditRequestPanel(false)
      setEditRequestReason("")
      setPendingPayload(null)
      // submitEditRequestMutation already toasts on success
      router.push('/my-requests')
    } catch {
      // error toast handled by mutation hook
    } finally {
      setIsSubmittingRequest(false)
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

      {/* Section 1: Selling Details - Enhanced Design */}
      <section className="rounded-lg border border-border bg-card shadow-sm overflow-visible">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-muted/30 border-b border-border rounded-t-lg">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Selling Details</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Enter sale information and customer details</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-visible">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Sale Date */}
            <div className="space-y-2">
              <Label htmlFor="sale-date" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Sale Date
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <BritishDatePicker
                  value={saleDate ? new Date(saleDate) : new Date()}
                  onChange={(date) => {
                    if (date) {
                      setSaleDate(date.toLocaleDateString('en-CA'));
                    }
                  }}
                  restrictByRole={true}
                  className="h-11 w-full pl-10 pr-3 text-base font-medium rounded-lg border border-input bg-background"
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>

            {/* Sale Type */}
            <div className="space-y-2">
              <Label htmlFor="sale-type" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Sale Type
              </Label>
              <Select value={saleType} onValueChange={setSaleType}>
                <SelectTrigger
                  id="sale-type"
                  className="h-11 w-full rounded-lg border border-input bg-background text-base font-medium text-foreground hover:border-ring/50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-all duration-200"
                >
                  <SelectValue placeholder="Select sale type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                  <SelectItem value="bulk">Bulk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer / Buyer */}
            <div className="space-y-2">
              <Label htmlFor="buyer" className="text-sm font-semibold text-foreground flex items-center gap-2">
                Buyer
              </Label>
              <div className="flex gap-2 items-start">
                <div className="flex-1 relative">
                  <AutocompleteFilter
                    value={currentBuyerName}
                    onChange={handleBuyerChange}
                    options={buyerOptions}
                    placeholder={isLoadingBuyers ? "Loading customers..." : "Search customer by name, company..."}
                    className={isLoadingBuyers
                      ? "h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground pointer-events-none opacity-50"
                      : "h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:border-ring/50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-all duration-200"
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowAddBuyer(true)}
                  title="Add new customer"
                  disabled={isLoadingBuyers}
                  className="h-11 w-11 rounded-lg border border-input bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 flex-shrink-0"
                >
                  <UserPlusIcon className="h-4 w-4" />
                </Button>
              </div >
              {isManualCustomer && (
                <div className="mt-4 p-4 border border-border rounded-lg bg-muted/30 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Manual Buyer Details</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-name" className="text-sm font-semibold text-foreground">
                      Buyer Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="manual-name"
                      value={manualCustomer.name}
                      onChange={(e) => setManualCustomer({ ...manualCustomer, name: e.target.value })}
                      placeholder="Enter customer name"
                      className="h-11 text-base font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-company" className="text-sm font-semibold text-foreground">
                      Company Name
                    </Label>
                    <Input
                      id="manual-company"
                      value={manualCustomer.company}
                      onChange={(e) => setManualCustomer({ ...manualCustomer, company: e.target.value })}
                      placeholder="Enter company name (optional)"
                      className="h-11 text-base font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manual-phone" className="text-sm font-semibold text-foreground">Phone</Label>
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
                          className="w-24 h-11 text-base font-medium"
                          placeholder="Area"
                        />
                        <Input
                          ref={manualCustomerPhoneInputRef}
                          id="manual-phone"
                          value={manualCustomer.phone}
                          onChange={(e) => setManualCustomer({ ...manualCustomer, phone: e.target.value })}
                          className="flex-1 h-11 text-base font-medium"
                          placeholder="Phone number"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual-email" className="text-sm font-semibold text-foreground">Email</Label>
                      <Input
                        id="manual-email"
                        type="email"
                        value={manualCustomer.email}
                        onChange={(e) => setManualCustomer({ ...manualCustomer, email: e.target.value })}
                        className="h-11 text-base font-medium"
                        placeholder="customer@example.com"
                      />
                    </div>
                  </div>
                </div>
              )
              }
            </div >
          </div >
        </div >
      </section >

      {/* Section 2: Products Cart */}
      < section className="rounded-lg border border-border bg-card p-6 shadow-sm" >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Products</h2>
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
        </div>

        {/* Barcode Scanner Input */}
        <div className="mb-4 p-4 bg-muted/30 rounded-lg border border-dashed">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label htmlFor="barcode-input" className="text-sm font-medium mb-1 block">
                Scan Packet Barcode
              </Label>
              <div className="flex gap-2">
                <Input
                  ref={barcodeInputRef}
                  id="barcode-input"
                  type="text"
                  placeholder="Scan or enter barcode (PKT-XXXXXXXX or LSE-XXXXXXXX)"
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value.toUpperCase())
                    setBarcodeError(null)
                  }}
                  onKeyDown={handleBarcodeKeyDown}
                  disabled={isLookingUpBarcode}
                  className="flex-1 font-mono"
                />
                <Button
                  type="button"
                  onClick={() => handleBarcodeLookup(barcodeInput)}
                  disabled={isLookingUpBarcode || !barcodeInput.trim()}
                  size="default"
                >
                  {isLookingUpBarcode ? 'Looking up...' : 'Add'}
                </Button>
              </div>
              {barcodeError && (
                <p className="text-sm text-destructive mt-1">{barcodeError}</p>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left p-3 font-medium min-w-[150px]">Name</th>
                <th className="text-left p-3 font-medium min-w-[120px]">Code</th>
                <th className="text-left p-3 font-medium min-w-[80px]">Image</th>
                <th className="text-right p-3 font-medium min-w-[100px]">Unit Price</th>
                <th className="text-right p-3 font-medium min-w-[100px]">Quantity</th>
                <th className="text-right p-3 font-medium min-w-[100px]">Total</th>
                <th className="text-center p-3 font-medium w-20">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm">No products added yet</p>
                      <p className="text-xs">Scan a barcode or click "Add Product" to get started</p>
                    </div>
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className={`border-b hover:bg-muted/30 transition-colors ${row.isPacketSale ? 'bg-blue-50/30' : ''}`}>
                  {/* Name */}
                  <td className="p-2">
                    {row.isPacketSale ? (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-sm">{row.productName}</span>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
                            {row.isLoose ? 'LOOSE' : 'PACKET'}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {row.packetBarcode}
                          </span>
                        </div>
                        {row.compositionText && (
                          <span className="text-[10px] text-muted-foreground">
                            {row.compositionText} ({row.totalItemsPerPacket} items)
                          </span>
                        )}
                        <span className="text-[10px] text-emerald-600">
                          {row.availablePackets} available
                        </span>
                      </div>
                    ) : (
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
                                  normalizeNameForCompare(p.name) === normalizeNameForCompare(name)
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
                                      season: Array.isArray(product.season)
                                        ? product.season
                                        : product.season
                                          ? [product.season]
                                          : product.productType
                                            ? (Array.isArray(product.productType) ? product.productType : [product.productType])
                                            : (r.season || []),
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
                    )}
                  </td>

                  {/* Code */}
                  <td className="p-2">
                    {row.isPacketSale ? (
                      <span className="text-sm text-muted-foreground">{row.productCode}</span>
                    ) : (
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
                                      season: Array.isArray(product.season)
                                        ? product.season
                                        : product.season
                                          ? [product.season]
                                          : product.productType
                                            ? (Array.isArray(product.productType) ? product.productType : [product.productType])
                                            : (r.season || []),
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
                    )}
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

                  {/* Unit Price */}
                  <td className="p-2">
                    {row.isPacketSale ? (
                      <div className="flex flex-col items-end gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          // value={row.unitPrice}
                          onChange={(e) => {
                            const value = e.target.value;
                            const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                            updateRow(row.id, "unitPrice", sanitized);
                          }}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value)
                            if (!isNaN(val)) {
                              updateRow(row.id, "unitPrice", Number(val.toFixed(2)))
                            }
                          }}
                          className="h-8 text-sm text-right tabular-nums w-24"
                        />
                        <span className="text-xs text-muted-foreground">per item</span>
                      </div>
                    ) : (
                      <Input
                        type="text"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        // value={row.unitPrice}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow only numbers and one decimal point
                          const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                          updateRow(row.id, "unitPrice", sanitized);
                        }}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value)
                          if (!isNaN(val)) {
                            updateRow(row.id, "unitPrice", Number(val.toFixed(2)))
                          }
                        }}
                        className="h-8 text-sm text-right tabular-nums"
                      />
                    )}
                  </td>

                  {/* Quantity */}
                  <td className="p-2">
                    {row.isPacketSale ? (
                      <div className="flex flex-col items-end gap-1">
                        <Input
                          type="text"
                          inputMode="numeric"
                          // value={""}
                          onChange={(e) => {
                            const sanitized = e.target.value.replace(/[^0-9]/g, '');
                            if (sanitized === "") {
                              updateRow(row.id, "quantity", "");
                            } else {
                              const num = parseInt(sanitized, 10);
                              const clamped = Math.min(num, row.availablePackets || 999);
                              updateRow(row.id, "quantity", clamped);
                            }
                          }}
                          onBlur={() => {
                            const val = parseInt(row.quantity, 10);
                            const clamped = Math.min(Math.max(1, isNaN(val) ? 1 : val), row.availablePackets || 999);
                            updateRow(row.id, "quantity", clamped);
                          }}
                          className="h-8 text-sm text-right tabular-nums w-20"
                        />
                        <span className="text-xs text-muted-foreground">
                          {row.availablePackets} available
                        </span>
                      </div>
                    ) : (
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={row.quantity}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/[^0-9]/g, '');
                          updateRow(row.id, "quantity", sanitized === "" ? "" : Number(sanitized));
                        }}
                        onBlur={() => {
                          const val = parseInt(row.quantity, 10);
                          updateRow(row.id, "quantity", isNaN(val) || val < 1 ? 1 : val);
                        }}
                        className="h-8 text-sm text-right tabular-nums"
                      />
                    )}
                  </td>

                  {/* Total */}
                  <td className="p-2">
                    <div className="text-right text-sm font-medium tabular-nums">
                      {row.isPacketSale && row.totalItemsPerPacket ? (
                        <>
                          £{(Number(row.unitPrice || 0) * Number(row.quantity || 0) * row.totalItemsPerPacket).toFixed(2)}
                          <span className="block text-xs text-muted-foreground font-normal">
                            {row.quantity} pkt × {row.totalItemsPerPacket} items × £{Number(row.unitPrice || 0).toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <>£{(Number(row.unitPrice || 0) * Number(row.quantity || 0)).toFixed(2)}</>
                      )}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Break Packet button - only for non-loose packets */}
                      {row.isPacketSale && !row.isLoose && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Remove from cart and open break dialog
                            removeRow(row.id)
                            setPacketToBreak({
                              _id: row.packetStockId,
                              barcode: row.packetBarcode,
                              product: {
                                _id: row.productId,
                                name: row.productName,
                                productCode: row.productCode
                              },
                              composition: row.packetComposition,
                              totalItemsPerPacket: row.totalItemsPerPacket,
                              availablePackets: row.availablePackets,
                              suggestedSellingPrice: Number(row.unitPrice) * row.totalItemsPerPacket,
                              supplier: { name: row.supplierName }
                            })
                          }}
                          className="h-8 w-8 p-0 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-950/50 dark:hover:text-amber-400"
                          title="Break packet to sell individual items"
                        >
                          <Scissors className="h-4 w-4" />
                        </Button>
                      )}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {
          rows.length > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Tab</kbd> to navigate between fields
            </div>
          )
        }
      </section >

      {/* Section 3: Payment Summary */}
      < section className="rounded-lg border border-border bg-card p-6 shadow-sm" >
        <h2 className="text-base font-semibold mb-4">Payment Summary</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Left: Calculated totals */}
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-md border border-border/50">
              <span className="text-sm font-medium text-muted-foreground">Net Total</span>
              <span className="text-lg font-semibold tabular-nums">
                £{totals.subtotal.toFixed(2)}
              </span>
            </div>

            {addShippingCost && (
              <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-100 dark:border-orange-900/30">
                <span className="text-sm font-medium text-orange-800 dark:text-orange-300">Logistics Payable</span>
                <span className="text-base font-semibold tabular-nums text-orange-700 dark:text-orange-400">
                  + £{computedLogisticsPayable.toFixed(2)}
                </span>
              </div>
            )}

            {Number(discount || 0) > 0 && (
              <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-950/20 rounded-md border border-rose-100 dark:border-rose-900/30">
                <span className="text-sm font-medium text-rose-800 dark:text-rose-300">Discount</span>
                <span className="text-base font-semibold tabular-nums text-rose-700 dark:text-rose-400">
                  - £{Number(discount).toFixed(2)}
                </span>
              </div>
            )}

            {applyVat && (
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-100 dark:border-blue-900/30">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">VAT (20%)</span>
                <span className="text-base font-semibold tabular-nums text-blue-700 dark:text-blue-400">
                  + £{totals.totalVAT.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center p-3 bg-primary/5 dark:bg-primary/10 rounded-md border-2 border-primary/20">
              <span className="text-sm font-bold text-primary">Grand Total</span>
              <span className="text-xl font-bold tabular-nums text-primary">
                £{totals.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Middle: Input fields */}
          <div className="space-y-3">
            <div className="rounded-md border border-border p-3 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="add-shipping-cost"
                  checked={addShippingCost}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setAddShippingCost(checked)
                    if (!checked) {
                      setBuyerShippingCharge(0)
                      setShippingBoxes(0)
                      setLogisticsCompanyId("")
                    }
                  }}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary mt-0.5 flex-shrink-0"
                />
                <Label htmlFor="add-shipping-cost" className="text-sm font-semibold cursor-pointer">
                  Add Shipping Cost
                </Label>
              </div>

              {addShippingCost && (
                <div className="space-y-3 pl-7">

                  <div className="space-y-2">
                    <Label htmlFor="shipping-boxes">Number of Boxes</Label>
                    <Input
                      id="shipping-boxes"
                      type="text"
                      inputMode="numeric"
                      value={shippingBoxes}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/[^0-9]/g, '')
                        setShippingBoxes(sanitized === '' ? '' : Number(sanitized))
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10)
                        setShippingBoxes(!isNaN(val) ? val : 0)
                      }}
                      placeholder=""
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sale-logistics-company">Logistics Company</Label>
                    <Select
                      value={logisticsCompanyId || undefined}
                      onValueChange={(value) => setLogisticsCompanyId(value || "")}
                      disabled={isLoadingLogisticsCompanies}
                    >
                      <SelectTrigger id="sale-logistics-company">
                        <SelectValue placeholder={isLoadingLogisticsCompanies ? "Loading..." : "Select logistics company"} />
                      </SelectTrigger>
                      <SelectContent>
                        {logisticsCompanies.map((company) => (
                          <SelectItem
                            key={String(company._id || company.id)}
                            value={String(company._id || company.id)}
                          >
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="apply-vat"
                  checked={applyVat}
                  onChange={(e) => setApplyVat(e.target.checked)}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary mt-0.5 flex-shrink-0"
                />
                <Label htmlFor="apply-vat" className="text-sm font-semibold cursor-pointer">
                  Apply VAT (20%)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground pl-7">
                VAT applies to goods after discount. Shipping is excluded.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                type="text"
                inputMode="decimal"
                step="0.01"
                value={discount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers and one decimal point
                  const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                  setDiscount(sanitized);
                }}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  setDiscount(!isNaN(val) ? val : 0);
                }}
                onKeyDown={(e) => handlePaymentKeyDown(e, "discount")}
                placeholder=""
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cash">Cash Payment</Label>
              <Input
                id="cash"
                ref={cashInputRef}
                type="text"
                inputMode="decimal"
                step="0.01"
                value={cash}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers and one decimal point
                  const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                  setCash(sanitized);
                }}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  setCash(!isNaN(val) ? val : 0);
                }}
                onKeyDown={(e) => handlePaymentKeyDown(e, "cash")}
                placeholder=""
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
                type="text"
                inputMode="decimal"
                step="0.01"
                value={bank}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers and one decimal point
                  const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                  setBank(sanitized);
                }}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  setBank(!isNaN(val) ? val : 0);
                }}
                onKeyDown={(e) => handlePaymentKeyDown(e, "bank")}
                placeholder=""
                className="text-lg"
              />
            </div>
            <div className={`flex justify-between items-center p-3 rounded-md border-2 ${totals.remaining < 0
              ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
              }`}>
              <span className="text-sm font-medium">
                {totals.remaining < 0 ? 'Remaining Balance' : 'Remaining Balance'}
              </span>
              <span className={`text-lg font-bold tabular-nums ${totals.remaining < 0
                ? 'text-green-700 dark:text-green-400'
                : 'text-amber-700 dark:text-amber-400'
                }`}>
                £{totals.remaining.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Edit request panel for non-super-admin in edit mode */}
        {showEditRequestPanel && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-violet-200 bg-violet-50/60 px-5 py-4">
            <p className="text-sm text-violet-700 font-medium flex items-center gap-2">
              <FilePen className="h-4 w-4" />
              Your changes will be submitted as a request for Super Admin approval
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Reason for change (required)"
                value={editRequestReason}
                onChange={(e) => setEditRequestReason(e.target.value)}
                className="flex-1 h-9 px-3 text-sm rounded-md border border-violet-300 focus:border-violet-500 focus:outline-none bg-white"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowEditRequestPanel(false); setEditRequestReason(""); setPendingPayload(null) }}
                disabled={isSubmittingRequest}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitEditRequest}
                disabled={isSubmittingRequest || !editRequestReason.trim()}
                className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
              >
                {isSubmittingRequest ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FilePen className="h-3.5 w-3.5" />
                    Submit Edit Request
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

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
                setAddShippingCost(false)
                setBuyerShippingCharge(0)
                setShippingBoxes(0)
                setLogisticsCompanyId("")
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
              ) : isEditMode ? (
                isSuperAdmin ? 'Update Sale' : 'Request Changes'
              ) : (
                'Save Selling'
              )}
            </Button>
          </div>
        </div>
      </section >

      {/* Add Buyer Dialog */}
      < Dialog open={showAddBuyer} onOpenChange={setShowAddBuyer} >
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
              <Label htmlFor="new-buyer-company">Company Name <span className="text-red-500">*</span></Label>
              <Input
                id="new-buyer-company"
                value={newBuyerCompany}
                onChange={e => setNewBuyerCompany(e.target.value)}
                placeholder="Enter company name"
                disabled={isCreatingBuyer}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-buyer-email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="new-buyer-email"
                type="email"
                value={newBuyerEmail}
                onChange={e => setNewBuyerEmail(e.target.value)}
                placeholder="Enter email address"
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
            <div className="space-y-2">
              <Label htmlFor="new-buyer-address">Address</Label>
              <Input
                id="new-buyer-address"
                value={newBuyerAddress}
                onChange={(e) => setNewBuyerAddress(e.target.value)}
                placeholder="Enter address"
                disabled={isCreatingBuyer}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddBuyer(false)
                setNewBuyerName("")
                setNewBuyerCompany("")
                setNewBuyerEmail("")
                setNewBuyerPhone("")
                setNewBuyerPhoneAreaCode("")
                setNewBuyerAddress("")
              }}
              disabled={isCreatingBuyer}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddBuyer}
              disabled={isCreatingBuyer || !newBuyerName.trim() || !newBuyerEmail.trim() || !newBuyerPhone.trim()}
            >
              {isCreatingBuyer ? 'Creating...' : 'Create Buyer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Packet Stock Selection Modal */}
      < PacketStockSelectionModal
        open={showProductModal}
        onClose={() => setShowProductModal(false)
        }
        onSelect={(cartRow) => {
          // Check if packet barcode already exists in cart
          const existingRowIndex = rows.findIndex(row => row.packetBarcode === cartRow.packetBarcode)

          if (existingRowIndex !== -1) {
            // Barcode already in cart - increment quantity if within available limit
            const existingRow = rows[existingRowIndex]
            const newQty = (existingRow.quantity || 1) + 1

            if (newQty > existingRow.availablePackets) {
              setError(`Cannot add more. Max available: ${existingRow.availablePackets} packets of ${existingRow.packetBarcode}`)
              return
            }

            // Update quantity of existing row
            updateRow(existingRow.id, 'quantity', newQty)
          } else {
            // New barcode - add to cart
            setRows((r) => [...r, cartRow])
          }
        }}
      />

      {/* Break Packet Dialog - for selling partial packets */}
      <BreakPacketDialog
        open={!!packetToBreak}
        onOpenChange={(open) => !open && setPacketToBreak(null)}
        packet={packetToBreak}
        onSuccess={(result) => {
          const sourcePacketBarcode = packetToBreak?.barcode || null
          const resolvedLooseStockBarcodes = Array.isArray(result?.looseStocks)
            ? result.looseStocks.map((stock) => stock?.barcode).filter(Boolean)
            : []
          const fallbackBarcode = result?.looseStock?.barcode
          if (fallbackBarcode && !resolvedLooseStockBarcodes.includes(fallbackBarcode)) {
            resolvedLooseStockBarcodes.push(fallbackBarcode)
          }
          // After breaking, add the sold items to cart as individual item sales
          if (result?.itemsSold && result.itemsSold.length > 0 && packetToBreak) {
            // Calculate total items sold
            const totalItemsSold = result.itemsSold.reduce((sum, item) => sum + item.quantity, 0)
            const pricePerItem = Number(packetToBreak.suggestedSellingPrice) / (packetToBreak.totalItemsPerPacket || 1)

            // Add broken items as a loose stock row (items sold individually)
            const brokenRow = {
              id: Date.now(),
              productId: packetToBreak.product?._id,
              productName: packetToBreak.product?.name || 'Unknown Product',
              productCode: packetToBreak.product?.productCode || '',
              unitPrice: Number(pricePerItem).toFixed(2),
              quantity: totalItemsSold, // Number of individual items
              photo: packetToBreak.product?.images?.[0] || null,
              totalPrice: Number(pricePerItem * totalItemsSold),
              // Mark as broken packet sale
              isPacketSale: false, // Individual items, not packet
              fromBrokenPacket: true,
              originalPacketBarcode: packetToBreak.barcode,
              looseStockBarcode: resolvedLooseStockBarcodes[0] || null,
              itemsSoldBreakdown: result.itemsSold, // Keep breakdown for reference
              supplierName: packetToBreak.supplier?.name || ''
            }

            setRows((r) => [...r, brokenRow])
          }

          if (resolvedLooseStockBarcodes.length > 0) {
            setLooseStockBarcodes(resolvedLooseStockBarcodes)
            setLooseStockSourcePacket(sourcePacketBarcode)
            setShowLooseStockBarcodeModal(true)
          }
          setPacketToBreak(null)
        }}
        mode="sale"
      />

      <LooseStockBarcodeModal
        open={showLooseStockBarcodeModal}
        onOpenChange={(open) => {
          setShowLooseStockBarcodeModal(open)
          if (!open) {
            setLooseStockBarcodes([])
            setLooseStockSourcePacket(null)
          }
        }}
        barcodes={looseStockBarcodes}
        sourcePacketBarcode={looseStockSourcePacket}
      />
    </div >
  )
}