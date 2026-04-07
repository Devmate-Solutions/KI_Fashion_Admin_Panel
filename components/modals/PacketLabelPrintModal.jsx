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
       
      // Extract nested data: axios returns { data: { success, data: {...} } }
      const labelData = response.data?.data || response.data;
       
      return labelData;
    },
    enabled: open && !!packetId,
  });

  const compositionText = (data?.composition || packet?.composition || [])
    .map(c => `${c.color}/${c.size} × ${c.quantity}`)
    .join(", ") || "—";

  const price = data?.minSellingPrice || data?.suggestedSellingPrice || 0;

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
            height: auto;
            min-height: 25mm;
            padding: 1mm 2mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          
          .header-section {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 1mm;
          }
          
          .product-code {
            font-size: 8pt;
            font-weight: 800;
            font-family: 'Courier New', monospace;
            color: #000;
            text-align: center;
            width: 100%;
            white-space: nowrap;
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
          
          .price {
            font-size: 8pt;
            font-weight: 800;
            color: #000;
            text-align: center;
            width: 100%;
            margin-top: 1mm;
          }
          
          @media print {
            body { width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="header-section">
            <div class="product-code">${data.productCode || "N/A"}</div>
            ${price > 0 ? `<div class="price">Min Sell Price: £${price.toFixed(2)}</div>` : ''}
          </div>
          <div class="composition">${compositionText}</div>
          ${data.barcodeImage ? `<div class="barcode-img"><img src="${data.barcodeImage}" alt="Barcode" /></div>` : ''}
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
          <>
            {/* Label Preview — simulates 50mm × 25mm sticker */}
            <div className="border-2 border-gray-300 rounded p-2 bg-white mx-auto" style={{ maxWidth: '280px', aspectRatio: '2 / 1' }}>
              <div className="h-full flex flex-col justify-between">
                {/* Top: Product Code + Price (Centered) */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold font-mono tracking-tighter text-center">
                    {data.productCode || "N/A"}
                  </span>
                  {price > 0 && (
                    <span className="text-[9px] font-bold text-gray-800 text-center">
                      Min Sell Price: £{price.toFixed(2)}
                    </span>
                  )}
                </div>
                
                {/* Composition — centered, wraps to 2 lines */}
                <div className="text-[9px] font-semibold text-gray-600 text-center line-clamp-2">
                  {compositionText}
                </div>
                
                {/* Barcode Image (includes barcode number) */}
                {data.barcodeImage && (
                  <div className="flex justify-center items-center flex-1 min-h-0 my-1">
                    <img 
                      src={data.barcodeImage} 
                      alt={data.barcode}
                      className="max-w-full h-auto max-h-[50px]"
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Label info */}
            <div className="text-center mt-2">
              <p className="text-[10px] text-muted-foreground">
                🖨️ Zebra ZD421 • 50mm × 25mm label
              </p>
            </div>
          </>
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
