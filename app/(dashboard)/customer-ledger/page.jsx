// "use client"

// import { useState, useMemo, useEffect } from "react"
// import Link from "next/link"
// import { useRouter, useSearchParams } from "next/navigation"
// import BackButton from "@/components/BackButton"
// import { Button } from "@/components/ui/button"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Combobox } from "@/components/ui/combobox"
// import { Label } from "@/components/ui/label"
// import { Input } from "@/components/ui/input"
// import DataTable from "../../../components/data-table"
// import { useBuyers, useBuyer } from "@/lib/hooks/useBuyers"
// import { useBuyerLedger, useAllBuyerLedgers } from "@/lib/hooks/useLedger"
// import { ledgerAPI } from "@/lib/api/endpoints/ledger"
// import { paymentAPI } from "@/lib/api/endpoints/payments"
// import { salesAPI } from "@/lib/api/endpoints/sales"
// import { useQuery, useQueryClient } from "@tanstack/react-query"
// import { Loader2, FileText, Users, Search, Filter, TrendingUp, Clock, Plus, CheckCircle2, Printer, RotateCcw, Receipt, X } from "lucide-react"
// import { useAuthStore } from "@/store/store"
// import DeleteRequestDialog from "@/components/modals/DeleteRequestDialog"
// import { Badge } from "@/components/ui/badge"
// import toast from "react-hot-toast"
// import Tabs from "@/components/tabs"
// import CustomerPaymentModal from "@/components/modals/CustomerPaymentModal"
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
//   DialogDescription
// } from "@/components/ui/dialog"
// import { Textarea } from "@/components/ui/textarea"

// function formatNumber(n) {
//   const num = Number(n || 0)
//   return num.toFixed(2)
// }

// function formatDateTime(_date) {
//   const dateTime = _date.date || _date.createdAt;
//   if (!dateTime) return "-";
//   const d = new Date(dateTime);
//   const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
//   const date = d.toLocaleDateString('en-GB');
//   return `${date} ${time}`;
// }

// export default function CustomerLedgerPage() {
//   const [selectedBuyerId, setSelectedBuyerId] = useState("all")
//   const [ledgerBuyerFilter, setLedgerBuyerFilter] = useState("")
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const initialTab = Number(searchParams.get("tab") ?? 0);
//   const [activeTab, setActiveTab] = useState(initialTab);
//   const handleTabChange = (idx) => {
//     setActiveTab(idx);
//     if (router) router.replace(`/customer-ledger?tab=${idx}`, { scroll: false });
//   };
//   const [paymentModalOpen, setPaymentModalOpen] = useState(false)

//   // Reversal dialog state
//   const [reversalDialogOpen, setReversalDialogOpen] = useState(false)
//   const [selectedPayment, setSelectedPayment] = useState(null)
//   const [reversalReason, setReversalReason] = useState('')
//   const [isReversing, setIsReversing] = useState(false)

//   // Receipt dialog state
//   const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
//   const [receiptData, setReceiptData] = useState(null)
//   const [isLoadingReceipt, setIsLoadingReceipt] = useState(false)

//   // Auth and reversal request state
//   const user = useAuthStore((s) => s.user)
//   const isSuperAdmin = user?.role === "super-admin"
//   const [reverseRequestTarget, setReverseRequestTarget] = useState(null)

//   // Filters for Payment History Tab
//   const [paymentHistoryDateFrom, setPaymentHistoryDateFrom] = useState("")
//   const [paymentHistoryDateTo, setPaymentHistoryDateTo] = useState("")
//   const [paymentHistoryMethodFilter, setPaymentHistoryMethodFilter] = useState("all")

//   const queryClient = useQueryClient()

//   // Auto-select buyer from URL query param (e.g. navigating from Receivables report)
//   useEffect(() => {
//     const buyerId = searchParams.get('buyerId')
//     if (buyerId) {
//       setSelectedBuyerId(buyerId)
//     }
//   }, [searchParams])

//   // Fetch active buyers for dropdowns
//   const { data: buyers = [], isLoading: buyersLoading, error: buyersError } = useBuyers({ limit: 500 })
//   const dropdownBuyers = buyers


//   const comboboxOptions = useMemo(() => {
//     const options = dropdownBuyers.map(b => ({
//       value: b.id,
//       label: `${b.name}${b.company ? ` (${b.company})` : ''}`,
//     }))
//     // Add "All Customers" option at the beginning
//     return [{ value: 'all', label: 'All Buyers' }, ...options]
//   }, [dropdownBuyers])

//   // Fetch ledger entries for Tab 0 (when buyer selected)
//   const ledgerFilterParams = useMemo(() => {
//     if (!selectedBuyerId) {
//       return null
//     }
//     // When 'all' is selected, fetch all entries without buyerId filter
//     if (selectedBuyerId === 'all') {
//       return { limit: 500 }
//     }
//     return { buyerId: selectedBuyerId, limit: 100 }
//   }, [selectedBuyerId])

//   const { data: allLedgerData, isLoading: allLedgerLoading } = useAllBuyerLedgers(ledgerFilterParams || {})

//   // Fetch selected buyer details
//   const { data: buyerDetails, isLoading: buyerDetailsLoading } = useBuyer(
//     selectedBuyerId && selectedBuyerId !== 'all' ? selectedBuyerId : ''
//   )

//   // Fetch unpaid sales for Tab 2
//   const { data: unpaidSales = [], isLoading: unpaidSalesLoading } = useQuery({
//     queryKey: ['unpaid-sales', selectedBuyerId],
//     queryFn: async () => {
//       if (!selectedBuyerId || selectedBuyerId === 'all') return []
//       // Fetch all sales for buyer then filter for pending/partial
//       const response = await salesAPI.getAll({
//         buyer: selectedBuyerId,
//         limit: 1000
//       })
//       const sales = response?.data?.data || response?.data || []
//       return sales.filter(s => s.paymentStatus === 'pending' || s.paymentStatus === 'partial')
//     },
//     enabled: !!selectedBuyerId && selectedBuyerId !== 'all'
//   })

//   // Payment History Data (Tab 3)
//   const paymentHistoryParams = useMemo(() => {
//     if (!selectedBuyerId) return null
//     if (selectedBuyerId === 'all') return { limit: 500 }
//     return { buyerId: selectedBuyerId, limit: 100 }
//   }, [selectedBuyerId])

//   const { data: paymentHistoryData, isLoading: paymentHistoryLoading } = useAllBuyerLedgers(paymentHistoryParams || {})

//   // Payment Receipts Data (Tab 2) - Using new Payment model
//   const { data: paymentReceiptsData, isLoading: paymentReceiptsLoading, refetch: refetchPayments, error: paymentReceiptsError, isError, isFetching, status } = useQuery({
//     queryKey: ['payments', 'customer', selectedBuyerId],
//     queryFn: async () => {

//       if (!selectedBuyerId) {
//         return { payments: [] }
//       }

//       try {
//         if (selectedBuyerId === 'all') {
//           // Fetch all customer payments
//           const response = await paymentAPI.getAllPayments({ limit: 1000 })

//           // Response structure from backend: { data: { success: true, data: { payments: [], pagination: {} } } }
//           // axios wraps it in response.data
//           const paymentsData = response.data?.data
//           if (paymentsData && Array.isArray(paymentsData.payments)) {
//             return paymentsData
//           }
//           // Fallback for different response structure
//           if (response.data && Array.isArray(response.data.payments)) {
//             return response.data
//           }
//           // Another fallback - check if response itself has payments
//           if (response && Array.isArray(response.payments)) {
//             return response
//           }
//           return { payments: [] }
//         }

//         // Fetch single customer payments
//         const response = await paymentAPI.getCustomerPayments(selectedBuyerId, { limit: 500 })

//         const paymentsData = response.data?.data
//         if (paymentsData && Array.isArray(paymentsData.payments)) {
//           return paymentsData
//         }
//         if (response.data && Array.isArray(response.data.payments)) {
//           return response.data
//         }
//         return { payments: [] }
//       } catch (error) {
//         throw error
//       }
//     },
//     enabled: !!selectedBuyerId,
//     retry: 1,
//     staleTime: 10 * 1000 // 10 seconds
//   })

//   // --- Calculations ---

//   // Calculate totals for Pending Payments tab
//   const pendingTotals = useMemo(() => {
//     const totalPending = unpaidSales.reduce((sum, sale) => {
//       const paid = (sale.cashPayment || 0) + (sale.bankPayment || 0)
//       const remaining = sale.grandTotal - paid
//       return sum + Math.max(0, remaining)
//     }, 0)

//     // Total paid on these specific unpaid orders (partial payments)
//     const totalPaidOnPending = unpaidSales.reduce((sum, sale) => {
//       return sum + (sale.cashPayment || 0) + (sale.bankPayment || 0)
//     }, 0)

//     return { totalPending, totalPaidOnPending }
//   }, [unpaidSales])


//   // Transform ledger data for Tab 0 (All Transactions)
//   const allLedgerTransactions = useMemo(() => {
//     if (!allLedgerData?.entries) {
//       return []
//     }


//     let filteredEntries = allLedgerData.entries.filter(entry =>
//       entry.transactionType === 'sale' ||
//       entry.transactionType === 'receipt' ||
//       entry.transactionType === 'adjustment' ||
//       entry.transactionType === 'return'
//     )


//     const mappedItems = filteredEntries.map(entry => {
//       const buyer = entry.entityId || {}
//       let typeLabel = entry.transactionType || '-'

//       if (entry.transactionType === 'receipt') {
//         typeLabel = `Receipt - ${entry.paymentMethod === 'bank' ? 'Bank' : 'Cash'}`
//       } else if (entry.transactionType === 'sale') {
//         typeLabel = 'Sale'
//       } else if (entry.transactionType === 'return') {
//         typeLabel = 'Return'
//       }

//       // Readable Reference
//       let readableReference = '-'
//       if (entry.referenceId) {
//         if (typeof entry.referenceId === 'object' && entry.referenceId !== null) {
//           readableReference = entry.referenceId.saleNumber || entry.referenceId.invoiceNumber || entry.referenceId._id || '-'
//         } else {
//           readableReference = entry.referenceId.toString()
//         }
//       } else if (entry.reference || entry.referenceNumber) {
//         readableReference = entry.reference || entry.referenceNumber
//       }

//       const cashPaid = (entry.transactionType === 'receipt' && entry.paymentMethod === 'cash') ? (entry.credit || 0) : 0
//       const bankPaid = (entry.transactionType === 'receipt' && entry.paymentMethod === 'bank') ? (entry.credit || 0) : 0
//       const returnAmount = entry.transactionType === 'return' ? (entry.credit || 0) : 0

