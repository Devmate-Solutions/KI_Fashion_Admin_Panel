"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCostTypes } from "@/lib/hooks/useCostTypes"
import { useDispatchOrders } from "@/lib/hooks/useDispatchOrders"
import { Loader2, Check, Search, X } from "lucide-react"

export default function ExpenseFormNew({ expense, onSave, onCancel, isLoading }) {
  const today = new Date().toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    expenseDate: expense?.date ? new Date(expense.date).toISOString().split('T')[0] : today,
    costType: expense?.costTypeId || '',
    amount: expense?.amount || '',
    paymentMethod: expense?.paymentMethod && expense?.paymentMethod !== 'split' ? expense.paymentMethod : 'cash',
    reference: '', // Reset reference search on load
    dispatchOrderId: expense?._original?.dispatchOrder?._id || expense?.dispatchOrderId || '',
    selectedRefInfo: expense?._original?.dispatchOrder?.orderNumber ? `[${expense._original.dispatchOrder.orderNumber}]` : '',
    description: expense?.description || expense?.notes || '',
  })

  // Re-calculate selectedRefInfo if we have a dispatch order (for edit mode)
  useEffect(() => {
    if (expense?.dispatchOrderId && expense?.dispatchOrderNumber) {
      setFormData(prev => ({
        ...prev,
        selectedRefInfo: `[${expense.dispatchOrderNumber}]`
      }))
    }
  }, [expense])

  const [showResults, setShowResults] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(formData.reference)
    }, 500)
    return () => clearTimeout(timer)
  }, [formData.reference])

  const [errors, setErrors] = useState({})
  const { data: costTypesResponse = [], isLoading: costTypesLoading } = useCostTypes({ isActive: true })

  const { data: dispatchOrders = [], isLoading: dispatchLoading } = useDispatchOrders({
    search: debouncedSearch,
    limit: 10,
    status: 'confirmed,picked_up,in_transit,delivered'
  })

  const costTypes = Array.isArray(costTypesResponse)
    ? costTypesResponse
    : costTypesResponse?.data || []

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }

    if (field === 'reference') {
      setShowResults(true)
    }
  }

  const handleDispatchSelect = (order) => {
    const supplierName = order.supplier?.name || order.supplier?.company || 'N/A'
    const refText = `[${order.orderNumber}] - (${supplierName})`

    setFormData(prev => ({
      ...prev,
      dispatchOrderId: order._id,
      selectedRefInfo: refText,
      reference: order.orderNumber // Still helpful to see the number in search
    }))
    setShowResults(false)
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.expenseDate) {
      newErrors.expenseDate = 'Date is required'
    }

    if (!formData.costType) {
      newErrors.costType = 'Expense type is required'
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    // Find selected cost type name for description
    const selectedCostType = costTypes.find(ct => ct.id === formData.costType)
    const costTypeName = selectedCostType?.name || 'Expense'

    const amount = Number(formData.amount || 0)

    // Final description: Just the User Notes
    const finalDescription = formData.description.trim() || `${costTypeName} expense`

    const payload = {
      expenseDate: formData.expenseDate,
      description: finalDescription,
      costType: formData.costType,
      dispatchOrder: formData.dispatchOrderId || undefined,
      amount: amount,
      paymentMethod: formData.paymentMethod,
      notes: formData.description.trim() || undefined,
      taxAmount: 0,
    }

    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="expenseDate">
          Date <span className="text-red-500">*</span>
        </Label>
        <Input
          id="expenseDate"
          type="date"
          value={formData.expenseDate}
          onChange={(e) => handleChange('expenseDate', e.target.value)}
          className={errors.expenseDate ? 'border-red-500' : ''}
        />
        {errors.expenseDate && (
          <p className="text-sm text-red-500">{errors.expenseDate}</p>
        )}
      </div>

      {/* Expense Type and Reference Search Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="costType">
            Expense Type <span className="text-red-500">*</span>
          </Label>
          {costTypesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <Select
              value={formData.costType}
              onValueChange={(value) => handleChange('costType', value)}
            >
              <SelectTrigger id="costType" className={errors.costType ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {costTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.costType && (
            <p className="text-sm text-red-500">{errors.costType}</p>
          )}
        </div>

        <div className="space-y-2 relative">
          <Label htmlFor="reference">Search Dispatch Order</Label>
          <div className="relative">
            <Input
              id="reference"
              value={formData.reference}
              onChange={(e) => handleChange('reference', e.target.value)}
              onFocus={() => {
                if (formData.reference) setShowResults(true)
              }}
              placeholder="Type order # or supplier..."
              autoComplete="off"
            />
            {dispatchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {formData.reference && !dispatchLoading && (
              <button
                type="button"
                onClick={() => {
                  handleChange('reference', '')
                  setShowResults(false)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Custom Search Results Dropdown */}
          {showResults && (formData.reference.length > 0 || dispatchOrders.length > 0) && (
            <div className="absolute z-[100] w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg max-h-[250px] overflow-y-auto">
              {dispatchLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
              ) : dispatchOrders.length > 0 ? (
                <div className="py-1">
                  {dispatchOrders.map((order) => (
                    <button
                      key={order._id}
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex flex-col border-b last:border-0"
                      onClick={() => handleDispatchSelect(order)}
                    >
                      <span className="font-medium">{order.orderNumber}</span>
                      <span className="text-xs text-muted-foreground">
                        {order.supplier?.name || order.supplier?.company || 'N/A'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : formData.reference.length > 2 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No orders found</div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Selected Reference (Read-only) */}
      <div className="space-y-2">
        <Label htmlFor="selectedRefInfo">Selected Reference</Label>
        <div className="flex gap-2">
          <Input
            id="selectedRefInfo"
            value={formData.selectedRefInfo}
            readOnly
            placeholder="No reference selected"
            className="bg-muted"
          />
          {formData.selectedRefInfo && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setFormData(prev => ({ ...prev, dispatchOrderId: '', selectedRefInfo: '', reference: '' }))}
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Amount and Payment Method Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (£) <span className="text-red-500">*</span></Label>
          <Input
            id="amount"
            type="text"
            inputMode="decimal"
            value={formData.amount}
            onChange={(e) => {
              const value = e.target.value;
              const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
              handleChange('amount', sanitized);
            }}
            placeholder="0.00"
            className={errors.amount ? 'border-red-500' : ''}
          />
          {errors.amount && (
            <p className="text-sm text-red-500">{errors.amount}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Payment Method <span className="text-red-500">*</span></Label>
          <Select
            value={formData.paymentMethod}
            onValueChange={(value) => handleChange('paymentMethod', value)}
          >
            <SelectTrigger id="paymentMethod">
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank_transfer">Bank</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (Notes)</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Enter extra notes or details"
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading || costTypesLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : expense ? (
            'Update Expense'
          ) : (
            'Add Expense'
          )}
        </Button>
      </div>
    </form>
  )
}

