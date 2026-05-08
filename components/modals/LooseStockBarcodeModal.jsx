"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

export default function LooseStockBarcodeModal({ open, onOpenChange, barcodes, sourcePacketBarcode }) {
  const [barcodeSvgs, setBarcodeSvgs] = useState({});
  const autoPrintedRef = useRef(false);
  const safeBarcodes = useMemo(() => (Array.isArray(barcodes) ? barcodes.filter(Boolean) : []), [barcodes]);

  useEffect(() => {
    if (!open || safeBarcodes.length === 0) {
      setBarcodeSvgs({});
      autoPrintedRef.current = false;
      return;
    }

    if (!window.JsBarcode) {
      setBarcodeSvgs({});
      return;
    }

    const svgMap = {};
    safeBarcodes.forEach((value) => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      try {
        window.JsBarcode(svg, value, {
          displayValue: true,
          height: 40,
          fontSize: 12,
          margin: 0,
        });
        svgMap[value] = svg.outerHTML;
      } catch (error) {
        svgMap[value] = "";
      }
    });
    setBarcodeSvgs(svgMap);
  }, [open, safeBarcodes]);

  const buildPrintHtml = () => {
    const labelBlocks = safeBarcodes.map((value) => {
      const svgMarkup = barcodeSvgs[value] || "";
      const labelContent = svgMarkup
        ? `<div class="barcode">${svgMarkup}</div>`
        : `<div class="barcode-text">${value}</div>`;

      return `
        <div class="label">
          <div class="title">Loose Stock Barcode</div>
          ${sourcePacketBarcode ? `<div class="packet-ref">From packet: ${sourcePacketBarcode}</div>` : ""}
          ${labelContent}
        </div>
      `;
    }).join("");

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Loose Stock Barcode</title>
        <style>
          @page { size: auto; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; background: white; }
          .label {
            width: 100%;
            min-height: 25mm;
            padding: 2mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          .title {
            font-size: 8pt;
            font-weight: 700;
            margin-bottom: 1mm;
          }
          .packet-ref {
            font-size: 7pt;
            margin-bottom: 1mm;
            color: #333;
          }
          .barcode-text {
            font-size: 12pt;
            font-weight: 700;
            letter-spacing: 1px;
          }
          .barcode svg { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        ${labelBlocks}
      </body>
      </html>
    `;
  };

  const handlePrint = () => {
    if (safeBarcodes.length === 0) return;

    const printWindow = window.open("", "_blank", "width=450,height=500");
    if (!printWindow) {
      alert("Please allow popups for printing");
      return;
    }

    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  useEffect(() => {
    if (!open || safeBarcodes.length === 0 || autoPrintedRef.current) return;
    autoPrintedRef.current = true;
    setTimeout(() => {
      handlePrint();
    }, 200);
  }, [open, safeBarcodes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Loose Stock Barcode</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Tag the hanger with this barcode for the remaining loose items.
          </div>
          {safeBarcodes.map((value, index) => (
            <div key={`${value}-${index}`} className="rounded border bg-white p-3 text-center">
              <div className="text-xs font-semibold text-muted-foreground">New LSE Barcode</div>
              <div className="text-lg font-bold tracking-wider mt-1">{value}</div>
              {barcodeSvgs[value] && (
                <div
                  className="flex justify-center mt-2"
                  dangerouslySetInnerHTML={{ __html: barcodeSvgs[value] }}
                />
              )}
            </div>
          ))}
          {sourcePacketBarcode && (
            <div className="text-xs text-muted-foreground">
              From packet: <span className="font-mono">{sourcePacketBarcode}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button onClick={handlePrint} disabled={safeBarcodes.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
