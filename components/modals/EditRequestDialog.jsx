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
import DiffView from "@/components/DiffView";
import { useSubmitEditRequest } from "@/lib/hooks/useEditRequests";

/**
 * EditRequestDialog — Non-super-admin users submit edit requests through this dialog.
 *
 * Props:
 * @param {boolean} open
 * @param {function} onClose
 * @param {string} entityType - 'dispatch-order' | 'sale' | 'payment' | 'supplier-payment'
 * @param {string} entityId - MongoDB ObjectId of the record
 * @param {string} entityRef - Human-readable ref (order number, sale number, etc)
 * @param {object} requestedChanges - { fieldPath: { from, to } }
 * @param {object} rawPayload - The exact payload to apply on approval
 * @param {function} onSuccess - Called after successful submission
 */
export default function EditRequestDialog({
  open,
  onClose,
  entityType,
  entityId,
  entityRef,
  requestedChanges,
  rawPayload,
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
        requestType: "edit",
        requestedChanges,
        rawPayload,
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

  const hasChanges = requestedChanges && Object.keys(requestedChanges).length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Submit Edit Request
            <Badge variant="outline">{entityTypeLabels[entityType] || entityType}</Badge>
          </DialogTitle>
          <DialogDescription>
            {entityRef
              ? `Your changes to ${entityRef} will be submitted for Super Admin approval.`
              : "Your changes will be submitted for Super Admin approval."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Diff preview */}
          {hasChanges && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Proposed Changes</Label>
              <DiffView requestedChanges={requestedChanges} />
            </div>
          )}

          {/* Reason field */}
          {/* <div>
            <Label htmlFor="edit-reason" className="text-sm font-medium">
              Reason for Change <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="edit-reason"
              placeholder="Explain why this change is needed..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5"
              rows={3}
            />
          </div> */}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || !hasChanges || submitMutation.isPending}
          >
            {submitMutation.isPending ? "Submitting..." : "Submit for Approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
