"use client";

import React, { useEffect, useMemo, useState } from "react";
import Tabs from "../../../components/tabs";
import DataTable from "../../../components/data-table";
import FormDialog from "../../../components/form-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  useInventoryList,
  useInventoryItem,
  useInventoryMovements,
  useAddStock,
  useReduceStock,
  useAdjustStock,
} from "@/lib/hooks/useInventory";
import { toast } from "react-hot-toast";
import { Boxes, Loader2, MoveRight, RefreshCcw } from "lucide-react";
import ProductImageGallery from "@/components/ui/ProductImageGallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LIST_LIMIT = 20;
const MOVEMENT_LIMIT = 20;

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

function formatDecimal(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB");
}

// Helper to get image array from various sources
const getImageArray = (item) => {
  if (Array.isArray(item.product?.images) && item.product.images.length > 0) {
    return item.product.images;
  }
  if (item.productImage) {
    return Array.isArray(item.productImage)
      ? item.productImage
      : [item.productImage];
  }
  return [];
};

const inventoryColumns = [
  {
    header: "Image",
    accessor: "productImage",
    render: (row) => {
      return (
        <ProductImageGallery
          images={getImageArray(row)}
          alt={row.productName || "Product"}
          size="sm"
          maxVisible={3}
          showCount={true}
        />
      );
    },
  },
  {
    header: "Supplier",
    accessor: "supplierName",
    render: (row) => {
      console.log("[Supplier Column]", {
        supplierName: row.supplierName,
        product: row.product,
        suppliers: row.product?.suppliers,
      });
      return <div className="font-medium">{row.supplierName || "—"}</div>;
    },
  },
  {
    header: "Product",
    accessor: "productName",
    render: (row) => (
      <div>
        <div className="font-medium leading-tight">{row.productName}</div>
      </div>
    ),
  },
  {
    header: "SKU",
    accessor: "sku",
    render: (row) => row.sku || "-",
  },
  {
    header: "Season",
    accessor: "season",
    render: (row) => {
      const season = row.product?.season;
      const seasons = Array.isArray(season) ? season : season ? [season] : [];

      if (seasons.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }

      return (
        <div className="flex flex-wrap gap-1">
          {seasons.map((s, idx) => (
            <span
              key={idx}
              className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-medium"
            >
              {s}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    header: "Size",
    accessor: "size",
    render: (row) => {
      let sizes = [];

      // Check product size array first (primary source after schema update)
      const productSize = row.product?.size;
      if (Array.isArray(productSize) && productSize.length > 0) {
        sizes = productSize;
      } else if (productSize) {
        sizes = [productSize];
      } else if (
        // Fallback to variant composition
        row.raw?.variantComposition &&
        Array.isArray(row.raw.variantComposition) &&
        row.raw.variantComposition.length > 0
      ) {
        const sizeSet = new Set();
        row.raw.variantComposition.forEach((variant) => {
          if (variant.size) sizeSet.add(variant.size);
        });
        sizes = Array.from(sizeSet);
      } else {
        // Final fallback to inventory record level
        const size = row.raw?.size;
        sizes = Array.isArray(size) ? size : size ? [size] : [];
      }

      if (sizes.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }

      return (
        <div className="flex flex-wrap gap-1">
          {sizes.map((s, idx) => (
            <span
              key={idx}
              className="inline-block px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-medium"
            >
              {s}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    header: "Color",
    accessor: "color",
    render: (row) => {
      let colors = [];

      // Check product color array first (primary source after schema update)
      const productColor = row.product?.color;
      if (Array.isArray(productColor) && productColor.length > 0) {
        colors = productColor;
      } else if (productColor) {
        colors = [productColor];
      } else if (
        // Fallback to variant composition
        row.raw?.variantComposition &&
        Array.isArray(row.raw.variantComposition) &&
        row.raw.variantComposition.length > 0
      ) {
        const colorSet = new Set();
        row.raw.variantComposition.forEach((variant) => {
          if (variant.color) colorSet.add(variant.color);
        });
        colors = Array.from(colorSet);
      } else {
        // Final fallback to inventory record level
        const color =
          row.raw?.primaryColor ||
          row.raw?.color ||
          row.product?.specifications?.color;
        colors = Array.isArray(color) ? color : color ? [color] : [];
      }

      if (colors.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }

      return (
        <div className="flex flex-wrap gap-1">
          {colors.map((c, idx) => (
            <span
              key={idx}
              className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium"
            >
              {c}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    header: "Available Stock",
    accessor: "currentStock",
    render: (row) => (
      <div className="tabular-nums font-semibold">
        {formatNumber(row.currentStock)}
      </div>
    ),
  },
  {
    header: "Stock Limit",
    accessor: "reorderLevel",
    render: (row) => (
      <div className="tabular-nums">{formatNumber(row.reorderLevel)}</div>
    ),
  },
  {
    header: "Avg Cost",
    accessor: "averageCostPrice",
    render: (row) => (
      <span className="tabular-nums">
        {formatDecimal(row.averageCostPrice)}
      </span>
    ),
  },
  {
    header: "Value",
    accessor: "totalValue",
    render: (row) => (
      <span className="tabular-nums font-semibold">
        {formatDecimal(row.totalValue)}
      </span>
    ),
  },
  {
    header: "Status",
    accessor: "needsReorder",
    render: (row) => (
      <Badge
        variant={
          row.needsReorder
            ? "destructive"
            : row.lowStock
              ? "secondary"
              : "outline"
        }
      >
        {row.needsReorder ? "Re-Order" : row.lowStock ? "Low Stock" : "Healthy"}
      </Badge>
    ),
  },
  {
    header: "Date/Time",
    accessor: "lastStockUpdate",
    render: (row) => (
      <div className="text-sm text-muted-foreground">
        {formatDateTime(row.lastStockUpdate)}
      </div>
    ),
  },
];

const movementColumns = [
  {
    header: "Date",
    accessor: "date",
    render: (row) => formatDateTime(row.date),
  },
  {
    header: "Type",
    accessor: "type",
    render: (row) => (
      <Badge
        variant={
          row.type === "in"
            ? "secondary"
            : row.type === "adjust"
              ? "outline"
              : "destructive"
        }
      >
        {row.type?.toUpperCase() || "-"}
      </Badge>
    ),
  },
  {
    header: "Quantity",
    accessor: "quantity",
    render: (row) => (
      <span className="tabular-nums">{formatNumber(row.quantity)}</span>
    ),
  },
  { header: "Reference", accessor: "reference" },
  {
    header: "User",
    accessor: "userName",
    render: (row) => row.userName || "-",
  },
  {
    header: "Notes",
    accessor: "notes",
    render: (row) => row.notes || "-",
  },
];

function currency(n) {
  const num = Number(n || 0);
  return `£${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function StockPage() {
  const [page, setPage] = useState(1);
  const [movementPage, setMovementPage] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState("");

  const defaultFilterState = useMemo(
    () => ({
      search: "",
      lowStock: false,
      needsReorder: false,
      startDate: "",
      endDate: "",
    }),
    []
  );
  const [filterForm, setFilterForm] = useState(defaultFilterState);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilterState);

  const defaultMovementFilters = useMemo(
    () => ({ type: undefined, startDate: "", endDate: "" }),
    []
  );
  const [movementFilterForm, setMovementFilterForm] = useState(
    defaultMovementFilters
  );
  const [movementFilters, setMovementFilters] = useState(
    defaultMovementFilters
  );

  const inventoryParams = useMemo(() => {
    const params = {
      page,
      limit: LIST_LIMIT,
    };

    if (appliedFilters.search?.trim()) {
      params.search = appliedFilters.search.trim();
    }

    if (appliedFilters.lowStock) {
      params.lowStock = true;
    }

    if (appliedFilters.needsReorder) {
      params.needsReorder = true;
    }

    if (appliedFilters.startDate) {
      params.startDate = appliedFilters.startDate;
    }

    if (appliedFilters.endDate) {
      params.endDate = appliedFilters.endDate;
    }

    return params;
  }, [page, appliedFilters]);

  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    isFetching: inventoryFetching,
  } = useInventoryList(inventoryParams);

  const inventoryItems = inventoryData?.items ?? [];

  // Apply client-side date filtering so the UI always respects the selected date range
  const filteredInventoryItems = useMemo(() => {
    if (!appliedFilters.startDate && !appliedFilters.endDate) {
      return inventoryItems;
    }

    const start = appliedFilters.startDate
      ? new Date(`${appliedFilters.startDate}T00:00:00`)
      : null;
    const end = appliedFilters.endDate
      ? new Date(`${appliedFilters.endDate}T23:59:59.999`)
      : null;

    return inventoryItems.filter((item) => {
      if (!item.lastStockUpdate) return false;
      const itemDate = new Date(item.lastStockUpdate);
      if (Number.isNaN(itemDate.getTime())) return false;

      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;

      return true;
    });
  }, [inventoryItems, appliedFilters.startDate, appliedFilters.endDate]);

  // Calculate summary statistics based on filtered items
  const totalStockValue = filteredInventoryItems.reduce(
    (sum, item) => sum + (item.totalValue || 0),
    0
  );
  const totalStockItems = filteredInventoryItems.reduce(
    (sum, item) => sum + (item.currentStock || 0),
    0
  );
  const lowStockCount = filteredInventoryItems.filter(
    (item) => item.lowStock || item.needsReorder
  ).length;
  const totalProducts = filteredInventoryItems.length;

  // Debug: Log first item to check image data
  React.useEffect(() => {
    if (inventoryItems.length > 0) {
      const firstItem = inventoryItems[0];
      console.log("[Stock Table] First inventory item:", {
        productName: firstItem.productName,
        product: firstItem.product,
        hasProduct: !!firstItem.product,
        productImages: firstItem.product?.images,
        imagesType: typeof firstItem.product?.images,
        imagesIsArray: Array.isArray(firstItem.product?.images),
        imagesLength: firstItem.product?.images?.length,
        productImage: firstItem.productImage,
        raw: firstItem.raw,
      });
    }
  }, [inventoryItems]);
  const inventoryPagination = inventoryData?.pagination;

  useEffect(() => {
    if (!selectedProductId && inventoryItems.length > 0) {
      setSelectedProductId(inventoryItems[0].productId);
    }
  }, [inventoryItems, selectedProductId]);

  const productOptions = useMemo(
    () =>
      inventoryItems.map((item) => ({
        label: `${item.productName} (${item.sku || "No SKU"})`,
        value: item.productId,
      })),
    [inventoryItems]
  );

  const categories = useMemo(() => {
    const unique = new Set();
    inventoryItems.forEach((item) => {
      if (item.category) unique.add(item.category);
    });
    return Array.from(unique).sort();
  }, [inventoryItems]);

  const { data: selectedInventory, isLoading: detailLoading } =
    useInventoryItem(selectedProductId, {
      enabled: Boolean(selectedProductId),
    });

  useEffect(() => {
    setMovementPage(1);
  }, [selectedProductId]);

  const movementParams = useMemo(
    () => ({
      page: movementPage,
      limit: MOVEMENT_LIMIT,
      type: movementFilters.type || undefined,
      startDate: movementFilters.startDate || undefined,
      endDate: movementFilters.endDate || undefined,
    }),
    [movementPage, movementFilters]
  );

  const {
    data: movementData,
    isLoading: movementLoading,
    isFetching: movementFetching,
  } = useInventoryMovements(selectedProductId, movementParams, {
    enabled: Boolean(selectedProductId),
  });

  const movementItems = movementData?.items ?? [];
  const movementPagination = movementData?.pagination;

  const addStockMutation = useAddStock();
  const reduceStockMutation = useReduceStock();
  const adjustStockMutation = useAdjustStock();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [reduceDialogOpen, setReduceDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);

  const handleApplyFilters = (event) => {
    event.preventDefault();
    setAppliedFilters(filterForm);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilterForm(defaultFilterState);
    setAppliedFilters(defaultFilterState);
    setPage(1);
  };

  const handleApplyMovementFilters = (event) => {
    event.preventDefault();
    setMovementFilters(movementFilterForm);
    setMovementPage(1);
  };

  const handleResetMovementFilters = () => {
    setMovementFilterForm(defaultMovementFilters);
    setMovementFilters(defaultMovementFilters);
    setMovementPage(1);
  };

  async function submitAddStock(values) {
    const quantity = Number(values.quantity);
    if (!quantity || quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }
    try {
      await addStockMutation.mutateAsync({
        product: values.product,
        quantity,
        reference: values.reference,
        notes: values.notes || undefined,
      });
      setAddDialogOpen(false);
    } catch (error) {
      // mutation handles toast
    }
  }

  async function submitReduceStock(values) {
    const quantity = Number(values.quantity);
    if (!quantity || quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }
    try {
      await reduceStockMutation.mutateAsync({
        product: values.product,
        quantity,
        reference: values.reference,
        notes: values.notes || undefined,
      });
      setReduceDialogOpen(false);
    } catch (error) {
      // handled in hook toast
    }
  }

  async function submitAdjustStock(values) {
    const newQuantity = Number(values.newQuantity);
    if (newQuantity < 0) {
      toast.error("New quantity cannot be negative");
      return;
    }
    try {
      await adjustStockMutation.mutateAsync({
        product: values.product,
        newQuantity,
        reference: values.reference,
        notes: values.notes || undefined,
      });
      setAdjustDialogOpen(false);
    } catch (error) {
      // toast handled
    }
  }

  const inventoryTab = (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Stock Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalStockValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(totalStockItems)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {lowStockCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* <div className="rounded-[4px] border border-border bg-card p-4">
        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="md:col-span-2 flex flex-col gap-2">
            <Label htmlFor="inventory-search">Search</Label>
            <Input
              id="inventory-search"
              placeholder="Search name, SKU, brand..."
              value={filterForm.search}
              onChange={(event) =>
                setFilterForm((prev) => ({ ...prev, search: event.target.value }))
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="inventory-category">Category</Label>
            <Select
              value={filterForm.category || "all"}
              onValueChange={(value) =>
                setFilterForm((prev) => ({ ...prev, category: value === "all" ? undefined : value }))
              }
            >
              <SelectTrigger id="inventory-category">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-[4px] border border-dashed border-border px-3 py-2">
            <div>
              <div className="text-sm font-medium">Low stock only</div>
              <p className="text-xs text-muted-foreground">Current stock ≤ reorder level</p>
            </div>
            <Switch
              checked={filterForm.lowStock}
              onCheckedChange={(value) =>
                setFilterForm((prev) => ({ ...prev, lowStock: value }))
              }
            />
          </div>
          <div className="flex items-center justify-between gap-2 rounded-[4px] border border-dashed border-border px-3 py-2">
            <div>
              <div className="text-sm font-medium">Needs reorder</div>
              <p className="text-xs text-muted-foreground">Flagged for purchase planning</p>
            </div>
            <Switch
              checked={filterForm.needsReorder}
              onCheckedChange={(value) =>
                setFilterForm((prev) => ({ ...prev, needsReorder: value }))
              }
            />
          </div>
          <div className="flex items-end gap-2 md:justify-end">
            <Button type="submit" className="w-full md:w-auto">
              Apply
            </Button>
            <Button type="button" variant="outline" className="w-full md:w-auto" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </form>
      </div> */}

      {/* Unified Search Filter */}
      <div className="rounded-[4px] border border-border bg-card p-4">
        <form onSubmit={handleApplyFilters} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label
                htmlFor="filter-search"
                className="text-xs text-muted-foreground mb-1 block"
              >
                Search
              </Label>
              <Input
                id="filter-search"
                placeholder="Search by SKU, product name, or supplier..."
                value={filterForm.search}
                onChange={(event) =>
                  setFilterForm((prev) => ({
                    ...prev,
                    search: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Apply</Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetFilters}
              >
                Reset
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="filter-start-date"
                className="text-xs text-muted-foreground mb-1 block"
              >
                Start Date
              </Label>
              <Input
                id="filter-start-date"
                type="date"
                value={filterForm.startDate}
                onChange={(event) =>
                  setFilterForm((prev) => ({
                    ...prev,
                    startDate: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label
                htmlFor="filter-end-date"
                className="text-xs text-muted-foreground mb-1 block"
              >
                End Date
              </Label>
              <Input
                id="filter-end-date"
                type="date"
                value={filterForm.endDate}
                onChange={(event) =>
                  setFilterForm((prev) => ({
                    ...prev,
                    endDate: event.target.value,
                  }))
                }
              />
            </div>
          </div>
        </form>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Boxes className="h-5 w-5 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            Inventory records:{" "}
            <span className="font-semibold text-foreground">
              {inventoryPagination?.totalItems ?? filteredInventoryItems.length}
            </span>
          </div>
        </div>
      </div>
      <DataTable
        title="Inventory"
        columns={inventoryColumns}
        data={filteredInventoryItems}
        loading={inventoryLoading || inventoryFetching}
        enableSearch={false}
        paginate={false}
      />

      {inventoryPagination?.totalPages > 1 && (
        <Pagination className="pt-2">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if ((inventoryPagination?.currentPage || 1) > 1) {
                    setPage((prev) => Math.max(1, prev - 1));
                  }
                }}
                aria-disabled={(inventoryPagination?.currentPage || 1) === 1}
                className={
                  (inventoryPagination?.currentPage || 1) === 1
                    ? "pointer-events-none opacity-50"
                    : undefined
                }
              />
            </PaginationItem>
            {Array.from({ length: inventoryPagination.totalPages }).map(
              (_, index) => {
                const pageNumber = index + 1;
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      href="#"
                      isActive={
                        pageNumber === (inventoryPagination?.currentPage || 1)
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        setPage(pageNumber);
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              }
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (
                    (inventoryPagination?.currentPage || 1) <
                    (inventoryPagination?.totalPages || 1)
                  ) {
                    setPage((prev) => prev + 1);
                  }
                }}
                aria-disabled={
                  (inventoryPagination?.currentPage || 1) >=
                  (inventoryPagination?.totalPages || 1)
                }
                className={
                  (inventoryPagination?.currentPage || 1) >=
                    (inventoryPagination?.totalPages || 1)
                    ? "pointer-events-none opacity-50"
                    : undefined
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );

  const movementsTab = (
    <div className="space-y-4">
      <div className="rounded-[4px] border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MoveRight className="h-4 w-4" />
              Stock movement history
            </div>
            {detailLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading product
                details...
              </div>
            ) : selectedInventory ? (
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Current Stock</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatNumber(selectedInventory.currentStock)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Available</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatNumber(selectedInventory.availableStock)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reserved</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatNumber(selectedInventory.reservedStock)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p className="text-sm">
                    {formatDateTime(selectedInventory.lastStockUpdate)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a product to view its stock movements.
              </p>
            )}
          </div>

          {/* Variant Breakdown - Only show if product has variants */}
          {selectedInventory &&
            selectedInventory.variantComposition &&
            selectedInventory.variantComposition.length > 0 && (
              <div className="w-full mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Variant Stock Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 border-b-2 border-slate-300">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-slate-700">
                              Color
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-700">
                              Size
                            </th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-700">
                              Quantity
                            </th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-700">
                              Reserved
                            </th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-700">
                              Available
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInventory.variantComposition.map(
                            (variant, index) => {
                              const available =
                                variant.quantity -
                                (variant.reservedQuantity || 0);
                              return (
                                <tr
                                  key={index}
                                  className={`border-b border-slate-200 ${index % 2 === 0 ? "bg-white" : "bg-slate-50"
                                    }`}
                                >
                                  <td className="px-3 py-2 font-medium text-slate-700">
                                    {variant.color}
                                  </td>
                                  <td className="px-3 py-2 text-slate-700">
                                    {variant.size}
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                                    {formatNumber(variant.quantity)}
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums text-amber-600">
                                    {formatNumber(
                                      variant.reservedQuantity || 0
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-green-600">
                                    {formatNumber(available)}
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                        <tfoot className="bg-slate-200 border-t-2 border-slate-300">
                          <tr>
                            <td
                              colSpan="2"
                              className="px-3 py-2 font-semibold text-slate-900"
                            >
                              Total
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-slate-900 tabular-nums">
                              {formatNumber(
                                selectedInventory.variantComposition.reduce(
                                  (sum, v) => sum + v.quantity,
                                  0
                                )
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-amber-600 tabular-nums">
                              {formatNumber(
                                selectedInventory.variantComposition.reduce(
                                  (sum, v) => sum + (v.reservedQuantity || 0),
                                  0
                                )
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-green-600 tabular-nums">
                              {formatNumber(
                                selectedInventory.variantComposition.reduce(
                                  (sum, v) =>
                                    sum +
                                    (v.quantity - (v.reservedQuantity || 0)),
                                  0
                                )
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          <div className="w-full max-w-xs space-y-3">
            <Label className="text-sm font-medium">Filter movements</Label>
            <form className="space-y-3" onSubmit={handleApplyMovementFilters}>
              <Select
                value={movementFilterForm.type}
                onValueChange={(value) =>
                  setMovementFilterForm((prev) => ({ ...prev, type: value }))
                }
                disabled={!selectedProductId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All movement types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Stock In</SelectItem>
                  <SelectItem value="out">Stock Out</SelectItem>
                  <SelectItem value="adjust">Adjustments</SelectItem>
                  <SelectItem value="transfer">Transfers</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={movementFilterForm.startDate}
                  onChange={(event) =>
                    setMovementFilterForm((prev) => ({
                      ...prev,
                      startDate: event.target.value,
                    }))
                  }
                  disabled={!selectedProductId}
                />
                <Input
                  type="date"
                  value={movementFilterForm.endDate}
                  onChange={(event) =>
                    setMovementFilterForm((prev) => ({
                      ...prev,
                      endDate: event.target.value,
                    }))
                  }
                  disabled={!selectedProductId}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!selectedProductId}
                >
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleResetMovementFilters}
                  disabled={!selectedProductId}
                >
                  Reset
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <DataTable
        title="Stock Movements"
        columns={movementColumns}
        data={movementItems}
        loading={movementLoading || movementFetching}
        enableSearch={false}
        paginate={false}
      />

      {movementPagination?.totalPages > 1 && (
        <Pagination className="pt-2">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if ((movementPagination?.currentPage || 1) > 1) {
                    setMovementPage((prev) => Math.max(1, prev - 1));
                  }
                }}
                aria-disabled={(movementPagination?.currentPage || 1) === 1}
                className={
                  (movementPagination?.currentPage || 1) === 1
                    ? "pointer-events-none opacity-50"
                    : undefined
                }
              />
            </PaginationItem>
            {Array.from({ length: movementPagination.totalPages }).map(
              (_, index) => {
                const pageNumber = index + 1;
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      href="#"
                      isActive={
                        pageNumber === (movementPagination?.currentPage || 1)
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        setMovementPage(pageNumber);
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              }
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (
                    (movementPagination?.currentPage || 1) <
                    (movementPagination?.totalPages || 1)
                  ) {
                    setMovementPage((prev) => prev + 1);
                  }
                }}
                aria-disabled={
                  (movementPagination?.currentPage || 1) >=
                  (movementPagination?.totalPages || 1)
                }
                className={
                  (movementPagination?.currentPage || 1) >=
                    (movementPagination?.totalPages || 1)
                    ? "pointer-events-none opacity-50"
                    : undefined
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );

  const tabs = [{ label: "Inventory", content: inventoryTab }];

  const addStockFields = [
    {
      name: "product",
      label: "Product",
      type: "select",
      required: true,
      placeholder: "Select product",
      options: productOptions,
    },
    {
      name: "quantity",
      label: "Quantity",
      type: "number",
      required: true,
      min: 1,
      step: 1,
    },
    { name: "reference", label: "Reference", required: true },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const reduceStockFields = [
    {
      name: "product",
      label: "Product",
      type: "select",
      required: true,
      placeholder: "Select product",
      options: productOptions,
    },
    {
      name: "quantity",
      label: "Quantity",
      type: "number",
      required: true,
      min: 1,
      step: 1,
    },
    { name: "reference", label: "Reference", required: true },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const adjustStockFields = [
    {
      name: "product",
      label: "Product",
      type: "select",
      required: true,
      placeholder: "Select product",
      options: productOptions,
    },
    {
      name: "newQuantity",
      label: "New Quantity",
      type: "number",
      required: true,
      min: 0,
      step: 1,
    },
    { name: "reference", label: "Reference", required: true },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  return (
    <div className="mx-auto max-w-[1600px] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Inventory Control
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor stock levels, movements, and adjustments
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAppliedFilters((prev) => ({ ...prev }))}
        >
          <RefreshCcw className="mr-2 h-4 w-4" /> Refresh Data
        </Button>
      </div>

      <Tabs tabs={tabs} />

      <FormDialog
        open={addDialogOpen}
        title="Add Stock"
        fields={addStockFields}
        initialValues={{ product: selectedProductId, quantity: 1 }}
        onClose={() => setAddDialogOpen(false)}
        onSubmit={submitAddStock}
        loading={addStockMutation.isPending}
      />

      <FormDialog
        open={reduceDialogOpen}
        title="Reduce Stock"
        fields={reduceStockFields}
        initialValues={{ product: selectedProductId, quantity: 1 }}
        onClose={() => setReduceDialogOpen(false)}
        onSubmit={submitReduceStock}
        loading={reduceStockMutation.isPending}
      />

      <FormDialog
        open={adjustDialogOpen}
        title="Adjust Stock"
        fields={adjustStockFields}
        initialValues={{
          product: selectedProductId,
          newQuantity: selectedInventory?.currentStock ?? 0,
        }}
        onClose={() => setAdjustDialogOpen(false)}
        onSubmit={submitAdjustStock}
        loading={adjustStockMutation.isPending}
      />
    </div>
  );
}
