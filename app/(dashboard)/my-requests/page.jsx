"use client";

import { useState } from "react";
import { useEditRequests, useCancelEditRequest } from "@/lib/hooks/useEditRequests";
import DataTable from "@/components/data-table";
import Tabs from "@/components/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import DiffView from "@/components/DiffView";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X } from "lucide-react";

const STATUS_TABS = ["Pending", "Approved", "Rejected", "All"];

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const ENTITY_LABELS = {
  "dispatch-order": "Dispatch Order",
  sale: "Sale",
  buying: "Purchase",
  payment: "Payment",
  "supplier-payment": "Supplier Payment",
  "customer-payment": "Customer Payment",
  "logistics-payment": "Logistics Payment",
  "sale-return": "Sale Return",
  "buying-return": "Purchase Return",
  expense: "Expense",
};

export default function MyRequestsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);

  const cancelMutation = useCancelEditRequest();

  const statusFilter = activeTab < 3 ? STATUS_TABS[activeTab].toLowerCase() : undefined;

  const { data, isLoading } = useEditRequests({
    page,
    limit: 15,
    status: statusFilter,
    mine: true,
    search: search || undefined,
  });

  const requests = data?.requests || [];
  const pagination = data?.pagination || {};

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync(cancelTarget);
    } catch {
      // handled by hook
    }
    setCancelTarget(null);
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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs ${STATUS_STYLES[row.status] || ""}`}>
            {row.status}
          </Badge>
          {row.status === "rejected" && row.reviewNote && (
            <span className="text-xs text-red-500 italic truncate max-w-[150px]" title={row.reviewNote}>
              {row.reviewNote}
            </span>
          )}
        </div>
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
    {
      header: "",
      accessor: "_actions",
      cell: (row) =>
        row.status === "pending" ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:text-red-700 h-7 px-2"
            onClick={(e) => {
              e.stopPropagation();
              setCancelTarget(row._id);
            }}
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        ) : null,
    },
  ];

  const handleTabChange = (idx) => {
    setActiveTab(idx);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton fallbackPath="/home" />
        <h1 className="text-2xl font-bold">My Requests</h1>
      </div>

      <Tabs tabs={STATUS_TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <DataTable
        columns={columns}
        data={requests}
        loading={isLoading}
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
        expandableRow
        renderExpandedRow={(row) =>
          row.requestType === "edit" && row.requestedChanges ? (
            <div className="p-4 bg-muted/30">
              <DiffView requestedChanges={row.requestedChanges} mode="compact" />
            </div>
          ) : (
            <div className="p-4 bg-muted/30 text-sm text-muted-foreground">
              Delete request for {ENTITY_LABELS[row.entityType]} {row.entityRef}
            </div>
          )
        }
      />

      {/* Cancel confirmation dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently cancel your pending request. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
