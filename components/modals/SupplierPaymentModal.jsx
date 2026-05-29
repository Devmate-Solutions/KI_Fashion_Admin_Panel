"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ledgerAPI } from "@/lib/api/endpoints/ledger"
import { useQueryClient } from "@tanstack/react-query"
import { ledgerKeys } from "@/lib/hooks/useLedger"
import toast from "react-hot-toast"
import BritishDatePicker from "@/components/BritishDatePicker"
import { useAuthStore } from "@/store/store"

// Supplier amount format (no currency symbol - each supplier has own currency)
function formatAmount(n) {
    const num = Number(n || 0)

    // return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return num.toFixed(2)
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
    onSuccess,
    allLedgerData
}) {
    const { user } = useAuthStore()
    const isSuperAdmin = user?.role === 'super-admin'
    const queryClient = useQueryClient()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedEntityId, setSelectedEntityId] = useState(initialEntityId || '')
    const [selectorOpen, setSelectorOpen] = useState(false)
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
            if (!initialEntityId) {
                setSelectedEntityId('')
            }
        }
    }, [open, initialEntityId])

    const cashAmount = parseFloat(form.cashAmount) || 0
    const bankAmount = parseFloat(form.bankAmount) || 0
    const debitAmount = parseFloat(form.debitAmount) || 0
    const totalCreditPayment = cashAmount + bankAmount

    // Get entity details based on selection (already using entities from parent)
    const selectedEntity = entities.find(e => (e._id || e.id) === selectedEntityId || String(e.id) === selectedEntityId)
    const baseEntityName = selectedEntity 
        ? (selectedEntity.company && selectedEntity.name 
            ? `${selectedEntity.company} ` 
            : (selectedEntity.company || selectedEntity.name || ''))
        : (initialEntityName || '')
    const entityName = selectedEntity?.supplierId ? `${baseEntityName}` : baseEntityName
    const entityId = selectedEntityId || initialEntityId
    const displayEntityId = selectedEntity?.supplierId || entityId || ''

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
        ? balanceFromMap
        : (shouldUseParentBalance
            ? parentLedgerBalance
            : (selectedEntity?.balance !== undefined && selectedEntity?.balance !== null
                ? selectedEntity.balance
                : initialBalance))
    const handleClose = () => {
        setForm({ cashAmount: '', bankAmount: '', debitAmount: '', date: '', notes: '' })
        setTransactionType('credit')
        if (!initialEntityId) {
            setSelectedEntityId('')
        }
        onClose()
    }

    const handleSupplierSelect = (entity) => {
        const entityIdStr = String(entity._id || entity.id)
        setSelectedEntityId(entityIdStr)
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
                let isPendingApproval = false
                const createdReceiptNumbers = []

                // Credit transactions (payments)
                // Process sequentially to avoid race conditions with pending orders
                // Cash payment is processed first, then bank payment sees updated balances
                if (cashAmount > 0) {
                    const response = await ledgerAPI.distributeSupplierPayment(entityId, {
                        amount: cashAmount,
                        paymentMethod: 'cash',
                        date: form.date,
                        description: form.notes || `Cash payment to ${entityName}`
                    })
                    if (response.status === 202) isPendingApproval = true
                    const receiptNumber = response?.data?.data?.receipt?.receiptNumber
                    if (receiptNumber) {
                        createdReceiptNumbers.push(receiptNumber)
                    }
                }

                if (bankAmount > 0) {
                    const response = await ledgerAPI.distributeSupplierPayment(entityId, {
                        amount: bankAmount,
                        paymentMethod: 'bank',
                        date: form.date,
                        description: form.notes || `Bank payment to ${entityName}`
                    })
                    if (response.status === 202) isPendingApproval = true
                    const receiptNumber = response?.data?.data?.receipt?.receiptNumber
                    if (receiptNumber) {
                        createdReceiptNumbers.push(receiptNumber)
                    }
                }

                if (isPendingApproval) {
                    toast.success('Backdated payment request submitted for approval of super admin.')
                    handleClose()
                    const router = window.nextRouter || { push: (url) => window.location.href = url }
                    router.push('/my-requests')
                    return
                }

                toast.success(
                    createdReceiptNumbers.length > 0
                        ? `Payment of ${formatAmount(totalCreditPayment)} recorded. Receipt${createdReceiptNumbers.length > 1 ? 's' : ''}: ${createdReceiptNumbers.join(', ')}`
                        : `Payment of ${formatAmount(totalCreditPayment)} recorded successfully`
                )

                queryClient.invalidateQueries({ queryKey: ['pending-balances'] })
                queryClient.invalidateQueries({ queryKey: ledgerKeys.all })
                queryClient.invalidateQueries({ queryKey: ['suppliers'] })
                queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] })
                queryClient.invalidateQueries({ queryKey: ['supplier-payment-receipts'] })

                handleClose()
                onSuccess?.({ receiptNumbers: createdReceiptNumbers })
            } else {
                // Debit transactions (charges/adjustments)
                const response = await ledgerAPI.createEntry({
                    type: 'supplier',
                    entityId: entityId,
                    entityModel: 'Supplier',
                    transactionType: 'adjustment',
                    debit: debitAmount,
                    date: form.date,
                    description: form.notes || `Debit adjustment for ${entityName}`
                })

                if (response.status === 202) {
                    toast.success('Backdated adjustment request submitted for approval of super admin.')
                    handleClose()
                    const router = window.nextRouter || { push: (url) => window.location.href = url }
                    router.push('/my-requests')
                    return
                }

                toast.success(`Charge of ${formatAmount(debitAmount)} recorded successfully`)

                // Invalidate queries to refresh data
                queryClient.invalidateQueries({ queryKey: ['pending-balances'] })
                queryClient.invalidateQueries({ queryKey: ledgerKeys.all })
                queryClient.invalidateQueries({ queryKey: ['suppliers'] })
                queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] })
                queryClient.invalidateQueries({ queryKey: ['supplier-payment-receipts'] })

                handleClose()
                onSuccess?.()
            }
        } catch (error) {
            console.error('Error creating transaction:', error)
            toast.error(error.response?.data?.message || error.message || 'Failed to record transaction')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Always show selector if we have entities, unless entityId is pre-set
    const showEntitySelector = entities.length > 0

    // Whether a supplier has been selected (used to gate other fields)
    const hasSupplier = !!entityId

    // Compute remaining balance based on transaction type
    const totalPayment = transactionType === 'debit' ? debitAmount : totalCreditPayment
    const remainingBalance = transactionType === 'debit'
        ? totalBalance + totalPayment
        : totalBalance - totalPayment

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold">
                        Payment Details for ID: {displayEntityId || 0}
                    </DialogTitle>
                </DialogHeader>

                <div className="overflow-y-auto max-h-[65vh] space-y-3 py-2 px-2">
                    {/* Transaction Type Toggle */}
                    {/* <div className="grid grid-cols-[140px_1fr] items-start gap-x-4">
                        <Label className="pt-2">Transaction Type</Label>
                        <div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant={transactionType === 'credit' ? 'default' : 'outline'}
                                    size="sm"
                                    className={transactionType === 'credit' ? 'bg-green-600 hover:bg-green-700' : ''}
                                    onClick={() => {
                                        setTransactionType('credit')
                                        setForm({ ...form, debitAmount: '' })
                                    }}
                                >
                                    Credit (Payment)
                                </Button>
                                <Button
                                    type="button"
                                    variant={transactionType === 'debit' ? 'default' : 'outline'}
                                    size="sm"
                                    className={transactionType === 'debit' ? 'bg-red-600 hover:bg-red-700' : ''}
                                    onClick={() => {
                                        setTransactionType('debit')
                                        setForm({ ...form, cashAmount: '', bankAmount: '' })
                                    }}
                                >
                                    Debit (Charge)
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {transactionType === 'credit'
                                    ? 'We pay the supplier - reduces our outstanding balance'
                                    : 'Supplier charges us - increases our outstanding balance'}
                            </p>
                        </div>
                    </div> */}

                    {/* Id */}
                    <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
                        <Label className="font-semibold">Id</Label>
                        <Input value={displayEntityId || ''} readOnly className="bg-muted" />
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
                            disabled={!hasSupplier}
                            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50${!hasSupplier ? ' opacity-50 cursor-not-allowed' : ''}`}
                        />
                    </div>

                    {/* Supplier */}
                    <div className="grid grid-cols-[140px_1fr] items-start gap-x-4">
                        <Label className="font-semibold pt-2">Supplier</Label>
                        <div>
                            {showEntitySelector ? (
                                <div className="relative">
                                    <Popover open={selectorOpen} onOpenChange={setSelectorOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={selectorOpen}
                                                className="w-full justify-between font-normal text-left"
                                            >
                                                {entityName ? (
                                                    <span className="truncate">{entityName}</span>
                                                ) : (
                                                    <span className="text-muted-foreground">Select supplier...</span>
                                                )}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search supplier..." />
                                                <CommandList>
                                                    <CommandEmpty>No supplier found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {entities.map((entity) => {
                                                            const entityIdStr = String(entity._id || entity.id)
                                                            const baseSupplierName = entity.company && entity.name 
                                                                ? `${entity.company}` 
                                                                : (entity.company || entity.name || '')
                                                            const supplierName = entity.supplierId ? `${baseSupplierName}` : baseSupplierName
                                                            const isSelected = selectedEntityId === entityIdStr

                                                            return (
                                                                <CommandItem
                                                                    key={entityIdStr}
                                                                    value={`${entity.company || ''} ${entity.name || ''} ${entity.supplierId || ''} ${entityIdStr}`}
                                                                    onSelect={() => {
                                                                        handleSupplierSelect(entity)
                                                                        setSelectorOpen(false)
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
                                                                        <span className="truncate">{supplierName}</span>
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
                    <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
                        <Label className="font-semibold text-red-600">Total Balance</Label>
                        <Input
                            value={hasSupplier ? formatAmount(totalBalance) : ''}
                            readOnly
                            className="bg-muted"
                        />
                    </div>

                    {/* Credit Form Fields */}
                    {transactionType === 'credit' && (
                        <>
                            {/* Cash */}
                            <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
                                <Label className="font-semibold">Cash</Label>
                                <Input
                                    id="cashAmount"
                                    type="text"
                                    inputMode="decimal"
                                    min="0"
                                    step="0.01"
                                    disabled={!hasSupplier}
                                    value={form.cashAmount}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                                        setForm({ ...form, cashAmount: sanitized });
                                    }}
                                />
                            </div>

                            {/* Bank Cash */}
                            <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
                                <Label className="font-semibold">Bank Cash</Label>
                                <Input
                                    id="bankAmount"
                                    type="text"
                                    inputMode="decimal"
                                    min="0"
                                    step="0.01"
                                    disabled={!hasSupplier}
                                    value={form.bankAmount}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                                        setForm({ ...form, bankAmount: sanitized });
                                    }}
                                />
                            </div>
                        </>
                    )}

                    {/* Debit Form Fields - Simplified */}
                    {/* {transactionType === 'debit' && (
                        <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
                            <Label className="font-semibold">
                                Charge Amount <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="debitAmount"
                                type="text"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                disabled={!hasSupplier}
                                value={form.debitAmount}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                                    setForm({ ...form, debitAmount: sanitized });
                                }}
                            />
                        </div>
                    )} */}

                    {/* Remaining Balance */}
                    <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
                        <Label className="font-semibold">Remaining Balance</Label>
                        <Input
                            value={hasSupplier ? formatAmount(remainingBalance) : ''}
                            readOnly
                            className="bg-muted"
                        />
                    </div>

                    {/* Reference */}
                    <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
                        <Label className="font-semibold">Reference</Label>
                        <Input
                            id="notes"
                            disabled={!hasSupplier}
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
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            'Submit'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
