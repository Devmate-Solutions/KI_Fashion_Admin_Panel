"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Users, Loader2 } from "lucide-react"

const PERMISSIONS = [
  { value: 'users', label: 'Users' },
  { value: 'suppliers', label: 'Suppliers' },
  { value: 'buyers', label: 'Buyers' },
  { value: 'products', label: 'Products' },
  { value: 'sales', label: 'Sales' },
  { value: 'purchases', label: 'Purchases' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'reports', label: 'Reports' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'delivery', label: 'Delivery' },
]

export function EmployeeForm({ open, onClose, onSubmit, initialData = null, loading = false }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'employee',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    permissions: [],
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
          address: initialData.address || '',
          permissions: initialData.permissions || [],
        })
      } else {
        setFormData({
          name: '',
          email: '',
          role: 'employee',
          password: '',
          confirmPassword: '',
          phone: '',
          address: '',
          permissions: [],
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
  }

  const handlePermissionToggle = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }))
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

      // Set defaults for employee accounts
      if (!initialData) {
        submitData.signupSource = 'crm'
        submitData.portalAccess = ['crm']
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
                {initialData ? 'Edit Employee' : 'Add New User'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {initialData ? 'Update employee information and permissions' : 'Create a new employee account with role and permissions'}
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
                placeholder="Enter employee name"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-semibold">Role <span className="text-red-500">*</span></Label>
              <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="h-11"
                placeholder="Enter phone number"
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

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Permissions</Label>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-3">
                {PERMISSIONS.map((permission) => (
                  <div key={permission.value} className="flex items-center space-x-2.5 group">
                    <Checkbox
                      id={`permission-${permission.value}`}
                      checked={formData.permissions.includes(permission.value)}
                      onCheckedChange={() => handlePermissionToggle(permission.value)}
                      className="h-4 w-4"
                    />
                    <Label
                      htmlFor={`permission-${permission.value}`}
                      className="text-sm font-medium cursor-pointer text-foreground group-hover:text-primary transition-colors"
                    >
                      {permission.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
              initialData ? 'Update Employee' : 'Create Employee'
            )}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

