"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, PlusCircle, UserPlus } from "lucide-react"
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
    const [searchQuery, setSearchQuery] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)
    const searchInputRef = useRef(null)
    const dropdownRef = useRef(null)
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

    const selectedEntity = entities.find(e => (e._id || e.id) === selectedEntityId || String(e.id) === selectedEntityId)
    const entityName = selectedEntity?.company && selectedEntity?.name ? `${selectedEntity.company} (${selectedEntity.name})` : (selectedEntity?.company || selectedEntity?.name || initialEntityName || '')
    const entityId = selectedEntityId || initialEntityId

    const handleClose = () => {
        setForm({ amount: '', date: '', notes: '' })
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

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PlusCircle className="h-5 w-5 text-red-600" />
                        Add Supplier Debt
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Entity Selector - Text Search Input */}
                    {showEntitySelector && (
                        <div className="space-y-2">
                            <Label htmlFor="manual-entity-search">Select a Supplier</Label>
                            <div className="relative">
                                <Input
                                    id="manual-entity-search"
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search supplier..."
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
                                                const entityDisplay = entity.company && entity.name ? `${entity.company} (${entity.name})` : (entity.company || entity.name || '')
                                                const isSelected = selectedEntityId === entityIdStr

                                                return (
                                                    <div
                                                        key={entityIdStr}
                                                        onClick={() => handleSupplierSelect(entity)}
                                                        className={`flex items-center px-3 py-2 text-sm rounded-sm cursor-pointer hover:bg-slate-100 ${isSelected ? 'bg-slate-50 font-medium' : ''
                                                            }`}
                                                    >
                                                        {entity.company && entity.name ? (
                                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                                <span className="font-bold truncate">{entity.company}</span>
                                                                <span className="text-muted-foreground truncate font-normal">({entity.name})</span>
                                                            </div>
                                                        ) : (
                                                            <span className={isSelected ? 'font-bold' : ''}>
                                                                {entity.company || entity.name || ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Entity Info */}
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Supplier</Label>
                            {selectedEntity?.company && selectedEntity?.name ? (
                                <div className="flex flex-col">
                                    <span className="font-bold text-lg text-primary">{selectedEntity.company}</span>
                                    <span className="text-sm text-muted-foreground">({selectedEntity.name})</span>
                                </div>
                            ) : (
                                <p className="font-bold text-lg">{entityName || 'Not selected'}</p>
                            )}
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="chargeAmount">Debt Amount</Label>
                        <Input
                            id="chargeAmount"
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={form.amount}
                            onChange={(e) => {
                                const value = e.target.value;
                                const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                                setForm({ ...form, amount: sanitized });
                            }}
                            className="text-lg font-medium"
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <Label htmlFor="chargeDate">Date</Label>
                        <BritishDatePicker
                            value={form.date ? new Date(form.date) : new Date()}
                            onChange={(date) => {
                                if (date) {
                                    setForm({ ...form, date: date.toLocaleDateString('en-CA') });
                                }
                            }}
                            disabled={!isSuperAdmin}
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="chargeNotes">Notes / Reason</Label>
                        <Textarea
                            id="chargeNotes"
                            placeholder="Reason for this debt (e.g., custom packing, extra logistics)..."
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            rows={3}
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
                        className="bg-red-600 hover:bg-red-700"
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
