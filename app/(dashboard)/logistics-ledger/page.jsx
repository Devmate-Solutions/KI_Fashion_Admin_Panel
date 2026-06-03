// "use client"

// import { useState, useMemo } from "react"
// import Link from "next/link"
// import BackButton from "@/components/BackButton"
// import Tabs from "@/components/tabs"
// import { Button } from "@/components/ui/button"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Label } from "@/components/ui/label"
// import { Input } from "@/components/ui/input"
// import { Textarea } from "@/components/ui/textarea"
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
// import DataTable from "../../../components/data-table"
// import { useLogisticsLedger, useAllLogisticsLedgers, useLogisticsPaymentReceipts } from "@/lib/hooks/useLedger"
// import { ledgerAPI } from "@/lib/api/endpoints/ledger"
// import { balancesAPI } from "@/lib/api/endpoints/balances"
// import { logisticsCompaniesAPI } from "@/lib/api/endpoints/logisticsCompanies"
// import { useQuery, useQueryClient } from "@tanstack/react-query"
// import { Loader2, Plus, FileText, Truck, Building2, Clock, Users, Filter, Calendar, RotateCcw, Box, Eye } from "lucide-react"
// import { Badge } from "@/components/ui/badge"
// import toast from "react-hot-toast"
// import LogisticsPaymentModal from "@/components/modals/LogisticsPaymentModal"
// 
// function formatNumber(n) {
//   const num = Number(n || 0)
//   return num.toFixed(2)
// }

// function currency(n) {
//   const num = Number(n || 0)
//   return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
// }

// 


// export default function LogisticsLedgerPage() {
//   const [selectedCompanyId, setSelectedCompanyId] = useState("") // Default to empty - require company selection
//   const [activeTab, setActiveTab] = useState(0)
//   const [isDialogOpen, setIsDialogOpen] = useState(false)
//   const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
//   const [markAsPaidDialog, setMarkAsPaidDialog] = useState({ open: false, balance: null })
//   const [markAsPaidForm, setMarkAsPaidForm] = useState({ method: 'cash', amount: '' })
//   const [isMarkingAsPaid, setIsMarkingAsPaid] = useState(false)
//   const [paymentForm, setPaymentForm] = useState({
//     amount: '',
//     date: '',
//     description: '',
//     method: 'cash'
//   })

//   // Universal payment modal state
//   const [universalPaymentOpen, setUniversalPaymentOpen] = useState(false)

//   // Filters for Tab 1 - Ledger
//   const [ledgerCompanyFilter, setLedgerCompanyFilter] = useState("all") // Default to all companies on load
//   const [ledgerTypeFilter, setLedgerTypeFilter] = useState("all")

//   // Filters for Tab 3 (Payment History)
//   const [paymentHistoryCompany, setPaymentHistoryCompany] = useState("") // Default to empty - require company selection
//   const [paymentHistoryDateFrom, setPaymentHistoryDateFrom] = useState("")
//   const [paymentHistoryDateTo, setPaymentHistoryDateTo] = useState("")
//   const [paymentHistoryMethodFilter, setPaymentHistoryMethodFilter] = useState("all")

//   // Filters for Tab 4 (Payment Receipts)
//   const [paymentReceiptCompany, setPaymentReceiptCompany] = useState("") // Default to empty - require company selection
//   const [paymentReceiptDateFrom, setPaymentReceiptDateFrom] = useState("")
//   const [paymentReceiptDateTo, setPaymentReceiptDateTo] = useState("")
//   //   
//   const queryClient = useQueryClient()

//   // Fetch ALL logistics companies for dropdowns
//   const { data: allCompanies = [], isLoading: allCompaniesLoading } = useQuery({
//     queryKey: ['logisticsCompanies', 'all'],
//     queryFn: async () => {
//       const response = await logisticsCompaniesAPI.getAll({ limit: 100 })
//       let companiesList = []
//       if (response?.data?.data) {
//         companiesList = Array.isArray(response.data.data) ? response.data.data : []
//       } else if (response?.data?.rows) {
//         companiesList = Array.isArray(response.data.rows) ? response.data.rows : []
//       } else if (Array.isArray(response?.data)) {
//         companiesList = response.data
//       }
//       return companiesList
//     },
//   })

//   // Fetch logistics ledger entries for Tab 1 (only when a company is selected)
//   const ledgerFilterParams = useMemo(() => {
//     if (!ledgerCompanyFilter) {
//       return null // Don't fetch if no company selected
//     }
//     if (ledgerCompanyFilter === 'all') {
//       return { limit: 500 } // Fetch all companies
//     }
//     return { logisticsCompanyId: ledgerCompanyFilter, limit: 100 }
//   }, [ledgerCompanyFilter])

//   const { data: allLedgerData, isLoading: allLedgerLoading, error: allLedgerError } = useAllLogisticsLedgers(ledgerFilterParams || {})

//   // Fetch ledger entries for selected company in Tab 2
//   const { data: ledgerData, isLoading: ledgerLoading } = useLogisticsLedger(
//     selectedCompanyId && selectedCompanyId !== 'all' ? selectedCompanyId : ''
//   )

//   // Fetch pending balances (only when a specific company is selected)
//   const { data: pendingBalancesData, isLoading: pendingBalancesLoading, error: pendingBalancesError } = useQuery({
//     queryKey: ['pending-balances-logistics', selectedCompanyId],
//     queryFn: async () => {
//       try {
//         // Debug logging
//         console.log('Fetching pending balances for company:', selectedCompanyId)
//         const response = await balancesAPI.getLogisticsPendingBalances(selectedCompanyId)
//         console.log('Pending balances response:', response)
//         const result = response?.data?.data || response?.data || { balances: [], totals: { cashPending: 0, bankPending: 0, totalPending: 0 } }
//         console.log('Pending balances result:', result)
//         return result
//       } catch (error) {
//         console.error('Error fetching logistics pending balances:', error)
//         throw error
//       }
//     },
//     enabled: activeTab === 1 && !!selectedCompanyId && selectedCompanyId !== 'all' // Only fetch when Tab 2 is active AND company selected
//   })

//   const pendingBalances = pendingBalancesData?.balances || []
//   const pendingTotals = pendingBalancesData?.totals || { cashPending: 0, bankPending: 0, totalPending: 0, totalPaid: 0 }

//   // Fetch payment history for Tab 3 (only when a company is selected)
//   const paymentHistoryParams = useMemo(() => {
//     if (!paymentHistoryCompany || paymentHistoryCompany === 'all') {
//       return null // Don't fetch if no company selected
//     }
//     return { logisticsCompanyId: paymentHistoryCompany, limit: 100 }
//   }, [paymentHistoryCompany])

//   const { data: paymentHistoryData, isLoading: paymentHistoryLoading } = useAllLogisticsLedgers(paymentHistoryParams || {})

//   // Fetch payment receipts for Tab 4 (only when a company is selected)
//   const paymentReceiptParams = useMemo(() => {
//     if (!paymentReceiptCompany || paymentReceiptCompany === 'all') {
//       return null // Don't fetch if no company selected
//     }
//     const params = { limit: 100 };
//     if (paymentReceiptDateFrom) params.dateFrom = paymentReceiptDateFrom;
//     if (paymentReceiptDateTo) params.dateTo = paymentReceiptDateTo;
//     return params;
//   }, [paymentReceiptCompany, paymentReceiptDateFrom, paymentReceiptDateTo])

//   const { data: paymentReceiptsData, isLoading: paymentReceiptsLoading } = useLogisticsPaymentReceipts(
    // paymentReceiptCompany === 'all' ? 'all' : (paymentReceiptCompany || 'all'),
    // paymentReceiptParams || {}
  // )

//   const paymentReceipts = useMemo(() => {
//     if (!paymentReceiptsData?.receipts) return []
//     return paymentReceiptsData.receipts
//   }, [paymentReceiptsData])

//   // Transform all ledger entries for Tab 1 display with client-side running balance
//   const allLedgerTransactions = useMemo(() => {
//     // Debug logging
//     if (ledgerCompanyFilter === 'all') {
//       console.log('All companies selected - allLedgerData:', allLedgerData)
//       console.log('Entries:', allLedgerData?.entries)
//     }

//     if (!allLedgerData?.entries) {
//       console.log('No entries found in allLedgerData:', allLedgerData)
//       return []
//     }

//     let filteredEntries = allLedgerData.entries.filter(entry =>
//       entry.transactionType === 'charge' ||
//       entry.transactionType === 'payment' ||
//       entry.transactionType === 'adjustment'
//     )

//     // Apply type filter
//     if (ledgerTypeFilter !== 'all') {
//       if (ledgerTypeFilter === 'charge') {
//         filteredEntries = filteredEntries.filter(e => e.transactionType === 'charge')
//       } else if (ledgerTypeFilter === 'cash') {
//         filteredEntries = filteredEntries.filter(e => e.transactionType === 'payment' && e.paymentMethod === 'cash')
//       } else if (ledgerTypeFilter === 'bank') {
//         filteredEntries = filteredEntries.filter(e => e.transactionType === 'payment' && e.paymentMethod === 'bank')
//       } else if (ledgerTypeFilter === 'adjustment') {
//         filteredEntries = filteredEntries.filter(e => e.transactionType === 'adjustment')
//       }
//     }

//     // Transform entries first
//     const transformedEntries = filteredEntries.map(entry => {
//       const company = entry.entityId || {}
//       let typeLabel = entry.transactionType || '-'

//       if (entry.transactionType === 'payment') {
//         if (entry.paymentMethod === 'cash') {
//           typeLabel = 'Payment - Cash'
//         } else if (entry.paymentMethod === 'bank') {
//           typeLabel = 'Payment - Bank'
//         } else {
//           typeLabel = 'Payment'
//         }
//       } else if (entry.transactionType === 'charge') {
//         typeLabel = 'Logistics Charge'
//       } else if (entry.transactionType === 'adjustment') {
//         typeLabel = 'Debit'
//       }

