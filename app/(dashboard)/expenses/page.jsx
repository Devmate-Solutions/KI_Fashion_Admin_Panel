"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import BackButton from "@/components/BackButton"
import DataTable from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import FormDialog from "@/components/form-dialog"
import ExpenseFormNew from "@/components/forms/expense-form-new"
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from "@/lib/hooks/useExpenses"
import { exportToPDF } from "@/lib/utils/pdfExport"
import toast from "react-hot-toast"
import { useCostTypes } from "@/lib/hooks/useCostTypes"
import { Plus, Trash2, Edit, Filter, RotateCcw, Wallet, Building2, Search, TrendingUp, Package, AlertCircle, CheckCircle2 } from "lucide-react"
import BritishDatePicker from "@/components/BritishDatePicker"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ExpensesPage() {
  const router = useRouter()
  const [filters, setFilters] = useState({
    search: '',
    costType: 'all',
    status: 'all',
    paymentMethod: 'all',
    startDate: '',
    endDate: '',
    page: 1,
  })
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)

  const updateFilters = (nextValues) => {
    setFilters((prev) => ({
      ...prev,
      ...nextValues,
      page: 1,
    }))
  }

  const queryParams = useMemo(() => {
    const params = { page: filters.page }
    if (filters.search?.trim()) params.search = filters.search.trim()
    if (filters.costType !== 'all') params.costType = filters.costType
    if (filters.status !== 'all') params.status = filters.status
    if (filters.paymentMethod !== 'all') params.paymentMethod = filters.paymentMethod
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate
    return params
  }, [filters])

  const { data: expensesData, isLoading, error } = useExpenses(queryParams)

  const { data: costTypesResponse = [] } = useCostTypes({ isActive: true })
  const costTypes = Array.isArray(costTypesResponse) ? costTypesResponse : costTypesResponse?.data || []

  // Ensure expenses is always an array
  const expenses = useMemo(() => {
    if (!expensesData) return []
    if (Array.isArray(expensesData.data)) return expensesData.data
    if (Array.isArray(expensesData)) return expensesData
    return []
  }, [expensesData])

  const summary = expensesData?.summary || {}

  // Log error if any
  useEffect(() => {
    if (error) {
      console.error('Expenses query error:', error)
    }
  }, [error])

  const createMutation = useCreateExpense()
  const updateMutation = useUpdateExpense()
  const deleteMutation = useDeleteExpense()

  const handleCreate = () => {
    setEditingExpense(null)
    setShowForm(true)
  }

  const handleEdit = useCallback((expense) => {
    setEditingExpense(expense)
    setShowForm(true)
  }, [])

  const handleFilterReset = () => {
    setFilters({
      search: '',
      costType: 'all',
      status: 'all',
      paymentMethod: 'all',
      startDate: '',
      endDate: '',
      page: 1,
    })
  }

  const handleDelete = useCallback(async (expense) => {
    if (!confirm(`Are you sure you want to delete expense "${expense.expenseNumber}"?`)) {
      return
    }

    try {
      await deleteMutation.mutateAsync(expense.id)
      toast.success("Expense deleted successfully")
    } catch (error) {
      console.error('Delete error:', error)
      toast.error("Failed to delete expense")
    }
  }, [deleteMutation])

  const handleSave = async (formData) => {
    try {
      if (editingExpense) {
        const response = await updateMutation.mutateAsync({
          id: editingExpense.id,
          data: formData
        })
        if (response?.status === 202) {
          router.push('/my-requests')
          setShowForm(false)
          setEditingExpense(null)
          return
        }
        // hook handles success toast
      } else {
        const response = await createMutation.mutateAsync(formData)
        if (response?.status === 202) {
          router.push('/my-requests')
          setShowForm(false)
          setEditingExpense(null)
          return
        }
        // hook handles success toast
      }
      setShowForm(false)
      setEditingExpense(null)
    } catch (error) {
      console.error('Save error:', error)
      toast.error("Failed to save expense")
    }
  }

  const expenseColumns = useMemo(() => {
    const statusStyles = {
      pending: "bg-amber-500/15 text-amber-600 border-amber-200",
      approved: "bg-emerald-500/15 text-emerald-600 border-emerald-200",
      rejected: "bg-red-500/15 text-red-600 border-red-200",
      paid: "bg-blue-500/15 text-blue-600 border-blue-200",
    }

    const labels = {
      cash: 'Cash',
      card: 'Card',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      online: 'Online'
    }

    return [
      {
        header: "Expense #",
        accessor: "expenseNumber",
        render: (row) => (
          <span className="font-medium">{row.expenseNumber || "—"}</span>
        ),
        pdfValue: (row) => row.expenseNumber || "—"
      },
      {
        header: "Date",
        accessor: "date",
        render: (row) => (
          <span>
            {row.date ? new Date(row.date).toLocaleDateString('en-GB') : "—"}
          </span>
        ),
        pdfValue: (row) => row.date ? new Date(row.date).toLocaleDateString('en-GB') : "—"
      },
      {
        header: "Description",
        accessor: "description",
        render: (row) => (
          <span className="max-w-[300px] truncate block" title={row.description}>
            {row.description || "—"}
          </span>
        ),
      },
      {
        header: "Cost Type",
        accessor: "costType",
        render: (row) => (
          <span>{row.costType || "—"}</span>
        ),
      },
      {
        header: "Amount",
        accessor: "amount",
        render: (row) => (
          <span className="font-medium">{currency(row.amount || 0)}</span>
        ),
        pdfValue: (row) => row.amount || 0
      },
      {
        header: "Total",
        accessor: "totalCost",
        render: (row) => (
          <span className="font-semibold">{currency(row.totalCost || 0)}</span>
        ),
        pdfValue: (row) => row.totalCost || 0
      },
      {
        header: "Payment Method",
        accessor: "paymentMethod",
        render: (row) => {
          const method = row.paymentMethod || 'cash'
          return <span className="capitalize">{labels[method] || method}</span>
        },
        pdfValue: (row) => {
          const method = row.paymentMethod || 'cash'
          return labels[method] || method
        }
      },
      {
        header: "Reference",
        accessor: "dispatchOrderNumber",
        render: (row) => (
          row.dispatchOrderId ? (
            <div className="flex flex-col">
              <Link
                href={`/dispatch-orders/${row.dispatchOrderId}`}
                className="text-primary hover:underline font-medium"
              >
                {row.dispatchOrderNumber || "View"}
              </Link>
              {row.supplierName && (
                <span className="text-[10px] text-muted-foreground mt-0.5 bg-muted px-1.5 py-0.5 rounded w-fit leading-none">
                  {row.supplierName}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        ),
        pdfValue: (row) => row.dispatchOrderNumber || row.supplierName || "—"
      },
      {
        header: "Status",
        accessor: "status",
        render: (row) => (
          <Badge className={statusStyles[row.status] || statusStyles.pending}>
            {row.status || 'pending'}
          </Badge>
        ),
        pdfValue: (row) => (row.status || 'pending').toUpperCase()
      },
      {
        header: "Actions",
        accessor: "actions",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(row)}
              className="h-8 w-8 p-0"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(row)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ]
  }, [handleEdit, handleDelete])  // <-- add your dependencies here
  const handleDownloadPDF = async () => {
    try {
      const result = await exportToPDF({
        title: "Expenses Report",
        columns: expenseColumns.filter(c => c.header !== "Actions"),
        data: expenses,
        filename: `Expenses_Report_${new Date().toLocaleDateString('en-CA')}`
      })
      if (result.success) {
        toast.success("PDF report downloaded!")
      } else {
        toast.error("Failed to generate PDF")
      }
    } catch (err) {
      toast.error("PDF generation failed: " + err.message)
    }
  }

  // Calculate summary stats
  const totalExpenses = expensesData?.summary?.totalAmount ?? expenses.reduce((sum, e) => sum + (e.totalCost || 0), 0)
  const cashExpenses = expensesData?.summary?.cashAmount ?? expenses
    .filter(e => e.paymentMethod === 'cash')
    .reduce((sum, e) => sum + (e.totalCost || 0), 0)
  const bankExpenses = expensesData?.summary?.bankAmount ?? expenses
    .filter(e => ['card', 'bank_transfer', 'cheque', 'online'].includes(e.paymentMethod))
    .reduce((sum, e) => sum + (e.totalCost || 0), 0)

  return (
    <div className="space-y-6 ">
      {/* Header - Enhanced */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="">
          <BackButton fallbackPath="/home" label="Back" />
        </div>

        <Button onClick={handleCreate} className="gap-2 h-11 px-6 shadow-sm">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </header>

      {/* Summary Cards - Modern Design */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Expenses */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
          </div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Total Expenses
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">
            {currency(totalExpenses)}
          </div>
        </div>

        {/* Cash Expenses */}
        <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-emerald-50/30 p-5 shadow-sm hover:shadow-md transition-shadow">

          <div className="text-xs font-medium text-emerald-700/80 uppercase tracking-wider mb-1">
            Cash Expenses
          </div>
          <div className="text-2xl font-bold text-emerald-700 tabular-nums">
            {currency(cashExpenses)}
          </div>
        </div>

        {/* Bank Expenses */}
        <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50/50 to-blue-50/30 p-5 shadow-sm hover:shadow-md transition-shadow">

          <div className="text-xs font-medium text-blue-700/80 uppercase tracking-wider mb-1">
            Bank Expenses
          </div>
          <div className="text-2xl font-bold text-blue-700 tabular-nums">
            {currency(bankExpenses)}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-medium">Failed to load expenses. Please try again later.</p>
        </div>
      )}

      {/* Filters & Search Bar - Compact */}
      <div className="rounded-lg border border-border bg-card p-2 sm:p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
          {/* Date Range Filter */}
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">From Date</Label>
            <BritishDatePicker
              value={filters.startDate || null}
              onChange={(date) =>
                updateFilters({ startDate: date ? date.toLocaleDateString('en-CA') : '' })
              }
              className="h-9 w-full sm:w-[140px]"
              placeholder="From date"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">To Date</Label>
            <BritishDatePicker
              value={filters.endDate || null}
              onChange={(date) =>
                updateFilters({ endDate: date ? date.toLocaleDateString('en-CA') : '' })
              }
              className="h-9 w-full sm:w-[140px]"
              placeholder="To date"
            />
          </div>

          {/* Cost Type Filter */}
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Cost Type</Label>
            <Select
              value={filters.costType}
              onValueChange={(value) => setFilters(prev => ({ ...prev, costType: value }))}
            >
              <SelectTrigger className="h-9 w-full sm:w-[160px] border-border">
                <SelectValue placeholder="All Cost Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cost Types</SelectItem>
                {costTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="h-9 w-full sm:w-[130px] border-border">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method Filter */}
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Payment</Label>
            <Select
              value={filters.paymentMethod}
              onValueChange={(value) => setFilters(prev => ({ ...prev, paymentMethod: value }))}
            >
              <SelectTrigger className="h-9 w-full sm:w-[160px] border-border">
                <SelectValue placeholder="All Payment Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Types</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-end gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 border-border"
              onClick={handleFilterReset}
              title="Clear Filters"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <DataTable
        columns={expenseColumns}
        data={expenses}
        onDownloadPDF={handleDownloadPDF}
        isLoading={isLoading}
        enableSearch={true}
        onSearch={(val) => setFilters(prev => ({ ...prev, search: val, page: 1 }))}
        manualPagination={true}
        currentPage={filters.page || 1}
        totalPages={expensesData?.pagination?.totalPages || 1}
        totalItems={expensesData?.pagination?.totalItems || 0}
        onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
      />

      {/* Form Dialog */}
      <FormDialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open)
          if (!open) setEditingExpense(null)
        }}
        title={editingExpense ? "Edit Expense" : "Add Expense"}
      >
        <ExpenseFormNew
          expense={editingExpense}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditingExpense(null)
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </FormDialog>
    </div>
  )
}

