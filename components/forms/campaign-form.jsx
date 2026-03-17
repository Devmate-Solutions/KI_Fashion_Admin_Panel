"use client";

import { useEffect, useMemo, useState } from "react";
import FormDialog from "@/components/form-dialog";
import { MultiSelect } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const SEASON_OPTIONS = [
  { value: "winter", label: "Winter" },
  { value: "summer", label: "Summer" },
  { value: "spring", label: "Spring" },
  { value: "autumn", label: "Autumn" },
  { value: "all_season", label: "All Season" },
  { value: "accessories", label: "Accessories" },
];

const STOCK_STATE_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "in-stock", label: "In Stock" },
  { value: "low-stock", label: "Low Stock" },
  { value: "out-of-stock", label: "Out Of Stock" },
];

const BADGE_VARIANT_OPTIONS = [
  { value: "sale", label: "Sale" },
  { value: "clearance", label: "Clearance" },
  { value: "limited", label: "Limited" },
  { value: "hot", label: "Hot" },
];

const STATUS_OPTIONS = ["draft", "active", "paused", "expired", "archived"];

function toLocalDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function normalizeSkuArray(rawSkuText) {
  return String(rawSkuText || "")
    .split(/[,\n]+/)
    .map((sku) => sku.trim().toUpperCase())
    .filter(Boolean);
}

