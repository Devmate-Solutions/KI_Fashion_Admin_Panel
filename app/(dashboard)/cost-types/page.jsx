"use client"

import { useMemo, useState } from "react"
import DataTable from "../../../components/data-table"
import { CostTypeForm } from "../../../components/forms/cost-type-form"
import { useCostTypes, useCreateCostType, useUpdateCostType, useDeleteCostType } from "../../../lib/hooks/useCostTypes"
import { Button } from "../../../components/ui/button"

export default function CostTypesPage() {
  const { data: costTypesData = [], isLoading } = useCostTypes()
  const createMutation = useCreateCostType()
  const updateMutation = useUpdateCostType()
  const deleteMutation = useDeleteCostType()

  const [openAddForm, setOpenAddForm] = useState(false)
  const [openEditForm, setOpenEditForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const columns = useMemo(
    () => [
      {
        header: "Cost Type ID",
        accessor: "typeId",
        render: (row) => (
          <span className="font-mono font-semibold">{row.typeId}</span>
        )
      },
      { header: "Name", accessor: "name" },
      {
        header: "Category",
        accessor: "category",
        render: (row) => (
          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 capitalize">
            {row.category || 'N/A'}
          </span>
        )
      },
      {
        header: "Description",
        accessor: "description",
        render: (row) => (
          <span className="max-w-md truncate block">{row.description || 'N/A'}</span>
        )
      },
      {
        header: "Created",
        accessor: "createdAt",
        render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : 'N/A'
      },
    ],
    []
  )

  const handleAdd = async (formData) => {
    try {
      await createMutation.mutateAsync(formData)
      setOpenAddForm(false)
    } catch (error) {
      console.error('Error creating cost type:', error)
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item._original || item)
    setOpenEditForm(true)
  }

  const handleUpdate = async (formData) => {
    try {
      await updateMutation.mutateAsync({
        id: editingItem._id || editingItem.id,
        data: formData
      })
      setOpenEditForm(false)
      setEditingItem(null)
    } catch (error) {
      console.error('Error updating cost type:', error)
    }
  }

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete cost type "${item.name}" (${item.typeId})?`)) {
      try {
        await deleteMutation.mutateAsync(item.id)
      } catch (error) {
        console.error('Error deleting cost type:', error)
      }
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cost Types</h1>
          <p className="text-sm text-gray-500">Manage expense categories (A1=Meals, B1=Marketing, etc.)</p>
        </div>
        <Button onClick={() => setOpenAddForm(true)}>
          Add Cost Type
        </Button>
      </div>

      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold mb-2">Cost Type ID Format</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Use Letter + Number format: A1 (Meals & Food), A2 (Office Supplies), B1 (Marketing), C1 (Rent), etc.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={costTypesData}
        loading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <CostTypeForm
        open={openAddForm}
        onClose={() => setOpenAddForm(false)}
        onSubmit={handleAdd}
        loading={createMutation.isPending}
      />

      <CostTypeForm
        open={openEditForm}
        onClose={() => {
          setOpenEditForm(false)
          setEditingItem(null)
        }}
        onSubmit={handleUpdate}
        initialData={editingItem}
        loading={updateMutation.isPending}
      />
    </div>
  )
}
