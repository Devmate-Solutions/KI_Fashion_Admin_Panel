"use client";

import { Button } from "@/components/ui/button";
import { useInventoryList } from "@/lib/hooks/useInventory";
import {
  useDashboardSummary,
  useSalesReport,
  useFinancialReport,
  useSuppliersReport,
  useCustomersReport,
} from "@/lib/hooks/useReports";
import {
  useAllSupplierLedgers,
  useAllBuyerLedgers,
} from "@/lib/hooks/useLedger";
import { useDailyCashSummary } from "@/lib/hooks/useCashTracking";
import { useRouter } from "next/navigation";
import Tabs from "../../../components/tabs";
import ProductImageGallery from "@/components/ui/ProductImageGallery";
import StatCard from "@/components/ui/StatCard";
import QuickAction from "@/components/ui/QuickAction";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Wallet,
  Calendar,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  Monitor,
  Activity,
  CreditCard,
  Target,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

// Helper to get image array
const getImageArray = (item) => {
  if (Array.isArray(item.product?.images) && item.product.images.length > 0)
    return item.product.images;
  if (item.productImage)
    return Array.isArray(item.productImage)
      ? item.productImage
      : [item.productImage];
  if (
    item.productType?.images &&
    Array.isArray(item.productType.images) &&
    item.productType.images.length > 0
  )
    return item.productType.images;
  return [];
};

