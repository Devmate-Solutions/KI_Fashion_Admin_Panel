// "use client"

// import { useMemo, useState, useEffect, useCallback } from "react"
// import { useRouter } from "next/navigation"
// import Link from "next/link"
// import BackButton from "@/components/BackButton"
// import DataTable from "@/components/data-table"
// import { Badge } from "@/components/ui/badge"
// import { Button } from "@/components/ui/button"
// import FormDialog from "@/components/form-dialog"
// import ExpenseFormNew from "@/components/forms/expense-form-new"
// import {
//   useExpenses,
//   useCreateExpense,
//   useUpdateExpense,
//   useDeleteExpense,
// } from "@/lib/hooks/useExpenses"
// import { exportToPDF } from "@/lib/utils/pdfExport"
// import toast from "react-hot-toast"
// import { useCostTypes } from "@/lib/hooks/useCostTypes"
// import { Plus, Trash2, Edit, Filter, RotateCcw, Wallet, Building2, Search, TrendingUp, Package, AlertCircle, CheckCircle2 } from "lucide-react"
// import BritishDatePicker from "@/components/BritishDatePicker"
// import { Label } from "@/components/ui/label"
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select"

// function currency(n) {
//   const num = Number(n || 0)
//   return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
// }

// export default function ExpensesPage() {
//   const router = useRouter()
//   const [filters, setFilters] = useState({
//     search: '',
//     costType: 'all',
//     status: 'all',
//     paymentMethod: 'all',
//     startDate: '',
//     endDate: '',
//     page: 1,
//   })
//   const [showForm, setShowForm] = useState(false)
//   const [editingExpense, setEditingExpense] = useState(null)

//   const [columnFilters, setColumnFilters] = useState({
//     expenseNumber: "",
//     date: "",
//     description: "",
//     costType: "",
//     amount: "",
//     paymentMethod: "",
//   })
  
//   const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

//   const updateFilters = (nextValues) => {
//     setFilters((prev) => ({
//       ...prev,
//       ...nextValues,
//       page: 1,
//     }))
//   }

//   const { data: expensesData, isLoading, error } = useExpenses({
//     page: filters.search?.trim() ? 1 : filters.page,
//     limit: 500,
//     startDate: filters.startDate || undefined,
//     endDate: filters.endDate || undefined,
//   })

//   const { data: costTypesResponse = [] } = useCostTypes({ isActive: true })
//   const costTypes = Array.isArray(costTypesResponse) ? costTypesResponse : costTypesResponse?.data || []

//   // Ensure expenses is always an array
//   const expenses = useMemo(() => {
//     if (!expensesData) return []
//     if (Array.isArray(expensesData.data)) return expensesData.data
//     if (Array.isArray(expensesData)) return expensesData
//     return []
//   }, [expensesData])

//   // Client-side filtering
//   const filteredExpenses = useMemo(() => {
//     const query = filters.search?.trim().toLowerCase() || ""
//     const expenseNumberFilter = columnFilters.expenseNumber.trim().toLowerCase()
//     const dateFilter = columnFilters.date
//     const descriptionFilter = columnFilters.description.trim().toLowerCase()
//     const costTypeFilter = columnFilters.costType.trim().toLowerCase()
//     const amountFilter = columnFilters.amount.trim().toLowerCase()
//     const paymentMethodFilter = columnFilters.paymentMethod.trim().toLowerCase()

//     const topCostType = filters.costType !== 'all' ? filters.costType : ""
//     const topStatus = filters.status !== 'all' ? filters.status : ""
//     const topPaymentMethod = filters.paymentMethod !== 'all' ? filters.paymentMethod : ""

//     return expenses.filter((row) => {
//       // 1. Top-level Search
//       if (query) {
//         const desc = String(row.description || "").toLowerCase()
//         const num = String(row.expenseNumber || "").toLowerCase()
//         if (!desc.includes(query) && !num.includes(query)) return false
//       }

