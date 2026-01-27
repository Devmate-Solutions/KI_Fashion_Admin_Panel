"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import DataTable from "../../../components/data-table"
import { useBuyers, useBuyer } from "@/lib/hooks/useBuyers"
import { useBuyerLedger, useAllBuyerLedgers } from "@/lib/hooks/useLedger"
import { ledgerAPI } from "@/lib/api/endpoints/ledger"
import { paymentAPI } from "@/lib/api/endpoints/payments"
import { salesAPI } from "@/lib/api/endpoints/sales"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, FileText, Users, Search, Filter, TrendingUp, DollarSign, Clock, Plus, CheckCircle2, Plus, Printer, RotateCcw, Receipt, FileText, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import toast from "react-hot-toast"
import Tabs from "@/components/tabs"
import CustomerPaymentModal from "@/components/modals/CustomerPaymentModal"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

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
  const [selectedBuyerId, setSelectedBuyerId] = useState("all")
  const [ledgerBuyerFilter, setLedgerBuyerFilter] = useState("")
  const [activeTab, setActiveTab] = useState(0) // 0: Ledger, 1: Payment History, 2: Payment Receipts
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  // Reversal dialog state
  const [reversalDialogOpen, setReversalDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [reversalReason, setReversalReason] = useState('')
  const [isReversing, setIsReversing] = useState(false)

  // Receipt dialog state
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const [receiptData, setReceiptData] = useState(null)
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false)

  // Filters for Payment History Tab
  const [paymentHistoryDateFrom, setPaymentHistoryDateFrom] = useState("")
  const [paymentHistoryDateTo, setPaymentHistoryDateTo] = useState("")
  const [paymentHistoryMethodFilter, setPaymentHistoryMethodFilter] = useState("all")

  const queryClient = useQueryClient()

  // Fetch active buyers for dropdowns
  const { data: buyers = [], isLoading: buyersLoading, error: buyersError } = useBuyers({ limit: 500 })
  const dropdownBuyers = buyers
  
  console.log(`Customer Ledger: Loaded ${dropdownBuyers.length} buyers for dropdown`)

  const comboboxOptions = useMemo(() => {
    const options = dropdownBuyers.map(b => ({
      value: b.id,
      label: `${b.name}${b.company ? ` (${b.company})` : ''}`,
    }))
    // Add "All Customers" option at the beginning
    return [{ value: 'all', label: 'All Customers' }, ...options]
  }, [dropdownBuyers])

  // Fetch ledger entries for Tab 0 (when buyer selected)
  const ledgerFilterParams = useMemo(() => {
    if (!selectedBuyerId) {
      return null
    }
    // When 'all' is selected, fetch all entries without buyerId filter
    if (selectedBuyerId === 'all') {
      return { limit: 500 }
    }
    return { buyerId: selectedBuyerId, limit: 100 }
  }, [selectedBuyerId])

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

  // Payment History Data (Tab 3)
  const paymentHistoryParams = useMemo(() => {
    if (!selectedBuyerId || selectedBuyerId === 'all') return null
    return { buyerId: selectedBuyerId, limit: 100 }
  }, [selectedBuyerId])

  const { data: paymentHistoryData, isLoading: paymentHistoryLoading } = useAllBuyerLedgers(paymentHistoryParams || {})

  // Payment Receipts Data (Tab 2) - Using new Payment model
  const { data: paymentReceiptsData, isLoading: paymentReceiptsLoading, refetch: refetchPayments, error: paymentReceiptsError, isError, isFetching, status } = useQuery({
    queryKey: ['payments', 'customer', selectedBuyerId],
    queryFn: async () => {
      console.log('🔍 Payment Receipts Query Starting...')
      console.log('🔍 selectedBuyerId:', selectedBuyerId)
      
      if (!selectedBuyerId) {
        console.log('❌ No selectedBuyerId - returning empty')
        return { payments: [] }
      }
      
      try {
        if (selectedBuyerId === 'all') {
          // Fetch all customer payments
          console.log('📡 Calling paymentAPI.getAllPayments...')
          const response = await paymentAPI.getAllPayments({ limit: 1000 })
          console.log('📥 Full API response:', response)
          console.log('📥 response.data:', response.data)
          console.log('📥 response.data?.data:', response.data?.data)
          console.log('📥 response.data?.data?.payments:', response.data?.data?.payments)
          
          // Response structure from backend: { data: { success: true, data: { payments: [], pagination: {} } } }
          // axios wraps it in response.data
          const paymentsData = response.data?.data
          if (paymentsData && Array.isArray(paymentsData.payments)) {
            console.log(`✅ Found ${paymentsData.payments.length} payments for all customers`)
            return paymentsData
          }
          // Fallback for different response structure
          if (response.data && Array.isArray(response.data.payments)) {
            console.log(`✅ Found ${response.data.payments.length} payments (fallback structure)`)
            return response.data
          }
          // Another fallback - check if response itself has payments
          if (response && Array.isArray(response.payments)) {
            console.log(`✅ Found ${response.payments.length} payments (direct structure)`)
            return response
          }
          console.warn('⚠️ No payments found in response - returning empty array')
          console.warn('⚠️ Final response structure:', JSON.stringify(response?.data || response, null, 2))
          return { payments: [] }
        }
        
        // Fetch single customer payments
        console.log(`📡 Calling paymentAPI.getCustomerPayments for ${selectedBuyerId}...`)
        const response = await paymentAPI.getCustomerPayments(selectedBuyerId, { limit: 500 })
        console.log(`📥 Customer ${selectedBuyerId} payments response:`, response)
        
        const paymentsData = response.data?.data
        if (paymentsData && Array.isArray(paymentsData.payments)) {
          console.log(`✅ Found ${paymentsData.payments.length} payments for customer ${selectedBuyerId}`)
          return paymentsData
        }
        if (response.data && Array.isArray(response.data.payments)) {
          console.log(`✅ Found ${response.data.payments.length} payments (fallback structure)`)
          return response.data
        }
        console.warn('⚠️ No payments found for customer - returning empty array')
        return { payments: [] }
      } catch (error) {
        console.error('❌ Error fetching payment receipts:', error)
        console.error('❌ Error details:', error.response?.data)
        console.error('❌ Error status:', error.response?.status)
        throw error
      }
    },
    enabled: !!selectedBuyerId,
    retry: 1,
    staleTime: 10 * 1000 // 10 seconds
  })
  
  // Debug logging for query state
  console.log('📊 Payment Receipts Query State:', {
    status,
    isLoading: paymentReceiptsLoading,
    isFetching,
    isError,
    error: paymentReceiptsError,
    dataExists: !!paymentReceiptsData,
    paymentsCount: paymentReceiptsData?.payments?.length ?? 'N/A'
  })

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


  // Transform ledger data for Tab 0 (All Transactions)
  const allLedgerTransactions = useMemo(() => {
    if (!allLedgerData?.entries) {
      console.log('⚠ allLedgerTransactions: No ledger entries available')
      return []
    }
    
    console.log(`✓ allLedgerTransactions: Processing ${allLedgerData.entries.length} ledger entries`)

    let filteredEntries = allLedgerData.entries.filter(entry =>
      entry.transactionType === 'sale' ||
      entry.transactionType === 'receipt' ||
      entry.transactionType === 'adjustment'
    )
    
    console.log(`✓ Filtered to ${filteredEntries.length} transactions (sale/receipt/adjustment only)`)

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
  }, [allLedgerData])

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

  // Payment Receipts Transactions (from Payment model)
  const paymentReceiptsTransactions = useMemo(() => {
    if (!paymentReceiptsData?.payments) {
      console.log('⚠ paymentReceiptsTransactions: No payments data available')
      return []
    }
    
    console.log(`✓ paymentReceiptsTransactions: Processing ${paymentReceiptsData.payments.length} payment receipts`)
    
    return paymentReceiptsData.payments.map(payment => ({
      id: payment._id,
      paymentNumber: payment.paymentNumber,
      date: payment.createdAt || payment.paymentDate,
      totalAmount: payment.totalAmount,
      paymentMethod: payment.paymentMethod,
      paymentDirection: payment.paymentDirection || 'credit',
      debitReason: payment.debitReason || null,
      cashAmount: payment.cashAmount || 0,
      bankAmount: payment.bankAmount || 0,
      salesAffected: payment.distributions?.filter(d => !d.isAdvance).length || 0,
      advanceAmount: payment.advanceAmount || 0,
      balanceBefore: payment.balanceBefore,
      balanceAfter: payment.balanceAfter,
      status: payment.status,
      createdBy: payment.createdBy?.name || 'Unknown',
      description: payment.description || '-',
      reversalInfo: payment.reversalInfo,
      customerName: payment.customerId?.name || payment.customerId?.company || 'Unknown',
      customerId: payment.customerId?._id || payment.customerId,
      raw: payment
    }))
  }, [paymentReceiptsData])

  // Handle payment reversal
  const handleOpenReversalDialog = (payment) => {
    setSelectedPayment(payment)
    setReversalReason('')
    setReversalDialogOpen(true)
  }

  const handleReversePayment = async () => {
    if (!selectedPayment || !reversalReason.trim()) {
      toast.error('Please provide a reason for reversal')
      return
    }

    setIsReversing(true)
    try {
      await paymentAPI.reversePayment(selectedPayment.paymentNumber, reversalReason.trim())
      toast.success(`Payment ${selectedPayment.paymentNumber} has been reversed`)
      
      // Refresh data
      refetchPayments()
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
      queryClient.invalidateQueries({ queryKey: ['buyers'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      
      setReversalDialogOpen(false)
      setSelectedPayment(null)
      setReversalReason('')
    } catch (error) {
      console.error('Error reversing payment:', error)
      toast.error(error.response?.data?.message || 'Failed to reverse payment')
    } finally {
      setIsReversing(false)
    }
  }

  // Handle view/print receipt
  const handleViewReceipt = async (payment) => {
    setIsLoadingReceipt(true)
    try {
      const response = await paymentAPI.getPaymentReceipt(payment.paymentNumber)
      setReceiptData(response.data?.data)
      setReceiptDialogOpen(true)
    } catch (error) {
      console.error('Error fetching receipt:', error)
      toast.error('Failed to load receipt')
    } finally {
      setIsLoadingReceipt(false)
    }
  }

  // Print receipt function
  const handlePrintReceipt = () => {
    if (!receiptData) return

    const printWindow = window.open('', '_blank')
    const printContent = generateReceiptHTML(receiptData)
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  // Generate receipt HTML for printing
  const generateReceiptHTML = (receipt) => {
    const distributionRows = receipt.distributions
      .map(d => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${d.reference}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">£${d.amount.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${d.isAdvance ? 'Advance' : 'Applied'}</td>
        </tr>
      `).join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - ${receipt.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; }
          .receipt-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .info-box { background: #f5f5f5; padding: 15px; border-radius: 8px; }
          .info-box h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
          .info-box p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #333; color: white; padding: 10px; text-align: left; }
          .totals { margin-top: 20px; text-align: right; }
          .totals p { margin: 5px 0; }
          .totals .total { font-size: 18px; font-weight: bold; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; }
          .status-active { background: #dcfce7; color: #166534; }
          .status-reversed { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PAYMENT RECEIPT</h1>
          <p>KI Fashion</p>
        </div>
        
        <div class="receipt-info">
          <div class="info-box">
            <h3>Receipt Details</h3>
            <p><strong>Receipt #:</strong> ${receipt.receiptNumber}</p>
            <p><strong>Date:</strong> ${formatDateTime({ date: receipt.date })}</p>
            <p><strong>Payment Method:</strong> ${receipt.payment.paymentMethod.toUpperCase()}</p>
            <p><strong>Status:</strong> <span class="status-badge ${receipt.status === 'active' ? 'status-active' : 'status-reversed'}">${receipt.status.toUpperCase()}</span></p>
          </div>
          
          <div class="info-box">
            <h3>Customer Details</h3>
            <p><strong>${receipt.customer.name}</strong></p>
            ${receipt.customer.company ? `<p>${receipt.customer.company}</p>` : ''}
            ${receipt.customer.email ? `<p>${receipt.customer.email}</p>` : ''}
            ${receipt.customer.phone ? `<p>${receipt.customer.phone}</p>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th style="text-align: right;">Amount</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            ${distributionRows}
          </tbody>
        </table>

        <div class="totals">
          <p><strong>Balance Before:</strong> £${receipt.balances.before.toFixed(2)}</p>
          <p class="total"><strong>Total Received:</strong> £${receipt.payment.totalAmount.toFixed(2)}</p>
          <p><strong>Balance After:</strong> £${receipt.balances.after.toFixed(2)}</p>
        </div>

        ${receipt.notes ? `<p><strong>Notes:</strong> ${receipt.notes}</p>` : ''}

        ${receipt.reversal ? `
          <div style="margin-top: 20px; padding: 15px; background: #fee2e2; border-radius: 8px;">
            <p><strong>REVERSED</strong></p>
            <p>Date: ${formatDateTime({ date: receipt.reversal.reversedAt })}</p>
            <p>Reason: ${receipt.reversal.reason}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for your payment!</p>
          <p>Received by: ${receipt.createdBy}</p>
          <p>Generated: ${new Date().toLocaleString('en-GB')}</p>
        </div>
      </body>
      </html>
    `
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

  const paymentReceiptsColumns = useMemo(() => {
    const baseColumns = [
      { 
        header: "Receipt #", 
        accessor: "paymentNumber", 
        render: (row) => (
          <span className="font-mono font-medium text-blue-600">{row.paymentNumber}</span>
        )
      },
      { header: "Date", accessor: "date", render: (row) => formatDateTime({ date: row.date }) },
    ]

    // Add Customer column when viewing all customers
    if (selectedBuyerId === 'all') {
      baseColumns.push({
        header: "Customer",
        accessor: "customerName",
        render: (row) => (
          <span className="font-medium">{row.customerName}</span>
        )
      })
    }

    const remainingColumns = [
      { 
        header: "Type",
        accessor: "paymentDirection",
        render: (row) => (
          <Badge variant={row.paymentDirection === 'debit' ? 'destructive' : 'success'} className="capitalize">
            {row.paymentDirection === 'debit' ? 'Debit' : 'Credit'}
          </Badge>
        )
      },
      { 
        header: "Debit", 
        accessor: "debitAmount", 
        render: (row) => (
          <span className={row.paymentDirection === 'debit' ? "text-red-600 font-bold" : "text-muted-foreground"}>
            {row.paymentDirection === 'debit' ? `£${formatNumber(row.totalAmount)}` : '-'}
          </span>
        )
      },
      { 
        header: "Credit", 
        accessor: "creditAmount", 
        render: (row) => (
          <span className={row.paymentDirection !== 'debit' ? "text-green-600 font-bold" : "text-muted-foreground"}>
            {row.paymentDirection !== 'debit' ? `£${formatNumber(row.totalAmount)}` : '-'}
          </span>
        )
      },
      { 
        header: "Balance", 
        accessor: "balanceAfter", 
        render: (row) => (
          <span className={`font-bold tabular-nums ${row.balanceAfter > 0 ? 'text-red-600' : row.balanceAfter < 0 ? 'text-green-600' : ''}`}>
            £{formatNumber(Math.abs(row.balanceAfter))}
            {row.balanceAfter < 0 && <span className="text-xs ml-1">(CR)</span>}
          </span>
        )
      },
      { 
        header: "Method", 
        accessor: "paymentMethod", 
        render: (row) => (
          <Badge variant="outline" className="capitalize">{row.paymentMethod}</Badge>
        )
      },
      { 
        header: "Status", 
        accessor: "status", 
        render: (row) => (
          <Badge variant={row.status === 'active' ? 'success' : 'destructive'}>
            {row.status.toUpperCase()}
          </Badge>
        )
      },
      { header: "By", accessor: "createdBy", render: (row) => row.createdBy },
      {
        header: "Actions",
        accessor: "actions",
        render: (row) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewReceipt(row)}
              title="View/Print Receipt"
            >
              <Printer className="h-4 w-4" />
            </Button>
            {/* {row.status === 'active' && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={() => handleOpenReversalDialog(row)}
                title="Reverse Payment"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )} */}
          </div>
        )
      }
    ]

    return [...baseColumns, ...remainingColumns]
  }, [selectedBuyerId])

  // Calculate buyer balance map from ledger data for the modal
  const buyerBalanceMap = useMemo(() => {
    const balanceMap = {}
    
    // Use balance from dropdownBuyers (from API)
    if (dropdownBuyers && dropdownBuyers.length > 0) {
      for (const buyer of dropdownBuyers) {
        const buyerId = String(buyer._id || buyer.id)
        balanceMap[buyerId] = buyer.balance || 0
      }
    }
    
    return balanceMap
  }, [dropdownBuyers])

  // Get selected entity details
  const selectedEntity = useMemo(() => {
    if (!selectedBuyerId || selectedBuyerId === 'all') return null
    return dropdownBuyers.find(b => String(b.id || b._id) === selectedBuyerId)
  }, [selectedBuyerId, dropdownBuyers])

  // Print Payment Receipts Report
  const handlePrintPaymentReceiptsReport = () => {
    if (!paymentReceiptsTransactions.length) {
      toast.error('No payment receipts to print')
      return
    }

    const isAllCustomers = selectedBuyerId === 'all'
    const activePayments = paymentReceiptsTransactions.filter(p => p.status === 'active')
    const totalCredits = activePayments.filter(p => p.paymentDirection !== 'debit').reduce((sum, p) => sum + p.totalAmount, 0)
    const totalDebits = activePayments.filter(p => p.paymentDirection === 'debit').reduce((sum, p) => sum + p.totalAmount, 0)
    const netTotal = totalCredits - totalDebits
    const currentBalance = !isAllCustomers && activePayments.length > 0 ? activePayments[0].balanceAfter : 0

    const printWindow = window.open('', '_blank')
    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipts Report - ${isAllCustomers ? 'All Customers' : (selectedEntity?.name || 'Customer')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            max-width: 1100px; 
            margin: 0 auto; 
            padding: 30px;
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 3px solid #1e40af; 
            padding-bottom: 20px; 
          }
          .logo-section {
            margin-bottom: 15px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #1e40af;
            letter-spacing: 2px;
          }
          .company-name {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
          }
          .report-title { 
            font-size: 24px; 
            font-weight: bold;
            margin-top: 15px;
            color: #1e3a8a;
          }
          .report-subtitle {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
          }
          .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
            gap: 20px;
          }
          .info-box { 
            background: #f8fafc; 
            padding: 15px 20px; 
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            flex: 1;
          }
          .info-box h3 { 
            font-size: 11px; 
            color: #64748b; 
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          .info-box p { 
            margin: 4px 0; 
            font-size: 13px;
          }
          .info-box .highlight {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
          }
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          .summary-card {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            text-align: center;
          }
          .summary-card .label {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .summary-card .value {
            font-size: 20px;
            font-weight: bold;
          }
          .summary-card.green { border-color: #86efac; background: #f0fdf4; }
          .summary-card.green .value { color: #059669; }
          .summary-card.red { border-color: #fca5a5; background: #fef2f2; }
          .summary-card.red .value { color: #dc2626; }
          .summary-card.amber { border-color: #fcd34d; background: #fffbeb; }
          .summary-card.amber .value { color: #d97706; }
          .summary-card.blue { border-color: #93c5fd; background: #eff6ff; }
          .summary-card.blue .value { color: #1e40af; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            font-size: 11px;
          }
          th { 
            background: #1e40af; 
            color: white; 
            padding: 10px 6px; 
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.5px;
          }
          td {
            padding: 8px 6px;
            border-bottom: 1px solid #e2e8f0;
          }
          tr:nth-child(even) {
            background: #f8fafc;
          }
          tr:hover {
            background: #f1f5f9;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .text-green { color: #059669; }
          .text-red { color: #dc2626; }
          .text-muted { color: #94a3b8; }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .badge-credit { background: #dcfce7; color: #166534; }
          .badge-debit { background: #fee2e2; color: #991b1b; }
          .badge-active { background: #dbeafe; color: #1e40af; }
          .badge-reversed { background: #fef3c7; color: #92400e; }
          .summary-section {
            margin-top: 30px;
            padding: 20px;
            background: #f0f9ff;
            border-radius: 8px;
            border: 1px solid #bae6fd;
          }
          .summary-title {
            font-size: 14px;
            font-weight: bold;
            color: #0369a1;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(${isAllCustomers ? '3' : '4'}, 1fr);
            gap: 15px;
          }
          .summary-item {
            text-align: center;
            padding: 10px;
            background: white;
            border-radius: 6px;
          }
          .summary-item .label {
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .summary-item .value {
            font-size: 18px;
            font-weight: bold;
          }
          .footer { 
            margin-top: 40px; 
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center; 
            color: #94a3b8; 
            font-size: 11px; 
          }
          @media print { 
            body { padding: 15px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <div class="logo">KI FASHION</div>
            <div class="company-name">Fashion & Textile Solutions</div>
          </div>
          <div class="report-title">PAYMENT RECEIPTS REPORT</div>
          <div class="report-subtitle">${isAllCustomers ? 'All Customers - Summary Report' : 'Statement of Account Transactions'}</div>
        </div>
        
        ${isAllCustomers ? `
        <!-- Summary Cards for All Customers -->
        <div class="summary-cards">
          <div class="summary-card green">
            <div class="label">Total Credits (Received)</div>
            <div class="value">£${formatNumber(totalCredits)}</div>
          </div>
          <div class="summary-card red">
            <div class="label">Total Debits (Issued)</div>
            <div class="value">£${formatNumber(totalDebits)}</div>
          </div>
          <div class="summary-card blue">
            <div class="label">Net Amount</div>
            <div class="value">£${formatNumber(Math.abs(netTotal))}</div>
          </div>
          <div class="summary-card amber">
            <div class="label">Total Transactions</div>
            <div class="value">${paymentReceiptsTransactions.length}</div>
          </div>
        </div>
        ` : `
        <div class="info-section">
          <div class="info-box">
            <h3>Customer Details</h3>
            <p><strong>${selectedEntity?.name || 'N/A'}</strong></p>
            ${selectedEntity?.company ? `<p>${selectedEntity.company}</p>` : ''}
            ${selectedEntity?.email ? `<p>${selectedEntity.email}</p>` : ''}
            ${selectedEntity?.phone ? `<p>${selectedEntity.phone}</p>` : ''}
          </div>
          
          <div class="info-box">
            <h3>Report Period</h3>
            <p>All Transactions</p>
            <p class="highlight">${paymentReceiptsTransactions.length} Records</p>
          </div>
          
          <div class="info-box">
            <h3>Current Balance</h3>
            <p class="highlight ${currentBalance > 0 ? 'text-red' : 'text-green'}">
              £${formatNumber(Math.abs(currentBalance))}
              ${currentBalance < 0 ? ' (Credit)' : currentBalance > 0 ? ' (Due)' : ''}
            </p>
          </div>
        </div>
        `}

        <table>
          <thead>
            <tr>
              <th>Receipt #</th>
              <th>Date</th>
              ${isAllCustomers ? '<th>Customer</th>' : ''}
              <th class="text-center">Type</th>
              <th class="text-right">Debit</th>
              <th class="text-right">Credit</th>
              <th class="text-right">Balance</th>
              <th class="text-center">Method</th>
              <th class="text-center">Status</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            ${paymentReceiptsTransactions.map(row => `
              <tr>
                <td><strong>${row.paymentNumber}</strong></td>
                <td>${formatDateTime({ date: row.date })}</td>
                ${isAllCustomers ? `<td>${row.customerName}</td>` : ''}
                <td class="text-center">
                  <span class="badge ${row.paymentDirection === 'debit' ? 'badge-debit' : 'badge-credit'}">
                    ${row.paymentDirection === 'debit' ? 'Debit' : 'Credit'}
                  </span>
                </td>
                <td class="text-right ${row.paymentDirection === 'debit' ? 'text-red font-bold' : 'text-muted'}">
                  ${row.paymentDirection === 'debit' ? '£' + formatNumber(row.totalAmount) : '-'}
                </td>
                <td class="text-right ${row.paymentDirection !== 'debit' ? 'text-green font-bold' : 'text-muted'}">
                  ${row.paymentDirection !== 'debit' ? '£' + formatNumber(row.totalAmount) : '-'}
                </td>
                <td class="text-right font-bold ${row.balanceAfter > 0 ? 'text-red' : row.balanceAfter < 0 ? 'text-green' : ''}">
                  £${formatNumber(Math.abs(row.balanceAfter))}${row.balanceAfter < 0 ? ' (CR)' : ''}
                </td>
                <td class="text-center" style="text-transform: capitalize;">${row.paymentMethod}</td>
                <td class="text-center">
                  <span class="badge ${row.status === 'active' ? 'badge-active' : 'badge-reversed'}">
                    ${row.status}
                  </span>
                </td>
                <td>${row.createdBy}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary-section">
          <div class="summary-title">Summary</div>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="label">Total Credits (Received)</div>
              <div class="value text-green">£${formatNumber(totalCredits)}</div>
            </div>
            <div class="summary-item">
              <div class="label">Total Debits (Issued)</div>
              <div class="value text-red">£${formatNumber(totalDebits)}</div>
            </div>
            <div class="summary-item">
              <div class="label">Net Amount</div>
              <div class="value ${netTotal >= 0 ? 'text-green' : 'text-red'}">£${formatNumber(Math.abs(netTotal))}</div>
            </div>
            ${!isAllCustomers ? `
            <div class="summary-item">
              <div class="label">Current Balance</div>
              <div class="value ${currentBalance > 0 ? 'text-red' : 'text-green'}">£${formatNumber(Math.abs(currentBalance))}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="footer">
          <p>This is a computer-generated report and does not require a signature.</p>
          <p>Generated on: ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}</p>
          <p>KI Fashion - All Rights Reserved</p>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(reportHTML)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  // Calculate current buyer's ledger balance from transactions
  const currentBuyerLedgerBalance = useMemo(() => {
    if (allLedgerTransactions.length > 0) {
      return allLedgerTransactions[0].balance || 0
    }
    return buyerDetails?.balance || 0
  }, [allLedgerTransactions, buyerDetails])

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
        <Button onClick={() => setPaymentModalOpen(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Payment
        </Button>
      </div>
      </header>

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
                    {buyersError ? (
                      <div className="text-sm text-red-600 p-2 bg-red-50 rounded border border-red-200">
                        Error loading customers: {buyersError.message}
                      </div>
                    ) : (
                      <Combobox
                        options={comboboxOptions}
                        value={selectedBuyerId}
                        onValueChange={setSelectedBuyerId}
                        placeholder="Search Customer..."
                        searchPlaceholder="Type customer name..."
                        loading={buyersLoading}
                      />
                    )}
                  </div>
                </div>


                {!selectedBuyerId ? (
                  <div className="bg-white rounded-lg border p-12 text-center text-muted-foreground">
                    <p>Select a customer to view their ledger.</p>
                  </div>
                ) : (
                  <>
                    {/* Stats if specific customer selected */}
                    {selectedBuyerId !== 'all' && buyerDetails && (
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

                    {/* Summary stats for all customers */}
                    {selectedBuyerId === 'all' && allLedgerTransactions.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-red-50 rounded-lg p-6 border border-red-100">
                          <p className="text-sm text-red-700">Total Sales (Debit)</p>
                          <p className="text-2xl font-bold text-red-600">
                            {formatNumber(allLedgerTransactions.reduce((sum, t) => sum + t.debit, 0))}
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-6 border border-green-100">
                          <p className="text-sm text-green-700">Total Received (Credit)</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatNumber(allLedgerTransactions.reduce((sum, t) => sum + t.credit, 0))}
                          </p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                          <p className="text-sm text-blue-700">Total Transactions</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {allLedgerTransactions.length}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Table */}
                    <div className="bg-white rounded-lg border">
                      {allLedgerLoading ? (
                        <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
                      ) : allLedgerTransactions.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                          <p>No ledger entries found{selectedBuyerId === 'all' ? '' : ' for this customer'}.</p>
                        </div>
                      ) : (
                        <DataTable
                          columns={allLedgerColumns}
                          data={allLedgerTransactions}
                          paginate={false}
                          searchKey="reference"
                          disableSorting
                        />
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
                  <div className="bg-white rounded-lg border">
                    {paymentHistoryLoading ? (
                      <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>
                    ) : (
                      <DataTable columns={paymentHistoryColumns} data={paymentHistoryTransactions} paginate={false} />
                    )}
                  </div>
                )}
              </div>
            )
          },
          {
            label: "Payment Receipts",
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


                {/* Stats - shown for both single customer and all customers view */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <p className="text-sm text-green-700">Total Credits (Received)</p>
                    <p className="text-2xl font-bold text-green-700">
                      £{formatNumber(
                        paymentReceiptsTransactions
                          .filter(p => p.status === 'active' && p.paymentDirection !== 'debit')
                          .reduce((sum, p) => sum + p.totalAmount, 0)
                      )}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                    <p className="text-sm text-red-700">Total Debits (Issued)</p>
                    <p className="text-2xl font-bold text-red-700">
                      £{formatNumber(
                        paymentReceiptsTransactions
                          .filter(p => p.status === 'active' && p.paymentDirection === 'debit')
                          .reduce((sum, p) => sum + p.totalAmount, 0)
                      )}
                    </p>
                  </div>
     
                  {selectedBuyerId && selectedBuyerId !== 'all' ? (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <p className="text-sm text-blue-700">Current Balance</p>
                      <p className={`text-2xl font-bold ${
                        paymentReceiptsTransactions[0]?.balanceAfter > 0 ? 'text-red-600' : 
                        paymentReceiptsTransactions[0]?.balanceAfter < 0 ? 'text-green-600' : 'text-blue-700'
                      }`}>
                        £{formatNumber(Math.abs(paymentReceiptsTransactions[0]?.balanceAfter || 0))}
                        {paymentReceiptsTransactions[0]?.balanceAfter < 0 && (
                          <span className="text-sm font-normal ml-1">(Credit)</span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <p className="text-sm text-blue-700">Total Transactions</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {paymentReceiptsTransactions.length}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg border">
                  {paymentReceiptsLoading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>
                  ) : paymentReceiptsError ? (
                    <div className="p-12 text-center text-red-500">
                      <X className="h-12 w-12 mx-auto mb-4" />
                      <p className="font-medium">Error loading payment receipts</p>
                      <p className="text-sm mt-2 text-muted-foreground">
                        {paymentReceiptsError.response?.data?.message || paymentReceiptsError.message || 'Failed to fetch data'}
                      </p>
                      <Button 
                        onClick={() => refetchPayments()} 
                        variant="outline" 
                        className="mt-4"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                    </div>
                  ) : paymentReceiptsTransactions.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>No payment receipts found{selectedBuyerId && selectedBuyerId !== 'all' ? ' for this customer' : ''}.</p>
                      <p className="text-sm mt-2">Add a payment to create a receipt.</p>
                    </div>
                  ) : (
                    <DataTable 
                      columns={paymentReceiptsColumns} 
                      data={paymentReceiptsTransactions}
                      paginate={false}
                    />
                  )}
                </div>
              </div>
            )
          }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Payment Dialog - Enhanced */}
      <CustomerPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        entityId={selectedBuyerId !== 'all' ? selectedBuyerId : ''}
        entityName={
          selectedBuyerId !== 'all'
            ? (dropdownBuyers.find(b => String(b.id) === selectedBuyerId)?.name ||
              dropdownBuyers.find(b => String(b.id) === selectedBuyerId)?.company ||
              'Customer')
            : ''
        }
        totalBalance={
          selectedBuyerId !== 'all'
            ? Math.abs(dropdownBuyers.find(b => String(b.id) === selectedBuyerId)?.balance || 0)
            : 0
        }
        ledgerBalance={currentBuyerLedgerBalance}
        ledgerBalanceBuyerId={selectedBuyerId !== 'all' ? selectedBuyerId : null}
        buyerBalanceMap={buyerBalanceMap}
        entities={dropdownBuyers}
        allLedgerData={allLedgerData}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['ledger'] })
          queryClient.invalidateQueries({ queryKey: ['buyers'] })
          queryClient.invalidateQueries({ queryKey: ['payments'] })
          refetchPayments()
        }}
      />

      {/* Reversal Confirmation Dialog */}
      <Dialog open={reversalDialogOpen} onOpenChange={setReversalDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" className="sm:max-w-[500px]">
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
