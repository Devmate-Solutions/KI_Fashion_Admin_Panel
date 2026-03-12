"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Check, X, User, Clock, FileText, ExternalLink } from "lucide-react";
import DiffView from "@/components/DiffView";
import { useEditRequest, useApproveEditRequest, useRejectEditRequest } from "@/lib/hooks/useEditRequests";
import Link from "next/link";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  approved: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
};

const ENTITY_TYPE_LABELS = {
  "dispatch-order": "Dispatch Order",
  sale: "Sale",
  payment: "Payment",
  "supplier-payment": "Supplier Payment",
};

const ENTITY_ROUTES = {
  "dispatch-order": "/dispatch-orders",
  sale: "/selling",
  payment: "/customer-ledger",
  "supplier-payment": "/supplier-ledger",
};

/**
 * RequestReviewPanel — Super-admin reviews a single edit/delete request
 *
 * Props:
 * @param {boolean} open
 * @param {function} onClose
 * @param {string} requestId - MongoDB ObjectId of the EditRequest
 */
export default function RequestReviewPanel({ open, onClose, requestId }) {
  const { data: request, isLoading } = useEditRequest(requestId);
  const approveMutation = useApproveEditRequest();
  const rejectMutation = useRejectEditRequest();

  const [reviewNote, setReviewNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleApprove = async (forceApprove = false) => {
    try {
      await approveMutation.mutateAsync({
        id: requestId,
        data: { reviewNote: reviewNote.trim() || undefined, forceApprove },
      });
      setReviewNote("");
      onClose();
    } catch {
      // Error handled by mutation hook
    }
  };

  const handleReject = async () => {
    if (!reviewNote.trim()) return;
    try {
      await rejectMutation.mutateAsync({
        id: requestId,
        data: { reviewNote: reviewNote.trim() },
      });
      setReviewNote("");
      setShowRejectForm(false);
      onClose();
    } catch {
      // Error handled by mutation hook
    }
  };

  if (!open) return null;

  const isPending = request?.status === "pending";
  const isProcessing = approveMutation.isPending || rejectMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : !request ? (
          <div className="text-center p-8 text-muted-foreground">Request not found</div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <span className="font-mono">{request.requestNumber}</span>
                <Badge variant="outline" className={STATUS_STYLES[request.status]}>
                  {request.status}
                </Badge>
                <Badge variant={request.requestType === "delete" ? "destructive" : "secondary"}>
                  {request.requestType === "edit" ? "Edit Request" : "Delete Request"}
                </Badge>
                {request.directEdit && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                    Direct Edit
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            {/* Request metadata */}
            <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Requester:</span>
                <span className="font-medium">{request.requestedBy?.name || "Unknown"}</span>
                <Badge variant="outline" className="text-xs">
                  {request.requestedBy?.role}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Entity:</span>
                <span className="font-medium">
                  {ENTITY_TYPE_LABELS[request.entityType]} {request.entityRef && `#${request.entityRef}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Submitted:</span>
                <span>
                  {new Date(request.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div>
                <Link
                  href={`${ENTITY_ROUTES[request.entityType] || "/"}/${request.entityId}`}
                  className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Original Record
                </Link>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Reason</Label>
              <p className="text-sm bg-muted/30 rounded p-2">{request.reason}</p>
            </div>

            {/* Edit diff or Delete summary */}
            {request.requestType === "edit" && request.requestedChanges && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Proposed Changes</Label>
                <DiffView requestedChanges={request.requestedChanges} />
              </div>
            )}

            {request.requestType === "delete" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Delete Target</Label>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">
                      This will permanently delete {ENTITY_TYPE_LABELS[request.entityType]} {request.entityRef}
                    </span>
                  </div>

                  {/* Cascading impact */}
                  {request.cascadingImpact && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-red-600">Cascading Impact:</p>
                      {Object.entries(request.cascadingImpact).map(([key, count]) => (
                        <div key={key} className="text-xs text-red-600 flex justify-between">
                          <span>{key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}:</span>
                          <Badge variant="outline" className="text-xs bg-red-100 text-red-700 h-5">
                            {count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reviewer info (for already-processed requests) */}
            {request.reviewedBy && (
              <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Reviewed by:</span>{" "}
                  <span className="font-medium">{request.reviewedBy.name}</span>
                </p>
                {request.reviewedAt && (
                  <p>
                    <span className="text-muted-foreground">Reviewed at:</span>{" "}
                    {new Date(request.reviewedAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                {request.reviewNote && (
                  <p>
                    <span className="text-muted-foreground">Note:</span> {request.reviewNote}
                  </p>
                )}
              </div>
            )}

            {/* Action area (only for pending requests) */}
            {isPending && (
              <>
                <div>
                  <Label htmlFor="review-note" className="text-sm font-medium">
                    Reviewer Note {showRejectForm && <span className="text-red-500">*</span>}
                  </Label>
                  <Textarea
                    id="review-note"
                    placeholder={
                      showRejectForm
                        ? "Explain why this request is being rejected..."
                        : "Optional note (required for rejection)..."
                    }
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="mt-1.5"
                    rows={2}
                  />
                </div>

                <DialogFooter className="flex gap-2">
                  {showRejectForm ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setShowRejectForm(false)}
                        disabled={isProcessing}
                      >
                        Back
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={!reviewNote.trim() || isProcessing}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                        Close
                      </Button>
                      <Button
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => setShowRejectForm(true)}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(false)}
                        disabled={isProcessing}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {approveMutation.isPending ? "Approving..." : "Approve"}
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </>
            )}

            {/* Conflict resolution UI */}
            {approveMutation.error?.response?.data?.conflict && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Conflict Detected</span>
                </div>
                <p className="text-xs text-amber-700">
                  The record was modified after this request was submitted. You can force-approve to
                  apply the requested changes over the current state.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 text-amber-700 hover:bg-amber-100"
                  onClick={() => handleApprove(true)}
                  disabled={isProcessing}
                >
                  Force Approve
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
