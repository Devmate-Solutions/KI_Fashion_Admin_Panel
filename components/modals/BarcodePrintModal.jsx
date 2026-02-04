"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Printer, X } from "lucide-react";
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
      // Map backend field names to component field names
      barcodeNumber: item.barcodeNumber || item.data,
      barcodeImage: item.barcodeImage || item.dataUrl,
      // Preserve all other fields
      productName: item.productName,
      productCode: item.productCode,
      isLoose: item.isLoose ?? false,
      type: item.type,
      packetNumber: item.packetNumber,
      composition: item.composition,
      quantity: item.quantity || 1, // Quantity for label duplication
      generatedAt: item.generatedAt,
      // Keep original fields for print
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
    return Array(qty).fill(null).map((_, index) => ({
      ...barcode,
      labelIndex: index + 1, // 1-based index for display
      totalLabels: qty,
    }));
  });
};

export default function BarcodePrintModal({
  open,
  onClose,
  dispatchOrderId,
  autoPrint = false // Auto-trigger print when data loads
}) {
  const printRef = useRef(null);
  const [hasPrinted, setHasPrinted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["barcode-data", dispatchOrderId],
    queryFn: async () => {
      const response = await dispatchOrdersAPI.getBarcodeData(dispatchOrderId);
      console.log("[BarcodePrintModal] API Response:", response);
      console.log("[BarcodePrintModal] Response data:", response.data);
      const normalized = normalizeBarcodeData(response.data);
      console.log("[BarcodePrintModal] Normalized data:", normalized);
      return normalized;
    },
    enabled: open && !!dispatchOrderId,
  });

  const _data = data?.data;

  // Expand barcodes by quantity for printing
  const expandedBarcodes = _data?.barcodes
    ? expandBarcodesByQuantity(_data.barcodes)
    : [];

  // Calculate total labels to print
  const totalLabels = expandedBarcodes.length;

  const handlePrint = useCallback(() => {
    if (!_data || expandedBarcodes.length === 0) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      toast.error("Please allow popups for printing");
      return;
    }

    // Generate HTML for each label (thermal roll format - single column)
    const labelsHtml = expandedBarcodes.map((item, idx) => `
      <div class="barcode-label">
        <div class="barcode-image">
          <img src="${item.dataUrl || item.barcodeImage}" alt="${item.data || item.barcodeNumber}" />
        </div>
        <div class="barcode-number">${item.data || item.barcodeNumber}</div>
        <div class="product-info">
          <div class="product-name">${item.productName || ''}</div>
          <div class="product-code">${item.productCode || ''}</div>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Barcode Labels - Order ${_data?.orderNumber || ""}</title>
        <style>
          /* Thermal label roll styling - 50mm width */
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
          
          .barcode-label {
            width: 48mm;
            padding: 2mm;
            text-align: center;
            page-break-after: always;
            border-bottom: 1px dashed #ccc;
          }
          
          .barcode-label:last-child {
            page-break-after: auto;
            border-bottom: none;
          }
          
          .barcode-image {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 1mm;
          }
          
          .barcode-image img {
            max-width: 44mm;
            height: auto;
          }
          
          .barcode-number {
            font-size: 8pt;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            letter-spacing: 0.5px;
            margin-bottom: 1mm;
          }
          
          .product-info {
            border-top: 1px solid #ddd;
            padding-top: 1mm;
          }
          
          .product-name {
            font-size: 7pt;
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          .product-code {
            font-size: 6pt;
            color: #666;
            font-family: 'Courier New', monospace;
          }
          
          @media print {
            body {
              width: 48mm;
            }
            
            .barcode-label {
              border-bottom: none;
            }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
      </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for images to load then print
    setTimeout(() => {
      printWindow.print();
      setHasPrinted(true);
    }, 500);
  }, [_data, expandedBarcodes]);

  // Auto-print when data loads (if autoPrint is enabled)
  useEffect(() => {
    if (autoPrint && open && _data?.barcodes?.length > 0 && !hasPrinted && !isLoading) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        handlePrint();
        toast.success(`Printing ${totalLabels} barcode labels...`);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [autoPrint, open, _data, hasPrinted, isLoading, handlePrint, totalLabels]);

  // Reset hasPrinted when modal closes
  useEffect(() => {
    if (!open) {
      setHasPrinted(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Barcode Labels - Order {_data?.orderNumber || ""}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto" ref={printRef}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading barcodes...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              <p className="font-medium">Failed to load barcodes</p>
              <p className="text-sm mt-1">{error.message || "Please try again"}</p>
            </div>
          ) : !data?.success ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No barcodes found for this order.</p>
              <p className="text-sm mt-1">Data received: {JSON.stringify(data)}</p>
              <p className="text-sm mt-1">Please ensure the order has been properly confirmed with packet tracking.</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-4 pb-2 border-b">
                <p className="text-sm text-muted-foreground">
                  Supplier: {_data.supplierName} | Unique Barcodes: {_data.barcodes.length} | <strong>Total Labels to Print: {totalLabels}</strong>
                </p>
                {autoPrint && !hasPrinted && (
                  <p className="text-xs text-blue-600 mt-1">
                    Auto-printing enabled - print dialog will open automatically...
                  </p>
                )}
                {hasPrinted && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Print dialog opened
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {_data.barcodes.map((item, idx) => (
                  <div
                    key={idx}
                    className="border-2 border-gray-300 rounded-lg p-3 text-center bg-white"
                  >
                    <div className="font-mono font-bold text-sm mb-2 tracking-wide">
                      {item.data}
                    </div>
                    <div className="flex justify-center items-center min-h-[50px] my-2">
                      {item.dataUrl ? (
                        <img
                          src={item.dataUrl}
                          alt={item.data}
                          className="max-w-full h-auto"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">No barcode image</span>
                      )}
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="text-xs font-semibold truncate" title={item.productName}>
                        {item.productName}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        SKU: {item.productCode}
                      </div>
                      {item.quantity > 1 && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">
                          Qty: {item.quantity} labels
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {totalLabels > 0 && `${totalLabels} label(s) will be printed`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            <Button
              onClick={handlePrint}
              disabled={isLoading || !_data?.barcodes?.length}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Labels ({totalLabels})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