//       // 2. Top-level Dropdown Filters
//       if (topCostType) {
//         const selectedCostType = costTypes.find(c => c.id === topCostType)?.name || topCostType
//         if (row.costType !== selectedCostType && row.costTypeId !== topCostType) return false
//       }
//       if (topStatus) {
//         if (row.status !== topStatus) return false
//       }
//       if (topPaymentMethod) {
//         if (row.paymentMethod !== topPaymentMethod) return false
//       }

//       // 3. Column Filters
//       if (expenseNumberFilter) {
//         if (!String(row.expenseNumber || "").toLowerCase().includes(expenseNumberFilter)) return false
//       }
//       if (dateFilter) {
//         const rowDate = row.date ? new Date(row.date).toLocaleDateString("en-GB").toLowerCase() : ""
//         if (!rowDate.includes(dateFilter.toLowerCase().trim())) return false
//       }
//       if (descriptionFilter) {
//         if (!String(row.description || "").toLowerCase().includes(descriptionFilter)) return false
//       }
//       if (costTypeFilter) {
//         if (!String(row.costType || "").toLowerCase().includes(costTypeFilter)) return false
//       }
//       if (amountFilter) {
//         const amountStr = String(row.amount || 0).toLowerCase()
//         const currencyStr = String(currency(row.amount || 0)).toLowerCase()
//         if (!amountStr.includes(amountFilter) && !currencyStr.includes(amountFilter)) return false
//       }
//       if (paymentMethodFilter) {
//         const labels = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer', cheque: 'Cheque', online: 'Online' }
//         const method = row.paymentMethod || 'cash'
//         const methodStr = String(labels[method] || method).toLowerCase()
//         if (!methodStr.includes(paymentMethodFilter)) return false
//       }

//       return true
//     })
//   }, [expenses, filters, columnFilters, costTypes])

//   const sortedExpenses = useMemo(() => {
//     if (!sortConfig.key) return filteredExpenses
//     const dir = sortConfig.direction === 'asc' ? 1 : -1
//     return [...filteredExpenses].sort((a, b) => {
//       const aVal = a[sortConfig.key] ?? ""
//       const bVal = b[sortConfig.key] ?? ""
//       if (aVal === bVal) return 0
//       return aVal > bVal ? dir : -dir
//     })
//   }, [filteredExpenses, sortConfig])

//   // Pagination
//   const pagination = useMemo(() => {
//     const hasColumnFilters = Object.values(columnFilters).some((value) => String(value || "").trim())
//     const hasTopFilters = filters.search?.trim() || filters.costType !== 'all' || filters.status !== 'all' || filters.paymentMethod !== 'all'

//     if (!hasTopFilters && !hasColumnFilters && !sortConfig.key) {
//       return expensesData?.pagination || {}
//     }

//     const pageSize = 20
//     const totalFiltered = sortedExpenses.length
//     const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
//     const currentPageNum = Math.min(filters.page, totalPages)

//     return {
//       currentPage: currentPageNum,
//       totalPages,
//       totalItems: totalFiltered,
//       pageSize,
//     }
//   }, [sortedExpenses, columnFilters, filters, sortConfig, expensesData?.pagination])

//   const displayRows = useMemo(() => {
//     const hasColumnFilters = Object.values(columnFilters).some((value) => String(value || "").trim())
//     const hasTopFilters = filters.search?.trim() || filters.costType !== 'all' || filters.status !== 'all' || filters.paymentMethod !== 'all'

//     if (!hasTopFilters && !hasColumnFilters && !sortConfig.key) {
//       return sortedExpenses
//     }

//     const pageSize = 20
//     const startIndex = ((pagination.currentPage || 1) - 1) * pageSize
//     return sortedExpenses.slice(startIndex, startIndex + pageSize)
//   }, [sortedExpenses, columnFilters, filters, sortConfig, pagination.currentPage])

//   const summary = expensesData?.summary || {}

//   // Log error if any
//   useEffect(() => {
//     if (error) {
//       console.error('Expenses query error:', error)
//     }
//   }, [error])

//   const createMutation = useCreateExpense()
//   const updateMutation = useUpdateExpense()
//   const deleteMutation = useDeleteExpense()

//   const handleCreate = () => {
//     setEditingExpense(null)
//     setShowForm(true)
//   }

