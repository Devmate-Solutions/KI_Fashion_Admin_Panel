"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function UserForm({ open, onClose, onSubmit, initialData = null, loading = false }) {
  const phoneInputRef = useRef(null)
  const alternatePhoneInputRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'employee',
    password: '',
    confirmPassword: '',
    phone: '',
    phoneAreaCode: '',
    address: '',
    // Supplier profile fields
    company: '',
    alternatePhone: '',
    alternatePhoneAreaCode: '',
    // Distributor profile fields
    taxNumber: '',
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          email: initialData.email || '',
          role: initialData.role || 'employee',
          password: '',
          confirmPassword: '',
          phone: initialData.phone || '',
          phoneAreaCode: initialData.phoneAreaCode || '',
          address: initialData.address || '',
          company: '',
          alternatePhone: '',
          alternatePhoneAreaCode: initialData.alternatePhoneAreaCode || '',
          taxNumber: '',
        })
      } else {
        setFormData({
          name: '',
          email: '',
          role: 'employee',
          password: '',
          confirmPassword: '',
          phone: '',
          phoneAreaCode: '',
          address: '',
          company: '',
          alternatePhone: '',
          alternatePhoneAreaCode: '',
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

    if (!initialData && !formData.password) {
      newErrors.password = 'Password is required'
    } else if (!initialData && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (!initialData && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    // Supplier/Distributor specific validations
    if ((formData.role === 'supplier' || formData.role === 'distributor') && !initialData) {
      if (!formData.company?.trim()) {
        newErrors.company = 'Company name is required'
      }
      if (!formData.phone?.trim()) {
        newErrors.phone = 'Phone number is required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validate()) {
      const submitData = { ...formData }
      delete submitData.confirmPassword
      if (initialData && !submitData.password) {
        delete submitData.password
      }

      // Build supplier/distributor profiles if needed
      if (!initialData && formData.role === 'supplier') {
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
      } else if (!initialData && (formData.role === 'distributor' || formData.role === 'buyer')) {
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
      } else if (!initialData) {
        submitData.signupSource = 'crm'
        submitData.portalAccess = ['crm']
      }

      // Clean up profile-specific fields from main data
      delete submitData.company
      delete submitData.alternatePhone
      delete submitData.taxNumber

      onSubmit(submitData)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mx-4">
        <h2 className="text-xl font-semibold mb-4">{initialData ? 'Edit User' : 'Add New User'}</h2>

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
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="distributor">Distributor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Phone field - required for supplier/distributor */}
          <div>
            <Label htmlFor="phone">
              Phone {!initialData && (formData.role === 'supplier' || formData.role === 'distributor') ? '*' : ''}
            </Label>
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

          {/* Address field */}
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>

          {/* Supplier/Distributor specific fields */}
          {!initialData && (formData.role === 'supplier' || formData.role === 'distributor') && (
            <>
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

              {formData.role === 'supplier' && (
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
              )}

              {formData.role === 'distributor' && (
                <div>
                  <Label htmlFor="taxNumber">Tax Number</Label>
                  <Input
                    id="taxNumber"
                    value={formData.taxNumber}
                    onChange={(e) => handleChange('taxNumber', e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {!initialData && (
            <>
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
            </>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
