"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Loader2, User, Building2, Info, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"
import { ledgerAPI } from "@/lib/api/endpoints/ledger"
import { useQueryClient } from "@tanstack/react-query"
import { useAllSuppliers } from "@/lib/hooks/useSuppliers"
import { useBuyers } from "@/lib/hooks/useBuyers"
import toast from "react-hot-toast"
import BritishDatePicker from "@/components/BritishDatePicker"

export default function UniversalPaymentDialog({ open, onClose }) {
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [entityType, setEntityType] = useState("supplier") // 'supplier' or 'buyer'
  const [paymentType, setPaymentType] = useState("debit") // 'credit' or 'debit'
  const [selectedEntityId, setSelectedEntityId] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [formData, setFormData] = useState({
    amount: "",
    date: new Date(),
    note: "",
    paymentMethod: "cash"
  })

  const {
    data: supplierEntities = [],
    isFetching: isFetchingSuppliers,
    refetch: refetchSuppliers,
  } = useAllSuppliers({ limit: 500 })

  const {
    data: buyerEntities = [],
    isFetching: isFetchingBuyers,
    refetch: refetchBuyers,
  } = useBuyers({ limit: 500 })

  const entities = useMemo(() => {
    const source = entityType === "supplier" ? supplierEntities : buyerEntities
    return source.map((entity) => ({
      ...entity,
      id: entity.id,
      name: entity.name || entity.company || "Unknown",
      company: entity.company || "",
      // Prefer canonical ledger-computed balance.
      balance: Number(entity.balance ?? entity.currentBalance ?? 0),
    }))
  }, [entityType, supplierEntities, buyerEntities])

  const filteredEntities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return entities

    return entities.filter((entity) => {
      const searchable = `${entity.name} ${entity.company}`.toLowerCase()
      return searchable.includes(query)
    })
  }, [entities, searchQuery])

  const selectedEntity = useMemo(
    () => entities.find((entity) => entity.id === selectedEntityId) || null,
    [entities, selectedEntityId]
  )

  const amountValue = useMemo(() => {
    return Number.parseFloat(formData.amount) || 0
  }, [formData.amount])

  const isPrimaryTransaction = useMemo(() => {
    return entityType === "supplier" ? paymentType === "debit" : paymentType === "credit"
  }, [entityType, paymentType])

  const previewBalance = useMemo(() => {
    if (!selectedEntity) return 0

    const baseBalance = Number(selectedEntity.balance) || 0
    return isPrimaryTransaction
      ? baseBalance - amountValue
      : baseBalance + amountValue
  }, [selectedEntity, isPrimaryTransaction, amountValue])

  const isLoadingEntities = entityType === "supplier" ? isFetchingSuppliers : isFetchingBuyers

  const formatAmount = (value) => {
    const displayAmount = Math.abs(Number(value) || 0)
    if (entityType === "supplier") {
      return displayAmount.toLocaleString("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    }

    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(displayAmount)
  }

  useEffect(() => {
    if (open) {
      if (entityType === "supplier") {
        refetchSuppliers()
      } else {
        refetchBuyers()
      }
    } else {
      // Reset form on close
      setSelectedEntityId(null)
      setSearchQuery("")
      setFormData({
        amount: "",
        date: new Date(),
        note: "",
        paymentMethod: "cash"
      })
    }
  }, [open, entityType, refetchSuppliers, refetchBuyers])

  const handleEntityChange = (type) => {
    setEntityType(type)
    setPaymentType(type === "supplier" ? "debit" : "credit")
    setSelectedEntityId(null)
    setSearchQuery("")
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()

    if (!selectedEntity) {
      toast.error("Please select a user")
      return
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    setIsSubmitting(true)
    try {
      const amount = parseFloat(formData.amount)
      const payload = {
        type: entityType,
        entityId: selectedEntity.id,
        entityModel: entityType === "supplier" ? "Supplier" : "Buyer",
        date: formData.date,
        description: formData.note || (isPrimaryTransaction ? `${entityType === 'supplier' ? 'Payment' : 'Receipt'}` : "Adjustment"),
        paymentMethod: formData.paymentMethod
      }

      if (isPrimaryTransaction) {
        // Payment/Receipt (Distribution)
        payload.transactionType = entityType === "supplier" ? "payment" : "receipt"
        payload.credit = amount
        payload.debit = 0
        payload.referenceId = "none" // Trigger universal distribution
      } else {
        // Adjustment
        payload.transactionType = "adjustment"
        payload.debit = amount
        payload.credit = 0
      }

      await ledgerAPI.createEntry(payload)

      toast.success("Entry recorded successfully")

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["ledger"] })
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      queryClient.invalidateQueries({ queryKey: ["buyers"] })

      onClose()
    } catch (error) {
      console.error("Submission error:", error)
      toast.error(error.response?.data?.message || "Failed to record entry")
    } finally {
      setIsSubmitting(false)
    }
  }

  const currency = (val) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(val)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">


        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Entity Type Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Target Entity</Label>
              <RadioGroup
                value={entityType}
                onValueChange={handleEntityChange}
                className="grid grid-cols-2 gap-2"
              >
                <div>
                  <RadioGroupItem value="supplier" id="type-supplier" className="peer sr-only" />
                  <Label
                    htmlFor="type-supplier"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 [&:has([data-state=checked])]:border-blue-600 cursor-pointer transition-all"
                  >
                    <Building2 className="mb-1 h-5 w-5" />
                    <span className="text-[10px] font-bold">SUPPLIER</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="buyer" id="type-buyer" className="peer sr-only" />
                  <Label
                    htmlFor="type-buyer"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 [&:has([data-state=checked])]:border-blue-600 cursor-pointer transition-all"
                  >
                    <User className="mb-1 h-5 w-5" />
                    <span className="text-[10px] font-bold">BUYER</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Payment Type Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Transaction Nature</Label>
              <RadioGroup
                value={paymentType}
                onValueChange={setPaymentType}
                className="grid grid-cols-2 gap-2"
              >
                <div>
                  <RadioGroupItem value="debit" id="pay-debit" className="peer sr-only" />
                  <Label
                    htmlFor="pay-debit"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-slate-50 peer-data-[state=checked]:border-green-600 [&:has([data-state=checked])]:border-green-600 cursor-pointer transition-all"
                  >
                    <Info className="mb-1 h-5 w-5" />
                    <span className="text-[10px] font-bold uppercase">DEBIT</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="credit" id="pay-credit" className="peer sr-only" />
                  <Label
                    htmlFor="pay-credit"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-slate-50 peer-data-[state=checked]:border-amber-600 [&:has([data-state=checked])]:border-amber-600 cursor-pointer transition-all"
                  >
                    <CreditCard className="mb-1 h-5 w-5" />
                    <span className="text-[10px] font-bold uppercase">CREDIT</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Entity Search & Balance Info */}
          <div className="space-y-4 rounded-xl border-2 border-slate-100 bg-slate-50/50 p-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Search {entityType === 'supplier' ? 'Supplier' : 'Buyer'}</Label>
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between bg-white h-12 border-slate-200 hover:border-slate-300 shadow-sm",
                      !selectedEntity && "text-muted-foreground"
                    )}
                  >
                    {selectedEntity ? (
                      <div className="flex flex-col items-start overflow-hidden">
                        <span className="font-bold truncate w-full">{selectedEntity.name}</span>
                        {selectedEntity.company && <span className="text-[10px] text-slate-500 uppercase">{selectedEntity.company}</span>}
                      </div>
                    ) : (
                      `Select ${entityType === 'supplier' ? 'supplier' : 'buyer'}...`
                    )}
                    {isLoadingEntities ? <Loader2 className="h-4 w-4 animate-spin shrink-0 opacity-50" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[450px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={`Search ${entityType === 'supplier' ? 'supplier' : 'buyer'}...`}
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>{isLoadingEntities ? "Searching..." : "No results found."}</CommandEmpty>
                      <CommandGroup>
                        {filteredEntities.map((entity) => (
                          <CommandItem
                            key={entity.id}
                            value={entity.id}
                            onSelect={() => {
                              setSelectedEntityId(entity.id)
                              setSearchOpen(false)
                            }}
                            className="flex items-center justify-between p-3 cursor-pointer"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold">{entity.name}</span>
                              <span className="text-xs text-slate-500">{entity.company}</span>
                            </div>
                            <div className="text-right">
                              <span className={cn(
                                "text-sm font-mono font-bold",
                                entity.balance > 0 ? (entityType === 'supplier' ? "text-red-600" : "text-amber-600") : "text-slate-400"
                              )}>
                                {formatAmount(entity.balance)}
                              </span>
                              <div className="text-[10px] text-slate-400 uppercase">Current</div>
                            </div>
                            <Check
                              className={cn(
                                "ml-2 h-4 w-4 text-blue-600",
                                selectedEntity?.id === entity.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedEntity && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-tighter">
                    {formData.amount ? "Live Balance" : "Current Balance"}
                  </span>
                  <span className={cn(
                    "text-xl font-black",
                    previewBalance > 0 ? "text-red-500" : "text-green-400"
                  )}>
                    {formatAmount(previewBalance)}
                  </span>
                </div>

              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-xs font-bold text-slate-500 uppercase">Effective Date</Label>
              <BritishDatePicker
                selected={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                className="w-full h-11 border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-xs font-bold text-slate-500 uppercase">Amount Set</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  className="pl-7 h-11 border-2 border-slate-200 focus:border-blue-500 focus:ring-0 text-lg font-bold"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => {
                    const value = e.target.value
                    const sanitized = value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
                    setFormData({ ...formData, amount: sanitized })
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="note" className="text-xs font-bold text-slate-500 uppercase">Official Note / Remark</Label>
              <Label className="text-xs font-bold text-slate-500 uppercase">Payment Mode</Label>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Textarea
                  id="note"
                  placeholder="Record justification for this entry..."
                  className="min-h-[80px] bg-slate-50 border-slate-200 resize-none"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>
              {isPrimaryTransaction && (
                <div className="w-1/3 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant={formData.paymentMethod === "cash" ? "default" : "outline"}
                    className={cn(
                      "h-9 text-xs font-bold uppercase border-slate-200",
                      formData.paymentMethod === "cash" ? "bg-slate-900" : "text-slate-500"
                    )}
                    onClick={() => setFormData({ ...formData, paymentMethod: "cash" })}
                  >
                    Cash Payment
                  </Button>
                  <Button
                    type="button"
                    variant={formData.paymentMethod === "bank" ? "default" : "outline"}
                    className={cn(
                      "h-9 text-xs font-bold uppercase border-slate-200",
                      formData.paymentMethod === "bank" ? "bg-slate-900" : "text-slate-500"
                    )}
                    onClick={() => setFormData({ ...formData, paymentMethod: "bank" })}
                  >
                    Bank Transfer
                  </Button>
                </div>
              )}
            </div>
          </div>
        </form>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500 hover:text-slate-700">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedEntity || !formData.amount}
            className={cn(
              "px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all h-auto",
              isPrimaryTransaction ? "bg-green-600 hover:bg-green-700 shadow-green-200" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              </>
            ) : (
              `Confirm`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
