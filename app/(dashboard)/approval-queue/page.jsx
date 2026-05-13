"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/store";
import { useEditRequests } from "@/lib/hooks/useEditRequests";
import DataTable from "@/components/data-table";
import Tabs from "@/components/tabs";
import { Badge } from "@/components/ui/badge";
import RequestReviewPanel from "@/components/modals/RequestReviewPanel";
import BackButton from "@/components/BackButton";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Search, Filter, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BritishDatePicker from "@/components/BritishDatePicker";

const STATUS_TABS = ["Pending", "Approved", "Rejected", "All"];

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const ENTITY_LABELS = {
  "dispatch-order": "Dispatch Order",
  sale: "Sale",
  payment: "Payment",
  "supplier-payment": "Supplier Payment",
  expense: "Expense",
  return: "Return",
  "sale-return": "Sale Return",
};

const columns = [
  {
    header: "Request #",
    accessor: "requestNumber",
    cell: (row) => <span className="font-mono text-xs">{row.requestNumber}</span>,
  },
  {
    header: "Type",
    accessor: "requestType",
    cell: (row) => (
      <Badge variant={row.requestType === "delete" ? "destructive" : "secondary"} className="text-xs">
        {row.requestType}
      </Badge>
    ),
  },
  {
    header: "Entity",
    accessor: "entityType",
    cell: (row) => (
      <span className="text-sm">
        {ENTITY_LABELS[row.entityType] || row.entityType}
        {row.entityRef && <span className="text-muted-foreground ml-1">#{row.entityRef}</span>}
      </span>
    ),
  },
  {
    header: "Requested By",
    accessor: "requestedByName",
    cell: (row) => (
      <div className="text-sm">
        <p className="font-medium">{row.requestedByName || "Unknown"}</p>
        {row.requestedBy?.role && <p className="text-[10px] text-muted-foreground uppercase">{row.requestedBy.role}</p>}
      </div>
    ),
  },
  {
    header: "Reason",
    accessor: "reason",
    cell: (row) => (
      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
        {row.reason}
      </span>
    ),
  },
  {
    header: "Status",
    accessor: "status",
    cell: (row) => (
      <Badge variant="outline" className={`text-xs ${STATUS_STYLES[row.status] || ""}`}>
        {row.status}
      </Badge>
    ),
  },
  {
    header: "Date",
    accessor: "createdAt",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {new Date(row.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </span>
    ),
  },
];

export default function ApprovalQueuePage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [requestedByFilter, setRequestedByFilter] = useState("");
  const [requestedByRole, setRequestedByRole] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  // Guard: super-admin only
  useEffect(() => {
    if (user && user.role !== "super-admin") {
      router.replace("/home");
    }
  }, [user, router]);

  const statusFilter = activeTab < 3 ? STATUS_TABS[activeTab].toLowerCase() : undefined;

  const { data, isLoading } = useEditRequests({
    page,
    limit: 15,
    status: statusFilter,
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    requestedBy: requestedByFilter || undefined,
    requestedByRole: requestedByRole || undefined,
    entityType: entityFilter || undefined,
  });

  const requests = data?.requests || [];
  const pagination = data?.pagination || {};

  const handleTabChange = (idx) => {
    setActiveTab(idx);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-bold">Approval Queue</h1>
        </div>
      </div>

      {/* <Tabs tabs={STATUS_TABS} activeTab={activeTab} onTabChange={handleTabChange} /> */}

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {/* <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search requests..." className="pl-9 h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div> */}
        <div className="relative">
          <BritishDatePicker
            value={startDate || null}
            onChange={(date) => setStartDate(date ? date.toLocaleDateString("en-CA") : "")}
            placeholder="Start date"
            className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm"
          />
        </div>
        <div className="relative">
          <BritishDatePicker
            value={endDate || null}
            onChange={(date) => setEndDate(date ? date.toLocaleDateString("en-CA") : "")}
            placeholder="End date"
            className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm"
          />
        </div>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Requested by (name/email)" className="pl-9 h-10" value={requestedByFilter} onChange={(e) => setRequestedByFilter(e.target.value)} />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm" value={requestedByRole} onChange={(e) => setRequestedByRole(e.target.value)}>
            <option value="">All Roles</option>
            <option value="super-admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          {/* <select className="w-full h-10 pl-3 pr-4 rounded-md border border-input bg-background text-sm" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
            <option value="">All Entities</option>
            {Object.keys(ENTITY_LABELS).map(k => <option key={k} value={k}>{ENTITY_LABELS[k]}</option>)}
          </select> */}
          <Button className="h-10" variant="secondary" onClick={() => {
            setSearch(""); setStartDate(""); setEndDate(""); setRequestedByFilter(""); setRequestedByRole(""); setEntityFilter(""); setPage(1);
          }}>Reset</Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={requests}
        loading={isLoading}
        onRowClick={(row) => setSelectedRequestId(row._id)}
        enableSearch={true}
        onSearch={setSearch}
        paginate={true}
        manualPagination={true}
        currentPage={pagination.page || 1}
        totalPages={pagination.pages || 1}
        totalItems={pagination.total}
        pageSize={15}
        onPageChange={setPage}
        hideActions
      />

      <RequestReviewPanel
        open={!!selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        requestId={selectedRequestId}
      />
    </div>
  );
}
