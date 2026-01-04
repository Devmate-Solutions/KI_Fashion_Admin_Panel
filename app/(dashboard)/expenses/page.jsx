"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { useCostTypes } from "@/lib/hooks/useCostTypes"
import { Plus, Trash2, Check, X, Edit, Filter, RotateCcw } from "lucide-react"
import toast from "react-hot-toast"
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
  })
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)

  const queryParams = useMemo(() => {
    const params = { ...filters }
    if (params.costType === 'all') delete params.costType
    if (params.status === 'all') delete params.status
    if (params.paymentMethod === 'all') delete params.paymentMethod
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

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 border rounded-lg bg-card">
        <div className="flex items-center gap-2 mr-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        {/* Cost Type Filter */}
        <div className="w-[200px]">
          <Select
            value={filters.costType}
            onValueChange={(value) => setFilters(prev => ({ ...prev, costType: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Cost Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cost Types</SelectItem>
              {costTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="w-[150px]">
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Method Filter */}
        <div className="w-[180px]">
          <Select
            value={filters.paymentMethod}
            onValueChange={(value) => setFilters(prev => ({ ...prev, paymentMethod: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Payment Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment Types</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank_transfer">Bank</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-2"
          onClick={() => setFilters({
            search: '',
            costType: 'all',
            status: 'all',
            paymentMethod: 'all',
          })}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Clear
        </Button>
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

