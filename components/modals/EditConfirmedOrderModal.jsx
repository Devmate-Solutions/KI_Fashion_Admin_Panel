"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { dispatchOrdersAPI } from "@/lib/api/endpoints/dispatchOrders";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/store";
import { useSubmitEditRequest } from "@/lib/hooks/useEditRequests";
import ArrayInput from "@/components/ui/ArrayInput";
import PacketConfigurationModal from "@/components/modals/PacketConfigurationModal";

/**
 * EditConfirmedOrderModal
 *
 * Allows a super-admin to edit financial fields on a confirmed DispatchOrder:
 *   - exchangeRate, percentage, discount (order-level)
 *   - costPrice, quantity per item (quantity is floored to the sold quantity)
 *
 * On save:
 *   - Backend recalculates supplierPaymentTotal, landedPrice, grandTotal
 *   - If supplierPaymentTotal changed, a Ledger adjustment entry is created
 *   - Inventory batch prices and PacketStock histories are updated
 *
 * Props:
 *   orderId     — ID of the dispatch order to edit
 *   orderNumber — Order number for display
 *   supplierId  — Supplier ID (used to invalidate supplier ledger queries)
 *   onClose     — Called when the modal should close
 *   onSuccess   — Called with the updated order after a successful save
 */
export default function EditConfirmedOrderModal({
  orderId,
  orderNumber,
  supplierId,
  onClose,
  onSuccess,
}) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super-admin";
  const submitRequestMutation = useSubmitEditRequest();

  // Impact data loaded on open
  const [impactData, setImpactData] = useState(null);
  const [impactLoading, setImpactLoading] = useState(true);
  const [impactError, setImpactError] = useState(null);

  // Form state (mirrors impactData once loaded)
  const [exchangeRate, setExchangeRate] = useState("");
  const [percentage, setPercentage] = useState("");
  const [discount, setDiscount] = useState("");
  const [itemEdits, setItemEdits] = useState([]); // [{ costPrice, quantity }]

  // Submit state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const [reason, setReason] = useState("");
  const [packetDialogOpen, setPacketDialogOpen] = useState(false);
  const [selectedItemForPackets, setSelectedItemForPackets] = useState(null);

  const packetConfigItems = useMemo(() => {
    return (itemEdits || []).map((edit, idx) => ({
      id: String(idx),
      index: idx,
      productName: edit.productName || `Item ${idx + 1}`,
      productCode: edit.productCode || "",
      quantity: parseInt(edit.quantity) || 0,
      primaryColor: Array.isArray(edit.primaryColor) ? edit.primaryColor : [],
      size: Array.isArray(edit.size) ? edit.size : [],
      packets: Array.isArray(edit.packets) ? edit.packets : [],
      useVariantTracking: edit.useVariantTracking || false,
    }));
  }, [itemEdits]);

  // Load impact analysis when the modal opens
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    async function load() {
      setImpactLoading(true);
      setImpactError(null);
      try {
        const res = await dispatchOrdersAPI.editImpact(orderId);
        const data = res?.data?.data || res?.data || res;
        if (!cancelled) {
          setImpactData(data);
          setExchangeRate(String(data.currentExchangeRate ?? ""));
          setPercentage(String(data.currentPercentage ?? ""));
          setDiscount(String(data.currentDiscount ?? "0"));
          setItemEdits(
            (data.items || []).map((item) => ({
              costPrice: String(item.currentCostPrice ?? ""),
              quantity: String(item.orderedQuantity ?? ""),
              productName: item.productName || "",
              productCode: item.productCode || "",
              primaryColor: Array.isArray(item.primaryColor) ? item.primaryColor : [],
              size: Array.isArray(item.size) ? item.size : [],
              season: Array.isArray(item.season) ? item.season : [],
              material: item.material || "",
              description: item.description || "",
              productId: item.productId || "",
              packets: Array.isArray(item.packets) ? item.packets : [],
              useVariantTracking: item.useVariantTracking || false,
            }))
          );
        }
      } catch (err) {
        if (!cancelled) {
          setImpactError(
            err?.response?.data?.message || err.message || "Failed to load order data"
          );
        }
      } finally {
        if (!cancelled) setImpactLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  function updateItemEdit(index, field, value) {
    setItemEdits((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveResult(null);

    try {
      const payload = {
        exchangeRate: parseFloat(exchangeRate),
        percentage: parseFloat(percentage),
        discount: parseFloat(discount) || 0,
        items: itemEdits.map((edit) => ({
          costPrice: parseFloat(edit.costPrice) || 0,
          quantity: parseInt(edit.quantity) || 0,
          productName: String(edit.productName || "").trim(),
          productCode: String(edit.productCode || "").trim().toUpperCase(),
          primaryColor: Array.isArray(edit.primaryColor) ? edit.primaryColor : [],
          size: Array.isArray(edit.size) ? edit.size : [],
          season: Array.isArray(edit.season) ? edit.season : [],
          material: String(edit.material || "").trim(),
          description: String(edit.description || "").trim(),
          productId: String(edit.productId || "").trim() || undefined,
          packets: Array.isArray(edit.packets) ? edit.packets : [],
          useVariantTracking: Boolean(edit.useVariantTracking),
        })),
      };

      if (!isSuperAdmin) {
        // Submit an edit request instead of direct edit
        if (!reason.trim()) {
          setSaveError("Please provide a reason for the edit request.");
          setSaving(false);
          return;
        }

        // Build requestedChanges from diff
        const requestedChanges = {};
        if (parseFloat(exchangeRate) !== impactData.currentExchangeRate) {
          requestedChanges.exchangeRate = { from: impactData.currentExchangeRate, to: parseFloat(exchangeRate) };
        }
        if (parseFloat(percentage) !== impactData.currentPercentage) {
          requestedChanges.percentage = { from: impactData.currentPercentage, to: parseFloat(percentage) };
        }
        if ((parseFloat(discount) || 0) !== (impactData.currentDiscount || 0)) {
          requestedChanges.discount = { from: impactData.currentDiscount || 0, to: parseFloat(discount) || 0 };
        }
        payload.items.forEach((item, i) => {
          const orig = impactData.items?.[i];
          if (orig && item.costPrice !== orig.currentCostPrice) {
            requestedChanges[`items[${i}].costPrice`] = { from: orig.currentCostPrice, to: item.costPrice };
          }
          if (orig && item.quantity !== orig.orderedQuantity) {
            requestedChanges[`items[${i}].quantity`] = { from: orig.orderedQuantity, to: item.quantity };
          }
          if (orig && item.productName !== (orig.productName || "")) {
            requestedChanges[`items[${i}].productName`] = { from: orig.productName || "", to: item.productName };
          }
          if (orig && item.productCode !== (orig.productCode || "")) {
            requestedChanges[`items[${i}].productCode`] = { from: orig.productCode || "", to: item.productCode };
          }
          if (orig && JSON.stringify(item.primaryColor || []) !== JSON.stringify(orig.primaryColor || [])) {
            requestedChanges[`items[${i}].primaryColor`] = { from: orig.primaryColor || [], to: item.primaryColor || [] };
          }
          if (orig && JSON.stringify(item.size || []) !== JSON.stringify(orig.size || [])) {
            requestedChanges[`items[${i}].size`] = { from: orig.size || [], to: item.size || [] };
          }
          if (orig && JSON.stringify(item.season || []) !== JSON.stringify(orig.season || [])) {
            requestedChanges[`items[${i}].season`] = { from: orig.season || [], to: item.season || [] };
          }
          if (orig && item.material !== (orig.material || "")) {
            requestedChanges[`items[${i}].material`] = { from: orig.material || "", to: item.material };
          }
          if (orig && item.description !== (orig.description || "")) {
            requestedChanges[`items[${i}].description`] = { from: orig.description || "", to: item.description };
          }
          if (orig && item.productId !== (orig.productId || "")) {
            requestedChanges[`items[${i}].productId`] = { from: orig.productId || "", to: item.productId || "" };
          }
          if (orig && JSON.stringify(item.packets || []) !== JSON.stringify(orig.packets || [])) {
            requestedChanges[`items[${i}].packets`] = { from: orig.packets || [], to: item.packets || [] };
          }
        });

        await submitRequestMutation.mutateAsync({
          entityType: "dispatch-order",
          entityId: orderId,
          entityRef: orderNumber,
          requestType: "edit",
          requestedChanges,
          rawPayload: payload,
          reason: reason.trim(),
        });

        setSaveResult({ message: "Edit request submitted for approval of super admin." });
        if (onSuccess) onSuccess(null);
        return;
      }

      const res = await dispatchOrdersAPI.editConfirmed(orderId, payload);
      const result = res?.data?.data || res?.data || res;

      setSaveResult(result);

      // Invalidate all relevant queries
      await queryClient.invalidateQueries({ queryKey: ["dispatch-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["purchases"] });
      if (supplierId) {
        await queryClient.invalidateQueries({
          queryKey: ["unpaid-dispatch-orders", supplierId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["supplier-ledger", supplierId],
        });
      }

      if (onSuccess) onSuccess(result?.order);
    } catch (err) {
      setSaveError(
        err?.response?.data?.message || err.message || "Failed to save changes"
      );
    } finally {
      setSaving(false);
    }
  }

  const editableItems = impactData?.items || [];
  const hasSoldItems = impactData?.hasSoldItems ?? false;

  return (
    <>
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Confirmed Order — {orderNumber}</DialogTitle>
          <DialogDescription>
            {isSuperAdmin
              ? "Adjust financial fields. Changes to the supplier payment amount will automatically create a ledger adjustment entry."
              : "Review the changes you want to make. Your edit request will be sent to the Super Admin for approval."}
          </DialogDescription>
        </DialogHeader>

        {/* Loading state */}
        {impactLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
            <span className="text-sm text-muted-foreground">
              Loading order data&hellip;
            </span>
          </div>
        )}

        {/* Impact load error */}
        {impactError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {impactError}
          </div>
        )}

        {/* Main form */}
        {!impactLoading && !impactError && impactData && (
          <div className="space-y-6">
            {/* Sold items warning */}
            {hasSoldItems && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <span className="font-semibold">Some items from this order have already been sold.</span>{" "}
                  Changing the exchange rate or percentage will retroactively update the landed price on
                  sold batches, affecting historical profit calculations. Item quantities cannot be
                  reduced below their sold-quantity floor.
                </div>
              </div>
            )}

            {/* Info about ledger adjustment */}
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 flex gap-2">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                If the supplier payment total changes, a Ledger{" "}
                <span className="font-semibold">adjustment</span> entry will be created (the original
                purchase entry is never modified). Current supplier payment total:{" "}
                <span className="font-semibold">
                  €{Number(impactData.currentSupplierPaymentTotal || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Order-level fields */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="exchange-rate">Exchange Rate</Label>
                <Input
                  id="exchange-rate"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="e.g. 1.18"
                />
                <p className="text-xs text-muted-foreground">
                  Affects landed price only — no ledger change
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="percentage">Margin %</Label>
                <Input
                  id="percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  placeholder="e.g. 15"
                />
                <p className="text-xs text-muted-foreground">
                  Affects landed price only — no ledger change
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="discount">Discount (€)</Label>
                <Input
                  id="discount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="e.g. 50"
                />
                <p className="text-xs text-muted-foreground">
                  Deducted from supplier payment — ledger adjustment created
                </p>
              </div>
            </div>

            {/* Per-item edits */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Items</h3>
              <div className="space-y-3">
                {editableItems.map((item, index) => {
                  const edit = itemEdits[index] || {};
                  const soldQty = item.soldQuantity || 0;
                  const configLocked = soldQty > 0;
                  const isFlooredQty =
                    edit.quantity !== "" &&
                    parseInt(edit.quantity) <= soldQty &&
                    soldQty > 0;

                  return (
                    <div
                      key={index}
                      className="rounded-lg border bg-muted/30 p-3 space-y-3"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">
                          {item.productName || item.productCode || `Item ${index + 1}`}
                        </span>
                        {item.productCode && (
                          <span className="text-xs text-muted-foreground">
                            {item.productCode}
                          </span>
                        )}
                        {soldQty > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                          >
                            {soldQty} sold
                          </Badge>
                        )}
                        {item.remainingQuantity > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                          >
                            {item.remainingQuantity} in stock
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Product Name</Label>
                          <Input
                            value={edit.productName ?? ""}
                            onChange={(e) => updateItemEdit(index, "productName", e.target.value)}
                            disabled={configLocked}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Product Code</Label>
                          <Input
                            value={edit.productCode ?? ""}
                            onChange={(e) => updateItemEdit(index, "productCode", e.target.value.toUpperCase())}
                            disabled={configLocked}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            Cost Price (€){" "}
                            <span className="text-muted-foreground font-normal">
                              — changes supplier payment &amp; landed price
                            </span>
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={edit.costPrice ?? ""}
                            onChange={(e) =>
                              updateItemEdit(index, "costPrice", e.target.value)
                            }
                            placeholder={String(item.currentCostPrice ?? "")}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            Quantity{" "}
                            {soldQty > 0 && (
                              <span className="text-amber-600 font-normal">
                                (min {soldQty})
                              </span>
                            )}
                          </Label>
                          <Input
                            type="number"
                            step="1"
                            min={soldQty}
                            value={edit.quantity ?? ""}
                            onChange={(e) =>
                              updateItemEdit(index, "quantity", e.target.value)
                            }
                            className={
                              isFlooredQty
                                ? "border-amber-400 focus-visible:ring-amber-400"
                                : ""
                            }
                          />
                          {soldQty > 0 && (
                            <p className="text-xs text-amber-600">
                              Cannot set below {soldQty} (sold units)
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Colors</Label>
                          <ArrayInput
                            value={Array.isArray(edit.primaryColor) ? edit.primaryColor : []}
                            onChange={(colors) => updateItemEdit(index, "primaryColor", colors)}
                            placeholder="Enter color..."
                            disabled={configLocked}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Sizes</Label>
                          <ArrayInput
                            value={Array.isArray(edit.size) ? edit.size : []}
                            onChange={(sizes) => updateItemEdit(index, "size", sizes)}
                            placeholder="Enter size..."
                            disabled={configLocked}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Seasons</Label>
                          <ArrayInput
                            value={Array.isArray(edit.season) ? edit.season : []}
                            onChange={(seasons) => updateItemEdit(index, "season", seasons)}
                            placeholder="Enter season..."
                            disabled={configLocked}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Product ID (optional)</Label>
                          <Input
                            value={edit.productId ?? ""}
                            onChange={(e) => updateItemEdit(index, "productId", e.target.value)}
                            disabled={configLocked}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Material</Label>
                          <Input
                            value={edit.material ?? ""}
                            onChange={(e) => updateItemEdit(index, "material", e.target.value)}
                            disabled={configLocked}
                          />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={edit.description ?? ""}
                            onChange={(e) => updateItemEdit(index, "description", e.target.value)}
                            disabled={configLocked}
                          />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-xs">Packet Configuration</Label>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={configLocked}
                            onClick={() => {
                              setSelectedItemForPackets({
                                ...edit,
                                index,
                                modalItemId: String(index),
                              });
                              setPacketDialogOpen(true);
                            }}
                          >
                            Configure
                          </Button>
                        </div>
                      </div>
                      {configLocked && (
                        <p className="text-xs text-amber-700">
                          Product configuration fields are locked for this item because sold quantity is greater than zero.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save result */}
            {saveResult && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <span className="font-semibold">Saved. </span>
                {saveResult.message}
                {saveResult.adjustmentEntry && (
                  <span className="block mt-1 text-xs">
                    Ledger entry #{saveResult.adjustmentEntry.entryNumber} created.
                  </span>
                )}
              </div>
            )}

            {/* Save error */}
            {saveError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!isSuperAdmin && !saveResult && (
            <div className="w-full mb-3">
              <Label htmlFor="edit-reason" className="text-sm font-medium">
                Reason for Edit <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="edit-reason"
                className="mt-1.5 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                rows={2}
                placeholder="Why are these changes needed?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your request will be sent to the Super Admin for approval.
              </p>
            </div>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {saveResult ? "Close" : "Cancel"}
          </Button>
          {!saveResult && (
            <Button
              onClick={handleSave}
              disabled={saving || impactLoading || !!impactError || (!isSuperAdmin && !reason.trim())}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isSuperAdmin ? "Saving\u2026" : "Submitting\u2026"}
                </>
              ) : isSuperAdmin ? (
                "Save Changes"
              ) : (
                "Submit Edit Request"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <PacketConfigurationModal
      isOpen={packetDialogOpen}
      onClose={() => {
        setPacketDialogOpen(false);
        setSelectedItemForPackets(null);
      }}
      onSave={(packets, context) => {
        const targetIndex = context?.index ?? selectedItemForPackets?.index;
        if (targetIndex === undefined || targetIndex === null) return;
        setItemEdits((prev) => {
          const next = [...prev];
          next[targetIndex] = {
            ...next[targetIndex],
            packets,
            useVariantTracking: true,
          };
          return next;
        });
      }}
      item={selectedItemForPackets}
      items={packetConfigItems}
      activeItemId={selectedItemForPackets?.modalItemId}
      initialPackets={selectedItemForPackets?.packets || []}
    />
    </>
  );
}
