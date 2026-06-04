// "use client"

// import { useState, useMemo, useEffect } from "react"
// import Link from "next/link"
// import { useRouter, useSearchParams } from "next/navigation"
// import BackButton from "@/components/BackButton"
// import Tabs from "@/components/tabs"
// import { Button } from "@/components/ui/button"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Label } from "@/components/ui/label"
// import { Input } from "@/components/ui/input"
// import { Textarea } from "@/components/ui/textarea"
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
// import DataTable from "../../../components/data-table"
// import { useSuppliers, useAllSuppliers, useSupplier } from "@/lib/hooks/useSuppliers"
// import { useSupplierLedger, useAllSupplierLedgers } from "@/lib/hooks/useLedger"
// import { ledgerAPI } from "@/lib/api/endpoints/ledger"
// import { dispatchOrdersAPI } from "@/lib/api/endpoints/dispatchOrders"
// import { balancesAPI } from "@/lib/api/endpoints/balances"
// import { useQuery } from "@tanstack/react-query"
// import { Loader2, Plus, FileText, Users, Search, Filter, Building2, Clock, CheckCircle2, RotateCcw, Calendar, Download, Printer } from "lucide-react"
// import jsPDF from "jspdf"
// import autoTable from "jspdf-autotable"
// import { Badge } from "@/components/ui/badge"
// import { useQueryClient } from "@tanstack/react-query"
// import toast from "react-hot-toast"
// import SupplierPaymentModal from "@/components/modals/SupplierPaymentModal"
// import ManualSupplierDebtModal from "@/components/modals/ManualSupplierDebtModal"
// import { useAuthStore } from "@/store/store"
// import DeleteRequestDialog from "@/components/modals/DeleteRequestDialog"
// import SupplierPaymentReceiptModal from "@/components/modals/SupplierPaymentReceiptModal"
// import { Check, ChevronsUpDown } from "lucide-react"
// import { cn } from "@/lib/utils"
// import {
//   Command,
//   CommandEmpty,
//   CommandGroup,
//   CommandInput,
//   CommandItem,
//   CommandList,
// } from "@/components/ui/command"
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover"

// function formatNumber(n) {
//   const num = Number(n || 0)
//   return num.toFixed(2)
// }

// function currency(n) {
//   const num = Number(n || 0)
//   return `${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
// }



// function formatDateTime(_date) {
//   const dateTime = _date.date || _date.createdAt;
//   if (!dateTime) return "-";
//   const d = new Date(dateTime);
//   const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
//   const date = d.toLocaleDateString('en-GB');
//   return `${date} ${time}`;
//   // return new Date(_date).toLocaleDateString('en-GB');
// }

// export default function SupplierLedgerPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const initialTab = Number(searchParams.get("tab") ?? 0);
//   const [selectedSupplierId, setSelectedSupplierId] = useState(""); // Default to empty - require supplier selection
//   const [selectedDispatchOrderId, setSelectedDispatchOrderId] = useState("none");
//   const [activeTab, setActiveTab] = useState(initialTab);
//   const handleTabChange = (idx) => {
//     setActiveTab(idx);
//     if (router) router.replace(`/supplier-ledger?tab=${idx}`, { scroll: false });
//   };
//   const [isDialogOpen, setIsDialogOpen] = useState(false)
//   const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
//   const [markAsPaidDialog, setMarkAsPaidDialog] = useState({ open: false, balance: null })
//   const [markAsPaidForm, setMarkAsPaidForm] = useState({ method: 'cash', amount: '' })
//   const [isMarkingAsPaid, setIsMarkingAsPaid] = useState(false)
//   const [paymentForm, setPaymentForm] = useState({
//     amount: '',
//     date: '',
//     description: '',
//     method: 'cash' // Default to cash
//   })

//   // Universal payment modal state
//   const [universalPaymentOpen, setUniversalPaymentOpen] = useState(false)
//   const [manualDebtOpen, setManualDebtOpen] = useState(false)

//   // Auth and delete request state
//   const user = useAuthStore((s) => s.user)
//   const isSuperAdmin = user?.role === "super-admin"
//   const [deleteReceiptTarget, setDeleteReceiptTarget] = useState(null)

//   // Direct reversal state (super-admin)
//   const [receiptReversalDialogOpen, setReceiptReversalDialogOpen] = useState(false)
//   const [selectedReceipt, setSelectedReceipt] = useState(null)
//   const [receiptReversalReason, setReceiptReversalReason] = useState('')
//   const [isReversingReceipt, setIsReversingReceipt] = useState(false)

//   // Filter for Tab 1 - Supplier Ledger
//   const [ledgerSupplierFilter, setLedgerSupplierFilter] = useState("")
//   const [ledgerFilterBy, setLedgerFilterBy] = useState("all")
//   const [ledgerSearch, setLedgerSearch] = useState("")
//   const [supplierOpen, setSupplierOpen] = useState(false)
//   const [pendingPaymentSupplierOpen, setPendingPaymentSupplierOpen] = useState(false)
//   const [paymentHistorySupplierOpen, setPaymentHistorySupplierOpen] = useState(false)

//   // Filters for Tab 2 (Pending Payments)
//   const [dateFrom, setDateFrom] = useState("")
//   const [dateTo, setDateTo] = useState("")
//   const [transactionTypeFilter, setTransactionTypeFilter] = useState("all")
//   const [paymentMethodFilter, setPaymentMethodFilter] = useState("all")

//   // Filters for Tab 3 (Payment History)
//   const [paymentHistorySupplier, setPaymentHistorySupplier] = useState("")
//   const [paymentHistoryDateFrom, setPaymentHistoryDateFrom] = useState("")
//   const [paymentHistoryDateTo, setPaymentHistoryDateTo] = useState("")
//   const [paymentHistoryMethodFilter, setPaymentHistoryMethodFilter] = useState("all")
//   const [receiptSupplierId, setReceiptSupplierId] = useState("")
//   const [receiptSupplierOpen, setReceiptSupplierOpen] = useState(false)
//   const [supplierReceiptModalOpen, setSupplierReceiptModalOpen] = useState(false)
//   const [selectedSupplierReceipt, setSelectedSupplierReceipt] = useState(null)
//   const [isLoadingSupplierReceipt, setIsLoadingSupplierReceipt] = useState(false)

//   const queryClient = useQueryClient()

//   // Auto-select supplier from URL query param (e.g. navigating from Payables report)
//   useEffect(() => {
//     const supplierId = searchParams.get('supplierId')
//     if (supplierId) {
//       setLedgerSupplierFilter(supplierId)
//       setSelectedSupplierId(supplierId)
//       setPaymentHistorySupplier(supplierId)
//       setReceiptSupplierId(supplierId)
//     }
//   }, [searchParams])

//   useEffect(() => {
//     if (selectedSupplierId && !receiptSupplierId) {
//       setReceiptSupplierId(selectedSupplierId)
//     }
//   }, [selectedSupplierId, receiptSupplierId])

//   // Fetch suppliers with user accounts for Tab 1 table
//   const { data: suppliersWithUsers = [], isLoading: suppliersLoading } = useSuppliers()

//   // Fetch ALL suppliers for Tab 2 dropdown (including those without user accounts)
//   const { data: allSuppliers = [], isLoading: allSuppliersLoading } = useAllSuppliers({ limit: 100 })

//   // Use allSuppliers for dropdown, suppliersWithUsers for Tab 1 table
//   const suppliers = suppliersWithUsers
//   const dropdownSuppliers = allSuppliers

//   // Fetch supplier ledger entries for Tab 1 (when a supplier or "all" is selected)
//   const ledgerFilterParams = useMemo(() => {
//     if (!ledgerSupplierFilter) {
//       return null // Don't fetch if no supplier selected
//     }
//     if (ledgerSupplierFilter === 'all') {
//       return { limit: 500 } // Fetch all suppliers
//     }
//     return { supplierId: ledgerSupplierFilter, limit: 100 }
//   }, [ledgerSupplierFilter])

//   const { data: allLedgerData, isLoading: allLedgerLoading } = useAllSupplierLedgers(ledgerFilterParams || {})

//   // Fetch selected supplier details and transactions for Tab 2
//   const { data: supplierDetails, isLoading: supplierDetailsLoading } = useSupplier(
//     selectedSupplierId && selectedSupplierId !== 'all' ? selectedSupplierId : ''
//   )

//   // Fetch ledger entries for the selected supplier in Tab 2 (only when a supplier is selected)
//   const paymentLedgerParams = useMemo(() => {
//     if (!selectedSupplierId || selectedSupplierId === 'all') {
//       return null // Don't fetch if no supplier selected
//     }
//     return { supplierId: selectedSupplierId }
//   }, [selectedSupplierId])

//   const { data: ledgerData, isLoading: ledgerLoading } = useSupplierLedger(
//     selectedSupplierId && selectedSupplierId !== 'all' ? selectedSupplierId : ''
//   )

//   // Don't fetch all payment entries - require supplier selection
//   const shouldFetchAllPayments = false
//   const { data: allPaymentLedgerData, isLoading: allPaymentLedgerLoading } = useAllSupplierLedgers(
//     shouldFetchAllPayments ? (paymentLedgerParams || {}) : {}
//   )

//   // Fetch unpaid dispatch orders for selected supplier
//   const { data: unpaidDispatchOrders = [], isLoading: unpaidOrdersLoading } = useQuery({
//     queryKey: ['unpaid-dispatch-orders', selectedSupplierId],
//     queryFn: async () => {
//       if (!selectedSupplierId || selectedSupplierId === 'all') return []
//       const response = await dispatchOrdersAPI.getUnpaidBySupplier(selectedSupplierId)
//       return response?.data?.data || response?.data || []
//     },
//     enabled: !!selectedSupplierId && selectedSupplierId !== 'all'
//   })

//   // Get selected dispatch order details
//   const selectedDispatchOrder = useMemo(() => {
//     if (!selectedDispatchOrderId || selectedDispatchOrderId === 'none') return null
//     return unpaidDispatchOrders.find(order => order._id === selectedDispatchOrderId)
//   }, [selectedDispatchOrderId, unpaidDispatchOrders])

//   // Fetch pending balances (only when a specific supplier is selected)
//   const { data: pendingBalancesData, isLoading: pendingBalancesLoading, error: pendingBalancesError } = useQuery({
//     queryKey: ['pending-balances', selectedSupplierId],
//     queryFn: async () => {
//       try {
//         const response = await balancesAPI.getPendingBalances(selectedSupplierId)
//         console.log('Pending balances API response:', response)
//         // API response structure: { success: true, data: { balances: [], totals: {} }, message: "...", timestamp: "..." }
//         const result = response?.data?.data || response?.data || { balances: [], totals: { cashPending: 0, bankPending: 0, totalPending: 0 } }
//         console.log('Processed pending balances data:', result)
//         return result
//       } catch (error) {
//         console.error('Error fetching pending balances:', error)
//         throw error
//       }
//     },
//     enabled: activeTab === 1 && !!selectedSupplierId && selectedSupplierId !== 'all' // Only fetch when Tab 2 is active AND supplier selected
//   })

//   const pendingBalances = pendingBalancesData?.balances || []
//   const pendingTotals = pendingBalancesData?.totals || { cashPending: 0, bankPending: 0, totalPending: 0, totalPaid: 0 }

//   // Map pending balances with entry numbers from ledger data
//   const pendingBalancesWithEntryNumbers = useMemo(() => {
//     const entries = allLedgerData?.entries || ledgerData?.entries || []

//     // Create a map: referenceId -> entryNumber for purchase entries
//     const purchaseEntryMap = new Map()
//     entries.forEach(entry => {
//       if (entry.transactionType === 'purchase' && entry.referenceId) {
//         const refId = typeof entry.referenceId === 'object' && entry.referenceId !== null
//           ? entry.referenceId._id?.toString() || entry.referenceId.toString()
//           : entry.referenceId.toString()
//         purchaseEntryMap.set(refId, entry.entryNumber || '-')
//       }
//     })

//     return pendingBalances.map(balance => {
//       // Normalize referenceId for matching
//       const refIdOrId = balance.referenceId || balance.id
//       const balanceRefId = refIdOrId
//         ? (typeof refIdOrId === 'object' && refIdOrId !== null
//           ? refIdOrId._id?.toString() || refIdOrId.toString()
//           : refIdOrId.toString())
//         : null

//       return {
//         ...balance,
//         entryNumber: balanceRefId ? (purchaseEntryMap.get(balanceRefId) || '-') : '-'
//       }
//     })
//   }, [pendingBalances, allLedgerData, ledgerData])

//   // Fetch payment history for Tab 3 (only when a supplier is selected)
//   const paymentHistoryParams = useMemo(() => {
//     if (!paymentHistorySupplier || paymentHistorySupplier === 'all') {
//       return null // Don't fetch if no supplier selected
//     }
//     return { supplierId: paymentHistorySupplier, limit: 100 }
//   }, [paymentHistorySupplier])

//   const { data: paymentHistoryData, isLoading: paymentHistoryLoading } = useAllSupplierLedgers(paymentHistoryParams || {})

//   const receiptQuerySupplierId = receiptSupplierId || paymentHistorySupplier
//   const { data: supplierReceiptsData, isLoading: supplierReceiptsLoading, error: supplierReceiptsError, refetch: refetchSupplierReceipts } = useQuery({
//     queryKey: ['supplier-payment-receipts', receiptQuerySupplierId],
//     queryFn: async () => {
//       if (!receiptQuerySupplierId || receiptQuerySupplierId === 'all') return { receipts: [] }
//       const response = await ledgerAPI.getSupplierPaymentReceipts(receiptQuerySupplierId, { limit: 100 })
//       return response?.data?.data || response?.data || { receipts: [] }
//     },
//     enabled: (activeTab === 2 || activeTab === 3) && !!receiptQuerySupplierId && receiptQuerySupplierId !== 'all'
//   })

//   // Calculate totals from displayed rows (matching Total Balances logic)
//   const calculatedCashPending = pendingBalances.reduce((sum, balance) => {
//     return sum + (balance.cashPending || 0)
//   }, 0)

//   const calculatedBankPending = pendingBalances.reduce((sum, balance) => {
//     return sum + (balance.bankPending || 0)
//   }, 0)

//   const calculatedTotalPending = calculatedCashPending + calculatedBankPending

//   // Calculate outstanding balance for selected supplier from pendingBalances
//   const calculatedOutstandingBalance = useMemo(() => {
//     if (selectedSupplierId === 'all' || !selectedSupplierId) {
//       return 0
//     }
//     return pendingBalances
//       .filter(balance => {
//         const balanceSupplierId = balance.supplierId || balance.supplier?._id || balance.supplier?.id
//         return String(balanceSupplierId) === String(selectedSupplierId)
//       })
//       .reduce((sum, balance) => sum + (balance.amount || 0), 0)
//   }, [pendingBalances, selectedSupplierId])

//   // Transform payment history for Tab 3
//   const paymentHistoryTransactions = useMemo(() => {
//     if (!paymentHistoryData?.entries) return []

//     // Filter to only payment entries
//     const paymentEntries = paymentHistoryData.entries.filter(entry =>
//       entry.transactionType === 'payment'
//     )

//     // Apply date filters
//     let filtered = paymentEntries
//     if (paymentHistoryDateFrom) {
//       const fromDate = new Date(paymentHistoryDateFrom)
//       filtered = filtered.filter(entry => {
//         const entryDate = new Date(entry.date || entry.createdAt)
//         return entryDate >= fromDate
//       })
//     }
//     if (paymentHistoryDateTo) {
//       const toDate = new Date(paymentHistoryDateTo)
//       toDate.setHours(23, 59, 59, 999)
//       filtered = filtered.filter(entry => {
//         const entryDate = new Date(entry.date || entry.createdAt)
//         return entryDate <= toDate
//       })
//     }

//     // Apply payment method filter
//     if (paymentHistoryMethodFilter !== 'all') {
//       filtered = filtered.filter(entry => entry.paymentMethod === paymentHistoryMethodFilter)
//     }

//     return filtered.map(entry => {
//       const supplier = entry.entityId || {}
//       const supplierName = supplier.name || supplier.company || 'Unknown Supplier'

//       // Get order reference
//       let reference = '-'
//       if (entry.referenceId) {
//         if (typeof entry.referenceId === 'object' && entry.referenceId !== null) {
//           reference = entry.referenceId.orderNumber || entry.referenceId.purchaseNumber || entry.referenceId._id || '-'
//         } else {
//           reference = entry.referenceId.toString()
//         }
//       }

//       // Get made by user
//       const madeBy = entry.createdBy?.name || 'Unknown'

//       return {
//         id: entry._id || entry.id,
//         date: entry.date || entry.createdAt,
//         supplierName,
//         supplierId: supplier._id || supplier.id,
//         reference,
//         paymentMethod: entry.paymentMethod || 'cash',
//         amount: entry.credit || 0,
//         madeBy,
//         notes: entry.description || entry.remarks || '-',
//         entryNumber: entry.entryNumber || '-',
//         raw: entry
//       }
//     })
//   }, [paymentHistoryData, paymentHistoryDateFrom, paymentHistoryDateTo, paymentHistoryMethodFilter])

//   // Calculate payment summary for Tab 3
//   const paymentSummary = useMemo(() => {
//     const total = paymentHistoryTransactions.reduce((sum, txn) => sum + (txn.amount || 0), 0)
//     const cash = paymentHistoryTransactions
//       .filter(txn => txn.paymentMethod === 'cash')
//       .reduce((sum, txn) => sum + (txn.amount || 0), 0)
//     const bank = paymentHistoryTransactions
//       .filter(txn => txn.paymentMethod === 'bank')
//       .reduce((sum, txn) => sum + (txn.amount || 0), 0)

//     // Count payments this month
//     const now = new Date()
//     const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
//     const countThisMonth = paymentHistoryTransactions.filter(txn => {
//       const txnDate = new Date(txn.date)
//       return txnDate >= firstDayOfMonth
//     }).length

//     return { total, cash, bank, countThisMonth }
//   }, [paymentHistoryTransactions])

//   // Build a lookup map: ledgerEntryId -> receipt info for the receipt column in payment history
//   const receiptByLedgerEntryId = useMemo(() => {
//     const map = new Map()
//     const receipts = supplierReceiptsData?.receipts || []
//     for (const receipt of receipts) {
//       if (!receipt.distributions) continue
//       for (const dist of receipt.distributions) {
//         if (dist.ledgerEntryId) {
//           map.set(String(dist.ledgerEntryId), {
//             receiptNumber: receipt.receiptNumber,
//             distributions: receipt.distributions,
//             totalAmount: receipt.totalAmount
//           })
//         }
//       }
//     }
//     return map
//   }, [supplierReceiptsData])

//   const supplierReceiptTransactions = useMemo(() => {
//     const receipts = supplierReceiptsData?.receipts || []

//     return receipts.map(receipt => {
//       const supplier = receipt.supplierId || {}
//       const supplierName = supplier.name || supplier.company || 'Unknown Supplier'

//       return {
//         id: receipt._id || receipt.id || receipt.receiptNumber,
//         receiptNumber: receipt.receiptNumber,
//         date: receipt.date || receipt.createdAt,
//         supplierName,
//         supplierId: supplier._id || supplier.id || receipt.supplierId,
//         totalAmount: receipt.totalAmount || 0,
//         cashAmount: receipt.cashAmount || 0,
//         bankAmount: receipt.bankAmount || 0,
//         methodSummary: receipt.paymentMethodSummary || ((receipt.cashAmount > 0 && receipt.bankAmount > 0) ? 'cash + bank' : receipt.cashAmount > 0 ? 'cash' : 'bank'),
//         status: receipt.status || 'active',
//         createdBy: receipt.createdBy?.name || 'Unknown',
//         ordersAffected: receipt.ordersAffected || 0,
//         advanceAmount: receipt.advanceAmount || 0,
//         balanceBefore: receipt.balanceBefore,
//         balanceAfter: receipt.balanceAfter,
//         notes: receipt.notes || '-',
//         raw: receipt
//       }
//     })
//   }, [supplierReceiptsData])

//   const supplierReceiptSummary = useMemo(() => {
//     const total = supplierReceiptTransactions.reduce((sum, receipt) => sum + (receipt.totalAmount || 0), 0)
//     const advance = supplierReceiptTransactions.reduce((sum, receipt) => sum + (receipt.advanceAmount || 0), 0)
//     const cash = supplierReceiptTransactions.reduce((sum, receipt) => sum + (receipt.cashAmount || 0), 0)
//     const bank = supplierReceiptTransactions.reduce((sum, receipt) => sum + (receipt.bankAmount || 0), 0)
//     return { total, advance, cash, bank }
//   }, [supplierReceiptTransactions])

//   const handleViewSupplierReceipt = async (receiptRow) => {
//     const supplierId = receiptSupplierId || receiptRow.raw?.supplierId?._id || receiptRow.raw?.supplierId
//     if (!supplierId) {
//       toast.error('Select a supplier to view the receipt')
//       return
//     }

//     setIsLoadingSupplierReceipt(true)
//     try {
//       const response = await ledgerAPI.getSupplierPaymentReceipt(supplierId, receiptRow.receiptNumber)
//       setSelectedSupplierReceipt(response?.data?.data || response?.data || null)
//       setSupplierReceiptModalOpen(true)
//     } catch (error) {
//       console.error('Error fetching supplier payment receipt:', error)
//       toast.error(error.response?.data?.message || 'Failed to load supplier payment receipt')
//     } finally {
//       setIsLoadingSupplierReceipt(false)
//     }
//   }

//   // Debug logging
//   console.log('Pending balances state:', {
//     activeTab,
//     selectedSupplierId,
//     pendingBalancesLoading,
//     pendingBalancesError: pendingBalancesError?.message,
//     pendingBalancesData,
//     pendingBalances,
//     pendingTotals
//   })

//   // Handle row click to select supplier and switch to Tab 2
//   const handleSupplierRowClick = (supplier) => {
//     setSelectedSupplierId(String(supplier.id))
//     setActiveTab(1) // Switch to Tab 2
//   }

//   // Supplier Ledger Table Columns (All Suppliers) - Make rows clickable
//   const supplierLedgerColumns = useMemo(
//     () => [
//       {
//         header: "Supplier No",
//         accessor: "id",
//         render: (row) => String(row.id).slice(-6)
//       },
//       {
//         header: "Supplier Name",
//         accessor: "name",
//         render: (row) => (
//           <div>
//             <div className="font-medium">{row.name}</div>
//             {row.company && <div className="text-sm text-muted-foreground">{row.company}</div>}
//           </div>
//         )
//       },
//       {
//         header: "Balance",
//         accessor: "balance",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${row.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
//             {formatNumber(Math.abs(row.balance || 0))}
//           </span>
//         )
//       }
//     ],
//     []
//   )

//   // Transform transactions for detailed ledger table with filters
//   const transactions = useMemo(() => {
//     // If "all" suppliers selected, use all ledger data; otherwise use supplier-specific data
//     const isAllSuppliers = selectedSupplierId === 'all'
//     const supplierTransactions = isAllSuppliers ? [] : (supplierDetails?.transactions || [])
//     const ledgerEntries = isAllSuppliers
//       ? (allPaymentLedgerData?.entries || [])
//       : (ledgerData?.entries || [])

//     // Merge and sort by date
//     let allTransactions = [
//       ...supplierTransactions.map(txn => ({
//         ...txn,
//         source: 'supplier',
//         _id: txn._id || txn.id,
//       })),
//       ...ledgerEntries.map(entry => ({
//         ...entry,
//         source: 'ledger',
//         type: entry.transactionType || entry.type,
//         _id: entry._id || entry.id,
//       }))
//     ].sort((a, b) => {
//       const dateA = new Date(a.date || a.transactionDate || a.createdAt || 0)
//       const dateB = new Date(b.date || b.transactionDate || b.createdAt || 0)
//       return dateB - dateA
//     })

//     // Apply filters
//     if (dateFrom) {
//       const fromDate = new Date(dateFrom)
//       allTransactions = allTransactions.filter(txn => {
//         const txnDate = new Date(txn.date || txn.transactionDate || txn.createdAt)
//         return txnDate >= fromDate
//       })
//     }

//     if (dateTo) {
//       const toDate = new Date(dateTo)
//       toDate.setHours(23, 59, 59, 999) // Include entire end date
//       allTransactions = allTransactions.filter(txn => {
//         const txnDate = new Date(txn.date || txn.transactionDate || txn.createdAt)
//         return txnDate <= toDate
//       })
//     }

//     if (transactionTypeFilter !== 'all') {
//       allTransactions = allTransactions.filter(txn => {
//         const txnType = txn.transactionType || txn.type || ''
//         return txnType.toLowerCase() === transactionTypeFilter.toLowerCase()
//       })
//     }

//     if (paymentMethodFilter !== 'all') {
//       allTransactions = allTransactions.filter(txn => {
//         return txn.paymentMethod === paymentMethodFilter
//       })
//     }

//     // Filter to show payment and adjustment entries (for history tab)
//     allTransactions = allTransactions.filter(txn => {
//       return txn.transactionType === 'payment' || txn.type === 'payment' || txn.transactionType === 'adjustment'
//     })

//     return allTransactions.map(txn => {
//       // Determine transaction type label
//       let typeLabel = txn.type || txn.transactionType || '-'
//       if (txn.transactionType === 'adjustment') {
//         typeLabel = 'Supplier Debt'
//       } else if (txn.referenceModel === 'DispatchOrder') {
//         if (txn.transactionType === 'payment') {
//           typeLabel = `Payment (${txn.paymentMethod === 'cash' ? 'Cash' : 'Bank'})`
//         } else {
//           typeLabel = 'Dispatch Order Confirmation'
//         }
//       } else if (txn.referenceModel === 'Return') {
//         typeLabel = 'Return'
//       } else if (txn.referenceModel === 'Purchase') {
//         typeLabel = 'Purchase'
//       } else if (txn.transactionType === 'payment') {
//         typeLabel = `Payment (${txn.paymentMethod === 'cash' ? 'Cash' : txn.paymentMethod === 'bank' ? 'Bank' : 'Unknown'})`
//       }

//       // Extract payment details
//       const paymentDetails = txn.paymentDetails || {}
//       const cashPayment = paymentDetails.cashPayment || 0
//       const bankPayment = paymentDetails.bankPayment || 0
//       const totalPayment = (txn.credit || 0) // Payment is credit

//       // Get supplier name from entityId
//       let supplierName = '-'
//       if (txn.entityId) {
//         if (typeof txn.entityId === 'object' && txn.entityId !== null) {
//           supplierName = txn.entityId.name || txn.entityId.company || '-'
//         }
//       } else if (selectedSupplierId && supplierDetails) {
//         supplierName = supplierDetails.name || supplierDetails.company || '-'
//       }

//       // Get product/dispatch details from reference
//       let productDetails = '-'
//       if (txn.referenceModel === 'DispatchOrder' && txn.referenceId) {
//         // For dispatch orders, show order number and product info
//         let orderNumber = '-'
//         if (typeof txn.referenceId === 'object' && txn.referenceId !== null) {
//           orderNumber = txn.referenceId.orderNumber || txn.referenceId._id || '-'
//         } else {
//           orderNumber = txn.referenceId.toString()
//         }
//         productDetails = `Dispatch Order: ${orderNumber}`
//         // If we have product info in description, extract it
//         if (txn.description) {
//           const descMatch = txn.description.match(/(?:Dispatch Order|Order)\s+([A-Z0-9]+)/i)
//           if (descMatch) {
//             productDetails = `DO: ${descMatch[1]}`
//           }
//         }
//       } else if (txn.referenceModel === 'Purchase' && txn.referenceId) {
//         // For purchases, show purchase number
//         let purchaseNumber = '-'
//         if (typeof txn.referenceId === 'object' && txn.referenceId !== null) {
//           purchaseNumber = txn.referenceId.purchaseNumber || txn.referenceId._id || '-'
//         } else {
//           purchaseNumber = txn.referenceId.toString()
//         }
//         productDetails = `Purchase: ${purchaseNumber}`
//       } else if (txn.description) {
//         // Try to extract product info from description
//         const desc = txn.description
//         if (desc.includes('Dispatch Order')) {
//           const match = desc.match(/Dispatch Order\s+([A-Z0-9-]+)/i)
//           if (match) {
//             productDetails = `DO: ${match[1]}`
//           } else {
//             productDetails = 'Dispatch Order'
//           }
//         } else if (desc.includes('Purchase')) {
//           const match = desc.match(/Purchase\s+([A-Z0-9-]+)/i)
//           if (match) {
//             productDetails = `Purchase: ${match[1]}`
//           } else {
//             productDetails = 'Purchase'
//           }
//         } else {
//           productDetails = desc.length > 50 ? desc.substring(0, 50) + '...' : desc
//         }
//       }

//       return {
//         id: txn._id || txn.id,
//         date: txn.date || txn.transactionDate || txn.createdAt,
//         type: typeLabel,
//         transactionType: txn.transactionType || txn.type,
//         description: txn.description || txn.notes || '-',
//         supplierName: supplierName,
//         productDetails: productDetails,
//         paid: totalPayment, // Payment amount (credit)
//         cashPayment: cashPayment,
//         bankPayment: bankPayment,
//         balance: txn.balance || txn.runningBalance || 0,
//         reference: txn.reference || txn.referenceNumber || txn.referenceId || '-',
//         referenceModel: txn.referenceModel || '-',
//         paymentMethod: txn.paymentMethod || null,
//         paymentDetails: paymentDetails,
//         source: txn.source || 'unknown',
//         raw: txn
//       }
//     })
//   }, [supplierDetails, ledgerData, allPaymentLedgerData, dateFrom, dateTo, transactionTypeFilter, paymentMethodFilter, selectedSupplierId])

//   // Payment History Columns for Tab 3
//   const paymentHistoryColumns = useMemo(() => {
//     const columns = [
//       {
//         header: "Date",
//         accessor: "date",
//         render: (row) => formatDateTime(row)
//       }
//     ]

//     columns.push(
//       {
//         header: "Entry Number",
//         accessor: "entryNumber",
//         render: (row) => (
//           <span className="font-medium">{row.entryNumber || '-'}</span>
//         )
//       },
//       {
//         header: "Order Reference",
//         accessor: "reference",
//         render: (row) => (
//           row.raw?.referenceId ? (
//             <Link
//               href={`/dispatch-orders/${typeof row.raw.referenceId === 'object' ? row.raw.referenceId._id : row.raw.referenceId}`}
//               className="font-medium text-blue-600 hover:underline"
//             >
//               {row.reference || '-'}
//             </Link>
//           ) : (
//             <span className="font-medium">{row.reference || '-'}</span>
//           )
//         )
//       },
//       {
//         header: "Method",
//         accessor: "paymentMethod",
//         render: (row) => (
//           <Badge variant="outline" className={row.paymentMethod === 'cash' ? 'border-green-500 text-green-700' : 'border-blue-500 text-blue-700'}>
//             {row.paymentMethod === 'cash' ? 'Cash' : 'Bank'}
//           </Badge>
//         )
//       },
//       {
//         header: "Amount",
//         accessor: "amount",
//         render: (row) => (
//           <span className="tabular-nums font-semibold text-green-600">
//             {formatNumber(row.amount || 0)}
//           </span>
//         )
//       },