//       return {
//         id: entry._id || entry.id,
//         date: entry.date || entry.createdAt,
//         createdAt: entry.createdAt,
//         buyer: buyer.name || buyer.company || 'Unknown Customer',
//         type: typeLabel,
//         transactionType: entry.transactionType,
//         description: entry.description || entry.notes || '-',
//         debit: Number(entry.debit) || 0, // Sale (We sold, they owe us)
//         credit: Number(entry.credit) || 0, // Receipt (They paid, we received)
//         cashPaid,
//         bankPaid,
//         returnAmount,
//         balance: 0,
//         reference: readableReference,
//         referenceId: (entry.referenceId && typeof entry.referenceId === 'object') ? entry.referenceId._id : entry.referenceId,
//         paymentMethod: entry.paymentMethod,
//         raw: entry
//       }
//     })

//     // Sort by createdAt ASC for running balance
//     mappedItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

//     // Calculate Running Balance
//     let runningBalance = 0
//     for (const entry of mappedItems) {
//       runningBalance = runningBalance + entry.debit - entry.credit
//       entry.balance = runningBalance
//     }

//     // Reverse to show newest first
//     return mappedItems.reverse()
//   }, [allLedgerData])

//   // Payment History Transactions (Tab 3)
//   const paymentHistoryTransactions = useMemo(() => {
//     if (!paymentHistoryData?.entries) return []

//     let filtered = paymentHistoryData.entries.filter(entry => entry.transactionType === 'receipt')

//     if (paymentHistoryDateFrom) {
//       const fromDate = new Date(paymentHistoryDateFrom)
//       filtered = filtered.filter(entry => new Date(entry.date) >= fromDate)
//     }
//     if (paymentHistoryDateTo) {
//       const toDate = new Date(paymentHistoryDateTo)
//       toDate.setHours(23, 59, 59, 999)
//       filtered = filtered.filter(entry => new Date(entry.date) <= toDate)
//     }
//     if (paymentHistoryMethodFilter !== 'all') {
//       filtered = filtered.filter(entry => entry.paymentMethod === paymentHistoryMethodFilter)
//     }

//     return filtered.map(entry => {
//       // Readable Reference
//       let reference = '-'
//       if (entry.referenceId) {
//         if (typeof entry.referenceId === 'object' && entry.referenceId !== null) {
//           reference = entry.referenceId.saleNumber || entry.referenceId._id || '-'
//         } else {
//           reference = entry.referenceId.toString()
//         }
//       }

//       const buyer = entry.entityId || {}

//       return {
//         id: entry._id || entry.id,
//         date: entry.date || entry.createdAt,
//         createdAt: entry.createdAt,
//         buyer: buyer.name || buyer.company || 'Unknown Customer',
//         reference,
//         paymentMethod: entry.paymentMethod || 'cash',
//         amount: entry.credit || 0,
//         madeBy: entry.createdBy?.name || 'Unknown',
//         notes: entry.description || '-',
//         entryNumber: entry.entryNumber || '-',
//         raw: entry
//       }
//     })
//   }, [paymentHistoryData, paymentHistoryDateFrom, paymentHistoryDateTo, paymentHistoryMethodFilter])

//   // Payment Receipts Transactions (from Payment model)
//   const paymentReceiptsTransactions = useMemo(() => {
//     if (!paymentReceiptsData?.payments) {
//       return []
//     }


//     return paymentReceiptsData.payments.map(payment => ({
//       id: payment._id,
//       paymentNumber: payment.paymentNumber,
//       date: payment.createdAt || payment.paymentDate,
//       totalAmount: payment.totalAmount,
//       paymentMethod: payment.paymentMethod,
//       paymentDirection: payment.paymentDirection || 'credit',
//       debitReason: payment.debitReason || null,
//       cashAmount: payment.cashAmount || 0,
//       bankAmount: payment.bankAmount || 0,
//       salesAffected: payment.distributions?.filter(d => !d.isAdvance).length || 0,
//       advanceAmount: payment.advanceAmount || 0,
//       distributions: payment.distributions || [],
//       balanceBefore: payment.balanceBefore,
//       balanceAfter: payment.balanceAfter,
//       status: payment.status,
//       createdBy: payment.createdBy?.name || 'Unknown',
//       description: payment.description || '-',
//       reversalInfo: payment.reversalInfo,
//       customerName: payment.customerId?.name || payment.customerId?.company || 'Unknown',
//       customerId: payment.customerId?._id || payment.customerId,
//       raw: payment
//     }))
//   }, [paymentReceiptsData])

//   // Handle payment reversal
//   const handleOpenReversalDialog = (payment) => {
//     setSelectedPayment(payment)
//     setReversalReason('')
//     setReversalDialogOpen(true)
//   }

//   const handleReversePayment = async () => {
//     if (!selectedPayment || !reversalReason.trim()) {
//       toast.error('Please provide a reason for deletion')
//       return
//     }

//     setIsReversing(true)
//     try {
//       await paymentAPI.reversePayment(selectedPayment.paymentNumber, reversalReason.trim())
//       toast.success(`Payment ${selectedPayment.paymentNumber} has been deleted`)

//       // Refresh data
//       refetchPayments()
//       queryClient.invalidateQueries({ queryKey: ['ledger'] })
//       queryClient.invalidateQueries({ queryKey: ['buyers'] })
//       queryClient.invalidateQueries({ queryKey: ['sales'] })

//       setReversalDialogOpen(false)
//       setSelectedPayment(null)
//       setReversalReason('')
//     } catch (error) {
//       console.error('Error reversing payment:', error)
//       toast.error(error.response?.data?.message || 'Failed to reverse payment')
//     } finally {
//       setIsReversing(false)
//     }
//   }

//   // Handle view/print receipt
//   const handleViewReceipt = async (payment) => {
//     setIsLoadingReceipt(true)
//     try {
//       const response = await paymentAPI.getPaymentReceipt(payment.paymentNumber)
//       setReceiptData(response.data?.data)
//       setReceiptDialogOpen(true)
//     } catch (error) {
//       console.error('Error fetching receipt:', error)
//       toast.error('Failed to load receipt')
//     } finally {
//       setIsLoadingReceipt(false)
//     }
//   }

//   // Print receipt function
//   const handlePrintReceipt = () => {
//     if (!receiptData) return

//     const printWindow = window.open('', '_blank')
//     const printContent = generateReceiptHTML(receiptData)
//     printWindow.document.write(printContent)
//     printWindow.document.close()
//     printWindow.focus()
//     setTimeout(() => {
//       printWindow.print()
//     }, 250)
//   }

//   // Generate receipt HTML for printing
//   const generateReceiptHTML = (receipt) => {
//     const distributionRows = receipt.distributions
//       .map(d => `
//         <tr>
//           <td style="padding: 8px; border-bottom: 1px solid #eee;">${d.reference}</td>
//           <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${d.amount.toFixed(2)}</td>
//           <td style="padding: 8px; border-bottom: 1px solid #eee;">${d.isAdvance ? 'Advance' : 'Applied'}</td>
//         </tr>
//       `).join('')

//     return `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <title>Payment Receipt - ${receipt.receiptNumber}</title>
//         <style>
//           @page {
//             size: A4;
//             margin: 15mm;
//           }
//           body { 
//             font-family: 'Segoe UI', Arial, sans-serif; 
//             width: 100%; 
//             margin: 0; 
//             padding: 0; 
//             color: #333;
//             line-height: 1.5;
//           }
//           .receipt-container {
//             max-width: 180mm;
//             margin: 0 auto;
//           }
//           .header { 
//             text-align: center; 
//             margin-bottom: 25px; 
//             border-bottom: 2px solid #1e40af; 
//             padding-bottom: 15px; 
//           }
//           .header h1 { margin: 0; font-size: 24px; color: #1e40af; }
//           .header p { margin: 5px 0; color: #666; font-weight: 600; }

//           .receipt-info { 
//             display: grid; 
//             grid-template-columns: 1fr 1fr; 
//             gap: 20px; 
//             margin-bottom: 20px; 
//           }
//           .info-box { 
//             background: #f8fafc; 
//             padding: 15px; 
//             border-radius: 8px; 
//             border: 1px solid #e2e8f0;
//           }
//           .info-box h3 { 
//             margin: 0 0 10px 0; 
//             font-size: 11px; 
//             color: #64748b; 
//             text-transform: uppercase;
//             letter-spacing: 0.05em;
//           }
//           .info-box p { margin: 4px 0; font-size: 13px; }

//           table { width: 100%; border-collapse: collapse; margin: 20px 0; }
//           th { background: #1e40af; color: white; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
//           td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }

//           .totals { margin-top: 15px; display: flex; flex-direction: column; align-items: flex-end; }
//           .totals-table { width: 250px; }
//           .totals-table td { padding: 5px 0; border: none; }
//           .totals-table td:last-child { text-align: right; font-weight: 700; }
//           .total-row { border-top: 2px solid #1e40af !important; font-size: 16px !important; }

//           .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; }
//           .status-active { background: #dcfce7; color: #166534; }
//           .status-reversed { background: #fee2e2; color: #991b1b; }

//           .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
//           @media print { body { padding: 0; } }
//         </style>
//       </head>
//       <body>
//         <div class="receipt-container">
//           <div class="header">
//             <h1>PAYMENT RECEIPT</h1>
//             <p>KI Fashion BMS</p>
//           </div>

//         <div class="receipt-info">
//           <div class="info-box">
//             <h3>Receipt Details</h3>
//             <p><strong>Receipt #:</strong> ${receipt.receiptNumber}</p>
//             <p><strong>Date:</strong> ${formatDateTime({ date: receipt.date })}</p>
//             <p><strong>Payment Method:</strong> ${receipt.payment.paymentMethod.toUpperCase()}</p>
//             <p><strong>Status:</strong> <span class="status-badge ${receipt.status === 'active' ? 'status-active' : 'status-reversed'}">${receipt.status.toUpperCase()}</span></p>
//           </div>

//           <div class="info-box">
//             <h3>Customer Details</h3>
//             <p><strong>${receipt.customer.name}</strong></p>
//             ${receipt.customer.company ? `<p>${receipt.customer.company}</p>` : ''}
//             ${receipt.customer.email ? `<p>${receipt.customer.email}</p>` : ''}
//             ${receipt.customer.phone ? `<p>${receipt.customer.phone}</p>` : ''}
//           </div>
//         </div>

//         <table>
//           <thead>
//             <tr>
//               <th>Reference</th>
//               <th style="text-align: right;">Amount</th>
//               <th>Type</th>
//             </tr>
//           </thead>
//           <tbody>
//             ${distributionRows}
//           </tbody>
//         </table>

//         </div>

//         <div class="totals">
//           <table class="totals-table">
//             <tr>
//               <td>Balance Before:</td>
//               <td>${receipt.balances.before.toFixed(2)}</td>
//             </tr>
//             <tr class="total-row">
//               <td>Total Received:</td>
//               <td>${receipt.payment.totalAmount.toFixed(2)}</td>
//             </tr>
//             <tr>
//               <td>Balance After:</td>
//               <td>${receipt.balances.after.toFixed(2)}</td>
//             </tr>
//           </table>
//         </div>

//         ${receipt.notes ? `<p><strong>Notes:</strong> ${receipt.notes}</p>` : ''}

