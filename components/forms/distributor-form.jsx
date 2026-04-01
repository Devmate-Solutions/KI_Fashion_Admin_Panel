"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Users, Loader2 } from "lucide-react"

export function DistributorForm({ open, onClose, onSubmit, initialData = null, loading = false }) {
  const phoneInputRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    phoneAreaCode: '',
    address: '',
    company: '',
    taxNumber: '',
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          email: initialData.email || '',
          password: '',
          confirmPassword: '',
          phone: initialData.phone || '',
          phoneAreaCode: initialData.phoneAreaCode || '',
          address: initialData.address || '',
          company: '',
          taxNumber: '',
        })
      } else {
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          phone: '',
          phoneAreaCode: '',
          address: '',
          company: '',
          taxNumber: '',
        })
      }
      setErrors({})
    }
  }, [open, initialData])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
    
    // Auto-focus phone number field when area code is complete
    if (field === 'phoneAreaCode' && value.length >= 5 && phoneInputRef.current) {
      phoneInputRef.current.focus()
    }
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!initialData && !formData.password) {
      newErrors.password = 'Password is required'
    } else if (!initialData && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (!initialData && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!initialData && !formData.company?.trim()) {
      newErrors.company = 'Company name is required'
    }

    if (!initialData && !formData.phone?.trim()) {
      newErrors.phone = 'Phone number is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validate()) {
      const submitData = { ...formData }
      delete submitData.confirmPassword

      if (!initialData) {
        // Build distributor profile
        submitData.role = 'buyer'
        submitData.distributorProfile = {
          name: formData.name,
          company: formData.company,
          email: formData.email,
          phone: formData.phone,
          phoneAreaCode: formData.phoneAreaCode || undefined,
          address: formData.address || undefined,
          taxNumber: formData.taxNumber || undefined,
          notes: 'Created by admin via CRM',
        }
        submitData.signupSource = 'crm'
        submitData.portalAccess = ['distributor']

        // Clean up profile-specific fields from main data
        delete submitData.company
        delete submitData.taxNumber
      } else {
        if (!submitData.password) {
          delete submitData.password
        }
      }

      onSubmit(submitData)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                {initialData ? 'Edit Buyer' : 'Add New Buyer'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {initialData ? 'Update buyer information and contact details' : 'Create a new buyer account with company details'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">Name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`h-11 ${errors.name ? 'border-red-500 focus-visible:ring-red-500/20' : ''}`}
                placeholder="Enter buyer name"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">Email <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`h-11 ${errors.email ? 'border-red-500 focus-visible:ring-red-500/20' : ''}`}
                placeholder="Enter email address"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company" className="text-sm font-semibold">Company Name {!initialData && <span className="text-red-500">*</span>}</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              className={`h-11 ${errors.company ? 'border-red-500 focus-visible:ring-red-500/20' : ''}`}
              placeholder="Enter company name"
              disabled={!!initialData}
            />
            {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold">Phone {!initialData && <span className="text-red-500">*</span>}</Label>
              <div className="flex gap-2">
                <Input
                  id="phoneAreaCode"
                  value={formData.phoneAreaCode}
                  onChange={(e) => handleChange('phoneAreaCode', e.target.value)}
                  className={`h-11 w-24 ${errors.phoneAreaCode ? 'border-red-500 focus-visible:ring-red-500/20' : ''}`}
                  maxLength={5}
                  placeholder="Area"
                />
                <Input
                  ref={phoneInputRef}
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={`h-11 flex-1 ${errors.phone ? 'border-red-500 focus-visible:ring-red-500/20' : ''}`}
                  placeholder="Enter phone number"
                />
              </div>
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxNumber" className="text-sm font-semibold">Tax Number</Label>
              <Input
                id="taxNumber"
                value={formData.taxNumber}
                onChange={(e) => handleChange('taxNumber', e.target.value)}
                className="h-11"
                placeholder="Enter tax number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-semibold">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="h-11"
              placeholder="Enter address"
            />
          </div>

          {!initialData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">Password <span className="text-red-500">*</span></Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`h-11 ${errors.password ? 'border-red-500 focus-visible:ring-red-500/20' : ''}`}
                  placeholder="Enter password"
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirm Password <span className="text-red-500">*</span></Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className={`h-11 ${errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500/20' : ''}`}
                  placeholder="Confirm password"
                />
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>
          )}

        <DialogFooter className="gap-3 pt-4 border-t border-border/60">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="h-10 px-5"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            className="h-10 px-5 gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              initialData ? 'Update Buyer' : 'Create Buyer'
            )}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

