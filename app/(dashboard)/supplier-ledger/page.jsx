"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Tabs from "@/components/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import DataTable from "../../../components/data-table"
import { useSuppliers, useAllSuppliers, useSupplier } from "@/lib/hooks/useSuppliers"
import { useSupplierLedger, useAllSupplierLedgers } from "@/lib/hooks/useLedger"
import { ledgerAPI } from "@/lib/api/endpoints/ledger"
import { dispatchOrdersAPI } from "@/lib/api/endpoints/dispatchOrders"
import { balancesAPI } from "@/lib/api/endpoints/balances"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Plus, FileText, Users, Search, Filter, Building2, DollarSign, Clock, CheckCircle2, RotateCcw, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import SupplierPaymentModal from "@/components/modals/SupplierPaymentModal"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

function formatNumber(n) {
  const num = Number(n || 0)
  return num.toFixed(2)
}

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}



function formatDateTime(_date) {
  const dateTime = _date.createdAt || _date.date;
  if (!dateTime) return "-";
  const d = new Date(dateTime);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
  const date = d.toLocaleDateString('en-GB');
  return `${date} ${time}`;
  // return new Date(_date).toLocaleDateString('en-GB');
}

export default function SupplierLedgerPage() {
  const [selectedSupplierId, setSelectedSupplierId] = useState("") // Default to empty - require supplier selection
  const [selectedDispatchOrderId, setSelectedDispatchOrderId] = useState("none")
  const [activeTab, setActiveTab] = useState(0) // Track active tab
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [markAsPaidDialog, setMarkAsPaidDialog] = useState({ open: false, balance: null })
  const [markAsPaidForm, setMarkAsPaidForm] = useState({ method: 'cash', amount: '' })
  const [isMarkingAsPaid, setIsMarkingAsPaid] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: '',
    description: '',
    method: 'cash' // Default to cash
  })

  // Universal payment modal state
  const [universalPaymentOpen, setUniversalPaymentOpen] = useState(false)

  // Filter for Tab 1 - Supplier Ledger
  const [ledgerSupplierFilter, setLedgerSupplierFilter] = useState("")
  const [ledgerFilterBy, setLedgerFilterBy] = useState("all")
  const [ledgerSearch, setLedgerSearch] = useState("")
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [pendingPaymentSupplierOpen, setPendingPaymentSupplierOpen] = useState(false)
  const [paymentHistorySupplierOpen, setPaymentHistorySupplierOpen] = useState(false)

  // Filters for Tab 2 (Pending Payments)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all")

  // Filters for Tab 3 (Payment History)
  const [paymentHistorySupplier, setPaymentHistorySupplier] = useState("")
  const [paymentHistoryDateFrom, setPaymentHistoryDateFrom] = useState("")
  const [paymentHistoryDateTo, setPaymentHistoryDateTo] = useState("")
  const [paymentHistoryMethodFilter, setPaymentHistoryMethodFilter] = useState("all")

  const queryClient = useQueryClient()

  // Fetch suppliers with user accounts for Tab 1 table
  const { data: suppliersWithUsers = [], isLoading: suppliersLoading } = useSuppliers()

  // Fetch ALL suppliers for Tab 2 dropdown (including those without user accounts)
  const { data: allSuppliers = [], isLoading: allSuppliersLoading } = useAllSuppliers({ limit: 100 })

  // Use allSuppliers for dropdown, suppliersWithUsers for Tab 1 table
  const suppliers = suppliersWithUsers
  const dropdownSuppliers = allSuppliers

  // Fetch supplier ledger entries for Tab 1 (only when a supplier is selected)
  const ledgerFilterParams = useMemo(() => {
    if (!ledgerSupplierFilter || ledgerSupplierFilter === 'all') {
      return null // Don't fetch if no supplier selected
    }
    return { supplierId: ledgerSupplierFilter, limit: 100 }
  }, [ledgerSupplierFilter])

  const { data: allLedgerData, isLoading: allLedgerLoading } = useAllSupplierLedgers(ledgerFilterParams || {})

  // Fetch selected supplier details and transactions for Tab 2
  const { data: supplierDetails, isLoading: supplierDetailsLoading } = useSupplier(
    selectedSupplierId && selectedSupplierId !== 'all' ? selectedSupplierId : ''
  )

  // Fetch ledger entries for the selected supplier in Tab 2 (only when a supplier is selected)
  const paymentLedgerParams = useMemo(() => {
    if (!selectedSupplierId || selectedSupplierId === 'all') {
      return null // Don't fetch if no supplier selected
    }
    return { supplierId: selectedSupplierId }
  }, [selectedSupplierId])

  const { data: ledgerData, isLoading: ledgerLoading } = useSupplierLedger(
    selectedSupplierId && selectedSupplierId !== 'all' ? selectedSupplierId : ''
  )

  // Don't fetch all payment entries - require supplier selection
  const shouldFetchAllPayments = false
  const { data: allPaymentLedgerData, isLoading: allPaymentLedgerLoading } = useAllSupplierLedgers(
    shouldFetchAllPayments ? (paymentLedgerParams || {}) : {}
  )

  // Fetch unpaid dispatch orders for selected supplier
  const { data: unpaidDispatchOrders = [], isLoading: unpaidOrdersLoading } = useQuery({
    queryKey: ['unpaid-dispatch-orders', selectedSupplierId],
    queryFn: async () => {
      if (!selectedSupplierId || selectedSupplierId === 'all') return []
      const response = await dispatchOrdersAPI.getUnpaidBySupplier(selectedSupplierId)
      return response?.data?.data || response?.data || []
    },
    enabled: !!selectedSupplierId && selectedSupplierId !== 'all'
  })

  // Get selected dispatch order details
  const selectedDispatchOrder = useMemo(() => {
    if (!selectedDispatchOrderId || selectedDispatchOrderId === 'none') return null
    return unpaidDispatchOrders.find(order => order._id === selectedDispatchOrderId)
  }, [selectedDispatchOrderId, unpaidDispatchOrders])

  // Fetch pending balances (only when a specific supplier is selected)
  const { data: pendingBalancesData, isLoading: pendingBalancesLoading, error: pendingBalancesError } = useQuery({
    queryKey: ['pending-balances', selectedSupplierId],
    queryFn: async () => {
      try {
        const response = await balancesAPI.getPendingBalances(selectedSupplierId)
        console.log('Pending balances API response:', response)
        // API response structure: { success: true, data: { balances: [], totals: {} }, message: "...", timestamp: "..." }
        const result = response?.data?.data || response?.data || { balances: [], totals: { cashPending: 0, bankPending: 0, totalPending: 0 } }
        console.log('Processed pending balances data:', result)
        return result
      } catch (error) {
        console.error('Error fetching pending balances:', error)
        throw error
      }
    },
    enabled: activeTab === 1 && !!selectedSupplierId && selectedSupplierId !== 'all' // Only fetch when Tab 2 is active AND supplier selected
  })

  const pendingBalances = pendingBalancesData?.balances || []
  const pendingTotals = pendingBalancesData?.totals || { cashPending: 0, bankPending: 0, totalPending: 0, totalPaid: 0 }

  // Map pending balances with entry numbers from ledger data
  const pendingBalancesWithEntryNumbers = useMemo(() => {
    const entries = allLedgerData?.entries || ledgerData?.entries || []

    // Create a map: referenceId -> entryNumber for purchase entries
    const purchaseEntryMap = new Map()
    entries.forEach(entry => {
      if (entry.transactionType === 'purchase' && entry.referenceId) {
        const refId = typeof entry.referenceId === 'object' && entry.referenceId !== null
          ? entry.referenceId._id?.toString() || entry.referenceId.toString()
          : entry.referenceId.toString()
        purchaseEntryMap.set(refId, entry.entryNumber || '-')
      }
    })

    return pendingBalances.map(balance => {
      // Normalize referenceId for matching
      const refIdOrId = balance.referenceId || balance.id
      const balanceRefId = refIdOrId
        ? (typeof refIdOrId === 'object' && refIdOrId !== null
          ? refIdOrId._id?.toString() || refIdOrId.toString()
          : refIdOrId.toString())
        : null

      return {
        ...balance,
        entryNumber: balanceRefId ? (purchaseEntryMap.get(balanceRefId) || '-') : '-'
      }
    })
  }, [pendingBalances, allLedgerData, ledgerData])

  // Fetch payment history for Tab 3 (only when a supplier is selected)
  const paymentHistoryParams = useMemo(() => {
    if (!paymentHistorySupplier || paymentHistorySupplier === 'all') {
      return null // Don't fetch if no supplier selected
    }
    return { supplierId: paymentHistorySupplier, limit: 100 }
  }, [paymentHistorySupplier])

  const { data: paymentHistoryData, isLoading: paymentHistoryLoading } = useAllSupplierLedgers(paymentHistoryParams || {})

  // Calculate totals from displayed rows (matching Total Balances logic)
  const calculatedCashPending = pendingBalances.reduce((sum, balance) => {
    return sum + (balance.cashPending || 0)
  }, 0)

  const calculatedBankPending = pendingBalances.reduce((sum, balance) => {
    return sum + (balance.bankPending || 0)
  }, 0)

  const calculatedTotalPending = calculatedCashPending + calculatedBankPending

  // Calculate outstanding balance for selected supplier from pendingBalances
  const calculatedOutstandingBalance = useMemo(() => {
    if (selectedSupplierId === 'all' || !selectedSupplierId) {
      return 0
    }
    return pendingBalances
      .filter(balance => {
        const balanceSupplierId = balance.supplierId || balance.supplier?._id || balance.supplier?.id
        return String(balanceSupplierId) === String(selectedSupplierId)
      })
      .reduce((sum, balance) => sum + (balance.amount || 0), 0)
  }, [pendingBalances, selectedSupplierId])

  // Transform payment history for Tab 3
  const paymentHistoryTransactions = useMemo(() => {
    if (!paymentHistoryData?.entries) return []

    // Filter to only payment entries
    const paymentEntries = paymentHistoryData.entries.filter(entry =>
      entry.transactionType === 'payment'
    )

    // Apply date filters
    let filtered = paymentEntries
    if (paymentHistoryDateFrom) {
      const fromDate = new Date(paymentHistoryDateFrom)
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date || entry.createdAt)
        return entryDate >= fromDate
      })
    }
    if (paymentHistoryDateTo) {
      const toDate = new Date(paymentHistoryDateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date || entry.createdAt)
        return entryDate <= toDate
      })
    }

    // Apply payment method filter
    if (paymentHistoryMethodFilter !== 'all') {
      filtered = filtered.filter(entry => entry.paymentMethod === paymentHistoryMethodFilter)
    }

    return filtered.map(entry => {
      const supplier = entry.entityId || {}
      const supplierName = supplier.name || supplier.company || 'Unknown Supplier'

      // Get order reference
      let reference = '-'
      if (entry.referenceId) {
        if (typeof entry.referenceId === 'object' && entry.referenceId !== null) {
          reference = entry.referenceId.orderNumber || entry.referenceId.purchaseNumber || entry.referenceId._id || '-'
        } else {
          reference = entry.referenceId.toString()
        }
      }

      // Get made by user
      const madeBy = entry.createdBy?.name || 'Unknown'

      return {
        id: entry._id || entry.id,
        date: entry.date || entry.createdAt,
        supplierName,
        supplierId: supplier._id || supplier.id,
        reference,
        paymentMethod: entry.paymentMethod || 'cash',
        amount: entry.credit || 0,
        madeBy,
        notes: entry.description || entry.remarks || '-',
        entryNumber: entry.entryNumber || '-',
        raw: entry
      }
    })
  }, [paymentHistoryData, paymentHistoryDateFrom, paymentHistoryDateTo, paymentHistoryMethodFilter])

  // Calculate payment summary for Tab 3
  const paymentSummary = useMemo(() => {
    const total = paymentHistoryTransactions.reduce((sum, txn) => sum + (txn.amount || 0), 0)
    const cash = paymentHistoryTransactions
      .filter(txn => txn.paymentMethod === 'cash')
      .reduce((sum, txn) => sum + (txn.amount || 0), 0)
    const bank = paymentHistoryTransactions
      .filter(txn => txn.paymentMethod === 'bank')
      .reduce((sum, txn) => sum + (txn.amount || 0), 0)

    // Count payments this month
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const countThisMonth = paymentHistoryTransactions.filter(txn => {
      const txnDate = new Date(txn.date)
      return txnDate >= firstDayOfMonth
    }).length

    return { total, cash, bank, countThisMonth }
  }, [paymentHistoryTransactions])

  // Debug logging
  console.log('Pending balances state:', {
    activeTab,
    selectedSupplierId,
    pendingBalancesLoading,
    pendingBalancesError: pendingBalancesError?.message,
    pendingBalancesData,
    pendingBalances,
    pendingTotals
  })

  // Handle row click to select supplier and switch to Tab 2
  const handleSupplierRowClick = (supplier) => {
    setSelectedSupplierId(String(supplier.id))
    setActiveTab(1) // Switch to Tab 2
  }

  // Supplier Ledger Table Columns (All Suppliers) - Make rows clickable
  const supplierLedgerColumns = useMemo(
    () => [
      {
        header: "Supplier No",
        accessor: "id",
        render: (row) => String(row.id).slice(-6)
      },
      {
        header: "Supplier Name",
        accessor: "name",
        render: (row) => (
          <div>
            <div className="font-medium">{row.name}</div>
            {row.company && <div className="text-sm text-muted-foreground">{row.company}</div>}
          </div>
        )
      },
      {
        header: "Balance",
        accessor: "balance",
        render: (row) => (
          <span className={`tabular-nums font-semibold ${row.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatNumber(Math.abs(row.balance || 0))} {row.balance >= 0 ? 'DR' : 'CR'}
          </span>
        )
      }
    ],
    []
  )

  // Transform transactions for detailed ledger table with filters
  const transactions = useMemo(() => {
    // If "all" suppliers selected, use all ledger data; otherwise use supplier-specific data
    const isAllSuppliers = selectedSupplierId === 'all'
    const supplierTransactions = isAllSuppliers ? [] : (supplierDetails?.transactions || [])
    const ledgerEntries = isAllSuppliers
      ? (allPaymentLedgerData?.entries || [])
      : (ledgerData?.entries || [])

    // Merge and sort by date
    let allTransactions = [
      ...supplierTransactions.map(txn => ({
        ...txn,
        source: 'supplier',
        _id: txn._id || txn.id,
      })),
      ...ledgerEntries.map(entry => ({
        ...entry,
        source: 'ledger',
        type: entry.transactionType || entry.type,
        _id: entry._id || entry.id,
      }))
    ].sort((a, b) => {
      const dateA = new Date(a.date || a.transactionDate || a.createdAt || 0)
      const dateB = new Date(b.date || b.transactionDate || b.createdAt || 0)
      return dateB - dateA
    })

    // Apply filters
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      allTransactions = allTransactions.filter(txn => {
        const txnDate = new Date(txn.date || txn.transactionDate || txn.createdAt)
        return txnDate >= fromDate
      })
    }

    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999) // Include entire end date
      allTransactions = allTransactions.filter(txn => {
        const txnDate = new Date(txn.date || txn.transactionDate || txn.createdAt)
        return txnDate <= toDate
      })
    }

    if (transactionTypeFilter !== 'all') {
      allTransactions = allTransactions.filter(txn => {
        const txnType = txn.transactionType || txn.type || ''
        return txnType.toLowerCase() === transactionTypeFilter.toLowerCase()
      })
    }

    if (paymentMethodFilter !== 'all') {
      allTransactions = allTransactions.filter(txn => {
        return txn.paymentMethod === paymentMethodFilter
      })
    }

    // Filter to only show payment entries (for payment tab)
    allTransactions = allTransactions.filter(txn => {
      return txn.transactionType === 'payment' || txn.type === 'payment'
    })

    return allTransactions.map(txn => {
      // Determine transaction type label
      let typeLabel = txn.type || txn.transactionType || '-'
      if (txn.referenceModel === 'DispatchOrder') {
        if (txn.transactionType === 'payment') {
          typeLabel = `Payment (${txn.paymentMethod === 'cash' ? 'Cash' : 'Bank'})`
        } else {
          typeLabel = 'Dispatch Order Confirmation'
        }
      } else if (txn.referenceModel === 'Return') {
        typeLabel = 'Return'
      } else if (txn.referenceModel === 'Purchase') {
        typeLabel = 'Purchase'
      } else if (txn.transactionType === 'payment') {
        typeLabel = `Payment (${txn.paymentMethod === 'cash' ? 'Cash' : txn.paymentMethod === 'bank' ? 'Bank' : 'Unknown'})`
      }

      // Extract payment details
      const paymentDetails = txn.paymentDetails || {}
      const cashPayment = paymentDetails.cashPayment || 0
      const bankPayment = paymentDetails.bankPayment || 0
      const totalPayment = (txn.credit || 0) // Payment is credit

      // Get supplier name from entityId
      let supplierName = '-'
      if (txn.entityId) {
        if (typeof txn.entityId === 'object' && txn.entityId !== null) {
          supplierName = txn.entityId.name || txn.entityId.company || '-'
        }
      } else if (selectedSupplierId && supplierDetails) {
        supplierName = supplierDetails.name || supplierDetails.company || '-'
      }

      // Get product/dispatch details from reference
      let productDetails = '-'
      if (txn.referenceModel === 'DispatchOrder' && txn.referenceId) {
        // For dispatch orders, show order number and product info
        let orderNumber = '-'
        if (typeof txn.referenceId === 'object' && txn.referenceId !== null) {
          orderNumber = txn.referenceId.orderNumber || txn.referenceId._id || '-'
        } else {
          orderNumber = txn.referenceId.toString()
        }
        productDetails = `Dispatch Order: ${orderNumber}`
        // If we have product info in description, extract it
        if (txn.description) {
          const descMatch = txn.description.match(/(?:Dispatch Order|Order)\s+([A-Z0-9]+)/i)
          if (descMatch) {
            productDetails = `DO: ${descMatch[1]}`
          }
        }
      } else if (txn.referenceModel === 'Purchase' && txn.referenceId) {
        // For purchases, show purchase number
        let purchaseNumber = '-'
        if (typeof txn.referenceId === 'object' && txn.referenceId !== null) {
          purchaseNumber = txn.referenceId.purchaseNumber || txn.referenceId._id || '-'
        } else {
          purchaseNumber = txn.referenceId.toString()
        }
        productDetails = `Purchase: ${purchaseNumber}`
      } else if (txn.description) {
        // Try to extract product info from description
        const desc = txn.description
        if (desc.includes('Dispatch Order')) {
          const match = desc.match(/Dispatch Order\s+([A-Z0-9-]+)/i)
          if (match) {
            productDetails = `DO: ${match[1]}`
          } else {
            productDetails = 'Dispatch Order'
          }
        } else if (desc.includes('Purchase')) {
          const match = desc.match(/Purchase\s+([A-Z0-9-]+)/i)
          if (match) {
            productDetails = `Purchase: ${match[1]}`
          } else {
            productDetails = 'Purchase'
          }
        } else {
          productDetails = desc.length > 50 ? desc.substring(0, 50) + '...' : desc
        }
      }

      return {
        id: txn._id || txn.id,
        date: txn.date || txn.transactionDate || txn.createdAt,
        type: typeLabel,
        transactionType: txn.transactionType || txn.type,
        description: txn.description || txn.notes || '-',
        supplierName: supplierName,
        productDetails: productDetails,
        paid: totalPayment, // Payment amount (credit)
        cashPayment: cashPayment,
        bankPayment: bankPayment,
        balance: txn.balance || txn.runningBalance || 0,
        reference: txn.reference || txn.referenceNumber || txn.referenceId || '-',
        referenceModel: txn.referenceModel || '-',
        paymentMethod: txn.paymentMethod || null,
        paymentDetails: paymentDetails,
        source: txn.source || 'unknown',
        raw: txn
      }
    })
  }, [supplierDetails, ledgerData, allPaymentLedgerData, dateFrom, dateTo, transactionTypeFilter, paymentMethodFilter, selectedSupplierId])

  // Payment History Columns for Tab 3
  const paymentHistoryColumns = useMemo(() => {
    const columns = [
      {
        header: "Date",
        accessor: "date",
        render: (row) => formatDateTime(row)
      }
    ]

    columns.push(
      {
        header: "Entry Number",
        accessor: "entryNumber",
        render: (row) => (
          <span className="font-medium">{row.entryNumber || '-'}</span>
        )
      },
      {
        header: "Order Reference",
        accessor: "reference",
        render: (row) => (
          row.raw?.referenceId ? (
            <Link
              href={`/dispatch-orders/${typeof row.raw.referenceId === 'object' ? row.raw.referenceId._id : row.raw.referenceId}`}
              className="font-medium text-blue-600 hover:underline"
            >
              {row.reference || '-'}
            </Link>
          ) : (
            <span className="font-medium">{row.reference || '-'}</span>
          )
        )
      },
      {
        header: "Method",
        accessor: "paymentMethod",
        render: (row) => (
          <Badge variant="outline" className={row.paymentMethod === 'cash' ? 'border-green-500 text-green-700' : 'border-blue-500 text-blue-700'}>
            {row.paymentMethod === 'cash' ? 'Cash' : 'Bank'}
          </Badge>
        )
      },
      {
        header: "Amount",
        accessor: "amount",
        render: (row) => (
          <span className="tabular-nums font-semibold text-green-600">
            {formatNumber(row.amount || 0)}
          </span>
        )
      },
      {
        header: "Made By",
        accessor: "madeBy",
        render: (row) => (
          <span className="text-sm text-muted-foreground">{row.madeBy || '-'}</span>
        )
      },
      {
        header: "Notes",
        accessor: "notes",
        render: (row) => (
          <span className="text-sm">{row.notes && row.notes.length > 50 ? row.notes.substring(0, 50) + '...' : row.notes || '-'}</span>
        )
      }
    )

    return columns
  }, [])

  // Pending Balance Columns
  const pendingBalanceColumns = useMemo(() => {
    const columns = [
      {
        header: "Date",
        accessor: "date",
        render: (row) => formatDateTime(row)
      }
    ]

    columns.push(
      {
        header: "Entry Number",
        accessor: "entryNumber",
        render: (row) => (
          <span className="font-medium">{row.entryNumber || '-'}</span>
        )
      },
      {
        header: "Reference",
        accessor: "reference",
        render: (row) => (
          row.id ? (
            <Link
              href={`/dispatch-orders/${row.id}`}
              className="font-medium text-blue-600 hover:underline cursor-pointer"
            >
              {row.reference || '-'}
            </Link>
          ) : (
            <span className="font-medium">{row.reference || '-'}</span>
          )
        )
      },
      {
        header: "Total Amount",
        accessor: "totalAmount",
        render: (row) => (
          <span className="font-semibold">{formatNumber(row.totalAmount || row.amount || 0)}</span>
        )
      },
      {
        header: "Paid Amount",
        accessor: "totalPaid",
        render: (row) => (
          <span className="tabular-nums text-green-600 font-medium">
            {formatNumber(row.totalPaid || 0)}
          </span>
        )
      },
      {
        header: "Remaining",
        accessor: "amount",
        render: (row) => (
          <span className={`tabular-nums font-semibold ${(row.amount || 0) > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
            {formatNumber(row.amount || 0)}
          </span>
        )
      },
      {
        header: "Payment Type",
        accessor: "paymentType",
        render: (row) => (
          <Badge variant="outline" className={row.paymentType === 'cash' ? 'border-green-500 text-green-700' : 'border-blue-500 text-blue-700'}>
            {row.paymentType === 'cash' ? 'Cash' : 'Bank'}
          </Badge>
        )
      },
      {
        header: "Status",
        accessor: "status",
        render: (row) => {
          const statusConfig = {
            paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
            partial: { label: 'Partial', className: 'bg-orange-100 text-orange-800' },
            pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' }
          }
          const config = statusConfig[row.status] || statusConfig.pending
          return (
            <Badge className={config.className}>
              {config.label}
            </Badge>
          )
        }
      },
      {
        header: "Action",
        accessor: "action",
        render: (row) => (
          row.status !== 'paid' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMarkAsPaid(row)}
              className="h-8"
              disabled={isMarkingAsPaid}
            >
              {isMarkingAsPaid ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Make Payment'
              )}
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )
        )
      }
    )

    return columns
  }, [isMarkingAsPaid])

  const transactionColumns = useMemo(
    () => [
      {
        header: "Date",
        accessor: "date",
        render: (row) => formatDateTime(row)
      },
      {
        header: "Supplier Name",
        accessor: "supplierName",
        render: (row) => <span className="font-medium">{row.supplierName || '-'}</span>
      },
      {
        header: "Product/Order Details",
        accessor: "productDetails",
        render: (row) => (
          <span className="text-sm text-muted-foreground">{row.productDetails || '-'}</span>
        )
      },
      {
        header: "Description",
        accessor: "description",
        render: (row) => <span className="text-sm">{row.description || '-'}</span>
      },
      {
        header: "Paid",
        accessor: "paid",
        render: (row) => row.paid > 0 ? (
          <span className="tabular-nums text-green-600 font-medium">{formatNumber(row.paid)}</span>
        ) : (
          <span className="tabular-nums text-muted-foreground">-</span>
        )
      },
      {
        header: "Cash Payment",
        accessor: "cashPayment",
        render: (row) => row.cashPayment > 0 ? (
          <span className="tabular-nums text-blue-600 font-medium">{formatNumber(row.cashPayment)}</span>
        ) : (
          <span className="tabular-nums text-muted-foreground">-</span>
        )
      },
      {
        header: "Bank Payment",
        accessor: "bankPayment",
        render: (row) => row.bankPayment > 0 ? (
          <span className="tabular-nums text-purple-600 font-medium">{formatNumber(row.bankPayment)}</span>
        ) : (
          <span className="tabular-nums text-muted-foreground">-</span>
        )
      },
      {
        header: "Balance",
        accessor: "balance",
        render: (row) => (
          <span className={`tabular-nums font-semibold ${row.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatNumber(Math.abs(row.balance))} {row.balance >= 0 ? 'DR' : 'CR'}
          </span>
        )
      }
    ],
    []
  )

  // Transform all ledger entries for Tab 1 display
  // Show ALL transactions - purchases, payments, AND returns (complete history)
  const allLedgerTransactions = useMemo(() => {
    if (!allLedgerData?.entries) return []

    // Show purchases, payments, and returns (complete ledger history)
    let filteredEntries = allLedgerData.entries.filter(entry =>
      entry.transactionType === 'purchase' ||
      entry.transactionType === 'payment' ||
      entry.transactionType === 'return'
    )

    // Apply Consolidated Filter
    if (ledgerFilterBy !== 'all') {
      filteredEntries = filteredEntries.filter(entry => {
        if (ledgerFilterBy === 'cash') {
          return entry.transactionType === 'payment' && entry.paymentMethod === 'cash'
        }
        if (ledgerFilterBy === 'bank') {
          return entry.transactionType === 'payment' && entry.paymentMethod === 'bank'
        }
        if (ledgerFilterBy === 'return') {
          return entry.transactionType === 'return'
        }
        if (ledgerFilterBy === 'discount') {
          // Check if purchase has discount
          if (entry.transactionType !== 'purchase') return false

          let hasDiscount = false
          if (entry.referenceId && typeof entry.referenceId === 'object') {
            const discount = entry.referenceId.totalDiscount || entry.referenceId.discount || 0
            hasDiscount = discount > 0
          }
          return hasDiscount
        }
        return true
      })
    }

    const mappedItems = filteredEntries.map(entry => {
      const supplier = entry.entityId || {}
      let typeLabel = entry.transactionType || '-'

      // Distinguish between purchases, payments, and returns
      if (entry.transactionType === 'payment') {
        // Payment entry
        if (entry.paymentMethod === 'cash') {
          typeLabel = 'Payment - Cash'
        } else if (entry.paymentMethod === 'bank') {
          typeLabel = 'Payment - Bank'
        } else {
          typeLabel = 'Payment'
        }
      } else if (entry.transactionType === 'return') {
        // Return entry - shows as credit (reduces balance owed)
        typeLabel = 'Return (Credit)'
      } else if (entry.transactionType === 'purchase') {
        // Purchase entry
        if (entry.referenceModel === 'DispatchOrder') {
          typeLabel = 'Purchase (Dispatch Order)'
        } else if (entry.referenceModel === 'Purchase') {
          typeLabel = 'Purchase (Manual)'
        } else {
          typeLabel = 'Purchase'
        }
      } else if (entry.referenceModel === 'Return') {
        typeLabel = 'Return'
      }

      // Get readable reference (order number, purchase number, etc.)
      let readableReference = '-'
      if (entry.referenceId) {
        if (typeof entry.referenceId === 'object' && entry.referenceId !== null) {
          // For returns, handle specially
          if (entry.referenceModel === 'Return' || entry.transactionType === 'return') {
            // Try orderNumber first (from associated dispatch order)
            if (entry.referenceId.orderNumber) {
              readableReference = entry.referenceId.orderNumber
            } else {
              // Try to extract order number from description
              const description = entry.description || entry.notes || ''
              // Pattern: "Return from Dispatch Order DO-1234" or "Order: DO-1234"
              const orderMatch = description.match(/(?:Order|Dispatch Order):?\s*([A-Z0-9-]+)/i) ||
                description.match(/Dispatch Order\s+([A-Z0-9-]+)/i)
              if (orderMatch && orderMatch[1]) {
                readableReference = orderMatch[1]
              } else {
                // Format return ID as RET-{last6chars} for readability
                const returnId = entry.referenceId._id?.toString() || entry.referenceId.toString()
                readableReference = returnId ? `RET-${returnId.slice(-6).toUpperCase()}` : '-'
              }
            }
          } else {
            // For non-returns, use standard logic
            readableReference = entry.referenceId.orderNumber || entry.referenceId.purchaseNumber || entry.referenceId._id || '-'
          }
        } else {
          readableReference = entry.referenceId.toString()
        }
      } else if (entry.reference || entry.referenceNumber) {
        readableReference = entry.reference || entry.referenceNumber
      }

      // Calculate separate payment amounts
      const cashPaid = (entry.transactionType === 'payment' && entry.paymentMethod === 'cash') ? (entry.credit || 0) : 0
      const bankPaid = (entry.transactionType === 'payment' && entry.paymentMethod === 'bank') ? (entry.credit || 0) : 0

      // Calculate return amount
      const returnAmount = (entry.transactionType === 'return') ? (entry.credit || 0) : 0

      // Get discount from reference
      let discountAmount = 0
      if (entry.referenceId && typeof entry.referenceId === 'object') {
        discountAmount = entry.referenceId.totalDiscount || entry.referenceId.discount || 0
      }

      return {
        id: entry._id || entry.id,
        date: entry.date || entry.createdAt,
        createdAt: entry.createdAt,
        supplier: supplier.name || supplier.company || 'Unknown Supplier',
        supplierId: supplier._id || supplier.id,
        type: typeLabel,
        transactionType: entry.transactionType || entry.type,
        description: entry.description || entry.notes || '-',
        debit: Number(entry.debit) || 0,
        credit: Number(entry.credit) || 0,
        cashPaid,
        bankPaid,
        returnAmount,
        discount: discountAmount,
        balance: 0, // Will be calculated below
        reference: readableReference,
        referenceId: (entry.referenceId && typeof entry.referenceId === 'object' && entry.referenceId._id)
          ? entry.referenceId._id.toString()
          : (entry.referenceId ? entry.referenceId.toString() : null),
        referenceModel: entry.referenceModel || '-',
        paymentMethod: entry.paymentMethod || null,
        paymentDetails: entry.paymentDetails || null,
        entryNumber: entry.entryNumber || '-',
        raw: entry
      }
    })

    // Sort by createdAt ASCENDING (oldest first) for running balance calculation
    mappedItems.sort((a, b) => {
      const createdAtA = new Date(a.createdAt || a.date || 0).getTime()
      const createdAtB = new Date(b.createdAt || b.date || 0).getTime()
      return createdAtA - createdAtB
    })

    // Calculate running balance client-side (debit increases, credit decreases)
    let runningBalance = 0
    for (const entry of mappedItems) {
      runningBalance = runningBalance + entry.debit - entry.credit
      entry.balance = runningBalance
    }

    // Reverse to show newest first
    return mappedItems.reverse()
  }, [allLedgerData, ledgerFilterBy])

  // Use client-side calculated running balance (same as table's top row)
  // This ensures the summary card matches the Balance column of the first row in the table
  const calculatedTotalBalance = useMemo(() => {
    // Get the balance from the first entry (newest after sorting/reversing)
    // This represents the current running balance
    if (allLedgerTransactions.length > 0) {
      return allLedgerTransactions[0].balance || 0
    }
    // Fallback to backend totalBalance for empty data case
    return allLedgerData?.totalBalance || 0
  }, [allLedgerTransactions, allLedgerData])

  // This calculates per-supplier running balances for use in the payment modal
  // IMPORTANT: We must calculate each supplier's balance independently, not use the global running balance
  const supplierBalanceMap = useMemo(() => {
    const balanceMap = {}

    // Step 1: Calculate per-supplier balances from raw ledger entries
    // We need the raw entries from allLedgerData, not allLedgerTransactions which has global running balance
    if (allLedgerData?.entries && allLedgerData.entries.length > 0) {
      // Filter to only include purchase, payment, and return entries
      const relevantEntries = allLedgerData.entries.filter(entry =>
        entry.transactionType === 'purchase' ||
        entry.transactionType === 'payment' ||
        entry.transactionType === 'return'
      )

      // Group entries by supplier and calculate individual running balances
      const supplierEntriesMap = {}

      for (const entry of relevantEntries) {
        const supplier = entry.entityId || {}
        const supplierId = supplier._id?.toString() || supplier.id?.toString() || entry.entityId?.toString()

        if (!supplierId) continue

        if (!supplierEntriesMap[supplierId]) {
          supplierEntriesMap[supplierId] = []
        }
        supplierEntriesMap[supplierId].push(entry)
      }

      // Calculate running balance for each supplier
      for (const [supplierId, entries] of Object.entries(supplierEntriesMap)) {
        // Sort by createdAt ascending (oldest first)
        entries.sort((a, b) => {
          const createdAtA = new Date(a.createdAt || a.date || 0).getTime()
          const createdAtB = new Date(b.createdAt || b.date || 0).getTime()
          return createdAtA - createdAtB
        })

        // Calculate running balance (debit increases, credit decreases)
        let runningBalance = 0
        for (const entry of entries) {
          runningBalance = runningBalance + (Number(entry.debit) || 0) - (Number(entry.credit) || 0)
        }

        balanceMap[supplierId] = runningBalance
      }
    }

    // Step 2: Fill in missing suppliers from dropdownSuppliers
    // This ensures ALL suppliers have a balance, even if they have no ledger entries
    if (dropdownSuppliers && dropdownSuppliers.length > 0) {
      for (const supplier of dropdownSuppliers) {
        const supplierId = String(supplier._id || supplier.id)
        // Only add if not already in map (ledger data takes priority)
        if (balanceMap[supplierId] === undefined) {
          // Use the balance from the supplier object (from API)
          balanceMap[supplierId] = supplier.balance || 0
        }
      }
    }

    console.log('📊 Complete Supplier Balance Map:', balanceMap)
    console.log('📊 dropdownSuppliers sample:', dropdownSuppliers?.[0])

    return balanceMap
  }, [allLedgerData, dropdownSuppliers])

  // Calculate total pending from ledger data (accounts for excess payments not tied to orders)
  // Use ledger balance when positive (includes excess payments), fallback to sum of pending rows
  const calculatedTotalPendingFromRemaining = useMemo(() => {
    // If viewing all suppliers, use the total balance from all ledger transactions
    if (selectedSupplierId === 'all') {
      const ledgerBalance = calculatedTotalBalance
      if (ledgerBalance > 0) {
        return ledgerBalance
      }
      // Fallback to sum of pending rows for edge cases
      return pendingBalances.reduce((sum, balance) => sum + (balance.amount || 0), 0)
    }

    // If viewing a specific supplier, use that supplier's balance from ledger data
    const supplierBalance = supplierBalanceMap[String(selectedSupplierId)]
    if (supplierBalance !== undefined && supplierBalance !== null && supplierBalance > 0) {
      return supplierBalance
    }

    // Fallback: try ledgerData.currentBalance
    if (ledgerData?.currentBalance !== undefined && ledgerData.currentBalance !== null && ledgerData.currentBalance > 0) {
      return ledgerData.currentBalance
    }

    // Final fallback: sum of pending rows (which should be 0 or negative if excess payments exist)
    return pendingBalances.reduce((sum, balance) => sum + (balance.amount || 0), 0)
  }, [selectedSupplierId, calculatedTotalBalance, supplierBalanceMap, ledgerData?.currentBalance, pendingBalances])

  // Calculate balance for modal - use the same calculation as calculatedTotalBalance
  const balanceForModal = useMemo(() => {
    if (selectedSupplierId === 'all' || !selectedSupplierId) {
      return 0 // No specific supplier selected
    }

    // Priority 1: Use balance from allLedgerTransactions (same as parent page display)
    const balanceFromMap = supplierBalanceMap[String(selectedSupplierId)]
    if (balanceFromMap !== undefined && balanceFromMap !== null) {
      return Math.abs(balanceFromMap)
    }

    // Priority 2: ledgerData.currentBalance (if available)
    if (ledgerData?.currentBalance !== undefined && ledgerData.currentBalance !== null) {
      return Math.abs(ledgerData.currentBalance)
    }

    // Priority 3: calculated outstanding balance from pending balances
    if (calculatedOutstandingBalance !== undefined) {
      return Math.abs(calculatedOutstandingBalance)
    }

    // Final fallback: supplier balance from dropdownSuppliers
    const supplier = dropdownSuppliers.find(s => String(s.id) === selectedSupplierId)
    return Math.abs(supplier?.balance || 0)
  }, [selectedSupplierId, supplierBalanceMap, ledgerData?.currentBalance, calculatedOutstandingBalance, dropdownSuppliers])

  // Ledger table columns for Tab 1 - Complete History (Purchases + Payments)
  const allLedgerColumns = useMemo(
    () => [
      {
        header: "Entry Number",
        accessor: "entryNumber",
        render: (row) => (
          <span className="font-medium">{row.entryNumber}</span>
        )
      },
      {
        header: "Date",
        accessor: "date",
        render: (row) => formatDateTime(row)
      },
      {
        header: "Supplier",
        accessor: "supplier",
        render: (row) => (
          <span className="font-medium">{row.supplier}</span>
        )
      },
      {
        header: "Type",
        accessor: "type",
        render: (row) => (
          <span>{row.type}</span>
        )
      },
      {
        header: "Reference",
        accessor: "reference",
        render: (row) => (
          row.referenceId ? (
            <Link
              href={`/dispatch-orders/${row.raw.referenceModel === 'Return' ? row.raw.referenceId.dispatchOrderId : row.referenceId}`}
              className="font-medium text-blue-600 hover:underline"
            >
              {row.reference || '-'}
            </Link>
          ) : (
            <span className="font-medium">{row.reference || '-'}</span>
          )
        )
      },
      {
        header: "Debit (Owe)",
        accessor: "debit",
        render: (row) => (
          <span className={`tabular-nums font-semibold ${row.debit > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
            {row.debit > 0 ? formatNumber(row.debit) : '-'}
          </span>
        )
      },
      // Removed "Credit (Paid)" column in favor of split columns
      // {
      //   header: "Credit (Paid)",
      //   accessor: "credit",
      //   render: (row) => (
      //     <span className={`tabular-nums font-semibold ${row.credit > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
      //       {row.credit > 0 ? formatNumber(row.credit) : '-'}
      //     </span>
      //   )
      // },
      {
        header: "Cash Paid",
        accessor: "cashPaid",
        render: (row) => (
          <span className={`tabular-nums font-semibold ${row.cashPaid > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
            {row.cashPaid > 0 ? formatNumber(row.cashPaid) : '-'}
          </span>
        )
      },
      {
        header: "Bank Paid",
        accessor: "bankPaid",
        render: (row) => (
          <span className={`tabular-nums font-semibold ${row.bankPaid > 0 ? 'text-purple-600' : 'text-muted-foreground'}`}>
            {row.bankPaid > 0 ? formatNumber(row.bankPaid) : '-'}
          </span>
        )
      },
      {
        header: "Return",
        accessor: "returnAmount",
        render: (row) => (
          <span className={`tabular-nums font-semibold ${row.returnAmount > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
            {row.returnAmount > 0 ? formatNumber(row.returnAmount) : '-'}
          </span>
        )
      },
      {
        header: "Discount",
        accessor: "discount",
        render: (row) => (
          <span className={`tabular-nums font-semibold ${row.discount > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
            {row.discount > 0 ? formatNumber(row.discount) : '-'}
          </span>
        )
      },
      {
        header: "Balance",
        accessor: "balance",
        render: (row) => <span className="tabular-nums font-bold">{formatNumber(row.balance)}</span>
      }
    ],
    []
  )

  const filteredLedgerTransactions = useMemo(() => {
    if (!ledgerSearch) return allLedgerTransactions

    const lowerSearch = ledgerSearch.toLowerCase()
    return allLedgerTransactions.filter(item =>
      (item.description && item.description.toLowerCase().includes(lowerSearch)) ||
      (item.reference && item.reference.toLowerCase().includes(lowerSearch)) ||
      (item.supplier && item.supplier.toLowerCase().includes(lowerSearch)) ||
      (item.entryNumber && item.entryNumber.toString().toLowerCase().includes(lowerSearch)) ||
      (item.debit && item.debit.toString().includes(lowerSearch)) ||
      (item.credit && item.credit.toString().includes(lowerSearch))
    )
  }, [allLedgerTransactions, ledgerSearch])

  const ledgerTabContent = (
    <div className="space-y-6">
      {/* Filters & Search Bar - Unified */}
      <div className="rounded-lg border border-border bg-card p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
          {/* Filter Label */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-semibold text-foreground">Filters:</span>
          </div>

          {/* Select Supplier */}
          {/* Select Supplier (Combobox) */}
          <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={supplierOpen}
                className="w-full sm:w-[250px] justify-between"
                disabled={allSuppliersLoading}
              >
                {ledgerSupplierFilter
                  ? (() => {
                    const supplier = dropdownSuppliers.find((s) => String(s.id) === ledgerSupplierFilter)
                    return supplier ? `${supplier.name} ${supplier.company ? `(${supplier.company})` : ''}` : "Select supplier..."
                  })()
                  : "Select supplier..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 bg-white dark:bg-zinc-950">
              <Command>
                <CommandInput placeholder="Search supplier name or ID..." />
                <CommandList>
                  <CommandEmpty>No supplier found.</CommandEmpty>
                  <CommandGroup>
                    {dropdownSuppliers.map((supplier) => (
                      <CommandItem
                        key={supplier.id}
                        value={`${supplier.name} ${supplier.company || ''} ${supplier.supplierId || ''} ${supplier.legacyId || ''} ${String(supplier.id).slice(-6)}`}
                        onSelect={() => {
                          const val = String(supplier.id)
                          setLedgerSupplierFilter(val === ledgerSupplierFilter ? "" : val)
                          if (val && val !== 'all') {
                            setSelectedSupplierId(val)
                          } else {
                            setSelectedSupplierId("")
                          }
                          setSupplierOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            ledgerSupplierFilter === String(supplier.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{supplier.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {supplier.supplierId ? (
                              <span className="font-mono bg-muted px-1 rounded">{supplier.supplierId}</span>
                            ) : supplier.legacyId ? (
                              <span className="font-mono bg-muted px-1 rounded">{supplier.legacyId}</span>
                            ) : null}
                            {supplier.company && <span>{supplier.company}</span>}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Filter By */}
          {ledgerSupplierFilter && ledgerSupplierFilter !== 'all' && (
            <Select
              value={ledgerFilterBy}
              onValueChange={setLedgerFilterBy}
            >
              <SelectTrigger className="h-10 w-full sm:w-[180px] border-border">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="discount">Discount</SelectItem>
                <SelectItem value="return">Return</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Search Section */}
          {ledgerSupplierFilter && ledgerSupplierFilter !== 'all' && (
            <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="h-10 w-full sm:w-[200px] pl-9 sm:pl-10 pr-3 rounded-lg border border-input bg-background text-xs sm:text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <Button
                size="sm"
                className="h-10 px-4 sm:px-6 bg-primary hover:bg-primary/90 text-xs sm:text-sm min-w-[80px] sm:min-w-0"
              >
                Search
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-foreground">Complete Ledger History</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Select a supplier to view their complete accounting record</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!ledgerSupplierFilter || ledgerSupplierFilter === 'all' ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                <Building2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Select a supplier to view ledger</p>
              <p className="text-xs text-muted-foreground">Choose a supplier from the dropdown above to see their complete transaction history</p>
            </div>
          ) : allLedgerLoading ? (
            <div className="p-12 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin h-8 w-8 text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Loading ledger entries...</p>
            </div>
          ) : filteredLedgerTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No transactions found</p>
              <p className="text-xs text-muted-foreground">
                {ledgerSearch ? 'Try adjusting your search or filters' : 'No ledger entries found for this supplier'}
              </p>
            </div>
          ) : (
            <>
              {/* Stats Cards - Enhanced */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">
                    Total Entries
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-foreground">
                    {filteredLedgerTransactions.length}
                  </div>
                </div>
                <div className={`rounded-lg border p-5 shadow-sm ${(calculatedTotalBalance || 0) <= 0
                  ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-emerald-50/30'
                  : 'border-red-200 bg-gradient-to-br from-red-50/50 to-red-50/30'
                  }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${(calculatedTotalBalance || 0) <= 0 ? 'bg-emerald-100' : 'bg-red-100'
                      }`}>
                      <DollarSign className={`h-5 w-5 ${(calculatedTotalBalance || 0) <= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`} />
                    </div>
                  </div>
                  <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">
                    Supplier Balance
                  </div>
                  <div className={`text-2xl font-bold tabular-nums ${(calculatedTotalBalance || 0) <= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                    £{formatNumber(Math.abs(calculatedTotalBalance || 0))}
                  </div>
                  <div className={`text-xs mt-1 ${(calculatedTotalBalance || 0) <= 0 ? 'text-emerald-600/80' : 'text-red-600/80'
                    }`}>
                    {(calculatedTotalBalance || 0) > 0 ? 'Amount owed to supplier' : 'Credit with supplier'}
                  </div>
                </div>
              </div>

              {/* Table */}
              <DataTable
                columns={allLedgerColumns}
                data={filteredLedgerTransactions}
                hideActions
                enableSearch={false}
                paginate={true}
                pageSize={50}
                disableSorting={true}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )

  const handleMarkAsPaid = (balance) => {
    setMarkAsPaidForm({
      method: balance.paymentType || 'cash',
      amount: balance.amount.toString()
    })
    setMarkAsPaidDialog({ open: true, balance })
  }

  const handleConfirmMarkAsPaid = async () => {
    const { balance } = markAsPaidDialog
    if (!balance) return

    const amount = parseFloat(markAsPaidForm.amount)
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (amount > balance.amount) {
      // Overpayment creates credit with supplier - show warning but allow
      console.log(`Overpayment: ${formatNumber(amount)} exceeds remaining balance ${formatNumber(balance.amount)}. Credit will be created.`)
    }

    setIsMarkingAsPaid(true)

    try {
      await ledgerAPI.createEntry({
        type: 'supplier',
        entityId: balance.supplierId,
        entityModel: 'Supplier',
        transactionType: 'payment',
        referenceId: balance.id,
        referenceModel: 'DispatchOrder', // Always use DispatchOrder since we unified the models
        debit: 0,
        credit: amount,
        date: new Date(),
        description: `Payment for ${balance.reference} - ${markAsPaidForm.method}`,
        paymentMethod: markAsPaidForm.method,
        paymentDetails: {
          cashPayment: markAsPaidForm.method === 'cash' ? amount : 0,
          bankPayment: markAsPaidForm.method === 'bank' ? amount : 0,
          remainingBalance: 0
        }
      })

      toast.success('Payment recorded successfully')
      setMarkAsPaidDialog({ open: false, balance: null })
      setMarkAsPaidForm({ method: 'cash', amount: '' })

      // Invalidate queries to refresh data - use exact query keys
      await queryClient.invalidateQueries({ queryKey: ['pending-balances', selectedSupplierId] })
      await queryClient.invalidateQueries({ queryKey: ['supplier-ledger', selectedSupplierId] })
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      await queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] })
      await queryClient.invalidateQueries({ queryKey: ['unpaid-dispatch-orders', selectedSupplierId] })

      // Refetch pending balances immediately
      await queryClient.refetchQueries({ queryKey: ['pending-balances', selectedSupplierId] })

    } catch (error) {
      console.error('Error marking as paid:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to record payment')
    } finally {
      setIsMarkingAsPaid(false)
    }
  }

  const handleAddPayment = async () => {
    if (!selectedSupplierId || selectedSupplierId === 'all') {
      toast.error('Please select a supplier first')
      return
    }

    const amount = parseFloat(paymentForm.amount)
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (!paymentForm.method || !['cash', 'bank'].includes(paymentForm.method)) {
      toast.error('Please select a valid payment method (Cash or Bank)')
      return
    }

    // Allow overpayments - they create credit with the supplier
    const remainingBalance = supplierDetails?.balance || 0
    if (remainingBalance > 0 && amount > remainingBalance) {
      console.log(`Overpayment: ${formatNumber(amount)} exceeds remaining balance ${formatNumber(remainingBalance)}. Credit will be created.`)
    }

    // Allow overpayments on dispatch orders - creates credit
    if (selectedDispatchOrderId && selectedDispatchOrderId !== 'none' && selectedDispatchOrder) {
      if (amount > selectedDispatchOrder.remainingBalance) {
        console.log(`Overpayment on dispatch order: ${formatNumber(amount)} exceeds ${formatNumber(selectedDispatchOrder.remainingBalance)}. Credit will be created.`)
      }
    }

    setIsSubmittingPayment(true)

    try {
      // Validate supplier exists (check in allSuppliers since dropdown uses allSuppliers)
      const supplier = dropdownSuppliers.find(s => String(s.id) === selectedSupplierId)
      if (!supplier) {
        throw new Error('Supplier not found')
      }

      // Prepare payment payload
      const paymentPayload = {
        type: 'supplier',
        entityId: selectedSupplierId,
        entityModel: 'Supplier',
        transactionType: 'payment',
        debit: 0,
        credit: amount,
        date: paymentForm.date ? new Date(paymentForm.date) : new Date(),
        description: paymentForm.description || `Payment - ${paymentForm.method}`,
        paymentMethod: paymentForm.method,
        paymentDetails: {
          cashPayment: paymentForm.method === 'cash' ? amount : 0,
          bankPayment: paymentForm.method === 'bank' ? amount : 0,
          remainingBalance: 0
        }
      }

      // If dispatch order is selected, link the payment to it
      if (selectedDispatchOrderId && selectedDispatchOrderId !== 'none' && selectedDispatchOrder) {
        paymentPayload.referenceId = selectedDispatchOrderId
        paymentPayload.referenceModel = 'DispatchOrder'
        paymentPayload.description = paymentForm.description || `Payment for ${selectedDispatchOrder.orderNumber} - ${paymentForm.method}`
      }

      // Create ledger entry for payment
      await ledgerAPI.createEntry(paymentPayload)

      toast.success('Payment recorded successfully')

      // Reset form and close dialog
      setPaymentForm({ amount: '', date: '', description: '', method: 'cash' })
      setSelectedDispatchOrderId('none')
      setIsDialogOpen(false)

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['pending-balances', selectedSupplierId] })
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger', selectedSupplierId] })
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['unpaid-dispatch-orders', selectedSupplierId] })
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] })
      queryClient.invalidateQueries({ queryKey: ['payment-history', paymentHistorySupplier] })

    } catch (error) {
      console.error('Error creating payment:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to record payment')
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  const paymentSelector = (
    <Popover open={pendingPaymentSupplierOpen} onOpenChange={setPendingPaymentSupplierOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={pendingPaymentSupplierOpen}
          className="w-full justify-between bg-background"
          disabled={allSuppliersLoading}
        >
          {selectedSupplierId && selectedSupplierId !== 'all'
            ? (() => {
              const supplier = dropdownSuppliers.find((s) => String(s.id) === selectedSupplierId)
              return supplier
                ? `${supplier.name} ${supplier.supplierId ? `(${supplier.supplierId})` : ''}`
                : "Select supplier..."
            })()
            : "Select supplier..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-white dark:bg-zinc-950">
        <Command>
          <CommandInput placeholder="Search name, company, or ID..." />
          <CommandList>
            <CommandEmpty>No supplier found.</CommandEmpty>
            <CommandGroup>
              {dropdownSuppliers.map((supplier) => (
                <CommandItem
                  key={supplier.id}
                  value={`${supplier.name} ${supplier.company || ''} ${supplier.supplierId || ''} ${supplier.legacyId || ''} ${String(supplier.id).slice(-6)}`}
                  onSelect={() => {
                    const val = String(supplier.id)
                    setSelectedSupplierId(val)
                    setSelectedDispatchOrderId('none')
                    setPendingPaymentSupplierOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedSupplierId === String(supplier.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{supplier.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {supplier.supplierId ? (
                        <span className="font-mono bg-muted px-1 rounded">{supplier.supplierId}</span>
                      ) : supplier.legacyId ? (
                        <span className="font-mono bg-muted px-1 rounded">{supplier.legacyId}</span>
                      ) : null}
                      {supplier.company && <span>{supplier.company}</span>}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )

  const paymentDetails = (
    <>
      {/* Stats Cards - Enhanced */}
      {selectedSupplierId && selectedSupplierId !== 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-emerald-50/30 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">
              Total Paid
            </div>
            <div className="text-2xl font-bold text-emerald-700 tabular-nums">
              £{formatNumber(pendingTotals.totalPaid || 0)}
            </div>
          </div>
          <div className="rounded-lg border border-red-200 bg-gradient-to-br from-red-50/50 to-red-50/30 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">
              Total Pending
            </div>
            <div className="text-2xl font-bold text-red-700 tabular-nums">
              £{formatNumber(Math.abs(calculatedTotalPendingFromRemaining || 0))}
            </div>
          </div>
        </div>
      )}

      {/* Supplier Selector - Enhanced */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Select Supplier:</span>
          </div>
          <div className="flex-1 min-w-[250px]">
            {paymentSelector}
          </div>
        </div>
      </div>

      {/* Pending Balances View - Only shown when supplier is selected */}
      {!selectedSupplierId || selectedSupplierId === 'all' ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No supplier selected</p>
          <p className="text-xs text-muted-foreground">Select a supplier to view their pending payments</p>
        </div>
      ) : pendingBalancesLoading ? (
        <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Loading pending balances...</p>
        </div>
      ) : pendingBalancesError ? (
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-8 text-center">
          <p className="text-sm font-medium text-red-700 mb-1">Error loading pending balances</p>
          <p className="text-xs text-red-600/80">{pendingBalancesError.message}</p>
        </div>
      ) : pendingBalances.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No pending balances</p>
          <p className="text-xs text-muted-foreground">This supplier has no confirmed dispatch orders or purchases with remaining balances</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <DataTable columns={pendingBalanceColumns} data={pendingBalancesWithEntryNumbers} hideActions enableSearch={false} />
        </div>
      )}

      {/* Mark as Paid Dialog */}
      <Dialog open={markAsPaidDialog.open} onOpenChange={(open) => setMarkAsPaidDialog({ open, balance: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
          </DialogHeader>
          {markAsPaidDialog.balance && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm">
                  <span className="font-medium">Reference:</span> {markAsPaidDialog.balance.reference}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Supplier:</span> {markAsPaidDialog.balance.supplierName}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Remaining Balance:</span> {formatNumber(markAsPaidDialog.balance.amount)}
                </p>
              </div>
              <div>
                <Label htmlFor="mark-paid-amount">Payment Amount <span className="text-red-500">*</span></Label>
                <Input
                  id="mark-paid-amount"
                  type="text"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  max={markAsPaidDialog.balance.amount}
                  value={markAsPaidForm.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow only numbers and one decimal point
                    const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                    setMarkAsPaidForm({ ...markAsPaidForm, amount: sanitized });
                  }}
                  placeholder="Enter payment amount"
                  disabled={isMarkingAsPaid}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum: {formatNumber(markAsPaidDialog.balance.amount)}
                </p>
              </div>
              <div>
                <Label htmlFor="mark-paid-method">Payment Method <span className="text-red-500">*</span></Label>
                <Select
                  value={markAsPaidForm.method}
                  onValueChange={(value) => setMarkAsPaidForm({ ...markAsPaidForm, method: value })}
                  disabled={isMarkingAsPaid}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMarkAsPaidDialog({ open: false, balance: null })}
              disabled={isMarkingAsPaid}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmMarkAsPaid}
              disabled={isMarkingAsPaid || !markAsPaidForm.amount || parseFloat(markAsPaidForm.amount) <= 0}
            >
              {isMarkingAsPaid ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                'Mark as Paid'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  const paymentHistoryTabContent = (
    <div className="space-y-6">
      {/* Summary Cards - Premium Design */}
      {paymentHistorySupplier && paymentHistorySupplier !== 'all' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Payments Card - Highlighted */}
          <div className="relative rounded-lg border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 via-emerald-50/60 to-white p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-200/20 blur-2xl group-hover:bg-emerald-200/30 transition-all"></div>
            <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-emerald-100/15 blur-xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-100/90 backdrop-blur-sm flex items-center justify-center ring-2 ring-emerald-200/40 shadow-sm group-hover:ring-emerald-300/60 transition-all">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-emerald-700/80">
                Total Payments
              </div>
              <div className="text-3xl font-bold text-emerald-700 tabular-nums mb-1.5">
                £{formatNumber(paymentSummary.total)}
              </div>
              <div className="text-xs font-medium text-emerald-600/70">All-time payment total</div>
            </div>
          </div>

          {/* Cash Payments Card */}
          <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-background via-card/50 to-background p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
            <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-muted/70 backdrop-blur-sm flex items-center justify-center ring-1 ring-border/60 shadow-sm">
                  <DollarSign className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">
                Cash Payments
              </div>
              <div className="text-3xl font-bold tabular-nums text-foreground mb-1.5">
                £{formatNumber(paymentSummary.cash)}
              </div>
              <div className="text-xs font-medium text-muted-foreground">Cash transactions</div>
            </div>
          </div>

          {/* Bank Payments Card */}
          <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-background via-card/50 to-background p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
            <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-muted/70 backdrop-blur-sm flex items-center justify-center ring-1 ring-border/60 shadow-sm">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">
                Bank Payments
              </div>
              <div className="text-3xl font-bold tabular-nums text-foreground mb-1.5">
                £{formatNumber(paymentSummary.bank)}
              </div>
              <div className="text-xs font-medium text-muted-foreground">Bank transfers</div>
            </div>
          </div>

          {/* Payments This Month Card */}
          <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-background via-card/50 to-background p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
            <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-muted/70 backdrop-blur-sm flex items-center justify-center ring-1 ring-border/60 shadow-sm">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">
                Payments This Month
              </div>
              <div className="text-3xl font-bold tabular-nums text-foreground mb-1.5">
                {paymentSummary.countThisMonth}
              </div>
              <div className="text-xs font-medium text-muted-foreground">Current month</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Card - Unified Design */}
      <div className="rounded-lg border border-border/60 bg-gradient-to-br from-card via-background to-card shadow-sm overflow-hidden">
        {/* Header Section */}
        <div className="relative bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b border-border/50 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 backdrop-blur-sm flex items-center justify-center ring-1 ring-primary/20 shadow-sm">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-xl text-foreground tracking-tight">Payment History</h2>
                <p className="text-sm text-muted-foreground mt-1">Select a supplier to view their payment history</p>
              </div>
            </div>
            {paymentHistorySupplier && paymentHistorySupplier !== 'all' && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 h-10 px-5 shadow-sm hover:shadow-md transition-all bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4" />
                    Add Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Payment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {supplierDetails && supplierDetails.balance > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-900">
                          <span className="font-medium">Remaining Balance:</span> {formatNumber(supplierDetails.balance)}
                        </p>
                      </div>
                    )}
                    {selectedDispatchOrder && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-900">
                          <span className="font-medium">Paying for:</span> {selectedDispatchOrder.orderNumber}
                          <span className="ml-2">(Remaining: {formatNumber(selectedDispatchOrder.remainingBalance)})</span>
                        </p>
                      </div>
                    )}
                    <div>
                      <Label htmlFor="amount">Payment Amount <span className="text-red-500">*</span></Label>
                      <Input
                        id="amount"
                        type="text"
                        inputMode="decimal"
                        step="0.01"
                        min="0.01"
                        max={selectedDispatchOrder ? selectedDispatchOrder.remainingBalance : (supplierDetails?.balance || undefined)}
                        value={paymentForm.amount}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow only numbers and one decimal point
                          const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                          setPaymentForm({ ...paymentForm, amount: sanitized });
                        }}
                        placeholder="Enter payment amount"
                        disabled={isSubmittingPayment}
                      />
                      {supplierDetails && supplierDetails.balance > 0 && !selectedDispatchOrder && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Maximum: {formatNumber(supplierDetails.balance)}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={paymentForm.date}
                        onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                        disabled={isSubmittingPayment}
                      />
                    </div>
                    <div>
                      <Label htmlFor="method">Payment Method <span className="text-red-500">*</span></Label>
                      <Select
                        value={paymentForm.method}
                        onValueChange={(value) => setPaymentForm({ ...paymentForm, method: value })}
                        disabled={isSubmittingPayment}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={paymentForm.description}
                        onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                        placeholder="Enter description (optional)"
                        disabled={isSubmittingPayment}
                      />
                    </div>

                    {/* Dispatch Order Selector */}
                    {unpaidDispatchOrders.length > 0 && (
                      <div>
                        <Label htmlFor="dispatch-order-select">Link to Dispatch Order (Optional)</Label>
                        <Select
                          value={selectedDispatchOrderId}
                          onValueChange={setSelectedDispatchOrderId}
                          disabled={isSubmittingPayment}
                        >
                          <SelectTrigger id="dispatch-order-select">
                            <SelectValue placeholder="Select dispatch order..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None (General Payment)</SelectItem>
                            {unpaidDispatchOrders.map((order) => (
                              <SelectItem key={order._id} value={order._id}>
                                {order.orderNumber} - Remaining: {formatNumber(order.remainingBalance)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmittingPayment}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddPayment} disabled={isSubmittingPayment}>
                      {isSubmittingPayment ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Recording...
                        </>
                      ) : (
                        'Record Payment'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Filters Section */}
        <div className="px-6 py-5 bg-gradient-to-b from-muted/20 via-muted/10 to-transparent border-b border-border/30">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">Filter Options</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col min-w-0">
              <Label htmlFor="payment-history-supplier" className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="whitespace-nowrap">Select Supplier</span>
              </Label>
              <Popover open={paymentHistorySupplierOpen} onOpenChange={setPaymentHistorySupplierOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={paymentHistorySupplierOpen}
                    className="h-[44px] w-full justify-between border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg"
                    disabled={allSuppliersLoading}
                  >
                    {paymentHistorySupplier
                      ? (() => {
                        const supplier = dropdownSuppliers.find((s) => String(s.id) === paymentHistorySupplier)
                        return supplier ? `${supplier.name} ${supplier.company ? `(${supplier.company})` : ''}` : "Select supplier..."
                      })()
                      : "Select supplier..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 bg-white dark:bg-zinc-950">
                  <Command>
                    <CommandInput placeholder="Search supplier..." />
                    <CommandList>
                      <CommandEmpty>No supplier found.</CommandEmpty>
                      <CommandGroup>
                        {dropdownSuppliers.map((supplier) => (
                          <CommandItem
                            key={supplier.id}
                            value={`${supplier.name} ${supplier.company || ''} ${supplier.supplierId || ''} ${supplier.legacyId || ''} ${String(supplier.id).slice(-6)}`}
                            onSelect={() => {
                              const val = String(supplier.id)
                              setPaymentHistorySupplier(val)
                              setSelectedSupplierId(val)
                              setPaymentHistorySupplierOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                paymentHistorySupplier === String(supplier.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{supplier.name}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {supplier.supplierId ? (
                                  <span className="font-mono bg-muted px-1 rounded">{supplier.supplierId}</span>
                                ) : supplier.legacyId ? (
                                  <span className="font-mono bg-muted px-1 rounded">{supplier.legacyId}</span>
                                ) : null}
                                {supplier.company && <span>{supplier.company}</span>}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col min-w-0">
              <Label htmlFor="payment-history-date-from" className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="whitespace-nowrap">Date From</span>
              </Label>
              <Input
                id="payment-history-date-from"
                type="date"
                value={paymentHistoryDateFrom}
                onChange={(e) => setPaymentHistoryDateFrom(e.target.value)}
                className="h-[44px] w-full border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                style={{ paddingRight: '2.5rem' }}
              />
            </div>

            <div className="flex flex-col min-w-0">
              <Label htmlFor="payment-history-date-to" className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="whitespace-nowrap">Date To</span>
              </Label>
              <Input
                id="payment-history-date-to"
                type="date"
                value={paymentHistoryDateTo}
                onChange={(e) => setPaymentHistoryDateTo(e.target.value)}
                className="h-[44px] w-full border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                style={{ paddingRight: '2.5rem' }}
              />
            </div>

            <div className="flex flex-col min-w-0">
              <Label htmlFor="payment-history-method" className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
                <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="whitespace-nowrap">Payment Method</span>
              </Label>
              <Select
                value={paymentHistoryMethodFilter}
                onValueChange={setPaymentHistoryMethodFilter}
              >
                <SelectTrigger id="payment-history-method" className="h-[44px] w-full border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Payment History Table */}
        <div className="px-6 py-6 bg-background">
          {!paymentHistorySupplier || paymentHistorySupplier === 'all' ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
                <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 backdrop-blur-sm ring-2 ring-border/60 shadow-lg">
                  <Users className="w-12 h-12 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2.5">No supplier selected</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
                Select a supplier from the dropdown above to view their complete payment history and transaction records
              </p>
            </div>
          ) : paymentHistoryLoading ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background backdrop-blur-sm ring-2 ring-primary/20 shadow-lg">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2.5">Loading payment history</h3>
              <p className="text-sm text-muted-foreground">Please wait while we fetch the records...</p>
            </div>
          ) : paymentHistoryTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-muted/30 rounded-full blur-3xl"></div>
                <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 backdrop-blur-sm ring-2 ring-border/60 shadow-lg">
                  <FileText className="w-12 h-12 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2.5">No payment history found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-5 leading-relaxed">
                {paymentHistoryDateFrom || paymentHistoryDateTo || paymentHistoryMethodFilter !== 'all'
                  ? 'Try adjusting your filters to see more results'
                  : 'No payment records found for this supplier'}
              </p>
              {(paymentHistoryDateFrom || paymentHistoryDateTo || paymentHistoryMethodFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 h-10 px-5 shadow-sm hover:shadow-md transition-all rounded-lg"
                  onClick={() => {
                    setPaymentHistoryDateFrom('')
                    setPaymentHistoryDateTo('')
                    setPaymentHistoryMethodFilter('all')
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              columns={paymentHistoryColumns}
              data={paymentHistoryTransactions}
              hideActions
              enableSearch={false}
              paginate={true}
              pageSize={50}
            />
          )}
        </div>
      </div>
    </div>
  )

  const tabs = [
    {
      label: "Supplier Ledger",
      content: ledgerTabContent,
    },
    {
      label: "Pending Payments",
      content: paymentDetails,
    },
    {
      label: "Payment History",
      content: paymentHistoryTabContent,
    },
  ]

  // Search state for Supplier Ledger tab
  // const [ledgerSearch, setLedgerSearch] = useState("")

  // Filter ledger transactions by search
  // const filteredLedgerTransactions = useMemo(() => {
  //   if (!ledgerSearch) return allLedgerTransactions
  //   const searchLower = ledgerSearch.toLowerCase()
  //   return allLedgerTransactions.filter(entry =>
  //     entry.supplier?.toLowerCase().includes(searchLower) ||
  //     entry.reference?.toLowerCase().includes(searchLower) ||
  //     entry.type?.toLowerCase().includes(searchLower)
  //   )
  // }, [allLedgerTransactions, ledgerSearch])

  return (
    <div className="space-y-6">
      {/* Header - Enhanced */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Supplier Ledger</h1>
            <p className="text-sm text-muted-foreground">Manage supplier accounts, payments, and balances</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {suppliersLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading suppliers...
            </div>
          )}
          <Button
            onClick={() => setUniversalPaymentOpen(true)}
            className="bg-primary hover:bg-primary/90 h-11 px-6 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </Button>
        </div>
      </header>

      <Tabs
        tabs={tabs}
        className="space-y-4"
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <SupplierPaymentModal
        open={universalPaymentOpen}
        onClose={() => setUniversalPaymentOpen(false)}
        entityId={selectedSupplierId !== 'all' ? selectedSupplierId : ''}
        allLedgerData={allLedgerData}
        entityName={
          selectedSupplierId !== 'all'
            ? (dropdownSuppliers.find(s => String(s.id) === selectedSupplierId)?.name ||
              dropdownSuppliers.find(s => String(s.id) === selectedSupplierId)?.company ||
              'Supplier')
            : ''
        }
        totalBalance={
          selectedSupplierId !== 'all'
            ? Math.abs(dropdownSuppliers.find(s => String(s.id) === selectedSupplierId)?.balance || 0)
            : 0
        }
        ledgerBalance={balanceForModal}
        ledgerBalanceSupplierId={selectedSupplierId !== 'all' ? selectedSupplierId : null}
        supplierBalanceMap={supplierBalanceMap}
        entities={dropdownSuppliers}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['pending-balances'] })
          queryClient.invalidateQueries({ queryKey: ['ledger', 'supplier'] })
        }}
      />
    </div>
  )
}
