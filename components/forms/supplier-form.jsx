"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Add Supplier Form Component
 */
export function AddSupplierForm({ open, onClose, onSubmit, loading = false }) {
  const phoneInputRef = useRef(null)
  const alternatePhoneInputRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    company: '',
    alternatePhone: '',
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        phoneAreaCode: '',
        address: '',
        company: '',
        alternatePhone: '',
        alternatePhoneAreaCode: '',
      })
      setErrors({})
    }
  }, [open])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
    
    // Auto-focus phone number field when area code is complete
    if (field === 'phoneAreaCode' && value.length >= 5 && phoneInputRef.current) {
      phoneInputRef.current.focus()
    } else if (field === 'alternatePhoneAreaCode' && value.length >= 5 && alternatePhoneInputRef.current) {
      alternatePhoneInputRef.current.focus()
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

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.company?.trim()) {
      newErrors.company = 'Company name is required'
    }

    if (!formData.phone?.trim()) {
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

      // Build supplier profile
      submitData.role = 'supplier'
      submitData.supplierProfile = {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        phoneAreaCode: formData.phoneAreaCode || undefined,
        alternatePhone: formData.alternatePhone || undefined,
        alternatePhoneAreaCode: formData.alternatePhoneAreaCode || undefined,
        address: formData.address || undefined,
        notes: 'Created by admin via CRM',
      }
      submitData.signupSource = 'crm'
      submitData.portalAccess = ['supplier']

      // Clean up profile-specific fields from main data
      delete submitData.company
      delete submitData.alternatePhone

      onSubmit(submitData)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-card rounded-lg shadow-xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Add New Supplier</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label htmlFor="company">Company Name *</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              className={errors.company ? 'border-red-500' : ''}
            />
            {errors.company && <p className="text-red-500 text-sm mt-1">{errors.company}</p>}
          </div>

          <div>
            <Label htmlFor="phone">Phone *</Label>
            <div className="flex gap-2">
              <Input
                id="phoneAreaCode"
                value={formData.phoneAreaCode}
                onChange={(e) => handleChange('phoneAreaCode', e.target.value)}
                className={`w-24 ${errors.phoneAreaCode ? 'border-red-500' : ''}`}
                maxLength={5}
              />
              <Input
                ref={phoneInputRef}
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={`flex-1 ${errors.phone ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>

          <div>
            <Label htmlFor="alternatePhone">Alternate Phone</Label>
            <div className="flex gap-2">
              <Input
                id="alternatePhoneAreaCode"
                value={formData.alternatePhoneAreaCode}
                onChange={(e) => handleChange('alternatePhoneAreaCode', e.target.value)}
                className="w-24"
                maxLength={5}
              />
              <Input
                ref={alternatePhoneInputRef}
                id="alternatePhone"
                value={formData.alternatePhone}
                onChange={(e) => handleChange('alternatePhone', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              className={errors.confirmPassword ? 'border-red-500' : ''}
            />
            {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Supplier'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Edit Supplier Form Component
 */
export function EditSupplierForm({ open, supplier, onClose, onSubmit, loading = false }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    phoneAreaCode: '',
    address: '',
    company: '',
    alternatePhone: '',
    alternatePhoneAreaCode: '',
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open && supplier) {
      // Extract supplier data - could be from supplierProfile or direct fields
      const supplierData = supplier.supplierProfile || supplier
      setFormData({
        name: supplierData.name || '',
        email: supplierData.email || supplier.email || '',
        password: '',
        confirmPassword: '',
        phone: supplierData.phone || supplier.phone || '',
        phoneAreaCode: supplierData.phoneAreaCode || supplier.phoneAreaCode || '',
        address: supplierData.address || supplier.address || '',
        company: supplierData.company || supplier.company || '',
        alternatePhone: supplierData.alternatePhone || supplier.alternatePhone || '',
        alternatePhoneAreaCode: supplierData.alternatePhoneAreaCode || supplier.alternatePhoneAreaCode || '',
      })
      setErrors({})
    }
  }, [open, supplier])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
    
    // Auto-focus phone number field when area code is complete
    if (field === 'phoneAreaCode' && value.length >= 5 && phoneInputRef.current) {
      phoneInputRef.current.focus()
    } else if (field === 'alternatePhoneAreaCode' && value.length >= 5 && alternatePhoneInputRef.current) {
      alternatePhoneInputRef.current.focus()
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

    // Password is optional for edit, but if provided, must be valid
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.phone?.trim()) {
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

      // Only include password if it was provided
      if (!submitData.password) {
        delete submitData.password
      }

      onSubmit(submitData)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-card rounded-lg shadow-xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Edit Supplier</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label htmlFor="company">Company Name</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              disabled={true}
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone *</Label>
            <div className="flex gap-2">
              <Input
                id="phoneAreaCode"
                value={formData.phoneAreaCode}
                onChange={(e) => handleChange('phoneAreaCode', e.target.value)}
                className={`w-24 ${errors.phoneAreaCode ? 'border-red-500' : ''}`}
                maxLength={5}
              />
              <Input
                ref={phoneInputRef}
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={`flex-1 ${errors.phone ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>

          <div>
            <Label htmlFor="alternatePhone">Alternate Phone</Label>
            <div className="flex gap-2">
              <Input
                id="alternatePhoneAreaCode"
                value={formData.alternatePhoneAreaCode}
                onChange={(e) => handleChange('alternatePhoneAreaCode', e.target.value)}
                className="w-24"
                maxLength={5}
              />
              <Input
                ref={alternatePhoneInputRef}
                id="alternatePhone"
                value={formData.alternatePhone}
                onChange={(e) => handleChange('alternatePhone', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="password">Password (leave blank to keep current)</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          {formData.password && (
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className={errors.confirmPassword ? 'border-red-500' : ''}
              />
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Supplier'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * SupplierForm - Wrapper component for backward compatibility
 * Uses AddSupplierForm or EditSupplierForm based on initialData prop
 */
export function SupplierForm({ open, onClose, onSubmit, initialData = null, loading = false }) {
  if (initialData) {
    return (
      <EditSupplierForm
        open={open}
        supplier={initialData}
        onClose={onClose}
        onSubmit={onSubmit}
        loading={loading}
      />
    )
  }
  
  return (
    <AddSupplierForm
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      loading={loading}
    />
  )
}
