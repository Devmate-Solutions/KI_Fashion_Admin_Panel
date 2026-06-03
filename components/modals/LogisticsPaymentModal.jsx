// "use client"

// import { useState, useEffect, useMemo } from "react"
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Loader2, ChevronsUpDown, Check } from "lucide-react"
// import { ledgerAPI } from "@/lib/api/endpoints/ledger"
// import { useQueryClient } from "@tanstack/react-query"
// import { useLogisticsPayableDetail } from "@/lib/hooks/useLogisticsPayables"
// import { useLogisticsLedger } from "@/lib/hooks/useLedger"
// import toast from "react-hot-toast"
// import BritishDatePicker from "@/components/BritishDatePicker"
// import { useAuthStore } from "@/store/store"
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
// import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
// import { cn } from "@/lib/utils"

// // Logistics currency format (GBP - Pounds)
// function currency(n) {
//   const num = Number(n || 0)
//   return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
// }

// /**
//  * LogisticsPaymentModal
//  * Modal for recording payments to logistics companies in pounds (£)
//  * Supports both cash and bank payments in a single transaction
//  */
// export default function LogisticsPaymentModal({
//   open,
//   onClose,
//   entityId: initialEntityId,
//   entityName: initialEntityName,
//   totalBalance: initialBalance = 0,
//   entities = [],
//   onSuccess
// }) {
//   const { user } = useAuthStore()
//   const isSuperAdmin = user?.role === 'super-admin'
//   const queryClient = useQueryClient()
//   const [isSubmitting, setIsSubmitting] = useState(false)
//   const [apiResponses, setApiResponses] = useState([])
//   const [showDebugInfo, setShowDebugInfo] = useState(false)
//   const [selectedEntityId, setSelectedEntityId] = useState(initialEntityId || '')
//   const [searchQuery, setSearchQuery] = useState('')
//   const [searchOpen, setSearchOpen] = useState(false)

//   const [transactionType, setTransactionType] = useState('credit')
//   const [form, setForm] = useState({
//     cashAmount: '',
//     bankAmount: '',
//     debitAmount: '',
//     date: '',
//     notes: ''
//   })

//   // Set default date to today when modal opens
//   useEffect(() => {
//     if (open && !form.date) {
//       const today = new Date().toLocaleDateString('en-CA')
//       setForm(prev => ({ ...prev, date: today }))
//     }
//   }, [open])

//   // Fetch ledger data for the selected company (this gives us the accurate balance)
//   const { data: ledgerData, isLoading: isLoadingLedger } = useLogisticsLedger(
//     selectedEntityId && selectedEntityId !== 'all' ? selectedEntityId : null,
//     { limit: 1000 }
//   )

//   // Fetch detailed balance for the selected company (for reference only, not used for balance calculation)
//   const { data: companyDetail, isLoading: isLoadingPayableDetail } = useLogisticsPayableDetail(
//     selectedEntityId && selectedEntityId !== 'all' ? selectedEntityId : null
//   )

//   // Update selected entity when prop changes
//   useEffect(() => {
//     if (initialEntityId) {
//       setSelectedEntityId(initialEntityId)
//     }
//   }, [initialEntityId])

//   // Reset form when modal opens/closes
//   useEffect(() => {
//     if (!open) {
//       setForm({ cashAmount: '', bankAmount: '', debitAmount: '', date: '', notes: '' })
//       setTransactionType('credit')
//       setSearchQuery('')
//       setSearchOpen(false)
//       setApiResponses([])
//       setShowDebugInfo(false)
//       if (!initialEntityId) {
//         setSelectedEntityId('')
//       }
//     }
//   }, [open, initialEntityId])

//   // Filter entities based on search query using useMemo
//   const filteredEntities = useMemo(() => {
//     const query = searchQuery.trim().toLowerCase()
//     if (!query) return entities

//     return entities.filter((entity) => {
//       const name = (entity.name || '').toLowerCase()
//       const company = (entity.company || '').toLowerCase()
//       return name.includes(query) || company.includes(query)
//     })
//   }, [entities, searchQuery])

