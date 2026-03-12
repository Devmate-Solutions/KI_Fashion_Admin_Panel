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
        <p>{row.requestedBy?.name || "Unknown"}</p>
        <p className="text-xs text-muted-foreground">{row.requestedBy?.role}</p>
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

      <Tabs tabs={STATUS_TABS} activeTab={activeTab} onTabChange={handleTabChange} />

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
