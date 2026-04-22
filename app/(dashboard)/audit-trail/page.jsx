"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/store";
import { useAuditLogs } from "@/lib/hooks/useAuditLogs";
import DataTable from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import BackButton from "@/components/BackButton";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { History, Globe, Laptop, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ACTION_STYLES = {
  CREATE: "bg-green-100 text-green-800 border-green-200",
  UPDATE: "bg-blue-100 text-blue-800 border-blue-200",
  DELETE: "bg-red-100 text-red-800 border-red-200",
  STATUS_CHANGE: "bg-amber-100 text-amber-800 border-amber-200",
  LOGIN: "bg-purple-100 text-purple-800 border-purple-200",
  UPDATE_BALANCE: "bg-indigo-100 text-indigo-800 border-indigo-200",
  DEACTIVATE: "bg-slate-100 text-slate-800 border-slate-200",
};

const columns = [
  {
    header: "Timestamp",
    accessor: "timestamp",
    cell: (row) => (
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
          {new Date(row.timestamp).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          })} {new Date(row.timestamp).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
          }).toUpperCase()}
        </span>
      </div>
    ),
  },
  {
    header: "User",
    accessor: "userName",
    cell: (row) => (
      <div className="flex flex-col max-w-[150px]">
        <span className="text-sm font-medium truncate" title={row.userName}>{row.userName || "System"}</span>
        <span className="text-[10px] text-muted-foreground truncate" title={row.userEmail}>{row.userEmail}</span>
      </div>
    ),
  },
  {
    header: "Action",
    accessor: "action",
    cell: (row) => (
      <Badge variant="outline" className={`text-[10px] uppercase font-bold py-0 h-5 ${ACTION_STYLES[row.action] || "bg-slate-50"}`}>
        {row.action}
      </Badge>
    ),
  },
  {
    header: "Resource",
    accessor: "resource",
    cell: (row) => (
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-slate-700">{row.resource}</span>
        {row.resourceId && <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[80px]">ID: {String(row.resourceId).slice(-6)}</span>}
      </div>
    ),
  },
  {
    header: "Description",
    accessor: "description",
    cell: (row) => (
      <span className="text-xs text-slate-600 line-clamp-2 max-w-[300px]">
        {row.description}
      </span>
    ),
  },
  {
    header: "Audit Metadata",
    accessor: "ip",
    cell: (row) => (
      <div className="flex flex-col text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Globe className="h-3 w-3" />
          <span>{row.ip || "0.0.0.0"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Laptop className="h-3 w-3" />
          <span className="truncate max-w-[100px]" title={row.userAgent}>
            {row.userAgent?.split(' ')[0] || "Unknown"}
          </span>
        </div>
      </div>
    ),
  },
];

export default function AuditTrailPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  // Guard: super-admin only
  useEffect(() => {
    if (user && user.role !== "super-admin") {
      router.replace("/home");
    }
  }, [user, router]);

  const { data, isLoading } = useAuditLogs({
    page,
    limit: 20,
    search: search || undefined,
    resource: resourceFilter || undefined,
    action: actionFilter || undefined,
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <History className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold tracking-tight">Audit Trail</h1>
            </div>
            <p className="text-sm text-muted-foreground">System-wide activity logging and security monitoring</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            {/* Export or other actions could go here */}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
                placeholder="Search description, user..." 
                className="pl-9 h-10" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>
        <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select 
                className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
            >
                <option value="">All Resources</option>
                <option value="User">Users</option>
                <option value="Product">Products</option>
                <option value="Sale">Sales</option>
                <option value="DispatchOrder">Dispatch Orders</option>
                <option value="Inventory">Inventory</option>
                <option value="Ledger">Ledger</option>
                <option value="Payment">Payments</option>
                <option value="Return">Returns</option>
                <option value="Campaign">Campaigns</option>
                <option value="Expense">Expenses</option>
                <option value="Supplier">Suppliers</option>
                <option value="Buyer">Buyers</option>
            </select>
        </div>
        <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select 
                className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
            >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="STATUS_CHANGE">Status Change</option>
                <option value="LOGIN">Login</option>
                <option value="UPDATE_BALANCE">Balance Change</option>
            </select>
        </div>
        <Button 
            variant="secondary" 
            className="h-10 bg-slate-900 text-white hover:bg-slate-800"
            onClick={() => {
                setSearch("");
                setResourceFilter("");
                setActionFilter("");
                setPage(1);
            }}
        >
            Reset Filters
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={logs}
          loading={isLoading}
        onRowClick={(row) => router.push(`/audit-trail/${row._id}`)}
          enableSearch={false} // Using custom search bar above
          paginate={true}
          manualPagination={true}
          currentPage={pagination.currentPage || 1}
          totalPages={pagination.totalPages || 1}
          totalItems={pagination.totalItems || 0}
          pageSize={20}
          onPageChange={setPage}
          hideActions
        />
      </div>

      
      <style jsx global>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