//   const handleEdit = useCallback((expense) => {
//     setEditingExpense(expense)
//     setShowForm(true)
//   }, [])

//   const handleFilterReset = () => {
//     setFilters({
//       search: '',
//       costType: 'all',
//       status: 'all',
//       paymentMethod: 'all',
//       startDate: '',
//       endDate: '',
//       page: 1,
//     })
//   }

//   const handleDelete = useCallback(async (expense) => {
//     if (!confirm(`Are you sure you want to delete expense "${expense.expenseNumber}"?`)) {
//       return
//     }

//     try {
//       await deleteMutation.mutateAsync(expense.id)
//       toast.success("Expense deleted successfully")
//     } catch (error) {
//       console.error('Delete error:', error)
//       toast.error("Failed to delete expense")
//     }
//   }, [deleteMutation])

//   const handleSave = async (formData) => {
//     try {
//       if (editingExpense) {
//         const response = await updateMutation.mutateAsync({
//           id: editingExpense.id,
//           data: formData
//         })
//         if (response?.status === 202) {
//           router.push('/my-requests')
//           setShowForm(false)
//           setEditingExpense(null)
//           return
//         }
//         // hook handles success toast
//       } else {
//         const response = await createMutation.mutateAsync(formData)
//         if (response?.status === 202) {
//           router.push('/my-requests')
//           setShowForm(false)
//           setEditingExpense(null)
//           return
//         }
//         // hook handles success toast
//       }
//       setShowForm(false)
//       setEditingExpense(null)
//     } catch (error) {
//       console.error('Save error:', error)
//       toast.error("Failed to save expense")
//     }
//   }

//   const expenseColumns = useMemo(() => {
//     const statusStyles = {
//       pending: "bg-amber-500/15 text-amber-600 border-amber-200",
//       approved: "bg-emerald-500/15 text-emerald-600 border-emerald-200",
//       rejected: "bg-red-500/15 text-red-600 border-red-200",
//       paid: "bg-blue-500/15 text-blue-600 border-blue-200",
//     }

//     const labels = {
//       cash: 'Cash',
//       card: 'Card',
//       bank_transfer: 'Bank Transfer',
//       cheque: 'Cheque',
//       online: 'Online'
//     }

