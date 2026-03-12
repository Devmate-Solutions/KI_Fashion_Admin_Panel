"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useSubmitEditRequest } from "@/lib/hooks/useEditRequests";

/**
 * DeleteRequestDialog — Non-super-admin users submit delete requests through this dialog.
 *
 * Props:
 * @param {boolean} open
 * @param {function} onClose
 * @param {string} entityType - 'dispatch-order' | 'sale' | 'payment' | 'supplier-payment'
 * @param {string} entityId - MongoDB ObjectId of the record
 * @param {string} entityRef - Human-readable ref (order number, sale number, etc)
 * @param {object} entitySummary - Key details to display { label: value }
 * @param {function} onSuccess
 */
export default function DeleteRequestDialog({
  open,
  onClose,
  entityType,
  entityId,
  entityRef,
  entitySummary = {},
  onSuccess,
}) {
  const [reason, setReason] = useState("");
  const submitMutation = useSubmitEditRequest();

  const entityTypeLabels = {
    "dispatch-order": "Dispatch Order",
    sale: "Sale",
    payment: "Payment",
    "supplier-payment": "Supplier Payment",
  };

  const handleSubmit = async () => {
    if (!reason.trim()) return;

    try {
      await submitMutation.mutateAsync({
        entityType,
        entityId,
        requestType: "delete",
        reason: reason.trim(),
        entityRef,
      });
      setReason("");
      onSuccess?.();
      onClose();
    } catch {
      // Error toast handled by the mutation hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Request Deletion
          </DialogTitle>
          <DialogDescription>
            This will submit a deletion request for Super Admin approval. The record will not be
            deleted until approved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Entity summary */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">{entityTypeLabels[entityType] || entityType}</Badge>
              {entityRef && <span className="font-mono text-sm font-medium">{entityRef}</span>}
            </div>
            {Object.entries(entitySummary).map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>

          {/* Reason field */}
          <div>
            <Label htmlFor="delete-reason" className="text-sm font-medium">
              Reason for Deletion <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="delete-reason"
              placeholder="Explain why this record should be deleted..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason.trim() || submitMutation.isPending}
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Deletion Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