//       {
//         header: "Receipt",
//         accessor: "receipt",
//         render: (row) => {
//           const receipt = receiptByLedgerEntryId.get(row.id)
//           if (!receipt) return <span className="text-muted-foreground">{receipt}</span>
//           return (
//             <Button
//               size="sm"
//               variant="outline"
//               className="gap-1.5 text-blue-600 hover:text-blue-700"
//               onClick={() => handleViewSupplierReceipt({ receiptNumber: receipt.receiptNumber, raw: { supplierId: row.supplierId } })}
//               disabled={isLoadingSupplierReceipt}
//             >
//               <FileText className="h-3.5 w-3.5" />
//               {receipt.receiptNumber}
//             </Button>
//           )
//         }
//       },
//       {
//         header: "Notes",
//         accessor: "notes",
//         render: (row) => (
//           <span className="text-sm">{row.notes && row.notes.length > 50 ? row.notes.substring(0, 50) + '...' : row.notes || '-'}</span>
//         )
//       }
//     )

//     return columns
//   }, [receiptByLedgerEntryId, isLoadingSupplierReceipt])

//   const supplierReceiptColumns = useMemo(() => {
//     return [
//       {
//         header: "Receipt #",
//         accessor: "receiptNumber",
//         render: (row) => <span className="font-mono font-medium text-blue-600">{row.receiptNumber}</span>
//       },
//       {
//         header: "Date",
//         accessor: "date",
//         render: (row) => formatDateTime(row)
//       },
//       {
//         header: "Supplier",
//         accessor: "supplierName",
//         render: (row) => <span className="font-medium">{row.supplierName}</span>
//       },
//       {
//         header: "Amount",
//         accessor: "totalAmount",
//         render: (row) => <span className="tabular-nums font-semibold text-green-600">{formatNumber(row.totalAmount)}</span>
//       },
//       {
//         header: "Method",
//         accessor: "methodSummary",
//         render: (row) => <Badge variant="outline" className="uppercase">{row.methodSummary}</Badge>
//       },
//       {
//         header: "Applied",
//         accessor: "ordersAffected",
//         render: (row) => (
//           <span className="text-sm text-muted-foreground">
//             {row.ordersAffected} order{row.ordersAffected === 1 ? '' : 's'}
//             {row.advanceAmount > 0 ? ` + ${formatNumber(row.advanceAmount)} advance` : ''}
//           </span>
//         )
//       },
//       {
//         header: "Created By",
//         accessor: "createdBy",
//         render: (row) => row.createdBy
//       },
//       {
//         header: "Status",
//         accessor: "status",
//         render: (row) => <Badge variant="outline">{row.status.toUpperCase()}</Badge>
//       },
//       {
//         header: "Actions",
//         accessor: "actions",
//         render: (row) => (
//           <div className="flex gap-2">
//             <Button size="sm" variant="outline" onClick={() => handleViewSupplierReceipt(row)} disabled={isLoadingSupplierReceipt}>
//               <Printer className="h-4 w-4" />
//             </Button>
//             {row.status === 'active' && (
//               isSuperAdmin ? (
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
//                   onClick={() => {
//                     setSelectedReceipt(row)
//                     setReceiptReversalReason('')
//                     setReceiptReversalDialogOpen(true)
//                   }}
//                   title="Reverse Receipt"
//                 >
//                   <RotateCcw className="h-4 w-4" />
//                 </Button>
//               ) : (
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   className="text-orange-600 border-orange-400 hover:bg-orange-50"
//                   onClick={() => setDeleteReceiptTarget(row)}
//                   title="Request Deletion"
//                 >
//                   <RotateCcw className="h-4 w-4" />
//                 </Button>
//               )
//             )}
//           </div>
//         )
//       }
//     ]
//   }, [isLoadingSupplierReceipt, isSuperAdmin])

//   // Pending Balance Columns
//   const pendingBalanceColumns = useMemo(() => {
//     const columns = [
//       {
//         header: "Date",
//         accessor: "date",
//         render: (row) => formatDateTime(row)
//       }
//     ]

//     columns.push(
//       {
//         header: "Entry Number",
//         accessor: "entryNumber",
//         render: (row) => (
//           <span className="font-medium">{row.entryNumber || '-'}</span>
//         )
//       },
//       {
//         header: "Reference",
//         accessor: "reference",
//         render: (row) => (
//           row.id ? (
//             <Link
//               href={`/dispatch-orders/${row.id}`}
//               className="font-medium text-blue-600 hover:underline cursor-pointer"
//             >
//               {row.reference || '-'}
//             </Link>
//           ) : (
//             <span className="font-medium">{row.reference || '-'}</span>
//           )
//         )
//       },
//       {
//         header: "Total Amount",
//         accessor: "totalAmount",
//         render: (row) => (
//           <span className="font-semibold">{formatNumber(row.totalAmount || row.amount || 0)}</span>
//         )
//       },
//       {
//         header: "Paid Amount",
//         accessor: "totalPaid",
//         render: (row) => (
//           <span className="tabular-nums text-green-600 font-medium">
//             {formatNumber(row.totalPaid || 0)}
//           </span>
//         )
//       },
//       {
//         header: "Remaining",
//         accessor: "amount",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${(row.amount || 0) > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
//             {formatNumber(row.amount || 0)}
//           </span>
//         )
//       },
//       {
//         header: "Payment Type",
//         accessor: "paymentType",
//         render: (row) => (
//           <Badge variant="outline" className={row.paymentType === 'cash' ? 'border-green-500 text-green-700' : 'border-blue-500 text-blue-700'}>
//             {row.paymentType === 'cash' ? 'Cash' : 'Bank'}
//           </Badge>
//         )
//       },
//       {
//         header: "Status",
//         accessor: "status",
//         render: (row) => {
//           const statusConfig = {
//             paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
//             partial: { label: 'Partial', className: 'bg-orange-100 text-orange-800' },
//             pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' }
//           }
//           const config = statusConfig[row.status] || statusConfig.pending
//           return (
//             <Badge className={config.className}>
//               {config.label}
//             </Badge>
//           )
//         }
//       },

//     )

//     return columns
//   }, [isMarkingAsPaid])

//   const transactionColumns = useMemo(
//     () => [
//       {
//         header: "Date",
//         accessor: "date",
//         render: (row) => formatDateTime(row)
//       },
//       {
//         header: "Supplier Name",
//         accessor: "supplierName",
//         render: (row) => <span className="font-medium">{row.supplierName || '-'}</span>
//       },
//       {
//         header: "Product/Order Details",
//         accessor: "productDetails",
//         render: (row) => (
//           <span className="text-sm text-muted-foreground">{row.productDetails || '-'}</span>
//         )
//       },
//       {
//         header: "Description",
//         accessor: "description",
//         render: (row) => <span className="text-sm">{row.description || '-'}</span>
//       },
//       {
//         header: "Paid",
//         accessor: "paid",
//         render: (row) => row.paid > 0 ? (
//           <span className="tabular-nums text-green-600 font-medium">{formatNumber(row.paid)}</span>
//         ) : (
//           <span className="tabular-nums text-muted-foreground">-</span>
//         )
//       },
//       {
//         header: "Cash Payment",
//         accessor: "cashPayment",
//         render: (row) => row.cashPayment > 0 ? (
//           <span className="tabular-nums text-blue-600 font-medium">{formatNumber(row.cashPayment)}</span>
//         ) : (
//           <span className="tabular-nums text-muted-foreground">-</span>
//         )
//       },
//       {
//         header: "Bank Payment",
//         accessor: "bankPayment",
//         render: (row) => row.bankPayment > 0 ? (
//           <span className="tabular-nums text-purple-600 font-medium">{formatNumber(row.bankPayment)}</span>
//         ) : (
//           <span className="tabular-nums text-muted-foreground">-</span>
//         )
//       },
//       {
//         header: "Balance",
//         accessor: "balance",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${row.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
//             {formatNumber(Math.abs(row.balance))}
//           </span>
//         )
//       }
//     ],
//     []
//   )

//   // Transform all ledger entries for Tab 1 display
//   // Show ALL transactions - purchases, payments, AND returns (complete history)
//   const allLedgerTransactions = useMemo(() => {
//     if (!allLedgerData?.entries) return []

//     // Show purchases, payments, returns, and adjustments (complete ledger history)
//     let filteredEntries = (allLedgerData?.entries || []).filter(entry =>
//       entry.transactionType === 'purchase' ||
//       entry.transactionType === 'payment' ||
//       entry.transactionType === 'return' ||
//       entry.transactionType === 'adjustment'
//     )

//     // Apply Consolidated Filter
//     if (ledgerFilterBy !== 'all') {
//       filteredEntries = filteredEntries.filter(entry => {
//         if (ledgerFilterBy === 'cash') {
//           return entry.transactionType === 'payment' && entry.paymentMethod === 'cash'
//         }
//         if (ledgerFilterBy === 'bank') {
//           return entry.transactionType === 'payment' && entry.paymentMethod === 'bank'
//         }
//         if (ledgerFilterBy === 'return') {
//           return entry.transactionType === 'return'
//         }
//         if (ledgerFilterBy === 'adjustment') {
//           return entry.transactionType === 'adjustment'
//         }
//         if (ledgerFilterBy === 'discount') {
//           // Check if purchase has discount
//           if (entry.transactionType !== 'purchase') return false

//           let hasDiscount = false
//           if (entry.referenceId && typeof entry.referenceId === 'object') {
//             const discount = entry.referenceId.totalDiscount || entry.referenceId.discount || 0
//             hasDiscount = discount > 0
//           }
//           return hasDiscount
//         }
//         return true
//       })
//     }

//     const mappedItems = filteredEntries.map(entry => {
//       const supplier = entry.entityId || {}
//       let typeLabel = entry.transactionType || '-'

//       // Distinguish between purchases, payments, returns, and adjustments
//       if (entry.transactionType === 'adjustment') {
//         typeLabel = 'Supplier Debt'
//       } else if (entry.transactionType === 'payment') {
//         // Payment entry
//         if (entry.paymentMethod === 'cash') {
//           typeLabel = 'Payment - Cash'
//         } else if (entry.paymentMethod === 'bank') {
//           typeLabel = 'Payment - Bank'
//         } else {
//           typeLabel = 'Payment'
//         }
//       } else if (entry.transactionType === 'return') {
//         // Return entry - shows as credit (reduces balance owed)
//         typeLabel = 'Return (Credit)'
//       } else if (entry.transactionType === 'purchase') {
//         // Purchase entry
//         if (entry.referenceModel === 'DispatchOrder') {
//           typeLabel = 'Dispatch Order'
//         } else if (entry.referenceModel === 'Purchase') {
//           typeLabel = 'Local Buying'
//         } else {
//           typeLabel = 'Purchase'
//         }
//       } else if (entry.referenceModel === 'Return') {
//         typeLabel = 'Return'
//       }

//       // Get readable reference (order number, purchase number, etc.)
//       let readableReference = '-'
//       if (entry.referenceId) {
//         if (typeof entry.referenceId === 'object' && entry.referenceId !== null) {
//           // For returns, handle specially
//           if (entry.referenceModel === 'Return' || entry.transactionType === 'return') {
//             // Try orderNumber first (from associated dispatch order)
//             if (entry.referenceId.orderNumber) {
//               readableReference = entry.referenceId.orderNumber
//             } else {
//               // Try to extract order number from description
//               const description = entry.description || entry.notes || ''
//               // Pattern: "Return from Dispatch Order DO-1234" or "Order: DO-1234"
//               const orderMatch = description.match(/(?:Order|Dispatch Order):?\s*([A-Z0-9-]+)/i) ||
//                 description.match(/Dispatch Order\s+([A-Z0-9-]+)/i)
//               if (orderMatch && orderMatch[1]) {
//                 readableReference = orderMatch[1]
//               } else {
//                 // Format return ID as RET-{last6chars} for readability
//                 const returnId = entry.referenceId._id?.toString() || entry.referenceId.toString()
//                 readableReference = returnId ? `RET-${returnId.slice(-6).toUpperCase()}` : '-'
//               }
//             }
//           } else {
//             // For non-returns, use standard logic
//             readableReference = entry.referenceId.orderNumber || entry.referenceId.purchaseNumber || entry.referenceId._id || '-'
//           }
//         } else {
//           readableReference = entry.referenceId.toString()
//         }
//       } else if (entry.reference || entry.referenceNumber) {
//         readableReference = entry.reference || entry.referenceNumber
//       } else if (entry.transactionType === 'adjustment') {
//         readableReference = entry.description || entry.notes || 'Manual Adjustment'
//       }

//       // Calculate separate payment amounts
//       const cashPaid = (entry.transactionType === 'payment' && entry.paymentMethod === 'cash') ? (entry.credit || 0) : 0
//       const bankPaid = (entry.transactionType === 'payment' && entry.paymentMethod === 'bank') ? (entry.credit || 0) : 0

//       // Calculate return amount
//       const returnAmount = (entry.transactionType === 'return') ? (entry.credit || 0) : 0

//       // Get discount from reference
//       let discountAmount = 0
//       if (entry.referenceId && typeof entry.referenceId === 'object') {
//         discountAmount = entry.referenceId.totalDiscount || entry.referenceId.discount || 0
//       }

//       // For Return entries, extract the linked dispatch order ID for hyperlinking
//       const dispatchOrderId = (entry.referenceModel === 'Return' &&
//         entry.referenceId && typeof entry.referenceId === 'object' &&
//         entry.referenceId.dispatchOrderId)
//         ? entry.referenceId.dispatchOrderId.toString()
//         : null

//       return {
//         id: entry._id || entry.id,
//         date: entry.date || entry.createdAt,
//         createdAt: entry.createdAt,
//         supplier: supplier.name || supplier.company || 'Unknown Supplier',
//         supplierId: supplier._id || supplier.id,
//         type: typeLabel,
//         transactionType: entry.transactionType || entry.type,
//         description: entry.description || entry.notes || '-',
//         debit: Number(entry.debit) || 0,
//         credit: Number(entry.credit) || 0,
//         cashPaid,
//         bankPaid,
//         returnAmount,
//         discount: discountAmount,
//         balance: 0, // Will be calculated below
//         reference: readableReference,
//         referenceId: (entry.referenceId && typeof entry.referenceId === 'object' && entry.referenceId._id)
//           ? entry.referenceId._id.toString()
//           : (entry.referenceId ? entry.referenceId.toString() : null),
//         referenceModel: entry.referenceModel || '-',
//         dispatchOrderId,
//         paymentMethod: entry.paymentMethod || null,
//         paymentDetails: entry.paymentDetails || null,
//         entryNumber: entry.entryNumber || '-',
//         raw: entry
//       }
//     })

//     // Sort by createdAt ASCENDING (oldest first) for running balance calculation
//     mappedItems.sort((a, b) => {
//       const createdAtA = new Date(a.date || a.createdAt || 0).getTime()
//       const createdAtB = new Date(b.date || b.createdAt || 0).getTime()
//       return createdAtA - createdAtB
//     })

//     // Calculate running balance client-side (debit increases, credit decreases)
//     let runningBalance = 0
//     for (const entry of mappedItems) {
//       runningBalance = runningBalance + entry.debit - entry.credit
//       entry.balance = runningBalance
//     }

//     // Reverse to show newest first
//     return mappedItems.reverse()
//   }, [allLedgerData, ledgerFilterBy])

//   // Use client-side calculated running balance (same as table's top row)
//   // This ensures the summary card matches the Balance column of the first row in the table
//   const calculatedTotalBalance = useMemo(() => {
//     // Get the balance from the first entry (newest after sorting/reversing)
//     // This represents the current running balance
//     if (allLedgerTransactions.length > 0) {
//       return allLedgerTransactions[0].balance || 0
//     }
//     // Fallback to backend totalBalance for empty data case
//     return allLedgerData?.totalBalance || 0
//   }, [allLedgerTransactions, allLedgerData])

//   // This calculates per-supplier running balances for use in the payment modal
//   // IMPORTANT: We must calculate each supplier's balance independently, not use the global running balance
//   const supplierBalanceMap = useMemo(() => {
//     const balanceMap = {}

//     // Step 1: Calculate per-supplier balances from raw ledger entries
//     // We need the raw entries from allLedgerData, not allLedgerTransactions which has global running balance
//     if (allLedgerData?.entries && allLedgerData.entries.length > 0) {
//       // Filter to only include purchase, payment, and return entries
//       const relevantEntries = allLedgerData.entries.filter(entry =>
//         entry.transactionType === 'purchase' ||
//         entry.transactionType === 'payment' ||
//         entry.transactionType === 'return' ||
//         entry.transactionType === 'adjustment'
//       )

//       // Group entries by supplier and calculate individual running balances
//       const supplierEntriesMap = {}

//       for (const entry of relevantEntries) {
//         const supplier = entry.entityId || {}
//         const supplierId = supplier._id?.toString() || supplier.id?.toString() || entry.entityId?.toString()

//         if (!supplierId) continue

//         if (!supplierEntriesMap[supplierId]) {
//           supplierEntriesMap[supplierId] = []
//         }
//         supplierEntriesMap[supplierId].push(entry)
//       }

//       // Calculate running balance for each supplier
//       for (const [supplierId, entries] of Object.entries(supplierEntriesMap)) {
//         // Sort by createdAt ascending (oldest first)
//         entries.sort((a, b) => {
//           const createdAtA = new Date(a.date || a.createdAt || 0).getTime()
//           const createdAtB = new Date(b.date || b.createdAt || 0).getTime()
//           return createdAtA - createdAtB
//         })

//         // Calculate running balance (debit increases, credit decreases)
//         let runningBalance = 0
//         for (const entry of entries) {
//           runningBalance = runningBalance + (Number(entry.debit) || 0) - (Number(entry.credit) || 0)
//         }

//         balanceMap[supplierId] = runningBalance
//       }
//     }

//     // Step 2: Fill in missing suppliers from dropdownSuppliers
//     // This ensures ALL suppliers have a balance, even if they have no ledger entries
//     if (dropdownSuppliers && dropdownSuppliers.length > 0) {
//       for (const supplier of dropdownSuppliers) {
//         const supplierId = String(supplier._id || supplier.id)
//         // Only add if not already in map (ledger data takes priority)
//         if (balanceMap[supplierId] === undefined) {
//           // Use the balance from the supplier object (from API)
//           balanceMap[supplierId] = supplier.balance || 0
//         }
//       }
//     }

//     console.log('📊 Complete Supplier Balance Map:', balanceMap)
//     console.log('📊 dropdownSuppliers sample:', dropdownSuppliers?.[0])

//     return balanceMap
//   }, [allLedgerData, dropdownSuppliers])

//   // Calculate total pending from ledger data (accounts for excess payments not tied to orders)
//   // Use ledger balance when positive (includes excess payments), fallback to sum of pending rows
//   const calculatedTotalPendingFromRemaining = useMemo(() => {
//     // If viewing all suppliers, use the total balance from all ledger transactions
//     if (selectedSupplierId === 'all') {
//       const ledgerBalance = calculatedTotalBalance
//       if (ledgerBalance > 0) {
//         return ledgerBalance
//       }
//       // Fallback to sum of pending rows for edge cases
//       return pendingBalances.reduce((sum, balance) => sum + (balance.amount || 0), 0)
//     }

//     // If viewing a specific supplier, use that supplier's balance from ledger data
//     const supplierBalance = supplierBalanceMap[String(selectedSupplierId)]
//     if (supplierBalance !== undefined && supplierBalance !== null && supplierBalance > 0) {
//       return supplierBalance
//     }

//     // Fallback: try ledgerData.currentBalance
//     if (ledgerData?.currentBalance !== undefined && ledgerData.currentBalance !== null && ledgerData.currentBalance > 0) {
//       return ledgerData.currentBalance
//     }

//     // Final fallback: sum of pending rows (which should be 0 or negative if excess payments exist)
//     return pendingBalances.reduce((sum, balance) => sum + (balance.amount || 0), 0)
//   }, [selectedSupplierId, calculatedTotalBalance, supplierBalanceMap, ledgerData?.currentBalance, pendingBalances])

//   // Calculate balance for modal - use the same calculation as calculatedTotalBalance
//   const balanceForModal = useMemo(() => {
//     if (selectedSupplierId === 'all' || !selectedSupplierId) {
//       return 0 // No specific supplier selected
//     }

//     // Priority 1: Use balance from allLedgerTransactions (same as parent page display)
//     const balanceFromMap = supplierBalanceMap[String(selectedSupplierId)]
//     if (balanceFromMap !== undefined && balanceFromMap !== null) {
//       return Math.abs(balanceFromMap)
//     }

//     // Priority 2: ledgerData.currentBalance (if available)
//     if (ledgerData?.currentBalance !== undefined && ledgerData.currentBalance !== null) {
//       return Math.abs(ledgerData.currentBalance)
//     }

//     // Priority 3: calculated outstanding balance from pending balances
//     if (calculatedOutstandingBalance !== undefined) {
//       return Math.abs(calculatedOutstandingBalance)
//     }

//     // Final fallback: supplier balance from dropdownSuppliers
//     const supplier = dropdownSuppliers.find(s => String(s.id) === selectedSupplierId)
//     return Math.abs(supplier?.balance || 0)
//   }, [selectedSupplierId, supplierBalanceMap, ledgerData?.currentBalance, calculatedOutstandingBalance, dropdownSuppliers])

//   // Ledger table columns for Tab 1 - Complete History (Purchases + Payments)
//   const allLedgerColumns = useMemo(
//     () => [
//       {
//         header: "Entry Number",
//         accessor: "entryNumber",
//         render: (row) => (
//           <span className="font-medium">{row.entryNumber}</span>
//         )
//       },
//       {
//         header: "Date",
//         accessor: "date",
//         render: (row) => formatDateTime(row)
//       },
//       {
//         header: "Supplier",
//         accessor: "supplier",
//         render: (row) => (
//           <span className="font-medium">{row.supplier}</span>
//         )
//       },
//       {
//         header: "Type",
//         accessor: "type",
//         render: (row) => {
//           const label = row.type || '-'
//           if (label === 'Supplier Debt') {
//             return (
//               <span className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
//                 Supplier Debt
//               </span>
//             )
//           }
//           if (label.startsWith('Purchase')) {
//             return (
//               <span className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
//                 {label}
//               </span>
//             )
//           }
//           if (label.startsWith('Payment')) {
//             return (
//               <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
//                 {label}
//               </span>
//             )
//           }
//           if (label.startsWith('Return')) {
//             return (
//               <span className="inline-flex items-center rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
//                 {label}
//               </span>
//             )
//           }
//           return <span className="text-muted-foreground text-xs">{label}</span>
//         }
//       },
//       {
//         header: "Reference",
//         accessor: "reference",
//         render: (row) => {
//           // For returns, link to the associated dispatch order (if available).
//           // For other types, link to the reference ID directly.
//           // If no valid link target exists (e.g. return with no dispatch order), render plain text.
//           const linkTarget = row.referenceModel === 'Return'
//             ? row.dispatchOrderId
//             : row.referenceId
//           return linkTarget ? (
//             <Link
//               href={`/dispatch-orders/${linkTarget}`}
//               className="font-medium text-blue-600 hover:underline"
//             >
//               {row.reference || '-'}
//             </Link>
//           ) : (
//             <span className="font-medium">{row.reference || '-'}</span>
//           )
//         }
//       },
//       {
//         header: "Debit (Owe)",
//         accessor: "debit",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${row.debit > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
//             {row.debit > 0 ? formatNumber(row.debit) : '-'}
//           </span>
//         )
//       },
//       // Removed "Credit (Paid)" column in favor of split columns
//       // {
//       //   header: "Credit (Paid)",
//       //   accessor: "credit",
//       //   render: (row) => (
//       //     <span className={`tabular-nums font-semibold ${row.credit > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
//       //       {row.credit > 0 ? formatNumber(row.credit) : '-'}
//       //     </span>
//       //   )
//       // },
//       {
//         header: "Cash Paid",
//         accessor: "cashPaid",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${row.cashPaid > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
//             {row.cashPaid > 0 ? formatNumber(row.cashPaid) : '-'}
//           </span>
//         )
//       },
//       {
//         header: "Bank Paid",
//         accessor: "bankPaid",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${row.bankPaid > 0 ? 'text-purple-600' : 'text-muted-foreground'}`}>
//             {row.bankPaid > 0 ? formatNumber(row.bankPaid) : '-'}
//           </span>
//         )
//       },
//       {
//         header: "Return",
//         accessor: "returnAmount",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${row.returnAmount > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
//             {row.returnAmount > 0 ? formatNumber(row.returnAmount) : '-'}
//           </span>
//         )
//       },
//       {
//         header: "Discount",
//         accessor: "discount",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${row.discount > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
//             {row.discount > 0 ? formatNumber(row.discount) : '-'}
//           </span>
//         )
//       },
//       {
//         header: "Balance",
//         accessor: "balance",
//         render: (row) => <span className="tabular-nums font-bold">{formatNumber(row.balance)}</span>
//       }
//     ],
//     []
//   )

//   const filteredLedgerTransactions = useMemo(() => {
//     if (!ledgerSearch) return allLedgerTransactions

//     const lowerSearch = ledgerSearch.toLowerCase()
//     return allLedgerTransactions.filter(item =>
//       (item.description && item.description.toLowerCase().includes(lowerSearch)) ||
//       (item.reference && item.reference.toLowerCase().includes(lowerSearch)) ||
//       (item.supplier && item.supplier.toLowerCase().includes(lowerSearch)) ||
//       (item.entryNumber && item.entryNumber.toString().toLowerCase().includes(lowerSearch)) ||
//       (item.debit && item.debit.toString().includes(lowerSearch)) ||
//       (item.credit && item.credit.toString().includes(lowerSearch))
//     )
//   }, [allLedgerTransactions, ledgerSearch])

//   // PDF Export for Supplier Ledger
//   const handleExportLedgerPDF = () => {
//     if (!filteredLedgerTransactions.length) {
//       toast.error('No ledger data to export')
//       return
//     }

//     const isAll = ledgerSupplierFilter === 'all'
//     const supplierName = isAll
//       ? 'All Suppliers'
//       : (() => {
//         const s = dropdownSuppliers.find(s => String(s.id) === ledgerSupplierFilter)
//         return s ? `${s.name}${s.company ? ` (${s.company})` : ''}` : 'Supplier'
//       })()

//     const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
//     const pageWidth = doc.internal.pageSize.getWidth()

//     // Header
//     doc.setFontSize(18)
//     doc.setFont('helvetica', 'bold')
//     doc.text('KI Fashion', 14, 18)
//     doc.setFontSize(12)
//     doc.setFont('helvetica', 'normal')
//     doc.text('Supplier Ledger Report', 14, 26)

//     doc.setFontSize(10)
//     doc.text(`Supplier: ${supplierName}`, 14, 34)
//     doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, 14, 40)

//     // Summary box
//     const totalEntries = filteredLedgerTransactions.length
//     const balance = calculatedTotalBalance || 0
//     const totalDebit = filteredLedgerTransactions.reduce((sum, r) => sum + (r.debit || 0), 0)
//     const totalCash = filteredLedgerTransactions.reduce((sum, r) => sum + (r.cashPaid || 0), 0)
//     const totalBank = filteredLedgerTransactions.reduce((sum, r) => sum + (r.bankPaid || 0), 0)
//     const totalReturn = filteredLedgerTransactions.reduce((sum, r) => sum + (r.returnAmount || 0), 0)

//     doc.setDrawColor(200)
//     doc.setFillColor(248, 249, 250)
//     doc.roundedRect(14, 44, pageWidth - 28, 14, 2, 2, 'FD')
//     doc.setFontSize(9)
//     doc.setFont('helvetica', 'bold')
//     doc.text(`Total Entries: ${totalEntries}`, 20, 52)
//     doc.text(`Total Debit: ${formatNumber(totalDebit)}`, 75, 52)
//     doc.text(`Cash Paid: ${formatNumber(totalCash)}`, 130, 52)
//     doc.text(`Bank Paid: ${formatNumber(totalBank)}`, 180, 52)
//     doc.text(`Returns: ${formatNumber(totalReturn)}`, 225, 52)
//     const balLabel = balance > 0 ? `Balance: ${formatNumber(Math.abs(balance))}` : `Balance: ${formatNumber(Math.abs(balance))}`
//     doc.setTextColor(balance > 0 ? 200 : 0, balance > 0 ? 0 : 128, 0)
//     doc.text(balLabel, pageWidth - 14, 52, { align: 'right' })
//     doc.setTextColor(0, 0, 0)

//     // Table
//     const tableData = filteredLedgerTransactions.map(row => [
//       row.entryNumber || '-',
//       (() => {
//         const dateTime = row.date || row.createdAt
//         if (!dateTime) return '-'
//         const d = new Date(dateTime)
//         return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}`
//       })(),
//       row.supplier || '-',
//       row.type || '-',
//       row.reference || '-',
//       row.debit > 0 ? formatNumber(row.debit) : '-',
//       row.cashPaid > 0 ? formatNumber(row.cashPaid) : '-',
//       row.bankPaid > 0 ? formatNumber(row.bankPaid) : '-',
//       row.returnAmount > 0 ? formatNumber(row.returnAmount) : '-',
//       row.discount > 0 ? formatNumber(row.discount) : '-',
//       formatNumber(row.balance),
//     ])

//     autoTable(doc, {
//       startY: 62,
//       head: [['Entry #', 'Date', 'Supplier', 'Type', 'Reference', 'Debit (Owe)', 'Cash Paid', 'Bank Paid', 'Return', 'Discount', 'Balance']],
//       body: tableData,
//       theme: 'grid',
//       headStyles: {
//         fillColor: [30, 41, 59],
//         textColor: 255,
//         fontSize: 7.5,
//         fontStyle: 'bold',
//         halign: 'center',
//         cellPadding: 2,
//       },
//       bodyStyles: {
//         fontSize: 7,
//         cellPadding: 1.8,
//       },
//       columnStyles: {
//         0: { halign: 'center', cellWidth: 18 },
//         1: { cellWidth: 32 },
//         2: { cellWidth: 30 },
//         3: { cellWidth: 32 },
//         4: { cellWidth: 24 },
//         5: { halign: 'right', cellWidth: 22 },
//         6: { halign: 'right', cellWidth: 22 },
//         7: { halign: 'right', cellWidth: 22 },
//         8: { halign: 'right', cellWidth: 20 },
//         9: { halign: 'right', cellWidth: 20 },
//         10: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
//       },
//       alternateRowStyles: { fillColor: [248, 250, 252] },
//       margin: { left: 14, right: 14 },
//       didParseCell: function (data) {
//         // Color debit cells red
//         if (data.section === 'body' && data.column.index === 5 && data.cell.raw !== '-') {
//           data.cell.styles.textColor = [220, 38, 38]
//         }
//         // Color cash paid blue
//         if (data.section === 'body' && data.column.index === 6 && data.cell.raw !== '-') {
//           data.cell.styles.textColor = [37, 99, 235]
//         }
//         // Color bank paid purple
//         if (data.section === 'body' && data.column.index === 7 && data.cell.raw !== '-') {
//           data.cell.styles.textColor = [147, 51, 234]
//         }
//         // Color return orange
//         if (data.section === 'body' && data.column.index === 8 && data.cell.raw !== '-') {
//           data.cell.styles.textColor = [234, 88, 12]
//         }
//         // Color discount green
//         if (data.section === 'body' && data.column.index === 9 && data.cell.raw !== '-') {
//           data.cell.styles.textColor = [22, 163, 74]
//         }
//       },
//     })

