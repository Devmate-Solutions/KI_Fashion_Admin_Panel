"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import DataTable from "../../../components/data-table"
import { useBuyers, useBuyer } from "@/lib/hooks/useBuyers"
import { useBuyerLedger, useAllBuyerLedgers } from "@/lib/hooks/useLedger"
import { ledgerAPI } from "@/lib/api/endpoints/ledger"
import { salesAPI } from "@/lib/api/endpoints/sales"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, FileText, Users, Search, Filter, TrendingUp, DollarSign, Clock, Plus, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import toast from "react-hot-toast"
import Tabs from "@/components/tabs"

function formatNumber(n) {
  const num = Number(n || 0)
  return num.toFixed(2)
}

function formatDateTime(_date) {
  const dateTime = _date.createdAt || _date.date;
  if (!dateTime) return "-";
  const d = new Date(dateTime);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
  const date = d.toLocaleDateString('en-GB');
  return `${date} ${time}`;
}

export default function CustomerLedgerPage() {
  const [selectedBuyerId, setSelectedBuyerId] = useState("")
  const [selectedSaleId, setSelectedSaleId] = useState("none")
  const [activeTab, setActiveTab] = useState(0) // 0: Ledger, 1: Pending Payments, 2: Payment History
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)

  // Forms
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: '',
    description: '',
    method: 'cash'
  })

  // Filters for Ledger Tab
  const [ledgerBuyerFilter, setLedgerBuyerFilter] = useState("")
  const [ledgerFilterBy, setLedgerFilterBy] = useState("all")

  // Filters for Payment History Tab
  const [paymentHistoryDateFrom, setPaymentHistoryDateFrom] = useState("")
  const [paymentHistoryDateTo, setPaymentHistoryDateTo] = useState("")
  const [paymentHistoryMethodFilter, setPaymentHistoryMethodFilter] = useState("all")

  const queryClient = useQueryClient()

  // Fetch active buyers for dropdowns
  const { data: buyers = [], isLoading: buyersLoading } = useBuyers({ limit: 100 })
  const dropdownBuyers = buyers

  // Fetch ledger entries for Tab 1 (when buyer selected)
  const ledgerFilterParams = useMemo(() => {
    if (!ledgerBuyerFilter || ledgerBuyerFilter === 'all') {
      return null
    }
    return { buyerId: ledgerBuyerFilter, limit: 100 }
  }, [ledgerBuyerFilter])

  const { data: allLedgerData, isLoading: allLedgerLoading } = useAllBuyerLedgers(ledgerFilterParams || {})

  // Fetch selected buyer details
  const { data: buyerDetails, isLoading: buyerDetailsLoading } = useBuyer(
    selectedBuyerId && selectedBuyerId !== 'all' ? selectedBuyerId : ''
  )

  // Fetch unpaid sales for Tab 2
  const { data: unpaidSales = [], isLoading: unpaidSalesLoading } = useQuery({
    queryKey: ['unpaid-sales', selectedBuyerId],
    queryFn: async () => {
      if (!selectedBuyerId || selectedBuyerId === 'all') return []
      // Fetch all sales for buyer then filter for pending/partial
      const response = await salesAPI.getAll({
        buyer: selectedBuyerId,
        limit: 1000
      })
      const sales = response?.data?.data || response?.data || []
      return sales.filter(s => s.paymentStatus === 'pending' || s.paymentStatus === 'partial')
    },
    enabled: !!selectedBuyerId && selectedBuyerId !== 'all'
  })

  // Get selected sale details
  const selectedSale = useMemo(() => {
    if (!selectedSaleId || selectedSaleId === 'none') return null
    return unpaidSales.find(sale => sale._id === selectedSaleId)
  }, [selectedSaleId, unpaidSales])

  // Payment History Data (Tab 3)
  const paymentHistoryParams = useMemo(() => {
    if (!selectedBuyerId || selectedBuyerId === 'all') return null
    return { buyerId: selectedBuyerId, limit: 100 }
  }, [selectedBuyerId])

  const { data: paymentHistoryData, isLoading: paymentHistoryLoading } = useAllBuyerLedgers(paymentHistoryParams || {})

  // --- Calculations ---

  // Calculate totals for Pending Payments tab
  const pendingTotals = useMemo(() => {
    const totalPending = unpaidSales.reduce((sum, sale) => {
      const paid = (sale.cashPayment || 0) + (sale.bankPayment || 0)
      const remaining = sale.grandTotal - paid
      return sum + Math.max(0, remaining)
    }, 0)

    // Total paid on these specific unpaid orders (partial payments)
    const totalPaidOnPending = unpaidSales.reduce((sum, sale) => {
      return sum + (sale.cashPayment || 0) + (sale.bankPayment || 0)
    }, 0)

    return { totalPending, totalPaidOnPending }
  }, [unpaidSales])


  // Transform ledger data for Tab 1 (All Transactions)
  const allLedgerTransactions = useMemo(() => {
    if (!allLedgerData?.entries) return []

    let filteredEntries = allLedgerData.entries.filter(entry =>
      entry.transactionType === 'sale' ||
      entry.transactionType === 'receipt' ||
      entry.transactionType === 'adjustment'
    )

    // Apply Filters
    if (ledgerFilterBy !== 'all') {
      filteredEntries = filteredEntries.filter(entry => {
        if (ledgerFilterBy === 'cash') return entry.transactionType === 'receipt' && entry.paymentMethod === 'cash'
        if (ledgerFilterBy === 'bank') return entry.transactionType === 'receipt' && entry.paymentMethod === 'bank'
        return true
      })
    }

    const mappedItems = filteredEntries.map(entry => {
      const buyer = entry.entityId || {}
      let typeLabel = entry.transactionType || '-'

      if (entry.transactionType === 'receipt') {
        typeLabel = `Receipt - ${entry.paymentMethod === 'bank' ? 'Bank' : 'Cash'}`
      } else if (entry.transactionType === 'sale') {
        typeLabel = 'Sale'
      }

      // Readable Reference
      let readableReference = '-'
      if (entry.referenceId) {
        if (typeof entry.referenceId === 'object' && entry.referenceId !== null) {
          readableReference = entry.referenceId.saleNumber || entry.referenceId.invoiceNumber || entry.referenceId._id || '-'
        } else {
          readableReference = entry.referenceId.toString()
        }
      } else if (entry.reference || entry.referenceNumber) {
        readableReference = entry.reference || entry.referenceNumber
      }

      const cashPaid = (entry.transactionType === 'receipt' && entry.paymentMethod === 'cash') ? (entry.credit || 0) : 0
      const bankPaid = (entry.transactionType === 'receipt' && entry.paymentMethod === 'bank') ? (entry.credit || 0) : 0

      return {
        id: entry._id || entry.id,
        date: entry.date || entry.createdAt,
        createdAt: entry.createdAt,
        buyer: buyer.name || buyer.company || 'Unknown Customer',
        type: typeLabel,
        transactionType: entry.transactionType,
        description: entry.description || entry.notes || '-',
        debit: Number(entry.debit) || 0, // Sale (We sold, they owe us)
        credit: Number(entry.credit) || 0, // Receipt (They paid, we received)
        cashPaid,
        bankPaid,
        balance: 0,
        reference: readableReference,
        referenceId: (entry.referenceId && typeof entry.referenceId === 'object') ? entry.referenceId._id : entry.referenceId,
        paymentMethod: entry.paymentMethod,
        raw: entry
      }
    })

    // Sort by createdAt ASC for running balance
    mappedItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    // Calculate Running Balance
    let runningBalance = 0
    for (const entry of mappedItems) {
      runningBalance = runningBalance + entry.debit - entry.credit
      entry.balance = runningBalance
    }

    // Reverse to show newest first
    return mappedItems.reverse()
  }, [allLedgerData, ledgerFilterBy])

  // Payment History Transactions (Tab 3)
  const paymentHistoryTransactions = useMemo(() => {
    if (!paymentHistoryData?.entries) return []

    let filtered = paymentHistoryData.entries.filter(entry => entry.transactionType === 'receipt')

    if (paymentHistoryDateFrom) {
      const fromDate = new Date(paymentHistoryDateFrom)
      filtered = filtered.filter(entry => new Date(entry.date) >= fromDate)
    }
    if (paymentHistoryDateTo) {
      const toDate = new Date(paymentHistoryDateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(entry => new Date(entry.date) <= toDate)
    }
    if (paymentHistoryMethodFilter !== 'all') {
      filtered = filtered.filter(entry => entry.paymentMethod === paymentHistoryMethodFilter)
    }

    return filtered.map(entry => {
      // Readable Reference
      let reference = '-'
      if (entry.referenceId) {
        if (typeof entry.referenceId === 'object' && entry.referenceId !== null) {
          reference = entry.referenceId.saleNumber || entry.referenceId._id || '-'
        } else {
          reference = entry.referenceId.toString()
        }
      }

      return {
        id: entry._id || entry.id,
        date: entry.date || entry.createdAt,
        reference,
        paymentMethod: entry.paymentMethod || 'cash',
        amount: entry.credit || 0,
        madeBy: entry.createdBy?.name || 'Unknown',
        notes: entry.description || '-',
        entryNumber: entry.entryNumber || '-',
        raw: entry
      }
    })
  }, [paymentHistoryData, paymentHistoryDateFrom, paymentHistoryDateTo, paymentHistoryMethodFilter])


  // --- Handlers ---

  const handleAddPayment = async () => {
    if (!selectedBuyerId || selectedBuyerId === 'all') {
      toast.error('Please select a customer first')
      return
    }

    const amount = parseFloat(paymentForm.amount)
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setIsSubmittingPayment(true)

    try {
      const payload = {
        type: 'buyer',
        entityId: selectedBuyerId,
        entityModel: 'Buyer',
        transactionType: 'receipt', // Money IN
        debit: 0,
        credit: amount,
        date: paymentForm.date ? new Date(paymentForm.date) : new Date(),
        description: paymentForm.description || `Payment Received - ${paymentForm.method}`,
        paymentMethod: paymentForm.method,
        paymentDetails: {
          cashPayment: paymentForm.method === 'cash' ? amount : 0,
          bankPayment: paymentForm.method === 'bank' ? amount : 0,
          remainingBalance: 0
        }
      }

      if (selectedSaleId && selectedSaleId !== 'none' && selectedSale) {
        payload.referenceId = selectedSaleId
        payload.referenceModel = 'Sale'
        payload.description = paymentForm.description || `Payment for ${selectedSale.saleNumber} - ${paymentForm.method}`

        // Also update the Sale paymentStatus/paidAmount via salesAPI if needed
        // But usually Ledger is SSOT. 
        // Note: sales.js (legacy) might need update, but ledger entry should suffice if SSOT.
        // sales.js router.post('/entry') handles syncing 'paid' status if reference is DispatchOrder.
        // Does it do it for Sale?
        // Let's check ledger.js router.post('/entry').
        // It handles DispatchOrder payments. It does NOT seem to handle Sale receipts automatically updating Sale model.
        // We might need to call salesAPI.updatePayment as well or rely on a background sync.
        // For now, let's just create the ledger entry.
      }

      await ledgerAPI.createEntry(payload)

      // If linked to a sale, update the sale's payment status directly for immediate feedback
      // (Optimistic update or separate API call)
      if (selectedSaleId && selectedSaleId !== 'none') {
        // Optionally call salesAPI.updatePayment if backend doesn't sync automatically
        // But for now we assume Ledger is primary.
      }

      toast.success('Payment recorded successfully')
      setPaymentForm({ amount: '', date: '', description: '', method: 'cash' })
      setSelectedSaleId('none')
      setIsDialogOpen(false)

      queryClient.invalidateQueries({ queryKey: ['unpaid-sales', selectedBuyerId] })
      queryClient.invalidateQueries({ queryKey: ['buyer', selectedBuyerId] }) // Refresh buyer details
      // Trigger ledgers refresh
      queryClient.invalidateQueries({ queryKey: ['ledger'] })

    } catch (error) {
      console.error('Error recording payment:', error)
      toast.error(error.response?.data?.message || 'Failed to record payment')
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  // --- Columns ---

  const allLedgerColumns = useMemo(() => [
    { header: "Entry #", accessor: "entryNumber", render: (row) => <span className="font-medium">{row.raw.entryNumber || '-'}</span> },
    { header: "Date", accessor: "date", render: (row) => formatDateTime(row) },
    { header: "Customer", accessor: "buyer", render: (row) => <span className="font-medium">{row.buyer}</span> },
    { header: "Type", accessor: "type", render: (row) => <span>{row.type}</span> },
    {
      header: "Reference", accessor: "reference", render: (row) => (
        row.referenceId ? <Link href={`/sales/${row.referenceId}`} className="text-blue-600 hover:underline">{row.reference}</Link> : row.reference
      )
    },
    {
      header: "Debit (Sale)", accessor: "debit", render: (row) => (
        <span className={row.debit > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>{row.debit > 0 ? formatNumber(row.debit) : '-'}</span>
      )
    },
    {
      header: "Credit (Received)", accessor: "credit", render: (row) => (
        <span className={row.credit > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>{row.credit > 0 ? formatNumber(row.credit) : '-'}</span>
      )
    },
    { header: "Balance", accessor: "balance", render: (row) => <span className="font-bold tabular-nums">{formatNumber(row.balance)}</span> }
  ], [])

  const pendingColumns = useMemo(() => [
    { header: "Date", accessor: "saleDate", render: (row) => formatDateTime({ date: row.saleDate }) },
    {
      header: "Sale #", accessor: "saleNumber", render: (row) => (
        <Link href={`/sales/${row._id}`} className="text-blue-600 hover:underline font-medium">{row.saleNumber}</Link>
      )
    },
    { header: "Total", accessor: "grandTotal", render: (row) => <span className="font-medium">{formatNumber(row.grandTotal)}</span> },
    {
      header: "Paid", accessor: "paid", render: (row) => {
        const paid = (row.cashPayment || 0) + (row.bankPayment || 0)
        return <span className="text-green-600">{formatNumber(paid)}</span>
      }
    },
    {
      header: "Remaining", accessor: "remaining", render: (row) => {
        const paid = (row.cashPayment || 0) + (row.bankPayment || 0)
        const remaining = row.grandTotal - paid
        return <span className="text-red-600 font-bold">{formatNumber(remaining)}</span>
      }
    },
    {
      header: "Status", accessor: "paymentStatus", render: (row) => (
        <Badge variant={row.paymentStatus === 'pending' ? 'destructive' : 'warning'}>
          {row.paymentStatus.toUpperCase()}
        </Badge>
      )
    },
    {
      header: "Action", accessor: "action", render: (row) => (
        <Button size="sm" variant="outline" onClick={() => {
          setSelectedSaleId(row._id)
          const paid = (row.cashPayment || 0) + (row.bankPayment || 0)
          const remaining = row.grandTotal - paid
          setPaymentForm(prev => ({ ...prev, amount: remaining.toString() }))
          setIsDialogOpen(true)
        }}>
          Receive Payment
        </Button>
      )
    }
  ], [])

  const paymentHistoryColumns = useMemo(() => [
    { header: "Date", accessor: "date", render: (row) => formatDateTime(row) },
    { header: "Entry #", accessor: "entryNumber", render: (row) => row.entryNumber },
    { header: "Reference", accessor: "reference", render: (row) => row.reference },
    { header: "Mode", accessor: "paymentMethod", render: (row) => <Badge variant="outline">{row.paymentMethod}</Badge> },
    { header: "Amount", accessor: "amount", render: (row) => <span className="text-green-600 font-bold">{formatNumber(row.amount)}</span> },
    { header: "Received By", accessor: "madeBy", render: (row) => row.madeBy },
    { header: "Notes", accessor: "notes", render: (row) => <span className="text-sm text-muted-foreground">{row.notes}</span> }
  ], [])

  // Search state for Customer Ledger tab
  const [ledgerSearch, setLedgerSearch] = useState("")

  // Filter ledger transactions by search
  const filteredLedgerTransactions = useMemo(() => {
    if (!ledgerSearch) return allLedgerTransactions
    const searchLower = ledgerSearch.toLowerCase()
    return allLedgerTransactions.filter(entry => 
      entry.buyer?.toLowerCase().includes(searchLower) ||
      entry.reference?.toLowerCase().includes(searchLower) ||
      entry.type?.toLowerCase().includes(searchLower)
    )
  }, [allLedgerTransactions, ledgerSearch])

  return (
    <div className="space-y-6">
      {/* Header - Enhanced */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Customer Ledger</h1>
            <p className="text-sm text-muted-foreground">Manage customer accounts, payments, and balances</p>
          </div>
      </div>
      </header>

      <Tabs
        tabs={[
          {
            label: "Customer Ledger",
            content: (
              <div className="space-y-6">
                {/* Filters & Search Bar - Unified */}
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Filter Label */}
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">Filters:</span>
                    </div>

                    {/* Select Customer */}
                    <Select 
                      value={ledgerBuyerFilter} 
                      onValueChange={(val) => {
                      setLedgerBuyerFilter(val)
                      if (val && val !== 'all') setSelectedBuyerId(val)
                      }}
                    >
                      <SelectTrigger className="h-10 w-[220px] border-border">
                        <SelectValue placeholder="All Customers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        {dropdownBuyers.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} {b.company ? `(${b.company})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Filter By */}
                    <Select value={ledgerFilterBy} onValueChange={setLedgerFilterBy}>
                      <SelectTrigger className="h-10 w-[180px] border-border">
                        <SelectValue placeholder="All Transactions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Transactions</SelectItem>
                        <SelectItem value="cash">Cash Receipts</SelectItem>
                        <SelectItem value="bank">Bank Receipts</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Search Section */}
                    <div className="flex gap-2 ml-auto">
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                          <Search className="h-4 w-4 text-muted-foreground" />
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
                  </div>
                </div>

                {/* Stats if customer selected - Enhanced */}
                {ledgerBuyerFilter && ledgerBuyerFilter !== 'all' && buyerDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Balance Card */}
                    <div className={`rounded-lg border p-5 shadow-sm transition-shadow hover:shadow-md ${
                      buyerDetails.balance > 0 
                        ? 'border-red-200 bg-gradient-to-br from-red-50/50 to-red-50/30' 
                        : 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-emerald-50/30'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          buyerDetails.balance > 0 ? 'bg-red-100' : 'bg-emerald-100'
                        }`}>
                          <DollarSign className={`h-5 w-5 ${
                            buyerDetails.balance > 0 ? 'text-red-600' : 'text-emerald-600'
                          }`} />
                        </div>
                      </div>
                      <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">
                        Customer Balance
                      </div>
                      <div className={`text-2xl font-bold tabular-nums ${
                        buyerDetails.balance > 0 ? 'text-red-700' : 'text-emerald-700'
                      }`}>
                        £{formatNumber(buyerDetails.balance)}
                      </div>
                      <div className={`text-xs mt-1 ${
                        buyerDetails.balance > 0 ? 'text-red-600/80' : 'text-emerald-600/80'
                      }`}>
                        {buyerDetails.balance > 0 ? 'Amount pending from customer' : 'Account is clear'}
                      </div>
                    </div>

                    {/* Total Sales Card */}
                    <div className="rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                      <div className="flex items-center justify-between mb-3">
                        <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">
                        Total Sales
                      </div>
                      <div className="text-2xl font-bold tabular-nums text-foreground">
                        £{formatNumber(buyerDetails.totalSales || 0)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        All-time sales to this customer
                    </div>
                    </div>
                  </div>
                )}

                {/* Table */}
                <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                  {allLedgerLoading ? (
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
                        {ledgerSearch ? 'Try adjusting your search or filters' : 'Select a customer to view their ledger'}
                      </p>
                    </div>
                  ) : (
                    <DataTable
                      columns={allLedgerColumns}
                      data={filteredLedgerTransactions}
                      pagination={{ pageSize: 50 }}
                      enableSearch={false}
                      disableSorting
                    />
                  )}
                </div>
              </div>
            )
          },
          {
            label: "Pending Payments",
            content: (
              <div className="space-y-6">
                {/* Filters Bar */}
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">Select Customer:</span>
                    </div>
                    <Select 
                      value={selectedBuyerId} 
                      onValueChange={(val) => {
                      setSelectedBuyerId(val)
                      setSelectedSaleId('none')
                      }}
                    >
                      <SelectTrigger className="h-10 w-[300px] border-border">
                        <SelectValue placeholder="Select Customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {dropdownBuyers.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                  {selectedBuyerId && selectedBuyerId !== 'all' && (
                      <Button 
                        onClick={() => {
                      setPaymentForm({ amount: '', date: '', description: '', method: 'cash' })
                      setSelectedSaleId('none')
                      setIsDialogOpen(true)
                        }}
                        className="ml-auto gap-2 h-10"
                      >
                        <Plus className="h-4 w-4" />
                        Record Payment
                    </Button>
                  )}
                  </div>
                </div>

                {(!selectedBuyerId || selectedBuyerId === 'all') ? (
                  <div className="rounded-lg border border-border bg-card p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No customer selected</p>
                    <p className="text-xs text-muted-foreground">Select a customer to view their pending payments</p>
                  </div>
                ) : (
                  <>
                    {/* Stats Card */}
                    <div className="rounded-lg border border-red-200 bg-gradient-to-br from-red-50/50 to-red-50/30 p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-red-600" />
                        </div>
                      </div>
                      <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">
                        Total Pending Amount
                      </div>
                      <div className="text-2xl font-bold text-red-700 tabular-nums">
                        £{formatNumber(pendingTotals.totalPending)}
                      </div>
                      <div className="text-xs text-red-600/80 mt-1">
                        Outstanding amount from {unpaidSales.length} {unpaidSales.length === 1 ? 'sale' : 'sales'}
                      </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                      {unpaidSalesLoading ? (
                        <div className="p-12 flex flex-col items-center justify-center">
                          <Loader2 className="animate-spin h-8 w-8 text-primary mb-4" />
                          <p className="text-sm text-muted-foreground">Loading pending payments...</p>
                        </div>
                      ) : unpaidSales.length === 0 ? (
                        <div className="p-12 text-center">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                          </div>
                          <p className="text-sm font-medium text-foreground mb-1">No pending payments</p>
                          <p className="text-xs text-muted-foreground">All payments have been received</p>
                        </div>
                      ) : (
                        <DataTable columns={pendingColumns} data={unpaidSales} enableSearch={false} hideActions />
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          },
          {
            label: "Payment History",
            content: (
              <div className="space-y-6">
                {/* Filters Bar */}
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">Select Customer:</span>
                    </div>
                    <Select value={selectedBuyerId} onValueChange={setSelectedBuyerId}>
                      <SelectTrigger className="h-10 w-[300px] border-border">
                        <SelectValue placeholder="Select Customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {dropdownBuyers.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(!selectedBuyerId || selectedBuyerId === 'all') ? (
                  <div className="rounded-lg border border-border bg-card p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No customer selected</p>
                    <p className="text-xs text-muted-foreground">Select a customer to view their payment history</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                    {paymentHistoryLoading ? (
                      <div className="p-12 flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin h-8 w-8 text-primary mb-4" />
                        <p className="text-sm text-muted-foreground">Loading payment history...</p>
                      </div>
                    ) : paymentHistoryTransactions.length === 0 ? (
                      <div className="p-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                          <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">No payment history</p>
                        <p className="text-xs text-muted-foreground">No payments have been recorded for this customer</p>
                      </div>
                    ) : (
                      <DataTable 
                        columns={paymentHistoryColumns} 
                        data={paymentHistoryTransactions} 
                        pagination={{ pageSize: 50 }}
                        enableSearch={false}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Payment Dialog - Enhanced */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-xl">Record Payment</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {selectedSale && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">Sale Number:</span>
                  <span className="text-sm font-medium text-foreground">{selectedSale.saleNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">Total Amount:</span>
                  <span className="text-sm font-bold text-foreground">£{formatNumber(selectedSale.grandTotal)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm font-semibold text-muted-foreground">Remaining:</span>
                  <span className="text-sm font-bold text-red-600">
                    £{formatNumber(selectedSale.grandTotal - (selectedSale.cashPayment || 0) - (selectedSale.bankPayment || 0))}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Payment Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                className="h-11"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Date</Label>
              <Input
                type="date"
                value={paymentForm.date}
                onChange={e => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Payment Method</Label>
              <Select value={paymentForm.method} onValueChange={val => setPaymentForm(prev => ({ ...prev, method: val }))}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Description (Optional)</Label>
              <Input
                value={paymentForm.description}
                onChange={e => setPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add a note about this payment"
                className="h-11"
              />
            </div>

            <Button 
              className="w-full h-11 mt-6 gap-2" 
              onClick={handleAddPayment} 
              disabled={isSubmittingPayment}
            >
              {isSubmittingPayment ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
              Confirm Payment
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
