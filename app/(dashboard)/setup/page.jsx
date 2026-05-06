"use client"

import { useMemo, useState } from "react"
import BackButton from "@/components/BackButton"
import Tabs from "../../../components/tabs"
import DataTable from "../../../components/data-table"
import FormDialog from "../../../components/form-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AddBuyerForm, EditBuyerForm } from "../../../components/forms/buyer-form"
import { AddSupplierForm, EditSupplierForm } from "../../../components/forms/supplier-form"
import { useBuyers, useCreateBuyer, useUpdateBuyer, useDeleteBuyer } from "../../../lib/hooks/useBuyers"
import { useAllSuppliers, useCreateSupplier, useUpdateSupplier, useHardDeleteSupplier, useSupplierDeleteSummary } from "../../../lib/hooks/useSuppliers"
import { useAuthStore } from "@/store/store"

function currency(n) {
  const num = Number(n || 0)
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function SetupPage() {
  const user = useAuthStore((state) => state.user)
  const isSuperAdmin = user?.role === "super-admin"

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
  const hardDeleteSupplierMutation = useHardDeleteSupplier()

  // Buyer state
  const [openAddBuyerForm, setOpenAddBuyerForm] = useState(false)
  const [openEditBuyerForm, setOpenEditBuyerForm] = useState(false)
  const [editingBuyer, setEditingBuyer] = useState(null)

  // Supplier state
  const [openAddSupplierForm, setOpenAddSupplierForm] = useState(false)
  const [openEditSupplierForm, setOpenEditSupplierForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [supplierDeleteTarget, setSupplierDeleteTarget] = useState(null)

  const {
    data: supplierDeleteSummary,
    isLoading: supplierDeleteSummaryLoading,
  } = useSupplierDeleteSummary(supplierDeleteTarget?.id, Boolean(supplierDeleteTarget?.id))

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
     
    try {
       
      const result = await createBuyerMutation.mutateAsync({
        ...formData,
        createUserAccount: true,
      });
       
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
     
    if (window.confirm(`Are you sure you want to delete buyer "${buyer.name}"? This will deactivate the buyer.`)) {
      try {
         
        const result = await deleteBuyerMutation.mutateAsync(buyer.id);
         
      } catch (error) {
        console.error('Error deleting buyer:', error);
        console.error('Error response:', error.response?.data);
      }
    }
  }

  // Handle supplier CRUD operations
  const handleAddSupplier = async (formData) => {
     
    try {
      const result = await createSupplierMutation.mutateAsync(formData);
       
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
    if (!isSuperAdmin) {
      return
    }

    setSupplierDeleteTarget(supplier)
  }

  const handleConfirmSupplierDelete = async () => {
    if (!supplierDeleteTarget) {
      return
    }

    try {
      await hardDeleteSupplierMutation.mutateAsync(supplierDeleteTarget.id)
      setSupplierDeleteTarget(null)
    } catch (error) {
      console.error('Error permanently deleting supplier:', error)
    }
  }

  const supplierDeleteCounts = supplierDeleteSummary?.counts || {}
  const supplierDeleteImpactItems = [
    ["Products deleted", supplierDeleteCounts.productsToDelete],
    ["Product mappings removed", supplierDeleteCounts.productMappingsToRemove],
    ["Dispatch orders deleted", supplierDeleteCounts.dispatchOrdersToDelete],
    ["Supplier ledger entries deleted", supplierDeleteCounts.supplierLedgerEntriesToDelete],
    ["Dispatch-linked ledger entries deleted", supplierDeleteCounts.dispatchLinkedLedgerEntriesToDelete],
    ["Supplier payment receipts deleted", supplierDeleteCounts.supplierPaymentReceiptsToDelete],
    ["Returns deleted", supplierDeleteCounts.returnsToDelete],
    ["Packet stock records deleted", supplierDeleteCounts.packetStockToDelete],
    ["Packet templates deleted", supplierDeleteCounts.packetTemplatesToDelete],
    ["Inventory records deleted", supplierDeleteCounts.inventoryRecordsToDelete],
    ["Inventory purchase batches removed", supplierDeleteCounts.inventoryPurchaseBatchesToRemove],
    ["Supplier users deleted", supplierDeleteCounts.supplierUsersToDelete],
    ["Linked users unlinked", supplierDeleteCounts.linkedUsersToUnlink],
  ].filter(([, count]) => Number(count || 0) > 0)

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
    <div className="space-y-6">
      <div className="mb-3">
        <BackButton fallbackPath="/home" label="Back" />
      </div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Setup</h1>
          <p className="text-sm text-muted-foreground">Manage buyers and suppliers.</p>
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
                  onDelete={isSuperAdmin ? handleDeleteSupplier : undefined}
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

      <AlertDialog open={!!supplierDeleteTarget} onOpenChange={(open) => !open && setSupplierDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {supplierDeleteTarget?.name || 'this supplier'} and all related operational and financial records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-destructive">
              Hard delete includes dispatch orders, supplier ledger history, payment receipts, returns, packet stock, inventory links, and supplier portal accounts.
            </div>

            {supplierDeleteSummaryLoading ? (
              <p className="text-muted-foreground">Loading impact summary...</p>
            ) : supplierDeleteSummary ? (
              <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between font-medium">
                  <span>Total affected records</span>
                  <span>{supplierDeleteSummary.totalAffectedRecords || 0}</span>
                </div>
                {supplierDeleteImpactItems.length > 0 ? (
                  <div className="space-y-1 text-muted-foreground">
                    {supplierDeleteImpactItems.map(([label, count]) => (
                      <div key={label} className="flex items-center justify-between gap-4">
                        <span>{label}</span>
                        <span className="font-medium text-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No related records were found beyond the supplier profile.</p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Unable to load delete impact summary.</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={hardDeleteSupplierMutation.isPending}>Keep Supplier</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSupplierDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={hardDeleteSupplierMutation.isPending || supplierDeleteSummaryLoading}
            >
              {hardDeleteSupplierMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
