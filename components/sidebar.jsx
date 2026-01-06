"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
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
  DollarSign,
  Wallet,
  FileText,
} from "lucide-react"

const items = [
  // { href: "/home", label: "Dashboard", icon: Home },
  { href: "/dispatch-orders", label: "Dispatch Orders", icon: Truck },
  { href: "/stock", label: "Stock & Inventory", icon: Boxes },
  { href: "/buying", label: "Buying & Sourcing", icon: ShoppingBag },
  { type: "separator", label: "Finance & Accounts" },
  // { href: "/cash-tracking", label: "Cash Tracking", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: FileText },
  { href: "/customer-ledger", label: "Customer Ledger", icon: BookUser },
  { href: "/supplier-ledger", label: "Supplier Ledger", icon: Users },
  { type: "separator", label: "Operations" },
  { href: "/daily-report-form", label: "Daily Reports", icon: ClipboardList },
  { href: "/logistics", label: "Logistics", icon: Truck },
  { href: "/logistics-ledger", label: "Logistics Ledger", icon: Truck },
  { type: "separator", label: "Settings" },
  { href: "/setup", label: "System Setup", icon: Settings },
  { href: "/product-types", label: "Product Types", icon: Package },
  { href: "/users", label: "User Management", icon: UserCog },
  { href: "/delivery-personnel", label: "Delivery Staff", icon: Truck },
  { href: "/cost-types", label: "Cost Config", icon: DollarSign },
  { href: "/reports", label: "System Reports", icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("sidebar:collapsed") : null
    if (saved != null) setCollapsed(saved === "true")
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem("sidebar:collapsed", String(collapsed))
    } catch { }
  }, [collapsed])

  return (
    <aside
      className={`border-r border-slate-100 bg-white text-slate-900 hidden md:flex md:flex-col transition-all duration-300 ${collapsed ? "w-20" : "w-64"
        }`}
      aria-label="Main navigation"
      data-collapsed={collapsed}
    >
      <div className="flex items-center justify-between px-6 py-6 border-b border-slate-50">
        <span className={`text-sm font-black uppercase tracking-widest text-blue-600 ${collapsed ? "sr-only" : ""}`}>KI CRM</span>
        <button
          type="button"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((v) => !v)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"
        >
          <PanelLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar">
        <ul className="py-6 px-3 space-y-1">
          {items.map((it, idx) => {
            if (it.type === "separator") {
              return !collapsed ? (
                <li key={`sep-${idx}`} className="pt-6 pb-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {it.label}
                </li>
              ) : (
                <li key={`sep-${idx}`} className="h-px bg-slate-50 my-4 mx-4"></li>
              )
            }

            const active = pathname === it.href || (it.href !== '/home' && pathname.startsWith(it.href + '/'))
            const Icon = it.icon
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  prefetch={true}
                  title={it.label}
                  aria-label={it.label}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-all rounded-xl relative group
                    ${active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-100 font-bold"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-slate-900"}`} aria-hidden="true" />
                  {!collapsed && <span className="truncate">{it.label}</span>}
                  {active && !collapsed && (
                    <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white/40"></div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Mobile trigger (hidden on desktop) */}
      <button className="md:hidden border-t border-slate-100 px-4 py-4 text-sm font-bold bg-white" onClick={() => setOpen(!open)}>
        Menu
      </button>

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
      `}</style>
    </aside>
  )
}
