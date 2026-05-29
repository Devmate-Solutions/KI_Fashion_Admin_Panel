"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { paymentAPI } from "@/lib/api/endpoints/payments"
import { ledgerAPI } from "@/lib/api/endpoints/ledger"
import { useQueryClient } from "@tanstack/react-query"
import { ledgerKeys } from "@/lib/hooks/useLedger"
import toast from "react-hot-toast"
import BritishDatePicker from "@/components/BritishDatePicker"
import { useAuthStore } from "@/store/store"

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
    const { user } = useAuthStore()
    const isSuperAdmin = user?.role === 'super-admin'
    const queryClient = useQueryClient()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedEntityId, setSelectedEntityId] = useState(initialEntityId || '')
    const [selectorOpen, setSelectorOpen] = useState(false)
    const [form, setForm] = useState({
        cashAmount: '',
        bankAmount: '',
        debitAmount: '',
        date: '',
        notes: '',
        paymentDirection: 'credit'
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
            setForm({ cashAmount: '', bankAmount: '', debitAmount: '', date: '', notes: '', paymentDirection: 'credit' })
            if (!initialEntityId) {
                setSelectedEntityId('')
            }
        }
    }, [open, initialEntityId])

    const cashAmount = parseFloat(form.cashAmount) || 0
    const bankAmount = parseFloat(form.bankAmount) || 0
    const debitAmount = parseFloat(form.debitAmount) || 0
    const totalPayment = form.paymentDirection === 'debit' ? debitAmount : (cashAmount + bankAmount)

    // Get entity details based on selection
    const selectedEntity = entities.find(e => (e._id || e.id) === selectedEntityId || String(e.id) === selectedEntityId)
    const entityName = selectedEntity
        ? (selectedEntity.buyerId ? `${selectedEntity.company}` : selectedEntity.company)
        : (initialEntityName || '')
    const entityId = selectedEntityId || initialEntityId
    const displayEntityId = selectedEntity?.buyerId || entityId || ''

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
        setForm({ cashAmount: '', bankAmount: '', debitAmount: '', date: '', notes: '', paymentDirection: 'credit' })
        if (!initialEntityId) {
            setSelectedEntityId('')
        }
        onClose()
    }

    const handleCustomerSelect = (entity) => {
        const entityIdStr = String(entity._id || entity.id)
        setSelectedEntityId(entityIdStr)
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

        setIsSubmitting(true)

        try {
            // Use the new payment API that creates a payment receipt
            let lastPaymentNumber = null
            let totalCreated = 0
            let isPendingApproval = false

            if (form.paymentDirection === 'debit') {

                const debitResult = await ledgerAPI.createEntry({
                    type: 'buyer',
                    entityId: entityId,
                    entityModel: "Buyer",
                    date: form.date,
                    description: form.notes || `Adjustment credit from ${entityName}`,
                    transactionType: "adjustment",
                    credit: 0,
                    debit: debitAmount
                })


                // For debit transactions, create single payment with adjustment reason
                // const debitResult = await paymentAPI.createCustomerPayment({
                //     customerId: entityId,
                //     amount: debitAmount,
                //     paymentMethod: 'adjustment',
                //     date: form.date,
                //     description: form.notes || `Adjustment credit from ${entityName}`,
                //     paymentDirection: form.paymentDirection,
                //     debitReason: 'adjustment'
                // })
                if (debitResult.status === 202) isPendingApproval = true
                lastPaymentNumber = debitResult.data?.data?.payment?.paymentNumber
                totalCreated++
            } else {
                // For credit transactions, create separate records for cash and bank
                if (cashAmount > 0) {
                    const cashResult = await paymentAPI.createCustomerPayment({
                        customerId: entityId,
                        amount: cashAmount,
                        paymentMethod: 'cash',
                        date: form.date,
                        description: form.notes || `Cash payment from ${entityName}`,
                        paymentDirection: form.paymentDirection
                    })
                    if (cashResult.status === 202) isPendingApproval = true
                    lastPaymentNumber = cashResult.data?.data?.payment?.paymentNumber
                    totalCreated++
                }

                if (bankAmount > 0) {
                    const bankResult = await paymentAPI.createCustomerPayment({
                        customerId: entityId,
                        amount: bankAmount,
                        paymentMethod: 'bank',
                        date: form.date,
                        description: form.notes || `Bank payment from ${entityName}`,
                        paymentDirection: form.paymentDirection
                    })
                    if (bankResult.status === 202) isPendingApproval = true
                    lastPaymentNumber = bankResult.data?.data?.payment?.paymentNumber
                    totalCreated++
                }
            }

            if (isPendingApproval) {
                toast.success('Backdated payment request submitted for approval of super admin.')
                handleClose()
                const router = window.nextRouter || { push: (url) => window.location.href = url }
                router.push('/my-requests')
                return
            }

            const typeLabel = form.paymentDirection === 'debit' ? 'debit transaction' : 'payment'
            const successMessage = totalCreated > 1
                ? `${totalCreated} ${typeLabel}s totaling ${formatAmount(totalPayment)} recorded successfully`
                : `${form.paymentDirection === 'debit' ? 'Debit' : 'Payment'} ${lastPaymentNumber || ''} of ${formatAmount(totalPayment)} recorded successfully`

            toast.success(successMessage)

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ledgerKeys.all })
            queryClient.invalidateQueries({ queryKey: ['buyers'] })
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

    // Whether a buyer has been selected (used to gate other fields)
    const hasBuyer = !!entityId

    // Compute remaining balance based on payment direction
    const remainingBalance = form.paymentDirection === 'debit'
        ? totalBalance + totalPayment
        : totalBalance - totalPayment

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold">
                        Receiving Details for ID: {displayEntityId || 0}
                    </DialogTitle>
                </DialogHeader>

                <div className="overflow-y-auto max-h-[65vh] space-y-3 py-2 px-2">
                    {/* Transaction Type Toggle */}
                    <div className="grid grid-cols-[140px_1fr] items-start gap-x-4">
                        <Label className="pt-2">Transaction Type</Label>
                        <div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant={form.paymentDirection === 'credit' ? 'default' : 'outline'}
                                    size="sm"
                                    className={form.paymentDirection === 'credit' ? 'bg-green-600 hover:bg-green-700' : ''}
                                    onClick={() => setForm({ ...form, paymentDirection: 'credit', debitReason: '' })}
                                >
                                    Receive Payment
                                </Button>
                                <Button
                                    type="button"
                                    variant={form.paymentDirection === 'debit' ? 'default' : 'outline'}
                                    size="sm"
                                    className={form.paymentDirection === 'debit' ? 'bg-red-600 hover:bg-red-700' : ''}
                                    onClick={() => setForm({ ...form, paymentDirection: 'debit' })}
                                >
                                    Issue Credit/Refund
                                </Button>
                            </div>
                            {/* <p className="text-xs text-muted-foreground mt-1">
                                {form.paymentDirection === 'credit'
                                    ? 'Customer pays us - reduces their outstanding balance'
                                    : 'We owe customer - increases their credit (refund, price adjustment, etc.)'}
                            </p> */}
                        </div>
                    </div>

                    {/* Debit Reason - only show for debit transactions */}
                    {form.paymentDirection === 'debit' && (
                        <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
                            <Label>
                                Type <span className="text-red-500">*</span>
                            </Label>
                            <div className="px-3 py-2 bg-muted rounded text-sm font-medium">Adjustment</div>
                        </div>
                    )}

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
                            disabled={!hasBuyer}
                            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50${!hasBuyer ? ' opacity-50 cursor-not-allowed' : ''}`}
                        />
                    </div>

                    {/* Buyer */}
                    <div className="grid grid-cols-[140px_1fr] items-start gap-x-4">
                        <Label className="font-semibold pt-2">Buyer</Label>
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
                                                    <span className="text-muted-foreground">Select customer...</span>
                                                )}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search customer..." />
                                                <CommandList>
                                                    <CommandEmpty>No customer found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {entities.map((entity) => {
                                                            const entityIdStr = String(entity._id || entity.id)
                                                            const company = entity.company || ''
                                                            const buyerDisplay = entity.buyerId ? `${company}` : company
                                                            const isSelected = selectedEntityId === entityIdStr

                                                            return (
                                                                <CommandItem
                                                                    key={entityIdStr}
                                                                    value={`${company} ${entity.name || ''} ${entity.buyerId || ''} ${entityIdStr}`}
                                                                    onSelect={() => {
                                                                        handleCustomerSelect(entity)
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
                                                                        <span className="truncate">{buyerDisplay}</span>
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
                            value={hasBuyer ? formatAmount(Math.abs(totalBalance)) : ''}
                            readOnly
                            className="bg-muted"
                        />
                    </div>

                    {/* Amount Fields - different based on payment direction */}
                    {form.paymentDirection === 'debit' ? (
                        <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
                            <Label className="font-semibold">
                                Amount <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="debitAmount"
                                type="text"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                disabled={!hasBuyer}
                                value={form.debitAmount}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                                    setForm({ ...form, debitAmount: sanitized });
                                }}
                            />
                        </div>
                    ) : (
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
                                    disabled={!hasBuyer}
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
                                    disabled={!hasBuyer}
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

                    {/* Remaining Balance */}
                    <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
                        <Label className="font-semibold">Remaining Balance</Label>
                        <Input
                            value={hasBuyer ? formatAmount(remainingBalance) : ''}
                            readOnly
                            className="bg-muted"
                        />
                    </div>

                    {/* Reference */}
                    <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
                        <Label className="font-semibold">Reference</Label>
                        <Input
                            id="notes"
                            disabled={!hasBuyer}
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
                            totalPayment <= 0
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