//     // Footer
//     const pageCount = doc.internal.getNumberOfPages()
//     for (let i = 1; i <= pageCount; i++) {
//       doc.setPage(i)
//       const pageH = doc.internal.pageSize.getHeight()
//       doc.setFontSize(7)
//       doc.setTextColor(150)
//       doc.text('This is a computer-generated report and does not require a signature.', 14, pageH - 8)
//       doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageH - 8, { align: 'right' })
//     }

//     const dateStr = new Date().toISOString().slice(0, 10)
//     const safeName = supplierName.replace(/[^a-zA-Z0-9]/g, '_')
//     doc.save(`Supplier_Ledger_${safeName}_${dateStr}.pdf`)
//     toast.success('PDF report downloaded')
//   }

//   const ledgerTabContent = (
//     <div className="space-y-2">
//       {/* Filters & Search Bar - Unified */}
//       <div className="rounded-lg border border-border bg-card p-3 sm:p-4 shadow-sm">
//         <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">


//           {/* Select Supplier */}
//           {/* Select Supplier (Combobox) */}
//           <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
//             <PopoverTrigger asChild>
//               <Button
//                 variant="outline"
//                 role="combobox"
//                 aria-expanded={supplierOpen}
//                 className="w-full sm:w-[250px] justify-between"
//                 disabled={allSuppliersLoading}
//               >
//                 {ledgerSupplierFilter
//                   ? ledgerSupplierFilter === 'all'
//                     ? "All Suppliers"
//                     : (() => {
//                       const supplier = dropdownSuppliers.find((s) => String(s.id) === ledgerSupplierFilter)
//                       return supplier ? `${supplier.name} ${supplier.company ? `(${supplier.company})` : ''}` : "Select supplier..."
//                     })()
//                   : "Select supplier..."}
//                 <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//               </Button>
//             </PopoverTrigger>
//             <PopoverContent className="w-[300px] p-0 bg-white dark:bg-zinc-950">
//               <Command>
//                 <CommandInput placeholder="Search supplier name or ID..." />
//                 <CommandList>
//                   <CommandEmpty>No supplier found.</CommandEmpty>
//                   <CommandGroup>
//                     <CommandItem
//                       key="all"
//                       value="all suppliers"
//                       onSelect={() => {
//                         setLedgerSupplierFilter(ledgerSupplierFilter === 'all' ? '' : 'all')
//                         setSelectedSupplierId('')
//                         setSupplierOpen(false)
//                       }}
//                     >
//                       <Check
//                         className={cn(
//                           "mr-2 h-4 w-4",
//                           ledgerSupplierFilter === 'all' ? "opacity-100" : "opacity-0"
//                         )}
//                       />
//                       <div className="flex items-center gap-2">
//                         <Users className="h-4 w-4 text-primary" />
//                         <span className="font-semibold">All Suppliers</span>
//                       </div>
//                     </CommandItem>
//                     {dropdownSuppliers.map((supplier) => (
//                       <CommandItem
//                         key={supplier.id}
//                         value={`${supplier.name} ${supplier.company || ''} ${supplier.supplierId || ''} ${supplier.legacyId || ''} ${String(supplier.id).slice(-6)}`}
//                         onSelect={() => {
//                           const val = String(supplier.id)
//                           setLedgerSupplierFilter(val === ledgerSupplierFilter ? "" : val)
//                           if (val && val !== 'all') {
//                             setSelectedSupplierId(val)
//                           } else {
//                             setSelectedSupplierId("")
//                           }
//                           setSupplierOpen(false)
//                         }}
//                       >
//                         <Check
//                           className={cn(
//                             "mr-2 h-4 w-4",
//                             ledgerSupplierFilter === String(supplier.id) ? "opacity-100" : "opacity-0"
//                           )}
//                         />
//                         <div className="flex flex-col">
//                           <span className="font-medium">{supplier.name}</span>
//                           <div className="flex items-center gap-2 text-xs text-muted-foreground">
//                             {supplier.supplierId ? (
//                               <span className="font-mono bg-muted px-1 rounded">{supplier.supplierId}</span>
//                             ) : supplier.legacyId ? (
//                               <span className="font-mono bg-muted px-1 rounded">{supplier.legacyId}</span>
//                             ) : null}
//                             {supplier.company && <span>{supplier.company}</span>}
//                           </div>
//                         </div>
//                       </CommandItem>
//                     ))}
//                   </CommandGroup>
//                 </CommandList>
//               </Command>
//             </PopoverContent>
//           </Popover>

//           {/* Filter By */}
//           {ledgerSupplierFilter && (
//             <Select
//               value={ledgerFilterBy}
//               onValueChange={setLedgerFilterBy}
//             >
//               <SelectTrigger className="h-10 w-full sm:w-[180px] border-border">
//                 <SelectValue placeholder="All" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All</SelectItem>
//                 <SelectItem value="cash">Cash</SelectItem>
//                 <SelectItem value="bank">Bank</SelectItem>
//                 <SelectItem value="discount">Discount</SelectItem>
//                 <SelectItem value="return">Return</SelectItem>
//                 <SelectItem value="adjustment">Supplier Debt</SelectItem>
//               </SelectContent>
//             </Select>
//           )}

//           {/* Search Section */}
//           {ledgerSupplierFilter && (
//             <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
//               <div className="relative flex-1 sm:flex-initial">
//                 <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
//                   <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
//                 </div>
//                 <input
//                   type="text"
//                   placeholder="Search..."
//                   value={ledgerSearch}
//                   onChange={(e) => setLedgerSearch(e.target.value)}
//                   className="h-10 w-full sm:w-[200px] pl-9 sm:pl-10 pr-3 rounded-lg border border-input bg-background text-xs sm:text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
//                 />
//               </div>
//               <Button
//                 size="sm"
//                 className="h-10 px-4 sm:px-6 bg-primary hover:bg-primary/90 text-xs sm:text-sm min-w-[80px] sm:min-w-0"
//               >
//                 Search
//               </Button>
//             </div>
//           )}

//           {ledgerSupplierFilter && filteredLedgerTransactions.length > 0 && (
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={handleExportLedgerPDF}
//               className="gap-2"
//             >
//               <Download className="h-4 w-4" />
//               Export PDF
//             </Button>
//           )}
//         </div>
//       </div>

//       {/* Content Section */}
//       <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
//         {/* <div className="p-6 border-b border-border">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-3">
//               <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
//                 <FileText className="h-5 w-5 text-primary" />
//               </div>
//               <div>
//                 <h2 className="font-semibold text-lg text-foreground">Complete Ledger History</h2>
//                 <p className="text-sm text-muted-foreground mt-0.5">Select a supplier to view their complete accounting record</p>
//               </div>
//             </div>

//           </div>
//         </div> */}

//         <div className="p-6">
//           {!ledgerSupplierFilter ? (
//             <div className="p-12 text-center">
//               <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
//                 <Building2 className="w-8 h-8 text-muted-foreground" />
//               </div>
//               <p className="text-sm font-medium text-foreground mb-1">Select a supplier to view ledger</p>
//               <p className="text-xs text-muted-foreground">Choose a supplier from the dropdown above to see their complete transaction history</p>
//             </div>
//           ) : allLedgerLoading ? (
//             <div className="p-12 flex flex-col items-center justify-center">
//               <Loader2 className="animate-spin h-8 w-8 text-primary mb-4" />
//               <p className="text-sm text-muted-foreground">Loading ledger entries...</p>
//             </div>
//           ) : filteredLedgerTransactions.length === 0 ? (
//             <div className="p-12 text-center">
//               <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
//                 <FileText className="w-8 h-8 text-muted-foreground" />
//               </div>
//               <p className="text-sm font-medium text-foreground mb-1">No transactions found</p>
//               <p className="text-xs text-muted-foreground">
//                 {ledgerSearch ? 'Try adjusting your search or filters' : 'No ledger entries found for this supplier'}
//               </p>
//             </div>
//           ) : (
//             <>
//               {/* Stats Cards - Enhanced */}
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//                 <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
//                   <div className="flex items-center justify-between mb-3">
//                     {/* <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
//                       <FileText className="h-5 w-5 text-muted-foreground" />
//                     </div> */}
//                   </div>
//                   <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">
//                     Total Entries
//                   </div>
//                   <div className="text-2xl font-bold tabular-nums text-foreground">
//                     {filteredLedgerTransactions.length}
//                   </div>
//                 </div>
//                 <div className={`rounded-lg border p-5 shadow-sm ${(calculatedTotalBalance || 0) <= 0
//                   ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-emerald-50/30'
//                   : 'border-red-200 bg-gradient-to-br from-red-50/50 to-red-50/30'
//                   }`}>

//                   <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">
//                     {ledgerSupplierFilter === 'all' ? 'Total Supplier Balance' : 'Supplier Balance'}
//                   </div>
//                   <div className={`text-2xl font-bold tabular-nums ${(calculatedTotalBalance || 0) <= 0 ? 'text-emerald-700' : 'text-red-700'
//                     }`}>
//                     {formatNumber(Math.abs(calculatedTotalBalance || 0))}
//                   </div>
//                   <div className={`text-xs mt-1 ${(calculatedTotalBalance || 0) <= 0 ? 'text-emerald-600/80' : 'text-red-600/80'
//                     }`}>
//                     {(calculatedTotalBalance || 0) > 0
//                       ? ledgerSupplierFilter === 'all' ? 'Total owed to all suppliers' : 'Amount owed to supplier'
//                       : ledgerSupplierFilter === 'all' ? 'Total credit with all suppliers' : 'Credit with supplier'}
//                   </div>
//                 </div>
//               </div>

//               {/* Table */}
//               <DataTable
//                 columns={allLedgerColumns}
//                 data={filteredLedgerTransactions}
//                 hideActions
//                 enableSearch={true}
//                 paginate={true}
//                 pageSize={50}
//                 disableSorting={true}
//               />
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   )

//   const handleMarkAsPaid = (balance) => {
//     setMarkAsPaidForm({
//       method: balance.paymentType || 'cash',
//       amount: balance.amount.toString()
//     })
//     setMarkAsPaidDialog({ open: true, balance })
//   }

//   const handleConfirmMarkAsPaid = async () => {
//     const { balance } = markAsPaidDialog
//     if (!balance) return

//     const amount = parseFloat(markAsPaidForm.amount)
//     if (!amount || amount <= 0) {
//       toast.error('Please enter a valid amount')
//       return
//     }

//     if (amount > balance.amount) {
//       // Overpayment creates credit with supplier - show warning but allow
//       console.log(`Overpayment: ${formatNumber(amount)} exceeds remaining balance ${formatNumber(balance.amount)}. Credit will be created.`)
//     }

//     setIsMarkingAsPaid(true)

//     try {
//       await ledgerAPI.createEntry({
//         type: 'supplier',
//         entityId: balance.supplierId,
//         entityModel: 'Supplier',
//         transactionType: 'payment',
//         referenceId: balance.id,
//         referenceModel: 'DispatchOrder', // Always use DispatchOrder since we unified the models
//         debit: 0,
//         credit: amount,
//         date: new Date(),
//         description: `Payment for ${balance.reference} - ${markAsPaidForm.method}`,
//         paymentMethod: markAsPaidForm.method,
//         paymentDetails: {
//           cashPayment: markAsPaidForm.method === 'cash' ? amount : 0,
//           bankPayment: markAsPaidForm.method === 'bank' ? amount : 0,
//           remainingBalance: 0
//         }
//       })

//       toast.success('Payment recorded successfully')
//       setMarkAsPaidDialog({ open: false, balance: null })
//       setMarkAsPaidForm({ method: 'cash', amount: '' })

//       // Invalidate queries to refresh data - use exact query keys
//       await queryClient.invalidateQueries({ queryKey: ['pending-balances', selectedSupplierId] })
//       await queryClient.invalidateQueries({ queryKey: ['supplier-ledger', selectedSupplierId] })
//       await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
//       await queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] })
//       await queryClient.invalidateQueries({ queryKey: ['unpaid-dispatch-orders', selectedSupplierId] })

//       // Refetch pending balances immediately
//       await queryClient.refetchQueries({ queryKey: ['pending-balances', selectedSupplierId] })

//     } catch (error) {
//       console.error('Error marking as paid:', error)
//       toast.error(error.response?.data?.message || error.message || 'Failed to record payment')
//     } finally {
//       setIsMarkingAsPaid(false)
//     }
//   }

//   const handleAddPayment = async () => {
//     if (!selectedSupplierId || selectedSupplierId === 'all') {
//       toast.error('Please select a supplier first')
//       return
//     }

//     const amount = parseFloat(paymentForm.amount)
//     if (!amount || amount <= 0) {
//       toast.error('Please enter a valid amount')
//       return
//     }

//     if (!paymentForm.method || !['cash', 'bank'].includes(paymentForm.method)) {
//       toast.error('Please select a valid payment method (Cash or Bank)')
//       return
//     }

//     // Allow overpayments - they create credit with the supplier
//     const remainingBalance = supplierDetails?.balance || 0
//     if (remainingBalance > 0 && amount > remainingBalance) {
//       console.log(`Overpayment: ${formatNumber(amount)} exceeds remaining balance ${formatNumber(remainingBalance)}. Credit will be created.`)
//     }

//     // Allow overpayments on dispatch orders - creates credit
//     if (selectedDispatchOrderId && selectedDispatchOrderId !== 'none' && selectedDispatchOrder) {
//       if (amount > selectedDispatchOrder.remainingBalance) {
//         console.log(`Overpayment on dispatch order: ${formatNumber(amount)} exceeds ${formatNumber(selectedDispatchOrder.remainingBalance)}. Credit will be created.`)
//       }
//     }

//     setIsSubmittingPayment(true)

//     try {
//       // Validate supplier exists (check in allSuppliers since dropdown uses allSuppliers)
//       const supplier = dropdownSuppliers.find(s => String(s.id) === selectedSupplierId)
//       if (!supplier) {
//         throw new Error('Supplier not found')
//       }

//       // Prepare payment payload
//       const paymentPayload = {
//         type: 'supplier',
//         entityId: selectedSupplierId,
//         entityModel: 'Supplier',
//         transactionType: 'payment',
//         debit: 0,
//         credit: amount,
//         date: paymentForm.date ? new Date(paymentForm.date) : new Date(),
//         description: paymentForm.description || `Payment - ${paymentForm.method}`,
//         paymentMethod: paymentForm.method,
//         paymentDetails: {
//           cashPayment: paymentForm.method === 'cash' ? amount : 0,
//           bankPayment: paymentForm.method === 'bank' ? amount : 0,
//           remainingBalance: 0
//         }
//       }

//       // If dispatch order is selected, link the payment to it
//       if (selectedDispatchOrderId && selectedDispatchOrderId !== 'none' && selectedDispatchOrder) {
//         paymentPayload.referenceId = selectedDispatchOrderId
//         paymentPayload.referenceModel = 'DispatchOrder'
//         paymentPayload.description = paymentForm.description || `Payment for ${selectedDispatchOrder.orderNumber} - ${paymentForm.method}`
//       }

//       // Create ledger entry for payment
//       await ledgerAPI.createEntry(paymentPayload)

//       toast.success('Payment recorded successfully')

//       // Reset form and close dialog
//       setPaymentForm({ amount: '', date: '', description: '', method: 'cash' })
//       setSelectedDispatchOrderId('none')
//       setIsDialogOpen(false)

//       // Invalidate queries to refresh data
//       queryClient.invalidateQueries({ queryKey: ['pending-balances', selectedSupplierId] })
//       queryClient.invalidateQueries({ queryKey: ['supplier-ledger', selectedSupplierId] })
//       queryClient.invalidateQueries({ queryKey: ['suppliers'] })
//       queryClient.invalidateQueries({ queryKey: ['unpaid-dispatch-orders', selectedSupplierId] })
//       queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] })
//       queryClient.invalidateQueries({ queryKey: ['payment-history', paymentHistorySupplier] })

//     } catch (error) {
//       console.error('Error creating payment:', error)
//       toast.error(error.response?.data?.message || error.message || 'Failed to record payment')
//     } finally {
//       setIsSubmittingPayment(false)
//     }
//   }

//   const paymentSelector = (
//     <Popover open={pendingPaymentSupplierOpen} onOpenChange={setPendingPaymentSupplierOpen}>
//       <PopoverTrigger asChild>
//         <Button
//           variant="outline"
//           role="combobox"
//           aria-expanded={pendingPaymentSupplierOpen}
//           className="w-full justify-between bg-background"
//           disabled={allSuppliersLoading}
//         >
//           {selectedSupplierId && selectedSupplierId !== 'all'
//             ? (() => {
//               const supplier = dropdownSuppliers.find((s) => String(s.id) === selectedSupplierId)
//               return supplier
//                 ? `${supplier.name} ${supplier.supplierId ? `(${supplier.supplierId})` : ''}`
//                 : "Select supplier..."
//             })()
//             : "Select supplier..."}
//           <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//         </Button>
//       </PopoverTrigger>
//       <PopoverContent className="w-[400px] p-0 bg-white dark:bg-zinc-950">
//         <Command>
//           <CommandInput placeholder="Search name, company, or ID..." />
//           <CommandList>
//             <CommandEmpty>No supplier found.</CommandEmpty>
//             <CommandGroup>
//               {dropdownSuppliers.map((supplier) => (
//                 <CommandItem
//                   key={supplier.id}
//                   value={`${supplier.name} ${supplier.company || ''} ${supplier.supplierId || ''} ${supplier.legacyId || ''} ${String(supplier.id).slice(-6)}`}
//                   onSelect={() => {
//                     const val = String(supplier.id)
//                     setSelectedSupplierId(val)
//                     setSelectedDispatchOrderId('none')
//                     setPendingPaymentSupplierOpen(false)
//                   }}
//                 >
//                   <Check
//                     className={cn(
//                       "mr-2 h-4 w-4",
//                       selectedSupplierId === String(supplier.id) ? "opacity-100" : "opacity-0"
//                     )}
//                   />
//                   <div className="flex flex-col">
//                     <span className="font-medium">{supplier.name}</span>
//                     <div className="flex items-center gap-2 text-xs text-muted-foreground">
//                       {supplier.supplierId ? (
//                         <span className="font-mono bg-muted px-1 rounded">{supplier.supplierId}</span>
//                       ) : supplier.legacyId ? (
//                         <span className="font-mono bg-muted px-1 rounded">{supplier.legacyId}</span>
//                       ) : null}
//                       {supplier.company && <span>{supplier.company}</span>}
//                     </div>
//                   </div>
//                 </CommandItem>
//               ))}
//             </CommandGroup>
//           </CommandList>
//         </Command>
//       </PopoverContent>
//     </Popover>
//   )

//   const paymentDetails = (
//     <>

//       {/* Supplier Selector - Enhanced */}
//       <div className="flex max-w-2xl flex-wrap items-center gap-4 mb-2">
//         <div className="flex items-center gap-2">
//           <Users className="h-4 w-4 text-muted-foreground" />
//           <span className="text-sm font-semibold text-foreground">Select Supplier:</span>
//         </div>
//         <div className="flex-1 min-w-[250px]">
//           {paymentSelector}
//         </div>
//       </div>


//       {/* Stats Cards - Enhanced */}
//       {selectedSupplierId && selectedSupplierId !== 'all' && (
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
//           <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-emerald-50/30 p-5 ">

//             <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">
//               Total Paid
//             </div>
//             <div className="text-2xl font-bold text-emerald-700 tabular-nums">
//               {formatNumber(pendingTotals.totalPaid || 0)}
//             </div>
//           </div>
//           <div className="rounded-lg border border-red-200 bg-gradient-to-br from-red-50/50 to-red-50/30 p-5 ">

//             <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">
//               Total Pending
//             </div>
//             <div className="text-2xl font-bold text-red-700 tabular-nums">
//               {formatNumber(Math.abs(calculatedTotalPendingFromRemaining || 0))}
//             </div>
//           </div>
//         </div>
//       )}



//       {/* Pending Balances View - Only shown when supplier is selected */}
//       {!selectedSupplierId || selectedSupplierId === 'all' ? (
//         <div className="rounded-lg border border-border bg-card p-12 text-center">
//           <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
//             <Users className="w-8 h-8 text-muted-foreground" />
//           </div>
//           <p className="text-sm font-medium text-foreground mb-1">No supplier selected</p>
//           <p className="text-xs text-muted-foreground">Select a supplier to view their pending payments</p>
//         </div>
//       ) : pendingBalancesLoading ? (
//         <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center justify-center">
//           <Loader2 className="animate-spin h-8 w-8 text-primary mb-4" />
//           <p className="text-sm text-muted-foreground">Loading pending balances...</p>
//         </div>
//       ) : pendingBalancesError ? (
//         <div className="rounded-lg border border-red-200 bg-red-50/50 p-8 text-center">
//           <p className="text-sm font-medium text-red-700 mb-1">Error loading pending balances</p>
//           <p className="text-xs text-red-600/80">{pendingBalancesError.message}</p>
//         </div>
//       ) : pendingBalances.length === 0 ? (
//         <div className="rounded-lg border border-border bg-card p-12 text-center">
//           <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
//             <CheckCircle2 className="w-8 h-8 text-emerald-500" />
//           </div>
//           <p className="text-sm font-medium text-foreground mb-1">No pending balances</p>
//           <p className="text-xs text-muted-foreground">This supplier has no confirmed dispatch orders or purchases with remaining balances</p>
//         </div>
//       ) : (
//         <div className="rounded-lg border border-border bg-card  overflow-hidden">
//           <DataTable columns={pendingBalanceColumns} data={pendingBalancesWithEntryNumbers} hideActions enableSearch={true} />
//         </div>
//       )}

//       {/* Mark as Paid Dialog */}
//       <Dialog open={markAsPaidDialog.open} onOpenChange={(open) => setMarkAsPaidDialog({ open, balance: null })}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Mark as Paid</DialogTitle>
//           </DialogHeader>
//           {markAsPaidDialog.balance && (
//             <div className="space-y-4">
//               <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
//                 <p className="text-sm">
//                   <span className="font-medium">Reference:</span> {markAsPaidDialog.balance.reference}
//                 </p>
//                 <p className="text-sm">
//                   <span className="font-medium">Supplier:</span> {markAsPaidDialog.balance.supplierName}
//                 </p>
//                 <p className="text-sm">
//                   <span className="font-medium">Remaining Balance:</span> {formatNumber(markAsPaidDialog.balance.amount)}
//                 </p>
//               </div>
//               <div>
//                 <Label htmlFor="mark-paid-amount">Payment Amount <span className="text-red-500">*</span></Label>
//                 <Input
//                   id="mark-paid-amount"
//                   type="text"
//                   inputMode="decimal"
//                   step="0.01"
//                   min="0.01"
//                   max={markAsPaidDialog.balance.amount}
//                   value={markAsPaidForm.amount}
//                   onChange={(e) => {
//                     const value = e.target.value;
//                     // Allow only numbers and one decimal point
//                     const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
//                     setMarkAsPaidForm({ ...markAsPaidForm, amount: sanitized });
//                   }}
//                   placeholder="Enter payment amount"
//                   disabled={isMarkingAsPaid}
//                 />
//                 <p className="text-xs text-muted-foreground mt-1">
//                   Maximum: {formatNumber(markAsPaidDialog.balance.amount)}
//                 </p>
//               </div>
//               <div>
//                 <Label htmlFor="mark-paid-method">Payment Method <span className="text-red-500">*</span></Label>
//                 <Select
//                   value={markAsPaidForm.method}
//                   onValueChange={(value) => setMarkAsPaidForm({ ...markAsPaidForm, method: value })}
//                   disabled={isMarkingAsPaid}
//                 >
//                   <SelectTrigger>
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="cash">Cash</SelectItem>
//                     <SelectItem value="bank">Bank Transfer</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//             </div>
//           )}
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setMarkAsPaidDialog({ open: false, balance: null })}
//               disabled={isMarkingAsPaid}
//             >
//               Cancel
//             </Button>
//             <Button
//               onClick={handleConfirmMarkAsPaid}
//               disabled={isMarkingAsPaid || !markAsPaidForm.amount || parseFloat(markAsPaidForm.amount) <= 0}
//             >
//               {isMarkingAsPaid ? (
//                 <>
//                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                   Recording...
//                 </>
//               ) : (
//                 'Mark as Paid'
//               )}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </>
//   )

//   const paymentHistoryTabContent = (
//     <div className="space-y-6">
//       {/* Summary Cards - Premium Design */}
//       {paymentHistorySupplier && paymentHistorySupplier !== 'all' && (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//           {/* Total Payments Card - Highlighted */}
//           <div className="relative rounded-lg border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 via-emerald-50/60 to-white p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
//             <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-200/20 blur-2xl group-hover:bg-emerald-200/30 transition-all"></div>
//             <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-emerald-100/15 blur-xl"></div>
//             <div className="relative z-10">
//               <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-emerald-700/80">
//                 Total Payments
//               </div>
//               <div className="text-3xl font-bold text-emerald-700 tabular-nums mb-1.5">
//                 {formatNumber(paymentSummary.total)}
//               </div>
//               <div className="text-xs font-medium text-emerald-600/70">All-time payment total</div>
//             </div>
//           </div>

//           {/* Cash Payments Card */}
//           <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-background via-card/50 to-background p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
//             <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all"></div>
//             <div className="relative z-10">
//               <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">
//                 Cash Payments
//               </div>
//               <div className="text-3xl font-bold tabular-nums text-foreground mb-1.5">
//                 {formatNumber(paymentSummary.cash)}
//               </div>
//               <div className="text-xs font-medium text-muted-foreground">Cash transactions</div>
//             </div>
//           </div>

//           {/* Bank Payments Card */}
//           <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-background via-card/50 to-background p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
//             <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all"></div>
//             <div className="relative z-10">

//               <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">
//                 Bank Payments
//               </div>
//               <div className="text-3xl font-bold tabular-nums text-foreground mb-1.5">
//                 {formatNumber(paymentSummary.bank)}
//               </div>
//               <div className="text-xs font-medium text-muted-foreground">Bank transfers</div>
//             </div>
//           </div>

//           {/* Payments This Month Card */}
//           <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-background via-card/50 to-background p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
//             <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all"></div>
//             <div className="relative z-10">

//               <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">
//                 Payments This Month
//               </div>
//               <div className="text-3xl font-bold tabular-nums text-foreground mb-1.5">
//                 {paymentSummary.countThisMonth}
//               </div>
//               <div className="text-xs font-medium text-muted-foreground">Current month</div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Main Content Card - Unified Design */}
//       <div className="rounded-lg border border-border/60 bg-gradient-to-br from-card via-background to-card shadow-sm overflow-hidden">


//         {/* Filters Section */}
//         <div className="px-6 py-5 bg-gradient-to-b from-muted/20 via-muted/10 to-transparent border-b border-border/30">

//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
//             <div className="flex flex-col min-w-0">
//               <Label htmlFor="payment-history-supplier" className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
//                 <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
//                 <span className="whitespace-nowrap">Select Supplier</span>
//               </Label>
//               <Popover open={paymentHistorySupplierOpen} onOpenChange={setPaymentHistorySupplierOpen}>
//                 <PopoverTrigger asChild>
//                   <Button
//                     variant="outline"
//                     role="combobox"
//                     aria-expanded={paymentHistorySupplierOpen}
//                     className="h-[44px] w-full justify-between border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg"
//                     disabled={allSuppliersLoading}
//                   >
//                     {paymentHistorySupplier
//                       ? (() => {
//                         const supplier = dropdownSuppliers.find((s) => String(s.id) === paymentHistorySupplier)
//                         return supplier ? `${supplier.name} ${supplier.company ? `(${supplier.company})` : ''}` : "Select supplier..."
//                       })()
//                       : "Select supplier..."}
//                     <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//                   </Button>
//                 </PopoverTrigger>
//                 <PopoverContent className="w-[300px] p-0 bg-white dark:bg-zinc-950">
//                   <Command>
//                     <CommandInput placeholder="Search supplier..." />
//                     <CommandList>
//                       <CommandEmpty>No supplier found.</CommandEmpty>
//                       <CommandGroup>
//                         {dropdownSuppliers.map((supplier) => (
//                           <CommandItem
//                             key={supplier.id}
//                             value={`${supplier.name} ${supplier.company || ''} ${supplier.supplierId || ''} ${supplier.legacyId || ''} ${String(supplier.id).slice(-6)}`}
//                             onSelect={() => {
//                               const val = String(supplier.id)
//                               setPaymentHistorySupplier(val)
//                               setSelectedSupplierId(val)
//                               setPaymentHistorySupplierOpen(false)
//                             }}
//                           >
//                             <Check
//                               className={cn(
//                                 "mr-2 h-4 w-4",
//                                 paymentHistorySupplier === String(supplier.id) ? "opacity-100" : "opacity-0"
//                               )}
//                             />
//                             <div className="flex flex-col">
//                               <span className="font-medium">{supplier.name}</span>
//                               <div className="flex items-center gap-2 text-xs text-muted-foreground">
//                                 {supplier.supplierId ? (
//                                   <span className="font-mono bg-muted px-1 rounded">{supplier.supplierId}</span>
//                                 ) : supplier.legacyId ? (
//                                   <span className="font-mono bg-muted px-1 rounded">{supplier.legacyId}</span>
//                                 ) : null}
//                                 {supplier.company && <span>{supplier.company}</span>}
//                               </div>
//                             </div>
//                           </CommandItem>
//                         ))}
//                       </CommandGroup>
//                     </CommandList>
//                   </Command>
//                 </PopoverContent>
//               </Popover>
//             </div>

//             <div className="flex flex-col min-w-0">
//               <Label htmlFor="payment-history-date-from" className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
//                 <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
//                 <span className="whitespace-nowrap">Date From</span>
//               </Label>
//               <Input
//                 id="payment-history-date-from"
//                 type="date"
//                 value={paymentHistoryDateFrom}
//                 onChange={(e) => setPaymentHistoryDateFrom(e.target.value)}
//                 className="h-[44px] w-full border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
//                 style={{ paddingRight: '2.5rem' }}
//               />
//             </div>

