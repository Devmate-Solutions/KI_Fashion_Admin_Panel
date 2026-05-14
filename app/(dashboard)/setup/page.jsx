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
import { useSettings, useUpdateSettings } from "../../../lib/hooks/useSettings"
import { useAuthStore } from "@/store/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Percent } from "lucide-react"

function currency(n) {
  const num = Number(n || 0)
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function SetupPage() {
  const user = useAuthStore((state) => state.user)
  const isSuperAdmin = user?.role === "super-admin"

  // Settings management
  const { data: settingsData, isLoading: settingsLoading } = useSettings()
  const updateSettingsMutation = useUpdateSettings()
  const [commissionRate, setCommissionRate] = useState("")

  // Update commission rate local state when settings data is loaded
  useMemo(() => {
    if (settingsData?.reports?.commissionRate !== undefined) {
      setCommissionRate(settingsData.reports.commissionRate)
    }
  }, [settingsData])

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    try {
      await updateSettingsMutation.mutateAsync({
        reports: {
          commissionRate: Number(commissionRate)
        }
      })
    } catch (err) {
      console.error("Failed to save settings:", err)
    }
  }

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


  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-muted-foreground">This page is restricted to Super Administrators only.</p>
        <BackButton fallbackPath="/home" label="Return to Dashboard" />
      </div>
    )
  }

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

          ...(isSuperAdmin ? [{
            label: "System Settings",
            content: (
              <div className="space-y-6">
                <Card className="border-blue-100 bg-blue-50/10">
                  <CardHeader>
                    <CardTitle className="text-lg">Financial Report Settings</CardTitle>
                    <CardDescription>
                      Configure global rates and parameters used in accounting reports.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveSettings} className="space-y-4 max-w-md">
                      <div className="space-y-2">
                        <Label htmlFor="commissionRate" className="text-sm font-semibold">
                          Month-End Report Commission Rate (%)
                        </Label>
                        <div className="relative">
                          <Input
                            id="commissionRate"
                            type="number"
                            step="0.1"
                            value={commissionRate}
                            onChange={(e) => setCommissionRate(e.target.value)}
                            className="pr-10"
                            placeholder="2.5"
                            required
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                            <Percent className="h-4 w-4" />
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          This value will be used for the Commission calculation: <code>FLOOR(C/Amount * {commissionRate || '0'}%, 5)</code>
                        </p>
                      </div>

                      <Button
                        type="submit"
                        disabled={updateSettingsMutation.isPending || settingsLoading}
                        className="bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100"
                      >
                        {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )
          }] : [])
        ]}
      />

    </div>
  )
}