//   const cashAmount = parseFloat(form.cashAmount) || 0
//   const bankAmount = parseFloat(form.bankAmount) || 0
//   const debitAmount = parseFloat(form.debitAmount) || 0
//   const totalCreditPayment = cashAmount + bankAmount

//   // Get entity details based on selection
//   const selectedEntity = useMemo(() => {
//     return entities.find(e => (e._id || e.id) === selectedEntityId) || null
//   }, [entities, selectedEntityId])

//   const entityName = selectedEntity?.name || selectedEntity?.company || initialEntityName || ''
//   const entityId = selectedEntityId || initialEntityId
//   const displayEntityId = selectedEntity?.logisticsCompanyId || selectedEntity?._id || selectedEntity?.id || entityId || ''

//   // Calculate balance from ledger entries using the same method as the main page
//   const ledgerBalance = useMemo(() => {
//     if (!ledgerData?.entries || ledgerData.entries.length === 0) {
//       return null
//     }
    
//     const filteredEntries = ledgerData.entries.filter(entry =>
//       entry.transactionType === 'charge' ||
//       entry.transactionType === 'payment' ||
//       entry.transactionType === 'adjustment'
//     )
    
//     if (filteredEntries.length === 0) {
//       return null
//     }
    
//     const sortedAsc = [...filteredEntries].sort((a, b) => {
//       const createdAtA = new Date(a.createdAt || a.date || 0).getTime()
//       const createdAtB = new Date(b.createdAt || b.date || 0).getTime()
//       return createdAtA - createdAtB
//     })
    
//     let runningBalance = 0
//     for (const entry of sortedAsc) {
//       runningBalance += (Number(entry.debit) || 0) - (Number(entry.credit) || 0)
//     }
    
//     return runningBalance
//   }, [ledgerData])

//   // Calculate total balance: prioritize calculated balance from ledger entries
//   const totalBalance = entityId && entityId !== 'all'
//     ? (ledgerBalance !== null
//       ? ledgerBalance
//       : (initialBalance !== undefined && initialBalance !== null
//         ? initialBalance
//         : (companyDetail?.outstandingBalance !== undefined
//           ? companyDetail.outstandingBalance
//           : (selectedEntity?.balance !== undefined
//             ? Math.abs(selectedEntity.balance)
//             : 0))))
//     : 0

//   const isLoadingBalance = isLoadingLedger || isLoadingPayableDetail

//   const handleClose = () => {
//     setForm({ cashAmount: '', bankAmount: '', debitAmount: '', date: '', notes: '' })
//     setTransactionType('credit')
//     setSearchQuery('')
//     setSearchOpen(false)
//     setApiResponses([])
//     setShowDebugInfo(false)
//     if (!initialEntityId) {
//       setSelectedEntityId('')
//     }
//     onClose()
//   }

//   const handleSubmit = async () => {
//     if (!entityId) {
//       toast.error('Please select a logistics company')
//       return
//     }

//     if (!form.date) {
//       toast.error('Please select a date')
//       return
//     }

//     if (transactionType === 'credit') {
//       if (totalCreditPayment <= 0) {
//         toast.error('Please enter a payment amount')
//         return
//       }
//     } else {
//       if (debitAmount <= 0) {
//         toast.error('Please enter a charge amount')
//         return
//       }
//     }

//     setIsSubmitting(true)
//     setApiResponses([])
//     setShowDebugInfo(true)

//     try {
//       if (transactionType === 'credit') {
//         let isPendingApproval = false
//         if (cashAmount > 0) {
//           const cashResponse = await ledgerAPI.distributeLogisticsPayment(entityId, {
//             amount: cashAmount,
//             paymentMethod: 'cash',
//             date: form.date,
//             description: form.notes || `Cash payment to ${entityName}`
//           })
//           if (cashResponse.status === 202) isPendingApproval = true
//           setApiResponses(prev => [...prev, {
//             type: 'Cash Payment',
//             response: cashResponse,
//             timestamp: new Date().toISOString()
//           }])
//         }