//             <div className="flex flex-col min-w-0">
//               <Label htmlFor="payment-history-date-to" className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
//                 <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
//                 <span className="whitespace-nowrap">Date To</span>
//               </Label>
//               <Input
//                 id="payment-history-date-to"
//                 type="date"
//                 value={paymentHistoryDateTo}
//                 onChange={(e) => setPaymentHistoryDateTo(e.target.value)}
//                 className="h-[44px] w-full border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
//                 style={{ paddingRight: '2.5rem' }}
//               />
//             </div>

//             <div className="flex flex-col min-w-0">
//               <Label htmlFor="payment-history-method" className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
//                 <span className="whitespace-nowrap">Payment Method</span>
//               </Label>
//               <Select
//                 value={paymentHistoryMethodFilter}
//                 onValueChange={setPaymentHistoryMethodFilter}
//               >
//                 <SelectTrigger id="payment-history-method" className="h-[44px] w-full border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg">
//                   <SelectValue placeholder="All Methods" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="all">All Methods</SelectItem>
//                   <SelectItem value="cash">Cash</SelectItem>
//                   <SelectItem value="bank">Bank</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//           </div>
//         </div>

//         {/* Payment History Table */}
//         <div className="px-6 py-6 bg-background">
//           {!paymentHistorySupplier || paymentHistorySupplier === 'all' ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
//                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 backdrop-blur-sm ring-2 ring-border/60 shadow-lg">
//                   <Users className="w-12 h-12 text-muted-foreground" />
//                 </div>
//               </div>
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">No supplier selected</h3>
//               <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
//                 Select a supplier from the dropdown above to view their complete payment history and transaction records
//               </p>
//             </div>
//           ) : paymentHistoryLoading ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
//                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background backdrop-blur-sm ring-2 ring-primary/20 shadow-lg">
//                   <Loader2 className="w-12 h-12 text-primary animate-spin" />
//                 </div>
//               </div>
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">Loading payment history</h3>
//               <p className="text-sm text-muted-foreground">Please wait while we fetch the records...</p>
//             </div>
//           ) : paymentHistoryTransactions.length === 0 ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-muted/30 rounded-full blur-3xl"></div>
//                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 backdrop-blur-sm ring-2 ring-border/60 shadow-lg">
//                   <FileText className="w-12 h-12 text-muted-foreground" />
//                 </div>
//               </div>
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">No payment history found</h3>
//               <p className="text-sm text-muted-foreground text-center max-w-md mb-5 leading-relaxed">
//                 {paymentHistoryDateFrom || paymentHistoryDateTo || paymentHistoryMethodFilter !== 'all'
//                   ? 'Try adjusting your filters to see more results'
//                   : 'No payment records found for this supplier'}
//               </p>
//               {(paymentHistoryDateFrom || paymentHistoryDateTo || paymentHistoryMethodFilter !== 'all') && (
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   className="gap-2 h-10 px-5 shadow-sm hover:shadow-md transition-all rounded-lg"
//                   onClick={() => {
//                     setPaymentHistoryDateFrom('')
//                     setPaymentHistoryDateTo('')
//                     setPaymentHistoryMethodFilter('all')
//                   }}
//                 >
//                   <RotateCcw className="h-4 w-4" />
//                   Clear Filters
//                 </Button>
//               )}
//             </div>
//           ) : (
//             <DataTable
//               columns={paymentHistoryColumns}
//               data={paymentHistoryTransactions}
//               hideActions
//               enableSearch={false}
//               paginate={true}
//               pageSize={50}
//             />
//           )}
//         </div>
//       </div>
//     </div>
//   )

//   const supplierReceiptsTabContent = (
//     <div className="space-y-6">
//       {receiptSupplierId && receiptSupplierId !== 'all' && (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//           <div className="relative rounded-lg border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 via-emerald-50/60 to-white p-6 shadow-sm overflow-hidden">
//             <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-emerald-700/80">Total Receipts</div>
//             <div className="text-3xl font-bold text-emerald-700 tabular-nums mb-1.5">{formatNumber(supplierReceiptSummary.total)}</div>
//             <div className="text-xs font-medium text-emerald-600/70">Recorded supplier payments</div>
//           </div>
//           <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-background via-card/50 to-background p-6 shadow-sm overflow-hidden">
//             <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">Cash</div>
//             <div className="text-3xl font-bold tabular-nums text-foreground mb-1.5">{formatNumber(supplierReceiptSummary.cash)}</div>
//             <div className="text-xs font-medium text-muted-foreground">Cash-paid receipts</div>
//           </div>
//           <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-background via-card/50 to-background p-6 shadow-sm overflow-hidden">
//             <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">Bank</div>
//             <div className="text-3xl font-bold tabular-nums text-foreground mb-1.5">{formatNumber(supplierReceiptSummary.bank)}</div>
//             <div className="text-xs font-medium text-muted-foreground">Bank-paid receipts</div>
//           </div>
//           {/* <div className="relative rounded-lg border border-amber-200/60 bg-gradient-to-br from-amber-50/80 via-amber-50/60 to-white p-6 shadow-sm overflow-hidden">
//             <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-amber-700/80">Advance</div>
//             <div className="text-3xl font-bold text-amber-700 tabular-nums mb-1.5">{formatNumber(supplierReceiptSummary.advance)}</div>
//             <div className="text-xs font-medium text-amber-700/70">Unapplied supplier credit</div>
//           </div> */}
//         </div>
//       )}

//       <div className="rounded-lg border border-border/60 bg-gradient-to-br from-card via-background to-card shadow-sm overflow-hidden">
//         <div className="px-6 py-5 bg-gradient-to-b from-muted/20 via-muted/10 to-transparent border-b border-border/30">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
//             <div className="flex flex-col min-w-0">
//               <Label className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
//                 <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
//                 <span className="whitespace-nowrap">Select Supplier</span>
//               </Label>
//               <Popover open={receiptSupplierOpen} onOpenChange={setReceiptSupplierOpen}>
//                 <PopoverTrigger asChild>
//                   <Button
//                     variant="outline"
//                     role="combobox"
//                     aria-expanded={receiptSupplierOpen}
//                     className="h-[44px] w-full justify-between border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg"
//                     disabled={allSuppliersLoading}
//                   >
//                     {receiptSupplierId
//                       ? (() => {
//                         const supplier = dropdownSuppliers.find((s) => String(s.id) === receiptSupplierId)
//                         return supplier ? `${supplier.name} ${supplier.company ? `(${supplier.company})` : ''}` : 'Select supplier...'
//                       })()
//                       : 'Select supplier...'}
//                     <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//                   </Button>
//                 </PopoverTrigger>
//                 <PopoverContent className="w-[300px] p-0 bg-white dark:bg-zinc-950">
//                   <Command>
//                     <CommandInput placeholder="Search supplier..." />
//                     <CommandList>
//                       <CommandEmpty>No supplier found.</CommandEmpty>
//                       <CommandGroup>
//                         {dropdownSuppliers.map((supplier) => (
//                           <CommandItem
//                             key={supplier.id}
//                             value={`${supplier.name} ${supplier.company || ''} ${supplier.supplierId || ''} ${supplier.legacyId || ''} ${String(supplier.id).slice(-6)}`}
//                             onSelect={() => {
//                               const val = String(supplier.id)
//                               setReceiptSupplierId(val)
//                               setSelectedSupplierId(val)
//                               setReceiptSupplierOpen(false)
//                             }}
//                           >
//                             <Check
//                               className={cn(
//                                 "mr-2 h-4 w-4",
//                                 receiptSupplierId === String(supplier.id) ? "opacity-100" : "opacity-0"
//                               )}
//                             />
//                             <div className="flex flex-col">
//                               <span className="font-medium">{supplier.name}</span>
//                               <div className="flex items-center gap-2 text-xs text-muted-foreground">
//                                 {supplier.supplierId ? (
//                                   <span className="font-mono bg-muted px-1 rounded">{supplier.supplierId}</span>
//                                 ) : supplier.legacyId ? (
//                                   <span className="font-mono bg-muted px-1 rounded">{supplier.legacyId}</span>
//                                 ) : null}
//                                 {supplier.company && <span>{supplier.company}</span>}
//                               </div>
//                             </div>
//                           </CommandItem>
//                         ))}
//                       </CommandGroup>
//                     </CommandList>
//                   </Command>
//                 </PopoverContent>
//               </Popover>
//             </div>

//             <div className="flex items-center gap-3 md:col-span-2 md:justify-end">
//               {receiptSupplierId && receiptSupplierId !== 'all' ? (
//                 <div className="text-sm text-muted-foreground">
//                   {supplierReceiptTransactions.length} receipt{supplierReceiptTransactions.length === 1 ? '' : 's'} found
//                 </div>
//               ) : null}
//             </div>
//           </div>
//         </div>

//         <div className="px-6 py-6 bg-background">
//           {!receiptSupplierId || receiptSupplierId === 'all' ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
//                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 backdrop-blur-sm ring-2 ring-border/60 shadow-lg">
//                   <FileText className="w-12 h-12 text-muted-foreground" />
//                 </div>
//               </div>
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">No supplier selected</h3>
//               <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
//                 Select a supplier to review grouped supplier payment receipts and print allocation details.
//               </p>
//             </div>
//           ) : supplierReceiptsLoading ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">Loading payment receipts</h3>
//               <p className="text-sm text-muted-foreground">Please wait while we fetch the receipt records...</p>
//             </div>
//           ) : supplierReceiptsError ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <FileText className="w-12 h-12 text-destructive mb-6" />
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">Unable to load receipts</h3>
//               <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
//                 {supplierReceiptsError.response?.data?.message || supplierReceiptsError.message || 'Failed to load supplier payment receipts.'}
//               </p>
//               <Button variant="outline" className="mt-5" onClick={() => refetchSupplierReceipts()}>
//                 <RotateCcw className="h-4 w-4 mr-2" />
//                 Retry
//               </Button>
//             </div>
//           ) : supplierReceiptTransactions.length === 0 ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <FileText className="w-12 h-12 text-muted-foreground mb-6" />
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">No payment receipts found</h3>
//               <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
//                 Record a supplier payment to create the first grouped receipt for this supplier.
//               </p>
//             </div>
//           ) : (
//             <DataTable
//               columns={supplierReceiptColumns}
//               data={supplierReceiptTransactions}
//               enableSearch={false}
//               paginate={true}
//               pageSize={50}
//             />
//           )}
//         </div>
//       </div>
//     </div>
//   )

//   const tabs = [
//     {
//       label: "Supplier Ledger",
//       content: ledgerTabContent,
//     },
//     {
//       label: "Payment History",
//       content: paymentHistoryTabContent,
//     },
//     {
//       label: "Payment Receipts",
//       content: supplierReceiptsTabContent,
//     },
//   ]

//   // Search state for Supplier Ledger tab
//   // const [ledgerSearch, setLedgerSearch] = useState("")

//   // Filter ledger transactions by search
//   // const filteredLedgerTransactions = useMemo(() => {
//   //   if (!ledgerSearch) return allLedgerTransactions
//   //   const searchLower = ledgerSearch.toLowerCase()
//   //   return allLedgerTransactions.filter(entry =>
//   //     entry.supplier?.toLowerCase().includes(searchLower) ||
//   //     entry.reference?.toLowerCase().includes(searchLower) ||
//   //     entry.type?.toLowerCase().includes(searchLower)
//   //   )
//   // }, [allLedgerTransactions, ledgerSearch])

//   return (
//     <div className="space-y-6">
//       {/* Header - Enhanced */}
//       <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
//         <div className="">
//           <BackButton fallbackPath="/reports/payables" label="Back" />
//         </div>

//         <div className="flex items-center gap-3">
//           {suppliersLoading && (
//             <div className="flex items-center gap-2 text-sm text-muted-foreground">
//               <Loader2 className="h-4 w-4 animate-spin" />
//               Loading suppliers...
//             </div>
//           )}
//           <Button
//             onClick={() => setManualDebtOpen(true)}
//             variant="outline"
//             className="border-red-200 hover:bg-red-50 text-red-600 h-11 px-6 shadow-sm"
//           >
//             <Plus className="h-4 w-4 mr-2" />
//             Add Supplier Debt
//           </Button>
//           <Button
//             onClick={() => setUniversalPaymentOpen(true)}
//             className="bg-primary hover:bg-primary/90 h-11 px-6 shadow-sm"
//           >
//             <Plus className="h-4 w-4 mr-2" />
//             Add Payment
//           </Button>
//         </div>
//       </header>

//       <Tabs
//         tabs={tabs}
//         className="space-y-1"
//         activeTab={activeTab}
//         onTabChange={setActiveTab}
//       />

//       <SupplierPaymentModal
//         open={universalPaymentOpen}
//         onClose={() => setUniversalPaymentOpen(false)}
//         entityId={selectedSupplierId !== 'all' ? selectedSupplierId : ''}
//         allLedgerData={allLedgerData}
//         entityName={
//           selectedSupplierId !== 'all'
//             ? (dropdownSuppliers.find(s => String(s.id) === selectedSupplierId)?.name ||
//               dropdownSuppliers.find(s => String(s.id) === selectedSupplierId)?.company ||
//               'Supplier')
//             : ''
//         }
//         totalBalance={
//           selectedSupplierId !== 'all'
//             ? Math.abs(dropdownSuppliers.find(s => String(s.id) === selectedSupplierId)?.balance || 0)
//             : 0
//         }
//         ledgerBalance={balanceForModal}
//         ledgerBalanceSupplierId={selectedSupplierId !== 'all' ? selectedSupplierId : null}
//         supplierBalanceMap={supplierBalanceMap}
//         entities={dropdownSuppliers}
//         onSuccess={() => {
//           queryClient.invalidateQueries({ queryKey: ['pending-balances'] })
//           queryClient.invalidateQueries({ queryKey: ['ledger', 'supplier'] })
//           queryClient.invalidateQueries({ queryKey: ['supplier-payment-receipts'] })
//         }}
//       />

//       <ManualSupplierDebtModal
//         open={manualDebtOpen}
//         onClose={() => setManualDebtOpen(false)}
//         entities={dropdownSuppliers}
//         entityId={selectedSupplierId !== 'all' ? selectedSupplierId : ''}
//         entityName={
//           selectedSupplierId !== 'all'
//             ? (dropdownSuppliers.find(s => String(s.id) === selectedSupplierId)?.name ||
//               dropdownSuppliers.find(s => String(s.id) === selectedSupplierId)?.company ||
//               'Supplier')
//             : ''
//         }
//         onSuccess={() => {
//           queryClient.invalidateQueries({ queryKey: ['pending-balances'] })
//           queryClient.invalidateQueries({ queryKey: ['ledger', 'supplier'] })
//           queryClient.invalidateQueries({ queryKey: ['ledger'] })
//           queryClient.invalidateQueries({ queryKey: ['suppliers'] })
//         }}
//       />

//       <SupplierPaymentReceiptModal
//         open={supplierReceiptModalOpen}
//         onOpenChange={(open) => {
//           setSupplierReceiptModalOpen(open)
//           if (!open) {
//             setSelectedSupplierReceipt(null)
//           }
//         }}
//         receipt={selectedSupplierReceipt}
//       />

//       {/* Request Deletion Dialog (non-super-admin) */}
//       <DeleteRequestDialog
//         open={!!deleteReceiptTarget}
//         onClose={() => setDeleteReceiptTarget(null)}
//         entityType="supplierPayment"
//         entityId={deleteReceiptTarget?.receiptNumber}
//         entityRef={deleteReceiptTarget?.receiptNumber}
//         entitySummary={deleteReceiptTarget ? {
//           "Receipt #": deleteReceiptTarget.receiptNumber,
//           "Amount": formatNumber(deleteReceiptTarget.totalAmount),
//           "Supplier": deleteReceiptTarget.supplierName || "—",
//           "Method": deleteReceiptTarget.methodSummary || "—",
//         } : {}}
//         onSuccess={() => setDeleteReceiptTarget(null)}
//       />

//       {/* Direct Reversal Dialog (super-admin) */}
//       <Dialog open={receiptReversalDialogOpen} onOpenChange={setReceiptReversalDialogOpen}>
//         <DialogContent className="sm:max-w-[500px]">
//           <DialogHeader>
//             <div className="flex items-center gap-3 mb-2">
//               <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
//                 <RotateCcw className="h-5 w-5 text-destructive" />
//               </div>
//               <DialogTitle className="text-xl">Reverse Receipt</DialogTitle>
//             </div>
//           </DialogHeader>
//           {selectedReceipt && (
//             <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 my-2">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-semibold text-muted-foreground">Receipt #:</span>
//                 <span className="text-sm font-medium">{selectedReceipt.receiptNumber}</span>
//               </div>
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-semibold text-muted-foreground">Amount:</span>
//                 <span className="text-sm font-bold">{formatNumber(selectedReceipt.totalAmount)}</span>
//               </div>
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-semibold text-muted-foreground">Supplier:</span>
//                 <span className="text-sm">{selectedReceipt.supplierName}</span>
//               </div>
//             </div>
//           )}
//           <div className="space-y-2">
//             <Label className="text-sm font-semibold">Reason for Reversal *</Label>
//             <Textarea
//               value={receiptReversalReason}
//               onChange={e => setReceiptReversalReason(e.target.value)}
//               placeholder="Please provide a reason for reversing this receipt..."
//               className="min-h-[100px]"
//             />
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setReceiptReversalDialogOpen(false)} disabled={isReversingReceipt}>
//               Cancel
//             </Button>
//             <Button
//               variant="destructive"
//               disabled={isReversingReceipt || !receiptReversalReason.trim()}
//               onClick={async () => {
//                 if (!selectedReceipt || !receiptReversalReason.trim()) return
//                 setIsReversingReceipt(true)
//                 try {
//                   const supplierId = receiptSupplierId || selectedReceipt.raw?.supplierId?._id || selectedReceipt.raw?.supplierId
//                   await ledgerAPI.reverseSupplierReceipt(supplierId, selectedReceipt.receiptNumber, receiptReversalReason.trim())
//                   toast.success(`Receipt ${selectedReceipt.receiptNumber} reversed successfully`)
//                   queryClient.invalidateQueries({ queryKey: ['supplier-payment-receipts'] })
//                   queryClient.invalidateQueries({ queryKey: ['ledger', 'supplier'] })
//                   queryClient.invalidateQueries({ queryKey: ['pending-balances'] })
//                   setReceiptReversalDialogOpen(false)
//                   setSelectedReceipt(null)
//                   setReceiptReversalReason('')
//                 } catch (error) {
//                   toast.error(error.response?.data?.message || 'Failed to reverse receipt')
//                 } finally {
//                   setIsReversingReceipt(false)
//                 }
//               }}
//             >
//               {isReversingReceipt ? (
//                 <><Loader2 className="animate-spin h-4 w-4 mr-2" />Reversing...</>
//               ) : (
//                 <><RotateCcw className="h-4 w-4 mr-2" />Confirm Reversal</>
//               )}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   )
// }


// "use client"

// import { useState, useMemo, useEffect, useCallback } from "react"
// import Link from "next/link"
// import { useRouter, useSearchParams } from "next/navigation"
// import BackButton from "@/components/BackButton"
// import Tabs from "@/components/tabs"
// import { Button } from "@/components/ui/button"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Label } from "@/components/ui/label"
// import { Input } from "@/components/ui/input"
// import { Textarea } from "@/components/ui/textarea"
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
// import DataTable from "../../../components/data-table"
// import { useSuppliers, useAllSuppliers, useSupplier } from "@/lib/hooks/useSuppliers"
// import { useSupplierLedger, useAllSupplierLedgers } from "@/lib/hooks/useLedger"
// import { ledgerAPI } from "@/lib/api/endpoints/ledger"
// import { dispatchOrdersAPI } from "@/lib/api/endpoints/dispatchOrders"
// import { balancesAPI } from "@/lib/api/endpoints/balances"
// import { useQuery } from "@tanstack/react-query"
// import { Loader2, Plus, FileText, Users, Search, Filter, Building2, Clock, CheckCircle2, RotateCcw, Calendar, Download, Printer } from "lucide-react"
// import jsPDF from "jspdf"
// import autoTable from "jspdf-autotable"
// import { Badge } from "@/components/ui/badge"
// import { useQueryClient } from "@tanstack/react-query"
// import toast from "react-hot-toast"
// import SupplierPaymentModal from "@/components/modals/SupplierPaymentModal"
// import { exportToPDF } from "@/lib/utils/pdfExport"
// import ManualSupplierDebtModal from "@/components/modals/ManualSupplierDebtModal"
// import { useAuthStore } from "@/store/store"
// import DeleteRequestDialog from "@/components/modals/DeleteRequestDialog"
// import { Check, ChevronsUpDown } from "lucide-react"
// import BritishDatePicker from "@/components/BritishDatePicker"
// import { cn } from "@/lib/utils"
// import {
//   Command,
//   CommandEmpty,
//   CommandGroup,
//   CommandInput,
//   CommandItem,
//   CommandList,
// } from "@/components/ui/command"
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover"

// // ─── Formatters (stable, defined outside component so they never cause re-renders) ───

// function formatNumber(n) {
//   const num = Number(n || 0)
//   return num.toFixed(2)
// }

// function currency(n) {
//   const num = Number(n || 0)
//   return `${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
// }

// function formatDateTime(_date) {
//   const dateTime = _date.date || _date.createdAt
//   if (!dateTime) return "-"
//   const d = new Date(dateTime)
//   const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })
//   const date = d.toLocaleDateString("en-GB")
//   return `${date} ${time}`
// }

// function buildSupplierReceiptPrintHtml(receipt) {
//   const distributionRows = (receipt.distributions || []).map((distribution) => `
//     <tr>
//       <td style="padding: 10px; border: 1px solid #d1d5db;">${distribution.isAdvance ? "SUPPLIER ADVANCE" : (distribution.orderNumber || distribution.dispatchOrderId?.orderNumber || "-")}</td>
//       <td style="padding: 10px; border: 1px solid #d1d5db; text-align: right;">${formatNumber(distribution.amountApplied)}</td>
//       <td style="padding: 10px; border: 1px solid #d1d5db; text-align: right;">${formatNumber(distribution.previousBalance)}</td>
//       <td style="padding: 10px; border: 1px solid #d1d5db; text-align: right;">${formatNumber(distribution.newBalance)}</td>
//     </tr>
//   `).join("")

//   return `
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <title>Supplier Payment Receipt - ${receipt.receiptNumber}</title>
//       <style>
//         @page {
//           size: A4;
//           margin: 15mm;
//         }
//         body {
//           font-family: 'Segoe UI', IBM Plex Sans, Arial, sans-serif;
//           width: 100%;
//           margin: 0;
//           padding: 0;
//           color: #111827;
//           line-height: 1.5;
//           font-size: 13px;
//         }
//         .container {
//           max-width: 180mm;
//           margin: 0 auto;
//         }
//         .header {
//           border-bottom: 3px solid #111827;
//           padding-bottom: 10px;
//           margin-bottom: 25px;
//           display: flex;
//           justify-content: space-between;
//           align-items: flex-end;
//         }
//         .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em; }
//         .receipt-no { font-family: monospace; font-size: 16px; font-weight: 600; color: #4b5563; }

//         .info-table {
//           width: 100%;
//           border-collapse: collapse;
//           table-layout: fixed;
//           margin: 0 0 18px 0;
//           border: 1px solid #d1d5db;
//         }
//         .info-table th,
//         .info-table td {
//           border: 1px solid #d1d5db;
//           padding: 8px 10px;
//           font-size: 12px;
//           vertical-align: middle;
//         }
//         .info-table th {
//           width: 20%;
//           background: #f3f4f6;
//           color: #4b5563;
//           text-transform: uppercase;
//           letter-spacing: 0.04em;
//           font-weight: 700;
//           text-align: left;
//         }
//         .info-table td {
//           color: #111827;
//           font-weight: 600;
//         }

//         table { width: 100%; border-collapse: collapse; margin-top: 10px; }
//         th { background: #111827; color: white; padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
//         .distribution-table {
//           border: 1px solid #d1d5db;
//         }
//         .distribution-table th {
//           border: 1px solid #d1d5db;
//         }
//         .right { text-align: right; }
//       </style>
//     </head>
//     <body>
//       <div class="container">
//         <div class="header">
//           <div>
//             <h1>PAYMENT RECEIPT</h1>
//             <p style="margin: 5px 0 0 0; color: #6b7280;">KI FASHION - Supplier Copy</p>
//           </div>
//           <div class="receipt-no">${receipt.receiptNumber}</div>
//         </div>

//         <table class="info-table" aria-label="Receipt summary information">
//           <tbody>
//             <tr>
//               <th>Supplier Name</th>
//               <td>${receipt.supplierId?.name || "Unknown Supplier"}</td>
//               <th>Date</th>
//               <td>${formatDateTime({ date: receipt.paymentDate || receipt.date || receipt.createdAt })}</td>
//             </tr>
//             <tr>
//               <th>Company</th>
//               <td>${receipt.supplierId?.company || "-"}</td>
//               <th>Method</th>
//               <td>${(receipt.paymentMethodSummary || "cash").toUpperCase()}</td>
//             </tr>
//             <tr>
//               <th>Supplier ID</th>
//               <td>${receipt.supplierId?.supplierId || "-"}</td>
//               <th>Amount Paid</th>
//               <td>GBP ${formatNumber(receipt.totalAmount)}</td>
//             </tr>

//           </tbody>
//         </table>

//         <table class="distribution-table">
//           <thead>
//             <tr>
//               <th>Order Number</th>
//               <th class="right">Amount Applied</th>
//               <th class="right">Previous Amount</th>
//               <th class="right">Remaining Amount</th>
//             </tr>
//           </thead>
//           <tbody>
//             ${distributionRows}
//           </tbody>
//         </table>

//         <table class="info-table" style="margin: 5px 0 0 0; aria-label="Receipt summary information">
//           <tbody>
//             <tr>
//               <th>Total Balance Before</th>
//               <td>${formatNumber(Math.abs(receipt.balanceBefore || 0))}</td>
//               <th>Amount Paid</th>
//               <td>${formatNumber(receipt.totalAmount)}</td>
//               <th>Total Balance After</th>
//               <td>${formatNumber(Math.abs(receipt.balanceAfter || 0))}</td>
//             </tr>
//           </tbody>
//         </table>


//       </div>
//     </body>
//     </html>
//   `
// }

// function printSupplierReceipt(receipt) {
//   const printWindow = window.open("", "_blank")
//   if (!printWindow) {
//     throw new Error("Print window was blocked")
//   }
//   printWindow.document.write(buildSupplierReceiptPrintHtml(receipt))
//   printWindow.document.close()
//   printWindow.focus()
//   setTimeout(() => {
//     printWindow.print()
//   }, 250)
// }

// // ─── Pure mapping helper (outside component so it isn't recreated each render) ───

// function mapLedgerEntry(entry) {
//   const supplier = entry.entityId || {}
//   let typeLabel = entry.transactionType || "-"

//   if (entry.transactionType === "adjustment") {
//     typeLabel = "Supplier Debt"
//   } else if (entry.transactionType === "payment") {
//     typeLabel = entry.paymentMethod === "cash" ? "Payment - Cash" : entry.paymentMethod === "bank" ? "Payment - Bank" : "Payment"
//   } else if (entry.transactionType === "return") {
//     typeLabel = "Return (Credit)"
//   } else if (entry.transactionType === "purchase") {
//     if (entry.referenceModel === "DispatchOrder") typeLabel = "Dispatch Order"
//     else if (entry.referenceModel === "Purchase") typeLabel = "Local Buying"
//     else typeLabel = "Purchase"
//   } else if (entry.referenceModel === "Return") {
//     typeLabel = "Return"
//   }

//   let readableReference = "-"
//   if (entry.referenceId) {
//     if (typeof entry.referenceId === "object" && entry.referenceId !== null) {
//       if (entry.referenceModel === "Return" || entry.transactionType === "return") {
//         if (entry.referenceId.orderNumber) {
//           readableReference = entry.referenceId.orderNumber
//         } else {
//           const description = entry.description || entry.notes || ""
//           const orderMatch =
//             description.match(/(?:Order|Dispatch Order):?\s*([A-Z0-9-]+)/i) ||
//             description.match(/Dispatch Order\s+([A-Z0-9-]+)/i)
//           if (orderMatch && orderMatch[1]) {
//             readableReference = orderMatch[1]
//           } else {
//             const returnId = entry.referenceId._id?.toString() || entry.referenceId.toString()
//             readableReference = returnId ? `RET-${returnId.slice(-6).toUpperCase()}` : "-"
//           }
//         }
//       } else {
//         readableReference =
//           entry.referenceId.orderNumber ||
//           entry.referenceId.purchaseNumber ||
//           entry.referenceId._id ||
//           "-"
//       }
//     } else {
//       readableReference = entry.referenceId.toString()
//     }
//   } else if (entry.reference || entry.referenceNumber) {
//     readableReference = entry.reference || entry.referenceNumber
//   } else if (entry.transactionType === "adjustment") {
//     readableReference = entry.description || entry.notes || "Manual Adjustment"
//   }

//   const cashPaid =
//     entry.transactionType === "payment" && entry.paymentMethod === "cash" ? entry.credit || 0 : 0
//   const bankPaid =
//     entry.transactionType === "payment" && entry.paymentMethod === "bank" ? entry.credit || 0 : 0
//   const returnAmount = entry.transactionType === "return" ? entry.credit || 0 : 0

//   let discountAmount = 0
//   if (entry.referenceId && typeof entry.referenceId === "object") {
//     discountAmount = entry.referenceId.totalDiscount || entry.referenceId.discount || 0
//   }

//   const dispatchOrderId =
//     entry.referenceModel === "Return" &&
//       entry.referenceId &&
//       typeof entry.referenceId === "object" &&
//       entry.referenceId.dispatchOrderId
//       ? entry.referenceId.dispatchOrderId.toString()
//       : null

//   return {
//     id: entry._id || entry.id,
//     date: entry.date || entry.createdAt,
//     createdAt: entry.createdAt,
//     supplier: supplier.company || supplier.name || "Unknown Supplier",
//     supplierId: supplier._id || supplier.id,
//     type: typeLabel,
//     transactionType: entry.transactionType || entry.type,
//     description: entry.description || entry.notes || "-",
//     debit: Number(entry.debit) || 0,
//     credit: Number(entry.credit) || 0,
//     cashPaid,
//     bankPaid,
//     returnAmount,
//     discount: discountAmount,
//     balance: 0, // calculated separately
//     reference: readableReference,
//     referenceId:
//       entry.referenceId && typeof entry.referenceId === "object" && entry.referenceId._id
//         ? entry.referenceId._id.toString()
//         : entry.referenceId
//           ? entry.referenceId.toString()
//           : null,
//     referenceModel: entry.referenceModel || "-",
//     dispatchOrderId,
//     paymentMethod: entry.paymentMethod || null,
//     paymentDetails: entry.paymentDetails || null,
//     entryNumber: entry.entryNumber || "-",
//     raw: entry,
//   }
// }