//       let readableReference = '-'
//       if (entry.referenceId) {
//         if (typeof entry.referenceId === 'object' && entry.referenceId !== null) {
//           readableReference = entry.referenceId.orderNumber || entry.referenceId._id || '-'
//         } else {
//           readableReference = entry.referenceId.toString()
//         }
//       } else if (entry.reference || entry.referenceNumber) {
//         readableReference = entry.reference || entry.referenceNumber
//       }

//       // Extract supplier info from reference (DispatchOrder)
//       let supplierCompany = '-'
//       let supplierContact = '-'
//       if (entry.referenceId && typeof entry.referenceId === 'object' && entry.referenceId !== null) {
//         supplierCompany = entry.referenceId.supplierCompany || '-'
//         supplierContact = entry.referenceId.supplierName || '-'
//       }

//       return {
//         id: entry._id || entry.id,
//         date: entry.date || entry.createdAt,
//         company: company.name || 'Unknown Company',
//         companyId: company._id || company.id,
//         supplierName: supplierCompany || supplierContact || '-',
//         supplierCompany,
//         supplierContact,
//         type: typeLabel,
//         transactionType: entry.transactionType || entry.type,
//         description: entry.description || entry.notes || '-',
//         debit: entry.debit || 0,
//         credit: entry.credit || 0,
//         balance: entry.balance || 0, // Original stored balance (for reference)
//         boxes: entry.boxes ?? null,
//         boxRateSnapshot: entry.boxRateSnapshot ?? null,
//         reference: readableReference,
//         referenceId: (entry.referenceId && typeof entry.referenceId === 'object' && entry.referenceId._id)
//           ? entry.referenceId._id.toString()
//           : (entry.referenceId ? entry.referenceId.toString() : null),
//         referenceModel: entry.referenceModel || '-',
//         paymentMethod: entry.paymentMethod || null,
//         paymentDetails: entry.paymentDetails || null,
//         boxRate: company.rates?.boxRate || null,
//         createdAt: entry.createdAt, // For secondary sorting
//         raw: entry
//       }
//     })

//     // Sort by createdAt ASCENDING (oldest first) for running balance calculation
//     const sortedAsc = [...transformedEntries].sort((a, b) => {
//       const createdAtA = new Date(a.date || a.createdAt || 0).getTime()
//       const createdAtB = new Date(b.date || b.createdAt || 0).getTime()
//       return createdAtA - createdAtB
//     })

//     // Calculate client-side running balance
//     // Debit = charge (increases what admin owes), Credit = payment (decreases what admin owes)
//     let runningBalance = 0
//     const withRunningBalance = sortedAsc.map(entry => {
//       runningBalance += (entry.debit || 0) - (entry.credit || 0)
//       return { ...entry, runningBalance }
//     })

//     // Reverse back for display (newest first)
//     return withRunningBalance.reverse()
//   }, [allLedgerData, ledgerTypeFilter, ledgerCompanyFilter])

//   // Transform payment history for Tab 3
//   const paymentHistoryTransactions = useMemo(() => {
//     if (!paymentHistoryData?.entries) return []

//     const paymentEntries = paymentHistoryData.entries.filter(entry =>
//       entry.transactionType === 'payment'
//     )

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

//     if (paymentHistoryMethodFilter !== 'all') {
//       filtered = filtered.filter(entry => entry.paymentMethod === paymentHistoryMethodFilter)
//     }

//     return filtered.map(entry => {
//       const company = entry.entityId || {}
//       const companyName = company.name || 'Unknown Company'

//       let reference = '-'
//       if (entry.referenceId) {
//         if (typeof entry.referenceId === 'object' && entry.referenceId !== null) {
//           reference = entry.referenceId.orderNumber || entry.referenceId._id || '-'
//         } else {
//           reference = entry.referenceId.toString()
//         }
//       }

//       const madeBy = entry.createdBy?.name || 'Unknown'

//       return {
//         id: entry._id || entry.id,
//         date: entry.date || entry.createdAt,
//         createdAt: entry.createdAt, // Include createdAt for time component
//         companyName,
//         companyId: company._id || company.id,
//         reference,
//         paymentMethod: entry.paymentMethod || 'cash',
//         amount: entry.credit || 0,
//         madeBy,
//         notes: entry.description || entry.remarks || '-',
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

//     const now = new Date()
//     const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
//     const countThisMonth = paymentHistoryTransactions.filter(txn => {
//       const txnDate = new Date(txn.date)
//       return txnDate >= firstDayOfMonth
//     }).length

//     return { total, cash, bank, countThisMonth }
//   }, [paymentHistoryTransactions])

//   // Use client-side calculated running balance (same as table's top row)
//   // This ensures the summary card matches the Balance column of the first row in the table
//   const calculatedTotalBalance = useMemo(() => {
//     // Get the balance from the first entry (newest after sorting/reversing)
//     // This represents the current running balance
//     if (allLedgerTransactions.length > 0) {
//       return allLedgerTransactions[0].runningBalance || 0
//     }
//     // Fallback to backend totalBalance for empty data case
//     return allLedgerData?.totalBalance || 0
//   }, [allLedgerTransactions, allLedgerData])

//   // Ledger table columns for Tab 1
//   const allLedgerColumns = useMemo(
//     () => [
//       {
//         header: "Date",
//         accessor: "date",
//         render: (row) => {
//           // Use createdAt for time component if available, otherwise use date
//           const dateTime = row.date || row.createdAt;
//           if (!dateTime) return "-";
//           const d = new Date(dateTime);
//           const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
//           const date = d.toLocaleDateString('en-GB');
//           return `${date} ${time}`;
//         }
//       },
//       {
//         header: "Company",
//         accessor: "company",
//         render: (row) => (
//           <span className="font-medium">{row.company}</span>
//         )
//       },
//       {
//         header: "Supplier",
//         accessor: "supplierName",
//         render: (row) => (
//           <div className="text-sm">
//             <span className="font-semibold">{row.supplierCompany || row.supplierName || '-'}</span>
//             {row.supplierContact && row.supplierContact !== '-' && (
//               <span className="text-muted-foreground"> ({row.supplierContact})</span>
//             )}
//           </div>
//         )
//       },
//       {
//         header: "Reference",
//         accessor: "reference",
//         render: (row) => (
//           row.referenceId ? (
//             <Link
//               href={`/dispatch-orders/${row.referenceId}`}
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
//         header: "Notes",
//         accessor: "description",
//         render: (row) => (
//           <span className="font-medium block max-w-[250px] truncate" title={row.description || ''}>
//             {row.description || '-'}
//           </span>
//         )
//       },
//       {
//         header: "Boxes",
//         accessor: "boxes",
//         render: (row) => {
//           const ref = row.raw?.referenceId;
//           const totalBoxes = row.raw?.boxes ?? ref?.totalBoxes ?? (Array.isArray(ref?.boxes) ? ref.boxes.length : null);
//           return <span>{totalBoxes || '-'}</span>
//         }
//       },
//       {
//         header: "Box Rate",
//         accessor: "boxRate",
//         render: (row) => {
//           const boxRate = row.raw?.boxRateSnapshot ?? row.boxRate;
//           return <span>{boxRate ? currency(boxRate) : '-'}</span>
//         }
//       },
//       {
//         header: "Debit (Charges)",
//         accessor: "debit",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${row.debit > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
//             {row.debit > 0 ? formatNumber(row.debit) : '-'}
//           </span>
//         )
//       },
//       {
//         header: "Cash Paid",
//         accessor: "cashPaid",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${row.credit > 0 && row.paymentMethod === 'cash' ? 'text-green-600' : 'text-muted-foreground'}`}>
//             {row.credit > 0 && row.paymentMethod === 'cash' ? formatNumber(row.credit) : '-'}
//           </span>
//         )
//       },
//       {
//         header: "Bank Paid",
//         accessor: "bankPaid",
//         render: (row) => (
//           <span className={`tabular-nums font-semibold ${row.credit > 0 && row.paymentMethod === 'bank' ? 'text-green-600' : 'text-muted-foreground'}`}>
//             {row.credit > 0 && row.paymentMethod === 'bank' ? formatNumber(row.credit) : '-'}
//           </span>
//         )
//       },
//       {
//         header: "Balance",
//         accessor: "runningBalance",
//         render: (row) => {
//           const balance = row.runningBalance ?? row.balance ?? 0
//           // Positive = admin owes logistics (red), Negative = credit/overpaid (green)
//           const isCredit = balance < 0
//           return (
//             <span className={`tabular-nums font-bold ${isCredit ? 'text-green-600' : balance > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
//               {isCredit ? `-${formatNumber(Math.abs(balance))}` : formatNumber(balance)}
//             </span>
//           )
//         }
//       }
//     ],
//     []
//   )

//   // Pending Balance Columns for Tab 2
//   const pendingBalanceColumns = useMemo(() => {
//     const columns = [
//       {
//         header: "Date",
//         accessor: "date",
//         render: (row) => {
//           // Use createdAt for time component if available, otherwise use date
//           const dateTime = row.date || row.createdAt;
//           if (!dateTime) return "-";
//           const d = new Date(dateTime);
//           const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
//           const date = d.toLocaleDateString('en-GB');
//           return `${date} ${time}`;
//         }
//       }
//     ]

