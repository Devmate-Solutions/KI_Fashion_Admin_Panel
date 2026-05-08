"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import BackButton from "@/components/BackButton"
import Tabs from "@/components/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import DataTable from "../../../components/data-table"
import { useLogisticsLedger, useAllLogisticsLedgers } from "@/lib/hooks/useLedger"
import { ledgerAPI } from "@/lib/api/endpoints/ledger"
import { balancesAPI } from "@/lib/api/endpoints/balances"
import { logisticsCompaniesAPI } from "@/lib/api/endpoints/logisticsCompanies"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus, FileText, Truck, Building2, Clock, Users, Filter, Calendar, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import toast from "react-hot-toast"
import LogisticsPaymentModal from "@/components/modals/LogisticsPaymentModal"

function formatNumber(n) {
  const num = Number(n || 0)
  return num.toFixed(2)
}

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function LogisticsLedgerPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState("") // Default to empty - require company selection
  const [activeTab, setActiveTab] = useState(0)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [markAsPaidDialog, setMarkAsPaidDialog] = useState({ open: false, balance: null })
  const [markAsPaidForm, setMarkAsPaidForm] = useState({ method: 'cash', amount: '' })
  const [isMarkingAsPaid, setIsMarkingAsPaid] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: '',
    description: '',
    method: 'cash'
  })

  // Universal payment modal state
  const [universalPaymentOpen, setUniversalPaymentOpen] = useState(false)

  // Filters for Tab 1 - Ledger
  const [ledgerCompanyFilter, setLedgerCompanyFilter] = useState("") // Default to empty - require company selection
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("all")

  // Filters for Tab 3 (Payment History)
  const [paymentHistoryCompany, setPaymentHistoryCompany] = useState("") // Default to empty - require company selection
  const [paymentHistoryDateFrom, setPaymentHistoryDateFrom] = useState("")
  const [paymentHistoryDateTo, setPaymentHistoryDateTo] = useState("")
  const [paymentHistoryMethodFilter, setPaymentHistoryMethodFilter] = useState("all")

  const queryClient = useQueryClient()

  // Fetch ALL logistics companies for dropdowns
  const { data: allCompanies = [], isLoading: allCompaniesLoading } = useQuery({
    queryKey: ['logisticsCompanies', 'all'],
    queryFn: async () => {
      const response = await logisticsCompaniesAPI.getAll({ limit: 100 })
      let companiesList = []
      if (response?.data?.data) {
        companiesList = Array.isArray(response.data.data) ? response.data.data : []
      } else if (response?.data?.rows) {
        companiesList = Array.isArray(response.data.rows) ? response.data.rows : []
      } else if (Array.isArray(response?.data)) {
        companiesList = response.data
      }
      return companiesList
    },
  })

  // Fetch logistics ledger entries for Tab 1 (only when a company is selected)
  const ledgerFilterParams = useMemo(() => {
    if (!ledgerCompanyFilter || ledgerCompanyFilter === 'all') {
      return null // Don't fetch if no company selected
    }
    return { logisticsCompanyId: ledgerCompanyFilter, limit: 100 }
  }, [ledgerCompanyFilter])

  const { data: allLedgerData, isLoading: allLedgerLoading, error: allLedgerError } = useAllLogisticsLedgers(ledgerFilterParams || {})

  // Fetch ledger entries for selected company in Tab 2
  const { data: ledgerData, isLoading: ledgerLoading } = useLogisticsLedger(
    selectedCompanyId && selectedCompanyId !== 'all' ? selectedCompanyId : ''
  )

  // Fetch pending balances (only when a specific company is selected)
  const { data: pendingBalancesData, isLoading: pendingBalancesLoading, error: pendingBalancesError } = useQuery({
    queryKey: ['pending-balances-logistics', selectedCompanyId],
    queryFn: async () => {
      try {
        // Debug logging
        console.log('Fetching pending balances for company:', selectedCompanyId)
        const response = await balancesAPI.getLogisticsPendingBalances(selectedCompanyId)
        console.log('Pending balances response:', response)
        const result = response?.data?.data || response?.data || { balances: [], totals: { cashPending: 0, bankPending: 0, totalPending: 0 } }
        console.log('Pending balances result:', result)
        return result
      } catch (error) {
        console.error('Error fetching logistics pending balances:', error)
        throw error
      }
    },
    enabled: activeTab === 1 && !!selectedCompanyId && selectedCompanyId !== 'all' // Only fetch when Tab 2 is active AND company selected
  })

  const pendingBalances = pendingBalancesData?.balances || []
  const pendingTotals = pendingBalancesData?.totals || { cashPending: 0, bankPending: 0, totalPending: 0, totalPaid: 0 }

  // Fetch payment history for Tab 3 (only when a company is selected)
  const paymentHistoryParams = useMemo(() => {
    if (!paymentHistoryCompany || paymentHistoryCompany === 'all') {
      return null // Don't fetch if no company selected
    }
    return { logisticsCompanyId: paymentHistoryCompany, limit: 100 }
  }, [paymentHistoryCompany])

  const { data: paymentHistoryData, isLoading: paymentHistoryLoading } = useAllLogisticsLedgers(paymentHistoryParams || {})

  // Transform all ledger entries for Tab 1 display with client-side running balance
  const allLedgerTransactions = useMemo(() => {
    // Debug logging
    if (ledgerCompanyFilter === 'all') {
      console.log('All companies selected - allLedgerData:', allLedgerData)
      console.log('Entries:', allLedgerData?.entries)
    }

    if (!allLedgerData?.entries) {
      console.log('No entries found in allLedgerData:', allLedgerData)
      return []
    }

    let filteredEntries = allLedgerData.entries.filter(entry =>
      entry.transactionType === 'charge' ||
      entry.transactionType === 'payment' ||
      entry.transactionType === 'adjustment'
    )

    // Apply type filter
    if (ledgerTypeFilter !== 'all') {
      if (ledgerTypeFilter === 'charge') {
        filteredEntries = filteredEntries.filter(e => e.transactionType === 'charge')
      } else if (ledgerTypeFilter === 'cash') {
        filteredEntries = filteredEntries.filter(e => e.transactionType === 'payment' && e.paymentMethod === 'cash')
      } else if (ledgerTypeFilter === 'bank') {
        filteredEntries = filteredEntries.filter(e => e.transactionType === 'payment' && e.paymentMethod === 'bank')
      } else if (ledgerTypeFilter === 'adjustment') {
        filteredEntries = filteredEntries.filter(e => e.transactionType === 'adjustment')
      }
    }

    // Transform entries first
    const transformedEntries = filteredEntries.map(entry => {
      const company = entry.entityId || {}
      let typeLabel = entry.transactionType || '-'

      if (entry.transactionType === 'payment') {
        if (entry.paymentMethod === 'cash') {
          typeLabel = 'Payment - Cash'
        } else if (entry.paymentMethod === 'bank') {
          typeLabel = 'Payment - Bank'
        } else {
          typeLabel = 'Payment'
        }
      } else if (entry.transactionType === 'charge') {
        typeLabel = 'Logistics Charge'
      } else if (entry.transactionType === 'adjustment') {
        typeLabel = 'Debit'
      }

      let readableReference = '-'
      if (entry.referenceId) {
        if (typeof entry.referenceId === 'object' && entry.referenceId !== null) {
          readableReference = entry.referenceId.orderNumber || entry.referenceId._id || '-'
        } else {
          readableReference = entry.referenceId.toString()
        }
      } else if (entry.reference || entry.referenceNumber) {
        readableReference = entry.reference || entry.referenceNumber
      }

      // Extract supplier info from reference (DispatchOrder)
      let supplierCompany = '-'
      let supplierContact = '-'
      if (entry.referenceId && typeof entry.referenceId === 'object' && entry.referenceId !== null) {
        supplierCompany = entry.referenceId.supplierCompany || '-'
        supplierContact = entry.referenceId.supplierName || '-'
      }

      return {
        id: entry._id || entry.id,
        date: entry.date || entry.createdAt,
        company: company.name || 'Unknown Company',
        companyId: company._id || company.id,
        supplierName: supplierCompany || supplierContact || '-',
        supplierCompany,
        supplierContact,
        type: typeLabel,
        transactionType: entry.transactionType || entry.type,
        description: entry.description || entry.notes || '-',
        debit: entry.debit || 0,
        credit: entry.credit || 0,
        balance: entry.balance || 0, // Original stored balance (for reference)
        boxes: entry.boxes ?? null,
        boxRateSnapshot: entry.boxRateSnapshot ?? null,
        reference: readableReference,
        referenceId: (entry.referenceId && typeof entry.referenceId === 'object' && entry.referenceId._id)
          ? entry.referenceId._id.toString()
          : (entry.referenceId ? entry.referenceId.toString() : null),
        referenceModel: entry.referenceModel || '-',
        paymentMethod: entry.paymentMethod || null,
        paymentDetails: entry.paymentDetails || null,
        boxRate: company.rates?.boxRate || null,
        createdAt: entry.createdAt, // For secondary sorting
        raw: entry
      }
    })

    // Sort by createdAt ASCENDING (oldest first) for running balance calculation
    const sortedAsc = [...transformedEntries].sort((a, b) => {
      const createdAtA = new Date(a.date || a.createdAt || 0).getTime()
      const createdAtB = new Date(b.date || b.createdAt || 0).getTime()
      return createdAtA - createdAtB
    })

    // Calculate client-side running balance
    // Debit = charge (increases what admin owes), Credit = payment (decreases what admin owes)
    let runningBalance = 0
    const withRunningBalance = sortedAsc.map(entry => {
      runningBalance += (entry.debit || 0) - (entry.credit || 0)
      return { ...entry, runningBalance }
    })

    // Reverse back for display (newest first)
    return withRunningBalance.reverse()
  }, [allLedgerData, ledgerTypeFilter, ledgerCompanyFilter])

  // Transform payment history for Tab 3
  const paymentHistoryTransactions = useMemo(() => {
    if (!paymentHistoryData?.entries) return []

    const paymentEntries = paymentHistoryData.entries.filter(entry =>
      entry.transactionType === 'payment'
    )

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

    if (paymentHistoryMethodFilter !== 'all') {
      filtered = filtered.filter(entry => entry.paymentMethod === paymentHistoryMethodFilter)
    }

    return filtered.map(entry => {
      const company = entry.entityId || {}
      const companyName = company.name || 'Unknown Company'

      let reference = '-'
      if (entry.referenceId) {
        if (typeof entry.referenceId === 'object' && entry.referenceId !== null) {
          reference = entry.referenceId.orderNumber || entry.referenceId._id || '-'
        } else {
          reference = entry.referenceId.toString()
        }
      }

      const madeBy = entry.createdBy?.name || 'Unknown'

      return {
        id: entry._id || entry.id,
        date: entry.date || entry.createdAt,
        createdAt: entry.createdAt, // Include createdAt for time component
        companyName,
        companyId: company._id || company.id,
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

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const countThisMonth = paymentHistoryTransactions.filter(txn => {
      const txnDate = new Date(txn.date)
      return txnDate >= firstDayOfMonth
    }).length

    return { total, cash, bank, countThisMonth }
  }, [paymentHistoryTransactions])

  // Use client-side calculated running balance (same as table's top row)
  // This ensures the summary card matches the Balance column of the first row in the table
  const calculatedTotalBalance = useMemo(() => {
    // Get the balance from the first entry (newest after sorting/reversing)
    // This represents the current running balance
    if (allLedgerTransactions.length > 0) {
      return allLedgerTransactions[0].runningBalance || 0
    }
    // Fallback to backend totalBalance for empty data case
    return allLedgerData?.totalBalance || 0
  }, [allLedgerTransactions, allLedgerData])

  // Ledger table columns for Tab 1
  const allLedgerColumns = useMemo(
    () => [
      {
        header: "Date",
        accessor: "date",
        render: (row) => {
          // Use createdAt for time component if available, otherwise use date
          const dateTime = row.date || row.createdAt;
          if (!dateTime) return "-";
          const d = new Date(dateTime);
          const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
          const date = d.toLocaleDateString('en-GB');
          return `${date} ${time}`;
        }
      },
      {
        header: "Company",
        accessor: "company",
        render: (row) => (
          <span className="font-medium">{row.company}</span>
        )
      },
      {
        header: "Supplier",
        accessor: "supplierName",
        render: (row) => (
          <div className="text-sm">
            <span className="font-semibold">{row.supplierCompany || row.supplierName || '-'}</span>
            {row.supplierContact && row.supplierContact !== '-' && (
              <span className="text-muted-foreground"> ({row.supplierContact})</span>
            )}
          </div>
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
        header: "Notes",
        accessor: "description",
        render: (row) => (
          <span className="font-medium block max-w-[250px] truncate" title={row.description || ''}>
            {row.description || '-'}
          </span>
        )
      },
      {
        header: "Boxes",
        accessor: "boxes",
        render: (row) => {
          const ref = row.raw?.referenceId;
          const totalBoxes = row.raw?.boxes ?? ref?.totalBoxes ?? (Array.isArray(ref?.boxes) ? ref.boxes.length : null);
          return <span>{totalBoxes || '-'}</span>
        }
      },
      {
        header: "Box Rate",
        accessor: "boxRate",
        render: (row) => {
          const boxRate = row.raw?.boxRateSnapshot ?? row.boxRate;
          return <span>{boxRate ? currency(boxRate) : '-'}</span>
        }
      },
      {
        header: "Debit (Charges)",
        accessor: "debit",
        render: (row) => (
          <span className={`tabular-nums font-semibold ${row.debit > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
            {row.debit > 0 ? formatNumber(row.debit) : '-'}
          </span>
        )
      },
      {
        header: "Cash Paid",
        accessor: "cashPaid",
        render: (row) => (
          <span className={`tabular-nums font-semibold ${row.credit > 0 && row.paymentMethod === 'cash' ? 'text-green-600' : 'text-muted-foreground'}`}>
            {row.credit > 0 && row.paymentMethod === 'cash' ? formatNumber(row.credit) : '-'}
          </span>
        )
      },
      {
        header: "Bank Paid",
        accessor: "bankPaid",
        render: (row) => (
          <span className={`tabular-nums font-semibold ${row.credit > 0 && row.paymentMethod === 'bank' ? 'text-green-600' : 'text-muted-foreground'}`}>
            {row.credit > 0 && row.paymentMethod === 'bank' ? formatNumber(row.credit) : '-'}
          </span>
        )
      },
      {
        header: "Balance",
        accessor: "runningBalance",
        render: (row) => {
          const balance = row.runningBalance ?? row.balance ?? 0
          // Positive = admin owes logistics (red), Negative = credit/overpaid (green)
          const isCredit = balance < 0
          return (
            <span className={`tabular-nums font-bold ${isCredit ? 'text-green-600' : balance > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              {isCredit ? `-${formatNumber(Math.abs(balance))}` : formatNumber(balance)}
            </span>
          )
        }
      }
    ],
    []
  )

  // Pending Balance Columns for Tab 2
  const pendingBalanceColumns = useMemo(() => {
    const columns = [
      {
        header: "Date",
        accessor: "date",
        render: (row) => {
          // Use createdAt for time component if available, otherwise use date
          const dateTime = row.date || row.createdAt;
          if (!dateTime) return "-";
          const d = new Date(dateTime);
          const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
          const date = d.toLocaleDateString('en-GB');
          return `${date} ${time}`;
        }
      }
    ]

    columns.push(
      {
        header: "Reference",
        accessor: "reference",
        render: (row) => (
          <span className="font-medium  text-blue-600 cursor-pointer hover:underline">
            {row.reference || '-'}
          </span>
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
        header: "Cash Paid",
        accessor: "cashPaid",
        render: (row) => (
          <span className={`tabular-nums font-medium ${(row.cashPaid || 0) > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
            {(row.cashPaid || 0) > 0 ? formatNumber(row.cashPaid) : '-'}
          </span>
        )
      },
      {
        header: "Bank Paid",
        accessor: "bankPaid",
        render: (row) => (
          <span className={`tabular-nums font-medium ${(row.bankPaid || 0) > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
            {(row.bankPaid || 0) > 0 ? formatNumber(row.bankPaid) : '-'}
          </span>
        )
      },
      {
        header: "Remaining",
        accessor: "amount",
        render: (row) => {
          const remaining = row.amount || 0
          // Positive = still owed (red), Negative = overpaid/credit (green)
          const isCredit = remaining < 0
          return (
            <span className={`tabular-nums font-semibold ${isCredit ? 'text-green-600' : remaining > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              {isCredit ? `-${formatNumber(Math.abs(remaining))}` : formatNumber(remaining)}
            </span>
          )
        }
      },
      // {
      //   header: "Payment Type",
      //   accessor: "paymentType",
      //   render: (row) => (
      //     <Badge variant="outline" className={row.paymentType === 'cash' ? 'border-green-500 text-green-700' : 'border-blue-500 text-blue-700'}>
      //       {row.paymentType === 'cash' ? 'Cash' : 'Bank'}
      //     </Badge>
      //   )
      // },
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

  // Payment History Columns for Tab 3
  const paymentHistoryColumns = useMemo(() => {
    const columns = [
      {
        header: "Date",
        accessor: "date",
        render: (row) => {
          // Use createdAt for time component if available, otherwise use date
          const dateTime = row.date || row.createdAt;
          if (!dateTime) return "-";
          const d = new Date(dateTime);
          const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
          const date = d.toLocaleDateString('en-GB');
          return `${date} ${time}`;
        }
      }
    ]

    columns.push(
      {
        header: "Order Reference",
        accessor: "reference",
        render: (row) => (
          <span className="font-medium text-blue-600">
            {row.reference || '-'}
          </span>
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
      toast.error(`Payment amount (${formatNumber(amount)}) exceeds remaining balance (${formatNumber(balance.amount)})`)
      return
    }

    setIsMarkingAsPaid(true)

    try {
      await ledgerAPI.createEntry({
        type: 'logistics',
        entityId: balance.logisticsCompanyId,
        entityModel: 'LogisticsCompany',
        transactionType: 'payment',
        referenceId: balance.id,
        referenceModel: 'DispatchOrder',
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

      await queryClient.invalidateQueries({ queryKey: ['pending-balances-logistics', selectedCompanyId] })
      await queryClient.invalidateQueries({ queryKey: ['ledger', 'logistics'] })
      await queryClient.refetchQueries({ queryKey: ['pending-balances-logistics', selectedCompanyId] })

    } catch (error) {
      console.error('Error marking as paid:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to record payment')
    } finally {
      setIsMarkingAsPaid(false)
    }
  }

  const handleAddPayment = async () => {
    if (!selectedCompanyId || selectedCompanyId === 'all') {
      toast.error('Please select a company first')
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

    setIsSubmittingPayment(true)

    try {
      const company = allCompanies.find(c => (c._id || c.id) === selectedCompanyId)
      if (!company) {
        throw new Error('Company not found')
      }

      // Use the distribute payment API to properly link payments to orders
      await ledgerAPI.distributeLogisticsPayment(selectedCompanyId, {
        amount: amount,
        paymentMethod: paymentForm.method,
        date: paymentForm.date ? new Date(paymentForm.date) : new Date(),
        description: paymentForm.description || `Payment - ${paymentForm.method}`
      })

      toast.success('Payment distributed successfully')

      setPaymentForm({ amount: '', date: '', description: '', method: 'cash' })
      setIsDialogOpen(false)

      queryClient.invalidateQueries({ queryKey: ['pending-balances-logistics', selectedCompanyId] })
      queryClient.invalidateQueries({ queryKey: ['ledger', 'logistics'] })

    } catch (error) {
      console.error('Error creating payment:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to record payment')
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  // TAB 1: Ledger Content - Premium Redesign
  const ledgerTabContent = (
    <div className="space-y-6">
      <div className="rounded-lg border border-border/60 bg-gradient-to-br from-card via-background to-card shadow-sm overflow-hidden">
        {/* Header Section */}
        <div className="relative bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b border-border/50 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 backdrop-blur-sm flex items-center justify-center ring-1 ring-primary/20 shadow-sm">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-xl text-foreground tracking-tight">Complete Ledger History</h2>
                <p className="text-sm text-muted-foreground mt-1">Select a company to view their complete accounting record</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-[250px]">
                <Label htmlFor="ledger-company-filter" className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  Select Company
                </Label>
                <Select
                  value={ledgerCompanyFilter}
                  onValueChange={(value) => {
                    setLedgerCompanyFilter(value)
                    if (value && value !== 'all') {
                      setSelectedCompanyId(value)
                    }
                  }}
                  disabled={allCompaniesLoading}
                >
                  <SelectTrigger id="ledger-company-filter" className="h-11 border-border/60 bg-background/50 backdrop-blur-sm hover:bg-background transition-colors">
                    <SelectValue placeholder="Select a company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allCompanies.map((company) => (
                      <SelectItem key={company._id || company.id} value={company._id || company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {ledgerCompanyFilter && ledgerCompanyFilter !== 'all' && (
                <div className="w-[200px]">
                  <Label htmlFor="ledger-type-filter" className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    Filter By
                  </Label>
                  <Select
                    value={ledgerTypeFilter}
                    onValueChange={setLedgerTypeFilter}
                  >
                    <SelectTrigger id="ledger-type-filter" className="h-11 border-border/60 bg-background/50 backdrop-blur-sm hover:bg-background transition-colors">
                      <SelectValue placeholder="All Transactions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Transactions</SelectItem>
                      <SelectItem value="charge">Logistics Charges</SelectItem>
                      <SelectItem value="cash">Payments - Cash</SelectItem>
                      <SelectItem value="bank">Payments - Bank</SelectItem>
                      <SelectItem value="adjustment">Debit Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6">
          {!ledgerCompanyFilter || ledgerCompanyFilter === 'all' ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl"></div>
                <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 backdrop-blur-sm ring-2 ring-border/60 shadow-lg">
                  <Truck className="w-12 h-12 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2.5">Select a company to view ledger</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
                Choose a logistics company from the dropdown above to see their complete transaction history
              </p>
            </div>
          ) : allLedgerLoading ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background backdrop-blur-sm ring-2 ring-primary/20 shadow-lg">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2.5">Loading ledger entries</h3>
              <p className="text-sm text-muted-foreground">Please wait while we fetch the records...</p>
            </div>
          ) : allLedgerError ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-red-600">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-red-500/5 rounded-full blur-3xl"></div>
                <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-red-100/80 to-red-100/40 backdrop-blur-sm ring-2 ring-red-200/50 shadow-lg">
                  <FileText className="w-12 h-12 text-red-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-red-700 mb-2.5">Error loading ledger entries</h3>
              <p className="text-sm text-red-600 text-center max-w-md">{allLedgerError.message || 'Unknown error'}</p>
              <p className="text-xs text-muted-foreground mt-2">Check console for details</p>
            </div>
          ) : allLedgerTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-muted/30 rounded-full blur-3xl"></div>
                <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 backdrop-blur-sm ring-2 ring-border/60 shadow-lg">
                  <FileText className="w-12 h-12 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2.5">No ledger entries found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">No transaction records found for this company matching the selected filters.</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-card via-background to-card p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
                  <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                     
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-2 text-muted-foreground">
                      Total Entries
                    </div>
                    <div className="text-3xl font-bold tabular-nums text-foreground mb-1">
                      {allLedgerTransactions.length}
                    </div>
                    <div className="text-xs text-muted-foreground">All transactions recorded</div>
                  </div>
                </div>
                <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-card via-background to-card p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
                  <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">

                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-2 text-muted-foreground">
                      Company Balance
                    </div>
                    <div className={`text-3xl font-bold tabular-nums mb-1 ${calculatedTotalBalance <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {calculatedTotalBalance <= 0 ? '+' : '-'}£{formatNumber(Math.abs(calculatedTotalBalance))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {calculatedTotalBalance <= 0 ? 'Credit with company' : 'Amount owed to company'}
                    </div>
                  </div>
                </div>
              </div>
              {/* Data Table */}
              <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
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
    </div>
  )

  // TAB 2: Pending Payments Content
  const paymentSelector = (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="company-select">Select Company</Label>
          <Select
            value={selectedCompanyId}
            onValueChange={(value) => {
              setSelectedCompanyId(value)
            }}
            disabled={allCompaniesLoading}
          >
            <SelectTrigger id="company-select">
              <SelectValue placeholder="Choose a company..." />
            </SelectTrigger>
            <SelectContent>
              {allCompaniesLoading ? (
                <SelectItem value="loading" disabled>Loading companies...</SelectItem>
              ) : allCompanies.length === 0 ? (
                <SelectItem value="none" disabled>No companies found</SelectItem>
              ) : (
                allCompanies.map((company) => (
                  <SelectItem key={company._id || company.id} value={company._id || company.id}>
                    {company.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )

  const pendingPaymentsContent = (
    <>
      {/* Stats Cards - Only show when company is selected */}
      {selectedCompanyId && selectedCompanyId !== 'all' && (
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
              {formatNumber(pendingTotals.totalPending || 0)}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Pending Payments - Action Center</h2>
          <p className="text-sm text-muted-foreground mt-1">Select a company to view orders that need payment</p>
        </div>

        <div className="p-4 space-y-4">
          {paymentSelector}
        </div>
      </div>

      {/* Pending Balances View - Only shown when company is selected */}
      {!selectedCompanyId || selectedCompanyId === 'all' ? (
        <div className="bg-white rounded-lg border p-12 text-center text-muted-foreground mt-4">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-lg font-medium">Select a company to view pending payments</p>
          <p className="text-sm mt-1">Choose a logistics company from the dropdown above to see their pending payment details</p>
        </div>
      ) : pendingBalancesLoading ? (
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
          <p>No pending balances found for this company.</p>
          <p className="text-xs mt-2">This company has no confirmed dispatch orders with remaining balances.</p>
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
                  <span className="font-medium">Company:</span> {markAsPaidDialog.balance.companyName}
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

  // TAB 3: Payment History Content - Premium Redesign
  const paymentHistoryTabContent = (
    <div className="space-y-6">
      {/* Summary Cards - Premium Design */}
      {paymentHistoryCompany && paymentHistoryCompany !== 'all' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Payments Card - Highlighted */}
          <div className="relative rounded-lg border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 via-emerald-50/60 to-white p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-200/20 blur-2xl group-hover:bg-emerald-200/30 transition-all"></div>
            <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-emerald-100/15 blur-xl"></div>
            <div className="relative z-10">
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
                <p className="text-sm text-muted-foreground mt-1">Select a company to view their payment history</p>
              </div>
            </div>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col min-w-0">
              <Label htmlFor="payment-history-company" className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="whitespace-nowrap">Select Company</span>
              </Label>
              <Select
                value={paymentHistoryCompany}
                onValueChange={(value) => {
                  setPaymentHistoryCompany(value)
                  setSelectedCompanyId(value)
                }}
                disabled={allCompaniesLoading}
              >
                <SelectTrigger id="payment-history-company" className="h-[44px] w-full border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg">
                  <SelectValue placeholder="Select a company..." />
                </SelectTrigger>
                <SelectContent>
                  {allCompanies.map((company) => (
                    <SelectItem key={company._id || company.id} value={company._id || company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          {!paymentHistoryCompany || paymentHistoryCompany === 'all' ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl"></div>
                <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 backdrop-blur-sm ring-2 ring-border/60 shadow-lg">
                  <Users className="w-12 h-12 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2.5">No company selected</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
                Select a company from the dropdown above to view their complete payment history and transaction records
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
                  : 'No payment records found for this company'}
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
      label: "Ledger",
      content: ledgerTabContent,
    },
    // {
    //   label: "Pending Payments",
    //   content: pendingPaymentsContent,
    // },
    {
      label: "Payment History",
      content: paymentHistoryTabContent,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="mb-3">
        <BackButton fallbackPath="/logistics" label="Back" />
      </div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Logistics Ledger</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track and manage payments to logistics companies based on boxes delivered
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {allCompaniesLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading companies...
            </div>
          )}
          <Button
            onClick={() => setUniversalPaymentOpen(true)}
            className="gap-2 h-10 px-5 shadow-sm hover:shadow-md transition-all bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
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

      {/* Logistics Payment Modal */}
      <LogisticsPaymentModal
        open={universalPaymentOpen}
        onClose={() => setUniversalPaymentOpen(false)}
        entityId={selectedCompanyId !== 'all' ? selectedCompanyId : ''}
        entityName={
          selectedCompanyId !== 'all'
            ? (allCompanies.find(c => (c._id || c.id) === selectedCompanyId)?.name || 'Company')
            : ''
        }
        totalBalance={(calculatedTotalBalance || 0)}
        entities={allCompanies}
        data={allLedgerTransactions}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['pending-balances-logistics'] })
          queryClient.invalidateQueries({ queryKey: ['ledger', 'logistics'] })
        }}
      />
    </div>
  )
}