//         if (bankAmount > 0) {
//           const bankResponse = await ledgerAPI.distributeLogisticsPayment(entityId, {
//             amount: bankAmount,
//             paymentMethod: 'bank',
//             date: form.date,
//             description: form.notes || `Bank payment to ${entityName}`
//           })
//           if (bankResponse.status === 202) isPendingApproval = true
//           setApiResponses(prev => [...prev, {
//             type: 'Bank Payment',
//             response: bankResponse,
//             timestamp: new Date().toISOString()
//           }])
//         }

//         if (isPendingApproval) {
//           toast.success('Backdated payment request submitted for approval of super admin.')
//           handleClose()
//           const router = window.nextRouter || { push: (url) => window.location.href = url }
//           router.push('/my-requests')
//           return
//         }

//         toast.success(`Payment of ${currency(totalCreditPayment)} recorded successfully`)
//       } else {
//         const debitResponse = await ledgerAPI.createEntry({
//           type: 'logistics',
//           entityId: entityId,
//           entityModel: 'LogisticsCompany',
//           transactionType: 'adjustment',
//           debit: debitAmount,
//           date: form.date,
//           description: form.notes || `Debit adjustment for ${entityName}`
//         })
        
//         if (debitResponse.status === 202) {
//           toast.success('Backdated adjustment request submitted for approval of super admin.')
//           handleClose()
//           const router = window.nextRouter || { push: (url) => window.location.href = url }
//           router.push('/my-requests')
//           return
//         }

//         setApiResponses(prev => [...prev, {
//           type: 'Debit Adjustment',
//           response: debitResponse,
//           timestamp: new Date().toISOString()
//         }])

//         toast.success(`Charge of ${currency(debitAmount)} recorded successfully`)
//       }

//       // Invalidate queries to refresh data
//       queryClient.invalidateQueries({ queryKey: ['pending-balances-logistics'] })
//       queryClient.invalidateQueries({ queryKey: ['ledger', 'logistics'] })
//       queryClient.invalidateQueries({ queryKey: ['ledger'] })
//       queryClient.invalidateQueries({ queryKey: ['logistics-companies'] })

//       handleClose()
//       onSuccess?.()
//     } catch (error) {
//       console.error('Error creating transaction:', error)
//       setApiResponses(prev => [...prev, {
//         type: 'Error',
//         response: {
//           error: true,
//           message: error.message,
//           response: error.response?.data,
//           status: error.response?.status,
//           stack: error.stack
//         },
//         timestamp: new Date().toISOString()
//       }])
//       toast.error(error.response?.data?.message || error.message || 'Failed to record transaction')
//     } finally {
//       setIsSubmitting(false)
//     }
//   }

//   const showEntitySelector = entities.length > 0
//   const hasCompany = !!entityId

//   return (
//     <Dialog open={open} onOpenChange={handleClose}>
//       <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden">
//         <DialogHeader>
//           <DialogTitle className="text-base font-semibold">
//             Logistics Details
//           </DialogTitle>
//         </DialogHeader>

//         <div className="overflow-y-auto max-h-[65vh] space-y-3 py-2 px-2">
//           {/* Transaction Type Toggle */}
//           <div className="grid grid-cols-[140px_1fr] items-start gap-x-4">
//             <Label className="pt-2 font-semibold">Transaction Type</Label>
//             <div>
//               <div className="grid grid-cols-2 gap-2">
//                 <Button
//                   type="button"
//                   variant={transactionType === 'credit' ? 'default' : 'outline'}
//                   size="sm"
//                   className={transactionType === 'credit' ? 'bg-green-600 hover:bg-green-700 text-white font-medium' : ''}
//                   onClick={() => {
//                     setTransactionType('credit')
//                     setForm({ ...form, debitAmount: '' })
//                   }}
//                 >
//                   Receive Payment
//                 </Button>
//                 <Button
//                   type="button"
//                   variant={transactionType === 'debit' ? 'default' : 'outline'}
//                   size="sm"
//                   className={transactionType === 'debit' ? 'bg-red-600 hover:bg-red-700 text-white font-medium' : ''}
//                   onClick={() => {
//                     setTransactionType('debit')
//                     setForm({ ...form, cashAmount: '', bankAmount: '' })
//                   }}
//                 >
//                   Issue Credit/Charge
//                 </Button>
//               </div>
//             </div>
//           </div>