//     columns.push(
//       {
//         header: "Reference",
//         accessor: "reference",
//         render: (row) => (
//           <span className="font-medium  text-blue-600 cursor-pointer hover:underline">
//             {row.reference || '-'}
//           </span>
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
//         header: "Cash Paid",
//         accessor: "cashPaid",
//         render: (row) => (
//           <span className={`tabular-nums font-medium ${(row.cashPaid || 0) > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
//             {(row.cashPaid || 0) > 0 ? formatNumber(row.cashPaid) : '-'}
//           </span>
//         )
//       },
//       {
//         header: "Bank Paid",
//         accessor: "bankPaid",
//         render: (row) => (
//           <span className={`tabular-nums font-medium ${(row.bankPaid || 0) > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
//             {(row.bankPaid || 0) > 0 ? formatNumber(row.bankPaid) : '-'}
//           </span>
//         )
//       },
//       {
//         header: "Remaining",
//         accessor: "amount",
//         render: (row) => {
//           const remaining = row.amount || 0
//           // Positive = still owed (red), Negative = overpaid/credit (green)
//           const isCredit = remaining < 0
//           return (
//             <span className={`tabular-nums font-semibold ${isCredit ? 'text-green-600' : remaining > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
//               {isCredit ? `-${formatNumber(Math.abs(remaining))}` : formatNumber(remaining)}
//             </span>
//           )
//         }
//       },
//       // {
//       //   header: "Payment Type",
//       //   accessor: "paymentType",
//       //   render: (row) => (
//       //     <Badge variant="outline" className={row.paymentType === 'cash' ? 'border-green-500 text-green-700' : 'border-blue-500 text-blue-700'}>
//       //       {row.paymentType === 'cash' ? 'Cash' : 'Bank'}
//       //     </Badge>
//       //   )
//       // },
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
//       {
//         header: "Action",
//         accessor: "action",
//         render: (row) => (
//           row.status !== 'paid' ? (
//             <Button
//               size="sm"
//               variant="outline"
//               onClick={() => handleMarkAsPaid(row)}
//               className="h-8"
//               disabled={isMarkingAsPaid}
//             >
//               {isMarkingAsPaid ? (
//                 <>
//                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                   Processing...
//                 </>
//               ) : (
//                 'Make Payment'
//               )}
//             </Button>
//           ) : (
//             <span className="text-sm text-muted-foreground">-</span>
//           )
//         )
//       }
//     )

//     return columns
//   }, [isMarkingAsPaid])

//   // Payment History Columns for Tab 3
//   const paymentHistoryColumns = useMemo(() => {
//     const columns = [
//       {
//         header: "Date",
//         accessor: "date",
//         render: (row) => {
//           // Use createdAt for time component if available, otherwise use date
//           const dateTime = row.date || row.createdAt;
//           if (!dateTime) return "-";
//           const d = new Date(dateTime);
//           const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
//           const date = d.toLocaleDateString('en-GB');
//           return `${date} ${time}`;
//         }
//       }
//     ]

//     columns.push(
//       {
//         header: "Order Reference",
//         accessor: "reference",
//         render: (row) => (
//           <span className="font-medium text-blue-600">
//             {row.reference || '-'}
//           </span>
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
//         header: "Made By",
//         accessor: "madeBy",
//         render: (row) => (
//           <span className="text-sm text-muted-foreground">{row.madeBy || '-'}</span>
//         )
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
//   }, [])

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
//       toast.error(`Payment amount (${formatNumber(amount)}) exceeds remaining balance (${formatNumber(balance.amount)})`)
//       return
//     }

//     setIsMarkingAsPaid(true)

//     try {
//       await ledgerAPI.createEntry({
//         type: 'logistics',
//         entityId: balance.logisticsCompanyId,
//         entityModel: 'LogisticsCompany',
//         transactionType: 'payment',
//         referenceId: balance.id,
//         referenceModel: 'DispatchOrder',
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

//       await queryClient.invalidateQueries({ queryKey: ['pending-balances-logistics', selectedCompanyId] })
//       await queryClient.invalidateQueries({ queryKey: ['ledger', 'logistics'] })
//       await queryClient.refetchQueries({ queryKey: ['pending-balances-logistics', selectedCompanyId] })

//     } catch (error) {
//       console.error('Error marking as paid:', error)
//       toast.error(error.response?.data?.message || error.message || 'Failed to record payment')
//     } finally {
//       setIsMarkingAsPaid(false)
//     }
//   }

//   const handleAddPayment = async () => {
//     if (!selectedCompanyId || selectedCompanyId === 'all') {
//       toast.error('Please select a company first')
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

//     setIsSubmittingPayment(true)

//     try {
//       const company = allCompanies.find(c => (c._id || c.id) === selectedCompanyId)
//       if (!company) {
//         throw new Error('Company not found')
//       }

//       // Use the distribute payment API to properly link payments to orders
//       await ledgerAPI.distributeLogisticsPayment(selectedCompanyId, {
//         amount: amount,
//         paymentMethod: paymentForm.method,
//         date: paymentForm.date ? new Date(paymentForm.date) : new Date(),
//         description: paymentForm.description || `Payment - ${paymentForm.method}`
//       })

//       toast.success('Payment distributed successfully')

//       setPaymentForm({ amount: '', date: '', description: '', method: 'cash' })
//       setIsDialogOpen(false)

//       queryClient.invalidateQueries({ queryKey: ['pending-balances-logistics', selectedCompanyId] })
//       queryClient.invalidateQueries({ queryKey: ['ledger', 'logistics'] })

//     } catch (error) {
//       console.error('Error creating payment:', error)
//       toast.error(error.response?.data?.message || error.message || 'Failed to record payment')
//     } finally {
//       setIsSubmittingPayment(false)
//     }
//   }

//   // TAB 1: Ledger Content - Premium Redesign
//   const ledgerTabContent = (
//     <div className="space-y-6">
//       <div className="rounded-lg border border-border/60 bg-gradient-to-br from-card via-background to-card shadow-sm overflow-hidden">
//         {/* Header Section */}
//         <div className="relative bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b border-border/50 px-4 sm:px-6 py-4 sm:py-5">
//           <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//             <div className="flex items-center gap-3 sm:gap-4">
//               <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl bg-primary/10 backdrop-blur-sm flex items-center justify-center ring-1 ring-primary/20 shadow-sm">
//                 <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
//               </div>
//               <div>
//                 <h2 className="font-semibold text-lg sm:text-xl text-foreground tracking-tight">Complete Ledger History</h2>
//                 <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Select a company to view their complete accounting record</p>
//               </div>
//             </div>
//             <div className="flex flex-row items-end gap-3 sm:gap-4">
//               <div className="flex-1 sm:w-[250px] sm:flex-none">
//                 <Label htmlFor="ledger-company-filter" className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
//                   <Users className="h-3.5 w-3.5 text-muted-foreground" />
//                   Select Company
//                 </Label>
//                 <Select
//                   value={ledgerCompanyFilter}
//                   onValueChange={(value) => {
//                     setLedgerCompanyFilter(value)
//                     setSelectedCompanyId(value)
//                   }}
//                   disabled={allCompaniesLoading}
//                 >
//                   <SelectTrigger id="ledger-company-filter" className="h-10 sm:h-11 border-border/60 bg-background/50 backdrop-blur-sm hover:bg-background transition-colors">
//                     <SelectValue placeholder="Select a company..." />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="all">All Companies</SelectItem>
//                     {allCompanies.map((company) => (
//                       <SelectItem key={company._id || company.id} value={company._id || company.id}>
//                         {company.name}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>
//               {ledgerCompanyFilter && ledgerCompanyFilter !== 'all' && (
//                 <div className="flex-1 sm:w-[200px] sm:flex-none">
//                   <Label htmlFor="ledger-type-filter" className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
//                     <Filter className="h-3.5 w-3.5 text-muted-foreground" />
//                     Filter By
//                   </Label>
//                   <Select
//                     value={ledgerTypeFilter}
//                     onValueChange={setLedgerTypeFilter}
//                   >
//                     <SelectTrigger id="ledger-type-filter" className="h-10 sm:h-11 border-border/60 bg-background/50 backdrop-blur-sm hover:bg-background transition-colors">
//                       <SelectValue placeholder="All Transactions" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Transactions</SelectItem>
//                       <SelectItem value="charge">Logistics Charges</SelectItem>
//                       <SelectItem value="cash">Payments - Cash</SelectItem>
//                       <SelectItem value="bank">Payments - Bank</SelectItem>
//                       <SelectItem value="adjustment">Debit Adjustment</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Content Section */}
//         <div className="p-3 sm:p-6">
//           {!ledgerCompanyFilter ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl"></div>
//                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 backdrop-blur-sm ring-2 ring-border/60 shadow-lg">
//                   <Truck className="w-12 h-12 text-muted-foreground" />
//                 </div>
//               </div>
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">Select a company to view ledger</h3>
//               <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
//                 Choose a logistics company from the dropdown above to see their complete transaction history
//               </p>
//             </div>
//           ) : allLedgerLoading ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
//                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background backdrop-blur-sm ring-2 ring-primary/20 shadow-lg">
//                   <Loader2 className="w-12 h-12 text-primary animate-spin" />
//                 </div>
//               </div>
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">Loading ledger entries</h3>
//               <p className="text-sm text-muted-foreground">Please wait while we fetch the records...</p>
//             </div>
//           ) : allLedgerError ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4 text-red-600">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-red-500/5 rounded-full blur-3xl"></div>
//                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-red-100/80 to-red-100/40 backdrop-blur-sm ring-2 ring-red-200/50 shadow-lg">
//                   <FileText className="w-12 h-12 text-red-600" />
//                 </div>
//               </div>
//               <h3 className="text-lg font-semibold text-red-700 mb-2.5">Error loading ledger entries</h3>
//               <p className="text-sm text-red-600 text-center max-w-md">{allLedgerError.message || 'Unknown error'}</p>
//               <p className="text-xs text-muted-foreground mt-2">Check console for details</p>
//             </div>
//           ) : allLedgerTransactions.length === 0 ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-muted/30 rounded-full blur-3xl"></div>
//                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 backdrop-blur-sm ring-2 ring-border/60 shadow-lg">
//                   <FileText className="w-12 h-12 text-muted-foreground" />
//                 </div>
//               </div>
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">No ledger entries found</h3>
//               <p className="text-sm text-muted-foreground text-center max-w-md">No transaction records found for this company matching the selected filters.</p>
//             </div>
//           ) : (
//             <>
//               {/* Summary Cards */}
//               <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-card via-background to-card p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
//                   <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all"></div>
//                   <div className="relative z-10">
//                     <div className="flex items-center justify-between mb-4">
                     
