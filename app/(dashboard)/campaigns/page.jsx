"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/data-table";
import BackButton from "@/components/BackButton";
import { CampaignForm } from "@/components/forms/campaign-form";
import { productsAPI } from "@/lib/api/endpoints/products";
import { useAllSuppliers } from "@/lib/hooks/useSuppliers";
import {
  useArchiveCampaign,
  useCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useUpdateCampaignStatus,
} from "@/lib/hooks/useCampaigns";
import { useAuthStore } from "@/store/store";
import { Megaphone, Pause, Play, Pencil, Archive } from "lucide-react";
import toast from "react-hot-toast";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

function isCampaignLive(campaign) {
  if (!campaign) return false;
  if (!campaign.isActive || campaign.status !== "active") return false;
  const now = new Date();
  const start = campaign.startAt ? new Date(campaign.startAt) : null;
  const end = campaign.endAt ? new Date(campaign.endAt) : null;
  if (!start || !end) return false;
  return start <= now && now <= end;
}

export default function CampaignsPage() {
  const user = useAuthStore((s) => s.user);
  const isAllowed = ["admin", "super-admin"].includes(user?.role);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  const queryParams = useMemo(
    () => ({
      limit: 100,
      ...(search ? { search } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(typeFilter ? { campaignType: typeFilter } : {}),
    }),
    [search, statusFilter, typeFilter]
  );

  const { data: campaignData, isLoading: campaignLoading } = useCampaigns(queryParams);
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const updateStatus = useUpdateCampaignStatus();
  const archiveCampaign = useArchiveCampaign();

  const { data: allSuppliers = [] } = useAllSuppliers({ limit: 1000 });

  const { data: products = [] } = useQuery({
    queryKey: ["campaign-products-options"],
    queryFn: async () => {
      const response = await productsAPI.getAll({ limit: 1000, isActive: true });
      return response?.data?.data || response?.data || [];
    },
  });

  const campaigns = campaignData?.items || [];

  const handleCreate = async (payload) => {
    if (!payload.name || !payload.startAt || !payload.endAt) {
      toast.error("Name, start and end dates are required");
      return;
    }
    if (new Date(payload.startAt) >= new Date(payload.endAt)) {
      toast.error("Start date must be before end date");
      return;
    }

    await createCampaign.mutateAsync(payload);
    setCreateOpen(false);
  };

  const handleUpdate = async (payload) => {
    if (!editingCampaign?._id) return;
    if (!payload.name || !payload.startAt || !payload.endAt) {
      toast.error("Name, start and end dates are required");
      return;
    }
    if (new Date(payload.startAt) >= new Date(payload.endAt)) {
      toast.error("Start date must be before end date");
      return;
    }

    await updateCampaign.mutateAsync({ id: editingCampaign._id, payload });
    setEditingCampaign(null);
  };

  const handleToggleStatus = async (campaign) => {
    if (!campaign?._id) return;

    if (campaign.status === "active" && campaign.isActive) {
      await updateStatus.mutateAsync({ id: campaign._id, status: "paused", isActive: false });
      return;
    }

    const now = new Date();
    const endAt = campaign.endAt ? new Date(campaign.endAt) : null;
    if (endAt && endAt < now) {
      toast.error("Campaign end date has passed. Edit the campaign window before activating.");
      return;
    }

    await updateStatus.mutateAsync({ id: campaign._id, status: "active", isActive: true });
  };

  const handleArchive = async (campaign) => {
    if (!campaign?._id) return;
    if (!window.confirm(`Archive campaign \"${campaign.name}\"?`)) return;
    await archiveCampaign.mutateAsync(campaign._id);
  };

  const columns = useMemo(
    () => [
      {
        header: "Campaign",
        accessor: "name",
        render: (row) => (
          <div>
            <div className="font-semibold">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.slug}</div>
          </div>
        ),
      },
      {
        header: "Type",
        accessor: "campaignType",
        render: (row) => (
          <Badge variant={row.campaignType === "clearance" ? "secondary" : "default"}>
            {row.campaignType}
          </Badge>
        ),
      },
      {
        header: "Discount",
        accessor: "discountValue",
        render: (row) => (
          <span className="font-medium">
            {row.discountType === "percentage"
              ? `${Number(row.discountValue || 0).toFixed(2)}%`
              : `£${Number(row.discountValue || 0).toFixed(2)}`}
          </span>
        ),
      },
      {
        header: "Window",
        accessor: "startAt",
        render: (row) => (
          <div className="text-xs space-y-1">
            <div>Start: {row.startAt ? DATE_FMT.format(new Date(row.startAt)) : "-"}</div>
            <div>End: {row.endAt ? DATE_FMT.format(new Date(row.endAt)) : "-"}</div>
          </div>
        ),
      },
      {
        header: "Status",
        accessor: "status",
        render: (row) => {
          const live = isCampaignLive(row);
          return (
            <div className="space-y-1">
              <Badge variant={live ? "default" : row.status === "archived" ? "secondary" : "outline"}>
                {row.status}
              </Badge>
              {live && <div className="text-[10px] text-emerald-600 font-semibold">Live</div>}
            </div>
          );
        },
      },
      {
        header: "Filters",
        accessor: "filters",
        render: (row) => {
          const filterCount =
            (row.productIds?.length || 0) +
            (row.filters?.categories?.length || 0) +
            (row.filters?.brands?.length || 0) +
            (row.filters?.seasons?.length || 0) +
            (row.filters?.supplierIds?.length || 0) +
            (row.filters?.skus?.length || 0);

          return (
            <div className="text-xs">
              <div>{filterCount} filter(s)</div>
              <div className="text-muted-foreground">Stock: {row.filters?.stockState || "any"}</div>
            </div>
          );
        },
      },
      {
        header: "Actions",
        accessor: "_actions",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditingCampaign(row)}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleToggleStatus(row)}
              disabled={updateStatus.isPending || row.status === "archived"}
            >
              {row.status === "active" && row.isActive ? (
                <>
                  <Pause className="h-3.5 w-3.5 mr-1" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 mr-1" /> Activate
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleArchive(row)}
              disabled={archiveCampaign.isPending || row.status === "archived"}
            >
              <Archive className="h-3.5 w-3.5 mr-1" />
              Archive
            </Button>
          </div>
        ),
      },
    ],
    [updateStatus.isPending, archiveCampaign.isPending]
  );

  if (!isAllowed) {
    return (
      <div className="p-6">
        <BackButton fallbackPath="/home" label="Back" />
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          You are not authorized to access campaign management.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <BackButton fallbackPath="/home" label="Back" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Campaign Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage discount and clearance campaigns with product filters and active windows.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Create Campaign</Button>
      </div>

      <div className="rounded-lg border p-4 bg-card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="Search by name or slug"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
            <option value="archived">Archived</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
            <option value="discount">Discount</option>
            <option value="clearance">Clearance</option>
          </select>
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setTypeFilter("");
            }}
          >
            Reset Filters
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={campaigns}
        loading={campaignLoading}
        hideActions
        enableSearch={false}
        disableSorting
      />

      <CampaignForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        loading={createCampaign.isPending}
        products={products}
        suppliers={allSuppliers}
      />

      <CampaignForm
        open={Boolean(editingCampaign)}
        onClose={() => setEditingCampaign(null)}
        onSubmit={handleUpdate}
        loading={updateCampaign.isPending}
        initialData={editingCampaign}
        products={products}
        suppliers={allSuppliers}
      />
    </div>
  );
}
