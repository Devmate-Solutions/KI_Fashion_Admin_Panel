"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Printer,
  X,
  ChevronDown,
  ChevronRight,
  Package,
  Tag,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dispatchOrdersAPI } from "@/lib/api/endpoints/dispatchOrders";
import { toast } from "sonner";

// Normalize barcode data from API to component format
const normalizeBarcodeData = (apiData) => {
  if (!apiData || !apiData.barcodes) {
    return apiData;
  }

  return {
    ...apiData,
    barcodes: apiData.barcodes.map((item) => ({
      barcodeNumber: item.barcodeNumber || item.data,
      barcodeImage: item.barcodeImage || item.dataUrl,
      productName: item.productName,
      productCode: item.productCode,
      isLoose: item.isLoose ?? false,
      type: item.type,
      packetNumber: item.packetNumber,
      composition: item.composition,
      size: item.size,
      color: item.color,
      quantity: item.quantity || 1,
      generatedAt: item.generatedAt,
      data: item.data,
      dataUrl: item.dataUrl,
    })),
  };
};

// Expand barcodes based on quantity (e.g., qty=5 → 5 identical labels)
const expandBarcodesByQuantity = (barcodes) => {
  if (!barcodes || !Array.isArray(barcodes)) return [];

  return barcodes.flatMap((barcode) => {
    const qty = barcode.quantity || 1;
    return Array(qty)
      .fill(null)
      .map((_, index) => ({
        ...barcode,
        labelIndex: index + 1,
        totalLabels: qty,
      }));
  });
};

// Format composition into readable string
const formatComposition = (item) => {
  if (item.isLoose) {
    const color = item.color || "";
    const size = item.size || "";
    if (color && size) return `${color} / ${size}`;
    if (color) return color;
    if (size) return size;
    if (item.composition?.length === 1) {
      const c = item.composition[0];
      return `${c.color || ""} / ${c.size || ""}`.replace(/^ \/ | \/ $/g, "");
    }
    return "";
  }
  if (item.composition && item.composition.length > 0) {
    return item.composition
      .map((c) => `${c.color || "?"}/${c.size || "?"}×${c.quantity || 0}`)
      .join(", ");
  }
  return "";
};

// Group barcodes by productCode (or productName as fallback)
const groupBarcodesByProduct = (barcodes) => {
  if (!barcodes || !Array.isArray(barcodes)) return [];

  const groups = {};
  barcodes.forEach((barcode) => {
    const key = barcode.productCode || barcode.productName || "Unknown";
    if (!groups[key]) {
      groups[key] = {
        productCode: barcode.productCode,
        productName: barcode.productName,
        barcodes: [],
      };
    }
    groups[key].barcodes.push(barcode);
  });

  return Object.values(groups);
};

