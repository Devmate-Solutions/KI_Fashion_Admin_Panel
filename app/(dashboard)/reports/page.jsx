"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Truck,
  Activity,
  RotateCcw,
  FileText,
  DollarSign,
  CreditCard,
  PackageSearch,
} from "lucide-react"

const reportCategories = [
  {
    title: "Financial Reports",
    description: "Revenue, expenses, and profitability analysis",
    reports: [
      {
        name: "Profit & Loss Report",
        description: "Revenue vs expenses summary with net profit/loss",
        href: "/reports/profit-loss",
        icon: TrendingUp,
        color: "text-green-600 bg-green-50",
      },
      {
        name: "Receivables Report",
        description: "Buyer outstanding amounts and aging",
        href: "/reports/receivables",
        icon: DollarSign,
        color: "text-blue-600 bg-blue-50",
      },
      {
        name: "Payables Report",
        description: "Supplier outstanding amounts and aging",
        href: "/reports/payables",
        icon: CreditCard,
        color: "text-orange-600 bg-orange-50",
      },
    ],
  },
  {
    title: "Sales Reports",
    description: "Daily sales transactions and analysis",
    reports: [
      {
        name: "Daily Sale Report",
        description: "All sales transactions by date range",
        href: "/reports/daily-sales",
        icon: ShoppingCart,
        color: "text-purple-600 bg-purple-50",
      },
      {
        name: "Daily Sale Product-wise",
        description: "Sales breakdown by individual products",
        href: "/reports/sales-product-wise",
        icon: Package,
        color: "text-indigo-600 bg-indigo-50",
      },
      {
        name: "Daily Sales Return Report",
        description: "Customer returns and refunds",
        href: "/reports/sales-returns",
        icon: RotateCcw,
        color: "text-red-600 bg-red-50",
      },
    ],
  },
  {
    title: "Buying Reports",
    description: "Purchase orders and supplier transactions",
    reports: [
      {
        name: "Daily Buying Report",
        description: "All purchase orders by date range",
        href: "/reports/daily-buying",
        icon: Truck,
        color: "text-teal-600 bg-teal-50",
      },
      {
        name: "Daily Buying Product-wise",
        description: "Purchases breakdown by individual products",
        href: "/reports/buying-product-wise",
        icon: Boxes,
        color: "text-cyan-600 bg-cyan-50",
      },
      {
        name: "Daily Buying Return Report",
        description: "Returns to suppliers",
        href: "/reports/buying-returns",
        icon: RotateCcw,
        color: "text-amber-600 bg-amber-50",
      },
    ],
  },
  {
    title: "Inventory & Activity",
    description: "Stock levels and user activity tracking",
    reports: [
      {
        name: "Stock in Hand Report",
        description: "Current inventory levels and valuation",
        href: "/reports/stock-in-hand",
        icon: Boxes,
        color: "text-emerald-600 bg-emerald-50",
      },
      {
        name: "Packet Reconciliation",
        description: "Compare inventory vs packet stock to find discrepancies",
        href: "/reports/packet-reconciliation",
        icon: PackageSearch,
        color: "text-amber-600 bg-amber-50",
      },
      {
        name: "Daily Activity Report",
        description: "User activity log and audit trail",
        href: "/reports/activity-log",
        icon: Activity,
        color: "text-slate-600 bg-slate-50",
      },
    ],
  },
]

export default function ReportsPage() {
  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate detailed reports with date filtering and print functionality
        </p>
      </header>

      {/* Report Categories */}
      <div className="space-y-8">
        {reportCategories.map((category) => (
          <div key={category.title}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{category.title}</h2>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.reports.map((report) => {
                const Icon = report.icon
                return (
                  <Link key={report.href} href={report.href}>
                    <Card className="h-full hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group">
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${report.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base group-hover:text-primary transition-colors">
                              {report.name}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1 line-clamp-2">
                              {report.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <FileText className="h-3 w-3 mr-1" />
                          <span>Click to generate report</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Info */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-medium mb-2">Report Features</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• All reports support date range filtering</li>
          <li>• Print-ready format with company header</li>
          <li>• Sortable and searchable tables</li>
          <li>• Summary statistics at a glance</li>
          <li>• British date format (DD/MM/YYYY) and GBP currency</li>
        </ul>
      </div>
    </div>
  )
}