//                     </div>
//                     <div className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-2 text-muted-foreground">
//                       Total Entries
//                     </div>
//                     <div className="text-3xl font-bold tabular-nums text-foreground mb-1">
//                       {allLedgerTransactions.length}
//                     </div>
//                     <div className="text-xs text-muted-foreground">All transactions recorded</div>
//                   </div>
//                 </div>
//                 <div
//                   className={`relative rounded-lg border p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group ${
//                     calculatedTotalBalance <= 0
//                       ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-emerald-50/30'
//                       : 'border-red-200 bg-gradient-to-br from-red-50/50 to-red-50/30'
//                   }`}
//                 >
//                   <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all"></div>
//                   <div className="relative z-10">
//                     <div className="flex items-center justify-between mb-4">
//                     </div>
//                     <div className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2 text-muted-foreground">
//                       {ledgerCompanyFilter === 'all' || !ledgerCompanyFilter ? 'Total Company Balance' : 'Company Balance'}
//                     </div>
//                     <div
//                       className={`text-3xl font-bold tabular-nums mb-1 ${
//                         calculatedTotalBalance <= 0 ? 'text-emerald-700' : 'text-red-700'
//                       }`}
//                     >
//                       £{formatNumber(Math.abs(calculatedTotalBalance))}
//                     </div>
//                     <div
//                       className={`text-xs font-semibold mt-1 ${
//                         calculatedTotalBalance <= 0 ? 'text-emerald-600/80' : 'text-red-600/80'
//                       }`}
//                     >
//                       {calculatedTotalBalance <= 0
//                         ? 'Total recievable from company'
//                         : 'Total payable to company'}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//               {/* Data Table */}
//               <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
//                 <DataTable
//                   columns={allLedgerColumns}
//                   data={allLedgerTransactions}
//                   hideActions
//                   enableSearch={true}
//                   paginate={true}
//                   pageSize={50}
//                   disableSorting={true}
//                 />
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   )

//   // TAB 2: Pending Payments Content
//   const paymentSelector = (
//     <div className="space-y-4">
//       <div className="flex items-center gap-4">
//         <div className="flex-1">
//           <Label htmlFor="company-select">Select Company</Label>
//           <Select
//             value={selectedCompanyId}
//             onValueChange={(value) => {
//               setSelectedCompanyId(value)
//             }}
//             disabled={allCompaniesLoading}
//           >
//             <SelectTrigger id="company-select">
//               <SelectValue placeholder="Choose a company..." />
//             </SelectTrigger>
//             <SelectContent>
//               {allCompaniesLoading ? (
//                 <SelectItem value="loading" disabled>Loading companies...</SelectItem>
//               ) : allCompanies.length === 0 ? (
//                 <SelectItem value="none" disabled>No companies found</SelectItem>
//               ) : (
//                 allCompanies.map((company) => (
//                   <SelectItem key={company._id || company.id} value={company._id || company.id}>
//                     {company.name}
//                   </SelectItem>
//                 ))
//               )}
//             </SelectContent>
//           </Select>
//         </div>
//       </div>
//     </div>
//   )

//   const pendingPaymentsContent = (
//     <>
//       {/* Stats Cards - Only show when company is selected */}
//       {selectedCompanyId && selectedCompanyId !== 'all' && (
//         <div className="grid grid-cols-2 gap-4 mb-6">
//           <div className="bg-white rounded-lg border p-6">
//             <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Paid</h3>
//             <div className="text-2xl font-bold text-green-600">
//               {formatNumber(pendingTotals.totalPaid || 0)}
//             </div>
//           </div>
//           <div className="bg-white rounded-lg border p-6">
//             <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Pending</h3>
//             <div className="text-2xl font-bold text-red-600">
//               {formatNumber(pendingTotals.totalPending || 0)}
//             </div>
//           </div>
//         </div>
//       )}

//       <div className="bg-white rounded-lg border">
//         <div className="p-4 border-b">
//           <h2 className="font-semibold">Pending Payments - Action Center</h2>
//           <p className="text-sm text-muted-foreground mt-1">Select a company to view orders that need payment</p>
//         </div>

//         <div className="p-4 space-y-4">
//           {paymentSelector}
//         </div>
//       </div>

//       {/* Pending Balances View - Only shown when company is selected */}
//       {!selectedCompanyId || selectedCompanyId === 'all' ? (
//         <div className="bg-white rounded-lg border p-12 text-center text-muted-foreground mt-4">
//           <div className="mb-4">
//             <svg className="mx-auto h-12 w-12 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
//             </svg>
//           </div>
//           <p className="text-lg font-medium">Select a company to view pending payments</p>
//           <p className="text-sm mt-1">Choose a logistics company from the dropdown above to see their pending payment details</p>
//         </div>
//       ) : pendingBalancesLoading ? (
//         <div className="bg-white rounded-lg border p-8 flex items-center justify-center mt-4">
//           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
//           <span className="ml-2 text-muted-foreground">Loading pending balances...</span>
//         </div>
//       ) : pendingBalancesError ? (
//         <div className="bg-white rounded-lg border p-8 text-center text-red-600 mt-4">
//           <p>Error loading pending balances: {pendingBalancesError.message}</p>
//           <p className="text-xs text-muted-foreground mt-2">Check console for details</p>
//         </div>
//       ) : pendingBalances.length === 0 ? (
//         <div className="bg-white rounded-lg border p-8 text-center text-muted-foreground mt-4">
//           <p>No pending balances found for this company.</p>
//           <p className="text-xs mt-2">This company has no confirmed dispatch orders with remaining balances.</p>
//         </div>
//       ) : (
//         <div className="bg-white rounded-lg border mt-4">
//           <DataTable columns={pendingBalanceColumns} data={pendingBalances} hideActions />
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
//                   <span className="font-medium">Company:</span> {markAsPaidDialog.balance.companyName}
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

//   // TAB 3: Payment History Content - Premium Redesign
//   const paymentHistoryTabContent = (
//     <div className="space-y-6">
//       {/* Summary Cards - Premium Design */}
//       {paymentHistoryCompany && paymentHistoryCompany !== 'all' && (
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
//                 £{formatNumber(paymentSummary.total)}
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
//                 £{formatNumber(paymentSummary.cash)}
//               </div>
//               <div className="text-xs font-medium text-muted-foreground">Cash transactions</div>
//             </div>
//           </div>

//           {/* Bank Payments Card */}
//           <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-background via-card/50 to-background p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
//             <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all"></div>
//             <div className="relative z-10">
//               <div className="flex items-center justify-between mb-4">
//                 <div className="h-12 w-12 rounded-xl bg-muted/70 backdrop-blur-sm flex items-center justify-center ring-1 ring-border/60 shadow-sm">
//                   <Building2 className="h-6 w-6 text-muted-foreground" />
//                 </div>
//               </div>
//               <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2.5 text-muted-foreground">
//                 Bank Payments
//               </div>
//               <div className="text-3xl font-bold tabular-nums text-foreground mb-1.5">
//                 £{formatNumber(paymentSummary.bank)}
//               </div>
//               <div className="text-xs font-medium text-muted-foreground">Bank transfers</div>
//             </div>
//           </div>

//           {/* Payments This Month Card */}
//           <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-background via-card/50 to-background p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
//             <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all"></div>
//             <div className="relative z-10">
//               <div className="flex items-center justify-between mb-4">
//                 <div className="h-12 w-12 rounded-xl bg-muted/70 backdrop-blur-sm flex items-center justify-center ring-1 ring-border/60 shadow-sm">
//                   <Clock className="h-6 w-6 text-muted-foreground" />
//                 </div>
//               </div>
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
//         {/* Header Section */}
//         <div className="relative bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b border-border/50 px-6 py-5">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-4">
//               <div className="h-12 w-12 rounded-xl bg-primary/10 backdrop-blur-sm flex items-center justify-center ring-1 ring-primary/20 shadow-sm">
//                 <FileText className="h-6 w-6 text-primary" />
//               </div>
//               <div>
//                 <h2 className="font-semibold text-xl text-foreground tracking-tight">Payment History</h2>
//                 <p className="text-sm text-muted-foreground mt-1">Select a company to view their payment history</p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Filters Section */}
//         <div className="px-6 py-5 bg-gradient-to-b from-muted/20 via-muted/10 to-transparent border-b border-border/30">
//           <div className="flex items-center gap-2.5 mb-5">
//             <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
//               <Filter className="h-4 w-4 text-muted-foreground" />
//             </div>
//             <span className="text-sm font-semibold text-foreground">Filter Options</span>
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//             <div className="flex flex-col min-w-0">
//               <Label htmlFor="payment-history-company" className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
//                 <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
//                 <span className="whitespace-nowrap">Select Company</span>
//               </Label>
//               <Select
//                 value={paymentHistoryCompany}
//                 onValueChange={(value) => {
//                   setPaymentHistoryCompany(value)
//                   setSelectedCompanyId(value)
//                 }}
//                 disabled={allCompaniesLoading}
//               >
//                 <SelectTrigger id="payment-history-company" className="h-[44px] w-full border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg">
//                   <SelectValue placeholder="Select a company..." />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {allCompanies.map((company) => (
//                     <SelectItem key={company._id || company.id} value={company._id || company.id}>
//                       {company.name}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
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
//           {!paymentHistoryCompany || paymentHistoryCompany === 'all' ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl"></div>
//                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 backdrop-blur-sm ring-2 ring-border/60 shadow-lg">
//                   <Users className="w-12 h-12 text-muted-foreground" />
//                 </div>
//               </div>
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">No company selected</h3>
//               <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
//                 Select a company from the dropdown above to view their complete payment history and transaction records
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
//                   : 'No payment records found for this company'}
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

