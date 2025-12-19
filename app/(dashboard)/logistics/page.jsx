"use client"

import { useState, useEffect, useMemo } from "react"
import { logisticsCompaniesAPI } from "@/lib/api/endpoints/logisticsCompanies"
import { LogisticsCompanyForm } from "@/components/forms/logistics-company-form"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import toast from "react-hot-toast"
import DataTable from "@/components/data-table"

export default function LogisticsPage() {
  const [companies, setCompanies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [openAddForm, setOpenAddForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState(null)
  const [editingCompany, setEditingCompany] = useState(null)

  // Fetch logistics companies
  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await logisticsCompaniesAPI.getAll({ isActive: 'true', limit: 100 })
      // Handle different response structures
      let companiesList = []
      if (response?.data?.data) {
        companiesList = Array.isArray(response.data.data) ? response.data.data : []
      } else if (response?.data?.rows) {
        companiesList = Array.isArray(response.data.rows) ? response.data.rows : []
      } else if (Array.isArray(response?.data)) {
        companiesList = response.data
      } else if (Array.isArray(response)) {
        companiesList = response
      }
      setCompanies(companiesList)
    } catch (error) {
      console.error('Error fetching logistics companies:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load logistics companies'
      setError(errorMessage)
      toast.error(errorMessage)
      setCompanies([])
    } finally {
      setIsLoading(false)
    }
  }

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
            <div className="text-sm">
              {contact.phone && (
                <div>📞 {contact.phoneAreaCode ? `${contact.phoneAreaCode}-` : ''}{contact.phone}</div>
              )}
              {contact.email && <div>✉️ {contact.email}</div>}
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
    try {
      setIsCreating(true)
      await logisticsCompaniesAPI.create(formData)
      toast.success('Logistics company created successfully')
      setOpenAddForm(false)
      fetchCompanies() // Refresh list
    } catch (error) {
      console.error('Error creating logistics company:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create logistics company'
      toast.error(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  const handleEdit = (item) => {
    setEditingCompany(item)
  }

  const handleUpdate = async (formData) => {
    try {
      setIsCreating(true)
      await logisticsCompaniesAPI.update(editingCompany._id || editingCompany.id, formData)
      toast.success('Logistics company updated successfully')
      setEditingCompany(null)
      fetchCompanies() // Refresh list
    } catch (error) {
      console.error('Error updating logistics company:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update logistics company'
      toast.error(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await logisticsCompaniesAPI.delete(item._id || item.id)
        toast.success('Logistics company deleted successfully')
        fetchCompanies() // Refresh list
      } catch (error) {
        console.error('Error deleting logistics company:', error)
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete logistics company'
        toast.error(errorMessage)
      }
    }
  }

  return (
    <div className="p-6">
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
          <p className="text-sm text-red-600">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={fetchCompanies}
          >
            Retry
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={companies}
        loading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <LogisticsCompanyForm
        open={openAddForm}
        onClose={() => setOpenAddForm(false)}
        onSubmit={handleAdd}
        loading={isCreating}
        isEdit={false}
      />

      <LogisticsCompanyForm
        open={!!editingCompany}
        onClose={() => setEditingCompany(null)}
        onSubmit={handleUpdate}
        loading={isCreating}
        initialData={editingCompany}
        isEdit={true}
      />
    </div>
  )
}