//         ${receipt.reversal ? `
//           <div style="margin-top: 20px; padding: 15px; background: #fee2e2; border-radius: 8px;">
//             <p><strong>REVERSED</strong></p>
//             <p>Date: ${formatDateTime({ date: receipt.reversal.reversedAt })}</p>
//             <p>Reason: ${receipt.reversal.reason}</p>
//           </div>
//         ` : ''}

//         <div class="footer">
//           <p>Thank you for your payment!</p>
//           <p>Received by: ${receipt.createdBy}</p>
//           <p>Generated: ${new Date().toLocaleString('en-GB')}</p>
//         </div>
//       </body>
//       </html>
//     `
//   }


//   // --- Columns ---

//   const allLedgerColumns = useMemo(() => [
//     { header: "Entry #", accessor: "entryNumber", render: (row) => <span className="font-medium">{row.raw.entryNumber || '-'}</span> },
//     { header: "Date", accessor: "date", render: (row) => formatDateTime(row) },
//     { header: "Customer", accessor: "buyer", render: (row) => <span className="font-medium">{row.buyer}</span> },
//     { header: "Type", accessor: "type", render: (row) => <span>{row.type}</span> },
//     {
//       header: "Reference", accessor: "reference", render: (row) => (
//         row.referenceId && row.transactionType !== 'return' ? <Link href={`/selling/${row.referenceId}`} className="text-blue-600 hover:underline">{row.reference}</Link> : <span>{row.reference}</span>
//       )
//     },
//     {
//       header: "Debit (Sale)", accessor: "debit", render: (row) => (
//         <span className={row.debit > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>{row.debit > 0 ? formatNumber(row.debit) : '-'}</span>
//       )
//     },
//     {
//       header: "Cash Paid", accessor: "cashPaid", render: (row) => (
//         <span className={row.cashPaid > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>{row.cashPaid > 0 ? formatNumber(row.cashPaid) : '-'}</span>
//       )
//     },
//     {
//       header: "Bank Paid", accessor: "bankPaid", render: (row) => (
//         <span className={row.bankPaid > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>{row.bankPaid > 0 ? formatNumber(row.bankPaid) : '-'}</span>
//       )
//     },
//     {
//       header: "Return", accessor: "returnAmount", render: (row) => (
//         <span className={row.returnAmount > 0 ? "text-orange-600 font-medium" : "text-muted-foreground"}>{row.returnAmount > 0 ? formatNumber(row.returnAmount) : '-'}</span>
//       )
//     },
//     { header: "Balance", accessor: "balance", render: (row) => <span className="font-bold tabular-nums">{formatNumber(row.balance)}</span> }
//   ], [])

//   const pendingColumns = useMemo(() => [
//     { header: "Date", accessor: "saleDate", render: (row) => formatDateTime({ date: row.saleDate }) },
//     {
//       header: "Sale #", accessor: "saleNumber", render: (row) => (
//         <Link href={`/sales/${row._id}`} className="text-blue-600 hover:underline font-medium">{row.saleNumber}</Link>
//       )
//     },
//     { header: "Total", accessor: "grandTotal", render: (row) => <span className="font-medium">{formatNumber(row.grandTotal)}</span> },
//     {
//       header: "Paid", accessor: "paid", render: (row) => {
//         const paid = (row.cashPayment || 0) + (row.bankPayment || 0)
//         return <span className="text-green-600">{formatNumber(paid)}</span>
//       }
//     },
//     {
//       header: "Remaining", accessor: "remaining", render: (row) => {
//         const paid = (row.cashPayment || 0) + (row.bankPayment || 0)
//         const remaining = row.grandTotal - paid
//         return <span className="text-red-600 font-bold">{formatNumber(remaining)}</span>
//       }
//     },
//     {
//       header: "Status", accessor: "paymentStatus", render: (row) => (
//         <Badge variant={row.paymentStatus === 'pending' ? 'destructive' : 'warning'}>
//           {row.paymentStatus.toUpperCase()}
//         </Badge>
//       )
//     }
//   ], [])

//   const paymentHistoryColumns = useMemo(() => {
//     const cols = [
//       { header: "Date", accessor: "date", render: (row) => formatDateTime(row) },
//       { header: "Entry #", accessor: "entryNumber", render: (row) => row.entryNumber },
//     ]

//     if (selectedBuyerId === 'all') {
//       cols.push({ header: "Customer", accessor: "buyer", render: (row) => <span className="font-medium">{row.buyer}</span> })
//     }

//     cols.push(
//       { header: "Reference", accessor: "reference", render: (row) => row.reference },
//       { header: "Mode", accessor: "paymentMethod", render: (row) => <Badge variant="outline">{row.paymentMethod}</Badge> },
//       { header: "Amount", accessor: "amount", render: (row) => <span className="text-green-600 font-bold">{formatNumber(row.amount)}</span> },
//       { header: "Received By", accessor: "madeBy", render: (row) => row.madeBy },
//       { header: "Notes", accessor: "notes", render: (row) => <span className="text-sm text-muted-foreground">{row.notes}</span> }
//     )

//     return cols
//   }, [selectedBuyerId])

//   // Search state for Customer Ledger tab
//   const [ledgerSearch, setLedgerSearch] = useState("")

//   // Filter ledger transactions by search
//   const filteredLedgerTransactions = useMemo(() => {
//     if (!ledgerSearch) return allLedgerTransactions
//     const searchLower = ledgerSearch.toLowerCase()
//     return allLedgerTransactions.filter(entry =>
//       entry.buyer?.toLowerCase().includes(searchLower) ||
//       entry.reference?.toLowerCase().includes(searchLower) ||
//       entry.type?.toLowerCase().includes(searchLower)
//     )
//   }, [allLedgerTransactions, ledgerSearch])

//   const paymentReceiptsColumns = useMemo(() => {
//     const baseColumns = [
//       {
//         header: "Receipt #",
//         accessor: "paymentNumber",
//         render: (row) => (
//           <span className="font-mono font-medium text-blue-600">{row.paymentNumber}</span>
//         )
//       },
//       { header: "Date", accessor: "date", render: (row) => formatDateTime({ date: row.date }) },
//     ]

//     // Add Customer column when viewing all customers
//     if (selectedBuyerId === 'all') {
//       baseColumns.push({
//         header: "Buyer",
//         accessor: "customerName",
//         render: (row) => (
//           <span className="font-medium">{row.customerName}</span>
//         )
//       })
//     }

//     const remainingColumns = [
//       {
//         header: "Credit",
//         accessor: "creditAmount",
//         render: (row) => (
//           <span className={row.paymentDirection !== 'debit' ? "text-green-600 font-bold" : "text-muted-foreground"}>
//             {row.paymentDirection !== 'debit' ? `${formatNumber(row.totalAmount)}` : '-'}
//           </span>
//         )
//       },
//       {
//         header: "Balance",
//         accessor: "balanceAfter",
//         render: (row) => (
//           <span className={`font-bold tabular-nums ${row.balanceAfter > 0 ? 'text-red-600' : row.balanceAfter < 0 ? 'text-green-600' : ''}`}>
//             {formatNumber(Math.abs(row.balanceAfter))}
//             {row.balanceAfter < 0 && <span className="text-xs ml-1"></span>}
//           </span>
//         )
//       },
//       {
//         header: "Method",
//         accessor: "paymentMethod",
//         render: (row) => (
//           <Badge variant="outline" className="capitalize">{row.paymentMethod}</Badge>
//         )
//       },
//       {
//         header: "Actions",
//         accessor: "actions",
//         render: (row) => (
//           <div className="flex gap-2">
//             <Button
//               size="sm"
//               variant="outline"
//               onClick={() => handleViewReceipt(row)}
//               title="View/Print Receipt"
//             >
//               <Printer className="h-4 w-4" />
//             </Button>
//             {row.status === 'active' && (
//               isSuperAdmin ? (
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
//                   onClick={() => handleOpenReversalDialog(row)}
//                   title="Reverse Payment"
//                 >
//                   <RotateCcw className="h-4 w-4" />
//                 </Button>
//               ) : (
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   className="text-orange-600 border-orange-400 hover:bg-orange-50"
//                   onClick={() => setReverseRequestTarget(row)}
//                   title="Request Reversal"
//                 >
//                   <RotateCcw className="h-4 w-4" />
//                 </Button>
//               )
//             )}
//           </div>
//         )
//       }
//     ]

//     return [...baseColumns, ...remainingColumns]
//   }, [selectedBuyerId, isSuperAdmin, handleOpenReversalDialog])

//   // Calculate buyer balance map from ledger data for the modal
//   const buyerBalanceMap = useMemo(() => {
//     const balanceMap = {}

//     // Use balance from dropdownBuyers (from API)
//     if (dropdownBuyers && dropdownBuyers.length > 0) {
//       for (const buyer of dropdownBuyers) {
//         const buyerId = String(buyer._id || buyer.id)
//         balanceMap[buyerId] = buyer.balance || 0
//       }
//     }

//     return balanceMap
//   }, [dropdownBuyers])

//   // Get selected entity details
//   const selectedEntity = useMemo(() => {
//     if (!selectedBuyerId || selectedBuyerId === 'all') return null
//     return dropdownBuyers.find(b => String(b.id || b._id) === selectedBuyerId)
//   }, [selectedBuyerId, dropdownBuyers])

//   // Print Payment Receipts Report
//   const handlePrintPaymentReceiptsReport = () => {
//     if (!paymentReceiptsTransactions.length) {
//       toast.error('No payment receipts to print')
//       return
//     }

//     const isAllCustomers = selectedBuyerId === 'all'
//     const activePayments = paymentReceiptsTransactions.filter(p => p.status === 'active')
//     const totalCredits = activePayments.filter(p => p.paymentDirection !== 'debit').reduce((sum, p) => sum + p.totalAmount, 0)
//     const totalDebits = activePayments.filter(p => p.paymentDirection === 'debit').reduce((sum, p) => sum + p.totalAmount, 0)
//     const netTotal = totalCredits - totalDebits
//     const currentBalance = !isAllCustomers && activePayments.length > 0 ? activePayments[0].balanceAfter : 0

//     const printWindow = window.open('', '_blank')
//     const reportHTML = `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <title>Payment Receipts Report - ${isAllCustomers ? 'All Customers' : (selectedEntity?.name || 'Customer')}</title>
//         <style>
//           @page {
//             size: A4;
//             margin: 15mm;
//           }
//           * { margin: 0; padding: 0; box-sizing: border-box; }
//           body { 
//             font-family: 'Segoe UI', Arial, sans-serif; 
//             width: 100%; 
//             margin: 0; 
//             padding: 0; 
//             color: #333;
//             line-height: 1.4;
//             font-size: 12px;
//           }
//           .report-container {
//             max-width: 190mm;
//             margin: 0 auto;
//           }
//           .header { 
//             text-align: center; 
//             margin-bottom: 25px; 
//             border-bottom: 3px solid #1e40af; 
//             padding-bottom: 15px; 
//           }
//           .header h1 { font-size: 26px; color: #1e40af; margin-bottom: 5px; }
//           .header p { color: #64748b; font-weight: 600; }

