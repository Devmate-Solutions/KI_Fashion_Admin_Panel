"use client"

import { useState, useMemo } from "react"
import Tabs from "@/components/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import DataTable from "../../../components/data-table"
import { useBuyers, useBuyer } from "@/lib/hooks/useBuyers"
import { useBuyerLedger, useAllBuyerLedgers } from "@/lib/hooks/useLedger"
import { Loader2, Plus } from "lucide-react"

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Helper function to normalize referenceId for consistent grouping
function normalizeReferenceId(referenceId) {
  if (!referenceId) return null
  if (typeof referenceId === 'object' && referenceId !== null) {
    // Handle ObjectId or populated object
    // ObjectId.toString() returns the hex string representation
    const id = referenceId._id || referenceId.id
    if (id) {
      // If it's an object, get its string representation
      if (typeof id === 'object' && id.toString) {
        return id.toString()
      }
      return String(id)
    }
    // Fallback to toString() if available
    if (referenceId.toString && typeof referenceId.toString === 'function') {
      return referenceId.toString()
    }
    return String(referenceId)
  }
  // For strings, ensure it's clean (remove any ObjectId wrapper text)
  const str = String(referenceId).trim()
  // If it looks like an ObjectId string (24 hex characters), use it as-is
  if (/^[0-9a-fA-F]{24}$/.test(str)) {
    return str
  }
  return str
}

