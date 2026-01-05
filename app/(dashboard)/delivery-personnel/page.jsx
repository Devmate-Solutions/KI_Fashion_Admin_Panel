"use client"

import { useMemo, useState } from "react"
import DataTable from "../../../components/data-table"
import { DeliveryPersonnelForm } from "../../../components/forms/delivery-personnel-form"
import { useDeliveryPersonnel, useCreateDeliveryPersonnel, useUpdateDeliveryPersonnel, useDeleteDeliveryPersonnel } from "../../../lib/hooks/useDeliveryPersonnel"
import { Button } from "../../../components/ui/button"

export default function DeliveryPersonnelPage() {
  const { data: personnelData = [], isLoading } = useDeliveryPersonnel()
  const createMutation = useCreateDeliveryPersonnel()
  const updateMutation = useUpdateDeliveryPersonnel()
  const deleteMutation = useDeleteDeliveryPersonnel()

  const [openAddForm, setOpenAddForm] = useState(false)
  const [openEditForm, setOpenEditForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const columns = useMemo(
    () => [
      { header: "Name", accessor: "name" },
      { 
        header: "Phone", 
        accessor: "phone",
        render: (row) => {
          const areaCode = row.phoneAreaCode ? `${row.phoneAreaCode}-` : '';
          return areaCode + (row.phone || '-');
        }
      },
      { header: "Email", accessor: "email" },
      { header: "Vehicle Number", accessor: "vehicleNumber" },
      {
        header: "Vehicle Type",
        accessor: "vehicleType",
        render: (row) => row.vehicleType ? (
          <span className="capitalize">{row.vehicleType}</span>
        ) : 'N/A'
      },
      {
        header: "Status",
        accessor: "status",
        render: (row) => (
          <span className={`px-2 py-1 text-xs rounded-full capitalize ${
            row.status === 'active' ? 'bg-green-100 text-green-800' :
            row.status === 'on-leave' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {row.status}
          </span>
        )
      },
      {
        header: "Deliveries",
        accessor: "totalDeliveries",
        render: (row) => `${row.completedDeliveries || 0} / ${row.totalDeliveries || 0}`
      },
      {
        header: "Rating",
        accessor: "rating",
        render: (row) => row.rating ? `⭐ ${row.rating.toFixed(1)}` : 'N/A'
      },
    ],
    []
  )

  const handleAdd = async (formData) => {
    try {
      await createMutation.mutateAsync(formData)
      setOpenAddForm(false)
    } catch (error) {
      console.error('Error creating delivery personnel:', error)
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
      console.error('Error updating delivery personnel:', error)
    }
  }

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete delivery personnel "${item.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(item.id)
      } catch (error) {
        console.error('Error deleting delivery personnel:', error)
      }
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Delivery Personnel</h1>
          <p className="text-sm text-gray-500">Manage delivery staff and track performance</p>
        </div>
        <Button onClick={() => setOpenAddForm(true)}>
          Add Delivery Personnel
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={personnelData}
        loading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <DeliveryPersonnelForm
        open={openAddForm}
        onClose={() => setOpenAddForm(false)}
        onSubmit={handleAdd}
        loading={createMutation.isPending}
      />

      <DeliveryPersonnelForm
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