//     return [
//       {
//         header: "Expense #",
//         accessor: "expenseNumber",
//         filter: {
//           type: "text",
//           value: columnFilters.expenseNumber,
//           onChange: (val) => setColumnFilters((prev) => ({ ...prev, expenseNumber: val })),
//         },
//         render: (row) => (
//           <span className="font-medium">{row.expenseNumber || "—"}</span>
//         ),
//         pdfValue: (row) => row.expenseNumber || "—"
//       },
//       {
//         header: "Date",
//         accessor: "date",
//         filter: {
//           type: "text",
//           value: columnFilters.date,
//           onChange: (val) => setColumnFilters((prev) => ({ ...prev, date: val })),
//         },
//         render: (row) => (
//           <span>
//             {row.date ? new Date(row.date).toLocaleDateString('en-GB') : "—"}
//           </span>
//         ),
//         pdfValue: (row) => row.date ? new Date(row.date).toLocaleDateString('en-GB') : "—"
//       },
//       {
//         header: "Description",
//         accessor: "description",
//         filter: {
//           type: "text",
//           value: columnFilters.description,
//           onChange: (val) => setColumnFilters((prev) => ({ ...prev, description: val })),
//         },
//         render: (row) => (
//           <span className="max-w-[300px] truncate block" title={row.description}>
//             {row.description || "—"}
//           </span>
//         ),
//       },
//       {
//         header: "Cost Type",
//         accessor: "costType",
//         filter: {
//           type: "text",
//           value: columnFilters.costType,
//           onChange: (val) => setColumnFilters((prev) => ({ ...prev, costType: val })),
//         },
//         render: (row) => (
//           <span>{row.costType || "—"}</span>
//         ),
//       },
//       {
//         header: "Amount",
//         accessor: "amount",
//         filter: {
//           type: "text",
//           value: columnFilters.amount,
//           onChange: (val) => setColumnFilters((prev) => ({ ...prev, amount: val })),
//         },
//         render: (row) => (
//           <span className="font-medium">{currency(row.amount || 0)}</span>
//         ),
//         pdfValue: (row) => row.amount || 0
//       },
//       {
//         header: "Total",
//         accessor: "totalCost",
//         render: (row) => (
//           <span className="font-semibold">{currency(row.totalCost || 0)}</span>
//         ),
//         pdfValue: (row) => row.totalCost || 0
//       },
//       {
//         header: "Payment Method",
//         accessor: "paymentMethod",
//         filter: {
//           type: "text",
//           value: columnFilters.paymentMethod,
//           onChange: (val) => setColumnFilters((prev) => ({ ...prev, paymentMethod: val })),
//         },
//         render: (row) => {
//           const method = row.paymentMethod || 'cash'
//           return <span className="capitalize">{labels[method] || method}</span>
//         },
//         pdfValue: (row) => {
//           const method = row.paymentMethod || 'cash'
//           return labels[method] || method
//         }
//       },
//       // {
//       //   header: "Reference",
//       //   accessor: "dispatchOrderNumber",
//       //   render: (row) => (
//       //     row.dispatchOrderId ? (
//       //       <div className="flex flex-col">
//       //         <Link
//       //           href={`/dispatch-orders/${row.dispatchOrderId}`}
//       //           className="text-primary hover:underline font-medium"
//       //         >
//       //           {row.dispatchOrderNumber || "View"}
//       //         </Link>
//       //         {row.supplierName && (
//       //           <span className="text-[10px] text-muted-foreground mt-0.5 bg-muted px-1.5 py-0.5 rounded w-fit leading-none">
//       //             {row.supplierName}
//       //           </span>
//       //         )}
//       //       </div>
//       //     ) : (
//       //       <span className="text-muted-foreground">—</span>
//       //     )
//       //   ),
//       //   pdfValue: (row) => row.dispatchOrderNumber || row.supplierName || "—"
//       // },
//       // {
//       //   header: "Status",
//       //   accessor: "status",
//       //   render: (row) => (
//       //     <Badge className={statusStyles[row.status] || statusStyles.pending}>
//       //       {row.status || 'pending'}
//       //     </Badge>
//       //   ),
//       //   pdfValue: (row) => (row.status || 'pending').toUpperCase()
//       // },
//       {
//         header: "Actions",
//         accessor: "actions",
//         render: (row) => (
//           <div className="flex items-center gap-2">
//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={() => handleEdit(row)}
//               className="h-8 w-8 p-0"
//               title="Edit"
//             >
//               <Edit className="h-4 w-4" />
//             </Button>
//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={() => handleDelete(row)}
//               className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
//               title="Delete"
//             >
//               <Trash2 className="h-4 w-4" />
//             </Button>
//           </div>
//         ),
//       },
//     ]
//   }, [handleEdit, handleDelete, columnFilters])  // <-- add your dependencies here
//   const handleDownloadPDF = async () => {
//     try {
//       const result = await exportToPDF({
//         title: "Expenses Report",
//         columns: expenseColumns.filter(c => c.header !== "Actions"),
//         data: expenses,
//         filename: `Expenses_Report_${new Date().toLocaleDateString('en-CA')}`
//       })
//       if (result.success) {
//         toast.success("PDF report downloaded!")
//       } else {
//         toast.error("Failed to generate PDF")
//       }
//     } catch (err) {
//       toast.error("PDF generation failed: " + err.message)
//     }
//   }

//   // Calculate summary stats
//   const totalExpenses = expensesData?.summary?.totalAmount ?? expenses.reduce((sum, e) => sum + (e.totalCost || 0), 0)
//   const cashExpenses = expensesData?.summary?.cashAmount ?? expenses
//     .filter(e => e.paymentMethod === 'cash')
//     .reduce((sum, e) => sum + (e.totalCost || 0), 0)
//   const bankExpenses = expensesData?.summary?.bankAmount ?? expenses
//     .filter(e => ['card', 'bank_transfer', 'cheque', 'online'].includes(e.paymentMethod))
//     .reduce((sum, e) => sum + (e.totalCost || 0), 0)

