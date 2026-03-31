"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { User, Clock, Monitor, Globe, Info, Activity } from "lucide-react";
import { useAuditLog } from "@/lib/hooks/useAuditLogs";
import AuditLogDiff from "@/components/audit/AuditLogDiff";

const ACTION_COLORS = {
  CREATE: "bg-green-100 text-green-800 border-green-300",
  UPDATE: "bg-blue-100 text-blue-800 border-blue-300",
  DELETE: "bg-red-100 text-red-800 border-red-300",
  STATUS_CHANGE: "bg-amber-100 text-amber-800 border-amber-300",
  LOGIN: "bg-purple-100 text-purple-800 border-purple-300",
};

export default function AuditLogDetailsPanel({ open, onClose, logId }) {
  const { data: log, isLoading } = useAuditLog(logId);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl">
        <div className="bg-slate-900 text-white p-6 rounded-t-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                        <Activity className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-bold text-white tracking-tight">Activity Log Details</DialogTitle>
                        <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">{logId}</p>
                    </div>
                </div>
                {log && (
                    <Badge className={`px-4 py-1 text-xs font-black rounded-full border shadow-sm ${ACTION_COLORS[log.action] || "bg-slate-800 text-slate-200 border-slate-600"}`}>
                        {log.action}
                    </Badge>
                )}
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 bg-slate-50/30">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              <p className="text-sm text-muted-foreground animate-pulse font-medium">Fetching secure log data...</p>
            </div>
          ) : !log ? (
            <div className="text-center p-10 text-muted-foreground bg-white rounded-xl border border-dashed">Log trace not found or expired.</div>
          ) : (
            <>
              {/* Metadata Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Performed By</p>
                        <p className="text-sm font-bold text-slate-900">{log.userName}</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{log.userEmail}</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                        <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Timestamp</p>
                        <p className="text-sm font-bold text-slate-900">
                            {new Date(log.timestamp).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-slate-500">
                             {new Date(log.timestamp).toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                        <Globe className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Network IP</p>
                        <p className="text-sm font-bold text-slate-900 font-mono">{log.ip || "0.0.0.0"}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">IPv4 Verified</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <Monitor className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Client Device</p>
                        <p className="text-sm font-bold text-slate-900 truncate max-w-[120px]" title={log.userAgent}>{log.userAgent?.split(' ')[0]}</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{log.userAgent?.split('(')[1]?.split(')')[0]}</p>
                    </div>
                </div>
              </div>

              {/* Action Description */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                       <Info className="h-4 w-4 text-blue-600" />
                       <h3 className="text-sm font-bold text-slate-900">Activity Summary</h3>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 italic text-slate-600 text-sm leading-relaxed">
                      "{log.description}"
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Resource:</span>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-bold">{log.resource}</Badge>
                      </div>
                      {log.resourceId && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Record ID:</span>
                            <span className="font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">{log.resourceId}</span>
                        </div>
                      )}
                  </div>
              </div>

              {/* Diff View */}
              <div className="space-y-3">
                 <div className="flex items-center gap-2 px-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Data Change Snapshot</h3>
                 </div>
                 <AuditLogDiff oldData={log.changes?.old} newData={log.changes?.new} />
              </div>
            </>
          )}
        </div>
        
        <div className="p-4 border-t bg-white flex justify-end gap-3 rounded-b-lg">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
                Close Audit Entry
            </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