//   // TAB 4: Payment Receipts Content
//   const paymentReceiptsTabContent = (
//     <div className="space-y-6">
//       {/* Main Content Card */}
//       <div className="rounded-lg border border-border/60 bg-gradient-to-br from-card via-background to-card shadow-sm overflow-hidden">
//         {/* Header Section */}
//         <div className="relative bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b border-border/50 px-6 py-5">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-4">
//               <div className="h-12 w-12 rounded-xl bg-primary/10 backdrop-blur-sm flex items-center justify-center ring-1 ring-primary/20 shadow-sm">
//                 <FileText className="h-6 w-6 text-primary" />
//               </div>
//               <div>
//                 <h2 className="font-semibold text-xl text-foreground tracking-tight">Payment Receipts</h2>
//                 <p className="text-sm text-muted-foreground mt-1">View detailed payment receipt records</p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Filters Section */}
//         <div className="px-6 py-5 bg-gradient-to-b from-muted/20 via-muted/10 to-transparent border-b border-border/30">
//           <div className="flex items-center gap-2.5 mb-5">
//             <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
//               <Filter className="h-4 w-4 text-muted-foreground" />
//             </div>
//             <span className="text-sm font-semibold text-foreground">Filter Options</span>
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div className="flex flex-col min-w-0">
//               <Label htmlFor="receipt-company" className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
//                 <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
//                 <span className="whitespace-nowrap">Select Company</span>
//               </Label>
//               <Select
//                 value={paymentReceiptCompany}
//                 onValueChange={(value) => {
//                   setPaymentReceiptCompany(value)
//                 }}
//                 disabled={allCompaniesLoading}
//               >
//                 <SelectTrigger id="receipt-company" className="h-[44px] w-full border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg">
//                   <SelectValue placeholder="Select a company..." />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {allCompanies.map((company) => (
//                     <SelectItem key={company._id || company.id} value={company._id || company.id}>
//                       {company.name}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div className="flex flex-col min-w-0">
//               <Label htmlFor="receipt-date-from" className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
//                 <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
//                 <span className="whitespace-nowrap">Date From</span>
//               </Label>
//               <Input
//                 id="receipt-date-from"
//                 type="date"
//                 value={paymentReceiptDateFrom}
//                 onChange={(e) => setPaymentReceiptDateFrom(e.target.value)}
//                 className="h-[44px] w-full border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg"
//               />
//             </div>

//             <div className="flex flex-col min-w-0">
//               <Label htmlFor="receipt-date-to" className="text-sm font-semibold text-foreground flex items-center gap-2 h-5 mb-2.5">
//                 <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
//                 <span className="whitespace-nowrap">Date To</span>
//               </Label>
//               <Input
//                 id="receipt-date-to"
//                 type="date"
//                 value={paymentReceiptDateTo}
//                 onChange={(e) => setPaymentReceiptDateTo(e.target.value)}
//                 className="h-[44px] w-full border-border/60 bg-background/80 backdrop-blur-sm hover:bg-background transition-all rounded-lg"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Payment Receipts Table */}
//         <div className="px-6 py-6 bg-background">
//           {!paymentReceiptCompany || paymentReceiptCompany === 'all' ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl"></div>
//                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 backdrop-blur-sm ring-2 ring-border/60 shadow-lg">
//                   <Building2 className="w-12 h-12 text-muted-foreground" />
//                 </div>
//               </div>
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">No company selected</h3>
//               <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
//                 Select a company from the dropdown above to view their payment receipt records
//               </p>
//             </div>
//           ) : paymentReceiptsLoading ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
//                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background backdrop-blur-sm ring-2 ring-primary/20 shadow-lg">
//                   <Loader2 className="w-12 h-12 text-primary animate-spin" />
//                 </div>
//               </div>
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">Loading payment receipts</h3>
//               <p className="text-sm text-muted-foreground">Please wait while we fetch the records...</p>
//             </div>
//           ) : paymentReceipts.length === 0 ? (
//             <div className="flex flex-col items-center justify-center py-20 px-4">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-muted/30 rounded-full blur-3xl"></div>
//                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 backdrop-blur-sm ring-2 ring-border/60 shadow-lg">
//                   <FileText className="w-12 h-12 text-muted-foreground" />
//                 </div>
//               </div>
//               <h3 className="text-lg font-semibold text-foreground mb-2.5">No payment receipts found</h3>
//               <p className="text-sm text-muted-foreground text-center max-w-md mb-5 leading-relaxed">
//                 {paymentReceiptDateFrom || paymentReceiptDateTo
//                   ? 'Try adjusting your date filters to see more results'
//                   : 'No receipt records found for this company'}
//               </p>
//               {(paymentReceiptDateFrom || paymentReceiptDateTo) && (
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   className="gap-2 h-10 px-5 shadow-sm hover:shadow-md transition-all rounded-lg"
//                   onClick={() => {
//                     setPaymentReceiptDateFrom('')
//                     setPaymentReceiptDateTo('')
//                   }}
//                 >
//                   <RotateCcw className="h-4 w-4" />
//                   Clear Filters
//                 </Button>
//               )}
//             </div>
//           ) : (
//             <div className="overflow-x-auto rounded-lg border border-border/60">
//               <table className="w-full">
//                 <thead className="bg-slate-50 border-b border-border/60">
//                   <tr>
//                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Date</th>
//                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Receipt #</th>
//                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">Amount</th>
//                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Method</th>
//                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">Boxes</th>
//                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">Orders</th>
//                     <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">Action</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-border/60">
//                   {paymentReceipts.map((receipt) => (
//                     <tr key={receipt._id} className="hover:bg-muted/30 transition-colors">
//                       <td className="px-4 py-3 text-sm">
//                         {receipt.paymentDate ? new Date(receipt.paymentDate).toLocaleDateString('en-GB') : "-"}
//                       </td>
//                       <td className="px-4 py-3 font-mono font-semibold text-blue-600">{receipt.receiptNumber}</td>
//                       <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-600">
//                         £{formatNumber(receipt.totalAmount)}
//                       </td>
//                       <td className="px-4 py-3">
//                         <Badge variant="outline" className={receipt.paymentMethod === 'cash' ? 'border-green-500 text-green-700' : 'border-blue-500 text-blue-700'}>
//                           {receipt.paymentMethod === 'cash' ? 'Cash' : 'Bank'}
//                         </Badge>
//                       </td>
//                       <td className="px-4 py-3 text-right tabular-nums">
//                         <div className="flex items-center justify-end gap-1">
//                           <Box className="h-4 w-4 text-muted-foreground" />
//                           {receipt.totalBoxes || 0}
//                         </div>
//                       </td>
//                       <td className="px-4 py-3 text-right tabular-nums">{receipt.ordersAffected || 0}</td>
//                       <td className="px-4 py-3 text-center">
//                         <Button
//                           variant="ghost"
//                           size="sm"
//                           className="gap-2 h-8"
//                           onClick={() => {
//                             setSelectedReceipt(receipt)
//                             setReceiptModalOpen(true)
//                           }}
//                         >
//                           <Eye className="h-4 w-4" />
//                           <span className="hidden sm:inline">View</span>
//                         </Button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   )

//   const tabs = [
//     {
//       label: "Ledger",
//       content: ledgerTabContent,
//     },
//     // {
//     //   label: "Pending Payments",
//     //   content: pendingPaymentsContent,
//     // },
//     {
//       label: "Payment History",
//       content: paymentHistoryTabContent,
//     },
//     {
//       label: "Payment Receipts",
//       content: paymentReceiptsTabContent,
//     },
//   ]

//   return (
//     <div className="space-y-6">
//       {/* Premium Header */}
//       <div className="mb-3">
//         <BackButton fallbackPath="/logistics" label="Back" />
//       </div>
//       <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
//         <div className="space-y-1">
//           <div className="flex items-center gap-3">
//             <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
//               <Truck className="h-5 w-5 text-primary" />
//             </div>
//             <div>
//               <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Logistics Ledger</h1>
//               <p className="text-sm text-muted-foreground mt-1">
//                 Track and manage payments to logistics companies based on boxes delivered
//               </p>
//             </div>
//           </div>
//         </div>
//         <div className="flex items-center gap-3">
//           {allCompaniesLoading && (
//             <div className="flex items-center gap-2 text-sm text-muted-foreground">
//               <Loader2 className="h-4 w-4 animate-spin" />
//               <span className="hidden sm:inline">Loading companies...</span>
//             </div>
//           )}
//           <Button
//             onClick={() => setUniversalPaymentOpen(true)}
//             className="gap-2 h-10 px-5 shadow-sm hover:shadow-md transition-all bg-primary hover:bg-primary/90 w-full sm:w-auto"
//           >
//             <Plus className="h-4 w-4" />
//             Add Payment
//           </Button>
//         </div>
//       </header>

//       <Tabs
//         tabs={tabs}
//         className="space-y-4"
//         activeTab={activeTab}
//         onTabChange={setActiveTab}
//       />

//       {/* Logistics Payment Modal */}
//       <LogisticsPaymentModal
//         open={universalPaymentOpen}
//         onClose={() => setUniversalPaymentOpen(false)}
//         entityId={selectedCompanyId !== 'all' ? selectedCompanyId : ''}
//         entityName={
//           selectedCompanyId !== 'all'
//             ? (allCompanies.find(c => (c._id || c.id) === selectedCompanyId)?.name || 'Company')
//             : ''
//         }
//         totalBalance={(calculatedTotalBalance || 0)}
//         entities={allCompanies}
//         data={allLedgerTransactions}
//         onSuccess={() => {
//           queryClient.invalidateQueries({ queryKey: ['pending-balances-logistics'] })
//           queryClient.invalidateQueries({ queryKey: ['ledger', 'logistics'] })
//         }}
//       />

//       
//     </div>
//   )
// }
"use client"

import { useState, useMemo, useEffect, useCallback, useDeferredValue } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import BackButton from "@/components/BackButton"
import Tabs from "@/components/tabs"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DataTableFiltered from "@/components/data-table-filtered"
import BritishDatePicker from "@/components/BritishDatePicker"
import { Badge } from "@/components/ui/badge"
import toast from "react-hot-toast"
import { Loader2, Plus, Eye, Box } from "lucide-react"

import { useLogisticsLedger, useAllLogisticsLedgers, useLogisticsPaymentReceipts } from "@/lib/hooks/useLedger"
import { ledgerAPI } from "@/lib/api/endpoints/ledger"
import { logisticsCompaniesAPI } from "@/lib/api/endpoints/logisticsCompanies"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { exportToPDF } from "@/lib/utils/pdfExport"

import LogisticsPaymentModal from "@/components/modals/LogisticsPaymentModal"

