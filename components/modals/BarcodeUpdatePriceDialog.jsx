"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useScanBarcode } from "@/lib/hooks/usePacketStock";
import { productsAPI } from "@/lib/api/endpoints/products";
import { toast } from "react-hot-toast";
import { Loader2, ScanLine, Barcode, Check, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function currency(n) {
  const num = Number(n || 0);
  return `£${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function BarcodeUpdatePriceDialog({ open, onOpenChange, onSuccess }) {
  const [barcode, setBarcode] = useState("");
  const [scannedItem, setScannedItem] = useState(null);
  const [newMinPrice, setNewMinPrice] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  
  const scanInputRef = useRef(null);
  const scanMutation = useScanBarcode();

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
      setBarcode("");
      setScannedItem(null);
      setNewMinPrice("");
    }
  }, [open]);

  const handleScan = async (e) => {
    if (e) e.preventDefault();
    const query = barcode.trim();
    if (!query) return;

    try {
      const result = await scanMutation.mutateAsync({ 
        barcode: query, 
        params: { allowEmpty: true } 
      });
      const item = result.data?.data || result.data || result;
      
      if (item && item.product) {
        setScannedItem(item);
        setNewMinPrice(item.product.pricing?.minSellingPrice ?? item.product.pricing?.sellingPrice ?? "");
        toast.success("Product identified");
      } else {
        toast.error("Product not found for this barcode");
      }
    } catch (error) {
      // Error handled by mutation toast
    }
  };

  const handleUpdate = async () => {
    if (!scannedItem?.product?._id) return;
    
    const price = Number(newMinPrice);
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      setIsUpdating(true);
      await productsAPI.updateMinSellingPrice(scannedItem.product._id, price);
      toast.success("Minimum selling price updated");
      onSuccess?.(scannedItem.product._id);
      onOpenChange(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update price");
    } finally {
      setIsUpdating(false);
    }
  };

  const resetLookup = () => {
    setScannedItem(null);
    setBarcode("");
    setNewMinPrice("");
    setTimeout(() => {
      scanInputRef.current?.focus();
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Barcode Price Update
          </DialogTitle>
          <DialogDescription>
            Scan a product barcode to update its minimum selling price.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {!scannedItem ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="barcode-input">Scan Barcode</Label>
                <form onSubmit={handleScan} className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="barcode-input"
                      ref={scanInputRef}
                      placeholder="Focus here and scan..."
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="pl-9 font-mono"
                      autoComplete="off"
                    />
                  </div>
                  <Button type="submit" disabled={scanMutation.isPending}>
                    {scanMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Lookup"
                    )}
                  </Button>
                </form>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border border-dashed flex flex-col items-center justify-center text-center gap-2 py-8">
                <ScanLine className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Ready to scan. Please ensure the cursor is in the input field above.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg">{scannedItem.product.name}</h3>
                    <p className="text-sm text-muted-foreground font-mono">
                      {scannedItem.product.productCode || scannedItem.product.sku}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-white">
                    {scannedItem.isLoose ? "Loose" : "Packet"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                  <div className="p-2 bg-white rounded border">
                    <p className="text-muted-foreground text-xs">Current Min Price</p>
                    <p className="font-semibold">{currency(scannedItem.product.pricing?.minSellingPrice ?? scannedItem.product.pricing?.sellingPrice)}</p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <p className="text-muted-foreground text-xs">Supplier</p>
                    <p className="font-semibold truncate">{scannedItem.supplier?.name || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-price">New Minimum Selling Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">£</span>
                  <Input
                    id="new-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newMinPrice}
                    onChange={(e) => setNewMinPrice(e.target.value)}
                    className="pl-7 text-lg font-semibold"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This will update the minimum selling price for all instances of this product.
                </p>
              </div>

              <Button variant="ghost" size="sm" onClick={resetLookup} className="w-full text-xs h-7">
                Scan another barcode
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={!scannedItem || isUpdating || scanMutation.isPending}
            className="gap-2"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Update Price
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
