"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
 * Modal for recording payments to suppliers in supplier currency
 * Supports both cash and bank payments in a single transaction
 */
export default function SupplierPaymentModal({
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
    const [form, setForm] = useState({
        cashAmount: '',
        bankAmount: '',
        date: '',
        notes: ''
    })

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
            if (!initialEntityId) {
                setSelectedEntityId('')
            }
        }
    }, [open, initialEntityId])

    const cashAmount = parseFloat(form.cashAmount) || 0
    const bankAmount = parseFloat(form.bankAmount) || 0
    const totalPayment = cashAmount + bankAmount

    // Get entity details based on selection
    const selectedEntity = entities.find(e => (e._id || e.id) === selectedEntityId || String(e.id) === selectedEntityId)
    const entityName = selectedEntity?.name || selectedEntity?.company || initialEntityName || ''
    const entityId = selectedEntityId || initialEntityId
    const totalBalance = selectedEntity?.balance
        ? Math.abs(selectedEntity.balance)
        : initialBalance

    const handleClose = () => {
        setForm({ cashAmount: '', bankAmount: '', date: '', notes: '' })
        if (!initialEntityId) {
            setSelectedEntityId('')
        }
        onClose()
    }

    const handleSubmit = async () => {
        if (!entityId) {
            toast.error('Please select a supplier')
            return
        }

        if (totalPayment <= 0) {
            toast.error('Please enter a payment amount')
            return
        }

        // Allow overpayments - they create supplier credit

        setIsSubmitting(true)

        try {
            const paymentPromises = []

            if (cashAmount > 0) {
                paymentPromises.push(
                    ledgerAPI.createEntry({
                        type: 'supplier',
                        entityId: entityId,
                        entityModel: 'Supplier',
                        transactionType: 'payment',
                        paymentMethod: 'cash',
                        credit: cashAmount,
                        date: form.date || new Date().toISOString(),
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
                        date: form.date || new Date().toISOString(),
                        description: form.notes || `Bank payment to ${entityName}`
                    })
                )
            }

            await Promise.all(paymentPromises)

            toast.success(`Payment of ${formatAmount(totalPayment)} recorded successfully`)

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['pending-balances'] })
            queryClient.invalidateQueries({ queryKey: ['ledger', 'supplier'] })
            queryClient.invalidateQueries({ queryKey: ['ledger'] })
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] })

            handleClose()
            onSuccess?.()
        } catch (error) {
            console.error('Error creating payment:', error)
            toast.error(error.response?.data?.message || error.message || 'Failed to record payment')
        } finally {
            setIsSubmitting(false)
        }
    }

    const showEntitySelector = !initialEntityId && entities.length > 0

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Add Supplier Payment
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Entity Selector */}
                    {showEntitySelector && (
                        <div className="space-y-2">
                            <Label htmlFor="entity-select">Select Supplier</Label>
                            <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                                <SelectTrigger id="entity-select">
                                    <SelectValue placeholder="Choose a supplier..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {entities.map((entity) => (
                                        <SelectItem key={entity._id || entity.id} value={String(entity._id || entity.id)}>
                                            {entity.name || entity.company}
                                            {entity.balance ? ` (${formatAmount(Math.abs(entity.balance))})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Entity Info */}
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="space-y-2">
                            <div>
                                <Label className="text-xs text-muted-foreground">Supplier</Label>
                                <p className="font-semibold">{entityName || 'Not selected'}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Total Outstanding</Label>
                                <p className="font-semibold text-lg text-red-600">{formatAmount(totalBalance)}</p>
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
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={form.cashAmount}
                            onChange={(e) => setForm({ ...form, cashAmount: e.target.value })}
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
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={form.bankAmount}
                            onChange={(e) => setForm({ ...form, bankAmount: e.target.value })}
                            className="text-right"
                        />
                    </div>

                    {/* Total Payment Display */}
                    {totalPayment > 0 && (
                        <div className={`rounded-lg border p-3 ${totalPayment > totalBalance && totalBalance > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50'}`}>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Total Payment:</span>
                                <span className="text-lg font-bold text-green-700">{formatAmount(totalPayment)}</span>
                            </div>
                            {totalBalance > 0 && totalPayment <= totalBalance && (
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-muted-foreground">Remaining after payment:</span>
                                    <span className="text-sm font-medium">{formatAmount(totalBalance - totalPayment)}</span>
                                </div>
                            )}
                            {totalBalance > 0 && totalPayment > totalBalance && (
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-amber-700 font-medium">Credit to Supplier:</span>
                                    <span className="text-sm font-bold text-amber-700">{formatAmount(totalPayment - totalBalance)}</span>
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
