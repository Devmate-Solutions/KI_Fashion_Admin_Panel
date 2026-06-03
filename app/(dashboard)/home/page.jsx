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
  useTopStatsReport,
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
  Trophy,          // Added for Top Performers
  ArrowDownCircle, // Added for Top Payables
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

// Make sure to export your fetcher in this location, or adjust the path accordingly
import { getDashboardTopStats } from "@/lib/api/endpoints/reports"

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

  // Time calculations
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

  const [topStatsDateRange, setTopStatsDateRange] = useState({
    startDate: thirtyDaysAgo,
    endDate: today
  });

  // Fetch all dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardSummary();
  const { data: salesData, isLoading: salesLoading } = useSalesReport({ startDate: fourteenDaysAgo, endDate: today });
  const { data: financialData, isLoading: financialLoading } = useFinancialReport();
  const { data: suppliersData } = useSuppliersReport();
  const { data: customersData, isLoading: customersLoading } = useCustomersReport({ startDate: thirtyDaysAgo, endDate: today });
  const { data: inventoryData, isLoading: inventoryLoading } = useInventoryList({ limit: 100 });
  const { data: inventoryValuationData, isLoading: inventoryValuationLoading } = useInventoryValuationReport();
  const { data: supplierLedgerData } = useAllSupplierLedgers({ limit: 10 });
  const { data: buyerLedgerData } = useAllBuyerLedgers({ limit: 10 });
  const { data: productSummaryData, isLoading: productSummaryLoading } = useProductSummaryReport();

  // --- NEW: Fetch Top Performers using React Query ---
  const { data: topStatsData, isLoading: topStatsLoading } = useTopStatsReport({
    startDate: topStatsDateRange.startDate,
    endDate: topStatsDateRange.endDate,
  });
  const {
    topBuyers = [],
    topReceivables = [],
    topPayables = []
  } = topStatsData || {};

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
          label="Total Monthly Sales"
          value={currency(dashboardData?.totalSales?.thisMonth || 0)}
          icon={TrendingUp}
          loading={dashboardLoading}
          color="primary"
          description=""
          onClick={() => router.push("/selling")}
        />
        <StatCard
          label="Stock Value"
          value={currency(totalStockValue)}
          icon={Package}
          loading={inventoryLoading || inventoryValuationLoading}
          color="purple"
          description=""
          onClick={() => router.push("/stock")}
        />
        <StatCard
          label="Total Sales"
          value={dashboardData?.totalOrders?.thisMonth?.toString() || "0"}
          icon={ShoppingCart}
          loading={dashboardLoading}
          color="success"
          description=""
          onClick={() => router.push("/selling")}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* --- NEW: Top Performers Section --- */}
        <div className="xl:col-span-12 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Top Performers
              </h2>
              <p className="text-sm text-slate-500">Highest value accounts by date range</p>
            </div>

            {/* Top Stats Date Range Picker */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm w-fit">
              <input
                type="date"
                value={topStatsDateRange.startDate}
                onChange={(e) => setTopStatsDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="text-xs border-none bg-slate-50 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
              />
              <span className="text-slate-400 text-xs font-medium">to</span>
              <input
                type="date"
                value={topStatsDateRange.endDate}
                onChange={(e) => setTopStatsDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="text-xs border-none bg-slate-50 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Top Buyers */}
            <Card className="border border-slate-200 shadow-sm flex flex-col bg-white">
              <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Top 5 Buyers (Sales)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                {topStatsLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 bg-slate-100 animate-pulse rounded" />)}
                  </div>
                ) : topBuyers.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {topBuyers.map((buyer, idx) => (
                      <div key={buyer._id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="text-xs font-bold text-slate-400 w-3">{idx + 1}.</span>
                          <div className="truncate">
                            <p className="text-sm font-medium text-slate-900 truncate">{buyer.name || 'Unknown'}</p>
                            {buyer.contact && <p className="text-[10px] text-slate-500 truncate">{buyer.contact}</p>}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-slate-700 shrink-0 ml-2">
                          {currency(buyer.totalValue)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-slate-500">No data for this period</div>
                )}
              </CardContent>
            </Card>

            {/* Top Receivables */}
            <Card className="border border-slate-200 shadow-sm flex flex-col bg-white">
              <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                  Top 5 Receivables
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                {topStatsLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 bg-slate-100 animate-pulse rounded" />)}
                  </div>
                ) : topReceivables.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {topReceivables.map((rec, idx) => (
                      <div key={rec._id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="text-xs font-bold text-slate-400 w-3">{idx + 1}.</span>
                          <p className="text-sm font-medium text-slate-900 truncate">{rec.name || 'Unknown'}</p>
                        </div>
                        <span className="text-sm font-bold text-emerald-600 shrink-0 ml-2">
                          {currency(rec.netBalance)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-slate-500">No outstanding receivables</div>
                )}
              </CardContent>
            </Card>

            {/* Top Payables */}
            <Card className="border border-slate-200 shadow-sm flex flex-col bg-white">
              <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4 text-rose-500" />
                  Top 5 Payables
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                {topStatsLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 bg-slate-100 animate-pulse rounded" />)}
                  </div>
                ) : topPayables.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {topPayables.map((pay, idx) => (
                      <div key={pay._id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="text-xs font-bold text-slate-400 w-3">{idx + 1}.</span>
                          <p className="text-sm font-medium text-slate-900 truncate">{pay.name || 'Unknown'}</p>
                        </div>
                        <span className="text-sm font-bold text-rose-600 shrink-0 ml-2">
                          {currency(pay.netBalance)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-slate-500">No outstanding payables</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        {/* --- END: Top Performers Section --- */}

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