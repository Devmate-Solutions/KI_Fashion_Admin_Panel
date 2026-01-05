"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function DeliveryPersonnelForm({ open, onClose, onSubmit, initialData = null, loading = false }) {
  const phoneInputRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    phoneAreaCode: '',
    email: '',
    vehicleNumber: '',
    vehicleType: '',
    status: 'active',
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          phone: initialData.phone || '',
          phoneAreaCode: initialData.phoneAreaCode || '',
          email: initialData.email || '',
          vehicleNumber: initialData.vehicleNumber || '',
          vehicleType: initialData.vehicleType || '',
          status: initialData.status || 'active',
        })
      } else {
        setFormData({
          name: '',
          phone: '',
          phoneAreaCode: '',
          email: '',
          vehicleNumber: '',
          vehicleType: '',
          status: 'active',
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

  const validate = () => {
    const newErrors = {}

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'Phone is required'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validate()) {
      onSubmit(formData)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mx-4">
        <h2 className="text-xl font-semibold mb-4">{initialData ? 'Edit Delivery Personnel' : 'Add New Delivery Personnel'}</h2>

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
            <Label htmlFor="email">Email</Label>
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
            <Label htmlFor="vehicleNumber">Vehicle Number</Label>
            <Input
              id="vehicleNumber"
              value={formData.vehicleNumber}
              onChange={(e) => handleChange('vehicleNumber', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="vehicleType">Vehicle Type</Label>
            <Select value={formData.vehicleType} onValueChange={(value) => handleChange('vehicleType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bike">Bike</SelectItem>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="van">Van</SelectItem>
                <SelectItem value="truck">Truck</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on-leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