//           .report-meta {
//             display: flex;
//             justify-content: space-between;
//             margin-bottom: 20px;
//             background: #f8fafc;
//             padding: 15px;
//             border-radius: 8px;
//             border: 1px solid #e2e8f0;
//           }

//           table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
//           th { background: #1e40af; color: white; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
//           td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
//           .text-right { text-align: right; }

//           .summary-section { 
//             display: flex; 
//             justify-content: flex-end; 
//             margin-top: 20px; 
//           }
//           .summary-table { width: 300px; }
//           .summary-table td { border: none; padding: 5px 10px; }
//           .summary-table .total-row { border-top: 2px solid #1e40af; font-weight: bold; font-size: 15px; }

//           .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px; padding-top: 15px; border-top: 1px solid #e2e8f0; }
//           @media print { body { padding: 0; } }
//         </style>
//       </head>
//       <body>
//         <div class="report-container">
//           <div class="header">
//             <h1>PAYMENT RECEIPTS REPORT</h1>
//             <p>KI Fashion BMS</p>
//           </div>

//           <div class="report-meta">
//             <div>
//               <p><strong>Customer:</strong> ${isAllCustomers ? 'All Customers' : (selectedEntity?.name || 'Customer')}</p>
//               <p><strong>Generated By:</strong> ${user?.name || 'System'}</p>
//             </div>
//             <div class="text-right">
//               <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
//               <p><strong>Time:</strong> ${new Date().toLocaleTimeString('en-GB')}</p>
//             </div>
//           </div>
//           .logo-section {
//             margin-bottom: 15px;
//           }
//           .logo {
//             font-size: 32px;
//             font-weight: bold;
//             color: #1e40af;
//             letter-spacing: 2px;
//           }
//           .company-name {
//             font-size: 14px;
//             color: #666;
//             margin-top: 5px;
//           }
//           .report-title { 
//             font-size: 24px; 
//             font-weight: bold;
//             margin-top: 15px;
//             color: #1e3a8a;
//           }
//           .report-subtitle {
//             font-size: 14px;
//             color: #666;
//             margin-top: 5px;
//           }
//           .info-section {
//             display: flex;
//             justify-content: space-between;
//             margin-bottom: 25px;
//             gap: 20px;
//           }
//           .info-box { 
//             background: #f8fafc; 
//             padding: 15px 20px; 
//             border-radius: 8px;
//             border: 1px solid #e2e8f0;
//             flex: 1;
//           }
//           .info-box h3 { 
//             font-size: 11px; 
//             color: #64748b; 
//             text-transform: uppercase;
//             letter-spacing: 0.5px;
//             margin-bottom: 8px;
//           }
//           .info-box p { 
//             margin: 4px 0; 
//             font-size: 13px;
//           }
//           .info-box .highlight {
//             font-size: 18px;
//             font-weight: bold;
//             color: #1e40af;
//           }
//           .summary-cards {
//             display: grid;
//             grid-template-columns: repeat(4, 1fr);
//             gap: 15px;
//             margin-bottom: 25px;
//           }
//           .summary-card {
//             background: #f8fafc;
//             padding: 15px;
//             border-radius: 8px;
//             border: 1px solid #e2e8f0;
//             text-align: center;
//           }
//           .summary-card .label {
//             font-size: 11px;
//             color: #64748b;
//             text-transform: uppercase;
//             margin-bottom: 5px;
//           }
//           .summary-card .value {
//             font-size: 20px;
//             font-weight: bold;
//           }
//           .summary-card.green { border-color: #86efac; background: #f0fdf4; }
//           .summary-card.green .value { color: #059669; }
//           .summary-card.red { border-color: #fca5a5; background: #fef2f2; }
//           .summary-card.red .value { color: #dc2626; }
//           .summary-card.amber { border-color: #fcd34d; background: #fffbeb; }
//           .summary-card.amber .value { color: #d97706; }
//           .summary-card.blue { border-color: #93c5fd; background: #eff6ff; }
//           .summary-card.blue .value { color: #1e40af; }
//           table { 
//             width: 100%; 
//             border-collapse: collapse; 
//             margin: 20px 0;
//             font-size: 11px;
//           }
//           th { 
//             background: #1e40af; 
//             color: white; 
//             padding: 10px 6px; 
//             text-align: left;
//             font-weight: 600;
//             text-transform: uppercase;
//             font-size: 9px;
//             letter-spacing: 0.5px;
//           }
//           td {
//             padding: 8px 6px;
//             border-bottom: 1px solid #e2e8f0;
//           }
//           tr:nth-child(even) {
//             background: #f8fafc;
//           }
//           tr:hover {
//             background: #f1f5f9;
//           }
//           .text-right { text-align: right; }
//           .text-center { text-align: center; }
//           .font-bold { font-weight: bold; }
//           .text-green { color: #059669; }
//           .text-red { color: #dc2626; }
//           .text-muted { color: #94a3b8; }
//           .badge {
//             display: inline-block;
//             padding: 2px 6px;
//             border-radius: 4px;
//             font-size: 9px;
//             font-weight: 600;
//             text-transform: uppercase;
//           }
//           .badge-credit { background: #dcfce7; color: #166534; }
//           .badge-debit { background: #fee2e2; color: #991b1b; }
//           .badge-active { background: #dbeafe; color: #1e40af; }
//           .badge-reversed { background: #fef3c7; color: #92400e; }
//           .summary-section {
//             margin-top: 30px;
//             padding: 20px;
//             background: #f0f9ff;
//             border-radius: 8px;
//             border: 1px solid #bae6fd;
//           }
//           .summary-title {
//             font-size: 14px;
//             font-weight: bold;
//             color: #0369a1;
//             margin-bottom: 15px;
//             text-transform: uppercase;
//             letter-spacing: 0.5px;
//           }
//           .summary-grid {
//             display: grid;
//             grid-template-columns: repeat(${isAllCustomers ? '3' : '4'}, 1fr);
//             gap: 15px;
//           }
//           .summary-item {
//             text-align: center;
//             padding: 10px;
//             background: white;
//             border-radius: 6px;
//           }
//           .summary-item .label {
//             font-size: 10px;
//             color: #64748b;
//             text-transform: uppercase;
//             margin-bottom: 5px;
//           }
//           .summary-item .value {
//             font-size: 18px;
//             font-weight: bold;
//           }
//           .footer { 
//             margin-top: 40px; 
//             padding-top: 20px;
//             border-top: 1px solid #e2e8f0;
//             text-align: center; 
//             color: #94a3b8; 
//             font-size: 11px; 
//           }
//           @media print { 
//             body { padding: 15px; }
//             .no-print { display: none; }
//           }
//         </style>
//       </head>
//       <body>
//         <div class="header">
//           <div class="logo-section">
//             <div class="logo">KI FASHION</div>
//             <div class="company-name">Fashion & Textile Solutions</div>
//           </div>
//           <div class="report-title">PAYMENT RECEIPTS REPORT</div>
//           <div class="report-subtitle">${isAllCustomers ? 'All Customers - Summary Report' : 'Statement of Account Transactions'}</div>
//         </div>

//         ${isAllCustomers ? `
//         <!-- Summary Cards for All Customers -->
//         <div class="summary-cards">
//           <div class="summary-card green">
//             <div class="label">Total Credits (Received)</div>
//             <div class="value">${formatNumber(totalCredits)}</div>
//           </div>
//           <div class="summary-card red">
//             <div class="label">Total Debits (Issued)</div>
//             <div class="value">${formatNumber(totalDebits)}</div>
//           </div>
//           <div class="summary-card blue">
//             <div class="label">Net Amount</div>
//             <div class="value">${formatNumber(Math.abs(netTotal))}</div>
//           </div>
//           <div class="summary-card amber">
//             <div class="label">Total Transactions</div>
//             <div class="value">${paymentReceiptsTransactions.length}</div>
//           </div>
//         </div>
//         ` : `
//         <div class="info-section">
//           <div class="info-box">
//             <h3>Customer Details</h3>
//             <p><strong>${selectedEntity?.name || 'N/A'}</strong></p>
//             ${selectedEntity?.company ? `<p>${selectedEntity.company}</p>` : ''}
//             ${selectedEntity?.email ? `<p>${selectedEntity.email}</p>` : ''}
//             ${selectedEntity?.phone ? `<p>${selectedEntity.phone}</p>` : ''}
//           </div>

//           <div class="info-box">
//             <h3>Report Period</h3>
//             <p>All Transactions</p>
//             <p class="highlight">${paymentReceiptsTransactions.length} Records</p>
//           </div>

//           <div class="info-box">
//             <h3>Current Balance</h3>
//             <p class="highlight ${currentBalance > 0 ? 'text-red' : 'text-green'}">
//               ${formatNumber(Math.abs(currentBalance))}
//               ${currentBalance < 0 ? ' (Credit)' : currentBalance > 0 ? ' (Due)' : ''}
//             </p>
//           </div>
//         </div>
//         `}

//         <table>
//           <thead>
//             <tr>
//               <th>Receipt #</th>
//               <th>Date</th>
//               ${isAllCustomers ? '<th>Customer</th>' : ''}
//               <th class="text-center">Type</th>
//               <th class="text-right">Debit</th>
//               <th class="text-right">Credit</th>
//               <th class="text-right">Balance</th>
//               <th class="text-center">Method</th>
//               <th class="text-center">Status</th>
//               <th>By</th>
//             </tr>
//           </thead>
//           <tbody>
//             ${paymentReceiptsTransactions.map(row => `
//               <tr>
//                 <td><strong>${row.paymentNumber}</strong></td>
//                 <td>${formatDateTime({ date: row.date })}</td>
//                 ${isAllCustomers ? `<td>${row.customerName}</td>` : ''}
//                 <td class="text-center">
//                   <span class="badge ${row.paymentDirection === 'debit' ? 'badge-debit' : 'badge-credit'}">
//                     ${row.paymentDirection === 'debit' ? 'Debit' : 'Credit'}
//                   </span>
//                 </td>
//                 <td class="text-right ${row.paymentDirection === 'debit' ? 'text-red font-bold' : 'text-muted'}">
//                   ${row.paymentDirection === 'debit' ? formatNumber(row.totalAmount) : '-'}
//                 </td>
//                 <td class="text-right ${row.paymentDirection !== 'debit' ? 'text-green font-bold' : 'text-muted'}">
//                   ${row.paymentDirection !== 'debit' ? formatNumber(row.totalAmount) : '-'}
//                 </td>
//                 <td class="text-right font-bold ${row.balanceAfter > 0 ? 'text-red' : row.balanceAfter < 0 ? 'text-green' : ''}">
//                   ${formatNumber(Math.abs(row.balanceAfter))}
//                 </td>
//                 <td class="text-center" style="text-transform: capitalize;">${row.paymentMethod}</td>
//                 <td class="text-center">
//                   <span class="badge ${row.status === 'active' ? 'badge-active' : 'badge-reversed'}">
//                     ${row.status}
//                   </span>
//                 </td>
//                 <td>${row.createdBy}</td>
//               </tr>
//             `).join('')}
//           </tbody>
//         </table>

