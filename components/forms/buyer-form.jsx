"use client"

import { useState, useEffect, useRef } from "react"

/**
 * Add Buyer Form Component
 * Simple form with only: name, phone, email, address (optional)
 */
export function AddBuyerForm({ open, onClose, onSubmit, loading = false }) {
  const phoneInputRef = useRef(null)
  const alternatePhoneInputRef = useRef(null)
  const landlineInputRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    phoneAreaCode: '',
    landline: '',
    landlineAreaCode: '',
    alternatePhone: '',
    alternatePhoneAreaCode: '',
    contactPerson: '',
    company: '',
    email: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    }
  })

  const [errors, setErrors] = useState({})

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        phone: '',
        phoneAreaCode: '',
        landline: '',
        landlineAreaCode: '',
        alternatePhone: '',
        alternatePhoneAreaCode: '',
        contactPerson: '',
        company: '',
        email: '',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
        }
      })
      setErrors({})
    }
  }, [open])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }))
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'Phone is required'
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    // Address is now optional - removed validation

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add New Buyer</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-4 space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  disabled={loading}
                  className={`w-full px-3 py-2 border rounded-md bg-background disabled:opacity-50 ${errors.name ? 'border-red-500' : 'border-input'
                    }`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={formData.phoneAreaCode}
                    onChange={(e) => handleChange('phoneAreaCode', e.target.value)}
                    disabled={loading}
                    className={`w-24 px-3 py-2 border rounded-md bg-background disabled:opacity-50 ${errors.phoneAreaCode ? 'border-red-500' : 'border-input'
                      }`}
                    maxLength={5}
                  />
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    disabled={loading}
                    className={`flex-1 px-3 py-2 border rounded-md bg-background disabled:opacity-50 ${errors.phone ? 'border-red-500' : 'border-input'
                      }`}
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={loading}
                  className={`w-full px-3 py-2 border rounded-md bg-background disabled:opacity-50 ${errors.email ? 'border-red-500' : 'border-input'
                    }`}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Landline</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={formData.landlineAreaCode}
                    onChange={(e) => handleChange('landlineAreaCode', e.target.value)}
                    disabled={loading}
                    className="w-24 px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                    maxLength={5}
                  />
                  <input
                    ref={landlineInputRef}
                    type="tel"
                    value={formData.landline}
                    onChange={(e) => handleChange('landline', e.target.value)}
                    disabled={loading}
                    className="flex-1 px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Contact Person</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => handleChange('contactPerson', e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                />
              </div>
            </div>

            {/* Address Fields */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Address</h3>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Street
                </label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  disabled={loading}
                  className={`w-full px-3 py-2 border rounded-md bg-background disabled:opacity-50 ${'border-input'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">State/Province</label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Zip Code</label>
                  <input
                    type="text"
                    value={formData.address.zipCode}
                    onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.address.country}
                    onChange={(e) => handleAddressChange('country', e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-input rounded-md hover:bg-accent disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {loading ? 'Creating...' : 'Create Buyer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Edit Buyer Form Component
 * Full form with all fields including company, payment terms, credit limit, etc.
 */
export function EditBuyerForm({ open, buyer, onClose, onSubmit, loading = false }) {
  const phoneInputRef = useRef(null)
  const alternatePhoneInputRef = useRef(null)
  const landlineInputRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    phoneAreaCode: '',
    alternatePhone: '',
    alternatePhoneAreaCode: '',
    landline: '',
    landlineAreaCode: '',
    contactPerson: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    taxNumber: '',
    paymentTerms: 'cash',
    creditLimit: 0,
    discountRate: 0,
    customerType: 'retail',
    notes: '',
  })

  const [errors, setErrors] = useState({})

  // Load buyer data when dialog opens
  useEffect(() => {
    if (open && buyer) {
      setFormData({
        name: buyer.name || '',
        company: buyer.company || '',
        email: buyer.email || '',
        phone: buyer.phone || '',
        phoneAreaCode: buyer.phoneAreaCode || '',
        alternatePhone: buyer.alternatePhone || '',
        alternatePhoneAreaCode: buyer.alternatePhoneAreaCode || '',
        landline: buyer.landline || '',
        landlineAreaCode: buyer.landlineAreaCode || '',
        contactPerson: buyer.contactPerson || '',
        address: {
          street: buyer.address?.street || '',
          city: buyer.address?.city || '',
          state: buyer.address?.state || '',
          zipCode: buyer.address?.zipCode || '',
          country: buyer.address?.country || '',
        },
        taxNumber: buyer.taxNumber || '',
        paymentTerms: buyer.paymentTerms || 'cash',
        creditLimit: buyer.creditLimit || 0,
        discountRate: buyer.discountRate || 0,
        customerType: buyer.customerType || 'retail',
        notes: buyer.notes || '',
      })
      setErrors({})
    }
  }, [open, buyer])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }))
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'Phone is required'
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Buyer</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-4 space-y-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold border-b pb-1">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    disabled={loading}
                    className={`w-full px-3 py-2 border rounded-md bg-background disabled:opacity-50 ${errors.name ? 'border-red-500' : 'border-input'
                      }`}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold border-b pb-1">Contact Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    disabled={loading}
                    className={`w-full px-3 py-2 border rounded-md bg-background disabled:opacity-50 ${errors.email ? 'border-red-500' : 'border-input'
                      }`}
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={formData.phoneAreaCode}
                      onChange={(e) => handleChange('phoneAreaCode', e.target.value)}
                      disabled={loading}
                      className={`w-24 px-3 py-2 border rounded-md bg-background disabled:opacity-50 ${errors.phoneAreaCode ? 'border-red-500' : 'border-input'
                        }`}
                      maxLength={5}
                    />
                    <input
                      ref={phoneInputRef}
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      disabled={loading}
                      className={`flex-1 px-3 py-2 border rounded-md bg-background disabled:opacity-50 ${errors.phone ? 'border-red-500' : 'border-input'
                        }`}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Alternate Phone</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={formData.alternatePhoneAreaCode}
                      onChange={(e) => handleChange('alternatePhoneAreaCode', e.target.value)}
                      disabled={loading}
                      className="w-24 px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                      maxLength={5}
                    />
                    <input
                      ref={alternatePhoneInputRef}
                      type="tel"
                      value={formData.alternatePhone}
                      onChange={(e) => handleChange('alternatePhone', e.target.value)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Landline</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={formData.landlineAreaCode}
                      onChange={(e) => handleChange('landlineAreaCode', e.target.value)}
                      disabled={loading}
                      className="w-24 px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                      maxLength={5}
                    />
                    <input
                      ref={landlineInputRef}
                      type="tel"
                      value={formData.landline}
                      onChange={(e) => handleChange('landline', e.target.value)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold border-b pb-1">Address</h3>

              <div>
                <label className="block text-sm font-medium mb-1">Street</label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">State/Province</label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Zip Code</label>
                  <input
                    type="text"
                    value={formData.address.zipCode}
                    onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.address.country}
                    onChange={(e) => handleAddressChange('country', e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Business Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold border-b pb-1">Business Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tax Number</label>
                  <input
                    type="text"
                    value={formData.taxNumber}
                    onChange={(e) => handleChange('taxNumber', e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Customer Type</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => handleChange('customerType', e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                  >
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="distributor">Distributor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Payment Terms</label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => handleChange('paymentTerms', e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                  >
                    <option value="cash">Cash</option>
                    <option value="net15">Net 15</option>
                    <option value="net30">Net 30</option>
                    <option value="net60">Net 60</option>
                    <option value="net90">Net 90</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Credit Limit</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.creditLimit}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only numbers and one decimal point
                      const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                      handleChange('creditLimit', sanitized === "" ? 0 : parseFloat(sanitized) || 0);
                    }}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Discount Rate (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.discountRate}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only numbers and one decimal point
                      const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                      handleChange('discountRate', sanitized === "" ? 0 : parseFloat(sanitized) || 0);
                    }}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                    max="100"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  disabled={loading}
                  rows={3}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-input rounded-md hover:bg-accent disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {loading ? 'Updating...' : 'Update Buyer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
