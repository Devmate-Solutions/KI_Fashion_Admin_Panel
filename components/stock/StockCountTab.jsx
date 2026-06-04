"use client";

import React, { useState, useRef, useMemo } from "react";
import { useScanBarcode } from "@/lib/hooks/usePacketStock";
import {
  useStockCountSessions,
  useActiveStockCountSession,
  useStockCountSession,
  useStartStockCountSession,
  useAddStockCountItem,
  useRemoveStockCountItem,
  useCompleteStockCountSession,
  useDeleteStockCountSession
} from "@/lib/hooks/useStockCountSessions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2, ScanLine, Plus, ArrowLeft, CheckCircle } from "lucide-react";
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

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

export default function StockCountTab() {
  const [viewingSessionId, setViewingSessionId] = useState(null);
  const [scanQuery, setScanQuery] = useState("");
  const scanInputRef = useRef(null);

  // Queries
  const { data: activeSessionRes, isLoading: loadingActive } = useActiveStockCountSession();
  const { data: sessionsRes, isLoading: loadingSessions } = useStockCountSessions();
  
  const activeSession = activeSessionRes?.data;
  const sessionList = sessionsRes?.data || [];

  // Detail query for when viewing a historical session
  const { data: detailSessionRes, isLoading: loadingDetail } = useStockCountSession(viewingSessionId, {
    enabled: !!viewingSessionId && viewingSessionId !== activeSession?._id
  });

  // Determine current session to display
  let currentSession = null;
  let isReadOnly = false;

  if (viewingSessionId) {
    if (activeSession && activeSession._id === viewingSessionId) {
      currentSession = activeSession;
    } else {
      currentSession = detailSessionRes?.data;
      isReadOnly = true;
    }
  } else if (activeSession) {
    currentSession = activeSession;
    isReadOnly = false;
  }

  // Mutations
  const scanBarcodeMutation = useScanBarcode();
  const startSessionMutation = useStartStockCountSession();
  const addItemMutation = useAddStockCountItem();
  const removeItemMutation = useRemoveStockCountItem();
  const completeSessionMutation = useCompleteStockCountSession();
  const deleteSessionMutation = useDeleteStockCountSession();

  const handleStartSession = async () => {
    try {
      const res = await startSessionMutation.mutateAsync();
      if (res?.data?._id) {
        setViewingSessionId(res.data._id);
      }
    } catch (e) {
      // handled in hook
    }
  };

  const handleEndSession = async () => {
    if (!currentSession?._id) return;
    if (confirm("Are you sure you want to end this count session?")) {
      try {
        await completeSessionMutation.mutateAsync({ id: currentSession._id, payload: {} });
        setViewingSessionId(null);
      } catch (e) {}
    }
  };

  const handleDeleteSession = async (id) => {
    if (confirm("Are you sure you want to delete this session entirely? This cannot be undone.")) {
      await deleteSessionMutation.mutateAsync(id);
      if (viewingSessionId === id) {
        setViewingSessionId(null);
      }
    }
  };

  const handleStockCountScan = async (e) => {
    e.preventDefault();
    if (isReadOnly || !currentSession?._id) return;
    
    const barcode = scanQuery.trim();
    if (!barcode) return;

    try {
      const result = await scanBarcodeMutation.mutateAsync(barcode);
      const scannedItem = result.data?.data || result.data || result;

      await addItemMutation.mutateAsync({
        id: currentSession._id,
        payload: { barcode, item: scannedItem }
      });

      setScanQuery("");
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
    } catch {
      setScanQuery("");
    }
  };

  const removeStockCountItem = async (itemId) => {
    if (isReadOnly || !currentSession?._id) return;
    try {
      await removeItemMutation.mutateAsync({
        id: currentSession._id,
        itemId
      });
    } catch (e) {}
  };

  // Render Session List View
  if (!currentSession && !viewingSessionId) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Stock Count Sessions</h3>
            <p className="text-sm text-muted-foreground">Manage and track your inventory counting sessions</p>
          </div>
          <Button onClick={handleStartSession} disabled={startSessionMutation.isPending || loadingActive}>
            {startSessionMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Start New Count
          </Button>
        </div>

        <div className="rounded-md border bg-card">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm text-left">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Session</th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Started By</th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Started</th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Items</th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Value</th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {loadingSessions ? (
                  <tr>
                    <td colSpan={7} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : sessionList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="h-24 text-center text-muted-foreground">
                      No sessions found.
                    </td>
                  </tr>
                ) : (
                  sessionList.map((session) => (
                    <tr key={session._id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle font-medium">
                        <Button variant="link" className="p-0 h-auto" onClick={() => setViewingSessionId(session._id)}>
                          {session.sessionNumber}
                        </Button>
                      </td>
                      <td className="p-4 align-middle">{session.startedByName}</td>
                      <td className="p-4 align-middle text-muted-foreground text-xs">{formatDate(session.startedAt)}</td>
                      <td className="p-4 align-middle">
                        <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                          {session.status}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle text-right tabular-nums">{formatNumber(session.summary?.totalItems)}</td>
                      <td className="p-4 align-middle text-right tabular-nums">{currency(session.summary?.totalValue)}</td>
                      <td className="p-4 align-middle text-right">
                         <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteSession(session._id)}
                          disabled={deleteSessionMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Render Session Detail / Active View
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setViewingSessionId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h3 className="text-lg font-medium">
              Session {currentSession?.sessionNumber}
              {currentSession?.status === 'completed' && <Badge className="ml-2" variant="default">Completed</Badge>}
              {currentSession?.status === 'in-progress' && <Badge className="ml-2" variant="secondary">In Progress</Badge>}
            </h3>
            <p className="text-sm text-muted-foreground">
              Started by {currentSession?.startedByName} on {formatDate(currentSession?.startedAt)}
            </p>
          </div>
        </div>
        {!isReadOnly && currentSession?.status === 'in-progress' && (
          <Button onClick={handleEndSession} variant="default" disabled={completeSessionMutation.isPending}>
            {completeSessionMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            End Session
          </Button>
        )}
      </div>

      {loadingDetail ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
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
                  {currency(currentSession?.summary?.totalValue)}
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
                  {formatNumber(currentSession?.summary?.totalItems)}
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
                  {formatNumber(currentSession?.summary?.totalScannedEntries)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scanner Input (Active Only) */}
          {!isReadOnly && (
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
                  disabled={scanBarcodeMutation.isPending || addItemMutation.isPending}
                >
                  {scanBarcodeMutation.isPending || addItemMutation.isPending ? (
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
          )}

          {/* Scanned Items Table */}
          <div className="rounded-md border bg-card">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm text-left">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50">
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Time</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Barcode</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Product</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Type</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Composition</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Value</th>
                    {!isReadOnly && <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {(!currentSession?.items || currentSession.items.length === 0) ? (
                    <tr>
                      <td colSpan={isReadOnly ? 6 : 7} className="h-24 text-center text-muted-foreground">
                        No items scanned in this session.
                      </td>
                    </tr>
                  ) : (
                    currentSession.items.map((entry) => {
                      return (
                        <tr
                          key={entry._id || entry.barcode + entry.scannedAt}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <td className="p-4 align-middle font-mono text-xs text-muted-foreground">
                            {formatDate(entry.scannedAt)}
                          </td>
                          <td className="p-4 align-middle font-mono font-medium">
                            {entry.barcode}
                          </td>
                          <td className="p-4 align-middle">
                            <div className="font-medium">
                              {entry.productName || "Unknown Product"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {entry.productSku}
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <Badge variant={entry.isLoose ? "secondary" : "default"}>
                              {entry.isLoose ? "Loose" : "Packet"}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="text-xs">
                              {(entry.composition || []).slice(0, 2).map((c, i) => (
                                <span
                                  key={i}
                                  className="mr-1 inline-block bg-slate-100 px-1 rounded"
                                >
                                  {c.color}/{c.size}
                                </span>
                              ))}
                              {entry.composition?.length > 2 && "..."}
                            </div>
                          </td>
                          <td className="p-4 align-middle text-right font-medium">
                            {currency(entry.landedPrice || entry.costPrice || entry.suggestedSellingPrice || 0)}
                          </td>
                          {!isReadOnly && (
                            <td className="p-4 align-middle text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeStockCountItem(entry._id)}
                                disabled={removeItemMutation.isPending}
                              >
                                {removeItemMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
