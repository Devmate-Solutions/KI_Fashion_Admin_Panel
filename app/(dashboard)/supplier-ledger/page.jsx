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
import { Loader2, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import SupplierPaymentModal from "@/components/modals/SupplierPaymentModal"

function formatNumber(n) {
  const num = Number(n || 0)
  return num.toFixed(2)
}

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function SupplierLedgerPage() {
  const [selectedSupplierId, setSelectedSupplierId] = useState("all") // Default to "all" for Tab 2
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
  const [ledgerSupplierFilter, setLedgerSupplierFilter] = useState("all")
  const [ledgerFilterBy, setLedgerFilterBy] = useState("all")

  // Filters for Tab 2 (Pending Payments)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all")

  // Filters for Tab 3 (Payment History)
  const [paymentHistorySupplier, setPaymentHistorySupplier] = useState("all")
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

  // Fetch all supplier ledger entries for Tab 1 (with optional supplier filter)
  const ledgerFilterParams = useMemo(() => {
    const params = { limit: 100 }
    if (ledgerSupplierFilter && ledgerSupplierFilter !== 'all') {
      params.supplierId = ledgerSupplierFilter
    }
    return params
  }, [ledgerSupplierFilter])

  const { data: allLedgerData, isLoading: allLedgerLoading } = useAllSupplierLedgers(ledgerFilterParams)

  // Fetch selected supplier details and transactions for Tab 2
  const { data: supplierDetails, isLoading: supplierDetailsLoading } = useSupplier(
    selectedSupplierId && selectedSupplierId !== 'all' ? selectedSupplierId : ''
  )

  // Fetch ledger entries for the selected supplier in Tab 2, or all suppliers if "all" is selected
  const paymentLedgerParams = useMemo(() => {
    if (selectedSupplierId === 'all' || !selectedSupplierId) {
      return { limit: 100 } // Fetch payment entries (reduced from 1000 for better performance)
    }
    return { supplierId: selectedSupplierId }
  }, [selectedSupplierId])

  const { data: ledgerData, isLoading: ledgerLoading } = useSupplierLedger(
    selectedSupplierId && selectedSupplierId !== 'all' ? selectedSupplierId : ''
  )

  // Fetch all payment entries when "all" is selected
  const shouldFetchAllPayments = selectedSupplierId === 'all'
  const { data: allPaymentLedgerData, isLoading: allPaymentLedgerLoading } = useAllSupplierLedgers(
    shouldFetchAllPayments ? paymentLedgerParams : {}
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

  // Fetch pending balances
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
    enabled: activeTab === 1 // Only fetch when Tab 2 is active
  })

  const pendingBalances = pendingBalancesData?.balances || []
  const pendingTotals = pendingBalancesData?.totals || { cashPending: 0, bankPending: 0, totalPending: 0, totalPaid: 0 }

  // Fetch payment history for Tab 3
  const paymentHistoryParams = useMemo(() => {
    const params = { limit: 100 }
    if (paymentHistorySupplier && paymentHistorySupplier !== 'all') {
      params.supplierId = paymentHistorySupplier
    }
    return params
  }, [paymentHistorySupplier])

  const { data: paymentHistoryData, isLoading: paymentHistoryLoading } = useAllSupplierLedgers(paymentHistoryParams)

  // Calculate totals from displayed rows (matching Total Balances logic)
  const calculatedCashPending = pendingBalances.reduce((sum, balance) => {
    return sum + (balance.cashPending || 0)
  }, 0)

  const calculatedBankPending = pendingBalances.reduce((sum, balance) => {
    return sum + (balance.bankPending || 0)
  }, 0)

  const calculatedTotalPending = calculatedCashPending + calculatedBankPending

  // Calculate total pending from the actual remaining amounts in pendingBalances
  // This matches what's shown in the "Remaining" column of the table
  const calculatedTotalPendingFromRemaining = useMemo(() => {
    return pendingBalances.reduce((sum, balance) => {
      return sum + (balance.amount || 0)
    }, 0)
  }, [pendingBalances])

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
        render: (row) => row.date ? new Date(row.date).toLocaleDateString('en-GB') : "-"
      }
    ]

    // Add Supplier column only when viewing all suppliers
    if (paymentHistorySupplier === 'all') {
      columns.push({
        header: "Supplier",
        accessor: "supplierName",
        render: (row) => <span className="font-medium">{row.supplierName || '-'}</span>
      })
    }

    columns.push(
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
  }, [paymentHistorySupplier])

  // Pending Balance Columns
  const pendingBalanceColumns = useMemo(() => {
    const columns = [
      {
        header: "Date",
        accessor: "date",
        render: (row) => row.date ? new Date(row.date).toLocaleDateString('en-GB') : "-"
      }
    ]

    // Add Supplier column only when viewing all suppliers
    if (selectedSupplierId === 'all') {
      columns.push({
        header: "Supplier",
        accessor: "supplierName",
        render: (row) => <span className="font-medium">{row.supplierName || '-'}</span>
      })
    }

    columns.push(
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
  }, [selectedSupplierId, isMarkingAsPaid])

  const transactionColumns = useMemo(
    () => [
      {
        header: "Date",
        accessor: "date",
        render: (row) => row.date ? new Date(row.date).toLocaleDateString('en-GB') : "-"
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
          readableReference = entry.referenceId.orderNumber || entry.referenceId.purchaseNumber || entry.referenceId._id || '-'
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

  // Create a map of supplier balances from allLedgerTransactions (same source as calculatedTotalBalance)
  // This ensures the modal uses the exact same balance calculation as the parent page
  const supplierBalanceMap = useMemo(() => {
    const balanceMap = {}

    if (!allLedgerTransactions || allLedgerTransactions.length === 0) {
      return balanceMap
    }

    // Sort by date descending to get latest entries first
    const sortedEntries = [...allLedgerTransactions].sort((a, b) => {
      const dateA = new Date(a.date || a.raw?.date || 0)
      const dateB = new Date(b.date || b.raw?.date || 0)
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime()
      }
      // If dates are equal, sort by createdAt
      const createdAtA = new Date(a.raw?.createdAt || 0)
      const createdAtB = new Date(b.raw?.createdAt || 0)
      return createdAtB.getTime() - createdAtA.getTime()
    })

    // Get the latest balance for each supplier
    for (const entry of sortedEntries) {
      const supplierId = entry.supplierId?.toString() || entry.raw?.entityId?.toString() || entry.raw?.entityId?._id?.toString()
      if (supplierId && balanceMap[supplierId] === undefined) {
        balanceMap[supplierId] = entry.balance || 0
      }
    }

    return balanceMap
  }, [allLedgerTransactions])

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
        header: "Date",
        accessor: "date",
        render: (row) => row.date ? new Date(row.date).toLocaleDateString('en-GB') : "-"
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
              href={`/dispatch-orders/${row.referenceId}`}
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

  const ledgerTabContent = (
    <div className="space-y-6">
      {/* {JSON.stringify(allLedgerTransactions)} */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-semibold text-lg">Complete Ledger History</h2>
            <p className="text-sm text-muted-foreground mt-1">All purchases and payments - complete accounting record</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-[250px]">
              <Label htmlFor="ledger-supplier-filter" className="mb-2 block">Filter by Supplier</Label>
              <Select
                value={ledgerSupplierFilter}
                onValueChange={(value) => {
                  setLedgerSupplierFilter(value)
                  // If a specific supplier is selected, also update Tab 2 selection
                  if (value !== 'all') {
                    setSelectedSupplierId(value)
                  }
                }}
                disabled={allSuppliersLoading}
              >
                <SelectTrigger id="ledger-supplier-filter">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {dropdownSuppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                      {supplier.name} {supplier.company ? `(${supplier.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[200px]">
              <Label htmlFor="ledger-filter-by" className="mb-2 block">Filter By</Label>
              <Select
                value={ledgerFilterBy}
                onValueChange={setLedgerFilterBy}
              >
                <SelectTrigger id="ledger-filter-by">
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
            </div>
          </div>
        </div>

        {allLedgerLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading ledger entries...</span>
          </div>
        ) : allLedgerTransactions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p>No ledger entries found</p>
            {ledgerSupplierFilter !== 'all' && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setLedgerSupplierFilter('all')}
              >
                Show All Suppliers
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-muted/30 rounded-lg p-6 space-y-1">
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold">{allLedgerTransactions.length}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-6 space-y-1">
                <p className="text-sm text-muted-foreground">
                  {ledgerSupplierFilter === 'all' ? 'Total Balance (All Suppliers)' : 'Supplier Balance'}
                </p>
                <p className={`text-2xl font-bold ${(calculatedTotalBalance || 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatNumber(Math.abs(calculatedTotalBalance || 0))}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border">
              <DataTable
                columns={allLedgerColumns}
                data={allLedgerTransactions}
                hideActions
                enableSearch={true}
                paginate={true}
                pageSize={50}
                disableSorting={true}
              />
            </div>
          </>
        )}
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
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="supplier-select">Select Supplier</Label>
          <Select
            value={selectedSupplierId}
            onValueChange={(value) => {
              setSelectedSupplierId(value)
              setSelectedDispatchOrderId('none')
            }}
            disabled={allSuppliersLoading}
          >
            <SelectTrigger id="supplier-select">
              <SelectValue placeholder="Choose a supplier..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {allSuppliersLoading ? (
                <SelectItem value="loading" disabled>Loading suppliers...</SelectItem>
              ) : dropdownSuppliers.length === 0 ? (
                <SelectItem value="none" disabled>No suppliers found</SelectItem>
              ) : (
                dropdownSuppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={String(supplier.id)}>
                    {supplier.name} {supplier.company ? `(${supplier.company})` : ''}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        {/* {supplierDetails && selectedSupplierId !== 'all' && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Remaining Balance</p>
            <p className={`text-2xl font-bold ${supplierDetails.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatNumber(Math.abs(supplierDetails.balance || 0))} {supplierDetails.balance >= 0 ? 'DR' : 'CR'}
            </p>
          </div>
        )} */}
        {/* {selectedSupplierId === 'all' && allPaymentLedgerData && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Balance (All Suppliers)</p>
            <p className={`text-2xl font-bold ${(allPaymentLedgerData.totalBalance || 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {currency(Math.abs(allPaymentLedgerData.totalBalance || 0))} {(allPaymentLedgerData.totalBalance || 0) >= 0 ? 'DR' : 'CR'}
            </p>
          </div>
        )} */}
      </div>


    </div>
  )

  const paymentDetails = (
    <>
      {/* {JSON.stringify(pendingBalances)} */}
      {/* Stats Cards - Total Paid and Total Pending */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Paid</h3>
          <div className="text-2xl font-bold text-green-600">
            {formatNumber(pendingTotals.totalPaid || 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Pending</h3>
          <div className="text-2xl font-bold text-red-600">
            {formatNumber(Math.abs(calculatedTotalPendingFromRemaining || 0))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Pending Payments - Action Center</h2>
          <p className="text-sm text-muted-foreground mt-1">Orders that need payment</p>
        </div>

        <div className="p-4 space-y-4">
          {paymentSelector}
        </div>
      </div>

      {/* Pending Balances View - Always shown */}
      {pendingBalancesLoading ? (
        <div className="bg-white rounded-lg border p-8 flex items-center justify-center mt-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading pending balances...</span>
        </div>
      ) : pendingBalancesError ? (
        <div className="bg-white rounded-lg border p-8 text-center text-red-600 mt-4">
          <p>Error loading pending balances: {pendingBalancesError.message}</p>
          <p className="text-xs text-muted-foreground mt-2">Check console for details</p>
        </div>
      ) : pendingBalances.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-muted-foreground mt-4">
          <p>No pending balances found.</p>
          <p className="text-xs mt-2">Make sure you have confirmed dispatch orders or purchases with remaining balances.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border mt-4">
          <DataTable columns={pendingBalanceColumns} data={pendingBalances} hideActions />
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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Payments</h3>
          <div className="text-2xl font-bold text-green-600">
            {formatNumber(paymentSummary.total)}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Cash Payments</h3>
          <div className="text-2xl font-bold">
            {formatNumber(paymentSummary.cash)}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Bank Payments</h3>
          <div className="text-2xl font-bold">
            {formatNumber(paymentSummary.bank)}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Payments This Month</h3>
          <div className="text-2xl font-bold">
            {paymentSummary.countThisMonth}
          </div>
        </div>
      </div>

      {/* Filters and Add Payment Button */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-semibold text-lg">Payment History</h2>
            <p className="text-sm text-muted-foreground mt-1">All payments made to suppliers</p>
          </div>
          {paymentHistorySupplier && paymentHistorySupplier !== 'all' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
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

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="payment-history-supplier">Supplier</Label>
            <Select
              value={paymentHistorySupplier}
              onValueChange={(value) => {
                setPaymentHistorySupplier(value)
                // Update selectedSupplierId for the Add Payment dialog
                setSelectedSupplierId(value)
              }}
              disabled={allSuppliersLoading}
            >
              <SelectTrigger id="payment-history-supplier">
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {dropdownSuppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={String(supplier.id)}>
                    {supplier.name} {supplier.company ? `(${supplier.company})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="payment-history-date-from">Date From</Label>
            <Input
              id="payment-history-date-from"
              type="date"
              value={paymentHistoryDateFrom}
              onChange={(e) => setPaymentHistoryDateFrom(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="payment-history-date-to">Date To</Label>
            <Input
              id="payment-history-date-to"
              type="date"
              value={paymentHistoryDateTo}
              onChange={(e) => setPaymentHistoryDateTo(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="payment-history-method">Payment Method</Label>
            <Select
              value={paymentHistoryMethodFilter}
              onValueChange={setPaymentHistoryMethodFilter}
            >
              <SelectTrigger id="payment-history-method">
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

        {/* Payment History Table */}
        {paymentHistoryLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading payment history...</span>
          </div>
        ) : paymentHistoryTransactions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p>No payment history found</p>
            {(paymentHistorySupplier !== 'all' || paymentHistoryDateFrom || paymentHistoryDateTo || paymentHistoryMethodFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setPaymentHistorySupplier('all')
                  setPaymentHistoryDateFrom('')
                  setPaymentHistoryDateTo('')
                  setPaymentHistoryMethodFilter('all')
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border">
            <DataTable
              columns={paymentHistoryColumns}
              data={paymentHistoryTransactions}
              hideActions
              enableSearch={true}
              paginate={true}
              pageSize={50}
            />
          </div>
        )}
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Supplier Ledger</h1>
        <div className="flex items-center gap-3">
          {suppliersLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading suppliers...
            </div>
          )}
          <Button
            onClick={() => setUniversalPaymentOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </Button>
        </div>
      </div>

      <Tabs
        tabs={tabs}
        className="space-y-4"
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Supplier Payment Modal */}
      <SupplierPaymentModal
        open={universalPaymentOpen}
        onClose={() => setUniversalPaymentOpen(false)}
        entityId={selectedSupplierId !== 'all' ? selectedSupplierId : ''}
        entityName={
          selectedSupplierId !== 'all'
            ? (dropdownSuppliers.find(s => String(s.id) === selectedSupplierId)?.name || 'Supplier')
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
