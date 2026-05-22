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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useInventoryList,
  useInventoryItem,
  useInventoryMovements,
  useInventoryValuationReport,
  useAddStock,
  useReduceStock,
  useAdjustStock,
  inventoryKeys,
} from "@/lib/hooks/useInventory";
import { useStockSummaryReport } from "@/lib/hooks/useReports";
import { usePacketStockList } from "@/lib/hooks/usePacketStock";
import { productsAPI } from "@/lib/api/endpoints/products";
import { packetStockAPI } from "@/lib/api/endpoints/packetStock";
import { useQueryClient } from "@tanstack/react-query";
import { exportToPDF } from "@/lib/utils/pdfExport"
import { toast } from "react-hot-toast";
import { Boxes, Loader2, MoveRight, RefreshCcw, Package, Barcode, Printer, QrCode, Copy, Check, Scissors, Trash2, ScanLine } from "lucide-react";
import ProductImageGallery from "@/components/ui/ProductImageGallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TruncatedBadgeList from "@/components/ui/TruncatedBadgeList";
import BreakPacketDialog from "@/components/modals/BreakPacketDialog";
import BarcodeUpdatePriceDialog from "@/components/modals/BarcodeUpdatePriceDialog";

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

function openBarcodePrintWindow(labelData, compositionText, price) {
  const printWindow = window.open("", "_blank", "width=450,height=500");
  if (!printWindow) {
    throw new Error("Please allow popups for printing");
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Barcode: ${labelData.barcode || "Label"}</title>
      <style>
        @page {
          size: auto;
          margin: 0;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: Arial, sans-serif;
          width: 100%;
          background: white;
        }

        .label {
          width: 100%;
          min-height: 25mm;
          padding: 1mm 2mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .composition {
          font-size: 7pt;
          font-weight: 600;
          color: #333;
          text-align: center;
          width: 100%;
          margin-bottom: 1mm;
          line-height: 1.2;
        }

        .price {
          font-size: 8pt;
          font-weight: 800;
          color: #000;
          text-align: center;
          width: 100%;
          margin-bottom: 1mm;
        }

        .barcode-img {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          padding: 1mm 0;
        }

        .barcode-img img {
          max-width: 100%;
          height: auto;
          max-height: 15mm;
          object-fit: contain;
        }
      </style>
    </head>
    <body>
      <div class="label">
        <div class="composition">${compositionText}</div>
        ${price > 0 ? `<div class="price">${labelData.barcode?.slice(0, 3)}-${price.toFixed(2).replace(".", "")}</div>` : ""}
        ${labelData.barcodeImage ? `<div class="barcode-img"><img src="${labelData.barcodeImage}" alt="Barcode" /></div>` : ""}
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();

  setTimeout(() => {
    printWindow.print();
  }, 300);
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
          size="xs"
          maxVisible={1}
          showCount={true}
        />
      );
    },
    pdfValue: (row) => row.productName || "Product"
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
    pdfValue: (row) => row.supplierName || "—"
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
    pdfValue: (row) => row.productName || "—"
  },
  {
    header: "SKU",
    accessor: "sku",
    className: "hidden md:table-cell",
    render: (row) => (
      <a
        href={`/stock/${row.productId || row.product?._id}/packets`}
        className="font-medium text-blue-600 hover:underline cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {row.sku || "-"}
      </a>
    ),
    pdfValue: (row) => row.sku || "-"
  },
  {
    header: "Season",
    accessor: "season",
    className: "hidden md:table-cell",
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
    pdfValue: (row) => {
      const season = row.product?.season;
      const seasons = Array.isArray(season) ? season : season ? [season] : [];
      return seasons.join(", ") || "—"
    }
  },
  {
    header: "Size",
    accessor: "size",
    className: "hidden md:table-cell",
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
    pdfValue: (row) => {
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
      return sizes.join(", ") || "—"
    }
  },
  {
    header: "Color",
    accessor: "color",
    className: "hidden md:table-cell",
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
    pdfValue: (row) => {
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
      return colors.join(", ") || "—"
    }
  },
  {
    header: "Available Stock",
    accessor: "currentStock",
    render: (row) => (
      <div className="tabular-nums font-semibold">
        {formatNumber(row.currentStock)}
      </div>
    ),
    pdfValue: (row) => row.currentStock || 0
  },
  {
    header: "Landed Cost",
    accessor: "averageCostPrice",
    className: "hidden md:table-cell",
    render: (row) => (
      <span className="tabular-nums">
        {formatDecimal(row.averageCostPrice)}
      </span>
    ),
    pdfValue: (row) => row.averageCostPrice || 0
  },
  {
    header: "Min Sell Price",
    accessor: "minSellingPrice",
    className: "hidden md:table-cell",
    render: (row) => (
      <span className="tabular-nums font-medium">
        {formatDecimal(row.pricing?.minSellingPrice ?? row.pricing?.sellingPrice ?? 0)}
      </span>
    ),
    pdfValue: (row) => row.pricing?.minSellingPrice ?? row.pricing?.sellingPrice ?? 0
  },
  {
    header: "Value",
    accessor: "totalValue",
    render: (row) => (
      <span className="tabular-nums font-semibold">
        {formatDecimal(row.totalValue)}
      </span>
    ),
    pdfValue: (row) => row.totalValue || 0
  },
  {
    header: "Date",
    accessor: "firstArrivalDate",
    className: "hidden md:table-cell",
    render: (row) => {
      const displayDate = row.firstArrivalDate || row.createdAt || row.lastStockUpdate;
      return (
        <div className="text-sm text-muted-foreground">
          {displayDate ? new Date(displayDate).toLocaleDateString('en-GB') : "—"}
        </div>
      );
    },
    pdfValue: (row) => {
      const displayDate = row.firstArrivalDate || row.createdAt || row.lastStockUpdate;
      return displayDate ? new Date(displayDate).toLocaleDateString('en-GB') : "—";
    }
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
  const queryClient = useQueryClient();
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

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const defaultFilterState = useMemo(
    () => ({
      search: "",
      searchSupplier: "",
      searchProduct: "",
      searchSku: "",
      season: "",
      size: "",
      color: "",
      lowStock: false,
      needsReorder: false,
      minStock: "",
      maxStock: "",
      minCost: "",
      maxCost: "",
      minPrice: "",
      maxPrice: "",
      startDate: "",
      endDate: "",
    }),
    []
  );
  const [filterForm, setFilterForm] = useState(defaultFilterState);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilterState);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.searchSupplier) count++;
    if (appliedFilters.searchProduct) count++;
    if (appliedFilters.searchSku) count++;
    if (appliedFilters.season) count++;
    if (appliedFilters.size) count++;
    if (appliedFilters.color) count++;
    if (appliedFilters.lowStock) count++;
    if (appliedFilters.needsReorder) count++;
    if (appliedFilters.minStock) count++;
    if (appliedFilters.maxStock) count++;
    if (appliedFilters.minCost) count++;
    if (appliedFilters.maxCost) count++;
    if (appliedFilters.minPrice) count++;
    if (appliedFilters.maxPrice) count++;
    if (appliedFilters.startDate) count++;
    if (appliedFilters.endDate) count++;
    return count;
  }, [appliedFilters]);

  const defaultMovementFilters = useMemo(
    () => ({ type: undefined, startDate: "", endDate: "" }),
    []
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
  const [packetTypeFilter, setPacketTypeFilter] = useState("packet"); // 'all', 'packet', 'loose'
  const [selectedPacketDetail, setSelectedPacketDetail] = useState(null);
  const [copiedBarcode, setCopiedBarcode] = useState(null);
  const [packetToBreak, setPacketToBreak] = useState(null);
  const [printLoadingId, setPrintLoadingId] = useState(null);

  const inventoryParams = useMemo(() => {
    const params = {
      page,
      limit: pageLimit,
    };

    if (appliedFilters.search?.trim()) {
      params.search = appliedFilters.search.trim();
    }
    if (appliedFilters.searchSupplier?.trim()) {
      params.searchSupplier = appliedFilters.searchSupplier.trim();
    }
    if (appliedFilters.searchProduct?.trim()) {
      params.searchProduct = appliedFilters.searchProduct.trim();
    }
    if (appliedFilters.searchSku?.trim()) {
      params.searchSku = appliedFilters.searchSku.trim();
    }
    if (appliedFilters.season && appliedFilters.season !== "all") {
      params.season = appliedFilters.season;
    }
    if (appliedFilters.size?.trim()) {
      params.size = appliedFilters.size.trim();
    }
    if (appliedFilters.color?.trim()) {
      params.color = appliedFilters.color.trim();
    }
    if (appliedFilters.lowStock) {
      params.lowStock = true;
    }
    if (appliedFilters.needsReorder) {
      params.needsReorder = true;
    }
    if (appliedFilters.minStock?.trim()) {
      params.minStock = appliedFilters.minStock.trim();
    }
    if (appliedFilters.maxStock?.trim()) {
      params.maxStock = appliedFilters.maxStock.trim();
    }
    if (appliedFilters.minCost?.trim()) {
      params.minCost = appliedFilters.minCost.trim();
    }
    if (appliedFilters.maxCost?.trim()) {
      params.maxCost = appliedFilters.maxCost.trim();
    }
    if (appliedFilters.minPrice?.trim()) {
      params.minPrice = appliedFilters.minPrice.trim();
    }
    if (appliedFilters.maxPrice?.trim()) {
      params.maxPrice = appliedFilters.maxPrice.trim();
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
  const { data: inventoryValuationData } = useInventoryValuationReport();
  const { data: stockSummaryData } = useStockSummaryReport();

  const inventoryItems = inventoryData?.items ?? [];

  // Since date and column filtering are handled fully on the backend aggregation pipeline,
  // we map inventoryItems directly to filteredInventoryItems. This ensures total count pagination values align.
  const filteredInventoryItems = inventoryItems;

  // Calculate summary statistics based on filtered items
  const totalStockValue = filteredInventoryItems.reduce(
    (sum, item) => sum + (item.totalValue || 0),
    0
  );
  const stockSummaryProducts = stockSummaryData?.products || [];
  const stockSummaryTotalValue = Number(stockSummaryData?.totalStockValue || 0);
  const stockSummaryTotalStockItems = stockSummaryProducts.reduce(
    (sum, product) => sum + Number(product.stockInHand || 0),
    0
  );
  const stockSummaryTotalProducts = Number(
    stockSummaryData?.totalItems || stockSummaryProducts.length || 0
  );
  const stockSummaryLowStockItems = Number(stockSummaryData?.lowStockItems || 0);
  const hasStockSummaryValue = stockSummaryData?.totalStockValue !== undefined;
  const hasStockSummaryItems = stockSummaryData?.products !== undefined;
  const hasStockSummaryLowStock = stockSummaryData?.lowStockItems !== undefined;
  const hasStockSummaryProducts = stockSummaryData?.totalItems !== undefined;
  const globalStockValue =
    (hasStockSummaryValue ? stockSummaryTotalValue : undefined) ??
    inventoryValuationData?.summary?.totalInventoryValue ??
    totalStockValue;
  const totalStockItems = filteredInventoryItems.reduce(
    (sum, item) => sum + (item.currentStock || 0),
    0
  );
  const lowStockCount = filteredInventoryItems.filter(
    (item) => item.lowStock || item.needsReorder
  ).length;
  const totalProducts = filteredInventoryItems.length;
  const globalTotalStockItems =
    (hasStockSummaryItems ? stockSummaryTotalStockItems : undefined) ??
    totalStockItems;
  const globalLowStockCount =
    (hasStockSummaryLowStock ? stockSummaryLowStockItems : undefined) ??
    lowStockCount;
  const globalTotalProducts =
    (hasStockSummaryProducts ? stockSummaryTotalProducts : undefined) ??
    totalProducts;

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
        label: `${item.productName} (${item.sku || "No SKU"}) - ${item.supplierName || "No Supplier"}`,
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
    // Always show packets (exclude loose items) in the Packet Stock tab
    params.isLoose = "false";
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

  // Loose Stock tab state & fetching (separate from Packet Stock)
  const [loosePage, setLoosePage] = useState(1);
  const [loosePageLimit, setLoosePageLimit] = useState(20);
  const [looseSearch, setLooseSearch] = useState("");
  const [looseAppliedSearch, setLooseAppliedSearch] = useState("");
  const [looseStockFilter, setLooseStockFilter] = useState("all"); // 'all', 'inStock', 'outOfStock'

  const looseStockParams = useMemo(() => {
    const params = {
      page: loosePage,
      limit: loosePageLimit,
      isLoose: "true",
    };
    if (looseAppliedSearch?.trim()) {
      params.search = looseAppliedSearch.trim();
    }
    if (looseStockFilter === "inStock") {
      params.hasStock = "true";
    } else if (looseStockFilter === "outOfStock") {
      params.hasStock = "false";
    }
    return params;
  }, [loosePage, loosePageLimit, looseAppliedSearch, looseStockFilter]);

  const {
    data: looseStockData,
    isLoading: looseStockLoading,
    isFetching: looseStockFetching,
  } = usePacketStockList(looseStockParams);

  const looseStockItems = looseStockData?.data ?? [];
  const looseStockPagination = looseStockData?.pagination;

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [reduceDialogOpen, setReduceDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [minPriceDialogOpen, setMinPriceDialogOpen] = useState(false);
  const [barcodeUpdateDialogOpen, setBarcodeUpdateDialogOpen] = useState(false);
  const [isSavingMinPrice, setIsSavingMinPrice] = useState(false);

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

  async function submitMinSellingPrice(values) {
    const productId = values.product;
    const minSellingPrice = Number(values.minSellingPrice);

    if (!productId) {
      toast.error("Please select a product");
      return;
    }

    if (!Number.isFinite(minSellingPrice) || minSellingPrice < 0) {
      toast.error("Minimum selling price must be a valid non-negative number");
      return;
    }

    try {
      setIsSavingMinPrice(true);
      await productsAPI.updateMinSellingPrice(productId, minSellingPrice);
      toast.success("Minimum selling price updated");
      setMinPriceDialogOpen(false);

      await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(productId) });
      if (selectedProductId) {
        await queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(selectedProductId) });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update minimum selling price");
    } finally {
      setIsSavingMinPrice(false);
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const result = await exportToPDF({
        title: "Inventory Stock Report",
        columns: inventoryColumns.filter(c => c.header !== "Image"),
        data: filteredInventoryItems,
        dateRange: { from: appliedFilters.startDate, to: appliedFilters.endDate },
        filename: `Inventory_Report_${new Date().toLocaleDateString('en-CA')}`
      })
      if (result.success) {
        toast.success("PDF report downloaded!")
      } else {
        toast.error("Failed to generate PDF")
      }
    } catch (err) {
      toast.error("PDF generation failed: " + err.message)
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

  const handlePrintBarcode = async (packet) => {
    try {
      setPrintLoadingId(packet._id);
      const response = await packetStockAPI.getBarcodeLabel(packet._id);
      const labelData = response.data?.data || response.data;

      const compositionText = (labelData?.composition || packet?.composition || [])
        .map((c) => `${c.color}/${c.size} × ${c.quantity}`)
        .join(", ") || "—";

      const unitMinPrice = Number(labelData?.minSellingPrice);
      const price = unitMinPrice > 0 ? unitMinPrice : 0;

      openBarcodePrintWindow(labelData, compositionText, price);
    } catch (err) {
      toast.error(err?.message || "Failed to print barcode label");
    } finally {
      setPrintLoadingId(null);
    }
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
    <div className="space-y-3">
      {/* Summary Statistics Ribbon */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-[4px] border border-border bg-card/60 backdrop-blur-sm px-3 py-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span>Stock Value:</span>
          <span className="font-semibold text-foreground">
            £{globalStockValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="h-3 w-px bg-border hidden sm:block" />
        <div className="flex items-center gap-1">
          <span>Total Items:</span>
          <span className="font-semibold text-foreground">{formatNumber(globalTotalStockItems)}</span>
        </div>
        <div className="h-3 w-px bg-border hidden sm:block" />
        <div className="flex items-center gap-1">
          <span>Total Products:</span>
          <span className="font-semibold text-foreground">{globalTotalProducts}</span>
        </div>
        <div className="h-3 w-px bg-border hidden sm:block" />
        <div className="flex items-center gap-1">
          <span>Low Stock Items:</span>
          <span className="font-semibold text-amber-600">{globalLowStockCount}</span>
        </div>
      </div>

      {/* Integrated Controls & Filter Card */}
      <div className="rounded-[4px] border border-border bg-card p-2 space-y-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-xs">
          {/* Left side: Search & Apply */}
          <form onSubmit={handleApplyFilters} className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            <div className="flex-1 min-w-[150px]">
              <Input
                id="filter-search"
                placeholder="Search SKU, product, supplier..."
                value={filterForm.search}
                onChange={(event) =>
                  setFilterForm((prev) => ({
                    ...prev,
                    search: event.target.value,
                  }))
                }
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Button type="submit" size="sm" className="h-8 text-xs px-2.5">Apply</Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs px-2.5"
                onClick={handleResetFilters}
              >
                Reset
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`h-8 text-xs px-2.5 transition-all duration-200 ${
                  activeFiltersCount > 0
                    ? "border-primary text-primary bg-primary/5 hover:bg-primary/10 hover:text-primary font-semibold"
                    : ""
                }`}
                onClick={() => setIsFilterOpen(true)}
              >
                Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </Button>
            </div>
          </form>

          {/* Right side: Actions & Pagination */}
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-[11px] px-2 gap-1"
                onClick={() => setBarcodeUpdateDialogOpen(true)}
              >
                <Barcode className="h-3.5 w-3.5" />
                Scan
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-[11px] px-2"
                onClick={() => setMinPriceDialogOpen(true)}
              >
                Min Price
              </Button>
            </div>

            <div className="h-4 w-px bg-border hidden sm:block" />

            {/* Pagination Controls */}
            {inventoryPagination && (inventoryPagination.totalItems > 0) && (
              <div className="flex items-center gap-2">
                <Select
                  value={String(pageLimit)}
                  onValueChange={(value) => {
                    setPageLimit(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[60px] h-8 text-xs px-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}/p
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={(inventoryPagination?.currentPage || 1) === 1}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((prev) => Math.max(1, prev - 1));
                    }}
                  >
                    ‹
                  </Button>
                  <span className="text-[11px] font-medium min-w-[32px] text-center">
                    {inventoryPagination.currentPage} / {inventoryPagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={(inventoryPagination?.currentPage || 1) >= (inventoryPagination?.totalPages || 1)}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((prev) => prev + 1);
                    }}
                  >
                    ›
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Horizontal Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs border-t border-border/60 mt-1 pt-1.5">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mr-1">Active:</span>
            {appliedFilters.searchSupplier && (
              <Badge variant="secondary" className="h-5 text-[10px] gap-1 pl-2 pr-1 bg-muted border border-border">
                Supplier: {appliedFilters.searchSupplier}
                <button
                  type="button"
                  className="h-3 w-3 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center font-bold text-muted-foreground"
                  onClick={() => {
                    setFilterForm(prev => ({ ...prev, searchSupplier: "" }));
                    setAppliedFilters(prev => ({ ...prev, searchSupplier: "" }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </Badge>
            )}
            {appliedFilters.searchProduct && (
              <Badge variant="secondary" className="h-5 text-[10px] gap-1 pl-2 pr-1 bg-muted border border-border">
                Product: {appliedFilters.searchProduct}
                <button
                  type="button"
                  className="h-3 w-3 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center font-bold text-muted-foreground"
                  onClick={() => {
                    setFilterForm(prev => ({ ...prev, searchProduct: "" }));
                    setAppliedFilters(prev => ({ ...prev, searchProduct: "" }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </Badge>
            )}
            {appliedFilters.searchSku && (
              <Badge variant="secondary" className="h-5 text-[10px] gap-1 pl-2 pr-1 bg-muted border border-border">
                SKU: {appliedFilters.searchSku}
                <button
                  type="button"
                  className="h-3 w-3 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center font-bold text-muted-foreground"
                  onClick={() => {
                    setFilterForm(prev => ({ ...prev, searchSku: "" }));
                    setAppliedFilters(prev => ({ ...prev, searchSku: "" }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </Badge>
            )}
            {appliedFilters.season && (
              <Badge variant="secondary" className="h-5 text-[10px] gap-1 pl-2 pr-1 bg-muted border border-border">
                Season: {appliedFilters.season}
                <button
                  type="button"
                  className="h-3 w-3 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center font-bold text-muted-foreground"
                  onClick={() => {
                    setFilterForm(prev => ({ ...prev, season: "" }));
                    setAppliedFilters(prev => ({ ...prev, season: "" }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </Badge>
            )}
            {appliedFilters.size && (
              <Badge variant="secondary" className="h-5 text-[10px] gap-1 pl-2 pr-1 bg-muted border border-border">
                Size: {appliedFilters.size}
                <button
                  type="button"
                  className="h-3 w-3 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center font-bold text-muted-foreground"
                  onClick={() => {
                    setFilterForm(prev => ({ ...prev, size: "" }));
                    setAppliedFilters(prev => ({ ...prev, size: "" }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </Badge>
            )}
            {appliedFilters.color && (
              <Badge variant="secondary" className="h-5 text-[10px] gap-1 pl-2 pr-1 bg-muted border border-border">
                Color: {appliedFilters.color}
                <button
                  type="button"
                  className="h-3 w-3 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center font-bold text-muted-foreground"
                  onClick={() => {
                    setFilterForm(prev => ({ ...prev, color: "" }));
                    setAppliedFilters(prev => ({ ...prev, color: "" }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </Badge>
            )}
            {appliedFilters.lowStock && (
              <Badge variant="secondary" className="h-5 text-[10px] gap-1 pl-2 pr-1 bg-muted border border-border">
                Low Stock
                <button
                  type="button"
                  className="h-3 w-3 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center font-bold text-muted-foreground"
                  onClick={() => {
                    setFilterForm(prev => ({ ...prev, lowStock: false }));
                    setAppliedFilters(prev => ({ ...prev, lowStock: false }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </Badge>
            )}
            {appliedFilters.needsReorder && (
              <Badge variant="secondary" className="h-5 text-[10px] gap-1 pl-2 pr-1 bg-muted border border-border">
                Reorder
                <button
                  type="button"
                  className="h-3 w-3 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center font-bold text-muted-foreground"
                  onClick={() => {
                    setFilterForm(prev => ({ ...prev, needsReorder: false }));
                    setAppliedFilters(prev => ({ ...prev, needsReorder: false }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </Badge>
            )}
            {(appliedFilters.minStock || appliedFilters.maxStock) && (
              <Badge variant="secondary" className="h-5 text-[10px] gap-1 pl-2 pr-1 bg-muted border border-border">
                Stock: {appliedFilters.minStock || "0"} - {appliedFilters.maxStock || "∞"}
                <button
                  type="button"
                  className="h-3 w-3 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center font-bold text-muted-foreground"
                  onClick={() => {
                    setFilterForm(prev => ({ ...prev, minStock: "", maxStock: "" }));
                    setAppliedFilters(prev => ({ ...prev, minStock: "", maxStock: "" }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </Badge>
            )}
            {(appliedFilters.minCost || appliedFilters.maxCost) && (
              <Badge variant="secondary" className="h-5 text-[10px] gap-1 pl-2 pr-1 bg-muted border border-border">
                Cost: £{appliedFilters.minCost || "0"} - £{appliedFilters.maxCost || "∞"}
                <button
                  type="button"
                  className="h-3 w-3 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center font-bold text-muted-foreground"
                  onClick={() => {
                    setFilterForm(prev => ({ ...prev, minCost: "", maxCost: "" }));
                    setAppliedFilters(prev => ({ ...prev, minCost: "", maxCost: "" }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </Badge>
            )}
            {(appliedFilters.minPrice || appliedFilters.maxPrice) && (
              <Badge variant="secondary" className="h-5 text-[10px] gap-1 pl-2 pr-1 bg-muted border border-border">
                Price: £{appliedFilters.minPrice || "0"} - £{appliedFilters.maxPrice || "∞"}
                <button
                  type="button"
                  className="h-3 w-3 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center font-bold text-muted-foreground"
                  onClick={() => {
                    setFilterForm(prev => ({ ...prev, minPrice: "", maxPrice: "" }));
                    setAppliedFilters(prev => ({ ...prev, minPrice: "", maxPrice: "" }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </Badge>
            )}
            {(appliedFilters.startDate || appliedFilters.endDate) && (
              <Badge variant="secondary" className="h-5 text-[10px] gap-1 pl-2 pr-1 bg-muted border border-border">
                Date: {appliedFilters.startDate || "Start"} to {appliedFilters.endDate || "End"}
                <button
                  type="button"
                  className="h-3 w-3 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center font-bold text-muted-foreground"
                  onClick={() => {
                    setFilterForm(prev => ({ ...prev, startDate: "", endDate: "" }));
                    setAppliedFilters(prev => ({ ...prev, startDate: "", endDate: "" }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </Badge>
            )}

            <Button
              variant="ghost"
              className="h-5 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/5 px-2 font-medium"
              onClick={handleResetFilters}
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Advanced Filters Sliding Sheet */}
      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="text-base font-bold flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              Advanced Inventory Filters
            </SheetTitle>
            <SheetDescription className="text-xs">
              Refine the stock list by configuring the parameters below.
            </SheetDescription>
          </SheetHeader>

          {/* Scrollable filter inputs container */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 gap-3.5 text-xs">
              {/* Supplier Filter */}
              <div className="flex flex-col gap-1">
                <Label htmlFor="filter-supplier" className="text-[11px] text-muted-foreground font-medium">Supplier</Label>
                <Input
                  id="filter-supplier"
                  placeholder="Supplier name..."
                  value={filterForm.searchSupplier}
                  onChange={(e) => setFilterForm(prev => ({ ...prev, searchSupplier: e.target.value }))}
                  className="h-8 text-xs px-2.5"
                />
              </div>

              {/* Product Filter */}
              <div className="flex flex-col gap-1">
                <Label htmlFor="filter-product" className="text-[11px] text-muted-foreground font-medium">Product</Label>
                <Input
                  id="filter-product"
                  placeholder="Product name..."
                  value={filterForm.searchProduct}
                  onChange={(e) => setFilterForm(prev => ({ ...prev, searchProduct: e.target.value }))}
                  className="h-8 text-xs px-2.5"
                />
              </div>

              {/* SKU Filter */}
              <div className="flex flex-col gap-1">
                <Label htmlFor="filter-sku" className="text-[11px] text-muted-foreground font-medium">SKU</Label>
                <Input
                  id="filter-sku"
                  placeholder="SKU number..."
                  value={filterForm.searchSku}
                  onChange={(e) => setFilterForm(prev => ({ ...prev, searchSku: e.target.value }))}
                  className="h-8 text-xs px-2.5"
                />
              </div>

              {/* Season Filter */}
              <div className="flex flex-col gap-1">
                <Label htmlFor="filter-season" className="text-[11px] text-muted-foreground font-medium">Season</Label>
                <Select
                  value={filterForm.season || "all"}
                  onValueChange={(val) => setFilterForm(prev => ({ ...prev, season: val === "all" ? "" : val }))}
                >
                  <SelectTrigger id="filter-season" className="h-8 text-xs px-2.5">
                    <SelectValue placeholder="All Seasons" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Seasons</SelectItem>
                    <SelectItem value="SS">SS (Spring/Summer)</SelectItem>
                    <SelectItem value="AW">AW (Autumn/Winter)</SelectItem>
                    <SelectItem value="SS24">SS24</SelectItem>
                    <SelectItem value="AW24">AW24</SelectItem>
                    <SelectItem value="SS25">SS25</SelectItem>
                    <SelectItem value="AW25">AW25</SelectItem>
                    <SelectItem value="SS26">SS26</SelectItem>
                    <SelectItem value="AW26">AW26</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Size Filter */}
                <div className="flex flex-col gap-1">
                  <Label htmlFor="filter-size" className="text-[11px] text-muted-foreground font-medium">Size</Label>
                  <Input
                    id="filter-size"
                    placeholder="Size..."
                    value={filterForm.size}
                    onChange={(e) => setFilterForm(prev => ({ ...prev, size: e.target.value }))}
                    className="h-8 text-xs px-2.5"
                  />
                </div>

                {/* Color Filter */}
                <div className="flex flex-col gap-1">
                  <Label htmlFor="filter-color" className="text-[11px] text-muted-foreground font-medium">Color</Label>
                  <Input
                    id="filter-color"
                    placeholder="Color..."
                    value={filterForm.color}
                    onChange={(e) => setFilterForm(prev => ({ ...prev, color: e.target.value }))}
                    className="h-8 text-xs px-2.5"
                  />
                </div>
              </div>

              {/* Stock Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="filter-min-stock" className="text-[11px] text-muted-foreground font-medium">Min Stock</Label>
                  <Input
                    id="filter-min-stock"
                    type="number"
                    placeholder="Min qty"
                    value={filterForm.minStock}
                    onChange={(e) => setFilterForm(prev => ({ ...prev, minStock: e.target.value }))}
                    className="h-8 text-xs px-2.5"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="filter-max-stock" className="text-[11px] text-muted-foreground font-medium">Max Stock</Label>
                  <Input
                    id="filter-max-stock"
                    type="number"
                    placeholder="Max qty"
                    value={filterForm.maxStock}
                    onChange={(e) => setFilterForm(prev => ({ ...prev, maxStock: e.target.value }))}
                    className="h-8 text-xs px-2.5"
                  />
                </div>
              </div>

              {/* Cost Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="filter-min-cost" className="text-[11px] text-muted-foreground font-medium">Min Cost (£)</Label>
                  <Input
                    id="filter-min-cost"
                    type="number"
                    step="0.01"
                    placeholder="Min cost"
                    value={filterForm.minCost}
                    onChange={(e) => setFilterForm(prev => ({ ...prev, minCost: e.target.value }))}
                    className="h-8 text-xs px-2.5"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="filter-max-cost" className="text-[11px] text-muted-foreground font-medium">Max Cost (£)</Label>
                  <Input
                    id="filter-max-cost"
                    type="number"
                    step="0.01"
                    placeholder="Max cost"
                    value={filterForm.maxCost}
                    onChange={(e) => setFilterForm(prev => ({ ...prev, maxCost: e.target.value }))}
                    className="h-8 text-xs px-2.5"
                  />
                </div>
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="filter-min-price" className="text-[11px] text-muted-foreground font-medium">Min Price (£)</Label>
                  <Input
                    id="filter-min-price"
                    type="number"
                    step="0.01"
                    placeholder="Min price"
                    value={filterForm.minPrice}
                    onChange={(e) => setFilterForm(prev => ({ ...prev, minPrice: e.target.value }))}
                    className="h-8 text-xs px-2.5"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="filter-max-price" className="text-[11px] text-muted-foreground font-medium">Max Price (£)</Label>
                  <Input
                    id="filter-max-price"
                    type="number"
                    step="0.01"
                    placeholder="Max price"
                    value={filterForm.maxPrice}
                    onChange={(e) => setFilterForm(prev => ({ ...prev, maxPrice: e.target.value }))}
                    className="h-8 text-xs px-2.5"
                  />
                </div>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="filter-start-date" className="text-[11px] text-muted-foreground font-medium">Start Date</Label>
                  <Input
                    id="filter-start-date"
                    type="date"
                    value={filterForm.startDate}
                    onChange={(e) => setFilterForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="h-8 text-xs px-2.5"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="filter-end-date" className="text-[11px] text-muted-foreground font-medium">End Date</Label>
                  <Input
                    id="filter-end-date"
                    type="date"
                    value={filterForm.endDate}
                    onChange={(e) => setFilterForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="h-8 text-xs px-2.5"
                  />
                </div>
              </div>

              {/* Switches inline */}
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sheet-filter-low-stock"
                    checked={filterForm.lowStock}
                    onCheckedChange={(checked) =>
                      setFilterForm((prev) => ({ ...prev, lowStock: checked }))
                    }
                    className="scale-90 origin-left"
                  />
                  <Label htmlFor="sheet-filter-low-stock" className="text-[11px] text-muted-foreground cursor-pointer font-medium select-none">
                    Low Stock
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="sheet-filter-reorder"
                    checked={filterForm.needsReorder}
                    onCheckedChange={(checked) =>
                      setFilterForm((prev) => ({ ...prev, needsReorder: checked }))
                    }
                    className="scale-90 origin-left"
                  />
                  <Label htmlFor="sheet-filter-reorder" className="text-[11px] text-muted-foreground cursor-pointer font-medium select-none">
                    Reorder
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Action buttons */}
          <div className="p-4 border-t border-border bg-muted/30 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-9 text-xs"
              onClick={() => {
                handleResetFilters();
                setIsFilterOpen(false);
              }}
            >
              Reset All
            </Button>
            <Button
              type="submit"
              className="flex-1 h-9 text-xs"
              onClick={(e) => {
                handleApplyFilters(e);
                setIsFilterOpen(false);
              }}
            >
              Apply Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <DataTable
        columns={inventoryColumns}
        data={filteredInventoryItems}
        onDownloadPDF={handleDownloadPDF}
        loading={inventoryLoading}
        enableSearch={false}
        paginate={false}
        expandableRow={true}
        compact={true}
      />
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
      className: "hidden md:table-cell",
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
      className: "hidden md:table-cell",
      render: (row) => {
        const companyName = row.supplier?.companyName || row.supplier?.company;
        const contactName = row.supplier?.name;

        if (!companyName && !contactName) {
          return <div className="text-muted-foreground">—</div>;
        }

        return (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {companyName || contactName}
            </span>
            {companyName && contactName && companyName !== contactName && (
              <span className="text-[11px] text-muted-foreground leading-tight">
                {contactName}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Composition",
      accessor: "composition",
      className: "hidden md:table-cell",
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
      className: "hidden md:table-cell",
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
      className: "hidden md:table-cell",
      render: (row) => (
        <div className="text-right tabular-nums text-muted-foreground">
          {row.soldPackets || 0}
        </div>
      ),
    },
    {
      header: "Min Sell Price",
      accessor: "unitPrice",
      className: "hidden md:table-cell",
      render: (row) => {
        const price = row.product?.pricing?.minSellingPrice ?? row.product?.pricing?.sellingPrice

        return (
          <div className="text-right tabular-nums text-muted-foreground">
            {currency(price)}
          </div>
        );
      },
    },
    {
      header: "Price/Pkt",
      accessor: "suggestedSellingPrice",
      className: "hidden md:table-cell",
      render: (row) => {
        const perItemMin = Number(
          row.product?.pricing?.minSellingPrice ?? row.product?.pricing?.sellingPrice
        );
        const effectivePacketPrice = Number.isFinite(perItemMin)
          ? perItemMin * (row.totalItemsPerPacket || 1)
          : (row.suggestedSellingPrice || 0);

        return (
          <div className="text-right tabular-nums">
            {currency(effectivePacketPrice)}
          </div>
        );
      },
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
            disabled={printLoadingId === row._id}
            onClick={(e) => {
              e.stopPropagation();
              handlePrintBarcode(row);
            }}
            title="Print Barcode"
          >
            {printLoadingId === row._id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
          </Button>
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
      const perItemMin = Number(
        p.product?.pricing?.minSellingPrice ?? p.product?.pricing?.sellingPrice
      );
      const effectivePacketPrice = Number.isFinite(perItemMin)
        ? perItemMin * (p.totalItemsPerPacket || 1)
        : (p.suggestedSellingPrice || 0);

      totalPackets += available;
      totalItems += available * (p.totalItemsPerPacket || 1);
      totalValue += available * effectivePacketPrice;
      if (available > 0 && available <= 5) lowStockCount++;
    });

    return { totalPackets, totalItems, totalValue, lowStockCount };
  }, [packetStockItems]);

  // Loose Stock summary
  const looseStockSummary = useMemo(() => {
    const items = looseStockItems || [];
    let totalLoose = 0;
    let totalItems = 0;
    let totalValue = 0;
    let lowStockCount = 0;

    items.forEach((p) => {
      const available = (p.availablePackets || 0) - (p.reservedPackets || 0);
      const perItemMin = Number(
        p.product?.pricing?.minSellingPrice ?? p.product?.pricing?.sellingPrice
      );
      const effectivePrice = Number.isFinite(perItemMin) ? perItemMin : (p.suggestedSellingPrice || 0);

      totalLoose += available;
      totalItems += available * (p.totalItemsPerPacket || 1);
      totalValue += available * effectivePrice;
      if (available > 0 && available <= 5) lowStockCount++;
    });

    return { totalLoose, totalItems, totalValue, lowStockCount };
  }, [looseStockItems]);

  const handleApplyLooseSearch = (e) => {
    e.preventDefault();
    setLooseAppliedSearch(looseSearch);
    setLoosePage(1);
  };

  const handleResetLooseFilters = () => {
    setLooseSearch("");
    setLooseAppliedSearch("");
    setLooseStockFilter("all");
    setLoosePage(1);
  };

  const looseStockTab = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          {/* <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Loose
            </CardTitle>
          </CardHeader> */}
          <CardContent>
            Total Loose
            <div className="text-2xl font-bold tabular-nums">
              {formatNumber(looseStockSummary.totalLoose)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
        
          <CardContent>
            Total Value
            <div className="text-2xl font-bold tabular-nums">
              {currency(looseStockSummary.totalValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
         
          <CardContent>
            Low Stock
            <div className="text-2xl font-bold tabular-nums text-amber-600">
              {looseStockSummary.lowStockCount}
            </div>
          </CardContent>
        </Card>
      </div>

     
      <DataTable
        columns={packetStockColumns}
        data={looseStockItems}
        loading={looseStockLoading}
      />

    
    </div>
  );

  const packetStockTab = (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          {/* <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Packets
            </CardTitle>
          </CardHeader> */}
          <CardContent>
            Total Packets
            <div className="text-2xl font-bold tabular-nums">
              {formatNumber(packetStockSummary.totalPackets)}
            </div>
          </CardContent>
        </Card>
       
        <Card>
          {/* <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
          </CardHeader> */}
          <CardContent>
            Total Value
            <div className="text-2xl font-bold tabular-nums">
              {currency(packetStockSummary.totalValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          {/* <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock
            </CardTitle>
          </CardHeader> */}
          <CardContent>
            Low Stock
            <div className="text-2xl font-bold tabular-nums text-amber-600">
              {packetStockSummary.lowStockCount}
            </div>
          </CardContent>
        </Card>
      </div>

   

      {/* Data Table */}
      <DataTable
        columns={packetStockColumns}
        data={packetStockItems}
        // onRowClick={(row) => setSelectedPacketDetail(row)}
        loading={packetStockLoading}
      />

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
    { label: "Loose Stock", content: looseStockTab },
    { label: "Stock Count", content: <StockCountTab /> },
    { label: "Product Summary", content: <ProductSummaryTab /> },
  ];

  const addStockFields = [
    {
      name: "product",
      label: "Product",
      type: "combobox",
      required: true,
      placeholder: "Search product...",
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
      type: "combobox",
      required: true,
      placeholder: "Search product...",
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
      type: "combobox",
      required: true,
      placeholder: "Search product...",
      options: productOptions,
      onChange: (value, currentData) => {
        const item = inventoryItems.find(i => i.productId === value);
        if (item) {
          return {
            ...currentData,
            newQuantity: item.currentStock || 0
          };
        }
        return currentData;
      }
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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BackButton fallbackPath="/home" label="Back" />
          <h1 className="text-lg font-bold tracking-tight text-foreground ml-1.5 hidden sm:block">
            Stock & Inventory
          </h1>
        </div>
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

      <FormDialog
        open={minPriceDialogOpen}
        title="Update Minimum Selling Price"
        fields={[
          {
            name: "product",
            label: "Product",
            type: "combobox",
            required: true,
            placeholder: "Search product...",
            options: productOptions,
            onChange: (value, currentData) => {
              const item = inventoryItems.find(i => i.productId === value);
              if (item) {
                return {
                  ...currentData,
                  minSellingPrice: item.pricing?.minSellingPrice ?? item.pricing?.sellingPrice ?? 0,
                  landedCost: item.averageCostPrice || 0
                };
              }
              return currentData;
            }
          },
          {
            name: "landedCost",
            label: "Landed Cost",
            type: "display",
            render: (data) => currency(data.landedCost || 0)
          },
          {
            name: "minSellingPrice",
            label: "Minimum Selling Price",
            type: "number",
            required: true,
            min: 0,
            step: 0.01,
          },
        ]}
        initialValues={{
          product: selectedProductId,
          minSellingPrice:
            selectedInventory?.pricing?.minSellingPrice ??
            selectedInventory?.pricing?.sellingPrice ??
            0,
          landedCost: selectedInventory?.averageCostPrice ?? 0
        }}
        onClose={() => setMinPriceDialogOpen(false)}
        onSubmit={submitMinSellingPrice}
        loading={isSavingMinPrice}
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
                    disabled={printLoadingId === selectedPacketDetail._id}
                    onClick={() => handlePrintBarcode(selectedPacketDetail)}
                  >
                    {printLoadingId === selectedPacketDetail._id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4 mr-1" />
                    )}
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

      <BarcodeUpdatePriceDialog
        open={barcodeUpdateDialogOpen}
        onOpenChange={setBarcodeUpdateDialogOpen}
        onSuccess={async (productId) => {
          await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
          await queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(productId) });
        }}
      />

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