//   return (
//     <div className="space-y-6 ">
//       {/* Header - Enhanced */}
//       <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
//         <div className="">
//           <BackButton fallbackPath="/home" label="Back" />
//         </div>

//         <Button onClick={handleCreate} className="gap-2 h-11 px-6 shadow-sm">
//           <Plus className="h-4 w-4" />
//           Add Expense
//         </Button>
//       </header>

//       {/* Summary Cards - Modern Design */}
//       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//         {/* Total Expenses */}
//         <div className="rounded-lg border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
//           <div className="flex items-center justify-between mb-3">
//           </div>
//           <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
//             Total Expenses
//           </div>
//           <div className="text-2xl font-bold text-foreground tabular-nums">
//             {currency(totalExpenses)}
//           </div>
//         </div>

//         {/* Cash Expenses */}
//         <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-emerald-50/30 p-5 shadow-sm hover:shadow-md transition-shadow">

//           <div className="text-xs font-medium text-emerald-700/80 uppercase tracking-wider mb-1">
//             Cash Expenses
//           </div>
//           <div className="text-2xl font-bold text-emerald-700 tabular-nums">
//             {currency(cashExpenses)}
//           </div>
//         </div>

//         {/* Bank Expenses */}
//         <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50/50 to-blue-50/30 p-5 shadow-sm hover:shadow-md transition-shadow">

//           <div className="text-xs font-medium text-blue-700/80 uppercase tracking-wider mb-1">
//             Bank Expenses
//           </div>
//           <div className="text-2xl font-bold text-blue-700 tabular-nums">
//             {currency(bankExpenses)}
//           </div>
//         </div>
//       </div>

//       {error && (
//         <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
//           <AlertCircle className="h-5 w-5" />
//           <p className="text-sm font-medium">Failed to load expenses. Please try again later.</p>
//         </div>
//       )}

//       {/* Filters & Search Bar - Compact */}
//       <div className="rounded-lg border border-border bg-card p-2 sm:p-3 shadow-sm">
//         <div className="flex flex-wrap items-end gap-2 sm:gap-3">
//           {/* Date Range Filter */}
//           <div className="flex flex-col gap-1">
//             <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">From Date</Label>
//             <BritishDatePicker
//               value={filters.startDate || null}
//               onChange={(date) =>
//                 updateFilters({ startDate: date ? date.toLocaleDateString('en-CA') : '' })
//               }
//               className="h-9 w-full sm:w-[140px]"
//               placeholder="From date"
//             />
//           </div>

//           <div className="flex flex-col gap-1">
//             <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">To Date</Label>
//             <BritishDatePicker
//               value={filters.endDate || null}
//               onChange={(date) =>
//                 updateFilters({ endDate: date ? date.toLocaleDateString('en-CA') : '' })
//               }
//               className="h-9 w-full sm:w-[140px]"
//               placeholder="To date"
//             />
//           </div>

//           {/* Cost Type Filter */}
//           <div className="flex flex-col gap-1">
//             <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Cost Type</Label>
//             <Select
//               value={filters.costType}
//               onValueChange={(value) => setFilters(prev => ({ ...prev, costType: value }))}
//             >
//               <SelectTrigger className="h-9 w-full sm:w-[160px] border-border">
//                 <SelectValue placeholder="All Cost Types" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Cost Types</SelectItem>
//                 {costTypes?.map((type) => (
//                   <SelectItem key={type.id} value={type.id}>
//                     {type.name}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>

          

//           {/* Payment Method Filter */}
//           <div className="flex flex-col gap-1">
//             <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Payment</Label>
//             <Select
//               value={filters.paymentMethod}
//               onValueChange={(value) => setFilters(prev => ({ ...prev, paymentMethod: value }))}
//             >
//               <SelectTrigger className="h-9 w-full sm:w-[160px] border-border">
//                 <SelectValue placeholder="All Payment Types" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Payment Types</SelectItem>
//                 <SelectItem value="cash">Cash</SelectItem>
//                 <SelectItem value="bank_transfer">Bank</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>