//         <div class="summary-section">
//           <div class="summary-title">Summary</div>
//           <div class="summary-grid">
//             <div class="summary-item">
//               <div class="label">Total Credits (Received)</div>
//               <div class="value text-green">${formatNumber(totalCredits)}</div>
//             </div>
//             <div class="summary-item">
//               <div class="label">Total Debits (Issued)</div>
//               <div class="value text-red">${formatNumber(totalDebits)}</div>
//             </div>
//             <div class="summary-item">
//               <div class="label">Net Amount</div>
//               <div class="value ${netTotal >= 0 ? 'text-green' : 'text-red'}">${formatNumber(Math.abs(netTotal))}</div>
//             </div>
//             ${!isAllCustomers ? `
//             <div class="summary-item">
//               <div class="label">Current Balance</div>
//               <div class="value ${currentBalance > 0 ? 'text-red' : 'text-green'}">${formatNumber(Math.abs(currentBalance))}</div>
//             </div>
//             ` : ''}
//           </div>
//         </div>

//         <div class="footer">
//           <p>This is a computer-generated report and does not require a signature.</p>
//           <p>Generated on: ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}</p>
//           <p>KI Fashion - All Rights Reserved</p>
//         </div>
//       </body>
//       </html>
//     `

//     printWindow.document.write(reportHTML)
//     printWindow.document.close()
//     printWindow.focus()
//     setTimeout(() => {
//       printWindow.print()
//     }, 250)
//   }

//   // Calculate current buyer's ledger balance from transactions
//   const currentBuyerLedgerBalance = useMemo(() => {
//     if (allLedgerTransactions.length > 0) {
//       return allLedgerTransactions[0].balance || 0
//     }
//     return buyerDetails?.balance || 0
//   }, [allLedgerTransactions, buyerDetails])

//   // Calculate total balance for "All Buyers" view
//   const totalAllBuyersBalance = useMemo(() => {
//     return buyers.reduce((sum, b) => sum + (Number(b.balance) || 0), 0)
//   }, [buyers])

//   // Determine which balance to display
//   const displayBalance = selectedBuyerId === "all" ? totalAllBuyersBalance : currentBuyerLedgerBalance

//   return (
//     <div className="space-y-6">
//       {/* Header - Enhanced */}
//       <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
//         <div className="">
//           <BackButton fallbackPath="/reports/receivables" label="Back" />
//         </div>
//         <div className="flex items-center gap-4">
//           <Button onClick={() => setPaymentModalOpen(true)} className="bg-green-600 hover:bg-green-700">
//             <Plus className="h-4 w-4 mr-2" />
//             Add Payment
//           </Button>
//         </div>
//       </header>

//       <Tabs
//         tabs={[
//           {
//             label: "Buyer Ledger",
//             content: (
//               <div className="space-y-6">
//                 <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
//                   <div className="space-y-2">
//                     <Label>Buyer</Label>
//                     <Combobox
//                       options={comboboxOptions}
//                       value={selectedBuyerId}
//                       onValueChange={(value) => setSelectedBuyerId(value || "all")}
//                       placeholder="Select buyer"
//                       searchPlaceholder="Search buyer..."
//                       emptyMessage="No buyer found"
//                       loading={buyersLoading}
//                     />
//                   </div>
//                   <div className="space-y-2 md:col-span-2">
//                     <Label htmlFor="ledger-search">Search Ledger</Label>
//                     <div className="relative">
//                       <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//                       <Input
//                         id="ledger-search"
//                         placeholder="Search by buyer, reference, or type"
//                         value={ledgerSearch}
//                         onChange={(e) => setLedgerSearch(e.target.value)}
//                         className="pl-9"
//                       />
//                     </div>
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
//                     <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">
//                       Total Entries
//                     </div>
//                     <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
//                       {filteredLedgerTransactions.length}
//                     </div>
//                   </div>

//                   <div className={`rounded-lg border p-4 shadow-sm ${
//                     displayBalance >= 0 
//                       ? 'border-emerald-200 bg-emerald-50/30' 
//                       : 'border-red-200 bg-red-50/30'
//                   }`}>
//                     <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${
//                       displayBalance >= 0 ? 'text-emerald-700/80' : 'text-red-700/80'
//                     }`}>
//                       {selectedBuyerId === "all" ? "Total Buyer Balance" : "Current Buyer Balance"}
//                     </div>
//                     <div className={`mt-1 text-2xl font-bold tabular-nums ${
//                       displayBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
//                     }`}>
//                       {buyerDetailsLoading && selectedBuyerId !== "all" 
//                         ? "Loading..." 
//                         : formatNumber(Math.abs(displayBalance))}
//                     </div>
//                     {/* <div className={`text-xs mt-1 ${
//                       displayBalance >= 0 ? 'text-emerald-600/80' : 'text-red-600/80'
//                     }`}>
//                       {displayBalance >= 0 
//                         ? (selectedBuyerId === "all" ? "Total owed by buyers" : "Amount owed by buyer")
//                         : (selectedBuyerId === "all" ? "Total we owe to buyers" : "Amount we owe buyer")}
//                     </div> */}
//                   </div>
//                 </div>

//                 {buyersError && (
//                   <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
//                     Failed to load buyers list.
//                   </div>
//                 )}

//                 <DataTable
//                   title="Buyer Ledger"
//                   columns={allLedgerColumns}
//                   data={filteredLedgerTransactions}
//                   loading={allLedgerLoading}
//                   hideActions
//                 />
//               </div>
//             )
//           },
//           {
//             label: "Payment Receipts",
//             content: (
//               <div className="space-y-6">
//                 <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
//                   <div className="space-y-2">
//                     <Label>Buyer</Label>
//                     <Combobox
//                       options={comboboxOptions}
//                       value={selectedBuyerId}
//                       onValueChange={(value) => setSelectedBuyerId(value || "all")}
//                       placeholder="Select buyer"
//                       searchPlaceholder="Search buyer..."
//                       emptyMessage="No buyer found"
//                       loading={buyersLoading}
//                     />
//                   </div>
//                   <div className="space-y-2">
//                     <Label htmlFor="receipt-from">Date From</Label>
//                     <Input
//                       id="receipt-from"
//                       type="date"
//                       value={paymentHistoryDateFrom}
//                       onChange={(e) => setPaymentHistoryDateFrom(e.target.value)}
//                     />
//                   </div>
//                   <div className="space-y-2">
//                     <Label htmlFor="receipt-to">Date To</Label>
//                     <Input
//                       id="receipt-to"
//                       type="date"
//                       value={paymentHistoryDateTo}
//                       onChange={(e) => setPaymentHistoryDateTo(e.target.value)}
//                     />
//                   </div>
//                 </div>

//                 <div className="flex items-center justify-end">
//                   <Button variant="outline" onClick={handlePrintPaymentReceiptsReport}>
//                     <Printer className="h-4 w-4 mr-2" />
//                     Print Report
//                   </Button>
//                 </div>

//                 {paymentReceiptsError && (
//                   <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
//                     Failed to load payment receipts.
//                   </div>
//                 )}

//                 <DataTable
//                   title="Payment Receipts"
//                   columns={paymentReceiptsColumns}
//                   data={paymentReceiptsTransactions}
//                   loading={paymentReceiptsLoading || isFetching}
//                   hideActions
//                 />
//               </div>
//             )
//           }
//         ]}
//         activeTab={activeTab}
//         onTabChange={handleTabChange}
//       />

//       <CustomerPaymentModal
//         open={paymentModalOpen}
//         onClose={() => setPaymentModalOpen(false)}
//         entityId={selectedBuyerId !== "all" ? selectedBuyerId : ""}
//         entityName={selectedEntity?.name || selectedEntity?.company || ""}
//         totalBalance={currentBuyerLedgerBalance}
//         ledgerBalance={currentBuyerLedgerBalance}
//         ledgerBalanceBuyerId={selectedBuyerId !== "all" ? selectedBuyerId : ""}
//         buyerBalanceMap={buyerBalanceMap}
//         entities={dropdownBuyers}
//         allLedgerData={allLedgerData}
//         onSuccess={() => {
//           queryClient.invalidateQueries({ queryKey: ['ledger'] })
//           queryClient.invalidateQueries({ queryKey: ['buyers'] })
//           queryClient.invalidateQueries({ queryKey: ['payments'] })
//         }}
//       />

//       <DeleteRequestDialog
//         open={!!reverseRequestTarget}
//         onClose={() => setReverseRequestTarget(null)}
//         entityType="payment"
//         entityId={reverseRequestTarget?.id}
//         entityRef={reverseRequestTarget?.paymentNumber || String(reverseRequestTarget?.id || '').slice(-6)}
//         entitySummary={reverseRequestTarget ? {
//           "Buyer": reverseRequestTarget.customerName || "Unknown",
//           "Amount": formatNumber(reverseRequestTarget.totalAmount),
//           "Method": reverseRequestTarget.paymentMethod || "-",
//           "Date": reverseRequestTarget.date ? new Date(reverseRequestTarget.date).toLocaleDateString('en-GB') : "-",
//         } : {}}
//         onSuccess={() => setReverseRequestTarget(null)}
//       />

//       <Dialog open={reversalDialogOpen} onOpenChange={setReversalDialogOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Reverse Payment</DialogTitle>
//             <DialogDescription>
//               This action will reverse the payment and update ledger balances.
//             </DialogDescription>
//           </DialogHeader>
//           <div className="space-y-2">
//             <Label htmlFor="reversal-reason">Reason</Label>
//             <Textarea
//               id="reversal-reason"
//               placeholder="Enter reason for reversal"
//               value={reversalReason}
//               onChange={(e) => setReversalReason(e.target.value)}
//             />
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setReversalDialogOpen(false)} disabled={isReversing}>
//               Cancel
//             </Button>
//             <Button variant="destructive" onClick={handleReversePayment} disabled={isReversing || !reversalReason.trim()}>
//               {isReversing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
//               Confirm Reverse
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
//         <DialogContent className="max-w-2xl">
//           <DialogHeader>
//             <DialogTitle>Payment Receipt</DialogTitle>
//             <DialogDescription>
//               Receipt details for {receiptData?.receiptNumber || '-'}
//             </DialogDescription>
//           </DialogHeader>
//           <div className="space-y-2 text-sm">
//             <div><span className="font-medium">Receipt #:</span> {receiptData?.receiptNumber || '-'}</div>
//             <div><span className="font-medium">Customer:</span> {receiptData?.customer?.name || '-'}</div>
//             <div><span className="font-medium">Amount:</span> {receiptData?.payment?.totalAmount != null ? formatNumber(receiptData.payment.totalAmount) : '-'}</div>
//             <div><span className="font-medium">Method:</span> {receiptData?.payment?.paymentMethod || '-'}</div>
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>Close</Button>
//             <Button onClick={handlePrintReceipt}>
//               <Printer className="h-4 w-4 mr-2" />
//               Print
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   )
// }

