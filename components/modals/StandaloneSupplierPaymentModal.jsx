"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CreditCard, Banknote, Wallet } from "lucide-react"
import { ledgerAPI } from "@/lib/api/endpoints/ledger"
import { useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { useAllSuppliers } from "@/lib/hooks/useSuppliers"
import { useAllSupplierLedgers } from "@/lib/hooks/useLedger"

// Supplier amount format (no currency symbol - each supplier has own currency)
function formatAmount(n) {
    const num = Number(n || 0)
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * StandaloneSupplierPaymentModal
 * Independent modal for recording payments (credit) and charges (debit) to suppliers
 * Fetches all required data internally (suppliers, ledger entries, balances)
 * Supports both cash and bank payments for credit transactions
 * Simplified form for debit transactions (single amount + notes)
 */
export default function StandaloneSupplierPaymentModal({
    open,
    onClose,
    entityId: initialEntityId,
    entityName: initialEntityName,
    totalBalance: initialBalance = 0, // Optional fallback
    onSuccess,
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

    // Fetch suppliers internally
    const { data: allSuppliers = [], isLoading: suppliersLoading } = useAllSuppliers({ 
        limit: 100 
    })

    // Fetch all ledger entries internally
    const { data: allLedgerData, isLoading: ledgerLoading } = useAllSupplierLedgers({ 
        limit: 1000 
    })

    // Calculate supplier balance map internally
    const supplierBalanceMap = useMemo(() => {
        const balanceMap = {}

        // Step 1: Calculate per-supplier balances from raw ledger entries
        if (allLedgerData?.entries && allLedgerData.entries.length > 0) {
            // Filter to only include purchase, payment, and return entries
            const relevantEntries = allLedgerData.entries.filter(entry =>
                entry.transactionType === 'purchase' ||
                entry.transactionType === 'payment' ||
                entry.transactionType === 'return'
            )

            // Group entries by supplier and calculate individual running balances
            const supplierEntriesMap = {}

            for (const entry of relevantEntries) {
                const supplier = entry.entityId || {}
                const supplierId = supplier._id?.toString() || supplier.id?.toString() || entry.entityId?.toString()

                if (!supplierId) continue

                if (!supplierEntriesMap[supplierId]) {
                    supplierEntriesMap[supplierId] = []
                }
                supplierEntriesMap[supplierId].push(entry)
            }

            // Calculate running balance for each supplier
            for (const [supplierId, entries] of Object.entries(supplierEntriesMap)) {
                // Sort by createdAt ascending (oldest first)
                entries.sort((a, b) => {
                    const createdAtA = new Date(a.createdAt || a.date || 0).getTime()
                    const createdAtB = new Date(b.createdAt || b.date || 0).getTime()
                    return createdAtA - createdAtB
                })

                // Calculate running balance (debit increases, credit decreases)
                let runningBalance = 0
                for (const entry of entries) {
                    runningBalance = runningBalance + (Number(entry.debit) || 0) - (Number(entry.credit) || 0)
                }

                balanceMap[supplierId] = runningBalance
            }
        }

        // Step 2: Fill in missing suppliers from allSuppliers
        // This ensures ALL suppliers have a balance, even if they have no ledger entries
        if (allSuppliers && allSuppliers.length > 0) {
            for (const supplier of allSuppliers) {
                const supplierId = String(supplier._id || supplier.id)
                // Only add if not already in map (ledger data takes priority)
                if (balanceMap[supplierId] === undefined) {
                    // Use the balance from the supplier object (from API)
                    balanceMap[supplierId] = supplier.balance || 0
                }
            }
        }

        return balanceMap
    }, [allLedgerData, allSuppliers])

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
        ? allSuppliers.filter((entity) => {
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

    // Get entity details based on selection (using fetched allSuppliers)
    const selectedEntity = allSuppliers.find(e => (e._id || e.id) === selectedEntityId || String(e.id) === selectedEntityId)
    const entityName = selectedEntity?.name || selectedEntity?.company || initialEntityName || ''
    const entityId = selectedEntityId || initialEntityId

    // Calculate totalBalance with priority:
    // 1. supplierBalanceMap (from calculated balances)
    // 2. selectedEntity.balance (from allSuppliers array)
    // 3. initialBalance (fallback)
    const totalBalance = useMemo(() => {
        if (!selectedEntityId) {
            return Math.abs(initialBalance || 0)
        }

        // Priority 1: Use balance from supplierBalanceMap
        const balanceFromMap = supplierBalanceMap[String(selectedEntityId)]
        if (balanceFromMap !== undefined && balanceFromMap !== null) {
            return Math.abs(balanceFromMap)
        }

        // Priority 2: Use selectedEntity.balance from allSuppliers
        if (selectedEntity?.balance !== undefined && selectedEntity?.balance !== null) {
            return Math.abs(selectedEntity.balance)
        }

        // Priority 3: initialBalance fallback
        return Math.abs(initialBalance || 0)
    }, [selectedEntityId, supplierBalanceMap, selectedEntity, initialBalance])

    const isLoading = suppliersLoading || ledgerLoading

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
            if (transactionType === 'credit') {
                // Credit transactions (payments)
                // Process sequentially to avoid race conditions with pending orders
                // Cash payment is processed first, then bank payment sees updated balances
                if (cashAmount > 0) {
                    await ledgerAPI.distributeSupplierPayment(entityId, {
                        amount: cashAmount,
                        paymentMethod: 'cash',
                        date: form.date,
                        description: form.notes || `Cash payment to ${entityName}`
                    })
                }

                if (bankAmount > 0) {
                    await ledgerAPI.distributeSupplierPayment(entityId, {
                        amount: bankAmount,
                        paymentMethod: 'bank',
                        date: form.date,
                        description: form.notes || `Bank payment to ${entityName}`
                    })
                }

                toast.success(`Payment of ${formatAmount(totalCreditPayment)} recorded successfully`)
            } else {
                // Debit transactions (charges/adjustments)
                await ledgerAPI.createEntry({
                    type: 'supplier',
                    entityId: entityId,
                    entityModel: 'Supplier',
                    transactionType: 'adjustment',
                    debit: debitAmount,
                    date: form.date,
                    description: form.notes || `Debit adjustment for ${entityName}`
                })

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

    // Always show selector if we have suppliers, unless entityId is pre-set
    const showEntitySelector = allSuppliers.length > 0


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
                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                            <span className="text-sm text-muted-foreground">Loading suppliers and ledger data...</span>
                        </div>
                    )}

                    {/* Entity Selector - Text Search Input */}
                    {!isLoading && showEntitySelector && (
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
                                    disabled={isSubmitting}
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
                    {!isLoading && (
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
                    )}

                    {/* Credit Form Fields */}
                    {!isLoading && transactionType === 'credit' && (
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
                                    disabled={isSubmitting}
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
                                    disabled={isSubmitting}
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

                    {/* Date (mandatory) */}
                    {!isLoading && (
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
                                disabled={isSubmitting}
                            />
                        </div>
                    )}

                    {/* Notes */}
                    {!isLoading && (
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder={transactionType === 'credit' ? "Add any notes about this payment..." : "Add any notes about this charge..."}
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                rows={2}
                                disabled={isSubmitting}
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting || isLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={
                            isLoading ||
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

