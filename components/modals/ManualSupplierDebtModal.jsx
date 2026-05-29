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
import { useCreateSupplierDebitAdjustment } from "@/lib/hooks/useLedger"
import toast from "react-hot-toast"
import BritishDatePicker from "@/components/BritishDatePicker"
import { useAuthStore } from "@/store/store"

export default function ManualSupplierDebtModal({
    open,
    onClose,
    entityId: initialEntityId,
    entityName: initialEntityName,
    entities = [],
    onSuccess
}) {
    const { user } = useAuthStore()
    const isSuperAdmin = user?.role === 'super-admin'
    const mutation = useCreateSupplierDebitAdjustment()
    const [selectedEntityId, setSelectedEntityId] = useState(initialEntityId || '')
    const [searchOpen, setSearchOpen] = useState(false)
    const [form, setForm] = useState({
        amount: '',
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
            setForm({ amount: '', date: '', notes: '' })
            setSearchOpen(false)
            if (!initialEntityId) {
                setSelectedEntityId('')
            }
        }
    }, [open, initialEntityId])

    const selectedEntity = entities.find(e => (e._id || e.id) === selectedEntityId || String(e.id) === selectedEntityId)
    const baseSupplierName = selectedEntity 
        ? (selectedEntity.company && selectedEntity.name 
            ? `${selectedEntity.company}` 
            : (selectedEntity.company || selectedEntity.name || ''))
        : (initialEntityName || '')
    
    const entityName = selectedEntity?.supplierId ? `${baseSupplierName}` : baseSupplierName
    const entityId = selectedEntityId || initialEntityId
    const displayEntityId = selectedEntity?.supplierId || entityId || ''

    const handleClose = () => {
        setForm({ amount: '', date: '', notes: '' })
        setSearchOpen(false)
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

        const amountNum = parseFloat(form.amount)
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error('Please enter a valid debt amount')
            return
        }

        try {
            await mutation.mutateAsync({
                supplierId: entityId,
                adjustmentData: {
                    amount: amountNum,
                    date: form.date,
                    description: form.notes || `Manual debt for ${entityName}`
                }
            })

            toast.success(`Manual debt of ${amountNum.toFixed(2)} recorded successfully`)
            handleClose()
            onSuccess?.()
        } catch (error) {
            console.error('Error creating manual debt:', error)
            toast.error(error.response?.data?.message || 'Failed to record manual debt')
        }
    }

    const showEntitySelector = entities.length > 0 && (!initialEntityId || initialEntityId === 'all')
    const hasSupplier = !!entityId

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold">
                        Supplier Debt Details for ID: {displayEntityId || 0}
                    </DialogTitle>
                </DialogHeader>

                <div className="overflow-y-auto max-h-[65vh] space-y-3 py-2 px-2">
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

                    {/* Supplier Selector */}
                    <div className="grid grid-cols-[140px_1fr] items-start gap-x-4">
                        <Label className="font-semibold pt-2">Supplier</Label>
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
                                                            const isSelected = selectedEntityId === entityIdStr

                                                            return (
                                                                <CommandItem
                                                                    key={entityIdStr}
                                                                    value={`${entity.company || ''} ${entity.name || ''} ${entityIdStr}`}
                                                                    onSelect={() => {
                                                                        handleSupplierSelect(entity)
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
                                                                        <span className="truncate">{baseSupplierName}</span>
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
                    {selectedEntity && selectedEntity.balance !== undefined && (
                        <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
                            <Label className="font-semibold text-red-600">Total Balance</Label>
                            <Input
                                value={hasSupplier ? Number(selectedEntity.balance).toFixed(2) : ''}
                                readOnly
                                className="bg-muted"
                            />
                        </div>
                    )}

                    {/* Debt Amount */}
                    <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
                        <Label className="font-semibold">
                            Debt Amount <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="chargeAmount"
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            disabled={!hasSupplier}
                            value={form.amount}
                            onChange={(e) => {
                                const value = e.target.value;
                                const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                                setForm({ ...form, amount: sanitized });
                            }}
                        />
                    </div>

                    {/* Notes / Reason */}
                    <div className="grid grid-cols-[140px_1fr] items-center gap-x-4">
                        <Label className="font-semibold">Notes / Reason</Label>
                        <Input
                            id="chargeNotes"
                            placeholder="Reason for this debt (e.g., custom packing, extra logistics)..."
                            disabled={!hasSupplier}
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={mutation.isPending || !entityId || !form.amount || !form.date}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {mutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            'Add Debt'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
