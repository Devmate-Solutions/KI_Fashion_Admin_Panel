"use client";

import { useState, useRef } from "react";
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
      generatedAt: item.generatedAt,
    })),
  };
};

export default function BarcodePrintModal({ open, onClose, dispatchOrderId }) {
  const printRef = useRef(null);

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

  const _data = data?.data

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent || !_data) return;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      alert("Please allow popups for printing");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Barcodes - Order ${_data?.orderNumber || ""}</title>
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 15px;
            background: white;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #333;
          }
          
          .print-header h1 {
            margin: 0 0 5px 0;
            font-size: 20px;
            color: #333;
          }
          
          .print-header p {
            margin: 0;
            color: #666;
            font-size: 12px;
          }
          
          .barcode-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }
          
          .barcode-item {
            background: white;
            border: 2px solid #333;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
            page-break-inside: avoid;
          }
          
          .barcode-number {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            margin-bottom: 8px;
            font-family: 'Courier New', monospace;
            letter-spacing: 1px;
          }
          
          .barcode-image {
            margin: 8px 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 50px;
          }
          
          .barcode-image img {
            max-width: 100%;
            height: auto;
          }
          
          .product-info {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #ddd;
          }
          
          .product-name {
            font-size: 11px;
            font-weight: 600;
            color: #333;
            margin-bottom: 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          .product-code {
            font-size: 10px;
            color: #666;
            font-family: 'Courier New', monospace;
          }
          
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 600;
            margin-top: 4px;
          }
          
          .badge-packet {
            background: #e3f2fd;
            color: #1976d2;
          }
          
          .badge-loose {
            background: #fff3e0;
            color: #f57c00;
          }
          
          @media print {
            body {
              padding: 0;
            }
            
            .barcode-item {
              border-width: 1px;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>Barcode Labels</h1>
          <p>Order: ${_data?.orderNumber || "N/A"} | Supplier: ${_data?.supplierName || "N/A"} | Total Labels: ${_data?.barcodes?.length || 0}</p>
        </div>
        
        <div class="barcode-grid">
          ${(_data?.barcodes || []).map(item => `
            <div class="barcode-item">
              <div class="barcode-number">${item.data || item.barcodeNumber}</div>
              <div class="barcode-image">
                <img src="${item.dataUrl || item.barcodeImage}" alt="${item.data || item.barcodeNumber}" />
              </div>
              <div class="product-info">
                <div class="product-name">${item.productName}</div>
                <div class="product-code">SKU: ${item.productCode}</div>
                <span class="badge ${item.isLoose ? 'badge-loose' : 'badge-packet'}">
                  ${item.isLoose ? 'LOOSE' : 'PACKET'}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    
    // Wait for images to load then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

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
                  Supplier: {_data.supplierName} | Total Labels: {_data.barcodes.length}
                </p>
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
                      {/* <Badge 
                        variant={item.isLoose ? "secondary" : "default"}
                        className="mt-1 text-[10px]"
                      >
                        {item.isLoose ? "LOOSE" : "PACKET"}
                      </Badge> */}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button 
            onClick={handlePrint} 
            disabled={isLoading || !_data?.barcodes?.length}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Labels
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
