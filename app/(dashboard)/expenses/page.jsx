"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  useApproveExpense,
  useRejectExpense,
} from "@/lib/hooks/useExpenses"
import { Plus, Trash2, Check, X, Edit } from "lucide-react"
import toast from "react-hot-toast"

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ExpensesPage() {
  const router = useRouter()
  const [filters, setFilters] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)

  const { data: expensesData, isLoading, error } = useExpenses(filters)
  
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
  const approveMutation = useApproveExpense()
  const rejectMutation = useRejectExpense()

  const handleCreate = () => {
    setEditingExpense(null)
    setShowForm(true)
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
    setShowForm(true)
  }

  const handleDelete = async (expense) => {
    if (!confirm(`Are you sure you want to delete expense "${expense.expenseNumber}"?`)) {
      return
    }

    try {
      await deleteMutation.mutateAsync(expense.id)
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const handleApprove = async (expense) => {
    try {
      await approveMutation.mutateAsync(expense.id)
    } catch (error) {
      console.error('Approve error:', error)
    }
  }

  const handleReject = async (expense) => {
    try {
      await rejectMutation.mutateAsync(expense.id)
    } catch (error) {
      console.error('Reject error:', error)
    }
  }

  const handleSave = async (formData) => {
    try {
      if (editingExpense) {
        await updateMutation.mutateAsync({
          id: editingExpense.id,
          data: formData
        })
      } else {
        await createMutation.mutateAsync(formData)
      }
      setShowForm(false)
      setEditingExpense(null)
    } catch (error) {
      console.error('Save error:', error)
    }
  }

  const expenseColumns = useMemo(() => {
    const statusStyles = {
      pending: "bg-amber-500/15 text-amber-600 border-amber-200",
      approved: "bg-emerald-500/15 text-emerald-600 border-emerald-200",
      rejected: "bg-red-500/15 text-red-600 border-red-200",
      paid: "bg-blue-500/15 text-blue-600 border-blue-200",
    }

    return [
      {
        header: "Expense #",
        accessor: "expenseNumber",
        render: (row) => (
          <span className="font-medium">{row.expenseNumber || "—"}</span>
        ),
      },
      {
        header: "Date",
        accessor: "date",
        render: (row) => (
          <span>
            {row.date ? new Date(row.date).toLocaleDateString('en-GB') : "—"}
          </span>
        ),
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
      },
      {
        header: "Tax",
        accessor: "taxAmount",
        render: (row) => (
          <span>{currency(row.taxAmount || 0)}</span>
        ),
      },
      {
        header: "Total",
        accessor: "totalCost",
        render: (row) => (
          <span className="font-semibold">{currency(row.totalCost || 0)}</span>
        ),
      },
      {
        header: "Payment Method",
        accessor: "paymentMethod",
        render: (row) => {
          const method = row.paymentMethod || 'cash'
          const labels = {
            cash: 'Cash',
            card: 'Card',
            bank_transfer: 'Bank Transfer',
            cheque: 'Cheque',
            online: 'Online'
          }
          return <span className="capitalize">{labels[method] || method}</span>
        },
      },
      {
        header: "Vendor",
        accessor: "vendor",
        render: (row) => (
          <span>{row.vendor || "—"}</span>
        ),
      },
      {
        header: "Status",
        accessor: "status",
        render: (row) => (
          <Badge className={statusStyles[row.status] || statusStyles.pending}>
            {row.status || 'pending'}
          </Badge>
        ),
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
            {row.status === 'pending' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleApprove(row)}
                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                  title="Approve"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReject(row)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  title="Reject"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
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
  }, [])

  // Calculate summary stats
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.totalCost || 0), 0)
  const cashExpenses = expenses
    .filter(e => e.paymentMethod === 'cash')
    .reduce((sum, e) => sum + (e.totalCost || 0), 0)
  const bankExpenses = expenses
    .filter(e => ['card', 'bank_transfer', 'cheque', 'online'].includes(e.paymentMethod))
    .reduce((sum, e) => sum + (e.totalCost || 0), 0)
  const pendingCount = expenses.filter(e => e.status === 'pending').length

  return (
    <div className="mx-auto max-w-[1600px] p-4">
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">Manage and track business expenses</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Expenses</div>
          <div className="text-2xl font-bold mt-1">{currency(totalExpenses)}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Cash Expenses</div>
          <div className="text-2xl font-bold mt-1 text-green-600">{currency(cashExpenses)}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Bank Expenses</div>
          <div className="text-2xl font-bold mt-1 text-blue-600">{currency(bankExpenses)}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Pending Approvals</div>
          <div className="text-2xl font-bold mt-1 text-amber-600">{pendingCount}</div>
        </div>
      </div>

      {/* Expenses Table */}
      <DataTable
        columns={Array.isArray(expenseColumns) ? expenseColumns : []}
        data={expenses}
        isLoading={isLoading}
        searchPlaceholder="Search expenses..."
        onSearch={(search) => setFilters(prev => ({ ...prev, search }))}
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

