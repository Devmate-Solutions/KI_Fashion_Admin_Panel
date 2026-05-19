"use client";

import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Clock, Info, Activity } from "lucide-react";
import { useAuditLog } from "@/lib/hooks/useAuditLogs";
import AuditLogDiff from "@/components/audit/AuditLogDiff";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const ACTION_COLORS = {
  CREATE: "bg-green-100 text-green-800 border-green-300",
  UPDATE: "bg-blue-100 text-blue-800 border-blue-300",
  DELETE: "bg-red-100 text-red-800 border-red-300",
  STATUS_CHANGE: "bg-amber-100 text-amber-800 border-amber-300",
  LOGIN: "bg-purple-100 text-purple-800 border-purple-300",
};

export default function AuditLogDetailPage() {
  const { id } = useParams();
  const { data: log, isLoading } = useAuditLog(id);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">Loading audit log details...</p>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
          <Activity className="h-8 w-8 text-slate-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Log Entry Not Found</h2>
          <Link href="/audit-trail" className="text-blue-600 hover:underline text-sm">Back to Audit Trail</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-10">
      {/* Page Header */}
      <BackButton />
      <div className="flex items-center justify-between border-b pb-4 border-slate-100">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Log Details</h1>
            </div>
          </div>
        </div>


      </div>

      {/* Simplified Content Grid */}
      <div className="grid grid-cols-1 gap-4 items-start">



        {/* Primary Content Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Occurrence & Core Info */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50">
                <Clock className="h-4 w-4 text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Audit Info</h3>
              </div>
              <div className="flex justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Performed By</span>
                  <span className="text-sm font-bold text-slate-900 uppercase">{log.userName || "System"}</span>
                  <span className="text-[10px] text-slate-500 truncate">{log.userEmail || "system@kifashion.com"}</span>
                </div>
                <div className="flex flex-col border-t border-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Event Time</span>
                  <span className="text-sm font-bold text-slate-900">
                    {new Date(log.timestamp).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-sm text-slate-600">
                    {new Date(log.timestamp).toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Activity Summary - Clean & Fast */}
          <section className="bg-white p-4  border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Activity Summary</h2>
            </div>
            <div className="bg-slate-50/50 p-2 border-l-2 border-l-blue-600 border border-slate-100">
              <p className="text-slate-700 text-base leading-relaxed">
                {log.description}
              </p>
            </div>
          </section>

          {/* Change History Section */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <div className="h-1.5 w-1.5 bg-blue-600" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Transactional Diff</h2>
            </div>
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
              <AuditLogDiff oldData={log.changes?.old} newData={log.changes?.new} resource={log.resource} />
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
