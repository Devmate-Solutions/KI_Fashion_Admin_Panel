"use client"

import { useState } from "react"
import {
  useSalesReport,
  usePurchasesReport,
  useFinancialReport,
  useInventoryReport,
  useSuppliersReport,
  useCustomersReport,
  useDashboardSummary
} from "../../../lib/hooks/useReports"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"

function currency(n) {
  const num = Number(n || 0)
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })

  // Fetch all reports
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardSummary(dateRange)
  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useSalesReport(dateRange)
  const { data: purchasesData, isLoading: purchasesLoading, refetch: refetchPurchases } = usePurchasesReport(dateRange)
  const { data: financialData, isLoading: financialLoading, refetch: refetchFinancial } = useFinancialReport(dateRange)
  const { data: inventoryData, isLoading: inventoryLoading, refetch: refetchInventory } = useInventoryReport(dateRange)
  const { data: suppliersData, isLoading: suppliersLoading, refetch: refetchSuppliers } = useSuppliersReport(dateRange)
  const { data: customersData, isLoading: customersLoading, refetch: refetchCustomers } = useCustomersReport(dateRange)

  const handleRefreshAll = () => {
    refetchSales()
    refetchPurchases()
    refetchFinancial()
    refetchInventory()
    refetchSuppliers()
    refetchCustomers()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Comprehensive business insights and performance metrics</p>
        </div>
        <Button onClick={handleRefreshAll}>Refresh All</Button>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter by Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setDateRange({ startDate: '', endDate: '' })}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Summary */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Dashboard Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Sales</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardLoading ? '...' : currency(dashboardData?.totalSales || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Purchases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardLoading ? '...' : currency(dashboardData?.totalPurchases || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Net Profit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dashboardLoading ? '...' : currency(dashboardData?.netProfit || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {dashboardLoading ? '...' : currency(dashboardData?.totalExpenses || 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Reports Tabs */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales Report</CardTitle>
              <CardDescription>Detailed sales analysis and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <p>Loading sales report...</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Sales</p>
                      <p className="text-xl font-semibold">{currency(salesData?.totalSales || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Number of Orders</p>
                      <p className="text-xl font-semibold">{salesData?.orderCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Average Order Value</p>
                      <p className="text-xl font-semibold">{currency(salesData?.avgOrderValue || 0)}</p>
                    </div>
                  </div>
                  <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(salesData, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle>Purchases Report</CardTitle>
              <CardDescription>Purchase orders and supplier transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {purchasesLoading ? (
                <p>Loading purchases report...</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Purchases</p>
                      <p className="text-xl font-semibold">{currency(purchasesData?.totalPurchases || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Number of Orders</p>
                      <p className="text-xl font-semibold">{purchasesData?.orderCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pending Payments</p>
                      <p className="text-xl font-semibold">{currency(purchasesData?.pendingPayments || 0)}</p>
                    </div>
                  </div>
                  <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(purchasesData, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Financial Report</CardTitle>
              <CardDescription>Income, expenses, and profitability</CardDescription>
            </CardHeader>
            <CardContent>
              {financialLoading ? (
                <p>Loading financial report...</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Revenue</p>
                      <p className="text-xl font-semibold text-green-600">{currency(financialData?.totalRevenue || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Expenses</p>
                      <p className="text-xl font-semibold text-red-600">{currency(financialData?.totalExpenses || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Net Profit</p>
                      <p className="text-xl font-semibold text-blue-600">{currency(financialData?.netProfit || 0)}</p>
                    </div>
                  </div>
                  <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(financialData, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Report</CardTitle>
              <CardDescription>Stock levels, valuation, and movement</CardDescription>
            </CardHeader>
            <CardContent>
              {inventoryLoading ? (
                <p>Loading inventory report...</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Items</p>
                      <p className="text-xl font-semibold">{inventoryData?.totalItems || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Value</p>
                      <p className="text-xl font-semibold">{currency(inventoryData?.totalValue || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Low Stock Items</p>
                      <p className="text-xl font-semibold text-red-600">{inventoryData?.lowStockCount || 0}</p>
                    </div>
                  </div>
                  <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(inventoryData, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>Suppliers Report</CardTitle>
              <CardDescription>Supplier performance and analysis</CardDescription>
            </CardHeader>
            <CardContent>
              {suppliersLoading ? (
                <p>Loading suppliers report...</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Suppliers</p>
                      <p className="text-xl font-semibold">{suppliersData?.totalSuppliers || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Payable</p>
                      <p className="text-xl font-semibold">{currency(suppliersData?.totalPayable || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Top Supplier</p>
                      <p className="text-xl font-semibold truncate">{suppliersData?.topSupplier?.name || 'N/A'}</p>
                    </div>
                  </div>
                  <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(suppliersData, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Customers Report</CardTitle>
              <CardDescription>Customer analysis and insights</CardDescription>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <p>Loading customers report...</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Customers</p>
                      <p className="text-xl font-semibold">{customersData?.totalCustomers || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Receivable</p>
                      <p className="text-xl font-semibold">{currency(customersData?.totalReceivable || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Top Customer</p>
                      <p className="text-xl font-semibold truncate">{customersData?.topCustomer?.name || 'N/A'}</p>
                    </div>
                  </div>
                  <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(customersData, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