"use client"

import { useState, useMemo, useEffect, useCallback, useDeferredValue } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import BackButton from "@/components/BackButton"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import DataTable from "../../../components/data-table"
import { useBuyers } from "@/lib/hooks/useBuyers"
// FIX 8: removed useBuyer import — we now derive selectedEntity from the already-loaded buyers list
import { useAllBuyerLedgers } from "@/lib/hooks/useLedger"
import { ledgerAPI } from "@/lib/api/endpoints/ledger"
import { paymentAPI } from "@/lib/api/endpoints/payments"
import { salesAPI } from "@/lib/api/endpoints/sales"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, FileText, Users, Search, Filter, TrendingUp, Clock, Plus, CheckCircle2, Printer, RotateCcw, Receipt, X } from "lucide-react"
import { useAuthStore } from "@/store/store"
import DeleteRequestDialog from "@/components/modals/DeleteRequestDialog"
import { Badge } from "@/components/ui/badge"
import toast from "react-hot-toast"
import Tabs from "@/components/tabs"
import CustomerPaymentModal from "@/components/modals/CustomerPaymentModal"
import BuyerPaymentReceiptModal, { printReceipt } from "@/components/modals/BuyerPaymentReceiptModal"
import { exportToPDF } from "@/lib/utils/pdfExport"
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
  const dateTime = _date.date || _date.createdAt;
  if (!dateTime) return "-";
  const d = new Date(dateTime);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
  const date = d.toLocaleDateString('en-GB');
  return `${date} ${time}`;
}