//           {/* Id */}
//           {/* <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
//             <Label className="font-semibold">Id</Label>
//             <Input value={displayEntityId || ''} readOnly className="bg-muted" />
//           </div> */}

//           {/* Date */}
//           <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
//             <Label className="font-semibold">Date</Label>
//             <BritishDatePicker
//               value={form.date ? new Date(form.date) : new Date()}
//               onChange={(date) => {
//                 if (date) {
//                   setForm({ ...form, date: date.toLocaleDateString('en-CA') });
//                 }
//               }}
//               restrictByRole={true}
//               disabled={!hasCompany}
//               className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50${!hasCompany ? ' opacity-50 cursor-not-allowed' : ''}`}
//             />
//           </div>

//           {/* Company Selector */}
//           <div className="grid grid-cols-[140px_1fr] items-start gap-x-4">
//             <Label className="font-semibold pt-2">Company</Label>
//             <div>
//               {showEntitySelector ? (
//                 <div className="relative">
//                   <Popover open={searchOpen} onOpenChange={setSearchOpen}>
//                     <PopoverTrigger asChild>
//                       <Button
//                         variant="outline"
//                         role="combobox"
//                         aria-expanded={searchOpen}
//                         className="w-full justify-between font-normal text-left"
//                       >
//                         {entityName ? (
//                           <span className="truncate">{entityName}</span>
//                         ) : (
//                           <span className="text-muted-foreground">Select company...</span>
//                         )}
//                         <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//                       </Button>
//                     </PopoverTrigger>
//                     <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
//                       <Command>
//                         <CommandInput placeholder="Search company..." />
//                         <CommandList>
//                           <CommandEmpty>No company found.</CommandEmpty>
//                           <CommandGroup>
//                             {entities.map((entity) => {
//                               const entityIdStr = String(entity._id || entity.id)
//                               const name = entity.name || entity.company || ''
//                               const isSelected = selectedEntityId === entityIdStr

//                               return (
//                                 <CommandItem
//                                   key={entityIdStr}
//                                   value={`${name} ${entityIdStr}`}
//                                   onSelect={() => {
//                                     setSelectedEntityId(entityIdStr)
//                                     setSearchOpen(false)
//                                   }}
//                                   className="flex items-center justify-between cursor-pointer"
//                                 >
//                                   <div className="flex items-center min-w-0 mr-2">
//                                     <Check
//                                       className={cn(
//                                         "mr-2 h-4 w-4 shrink-0",
//                                         isSelected ? "opacity-100" : "opacity-0"
//                                       )}
//                                     />
//                                     <span className="truncate">{name}</span>
//                                   </div>
//                                 </CommandItem>
//                               )
//                             })}
//                           </CommandGroup>
//                         </CommandList>
//                       </Command>
//                     </PopoverContent>
//                   </Popover>
//                 </div>
//               ) : (
//                 <Input value={entityName || ''} readOnly className="bg-muted" />
//               )}
//             </div>
//           </div>

//           {/* Total Balance */}
//           {transactionType === 'credit' && (
//             <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
//               <Label className="font-semibold text-red-600">Total Balance</Label>
//               <Input
//                 value={hasCompany ? (isLoadingBalance ? 'Loading...' : currency(totalBalance)) : ''}
//                 readOnly
//                 className="bg-muted"
//               />
//             </div>
//           )}

//           {/* Amounts based on Transaction Nature */}
//           {transactionType === 'credit' ? (
//             <>
//               {/* Cash Amount */}
//               <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
//                 <Label className="font-semibold">Cash Amount</Label>
//                 <Input
//                   id="cashAmount"
//                   type="text"
//                   inputMode="decimal"
//                   placeholder="0.00"
//                   disabled={!hasCompany}
//                   value={form.cashAmount}
//                   onChange={(e) => {
//                     const value = e.target.value;
//                     const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
//                     setForm({ ...form, cashAmount: sanitized });
//                   }}
//                 />
//               </div>