// // ─── Stale time constant (shared across all queries on this page) ───
// const STALE_TIME = 2 * 60 * 1000  // 2 minutes
// const GC_TIME = 5 * 60 * 1000  // 5 minutes

// export default function SupplierLedgerPage() {
//   const router = useRouter()
//   const searchParams = useSearchParams()
//   const initialTab = Number(searchParams.get("tab") ?? 0)
//   const [selectedSupplierId, setSelectedSupplierId] = useState("")
//   const [selectedDispatchOrderId, setSelectedDispatchOrderId] = useState("none")
//   const [activeTab, setActiveTab] = useState(initialTab)

//   const handleTabChange = (idx) => {
//     setActiveTab(idx)
//     if (router) router.replace(`/supplier-ledger?tab=${idx}`, { scroll: false })
//   }

//   const [isDialogOpen, setIsDialogOpen] = useState(false)
//   const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
//   const [markAsPaidDialog, setMarkAsPaidDialog] = useState({ open: false, balance: null })
//   const [markAsPaidForm, setMarkAsPaidForm] = useState({ method: "cash", amount: "" })
//   const [isMarkingAsPaid, setIsMarkingAsPaid] = useState(false)
//   const [paymentForm, setPaymentForm] = useState({ amount: "", date: "", description: "", method: "cash" })

//   const [universalPaymentOpen, setUniversalPaymentOpen] = useState(false)
//   const [manualDebtOpen, setManualDebtOpen] = useState(false)

//   const user = useAuthStore((s) => s.user)
//   const isSuperAdmin = user?.role === "super-admin"
//   const [deleteReceiptTarget, setDeleteReceiptTarget] = useState(null)

//   const [receiptReversalDialogOpen, setReceiptReversalDialogOpen] = useState(false)
//   const [selectedReceipt, setSelectedReceipt] = useState(null)
//   const [receiptReversalReason, setReceiptReversalReason] = useState("")
//   const [isReversingReceipt, setIsReversingReceipt] = useState(false)

//   const [ledgerSupplierFilter, setLedgerSupplierFilter] = useState("all")
//   const [ledgerFilterBy, setLedgerFilterBy] = useState("all")
//   const [ledgerSearch, setLedgerSearch] = useState("")
//   const [supplierOpen, setSupplierOpen] = useState(false)
//   const [pendingPaymentSupplierOpen, setPendingPaymentSupplierOpen] = useState(false)
//   const [paymentHistorySupplierOpen, setPaymentHistorySupplierOpen] = useState(false)

//   const [dateFrom, setDateFrom] = useState("")
//   const [dateTo, setDateTo] = useState("")
//   const [transactionTypeFilter, setTransactionTypeFilter] = useState("all")
//   const [paymentMethodFilter, setPaymentMethodFilter] = useState("all")

//   const [paymentHistorySupplier, setPaymentHistorySupplier] = useState("")
//   const [paymentHistoryDateFrom, setPaymentHistoryDateFrom] = useState("")
//   const [paymentHistoryDateTo, setPaymentHistoryDateTo] = useState("")
//   const [paymentHistoryMethodFilter, setPaymentHistoryMethodFilter] = useState("all")
//   const [receiptSupplierId, setReceiptSupplierId] = useState("")
//   const [receiptSupplierOpen, setReceiptSupplierOpen] = useState(false)
//   const [isLoadingSupplierReceipt, setIsLoadingSupplierReceipt] = useState(false)

//   const queryClient = useQueryClient()

//   // ─── Sync URL param → state on mount ───────────────────────────────────────
//   useEffect(() => {
//     const supplierId = searchParams.get("supplierId")
//     if (supplierId) {
//       setLedgerSupplierFilter(supplierId)
//       setSelectedSupplierId(supplierId)
//       setPaymentHistorySupplier(supplierId)
//       setReceiptSupplierId(supplierId)
//     }
//   }, [searchParams])

//   useEffect(() => {
//     if (selectedSupplierId && !receiptSupplierId) {
//       setReceiptSupplierId(selectedSupplierId)
//     }
//   }, [selectedSupplierId, receiptSupplierId])

//   // ─── FIX 1: Removed useSuppliers() — suppliersWithUsers was unused in practice.
//   //            useAllSuppliers is the single source of truth for all dropdowns. ───

//   const { data: allSuppliers = [], isLoading: allSuppliersLoading } = useAllSuppliers({ limit: 100 })
//   const dropdownSuppliers = allSuppliers

//   // ─── FIX 2: Unified ledger fetch — no longer calling both useSupplierLedger
//   //            AND useAllSupplierLedgers for the same supplier simultaneously.
//   //            One call covers Tab 1, Tab 2, and supplierBalanceMap. ───────────

//   const ledgerFilterParams = useMemo(() => {
//     if (!ledgerSupplierFilter) return null
//     // FIX 3: Cap "All Suppliers" at 200 (was 500) to reduce payload size.
//     if (ledgerSupplierFilter === "all") return { limit: 200 }
//     return { supplierId: ledgerSupplierFilter, limit: 100 }
//   }, [ledgerSupplierFilter])

//   const { data: allLedgerData, isLoading: allLedgerLoading } = useAllSupplierLedgers(
//     ledgerFilterParams || {},
//     {
//       // FIX 4: staleTime prevents refetch on every tab focus/window refocus.
//       staleTime: STALE_TIME,
//       gcTime: GC_TIME,
//       enabled: !!ledgerFilterParams,
//     }
//   )

//   // FIX 5: Removed useSupplier() (supplierDetails) — it was only used to fall back
//   //         to supplierDetails.transactions which duplicated allLedgerData.entries.
//   //         supplierDetails.name/company are already available from dropdownSuppliers.

//   // FIX 6: Removed dead allPaymentLedgerData hook (shouldFetchAllPayments was hardcoded false).

//   const { data: unpaidDispatchOrders = [], isLoading: unpaidOrdersLoading } = useQuery({
//     queryKey: ["unpaid-dispatch-orders", selectedSupplierId],
//     queryFn: async () => {
//       if (!selectedSupplierId || selectedSupplierId === "all") return []
//       const response = await dispatchOrdersAPI.getUnpaidBySupplier(selectedSupplierId)
//       return response?.data?.data || response?.data || []
//     },
//     enabled: !!selectedSupplierId && selectedSupplierId !== "all",
//     staleTime: STALE_TIME,
//     gcTime: GC_TIME,
//   })

//   const selectedDispatchOrder = useMemo(() => {
//     if (!selectedDispatchOrderId || selectedDispatchOrderId === "none") return null
//     return unpaidDispatchOrders.find((order) => order._id === selectedDispatchOrderId)
//   }, [selectedDispatchOrderId, unpaidDispatchOrders])

//   const { data: pendingBalancesData, isLoading: pendingBalancesLoading, error: pendingBalancesError } = useQuery({
//     queryKey: ["pending-balances", selectedSupplierId],
//     queryFn: async () => {
//       try {
//         const response = await balancesAPI.getPendingBalances(selectedSupplierId)
//         return (
//           response?.data?.data ||
//           response?.data || { balances: [], totals: { cashPending: 0, bankPending: 0, totalPending: 0 } }
//         )
//       } catch (error) {
//         console.error("Error fetching pending balances:", error)
//         throw error
//       }
//     },
//     enabled: activeTab === 1 && !!selectedSupplierId && selectedSupplierId !== "all",
//     staleTime: STALE_TIME,
//     gcTime: GC_TIME,
//   })

//   const pendingBalances = pendingBalancesData?.balances || []
//   const pendingTotals = pendingBalancesData?.totals || { cashPending: 0, bankPending: 0, totalPending: 0, totalPaid: 0 }

//   const pendingBalancesWithEntryNumbers = useMemo(() => {
//     const entries = allLedgerData?.entries || []
//     const purchaseEntryMap = new Map()
//     for (const entry of entries) {
//       if (entry.transactionType === "purchase" && entry.referenceId) {
//         const refId =
//           typeof entry.referenceId === "object" && entry.referenceId !== null
//             ? entry.referenceId._id?.toString() || entry.referenceId.toString()
//             : entry.referenceId.toString()
//         purchaseEntryMap.set(refId, entry.entryNumber || "-")
//       }
//     }

//     return pendingBalances.map((balance) => {
//       const refIdOrId = balance.referenceId || balance.id
//       const balanceRefId = refIdOrId
//         ? typeof refIdOrId === "object" && refIdOrId !== null
//           ? refIdOrId._id?.toString() || refIdOrId.toString()
//           : refIdOrId.toString()
//         : null
//       return { ...balance, entryNumber: balanceRefId ? purchaseEntryMap.get(balanceRefId) || "-" : "-" }
//     })
//   }, [pendingBalances, allLedgerData])

//   // ─── Payment history — still a separate fetch (different supplier state) ───
//   const paymentHistoryParams = useMemo(() => {
//     if (!paymentHistorySupplier || paymentHistorySupplier === "all") return null
//     return { supplierId: paymentHistorySupplier, limit: 100 }
//   }, [paymentHistorySupplier])

//   const { data: paymentHistoryData, isLoading: paymentHistoryLoading } = useAllSupplierLedgers(
//     paymentHistoryParams || {},
//     {
//       staleTime: STALE_TIME,
//       gcTime: GC_TIME,
//       enabled: !!paymentHistoryParams,
//     }
//   )

//   const receiptQuerySupplierId = receiptSupplierId || paymentHistorySupplier

//   // FIX 7: Removed activeTab from `enabled` — the query result is cached so
//   //         switching between Tab 2 and Tab 3 no longer triggers a refetch.
//   //         staleTime handles freshness instead.
//   const {
//     data: supplierReceiptsData,
//     isLoading: supplierReceiptsLoading,
//     error: supplierReceiptsError,
//     refetch: refetchSupplierReceipts,
//   } = useQuery({
//     queryKey: ["supplier-payment-receipts", receiptQuerySupplierId],
//     queryFn: async () => {
//       if (!receiptQuerySupplierId || receiptQuerySupplierId === "all") return { receipts: [] }
//       const response = await ledgerAPI.getSupplierPaymentReceipts(receiptQuerySupplierId, { limit: 100 })
//       return response?.data?.data || response?.data || { receipts: [] }
//     },
//     enabled: !!receiptQuerySupplierId && receiptQuerySupplierId !== "all",
//     staleTime: STALE_TIME,
//     gcTime: GC_TIME,
//   })

//   // ─── FIX 8: supplierBalanceMap — single-pass O(n) rewrite.
//   //            Previously iterated dropdownSuppliers AND allLedgerData.entries
//   //            in nested loops. Now two linear passes. ─────────────────────────
//   const supplierBalanceMap = useMemo(() => {
//     const balanceMap = {}

//     // Pass 1: seed from supplier API balance (fast fallback)
//     for (const supplier of dropdownSuppliers) {
//       const sid = String(supplier._id || supplier.id)
//       balanceMap[sid] = supplier.balance || 0
//     }

//     // Pass 2: override with precise ledger-calculated balance
//     if (allLedgerData?.entries?.length) {
//       const perSupplier = {}
//       for (const entry of allLedgerData.entries) {
//         const sid =
//           entry.entityId?._id?.toString() ||
//           entry.entityId?.id?.toString() ||
//           (typeof entry.entityId === "string" ? entry.entityId : null)
//         if (!sid) continue
//         if (!perSupplier[sid]) perSupplier[sid] = 0
//         perSupplier[sid] += (Number(entry.debit) || 0) - (Number(entry.credit) || 0)
//       }
//       Object.assign(balanceMap, perSupplier)
//     }

//     return balanceMap
//   }, [allLedgerData?.entries, dropdownSuppliers])

//   // ─── FIX 9: Split allLedgerTransactions into two memos so the expensive
//   //            running-balance loop only re-runs when entries or filter change,
//   //            NOT when ledgerSearch changes. ──────────────────────────────────

//   // Memo A: map raw entries → display rows. Depends only on raw data.
//   const mappedLedgerEntries = useMemo(() => {
//     if (!allLedgerData?.entries) return []
//     return allLedgerData.entries
//       .filter(
//         (e) =>
//           e.transactionType === "purchase" ||
//           e.transactionType === "payment" ||
//           e.transactionType === "return" ||
//           e.transactionType === "adjustment"
//       )
//       .map(mapLedgerEntry)
//   }, [allLedgerData?.entries])

//   // Memo B: apply filter + running balance. Depends on mappedLedgerEntries + ledgerFilterBy.
//   const allLedgerTransactions = useMemo(() => {
//     let filtered = mappedLedgerEntries

//     if (ledgerFilterBy !== "all") {
//       filtered = filtered.filter((entry) => {
//         if (ledgerFilterBy === "cash") return entry.transactionType === "payment" && entry.paymentMethod === "cash"
//         if (ledgerFilterBy === "bank") return entry.transactionType === "payment" && entry.paymentMethod === "bank"
//         if (ledgerFilterBy === "return") return entry.transactionType === "return"
//         if (ledgerFilterBy === "adjustment") return entry.transactionType === "adjustment"
//         if (ledgerFilterBy === "discount") {
//           if (entry.transactionType !== "purchase") return false
//           return entry.discount > 0
//         }
//         return true
//       })
//     }

//     // Sort ascending for running balance calculation
//     const sorted = [...filtered].sort((a, b) => {
//       const tA = new Date(a.date || a.createdAt || 0).getTime()
//       const tB = new Date(b.date || b.createdAt || 0).getTime()
//       return tA - tB
//     })

//     let running = 0
//     for (const entry of sorted) {
//       running = running + entry.debit - entry.credit
//       entry.balance = running
//     }

//     return sorted.reverse()
//   }, [mappedLedgerEntries, ledgerFilterBy])

//   // Memo C: search filter — lightweight string ops, separate from balance calc.
//   const filteredLedgerTransactions = useMemo(() => {
//     if (!ledgerSearch) return allLedgerTransactions
//     const lowerSearch = ledgerSearch.toLowerCase()
//     return allLedgerTransactions.filter(
//       (item) =>
//         (item.description && item.description.toLowerCase().includes(lowerSearch)) ||
//         (item.reference && item.reference.toLowerCase().includes(lowerSearch)) ||
//         (item.supplier && item.supplier.toLowerCase().includes(lowerSearch)) ||
//         (item.entryNumber && item.entryNumber.toString().toLowerCase().includes(lowerSearch)) ||
//         (item.debit && item.debit.toString().includes(lowerSearch)) ||
//         (item.credit && item.credit.toString().includes(lowerSearch))
//     )
//   }, [allLedgerTransactions, ledgerSearch])

//   // ─── Derived totals ─────────────────────────────────────────────────────────

//   const calculatedTotalBalance = useMemo(() => {
//     if (allLedgerTransactions.length > 0) return allLedgerTransactions[0].balance || 0
//     return allLedgerData?.totalBalance || 0
//   }, [allLedgerTransactions, allLedgerData])

//   const calculatedOutstandingBalance = useMemo(() => {
//     if (selectedSupplierId === "all" || !selectedSupplierId) return 0
//     return pendingBalances
//       .filter((balance) => {
//         const balanceSupplierId = balance.supplierId || balance.supplier?._id || balance.supplier?.id
//         return String(balanceSupplierId) === String(selectedSupplierId)
//       })
//       .reduce((sum, balance) => sum + (balance.amount || 0), 0)
//   }, [pendingBalances, selectedSupplierId])

//   const calculatedTotalPendingFromRemaining = useMemo(() => {
//     if (selectedSupplierId === "all") {
//       const ledgerBalance = calculatedTotalBalance
//       if (ledgerBalance > 0) return ledgerBalance
//       return pendingBalances.reduce((sum, b) => sum + (b.amount || 0), 0)
//     }
//     const supplierBalance = supplierBalanceMap[String(selectedSupplierId)]
//     if (supplierBalance !== undefined && supplierBalance !== null && supplierBalance > 0) return supplierBalance
//     return pendingBalances.reduce((sum, b) => sum + (b.amount || 0), 0)
//   }, [selectedSupplierId, calculatedTotalBalance, supplierBalanceMap, pendingBalances])

//   const balanceForModal = useMemo(() => {
//     if (selectedSupplierId === "all" || !selectedSupplierId) return 0
//     const balanceFromMap = supplierBalanceMap[String(selectedSupplierId)]
//     if (balanceFromMap !== undefined && balanceFromMap !== null) return Math.abs(balanceFromMap)
//     if (calculatedOutstandingBalance !== undefined) return Math.abs(calculatedOutstandingBalance)
//     const supplier = dropdownSuppliers.find((s) => String(s.id) === selectedSupplierId)
//     return Math.abs(supplier?.balance || 0)
//   }, [selectedSupplierId, supplierBalanceMap, calculatedOutstandingBalance, dropdownSuppliers])

//   // ─── Payment history transactions ──────────────────────────────────────────

//   const paymentHistoryTransactions = useMemo(() => {
//     if (!paymentHistoryData?.entries) return []

//     let filtered = paymentHistoryData.entries.filter((e) => e.transactionType === "payment")

//     if (paymentHistoryDateFrom) {
//       const fromDate = new Date(paymentHistoryDateFrom)
//       filtered = filtered.filter((e) => new Date(e.date || e.createdAt) >= fromDate)
//     }
//     if (paymentHistoryDateTo) {
//       const toDate = new Date(paymentHistoryDateTo)
//       toDate.setHours(23, 59, 59, 999)
//       filtered = filtered.filter((e) => new Date(e.date || e.createdAt) <= toDate)
//     }
//     if (paymentHistoryMethodFilter !== "all") {
//       filtered = filtered.filter((e) => e.paymentMethod === paymentHistoryMethodFilter)
//     }

//     return filtered.map((entry) => {
//       const supplier = entry.entityId || {}
//       let reference = "-"
//       if (entry.referenceId) {
//         if (typeof entry.referenceId === "object" && entry.referenceId !== null) {
//           reference = entry.referenceId.orderNumber || entry.referenceId.purchaseNumber || entry.referenceId._id || "-"
//         } else {
//           reference = entry.referenceId.toString()
//         }
//       }
//       return {
//         id: entry._id || entry.id,
//         date: entry.date || entry.createdAt,
//         supplierName: supplier.company || supplier.name || "Unknown Supplier",
//         supplierId: supplier._id || supplier.id,
//         reference,
//         paymentMethod: entry.paymentMethod || "cash",
//         amount: entry.credit || 0,
//         madeBy: entry.createdBy?.name || "Unknown",
//         notes: entry.description || entry.remarks || "-",
//         entryNumber: entry.entryNumber || "-",
//         raw: entry,
//       }
//     })
//   }, [paymentHistoryData, paymentHistoryDateFrom, paymentHistoryDateTo, paymentHistoryMethodFilter])

//   const paymentSummary = useMemo(() => {
//     const total = paymentHistoryTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
//     const cash = paymentHistoryTransactions.filter((t) => t.paymentMethod === "cash").reduce((sum, t) => sum + (t.amount || 0), 0)
//     const bank = paymentHistoryTransactions.filter((t) => t.paymentMethod === "bank").reduce((sum, t) => sum + (t.amount || 0), 0)
//     const now = new Date()
//     const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
//     const countThisMonth = paymentHistoryTransactions.filter((t) => new Date(t.date) >= firstDayOfMonth).length
//     return { total, cash, bank, countThisMonth }
//   }, [paymentHistoryTransactions])

//   // ─── Receipt lookup map ─────────────────────────────────────────────────────

//   const receiptByLedgerEntryId = useMemo(() => {
//     const map = new Map()
//     const receipts = supplierReceiptsData?.receipts || []
//     for (const receipt of receipts) {
//       if (!receipt.distributions) continue
//       for (const dist of receipt.distributions) {
//         if (dist.ledgerEntryId) {
//           map.set(String(dist.ledgerEntryId), {
//             receiptNumber: receipt.receiptNumber,
//             distributions: receipt.distributions,
//             totalAmount: receipt.totalAmount,
//           })
//         }
//       }
//     }
//     return map
//   }, [supplierReceiptsData])

//   const supplierReceiptTransactions = useMemo(() => {
//     const receipts = supplierReceiptsData?.receipts || []
//     return receipts.map((receipt) => {
//       const supplier = receipt.supplierId || {}
//       return {
//         id: receipt._id || receipt.id || receipt.receiptNumber,
//         receiptNumber: receipt.receiptNumber,
//         date: receipt.date || receipt.createdAt,
//         supplierName: supplier.company || supplier.name || "Unknown Supplier",
//         supplierId: supplier._id || supplier.id || receipt.supplierId,
//         totalAmount: receipt.totalAmount || 0,
//         cashAmount: receipt.cashAmount || 0,
//         bankAmount: receipt.bankAmount || 0,
//         methodSummary:
//           receipt.paymentMethodSummary ||
//           (receipt.cashAmount > 0 && receipt.bankAmount > 0
//             ? "cash + bank"
//             : receipt.cashAmount > 0
//               ? "cash"
//               : "bank"),
//         status: receipt.status || "active",
//         createdBy: receipt.createdBy?.name || "Unknown",
//         ordersAffected: receipt.ordersAffected || 0,
//         advanceAmount: receipt.advanceAmount || 0,
//         balanceBefore: receipt.balanceBefore,
//         balanceAfter: receipt.balanceAfter,
//         notes: receipt.notes || "-",
//         raw: receipt,
//       }
//     })
//   }, [supplierReceiptsData])

//   const supplierReceiptSummary = useMemo(() => {
//     const total = supplierReceiptTransactions.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
//     const advance = supplierReceiptTransactions.reduce((sum, r) => sum + (r.advanceAmount || 0), 0)
//     const cash = supplierReceiptTransactions.reduce((sum, r) => sum + (r.cashAmount || 0), 0)
//     const bank = supplierReceiptTransactions.reduce((sum, r) => sum + (r.bankAmount || 0), 0)
//     return { total, advance, cash, bank }
//   }, [supplierReceiptTransactions])

//   // ─── FIX 10: useCallback for print handlers passed into table column renderers ───

//   const handlePrintSupplierReceipt = useCallback(
//     async (receiptRow) => {
//       const supplierId = receiptSupplierId || receiptRow.raw?.supplierId?._id || receiptRow.raw?.supplierId
//       if (!supplierId) {
//         toast.error("Select a supplier to print the receipt")
//         return
//       }
//       setIsLoadingSupplierReceipt(true)
//       try {
//         const response = await ledgerAPI.getSupplierPaymentReceipt(supplierId, receiptRow.receiptNumber)
//         const receiptData = response?.data?.data || response?.data || null
//         if (!receiptData) throw new Error("Receipt data not found")
//         printSupplierReceipt(receiptData)
//       } catch (error) {
//         console.error("Error printing supplier payment receipt:", error)
//         toast.error(error.response?.data?.message || "Failed to print supplier payment receipt")
//       } finally {
//         setIsLoadingSupplierReceipt(false)
//       }
//     },
//     [receiptSupplierId]
//   )

//   const handleSupplierRowClick = useCallback((supplier) => {
//     setSelectedSupplierId(String(supplier.id))
//     setActiveTab(1)
//   }, [])



//   // FIX 11: paymentHistoryColumns depends on receiptByLedgerEntryId and isLoadingSupplierReceipt.
//   //         Wrapped handlePrintSupplierReceipt in useCallback above so this memo
//   //         doesn't rebuild on every render.
//   const paymentHistoryColumns = useMemo(() => {
//     const columns = [
//       {
//         header: "Date",
//         accessor: "date",
//         render: (row) => formatDateTime(row),
//       },
//       {
//         header: "Entry Number",
//         accessor: "entryNumber",
//         render: (row) => <span className="font-medium">{row.entryNumber || "-"}</span>,
//       },
//       {
//         header: "Order Reference",
//         accessor: "reference",
//         render: (row) =>
//           row.raw?.referenceId ? (
//             <Link
//               href={`/dispatch-orders/${typeof row.raw.referenceId === "object" ? row.raw.referenceId._id : row.raw.referenceId}`}
//               className="font-medium text-blue-600 hover:underline"
//             >
//               {row.reference || "-"}
//             </Link>
//           ) : (
//             <span className="font-medium">{row.reference || "-"}</span>
//           ),
//       },
//       {
//         header: "Method",
//         accessor: "paymentMethod",
//         render: (row) => (
//           <Badge variant="outline" className="uppercase">
//             {row.paymentMethod || "-"}
//           </Badge>
//         ),
//         pdfValue: (row) => row.paymentMethod === "cash" ? "Cash" : "Bank"
//       },
//       {
//         header: "Amount",
//         accessor: "amount",
//         render: (row) => (
//           <span className="tabular-nums font-semibold text-green-600">{formatNumber(row.amount || 0)}</span>
//         ),
//       },
//       {
//         header: "Receipt",
//         accessor: "receipt",
//         render: (row) => {
//           const receipt = receiptByLedgerEntryId.get(row.id)
//           if (!receipt) return <span className="text-muted-foreground">-</span>
//           return (
//             <Button
//               size="sm"
//               variant="outline"
//               className="gap-1.5 text-blue-600 hover:text-blue-700"
//               onClick={() => handlePrintSupplierReceipt({ receiptNumber: receipt.receiptNumber, raw: { supplierId: row.supplierId } })}
//               disabled={isLoadingSupplierReceipt}
//             >
//               <FileText className="h-3.5 w-3.5" />
//               {receipt.receiptNumber}
//             </Button>
//           )
//         },
//       },
//       {
//         header: "Notes",
//         accessor: "notes",
//         render: (row) => (
//           <span className="text-sm">
//             {row.notes && row.notes.length > 50 ? row.notes.substring(0, 50) + "..." : row.notes || "-"}
//           </span>
//         ),
//       },
//     ]
//     return columns
//   }, [receiptByLedgerEntryId, isLoadingSupplierReceipt, handlePrintSupplierReceipt])

//   const supplierReceiptColumns = useMemo(() => {
//     1
//     return [
//       {
//         header: "Receipt #",
//         accessor: "receiptNumber",
//         render: (row) => <span className="font-mono font-medium text-blue-600">{row.receiptNumber}</span>,
//       },
//       {
//         header: "Date",
//         accessor: "date",
//         render: (row) => formatDateTime(row),
//       },
//       {
//         header: "Supplier",
//         accessor: "supplierName",
//         render: (row) => (
//           <span className="font-medium">{row.supplierCompany || row.supplierName || "-"}</span>
//         ),
//       },
//       {
//         header: "Amount",
//         accessor: "totalAmount",
//         render: (row) => (
//           <span className="tabular-nums font-semibold text-green-600">{formatNumber(row.totalAmount)}</span>
//         ),
//       },
//       {
//         header: "Payment Method",
//         accessor: "methodSummary",
//         render: (row) => <Badge variant="outline" className="uppercase">{row.methodSummary}</Badge>,
//         pdfValue: (row) => row.methodSummary.toUpperCase()
//       },
//       {
//         header: "Applied",
//         accessor: "ordersAffected",
//         render: (row) => (
//           <span className="text-sm text-muted-foreground">
//             {row.ordersAffected} order{row.ordersAffected === 1 ? "" : "s"}
//             {row.advanceAmount > 0 ? ` + ${formatNumber(row.advanceAmount)} advance` : ""}
//           </span>
//         ),
//       },
//       {
//         header: "Created By",
//         accessor: "createdBy",
//         render: (row) => row.createdBy,
//       },
//       {
//         header: "Actions",
//         accessor: "actions",
//         render: (row) => (
//           <div className="flex gap-2">
//             <Button
//               size="sm"
//               variant="outline"
//               onClick={() => handlePrintSupplierReceipt(row)}
//               disabled={isLoadingSupplierReceipt}
//             >
//               <Printer className="h-4 w-4" />
//             </Button>
//             {row.status === "active" &&
//               (isSuperAdmin ? (
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
//                   onClick={() => {
//                     setSelectedReceipt(row)
//                     setReceiptReversalReason("")
//                     setReceiptReversalDialogOpen(true)
//                   }}
//                   title="Reverse Receipt"
//                 >
//                   <RotateCcw className="h-4 w-4" />
//                 </Button>
//               ) : (
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   className="text-orange-600 border-orange-400 hover:bg-orange-50"
//                   onClick={() => setDeleteReceiptTarget(row)}
//                   title="Request Deletion"
//                 >
//                   <RotateCcw className="h-4 w-4" />
//                 </Button>
//               ))}
//           </div>
//         ),
//       },
//     ]
//   }, [isLoadingSupplierReceipt, isSuperAdmin, handlePrintSupplierReceipt])

//   const pendingBalanceColumns = useMemo(() => {
//     return [
//       {
//         header: "Date",
//         accessor: "date",
//         render: (row) => formatDateTime(row),
//       },
//       {
//         header: "Entry Number",
//         accessor: "entryNumber",
//         render: (row) => <span className="font-medium">{row.entryNumber || "-"}</span>,
//       },
//       {
//         header: "Reference",
//         accessor: "reference",
//         render: (row) =>
//           row.id ? (
//             <Link href={`/dispatch-orders/${row.id}`} className="font-medium text-blue-600 hover:underline cursor-pointer">
//               {row.reference || "-"}
//             </Link>
//           ) : (
//             <span className="font-medium">{row.reference || "-"}</span>
//           ),
//       },
//       {
//         header: "Total Amount",
//         accessor: "totalAmount",
//         render: (row) => <span className="font-semibold">{formatNumber(row.totalAmount || row.amount || 0)}</span>,
//       },
//       {
//         header: "Paid Amount",
//         accessor: "totalPaid",
//         render: (row) => (
//           <span className="tabular-nums text-green-600 font-medium">{formatNumber(row.totalPaid || 0)}</span>
//         ),
//       },
//       {
//         header: "Remaining",
//         accessor: "amount",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${(row.amount || 0) > 0 ? "text-red-600" : "text-muted-foreground"}`}>
//             {formatNumber(row.amount || 0)}
//           </span>
//         ),
//       },
//       {
//         header: "Payment Type",
//         accessor: "paymentType",
//         render: (row) => (
//           <Badge variant="outline" className="uppercase">
//             {row.paymentType || "-"}
//           </Badge>
//         ),
//         pdfValue: (row) => row.paymentType === "cash" ? "Cash" : "Bank"
//       },
//       {
//         header: "Status",
//         accessor: "status",
//         render: (row) => {
//           const statusConfig = {
//             paid: { label: "Paid", className: "bg-green-100 text-green-800" },
//             partial: { label: "Partial", className: "bg-orange-100 text-orange-800" },
//             pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
//           }
//           const config = statusConfig[row.status] || statusConfig.pending
//           return <Badge className={config.className}>{config.label}</Badge>
//         },
//       },
//     ]
//   }, [])