function currency(n) {
  const num = Number(n || 0);
  return `£${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function HomePage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  // Fetch all dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } =
    useDashboardSummary();
  const { data: salesData, isLoading: salesLoading } = useSalesReport();
  const { data: financialData, isLoading: financialLoading } =
    useFinancialReport();
  const { data: suppliersData } = useSuppliersReport();
  const { data: customersData, isLoading: customersLoading } =
    useCustomersReport();
  const { data: inventoryData, isLoading: inventoryLoading } = useInventoryList(
    { limit: 100 }
  );
  const { data: cashData, isLoading: cashLoading } = useDailyCashSummary(today);
  const { data: supplierLedgerData } = useAllSupplierLedgers({ limit: 10 });
  const { data: buyerLedgerData } = useAllBuyerLedgers({ limit: 10 });

  const inventoryItems = inventoryData?.items || [];
  const totalStockValue = inventoryItems.reduce(
    (sum, item) => sum + (item.totalValue || 0),
    0
  );
  const lowStockCount = inventoryItems.filter(
    (item) => item.lowStock || item.needsReorder
  ).length;

  const chartData = useMemo(() => {
    if (!salesData?.dailyData) return [];
    return salesData.dailyData.map((d) => ({
      name: new Date(d.date).toLocaleDateString("en-GB", { weekday: "short" }),
      sales: d.totalSales,
      orders: d.orderCount,
    }));
  }, [salesData]);

  // Merge ledger entries for recent activity
  const recentEntries = useMemo(() => {
    return [
      ...(supplierLedgerData?.entries || []).map((entry) => ({
        ...entry,
        partyType: "Supplier",
        partyName:
          entry.supplier?.name || entry.supplier?.company || "Unknown",
      })),
      ...(buyerLedgerData?.entries || []).map((entry) => ({
        ...entry,
        partyType: "Customer",
        partyName:
          entry.buyer?.name || entry.buyer?.company || "Unknown",
      })),
    ]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 5);
  }, [supplierLedgerData, buyerLedgerData]);

  const overviewTab = (
    <div className="space-y-6">
      {/* Headline Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Monthly Revenue"
          value={currency(dashboardData?.totalSales?.thisMonth || 0)}
          icon={TrendingUp}
          loading={dashboardLoading}
          color="primary"
          description="Net sales after returns"
          onClick={() => router.push("/selling")}
        />
        <StatCard
          label="Warehouse Value"
          value={currency(totalStockValue)}
          icon={Package}
          loading={inventoryLoading}
          color="purple"
          description="Total inventory on-hand"
          onClick={() => router.push("/stock")}
        />
        <StatCard
          label="Today's Cashflow"
          value={currency(cashData?.cashIn || 0)}
          icon={Wallet}
          loading={cashLoading}
          color="success"
          description="Inbound cash recorded"
          onClick={() => router.push("/cash-tracking")}
        />
        <StatCard
          label="Active Buyers"
          value={customersData?.totalActiveCustomers?.toString() || "0"}
          icon={Users}
          loading={customersLoading}
          color="warning"
          description="Total active this month"
          onClick={() => router.push("/customer-ledger")}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Main Analytics Section */}
        <div className="xl:col-span-8 space-y-6">
          {/* Sales Chart */}
          <Card className="border border-border bg-card overflow-hidden rounded-lg">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 p-4 sm:p-8 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <CardTitle className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Sales Intelligence
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-400 font-medium text-[10px] sm:text-xs">
                  Revenue trend analysis for the current week
                </CardDescription>
              </div>
              <Badge
                variant="ghost"
                className="bg-slate-50 text-blue-600 text-[10px] font-bold border-none px-3 py-1"
              >
                WEEKLY
              </Badge>
            </CardHeader>
            <CardContent className="p-4 sm:p-8 pt-4">
              <div className="h-[240px] sm:h-[320px] w-full">
                {salesLoading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500/20" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
                        dy={15}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
                        tickFormatter={(value) => `£${value}`}
                        dx={-10}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          borderRadius: "16px",
                          border: "1px solid #f1f5f9",
                          boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                          padding: "12px",
                        }}
                        itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
                        labelStyle={{
                          fontSize: "10px",
                          color: "#94a3b8",
                          marginBottom: "4px",
                          textTransform: "uppercase",
                          fontWeight: 800,
                        }}
                        formatter={(value) => [currency(value), "Revenue"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="sales"
                        stroke="#3b82f6"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#salesGradient)"
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border border-border bg-card rounded-lg overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-500" />
                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight">
                      Recent Activity
                    </CardTitle>
                  </div>
                  <CardDescription className="text-slate-400 font-medium text-xs">
                    Real-time financial movement across all accounts
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg font-bold text-[10px] uppercase tracking-widest border-slate-100 hover:bg-slate-50"
                  onClick={() => router.push("/reports")}
                >
                  Full History
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                    <tr>
                      <th className="px-8 py-4">Transaction</th>
                      <th className="px-8 py-4">Type</th>
                      <th className="px-8 py-4 text-right">Debit</th>
                      <th className="px-8 py-4 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentEntries.map((entry, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/30 transition-all duration-150 ease-in-out group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {entry.partyName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                              {entry.date
                                ? new Date(entry.date).toLocaleDateString(
                                    "en-GB",
                                    { day: "2-digit", month: "short" }
                                  )
                                : "—"}{" "}
                              • {entry.partyType}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <Badge
                            variant="outline"
                            className="rounded-lg text-[9px] font-black uppercase tracking-widest border-slate-100 bg-white shadow-sm px-2"
                          >
                            {entry.type || "General"}
                          </Badge>
                        </td>
                        <td className="px-8 py-5 text-right font-black text-slate-900 tabular-nums">
                          {entry.debit ? currency(entry.debit) : "—"}
                        </td>
                        <td className="px-8 py-5 text-right font-black text-emerald-600 tabular-nums">
                          {entry.credit ? currency(entry.credit) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="xl:col-span-4 space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-4">
            <QuickAction
              label="Inventory Approval"
              description="Review and confirm supplier dispatch orders"
              icon={Target}
              color="blue"
              onClick={() => router.push("/dispatch-orders")}
            />
            <QuickAction
              label="Stock Management"
              description="Monitor levels and manage item variants"
              icon={Package}
              color="purple"
              onClick={() => router.push("/stock")}
            />
            <QuickAction
              label="Global Ledgers"
              description="Consolidated customer and supplier balance"
              icon={CreditCard}
              color="emerald"
              onClick={() => router.push("/supplier-ledger")}
            />
          </div>

          {/* Stock Alerts */}
          <Card className="border border-border bg-card rounded-lg overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-500" />
                  <CardTitle className="text-lg font-black text-slate-900 tracking-tight">
                    Stock Alerts
                  </CardTitle>
                </div>
                {lowStockCount > 0 && (
                  <Badge className="bg-rose-500 hover:bg-rose-600 border-none text-[10px] font-black px-2">
                    {lowStockCount}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {inventoryItems
                  .filter((item) => item.lowStock || item.needsReorder)
                  .slice(0, 4)
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-5 hover:bg-rose-50/30 transition-all duration-200 cursor-pointer group rounded-lg mx-2"
                      onClick={() => router.push("/stock")}
                    >
                      <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-100 bg-white flex-shrink-0 group-hover:scale-105 transition-transform">
                        <ProductImageGallery
                          images={getImageArray(item)}
                          alt={item.productName}
                          size="sm"
                          maxVisible={1}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate tracking-tight">
                          {item.productName}
                        </p>
                        <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest mt-0.5">
                          Stock level: {item.currentStock}
                        </p>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-md group-hover:scale-110 transition-all duration-200">
                        <Plus className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors duration-200" />
                      </div>
                    </div>
                  ))}
                {lowStockCount === 0 && (
                  <div className="p-10 text-center">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-50 text-emerald-500 mb-4">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                      Inventory Secure
                    </p>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      All items are within healthy limits
                    </p>
                  </div>
                )}
              </div>
              {lowStockCount > 4 && (
                <Button
                  variant="ghost"
                  className="w-full h-14 text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 hover:bg-slate-50 rounded-none border-t border-slate-50"
                  onClick={() => router.push("/stock")}
                >
                  View All Alerts <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { label: "Overview", content: overviewTab },
    {
      label: "Inventory",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="Stock Valuation"
              value={currency(totalStockValue)}
              icon={Package}
              loading={inventoryLoading}
              color="purple"
            />
            <StatCard
              label="Total SKU Count"
              value={inventoryItems.length.toString()}
              icon={Target}
              loading={inventoryLoading}
              color="primary"
            />
            <StatCard
              label="Low Stock Warning"
              value={lowStockCount.toString()}
              icon={AlertTriangle}
              loading={inventoryLoading}
              color="danger"
            />
            <StatCard
              label="Net Items"
              value={inventoryItems
                .reduce((s, i) => s + (i.currentStock || 0), 0)
                .toLocaleString()}
              icon={Monitor}
              loading={inventoryLoading}
              color="success"
            />
          </div>

          <Card className="border border-border bg-card rounded-lg overflow-hidden">
            <CardHeader className="p-8">
              <CardTitle className="text-xl font-black text-slate-900 tracking-tight">
                Warehouse Ledger
              </CardTitle>
              <CardDescription>
                Live inventory tracking and stock valuation
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                    <tr>
                      <th className="px-8 py-4">Product</th>
                      <th className="px-8 py-4">SKU</th>
                      <th className="px-8 py-4 text-right">In Stock</th>
                      <th className="px-8 py-4 text-right">Value</th>
                      <th className="px-8 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryItems.slice(0, 15).map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/30 transition-all duration-150 border-b border-slate-50 last:border-0"
                      >
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-100 bg-white">
                              <ProductImageGallery
                                images={getImageArray(item)}
                                alt={item.productName}
                                size="sm"
                                maxVisible={1}
                              />
                            </div>
                            <span className="font-bold text-slate-900">
                              {item.productName}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-4 font-bold text-slate-400 font-mono text-[11px]">
                          {item.sku}
                        </td>
                        <td className="px-8 py-4 text-right font-black text-slate-900 tabular-nums">
                          {item.currentStock}
                        </td>
                        <td className="px-8 py-4 text-right font-black text-slate-900 tabular-nums">
                          {currency(item.totalValue || 0)}
                        </td>
                        <td className="px-8 py-4 text-center">
                          {item.lowStock || item.needsReorder ? (
                            <Badge className="bg-rose-50 text-rose-600 border-rose-100 text-[9px] font-black uppercase tracking-widest px-2">
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] font-black uppercase tracking-widest px-2">
                              Healthy
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      label: "Balances",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="Active Accounts"
              value={(customersData?.totalActiveCustomers || 0).toString()}
              icon={Users}
              loading={customersLoading}
              color="warning"
            />
            <StatCard
              label="Total Receivables"
              value={currency(financialData?.receivables?.total || 0)}
              icon={TrendingUp}
              loading={financialLoading}
              color="success"
            />
            <StatCard
              label="Total Payables"
              value={currency(financialData?.payables?.total || 0)}
              icon={TrendingDown}
              loading={financialLoading}
              color="danger"
            />
            <StatCard
              label="Net Liquidity"
              value={currency(
                (financialData?.receivables?.total || 0) -
                  (financialData?.payables?.total || 0)
              )}
              icon={Wallet}
              loading={financialLoading}
              color="purple"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border border-border bg-card rounded-lg overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-lg font-black text-slate-900 tracking-tight">
                  Outstanding Receivables
                </CardTitle>
                <CardDescription className="text-xs">
                  Top 5 debtors by ledger balance
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                  {customersData?.activeCustomers
                    ?.filter((c) => (c.ledgerBalance || 0) > 0)
                    .slice(0, 5)
                    .map((customer, idx) => (
                      <div
                        key={idx}
                        className="px-8 py-5 flex items-center justify-between hover:bg-slate-50/30 transition-all duration-150 rounded-lg mx-2"
                      >
                        <span className="font-bold text-slate-900">
                          {customer.name || customer.company || "Unknown"}
                        </span>
                        <span className="font-black text-slate-900 tabular-nums">
                          {currency(customer.ledgerBalance || 0)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card rounded-lg overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-lg font-black text-slate-900 tracking-tight">
                  Outstanding Payables
                </CardTitle>
                <CardDescription className="text-xs">
                  Top 5 suppliers by outstanding credit
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                  {suppliersData?.topSuppliers
                    ?.slice(0, 5)
                    .map((supplier, idx) => (
                      <div
                        key={idx}
                        className="px-8 py-5 flex items-center justify-between hover:bg-slate-50/30 transition-all duration-150 rounded-lg mx-2"
                      >
                        <span className="font-bold text-slate-900">
                          {supplier.supplierName ||
                            supplier.company ||
                            "Unknown"}
                        </span>
                        <span className="font-black text-rose-600 tabular-nums">
                          {currency(supplier.totalAmount || 0)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Monitor className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-none">
                Dashboard
              </h1>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                Live overview
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden lg:flex items-center gap-3 bg-card px-4 py-2.5 rounded-lg border border-border">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground tabular-nums">
              {new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <Button
            variant="default"
            className="h-10 sm:h-11 px-4 sm:px-6 rounded-lg font-semibold text-sm"
            onClick={() => router.push("/dispatch-orders")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Dispatch
          </Button>
        </div>
      </header>

      <Tabs tabs={tabs} />
    </div>
  );
}
