"use client"

import { useState, useEffect } from "react"

export default function FormDialog({ 
  open, 
  title, 
  fields, 
  initialValues = {},
  onClose, 
  onSubmit,
  loading = false,
  children,
  onOpenChange
}) {
  const [formData, setFormData] = useState({})

  // Initialize form data with default values or initial values (only if fields prop is provided)
  useEffect(() => {
    if (!fields || !Array.isArray(fields)) return
    
    const initialData = {}
    fields.forEach(field => {
      if (initialValues[field.name] !== undefined) {
        initialData[field.name] = initialValues[field.name]
      } else if (field.defaultValue !== undefined) {
        initialData[field.name] = field.defaultValue
      } else {
        initialData[field.name] = field.type === "number" ? 0 : ""
      }
    })
    setFormData(initialData)
  }, [fields, initialValues, open])

  function handleChange(name, value) {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(formData)
  }

  if (!open) return null

  // Handle onOpenChange if provided (for controlled dialogs)
  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false)
    } else if (onClose) {
      onClose()
    }
  }

  // If children are provided, render them instead of fields-based form
  if (children) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
        <div 
          className="bg-card rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div 
        className="bg-card rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {Array.isArray(fields) && fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {field.type === "select" ? (
                <select
                  value={formData[field.name] || ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                >
                  {field.placeholder && (
                    <option value="">{field.placeholder}</option>
                  )}
                  {field.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  value={formData[field.name] || ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  disabled={loading}
                  rows={field.rows || 3}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                />
              ) : (
                <input
                  type={field.type || "text"}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  step={field.step}
                  min={field.min}
                  max={field.max}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                />
              )}
            </div>
          ))}
        </form>

        <div className="p-4 border-t border-border flex gap-2 justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 border border-input rounded-md hover:bg-accent disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  )
}