//   const allLedgerColumns = useMemo(
//     () => [
//       {
//         header: "Entry Number",
//         accessor: "entryNumber",
//         render: (row) => <span className="font-medium">{row.entryNumber}</span>,
//       },
//       {
//         header: "Date",
//         accessor: "date",
//         render: (row) => formatDateTime(row),
//       },
//       {
//         header: "Supplier",
//         accessor: "supplier",
//         render: (row) => <span className="font-medium">{row.supplier}</span>,
//       },
//       {
//         header: "Type",
//         accessor: "type",
//         render: (row) => {
//           const labels = {
//             purchase: "Purchase",
//             payment: "Payment",
//             return: "Return",
//             adjustment: "Adjustment",
//             "opening-balance": "Opening Balance"
//           }
//           const label = labels[row.type] || row.type || "-"
//           return <span className="text-muted-foreground text-xs">{label}</span>
//         },
//         pdfValue: (row) => row.type || "-"
//       },
//       {
//         header: "Reference",
//         accessor: "reference",
//         render: (row) => {
//           const linkTarget = row.referenceModel === "Return" ? row.dispatchOrderId : row.referenceId
//           return linkTarget ? (
//             <Link href={`/dispatch-orders/${linkTarget}`} className="font-medium text-blue-600 hover:underline">
//               {row.reference || "-"}
//             </Link>
//           ) : (
//             <span className="font-medium">{row.reference || "-"}</span>
//           )
//         },
//       },
//       {
//         header: "Debit (Owe)",
//         accessor: "debit",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${row.debit > 0 ? "text-red-600" : "text-muted-foreground"}`}>
//             {row.debit > 0 ? formatNumber(row.debit) : "-"}
//           </span>
//         ),
//         pdfValue: (row) => row.debit || 0
//       },
//       {
//         header: "Cash Paid",
//         accessor: "cashPaid",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${row.cashPaid > 0 ? "text-blue-600" : "text-muted-foreground"}`}>
//             {row.cashPaid > 0 ? formatNumber(row.cashPaid) : "-"}
//           </span>
//         ),
//         pdfValue: (row) => row.cashPaid || 0
//       },
//       {
//         header: "Bank Paid",
//         accessor: "bankPaid",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${row.bankPaid > 0 ? "text-purple-600" : "text-muted-foreground"}`}>
//             {row.bankPaid > 0 ? formatNumber(row.bankPaid) : "-"}
//           </span>
//         ),
//         pdfValue: (row) => row.bankPaid || 0
//       },
//       {
//         header: "Return",
//         accessor: "returnAmount",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${row.returnAmount > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
//             {row.returnAmount > 0 ? formatNumber(row.returnAmount) : "-"}
//           </span>
//         ),
//         pdfValue: (row) => row.returnAmount || 0
//       },
//       {
//         header: "Discount",
//         accessor: "discount",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${row.discount > 0 ? "text-green-600" : "text-muted-foreground"}`}>
//             {row.discount > 0 ? formatNumber(row.discount) : "-"}
//           </span>
//         ),
//         pdfValue: (row) => row.discount || 0
//       },
//       {
//         header: "Balance",
//         accessor: "balance",
//         render: (row) => <span className="tabular-nums font-bold">{formatNumber(row.balance)}</span>,
//         pdfValue: (row) => row.balance || 0
//       },
//     ],
//     []
//   )

//   const transactionColumns = useMemo(
//     () => [
//       {
//         header: "Date",
//         accessor: "date",
//         render: (row) => formatDateTime(row),
//       },
//       {
//         header: "Supplier",
//         accessor: "supplierName",
//         render: (row) => (
//           <span className="font-medium">{row.supplierCompany || row.supplierName || "-"}</span>
//         ),
//       },
//       {
//         header: "Product/Order Details",
//         accessor: "productDetails",
//         render: (row) => <span className="text-sm text-muted-foreground">{row.productDetails || "-"}</span>,
//       },
//       {
//         header: "Description",
//         accessor: "description",
//         render: (row) => <span className="text-sm">{row.description || "-"}</span>,
//       },
//       {
//         header: "Paid",
//         accessor: "paid",
//         render: (row) =>
//           row.paid > 0 ? (
//             <span className="tabular-nums text-green-600 font-medium">{formatNumber(row.paid)}</span>
//           ) : (
//             <span className="tabular-nums text-muted-foreground">-</span>
//           ),
//       },
//       {
//         header: "Cash Payment",
//         accessor: "cashPayment",
//         render: (row) =>
//           row.cashPayment > 0 ? (
//             <span className="tabular-nums text-blue-600 font-medium">{formatNumber(row.cashPayment)}</span>
//           ) : (
//             <span className="tabular-nums text-muted-foreground">-</span>
//           ),
//       },
//       {
//         header: "Bank Payment",
//         accessor: "bankPayment",
//         render: (row) =>
//           row.bankPayment > 0 ? (
//             <span className="tabular-nums text-purple-600 font-medium">{formatNumber(row.bankPayment)}</span>
//           ) : (
//             <span className="tabular-nums text-muted-foreground">-</span>
//           ),
//       },
//       {
//         header: "Balance",
//         accessor: "balance",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${row.balance >= 0 ? "text-red-600" : "text-green-600"}`}>
//             {formatNumber(Math.abs(row.balance))}
//           </span>
//         ),
//       },
//     ],
//     []
//   )

//   const handleExportLedgerPDF = useCallback(() => {
//     if (!filteredLedgerTransactions.length) {
//       toast.error("No ledger data to export")
//       return
//     }
//     const supplier = dropdownSuppliers.find(s => String(s.id) === ledgerSupplierFilter)
//     const supplierName = supplier ? supplier.name : (ledgerSupplierFilter === "all" ? "All Suppliers" : "Supplier")
//     const dateStr = new Date().toISOString().slice(0, 10)
//     const safeName = supplierName.replace(/[^a-zA-Z0-9]/g, "_")

//     exportToPDF({
//       title: "Supplier Ledger Report",
//       subtitle: `Supplier: ${supplierName}`,
//       columns: allLedgerColumns,
//       data: filteredLedgerTransactions,
//       filename: `Supplier_Ledger_${safeName}_${dateStr}`
//     }).then(result => {
//       if (result.success) toast.success("PDF report generated")
//       else toast.error("Failed to generate PDF")
//     })
//   }, [filteredLedgerTransactions, ledgerSupplierFilter, dropdownSuppliers, allLedgerColumns])

//   const handleExportPaymentHistoryPDF = useCallback(() => {
//     if (!paymentHistoryTransactions.length) {
//       toast.error("No payment history data to export")
//       return
//     }
//     const supplier = dropdownSuppliers.find(s => String(s.id) === paymentHistorySupplier)
//     const supplierName = supplier ? supplier.name : "Supplier"

//     exportToPDF({
//       title: "Supplier Payment History",
//       subtitle: `Supplier: ${supplierName}`,
//       columns: paymentHistoryColumns.filter(c => c.header !== "Receipt"),
//       data: paymentHistoryTransactions,
//       filename: `Supplier_Payments_${supplierName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}`
//     })
//   }, [paymentHistoryTransactions, paymentHistorySupplier, dropdownSuppliers, paymentHistoryColumns])

//   const handleExportReceiptsPDF = useCallback(() => {
//     if (!supplierReceiptTransactions.length) {
//       toast.error("No receipt data to export")
//       return
//     }
//     const supplier = dropdownSuppliers.find(s => String(s.id) === receiptSupplierId)
//     const supplierName = supplier ? supplier.name : "Supplier"

//     exportToPDF({
//       title: "Supplier Payment Receipts",
//       subtitle: `Supplier: ${supplierName}`,
//       columns: supplierReceiptColumns.filter(c => c.header !== "Actions"),
//       data: supplierReceiptTransactions,
//       filename: `Supplier_Receipts_${supplierName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}`
//     })
//   }, [supplierReceiptTransactions, receiptSupplierId, dropdownSuppliers, supplierReceiptColumns])

//   // ─── Mark as Paid handlers ──────────────────────────────────────────────────

//   const handleMarkAsPaid = useCallback((balance) => {
//     setMarkAsPaidForm({ method: balance.paymentType || "cash", amount: balance.amount.toString() })
//     setMarkAsPaidDialog({ open: true, balance })
//   }, [])

//   const handleConfirmMarkAsPaid = async () => {
//     const { balance } = markAsPaidDialog
//     if (!balance) return

//     const amount = parseFloat(markAsPaidForm.amount)
//     if (!amount || amount <= 0) {
//       toast.error("Please enter a valid amount")
//       return
//     }

//     setIsMarkingAsPaid(true)
//     try {
//       await ledgerAPI.createEntry({
//         type: "supplier",
//         entityId: balance.supplierId,
//         entityModel: "Supplier",
//         transactionType: "payment",
//         referenceId: balance.id,
//         referenceModel: "DispatchOrder",
//         debit: 0,
//         credit: amount,
//         date: new Date(),
//         description: `Payment for ${balance.reference} - ${markAsPaidForm.method}`,
//         paymentMethod: markAsPaidForm.method,
//         paymentDetails: {
//           cashPayment: markAsPaidForm.method === "cash" ? amount : 0,
//           bankPayment: markAsPaidForm.method === "bank" ? amount : 0,
//           remainingBalance: 0,
//         },
//       })

//       toast.success("Payment recorded successfully")
//       setMarkAsPaidDialog({ open: false, balance: null })
//       setMarkAsPaidForm({ method: "cash", amount: "" })

//       // FIX 12: Targeted invalidation with exact: true to avoid cascade over-invalidation.
//       queryClient.invalidateQueries({ queryKey: ["pending-balances", selectedSupplierId], exact: true })
//       queryClient.invalidateQueries({ queryKey: ["supplier-payment-receipts", selectedSupplierId], exact: true })
//       queryClient.invalidateQueries({ queryKey: ["unpaid-dispatch-orders", selectedSupplierId], exact: true })
//       // Broad invalidation only for things that genuinely need global refresh
//       queryClient.invalidateQueries({ queryKey: ["ledger"] })
//       queryClient.invalidateQueries({ queryKey: ["suppliers"] })
//     } catch (error) {
//       console.error("Error marking as paid:", error)
//       toast.error(error.response?.data?.message || error.message || "Failed to record payment")
//     } finally {
//       setIsMarkingAsPaid(false)
//     }
//   }

//   const handleAddPayment = async () => {
//     if (!selectedSupplierId || selectedSupplierId === "all") {
//       toast.error("Please select a supplier first")
//       return
//     }

//     const amount = parseFloat(paymentForm.amount)
//     if (!amount || amount <= 0) {
//       toast.error("Please enter a valid amount")
//       return
//     }

//     if (!paymentForm.method || !["cash", "bank"].includes(paymentForm.method)) {
//       toast.error("Please select a valid payment method (Cash or Bank)")
//       return
//     }

//     setIsSubmittingPayment(true)
//     try {
//       const supplier = dropdownSuppliers.find((s) => String(s.id) === selectedSupplierId)
//       if (!supplier) throw new Error("Supplier not found")

//       const paymentPayload = {
//         type: "supplier",
//         entityId: selectedSupplierId,
//         entityModel: "Supplier",
//         transactionType: "payment",
//         debit: 0,
//         credit: amount,
//         date: paymentForm.date ? new Date(paymentForm.date) : new Date(),
//         description: paymentForm.description || `Payment - ${paymentForm.method}`,
//         paymentMethod: paymentForm.method,
//         paymentDetails: {
//           cashPayment: paymentForm.method === "cash" ? amount : 0,
//           bankPayment: paymentForm.method === "bank" ? amount : 0,
//           remainingBalance: 0,
//         },
//       }

//       if (selectedDispatchOrderId && selectedDispatchOrderId !== "none" && selectedDispatchOrder) {
//         paymentPayload.referenceId = selectedDispatchOrderId
//         paymentPayload.referenceModel = "DispatchOrder"
//         paymentPayload.description =
//           paymentForm.description || `Payment for ${selectedDispatchOrder.orderNumber} - ${paymentForm.method}`
//       }

//       await ledgerAPI.createEntry(paymentPayload)
//       toast.success("Payment recorded successfully")

//       setPaymentForm({ amount: "", date: "", description: "", method: "cash" })
//       setSelectedDispatchOrderId("none")
//       setIsDialogOpen(false)

//       // FIX 12 (continued): Targeted invalidation
//       queryClient.invalidateQueries({ queryKey: ["pending-balances", selectedSupplierId], exact: true })
//       queryClient.invalidateQueries({ queryKey: ["unpaid-dispatch-orders", selectedSupplierId], exact: true })
//       queryClient.invalidateQueries({ queryKey: ["ledger"] })
//       queryClient.invalidateQueries({ queryKey: ["suppliers"] })
//       if (paymentHistorySupplier) {
//         queryClient.invalidateQueries({ queryKey: ["payment-history", paymentHistorySupplier], exact: true })
//       }
//     } catch (error) {
//       console.error("Error creating payment:", error)
//       toast.error(error.response?.data?.message || error.message || "Failed to record payment")
//     } finally {
//       setIsSubmittingPayment(false)
//     }
//   }

//   // ─── Supplier selector sub-components (stable JSX) ─────────────────────────

//   const paymentSelector = (
//     <Popover open={pendingPaymentSupplierOpen} onOpenChange={setPendingPaymentSupplierOpen}>
//       <PopoverTrigger asChild>
//         <Button
//           variant="outline"
//           role="combobox"
//           aria-expanded={pendingPaymentSupplierOpen}
//           className="w-full justify-between bg-background"
//           disabled={allSuppliersLoading}
//         >
//           {selectedSupplierId && selectedSupplierId !== "all"
//             ? (() => {
//               const supplier = dropdownSuppliers.find((s) => String(s.id) === selectedSupplierId)
//               return supplier
//                 ? `${supplier.name} ${supplier.supplierId ? `(${supplier.supplierId})` : ""}`
//                 : "Select supplier..."
//             })()
//             : "Select supplier..."}
//           <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//         </Button>
//       </PopoverTrigger>
//       <PopoverContent className="w-[400px] p-0 bg-white dark:bg-zinc-950">
//         <Command>
//           <CommandInput placeholder="Search name, company, or ID..." />
//           <CommandList>
//             <CommandEmpty>No supplier found.</CommandEmpty>
//             <CommandGroup>
//               {dropdownSuppliers.map((supplier) => (
//                 <CommandItem
//                   key={supplier.id}
//                   value={`${supplier.name} ${supplier.company || ""} ${supplier.supplierId || ""} ${supplier.legacyId || ""} ${String(supplier.id).slice(-6)}`}
//                   onSelect={() => {
//                     const val = String(supplier.id)
//                     setSelectedSupplierId(val)
//                     setSelectedDispatchOrderId("none")
//                     setPendingPaymentSupplierOpen(false)
//                   }}
//                 >
//                   <Check
//                     className={cn("mr-2 h-4 w-4", selectedSupplierId === String(supplier.id) ? "opacity-100" : "opacity-0")}
//                   />
//                   <div className="flex flex-col">
//                     <span className="font-medium">{supplier.name}</span>
//                     <div className="flex items-center gap-2 text-xs text-muted-foreground">
//                       {supplier.supplierId ? (
//                         <span className="font-mono bg-muted px-1 rounded">{supplier.supplierId}</span>
//                       ) : supplier.legacyId ? (
//                         <span className="font-mono bg-muted px-1 rounded">{supplier.legacyId}</span>
//                       ) : null}
//                       {supplier.company && <span>{supplier.company}</span>}
//                     </div>
//                   </div>
//                 </CommandItem>
//               ))}
//             </CommandGroup>
//           </CommandList>
//         </Command>
//       </PopoverContent>
//     </Popover>
//   )

//   // ─── Tab content ────────────────────────────────────────────────────────────

//   const ledgerTabContent = (
//     <div className="space-y-2">
//       <div className="rounded-lg border border-border bg-card p-3 sm:p-4 shadow-sm">
//         <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
//           <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
//             <PopoverTrigger asChild>
//               <Button
//                 variant="outline"
//                 role="combobox"
//                 aria-expanded={supplierOpen}
//                 className="w-full sm:w-[250px] justify-between"
//                 disabled={allSuppliersLoading}
//               >
//                 {ledgerSupplierFilter
//                   ? ledgerSupplierFilter === "all"
//                     ? "All Suppliers"
//                     : (() => {
//                       const supplier = dropdownSuppliers.find((s) => String(s.id) === ledgerSupplierFilter)
//                       return supplier
//                         ? `${supplier.name} ${supplier.company ? `(${supplier.company})` : ""}`
//                         : "Select supplier..."
//                     })()
//                   : "Select supplier..."}
//                 <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//               </Button>
//             </PopoverTrigger>
//             <PopoverContent className="w-[300px] p-0 bg-white dark:bg-zinc-950">
//               <Command>
//                 <CommandInput placeholder="Search supplier name or ID..." />
//                 <CommandList>
//                   <CommandEmpty>No supplier found.</CommandEmpty>
//                   <CommandGroup>
//                     <CommandItem
//                       key="all"
//                       value="all suppliers"
//                       onSelect={() => {
//                         setLedgerSupplierFilter("all")
//                         setSelectedSupplierId("")
//                         setSupplierOpen(false)
//                       }}
//                     >
//                       <Check className={cn("mr-2 h-4 w-4", ledgerSupplierFilter === "all" ? "opacity-100" : "opacity-0")} />
//                       <div className="flex items-center gap-2">
//                         <Users className="h-4 w-4 text-primary" />
//                         <span className="font-semibold">All Suppliers</span>
//                       </div>
//                     </CommandItem>
//                     {dropdownSuppliers.map((supplier) => (
//                       <CommandItem
//                         key={supplier.id}
//                         value={`${supplier.name} ${supplier.company || ""} ${supplier.supplierId || ""} ${supplier.legacyId || ""} ${String(supplier.id).slice(-6)}`}
//                         onSelect={() => {
//                           const val = String(supplier.id)
//                           setLedgerSupplierFilter(val === ledgerSupplierFilter ? "" : val)
//                           if (val && val !== "all") setSelectedSupplierId(val)
//                           else setSelectedSupplierId("")
//                           setSupplierOpen(false)
//                         }}
//                       >
//                         <Check
//                           className={cn("mr-2 h-4 w-4", ledgerSupplierFilter === String(supplier.id) ? "opacity-100" : "opacity-0")}
//                         />
//                         <div className="flex flex-col">
//                           <span className="font-medium">{supplier.company}</span>
//                           <div className="flex items-center gap-2 text-xs text-muted-foreground">
//                             {/* {supplier.supplierId ? (
//                               <span className="font-mono bg-muted px-1 rounded">{supplier.supplierId}</span>
//                             ) : supplier.legacyId ? (
//                               <span className="font-mono bg-muted px-1 rounded">{supplier.legacyId}</span>
//                             ) : null} */}
//                             {supplier.name && <span>{supplier.name}</span>}
//                           </div>
//                         </div>
//                       </CommandItem>
//                     ))}
//                   </CommandGroup>
//                 </CommandList>
//               </Command>
//             </PopoverContent>
//           </Popover>

//           {ledgerSupplierFilter && (
//             <Select value={ledgerFilterBy} onValueChange={setLedgerFilterBy}>
//               <SelectTrigger className="h-10 w-full sm:w-[180px] border-border">
//                 <SelectValue placeholder="All" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All</SelectItem>
//                 <SelectItem value="cash">Cash</SelectItem>
//                 <SelectItem value="bank">Bank</SelectItem>
//                 <SelectItem value="discount">Discount</SelectItem>
//                 <SelectItem value="return">Return</SelectItem>
//                 <SelectItem value="adjustment">Supplier Debt</SelectItem>
//               </SelectContent>
//             </Select>
//           )}

//           {ledgerSupplierFilter && (
//             <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
//               <div className="relative flex-1 sm:flex-initial">
//                 <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
//                   <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
//                 </div>
//                 <input
//                   type="text"
//                   placeholder="Search..."
//                   value={ledgerSearch}
//                   onChange={(e) => setLedgerSearch(e.target.value)}
//                   className="h-10 w-full sm:w-[200px] pl-9 sm:pl-10 pr-3 rounded-lg border border-input bg-background text-xs sm:text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
//                 />
//               </div>
//               <Button size="sm" className="h-10 px-4 sm:px-6 bg-primary hover:bg-primary/90 text-xs sm:text-sm min-w-[80px] sm:min-w-0">
//                 Search
//               </Button>
//             </div>
//           )}

//           {/* {ledgerSupplierFilter && filteredLedgerTransactions.length > 0 && (
//             <Button variant="outline" size="sm" onClick={handleExportLedgerPDF} className="gap-2">
//               <Download className="h-4 w-4" />
//               Export PDF
//             </Button>
//           )} */}
//         </div>
//       </div>

//       <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
//         <div className="p-6">
//           {!ledgerSupplierFilter ? (
//             <div className="p-12 text-center">
//               <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
//                 <Building2 className="w-8 h-8 text-muted-foreground" />
//               </div>
//               <p className="text-sm font-medium text-foreground mb-1">Select a supplier to view ledger</p>
//               <p className="text-xs text-muted-foreground">
//                 Choose a supplier from the dropdown above to see their complete transaction history
//               </p>
//             </div>
//           ) : allLedgerLoading ? (
//             <div className="p-12 flex flex-col items-center justify-center">
//               <Loader2 className="animate-spin h-8 w-8 text-primary mb-4" />
//               <p className="text-sm text-muted-foreground">Loading ledger entries...</p>
//             </div>
//           ) : filteredLedgerTransactions.length === 0 ? (
//             <div className="p-12 text-center">
//               <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
//                 <FileText className="w-8 h-8 text-muted-foreground" />
//               </div>
//               <p className="text-sm font-medium text-foreground mb-1">No transactions found</p>
//               <p className="text-xs text-muted-foreground">
//                 {ledgerSearch ? "Try adjusting your search or filters" : "No ledger entries found for this supplier"}
//               </p>
//             </div>
//           ) : (
//             <>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//                 <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
//                   <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">Total Entries</div>
//                   <div className="text-2xl font-bold tabular-nums text-foreground">{filteredLedgerTransactions.length}</div>
//                 </div>
//                 <div
//                   className={`rounded-lg border p-5 shadow-sm ${(calculatedTotalBalance || 0) <= 0
//                     ? "border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-emerald-50/30"
//                     : "border-red-200 bg-gradient-to-br from-red-50/50 to-red-50/30"
//                     }`}
//                 >
//                   <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">
//                     {ledgerSupplierFilter === "all" ? "Total Supplier Balance" : "Supplier Balance"}
//                   </div>
//                   <div
//                     className={`text-2xl font-bold tabular-nums ${(calculatedTotalBalance || 0) <= 0 ? "text-emerald-700" : "text-red-700"
//                       }`}
//                   >
//                     {formatNumber(Math.abs(calculatedTotalBalance || 0))}
//                   </div>
//                   <div
//                     className={`text-xs mt-1 ${(calculatedTotalBalance || 0) <= 0 ? "text-emerald-600/80" : "text-red-600/80"
//                       }`}
//                   >
//                     {(calculatedTotalBalance || 0) > 0
//                       ? "Total payable to suppliers"
//                       : "Total receive to suppliers"}
//                   </div>
//                 </div>
//               </div>

//               <DataTable
//                 columns={allLedgerColumns}
//                 data={filteredLedgerTransactions}
//                 onDownloadPDF={handleExportLedgerPDF}
//                 hideActions
//                 enableSearch={true}
//                 paginate={true}
//                 pageSize={50}
//                 disableSorting={true}
//               />
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   )

//   const paymentDetails = (
//     <>
//       <div className="flex max-w-2xl flex-wrap items-center gap-4 mb-2">
//         <div className="flex items-center gap-2">
//           <Users className="h-4 w-4 text-muted-foreground" />
//           <span className="text-sm font-semibold text-foreground">Select Supplier:</span>
//         </div>
//         <div className="flex-1 min-w-[250px]">{paymentSelector}</div>
//       </div>

//       {selectedSupplierId && selectedSupplierId !== "all" && (
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
//           <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-emerald-50/30 p-5">
//             <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">Total Paid</div>
//             <div className="text-2xl font-bold text-emerald-700 tabular-nums">{formatNumber(pendingTotals.totalPaid || 0)}</div>
//           </div>
//           <div className="rounded-lg border border-red-200 bg-gradient-to-br from-red-50/50 to-red-50/30 p-5">
//             <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">Total Pending</div>
//             <div className="text-2xl font-bold text-red-700 tabular-nums">
//               {formatNumber(Math.abs(calculatedTotalPendingFromRemaining || 0))}
//             </div>
//           </div>
//         </div>
//       )}

//       {!selectedSupplierId || selectedSupplierId === "all" ? (
//         <div className="rounded-lg border border-border bg-card p-12 text-center">
//           <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
//             <Users className="w-8 h-8 text-muted-foreground" />
//           </div>
//           <p className="text-sm font-medium text-foreground mb-1">No supplier selected</p>
//           <p className="text-xs text-muted-foreground">Select a supplier to view their pending payments</p>
//         </div>
//       ) : pendingBalancesLoading ? (
//         <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center justify-center">
//           <Loader2 className="animate-spin h-8 w-8 text-primary mb-4" />
//           <p className="text-sm text-muted-foreground">Loading pending balances...</p>
//         </div>
//       ) : pendingBalancesError ? (
//         <div className="rounded-lg border border-red-200 bg-red-50/50 p-8 text-center">
//           <p className="text-sm font-medium text-red-700 mb-1">Error loading pending balances</p>
//           <p className="text-xs text-red-600/80">{pendingBalancesError.message}</p>
//         </div>
//       ) : pendingBalances.length === 0 ? (
//         <div className="rounded-lg border border-border bg-card p-12 text-center">
//           <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
//             <CheckCircle2 className="w-8 h-8 text-emerald-500" />
//           </div>
//           <p className="text-sm font-medium text-foreground mb-1">No pending balances</p>
//           <p className="text-xs text-muted-foreground">
//             This supplier has no confirmed dispatch orders or purchases with remaining balances
//           </p>
//         </div>
//       ) : (
//         <div className="rounded-lg border border-border bg-card overflow-hidden">
//           <DataTable columns={pendingBalanceColumns} data={pendingBalancesWithEntryNumbers} hideActions enableSearch={true} />
//         </div>
//       )}

//       <Dialog open={markAsPaidDialog.open} onOpenChange={(open) => setMarkAsPaidDialog({ open, balance: null })}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Mark as Paid</DialogTitle>
//           </DialogHeader>
//           {markAsPaidDialog.balance && (
//             <div className="space-y-4">
//               <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
//                 <p className="text-sm">
//                   <span className="font-medium">Reference:</span> {markAsPaidDialog.balance.reference}
//                 </p>
//                 <p className="text-sm">
//                   <span className="font-medium">Supplier:</span> {markAsPaidDialog.balance.supplierName}
//                 </p>
//                 <p className="text-sm">
//                   <span className="font-medium">Remaining Balance:</span> {formatNumber(markAsPaidDialog.balance.amount)}
//                 </p>
//               </div>
//               <div>
//                 <Label htmlFor="mark-paid-amount">
//                   Payment Amount <span className="text-red-500">*</span>
//                 </Label>
//                 <Input
//                   id="mark-paid-amount"
//                   type="text"
//                   inputMode="decimal"
//                   step="0.01"
//                   min="0.01"
//                   max={markAsPaidDialog.balance.amount}
//                   value={markAsPaidForm.amount}
//                   onChange={(e) => {
//                     const value = e.target.value
//                     const sanitized = value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
//                     setMarkAsPaidForm({ ...markAsPaidForm, amount: sanitized })
//                   }}
//                   placeholder="Enter payment amount"
//                   disabled={isMarkingAsPaid}
//                 />
//                 <p className="text-xs text-muted-foreground mt-1">Maximum: {formatNumber(markAsPaidDialog.balance.amount)}</p>
//               </div>
//               <div>
//                 <Label htmlFor="mark-paid-method">
//                   Payment Method <span className="text-red-500">*</span>
//                 </Label>
//                 <Select
//                   value={markAsPaidForm.method}
//                   onValueChange={(value) => setMarkAsPaidForm({ ...markAsPaidForm, method: value })}
//                   disabled={isMarkingAsPaid}
//                 >
//                   <SelectTrigger>
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="cash">Cash</SelectItem>
//                     <SelectItem value="bank">Bank Transfer</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//             </div>
//           )}
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setMarkAsPaidDialog({ open: false, balance: null })}
//               disabled={isMarkingAsPaid}
//             >
//               Cancel
//             </Button>
//             <Button
//               onClick={handleConfirmMarkAsPaid}
//               disabled={isMarkingAsPaid || !markAsPaidForm.amount || parseFloat(markAsPaidForm.amount) <= 0}
//             >
//               {isMarkingAsPaid ? (
//                 <>
//                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                   Recording...
//                 </>
//               ) : (
//                 "Mark as Paid"
//               )}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </>
//   )

//   const paymentHistoryTabContent = (
//     <div className="space-y-6">
//       {paymentHistorySupplier && paymentHistorySupplier !== "all" && (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//           <div className="relative rounded-lg border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 via-emerald-50/60 to-white p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
//             <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-200/20 blur-2xl group-hover:bg-emerald-200/30 transition-all"></div>
//             <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-emerald-100/15 blur-xl"></div>
//             <div className="relative z-10">
//               <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-emerald-700/80">Total Payments</div>
//               <div className="text-3xl font-bold text-emerald-700 tabular-nums mb-1.5">{formatNumber(paymentSummary.total)}</div>
//               <div className="text-xs font-medium text-emerald-600/70">All-time payment total</div>
//             </div>
//           </div>
//           <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-background via-card/50 to-background p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
//             <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all"></div>
//             <div className="relative z-10">
//               <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">Cash Payments</div>
//               <div className="text-3xl font-bold tabular-nums text-foreground mb-1.5">{formatNumber(paymentSummary.cash)}</div>
//               <div className="text-xs font-medium text-muted-foreground">Cash transactions</div>
//             </div>
//           </div>
//           <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-background via-card/50 to-background p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
//             <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all"></div>
//             <div className="relative z-10">
//               <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">Bank Payments</div>
//               <div className="text-3xl font-bold tabular-nums text-foreground mb-1.5">{formatNumber(paymentSummary.bank)}</div>
//               <div className="text-xs font-medium text-muted-foreground">Bank transfers</div>
//             </div>
//           </div>
//           <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-background via-card/50 to-background p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
//             <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all"></div>
//             <div className="relative z-10">
//               <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">Payments This Month</div>
//               <div className="text-3xl font-bold tabular-nums text-foreground mb-1.5">{paymentSummary.countThisMonth}</div>
//               <div className="text-xs font-medium text-muted-foreground">Current month</div>
//             </div>
//           </div>
//         </div>
//       )}

