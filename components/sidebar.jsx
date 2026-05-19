"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Settings,
  ShoppingBag,
  ReceiptText,
  Boxes,
  BookUser,
  Users,
  ClipboardList,
  PanelLeft,
  BarChart3,
  UserCog,
  Package,
  Truck,
  Wallet,
  FileText,
  ChevronDown,
  ChevronRight,
  X,
  Menu,
  RotateCcw,
  Settings2,
  ClipboardCheck,
  ListChecks,
  History
} from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useAuthStore } from "@/store/store";
import { usePendingRequestCount } from "@/lib/hooks/useEditRequests";
const items = [
  { href: "/home", label: "Dashboard", icon: Home },
  { href: "/dispatch-orders", label: "Dispatch Orders", icon: Truck },
  { href: "/stock", label: "Stock & Inventory", icon: Boxes },
  { href: "/buying", label: "Buying & Sourcing", icon: ShoppingBag },
  { href: "/selling", label: "Selling", icon: BookUser },
  // { type: "separator", label: "Returns" },
  // { href: "/stock/return", label: "Buying Returns", icon: RotateCcw },
  // { href: "/selling/return", label: "Sale Returns", icon: RotateCcw },
  { type: "separator", label: "Finance & Accounts" },
  // { href: "/cash-tracking", label: "Cash Tracking", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: FileText },
  { href: "/customer-ledger", label: "Buyer Ledger", icon: BookUser },
  { href: "/supplier-ledger", label: "Supplier Ledger", icon: Users },
  { type: "separator", label: "Reports & Analytics" },
  { type: "reports", label: "Reports", icon: BarChart3 },
  { type: "separator", label: "Operations" },
  // { href: "/daily-report-form", label: "Daily Reports", icon: ClipboardList },
  { href: "/logistics", label: "Logistics", icon: Truck },
  { href: "/logistics-ledger", label: "Logistics Ledger", icon: Truck },
  { type: "separator", label: "Settings" },
  { href: "/setup", label: "System Setup", icon: Settings, superAdminOnly: true },
  // { href: "/product-types", label: "Product Types", icon: Package },
  { href: "/users", label: "User Management", icon: UserCog },
  // { href: "/delivery-personnel", label: "Delivery Staff", icon: Truck },
  { href: "/cost-types", label: "Cost Config", icon: Settings2 },
  { type: "separator", label: "Governance" },
  { href: "/campaigns", label: "Campaigns", icon: ListChecks },
  { href: "/approval-queue", label: "Approval Queue", icon: ClipboardCheck, superAdminOnly: true, hasBadge: true },
  { href: "/audit-trail", label: "Audit Trail", icon: History, superAdminOnly: true },
  { href: "/my-requests", label: "My Requests", icon: ListChecks },
];

const reportLinks = [
  { href: "/reports/daily-sales", label: "Daily Sales (Invoice Wise)" },
  { href: "/reports/daily-buying", label: "Daily Buying (Invoice Wise)" },
  { href: "/reports/sales-product-wise", label: "Sales (Product Wise)" },
  { href: "/reports/buying-product-wise", label: "Buying (Product Wise)" },
  { href: "/reports/stock-in-hand", label: "Stock in Hand" },
  { href: "/reports/receivables", label: "Receivables Report" },
  { href: "/reports/payables", label: "Payables Report" },
  { href: "/reports/profit-loss", label: "Comparison Report (PNL)" },
  { href: "/reports/cash-in-hand", label: "Cash in Hand Report" },
  // { href: "/reports/sales-returns", label: "Sales Returns (Invoice Wise)" },
  { href: "/reports/sales-returns-product-wise", label: "Sales Returns (Product Wise)" },
  { href: "/reports/buying-returns-product-wise", label: "Buying Returns (Product Wise)" },
  { href: "/reports/month-end", label: "Month-end Report" },
];

const ROUTE_PERMISSIONS = {
  '/dashboard': {},
  '/buyers': { permissions: ['buyers'] },
  '/sales': { permissions: ['sales'] },
  '/products': { permissions: ['products'] },
  '/inventory': { permissions: ['inventory'] },
  '/purchases': { permissions: ['purchases'] },
  '/expenses': { roles: ['super-admin', 'admin', 'manager', 'employee', 'accountant'] },
  '/users': { roles: ['super-admin', 'admin'] },
  '/reports': { roles: ['super-admin', 'admin', 'manager', 'employee'] },
  '/settings': { roles: ['super-admin'] },
  '/logistics-ledger': { roles: ['super-admin', 'admin'] },
  '/logistics': { roles: ['super-admin', 'admin'] },
  '/dispatch-orders': { roles: ['super-admin', 'admin'] },
  '/campaigns': { roles: ['super-admin', 'admin'] },
  '/product-types': { roles: ['super-admin'] },
  '/cost-types': {},
  '/delivery-personnel': { roles: ['super-admin'] },
  '/home': { roles: ['super-admin', 'admin', 'accountant'] },
  '/buying': { roles: ['super-admin', 'admin', 'manager', 'employee'] },
  '/selling': { roles: ['super-admin', 'admin', 'manager', 'employee'] },
  '/stock': { roles: ['super-admin', 'admin', 'manager', 'employee'] },
  '/customer-ledger': {},
  '/supplier-ledger': {},
  '/daily-report-form': {},
  '/setup': { roles: ['super-admin'] },
};