export default function CustomerLedgerPage() {
  const [selectedBuyerId, setSelectedBuyerId] = useState("all")
  
  // Filters for Tab 2
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all")
  
  // Fetch all buyers for dropdown and table
  const { data: buyers = [], isLoading: buyersLoading } = useBuyers()

  // Fetch selected buyer details and transactions
  const { data: buyerDetails, isLoading: buyerDetailsLoading } = useBuyer(
    selectedBuyerId && selectedBuyerId !== 'all' ? selectedBuyerId : ''
  )
  
  // Fetch ledger entries for the selected buyer in Tab 2, or all buyers if "all" is selected
  const paymentLedgerParams = useMemo(() => {
    if (selectedBuyerId === 'all' || !selectedBuyerId) {
      return { limit: 100 } // Fetch payment entries (reduced from 1000 for better performance)
    }
    return { buyerId: selectedBuyerId }
  }, [selectedBuyerId])
  
  const { data: ledgerData, isLoading: ledgerLoading } = useBuyerLedger(
    selectedBuyerId && selectedBuyerId !== 'all' ? selectedBuyerId : ''
  )
  
  // Fetch all payment entries when "all" is selected
  const shouldFetchAllPayments = selectedBuyerId === 'all'
  const { data: allPaymentLedgerData, isLoading: allPaymentLedgerLoading } = useAllBuyerLedgers(
    shouldFetchAllPayments ? paymentLedgerParams : {}
  )

  // Customer Ledger Table Columns (All Customers)
  const customerLedgerColumns = useMemo(
    () => [
      { 
        header: "Customer No", 
        accessor: "id",
        render: (row) => String(row.id).slice(-6)
      },
      { 
        header: "Customer Name", 
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
          <span className={`tabular-nums font-semibold ${row.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {currency(Math.abs(row.balance || 0))} {row.balance >= 0 ? 'CR' : 'DR'}
          </span>
        )
      }
    ],
    []
  )

  
  // Transform transactions for detailed ledger table - Group sale-related transactions
  const transactions = useMemo(() => {
    // If "all" buyers selected, use all ledger data; otherwise use buyer-specific data
    const isAllBuyers = selectedBuyerId === 'all'
    const buyerTransactions = isAllBuyers ? [] : (buyerDetails?.transactions || [])
    const ledgerEntries = isAllBuyers 
      ? (allPaymentLedgerData?.entries || [])
      : (ledgerData?.entries || [])
    
    // Merge transactions from both sources
    let rawTransactions = [
      ...buyerTransactions.map(txn => ({
        ...txn,
        source: 'buyer',
        _id: txn._id || txn.id,
      })),
      ...ledgerEntries.map(entry => ({
        ...entry,
        source: 'ledger',
        type: entry.transactionType || entry.type,
        _id: entry._id || entry.id,
      }))
    ]
    
    // Apply filters
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      rawTransactions = rawTransactions.filter(txn => {
        const txnDate = new Date(txn.date || txn.transactionDate || txn.createdAt)
        return txnDate >= fromDate
      })
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999) // Include entire end date
      rawTransactions = rawTransactions.filter(txn => {
        const txnDate = new Date(txn.date || txn.transactionDate || txn.createdAt)
        return txnDate <= toDate
      })
    }
    
    if (transactionTypeFilter !== 'all') {
      rawTransactions = rawTransactions.filter(txn => {
        const txnType = txn.transactionType || txn.type || ''
        return txnType.toLowerCase() === transactionTypeFilter.toLowerCase()
      })
    }
    
    if (paymentMethodFilter !== 'all') {
      rawTransactions = rawTransactions.filter(txn => {
        return txn.paymentMethod === paymentMethodFilter
      })
    }
    
    // Filter to only show receipt transactions (for payment tab)
    rawTransactions = rawTransactions.filter(txn => {
      return txn.transactionType === 'receipt' || txn.type === 'receipt'
    })
    
    if (rawTransactions.length === 0) return []
    
    // Since we're only showing receipts, process them directly
    const receiptTransactions = rawTransactions.map(txn => {
      const paymentMethod = txn.paymentMethod
      const credit = txn.credit || 0
      const cashPayment = paymentMethod === 'cash' ? credit : 0
      const bankPayment = paymentMethod === 'bank' ? credit : 0
      
      // If no payment method specified, check paymentDetails
      let finalCashPayment = cashPayment
      let finalBankPayment = bankPayment
      if (!paymentMethod && txn.paymentDetails) {
        finalCashPayment = txn.paymentDetails.cashPayment || 0
        finalBankPayment = txn.paymentDetails.bankPayment || 0
      }
      
      // Get customer name from entityId when viewing all customers
      let customerName = '-'
      if (isAllBuyers && txn.entityId) {
        if (typeof txn.entityId === 'object' && txn.entityId !== null) {
          customerName = txn.entityId.name || txn.entityId.company || '-'
        }
      } else if (buyerDetails) {
        customerName = buyerDetails.name || buyerDetails.company || '-'
      }
      
      // Get reference/sale number from description or referenceId
      let reference = '-'
      if (txn.description) {
        const match = txn.description.match(/Sale\s+([A-Z0-9-]+)/i)
        if (match) {
          reference = match[1]
        }
      }
      if (reference === '-' && txn.referenceId) {
        reference = String(txn.referenceId)
      }
      
      return {
        id: txn._id || txn.id,
        date: txn.date || txn.transactionDate || txn.createdAt,
        type: 'Receipt',
        description: txn.description || txn.notes || '-',
        saleAmount: 0,
        cashPayment: finalCashPayment,
        bankPayment: finalBankPayment,
        remainingBalance: 0,
        balance: 0,
        reference: reference,
        referenceId: txn.referenceId ? String(txn.referenceId) : '-',
        customerName: customerName,
        raw: txn
      }
    })
    
    // Sort by date (newest first)
    return receiptTransactions.sort((a, b) => {
      const dateA = new Date(a.date || 0)
      const dateB = new Date(b.date || 0)
      return dateB - dateA
    })
  }, [buyerDetails, allPaymentLedgerData, ledgerData, selectedBuyerId, dateFrom, dateTo, transactionTypeFilter, paymentMethodFilter])

  const transactionColumns = useMemo(
    () => {
      const columns = [
        { 
          header: "Date", 
          accessor: "date",
          render: (row) => row.date ? new Date(row.date).toLocaleDateString('en-GB') : "-"
        }
      ]
      
      // Add Customer column only when viewing all customers
      if (selectedBuyerId === 'all') {
        columns.push({
          header: "Customer",
          accessor: "customerName",
          render: (row) => <span className="font-medium">{row.customerName || '-'}</span>
        })
      }
      
      columns.push(
        { 
          header: "Type", 
          accessor: "type",
          render: (row) => <span className="font-medium">{row.type || '-'}</span>
        },
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
          header: "Sale Amount", 
          accessor: "saleAmount",
          render: (row) => row.saleAmount > 0 ? (
            <span className="tabular-nums font-semibold">{currency(row.saleAmount)}</span>
          ) : (
            <span className="tabular-nums text-muted-foreground">-</span>
          )
        },
        { 
          header: "Paid Amount", 
          accessor: "totalPaid",
          render: (row) => {
            const totalPaid = (row.cashPayment || 0) + (row.bankPayment || 0)
            return totalPaid > 0 ? (
              <span className="tabular-nums text-green-600 font-medium">{currency(totalPaid)}</span>
            ) : (
              <span className="tabular-nums text-muted-foreground">-</span>
            )
          }
        },
        { 
          header: "Balance", 
          accessor: "balance",
          render: (row) => {
            // Balance shows remaining amount (positive = amount owed by customer)
            const remaining = row.remainingBalance || row.balance || 0
            return (
              <span className={`tabular-nums font-semibold ${remaining > 0 ? 'text-red-600' : remaining < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                {currency(Math.abs(remaining))} {remaining > 0 ? 'DR' : remaining < 0 ? 'CR' : '-'}
              </span>
            )
          }
        }
      )
      
      return columns
    },
    [selectedBuyerId]
  )

  // Calculate total balances
  const totalBalance = useMemo(() => {
    return buyers.reduce((sum, buyer) => sum + (buyer.balance || 0), 0)
  }, [buyers])

  const ledgerTabContent = (
    <div className="space-y-4">
      {buyersLoading ? (
        <div className="bg-white rounded-lg border p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading customers...</span>
        </div>
      ) : buyers.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center text-muted-foreground">
          No customers found
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{buyers.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currency(Math.abs(totalBalance))} {totalBalance >= 0 ? 'CR' : 'DR'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="font-semibold">All Customers</h2>
            </div>
            <DataTable columns={customerLedgerColumns} data={buyers} hideActions />
          </div>
        </>
      )}
    </div>
  )

  const receivingSelector = (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="buyer-select">Select Customer</Label>
          <Select
            value={selectedBuyerId}
            onValueChange={setSelectedBuyerId}
            disabled={buyersLoading}
          >
            <SelectTrigger id="buyer-select">
              <SelectValue placeholder="Choose a customer..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {buyersLoading ? (
                <SelectItem value="loading" disabled>Loading customers...</SelectItem>
              ) : buyers.length === 0 ? (
                <SelectItem value="none" disabled>No customers found</SelectItem>
              ) : (
                buyers.map((buyer) => (
                  <SelectItem key={buyer.id} value={String(buyer.id)}>
                    {buyer.name} {buyer.company ? `(${buyer.company})` : ''}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        {buyerDetails && selectedBuyerId !== 'all' && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Remaining Balance</p>
            <p className={`text-2xl font-bold ${buyerDetails.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currency(Math.abs(buyerDetails.balance || 0))} {buyerDetails.balance >= 0 ? 'CR' : 'DR'}
            </p>
          </div>
        )}
      </div>
    </div>
  )

  // Calculate totals from ALL transactions (without filters) when "all customers" is selected
  // When individual customer is selected, calculate from filtered transactions
  const allTransactionsUnfiltered = useMemo(() => {
    if (selectedBuyerId !== 'all') {
      return null // Only needed when "all customers" is selected
    }
    
    // Get all transactions without applying date/type/payment method filters
    const isAllBuyers = true
    const ledgerEntries = allPaymentLedgerData?.entries || []
    
    // Merge transactions from ledger entries
    let rawTransactions = ledgerEntries.map(entry => ({
      ...entry,
      source: 'ledger',
      type: entry.transactionType || entry.type,
      _id: entry._id || entry.id,
    }))
    
    // Filter to only show receipt transactions (same as main transactions)
    rawTransactions = rawTransactions.filter(txn => {
      return txn.transactionType === 'receipt' || txn.type === 'receipt'
    })
    
    if (rawTransactions.length === 0) return []
    
    // Process receipts directly for totals calculation
    return rawTransactions.map(txn => {
      const paymentMethod = txn.paymentMethod
      const credit = txn.credit || 0
      let cashPayment = paymentMethod === 'cash' ? credit : 0
      let bankPayment = paymentMethod === 'bank' ? credit : 0
      
      // If no payment method specified, check paymentDetails
      if (!paymentMethod && txn.paymentDetails) {
        cashPayment = txn.paymentDetails.cashPayment || 0
        bankPayment = txn.paymentDetails.bankPayment || 0
      }
      
      return {
        cashPayment: cashPayment,
        bankPayment: bankPayment,
        remainingBalance: 0,
        saleAmount: 0
      }
    })
  }, [selectedBuyerId, allPaymentLedgerData])
  
  const calculatedTotalReceived = useMemo(() => {
    if (selectedBuyerId === 'all' && allTransactionsUnfiltered) {
      // When "all customers" is selected, calculate from all unfiltered transactions
      return allTransactionsUnfiltered.reduce((sum, txn) => {
        const cashPayment = txn.cashPayment || 0
        const bankPayment = txn.bankPayment || 0
        return sum + cashPayment + bankPayment
      }, 0)
    } else {
      // When individual customer is selected, calculate from filtered transactions
      return transactions.reduce((sum, txn) => {
        const cashPayment = txn.cashPayment || 0
        const bankPayment = txn.bankPayment || 0
        return sum + cashPayment + bankPayment
      }, 0)
    }
  }, [selectedBuyerId, allTransactionsUnfiltered, transactions])
  
  const calculatedRemainingBalance = useMemo(() => {
    if (selectedBuyerId === 'all') {
      // When "all customers" is selected, use sum of all buyers' balances
      return buyers.reduce((sum, buyer) => sum + (buyer.balance || 0), 0)
    } else {
      // When individual customer is selected, calculate from filtered transactions
      return transactions.reduce((sum, txn) => sum + (txn.remainingBalance || 0), 0)
    }
  }, [selectedBuyerId, buyers, transactions])

  const receivingDetails = (
    <>
      {/* Stats Cards - Calculate from displayed rows */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Received</h3>
          <div className="text-2xl font-bold text-green-600">
            {(buyerDetailsLoading || ledgerLoading || allPaymentLedgerLoading) ? (
              <Loader2 className="h-6 w-6 animate-spin inline-block" />
            ) : (
              currency(calculatedTotalReceived)
            )}
          </div>
          {selectedBuyerId === 'all' && !(buyerDetailsLoading || ledgerLoading || allPaymentLedgerLoading) && (
            <p className="text-xs text-muted-foreground mt-1">Across all customers</p>
          )}
        </div>
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Remaining Balance</h3>
          <div className="text-2xl font-bold text-red-600">
            {(buyerDetailsLoading || ledgerLoading || allPaymentLedgerLoading) ? (
              <Loader2 className="h-6 w-6 animate-spin inline-block" />
            ) : (
              currency(calculatedRemainingBalance)
            )}
          </div>
          {selectedBuyerId === 'all' && !(buyerDetailsLoading || ledgerLoading || allPaymentLedgerLoading) && (
            <p className="text-xs text-muted-foreground mt-1">Across all customers</p>
          )}
        </div>
      </div>

      {/* Customer Ledger Table - Show when "all customers" is selected */}
      {selectedBuyerId === 'all' && (
        <div className="bg-white rounded-lg border mb-6">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Customer Ledger</h2>
          </div>
          {buyersLoading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading customers...</span>
            </div>
          ) : buyers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No customers found
            </div>
          ) : (
            <DataTable columns={customerLedgerColumns} data={buyers} hideActions />
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Customer Payment</h2>
        </div>
        
        {/* Filters */}
        <div className="p-4 border-b space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="date-from">Date From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="date-to">Date To</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            {/* <div>
              <Label htmlFor="transaction-type">Transaction Type</Label>
              <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="receipt">Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div> */}
            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue />
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

        {selectedBuyerId && (
          (buyerDetailsLoading || ledgerLoading || allPaymentLedgerLoading) ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading transactions...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No transactions found.
            </div>
          ) : (
            <DataTable columns={transactionColumns} data={transactions} hideActions />
          )
        )}

        {!selectedBuyerId && (
          <div className="p-8 text-center text-muted-foreground">
            Please select a customer to view payment history
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customer Receiving</h1>
        {buyersLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading customers...
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg border p-4">
          {receivingSelector}
        </div>
        {receivingDetails}
      </div>
    </div>
  )
}