//       <div className="rounded-lg border border-border/60 bg-gradient-to-br from-card via-background to-card shadow-sm overflow-hidden">
//         <div className="px-6 py-5 bg-gradient-to-b from-muted/20 via-muted/10 to-transparent border-b border-border/30">
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
//             <div className="flex flex-col min-w-0">
//               <Label className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
//                 <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
//                 <span className="whitespace-nowrap">Select Supplier</span>
//               </Label>
//               <Popover open={paymentHistorySupplierOpen} onOpenChange={setPaymentHistorySupplierOpen}>
//                 <PopoverTrigger asChild>
//                   <Button
//                     variant="outline"
//                     role="combobox"
//                     aria-expanded={paymentHistorySupplierOpen}
//                     className="h-[44px] w-full justify-between border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg"
//                     disabled={allSuppliersLoading}
//                   >
//                     {paymentHistorySupplier
//                       ? (() => {
//                         const supplier = dropdownSuppliers.find((s) => String(s.id) === paymentHistorySupplier)
//                         return supplier ? `${supplier.name} ${supplier.company ? `(${supplier.company})` : ""}` : "Select supplier..."
//                       })()
//                       : "Select supplier..."}
//                     <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//                   </Button>
//                 </PopoverTrigger>
//                 <PopoverContent className="w-[300px] p-0 bg-white dark:bg-zinc-950">
//                   <Command>
//                     <CommandInput placeholder="Search supplier..." />
//                     <CommandList>
//                       <CommandEmpty>No supplier found.</CommandEmpty>
//                       <CommandGroup>
//                         {dropdownSuppliers.map((supplier) => (
//                           <CommandItem
//                             key={supplier.id}
//                             value={`${supplier.name} ${supplier.company || ""} ${supplier.supplierId || ""} ${supplier.legacyId || ""} ${String(supplier.id).slice(-6)}`}
//                             onSelect={() => {
//                               const val = String(supplier.id)
//                               setPaymentHistorySupplier(val)
//                               setSelectedSupplierId(val)
//                               setPaymentHistorySupplierOpen(false)
//                             }}
//                           >
//                             <Check
//                               className={cn(
//                                 "mr-2 h-4 w-4",
//                                 paymentHistorySupplier === String(supplier.id) ? "opacity-100" : "opacity-0"
//                               )}
//                             />
//                             <div className="flex flex-col">
//                               <span className="font-medium">{supplier.company}</span>
//                               <div className="flex items-center gap-2 text-xs text-muted-foreground">

//                                 {supplier.company && <span>{supplier.name}</span>}
//                               </div>
//                             </div>
//                           </CommandItem>
//                         ))}
//                       </CommandGroup>
//                     </CommandList>
//                   </Command>
//                 </PopoverContent>
//               </Popover>
//             </div>

//             <div className="flex flex-col min-w-0">
//               <Label htmlFor="payment-history-date-from" className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
//                 <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
//                 <span className="whitespace-nowrap">Date From</span>
//               </Label>
//               <BritishDatePicker
//                 value={paymentHistoryDateFrom || null}
//                 onChange={(date) => setPaymentHistoryDateFrom(date ? date.toLocaleDateString("en-CA") : "")}
//                 className="h-[44px] w-full border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg"
//               />
//             </div>

//             <div className="flex flex-col min-w-0">
//               <Label htmlFor="payment-history-date-to" className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
//                 <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
//                 <span className="whitespace-nowrap">Date To</span>
//               </Label>
//               <BritishDatePicker
//                 value={paymentHistoryDateTo || null}
//                 onChange={(date) => setPaymentHistoryDateTo(date ? date.toLocaleDateString("en-CA") : "")}
//                 className="h-[44px] w-full border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg"
//               />
//             </div>

//             <div className="flex flex-col min-w-0">
//               <Label htmlFor="payment-history-method" className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
//                 <span className="whitespace-nowrap">Payment Method</span>
//               </Label>
//               <Select value={paymentHistoryMethodFilter} onValueChange={setPaymentHistoryMethodFilter}>
//                 <SelectTrigger id="payment-history-method" className="h-[44px] w-full border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg">
//                   <SelectValue placeholder="All Methods" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="all">All Methods</SelectItem>
//                   <SelectItem value="cash">Cash</SelectItem>
//                   <SelectItem value="bank">Bank</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//           </div>
//         </div>

//         <div className="px-6 py-6 bg-background">
//           {!paymentHistorySupplier || paymentHistorySupplier === "all" ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
//                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 backdrop-blur-sm ring-2 ring-border/60 shadow-lg">
//                   <Users className="w-12 h-12 text-muted-foreground" />
//                 </div>
//               </div>
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">No supplier selected</h3>
//               <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
//                 Select a supplier from the dropdown above to view their complete payment history and transaction records
//               </p>
//             </div>
//           ) : paymentHistoryLoading ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
//                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background backdrop-blur-sm ring-2 ring-primary/20 shadow-lg">
//                   <Loader2 className="w-12 h-12 text-primary animate-spin" />
//                 </div>
//               </div>
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">Loading payment history</h3>
//               <p className="text-sm text-muted-foreground">Please wait while we fetch the records...</p>
//             </div>
//           ) : paymentHistoryTransactions.length === 0 ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-muted/30 rounded-full blur-3xl"></div>
//                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 backdrop-blur-sm ring-2 ring-border/60 shadow-lg">
//                   <FileText className="w-12 h-12 text-muted-foreground" />
//                 </div>
//               </div>
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">No payment history found</h3>
//               <p className="text-sm text-muted-foreground text-center max-w-md mb-5 leading-relaxed">
//                 {paymentHistoryDateFrom || paymentHistoryDateTo || paymentHistoryMethodFilter !== "all"
//                   ? "Try adjusting your filters to see more results"
//                   : "No payment records found for this supplier"}
//               </p>
//               {(paymentHistoryDateFrom || paymentHistoryDateTo || paymentHistoryMethodFilter !== "all") && (
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   className="gap-2 h-10 px-5 shadow-sm hover:shadow-md transition-all rounded-lg"
//                   onClick={() => {
//                     setPaymentHistoryDateFrom("")
//                     setPaymentHistoryDateTo("")
//                     setPaymentHistoryMethodFilter("all")
//                   }}
//                 >
//                   <RotateCcw className="h-4 w-4" />
//                   Clear Filters
//                 </Button>
//               )}
//             </div>
//           ) : (
//             <DataTable columns={paymentHistoryColumns} data={paymentHistoryTransactions} onDownloadPDF={handleExportPaymentHistoryPDF} hideActions enableSearch={false} paginate={true} pageSize={50} />
//           )}
//         </div>
//       </div>
//     </div>
//   )

//   const supplierReceiptsTabContent = (
//     <div className="space-y-6">
//       {receiptSupplierId && receiptSupplierId !== "all" && (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//           <div className="relative rounded-lg border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 via-emerald-50/60 to-white p-6 shadow-sm overflow-hidden">
//             <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-emerald-700/80">Total Receipts</div>
//             <div className="text-3xl font-bold text-emerald-700 tabular-nums mb-1.5">{formatNumber(supplierReceiptSummary.total)}</div>
//             <div className="text-xs font-medium text-emerald-600/70">Recorded supplier payments</div>
//           </div>
//           <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-background via-card/50 to-background p-6 shadow-sm overflow-hidden">
//             <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">Cash</div>
//             <div className="text-3xl font-bold tabular-nums text-foreground mb-1.5">{formatNumber(supplierReceiptSummary.cash)}</div>
//             <div className="text-xs font-medium text-muted-foreground">Cash-paid receipts</div>
//           </div>
//           <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-background via-card/50 to-background p-6 shadow-sm overflow-hidden">
//             <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">Bank</div>
//             <div className="text-3xl font-bold tabular-nums text-foreground mb-1.5">{formatNumber(supplierReceiptSummary.bank)}</div>
//             <div className="text-xs font-medium text-muted-foreground">Bank-paid receipts</div>
//           </div>
//         </div>
//       )}

//       <div className="rounded-lg border border-border/60 bg-gradient-to-br from-card via-background to-card shadow-sm overflow-hidden">
//         <div className="px-6 py-5 bg-gradient-to-b from-muted/20 via-muted/10 to-transparent border-b border-border/30">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
//             <div className="flex flex-col min-w-0">
//               <Label className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
//                 <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
//                 <span className="whitespace-nowrap">Select Supplier</span>
//               </Label>
//               <Popover open={receiptSupplierOpen} onOpenChange={setReceiptSupplierOpen}>
//                 <PopoverTrigger asChild>
//                   <Button
//                     variant="outline"
//                     role="combobox"
//                     aria-expanded={receiptSupplierOpen}
//                     className="h-[44px] w-full justify-between border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg"
//                     disabled={allSuppliersLoading}
//                   >
//                     {receiptSupplierId
//                       ? (() => {
//                         const supplier = dropdownSuppliers.find((s) => String(s.id) === receiptSupplierId)
//                         return supplier
//                           ? `${supplier.name} ${supplier.company ? `(${supplier.company})` : ""}`
//                           : "Select supplier..."
//                       })()
//                       : "Select supplier..."}
//                     <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//                   </Button>
//                 </PopoverTrigger>
//                 <PopoverContent className="w-[300px] p-0 bg-white dark:bg-zinc-950">
//                   <Command>
//                     <CommandInput placeholder="Search supplier..." />
//                     <CommandList>
//                       <CommandEmpty>No supplier found.</CommandEmpty>
//                       <CommandGroup>
//                         {dropdownSuppliers.map((supplier) => (
//                           <CommandItem
//                             key={supplier.id}
//                             value={`${supplier.name} ${supplier.company || ""} ${supplier.supplierId || ""} ${supplier.legacyId || ""} ${String(supplier.id).slice(-6)}`}
//                             onSelect={() => {
//                               const val = String(supplier.id)
//                               setReceiptSupplierId(val)
//                               setSelectedSupplierId(val)
//                               setReceiptSupplierOpen(false)
//                             }}
//                           >
//                             <Check
//                               className={cn("mr-2 h-4 w-4", receiptSupplierId === String(supplier.id) ? "opacity-100" : "opacity-0")}
//                             />
//                             <div className="flex flex-col">
//                               <span className="font-medium">{supplier.company}</span>
//                               <div className="flex items-center gap-2 text-xs text-muted-foreground">

//                                 {supplier.name && <span>{supplier.name}</span>}
//                               </div>
//                             </div>
//                           </CommandItem>
//                         ))}
//                       </CommandGroup>
//                     </CommandList>
//                   </Command>
//                 </PopoverContent>
//               </Popover>
//             </div>

//             <div className="flex items-center gap-3 md:col-span-2 md:justify-end">
//               {receiptSupplierId && receiptSupplierId !== "all" ? (
//                 <div className="text-sm text-muted-foreground">
//                   {supplierReceiptTransactions.length} receipt{supplierReceiptTransactions.length === 1 ? "" : "s"} found
//                 </div>
//               ) : null}
//             </div>
//           </div>
//         </div>

//         <div className="px-6 py-6 bg-background">
//           {!receiptSupplierId || receiptSupplierId === "all" ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
//                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 backdrop-blur-sm ring-2 ring-border/60 shadow-lg">
//                   <FileText className="w-12 h-12 text-muted-foreground" />
//                 </div>
//               </div>
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">No supplier selected</h3>
//               <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
//                 Select a supplier to review grouped supplier payment receipts and print allocation details.
//               </p>
//             </div>
//           ) : supplierReceiptsLoading ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">Loading payment receipts</h3>
//               <p className="text-sm text-muted-foreground">Please wait while we fetch the receipt records...</p>
//             </div>
//           ) : supplierReceiptsError ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <FileText className="w-12 h-12 text-destructive mb-6" />
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">Unable to load receipts</h3>
//               <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
//                 {supplierReceiptsError.response?.data?.message || supplierReceiptsError.message || "Failed to load supplier payment receipts."}
//               </p>
//               <Button variant="outline" className="mt-5" onClick={() => refetchSupplierReceipts()}>
//                 <RotateCcw className="h-4 w-4 mr-2" />
//                 Retry
//               </Button>
//             </div>
//           ) : supplierReceiptTransactions.length === 0 ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <FileText className="w-12 h-12 text-muted-foreground mb-6" />
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">No payment receipts found</h3>
//               <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
//                 Record a supplier payment to create the first grouped receipt for this supplier.
//               </p>
//             </div>
//           ) : (
//             <DataTable columns={supplierReceiptColumns} data={supplierReceiptTransactions} onDownloadPDF={handleExportReceiptsPDF} enableSearch={false} paginate={true} pageSize={50} />
//           )}
//         </div>
//       </div>
//     </div>
//   )

//   const tabs = [
//     { label: "Supplier Ledger", content: ledgerTabContent },
//     { label: "Payment History", content: paymentHistoryTabContent },
//     { label: "Payment Receipts", content: supplierReceiptsTabContent },
//   ]

//   return (
//     <div className="space-y-6">
//       <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
//         <div className="">
//           <BackButton fallbackPath="/reports/payables" label="Back" />
//         </div>
//         <div className="flex items-center gap-3">
//           {allSuppliersLoading && (
//             <div className="flex items-center gap-2 text-sm text-muted-foreground">
//               <Loader2 className="h-4 w-4 animate-spin" />
//               Loading suppliers...
//             </div>
//           )}
//           <Button
//             onClick={() => setManualDebtOpen(true)}
//             variant="outline"
//             className="border-red-200 hover:bg-red-50 text-red-600 h-11 px-6 shadow-sm"
//           >
//             <Plus className="h-4 w-4 mr-2" />
//             Add Supplier Debt
//           </Button>
//           <Button onClick={() => setUniversalPaymentOpen(true)} className="bg-primary hover:bg-primary/90 h-11 px-6 shadow-sm">
//             <Plus className="h-4 w-4 mr-2" />
//             Add Payment
//           </Button>
//         </div>
//       </header>

//       <Tabs tabs={tabs} className="space-y-1" activeTab={activeTab} onTabChange={setActiveTab} />

//       <SupplierPaymentModal
//         open={universalPaymentOpen}
//         onClose={() => setUniversalPaymentOpen(false)}
//         entityId={selectedSupplierId !== "all" ? selectedSupplierId : ""}
//         allLedgerData={allLedgerData}
//         entityName={
//           selectedSupplierId !== "all"
//             ? dropdownSuppliers.find((s) => String(s.id) === selectedSupplierId)?.name ||
//             dropdownSuppliers.find((s) => String(s.id) === selectedSupplierId)?.company ||
//             "Supplier"
//             : ""
//         }
//         totalBalance={
//           selectedSupplierId !== "all"
//             ? Math.abs(dropdownSuppliers.find((s) => String(s.id) === selectedSupplierId)?.balance || 0)
//             : 0
//         }
//         ledgerBalance={balanceForModal}
//         ledgerBalanceSupplierId={selectedSupplierId !== "all" ? selectedSupplierId : null}
//         supplierBalanceMap={supplierBalanceMap}
//         entities={dropdownSuppliers}
//         onSuccess={() => {
//           queryClient.invalidateQueries({ queryKey: ["pending-balances"] })
//           queryClient.invalidateQueries({ queryKey: ["ledger"] })
//           queryClient.invalidateQueries({ queryKey: ["suppliers"] })
//           queryClient.invalidateQueries({ queryKey: ["supplier-payment-receipts"] })
//         }}
//       />

//       <ManualSupplierDebtModal
//         open={manualDebtOpen}
//         onClose={() => setManualDebtOpen(false)}
//         entities={dropdownSuppliers}
//         entityId={selectedSupplierId !== "all" ? selectedSupplierId : ""}
//         entityName={
//           selectedSupplierId !== "all"
//             ? dropdownSuppliers.find((s) => String(s.id) === selectedSupplierId)?.name ||
//             dropdownSuppliers.find((s) => String(s.id) === selectedSupplierId)?.company ||
//             "Supplier"
//             : ""
//         }
//         onSuccess={() => {
//           queryClient.invalidateQueries({ queryKey: ["pending-balances"] })
//           queryClient.invalidateQueries({ queryKey: ["ledger"] })
//           queryClient.invalidateQueries({ queryKey: ["suppliers"] })
//         }}
//       />

//       <DeleteRequestDialog
//         open={!!deleteReceiptTarget}
//         onClose={() => setDeleteReceiptTarget(null)}
//         entityType="supplierPayment"
//         entityId={deleteReceiptTarget?.receiptNumber}
//         entityRef={deleteReceiptTarget?.receiptNumber}
//         entitySummary={
//           deleteReceiptTarget
//             ? {
//               "Receipt #": deleteReceiptTarget.receiptNumber,
//               Amount: formatNumber(deleteReceiptTarget.totalAmount),
//               Supplier: deleteReceiptTarget.supplierName || "—",
//               Method: deleteReceiptTarget.methodSummary || "—",
//             }
//             : {}
//         }
//         onSuccess={() => setDeleteReceiptTarget(null)}
//       />

//       <Dialog open={receiptReversalDialogOpen} onOpenChange={setReceiptReversalDialogOpen}>
//         <DialogContent className="sm:max-w-[500px]">
//           <DialogHeader>
//             <div className="flex items-center gap-3 mb-2">
//               <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
//                 <RotateCcw className="h-5 w-5 text-destructive" />
//               </div>
//               <DialogTitle className="text-xl">Reverse Receipt</DialogTitle>
//             </div>
//           </DialogHeader>
//           {selectedReceipt && (
//             <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 my-2">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-semibold text-muted-foreground">Receipt #:</span>
//                 <span className="text-sm font-medium">{selectedReceipt.receiptNumber}</span>
//               </div>
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-semibold text-muted-foreground">Amount:</span>
//                 <span className="text-sm font-bold">{formatNumber(selectedReceipt.totalAmount)}</span>
//               </div>
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-semibold text-muted-foreground">Supplier:</span>
//                 <span className="text-sm">{selectedReceipt.supplierName}</span>
//               </div>
//             </div>
//           )}
//           <div className="space-y-2">
//             <Label className="text-sm font-semibold">Reason for Reversal *</Label>
//             <Textarea
//               value={receiptReversalReason}
//               onChange={(e) => setReceiptReversalReason(e.target.value)}
//               placeholder="Please provide a reason for reversing this receipt..."
//               className="min-h-[100px]"
//             />
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setReceiptReversalDialogOpen(false)} disabled={isReversingReceipt}>
//               Cancel
//             </Button>
//             <Button
//               variant="destructive"
//               disabled={isReversingReceipt || !receiptReversalReason.trim()}
//               onClick={async () => {
//                 if (!selectedReceipt || !receiptReversalReason.trim()) return
//                 setIsReversingReceipt(true)
//                 try {
//                   const supplierId =
//                     receiptSupplierId || selectedReceipt.raw?.supplierId?._id || selectedReceipt.raw?.supplierId
//                   await ledgerAPI.reverseSupplierReceipt(supplierId, selectedReceipt.receiptNumber, receiptReversalReason.trim())
//                   toast.success(`Receipt ${selectedReceipt.receiptNumber} reversed successfully`)
//                   queryClient.invalidateQueries({ queryKey: ["supplier-payment-receipts"] })
//                   queryClient.invalidateQueries({ queryKey: ["ledger", "supplier"] })
//                   queryClient.invalidateQueries({ queryKey: ["pending-balances"] })
//                   setReceiptReversalDialogOpen(false)
//                   setSelectedReceipt(null)
//                   setReceiptReversalReason("")
//                 } catch (error) {
//                   toast.error(error.response?.data?.message || "Failed to reverse receipt")
//                 } finally {
//                   setIsReversingReceipt(false)
//                 }
//               }}
//             >
//               {isReversingReceipt ? (
//                 <>
//                   <Loader2 className="animate-spin h-4 w-4 mr-2" />
//                   Reversing...
//                 </>
//               ) : (
//                 <>
//                   <RotateCcw className="h-4 w-4 mr-2" />
//                   Confirm Reversal
//                 </>
//               )}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   )
// }


"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import BackButton from "@/components/BackButton"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import DataTableFiltered from "@/components/data-table-filtered"
import { useAllSuppliers } from "@/lib/hooks/useSuppliers"
import { useAllSupplierLedgers } from "@/lib/hooks/useLedger"
import { ledgerAPI } from "@/lib/api/endpoints/ledger"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus, Printer, RotateCcw, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import toast from "react-hot-toast"
import Tabs from "@/components/tabs"
import SupplierPaymentModal from "@/components/modals/SupplierPaymentModal"
import ManualSupplierDebtModal from "@/components/modals/ManualSupplierDebtModal"
import { exportToPDF } from "@/lib/utils/pdfExport"
import { useAuthStore } from "@/store/store"
import DeleteRequestDialog from "@/components/modals/DeleteRequestDialog"
import BritishDatePicker from "@/components/BritishDatePicker"

// ─── Formatters (stable, defined outside component so they never cause re-renders) ───

function formatLocalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatNumber(n) {
  const num = Number(n || 0)
  return num.toFixed(2)
}

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateTime(_date) {
  const dateTime = _date.date || _date.createdAt
  if (!dateTime) return "-"
  const d = new Date(dateTime)
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })
  const date = d.toLocaleDateString("en-GB")
  return `${date} ${time}`
}

function buildSupplierReceiptPrintHtml(receipt) {
  const distributionRows = (receipt.distributions || []).map((distribution) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #d1d5db;">${distribution.isAdvance ? "SUPPLIER ADVANCE" : (distribution.orderNumber || distribution.dispatchOrderId?.orderNumber || "-")}</td>
      <td style="padding: 10px; border: 1px solid #d1d5db; text-align: right;">${formatNumber(distribution.amountApplied)}</td>
      <td style="padding: 10px; border: 1px solid #d1d5db; text-align: right;">${formatNumber(distribution.previousBalance)}</td>
      <td style="padding: 10px; border: 1px solid #d1d5db; text-align: right;">${formatNumber(distribution.newBalance)}</td>
    </tr>
  `).join("")

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Supplier Payment Receipt - ${receipt.receiptNumber}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; width: 100%; margin: 0; padding: 0; color: #111827; line-height: 1.5; font-size: 13px; }
        .container { max-width: 180mm; margin: 0 auto; }
        .header { border-bottom: 3px solid #111827; padding-bottom: 10px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em; }
        .receipt-no { font-family: monospace; font-size: 16px; font-weight: 600; color: #4b5563; }
        .info-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0 0 18px 0; border: 1px solid #d1d5db; }
        .info-table th, .info-table td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 12px; vertical-align: middle; }
        .info-table th { width: 20%; background: #f3f4f6; color: #4b5563; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; text-align: left; }
        .info-table td { color: #111827; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #111827; color: white; padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
        .distribution-table, .distribution-table th { border: 1px solid #d1d5db; }
        .right { text-align: right; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <h1>PAYMENT RECEIPT</h1>
            <p style="margin: 5px 0 0 0; color: #6b7280;">KI FASHION - Supplier Copy</p>
          </div>
          <div class="receipt-no">${receipt.receiptNumber}</div>
        </div>
        <table class="info-table" aria-label="Receipt summary information">
          <tbody>
            <tr>
              <th>Supplier Name</th><td>${receipt.supplierId?.name || "Unknown Supplier"}</td>
              <th>Date</th><td>${formatDateTime({ date: receipt.paymentDate || receipt.date || receipt.createdAt })}</td>
            </tr>
            <tr>
              <th>Company</th><td>${receipt.supplierId?.company || "-"}</td>
              <th>Method</th><td>${(receipt.paymentMethodSummary || "cash").toUpperCase()}</td>
            </tr>
            <tr>
              <th>Supplier ID</th><td>${receipt.supplierId?.supplierId || "-"}</td>
              <th>Amount Paid</th><td>GBP ${formatNumber(receipt.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
        <table class="distribution-table">
          <thead>
            <tr>
              <th>Order Number</th><th class="right">Amount Applied</th><th class="right">Previous Amount</th><th class="right">Remaining Amount</th>
            </tr>
          </thead>
          <tbody>${distributionRows}</tbody>
        </table>
        <table class="info-table" style="margin: 5px 0 0 0;" aria-label="Receipt summary information">
          <tbody>
            <tr>
              <th>Total Balance Before</th><td>${formatNumber(Math.abs(receipt.balanceBefore || 0))}</td>
              <th>Amount Paid</th><td>${formatNumber(receipt.totalAmount)}</td>
              <th>Total Balance After</th><td>${formatNumber(Math.abs(receipt.balanceAfter || 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `
}

function printSupplierReceipt(receipt) {
  const printWindow = window.open("", "_blank")
  if (!printWindow) throw new Error("Print window was blocked")
  printWindow.document.write(buildSupplierReceiptPrintHtml(receipt))
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => { printWindow.print() }, 250)
}

function mapLedgerEntry(entry) {
  const supplier = entry.entityId || {}
  let typeLabel = entry.transactionType || "-"

  if (entry.transactionType === "adjustment") typeLabel = "Supplier Debt"
  else if (entry.transactionType === "payment") typeLabel = entry.paymentMethod === "cash" ? "Payment - Cash" : entry.paymentMethod === "bank" ? "Payment - Bank" : "Payment"
  else if (entry.transactionType === "return") typeLabel = "Return (Credit)"
  else if (entry.transactionType === "purchase") {
    if (entry.referenceModel === "DispatchOrder") typeLabel = "Dispatch Order"
    else if (entry.referenceModel === "Purchase") typeLabel = "Local Buying"
    else typeLabel = "Purchase"
  } else if (entry.referenceModel === "Return") typeLabel = "Return"

  let readableReference = "-"
  if (entry.referenceId) {
    if (typeof entry.referenceId === "object" && entry.referenceId !== null) {
      if (entry.referenceModel === "Return" || entry.transactionType === "return") {
        if (entry.referenceId.orderNumber) readableReference = entry.referenceId.orderNumber
        else {
          const description = entry.description || entry.notes || ""
          const orderMatch = description.match(/(?:Order|Dispatch Order):?\s*([A-Z0-9-]+)/i) || description.match(/Dispatch Order\s+([A-Z0-9-]+)/i)
          if (orderMatch && orderMatch[1]) readableReference = orderMatch[1]
          else {
            const returnId = entry.referenceId._id?.toString() || entry.referenceId.toString()
            readableReference = returnId ? `RET-${returnId.slice(-6).toUpperCase()}` : "-"
          }
        }
      } else readableReference = entry.referenceId.orderNumber || entry.referenceId.purchaseNumber || entry.referenceId._id || "-"
    } else readableReference = entry.referenceId.toString()
  } else if (entry.reference || entry.referenceNumber) readableReference = entry.reference || entry.referenceNumber
  else if (entry.transactionType === "adjustment") readableReference = entry.description || entry.notes || "Manual Adjustment"

  return {
    id: entry._id || entry.id,
    date: entry.date || entry.createdAt,
    createdAt: entry.createdAt,
    supplier: supplier.company || supplier.name || "Unknown Supplier",
    companyName: supplier.company || "",
    supplierName: supplier.name || "",
    supplierId: supplier.supplierId || supplier._id || supplier.id,
    type: typeLabel,
    transactionType: entry.transactionType || entry.type,
    description: entry.description || entry.notes || "-",
    debit: Number(entry.debit) || 0,
    credit: Number(entry.credit) || 0,
    cashPaid: entry.transactionType === "payment" && entry.paymentMethod === "cash" ? entry.credit || 0 : 0,
    bankPaid: entry.transactionType === "payment" && entry.paymentMethod === "bank" ? entry.credit || 0 : 0,
    returnAmount: entry.transactionType === "return" ? entry.credit || 0 : 0,
    discount: (entry.referenceId && typeof entry.referenceId === "object") ? (entry.referenceId.totalDiscount || entry.referenceId.discount || 0) : 0,
    balance: 0,
    reference: readableReference,
    referenceId: entry.referenceId && typeof entry.referenceId === "object" && entry.referenceId._id ? entry.referenceId._id.toString() : entry.referenceId ? entry.referenceId.toString() : null,
    referenceModel: entry.referenceModel || "-",
    paymentMethod: entry.paymentMethod || null,
    entryNumber: entry.entryNumber || "-",
    raw: entry,
  }
}

const STALE_TIME = 2 * 60 * 1000
const GC_TIME = 5 * 60 * 1000

