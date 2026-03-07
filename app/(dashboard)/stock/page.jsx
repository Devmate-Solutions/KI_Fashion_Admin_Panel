"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import Tabs from "../../../components/tabs";
import DataTable from "../../../components/data-table";
import FormDialog from "../../../components/form-dialog";
import ProductSummaryTab from "@/components/stock/ProductSummaryTab";
import StockCountTab from "@/components/stock/StockCountTab";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useInventoryList,
  useInventoryItem,
  useInventoryMovements,
  useAddStock,
  useReduceStock,
  useAdjustStock,
} from "@/lib/hooks/useInventory";
import { usePacketStockList } from "@/lib/hooks/usePacketStock";
import { toast } from "react-hot-toast";
import { Boxes, Loader2, MoveRight, RefreshCcw, Package, Barcode, Printer, QrCode, Copy, Check, Scissors, Trash2, ScanLine } from "lucide-react";
import ProductImageGallery from "@/components/ui/ProductImageGallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TruncatedBadgeList from "@/components/ui/TruncatedBadgeList";
import BreakPacketDialog from "@/components/modals/BreakPacketDialog";

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
          maxVisible={1}
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
        <a
          href={`/stock/product-history?productId=${row.productId || row.product?._id}`}
          className="font-medium leading-tight text-blue-600 hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {row.productName}
        </a>
      </div>
    ),
  },
  {
    header: "SKU",
    accessor: "sku",
    render: (row) => (
      <a
        href={`/stock/product-history?productId=${row.productId || row.product?._id}`}
        className="font-medium text-blue-600 hover:underline cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {row.sku || "-"}
      </a>
    ),
  },
  {
    header: "Season",
    accessor: "season",
    render: (row, { isExpanded } = {}) => {
      const season = row.product?.season;
      const seasons = Array.isArray(season) ? season : season ? [season] : [];
      if (isExpanded) {
        return (
          <div className="flex flex-wrap gap-1">
            {seasons.map((s, idx) => (
              <span key={idx} className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-medium">{s}</span>
            ))}
          </div>
        );
      }
      return <TruncatedBadgeList items={seasons} max={3} colorClass="bg-purple-100 text-purple-800" />;
    },
  },
  {
    header: "Size",
    accessor: "size",
    render: (row, { isExpanded } = {}) => {
      let sizes = [];
      const productSize = row.product?.size;
      if (Array.isArray(productSize) && productSize.length > 0) {
        sizes = productSize;
      } else if (productSize) {
        sizes = [productSize];
      } else if (
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
        const size = row.raw?.size;
        sizes = Array.isArray(size) ? size : size ? [size] : [];
      }
      if (isExpanded) {
        return (
          <div className="flex flex-wrap gap-1">
            {sizes.map((s, idx) => (
              <span key={idx} className="inline-block px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-medium">{s}</span>
            ))}
          </div>
        );
      }
      return <TruncatedBadgeList items={sizes} max={3} colorClass="bg-green-100 text-green-800" />;
    },
  },
  {
    header: "Color",
    accessor: "color",
    render: (row, { isExpanded } = {}) => {
      let colors = [];
      const productColor = row.product?.color;
      if (Array.isArray(productColor) && productColor.length > 0) {
        colors = productColor;
      } else if (productColor) {
        colors = [productColor];
      } else if (
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
        const color =
          row.raw?.primaryColor ||
          row.raw?.color ||
          row.product?.specifications?.color;
        colors = Array.isArray(color) ? color : color ? [color] : [];
      }
      if (isExpanded) {
        return (
          <div className="flex flex-wrap gap-1">
            {colors.map((c, idx) => (
              <span key={idx} className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium">{c}</span>
            ))}
          </div>
        );
      }
      return <TruncatedBadgeList items={colors} max={3} colorClass="bg-blue-100 text-blue-800" />;
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
    header: "Landed Cost",
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
    header: "Date",
    accessor: "lastStockUpdate",
    render: (row) => (
      <div className="text-sm text-muted-foreground">
        {row.lastStockUpdate ? new Date(row.lastStockUpdate).toLocaleDateString('en-GB') : "—"}
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

const PAGE_SIZE_OPTIONS = [10, 20, 25, 50, 100];

export default function StockPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = Number(searchParams.get("tab") ?? 0);
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (idx) => {
    setActiveTab(idx);
    router.replace(`/stock?tab=${idx}`, { scroll: false });
  };
  const [page, setPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(20);
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

  // Packet Stock tab state
  const [packetPage, setPacketPage] = useState(1);
  const [packetPageLimit, setPacketPageLimit] = useState(20);
  const [packetSearch, setPacketSearch] = useState("");
  const [packetAppliedSearch, setPacketAppliedSearch] = useState("");
  const [packetStockFilter, setPacketStockFilter] = useState("all"); // 'all', 'inStock', 'outOfStock'
  const [packetTypeFilter, setPacketTypeFilter] = useState("all"); // 'all', 'packet', 'loose'
  const [selectedPacketDetail, setSelectedPacketDetail] = useState(null);
  const [copiedBarcode, setCopiedBarcode] = useState(null);
  const [packetToBreak, setPacketToBreak] = useState(null);

  const inventoryParams = useMemo(() => {
    const params = {
      page,
      limit: pageLimit,
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
  }, [page, pageLimit, appliedFilters]);

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
      // Prefer explicit lastStockUpdate, but fall back to raw timestamps if needed
      const dateSource =
        item.lastStockUpdate ||
        item.raw?.lastStockUpdate ||
        item.raw?.updatedAt ||
        item.raw?.createdAt;

      if (!dateSource) return false;

      const itemDate = new Date(dateSource);
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

  // Packet Stock data fetching
  const packetStockParams = useMemo(() => {
    const params = {
      page: packetPage,
      limit: packetPageLimit,
    };
    if (packetAppliedSearch?.trim()) {
      params.search = packetAppliedSearch.trim();
    }
    if (packetStockFilter === "inStock") {
      params.hasStock = "true";
    } else if (packetStockFilter === "outOfStock") {
      params.hasStock = "false";
    }
    if (packetTypeFilter === "packet") {
      params.isLoose = "false";
    } else if (packetTypeFilter === "loose") {
      params.isLoose = "true";
    }
    return params;
  }, [packetPage, packetPageLimit, packetAppliedSearch, packetStockFilter, packetTypeFilter]);

  const {
    data: packetStockData,
    isLoading: packetStockLoading,
    isFetching: packetStockFetching,
  } = usePacketStockList(packetStockParams);

  const packetStockItems = packetStockData?.data ?? [];
  const packetStockPagination = packetStockData?.pagination;
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

  // Packet Stock helper functions
  const handleCopyBarcode = async (barcode) => {
    try {
      await navigator.clipboard.writeText(barcode);
      setCopiedBarcode(barcode);
      toast.success("Barcode copied to clipboard");
      setTimeout(() => setCopiedBarcode(null), 2000);
    } catch (err) {
      toast.error("Failed to copy barcode");
    }
  };

  const handlePrintBarcode = (packet) => {
    const printWindow = window.open("", "_blank", "width=400,height=300");
    if (!printWindow) {
      toast.error("Please allow popups for printing");
      return;
    }

    const compositionText = packet.composition
      ?.map((c) => `${c.color}/${c.size} × ${c.quantity}`)
      .join(", ") || "—";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode: ${packet.barcode}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              padding: 20px; 
              text-align: center;
              margin: 0;
            }
            .label { 
              border: 2px dashed #ccc; 
              padding: 20px; 
              display: inline-block;
              min-width: 280px;
            }
            .barcode { 
              font-size: 24px; 
              font-weight: bold; 
              letter-spacing: 2px;
              margin-bottom: 10px;
            }
            .product { 
              font-size: 14px; 
              margin-bottom: 8px;
              font-weight: bold;
            }
            .composition { 
              font-size: 11px; 
              color: #666;
              margin-bottom: 8px;
            }
            .type {
              font-size: 12px;
              background: ${packet.isLoose ? "#fef3c7" : "#dbeafe"};
              padding: 2px 8px;
              border-radius: 4px;
              display: inline-block;
              margin-bottom: 8px;
            }
            .items {
              font-size: 12px;
              color: #333;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .label { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="barcode">${packet.barcode}</div>
            <div class="product">${packet.product?.name || "Unknown Product"}</div>
            <div class="type">${packet.isLoose ? "LOOSE ITEM" : "PACKET"}</div>
            <div class="composition">${compositionText}</div>
            <div class="items">${packet.totalItemsPerPacket || 1} item(s) per ${packet.isLoose ? "unit" : "packet"}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleApplyPacketSearch = (e) => {
    e.preventDefault();
    setPacketAppliedSearch(packetSearch);
    setPacketPage(1);
  };

  const handleResetPacketFilters = () => {
    setPacketSearch("");
    setPacketAppliedSearch("");
    setPacketStockFilter("all");
    setPacketTypeFilter("all");
    setPacketPage(1);
  };

  const inventoryTab = (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <Card>

          <CardContent className="flex space-x-1 px-3 pt-0">
            <div>Stock Value:</div>
            <div className="text-lg font-bold">
              {totalStockValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>

          <CardContent className="flex space-x-1 px-3 pt-0">
            <div>Total Items:</div>
            <div className="text-lg font-bold">
              {formatNumber(totalStockItems)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex space-x-1 px-3 pt-0">
            <div>Total Products:</div>
            <div className="text-lg font-bold">{totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex space-x-1 px-3 pt-0">
            <div>Low Stock Items:</div>
            <div className="text-lg font-bold text-amber-600">
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
      <div className="rounded-[4px] border border-border bg-card p-3">
        <form onSubmit={handleApplyFilters} className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[250px]">
            <Label
              htmlFor="filter-search"
              className="text-xs text-muted-foreground mb-1 block"
            >
              Search
            </Label>
            <Input
              id="filter-search"
              placeholder="SKU, product, supplier..."
              value={filterForm.search}
              onChange={(event) =>
                setFilterForm((prev) => ({
                  ...prev,
                  search: event.target.value,
                }))
              }
              className="h-8 text-sm"
            />
          </div>
          <div className="min-w-[150px]">
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
              className="h-8 text-sm"
            />
          </div>
          <div className="min-w-[150px]">
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
              className="h-8 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="h-8">Apply</Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleResetFilters}
            >
              Reset
            </Button>
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
        {/* Pagination Controls */}
        {inventoryPagination && (inventoryPagination.totalItems > 0) && (
          <div className="flex items-center gap-4">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select
                value={String(pageLimit)}
                onValueChange={(value) => {
                  setPageLimit(Number(value));
                  setPage(1); // Reset to first page when changing limit
                }}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
            {/* Page Navigation */}
            <Pagination className="w-auto mx-0">
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
                {Array.from({ length: inventoryPagination.totalPages || 1 }).map(
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
          </div>
        )}
      </div>
      <DataTable
        title="Inventory"
        columns={inventoryColumns}
        data={filteredInventoryItems}
        loading={inventoryLoading || inventoryFetching}
        enableSearch={false}
        paginate={false}
        expandableRow={true}
      />
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

  // Packet Stock columns
  const packetStockColumns = [
    {
      header: "Barcode",
      accessor: "barcode",
      render: (row) => (
        <div className="flex items-center gap-2">
          <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
            {row.barcode}
          </code>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyBarcode(row.barcode);
            }}
          >
            {copiedBarcode === row.barcode ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      ),
    },
    {
      header: "Type",
      accessor: "isLoose",
      render: (row) => (
        <Badge variant={row.isLoose ? "secondary" : "default"}>
          {row.isLoose ? "Loose" : "Packet"}
        </Badge>
      ),
    },
    {
      header: "Product",
      accessor: "product.name",
      render: (row) => (
        <div>
          <div className="font-medium">{row.product?.name || "—"}</div>
          <div className="text-xs text-muted-foreground">
            {row.product?.productCode || row.product?.sku || "—"}
          </div>
        </div>
      ),
    },
    {
      header: "Supplier",
      accessor: "supplier.name",
      render: (row) => row.supplier?.name || row.supplier?.company || "—",
    },
    {
      header: "Composition",
      accessor: "composition",
      render: (row) => {
        const comp = row.composition || [];
        if (comp.length === 0) return "—";
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {comp.slice(0, 3).map((c, idx) => (
              <span
                key={idx}
                className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]"
              >
                {c.color}/{c.size} ×{c.quantity}
              </span>
            ))}
            {comp.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{comp.length - 3} more
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Items/Pkt",
      accessor: "totalItemsPerPacket",
      render: (row) => (
        <div className="text-center tabular-nums">
          {row.totalItemsPerPacket || 1}
        </div>
      ),
    },
    {
      header: "Available",
      accessor: "availablePackets",
      render: (row) => {
        const actual = (row.availablePackets || 0) - (row.reservedPackets || 0);
        return (
          <div className="text-right">
            <span className="font-medium tabular-nums">{actual}</span>
            {row.reservedPackets > 0 && (
              <span className="text-xs text-amber-600 ml-1">
                ({row.reservedPackets} reserved)
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Sold",
      accessor: "soldPackets",
      render: (row) => (
        <div className="text-right tabular-nums text-muted-foreground">
          {row.soldPackets || 0}
        </div>
      ),
    },
    {
      header: "Unit Price",
      accessor: "unitPrice",
      render: (row) => {
        const price = row.landedPricePerPacket || 0;
        const items = row.totalItemsPerPacket || 1;
        const unitPrice = items > 0 ? price / items : 0;
        return (
          <div className="text-right tabular-nums text-muted-foreground">
            {currency(unitPrice)}
          </div>
        );
      },
    },
    {
      header: "Price/Pkt",
      accessor: "suggestedSellingPrice",
      render: (row) => (
        <div className="text-right tabular-nums">
          {currency(row.suggestedSellingPrice || 0)}
        </div>
      ),
    },
    {
      header: "Actions",
      accessor: "_id",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPacketDetail(row);
            }}
            title="View Details"
          >
            <QrCode className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              handlePrintBarcode(row);
            }}
            title="Print Barcode"
          >
            <Printer className="h-4 w-4" />
          </Button>
          {!row.isLoose && (row.availablePackets - (row.reservedPackets || 0)) > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              onClick={(e) => {
                e.stopPropagation();
                setPacketToBreak(row);
              }}
              title="Break Packet"
            >
              <Scissors className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Calculate packet stock summary
  const packetStockSummary = useMemo(() => {
    const items = packetStockItems || [];
    let totalPackets = 0;
    let totalItems = 0;
    let totalValue = 0;
    let lowStockCount = 0;

    items.forEach((p) => {
      const available = (p.availablePackets || 0) - (p.reservedPackets || 0);
      totalPackets += available;
      totalItems += available * (p.totalItemsPerPacket || 1);
      totalValue += available * (p.suggestedSellingPrice || 0);
      if (available > 0 && available <= 5) lowStockCount++;
    });

    return { totalPackets, totalItems, totalValue, lowStockCount };
  }, [packetStockItems]);

  const packetStockTab = (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Packets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatNumber(packetStockSummary.totalPackets)}
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
            <div className="text-2xl font-bold tabular-nums">
              {formatNumber(packetStockSummary.totalItems)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {currency(packetStockSummary.totalValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-amber-600">
              {packetStockSummary.lowStockCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <form onSubmit={handleApplyPacketSearch} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Search</Label>
          <Input
            placeholder="Search barcode, product..."
            value={packetSearch}
            onChange={(e) => setPacketSearch(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="w-[140px]">
          <Label className="text-xs">Stock</Label>
          <Select value={packetStockFilter} onValueChange={setPacketStockFilter}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="inStock">In Stock</SelectItem>
              <SelectItem value="outOfStock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-[140px]">
          <Label className="text-xs">Type</Label>
          <Select value={packetTypeFilter} onValueChange={setPacketTypeFilter}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="packet">Packets Only</SelectItem>
              <SelectItem value="loose">Loose Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" size="sm" className="h-9">
          Apply
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          onClick={handleResetPacketFilters}
        >
          Reset
        </Button>
      </form>

      {/* Data Table */}
      {packetStockLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : packetStockItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No packet configurations found</p>
          <p className="text-sm">
            Packet stocks are created when dispatch orders are confirmed
          </p>
        </div>
      ) : (
        <DataTable
          columns={packetStockColumns}
          data={packetStockItems}
          onRowClick={(row) => setSelectedPacketDetail(row)}
          loading={packetStockFetching}
        />
      )}

      {/* Pagination */}
      {packetStockPagination && packetStockPagination.pages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPacketPage((p) => Math.max(1, p - 1))}
                className={packetPage <= 1 ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, packetStockPagination.pages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    isActive={packetPage === pageNum}
                    onClick={() => setPacketPage(pageNum)}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setPacketPage((p) => Math.min(packetStockPagination.pages, p + 1))
                }
                className={
                  packetPage >= packetStockPagination.pages
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

  const tabs = [
    { label: "Inventory", content: inventoryTab },
    { label: "Packet Stock", content: packetStockTab },
    { label: "Stock Count", content: <StockCountTab /> },
    { label: "Product Summary", content: <ProductSummaryTab /> },
  ];

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
    <div className="space-y-6">
      <div className="mb-3">
        <BackButton fallbackPath="/home" label="Back" />
      </div>
      {/* <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Inventory Control
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor stock levels, movements, and adjustments
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 sm:h-10"
          onClick={() => setAppliedFilters((prev) => ({ ...prev }))}
        >
          <RefreshCcw className="mr-2 h-4 w-4" /> Refresh Data
        </Button>
      </header> */}

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

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

      {/* Packet Detail Dialog */}
      <Dialog
        open={!!selectedPacketDetail}
        onOpenChange={(open) => !open && setSelectedPacketDetail(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Packet Details
            </DialogTitle>
            <DialogDescription>
              {selectedPacketDetail?.isLoose ? "Loose Item" : "Packet"} Configuration
            </DialogDescription>
          </DialogHeader>

          {selectedPacketDetail && (
            <div className="space-y-4">
              {/* Barcode Section */}
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-2xl font-mono font-bold tracking-wider mb-2">
                  {selectedPacketDetail.barcode}
                </div>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyBarcode(selectedPacketDetail.barcode)}
                  >
                    {copiedBarcode === selectedPacketDetail.barcode ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintBarcode(selectedPacketDetail)}
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                  {!selectedPacketDetail.isLoose &&
                    (selectedPacketDetail.availablePackets - (selectedPacketDetail.reservedPackets || 0)) > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                        onClick={() => {
                          setSelectedPacketDetail(null);
                          setPacketToBreak(selectedPacketDetail);
                        }}
                      >
                        <Scissors className="h-4 w-4 mr-1" />
                        Break
                      </Button>
                    )}
                </div>
              </div>

              {/* Product Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Product</Label>
                  <div className="font-medium">
                    {selectedPacketDetail.product?.name || "—"}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">SKU</Label>
                  <div className="font-medium">
                    {selectedPacketDetail.product?.productCode ||
                      selectedPacketDetail.product?.sku ||
                      "—"}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Supplier</Label>
                  <div className="font-medium">
                    {selectedPacketDetail.supplier?.name ||
                      selectedPacketDetail.supplier?.company ||
                      "—"}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <div>
                    <Badge variant={selectedPacketDetail.isLoose ? "secondary" : "default"}>
                      {selectedPacketDetail.isLoose ? "Loose Item" : "Packet"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Composition */}
              <div>
                <Label className="text-muted-foreground mb-2 block">
                  Composition ({selectedPacketDetail.totalItemsPerPacket || 1} items per{" "}
                  {selectedPacketDetail.isLoose ? "unit" : "packet"})
                </Label>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Color</th>
                        <th className="px-3 py-2 text-left font-medium">Size</th>
                        <th className="px-3 py-2 text-right font-medium">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedPacketDetail.composition || []).map((comp, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">{comp.color}</td>
                          <td className="px-3 py-2">{comp.size}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {comp.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stock & Pricing */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold tabular-nums text-green-600">
                    {(selectedPacketDetail.availablePackets || 0) -
                      (selectedPacketDetail.reservedPackets || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Available</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold tabular-nums text-amber-600">
                    {selectedPacketDetail.reservedPackets || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Reserved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold tabular-nums text-muted-foreground">
                    {selectedPacketDetail.soldPackets || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Sold</div>
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Cost/Packet</Label>
                  <div className="font-medium tabular-nums">
                    {currency(selectedPacketDetail.costPricePerPacket || 0)}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Landed/Packet</Label>
                  <div className="font-medium tabular-nums">
                    {currency(selectedPacketDetail.landedPricePerPacket || 0)}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Suggested Price</Label>
                  <div className="font-medium tabular-nums text-green-600">
                    {currency(selectedPacketDetail.suggestedSellingPrice || 0)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Break Packet Dialog */}
      <BreakPacketDialog
        open={!!packetToBreak}
        onOpenChange={(open) => !open && setPacketToBreak(null)}
        packetStock={packetToBreak}
        mode="inventory"
        onSuccess={(result) => {
           
          setPacketToBreak(null);
        }}
      />
    </div>
  );
}