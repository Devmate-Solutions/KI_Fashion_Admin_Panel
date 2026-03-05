"use client";

import { useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInventoryItem } from "@/lib/hooks/useInventory";
import { usePacketStockByProduct } from "@/lib/hooks/usePacketStock";
import {
  Loader2,
  ArrowLeft,
  Package,
  Barcode,
  Copy,
  Check,
  Printer,
  Search,
  RotateCcw,
  Info,
  Tag,
} from "lucide-react";
import { toast } from "react-hot-toast";
import ProductImageGallery from "@/components/ui/ProductImageGallery";
import DataTable from "@/components/data-table";
import PacketLabelPrintModal from "@/components/modals/PacketLabelPrintModal";

function currency(n) {
  const num = Number(n || 0);
  return `£${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB");
}

// Helper to get image array from various sources
const getImageArray = (item) => {
  if (Array.isArray(item?.images) && item.images.length > 0) {
    return item.images;
  }
  if (Array.isArray(item?.product?.images) && item.product.images.length > 0) {
    return item.product.images;
  }
  return [];
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function ProductPacketsPage({ params }) {
  const router = useRouter();
  const { id: productId } = use(params);

  // Filter state
  const [page, setPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // 'all', 'inStock', 'outOfStock'
  const [typeFilter, setTypeFilter] = useState("all"); // 'all', 'packet', 'loose'

  // Modal state
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [copiedBarcode, setCopiedBarcode] = useState(null);
  const [printPacketId, setPrintPacketId] = useState(null);

  // Fetch product/inventory info
  const { data: inventoryData, isLoading: inventoryLoading } =
    useInventoryItem(productId);
  const inventory = inventoryData?.data || inventoryData;
  const product = inventory?.product;

  // Build packet query params
  const packetParams = useMemo(() => {
    const params = {
      page,
      limit: pageLimit,
    };
    if (appliedSearch?.trim()) {
      params.search = appliedSearch.trim();
    }
    if (stockFilter === "inStock") {
      params.hasStock = "true";
    } else if (stockFilter === "outOfStock") {
      params.hasStock = "false";
    }
    if (typeFilter === "packet") {
      params.isLoose = "false";
    } else if (typeFilter === "loose") {
      params.isLoose = "true";
    }
    return params;
  }, [page, pageLimit, appliedSearch, stockFilter, typeFilter]);

  // Fetch packets for this product
  const {
    data: packetsData,
    isLoading: packetsLoading,
    isFetching: packetsFetching,
  } = usePacketStockByProduct(productId, packetParams);

  const packets = packetsData?.data ?? [];
  const pagination = packetsData?.pagination;

  // Calculate summary stats
  const summary = useMemo(() => {
    const items = packets || [];
    let totalPackets = 0;
    let totalAvailable = 0;
    let totalAvailableItems = 0;
    let totalReserved = 0;
    let totalSold = 0;
    let totalValue = 0;

    items.forEach((p) => {
      totalPackets++;
      totalAvailable += p.availablePackets || 0;
      totalAvailableItems += (p.availablePackets || 0) * (p.totalItemsPerPacket || 1);
      totalReserved += p.reservedPackets || 0;
      totalSold += p.soldPackets || 0;
      totalValue +=
        (p.availablePackets || 0) * (p.suggestedSellingPrice || 0);
    });

    return {
      totalPackets,
      totalAvailable,
      totalAvailableItems,
      totalReserved,
      totalSold,
      totalValue,
    };
  }, [packets]);

  // Handlers
  const handleApplyFilters = (e) => {
    e.preventDefault();
    setAppliedSearch(search);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setAppliedSearch("");
    setStockFilter("all");
    setTypeFilter("all");
    setPage(1);
  };

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
    setPrintPacketId(packet._id);
  };

  // Columns for DataTable
  const columns = useMemo(
    () => [
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
        header: "Items/Unit",
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
          return (
            <div className="text-right">
              <span className={`font-medium tabular-nums ${row.isLoose ? 'text-blue-600' : ''}`}>
                {row.availablePackets || 0}
              </span>
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
        header: "Landed Price",
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
        header: "Price",
        accessor: "suggestedSellingPrice",
        render: (row) => (
          <div className="text-right tabular-nums">
            {currency(row.landedPricePerPacket || 0)}
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
                setSelectedPacket(row);
              }}
              title="View Details"
            >
              <Info className="h-4 w-4" />
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
          </div>
        ),
      },
    ],
    [copiedBarcode]
  );

  // Loading state
  if (inventoryLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Not found
  if (!inventory && !inventoryLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackPath="/stock" label="Back to Stock" />
        </div>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold">Product Not Found</h2>
          <p className="text-muted-foreground mt-2">
            The product you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center border-b pb-4">
        <BackButton fallbackPath="/stock" label="Back" />
      </div>

      {/* Product Info Accordion */}
      <Accordion
        type="single"
        collapsible
        defaultValue="product-info"
        className="border border-blue-200 rounded-lg bg-blue-50/30"
      >
        <AccordionItem value="product-info" className="border-b-0">
          <AccordionTrigger className="px-4 hover:no-underline bg-blue-50/50 rounded-t-lg">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-900">
                Product Information
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 bg-white/60 rounded-b-lg">
            <div className="flex gap-6 pt-2">
              {/* Product Image */}
              <div className="flex-shrink-0">
                <ProductImageGallery
                  images={getImageArray(product)}
                  alt={product?.name || "Product"}
                  size="sm"
                  maxVisible={1}
                  showCount={false}
                />
              </div>
              {/* Product Details */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Product Name
                </Label>
                <p className="font-medium text-sm">{product?.name || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">SKU</Label>
                <p className="font-medium text-sm">
                  {product?.sku || product?.productCode || "—"}
                </p>
              </div>
              {/* <div>
                <Label className="text-xs text-muted-foreground">Supplier</Label>
                <p className="font-medium text-sm">
                  {inventory?.supplierName || product?.supplier?.companyName || product?.supplier?.name || "—"}
                </p>
              </div> */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Current Stock
                </Label>
                <p className="font-medium text-sm">
                  {formatNumber(inventory?.currentStock || 0)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Landed Cost
                </Label>
                <p className="font-medium text-sm">
                  {currency(inventory?.averageCostPrice || 0)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Total Value
                </Label>
                <p className="font-medium text-sm">
                  {currency(inventory?.totalValue || 0)}
                </p>
              </div>
              {product?.season && (
                <div>
                  <Label className="text-xs text-muted-foreground">Season</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(Array.isArray(product.season)
                      ? product.season
                      : [product.season]
                    ).map((s, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {product?.color && (
                <div>
                  <Label className="text-xs text-muted-foreground">Colors</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(Array.isArray(product.color)
                      ? product.color
                      : [product.color]
                    ).map((c, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {product?.size && (
                <div>
                  <Label className="text-xs text-muted-foreground">Sizes</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(Array.isArray(product.size)
                      ? product.size
                      : [product.size]
                    ).map((s, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Barcode className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Total Variants
              </span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatNumber(summary.totalPackets)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Available Packets</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {formatNumber(summary.totalAvailable)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-muted-foreground">Available Items</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-emerald-600">
              {formatNumber(summary.totalAvailableItems)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Sold</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-600">
              {formatNumber(summary.totalSold)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Total Value</span>
            </div>
            <p className="text-2xl font-bold mt-1">{currency(summary.totalValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <form
            onSubmit={handleApplyFilters}
            className="flex flex-wrap items-end gap-4"
          >
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search" className="text-xs">
                Search Barcode
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-[150px]">
              <Label className="text-xs">Stock Status</Label>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="inStock">In Stock</SelectItem>
                  <SelectItem value="outOfStock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[150px]">
              <Label className="text-xs">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="packet">Packets Only</SelectItem>
                  <SelectItem value="loose">Loose Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" size="sm">
              <Search className="h-4 w-4 mr-1" />
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Packets & Loose Items Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Items
            {packetsFetching && (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Per page:</Label>
            <Select
              value={String(pageLimit)}
              onValueChange={(v) => {
                setPageLimit(Number(v));
                setPage(1);
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
          </div>
        </CardHeader>
        <CardContent>
          {packetsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : packets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No stock items found for this product.</p>
              <p className="text-sm mt-1">
                Packets and loose items are created when stock arrives from dispatch orders.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col.accessor}
                          className="p-2 text-left font-semibold"
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {packets.map((packet, idx) => (
                      <tr
                        key={packet._id}
                        className={`border-b hover:bg-muted/30 text-left cursor-pointer ${
                          idx % 2 === 0 ? "bg-white" : "bg-muted/10"
                        }`}
                        onClick={() => setSelectedPacket(packet)}
                      >
                        {columns.map((col) => (
                          <td key={col.accessor} className="p-2">
                            {col.render ? col.render(packet) : packet[col.accessor]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageLimit + 1} -{" "}
                    {Math.min(page * pageLimit, pagination?.total || 0)} of{" "}
                    {pagination?.total || 0}
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className={
                            page <= 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setPage(pageNum)}
                              isActive={page === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                          className={
                            page >= totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Packet/Item Detail Dialog */}
      <Dialog
        open={!!selectedPacket}
        onOpenChange={(open) => !open && setSelectedPacket(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              {selectedPacket?.isLoose ? "Loose Item Details" : "Packet Details"}
            </DialogTitle>
            <DialogDescription>
              Full information about this {selectedPacket?.isLoose ? "loose item" : "packet"}
            </DialogDescription>
          </DialogHeader>
          {selectedPacket && (
            <div className="space-y-4">
              {/* Barcode */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Barcode
                  </Label>
                  <code className="block text-lg font-mono font-bold mt-1">
                    {selectedPacket.barcode}
                  </code>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyBarcode(selectedPacket.barcode)}
                  >
                    {copiedBarcode === selectedPacket.barcode ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintBarcode(selectedPacket)}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <p className="font-medium">
                    <Badge variant={selectedPacket.isLoose ? "secondary" : "default"} className="text-xs">
                      {selectedPacket.isLoose ? "Loose Item" : "Packet"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {selectedPacket.isLoose ? "Items per Unit" : "Items per Packet"}
                  </Label>
                  <p className="font-medium">
                    {selectedPacket.totalItemsPerPacket || 1}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Available {selectedPacket.isLoose ? "Units" : "Packets"}
                  </Label>
                  <p className="font-medium text-green-600">
                    {selectedPacket.availablePackets || 0}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Sold</Label>
                  <p className="font-medium text-blue-600">
                    {selectedPacket.soldPackets || 0}
                  </p>
                </div>
                {!selectedPacket.isLoose && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Landed Price
                    </Label>
                    <p className="font-medium text-muted-foreground">
                      {currency(
                        (selectedPacket.landedPricePerPacket || 0) /
                          (selectedPacket.totalItemsPerPacket || 1)
                      )}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {selectedPacket.isLoose
                      ? "Price per Unit"
                      : "Price per Packet"}
                  </Label>
                  <p className="font-medium">
                    {currency(selectedPacket.suggestedSellingPrice || 0)}
                  </p>
                </div>
              </div>

              {/* Composition */}
              {selectedPacket.composition &&
                selectedPacket.composition.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {selectedPacket.isLoose ? "Color / Size" : "Composition"}
                    </Label>
                    <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex flex-wrap gap-2">
                        {selectedPacket.composition.map((c, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-2 py-1 bg-white rounded border text-sm"
                          >
                            <span className="font-medium">{c.color}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="font-medium">{c.size}</span>
                            <span className="text-muted-foreground">×</span>
                            <span className="font-bold">{c.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Created
                  </Label>
                  <p className="text-sm">
                    {formatDateTime(selectedPacket.createdAt)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Last Updated
                  </Label>
                  <p className="text-sm">
                    {formatDateTime(selectedPacket.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Packet Label Print Modal */}
      <PacketLabelPrintModal
        open={!!printPacketId}
        onClose={() => setPrintPacketId(null)}
        packetId={printPacketId}
      />
    </div>
  );
}
