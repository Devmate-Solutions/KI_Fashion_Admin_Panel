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
import { Loader2 } from "lucide-react"
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Customer Ledger</h1>
      </div>

      <Tabs
        tabs={[
          {
            label: "Customer Ledger",
            content: (
              <div className="space-y-6">
                {/* Filters */}
                <div className="bg-white rounded-lg border p-6 flex flex-wrap gap-4 items-end">
                  <div className="w-[300px]">
                    <Label className="mb-2 block">Select Customer</Label>
                    <Select value={ledgerBuyerFilter} onValueChange={(val) => {
                      setLedgerBuyerFilter(val)
                      if (val && val !== 'all') setSelectedBuyerId(val)
                    }}>
                      <SelectTrigger><SelectValue placeholder="All Customers" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        {dropdownBuyers.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name} {b.company ? `(${b.company})` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-[200px]">
                    <Label className="mb-2 block">Filter By</Label>
                    <Select value={ledgerFilterBy} onValueChange={setLedgerFilterBy}>
                      <SelectTrigger><SelectValue placeholder="All Transactions" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Transactions</SelectItem>
                        <SelectItem value="cash">Cash Receipts</SelectItem>
                        <SelectItem value="bank">Bank Receipts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Stats if customer selected */}
                {ledgerBuyerFilter && ledgerBuyerFilter !== 'all' && buyerDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-muted/30 rounded-lg p-6">
                      <p className="text-sm text-muted-foreground">Customer Balance</p>
                      <p className={`text-2xl font-bold ${buyerDetails.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatNumber(buyerDetails.balance)}
                        <span className="text-sm font-normal text-muted-foreground ml-1">{buyerDetails.balance > 0 ? '(Pending)' : '(Clear)'}</span>
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-6">
                      <p className="text-sm text-muted-foreground">Total Sales</p>
                      <p className="text-2xl font-bold">{formatNumber(buyerDetails.totalSales || 0)}</p>
                    </div>
                  </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-lg border">
                  {allLedgerLoading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
                  ) : (
                    <DataTable
                      columns={allLedgerColumns}
                      data={allLedgerTransactions}
                      pagination={{ pageSize: 50 }}
                      searchKey="reference"
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
                <div className="bg-white rounded-lg border p-6 flex flex-wrap gap-4 items-end">
                  <div className="w-[300px]">
                    <Label className="mb-2 block">Select Customer</Label>
                    <Select value={selectedBuyerId} onValueChange={(val) => {
                      setSelectedBuyerId(val)
                      setSelectedSaleId('none')
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                      <SelectContent>
                        {dropdownBuyers.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedBuyerId && selectedBuyerId !== 'all' && (
                    <Button onClick={() => {
                      setPaymentForm({ amount: '', date: '', description: '', method: 'cash' })
                      setSelectedSaleId('none')
                      setIsDialogOpen(true)
                    }}>
                      <span className="mr-2 text-lg">+</span> Record Payment
                    </Button>
                  )}
                </div>

                {(!selectedBuyerId || selectedBuyerId === 'all') ? (
                  <div className="bg-white rounded-lg border p-12 text-center text-muted-foreground">
                    <p>Select a customer to view pending payments.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg border p-6">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Pending (This Selection)</h3>
                        <p className="text-2xl font-bold text-red-600">{formatNumber(pendingTotals.totalPending)}</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border">
                      {unpaidSalesLoading ? (
                        <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>
                      ) : unpaidSales.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">No pending payments found.</div>
                      ) : (
                        <DataTable columns={pendingColumns} data={unpaidSales} hideActions />
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
                <div className="bg-white rounded-lg border p-6 flex flex-wrap gap-4 items-end">
                  <div className="w-[300px]">
                    <Label className="mb-2 block">Select Customer</Label>
                    <Select value={selectedBuyerId} onValueChange={setSelectedBuyerId}>
                      <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                      <SelectContent>
                        {dropdownBuyers.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(!selectedBuyerId || selectedBuyerId === 'all') ? (
                  <div className="bg-white rounded-lg border p-12 text-center text-muted-foreground">
                    <p>Select a customer to view payment history.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border">
                    {paymentHistoryLoading ? (
                      <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>
                    ) : (
                      <DataTable columns={paymentHistoryColumns} data={paymentHistoryTransactions} pagination={{ pageSize: 50 }} />
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedSale && (
              <div className="bg-muted p-3 rounded text-sm mb-2">
                <p><span className="font-semibold">Sale:</span> {selectedSale.saleNumber}</p>
                <p><span className="font-semibold">Total:</span> {formatNumber(selectedSale.grandTotal)}</p>
                <p><span className="font-semibold">Remaining:</span> {formatNumber(selectedSale.grandTotal - (selectedSale.cashPayment || 0) - (selectedSale.bankPayment || 0))}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={paymentForm.date}
                onChange={e => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={paymentForm.method} onValueChange={val => setPaymentForm(prev => ({ ...prev, method: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={paymentForm.description}
                onChange={e => setPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional note"
              />
            </div>

            <Button className="w-full mt-4" onClick={handleAddPayment} disabled={isSubmittingPayment}>
              {isSubmittingPayment ? <Loader2 className="animate-spin mr-2" /> : null}
              Confirm Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
