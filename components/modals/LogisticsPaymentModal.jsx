"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CreditCard, Banknote, Truck } from "lucide-react"
import { ledgerAPI } from "@/lib/api/endpoints/ledger"
import { useQueryClient } from "@tanstack/react-query"
import { useLogisticsPayableDetail } from "@/lib/hooks/useLogisticsPayables"
import { useLogisticsLedger } from "@/lib/hooks/useLedger"
import { useMemo } from "react"
import toast from "react-hot-toast"

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
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiResponses, setApiResponses] = useState([])
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [selectedEntityId, setSelectedEntityId] = useState(initialEntityId || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchInputRef = useRef(null)
  const dropdownRef = useRef(null)

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
      const today = new Date().toISOString().split('T')[0]
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
      setShowSuggestions(false)
      setApiResponses([])
      setShowDebugInfo(false)
      if (!initialEntityId) {
        setSelectedEntityId('')
      }
    }
  }, [open, initialEntityId])

  // Filter entities based on search query
  const filteredEntities = searchQuery.trim()
    ? entities.filter((entity) => {
      const name = (entity.name || '').toLowerCase()
      const company = (entity.company || '').toLowerCase()
      const query = searchQuery.toLowerCase()
      return name.includes(query) || company.includes(query)
    }).slice(0, 10)
    : []

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false)
      }
    }

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSuggestions])

  const cashAmount = parseFloat(form.cashAmount) || 0
  const bankAmount = parseFloat(form.bankAmount) || 0
  const debitAmount = parseFloat(form.debitAmount) || 0
  const totalCreditPayment = cashAmount + bankAmount

  // Get entity details based on selection
  const selectedEntity = entities.find(e => (e._id || e.id) === selectedEntityId)
  const entityName = selectedEntity?.name || selectedEntity?.company || initialEntityName || ''
  const entityId = selectedEntityId || initialEntityId

  // Calculate balance from ledger entries using the same method as the main page
  // This matches the running balance calculation used in the logistics ledger page
  const ledgerBalance = useMemo(() => {
    if (!ledgerData?.entries || ledgerData.entries.length === 0) {
      return null  // Return null to indicate no data available
    }
    
    // Filter entries to only include relevant transaction types (same as main page)
    const filteredEntries = ledgerData.entries.filter(entry =>
      entry.transactionType === 'charge' ||
      entry.transactionType === 'payment' ||
      entry.transactionType === 'adjustment'
    )
    
    if (filteredEntries.length === 0) {
      return null
    }
    
    // Sort by createdAt ASCENDING (oldest first) for running balance calculation (same as main page)
    const sortedAsc = [...filteredEntries].sort((a, b) => {
      const createdAtA = new Date(a.createdAt || a.date || 0).getTime()
      const createdAtB = new Date(b.createdAt || b.date || 0).getTime()
      return createdAtA - createdAtB
    })
    
    // Calculate running balance (same method as main page)
    // Debit = charge (increases what admin owes), Credit = payment (decreases what admin owes)
    let runningBalance = 0
    for (const entry of sortedAsc) {
      runningBalance += (Number(entry.debit) || 0) - (Number(entry.credit) || 0)
    }
    
    return runningBalance
  }, [ledgerData])

  // Calculate total balance: prioritize calculated balance from ledger entries (matches main page)
  // Fallback to initialBalance prop, then other sources
  // Only calculate balance if a company is selected
  const totalBalance = entityId && entityId !== 'all'
    ? (ledgerBalance !== null
      ? ledgerBalance  // Use calculated balance from ledger entries (matches main page calculation)
      : (initialBalance !== undefined && initialBalance !== null
        ? initialBalance  // Fallback to balance from main page prop
        : (companyDetail?.outstandingBalance !== undefined
          ? companyDetail.outstandingBalance
          : (selectedEntity?.balance !== undefined
            ? Math.abs(selectedEntity.balance)
            : 0))))
    : 0

  // Combined loading state
  const isLoadingBalance = isLoadingLedger || isLoadingPayableDetail

  const handleClose = () => {
    setForm({ cashAmount: '', bankAmount: '', debitAmount: '', date: '', notes: '' })
    setTransactionType('credit')
    setSearchQuery('')
    setShowSuggestions(false)
    setApiResponses([])
    setShowDebugInfo(false)
    if (!initialEntityId) {
      setSelectedEntityId('')
    }
    onClose()
  }

  const handleCompanySelect = (entity) => {
    const entityIdStr = String(entity._id || entity.id)
    setSelectedEntityId(entityIdStr)
    setSearchQuery('')
    setShowSuggestions(false)
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
        // Credit transactions (payments)
        // Process sequentially to avoid race conditions with pending charges
        // Cash payment is processed first, then bank payment sees updated balances
        if (cashAmount > 0) {
          const cashResponse = await ledgerAPI.distributeLogisticsPayment(entityId, {
            amount: cashAmount,
            paymentMethod: 'cash',
            date: form.date,
            description: form.notes || `Cash payment to ${entityName}`
          })
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
          setApiResponses(prev => [...prev, {
            type: 'Bank Payment',
            response: bankResponse,
            timestamp: new Date().toISOString()
          }])
        }

        toast.success(`Payment of ${currency(totalCreditPayment)} recorded successfully`)
      } else {
        // Debit transactions (charges/adjustments)
        const debitResponse = await ledgerAPI.createEntry({
          type: 'logistics',
          entityId: entityId,
          entityModel: 'LogisticsCompany',
          transactionType: 'adjustment',
          debit: debitAmount,
          date: form.date,
          description: form.notes || `Debit adjustment for ${entityName}`
        })
        
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

      // Don't close immediately - let user see the debug info
      // handleClose()
      // onSuccess?.()
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {transactionType === 'credit' ? 'Add Logistics Payment' : 'Add Logistics Charge'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transaction Type Selector */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="credit"
                  checked={transactionType === 'credit'}
                  onChange={(e) => {
                    setTransactionType('credit')
                    setForm({ ...form, debitAmount: '' })
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">Credit (Payment to Company)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="debit"
                  checked={transactionType === 'debit'}
                  onChange={(e) => {
                    setTransactionType('debit')
                    setForm({ ...form, cashAmount: '', bankAmount: '' })
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">Debit (Charge/Adjustment)</span>
              </label>
            </div>
          </div>

          {/* Entity Selector - Text Search Input */}
          {showEntitySelector && (
            <div className="space-y-2">
              <Label htmlFor="entity-search">Select Logistics Company</Label>
              <div className="relative">
                <Input
                  id="entity-search"
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search company by name..."
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value
                    setSearchQuery(value)
                    setShowSuggestions(value.trim().length > 0)
                  }}
                  onFocus={() => {
                    if (searchQuery.trim().length > 0) {
                      setShowSuggestions(true)
                    }
                  }}
                />
                {showSuggestions && filteredEntities.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto"
                  >
                    <div className="p-1">
                      {filteredEntities.map((entity) => {
                        const entityIdStr = String(entity._id || entity.id)
                        const entityName = entity.name || entity.company || ''
                        const isSelected = selectedEntityId === entityIdStr

                        return (
                          <div
                            key={entityIdStr}
                            onClick={() => handleCompanySelect(entity)}
                            className={`flex items-center px-3 py-2 text-sm rounded-sm cursor-pointer hover:bg-slate-100 ${isSelected ? 'bg-slate-50 font-medium' : ''
                              }`}
                          >
                            {entityName}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {showSuggestions && searchQuery.trim().length > 0 && filteredEntities.length === 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-3 text-sm text-muted-foreground"
                  >
                    No companies found.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Entity Info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Logistics Company</Label>
                <p className="font-semibold">{entityName || 'Not selected'}</p>
              </div>
              {transactionType === 'credit' && (
                <div>
                  <Label className="text-xs text-muted-foreground">Total Balance (GBP)</Label>
                  <p className={`font-semibold text-lg ${totalBalance > 0 ? 'text-red-600' : totalBalance < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                    {isLoadingBalance ? (
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    ) : entityId && entityId !== 'all' ? (
                      <span>
                        {totalBalance < 0 && '-'}
                        {currency(Math.abs(totalBalance))}
                      </span>
                    ) : (
                      '-'
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalBalance > 0 ? 'Admin owes company' : totalBalance < 0 ? 'Company owes admin (credit)' : 'No balance'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Credit Form Fields */}
          {transactionType === 'credit' && (
            <>
              {/* Cash Amount */}
              <div className="space-y-2">
                <Label htmlFor="cashAmount" className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-600" />
                  Cash Amount (£)
                </Label>
                <Input
                  id="cashAmount"
                  type="text"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.cashAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow only numbers and one decimal point
                    const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                    setForm({ ...form, cashAmount: sanitized });
                  }}
                  className="text-right"
                />
              </div>

              {/* Bank Amount */}
              <div className="space-y-2">
                <Label htmlFor="bankAmount" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  Bank Amount (£)
                </Label>
                <Input
                  id="bankAmount"
                  type="text"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.bankAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow only numbers and one decimal point
                    const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                    setForm({ ...form, bankAmount: sanitized });
                  }}
                  className="text-right"
                />
              </div>

              {/* Total Payment Display */}
              {totalCreditPayment > 0 && (
                <div className={`rounded-lg border p-3 ${totalCreditPayment > totalBalance && totalBalance > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Payment:</span>
                    <span className="text-lg font-bold text-green-700">{currency(totalCreditPayment)}</span>
                  </div>
                  {totalBalance > 0 && totalCreditPayment <= totalBalance && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">Remaining after payment:</span>
                      <span className="text-sm font-medium">{currency(totalBalance - totalCreditPayment)}</span>
                    </div>
                  )}
                  {totalBalance > 0 && totalCreditPayment > totalBalance && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-amber-700 font-medium">Credit to Company:</span>
                      <span className="text-sm font-bold text-amber-700">{currency(totalCreditPayment - totalBalance)}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Debit Form Fields */}
          {transactionType === 'debit' && (
            <div className="space-y-2">
              <Label htmlFor="debitAmount" className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-red-600" />
                Charge Amount (£)
              </Label>
              <Input
                id="debitAmount"
                type="text"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.debitAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers and one decimal point
                  const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                  setForm({ ...form, debitAmount: sanitized });
                }}
                className="text-right"
              />
            </div>
          )}

          {/* Date (mandatory) */}
          <div className="space-y-2">
            <Label htmlFor="date">
              Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder={transactionType === 'credit' ? "Add any notes about this payment..." : "Add any notes about this charge..."}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
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
            className={transactionType === 'credit' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
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
