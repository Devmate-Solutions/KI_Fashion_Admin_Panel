"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Scissors,
  Package,
  ShoppingCart,
  ArrowRight,
  Loader2,
  Info,
  AlertTriangle,
} from "lucide-react";
import { useBreakPacket } from "@/lib/hooks/usePacketStock";

function formatCurrency(value) {
  return `£${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function BreakPacketDialog({
  open,
  onOpenChange,
  packetStock: packetStockProp,
  packet: packetProp, // Alternative prop name for flexibility
  mode = "inventory", // 'inventory' or 'sale'
  onSuccess,
}) {
  // Support both prop names
  const packetStock = packetStockProp || packetProp;
  // State for quantity selections per composition item
  const [sellQuantities, setSellQuantities] = useState({});
  const [notes, setNotes] = useState("");

  const breakPacketMutation = useBreakPacket();

  // Initialize sell quantities when packet changes
  useEffect(() => {
    if (packetStock?.composition) {
      const initial = {};
      packetStock.composition.forEach((comp) => {
        const key = `${comp.size}-${comp.color}`;
        initial[key] = 0;
      });
      setSellQuantities(initial);
    }
  }, [packetStock]);

  // Calculate totals
  const calculations = useMemo(() => {
    if (!packetStock?.composition) {
      return {
        totalInPacket: 0,
        totalToSell: 0,
        totalRemaining: 0,
        itemsToSell: [],
        remainingItems: [],
        pricePerItem: 0,
        soldValue: 0,
        remainingValue: 0,
      };
    }

    const totalInPacket = packetStock.totalItemsPerPacket || 0;
    // Support both landedPricePerPacket (inventory) and suggestedSellingPrice (sale)
    const packetPrice = packetStock.landedPricePerPacket || packetStock.suggestedSellingPrice || 0;
    const pricePerItem =
      totalInPacket > 0
        ? packetPrice / totalInPacket
        : 0;

    let totalToSell = 0;
    const itemsToSell = [];
    const remainingItems = [];

    packetStock.composition.forEach((comp) => {
      const key = `${comp.size}-${comp.color}`;
      const sellQty = sellQuantities[key] || 0;
      const remainQty = comp.quantity - sellQty;

      totalToSell += sellQty;

      if (sellQty > 0) {
        itemsToSell.push({
          size: comp.size,
          color: comp.color,
          quantity: sellQty,
        });
      }

      if (remainQty > 0) {
        remainingItems.push({
          size: comp.size,
          color: comp.color,
          quantity: remainQty,
        });
      }
    });

    const totalRemaining = totalInPacket - totalToSell;
    const soldValue = pricePerItem * totalToSell;
    const remainingValue = pricePerItem * totalRemaining;

    return {
      totalInPacket,
      totalToSell,
      totalRemaining,
      itemsToSell,
      remainingItems,
      pricePerItem,
      soldValue,
      remainingValue,
    };
  }, [packetStock, sellQuantities]);

  const handleQuantityChange = (key, value, maxValue) => {
    const numValue = Math.max(0, Math.min(parseInt(value) || 0, maxValue));
    setSellQuantities((prev) => ({
      ...prev,
      [key]: numValue,
    }));
  };

  const handleBreakPacket = async () => {
    try {
      const result = await breakPacketMutation.mutateAsync({
        packetStockId: packetStock._id,
        itemsToSell: calculations.itemsToSell,
        notes,
        mode,
      });

      onSuccess?.(result.data?.data);
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setSellQuantities({});
    setNotes("");
    onOpenChange(false);
  };

  if (!packetStock) return null;

  const actualAvailable =
    (packetStock.availablePackets || 0) - (packetStock.reservedPackets || 0);
  const canBreak = actualAvailable > 0;
  const hasSelection = calculations.totalToSell > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-orange-500" />
            Break Packet
          </DialogTitle>
          <DialogDescription>
            Select items to sell individually. Remaining items will be tracked
            as loose stock.
          </DialogDescription>
        </DialogHeader>

        {/* Packet Info */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-mono font-bold text-lg">
                {packetStock.barcode}
              </div>
              <div className="text-sm text-muted-foreground">
                {packetStock.product?.name || "Unknown Product"}
              </div>
            </div>
            <Badge variant="default">
              <Package className="h-3 w-3 mr-1" />
              {actualAvailable} available
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {packetStock.totalItemsPerPacket} items per packet •{" "}
            {formatCurrency(packetStock.landedPricePerPacket || packetStock.suggestedSellingPrice)} per packet •{" "}
            {formatCurrency(calculations.pricePerItem)} per item
          </div>
        </div>

        {!canBreak && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No packets available to break. All packets are either sold or
              reserved.
            </AlertDescription>
          </Alert>
        )}

        {canBreak && (
          <>
            {/* Selection Table */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Select items to sell from this packet:
              </Label>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Color</th>
                      <th className="px-3 py-2 text-left font-medium">Size</th>
                      <th className="px-3 py-2 text-center font-medium">
                        In Packet
                      </th>
                      <th className="px-3 py-2 text-center font-medium">
                        <span className="flex items-center justify-center gap-1">
                          <ShoppingCart className="h-3 w-3" />
                          Sell
                        </span>
                      </th>
                      <th className="px-3 py-2 text-center font-medium">
                        Remaining
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {packetStock.composition?.map((comp, idx) => {
                      const key = `${comp.size}-${comp.color}`;
                      const sellQty = sellQuantities[key] || 0;
                      const remainQty = comp.quantity - sellQty;

                      return (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">
                            <Badge variant="outline">{comp.color}</Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary">{comp.size}</Badge>
                          </td>
                          <td className="px-3 py-2 text-center tabular-nums font-medium">
                            {comp.quantity}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() =>
                                  handleQuantityChange(
                                    key,
                                    sellQty - 1,
                                    comp.quantity
                                  )
                                }
                                disabled={sellQty <= 0}
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                min={0}
                                max={comp.quantity}
                                value={sellQty}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    key,
                                    e.target.value,
                                    comp.quantity
                                  )
                                }
                                className="w-14 h-7 text-center p-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() =>
                                  handleQuantityChange(
                                    key,
                                    sellQty + 1,
                                    comp.quantity
                                  )
                                }
                                disabled={sellQty >= comp.quantity}
                              >
                                +
                              </Button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center tabular-nums">
                            <span
                              className={
                                remainQty > 0
                                  ? "text-amber-600 font-medium"
                                  : "text-muted-foreground"
                              }
                            >
                              {remainQty}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              {/* Items to Sell */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">
                    Items to Sell
                  </span>
                </div>
                {calculations.itemsToSell.length > 0 ? (
                  <div className="space-y-1">
                    {calculations.itemsToSell.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-sm flex justify-between text-green-700"
                      >
                        <span>
                          {item.color}/{item.size}
                        </span>
                        <span>×{item.quantity}</span>
                      </div>
                    ))}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-medium text-green-800">
                      <span>Total</span>
                      <span>{calculations.totalToSell} items</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Value</span>
                      <span>{formatCurrency(calculations.soldValue)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-green-600">
                    No items selected to sell
                  </div>
                )}
              </div>

              {/* Remaining Items (Loose Stock) */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800">
                    Loose Stock ({calculations.remainingItems.length} variant{calculations.remainingItems.length !== 1 ? 's' : ''})
                  </span>
                </div>
                {calculations.remainingItems.length > 0 ? (
                  <div className="space-y-1">
                    {calculations.remainingItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-sm flex justify-between text-amber-700"
                      >
                        <span className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs px-1 py-0 h-4">LSE</Badge>
                          {item.color}/{item.size}
                        </span>
                        <span>×{item.quantity}</span>
                      </div>
                    ))}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-medium text-amber-800">
                      <span>Total</span>
                      <span>{calculations.totalRemaining} items</span>
                    </div>
                    <div className="flex justify-between text-sm text-amber-600">
                      <span>Value</span>
                      <span>{formatCurrency(calculations.remainingValue)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-amber-600">
                    All items will be sold (no loose stock created)
                  </div>
                )}
              </div>
            </div>

            {/* Info Alert */}
            {calculations.remainingItems.length > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Remaining {calculations.totalRemaining} items will be split into{" "}
                  <strong>{calculations.remainingItems.length} separate loose stock entries</strong>{" "}
                  (one per size/color variant) with barcode prefix{" "}
                  <code className="bg-muted px-1 rounded">LSE-</code>. Each variant can be
                  sold individually.
                </AlertDescription>
              </Alert>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="break-notes">Notes (optional)</Label>
              <Textarea
                id="break-notes"
                placeholder="Reason for breaking packet, customer details, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleBreakPacket}
            disabled={!canBreak || breakPacketMutation.isPending}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {breakPacketMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Breaking...
              </>
            ) : (
              <>
                <Scissors className="h-4 w-4 mr-2" />
                Break Packet
                {hasSelection && (
                  <ArrowRight className="h-4 w-4 ml-1" />
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