export function CampaignForm({
  open,
  onClose,
  onSubmit,
  loading = false,
  initialData = null,
  products = [],
  suppliers = [],
}) {
  const [productSearch, setProductSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    campaignType: "discount",
    discountType: "percentage",
    discountValue: "",
    startAt: "",
    endAt: "",
    status: "draft",
    timezone: "UTC",
    badgeText: "",
    badgeVariant: "sale",
    priority: "100",
    notes: "",
    productIds: [],
    categories: [],
    brands: [],
    seasons: [],
    supplierIds: [],
    skusText: "",
    stockState: "any",
  });

  useEffect(() => {
    if (!open) return;

    const next = {
      name: initialData?.name || "",
      campaignType: initialData?.campaignType || "discount",
      discountType: initialData?.discountType || "percentage",
      discountValue:
        initialData?.discountValue !== undefined && initialData?.discountValue !== null
          ? String(initialData.discountValue)
          : "",
      startAt: toLocalDateTimeInput(initialData?.startAt),
      endAt: toLocalDateTimeInput(initialData?.endAt),
      status: initialData?.status || "draft",
      timezone: initialData?.timezone || "UTC",
      badgeText: initialData?.badgeText || "",
      badgeVariant: initialData?.badgeVariant || "sale",
      priority:
        initialData?.priority !== undefined && initialData?.priority !== null
          ? String(initialData.priority)
          : "100",
      notes: initialData?.notes || "",
      productIds: Array.isArray(initialData?.productIds)
        ? initialData.productIds.map((id) => String(id))
        : [],
      categories: Array.isArray(initialData?.filters?.categories) ? initialData.filters.categories : [],
      brands: Array.isArray(initialData?.filters?.brands) ? initialData.filters.brands : [],
      seasons: Array.isArray(initialData?.filters?.seasons) ? initialData.filters.seasons : [],
      supplierIds: Array.isArray(initialData?.filters?.supplierIds)
        ? initialData.filters.supplierIds.map((id) => String(id))
        : [],
      skusText: Array.isArray(initialData?.filters?.skus)
        ? initialData.filters.skus.join(", ")
        : "",
      stockState: initialData?.filters?.stockState || "any",
    };

    setForm(next);
    setProductSearch("");
  }, [open, initialData]);

  const productOptions = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const base = products.map((product) => ({
      value: String(product._id || product.id),
      label: `${product.name || "Unnamed"} (${product.sku || "NO-SKU"})`,
      search: `${product.name || ""} ${product.sku || ""} ${product.productCode || ""}`.toLowerCase(),
    }));

    if (!q) return base;
    return base.filter((item) => item.search.includes(q));
  }, [products, productSearch]);

  const categoryOptions = useMemo(() => {
    const values = [...new Set(products.map((p) => p.category).filter(Boolean))];
    return values.map((value) => ({ value, label: value }));
  }, [products]);

  const brandOptions = useMemo(() => {
    const values = [...new Set(products.map((p) => p.brand).filter(Boolean))];
    return values.map((value) => ({ value, label: value }));
  }, [products]);

  const supplierOptions = useMemo(() => {
    return suppliers.map((supplier) => ({
      value: String(supplier.id || supplier._id),
      label: supplier.company || supplier.name || "Unknown Supplier",
    }));
  }, [suppliers]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const payload = {
      name: form.name.trim(),
      campaignType: form.campaignType,
      discountType: form.discountType,
      discountValue: Number(form.discountValue || 0),
      startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
      endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
      status: form.status,
      isActive: form.status === "active",
      timezone: form.timezone || "UTC",
      badgeText: form.badgeText.trim(),
      badgeVariant: form.badgeVariant,
      priority: Number(form.priority || 100),
      notes: form.notes?.trim() || "",
      productIds: form.productIds,
      filters: {
        categories: form.categories,
        brands: form.brands,
        seasons: form.seasons,
        supplierIds: form.supplierIds,
        skus: normalizeSkuArray(form.skusText),
        stockState: form.stockState,
      },
    };

    await onSubmit(payload);
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={initialData ? "Edit Campaign" : "Create Campaign"}
      loading={loading}
      onSubmit={handleSubmit}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Campaign Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Spring Clearance"
            />
          </div>
          <div className="space-y-2">
            <Label>Campaign Type *</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.campaignType}
              onChange={(e) => setField("campaignType", e.target.value)}
            >
              <option value="discount">Discount</option>
              <option value="clearance">Clearance</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Discount Type *</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.discountType}
              onChange={(e) => setField("discountType", e.target.value)}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (£)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Discount Value *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.discountValue}
              onChange={(e) => setField("discountValue", e.target.value)}
              placeholder={form.discountType === "percentage" ? "20" : "5"}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start At *</Label>
            <Input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => setField("startAt", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>End At *</Label>
            <Input
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => setField("endAt", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Badge Text</Label>
            <Input
              value={form.badgeText}
              onChange={(e) => setField("badgeText", e.target.value)}
              placeholder="SALE 20% OFF"
            />
          </div>
          <div className="space-y-2">
            <Label>Badge Variant</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.badgeVariant}
              onChange={(e) => setField("badgeVariant", e.target.value)}
            >
              {BADGE_VARIANT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Priority (Lower = higher)</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.priority}
              onChange={(e) => setField("priority", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <textarea
            className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder="Optional internal notes"
          />
        </div>

        <div className="border rounded-lg p-4 space-y-4 bg-slate-50/50">
          <h3 className="text-sm font-semibold">Eligibility Filters</h3>

          <div className="space-y-2">
            <Label>Products (manual selection)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Search products by name/SKU"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setProductSearch("")}
              >
                Clear
              </Button>
            </div>
            <MultiSelect
              options={productOptions}
              value={form.productIds}
              onChange={(next) => setField("productIds", next)}
              placeholder="Select products"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categories</Label>
              <MultiSelect
                options={categoryOptions}
                value={form.categories}
                onChange={(next) => setField("categories", next)}
                placeholder="Select categories"
              />
            </div>
            <div className="space-y-2">
              <Label>Brands</Label>
              <MultiSelect
                options={brandOptions}
                value={form.brands}
                onChange={(next) => setField("brands", next)}
                placeholder="Select brands"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Seasons</Label>
              <MultiSelect
                options={SEASON_OPTIONS}
                value={form.seasons}
                onChange={(next) => setField("seasons", next)}
                placeholder="Select seasons"
              />
            </div>
            <div className="space-y-2">
              <Label>Suppliers</Label>
              <MultiSelect
                options={supplierOptions}
                value={form.supplierIds}
                onChange={(next) => setField("supplierIds", next)}
                placeholder="Select suppliers"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SKU / Product Codes</Label>
              <textarea
                className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.skusText}
                onChange={(e) => setField("skusText", e.target.value)}
                placeholder="Comma or new-line separated SKUs"
              />
            </div>
            <div className="space-y-2">
              <Label>Stock State</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.stockState}
                onChange={(e) => setField("stockState", e.target.value)}
              >
                {STOCK_STATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : initialData ? "Update Campaign" : "Create Campaign"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
