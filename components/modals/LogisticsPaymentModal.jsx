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
  const [selectedEntityId, setSelectedEntityId] = useState(initialEntityId || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchInputRef = useRef(null)
  const dropdownRef = useRef(null)

  const [form, setForm] = useState({
    cashAmount: '',
    bankAmount: '',
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

  // Fetch detailed balance for the selected company
  const { data: companyDetail, isLoading: isLoadingBalance } = useLogisticsPayableDetail(
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
      setForm({ cashAmount: '', bankAmount: '', date: '', notes: '' })
      setSearchQuery('')
      setShowSuggestions(false)
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
  const totalPayment = cashAmount + bankAmount

  // Get entity details based on selection
  const selectedEntity = entities.find(e => (e._id || e.id) === selectedEntityId)
  const entityName = selectedEntity?.name || selectedEntity?.company || initialEntityName || ''
  const entityId = selectedEntityId || initialEntityId

  // Use the fetched detailed balance if available, otherwise fallback to entity balance or initialBalance
  const totalBalance = companyDetail?.outstandingBalance !== undefined
    ? companyDetail.outstandingBalance
    : (selectedEntity?.balance
      ? Math.abs(selectedEntity.balance)
      : initialBalance)

  const handleClose = () => {
    setForm({ cashAmount: '', bankAmount: '', date: '', notes: '' })
    setSearchQuery('')
    setShowSuggestions(false)
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

    if (totalPayment <= 0) {
      toast.error('Please enter a payment amount')
      return
    }

    setIsSubmitting(true)

    try {
      const paymentPromises = []

      if (cashAmount > 0) {
        paymentPromises.push(
          ledgerAPI.distributeLogisticsPayment(entityId, {
            amount: cashAmount,
            paymentMethod: 'cash',
            date: form.date || new Date().toISOString(),
            description: form.notes || `Cash payment to ${entityName}`
          })
        )
      }

      if (bankAmount > 0) {
        paymentPromises.push(
          ledgerAPI.distributeLogisticsPayment(entityId, {
            amount: bankAmount,
            paymentMethod: 'bank',
            date: form.date || new Date().toISOString(),
            description: form.notes || `Bank payment to ${entityName}`
          })
        )
      }

      await Promise.all(paymentPromises)

      toast.success(`Payment of ${currency(totalPayment)} recorded successfully`)

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['pending-balances-logistics'] })
      queryClient.invalidateQueries({ queryKey: ['ledger', 'logistics'] })
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
      queryClient.invalidateQueries({ queryKey: ['logistics-companies'] })

      handleClose()
      onSuccess?.()
    } catch (error) {
      console.error('Error creating payment:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to record payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const showEntitySelector = entities.length > 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Add Logistics Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              <div>
                <Label className="text-xs text-muted-foreground">Total Outstanding (GBP)</Label>
                <p className="font-semibold text-lg text-red-600">
                  {isLoadingBalance ? (
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  ) : (
                    currency(totalBalance)
                  )}
                </p>
              </div>
            </div>
          </div>

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
          {totalPayment > 0 && (
            <div className={`rounded-lg border p-3 ${totalPayment > totalBalance && totalBalance > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Payment:</span>
                <span className="text-lg font-bold text-green-700">{currency(totalPayment)}</span>
              </div>
              {totalBalance > 0 && totalPayment <= totalBalance && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">Remaining after payment:</span>
                  <span className="text-sm font-medium">{currency(totalBalance - totalPayment)}</span>
                </div>
              )}
              {totalBalance > 0 && totalPayment > totalBalance && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-amber-700 font-medium">Credit to Company:</span>
                  <span className="text-sm font-bold text-amber-700">{currency(totalPayment - totalBalance)}</span>
                </div>
              )}
            </div>
          )}

          {/* Date (optional) */}
          <div className="space-y-2">
            <Label htmlFor="date">Date (optional)</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          {/* Notes (optional) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this payment..."
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
            disabled={isSubmitting || totalPayment <= 0 || !entityId}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Submit Payment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