export default function BarcodePrintModal({
  open,
  onClose,
  dispatchOrderId,
  autoPrint = false,
}) {
  const printRef = useRef(null);
  const [hasPrinted, setHasPrinted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["barcode-data", dispatchOrderId],
    queryFn: async () => {
      const response = await dispatchOrdersAPI.getBarcodeData(dispatchOrderId);
      const normalized = normalizeBarcodeData(response.data);
      return normalized;
    },
    enabled: open && !!dispatchOrderId,
  });

  const _data = data?.data;

  // Expand barcodes by quantity for printing
  const expandedBarcodes = useMemo(
    () => (_data?.barcodes ? expandBarcodesByQuantity(_data.barcodes) : []),
    [_data?.barcodes]
  );

  // Group for preview
  const productGroups = useMemo(
    () => groupBarcodesByProduct(_data?.barcodes || []),
    [_data?.barcodes]
  );

  const totalLabels = expandedBarcodes.length;

  // Auto-expand all groups on first load
  useEffect(() => {
    if (productGroups.length > 0 && Object.keys(expandedGroups).length === 0) {
      const initial = {};
      productGroups.forEach((g) => {
        initial[g.productCode || g.productName] = true;
      });
      setExpandedGroups(initial);
    }
  }, [productGroups, expandedGroups]);

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Build the print HTML for a set of barcodes
  const buildPrintHtml = useCallback(
    (barcodesToPrint, showCoverSheet = true, productFilter = null) => {
      const expanded = expandBarcodesByQuantity(barcodesToPrint);
      if (expanded.length === 0) return null;

      // Group expanded barcodes by product for separators
      const grouped = {};
      expanded.forEach((item) => {
        const key = item.productCode || item.productName || "Unknown";
        if (!grouped[key]) {
          grouped[key] = {
            productCode: item.productCode,
            productName: item.productName,
            labels: [],
          };
        }
        grouped[key].labels.push(item);
      });

      const productEntries = Object.values(grouped);

      // --- Cover Sheet ---
      let coverSheetHtml = "";
      if (showCoverSheet && !productFilter) {
        const productRows = productEntries
          .map((g) => {
            const packetCount = g.labels.filter((l) => !l.isLoose).length;
            const looseCount = g.labels.filter((l) => l.isLoose).length;
            return `
            <tr>
              <td style="padding:4px 8px;border:1px solid #ccc;font-size:8pt;font-weight:600;">${g.productName || "—"}</td>
              <td style="padding:4px 8px;border:1px solid #ccc;font-size:8pt;font-family:'Courier New',monospace;">${g.productCode || "—"}</td>
              <td style="padding:4px 8px;border:1px solid #ccc;font-size:8pt;text-align:center;">${packetCount}</td>
              <td style="padding:4px 8px;border:1px solid #ccc;font-size:8pt;text-align:center;">${looseCount}</td>
              <td style="padding:4px 8px;border:1px solid #ccc;font-size:8pt;text-align:center;font-weight:bold;">${g.labels.length}</td>
            </tr>`;
          })
          .join("");

        coverSheetHtml = `
          <div class="cover-sheet">
            <div style="font-size:12pt;font-weight:bold;margin-bottom:3mm;text-align:center;">
              ORDER #${_data?.orderNumber || ""}
            </div>
            <div style="font-size:8pt;text-align:center;margin-bottom:3mm;color:#555;">
              Supplier: ${_data?.supplierName || "—"}
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:3mm;">
              <thead>
                <tr style="background:#f0f0f0;">
                  <th style="padding:3px 6px;border:1px solid #ccc;font-size:7pt;text-align:left;">Product</th>
                  <th style="padding:3px 6px;border:1px solid #ccc;font-size:7pt;text-align:left;">Code</th>
                  <th style="padding:3px 6px;border:1px solid #ccc;font-size:7pt;text-align:center;">Pkts</th>
                  <th style="padding:3px 6px;border:1px solid #ccc;font-size:7pt;text-align:center;">Loose</th>
                  <th style="padding:3px 6px;border:1px solid #ccc;font-size:7pt;text-align:center;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${productRows}
                <tr style="background:#f5f5f5;">
                  <td colspan="4" style="padding:4px 8px;border:1px solid #ccc;font-size:8pt;font-weight:bold;text-align:right;">GRAND TOTAL</td>
                  <td style="padding:4px 8px;border:1px solid #ccc;font-size:10pt;font-weight:bold;text-align:center;">${expanded.length}</td>
                </tr>
              </tbody>
            </table>
            <div style="font-size:7pt;color:#888;text-align:center;">
              ${productEntries.length} product(s) • ${expanded.length} sticker(s) to apply
            </div>
          </div>
        `;
      }

      // --- Labels with product separators ---
      let labelsHtml = "";
      productEntries.forEach((group, groupIdx) => {
        // Product separator page (skip if printing single product)
        if (!productFilter && productEntries.length > 1) {
          const pktCount = group.labels.filter((l) => !l.isLoose).length;
          const looseCount = group.labels.filter((l) => l.isLoose).length;
          labelsHtml += `
            <div class="product-separator">
              <div style="font-size:10pt;font-weight:bold;margin-bottom:2mm;">
                ${group.productName || "Unknown Product"}
              </div>
              <div style="font-size:8pt;font-family:'Courier New',monospace;color:#555;margin-bottom:2mm;">
                ${group.productCode || ""}
              </div>
              <div style="font-size:8pt;">
                ${pktCount > 0 ? `<span style="background:#e3f2fd;color:#1976d2;padding:1px 4px;border-radius:2px;margin-right:4px;">${pktCount} PACKET${pktCount > 1 ? "S" : ""}</span>` : ""}
                ${looseCount > 0 ? `<span style="background:#fff3e0;color:#f57c00;padding:1px 4px;border-radius:2px;">${looseCount} LOOSE</span>` : ""}
              </div>
              <div style="font-size:7pt;color:#888;margin-top:2mm;">
                ${group.labels.length} sticker(s) below
              </div>
            </div>
          `;
        }

        // Individual labels
        group.labels.forEach((item) => {
          const compositionText = formatComposition(item);
          const typeBadge = item.isLoose
            ? `<span class="type-badge type-loose">LOOSE</span>`
            : `<span class="type-badge type-packet">PACKET</span>`;
         

          labelsHtml += `
            <div class="barcode-label">
             
              ${compositionText ? `<div class="barcode-number">${compositionText}</div>` : ""}
              <div class="barcode-image">
                <img src="${item.dataUrl || item.barcodeImage}" alt="${item.data || item.barcodeNumber}" />
              </div>
              <div class="product-info">
                <div class="product-name">${item.productName || ""}</div>
                <div class="product-code">${item.productCode || ""}</div>
              </div>
            </div>
          `;
        });
      });

      return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Barcode Labels - Order ${_data?.orderNumber || ""}</title>
        <style>
          @page {
            size: 50mm auto;
            margin: 1mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: Arial, sans-serif;
            background: white;
            width: 48mm;
          }
          .cover-sheet {
            width: 48mm;
            padding: 3mm 2mm;
            text-align: center;
            page-break-after: always;
          }
          .product-separator {
            width: 48mm;
            padding: 4mm 2mm;
            text-align: center;
            page-break-after: always;
            border: 2px dashed #999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 25mm;
          }
          .barcode-label {
            width: 48mm;
            padding: 1.5mm 2mm;
            text-align: center;
            page-break-after: always;
            border-bottom: 1px dashed #ccc;
          }
          .barcode-label:last-child {
            page-break-after: auto;
            border-bottom: none;
          }
          .label-top-row {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 3mm;
            margin-bottom: 1mm;
          }
          .type-badge {
            font-size: 7pt;
            font-weight: 700;
            padding: 0.5mm 2mm;
            border-radius: 1mm;
            letter-spacing: 0.5px;
          }
          .type-packet {
            background: #e3f2fd;
            color: #1565c0;
            border: 0.3mm solid #90caf9;
          }
          .type-loose {
            background: #fff3e0;
            color: #e65100;
            border: 0.3mm solid #ffcc80;
          }
          .packet-num {
            font-size: 7pt;
            font-weight: 600;
            color: #333;
          }
          .composition {
            font-size: 7pt;
            font-weight: 600;
            color: #222;
            margin-bottom: 1mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .barcode-image {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 0.5mm;
          }
          .barcode-image img {
            max-width: 44mm;
            height: auto;
          }
          .barcode-number {
            font-size: 7pt;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            letter-spacing: 0.5px;
            margin-bottom: 0.5mm;
          }
          .product-info {
            border-top: 0.3mm solid #ddd;
            padding-top: 0.5mm;
          }
          .product-name {
            font-size: 6pt;
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .product-code {
            font-size: 5pt;
            color: #666;
            font-family: 'Courier New', monospace;
          }
          .label-counter {
            font-size: 6pt;
            color: #888;
            margin-top: 0.5mm;
            font-style: italic;
          }
          @media print {
            body { width: 48mm; }
            .barcode-label { border-bottom: none; }
            .product-separator { border: none; }
          }
        </style>
      </head>
      <body>
        ${coverSheetHtml}
        ${labelsHtml}
      </body>
      </html>
    `;
    },
    [_data]
  );

  // Print all or filtered by product
  const handlePrint = useCallback(
    (productCodeFilter = null) => {
      if (!_data || !_data.barcodes || _data.barcodes.length === 0) return;

      const barcodesToPrint = productCodeFilter
        ? _data.barcodes.filter(
            (b) => (b.productCode || b.productName) === productCodeFilter
          )
        : _data.barcodes;

      const html = buildPrintHtml(barcodesToPrint, !productCodeFilter, productCodeFilter);
      if (!html) return;

      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (!printWindow) {
        toast.error("Please allow popups for printing");
        return;
      }

      printWindow.document.write(html);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
        setHasPrinted(true);
      }, 500);
    },
    [_data, buildPrintHtml]
  );

  // Auto-print when data loads (only if autoPrint is enabled — post-confirmation)
  useEffect(() => {
    if (
      autoPrint &&
      open &&
      _data?.barcodes?.length > 0 &&
      !hasPrinted &&
      !isLoading
    ) {
      const timer = setTimeout(() => {
        handlePrint();
        toast.success(`Printing ${totalLabels} barcode labels...`);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [autoPrint, open, _data, hasPrinted, isLoading, handlePrint, totalLabels]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setHasPrinted(false);
      setExpandedGroups({});
    }
  }, [open]);

  // Count stickers for a product group
  const getGroupStats = (barcodes) => {
    const packetBarcodes = barcodes.filter((b) => !b.isLoose);
    const looseBarcodes = barcodes.filter((b) => b.isLoose);
    const packetLabels = packetBarcodes.reduce(
      (sum, b) => sum + (b.quantity || 1),
      0
    );
    const looseLabels = looseBarcodes.reduce(
      (sum, b) => sum + (b.quantity || 1),
      0
    );
    return { packetLabels, looseLabels, totalLabels: packetLabels + looseLabels };
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Barcode Labels — Order {_data?.orderNumber || ""}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto" ref={printRef}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Loading barcodes...
              </span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              <p className="font-medium">Failed to load barcodes</p>
              <p className="text-sm mt-1">
                {error.message || "Please try again"}
              </p>
            </div>
          ) : !data?.success ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No barcodes found for this order.</p>
              <p className="text-sm mt-1">
                Please ensure the order has been properly confirmed with packet
                tracking.
              </p>
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div className="bg-muted/50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      Supplier:{" "}
                      <span className="text-muted-foreground">
                        {_data.supplierName}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {_data.barcodes.length} unique barcode
                      {_data.barcodes.length !== 1 ? "s" : ""} →{" "}
                      <strong className="text-foreground">
                        {totalLabels} stickers
                      </strong>{" "}
                      across {productGroups.length} product
                      {productGroups.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {_data.barcodes.filter((b) => !b.isLoose).length > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]"
                      >
                        <Package className="h-3 w-3 mr-1" />
                        {_data.barcodes.filter((b) => !b.isLoose).length} Packets
                      </Badge>
                    )}
                    {_data.barcodes.filter((b) => b.isLoose).length > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {expandedBarcodes.filter((b) => b.isLoose).length} Loose
                      </Badge>
                    )}
                  </div>
                </div>
                {autoPrint && !hasPrinted && (
                  <p className="text-xs text-blue-600 mt-2">
                    Auto-printing enabled — print dialog will open
                    automatically...
                  </p>
                )}
                {hasPrinted && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Print dialog opened
                  </p>
                )}
              </div>

              {/* Grouped preview */}
              <div className="space-y-3">
                {productGroups.map((group) => {
                  const key = group.productCode || group.productName;
                  const isExpanded = expandedGroups[key] !== false;
                  const stats = getGroupStats(group.barcodes);

                  return (
                    <div
                      key={key}
                      className="border rounded-lg overflow-hidden"
                    >
                      {/* Product group header */}
                      <div
                        className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleGroup(key)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {group.productName || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {group.productCode || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {stats.packetLabels > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]"
                            >
                              {stats.packetLabels} pkt
                            </Badge>
                          )}
                          {stats.looseLabels > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]"
                            >
                              {stats.looseLabels} loose
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px]">
                            {stats.totalLabels} sticker
                            {stats.totalLabels !== 1 ? "s" : ""}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrint(key);
                            }}
                          >
                            <Printer className="h-3 w-3 mr-1" />
                            Print
                          </Button>
                        </div>
                      </div>

                      {/* Barcode cards for this product */}
                      {isExpanded && (
                        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {group.barcodes.map((item, idx) => {
                            const compText = formatComposition(item);
                            return (
                              <div
                                key={idx}
                                className="border border-gray-200 rounded-lg p-2 text-center bg-white"
                              >
                                {/* Type badge */}
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <Badge
                                    variant="outline"
                                    className={
                                      item.isLoose
                                        ? "bg-orange-50 text-orange-700 border-orange-200 text-[9px] px-1.5 py-0"
                                        : "bg-blue-50 text-blue-700 border-blue-200 text-[9px] px-1.5 py-0"
                                    }
                                  >
                                    {item.isLoose ? "LOOSE" : "PACKET"}
                                  </Badge>
                                  {!item.isLoose && item.packetNumber && (
                                    <span className="text-[9px] text-muted-foreground font-medium">
                                      Pkt #{item.packetNumber}
                                    </span>
                                  )}
                                </div>

                                {/* Composition */}
                                {compText && (
                                  <div
                                    className="text-[10px] font-semibold text-foreground mb-1 truncate"
                                    title={compText}
                                  >
                                    {compText}
                                  </div>
                                )}

                                {/* Barcode image */}
                                <div className="flex justify-center items-center min-h-[40px] my-1">
                                  {item.dataUrl ? (
                                    <img
                                      src={item.dataUrl}
                                      alt={item.data}
                                      className="max-w-full h-auto max-h-[40px]"
                                    />
                                  ) : (
                                    <span className="text-[9px] text-muted-foreground">
                                      No image
                                    </span>
                                  )}
                                </div>

                                {/* Barcode number */}
                                <div className="font-mono text-[10px] font-bold tracking-wide mb-1">
                                  {item.data}
                                </div>

                                {/* Labels count */}
                                {(item.quantity || 1) > 1 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] px-1.5 py-0"
                                  >
                                    ×{item.quantity} labels
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer with print actions */}
        <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {totalLabels > 0 &&
              `${totalLabels} sticker(s) will be printed (+ cover sheet & separators)`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            <Button
              onClick={() => handlePrint()}
              disabled={isLoading || !_data?.barcodes?.length}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print All ({totalLabels})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
