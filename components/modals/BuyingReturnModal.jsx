"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Trash2, Search } from "lucide-react";
import { returnsAPI } from "@/lib/api/endpoints/returns";
import { dispatchOrdersAPI } from "@/lib/api/endpoints/dispatchOrders";
import { useCreateProductReturn } from "@/lib/hooks/useReturns";
import toast from "react-hot-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function BuyingReturnModal({ open, onClose, onSuccess }) {
  // Universal search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  
  // Selected items and form states
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState(null);

  const createReturnMutation = useCreateProductReturn();

  // Debounced universal search
  useEffect(() => {
    if (!open) return;
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      try {
        setLoadingSearch(true);
        const response = await returnsAPI.universalSearch(searchQuery.trim(), 30);
        const data = response.data || {};
        
        // Combine packets and products into unified results
        const packets = (data.packets || []).map(p => ({ ...p, resultType: 'packet' }));
        const products = (data.products || []).map(p => ({ ...p, resultType: 'product' }));
        const combined = [...packets, ...products];
        
        setSearchResults(combined);
      } catch (error) {
        console.error("Error searching:", error);
        toast.error("Search failed");
        setSearchResults([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, open]);

  // Show validation error toast when validationError changes
  useEffect(() => {
    if (validationError) {
      toast.error(validationError);
      setValidationError(null); // Clear after showing
    }
  }, [validationError]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedProducts([]);
      setNotes("");
      setSearchDropdownOpen(false);
    }
  }, [open]);

  const addProductToReturn = (result) => {
    // For packet type results
    if (result.resultType === 'packet') {
      const uniqueId = `packet_${result._id}`;
      
      if (selectedProducts.some((p) => p.uniqueId === uniqueId)) {
        toast.error("Item already added");
        return;
      }

      // Extract dispatch order if available (packets may not always have DO)
      const dispatchOrderId = result.dispatchOrderId || null;
      
      if (selectedProducts.length > 0 && selectedProducts[0].dispatchOrderId !== dispatchOrderId) {
        toast.error("You can only return items from one Dispatch Order at a time.");
        return;
      }

      setSelectedProducts((prev) => [
        ...prev,
        {
          uniqueId,
          returnType: 'packet',
          packetStockId: result._id,
          barcode: result.barcode,
          productId: result.productId,
          supplierId: result.supplierId,
          supplierName: result.supplierName,
          dispatchOrderId,
          orderNumber: dispatchOrderId ? "Via Dispatch" : "Packet Stock",
          productName: result.productName,
          productCode: result.productCode,
          currentStock: result.availablePackets,
          costPrice: result.isLoose ? result.pricePerItem : result.costPricePerPacket,
          isLoose: result.isLoose,
          totalItemsPerPacket: result.totalItemsPerPacket,
          quantity: 1,
          reason: "",
        },
      ]);
    } 
    // For product type results
    else if (result.resultType === 'product') {
      // For product returns, we need to handle batches
      // We'll use the first available batch for simplicity
      const batch = result.batches && result.batches.length > 0 ? result.batches[0] : null;
      
      if (!batch) {
        toast.error("No available batches for this product");
        return;
      }

      const uniqueId = `product_${result.productId}_${batch.batchId || 'default'}`;
      
      if (selectedProducts.some((p) => p.uniqueId === uniqueId)) {
        toast.error("Item already added");
        return;
      }

      const dispatchOrderId = batch.dispatchOrderId || null;
      
      if (selectedProducts.length > 0 && selectedProducts[0].dispatchOrderId !== dispatchOrderId) {
        toast.error("You can only return items from one Dispatch Order at a time.");
        return;
      }

      setSelectedProducts((prev) => [
        ...prev,
        {
          uniqueId,
          returnType: 'product',
          productId: result.productId,
          batchId: batch.batchId,
          supplierId: result.supplierId,
          supplierName: result.supplierName,
          dispatchOrderId,
          orderNumber: batch.orderNumber || "Manual Entry",
          productName: result.productName,
          productCode: result.productCode,
          currentStock: batch.remainingQuantity || result.availableStock,
          costPrice: batch.costPrice || result.averageCostPrice || 0,
          quantity: 1,
          reason: "",
        },
      ]);
    }

    setSearchQuery("");
    setSearchDropdownOpen(false);
  };

  const updateProduct = (uniqueId, field, value, allowZero = false) => {
    // Validate BEFORE updating state to avoid calling toast during render
    if (field === "quantity") {
      const numValue = Number(value);

      // Validate using current state (read, don't update yet)
      const product = selectedProducts.find((p) => p.uniqueId === uniqueId);

      if (product) {
        if (numValue > product.currentStock) {
          // Set validation error state instead of calling toast directly
          setValidationError(
            `Maximum ${product.currentStock} available in this batch`
          );
          return; // Don't update if invalid
        }
        // Allow 0 temporarily if allowZero is true (for when user is clearing the field)
        if (numValue < 1 && !allowZero) {
          return; // Don't update if invalid
        }
      }
    }

    // Update state only if validation passes (or for non-quantity fields)
    setSelectedProducts((prev) =>
      prev.map((p) => {
        if (p.uniqueId !== uniqueId) return p;
        return { ...p, [field]: value };
      })
    );
  };

  const removeProduct = (uniqueId) => {
    setSelectedProducts((prev) => prev.filter((p) => p.uniqueId !== uniqueId));
  };

  const calculateTotal = () => {
    return selectedProducts.reduce(
      (sum, p) => sum + p.quantity * p.costPrice,
      0
    );
  };

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    // Extract supplierId from first selected product
    const supplierId = selectedProducts[0]?.supplierId;
    
    if (!supplierId) {
      toast.error("Invalid supplier information");
      return;
    }

    try {
      // Check if we have a dispatch order ID (should be present for all items since we enforce single DO)
      const dispatchOrderId = selectedProducts[0]?.dispatchOrderId;

      if (dispatchOrderId) {
        // Use the unified dispatch order return route
        const payload = {
          returnedItems: selectedProducts.map((p) => ({
            productId: p.productId,
            batchId: p.batchId,
            quantity: p.quantity,
            reason: p.reason || "",
          })),
          notes: notes || `Product return - ${selectedProducts.length} item(s)`,
        };

        await dispatchOrdersAPI.returnItems(dispatchOrderId, payload);
      } else {
        // Fallback to product-level return if no dispatch order ID (legacy/manual data without DO)
        const payload = {
          supplierId: supplierId,
          items: selectedProducts.map((p) => ({
            productId: p.productId,
            batchId: p.batchId,
            quantity: p.quantity,
            reason: p.reason || "",
          })),
          returnDate: new Date().toISOString(),
          cashRefund: 0,
          accountCredit: calculateTotal(),
          notes: notes || `Product return - ${selectedProducts.length} item(s)`,
        };

        await createReturnMutation.mutateAsync(payload);
      }

      toast.success("Return created successfully");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating return:", error);
      toast.error(error.response?.data?.message || "Failed to create return");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[1100px] w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-6 w-6" />
            Create Buying Return
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Universal Search - Search by supplier, product name, SKU, code, or barcode */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Search Products to Return</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by supplier name, product name, SKU, code, or barcode..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim().length >= 2) {
                    setSearchDropdownOpen(true);
                  }
                }}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) {
                    setSearchDropdownOpen(true);
                  }
                }}
                className="pl-9 h-11"
              />
              {loadingSearch && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              )}

              {/* Search results dropdown */}
              {searchDropdownOpen && searchQuery.trim().length >= 2 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border rounded-md shadow-lg">
                  <ScrollArea className="max-h-[350px]">
                    {loadingSearch ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                        Searching...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        No products found matching "{searchQuery}"
                      </div>
                    ) : (
                      <div className="py-1">
                        {searchResults.map((result) => (
                          <button
                            key={result._id}
                            type="button"
                            onClick={() => addProductToReturn(result)}
                            className="w-full px-3 py-2.5 text-left hover:bg-accent transition-colors border-b last:border-b-0"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {result.productName}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {result.productCode && (
                                    <span>Code: {result.productCode}</span>
                                  )}
                                  {result.barcode && (
                                    <span className="ml-2">
                                      Barcode: {result.barcode}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  Supplier: <span className="font-medium">{result.supplierName}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <Badge variant="outline" className="text-[10px]">
                                  {result.resultType === 'packet' ? 'PACKET' : 'PRODUCT'}
                                </Badge>
                                <div className="text-xs text-muted-foreground">
                                  Stock: {result.availablePackets || result.availableStock || 0}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>
            
            {/* Click outside to close */}
            {searchDropdownOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSearchDropdownOpen(false)}
              />
            )}

            {/* Info message when items are selected */}
            {selectedProducts.length > 0 && selectedProducts[0].dispatchOrderId && (
              <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                ★ Restricted to Order: <strong>{selectedProducts[0].orderNumber}</strong> — 
                Clear table to select from a different order
              </p>
            )}
            
            {selectedProducts.length > 0 && selectedProducts[0].supplierName && (
              <p className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
                Supplier: <strong>{selectedProducts[0].supplierName}</strong>
              </p>
            )}
          </div>

          {/* Selected Products Table */}
          {selectedProducts.length > 0 && (
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/80">
                  <tr>
                    <th className="text-left p-3 font-semibold">Product</th>
                    <th className="text-right p-3 font-semibold w-24">
                      Available
                    </th>
                    <th className="text-right p-3 font-semibold w-28">
                      Return Qty
                    </th>
                    <th className="text-right p-3 font-semibold w-24">Cost</th>
                    <th className="text-right p-3 font-semibold w-28">Total</th>
                    <th className="text-center p-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.map((product) => (
                    <tr
                      key={product.uniqueId}
                      className="border-t hover:bg-muted/30"
                    >
                      <td className="p-3">
                        <div>
                          <div className="font-medium">
                            {product.productName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {product.productCode}
                            {product.barcode && (
                              <span className="ml-2">• Barcode: {product.barcode}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {product.currentStock}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Input
                          type="text"
                          inputMode="numeric"
                          min="1"
                          max={product.currentStock}
                          value={product.quantity === 0 ? "" : product.quantity}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow empty string temporarily while user is typing
                            if (value === "") {
                              updateProduct(
                                product.uniqueId,
                                "quantity",
                                0,
                                true // Allow 0 temporarily
                              );
                              return;
                            }
                            // Only allow numeric characters
                            const sanitized = value.replace(/[^0-9]/g, "");
                            if (sanitized === "") {
                              updateProduct(
                                product.uniqueId,
                                "quantity",
                                0,
                                true // Allow 0 temporarily
                              );
                              return;
                            }
                            const numValue = Number(sanitized);
                            updateProduct(
                              product.uniqueId,
                              "quantity",
                              numValue,
                              false // Validate normally for typed numbers
                            );
                          }}
                          onBlur={(e) => {
                            const value = e.target.value;
                            const numValue = Number(value.replace(/[^0-9]/g, ""));
                            // If empty or invalid, set to 1
                            if (!value || isNaN(numValue) || numValue < 1) {
                              updateProduct(
                                product.uniqueId,
                                "quantity",
                                1,
                                false // Don't allow 0 on blur
                              );
                            }
                            // Validation for max is already handled in updateProduct
                          }}
                          className="h-9 text-right w-full"
                        />
                      </td>
                      <td className="p-3 text-right font-medium tabular-nums">
                        {product.costPrice?.toFixed(2) || "0.00"}
                      </td>
                      <td className="p-3 text-right font-semibold tabular-nums text-green-700">
                        {(product.quantity * product.costPrice).toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeProduct(product.uniqueId)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/50">
                    <td
                      colSpan={4}
                      className="p-3 text-right font-semibold text-base"
                    >
                      Total Return Value:
                    </td>
                    <td className="p-3 text-right text-xl font-bold text-green-700 tabular-nums">
                      {calculateTotal().toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-medium">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this return..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Info message */}
          {selectedProducts.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> The return value of{" "}
                <strong>{calculateTotal().toFixed(2)}</strong> will be credited
                to the supplier's account.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={createReturnMutation.isPending}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              createReturnMutation.isPending || selectedProducts.length === 0
            }
            className="px-6 bg-rose-600 hover:bg-rose-700"
          >
            {createReturnMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Create Return
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
