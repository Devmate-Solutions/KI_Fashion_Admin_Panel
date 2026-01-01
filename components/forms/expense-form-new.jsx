"use client"

import { useState } from "react"
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
import { Loader2 } from "lucide-react"

export default function ExpenseFormNew({ expense, onSave, onCancel, isLoading }) {
  const today = new Date().toISOString().split('T')[0]
  
  const [formData, setFormData] = useState({
    expenseDate: expense?.date ? new Date(expense.date).toISOString().split('T')[0] : today,
    costType: expense?.costTypeId || '',
    amount: expense?.amount || '',
    reference: expense?.reference || expense?.notes || '',
  })

  const [errors, setErrors] = useState({})
  const { data: costTypesResponse = [], isLoading: costTypesLoading } = useCostTypes({ isActive: true })
  
  // Extract cost types array from response
  const costTypes = Array.isArray(costTypesResponse) 
    ? costTypesResponse 
    : costTypesResponse?.data || []

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
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
    const selectedCostType = costTypes.find(ct => ct._id === formData.costType)
    const costTypeName = selectedCostType?.name || 'Expense'

    const payload = {
      expenseDate: formData.expenseDate,
      description: formData.reference.trim() || `${costTypeName} expense`,
      costType: formData.costType,
      amount: Number(formData.amount),
      notes: formData.reference.trim() || undefined,
      // Set defaults for required backend fields
      paymentMethod: 'cash',
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

      {/* Expense Type */}
      <div className="space-y-2">
        <Label htmlFor="costType">
          Expense Type <span className="text-red-500">*</span>
        </Label>
        {costTypesLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading expense types...
          </div>
        ) : costTypes.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No expense types available. Please create cost types first.
          </div>
        ) : (
          <Select
            value={formData.costType}
            onValueChange={(value) => handleChange('costType', value)}
          >
            <SelectTrigger id="costType" className={errors.costType ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select expense type" />
            </SelectTrigger>
            <SelectContent>
              {costTypes.map((type) => (
                <SelectItem key={type._id} value={type._id}>
                  {type.id} - {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {errors.costType && (
          <p className="text-sm text-red-500">{errors.costType}</p>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">
          Amount (£) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="amount"
          type="text"
          inputMode="decimal"
          value={formData.amount}
          onChange={(e) => {
            const value = e.target.value;
            // Allow only numbers and one decimal point
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

      {/* Reference */}
      <div className="space-y-2">
        <Label htmlFor="reference">Reference</Label>
        <Input
          id="reference"
          value={formData.reference}
          onChange={(e) => handleChange('reference', e.target.value)}
          placeholder="Reference or notes (optional)"
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