//               {/* Bank Amount */}
//               <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
//                 <Label className="font-semibold">Bank Amount</Label>
//                 <Input
//                   id="bankAmount"
//                   type="text"
//                   inputMode="decimal"
//                   placeholder="0.00"
//                   disabled={!hasCompany}
//                   value={form.bankAmount}
//                   onChange={(e) => {
//                     const value = e.target.value;
//                     const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
//                     setForm({ ...form, bankAmount: sanitized });
//                   }}
//                 />
//               </div>
//             </>
//           ) : (
//             /* Debit / Charge Amount */
//             <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
//               <Label className="font-semibold">Charge Amount</Label>
//               <Input
//                 id="debitAmount"
//                 type="text"
//                 inputMode="decimal"
//                 placeholder="0.00"
//                 disabled={!hasCompany}
//                 value={form.debitAmount}
//                 onChange={(e) => {
//                   const value = e.target.value;
//                   const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
//                   setForm({ ...form, debitAmount: sanitized });
//                 }}
//               />
//             </div>
//           )}

//           {/* Remaining Balance */}
//           {transactionType === 'credit' && (
//             <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
//               <Label className="font-semibold">Remaining Balance</Label>
//               <Input
//                 value={hasCompany ? currency(totalBalance - totalCreditPayment) : ''}
//                 readOnly
//                 className="bg-muted"
//               />
//             </div>
//           )}

//           {/* Reference / Notes */}
//           <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
//             <Label className="font-semibold">Reference</Label>
//             <Input
//               id="notes"
//               placeholder={transactionType === 'credit' ? "Add payment notes..." : "Add charge notes..."}
//               disabled={!hasCompany}
//               value={form.notes}
//               onChange={(e) => setForm({ ...form, notes: e.target.value })}
//             />
//           </div>
//         </div>

//         <DialogFooter>
//           <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
//             Cancel
//           </Button>
//           <Button
//             onClick={handleSubmit}
//             disabled={
//               isSubmitting ||
//               !entityId ||
//               !form.date ||
//               (transactionType === 'credit' && totalCreditPayment <= 0) ||
//               (transactionType === 'debit' && debitAmount <= 0)
//             }
//             className={transactionType === 'credit' ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
//           >
//             {isSubmitting ? (
//               <>
//                 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                 Processing...
//               </>
//             ) : (
//               transactionType === 'credit' ? 'Submit Payment' : 'Submit Charge'
//             )}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   )
// }


"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ChevronsUpDown, Check } from "lucide-react"
import { ledgerAPI } from "@/lib/api/endpoints/ledger"
import { useQueryClient } from "@tanstack/react-query"
import { useLogisticsPayableDetail } from "@/lib/hooks/useLogisticsPayables"
import { useLogisticsLedger } from "@/lib/hooks/useLedger"
import toast from "react-hot-toast"
import BritishDatePicker from "@/components/BritishDatePicker"
import { useAuthStore } from "@/store/store"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

// Logistics currency format (GBP - Pounds)
function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * LogisticsPaymentModal
 * Modal for recording payments to logistics companies in pounds (£)
 * Supports both cash and bank payments in a single transaction
 */
