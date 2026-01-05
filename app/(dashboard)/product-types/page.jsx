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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Product Types</h1>
          <p className="text-sm text-gray-500">Manage product categories and types</p>
        </div>
        <Button onClick={() => setOpenAddForm(true)}>
          Add Product Type
        </Button>
      </div>

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
