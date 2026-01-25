"use client"

import { useMemo, useState } from "react"
import DataTable from "../../../components/data-table"
import { ProductTypeForm } from "../../../components/forms/product-type-form"
import { useProductTypes, useCreateProductType, useUpdateProductType, useDeleteProductType } from "../../../lib/hooks/useProductTypes"
import { Button } from "../../../components/ui/button"

export default function ProductTypesPage() {
  const { data: productTypesData = [], isLoading } = useProductTypes()
  const createMutation = useCreateProductType()
  const updateMutation = useUpdateProductType()
  const deleteMutation = useDeleteProductType()

  const [openAddForm, setOpenAddForm] = useState(false)
  const [openEditForm, setOpenEditForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const columns = useMemo(
    () => [
      { header: "Name", accessor: "name" },
      {
        header: "Category",
        accessor: "category",
        render: (row) => row.category || 'N/A'
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
      console.error('Error creating product type:', error)
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
      console.error('Error updating product type:', error)
    }
  }

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete product type "${item.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(item.id)
      } catch (error) {
        console.error('Error deleting product type:', error)
      }
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Product Types</h1>
          <p className="text-sm text-muted-foreground">Manage product categories and types</p>
        </div>
        <Button onClick={() => setOpenAddForm(true)} className="h-9 sm:h-10">
          Add Product Type
        </Button>
      </header>

      <DataTable
        columns={columns}
        data={productTypesData}
        loading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ProductTypeForm
        open={openAddForm}
        onClose={() => setOpenAddForm(false)}
        onSubmit={handleAdd}
        loading={createMutation.isPending}
      />

      <ProductTypeForm
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