export default function CustomerLedgerPage() {
  const [selectedBuyerId, setSelectedBuyerId] = useState("all")
  const [ledgerBuyerFilter, setLedgerBuyerFilter] = useState("")
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = Number(searchParams.get("tab") ?? 0);
  const [activeTab, setActiveTab] = useState(initialTab);
  const handleTabChange = (idx) => {
    setActiveTab(idx);
    if (router) router.replace(`/customer-ledger?tab=${idx}`, { scroll: false });
  };
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  // Reversal dialog state
  const [reversalDialogOpen, setReversalDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [reversalReason, setReversalReason] = useState('')
  const [isReversing, setIsReversing] = useState(false)

  // Receipt dialog state
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false)

  // Auth and reversal request state
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === "super-admin"
  const [reverseRequestTarget, setReverseRequestTarget] = useState(null)

  // Filters for Payment History Tab
  const [paymentHistoryDateFrom, setPaymentHistoryDateFrom] = useState("")
  const [paymentHistoryDateTo, setPaymentHistoryDateTo] = useState("")
  const [paymentHistoryMethodFilter, setPaymentHistoryMethodFilter] = useState("all")

  // FIX 9: raw search state + deferred value so filtering never blocks typing
  const [ledgerSearch, setLedgerSearch] = useState("")
  const deferredSearch = useDeferredValue(ledgerSearch)

  const queryClient = useQueryClient()

  // Auto-select buyer from URL query param
  useEffect(() => {
    const buyerId = searchParams.get('buyerId')
    if (buyerId) {
      setSelectedBuyerId(buyerId)
    }
  }, [searchParams])

  // Fetch active buyers for dropdowns
  const { data: buyers = [], isLoading: buyersLoading, error: buyersError } = useBuyers({ limit: 500 })
  const dropdownBuyers = buyers

  const comboboxOptions = useMemo(() => {
    const options = dropdownBuyers.map(b => ({
      value: b.id,
      label: b.company || '',
    }))
    return [{ value: 'all', label: 'All Buyers' }, ...options]
  }, [dropdownBuyers])

  // FIX 8: derive selectedEntity from the already-loaded buyers list — no extra useBuyer fetch
  const selectedEntity = useMemo(() => {
    if (!selectedBuyerId || selectedBuyerId === 'all') return null
    return dropdownBuyers.find(b => String(b.id || b._id) === selectedBuyerId) ?? null
  }, [selectedBuyerId, dropdownBuyers])

  // Shared ledger params (used by FIX 1 single hook call)
  const ledgerFilterParams = useMemo(() => {
    if (!selectedBuyerId) return null
    if (selectedBuyerId === 'all') return { limit: 500 }
    return { buyerId: selectedBuyerId, limit: 100 }
  }, [selectedBuyerId])

  // FIX 1: single useAllBuyerLedgers call — both tabs derive from this
  // FIX 5: staleTime + gcTime added so background refetches are suppressed
  const { data: sharedLedgerData, isLoading: sharedLedgerLoading } = useAllBuyerLedgers(
    ledgerFilterParams || {},
    { staleTime: 60_000, gcTime: 5 * 60_000 }
  )

  // FIX 2: gate unpaid-sales query behind activeTab — only fires when that tab is visible
  // FIX 5: staleTime + gcTime
  const { data: unpaidSales = [], isLoading: unpaidSalesLoading } = useQuery({
    queryKey: ['unpaid-sales', selectedBuyerId],
    queryFn: async () => {
      if (!selectedBuyerId || selectedBuyerId === 'all') return []
      const response = await salesAPI.getAll({
        buyer: selectedBuyerId,
        limit: 1000
      })
      const sales = response?.data?.data || response?.data || []
      return sales.filter(s => s.paymentStatus === 'pending' || s.paymentStatus === 'partial')
    },
    // This tab slice no longer renders the pending-payments view, so keep this query idle.
    enabled: false,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })

  // FIX 2: gate payments query behind activeTab === 1
  // FIX 5: staleTime + gcTime
  const {
    data: paymentReceiptsData,
    isLoading: paymentReceiptsLoading,
    refetch: refetchPayments,
    error: paymentReceiptsError,
    isFetching,
  } = useQuery({
    queryKey: ['payments', 'customer', selectedBuyerId],
    queryFn: async () => {
      if (!selectedBuyerId) return { payments: [] }

      // FIX 4 (partial, in-file): single normaliser avoids the 3-path fallback chain
      const extractPayments = (res) =>
        res?.data?.data?.payments ?? res?.data?.payments ?? res?.payments ?? []

      try {
        if (selectedBuyerId === 'all') {
          const response = await paymentAPI.getAllPayments({ limit: 1000 })
          return { payments: extractPayments(response) }
        }
        const response = await paymentAPI.getCustomerPayments(selectedBuyerId, { limit: 500 })
        return { payments: extractPayments(response) }
      } catch (error) {
        throw error
      }
    },
    // FIX 2: only fetch when Payment Receipts tab (index 2) is active
    enabled: !!selectedBuyerId && activeTab === 2,
    retry: 1,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })

  // --- Calculations ---

  const pendingTotals = useMemo(() => {
    const totalPending = unpaidSales.reduce((sum, sale) => {
      const paid = (sale.cashPayment || 0) + (sale.bankPayment || 0)
      const remaining = sale.grandTotal - paid
      return sum + Math.max(0, remaining)
    }, 0)
    const totalPaidOnPending = unpaidSales.reduce((sum, sale) => {
      return sum + (sale.cashPayment || 0) + (sale.bankPayment || 0)
    }, 0)
    return { totalPending, totalPaidOnPending }
  }, [unpaidSales])

  // Transform ledger data for Tab 0 — uses sharedLedgerData (FIX 1)
  const allLedgerTransactions = useMemo(() => {
    if (!sharedLedgerData?.entries) return []

    let filteredEntries = sharedLedgerData.entries.filter(entry =>
      entry.transactionType === 'sale' ||
      entry.transactionType === 'receipt' ||
      entry.transactionType === 'adjustment' ||
      entry.transactionType === 'return'
    )

    const mappedItems = filteredEntries.map(entry => {
      const buyer = entry.entityId || {}
      let typeLabel = entry.transactionType || '-'

      if (entry.transactionType === 'receipt') {
        typeLabel = `Receipt - ${entry.paymentMethod === 'bank' ? 'Bank' : 'Cash'}`
      } else if (entry.transactionType === 'sale') {
        typeLabel = 'Sale'
      } else if (entry.transactionType === 'return') {
        typeLabel = 'Return'
      }

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
      const returnAmount = entry.transactionType === 'return' ? (entry.credit || 0) : 0

      return {
        id: entry._id || entry.id,
        date: entry.date || entry.createdAt,
        createdAt: entry.createdAt,
        buyer: buyer.company || buyer.name || 'Unknown Customer',
        customerName: buyer.name || '',
        companyName: buyer.company || '',
        type: typeLabel,
        transactionType: entry.transactionType,
        description: entry.description || entry.notes || '-',
        debit: Number(entry.debit) || 0,
        credit: Number(entry.credit) || 0,
        cashPaid,
        bankPaid,
        returnAmount,
        balance: 0,
        reference: readableReference,
        referenceId: (entry.referenceId && typeof entry.referenceId === 'object') ? entry.referenceId._id : entry.referenceId,
        paymentMethod: entry.paymentMethod,
        raw: entry
      }
    })

    mappedItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let runningBalance = 0
    for (const entry of mappedItems) {
      runningBalance = runningBalance + entry.debit - entry.credit
      entry.balance = runningBalance
    }

    return mappedItems.reverse()
  }, [sharedLedgerData])

  // FIX 1: Payment History (Tab 3) — derived from the same sharedLedgerData, no second fetch
  const paymentHistoryTransactions = useMemo(() => {
    if (!sharedLedgerData?.entries) return []

    let filtered = sharedLedgerData.entries.filter(entry => entry.transactionType === 'receipt')

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
      let reference = '-'
      if (entry.referenceId) {
        if (typeof entry.referenceId === 'object' && entry.referenceId !== null) {
          reference = entry.referenceId.saleNumber || entry.referenceId._id || '-'
        } else {
          reference = entry.referenceId.toString()
        }
      }
      const buyer = entry.entityId || {}
      return {
        id: entry._id || entry.id,
        date: entry.date || entry.createdAt,
        createdAt: entry.createdAt,
        buyer: buyer.company || buyer.name || 'Unknown Customer',
        customerName: buyer.name || '',
        companyName: buyer.company || '',
        reference,
        paymentMethod: entry.paymentMethod || 'cash',
        amount: entry.credit || 0,
        madeBy: entry.createdBy?.name || 'Unknown',
        notes: entry.description || '-',
        entryNumber: entry.entryNumber || '-',
        raw: entry
      }
    })
  }, [sharedLedgerData, paymentHistoryDateFrom, paymentHistoryDateTo, paymentHistoryMethodFilter])

  const paymentReceiptsTransactions = useMemo(() => {
    if (!paymentReceiptsData?.payments) return []
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
      distributions: payment.distributions || [],
      balanceBefore: payment.balanceBefore,
      balanceAfter: payment.balanceAfter,
      status: payment.status,
      createdBy: payment.createdBy?.name || 'Unknown',
      description: payment.description || '-',
      reversalInfo: payment.reversalInfo,
      customerName: payment.customerId?.company || payment.customerId?.name || 'Unknown',
      individualName: payment.customerId?.name || '',
      companyName: payment.customerId?.company || '',
      customerId: payment.customerId?._id || payment.customerId,
      raw: payment
    }))
  }, [paymentReceiptsData])

  // FIX 7: stable handler refs via useCallback — prevents column useMemo from
  // producing new render-function references on every render, which would cause
  // DataTable to re-render every row even when data hasn't changed.
  const handleOpenReversalDialog = useCallback((payment) => {
    setSelectedPayment(payment)
    setReversalReason('')
    setReversalDialogOpen(true)
  }, []) // state setters are stable — no deps needed

  const handleReversePayment = async () => {
    if (!selectedPayment || !reversalReason.trim()) {
      toast.error('Please provide a reason for deletion')
      return
    }
    setIsReversing(true)
    try {
      await paymentAPI.reversePayment(selectedPayment.paymentNumber, reversalReason.trim())
      toast.success(`Payment ${selectedPayment.paymentNumber} has been deleted`)
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

  // FIX 7: stable ref for receipt handler
  const handleViewReceipt = useCallback(async (payment) => {
    setIsLoadingReceipt(true)
    try {
      const response = await paymentAPI.getPaymentReceipt(payment.paymentNumber)
      const data = response.data?.data
      if (data) {
        printReceipt(data)
      } else {
        toast.error('Receipt data is empty')
      }
    } catch (error) {
      console.error('Error fetching receipt:', error)
      toast.error('Failed to load receipt')
    } finally {
      setIsLoadingReceipt(false)
    }
  }, []) // no external deps

  // FIX 7: stable ref for reversal request setter
  const handleSetReverseRequestTarget = useCallback((row) => {
    setReverseRequestTarget(row)
  }, [])

  const handlePrintReceipt = () => {
    if (!receiptData) return
    const printWindow = window.open('', '_blank')
    const printContent = generateReceiptHTML(receiptData)
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 250)
  }

  const generateReceiptHTML = (receipt) => {
    const distributionRows = receipt.distributions
      .map(d => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${d.reference}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${d.amount.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${d.isAdvance ? 'Advance' : 'Applied'}</td>
        </tr>
      `).join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - ${receipt.receiptNumber}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; width: 100%; margin: 0; padding: 0; color: #333; line-height: 1.5; }
          .receipt-container { max-width: 180mm; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #1e40af; padding-bottom: 15px; }
          .header h1 { margin: 0; font-size: 24px; color: #1e40af; }
          .header p { margin: 5px 0; color: #666; font-weight: 600; }
          .receipt-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .info-box h3 { margin: 0 0 10px 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
          .info-box p { margin: 4px 0; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #1e40af; color: white; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          .totals { margin-top: 15px; display: flex; flex-direction: column; align-items: flex-end; }
          .totals-table { width: 250px; }
          .totals-table td { padding: 5px 0; border: none; }
          .totals-table td:last-child { text-align: right; font-weight: 700; }
          .total-row { border-top: 2px solid #1e40af !important; font-size: 16px !important; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; }
          .status-active { background: #dcfce7; color: #166534; }
          .status-reversed { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <h1>PAYMENT RECEIPT</h1>
            <p>KI Fashion BMS</p>
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
            <tbody>${distributionRows}</tbody>
          </table>
          <div class="totals">
            <table class="totals-table">
              <tr><td>Balance Before:</td><td>${receipt.balances.before.toFixed(2)}</td></tr>
              <tr class="total-row"><td>Total Received:</td><td>${receipt.payment.totalAmount.toFixed(2)}</td></tr>
              <tr><td>Balance After:</td><td>${receipt.balances.after.toFixed(2)}</td></tr>
            </table>
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
        </div>
      </body>
      </html>
    `
  }

  // --- Columns ---

  const allLedgerColumns = useMemo(() => [
    { header: "Entry #", accessor: "entryNumber", render: (row) => <span className="font-medium">{row.raw.entryNumber || '-'}</span>, pdfValue: (row) => row.raw.entryNumber || '-' },
    { header: "Date", accessor: "date", render: (row) => formatDateTime(row), pdfValue: (row) => formatDateTime(row) },
    {
      header: "Customer",
      accessor: "buyer",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.buyer}</span>
          {row.companyName && row.customerName && row.companyName !== row.customerName && (
            <span className="text-[10px] text-muted-foreground leading-tight">({row.customerName})</span>
          )}
        </div>
      ),
      pdfValue: (row) => row.buyer
    },
    // { header: "Type", accessor: "type", render: (row) => <span>{row.type}</span>, pdfValue: (row) => row.type },
    {
      header: "Reference",
      accessor: "reference",
      render: (row) => (
        row.referenceId && row.transactionType !== 'return'
          ? <Link href={`/selling/${row.referenceId}`} className="text-blue-600 hover:underline">{row.reference}</Link>
          : <span>{row.reference}</span>
      ),
      pdfValue: (row) => row.reference || "-"
    },
    {
      header: "Debit (Sale)",
      accessor: "debit",
      render: (row) => (
        <span className={row.debit > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>{row.debit > 0 ? formatNumber(row.debit) : '-'}</span>
      ),
      pdfValue: (row) => row.debit > 0 ? row.debit : 0
    },
    {
      header: "Cash Paid",
      accessor: "cashPaid",
      render: (row) => (
        <span className={row.cashPaid > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>{row.cashPaid > 0 ? formatNumber(row.cashPaid) : '-'}</span>
      ),
      pdfValue: (row) => row.cashPaid > 0 ? row.cashPaid : 0
    },
    {
      header: "Bank Paid",
      accessor: "bankPaid",
      render: (row) => (
        <span className={row.bankPaid > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>{row.bankPaid > 0 ? formatNumber(row.bankPaid) : '-'}</span>
      ),
      pdfValue: (row) => row.bankPaid > 0 ? row.bankPaid : 0
    },
    {
      header: "Return",
      accessor: "returnAmount",
      render: (row) => (
        <span className={row.returnAmount > 0 ? "text-orange-600 font-medium" : "text-muted-foreground"}>{row.returnAmount > 0 ? formatNumber(row.returnAmount) : '-'}</span>
      ),
      pdfValue: (row) => row.returnAmount > 0 ? row.returnAmount : 0
    },
    {
      header: "Balance",
      accessor: "balance",
      render: (row) => <span className="font-bold tabular-nums">{formatNumber(row.balance)}</span>,
      pdfValue: (row) => row.balance
    }
  ], []) // no deps — pure formatters, no closures over state

  const pendingColumns = useMemo(() => [
    { header: "Date", accessor: "saleDate", render: (row) => formatDateTime({ date: row.saleDate }), pdfValue: (row) => formatDateTime({ date: row.saleDate }) },
    {
      header: "Sale #",
      accessor: "saleNumber",
      render: (row) => (
        <Link href={`/sales/${row._id}`} className="text-blue-600 hover:underline font-medium">{row.saleNumber}</Link>
      ),
      pdfValue: (row) => row.saleNumber
    },
    { header: "Total", accessor: "grandTotal", render: (row) => <span className="font-medium">{formatNumber(row.grandTotal)}</span>, pdfValue: (row) => row.grandTotal },
    {
      header: "Paid",
      accessor: "paid",
      render: (row) => {
        const paid = (row.cashPayment || 0) + (row.bankPayment || 0)
        return <span className="text-green-600">{formatNumber(paid)}</span>
      },
      pdfValue: (row) => (row.cashPayment || 0) + (row.bankPayment || 0)
    },
    {
      header: "Remaining",
      accessor: "remaining",
      render: (row) => {
        const paid = (row.cashPayment || 0) + (row.bankPayment || 0)
        const remaining = row.grandTotal - paid
        return <span className="text-red-600 font-bold">{formatNumber(remaining)}</span>
      },
      pdfValue: (row) => row.grandTotal - ((row.cashPayment || 0) + (row.bankPayment || 0))
    },
    {
      header: "Status",
      accessor: "paymentStatus",
      render: (row) => (
        <Badge variant={row.paymentStatus === 'pending' ? 'destructive' : 'warning'}>
          {row.paymentStatus.toUpperCase()}
        </Badge>
      ),
      pdfValue: (row) => row.paymentStatus.toUpperCase()
    }
  ], [])

  const paymentHistoryColumns = useMemo(() => {
    const cols = [
      { header: "Date", accessor: "date", render: (row) => formatDateTime(row), pdfValue: (row) => formatDateTime(row) },
      { header: "Entry #", accessor: "entryNumber", render: (row) => row.entryNumber, pdfValue: (row) => row.entryNumber },
    ]
    if (selectedBuyerId === 'all') {
      cols.push({
        header: "Customer",
        accessor: "buyer",
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.buyer}</span>
            {row.companyName && row.customerName && row.companyName !== row.customerName && (
              <span className="text-[10px] text-muted-foreground leading-tight">({row.customerName})</span>
            )}
          </div>
        ),
        pdfValue: (row) => row.buyer
      })
    }
    cols.push(
      { header: "Reference", accessor: "reference", render: (row) => row.reference, pdfValue: (row) => row.reference },
      { header: "Mode", accessor: "paymentMethod", render: (row) => <Badge variant="outline">{row.paymentMethod}</Badge>, pdfValue: (row) => row.paymentMethod.toUpperCase() },
      { header: "Amount", accessor: "amount", render: (row) => <span className="text-green-600 font-bold">{formatNumber(row.amount)}</span>, pdfValue: (row) => row.amount },
      { header: "Received By", accessor: "madeBy", render: (row) => row.madeBy, pdfValue: (row) => row.madeBy },
      { header: "Notes", accessor: "notes", render: (row) => <span className="text-sm text-muted-foreground">{row.notes}</span>, pdfValue: (row) => row.notes }
    )
    return cols
  }, [selectedBuyerId])

  // FIX 9: filter uses deferredSearch — the expensive filter runs after the
  // input has painted, so typing always feels instant
  const filteredLedgerTransactions = useMemo(() => {
    if (!deferredSearch) return allLedgerTransactions
    const searchLower = deferredSearch.toLowerCase()
    return allLedgerTransactions.filter(entry =>
      entry.buyer?.toLowerCase().includes(searchLower) ||
      entry.reference?.toLowerCase().includes(searchLower) ||
      entry.type?.toLowerCase().includes(searchLower)
    )
  }, [allLedgerTransactions, deferredSearch])

  // FIX 7: paymentReceiptsColumns closes over the useCallback handlers so the
  // column array reference only changes when selectedBuyerId or isSuperAdmin changes,
  // not on every render.
  const paymentReceiptsColumns = useMemo(() => {
    const baseColumns = [
      {
        header: "Receipt #",
        accessor: "paymentNumber",
        render: (row) => <span className="font-mono font-medium text-blue-600">{row.paymentNumber}</span>,
        pdfValue: (row) => row.paymentNumber
      },
      { header: "Date", accessor: "date", render: (row) => formatDateTime({ date: row.date }), pdfValue: (row) => formatDateTime({ date: row.date }) },
    ]

    if (selectedBuyerId === 'all') {
      baseColumns.push({
        header: "Buyer",
        accessor: "customerName",
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.customerName}</span>
            {row.companyName && row.individualName && row.companyName !== row.individualName && (
              <span className="text-[10px] text-muted-foreground leading-tight">({row.individualName})</span>
            )}
          </div>
        ),
        pdfValue: (row) => row.customerName
      })
    }

    const remainingColumns = [
      {
        header: "Credit",
        accessor: "creditAmount",
        render: (row) => (
          <span className={row.paymentDirection !== 'debit' ? "text-green-600 font-bold" : "text-muted-foreground"}>
            {row.paymentDirection !== 'debit' ? `${formatNumber(row.totalAmount)}` : '-'}
          </span>
        ),
        pdfValue: (row) => row.paymentDirection !== 'debit' ? row.totalAmount : 0
      },
      {
        header: "Balance",
        accessor: "balanceAfter",
        render: (row) => (
          <span className={`font-bold tabular-nums ${row.balanceAfter > 0 ? 'text-red-600' : row.balanceAfter < 0 ? 'text-green-600' : ''}`}>
            {formatNumber(Math.abs(row.balanceAfter))}
            {row.balanceAfter < 0 && <span className="text-xs ml-1"></span>}
          </span>
        ),
        pdfValue: (row) => row.balanceAfter
      },
      {
        header: "Method",
        accessor: "paymentMethod",
        render: (row) => <Badge variant="outline" className="capitalize">{row.paymentMethod}</Badge>,
        pdfValue: (row) => row.paymentMethod.toUpperCase()
      },
      {
        header: "Actions",
        accessor: "actions",
        render: (row) => (
          <div className="flex gap-2">
            {/* FIX 7: using stable useCallback refs — no new function on every render */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewReceipt(row)}
              title="View/Print Receipt"
            >
              <Printer className="h-4 w-4" />
            </Button>
            {row.status === 'active' && (
              isSuperAdmin ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleOpenReversalDialog(row)}
                  title="Reverse Payment"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-orange-600 border-orange-400 hover:bg-orange-50"
                  onClick={() => handleSetReverseRequestTarget(row)}
                  title="Request Reversal"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )
            )}
          </div>
        )
      }
    ]

    return [...baseColumns, ...remainingColumns]
  }, [selectedBuyerId, isSuperAdmin, handleViewReceipt, handleOpenReversalDialog, handleSetReverseRequestTarget])

  const buyerBalanceMap = useMemo(() => {
    const balanceMap = {}
    if (dropdownBuyers && dropdownBuyers.length > 0) {
      for (const buyer of dropdownBuyers) {
        const buyerId = String(buyer._id || buyer.id)
        balanceMap[buyerId] = buyer.balance || 0
      }
    }
    return balanceMap
  }, [dropdownBuyers])

  const handleExportLedgerPDF = useCallback(() => {
    if (!filteredLedgerTransactions.length) {
      toast.error("No ledger data to export")
      return
    }
    const customerName = selectedBuyerId === "all" ? "All Customers" : (selectedEntity?.name || "Customer")
    exportToPDF({
      title: "Customer Ledger Report",
      subtitle: `Customer: ${customerName}`,
      columns: allLedgerColumns,
      data: filteredLedgerTransactions,
      filename: `Customer_Ledger_${customerName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}`
    })
  }, [filteredLedgerTransactions, selectedBuyerId, selectedEntity, allLedgerColumns])

  const handleExportReceiptsPDF = useCallback(() => {
    if (!paymentReceiptsTransactions.length) {
      toast.error("No receipts data to export")
      return
    }
    const customerName = selectedBuyerId === "all" ? "All Customers" : (selectedEntity?.name || "Customer")
    exportToPDF({
      title: "Customer Payment Receipts",
      subtitle: `Customer: ${customerName}`,
      columns: paymentReceiptsColumns.filter(c => c.header !== "Actions"),
      data: paymentReceiptsTransactions,
      filename: `Customer_Receipts_${customerName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}`
    })
  }, [paymentReceiptsTransactions, selectedBuyerId, selectedEntity, paymentReceiptsColumns])

  // FIX 8: derive balances from the shared data — no useBuyer needed
  const currentBuyerLedgerBalance = useMemo(() => {
    if (allLedgerTransactions.length > 0) return allLedgerTransactions[0].balance || 0
    // fallback to balance stored on the buyers list entry
    return selectedEntity?.balance || 0
  }, [allLedgerTransactions, selectedEntity])

  const totalAllBuyersBalance = useMemo(() => {
    return buyers.reduce((sum, b) => sum + (Number(b.balance) || 0), 0)
  }, [buyers])

  const displayBalance = selectedBuyerId === "all" ? totalAllBuyersBalance : currentBuyerLedgerBalance

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="">
          <BackButton fallbackPath="/reports/receivables" label="Back" />
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={() => setPaymentModalOpen(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </Button>
        </div>
      </header>

      <Tabs
        tabs={[
          {
            label: "Buyer Ledger",
            content: (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Buyer</Label>
                    <Combobox
                      options={comboboxOptions}
                      value={selectedBuyerId}
                      onValueChange={(value) => setSelectedBuyerId(value || "all")}
                      placeholder="Select buyer"
                      searchPlaceholder="Search buyer..."
                      emptyMessage="No buyer found"
                      loading={buyersLoading}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="ledger-search">Search Ledger</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      {/* FIX 9: input updates instantly; the expensive filter runs deferred */}
                      <Input
                        id="ledger-search"
                        placeholder="Search by buyer, reference, or type"
                        value={ledgerSearch}
                        onChange={(e) => setLedgerSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">
                      Total Entries
                    </div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                      {filteredLedgerTransactions.length}
                    </div>
                  </div>

                  <div className={`rounded-lg border p-4 shadow-sm ${displayBalance >= 0
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-red-200 bg-red-50/30'
                    }`}>
                    <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${displayBalance >= 0 ? 'text-emerald-700/80' : 'text-red-700/80'
                      }`}>
                      {displayBalance >= 0 ? "Total Receivable from Buyer" : "Total Payable to Buyer"}
                    </div>
                    {/* FIX 8: removed buyerDetailsLoading — no longer a separate fetch */}
                    <div className={`mt-1 text-2xl font-bold tabular-nums ${displayBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}>
                      {formatNumber(Math.abs(displayBalance))}
                    </div>
                  </div>
                </div>

                {buyersError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    Failed to load buyers list.
                  </div>
                )}

                <DataTable
                  title="Buyer Ledger"
                  columns={allLedgerColumns}
                  data={filteredLedgerTransactions}
                  loading={sharedLedgerLoading}
                  onDownloadPDF={handleExportLedgerPDF}
                  hideActions
                />
              </div>
            )
          },
          {
            label: "Payment History",
            content: (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Buyer</Label>
                    <Combobox
                      options={comboboxOptions}
                      value={selectedBuyerId}
                      onValueChange={(value) => setSelectedBuyerId(value || "all")}
                      placeholder="Select buyer"
                      searchPlaceholder="Search buyer..."
                      emptyMessage="No buyer found"
                      loading={buyersLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="history-from">Date From</Label>
                    <Input
                      id="history-from"
                      type="date"
                      value={paymentHistoryDateFrom}
                      onChange={(e) => setPaymentHistoryDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="history-to">Date To</Label>
                    <Input
                      id="history-to"
                      type="date"
                      value={paymentHistoryDateTo}
                      onChange={(e) => setPaymentHistoryDateTo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="history-method">Payment Method</Label>
                    <Select value={paymentHistoryMethodFilter} onValueChange={setPaymentHistoryMethodFilter}>
                      <SelectTrigger id="history-method">
                        <SelectValue placeholder="All methods" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Methods</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank">Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DataTable
                  title="Payment History"
                  columns={paymentHistoryColumns}
                  data={paymentHistoryTransactions}
                  loading={sharedLedgerLoading}
                  hideActions
                />
              </div>
            )
          },
          {
            label: "Payment Receipts",
            content: (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Buyer</Label>
                    <Combobox
                      options={comboboxOptions}
                      value={selectedBuyerId}
                      onValueChange={(value) => setSelectedBuyerId(value || "all")}
                      placeholder="Select buyer"
                      searchPlaceholder="Search buyer..."
                      emptyMessage="No buyer found"
                      loading={buyersLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receipt-from">Date From</Label>
                    <Input
                      id="receipt-from"
                      type="date"
                      value={paymentHistoryDateFrom}
                      onChange={(e) => setPaymentHistoryDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receipt-to">Date To</Label>
                    <Input
                      id="receipt-to"
                      type="date"
                      value={paymentHistoryDateTo}
                      onChange={(e) => setPaymentHistoryDateTo(e.target.value)}
                    />
                  </div>
                </div>


                {paymentReceiptsError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    Failed to load payment receipts.
                  </div>
                )}

                <DataTable
                  title="Payment Receipts"
                  columns={paymentReceiptsColumns}
                  data={paymentReceiptsTransactions}
                  loading={paymentReceiptsLoading || isFetching}
                  onDownloadPDF={handleExportReceiptsPDF}
                  hideActions
                />
              </div>
            )
          }
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <CustomerPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        entityId={selectedBuyerId !== "all" ? selectedBuyerId : ""}
        entityName={selectedEntity?.name || selectedEntity?.company || ""}
        totalBalance={currentBuyerLedgerBalance}
        ledgerBalance={currentBuyerLedgerBalance}
        ledgerBalanceBuyerId={selectedBuyerId !== "all" ? selectedBuyerId : ""}
        buyerBalanceMap={buyerBalanceMap}
        entities={dropdownBuyers}
        allLedgerData={sharedLedgerData}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['ledger'] })
          queryClient.invalidateQueries({ queryKey: ['buyers'] })
          queryClient.invalidateQueries({ queryKey: ['payments'] })
        }}
      />

      <DeleteRequestDialog
        open={!!reverseRequestTarget}
        onClose={() => setReverseRequestTarget(null)}
        entityType="payment"
        entityId={reverseRequestTarget?.id}
        entityRef={reverseRequestTarget?.paymentNumber || String(reverseRequestTarget?.id || '').slice(-6)}
        entitySummary={reverseRequestTarget ? {
          "Buyer": reverseRequestTarget.customerName || "Unknown",
          "Amount": formatNumber(reverseRequestTarget.totalAmount),
          "Method": reverseRequestTarget.paymentMethod || "-",
          "Date": reverseRequestTarget.date ? new Date(reverseRequestTarget.date).toLocaleDateString('en-GB') : "-",
        } : {}}
        onSuccess={() => setReverseRequestTarget(null)}
      />

      <Dialog open={reversalDialogOpen} onOpenChange={setReversalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse Payment</DialogTitle>
            <DialogDescription>
              This action will reverse the payment and update ledger balances.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reversal-reason">Reason</Label>
            <Textarea
              id="reversal-reason"
              placeholder="Enter reason for reversal"
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReversalDialogOpen(false)} disabled={isReversing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReversePayment} disabled={isReversing || !reversalReason.trim()}>
              {isReversing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirm Reverse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  )
}