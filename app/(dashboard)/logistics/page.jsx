"use client"

import { useState, useMemo } from "react"
import BackButton from "@/components/BackButton"
import {
  useLogisticsCompanies,
  useCreateLogisticsCompany,
  useUpdateLogisticsCompany,
} from "@/lib/hooks/useLogisticsCompanies"
import { LogisticsCompanyForm } from "@/components/forms/logistics-company-form"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DataTable from "@/components/data-table"
import { Phone, Mail } from "lucide-react"

export default function LogisticsPage() {
  const [openAddForm, setOpenAddForm] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)

  const { data: companies = [], isLoading, error } = useLogisticsCompanies({ isActive: 'true', limit: 100 })
  const createMutation = useCreateLogisticsCompany()
  const updateMutation = useUpdateLogisticsCompany()

  const columns = useMemo(
    () => [
      {
        header: "Company Name",
        accessor: "name",
        render: (row) => (
          <div>
            <div className="font-medium">{row.name}</div>
            {row.code && (
              <div className="text-xs text-muted-foreground">{row.code}</div>
            )}
          </div>
        )
      },
      {
        header: "Contact",
        accessor: "contactInfo",
        render: (row) => {
          const contact = row.contactInfo || {}
          return (
            <div className="text-sm space-y-1">
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{contact.phoneAreaCode ? `${contact.phoneAreaCode}-` : ''}{contact.phone}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{contact.email}</span>
                </div>
              )}
              {!contact.phone && !contact.email && <span className="text-muted-foreground">No contact info</span>}
            </div>
          )
        }
      },
      {
        header: "Box Rate",
        accessor: "rates",
        render: (row) => {
          const rate = row.rates?.boxRate
          return (
            <span className="font-medium">
              {rate !== undefined ? `£${parseFloat(rate).toFixed(2)}` : 'N/A'}
            </span>
          )
        }
      },
      {
        header: "Status",
        accessor: "isActive",
        render: (row) => (
          <Badge variant={row.isActive ? "default" : "secondary"}>
            {row.isActive ? "Active" : "Inactive"}
          </Badge>
        )
      },
      {
        header: "Notes",
        accessor: "notes",
        render: (row) => (
          <span className="max-w-md truncate block text-sm">
            {row.notes || 'N/A'}
          </span>
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
    createMutation.mutate(formData, {
      onSuccess: () => setOpenAddForm(false),
    })
  }

  const handleEdit = (item) => {
    setEditingCompany(item)
  }

  const handleUpdate = async (formData) => {
    updateMutation.mutate({ id: editingCompany._id || editingCompany.id, ...formData }, {
      onSuccess: () => setEditingCompany(null),
    })
  }

  return (
    <div className="p-6">
      <div className="mb-3">
        <BackButton fallbackPath="/home" label="Back" />
      </div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Logistics Companies</h1>
          <p className="text-sm text-gray-500">Manage logistics companies for dispatch orders</p>
        </div>
        <Button onClick={() => setOpenAddForm(true)}>
          Add Logistics Company
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error.message || 'Failed to load logistics companies'}</p>
        </div>
      )}

      <DataTable
        columns={columns}
        data={companies}
        loading={isLoading}
        onEdit={handleEdit}
      />

      <LogisticsCompanyForm
        open={openAddForm}
        onClose={() => setOpenAddForm(false)}
        onSubmit={handleAdd}
        loading={createMutation.isPending}
        isEdit={false}
      />

      <LogisticsCompanyForm
        open={!!editingCompany}
        onClose={() => setEditingCompany(null)}
        onSubmit={handleUpdate}
        loading={updateMutation.isPending}
        initialData={editingCompany}
        isEdit={true}
      />
    </div>
  )
}

