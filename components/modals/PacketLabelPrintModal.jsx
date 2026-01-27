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
import { packetStockAPI } from "@/lib/api/endpoints/packetStock";

export default function PacketLabelPrintModal({ open, onClose, packetId, packet }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["barcode-label", packetId],
    queryFn: async () => {
      const response = await packetStockAPI.getBarcodeLabel(packetId);
      console.log("[PacketLabelPrintModal] API Response:", response);
      // Extract nested data: axios returns { data: { success, data: {...} } }
      const labelData = response.data?.data || response.data;
      console.log("[PacketLabelPrintModal] Label data:", labelData);
      return labelData;
    },
    enabled: open && !!packetId,
  });

  const compositionText = (data?.composition || packet?.composition || [])
    .map(c => `${c.color}/${c.size} × ${c.quantity}`)
    .join(", ") || "—";

  const handlePrint = () => {
    if (!data) return;

    const printWindow = window.open("", "_blank", "width=450,height=500");
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
        <title>Barcode: ${data.barcode}</title>
        <style>
          @page {
            size: 80mm 50mm;
            margin: 2mm;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 10px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: white;
          }
          
          .label-container {
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 15px;
            width: 280px;
            text-align: center;
          }
          
          .product-name {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          .product-code {
            font-size: 11px;
            color: #666;
            margin-bottom: 8px;
            font-family: 'Courier New', monospace;
          }
          
          .barcode-image {
            margin: 10px 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 60px;
          }
          
          .barcode-image img {
            max-width: 100%;
            height: auto;
          }
          
          .barcode-number {
            font-size: 16px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            letter-spacing: 2px;
            color: #000;
            margin: 8px 0;
          }
          
          .composition {
            font-size: 10px;
            color: #666;
            margin-bottom: 8px;
          }
          
          .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          
          .badge-packet {
            background: #e3f2fd;
            color: #1976d2;
          }
          
          .badge-loose {
            background: #fff3e0;
            color: #f57c00;
          }
          
          .price {
            font-size: 18px;
            font-weight: bold;
            color: #2e7d32;
          }
          
          @media print {
            body {
              padding: 0;
              min-height: auto;
            }
            
            .label-container {
              border: 1px solid #000;
            }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="product-name">${data.productName || "Unknown Product"}</div>
          <div class="product-code">SKU: ${data.productCode || "N/A"}</div>
          ${data.barcodeImage ? `<div class="barcode-image"><img src="${data.barcodeImage}" alt="Barcode" /></div>` : ''}
          <div class="barcode-number">${data.barcode}</div>
          <div class="composition">${compositionText}</div>
          <span class="badge ${data.isLoose ? 'badge-loose' : 'badge-packet'}">${data.isLoose ? 'LOOSE' : 'PACKET'}</span>
          <div class="price">£${(data.suggestedSellingPrice || 0).toFixed(2)}</div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Print Barcode Label</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            <p className="font-medium">Failed to load barcode</p>
            <p className="text-sm mt-1">{error.message || "Please try again"}</p>
          </div>
        ) : data ? (
          <div className="border-2 border-gray-300 rounded-lg p-4 text-center bg-white">
            <div className="font-semibold text-sm mb-1 truncate" title={data.productName}>
              {data.productName || "Unknown Product"}
            </div>
            <div className="text-xs text-muted-foreground font-mono mb-3">
              SKU: {data.productCode || "N/A"}
            </div>
            
            {data.barcodeImage && (
              <div className="flex justify-center items-center min-h-[60px] my-3">
                <img 
                  src={data.barcodeImage} 
                  alt={data.barcode}
                  className="max-w-full h-auto"
                />
              </div>
            )}
            
            <div className="font-mono font-bold text-lg tracking-wider mb-2">
              {data.barcode}
            </div>
            
            <div className="text-xs text-muted-foreground mb-2">
              {compositionText}
            </div>
            
            <Badge 
              variant={data.isLoose ? "secondary" : "default"}
              className="mb-2"
            >
              {data.isLoose ? "LOOSE" : "PACKET"}
            </Badge>
            
            <div className="text-lg font-bold text-green-700">
              £{(data.suggestedSellingPrice || 0).toFixed(2)}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button 
            onClick={handlePrint} 
            disabled={isLoading || !data}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