function generateLogisticsReceiptHTML(receipt) {
  const distributionRows = (receipt.distributions || []).map((distribution) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${distribution.orderNumber || distribution.dispatchOrderId?.orderNumber || "-"}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${distribution.boxesCount || 0}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${distribution.shippingInfo?.destination || "-"}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">£${Number(distribution.amountApplied || 0).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">£${Number(distribution.previousBalance || 0).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">£${Number(distribution.newBalance || 0).toFixed(2)}</td>
    </tr>
  `).join("")

  const paymentDate = receipt.paymentDate || receipt.createdAt;
  const formattedDate = paymentDate ? new Date(paymentDate).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  }).toUpperCase() : "-";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Logistics Payment Receipt - ${receipt.receiptNumber}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; width: 100%; margin: 0; padding: 0; color: #111827; line-height: 1.5; font-size: 13px; }
        .container { max-width: 180mm; margin: 0 auto; }
        .header { border-bottom: 3px solid #111827; padding-bottom: 10px; margin-bottom: 25px; display:flex; justify-content:space-between; align-items:flex-end; }
        .header h1 { margin:0; font-size:26px; font-weight:800 }
        .receipt-no { font-family: monospace; font-size: 16px; font-weight:600; color:#4b5563 }
        
        .info-table { width:100%; border-collapse: collapse; margin-bottom: 18px; border: 1px solid #d1d5db; }
        .info-table th { text-align:left; padding: 8px; background:#f3f4f6; color:#4b5563; font-size:12px; border: 1px solid #d1d5db; width: 20%; }
        .info-table td { padding:8px; font-weight:600; border: 1px solid #d1d5db; }
        
        .items-table { width:100%; border-collapse: collapse; margin-top:10px; border: 1px solid #d1d5db; }
        .items-table th { background:#111827; color:white; padding:12px 10px; text-align:left; font-size:11px; text-transform:uppercase; border: 1px solid #111827; }
        .items-table td { border: 1px solid #d1d5db; }
        .right { text-align:right }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <h1>LOGISTICS PAYMENT RECEIPT</h1>
            <p style="margin:5px 0 0 0; color:#6b7280;">KI FASHION - Logistics Copy</p>
          </div>
          <div class="receipt-no">${receipt.receiptNumber}</div>
        </div>

        <table class="info-table">
          <tbody>
            <tr>
              <th>Logistics Company</th>
              <td>${receipt.logisticsCompanyId?.name || receipt.companyName || "Unknown Company"}</td>
              <th>Date</th>
              <td>${formattedDate}</td>
            </tr>
            <tr>
              <th>Contact</th>
              <td>${receipt.logisticsCompanyId?.email || "-"}</td>
              <th>Method</th>
              <td>${(receipt.paymentMethod || "cash").toUpperCase()}</td>
            </tr>
            <tr>
              <th>Total Amount</th>
              <td>£${Number(receipt.totalAmount || 0).toFixed(2)}</td>
              <th>Total Boxes</th>
              <td>${receipt.totalBoxes || 0}</td>
            </tr>
            <tr>
              <th>Balance Before</th>
              <td>£${Number(Math.abs(receipt.balanceBefore || 0)).toFixed(2)}</td>
              <th>Balance After</th>
              <td>£${Number(Math.abs(receipt.balanceAfter || 0)).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <table class="items-table">
          <thead>
            <tr>
              <th>Order Number</th>
              <th class="right">Boxes</th>
              <th>Destination</th>
              <th class="right">Amount Applied</th>
              <th class="right">Prev. Balance</th>
              <th class="right">New Balance</th>
            </tr>
          </thead>
          <tbody>
            ${distributionRows}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `
}

function printLogisticsReceipt(receipt) {
  if (!receipt) return
  const printWindow = window.open("", "_blank")
  if (!printWindow) return
  printWindow.document.write(generateLogisticsReceiptHTML(receipt))
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
  }, 250)
}

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
  const dateTime = _date?.date || _date?.createdAt || _date;
  if (!dateTime) return "-";
  const d = new Date(dateTime);
  if (isNaN(d.getTime())) return "-";
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
  const date = d.toLocaleDateString('en-GB');
  return `${date} ${time}`;
}

