"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CreditCard, Banknote, Wallet } from "lucide-react"
import { ledgerAPI } from "@/lib/api/endpoints/ledger"
import { useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"

// Supplier amount format (no currency symbol - each supplier has own currency)
function formatAmount(n) {
    const num = Number(n || 0)
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * SupplierPaymentModal
 * Modal for recording payments (credit) and charges (debit) to suppliers
 * Supports both cash and bank payments for credit transactions
 * Simplified form for debit transactions (single amount + notes)
 */
export default function SupplierPaymentModal({
    open,
    onClose,
    entityId: initialEntityId,
    entityName: initialEntityName,
    totalBalance: initialBalance = 0,
    ledgerBalance: parentLedgerBalance,
    ledgerBalanceSupplierId: parentLedgerBalanceSupplierId,
    supplierBalanceMap = {},
    entities = [],
    onSuccess
}) {
    const queryClient = useQueryClient()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedEntityId, setSelectedEntityId] = useState(initialEntityId || '')
    const [searchQuery, setSearchQuery] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [transactionType, setTransactionType] = useState('credit')
    const searchInputRef = useRef(null)
    const dropdownRef = useRef(null)
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
            if (!initialEntityId) {
                setSelectedEntityId('')
            }
        }
    }, [open, initialEntityId])

    // Filter entities based on search query
    const filteredEntities = searchQuery.trim()
        ? entities.filter((entity) => {
            const entityName = (entity.name || '').toLowerCase()
            const entityCompany = (entity.company || '').toLowerCase()
            const query = searchQuery.toLowerCase()
            return entityName.includes(query) || entityCompany.includes(query)
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

    // Get entity details based on selection (already using entities from parent)
    const selectedEntity = entities.find(e => (e._id || e.id) === selectedEntityId || String(e.id) === selectedEntityId)
    const entityName = selectedEntity?.name || selectedEntity?.company || initialEntityName || ''
    const entityId = selectedEntityId || initialEntityId

    // Calculate totalBalance with priority:
    // 1. supplierBalanceMap (from allLedgerTransactions - same as parent page)
    // 2. parentLedgerBalance (if for current supplier)
    // 3. selectedEntity.balance (from entities array)
    // 4. initialBalance (fallback)
    
    // Priority 1: Use balance from supplierBalanceMap (same calculation as parent page)
    const balanceFromMap = selectedEntityId ? supplierBalanceMap[String(selectedEntityId)] : null
    
    // Priority 2: Use parentLedgerBalance if it's for the currently selected supplier
    const shouldUseParentBalance = parentLedgerBalanceSupplierId && 
                                   selectedEntityId && 
                                   String(parentLedgerBalanceSupplierId) === String(selectedEntityId) &&
                                   parentLedgerBalance !== undefined && 
                                   parentLedgerBalance !== null &&
                                   balanceFromMap === undefined
    
    const totalBalance = balanceFromMap !== undefined && balanceFromMap !== null
        ? Math.abs(balanceFromMap)
        : (shouldUseParentBalance
            ? Math.abs(parentLedgerBalance)
            : (selectedEntity?.balance !== undefined && selectedEntity?.balance !== null
                ? Math.abs(selectedEntity.balance)
                : Math.abs(initialBalance || 0)))
    const handleClose = () => {
        setForm({ cashAmount: '', bankAmount: '', debitAmount: '', date: '', notes: '' })
        setTransactionType('credit')
        setSearchQuery('')
        setShowSuggestions(false)
        if (!initialEntityId) {
            setSelectedEntityId('')
        }
        onClose()
    }

    const handleSupplierSelect = (entity) => {
        const entityIdStr = String(entity._id || entity.id)
        setSelectedEntityId(entityIdStr)
        setSearchQuery('')
        setShowSuggestions(false)
    }

    const handleSubmit = async () => {
        if (!entityId) {
            toast.error('Please select a supplier')
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

        try {
            const paymentPromises = []

            if (transactionType === 'credit') {
                // Credit transactions (payments)
                if (cashAmount > 0) {
                    paymentPromises.push(
                        ledgerAPI.createEntry({
                            type: 'supplier',
                            entityId: entityId,
                            entityModel: 'Supplier',
                            transactionType: 'payment',
                            paymentMethod: 'cash',
                            credit: cashAmount,
                            date: form.date,
                            description: form.notes || `Cash payment to ${entityName}`
                        })
                    )
                }

                if (bankAmount > 0) {
                    paymentPromises.push(
                        ledgerAPI.createEntry({
                            type: 'supplier',
                            entityId: entityId,
                            entityModel: 'Supplier',
                            transactionType: 'payment',
                            paymentMethod: 'bank',
                            credit: bankAmount,
                            date: form.date,
                            description: form.notes || `Bank payment to ${entityName}`
                        })
                    )
                }

                await Promise.all(paymentPromises)
                toast.success(`Payment of ${formatAmount(totalCreditPayment)} recorded successfully`)
            } else {
                // Debit transactions (charges/adjustments)
                paymentPromises.push(
                    ledgerAPI.createEntry({
                        type: 'supplier',
                        entityId: entityId,
                        entityModel: 'Supplier',
                        transactionType: 'adjustment',
                        debit: debitAmount,
                        date: form.date,
                        description: form.notes || `Debit adjustment for ${entityName}`
                    })
                )

                await Promise.all(paymentPromises)
                toast.success(`Charge of ${formatAmount(debitAmount)} recorded successfully`)
            }

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['pending-balances'] })
            queryClient.invalidateQueries({ queryKey: ['ledger', 'supplier'] })
            queryClient.invalidateQueries({ queryKey: ['ledger'] })
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] })

            handleClose()
            onSuccess?.()
        } catch (error) {
            console.error('Error creating transaction:', error)
            toast.error(error.response?.data?.message || error.message || 'Failed to record transaction')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Always show selector if we have entities, unless entityId is pre-set
    const showEntitySelector = entities.length > 0


    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        {transactionType === 'credit' ? 'Add Supplier Payment' : 'Add Supplier Charge'}
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
                                <span className="text-sm">Credit (Payment to Supplier)</span>
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
                    {/* {JSON.stringify(entities)} */}

                    {/* Entity Selector - Text Search Input */}
                    {showEntitySelector && (
                        <div className="space-y-2">
                            <Label htmlFor="entity-search">Select Supplier</Label>
                            <div className="relative">
                                <Input
                                    id="entity-search"
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search supplier by name or company..."
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
                                                const entityDisplay = `${entityName}`
                                                const isSelected = selectedEntityId === entityIdStr

                                                return (
                                                    <div
                                                        key={entityIdStr}
                                                        onClick={() => handleSupplierSelect(entity)}
                                                        className={`flex items-center px-3 py-2 text-sm rounded-sm cursor-pointer hover:bg-slate-100 ${isSelected ? 'bg-slate-50 font-medium' : ''
                                                            }`}
                                                    >
                                                        {entityDisplay}
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
                                        No suppliers found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Entity Info */}
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="space-y-2">
                            <div>
                                <Label className="text-xs text-muted-foreground">Supplier</Label>
                                <p className="font-semibold">{entityName || 'Not selected'}</p>
                            </div>
                            {transactionType === 'credit' && (
                                <div>
                                    <Label className="text-xs text-muted-foreground">Total Outstanding</Label>
                                    <p className="font-semibold text-lg text-red-600">{formatAmount(totalBalance)}</p>
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
                                    Cash Amount
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
                                    Bank Amount
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
                                        <span className="text-lg font-bold text-green-700">{formatAmount(totalCreditPayment)}</span>
                                    </div>
                                    {totalBalance > 0 && totalCreditPayment <= totalBalance && (
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs text-muted-foreground">Remaining after payment:</span>
                                            <span className="text-sm font-medium">{formatAmount(totalBalance - totalCreditPayment)}</span>
                                        </div>
                                    )}
                                    {totalBalance > 0 && totalCreditPayment > totalBalance && (
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs text-amber-700 font-medium">Credit to Supplier:</span>
                                            <span className="text-sm font-bold text-amber-700">{formatAmount(totalCreditPayment - totalBalance)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Debit Form Fields - Simplified */}
                    {transactionType === 'debit' && (
                        <div className="space-y-2">
                            <Label htmlFor="debitAmount" className="flex items-center gap-2">
                                <Banknote className="h-4 w-4 text-red-600" />
                                Charge Amount
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