/**
 * Check if the user has access to a specific route based on role/permissions
 */
const canAccessPath = (href, user) => {
  if (!href) return true;
  if (!user) return false;

  // Super-admins have universal access
  if (user.role === 'super-admin') return true;

  // Find the matching configuration (longest match first for specificity)
  const match = Object.entries(ROUTE_PERMISSIONS)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([route]) => href.startsWith(route));

  if (!match) return true; // Default to visible if route is not configured

  const [, config] = match;

  // Check role requirements
  if (config.roles && !config.roles.includes(user.role)) {
    return false;
  }

  // Check permission requirements
  if (config.permissions) {
    if (!user.permissions) return false;
    const hasRequiredPermission = config.permissions.some(p =>
      user.permissions.includes(p)
    );
    if (!hasRequiredPermission) return false;
  }

  return true;
};

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super-admin";
  const isEmployee = user?.role === "employee";
  const { data: pendingCount } = usePendingRequestCount();

  // Filter items based on dynamic access path check and superAdminOnly property
  const visibleItems = items.filter((it) => {
    // Hide superAdminOnly items for non-super-admins
    if (it.superAdminOnly && !isSuperAdmin) return false;

    // Separate handling for custom report menu item type
    const pathToCheck = it.type === "reports" ? "/reports" : it.href;

    if (!canAccessPath(pathToCheck, user)) return false;

    return true;
  }).filter((it, index, array) => {
    // Second pass: Remove redundant separators
    if (it.type === "separator") {
      // Check if there are any non-separator items before the next separator or end of list
      const nextItems = array.slice(index + 1);
      const hasNextContent = nextItems.some(next => next.type !== "separator");
      const isNextSeparator = nextItems[0]?.type === "separator";

      if (!hasNextContent || isNextSeparator) return false;
    }
    return true;
  });

  // Filter report links for employee or by dynamic access control
  const filteredReportLinks = isEmployee
    ? reportLinks.filter(rl => [
      "/reports/receivables",
      "/reports/daily-sales",
      "/reports/profit-loss",
      "/reports/cash-in-hand"
    ].includes(rl.href))
    : reportLinks.filter(rl => canAccessPath(rl.href, user));

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem("sidebar:collapsed")
        : null;
    if (saved != null) setCollapsed(saved === "true");

    // Auto-expand reports if on a report page
    if (pathname?.startsWith('/reports/')) {
      setReportsOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    try {
      window.localStorage.setItem("sidebar:collapsed", String(collapsed));
      // Update body data attribute for main content margin adjustment
      document.body.setAttribute('data-sidebar-collapsed', String(collapsed));
    } catch { }
  }, [collapsed]);

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"
          }`}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between px-6 py-6 border-b border-slate-50">
          {/* <Imagse src="/ki-logo.png" alt="KI Fashion" width={120} height={32} className="h-8 w-auto object-contain" priority /> */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 transition-all"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto custom-scrollbar h-[calc(100vh-80px)]">
          <ul className="py-6 px-3 space-y-1">
            {visibleItems.map((it, idx) => {
              if (it.type === "separator") {
                return (
                  <li
                    key={`sep-${idx}`}
                    className="pt-6 pb-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"
                  >
                    {it.label}
                  </li>
                );
              }

              if (it.type === "reports") {
                const anyReportActive = pathname?.startsWith('/reports');
                const Icon = it.icon;
                return (
                  <li key="reports-collapsible-mobile">
                    <Collapsible.Root open={reportsOpen} onOpenChange={setReportsOpen}>
                      <Collapsible.Trigger asChild>
                        <button
                          type="button"
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all rounded-xl relative group min-h-[44px] ${anyReportActive ? "bg-blue-600 text-white shadow-lg shadow-blue-100 font-bold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
                        >
                          <Icon className={`h-5 w-5 shrink-0 ${anyReportActive ? "text-white" : "text-slate-400 group-hover:text-slate-900"}`} aria-hidden="true" />
                          <span className="truncate flex-1 text-left">{it.label}</span>
                          {reportsOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                        </button>
                      </Collapsible.Trigger>
                      <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                        <ul className="mt-1 space-y-1">
                          {filteredReportLinks.map((report) => {
                            const active = pathname === report.href;
                            return (
                              <li key={report.href}>
                                <Link href={report.href} prefetch={true} onClick={() => setOpen(false)} className={`flex items-center gap-3 pl-12 pr-4 py-2.5 text-xs transition-all rounded-xl relative ${active ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                                  <span className="truncate">{report.label}</span>
                                  {active && <div className="absolute left-6 w-1.5 h-1.5 rounded-full bg-blue-600"></div>}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </Collapsible.Content>
                    </Collapsible.Root>
                  </li>
                );
              }

              const active =
                pathname === it.href ||
                (it.href !== "/home" && pathname.startsWith(it.href + "/"));
              const Icon = it.icon;
              return (
                <li key={idx}>
                  <Link
                    href={it.href}
                    prefetch={true}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-all rounded-xl relative group min-h-[44px] ${active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-100 font-bold"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 ${active
                        ? "text-white"
                        : "text-slate-400 group-hover:text-slate-900"
                        }`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{it.label}</span>
                    {it.hasBadge && pendingCount > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {pendingCount > 99 ? "99+" : pendingCount}
                      </span>
                    )}
                    {active && !it.hasBadge && (
                      <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white/40"></div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`border-r border-slate-100 bg-white text-slate-900 hidden md:flex md:flex-col transition-all duration-300 ${collapsed ? "w-20" : "w-64"
          }`}
        aria-label="Main navigation"
        data-collapsed={collapsed}
      >
        <div className="flex items-center justify-right px-6 py-2 border-b border-slate-50">

          <button
            type="button"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-50 hover:bg-blue-50 hover:text-blue-600 active:scale-95 transition-all duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <PanelLeft
              className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""
                }`}
            />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar">
          <ul className="py-6 px-3 space-y-1">
            {visibleItems.map((it, idx) => {
              if (it.type === "separator") {
                return !collapsed ? (
                  <li
                    key={`sep-${idx}`}
                    className="pt-6 pb-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"
                  >
                    {it.label}
                  </li>
                ) : (
                  <li
                    key={`sep-${idx}`}
                    className="h-px bg-slate-50 my-4 mx-4"
                  ></li>
                );
              }

              // Reports collapsible menu
              if (it.type === "reports") {
                const anyReportActive = pathname?.startsWith('/reports');
                const Icon = it.icon;

                return (
                  <li key="reports-collapsible">
                    <Collapsible.Root open={reportsOpen} onOpenChange={setReportsOpen}>
                      <Collapsible.Trigger asChild>
                        <button
                          type="button"
                          title={it.label}
                          aria-label={it.label}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all rounded-xl relative group
                          ${anyReportActive
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-100 font-bold"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                          <Icon
                            className={`h-5 w-5 shrink-0 ${anyReportActive
                              ? "text-white"
                              : "text-slate-400 group-hover:text-slate-900"
                              }`}
                            aria-hidden="true"
                          />
                          {!collapsed && (
                            <>
                              <span className="truncate flex-1 text-left">{it.label}</span>
                              {reportsOpen ? (
                                <ChevronDown className="h-4 w-4 shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0" />
                              )}
                            </>
                          )}
                          {anyReportActive && !collapsed && (
                            <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white/40"></div>
                          )}
                        </button>
                      </Collapsible.Trigger>

                      {!collapsed && (
                        <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                          <ul className="mt-1 space-y-1">
                            {filteredReportLinks.map((report) => {
                              const active = pathname === report.href;
                              return (
                                <li key={report.href}>
                                  <Link
                                    href={report.href}
                                    prefetch={true}
                                    title={report.label}
                                    aria-label={report.label}
                                    className={`flex items-center gap-3 pl-12 pr-4 py-2.5 text-sm transition-all rounded-xl relative
                                    ${active
                                        ? "bg-blue-50 text-blue-700 font-semibold"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                      }`}
                                  >
                                    <span className="truncate text-xs">{report.label}</span>
                                    {active && (
                                      <div className="absolute left-6 w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                                    )}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </Collapsible.Content>
                      )}
                    </Collapsible.Root>
                  </li>
                );
              }

              const active =
                pathname === it.href ||
                (it.href !== "/home" && pathname.startsWith(it.href + "/"));
              const Icon = it.icon;
              return (
                <li key={it.href || it.name || index}>
                  <Link
                    href={it.href || '#'}
                    prefetch={true}
                    title={it.label}
                    aria-label={it.label}
                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 ease-in-out rounded-md relative group min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
                    ${active
                        ? "bg-blue-600 text-white font-bold"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 ${active
                        ? "text-white"
                        : "text-slate-400 group-hover:text-slate-900"
                        }`}
                      aria-hidden="true"
                    />
                    {!collapsed && <span className="truncate">{it.label}</span>}
                    {!collapsed && it.hasBadge && pendingCount > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {pendingCount > 99 ? "99+" : pendingCount}
                      </span>
                    )}
                    {collapsed && it.hasBadge && pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    )}
                    {active && !collapsed && !it.hasBadge && (
                      <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white/40"></div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #e2e8f0;
        }

        @keyframes collapsible-down {
          from {
            height: 0;
            opacity: 0;
          }
          to {
            height: var(--radix-collapsible-content-height);
            opacity: 1;
          }
        }

        @keyframes collapsible-up {
          from {
            height: var(--radix-collapsible-content-height);
            opacity: 1;
          }
          to {
            height: 0;
            opacity: 0;
          }
        }

        .animate-collapsible-down {
          animation: collapsible-down 0.2s ease-out;
        }

        .animate-collapsible-up {
          animation: collapsible-up 0.2s ease-out;
        }
      `}</style>
      </aside>
    </>
  );
}
