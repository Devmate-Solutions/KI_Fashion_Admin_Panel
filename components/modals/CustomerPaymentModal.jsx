"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CreditCard, Banknote, Wallet, Printer, ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import { paymentAPI } from "@/lib/api/endpoints/payments"
import { useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"

// Format with £ currency symbol
function formatAmount(n) {
    const num = Number(n || 0)
    return `£${num.toFixed(2)}`
}

/**
 * CustomerPaymentModal
 * Modal for recording payments (receipts) from customers
 * Supports both cash and bank payments
 * Uses FIFO distribution to apply payments to oldest pending sales first
 */
export default function CustomerPaymentModal({
    open,
    onClose,
    entityId: initialEntityId,
    entityName: initialEntityName,
    totalBalance: initialBalance = 0,
    ledgerBalance: parentLedgerBalance,
    ledgerBalanceBuyerId: parentLedgerBalanceBuyerId,
    buyerBalanceMap = {},
    entities = [],
    onSuccess,
    allLedgerData
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
        notes: '',
        paymentDirection: 'credit',
        debitReason: ''
    })

    // Debit reason options
    const debitReasonOptions = [
        { value: 'refund', label: 'Refund' },
        { value: 'credit_note', label: 'Credit Note' },
        { value: 'price_adjustment', label: 'Price Adjustment' },
        { value: 'goodwill', label: 'Goodwill Credit' },
        { value: 'other', label: 'Other Adjustment' }
    ]

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
            setForm({ cashAmount: '', bankAmount: '', date: '', notes: '', paymentDirection: 'credit', debitReason: '' })
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
    const totalPayment = cashAmount + bankAmount

    // Get entity details based on selection
    const selectedEntity = entities.find(e => (e._id || e.id) === selectedEntityId || String(e.id) === selectedEntityId)
    const entityName = selectedEntity?.name || selectedEntity?.company || initialEntityName || ''
    const entityId = selectedEntityId || initialEntityId

    // Calculate totalBalance with priority:
    // 1. buyerBalanceMap (from allLedgerTransactions - same as parent page)
    // 2. parentLedgerBalance (if for current buyer)
    // 3. selectedEntity.balance (from entities array)
    // 4. initialBalance (fallback)

    // Priority 1: Use balance from buyerBalanceMap (same calculation as parent page)
    const balanceFromMap = selectedEntityId ? buyerBalanceMap[String(selectedEntityId)] : null

    // Priority 2: Use parentLedgerBalance if it's for the currently selected buyer
    const shouldUseParentBalance = parentLedgerBalanceBuyerId &&
        selectedEntityId &&
        String(parentLedgerBalanceBuyerId) === String(selectedEntityId) &&
        parentLedgerBalance !== undefined &&
        parentLedgerBalance !== null &&
        balanceFromMap === undefined

    const totalBalance = balanceFromMap !== undefined && balanceFromMap !== null
        ? balanceFromMap
        : (shouldUseParentBalance
            ? parentLedgerBalance
            : (selectedEntity?.balance !== undefined && selectedEntity?.balance !== null
                ? selectedEntity.balance
                : initialBalance))

    const handleClose = () => {
        setForm({ cashAmount: '', bankAmount: '', date: '', notes: '', paymentDirection: 'credit', debitReason: '' })
        setSearchQuery('')
        setShowSuggestions(false)
        if (!initialEntityId) {
            setSelectedEntityId('')
        }
        onClose()
    }

    const handleCustomerSelect = (entity) => {
        const entityIdStr = String(entity._id || entity.id)
        setSelectedEntityId(entityIdStr)
        setSearchQuery('')
        setShowSuggestions(false)
    }

    const handleSubmit = async () => {
        if (!entityId) {
            toast.error('Please select a customer')
            return
        }

        if (!form.date) {
            toast.error('Please select a date')
            return
        }

        if (totalPayment <= 0) {
            toast.error('Please enter a payment amount')
            return
        }

        // Validate debit reason for debit transactions
        if (form.paymentDirection === 'debit' && !form.debitReason) {
            toast.error('Please select a reason for the debit transaction')
            return
        }

        setIsSubmitting(true)

        try {
            // Use the new payment API that creates a payment receipt
            // For combined cash + bank payments, we create separate payment records
            let lastPaymentNumber = null
            let totalCreated = 0

            if (cashAmount > 0) {
                const cashResult = await paymentAPI.createCustomerPayment({
                    customerId: entityId,
                    amount: cashAmount,
                    paymentMethod: 'cash',
                    date: form.date,
                    description: form.notes || `Cash ${form.paymentDirection === 'debit' ? 'debit' : 'payment'} from ${entityName}`,
                    paymentDirection: form.paymentDirection,
                    debitReason: form.paymentDirection === 'debit' ? form.debitReason : undefined
                })
                lastPaymentNumber = cashResult.data?.data?.payment?.paymentNumber
                totalCreated++
            }

            if (bankAmount > 0) {
                const bankResult = await paymentAPI.createCustomerPayment({
                    customerId: entityId,
                    amount: bankAmount,
                    paymentMethod: 'bank',
                    date: form.date,
                    description: form.notes || `Bank ${form.paymentDirection === 'debit' ? 'debit' : 'payment'} from ${entityName}`,
                    paymentDirection: form.paymentDirection,
                    debitReason: form.paymentDirection === 'debit' ? form.debitReason : undefined
                })
                lastPaymentNumber = bankResult.data?.data?.payment?.paymentNumber
                totalCreated++
            }

            const typeLabel = form.paymentDirection === 'debit' ? 'debit transaction' : 'payment'
            const successMessage = totalCreated > 1
                ? `${totalCreated} ${typeLabel}s totaling ${formatAmount(totalPayment)} recorded successfully`
                : `${form.paymentDirection === 'debit' ? 'Debit' : 'Payment'} ${lastPaymentNumber || ''} of ${formatAmount(totalPayment)} recorded successfully`

            toast.success(successMessage)

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['ledger'] })
            queryClient.invalidateQueries({ queryKey: ['buyers'] })
            queryClient.invalidateQueries({ queryKey: ['buyer'] })
            queryClient.invalidateQueries({ queryKey: ['sales'] })
            queryClient.invalidateQueries({ queryKey: ['unpaid-sales'] })
            queryClient.invalidateQueries({ queryKey: ['payments'] })

            handleClose()
            onSuccess?.({ paymentNumber: lastPaymentNumber })
        } catch (error) {
            console.error('Error creating payment:', error)
            toast.error(error.response?.data?.message || error.message || 'Failed to record payment')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Always show selector if we have entities
    const showEntitySelector = entities.length > 0

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Wallet className="h-5 w-5" />
                                {form.paymentDirection === 'debit' ? 'Issue Customer Credit/Refund' : 'Receive Customer Payment'}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="overflow-y-auto max-h-[60vh] space-y-4 py-4 px-2">
                    {/* Payment Direction Toggle */}
                    <div className="space-y-2">
                        <Label>Transaction Type</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant={form.paymentDirection === 'credit' ? 'default' : 'outline'}
                                className={`flex items-center gap-2 ${form.paymentDirection === 'credit' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                onClick={() => setForm({ ...form, paymentDirection: 'credit', debitReason: '' })}
                            >
                                <ArrowDownCircle className="h-4 w-4" />
                                <span>Receive Payment</span>
                            </Button>
                            <Button
                                type="button"
                                variant={form.paymentDirection === 'debit' ? 'default' : 'outline'}
                                className={`flex items-center gap-2 ${form.paymentDirection === 'debit' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                                onClick={() => setForm({ ...form, paymentDirection: 'debit' })}
                            >
                                <ArrowUpCircle className="h-4 w-4" />
                                <span>Issue Credit/Refund</span>
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {form.paymentDirection === 'credit' 
                                ? 'Customer pays us - reduces their outstanding balance' 
                                : 'We owe customer - increases their credit (refund, price adjustment, etc.)'}
                        </p>
                    </div>

                    {/* Debit Reason - only show for debit transactions */}
                    {form.paymentDirection === 'debit' && (
                        <div className="space-y-2">
                            <Label htmlFor="debit-reason">
                                Reason for Credit/Refund <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={form.debitReason}
                                onValueChange={(value) => setForm({ ...form, debitReason: value })}
                            >
                                <SelectTrigger id="debit-reason">
                                    <SelectValue placeholder="Select reason..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {debitReasonOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Customer Selector - Text Search Input */}
                    {showEntitySelector && (
                        <div className="space-y-2">
                            <Label htmlFor="entity-search">Select Customer</Label>
                            <div className="relative">
                                <Input
                                    id="entity-search"
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search customer by name or company..."
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
                                                const name = entity.name || entity.company || ''
                                                const company = entity.company && entity.name ? ` (${entity.company})` : ''
                                                const entityDisplay = `${name}${company}`
                                                const isSelected = selectedEntityId === entityIdStr

                                                return (
                                                    <div
                                                        key={entityIdStr}
                                                        onClick={() => handleCustomerSelect(entity)}
                                                        className={`flex items-center justify-between px-3 py-2 text-sm rounded-sm cursor-pointer hover:bg-slate-100 ${isSelected ? 'bg-slate-50 font-medium' : ''
                                                            }`}
                                                    >
                                                        <span>{entityDisplay}</span>
                                                        {entity.balance > 0 && (
                                                            <span className="text-xs text-red-600 font-medium">
                                                                {formatAmount(entity.balance)}
                                                            </span>
                                                        )}
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
                                        No customers found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Customer Info */}
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="space-y-2">
                            <div>
                                <Label className="text-xs text-muted-foreground">Customer</Label>
                                <p className="font-semibold">{entityName || 'Not selected'}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Outstanding Balance</Label>
                                <p className={`text-lg font-bold ${totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatAmount(Math.abs(totalBalance))}
                                    <span className="text-sm font-normal text-muted-foreground ml-1">
                                        {totalBalance > 0 ? '(Pending)' : '(Clear)'}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>

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
                    {totalPayment > 0 && (
                        <div className={`rounded-lg border p-3 ${
                            form.paymentDirection === 'debit' 
                                ? 'bg-red-50 border-red-200' 
                                : (totalPayment > totalBalance && totalBalance > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50')
                        }`}>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                    {form.paymentDirection === 'debit' ? 'Total Credit/Refund:' : 'Total Payment:'}
                                </span>
                                <span className={`text-lg font-bold ${form.paymentDirection === 'debit' ? 'text-red-700' : 'text-green-700'}`}>
                                    {formatAmount(totalPayment)}
                                </span>
                            </div>
                            {form.paymentDirection === 'credit' && totalBalance > 0 && totalPayment <= totalBalance && (
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-muted-foreground">Remaining after payment:</span>
                                    <span className="text-sm font-medium">{formatAmount(totalBalance - totalPayment)}</span>
                                </div>
                            )}
                            {form.paymentDirection === 'credit' && totalBalance > 0 && totalPayment > totalBalance && (
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-amber-700 font-medium">Advance/Credit:</span>
                                    <span className="text-sm font-bold text-amber-700">{formatAmount(totalPayment - totalBalance)}</span>
                                </div>
                            )}
                            {form.paymentDirection === 'debit' && (
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-red-700">New balance after credit:</span>
                                    <span className="text-sm font-medium text-red-700">
                                        {formatAmount(totalBalance + totalPayment)}
                                    </span>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                                {form.paymentDirection === 'debit' 
                                    ? '⚠️ This will increase the customer\'s credit balance.'
                                    : '💡 Payment will be automatically distributed to oldest sales first (FIFO).'}
                            </p>
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
                        disabled={
                            isSubmitting ||
                            !entityId ||
                            !form.date ||
                            totalPayment <= 0 ||
                            (form.paymentDirection === 'debit' && !form.debitReason)
                        }
                        className={form.paymentDirection === 'debit' ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            form.paymentDirection === 'debit' ? 'Issue Credit/Refund' : 'Submit Payment'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