//           {/* Action Buttons */}
//           <div className="flex items-end gap-2 ml-auto">
//             <Button
//               variant="outline"
//               size="sm"
//               className="h-9 w-9 p-0 border-border"
//               onClick={handleFilterReset}
//               title="Clear Filters"
//             >
//               <RotateCcw className="h-4 w-4" />
//             </Button>
//           </div>
//         </div>
//       </div>

//       <DataTable
//         columns={expenseColumns}
//         data={displayRows}
//         onDownloadPDF={handleDownloadPDF}
//         isLoading={isLoading}
//         enableSearch={false}
//         onSearch={(val) => setFilters(prev => ({ ...prev, search: val, page: 1 }))}
//         manualPagination={true}
//         currentPage={pagination.currentPage || 1}
//         totalPages={pagination.totalPages || 1}
//         totalItems={pagination.totalItems || 0}
//         onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
//         enableColumnFilters={true}
//         sortConfig={sortConfig}
//         onSortChange={setSortConfig}
//       />

//       {/* Form Dialog */}
//       <FormDialog
//         open={showForm}
//         onOpenChange={(open) => {
//           setShowForm(open)
//           if (!open) setEditingExpense(null)
//         }}
//         title={editingExpense ? "Edit Expense" : "Add Expense"}
//       >
//         <ExpenseFormNew
//           expense={editingExpense}
//           onSave={handleSave}
//           onCancel={() => {
//             setShowForm(false)
//             setEditingExpense(null)
//           }}
//           isLoading={createMutation.isPending || updateMutation.isPending}
//         />
//       </FormDialog>
//     </div>
//   )
// }
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
import { Plus, Trash2, Edit, AlertCircle } from "lucide-react"
import BritishDatePicker from "@/components/BritishDatePicker"
import { Label } from "@/components/ui/label"
import DataTableFiltered from "@/components/data-table-filtered"

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatLocalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function ExpensesPage() {
  const router = useRouter()
  
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [dateRange, setDateRange] = useState({ from: "", to: "" })
  
  // NEW STATE: Catch the dynamic data reported back by the DataTable
  const [currentFilteredData, setCurrentFilteredData] = useState(null)

  const { data: expensesData, isLoading, error } = useExpenses({
    limit: 5000,
    startDate: dateRange.from || undefined,
    endDate: dateRange.to || undefined,
  })

  const expenses = useMemo(() => {
    if (!expensesData) return []
    if (Array.isArray(expensesData.data)) return expensesData.data
    if (Array.isArray(expensesData)) return expensesData
    return []
  }, [expensesData])

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
      } else {
        const response = await createMutation.mutateAsync(formData)
        if (response?.status === 202) {
          router.push('/my-requests')
          setShowForm(false)
          setEditingExpense(null)
          return
        }
      }
      setShowForm(false)
      setEditingExpense(null)
    } catch (error) {
      console.error('Save error:', error)
      toast.error("Failed to save expense")
    }
  }

  const expenseColumns = useMemo(() => {
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
        filterType: "text",
        filterValue: (row) => row.expenseNumber || "—",
        pdfValue: (row) => row.expenseNumber || "—",
        render: (row) => (
          <span className="font-medium">{row.expenseNumber || "—"}</span>
        ),
      },
      {
        header: "Date",
        accessor: "date",
        filterType: "date-picker",
        filterValue: (row) => row.date ? new Date(row.date).toLocaleDateString('en-CA') : "",
        pdfValue: (row) => row.date ? new Date(row.date).toLocaleDateString('en-GB') : "—",
        render: (row) => (
          <span>
            {row.date ? new Date(row.date).toLocaleDateString('en-GB') : "—"}
          </span>
        ),
      },
      {
        header: "Description",
        accessor: "description",
        filterType: "text",
        filterValue: (row) => row.description || "—",
        pdfValue: (row) => row.description || "—",
        render: (row) => (
          <span className="max-w-[300px] truncate block" title={row.description}>
            {row.description || "—"}
          </span>
        ),
      },
      {
        header: "Cost Type",
        accessor: "costType",
        filterType: "autocomplete",
        filterValue: (row) => row.costType || "—",
        pdfValue: (row) => row.costType || "—",
        render: (row) => (
          <span>{row.costType || "—"}</span>
        ),
      },
      {
        header: "Amount",
        accessor: "amount",
        filterType: "text",
        filterValue: (row) => String(row.amount || 0),
        pdfValue: (row) => row.amount || 0,
        render: (row) => (
          <span className="font-medium">{currency(row.amount || 0)}</span>
        ),
      },
      {
        header: "Total",
        accessor: "totalCost",
        filterType: "text",
        filterValue: (row) => String(row.totalCost || 0),
        pdfValue: (row) => row.totalCost || 0,
        render: (row) => (
          <span className="font-semibold">{currency(row.totalCost || 0)}</span>
        ),
      },
      {
        header: "Payment Method",
        accessor: "paymentMethod",
        filterType: "autocomplete",
        filterValue: (row) => {
          const method = row.paymentMethod || 'cash'
          return labels[method] || method
        },
        pdfValue: (row) => {
          const method = row.paymentMethod || 'cash'
          return labels[method] || method
        },
        render: (row) => {
          const method = row.paymentMethod || 'cash'
          return <span className="capitalize">{labels[method] || method}</span>
        },
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
  }, [handleEdit, handleDelete])

  const handleDownloadPDF = async () => {
    try {
      const dataToExport = currentFilteredData || expenses; // Export what's visible!
      const result = await exportToPDF({
        title: "Expenses Report",
        columns: expenseColumns.filter(c => c.header !== "Actions"),
        data: dataToExport,
        dateRange: dateRange,
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

  // UPDATED: Calculate summary stats using the dynamic table data!
  // If the table hasn't reported back yet, fall back to the raw expenses list.
  const dataToSum = currentFilteredData || expenses;

  const totalExpenses = dataToSum.reduce((sum, e) => sum + (e.totalCost || 0), 0)
  const cashExpenses = dataToSum
    .filter(e => e.paymentMethod === 'cash')
    .reduce((sum, e) => sum + (e.totalCost || 0), 0)
  const bankExpenses = dataToSum
    .filter(e => ['card', 'bank_transfer', 'cheque', 'online'].includes(e.paymentMethod))
    .reduce((sum, e) => sum + (e.totalCost || 0), 0)

  useEffect(() => {
    if (error) {
      console.error('Expenses query error:', error)
    }
  }, [error])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BackButton fallbackPath="/home" label="Back" />
        </div>
        <Button onClick={handleCreate} className="gap-2 h-11 px-6 shadow-sm">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Expenses */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Total Expenses
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums transition-all">
            {currency(totalExpenses)}
          </div>
        </div>

        {/* Cash Expenses */}
        <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-emerald-50/30 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-medium text-emerald-700/80 uppercase tracking-wider mb-1">
            Cash Expenses
          </div>
          <div className="text-2xl font-bold text-emerald-700 tabular-nums transition-all">
            {currency(cashExpenses)}
          </div>
        </div>

        {/* Bank Expenses */}
        <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50/50 to-blue-50/30 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-medium text-blue-700/80 uppercase tracking-wider mb-1">
            Bank Expenses
          </div>
          <div className="text-2xl font-bold text-blue-700 tabular-nums transition-all">
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

      {/* Main Content Area */}
      <div className="space-y-4">
        <div className="flex flex-row items-end gap-3 mb-4">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">From Date</Label>
            <BritishDatePicker
              value={dateRange.from || null}
              onChange={(date) => {
                setDateRange(r => ({ ...r, from: date ? formatLocalDate(date) : "" }))
              }}
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">To Date</Label>
            <BritishDatePicker
              value={dateRange.to || null}
              onChange={(date) => {
                setDateRange(r => ({ ...r, to: date ? formatLocalDate(date) : "" }))
              }}
            />
          </div>
        </div>

        <DataTableFiltered
          title="Expenses"
          columns={expenseColumns}
          data={expenses}
          onFilteredDataChange={setCurrentFilteredData} // <--- CATCH THE DATA HERE
          onDownloadPDF={handleDownloadPDF}
          loading={isLoading}
          enableSearch={true}
          paginate={true}
          manualPagination={false}
          pageSize={20}
          enableColumnFilters={true}
          compact={true}
        />
      </div>

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