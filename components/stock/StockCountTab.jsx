"use client";

import React, { useState, useRef, useMemo } from "react";
import { useScanBarcode } from "@/lib/hooks/usePacketStock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2, ScanLine } from "lucide-react";
import { toast } from "react-hot-toast";

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

export default function StockCountTab() {
  const [stockCountList, setStockCountList] = useState([]);
  const [scanQuery, setScanQuery] = useState("");
  const scanInputRef = useRef(null);
  const scanBarcodeMutation = useScanBarcode();

  const handleStockCountScan = async (e) => {
    e.preventDefault();
    const barcode = scanQuery.trim();
    if (!barcode) return;

    try {
      const result = await scanBarcodeMutation.mutateAsync(barcode);
      const scannedItem = result.data?.data || result.data || result;

      setStockCountList((prev) => [
        {
          id: Date.now(),
          scannedAt: new Date(),
          barcode,
          item: scannedItem,
        },
        ...prev,
      ]);

      setScanQuery("");
      toast.success("Item added");

      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
    } catch {
      setScanQuery("");
    }
  };

  const removeStockCountItem = (id) => {
    setStockCountList((prev) => prev.filter((item) => item.id !== id));
  };

  const stockCountSummary = useMemo(() => {
    let totalItems = 0;
    let totalValue = 0;

    stockCountList.forEach((entry) => {
      const item = entry.item;
      if (!item.isLoose) {
        totalItems += item.totalItemsPerPacket || 1;
        totalValue += item.suggestedSellingPrice || 0;
      } else {
        totalItems += 1;
        totalValue += item.suggestedSellingPrice || item.product?.price || 0;
      }
    });

    return { totalItems, totalValue, scanCount: stockCountList.length };
  }, [stockCountList]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Scanned Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {currency(stockCountSummary.totalValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Items (Qty)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatNumber(stockCountSummary.totalItems)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scanned Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatNumber(stockCountSummary.scanCount)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scanner Input */}
      <Card className="p-4 bg-muted/30 border-dashed">
        <form onSubmit={handleStockCountScan} className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="stock-scan" className="text-base font-semibold mb-2 block">
              Scan Barcode
            </Label>
            <div className="relative">
              <ScanLine className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              <Input
                id="stock-scan"
                ref={scanInputRef}
                placeholder="Scan or type barcode and press Enter..."
                value={scanQuery}
                onChange={(e) => setScanQuery(e.target.value)}
                className="pl-10 h-10 text-lg md:text-xl font-mono"
                autoComplete="off"
                autoFocus
              />
            </div>
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-10 px-8"
            disabled={scanBarcodeMutation.isPending}
          >
            {scanBarcodeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wait...
              </>
            ) : (
              "Add"
            )}
          </Button>
        </form>
      </Card>

      {/* Scanned Items Table */}
      <div className="rounded-md border bg-card">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm text-left">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Time</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Barcode</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Product</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Type</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Composition</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Value</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Action</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {stockCountList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-24 text-center text-muted-foreground">
                    No items scanned yet. Start scanning to count stock.
                  </td>
                </tr>
              ) : (
                stockCountList.map((entry) => {
                  const item = entry.item;
                  return (
                    <tr
                      key={entry.id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="p-4 align-middle font-mono text-xs text-muted-foreground">
                        {entry.scannedAt.toLocaleTimeString()}
                      </td>
                      <td className="p-4 align-middle font-mono font-medium">
                        {entry.barcode}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="font-medium">
                          {item.product?.name || "Unknown Product"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.product?.sku}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <Badge variant={item.isLoose ? "secondary" : "default"}>
                          {item.isLoose ? "Loose" : "Packet"}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="text-xs">
                          {(item.composition || []).slice(0, 2).map((c, i) => (
                            <span
                              key={i}
                              className="mr-1 inline-block bg-slate-100 px-1 rounded"
                            >
                              {c.color}/{c.size}
                            </span>
                          ))}
                          {item.composition?.length > 2 && "..."}
                        </div>
                      </td>
                      <td className="p-4 align-middle text-right font-medium">
                        {currency(item.suggestedSellingPrice || 0)}
                      </td>
                      <td className="p-4 align-middle text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeStockCountItem(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
