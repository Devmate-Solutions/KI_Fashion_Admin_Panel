"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useInventoryList, useInventoryValuationReport } from "@/lib/hooks/useInventory";
import {
  useDashboardSummary,
  useSalesReport,
  useFinancialReport,
  useSuppliersReport,
  useCustomersReport,
  useProductSummaryReport,
} from "@/lib/hooks/useReports";
import ProductSummaryReportPage from "@/app/(dashboard)/reports/product-summary/page";
import StockCountTab from "@/components/stock/StockCountTab";
import ReceivablesReportPage from "@/app/(dashboard)/reports/receivables/page";
import PayablesReportPage from "@/app/(dashboard)/reports/payables/page";
import {
  useAllSupplierLedgers,
  useAllBuyerLedgers,
} from "@/lib/hooks/useLedger";
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
  ArrowRight,
  History,
  ShoppingCart,
  Zap,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

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
  const searchParams = useSearchParams();
  const today = new Date().toLocaleDateString('en-CA');

  // Fetch all dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } =
    useDashboardSummary();
  const fourteenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toLocaleDateString('en-CA');
  }, []);
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toLocaleDateString('en-CA');
  }, []);
  const { data: salesData, isLoading: salesLoading } = useSalesReport({ startDate: fourteenDaysAgo, endDate: today });
  const { data: financialData, isLoading: financialLoading } =
    useFinancialReport();
  const { data: suppliersData } = useSuppliersReport();
  const { data: customersData, isLoading: customersLoading } =
    useCustomersReport({ startDate: thirtyDaysAgo, endDate: today });
  const { data: inventoryData, isLoading: inventoryLoading } = useInventoryList(
    { limit: 100 }
  );
  const { data: inventoryValuationData, isLoading: inventoryValuationLoading } =
    useInventoryValuationReport();
  // Removed useDailyCashSummary per user request
  const { data: supplierLedgerData } = useAllSupplierLedgers({ limit: 10 });
  const { data: buyerLedgerData } = useAllBuyerLedgers({ limit: 10 });
  const { data: productSummaryData, isLoading: productSummaryLoading } = useProductSummaryReport();

  const inventoryItems = inventoryData?.items || [];
  const fallbackStockValue = inventoryItems.reduce(
    (sum, item) => sum + (item.totalValue || 0),
    0
  );
  const totalStockValue =
    inventoryValuationData?.summary?.totalInventoryValue ?? fallbackStockValue;
  const lowStockCount = inventoryItems.filter(
    (item) => item.lowStock || item.needsReorder
  ).length;

  // Underperforming logic: Items with >10 in hand and <5% sold
  const underperformingProducts = useMemo(() => {
    const products = Array.isArray(productSummaryData) ? productSummaryData : productSummaryData?.products || [];
    return products
      .filter(p => (p.itemsRemaining || p.stockInHand || 0) > 10 && (p.percentage || 0) < 5)
      .sort((a, b) => (a.percentage || 0) - (b.percentage || 0))
      .slice(0, 5);
  }, [productSummaryData]);

  const stockHealth = useMemo(() => {
    const total = inventoryItems.length;
    const low = lowStockCount;
    const outOfStock = inventoryItems.filter(p => (p.stockInHand || 0) === 0).length;
    const healthy = total - low - outOfStock;
    
    return {
      healthy: total > 0 ? Math.round((healthy / total) * 100) : 0,
      low: total > 0 ? Math.round((low / total) * 100) : 0,
      out: total > 0 ? Math.round((outOfStock / total) * 100) : 0,
      lowCount: low,
      outCount: outOfStock
    };
  }, [inventoryItems, lowStockCount]);

  const chartData = useMemo(() => {
    const data = salesData?.salesData || [];
    return data.map((d) => ({
      name: new Date(d._id).toLocaleDateString("en-GB", { weekday: "short" }),
      sales: d.totalSales,
      orders: d.totalOrders,
    }));
  }, [salesData]);

  // Merge ledger entries for recent activity
  const recentEntries = useMemo(() => {
    return [
      ...(supplierLedgerData?.entries || []).map((entry) => ({
        ...entry,
        partyType: "Supplier",
        partyName:
          entry.entityId?.name || entry.entityId?.company || "Unknown",
      })),
      ...(buyerLedgerData?.entries || []).map((entry) => ({
        ...entry,
        partyType: "Customer",
        partyName:
          entry.entityId?.name || entry.entityId?.company || "Unknown",
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
          loading={inventoryLoading || inventoryValuationLoading}
          color="purple"
          description="Total inventory on-hand"
          onClick={() => router.push("/stock")}
        />
        <StatCard
          label="Total Orders"
          value={dashboardData?.totalOrders?.thisMonth?.toString() || "0"}
          icon={ShoppingCart}
          loading={dashboardLoading}
          color="success"
          description="Total orders this month"
          onClick={() => router.push("/selling")}
        />
        <StatCard
          label="Active Buyers"
          value={customersData?.totalActiveCustomers?.toString() || "0"}
          icon={Users}
          loading={customersLoading}
          color="warning"
          description="Total active in last 30 days"
          onClick={() => router.push("/customer-ledger")}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Sales Chart Section */}
        <Card className="xl:col-span-8 border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Sales Performance
              </CardTitle>
              <CardDescription>
                Transaction trends over the last 14 days
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-none font-bold">
              +12% vs last week
            </Badge>
          </CardHeader>
          <CardContent className="px-2 pt-4">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(v) => `£${v/1000}k`}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <Card className="xl:col-span-4 border-none shadow-sm bg-slate-900 text-white overflow-hidden">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 gap-3">
            <QuickAction
              title="New Sale"
              icon={Plus}
              onClick={() => router.push("/selling")}
              color="none"
              className="bg-white/10 hover:bg-white/20 border-none text-white h-24"
            />
            <QuickAction
              title="Add Product"
              icon={Package}
              onClick={() => router.push("/stock/product-types")}
              color="none"
              className="bg-white/10 hover:bg-white/20 border-none text-white h-24"
            />
            <QuickAction
              title="Stock Count"
              icon={Target}
              onClick={() => setActiveTab(2)}
              color="none"
              className="bg-white/10 hover:bg-white/20 border-none text-white h-24"
            />
            <QuickAction
              title="Reports"
              icon={Activity}
              onClick={() => router.push("/reports")}
              color="none"
              className="bg-white/10 hover:bg-white/20 border-none text-white h-24"
            />
          </CardContent>
        </Card>

        {/* Inventory Health Section */}
        <Card className="xl:col-span-6 border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
              Inventory Health
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex gap-4 mb-6">
              <div className="flex-1 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Low Stock</p>
                <p className="text-2xl font-black text-slate-900">{stockHealth.lowCount}</p>
                <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${stockHealth.low}%` }} />
                </div>
              </div>
              <div className="flex-1 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Out of Stock</p>
                <p className="text-2xl font-black text-rose-600">{stockHealth.outCount}</p>
                <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500" style={{ width: `${stockHealth.out}%` }} />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-900 mb-2">Priority Alerts</p>
              {inventoryItems.filter(p => p.lowStock || (p.stockInHand || 0) === 0).slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-2 w-2 rounded-full", (item.stockInHand || 0) === 0 ? "bg-rose-500" : "bg-amber-500")} />
                    <span className="text-sm font-semibold text-slate-700">{item.productName || item.product?.name}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] group-hover:bg-white">
                    {item.stockInHand || 0} left
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Underperforming Products */}
        <Card className="xl:col-span-6 border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-amber-500" />
              Underperforming
            </CardTitle>
            <CardDescription>Stale stock with low sell-through</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-1">
              {underperformingProducts.length > 0 ? underperformingProducts.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-xs">
                      {Math.round(product.percentage || 0)}%
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 line-clamp-1">{product.productName}</p>
                      <p className="text-[10px] font-medium text-slate-400 capitalize">{product.color} • {product.stockInHand || product.itemsRemaining} units left</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/stock/product-history?productId=${product.productId}`}>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <p className="text-sm font-medium">All products performing well!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="xl:col-span-12 border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <History className="h-5 w-5 text-indigo-500" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest ledger movements across the platform</CardDescription>
              </div>
              <Button variant="ghost" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                View All Records
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {recentEntries.map((entry, idx) => {
                const isSupplier = entry.partyType === "Supplier";
                const referenceId = entry.referenceId?._id || entry.referenceId;
                const link = isSupplier 
                  ? `/dispatch-orders/${referenceId}`
                  : `/selling/${referenceId}`;
                
                return (
                  <div 
                    key={idx} 
                    className="px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-all duration-200 cursor-pointer group"
                    onClick={() => referenceId && router.push(link)}
                  >
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                        isSupplier ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {isSupplier ? <Package className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {entry.partyName}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase font-black tracking-tighter h-4 px-1 leading-none rounded-sm border-slate-200">
                            {entry.partyType}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-[400px]">
                          {entry.description || "Ledger entry recorded"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-lg font-black tabular-nums",
                        (entry.debit || 0) > 0 ? "text-rose-600" : "text-emerald-600"
                      )}>
                        {(entry.debit || 0) > 0 ? `-${currency(entry.debit)}` : `+${currency(entry.credit)}`}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(entry.date).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: 'short', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { label: "Overview", content: overviewTab },
    {
      label: "Product Summary",
      content: <ProductSummaryReportPage />,
    },
    {
      label: "Stock Count",
      content: <StockCountTab />,
    },
    {
      label: "Receivables",
      content: <ReceivablesReportPage />,
    },
    {
      label: "Payables",
      content: <PayablesReportPage />,
    },
    // {
    //   label: "Balances",
    //   content: (
    //     <div className="space-y-6">
    //       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    //         <StatCard
    //           label="Active Accounts"
    //           value={(customersData?.totalActiveCustomers || 0).toString()}
    //           icon={Users}
    //           loading={customersLoading}
    //           color="warning"
    //         />
    //         <StatCard
    //           label="Total Receivables"
    //           value={currency(financialData?.receivables?.total || 0)}
    //           icon={TrendingUp}
    //           loading={financialLoading}
    //           color="success"
    //         />
    //         <StatCard
    //           label="Total Payables"
    //           value={currency(financialData?.payables?.total || 0)}
    //           icon={TrendingDown}
    //           loading={financialLoading}
    //           color="danger"
    //         />
    //         <StatCard
    //           label="Net Liquidity"
    //           value={currency(
    //             (financialData?.receivables?.total || 0) -
    //               (financialData?.payables?.total || 0)
    //           )}
    //           icon={Wallet}
    //           loading={financialLoading}
    //           color="purple"
    //         />
    //       </div>

    //       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    //         <Card className="border border-border bg-card rounded-lg overflow-hidden">
    //           <CardHeader className="p-8 pb-4">
    //             <CardTitle className="text-lg font-black text-slate-900 tracking-tight">
    //               Outstanding Receivables
    //             </CardTitle>
    //             <CardDescription className="text-xs">
    //               Top 5 debtors by ledger balance
    //             </CardDescription>
    //           </CardHeader>
    //           <CardContent className="p-0">
    //             <div className="divide-y divide-slate-50">
    //               {customersData?.activeCustomers
    //                 ?.filter((c) => (c.ledgerBalance || 0) > 0)
    //                 .slice(0, 5)
    //                 .map((customer, idx) => (
    //                   <div
    //                     key={idx}
    //                     className="px-8 py-5 flex items-center justify-between hover:bg-slate-50/30 transition-all duration-150 rounded-lg mx-2"
    //                   >
    //                     <span className="font-bold text-slate-900">
    //                       {customer.name || customer.company || "Unknown"}
    //                     </span>
    //                     <span className="font-black text-slate-900 tabular-nums">
    //                       {currency(customer.ledgerBalance || 0)}
    //                     </span>
    //                   </div>
    //                 ))}
    //             </div>
    //           </CardContent>
    //         </Card>

    //         <Card className="border border-border bg-card rounded-lg overflow-hidden">
    //           <CardHeader className="p-8 pb-4">
    //             <CardTitle className="text-lg font-black text-slate-900 tracking-tight">
    //               Outstanding Payables
    //             </CardTitle>
    //             <CardDescription className="text-xs">
    //               Top 5 suppliers by outstanding credit
    //             </CardDescription>
    //           </CardHeader>
    //           <CardContent className="p-0">
    //             <div className="divide-y divide-slate-50">
    //               {suppliersData?.topSuppliers
    //                 ?.slice(0, 5)
    //                 .map((supplier, idx) => (
    //                   <div
    //                     key={idx}
    //                     className="px-8 py-5 flex items-center justify-between hover:bg-slate-50/30 transition-all duration-150 rounded-lg mx-2"
    //                   >
    //                     <span className="font-bold text-slate-900">
    //                       {supplier.supplierName ||
    //                         supplier.company ||
    //                         "Unknown"}
    //                     </span>
    //                     <span className="font-black text-rose-600 tabular-nums">
    //                       {currency(supplier.totalAmount || 0)}
    //                     </span>
    //                   </div>
    //                 ))}
    //             </div>
    //           </CardContent>
    //         </Card>
    //       </div>
    //     </div>
    //   ),
    // },
  ];

  // Tab state sync
  const initialTab = Number(searchParams.get("tab") ?? 0);
  const [activeTab, setActiveTab] = useState(initialTab);
  const handleTabChange = (idx) => {
    setActiveTab(idx);
    router.replace(`/home?tab=${idx}`, { scroll: false });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
              <Monitor className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-none">
                Command Center
              </h1>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  System Live • {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden lg:flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-black text-slate-900 tabular-nums uppercase tracking-tight">
              {new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <Button
            variant="default"
            className="h-11 px-6 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
            onClick={() => router.push("/dispatch-orders")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Dispatch
          </Button>
        </div>
      </header>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}