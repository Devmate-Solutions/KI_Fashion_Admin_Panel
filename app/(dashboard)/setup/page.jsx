"use client"

import { useMemo, useState } from "react"
import Tabs from "../../../components/tabs"
import DataTable from "../../../components/data-table"
import FormDialog from "../../../components/form-dialog"
import { AddBuyerForm, EditBuyerForm } from "../../../components/forms/buyer-form"
import { AddSupplierForm, EditSupplierForm } from "../../../components/forms/supplier-form"
import { useBuyers, useCreateBuyer, useUpdateBuyer, useDeleteBuyer } from "../../../lib/hooks/useBuyers"
import { useSuppliers, useAllSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from "../../../lib/hooks/useSuppliers"

function currency(n) {
  const num = Number(n || 0)
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function SetupPage() {
  // Fetch buyers data from backend
  const { data: buyersData = [], isLoading: buyersLoading } = useBuyers()
  
  // Mutations for buyers
  const createBuyerMutation = useCreateBuyer()
  const updateBuyerMutation = useUpdateBuyer()
  const deleteBuyerMutation = useDeleteBuyer()

  // Fetch all suppliers for setup management (including those without user accounts)
  const { data: suppliersData = [], isLoading: suppliersLoading } = useAllSuppliers()

  // Mutations for suppliers
  const createSupplierMutation = useCreateSupplier()
  const updateSupplierMutation = useUpdateSupplier()
  const deleteSupplierMutation = useDeleteSupplier()

  // Buyer state
  const [openAddBuyerForm, setOpenAddBuyerForm] = useState(false)
  const [openEditBuyerForm, setOpenEditBuyerForm] = useState(false)
  const [editingBuyer, setEditingBuyer] = useState(null)

  // Supplier state
  const [openAddSupplierForm, setOpenAddSupplierForm] = useState(false)
  const [openEditSupplierForm, setOpenEditSupplierForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)

  const buyerColumns = useMemo(
    () => [
      { header: "Name", accessor: "name" },
      { header: "Company", accessor: "company", render: (row) => row.company || '-' },
      { 
        header: "Phone", 
        accessor: "phone",
        render: (row) => {
          const areaCode = row.phoneAreaCode ? `${row.phoneAreaCode}-` : '';
          return areaCode + (row.phone || '-');
        }
      },
      { 
        header: "Landline", 
        accessor: "landline", 
        render: (row) => {
          const areaCode = row.landlineAreaCode ? `${row.landlineAreaCode}-` : '';
          return areaCode + (row.landline || '-');
        }
      },
      { header: "Contact Person", accessor: "contactPerson", render: (row) => row.contactPerson || '-' },
      { header: "Email", accessor: "email", render: (row) => row.email || '-' },
    ],
    [],
  )

  // Handle buyer CRUD operations
  const handleAddBuyer = async (formData) => {
    console.log('handleAddBuyer called with:', formData);
    try {
      console.log('Calling createBuyerMutation.mutateAsync...');
      const result = await createBuyerMutation.mutateAsync(formData);
      console.log('Create buyer success:', result);
      setOpenAddBuyerForm(false);
    } catch (error) {
      console.error('Error creating buyer:', error);
      console.error('Error response:', error.response?.data);
    }
  }

  const handleEditBuyer = (buyer) => {
    setEditingBuyer(buyer._original || buyer)
    setOpenEditBuyerForm(true)
  }

  const handleUpdateBuyer = async (formData) => {
    try {
      await updateBuyerMutation.mutateAsync({ 
        id: editingBuyer._id || editingBuyer.id, 
        data: formData 
      })
      setOpenEditBuyerForm(false)
      setEditingBuyer(null)
    } catch (error) {
      console.error('Error updating buyer:', error)
    }
  }

  const handleDeleteBuyer = async (buyer) => {
    console.log('handleDeleteBuyer called with buyer:', buyer);
    if (window.confirm(`Are you sure you want to delete buyer "${buyer.name}"? This will deactivate the buyer.`)) {
      try {
        console.log('Calling deleteBuyerMutation.mutateAsync with id:', buyer.id);
        const result = await deleteBuyerMutation.mutateAsync(buyer.id);
        console.log('Delete buyer success:', result);
      } catch (error) {
        console.error('Error deleting buyer:', error);
        console.error('Error response:', error.response?.data);
      }
    }
  }

  // Handle supplier CRUD operations
  const handleAddSupplier = async (formData) => {
    console.log('handleAddSupplier called with:', formData);
    try {
      const result = await createSupplierMutation.mutateAsync(formData);
      console.log('Create supplier success:', result);
      setOpenAddSupplierForm(false);
    } catch (error) {
      console.error('Error creating supplier:', error);
    }
  }

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier._original || supplier)
    setOpenEditSupplierForm(true)
  }

  const handleUpdateSupplier = async (formData) => {
    try {
      await updateSupplierMutation.mutateAsync({ 
        id: editingSupplier._id || editingSupplier.id, 
        data: formData 
      })
      setOpenEditSupplierForm(false)
      setEditingSupplier(null)
    } catch (error) {
      console.error('Error updating supplier:', error)
    }
  }

  const handleDeleteSupplier = async (supplier) => {
    console.log('handleDeleteSupplier called with supplier:', supplier);
    if (window.confirm(`Are you sure you want to delete supplier "${supplier.name}"? This will deactivate the supplier.`)) {
      try {
        const result = await deleteSupplierMutation.mutateAsync(supplier.id);
        console.log('Delete supplier success:', result);
      } catch (error) {
        console.error('Error deleting supplier:', error);
      }
    }
  }

  // Suppliers
  const supplierColumns = useMemo(
    () => [
      { header: "Name", accessor: "name" },
      { header: "Company", accessor: "company", render: (row) => row.company || '-' },
      { 
        header: "Phone", 
        accessor: "phone",
        render: (row) => {
          const areaCode = row.phoneAreaCode ? `${row.phoneAreaCode}-` : '';
          return areaCode + (row.phone || '-');
        }
      },
      { header: "Email", accessor: "email", render: (row) => row.email || '-' },
      { 
        header: "Country", 
        accessor: "country",
        render: (row) => row.address?.country || row.country || '-'
      },
      { header: "Additional Phone", accessor: "alternatePhone", render: (row) => row.alternatePhone || '-' },
    ],
    [],
  )

  return (
    <div className="mx-auto max-w-[1600px] p-4">
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Setup</h1>
            <p className="text-sm text-muted-foreground">Manage buyers and suppliers.</p>
          </div>
        </div>
      </header>

      <Tabs
        tabs={[
          {
            label: "Buyer",
            content: (
              <div className="space-y-4">
                <DataTable
                  title="Buyer"
                  columns={buyerColumns}
                  data={buyersData}
                  loading={buyersLoading}
                  onAddNew={() => setOpenAddBuyerForm(true)}
                  onEdit={handleEditBuyer}
                  onDelete={handleDeleteBuyer}
                />
                {/* Legacy reference (must use Source URL) */}
                <details className="rounded-[4px] border border-border bg-card p-3">
                  <summary className="cursor-pointer text-sm">Legacy reference: Buyer</summary>
                  <div className="mt-3 overflow-hidden rounded-[4px] border border-border">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Setup_%20Buyer-rV23ZvLaYZsy8e4zhNxieiYNWBJwXM.png"
                      alt="Legacy Buyer screen"
                      className="w-full h-auto"
                    />
                  </div>
                </details>
              </div>
            ),
          },
          {
            label: "Supplier",
            content: (
              <div className="space-y-4">
                <DataTable
                  title="Supplier"
                  columns={supplierColumns}
                  data={suppliersData}
                  loading={suppliersLoading}
                  onAddNew={() => setOpenAddSupplierForm(true)}
                  onEdit={handleEditSupplier}
                  onDelete={handleDeleteSupplier}
                />
                {/* Legacy reference (must use Source URL) */}
                <details className="rounded-[4px] border border-border bg-card p-3">
                  <summary className="cursor-pointer text-sm">Legacy reference: Supplier</summary>
                  <div className="mt-3 overflow-hidden rounded-[4px] border border-border">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Setup_%20Supplier-j45k4iOh6e5z1jtX1wvYzebaAKVWw4.png"
                      alt="Legacy Supplier screen"
                      className="w-full h-auto"
                    />
                  </div>
                </details>
              </div>
            ),
          },
        ]}
      />

      {/* Buyer Forms */}
      <AddBuyerForm
        open={openAddBuyerForm}
        onClose={() => setOpenAddBuyerForm(false)}
        onSubmit={handleAddBuyer}
        loading={createBuyerMutation.isPending}
      />

      <EditBuyerForm
        open={openEditBuyerForm}
        buyer={editingBuyer}
        onClose={() => {
          setOpenEditBuyerForm(false)
          setEditingBuyer(null)
        }}
        onSubmit={handleUpdateBuyer}
        loading={updateBuyerMutation.isPending}
      />

      {/* Supplier Forms */}
      <AddSupplierForm
        open={openAddSupplierForm}
        onClose={() => setOpenAddSupplierForm(false)}
        onSubmit={handleAddSupplier}
        loading={createSupplierMutation.isPending}
      />

      <EditSupplierForm
        open={openEditSupplierForm}
        supplier={editingSupplier}
        onClose={() => {
          setOpenEditSupplierForm(false)
          setEditingSupplier(null)
        }}
        onSubmit={handleUpdateSupplier}
        loading={updateSupplierMutation.isPending}
      />
    </div>
  )
}
