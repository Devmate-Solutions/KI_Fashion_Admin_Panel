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
import { useLogisticsLedger, useAllLogisticsLedgers } from "@/lib/hooks/useLedger"
import { ledgerAPI } from "@/lib/api/endpoints/ledger"
import { balancesAPI } from "@/lib/api/endpoints/balances"
import { logisticsCompaniesAPI } from "@/lib/api/endpoints/logisticsCompanies"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus } from "lucide-react"
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
  const [selectedCompanyId, setSelectedCompanyId] = useState("all")
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

  // Filter for Tab 1 - Ledger
  const [ledgerCompanyFilter, setLedgerCompanyFilter] = useState("all")

  // Filters for Tab 3 (Payment History)
  const [paymentHistoryCompany, setPaymentHistoryCompany] = useState("all")
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

  // Fetch all logistics ledger entries for Tab 1 (with optional company filter)
  const ledgerFilterParams = useMemo(() => {
    const params = { limit: 100 }
    if (ledgerCompanyFilter && ledgerCompanyFilter !== 'all') {
      params.logisticsCompanyId = ledgerCompanyFilter
    }
    return params
  }, [ledgerCompanyFilter])

  const { data: allLedgerData, isLoading: allLedgerLoading, error: allLedgerError } = useAllLogisticsLedgers(ledgerFilterParams)

  // Fetch ledger entries for selected company in Tab 2
  const { data: ledgerData, isLoading: ledgerLoading } = useLogisticsLedger(
    selectedCompanyId && selectedCompanyId !== 'all' ? selectedCompanyId : ''
  )

  // Fetch pending balances
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
    enabled: activeTab === 1
  })

  const pendingBalances = pendingBalancesData?.balances || []
  const pendingTotals = pendingBalancesData?.totals || { cashPending: 0, bankPending: 0, totalPending: 0, totalPaid: 0 }

  // Fetch payment history for Tab 3
  const paymentHistoryParams = useMemo(() => {
    const params = { limit: 100 }
    if (paymentHistoryCompany && paymentHistoryCompany !== 'all') {
      params.logisticsCompanyId = paymentHistoryCompany
    }
    return params
  }, [paymentHistoryCompany])

  const { data: paymentHistoryData, isLoading: paymentHistoryLoading } = useAllLogisticsLedgers(paymentHistoryParams)

  // Transform all ledger entries for Tab 1 display
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

    const filteredEntries = allLedgerData.entries.filter(entry =>
      entry.transactionType === 'charge' ||
      entry.transactionType === 'payment'
    )

    return filteredEntries.map(entry => {
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

      return {
        id: entry._id || entry.id,
        date: entry.date || entry.createdAt,
        company: company.name || 'Unknown Company',
        companyId: company._id || company.id,
        type: typeLabel,
        transactionType: entry.transactionType || entry.type,
        description: entry.description || entry.notes || '-',
        debit: entry.debit || 0,
        credit: entry.credit || 0,
        balance: entry.balance || 0,
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
  }, [allLedgerData])

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

  // Ledger table columns for Tab 1
  const allLedgerColumns = useMemo(
    () => [
      {
        header: "Date",
        accessor: "date",
        render: (row) => row.date ? new Date(row.date).toLocaleDateString('en-GB') : "-"
      },
      {
        header: "Company",
        accessor: "company",
        render: (row) => (
          <span className="font-medium">{row.company}</span>
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
        header: "Boxes",
        accessor: "boxes",
        render: (row) => {
          const ref = row.raw?.referenceId;
          const totalBoxes = ref?.totalBoxes || (Array.isArray(ref?.boxes) ? ref.boxes.length : null);
          return <span>{totalBoxes || '-'}</span>
        }
      },
      {
        header: "Box Rate",
        accessor: "boxRate",
        render: (row) => {
          const ref = row.raw?.referenceId;
          return <span>{ref?.boxRate ? currency(ref.boxRate) : '-'}</span>
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
        header: "Credit (Paid)",
        accessor: "credit",
        render: (row) => (
          <span className={`tabular-nums font-semibold ${row.credit > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
            {row.credit > 0 ? formatNumber(row.credit) : '-'}
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

  // Pending Balance Columns for Tab 2
  const pendingBalanceColumns = useMemo(() => {
    const columns = [
      {
        header: "Date",
        accessor: "date",
        render: (row) => row.date ? new Date(row.date).toLocaleDateString('en-GB') : "-"
      }
    ]

    if (selectedCompanyId === 'all') {
      columns.push({
        header: "Company",
        accessor: "companyName",
        render: (row) => <span className="font-medium">{row.companyName || '-'}</span>
      })
    }

    columns.push(
      {
        header: "Reference",
        accessor: "reference",
        render: (row) => (
          <span className="font-medium text-blue-600 cursor-pointer hover:underline">
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
  }, [selectedCompanyId, isMarkingAsPaid])

  // Payment History Columns for Tab 3
  const paymentHistoryColumns = useMemo(() => {
    const columns = [
      {
        header: "Date",
        accessor: "date",
        render: (row) => row.date ? new Date(row.date).toLocaleDateString('en-GB') : "-"
      }
    ]

    if (paymentHistoryCompany === 'all') {
      columns.push({
        header: "Company",
        accessor: "companyName",
        render: (row) => <span className="font-medium">{row.companyName || '-'}</span>
      })
    }

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
  }, [paymentHistoryCompany])

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

      const paymentPayload = {
        type: 'logistics',
        entityId: selectedCompanyId,
        entityModel: 'LogisticsCompany',
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

      await ledgerAPI.createEntry(paymentPayload)

      toast.success('Payment recorded successfully')

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

  // TAB 1: Ledger Content
  const ledgerTabContent = (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-semibold text-lg">Complete Ledger History</h2>
            <p className="text-sm text-muted-foreground mt-1">All charges and payments - complete accounting record</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-[250px]">
              <Label htmlFor="ledger-company-filter" className="mb-2 block">Filter by Company</Label>
              <Select
                value={ledgerCompanyFilter}
                onValueChange={(value) => {
                  setLedgerCompanyFilter(value)
                  if (value !== 'all') {
                    setSelectedCompanyId(value)
                  }
                }}
                disabled={allCompaniesLoading}
              >
                <SelectTrigger id="ledger-company-filter">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {allCompanies.map((company) => (
                    <SelectItem key={company._id || company.id} value={company._id || company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
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
        ) : allLedgerError ? (
          <div className="p-12 text-center text-red-600">
            <p>Error loading ledger entries: {allLedgerError.message || 'Unknown error'}</p>
            <p className="text-xs text-muted-foreground mt-2">Check console for details</p>
          </div>
        ) : allLedgerTransactions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p>No ledger entries found</p>
            {ledgerCompanyFilter !== 'all' && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setLedgerCompanyFilter('all')}
              >
                Show All Companies
              </Button>
            )}
            {ledgerCompanyFilter === 'all' && (
              <p className="text-xs mt-2">Try selecting a specific company to see their entries</p>
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
                  {ledgerCompanyFilter === 'all' ? 'Total Balance (All Companies)' : 'Company Balance'}
                </p>
                <p className={`text-2xl font-bold ${(allLedgerData?.totalBalance || 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatNumber(Math.abs(allLedgerData?.totalBalance || 0))}
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
              />
            </div>
          </>
        )}
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
              <SelectItem value="all">All Companies</SelectItem>
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
            {formatNumber(Math.abs(allLedgerData?.totalBalance || 0))}
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
          <p className="text-xs mt-2">Make sure you have confirmed dispatch orders with logistics companies.</p>
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

  // TAB 3: Payment History Content
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
            <p className="text-sm text-muted-foreground mt-1">All payments made to logistics companies</p>
          </div>
          {paymentHistoryCompany && paymentHistoryCompany !== 'all' && (
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
                  <div>
                    <Label htmlFor="amount">Payment Amount <span className="text-red-500">*</span></Label>
                    <Input
                      id="amount"
                      type="text"
                  inputMode="decimal"
                      step="0.01"
                      min="0.01"
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
            <Label htmlFor="payment-history-company">Company</Label>
            <Select
              value={paymentHistoryCompany}
              onValueChange={(value) => {
                setPaymentHistoryCompany(value)
                setSelectedCompanyId(value)
              }}
              disabled={allCompaniesLoading}
            >
              <SelectTrigger id="payment-history-company">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {allCompanies.map((company) => (
                  <SelectItem key={company._id || company.id} value={company._id || company.id}>
                    {company.name}
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
            {(paymentHistoryCompany !== 'all' || paymentHistoryDateFrom || paymentHistoryDateTo || paymentHistoryMethodFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setPaymentHistoryCompany('all')
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
      label: "Ledger",
      content: ledgerTabContent,
    },
    {
      label: "Pending Payments",
      content: pendingPaymentsContent,
    },
    {
      label: "Payment History",
      content: paymentHistoryTabContent,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Logistics Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage payments to logistics companies based on boxes delivered
          </p>
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
        totalBalance={Math.abs(allLedgerData?.totalBalance || 0)}
        entities={allCompanies}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['pending-balances-logistics'] })
          queryClient.invalidateQueries({ queryKey: ['ledger', 'logistics'] })
        }}
      />
    </div>
  )
}