export default function LogisticsLedgerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = Number(searchParams.get("tab") ?? 0)

  const [activeTab, setActiveTab] = useState(initialTab)
  const [selectedCompanyId, setSelectedCompanyId] = useState("all")
  
  // Universal Filters
  const [dateRange, setDateRange] = useState({ from: "", to: "" })
  const [ledgerSearch, setLedgerSearch] = useState("")
  const deferredSearch = useDeferredValue(ledgerSearch)

  // Modals & Actions State
  const [universalPaymentOpen, setUniversalPaymentOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  
  // Pending Action State
  const [markAsPaidDialog, setMarkAsPaidDialog] = useState({ open: false, balance: null })
  const [markAsPaidForm, setMarkAsPaidForm] = useState({ method: 'cash', amount: '' })
  const [isMarkingAsPaid, setIsMarkingAsPaid] = useState(false)

  const queryClient = useQueryClient()

  // Sync URL Params
  useEffect(() => {
    const companyId = searchParams.get('companyId')
    if (companyId) setSelectedCompanyId(companyId)
  }, [searchParams])

  const handleTabChange = (idx) => {
    setActiveTab(idx)
    if (router) router.replace(`/logistics-ledger?tab=${idx}`, { scroll: false })
  }

  // --- DATA FETCHING ---

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

  const comboboxOptions = useMemo(() => {
    const options = allCompanies.map(c => ({ value: c._id || c.id, label: c.name || '' }))
    return [{ value: 'all', label: 'All Companies (Dashboard)' }, ...options]
  }, [allCompanies])

  const selectedEntity = useMemo(() => {
    if (!selectedCompanyId || selectedCompanyId === 'all') return null
    return allCompanies.find(c => String(c._id || c.id) === selectedCompanyId) ?? null
  }, [selectedCompanyId, allCompanies])

  const ledgerFilterParams = useMemo(() => {
    if (!selectedCompanyId || selectedCompanyId === 'all') {
      return { limit: 500 } 
    }
    return { logisticsCompanyId: selectedCompanyId, limit: 100 }
  }, [selectedCompanyId])

  const { data: allLedgerData, isLoading: allLedgerLoading, error: allLedgerError } = useAllLogisticsLedgers(ledgerFilterParams || {})

  const companyBalances = useMemo(() => {
    const balances = {};
    if (allLedgerData?.entries) {
      const sortedEntries = [...allLedgerData.entries].sort((a, b) => {
        return new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime();
      });
      
      sortedEntries.forEach(entry => {
        const compId = typeof entry.entityId === 'object' ? (entry.entityId._id || entry.entityId.id) : entry.entityId;
        if (compId && balances[compId] === undefined) {
          balances[compId] = entry.balance || 0;
        }
      });
    }
    return balances;
  }, [allLedgerData]);

  // FIX: Always return a params object so receipts load universally
  const paymentReceiptParams = useMemo(() => {
    const params = { limit: 500 }
    if (dateRange.from) params.dateFrom = dateRange.from
    if (dateRange.to) params.dateTo = dateRange.to
    return params
  }, [dateRange])

  // FIX: Feed in selectedCompanyId directly rather than an unused state variable
  const { data: paymentReceiptsData, isLoading: paymentReceiptsLoading } = useLogisticsPaymentReceipts(
    selectedCompanyId || 'all',
    paymentReceiptParams
  )

  // --- CALCULATIONS & DATA TRANSFORMATION ---

  const allLedgerTransactions = useMemo(() => {
    if (!allLedgerData?.entries) return []

    let filteredEntries = allLedgerData.entries.filter(entry =>
      entry.transactionType === 'charge' ||
      entry.transactionType === 'payment' ||
      entry.transactionType === 'adjustment'
    )

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
        typeLabel = 'Debit Adjustment'
      }

      let readableReference = '-'
      let supplierCompany = '-'
      let supplierContact = '-'
      let totalBoxes = null

      if (entry.referenceId && typeof entry.referenceId === 'object' && entry.referenceId !== null) {
        const ref = entry.referenceId;
        readableReference = ref.orderNumber || ref.referenceNumber || ref._id || '-'
        
        // FIX: Broaden checks for nested supplier relationships often found in dispatch models
        supplierCompany = ref.supplierCompany || ref.supplierId?.companyName || ref.supplier?.companyName || '-'
        supplierContact = ref.supplierName || ref.supplierId?.name || ref.supplier?.name || '-'
        
        // FIX: Deeply check for boxes in referenced orders
        totalBoxes = entry.boxes ?? entry.boxesCount ?? ref.boxesCount ?? ref.totalBoxes ?? (Array.isArray(ref.boxes) ? ref.boxes.length : null)
      } else if (entry.reference || entry.referenceNumber) {
        readableReference = entry.reference || entry.referenceNumber
        totalBoxes = entry.boxes ?? entry.boxesCount ?? null
      } else if (entry.referenceId) {
        readableReference = entry.referenceId.toString()
        totalBoxes = entry.boxes ?? entry.boxesCount ?? null
      }

      return {
        id: entry._id || entry.id,
        date: entry.date || entry.createdAt,
        createdAt: entry.createdAt,
        company: company.name || 'Unknown Company',
        companyId: company._id || company.id,
        supplierName: supplierCompany !== '-' ? supplierCompany : supplierContact,
        supplierCompany,
        supplierContact,
        type: typeLabel,
        transactionType: entry.transactionType || entry.type,
        description: entry.description || entry.notes || '-',
        debit: entry.debit || 0,
        credit: entry.credit || 0,
        cashPaid: (entry.transactionType === 'payment' && entry.paymentMethod === 'cash') ? (entry.credit || 0) : 0,
        bankPaid: (entry.transactionType === 'payment' && entry.paymentMethod === 'bank') ? (entry.credit || 0) : 0,
        balance: entry.balance || 0, 
        boxes: totalBoxes,
        boxRateSnapshot: entry.boxRateSnapshot ?? null,
        reference: readableReference,
        referenceId: (entry.referenceId && typeof entry.referenceId === 'object' && entry.referenceId._id)
          ? entry.referenceId._id.toString()
          : (entry.referenceId ? entry.referenceId.toString() : null),
        referenceModel: entry.referenceModel || '-',
        paymentMethod: entry.paymentMethod || null,
        paymentDetails: entry.paymentDetails || null,
        boxRate: company.rates?.boxRate || null,
        raw: entry
      }
    })

    const sortedAsc = [...transformedEntries].sort((a, b) => {
      const createdAtA = new Date(a.date || a.createdAt || 0).getTime()
      const createdAtB = new Date(b.date || b.createdAt || 0).getTime()
      return createdAtA - createdAtB
    })

    let runningBalance = 0
    const withRunningBalance = sortedAsc.map(entry => {
      runningBalance += (entry.debit || 0) - (entry.credit || 0)
      return { ...entry, runningBalance }
    })

    return withRunningBalance.reverse()
  }, [allLedgerData])

  const filteredLedgerTransactions = useMemo(() => {
    let result = allLedgerTransactions;

    if (dateRange.from) {
      const from = new Date(dateRange.from)
      from.setHours(0, 0, 0, 0)
      result = result.filter(entry => {
        const entryDate = new Date(entry.date || entry.createdAt)
        return entryDate >= from
      })
    }
    if (dateRange.to) {
      const to = new Date(dateRange.to)
      to.setHours(23, 59, 59, 999)
      result = result.filter(entry => {
        const entryDate = new Date(entry.date || entry.createdAt)
        return entryDate <= to
      })
    }

    if (deferredSearch) {
      const searchLower = deferredSearch.toLowerCase()
      result = result.filter(entry =>
        entry.company?.toLowerCase().includes(searchLower) ||
        entry.reference?.toLowerCase().includes(searchLower) ||
        entry.supplierName?.toLowerCase().includes(searchLower) ||
        entry.type?.toLowerCase().includes(searchLower)
      )
    }
    return result
  }, [allLedgerTransactions, deferredSearch, dateRange])

  const paymentHistoryTransactions = useMemo(() => {
    if (!allLedgerTransactions?.length) return []
    let filtered = allLedgerTransactions.filter(entry => entry.transactionType === 'payment')

    if (dateRange.from) {
      const from = new Date(dateRange.from)
      from.setHours(0, 0, 0, 0)
      filtered = filtered.filter(entry => new Date(entry.date || entry.createdAt) >= from)
    }
    if (dateRange.to) {
      const to = new Date(dateRange.to)
      to.setHours(23, 59, 59, 999)
      filtered = filtered.filter(entry => new Date(entry.date || entry.createdAt) <= to)
    }
    return filtered
  }, [allLedgerTransactions, dateRange])

  const paymentReceiptsTransactions = useMemo(() => {
    if (!paymentReceiptsData?.receipts) return []
    let filtered = paymentReceiptsData.receipts

    if (dateRange.from) {
      const from = new Date(dateRange.from)
      from.setHours(0, 0, 0, 0)
      filtered = filtered.filter(entry => new Date(entry.paymentDate || entry.createdAt) >= from)
    }
    if (dateRange.to) {
      const to = new Date(dateRange.to)
      to.setHours(23, 59, 59, 999)
      filtered = filtered.filter(entry => new Date(entry.paymentDate || entry.createdAt) <= to)
    }
    return filtered
  }, [paymentReceiptsData, dateRange])

  const calculatedTotalBalance = useMemo(() => {
    if (allLedgerTransactions.length > 0) {
      return allLedgerTransactions[0].runningBalance || 0
    }
    return allLedgerData?.totalBalance || 0
  }, [allLedgerTransactions, allLedgerData])


  // --- COLUMNS ---

  const summaryColumns = useMemo(() => [
    {
      header: "Company ID",
      accessor: "id",
      filterType: "text",
      render: (row) => <span className="font-mono text-xs text-muted-foreground">{String(row.id || row._id).slice(-8)}</span>,
      pdfValue: (row) => String(row.id || row._id).slice(-8)
    },
    {
      header: "Logistics Company",
      accessor: "name",
      filterType: "autocomplete",
      render: (row) => (
        <button onClick={() => { setSelectedCompanyId(row.id || row._id); setActiveTab(0); }} className="text-blue-600 hover:underline font-bold text-left">
          {row.name || "—"}
        </button>
      )
    },
    { 
      header: "Total Balance", 
      filterType: "text", 
      accessor: "balance", 
      render: (row) => {
        const companyBalance = row.balance ?? row.totalBalance ?? companyBalances[row.id || row._id] ?? 0;
        return (
          <span className={`tabular-nums font-bold ${companyBalance < 0 ? 'text-green-600' : 'text-red-600'}`}>
            {currency(Math.abs(companyBalance))} 
          </span>
        )
      } 
    },
  ], [companyBalances]) 

  const allLedgerColumns = useMemo(() => [
    { header: "Date", accessor: "date", filterType: "date-picker", render: (row) => formatDateTime(row), pdfValue: (row) => formatDateTime(row) },
    {
      header: "Reference",
      accessor: "reference",
      filterType: "text",
      render: (row) => (
        row.referenceId 
          ? <Link href={`/dispatch-orders/${row.referenceId}`} className="text-blue-600 hover:underline">{row.reference}</Link>
          : <span className="font-medium">{row.reference || '-'}</span>
      ),
      pdfValue: (row) => row.reference || "-"
    },
    { 
      header: "Supplier", 
      accessor: "supplierName", 
      filterType: "text",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-xs">{row.supplierName || '-'}</span>
        </div>
      ),
      pdfValue: (row) => row.supplierName || '-'
    },
    { 
      header: "Boxes", 
      accessor: "boxes", 
      render: (row) => <span>{row.boxes ?? '-'}</span>
    },
    { header: "Box Rate", accessor: "boxRate", render: (row) => <span>{row.raw?.boxRateSnapshot ? currency(row.raw.boxRateSnapshot) : currency(row.boxRate)}</span> },
    { header: "Debit (Charges)", accessor: "debit", filterType: "text", render: (row) => <span className={row.debit > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>{row.debit > 0 ? formatNumber(row.debit) : '-'}</span>, pdfValue: (row) => row.debit > 0 ? row.debit : 0 },
    { header: "Cash Paid", accessor: "cashPaid", filterType: "text", render: (row) => <span className={row.cashPaid > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>{row.cashPaid > 0 ? formatNumber(row.cashPaid) : '-'}</span>, pdfValue: (row) => row.cashPaid > 0 ? row.cashPaid : 0 },
    { header: "Bank Paid", accessor: "bankPaid", filterType: "text", render: (row) => <span className={row.bankPaid > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>{row.bankPaid > 0 ? formatNumber(row.bankPaid) : '-'}</span>, pdfValue: (row) => row.bankPaid > 0 ? row.bankPaid : 0 },
    { header: "Balance", accessor: "runningBalance", filterType: "text", render: (row) => <span className={`font-bold tabular-nums ${row.runningBalance < 0 ? 'text-green-600' : 'text-red-600'}`}>{formatNumber(Math.abs(row.runningBalance))}</span>, pdfValue: (row) => row.runningBalance }
  ], [])

  const paymentHistoryColumns = useMemo(() => {
    const cols = [
      {
        header: "ID",
        accessor: "entryNumber",
        filterType: "text",
        render: (row) => <span className="font-mono text-blue-600 font-medium">{row.raw?.entryNumber || String(row.id).slice(-6)}</span>,
        pdfValue: (row) => row.raw?.entryNumber || String(row.id).slice(-6)
      },
      {
        header: "Date",
        accessor: "date",
        filterType: "date-picker",
        render: (row) => formatDateTime({ date: row.date }),
        pdfValue: (row) => formatDateTime({ date: row.date })
      }
    ]

    if (selectedCompanyId === 'all') {
      cols.push({
        header: "Logistics Company",
        accessor: "company",
        filterType: "autocomplete",
        render: (row) => <span className="font-medium text-blue-600">{row.company}</span>,
        pdfValue: (row) => row.company
      })
    }

    cols.push(
      {
        header: "Total Balance",
        accessor: "totalBalance",
        filterType: "text",
        render: (row) => <span className="tabular-nums font-medium">{formatNumber(row.runningBalance + (row.credit || 0))}</span>,
        pdfValue: (row) => row.runningBalance + (row.credit || 0)
      },
      {
        header: "Cash Paid",
        accessor: "cashPaid",
        filterType: "text",
        render: (row) => <span className="tabular-nums font-medium">{formatNumber(row.cashPaid)}</span>,
        pdfValue: (row) => row.cashPaid
      },
      {
        header: "Bank Paid", 
        accessor: "bankPaid",
        filterType: "text",
        render: (row) => <span className="tabular-nums font-medium">{formatNumber(row.bankPaid)}</span>,
        pdfValue: (row) => row.bankPaid
      },
      {
        header: "Remaining Balance",
        accessor: "runningBalance",
        filterType: "text",
        render: (row) => <span className="tabular-nums font-medium">{formatNumber(row.runningBalance)}</span>,
        pdfValue: (row) => row.runningBalance
      }
    )

    return cols
  }, [selectedCompanyId])

  
  const paymentReceiptsColumns = useMemo(() => {
    const baseColumns = [
      { header: "Receipt #", accessor: "receiptNumber", filterType: "text", render: (row) => <span className="font-mono font-medium text-blue-600">{row.receiptNumber}</span>, pdfValue: (row) => row.receiptNumber },
      { header: "Date", accessor: "paymentDate", filterType: "date-picker", render: (row) => formatDateTime({ date: row.paymentDate || row.createdAt }), pdfValue: (row) => formatDateTime({ date: row.paymentDate || row.createdAt }) },
    ]

    if (selectedCompanyId === 'all') {
      baseColumns.push({
        header: "Company",
        accessor: "companyName",
        filterType: "autocomplete",
        render: (row) => <span className="font-medium">{row.logisticsCompanyId?.name || '-'}</span>,
        pdfValue: (row) => row.logisticsCompanyId?.name || '-'
      })
    }

    const remainingColumns = [
      { header: "Amount", accessor: "totalAmount", filterType: "text", render: (row) => <span className="text-green-600 font-bold tabular-nums">£{formatNumber(row.totalAmount)}</span>, pdfValue: (row) => row.totalAmount },
      { header: "Method", accessor: "paymentMethod", filterType: "text", render: (row) => <Badge variant="outline" className="capitalize">{row.paymentMethod}</Badge>, pdfValue: (row) => row.paymentMethod.toUpperCase() },
      { header: "Boxes", accessor: "totalBoxes", render: (row) => <div className="flex items-center gap-1 text-muted-foreground"><Box className="h-3 w-3"/> {row.totalBoxes || 0}</div>, pdfValue: (row) => row.totalBoxes || 0 },
      { header: "Orders Affected", accessor: "ordersAffected", render: (row) => <span className="tabular-nums">{row.ordersAffected || 0}</span>, pdfValue: (row) => row.ordersAffected || 0 },
      {
        header: "Actions", accessor: "actions", render: (row) => (
          <Button size="sm" variant="ghost" className="h-8 text-blue-600" onClick={() => printLogisticsReceipt(row)}><Eye className="h-4 w-4 mr-1" /> View</Button>
        )
      }
    ]
    return [...baseColumns, ...remainingColumns]
  }, [selectedCompanyId])

  // --- ACTIONS ---

  const handleExportLedgerPDF = useCallback(() => {
    if (!filteredLedgerTransactions.length) return toast.error("No ledger data to export")
    const companyName = selectedCompanyId === "all" ? "All Companies" : (selectedEntity?.name || "Company")
    exportToPDF({
      title: "Logistics Ledger Report",
      subtitle: `Company: ${companyName}`,
      columns: allLedgerColumns,
      data: filteredLedgerTransactions,
      filename: `Logistics_Ledger_${companyName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}`
    })
  }, [filteredLedgerTransactions, selectedCompanyId, selectedEntity, allLedgerColumns])

  const handleExportReceiptsPDF = useCallback(() => {
    if (!paymentReceiptsTransactions.length) return toast.error("No receipts data to export")
    const companyName = selectedCompanyId === "all" ? "All Companies" : (selectedEntity?.name || "Company")
    exportToPDF({
      title: "Logistics Payment Receipts",
      subtitle: `Company: ${companyName}`,
      columns: paymentReceiptsColumns.filter(c => c.header !== "Actions"),
      data: paymentReceiptsTransactions,
      filename: `Logistics_Receipts_${companyName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}`
    })
  }, [paymentReceiptsTransactions, selectedCompanyId, selectedEntity, paymentReceiptsColumns])


  const handleConfirmMarkAsPaid = async () => {
    const { balance } = markAsPaidDialog
    if (!balance) return

    const amount = parseFloat(markAsPaidForm.amount)
    if (!amount || amount <= 0) return toast.error('Please enter a valid amount')

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

      await queryClient.invalidateQueries({ queryKey: ['pending-balances-logistics'] })
      await queryClient.invalidateQueries({ queryKey: ['ledger', 'logistics'] })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment')
    } finally {
      setIsMarkingAsPaid(false)
    }
  }


  // --- RENDER ---

  const isGlobalView = selectedCompanyId === "all";

  const dashboardTabs = [
    {
      label: "Logistics Companies",
      content: (
        <div className="space-y-4">
          <DataTableFiltered
            title="All Logistics Partners"
            columns={summaryColumns}
            data={allCompanies}
            loading={allCompaniesLoading}
            enableSearch={true}
            paginate={true}
            pageSize={20}
            enableColumnFilters={true}
            compact={true}
          />
        </div>
      )
    },
    {
      label: "Payment History",
      content: (
        <div className="space-y-4">
          {allLedgerError && <div className="text-red-500 text-sm mb-2">Error loading ledger data: {allLedgerError.message}</div>}
          <DataTableFiltered
            title="All Logistics Payments"
            columns={paymentHistoryColumns}
            data={paymentHistoryTransactions}
            loading={allLedgerLoading}
            paginate={true}
            pageSize={20}
            enableSearch={true}
            enableColumnFilters={true}
            compact={true}
          />
        </div>
      )
    },
    {
      label: "Payment Receipts",
      content: (
        <div className="space-y-4">
          {/* FIX: Removed the empty screen blocker. Users can now see all global receipts */}
          <DataTableFiltered
            title="All Logistics Receipts"
            columns={paymentReceiptsColumns}
            data={paymentReceiptsTransactions}
            loading={paymentReceiptsLoading}
            onDownloadPDF={handleExportReceiptsPDF}
            paginate={true}
            pageSize={20}
            enableSearch={true}
            enableColumnFilters={true}
            compact={true}
          />
        </div>
      )
    }
  ]

  const detailTabs = [
    {
      label: "Logistics Ledger",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">Total Entries</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{filteredLedgerTransactions.length}</div>
            </div>
            <div className={`rounded-lg border p-4 shadow-sm ${calculatedTotalBalance <= 0 ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30'}`}>
              <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${calculatedTotalBalance <= 0 ? 'text-emerald-700/80' : 'text-red-700/80'}`}>
                {calculatedTotalBalance <= 0 ? "Total Receivable from Company" : "Total Payable to Company"}
              </div>
              <div className={`mt-1 text-2xl font-bold tabular-nums ${calculatedTotalBalance <= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {currency(Math.abs(calculatedTotalBalance))}
              </div>
            </div>
          </div>
          {allLedgerError && <div className="text-red-500 text-sm mb-2">Error loading ledger data: {allLedgerError.message}</div>}
          <DataTableFiltered
            title="Logistics Ledger"
            columns={allLedgerColumns}
            data={filteredLedgerTransactions}
            loading={allLedgerLoading}
            onDownloadPDF={handleExportLedgerPDF}
            enableSearch={true}
            paginate={true}
            enableColumnFilters={true}
            compact={true}
          />
        </div>
      )
    },
    {
      label: "Payment History",
      content: (
        <div className="space-y-4">
          <DataTableFiltered
            title="Payment History"
            columns={paymentHistoryColumns}
            data={paymentHistoryTransactions}
            loading={allLedgerLoading}
            enableSearch={true}
            paginate={true}
            enableColumnFilters={true}
            compact={true}
          />
        </div>
      )
    },
    {
      label: "Payment Receipts",
      content: (
        <div className="space-y-4">
          <DataTableFiltered
            title="Payment Receipts"
            columns={paymentReceiptsColumns}
            data={paymentReceiptsTransactions}
            loading={paymentReceiptsLoading}
            onDownloadPDF={handleExportReceiptsPDF}
            enableSearch={true}
            paginate={true}
            enableColumnFilters={true}
            compact={true}
          />
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6 p-4">
      {/* Universal Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
        <div className="flex items-center gap-4">
          <BackButton fallbackPath="/logistics" label="Back" />
          <div className="w-64">
            <Combobox
              options={comboboxOptions}
              value={selectedCompanyId}
              onValueChange={(value) => { setSelectedCompanyId(value || "all"); }}
              placeholder="Select logistics company..."
              searchPlaceholder="Search company..."
              emptyMessage="No company found"
              loading={allCompaniesLoading}
            />
          </div>
        </div>
        <Button onClick={() => setUniversalPaymentOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Record Payment
        </Button>
      </header>

      {/* Universal Date Range Filter */}
      <div className="flex flex-row items-end gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-0 md:max-w-[200px]">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">From Date</Label>
          <BritishDatePicker
            value={dateRange.from || null}
            onChange={(date) => {
              setDateRange(r => ({ ...r, from: date ? formatLocalDate(date) : "" }))
            }}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0 md:max-w-[200px]">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">To Date</Label>
          <BritishDatePicker
            value={dateRange.to || null}
            onChange={(date) => {
              setDateRange(r => ({ ...r, to: date ? formatLocalDate(date) : "" }))
            }}
          />
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs
        tabs={isGlobalView ? dashboardTabs : detailTabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Primary Modals */}
      <LogisticsPaymentModal
        open={universalPaymentOpen}
        onClose={() => setUniversalPaymentOpen(false)}
        entityId={selectedCompanyId !== 'all' ? selectedCompanyId : ''}
        entityName={selectedCompanyId !== 'all' ? (allCompanies.find(c => (c._id || c.id) === selectedCompanyId)?.name || 'Company') : ''}
        totalBalance={(calculatedTotalBalance || 0)}
        entities={allCompanies}
        data={allLedgerTransactions}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['pending-balances-logistics'] })
          queryClient.invalidateQueries({ queryKey: ['ledger', 'logistics'] })
        }}
      />

      {/* Mark Specific Balance As Paid Dialog */}
      <Dialog open={markAsPaidDialog.open} onOpenChange={(open) => setMarkAsPaidDialog({ open, balance: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Order as Paid</DialogTitle>
          </DialogHeader>
          {markAsPaidDialog.balance && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm"><span className="font-medium">Reference:</span> {markAsPaidDialog.balance.reference}</p>
                <p className="text-sm"><span className="font-medium">Remaining:</span> {currency(markAsPaidDialog.balance.amount)}</p>
              </div>
              <div>
                <Label htmlFor="mark-paid-amount">Amount <span className="text-red-500">*</span></Label>
                <Input
                  id="mark-paid-amount"
                  type="text"
                  inputMode="decimal"
                  value={markAsPaidForm.amount}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                    setMarkAsPaidForm({ ...markAsPaidForm, amount: sanitized });
                  }}
                  placeholder="Enter amount"
                  disabled={isMarkingAsPaid}
                />
              </div>
              <div>
                <Label htmlFor="mark-paid-method">Method <span className="text-red-500">*</span></Label>
                <Select value={markAsPaidForm.method} onValueChange={(value) => setMarkAsPaidForm({ ...markAsPaidForm, method: value })} disabled={isMarkingAsPaid}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkAsPaidDialog({ open: false, balance: null })} disabled={isMarkingAsPaid}>Cancel</Button>
            <Button onClick={handleConfirmMarkAsPaid} disabled={isMarkingAsPaid || !markAsPaidForm.amount}>
              {isMarkingAsPaid ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}