export default function LogisticsPaymentModal({
  open,
  onClose,
  entityId: initialEntityId,
  entityName: initialEntityName,
  totalBalance: initialBalance = 0,
  entities = [],
  onSuccess
}) {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super-admin'
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiResponses, setApiResponses] = useState([])
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [selectedEntityId, setSelectedEntityId] = useState(initialEntityId || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const [transactionType, setTransactionType] = useState('credit')
  const [form, setForm] = useState({
    cashAmount: '',
    bankAmount: '',
    debitAmount: '',
    date: '',
    notes: ''
  })

  // Set default date to today when modal opens
  useEffect(() => {
    if (open && !form.date) {
      const today = new Date().toLocaleDateString('en-CA')
      setForm(prev => ({ ...prev, date: today }))
    }
  }, [open])

  // Fetch ledger data for the selected company (this gives us the accurate balance)
  const { data: ledgerData, isLoading: isLoadingLedger } = useLogisticsLedger(
    selectedEntityId && selectedEntityId !== 'all' ? selectedEntityId : null,
    { limit: 1000 }
  )

  // Fetch detailed balance for the selected company (for reference only, not used for balance calculation)
  const { data: companyDetail, isLoading: isLoadingPayableDetail } = useLogisticsPayableDetail(
    selectedEntityId && selectedEntityId !== 'all' ? selectedEntityId : null
  )

  // Update selected entity when prop changes
  useEffect(() => {
    if (initialEntityId) {
      setSelectedEntityId(initialEntityId)
    }
  }, [initialEntityId])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setForm({ cashAmount: '', bankAmount: '', debitAmount: '', date: '', notes: '' })
      setTransactionType('credit')
      setSearchQuery('')
      setSearchOpen(false)
      setApiResponses([])
      setShowDebugInfo(false)
      if (!initialEntityId) {
        setSelectedEntityId('')
      }
    }
  }, [open, initialEntityId])

  // Filter entities based on search query using useMemo
  const filteredEntities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return entities

    return entities.filter((entity) => {
      const name = (entity.name || '').toLowerCase()
      const company = (entity.company || '').toLowerCase()
      return name.includes(query) || company.includes(query)
    })
  }, [entities, searchQuery])

  const cashAmount = parseFloat(form.cashAmount) || 0
  const bankAmount = parseFloat(form.bankAmount) || 0
  const debitAmount = parseFloat(form.debitAmount) || 0
  const totalCreditPayment = cashAmount + bankAmount

  // Get entity details based on selection
  const selectedEntity = useMemo(() => {
    return entities.find(e => (e._id || e.id) === selectedEntityId) || null
  }, [entities, selectedEntityId])

  const entityName = selectedEntity?.name || selectedEntity?.company || initialEntityName || ''
  const entityId = selectedEntityId || initialEntityId
  const displayEntityId = selectedEntity?.logisticsCompanyId || selectedEntity?._id || selectedEntity?.id || entityId || ''

  // Calculate balance from ledger entries using the same method as the main page
  const ledgerBalance = useMemo(() => {
    if (!ledgerData?.entries || ledgerData.entries.length === 0) {
      return null
    }
    
    const filteredEntries = ledgerData.entries.filter(entry =>
      entry.transactionType === 'charge' ||
      entry.transactionType === 'payment' ||
      entry.transactionType === 'adjustment'
    )
    
    if (filteredEntries.length === 0) {
      return null
    }
    
    const sortedAsc = [...filteredEntries].sort((a, b) => {
      const createdAtA = new Date(a.createdAt || a.date || 0).getTime()
      const createdAtB = new Date(b.createdAt || b.date || 0).getTime()
      return createdAtA - createdAtB
    })
    
    let runningBalance = 0
    for (const entry of sortedAsc) {
      runningBalance += (Number(entry.debit) || 0) - (Number(entry.credit) || 0)
    }
    
    return runningBalance
  }, [ledgerData])

  // Calculate total balance: prioritize calculated balance from ledger entries
  const totalBalance = entityId && entityId !== 'all'
    ? (ledgerBalance !== null
      ? ledgerBalance
      : (initialBalance !== undefined && initialBalance !== null
        ? initialBalance
        : (companyDetail?.outstandingBalance !== undefined
          ? companyDetail.outstandingBalance
          : (selectedEntity?.balance !== undefined
            ? Math.abs(selectedEntity.balance)
            : 0))))
    : 0

  const isLoadingBalance = isLoadingLedger || isLoadingPayableDetail

  const handleClose = () => {
    setForm({ cashAmount: '', bankAmount: '', debitAmount: '', date: '', notes: '' })
    setTransactionType('credit')
    setSearchQuery('')
    setSearchOpen(false)
    setApiResponses([])
    setShowDebugInfo(false)
    if (!initialEntityId) {
      setSelectedEntityId('')
    }
    onClose()
  }

  const handleSubmit = async () => {
    if (!entityId) {
      toast.error('Please select a logistics company')
      return
    }

    if (!form.date) {
      toast.error('Please select a date')
      return
    }

    if (transactionType === 'credit') {
      if (totalCreditPayment <= 0) {
        toast.error('Please enter a payment amount')
        return
      }
    } else {
      if (debitAmount <= 0) {
        toast.error('Please enter a charge amount')
        return
      }
    }

    setIsSubmitting(true)
    setApiResponses([])
    setShowDebugInfo(true)

    try {
      if (transactionType === 'credit') {
        let isPendingApproval = false
        if (cashAmount > 0) {
          const cashResponse = await ledgerAPI.distributeLogisticsPayment(entityId, {
            amount: cashAmount,
            paymentMethod: 'cash',
            date: form.date,
            description: form.notes || `Cash payment to ${entityName}`
          })
          if (cashResponse.status === 202) isPendingApproval = true
          setApiResponses(prev => [...prev, {
            type: 'Cash Payment',
            response: cashResponse,
            timestamp: new Date().toISOString()
          }])
        }

        if (bankAmount > 0) {
          const bankResponse = await ledgerAPI.distributeLogisticsPayment(entityId, {
            amount: bankAmount,
            paymentMethod: 'bank',
            date: form.date,
            description: form.notes || `Bank payment to ${entityName}`
          })
          if (bankResponse.status === 202) isPendingApproval = true
          setApiResponses(prev => [...prev, {
            type: 'Bank Payment',
            response: bankResponse,
            timestamp: new Date().toISOString()
          }])
        }

        if (isPendingApproval) {
          toast.success('Backdated payment request submitted for approval of super admin.')
          handleClose()
          const router = window.nextRouter || { push: (url) => window.location.href = url }
          router.push('/my-requests')
          return
        }

        toast.success(`Payment of ${currency(totalCreditPayment)} recorded successfully`)
      } else {
        const debitResponse = await ledgerAPI.createEntry({
          type: 'logistics',
          entityId: entityId,
          entityModel: 'LogisticsCompany',
          transactionType: 'adjustment',
          debit: debitAmount,
          date: form.date,
          description: form.notes || `Debit adjustment for ${entityName}`
        })
        
        if (debitResponse.status === 202) {
          toast.success('Backdated adjustment request submitted for approval of super admin.')
          handleClose()
          const router = window.nextRouter || { push: (url) => window.location.href = url }
          router.push('/my-requests')
          return
        }

        setApiResponses(prev => [...prev, {
          type: 'Debit Adjustment',
          response: debitResponse,
          timestamp: new Date().toISOString()
        }])

        toast.success(`Charge of ${currency(debitAmount)} recorded successfully`)
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['pending-balances-logistics'] })
      queryClient.invalidateQueries({ queryKey: ['ledger', 'logistics'] })
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
      queryClient.invalidateQueries({ queryKey: ['logistics-companies'] })

      handleClose()
      onSuccess?.()
    } catch (error) {
      console.error('Error creating transaction:', error)
      setApiResponses(prev => [...prev, {
        type: 'Error',
        response: {
          error: true,
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          stack: error.stack
        },
        timestamp: new Date().toISOString()
      }])
      toast.error(error.response?.data?.message || error.message || 'Failed to record transaction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const showEntitySelector = entities.length > 0
  const hasCompany = !!entityId

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Logistics Details
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[65vh] space-y-3 py-2 px-2">
          {/* Transaction Type Toggle */}
          <div className="grid grid-cols-[140px_1fr] items-start gap-x-4">
            <Label className="pt-2 font-semibold">Transaction Type</Label>
            <div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={transactionType === 'credit' ? 'default' : 'outline'}
                  size="sm"
                  className={transactionType === 'credit' ? 'bg-green-600 hover:bg-green-700 text-white font-medium' : ''}
                  onClick={() => {
                    setTransactionType('credit')
                    setForm({ ...form, debitAmount: '' })
                  }}
                >
                  Pay Company
                </Button>
                <Button
                  type="button"
                  variant={transactionType === 'debit' ? 'default' : 'outline'}
                  size="sm"
                  className={transactionType === 'debit' ? 'bg-red-600 hover:bg-red-700 text-white font-medium' : ''}
                  onClick={() => {
                    setTransactionType('debit')
                    setForm({ ...form, cashAmount: '', bankAmount: '' })
                  }}
                >
                  Issue Credit/Charge
                </Button>
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
            <Label className="font-semibold">Date</Label>
            <BritishDatePicker
              value={form.date ? new Date(form.date) : new Date()}
              onChange={(date) => {
                if (date) {
                  setForm({ ...form, date: date.toLocaleDateString('en-CA') });
                }
              }}
              restrictByRole={true}
              disabled={!hasCompany}
              className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50${!hasCompany ? ' opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Company Selector */}
          <div className="grid grid-cols-[140px_1fr] items-start gap-x-4">
            <Label className="font-semibold pt-2">Company</Label>
            <div>
              {showEntitySelector ? (
                <div className="relative">
                  <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={searchOpen}
                        className="w-full justify-between font-normal text-left"
                      >
                        {entityName ? (
                          <span className="truncate">{entityName}</span>
                        ) : (
                          <span className="text-muted-foreground">Select company...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search company..." />
                        <CommandList>
                          <CommandEmpty>No company found.</CommandEmpty>
                          <CommandGroup>
                            {entities.map((entity) => {
                              const entityIdStr = String(entity._id || entity.id)
                              const name = entity.name || entity.company || ''
                              const isSelected = selectedEntityId === entityIdStr

                              return (
                                <CommandItem
                                  key={entityIdStr}
                                  value={`${name} ${entityIdStr}`}
                                  onSelect={() => {
                                    setSelectedEntityId(entityIdStr)
                                    setSearchOpen(false)
                                  }}
                                  className="flex items-center justify-between cursor-pointer"
                                >
                                  <div className="flex items-center min-w-0 mr-2">
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4 shrink-0",
                                        isSelected ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="truncate">{name}</span>
                                  </div>
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <Input value={entityName || ''} readOnly className="bg-muted" />
              )}
            </div>
          </div>

          {/* Total Balance */}
          {transactionType === 'credit' && (
            <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
              <Label className="font-semibold text-red-600">Total Balance</Label>
              <Input
                value={hasCompany ? (isLoadingBalance ? 'Loading...' : currency(totalBalance)) : ''}
                readOnly
                className="bg-muted"
              />
            </div>
          )}

          {/* Amounts based on Transaction Nature */}
          {transactionType === 'credit' ? (
            <>
              {/* Cash Amount */}
              <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
                <Label className="font-semibold">Cash Amount</Label>
                <Input
                  id="cashAmount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  disabled={!hasCompany}
                  value={form.cashAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                    setForm({ ...form, cashAmount: sanitized });
                  }}
                />
              </div>

              {/* Bank Amount */}
              <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
                <Label className="font-semibold">Bank Amount</Label>
                <Input
                  id="bankAmount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  disabled={!hasCompany}
                  value={form.bankAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                    setForm({ ...form, bankAmount: sanitized });
                  }}
                />
              </div>
            </>
          ) : (
            /* Debit / Charge Amount */
            <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
              <Label className="font-semibold">Charge Amount</Label>
              <Input
                id="debitAmount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                disabled={!hasCompany}
                value={form.debitAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                  setForm({ ...form, debitAmount: sanitized });
                }}
              />
            </div>
          )}

          {/* Remaining Balance */}
          {transactionType === 'credit' && (
            <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
              <Label className="font-semibold">Remaining Balance</Label>
              <Input
                value={hasCompany ? currency(totalBalance - totalCreditPayment) : ''}
                readOnly
                className="bg-muted"
              />
            </div>
          )}

          {/* Reference / Notes */}
          <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
            <Label className="font-semibold">Reference</Label>
            <Input
              id="notes"
              placeholder={transactionType === 'credit' ? "Add payment notes..." : "Add charge notes..."}
              disabled={!hasCompany}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !entityId ||
              !form.date ||
              (transactionType === 'credit' && totalCreditPayment <= 0) ||
              (transactionType === 'debit' && debitAmount <= 0)
            }
            className={transactionType === 'credit' ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              transactionType === 'credit' ? 'Submit Payment' : 'Submit Charge'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}