export default function SupplierLedgerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = Number(searchParams.get("tab") ?? 0)

  const [activeTab, setActiveTab] = useState(initialTab)
  const [selectedSupplierId, setSelectedSupplierId] = useState("all")
  const [dateRange, setDateRange] = useState({ from: "", to: "" })

  const [universalPaymentOpen, setUniversalPaymentOpen] = useState(false)
  const [manualDebtOpen, setManualDebtOpen] = useState(false)
  const [deleteReceiptTarget, setDeleteReceiptTarget] = useState(null)

  const [receiptReversalDialogOpen, setReceiptReversalDialogOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [receiptReversalReason, setReceiptReversalReason] = useState("")
  const [isReversingReceipt, setIsReversingReceipt] = useState(false)
  const [isLoadingSupplierReceipt, setIsLoadingSupplierReceipt] = useState(false)

  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === "super-admin"

  // Sync URL param
  useEffect(() => {
    const supplierId = searchParams.get("supplierId")
    if (supplierId) setSelectedSupplierId(supplierId)
  }, [searchParams])

  const handleTabChange = (idx) => {
    setActiveTab(idx)
    if (router) router.replace(`/supplier-ledger?tab=${idx}`, { scroll: false })
  }

  // --- DATA FETCHING ---

  const { data: dropdownSuppliers = [], isLoading: allSuppliersLoading } = useAllSuppliers({ limit: 100 })

  const comboboxOptions = useMemo(() => {
    const options = dropdownSuppliers.map(s => ({ value: String(s.id || s._id), label: s.company || s.name || '' }))
    return [{ value: 'all', label: 'All Suppliers (Dashboard)' }, ...options]
  }, [dropdownSuppliers])

  const selectedEntity = useMemo(() => {
    if (!selectedSupplierId || selectedSupplierId === 'all') return null
    return dropdownSuppliers.find(s => String(s.id || s._id) === selectedSupplierId) ?? null
  }, [selectedSupplierId, dropdownSuppliers])

  const ledgerFilterParams = useMemo(() => {
    const params = {
      startDate: dateRange.from || undefined,
      endDate: dateRange.to || undefined,
    }
    if (!selectedSupplierId || selectedSupplierId === 'all') return { ...params, limit: 5000 }
    return { ...params, supplierId: selectedSupplierId, limit: 1000 }
  }, [selectedSupplierId, dateRange])

  const { data: allLedgerData, isLoading: allLedgerLoading } = useAllSupplierLedgers(
    ledgerFilterParams || {},
    { staleTime: STALE_TIME, gcTime: GC_TIME, enabled: !!ledgerFilterParams }
  )


  // --- CALCULATIONS & DATA TRANSFORMATION ---
  const { data: supplierReceiptsData, isLoading: supplierReceiptsLoading, refetch: refetchSupplierReceipts, isFetching } = useQuery({
    queryKey: ["supplier-payment-receipts", selectedSupplierId, dateRange],
    queryFn: async () => {
      const params = {
        limit: 1000,
        startDate: dateRange.from || undefined,
        endDate: dateRange.to || undefined
      }

      if (selectedSupplierId === "all") {
        // Fetch ALL receipts globally
        const response = await ledgerAPI.getAllSupplierReceipts(params)
        return response?.data?.data || response?.data || { receipts: [] }
      } else {
        // Fetch specific supplier receipts
        const response = await ledgerAPI.getSupplierPaymentReceipts(selectedSupplierId, params)
        return response?.data?.data || response?.data || { receipts: [] }
      }
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  })

  const supplierBalanceMap = useMemo(() => {
    const balanceMap = {}
    for (const supplier of dropdownSuppliers) {
      balanceMap[String(supplier._id || supplier.id)] = supplier.balance || 0
    }
    if (allLedgerData?.entries?.length) {
      const perSupplier = {}
      for (const entry of allLedgerData.entries) {
        const sid = entry.entityId?._id?.toString() || entry.entityId?.id?.toString() || (typeof entry.entityId === "string" ? entry.entityId : null)
        if (!sid) continue
        if (!perSupplier[sid]) perSupplier[sid] = 0
        perSupplier[sid] += (Number(entry.debit) || 0) - (Number(entry.credit) || 0)
      }
      Object.assign(balanceMap, perSupplier)
    }
    return balanceMap
  }, [allLedgerData?.entries, dropdownSuppliers])

  const mappedLedgerEntries = useMemo(() => {
    if (!allLedgerData?.entries) return []
    return allLedgerData.entries
      .filter((e) => ["purchase", "payment", "return", "adjustment"].includes(e.transactionType))
      .map(mapLedgerEntry)
  }, [allLedgerData?.entries])

  // 1. Calculate running balances on the FULL unfiltered array first to ensure accuracy
  const allLedgerTransactions = useMemo(() => {
    const sorted = [...mappedLedgerEntries].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
    let running = 0
    for (const entry of sorted) {
      running = running + entry.debit - entry.credit
      entry.balance = running
    }
    return sorted.reverse()
  }, [mappedLedgerEntries])

  // 2. Slice the array by date filters AFTER calculations
  const filteredLedgerTransactions = useMemo(() => {
    let result = allLedgerTransactions
    if (dateRange.from) {
      const from = new Date(dateRange.from)
      result = result.filter(entry => new Date(entry.date) >= from)
    }
    if (dateRange.to) {
      const to = new Date(dateRange.to)
      to.setHours(23, 59, 59, 999)
      result = result.filter(entry => new Date(entry.date) <= to)
    }
    return result
  }, [allLedgerTransactions, dateRange])

  const calculatedTotalBalance = useMemo(() => {
    if (allLedgerTransactions.length > 0) return allLedgerTransactions[0].balance || 0
    return allLedgerData?.totalBalance || 0
  }, [allLedgerTransactions, allLedgerData])

  const balanceForModal = useMemo(() => {
    if (selectedSupplierId === "all" || !selectedSupplierId) return 0
    const balanceFromMap = supplierBalanceMap[String(selectedSupplierId)]
    if (balanceFromMap !== undefined && balanceFromMap !== null) return Math.abs(balanceFromMap)
    return Math.abs(selectedEntity?.balance || 0)
  }, [selectedSupplierId, supplierBalanceMap, selectedEntity])

  const paymentHistoryTransactions = useMemo(() => {
    if (!allLedgerTransactions?.length) return []
    let filtered = allLedgerTransactions.filter(e => e.transactionType === "payment")

    // Apply Date filters
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from)
      filtered = filtered.filter(entry => new Date(entry.date) >= fromDate)
    }
    if (dateRange.to) {
      const toDate = new Date(dateRange.to)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(entry => new Date(entry.date) <= toDate)
    }

    return filtered
  }, [allLedgerTransactions, dateRange])

  // const receiptByLedgerEntryId = useMemo(() => {
  //   const map = new Map()
  //   const receipts = supplierReceiptsData?.receipts || []
  //   for (const receipt of receipts) {
  //     if (!receipt.distributions) continue
  //     for (const dist of receipt.distributions) {
  //       if (dist.ledgerEntryId) {
  //         map.set(String(dist.ledgerEntryId), {
  //           receiptNumber: receipt.receiptNumber,
  //           distributions: receipt.distributions,
  //           totalAmount: receipt.totalAmount,
  //         })
  //       }
  //     }
  //   }
  //   return map
  // }, [supplierReceiptsData])


  const receiptByLedgerEntryId = useMemo(() => {
    const map = new Map()
    // Safely grab the array whether it is nested in .receipts or returned directly
    let receipts = []
    if (Array.isArray(supplierReceiptsData)) receipts = supplierReceiptsData
    else if (Array.isArray(supplierReceiptsData?.receipts)) receipts = supplierReceiptsData.receipts

    for (const receipt of receipts) {
      if (!receipt.distributions) continue
      for (const dist of receipt.distributions) {
        if (dist.ledgerEntryId) {
          map.set(String(dist.ledgerEntryId), {
            receiptNumber: receipt.receiptNumber,
            distributions: receipt.distributions,
            totalAmount: receipt.totalAmount,
          })
        }
      }
    }
    return map
  }, [supplierReceiptsData])

  // const supplierReceiptTransactions = useMemo(() => {
  //   let receipts = supplierReceiptsData?.receipts || []
  //   if (dateRange.from) receipts = receipts.filter(r => new Date(r.date || r.createdAt) >= new Date(dateRange.from))
  //   if (dateRange.to) {
  //     const to = new Date(dateRange.to)
  //     to.setHours(23, 59, 59, 999)
  //     receipts = receipts.filter(r => new Date(r.date || r.createdAt) <= to)
  //   }

  //   return receipts.map((receipt) => {
  //     const supplier = receipt.supplierId || {}
  //     return {
  //       id: receipt._id || receipt.id || receipt.receiptNumber,
  //       receiptNumber: receipt.receiptNumber,
  //       date: receipt.date || receipt.createdAt,
  //       supplierName: supplier.company || supplier.name || "Unknown Supplier",
  //       supplierId: supplier._id || supplier.id || receipt.supplierId,
  //       totalAmount: receipt.totalAmount || 0,
  //       cashAmount: receipt.cashAmount || 0,
  //       bankAmount: receipt.bankAmount || 0,
  //       methodSummary: receipt.paymentMethodSummary || (receipt.cashAmount > 0 && receipt.bankAmount > 0 ? "cash + bank" : receipt.cashAmount > 0 ? "cash" : "bank"),
  //       status: receipt.status || "active",
  //       createdBy: receipt.createdBy?.name || "Unknown",
  //       ordersAffected: receipt.ordersAffected || 0,
  //       advanceAmount: receipt.advanceAmount || 0,
  //       balanceBefore: receipt.balanceBefore,
  //       balanceAfter: receipt.balanceAfter,
  //       notes: receipt.notes || "-",
  //       raw: receipt,
  //     }
  //   })
  // }, [supplierReceiptsData, dateRange])

  // --- ACTIONS & HANDLERS ---

  const supplierReceiptTransactions = useMemo(() => {
    let receipts = []
    if (Array.isArray(supplierReceiptsData)) receipts = supplierReceiptsData
    else if (Array.isArray(supplierReceiptsData?.receipts)) receipts = supplierReceiptsData.receipts

    if (dateRange.from) receipts = receipts.filter(r => new Date(r.date || r.createdAt) >= new Date(dateRange.from))
    if (dateRange.to) {
      const to = new Date(dateRange.to)
      to.setHours(23, 59, 59, 999)
      receipts = receipts.filter(r => new Date(r.date || r.createdAt) <= to)
    }

    return receipts.map((receipt) => {
      const supplier = receipt.supplierId || {}
      return {
        id: receipt._id || receipt.id || receipt.receiptNumber,
        receiptNumber: receipt.receiptNumber,
        date: receipt.date || receipt.createdAt,
        supplierName: supplier.name || "",
        companyName: supplier.company || "",
        supplierId: supplier.supplierId || '',
        totalAmount: receipt.totalAmount || 0,
        cashAmount: receipt.cashAmount || 0,
        bankAmount: receipt.bankAmount || 0,
        methodSummary: receipt.paymentMethodSummary || (receipt.cashAmount > 0 && receipt.bankAmount > 0 ? "cash + bank" : receipt.cashAmount > 0 ? "cash" : "bank"),
        status: receipt.status || "active",
        createdBy: receipt.createdBy?.name || "Unknown",
        ordersAffected: receipt.ordersAffected || 0,
        advanceAmount: receipt.advanceAmount || 0,
        balanceBefore: receipt.balanceBefore,
        balanceAfter: receipt.balanceAfter,
        notes: receipt.notes || "-",
        raw: receipt,
      }
    })
  }, [supplierReceiptsData, dateRange])

  const handlePrintSupplierReceipt = useCallback(async (receiptRow) => {
    const supplierId = receiptRow.raw?.supplierId || selectedSupplierId
    if (!supplierId || supplierId === "all") return toast.error("Supplier ID missing for receipt")

    setIsLoadingSupplierReceipt(true)
    try {
      const response = await ledgerAPI.getSupplierPaymentReceipt(supplierId, receiptRow.receiptNumber)
      const receiptData = response?.data?.data || response?.data || null
      if (!receiptData) throw new Error("Receipt data not found")
      printSupplierReceipt(receiptData)
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to print supplier payment receipt")
    } finally {
      setIsLoadingSupplierReceipt(false)
    }
  }, [selectedSupplierId])

  // --- COLUMNS ---

  const summaryColumns = useMemo(() => [
    {
      header: "Supplier ID",
      accessor: "id",
      filterType: "text",
      // Show actual supplierId if available, otherwise fallback to sliced Mongo ID
      render: (row) => <span className="font-mono text-xs text-muted-foreground">{row.supplierId || String(row.id || row._id).slice(-8)}</span>,
      pdfValue: (row) => row.supplierId || String(row.id || row._id).slice(-8)
    },
    {
      header: "Supplier Name",
      accessor: "company",
      filterType: "autocomplete",
      render: (row) => (
        <div className="flex flex-col">
          <button onClick={() => { setSelectedSupplierId(String(row.id || row._id)); setActiveTab(0); }} className="text-blue-600 hover:underline font-bold text-left">
            {row.company || row.name || "—"}
          </button>
          {row.company && row.name && row.company !== row.name && <span className="text-[10px] text-muted-foreground">({row.name})</span>}
        </div>
      )
    },
    { 
      header: "Total Balance", 
      filterType: "text", 
      accessor: "balance", 
      render: (row) => {
        const bal = row.balance || 0;
        // Positive = You owe supplier (Red), Negative = Supplier owes you (Green)
        const colorClass = bal > 0 ? "text-red-600" : bal < 0 ? "text-green-600" : "text-foreground";
        return <span className={`tabular-nums font-bold ${colorClass}`}>{currency(Math.abs(bal))}</span>;
      } 
    },
  ], [])

  const allLedgerColumns = useMemo(() => {
    const base = [
      { header: "Entry #", accessor: "entryNumber", filterType: "text", render: (row) => <span className="font-medium">{row.entryNumber}</span>, pdfValue: (row) => row.entryNumber },
      { header: "Date", accessor: "date", filterType: "date-picker", render: (row) => formatDateTime(row), pdfValue: (row) => formatDateTime(row) },
    ]
    if (selectedSupplierId === "all") {
      // base.push({
      //   header: "Supplier ID", accessor: "supplierId", filterType: "text", render: (row) => <div className="font-medium text-muted-foreground">{row.supplierId || "-"}</div>, pdfValue: (row) => row.supplierId || "-"
      // })
      base.push({
        header: "Supplier", accessor: "supplier", filterType: "autocomplete", render: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-blue-600">{row.companyName || row.supplierName || "-"}</span>
            {row.companyName && row.supplierName && row.companyName !== row.supplierName && (
              <span className="text-[10px] text-muted-foreground leading-tight">({row.supplierName})</span>
            )}
          </div>
        ), pdfValue: (row) => row.companyName || row.supplierName
      })
    }
    const tail = [
      { header: "Type", accessor: "type", filterType: "text", render: (row) => <span className="text-muted-foreground text-xs">{row.type || "-"}</span>, pdfValue: (row) => row.type || "-" },
      {
        header: "Reference", accessor: "reference", filterType: "text", render: (row) => {
          const linkTarget = row.referenceModel === "Return" ? row.dispatchOrderId : row.referenceId
          return linkTarget ? <Link href={`/dispatch-orders/${linkTarget}`} className="font-medium text-blue-600 hover:underline">{row.reference || "-"}</Link> : <span className="font-medium">{row.reference || "-"}</span>
        }, pdfValue: (row) => row.reference || "-"
      },
      { header: "Debit (Owe)", accessor: "debit", filterType: "text", render: (row) => <span className={`tabular-nums font-semibold ${row.debit > 0 ? "text-red-600" : "text-muted-foreground"}`}>{row.debit > 0 ? formatNumber(row.debit) : "-"}</span>, pdfValue: (row) => row.debit > 0 ? row.debit : 0 },
      { header: "Cash Paid", accessor: "cashPaid", filterType: "text", render: (row) => <span className={`tabular-nums font-semibold ${row.cashPaid > 0 ? "text-blue-600" : "text-muted-foreground"}`}>{row.cashPaid > 0 ? formatNumber(row.cashPaid) : "-"}</span>, pdfValue: (row) => row.cashPaid > 0 ? row.cashPaid : 0 },
      { header: "Bank Paid", accessor: "bankPaid", filterType: "text", render: (row) => <span className={`tabular-nums font-semibold ${row.bankPaid > 0 ? "text-purple-600" : "text-muted-foreground"}`}>{row.bankPaid > 0 ? formatNumber(row.bankPaid) : "-"}</span>, pdfValue: (row) => row.bankPaid > 0 ? row.bankPaid : 0 },
      { header: "Return", accessor: "returnAmount", filterType: "text", render: (row) => <span className={`tabular-nums font-semibold ${row.returnAmount > 0 ? "text-orange-600" : "text-muted-foreground"}`}>{row.returnAmount > 0 ? formatNumber(row.returnAmount) : "-"}</span>, pdfValue: (row) => row.returnAmount > 0 ? row.returnAmount : 0 },
      { header: "Balance", accessor: "balance", filterType: "text", render: (row) => <span className="tabular-nums font-bold">{formatNumber(row.balance)}</span>, pdfValue: (row) => row.balance || 0 },
    ]
    return [...base, ...tail]
  }, [selectedSupplierId])

  const paymentHistoryColumns = useMemo(() => {
    const cols = [
      {
        header: "ID",
        accessor: "entryNumber",
        filterType: "text",
        render: (row) => <span className="font-mono text-blue-600 font-medium">{row.entryNumber || String(row.id).slice(-6)}</span>,
        pdfValue: (row) => row.entryNumber || String(row.id).slice(-6)
      },
      {
        header: "Date",
        accessor: "date",
        filterType: "date-picker",
        render: (row) => formatDateTime({ date: row.date }),
        pdfValue: (row) => formatDateTime({ date: row.date })
      }
    ]

    if (selectedSupplierId === 'all') {
      // cols.push({
      //   header: "Supplier ID",
      //   accessor: "supplierId",
      //   filterType: "text",
      //   render: (row) => <div className="font-medium text-muted-foreground">{row.supplierId || "—"}</div>,
      //   pdfValue: (row) => row.supplierId || "—"
      // })
      cols.push({
        header: "Supplier Name",
        accessor: "supplierName",
        filterType: "autocomplete",
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-blue-600">{row.companyName || row.supplierName || "-"}</span>
            {row.companyName && row.supplierName && row.companyName !== row.supplierName && (
              <span className="text-[10px] text-muted-foreground leading-tight">({row.supplierName})</span>
            )}
          </div>
        ),
        pdfValue: (row) => row.companyName || row.supplierName
      })
    }

    cols.push(
      {
        header: "Total Balance",
        accessor: "totalBalance",
        filterType: "text",
        render: (row) => <span className="tabular-nums font-medium">{formatNumber(row.balance + (row.credit || 0))}</span>,
        pdfValue: (row) => row.balance + (row.credit || 0)
      },
      {
        header: "Cash Paid",
        accessor: "cashPaid",
        filterType: "text",
        render: (row) => <span className="tabular-nums font-medium">{formatNumber(row.cashPaid || 0)}</span>,
        pdfValue: (row) => row.cashPaid || 0
      },
      {
        header: "Bank Cash",
        accessor: "bankPaid",
        filterType: "text",
        render: (row) => <span className="tabular-nums font-medium">{formatNumber(row.bankPaid || 0)}</span>,
        pdfValue: (row) => row.bankPaid || 0
      },
      {
        header: "Remaining Balance",
        accessor: "balance",
        filterType: "text",
        render: (row) => <span className="tabular-nums font-medium">{formatNumber(row.balance)}</span>,
        pdfValue: (row) => row.balance
      },
      // {
      //   header: "Receipt",
      //   accessor: "receipt",
      //   render: (row) => {
      //     const receipt = receiptByLedgerEntryId.get(row.id)
      //     if (!receipt) return <span className="text-muted-foreground">-</span>
      //     return (
      //       <Button size="sm" variant="outline" className="gap-1.5 text-blue-600 hover:text-blue-700" onClick={() => handlePrintSupplierReceipt({ receiptNumber: receipt.receiptNumber, raw: { supplierId: row.supplierId } })} disabled={isLoadingSupplierReceipt}>
      //         <FileText className="h-3.5 w-3.5" />{receipt.receiptNumber}
      //       </Button>
      //     )
      //   }
      // }
    )

    return cols
  }, [selectedSupplierId, receiptByLedgerEntryId, isLoadingSupplierReceipt, handlePrintSupplierReceipt])

  const supplierReceiptColumns = useMemo(() => {
    const base = [
      { header: "Receipt #", accessor: "receiptNumber", filterType: "text", render: (row) => <span className="font-mono font-medium text-blue-600">{row.receiptNumber}</span>, pdfValue: (row) => row.receiptNumber },
      { header: "Date", accessor: "date", filterType: "date-picker", render: (row) => formatDateTime(row), pdfValue: (row) => formatDateTime(row) },
    ]
    if (selectedSupplierId === "all") {
      base.push({
        header: "Supplier ID",
        accessor: "supplierId",
        filterType: "text",
        render: (row) => <div className="font-medium text-muted-foreground">{row.supplierId || "—"}</div>,
        pdfValue: (row) => row.supplierId || "—"
      })
      base.push({
        header: "Supplier", accessor: "supplierName", filterType: "autocomplete", render: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-blue-600">{row.companyName || row.supplierName || "-"}</span>
            {row.companyName && row.supplierName && row.companyName !== row.supplierName && (
              <span className="text-[10px] text-muted-foreground leading-tight">({row.supplierName})</span>
            )}
          </div>
        ), pdfValue: (row) => row.companyName || row.supplierName
      })
    }
    const tail = [
      { header: "Amount", accessor: "totalAmount", filterType: "text", render: (row) => <span className="tabular-nums font-semibold text-green-600">{formatNumber(row.totalAmount)}</span>, pdfValue: (row) => row.totalAmount },
      { header: "Method", accessor: "methodSummary", filterType: "text", render: (row) => <Badge variant="outline" className="uppercase">{row.methodSummary}</Badge>, pdfValue: (row) => row.methodSummary.toUpperCase() },
      // { header: "Applied", accessor: "ordersAffected", filterType: "text", render: (row) => <span className="text-sm text-muted-foreground">{row.ordersAffected} order{row.ordersAffected === 1 ? "" : "s"} {row.advanceAmount > 0 ? ` + ${formatNumber(row.advanceAmount)} advance` : ""}</span>, pdfValue: (row) => `${row.ordersAffected} orders` },
      // { header: "Created By", accessor: "createdBy", filterType: "text", render: (row) => row.createdBy, pdfValue: (row) => row.createdBy },
      {
        header: "Actions", accessor: "actions", render: (row) => (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handlePrintSupplierReceipt(row)} disabled={isLoadingSupplierReceipt}><Printer className="h-4 w-4" /></Button>
            {row.status === "active" && (isSuperAdmin ? (
              <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => { setSelectedReceipt(row); setReceiptReversalReason(""); setReceiptReversalDialogOpen(true); }} title="Reverse Receipt"><RotateCcw className="h-4 w-4" /></Button>
            ) : (
              <Button size="sm" variant="outline" className="text-orange-600 border-orange-400 hover:bg-orange-50" onClick={() => setDeleteReceiptTarget(row)} title="Request Deletion"><RotateCcw className="h-4 w-4" /></Button>
            )
            )}
          </div>
        ),
      },
    ]
    return [...base, ...tail]
  }, [selectedSupplierId, isSuperAdmin, isLoadingSupplierReceipt, handlePrintSupplierReceipt])

  // --- PDF EXPORTS ---

  const handleExportLedgerPDF = useCallback(() => {
    if (!filteredLedgerTransactions.length) return toast.error("No ledger data to export")
    const name = selectedEntity ? selectedEntity.name : "All Suppliers"
    exportToPDF({ title: "Supplier Ledger Report", subtitle: `Supplier: ${name}`, columns: allLedgerColumns, data: filteredLedgerTransactions, filename: `Supplier_Ledger_${name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}` })
  }, [filteredLedgerTransactions, selectedEntity, allLedgerColumns])

  const handleExportPaymentHistoryPDF = useCallback(() => {
    if (!paymentHistoryTransactions.length) return toast.error("No payment history to export")
    const name = selectedEntity ? selectedEntity.name : "All Suppliers"
    exportToPDF({ title: "Supplier Payment History", subtitle: `Supplier: ${name}`, columns: paymentHistoryColumns.filter(c => c.header !== "Receipt"), data: paymentHistoryTransactions, filename: `Supplier_Payments_${name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}` })
  }, [paymentHistoryTransactions, selectedEntity, paymentHistoryColumns])

  const handleExportReceiptsPDF = useCallback(() => {
    if (!supplierReceiptTransactions.length) return toast.error("No receipts to export")
    const name = selectedEntity ? selectedEntity.name : "All Suppliers"
    exportToPDF({ title: "Supplier Payment Receipts", subtitle: `Supplier: ${name}`, columns: supplierReceiptColumns.filter(c => c.header !== "Actions"), data: supplierReceiptTransactions, filename: `Supplier_Receipts_${name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}` })
  }, [supplierReceiptTransactions, selectedEntity, supplierReceiptColumns])

  // --- RENDER ---

  const isGlobalView = selectedSupplierId === "all"

  const dashboardTabs = [
    {
      label: "Supplier Ledger",
      content: (
        <div className="space-y-4">
          <DataTableFiltered title="All Suppliers" columns={summaryColumns} data={dropdownSuppliers} loading={allSuppliersLoading} enableSearch={true} paginate={true} pageSize={20} enableColumnFilters={true} compact={true} />
        </div>
      )
    },
    {
      label: "Payment History",
      content: (
        <div className="space-y-4">
          <DataTableFiltered title="All Payment History" columns={paymentHistoryColumns} data={paymentHistoryTransactions} loading={allLedgerLoading} onDownloadPDF={handleExportPaymentHistoryPDF} paginate={true} pageSize={20} enableSearch={true} enableColumnFilters={true} compact={true} />
        </div>
      )
    },
    {
      label: "Payment Receipts",
      content: (
        <div className="space-y-4">
          <DataTableFiltered title="All Payment Receipts" columns={supplierReceiptColumns} data={supplierReceiptTransactions} loading={supplierReceiptsLoading || isFetching} onDownloadPDF={handleExportReceiptsPDF} paginate={true} pageSize={20} enableSearch={true} enableColumnFilters={true} compact={true} />
        </div>
      )
    }
  ]

  const detailTabs = [
    {
      label: "Supplier Ledger",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">Total Entries</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{filteredLedgerTransactions.length}</div>
            </div>
            <div className={`rounded-lg border p-4 shadow-sm ${calculatedTotalBalance <= 0 ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30'}`}>
              <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${calculatedTotalBalance <= 0 ? 'text-emerald-700/80' : 'text-red-700/80'}`}>
                {calculatedTotalBalance >= 0 ? "Total Payable to Supplier" : "Total Receivable from Supplier"}
              </div>
              <div className={`mt-1 text-2xl font-bold tabular-nums ${calculatedTotalBalance <= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatNumber(Math.abs(calculatedTotalBalance))}
              </div>
            </div>
          </div>
          <DataTableFiltered title="Supplier Ledger" columns={allLedgerColumns} data={filteredLedgerTransactions} loading={allLedgerLoading} onDownloadPDF={handleExportLedgerPDF} enableSearch={true} paginate={true} pageSize={20} enableColumnFilters={true} compact={true} />
        </div>
      )
    },
    {
      label: "Payment History",
      content: (
        <div className="space-y-4">
          <DataTableFiltered title="Payment History" columns={paymentHistoryColumns} data={paymentHistoryTransactions} loading={allLedgerLoading} onDownloadPDF={handleExportPaymentHistoryPDF} enableSearch={true} paginate={true} pageSize={20} enableColumnFilters={true} compact={true} />
        </div>
      )
    },
    {
      label: "Payment Receipts",
      content: (
        <div className="space-y-4">
          <DataTableFiltered title="Payment Receipts" columns={supplierReceiptColumns} data={supplierReceiptTransactions} loading={supplierReceiptsLoading || isFetching} onDownloadPDF={handleExportReceiptsPDF} enableSearch={true} paginate={true} pageSize={20} enableColumnFilters={true} compact={true} />
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6 p-4">
      {/* Universal Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
        <div className="flex items-center gap-4">
          <BackButton fallbackPath="/reports/payables" label="Back" />
          <div className="w-64">
            <Combobox
              options={comboboxOptions}
              value={selectedSupplierId}
              onValueChange={(value) => { setSelectedSupplierId(value || "all"); setActiveTab(0); }}
              placeholder="Select supplier..."
              searchPlaceholder="Search supplier..."
              emptyMessage="No supplier found"
              loading={allSuppliersLoading}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setManualDebtOpen(true)} variant="outline" className="border-red-200 hover:bg-red-50 text-red-600">
            <Plus className="h-4 w-4 mr-2" /> Add Supplier Debt
          </Button>
          <Button onClick={() => setUniversalPaymentOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" /> Add Payment
          </Button>
        </div>
      </header>

      {/* Universal Date Range Filter */}
      <div className="flex flex-row items-end gap-3 ">
        <div className="flex flex-col gap-1 flex-1 min-w-0 md:max-w-[200px]">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">From Date</Label>
          <BritishDatePicker
            value={dateRange.from || null}
            onChange={(date) => setDateRange(r => ({ ...r, from: date ? formatLocalDate(date) : "" }))}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0 md:max-w-[200px]">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">To Date</Label>
          <BritishDatePicker
            value={dateRange.to || null}
            onChange={(date) => setDateRange(r => ({ ...r, to: date ? formatLocalDate(date) : "" }))}
          />
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs tabs={isGlobalView ? dashboardTabs : detailTabs} activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Modals */}
      <SupplierPaymentModal
        open={universalPaymentOpen}
        onClose={() => setUniversalPaymentOpen(false)}
        entityId={selectedSupplierId !== "all" ? selectedSupplierId : ""}
        allLedgerData={allLedgerData}
        entityName={selectedEntity?.name || selectedEntity?.company || "Supplier"}
        totalBalance={selectedSupplierId !== "all" ? Math.abs(selectedEntity?.balance || 0) : 0}
        ledgerBalance={balanceForModal}
        ledgerBalanceSupplierId={selectedSupplierId !== "all" ? selectedSupplierId : null}
        supplierBalanceMap={supplierBalanceMap}
        entities={dropdownSuppliers}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["pending-balances"] })
          queryClient.invalidateQueries({ queryKey: ["ledger"] })
          queryClient.invalidateQueries({ queryKey: ["suppliers"] })
          queryClient.invalidateQueries({ queryKey: ["supplier-payment-receipts"] })
        }}
      />

      <ManualSupplierDebtModal
        open={manualDebtOpen}
        onClose={() => setManualDebtOpen(false)}
        entities={dropdownSuppliers}
        entityId={selectedSupplierId !== "all" ? selectedSupplierId : ""}
        entityName={selectedEntity?.name || selectedEntity?.company || "Supplier"}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["pending-balances"] })
          queryClient.invalidateQueries({ queryKey: ["ledger"] })
          queryClient.invalidateQueries({ queryKey: ["suppliers"] })
        }}
      />

      <DeleteRequestDialog
        open={!!deleteReceiptTarget}
        onClose={() => setDeleteReceiptTarget(null)}
        entityType="supplierPayment"
        entityId={deleteReceiptTarget?.receiptNumber}
        entityRef={deleteReceiptTarget?.receiptNumber}
        entitySummary={deleteReceiptTarget ? {
          "Receipt #": deleteReceiptTarget.receiptNumber,
          "Amount": formatNumber(deleteReceiptTarget.totalAmount),
          "Supplier": deleteReceiptTarget.supplierName || "—",
          "Method": deleteReceiptTarget.methodSummary || "—",
        } : {}}
        onSuccess={() => setDeleteReceiptTarget(null)}
      />

      <Dialog open={receiptReversalDialogOpen} onOpenChange={setReceiptReversalDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <RotateCcw className="h-5 w-5 text-destructive" />
              </div>
              <DialogTitle className="text-xl">Reverse Receipt</DialogTitle>
            </div>
          </DialogHeader>
          {selectedReceipt && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 my-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Receipt #:</span>
                <span className="text-sm font-medium">{selectedReceipt.receiptNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Amount:</span>
                <span className="text-sm font-bold">{formatNumber(selectedReceipt.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Supplier:</span>
                <span className="text-sm">{selectedReceipt.supplierName}</span>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Reason for Reversal *</Label>
            <Textarea
              value={receiptReversalReason}
              onChange={(e) => setReceiptReversalReason(e.target.value)}
              placeholder="Please provide a reason for reversing this receipt..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptReversalDialogOpen(false)} disabled={isReversingReceipt}>Cancel</Button>
            <Button variant="destructive" disabled={isReversingReceipt || !receiptReversalReason.trim()} onClick={async () => {
              if (!selectedReceipt || !receiptReversalReason.trim()) return
              setIsReversingReceipt(true)
              try {
                const supplierId =  selectedReceipt.raw?.supplierId || selectedSupplierId
                await ledgerAPI.reverseSupplierReceipt(supplierId, selectedReceipt.receiptNumber, receiptReversalReason.trim())
                toast.success(`Receipt ${selectedReceipt.receiptNumber} reversed successfully`)
                queryClient.invalidateQueries({ queryKey: ["supplier-payment-receipts"] })
                queryClient.invalidateQueries({ queryKey: ["ledger", "supplier"] })
                queryClient.invalidateQueries({ queryKey: ["pending-balances"] })
                setReceiptReversalDialogOpen(false)
                setSelectedReceipt(null)
                setReceiptReversalReason("")
              } catch (error) {
                toast.error(error.response?.data?.message || "Failed to reverse receipt")
              } finally {
                setIsReversingReceipt(false)
              }
            }}>
              {isReversingReceipt ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Confirm Reversal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}