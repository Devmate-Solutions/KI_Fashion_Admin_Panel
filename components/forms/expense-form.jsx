"use client"

import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusIcon, TrashIcon } from "lucide-react"
import { Label } from "@/components/ui/label"

// Expense form with product table - similar to buying form
// Section 1: Expense metadata (date, TC, exchange rate, etc.)
// Section 2: Products table with multiple rows
// Auto-calculations for totals

export default function ExpenseForm({ onSave }) {
  // Metadata fields
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0])
  const [tc, setTc] = useState("")
  const [exchangeRate, setExchangeRate] = useState(1.0)
  const [numberOfItems, setNumberOfItems] = useState(0)
  const [euro, setEuro] = useState(0)
  const [pound, setPound] = useState(0)
  const [percentage, setPercentage] = useState(0)
  const TC_OPTIONS = useMemo(() => ["AAA", "AM", "AI", "Other"], [])

  // Product rows for the table
  const [rows, setRows] = useState([])

  // Loading and error states
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  // Refs for keyboard navigation
  const saveButtonRef = useRef(null)

  // Add new row to products table
  function addRow() {
    const newRow = {
      id: Date.now(),
      productCode: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    }
    setRows((r) => [...r, newRow])
  }

  function updateRow(id, field, value) {
    setRows((r) =>
      r.map((row) => {
        if (row.id === id) {
          const updated = { ...row, [field]: value }
          // Auto-calculate total price
          if (field === "quantity" || field === "unitPrice") {
            updated.totalPrice = Number(updated.quantity || 0) * Number(updated.unitPrice || 0)
          }
          return updated
        }
        return row
      }),
    )
  }

  function removeRow(id) {
    setRows((r) => r.filter((x) => x.id !== id))
  }

  // Calculate totals
  const totals = useMemo(() => {
    const totalCost = rows.reduce((sum, row) => sum + Number(row.totalPrice || 0), 0)
    const calculatedItems = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0)
    return { totalCost, calculatedItems }
  }, [rows])

  // Update numberOfItems when rows change
  useEffect(() => {
    setNumberOfItems(totals.calculatedItems)
  }, [totals.calculatedItems])

  // Keyboard shortcuts
  function handleKeyDown(e) {
    // Ctrl+S to save
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault()
      handleSave()
    }
  }

  // Add keyboard listener
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [rows, expenseDate, tc, exchangeRate, euro, pound, percentage])

  // Save expense
  async function handleSave() {
    // Validation
    if (!expenseDate) {
      setError('Please select an expense date')
      return
    }
    
    if (!tc) {
      setError('Please select TC')
      return
    }
    
    if (rows.length === 0) {
      setError('Please add at least one product')
      return
    }
    
    // Validate that all rows have required fields
    const invalidRows = rows.filter(row => 
      !row.productCode || 
      !row.quantity || 
      row.quantity <= 0
    )
    
    if (invalidRows.length > 0) {
      setError('Please fill in product code and quantity for all rows')
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      
      // Prepare payload
      const payload = {
        expenseDate,
        tc,
        exchangeRate: Number(exchangeRate),
        numberOfItems: totals.calculatedItems,
        euro: Number(euro),
        pound: Number(pound),
        totalCost: totals.totalCost,
        percentage: Number(percentage),
        products: rows.map(row => ({
          productCode: row.productCode,
          description: row.description || '',
          quantity: Number(row.quantity),
          unitPrice: Number(row.unitPrice || 0),
          totalPrice: Number(row.totalPrice || 0),
        })),
        metadata: {
          createdAt: new Date().toISOString()
        }
      }

      // Call parent callback with payload
      if (onSave) {
        await onSave(payload)
      }
      
    } catch (err) {
      console.error('Error saving expense:', err)
      setError(err.message || 'Failed to save expense. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium">Error:</span>
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Section 1: Expense Details */}
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Expense Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expense-date">Date</Label>
            <Input
              id="expense-date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tc">TC</Label>
            <Select value={tc || undefined} onValueChange={setTc}>
              <SelectTrigger id="tc" className="w-full">
                <SelectValue placeholder="Select TC..." />
              </SelectTrigger>
              <SelectContent>
                {TC_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="exchange-rate">Exchange Rate</Label>
            <Input
              id="exchange-rate"
              type="text"
              inputMode="decimal"
              step="0.01"
              value={exchangeRate}
              onChange={(e) => {
                const value = e.target.value;
                // Allow only numbers and one decimal point
                const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                setExchangeRate(sanitized === "" ? "" : Number(sanitized));
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="number-of-items">Number of Items</Label>
            <Input
              id="number-of-items"
              type="text"
              inputMode="numeric"
              value={numberOfItems}
              readOnly
              disabled
              className="bg-muted"
              title="Automatically calculated from products table"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="euro">Euro</Label>
            <Input
              id="euro"
              type="text"
              inputMode="decimal"
              step="0.01"
              value={euro}
              onChange={(e) => {
                const value = e.target.value;
                // Allow only numbers and one decimal point
                const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                setEuro(sanitized === "" ? "" : Number(sanitized));
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pound">Pound</Label>
            <Input
              id="pound"
              type="text"
              inputMode="decimal"
              step="0.01"
              value={pound}
              onChange={(e) => {
                const value = e.target.value;
                // Allow only numbers and one decimal point
                const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                setPound(sanitized === "" ? "" : Number(sanitized));
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="total-cost">Total Cost</Label>
            <Input
              id="total-cost"
              type="text"
              inputMode="decimal"
              value={totals.totalCost.toFixed(2)}
              readOnly
              disabled
              className="bg-muted font-semibold"
              title="Automatically calculated from products table"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="percentage">Percentage (%)</Label>
            <Input
              id="percentage"
              type="text"
              inputMode="decimal"
              step="0.1"
              value={percentage}
              onChange={(e) => {
                const value = e.target.value;
                // Allow only numbers and one decimal point
                const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                setPercentage(sanitized === "" ? "" : Number(sanitized));
              }}
            />
          </div>
        </div>
      </section>

      {/* Section 2: Products Table */}
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Products</h2>
          <Button type="button" onClick={addRow} size="sm" className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Product Code</th>
                <th className="text-left p-3 font-medium">Description</th>
                <th className="text-right p-3 font-medium">Quantity</th>
                <th className="text-right p-3 font-medium">Unit Price</th>
                <th className="text-right p-3 font-medium">Total Price</th>
                <th className="text-center p-3 font-medium w-20">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm">No products added yet</p>
                      <p className="text-xs">Click "Add Product" to get started</p>
                    </div>
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-2">
                    <Input
                      value={row.productCode}
                      onChange={(e) => updateRow(row.id, "productCode", e.target.value)}
                      className="min-w-[120px]"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={row.description}
                      onChange={(e) => updateRow(row.id, "description", e.target.value)}
                      className="min-w-[200px]"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={row.quantity}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers
                        const sanitized = value.replace(/[^0-9]/g, '');
                        updateRow(row.id, "quantity", sanitized === "" ? "" : Number(sanitized));
                      }}
                      className="text-right min-w-[100px]"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="text"
              inputMode="decimal"
                      value={row.unitPrice}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and one decimal point
                        const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                        updateRow(row.id, "unitPrice", sanitized === "" ? "" : Number(sanitized));
                      }}
                      className="text-right min-w-[120px]"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="text"
              inputMode="decimal"
                      value={row.totalPrice.toFixed(2)}
                      readOnly
                      disabled
                      className="text-right min-w-[120px] bg-muted font-medium"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(row.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            <kbd className="px-2 py-1 bg-muted rounded text-xs">Tab</kbd> to navigate between fields
          </div>
        )}
      </section>

      {/* Save Section */}
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+S</kbd>
              <span>Save Expense</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRows([])
                setEuro(0)
                setPound(0)
                setPercentage(0)
                setError(null)
              }}
              disabled={isSaving}
            >
              Reset Form
            </Button>
            <Button
              ref={saveButtonRef}
              type="button"
              onClick={handleSave}
              size="lg"
              className="gap-2 min-w-[140px]"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                'Save Expense'
              )}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
