"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

/**
 * Logistics Company Form Component
 * Simple form with: name (required), phone (optional), email (optional), notes (optional)
 */
export function LogisticsCompanyForm({ open, onClose, onSubmit, loading = false, initialData = null, isEdit = false }) {
  const phoneInputRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    phoneAreaCode: '',
    email: '',
    notes: '',
    boxRate: '',
  })

  const [errors, setErrors] = useState({})

  // Reset form when dialog opens or populate with initial data for edit mode
  useEffect(() => {
    if (open) {
      if (isEdit && initialData) {
        setFormData({
          name: initialData.name || '',
          phone: initialData.contactInfo?.phone || '',
          phoneAreaCode: initialData.contactInfo?.phoneAreaCode || '',
          email: initialData.contactInfo?.email || '',
          notes: initialData.notes || '',
          boxRate: initialData.rates?.boxRate?.toString() || '',
        })
      } else {
        setFormData({
          name: '',
          phone: '',
          phoneAreaCode: '',
          email: '',
          notes: '',
          boxRate: '',
        })
      }
      setErrors({})
    }
  }, [open, initialData, isEdit])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.boxRate || parseFloat(formData.boxRate) < 0) {
      newErrors.boxRate = 'Box rate is required and must be 0 or greater'
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }

    // Format payload for backend
    const payload = {
      name: formData.name.trim(),
      contactInfo: {
        phone: formData.phone?.trim() || undefined,
        phoneAreaCode: formData.phoneAreaCode?.trim() || undefined,
        email: formData.email?.trim() || undefined,
      },
      rates: {
        boxRate: parseFloat(formData.boxRate) || 0,
      },
      notes: formData.notes?.trim() || undefined,
    }

    // Remove undefined values
    if (!payload.contactInfo.phone) {
      delete payload.contactInfo.phone
      delete payload.contactInfo.phoneAreaCode
    }
    if (!payload.contactInfo.email) delete payload.contactInfo.email
    if (!payload.notes) delete payload.notes

    onSubmit(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Logistics Company' : 'Add Logistics Company'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Company Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <div className="flex gap-2">
              <Input
                id="phoneAreaCode"
                value={formData.phoneAreaCode}
                onChange={(e) => handleChange('phoneAreaCode', e.target.value)}
                className="w-24"
                maxLength={5}
              />
              <Input
                ref={phoneInputRef}
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="boxRate">
              Box Rate (GBP) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="boxRate"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formData.boxRate}
              onChange={(e) => {
                const value = e.target.value;
                // Allow only numbers and one decimal point
                const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                handleChange('boxRate', sanitized);
              }}
              className={errors.boxRate ? 'border-red-500' : ''}
            />
            {errors.boxRate && (
              <p className="text-sm text-red-500">{errors.boxRate}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Amount charged per box for this logistics company
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Company' : 'Create Company')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

