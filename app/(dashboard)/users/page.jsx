"use client"

import { useMemo, useState } from "react"
import DataTable from "../../../components/data-table"
import { EmployeeForm } from "../../../components/forms/employee-form"
import { SupplierForm } from "../../../components/forms/supplier-form"
import { DistributorForm } from "../../../components/forms/distributor-form"
import { useUsers, useUpdateUser, useDeactivateUser, useDeleteUser, useCreateUser, useRegeneratePassword } from "../../../lib/hooks/useUsers"
import { usePasswordResetRequests, useCompleteRequest, useCancelRequest, useDeleteRequest } from "../../../lib/hooks/usePasswordResetRequests"
import { useAuthStore } from "@/store/store"
import { Button } from "../../../components/ui/button"
import Tabs from "../../../components/tabs"
import { Plus, Eye, EyeOff, Copy, RefreshCw, CheckCircle, X, Trash2 } from "lucide-react"
import { toast } from "react-hot-toast"

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [openAddForm, setOpenAddForm] = useState(false)
  const [openEditForm, setOpenEditForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [visiblePasswords, setVisiblePasswords] = useState({}) // userId -> boolean
  const [userPasswords, setUserPasswords] = useState({}) // userId -> password (for newly created/regenerated)
  const [passwordResetStatusFilter, setPasswordResetStatusFilter] = useState('pending')
  const [completedPasswordModal, setCompletedPasswordModal] = useState({ open: false, password: '', email: '' })

  // Get current user to check if admin
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'super-admin'

  // Fetch all users - we'll filter client-side for now
  const { data: allUsers = [], isLoading } = useUsers()
  const updateUserMutation = useUpdateUser()
  const deactivateUserMutation = useDeactivateUser()
  const deleteUserMutation = useDeleteUser()
  const createUserMutation = useCreateUser()
  const regeneratePasswordMutation = useRegeneratePassword()
  
  // Password reset requests
  const { data: passwordResetRequests = [], isLoading: isLoadingRequests } = usePasswordResetRequests({ status: passwordResetStatusFilter })
  const completeRequestMutation = useCompleteRequest()
  const cancelRequestMutation = useCancelRequest()
  const deleteRequestMutation = useDeleteRequest()

  // Filter users based on active tab
  const filteredUsers = useMemo(() => {
    if (activeTab === 0) {
      // Employees tab: admin, manager, employee, accountant
      return allUsers.filter(user => 
        ['super-admin', 'admin', 'employee', 'accountant'].includes(user.role)
      )
    } else if (activeTab === 1) {
      // Suppliers tab: role='supplier'
      return allUsers.filter(user => user.role === 'supplier')
    } else if (activeTab === 2) {
      // Distributors tab: role='distributor' or 'buyer'
      return allUsers.filter(user => 
        user.role === 'distributor' || user.role === 'buyer'
      )
    }
    return []
  }, [allUsers, activeTab])

  const handleTogglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  const handleCopyPassword = async (password) => {
    try {
      await navigator.clipboard.writeText(password)
      toast.success('Password copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy password')
    }
  }

  const handleRegeneratePassword = async (userId) => {
    if (!window.confirm('Are you sure you want to regenerate the password for this user? They will need to use the new password to login.')) {
      return
    }
    try {
      const response = await regeneratePasswordMutation.mutateAsync(userId)
      // Response structure from axios: response.data = { success: true, message: '...', password: '...' }
      const newPassword = response?.data?.password
      if (newPassword) {
        setUserPasswords(prev => ({
          ...prev,
          [userId]: newPassword
        }))
        setVisiblePasswords(prev => ({
          ...prev,
          [userId]: true // Show the new password
        }))
      }
    } catch (error) {
      console.error('Error regenerating password:', error)
    }
  }

  const userColumns = useMemo(
    () => {
      const columns = [
        { header: "Name", accessor: "name" },
        { header: "Email", accessor: "email" },
        {
          header: "Role",
          accessor: "role",
          render: (row) => (
            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 capitalize">
              {row.role}
            </span>
          )
        },
        {
          header: "Source",
          accessor: "signupSource",
          render: (row) => {
            const source = row.signupSource || 'crm'
            const isAdminCreated = source === 'crm'
            return (
              <span className={`px-2 py-1 text-xs rounded-full ${
                isAdminCreated 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {isAdminCreated ? 'Admin Created' : 'Self Registered'}
              </span>
            )
          }
        },
      ]

      // Add password column only for admin
      if (isAdmin) {
        columns.push({
          header: "Password",
          accessor: "password",
          render: (row) => {
            const userId = row.id
            const password = userPasswords[userId]
            const isVisible = visiblePasswords[userId]
            const hasPassword = password !== undefined

            return (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">
                  {hasPassword && isVisible ? password : '••••••••'}
                </span>
                <div className="flex items-center gap-1">
                  {hasPassword && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleTogglePasswordVisibility(userId)}
                        className="p-1 hover:bg-muted rounded"
                        title={isVisible ? 'Hide password' : 'Show password'}
                      >
                        {isVisible ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(password)}
                        className="p-1 hover:bg-muted rounded"
                        title="Copy password"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRegeneratePassword(userId)}
                    className="p-1 hover:bg-muted rounded"
                    title="Regenerate password"
                    disabled={regeneratePasswordMutation.isPending}
                  >
                    <RefreshCw className={`w-4 h-4 ${regeneratePasswordMutation.isPending ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            )
          }
        })
      }

      columns.push(
        {
          header: "Status",
          accessor: "isActive",
          render: (row) => (
            <span className={`px-2 py-1 text-xs rounded-full ${
              row.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {row.isActive ? 'Active' : 'Inactive'}
            </span>
          )
        },
        {
          header: "Created",
          accessor: "createdAt",
          render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : 'N/A'
        }
      )

      return columns
    },
    [isAdmin, visiblePasswords, userPasswords, regeneratePasswordMutation.isPending]
  )

  const handleEditUser = (user) => {
    setEditingUser(user._original || user)
    setOpenEditForm(true)
  }

  const handleCreateUser = async (formData) => {
    try {
      const response = await createUserMutation.mutateAsync(formData)
      setOpenAddForm(false)
      
      // Store password if returned (for admin to see)
      if (isAdmin) {
        // Response structure: response.data.user or response.data.data.user
        const user = response?.data?.user || response?.data?.data?.user
        const userId = user?._id || user?.id
        // Password is in formData.password (we just created it)
        const password = formData.password
        if (userId && password) {
          setUserPasswords(prev => ({
            ...prev,
            [userId]: password
          }))
          setVisiblePasswords(prev => ({
            ...prev,
            [userId]: true // Show password for newly created users
          }))
        }
      }
    } catch (error) {
      console.error('Error creating user:', error)
    }
  }

  const handleUpdateUser = async (formData) => {
    try {
      await updateUserMutation.mutateAsync({
        id: editingUser._id || editingUser.id,
        data: formData
      })
      setOpenEditForm(false)
      setEditingUser(null)
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const handleDeactivateUser = async (user) => {
    if (window.confirm(`Are you sure you want to deactivate user "${user.name}"?`)) {
      try {
        await deactivateUserMutation.mutateAsync(user.id)
      } catch (error) {
        console.error('Error deactivating user:', error)
      }
    }
  }

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Are you sure you want to delete user "${user.name}"? This action cannot be undone.`)) {
      try {
        await deleteUserMutation.mutateAsync(user.id)
      } catch (error) {
        console.error('Error deleting user:', error)
      }
    }
  }

  // Password reset request handlers
  const handleCompleteRequest = async (request) => {
    if (!window.confirm(`Are you sure you want to complete the password reset request for "${request.userEmail}"? A new password will be generated.`)) {
      return
    }
    try {
      const response = await completeRequestMutation.mutateAsync(request.id)
      const newPassword = response?.data?.password || response?.data?.data?.password
      if (newPassword) {
        setCompletedPasswordModal({
          open: true,
          password: newPassword,
          email: request.userEmail
        })
      }
    } catch (error) {
      console.error('Error completing request:', error)
    }
  }

  const handleCancelRequest = async (request) => {
    if (!window.confirm(`Are you sure you want to cancel the password reset request for "${request.userEmail}"?`)) {
      return
    }
    try {
      await cancelRequestMutation.mutateAsync(request.id)
    } catch (error) {
      console.error('Error cancelling request:', error)
    }
  }

  const handleDeleteRequest = async (request) => {
    if (!window.confirm(`Are you sure you want to delete the password reset request for "${request.userEmail}"? This action cannot be undone.`)) {
      return
    }
    try {
      await deleteRequestMutation.mutateAsync(request.id)
    } catch (error) {
      console.error('Error deleting request:', error)
    }
  }

  // Password reset requests columns
  const passwordResetRequestColumns = useMemo(() => [
    {
      header: "Email",
      accessor: "email",
      render: (row) => row.userEmail || row.email
    },
    {
      header: "User Name",
      accessor: "userName",
      render: (row) => row.userName || 'N/A'
    },
    {
      header: "Portal Source",
      accessor: "portalSource",
      render: (row) => {
        const source = row.portalSource || 'N/A'
        const sourceLabels = {
          'supplier-portal': 'Supplier Portal',
          'distributor-portal': 'Distributor Portal',
          'app-supplier': 'App Supplier'
        }
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
            {sourceLabels[source] || source}
          </span>
        )
      }
    },
    {
      header: "Requested At",
      accessor: "requestedAt",
      render: (row) => row.requestedAt ? new Date(row.requestedAt).toLocaleString('en-GB') : 'N/A'
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => {
        const statusColors = {
          pending: 'bg-yellow-100 text-yellow-800',
          completed: 'bg-green-100 text-green-800',
          cancelled: 'bg-gray-100 text-gray-800'
        }
        return (
          <span className={`px-2 py-1 text-xs rounded-full capitalize ${statusColors[row.status] || 'bg-gray-100 text-gray-800'}`}>
            {row.status}
          </span>
        )
      }
    },
    {
      header: "Completed By",
      accessor: "completedByName",
      render: (row) => row.completedByName || (row.status === 'completed' ? 'N/A' : '-')
    }
  ], [])

  const tabs = [
    {
      label: "Employees",
      content: (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setOpenAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Employee
            </Button>
          </div>
          <DataTable
            columns={userColumns}
            data={filteredUsers}
            loading={isLoading}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            additionalActions={(row) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeactivateUser(row)}
                disabled={!row.isActive}
              >
                Deactivate
              </Button>
            )}
          />
        </div>
      )
    },
    {
      label: "Suppliers",
      content: (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setOpenAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Supplier
            </Button>
          </div>
          <DataTable
            columns={userColumns}
            data={filteredUsers}
            loading={isLoading}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            additionalActions={(row) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeactivateUser(row)}
                disabled={!row.isActive}
              >
                Deactivate
              </Button>
            )}
          />
        </div>
      )
    },
    {
      label: "Distributors",
      content: (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setOpenAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Distributor
            </Button>
          </div>
          <DataTable
            columns={userColumns}
            data={filteredUsers}
            loading={isLoading}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            additionalActions={(row) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeactivateUser(row)}
                disabled={!row.isActive}
              >
                Deactivate
              </Button>
            )}
          />
        </div>
      )
    },
    {
      label: "Password Reset Requests",
      content: (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant={passwordResetStatusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPasswordResetStatusFilter('pending')}
              >
                Pending
              </Button>
              <Button
                variant={passwordResetStatusFilter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPasswordResetStatusFilter('completed')}
              >
                Completed
              </Button>
              <Button
                variant={passwordResetStatusFilter === 'cancelled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPasswordResetStatusFilter('cancelled')}
              >
                Cancelled
              </Button>
              <Button
                variant={passwordResetStatusFilter === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPasswordResetStatusFilter('')}
              >
                All
              </Button>
            </div>
          </div>
          <DataTable
            columns={passwordResetRequestColumns}
            data={passwordResetRequests}
            loading={isLoadingRequests}
            additionalActions={(row) => (
              <div className="flex gap-2">
                {row.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCompleteRequest(row)}
                      disabled={completeRequestMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Complete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelRequest(row)}
                      disabled={cancelRequestMutation.isPending}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteRequest(row)}
                  disabled={deleteRequestMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          />
        </div>
      )
    }
  ]

  // Determine which form to show based on active tab or editing user role
  const getFormComponent = () => {
    if (editingUser) {
      const role = editingUser.role || editingUser._original?.role
      if (role === 'supplier') return SupplierForm
      if (role === 'distributor' || role === 'buyer') return DistributorForm
      return EmployeeForm
    }
    
    // For new users, use form based on active tab
    if (activeTab === 1) return SupplierForm
    if (activeTab === 2) return DistributorForm
    return EmployeeForm
  }

  const FormComponent = getFormComponent()

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage system users and their roles</p>
        </div>
      </div>

      <Tabs 
        tabs={tabs} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
      />

      <FormComponent
        open={openAddForm}
        onClose={() => setOpenAddForm(false)}
        onSubmit={handleCreateUser}
        initialData={null}
        loading={createUserMutation.isPending}
      />

      <FormComponent
        open={openEditForm}
        onClose={() => {
          setOpenEditForm(false)
          setEditingUser(null)
        }}
        onSubmit={handleUpdateUser}
        initialData={editingUser}
        loading={updateUserMutation.isPending}
      />

      {/* Password Modal */}
      {completedPasswordModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Password Reset Completed</h2>
            <p className="text-sm text-gray-600 mb-4">
              A new password has been generated for <strong>{completedPasswordModal.email}</strong>
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4">
              <div className="flex items-center justify-between">
                <code className="text-lg font-mono">{completedPasswordModal.password}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyPassword(completedPasswordModal.password)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Please copy this password and send it to the user via your preferred communication channel.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setCompletedPasswordModal({ open: false, password: '', email: '' })}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
