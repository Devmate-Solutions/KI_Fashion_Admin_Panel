"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Send } from "lucide-react";
import { useUpdateSale } from "@/lib/hooks/useSales";
import { useAuthStore } from "@/store/store";
import EditRequestDialog from "./EditRequestDialog";

function currency(n) {
  const num = Number(n || 0);
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Flatten a populated item back to the IDs the backend schema expects.
 */
function normalizeItem(item) {
  const normalized = {
    product: item.product?._id || item.product,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discount: item.discount || 0,
    taxRate: item.taxRate || 0,
    isPacketSale: item.isPacketSale || false,
  };
  if (item.packetStock) normalized.packetStock = item.packetStock?._id || item.packetStock;
  if (item.packetBarcode) normalized.packetBarcode = item.packetBarcode;
  if (item.packetComposition) normalized.packetComposition = item.packetComposition;
  if (item.totalItemsPerPacket) normalized.totalItemsPerPacket = item.totalItemsPerPacket;
  if (item.packetQuantity) normalized.packetQuantity = item.packetQuantity;
  return normalized;
}

export default function EditSaleDialog({ open, onClose, sale, onSuccess }) {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super-admin";
  const updateSaleMutation = useUpdateSale();

  const [notes, setNotes] = useState("");
  const [totalDiscount, setTotalDiscount] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");

  // Step 2 for non-super-admin: hand off to EditRequestDialog
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestedChanges, setRequestedChanges] = useState(null);
  const [rawPayload, setRawPayload] = useState(null);

  // Populate form when sale changes
  useEffect(() => {
    if (!sale) return;
    const orig = sale._original || {};
    setNotes(orig.notes || "");
    setTotalDiscount(String(orig.totalDiscount ?? 0));
    setShippingCost(String(orig.shippingCost ?? 0));
    setSaleDate(orig.saleDate ? new Date(orig.saleDate).toLocaleDateString('en-CA') : "");
    setDeliveryDate(orig.deliveryDate ? new Date(orig.deliveryDate).toLocaleDateString('en-CA') : "");
    setShowRequestDialog(false);
    setRequestedChanges(null);
    setRawPayload(null);
  }, [sale]);

  if (!sale) return null;

  const orig = sale._original || {};

  function buildPayload() {
    const items = (orig.items || []).map(normalizeItem);
    const payload = {
      items,
      saleDate: saleDate || orig.saleDate,
      saleType: orig.saleType || "retail",
      totalDiscount: parseFloat(totalDiscount) || 0,
      shippingCost: parseFloat(shippingCost) || 0,
      cashPayment: orig.cashPayment || 0,
      bankPayment: orig.bankPayment || 0,
    };

    // buyer vs manualCustomer
    if (orig.buyer) {
      payload.buyer = orig.buyer?._id || orig.buyer;
    } else if (orig.manualCustomer) {
      payload.manualCustomer = orig.manualCustomer;
    }

    if (notes.trim()) payload.notes = notes.trim();
    if (deliveryDate) payload.deliveryDate = deliveryDate;
    if (orig.deliveryAddress) payload.deliveryAddress = orig.deliveryAddress;
    if (orig.deliveryPersonnel) payload.deliveryPersonnel = orig.deliveryPersonnel?._id || orig.deliveryPersonnel;
    if (orig.invoiceNumber) payload.invoiceNumber = orig.invoiceNumber;
    if (orig.paymentMethod) payload.paymentMethod = orig.paymentMethod;
    return payload;
  }

  function buildDiff() {
    const changes = {};
    const origNotes = orig.notes || "";
    const origDiscount = String(orig.totalDiscount ?? 0);
    const origShipping = String(orig.shippingCost ?? 0);
    const origSaleDate = orig.saleDate ? new Date(orig.saleDate).toLocaleDateString('en-CA') : "";
    const origDeliveryDate = orig.deliveryDate ? new Date(orig.deliveryDate).toLocaleDateString('en-CA') : "";

    if (notes !== origNotes) changes.notes = { from: origNotes, to: notes };
    if (totalDiscount !== origDiscount) changes.totalDiscount = { from: origDiscount, to: totalDiscount };
    if (shippingCost !== origShipping) changes.shippingCost = { from: origShipping, to: shippingCost };
    if (saleDate !== origSaleDate) changes.saleDate = { from: origSaleDate, to: saleDate };
    if (deliveryDate !== origDeliveryDate) changes.deliveryDate = { from: origDeliveryDate, to: deliveryDate };
    return changes;
  }

  const hasChanges = Object.keys(buildDiff()).length > 0;

  async function handleSave() {
    if (isSuperAdmin) {
      try {
        await updateSaleMutation.mutateAsync({ id: sale.id, data: buildPayload() });
        onSuccess?.();
        onClose();
      } catch {
        // Error handled by mutation hook
      }
    } else {
      const diff = buildDiff();
      if (Object.keys(diff).length === 0) return;
      setRequestedChanges(diff);
      setRawPayload(buildPayload());
      setShowRequestDialog(true);
    }
  }

  return (
    <>
      <Dialog open={open && !showRequestDialog} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Sale</DialogTitle>
            <DialogDescription>
              {isSuperAdmin
                ? "Update sale details. Changes will be saved immediately."
                : "Modify the fields you want to change. Your request will be sent for approval."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Sale reference summary */}
            <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              <span className="font-medium">Sale:</span>{" "}
              {orig.saleNumber || String(sale.id).slice(-6)}
              &nbsp;·&nbsp;
              <span className="font-medium">Buyer:</span>{" "}
              {sale.customerName || "—"}
              &nbsp;·&nbsp;
              <span className="font-medium">Total:</span>{" "}
              {currency(orig.grandTotal ?? sale.total)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="es-sale-date">Sale Date</Label>
                <Input
                  id="es-sale-date"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="es-delivery-date">Delivery Date</Label>
                <Input
                  id="es-delivery-date"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="es-discount">Discount (£)</Label>
                <Input
                  id="es-discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalDiscount}
                  onChange={(e) => setTotalDiscount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="es-shipping">Shipping Cost (£)</Label>
                <Input
                  id="es-shipping"
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="es-notes">Notes</Label>
              <Textarea
                id="es-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this sale..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={updateSaleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateSaleMutation.isPending || !hasChanges}
            >
              {updateSaleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : isSuperAdmin ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Review & Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2 (non-super-admin): confirm diff and add reason */}
      {showRequestDialog && (
        <EditRequestDialog
          open={showRequestDialog}
          onClose={() => {
            setShowRequestDialog(false);
            onClose();
          }}
          entityType="sale"
          entityId={sale.id}
          entityRef={orig.saleNumber || String(sale.id).slice(-6)}
          requestedChanges={requestedChanges}
          rawPayload={rawPayload}
          onSuccess={() => {
            setShowRequestDialog(false);
            onClose();
            onSuccess?.();
          }}
        />
      )}
    </>
  );
}
