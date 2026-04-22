"use client";

import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { User, Clock, Monitor, Globe, Info, Activity, ArrowLeft } from "lucide-react";
import { useAuditLog } from "@/lib/hooks/useAuditLogs";
import AuditLogDiff from "@/components/audit/AuditLogDiff";
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
            <p className="text-slate-500 max-w-xs">The audit log you are looking for might have been archived or does not exist.</p>
        </div>
        <Link href="/audit-trail">
            <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Audit Trail
            </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <BackButton />
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Log Details</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1 font-mono">{id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
            <Badge className={`px-4 py-1.5 text-xs font-black rounded-full border shadow-sm uppercase tracking-wider ${ACTION_COLORS[log.action] || "bg-slate-100 text-slate-800 border-slate-200"}`}>
                {log.action}
            </Badge>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sidebar Info */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-500" />
                        Actor Information
                    </h3>
                </div>
                <div className="p-6 space-y-5">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</span>
                        <span className="text-sm font-bold text-slate-900">{log.userName || "System"}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</span>
                        <span className="text-sm font-medium text-slate-600 truncate" title={log.userEmail}>{log.userEmail || "system@internal.gen"}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client IP</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Globe className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-sm font-mono font-bold text-slate-900">{log.ip || "0.0.0.0"}</span>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Architecture</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Monitor className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-xs font-medium text-slate-600 truncate" title={log.userAgent}>{log.userAgent?.split(' ')[0]}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200/50">
                <div className="flex items-center gap-3 mb-6">
                    <Clock className="h-5 w-5 text-blue-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Occurrence</h3>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-xs text-slate-400">Date</span>
                        <span className="text-lg font-bold">
                            {new Date(log.timestamp).toLocaleDateString("en-GB", { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                    <div className="flex justify-between items-end pt-4 border-t border-slate-800">
                        <span className="text-xs text-slate-400">Local Time</span>
                        <span className="text-lg font-bold">
                            {new Date(log.timestamp).toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* Primary Content */}
        <div className="lg:col-span-2 space-y-8">
            {/* Summary Section */}
            <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-6">
                    <Info className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-slate-900">Activity Summary</h2>
                </div>
                
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 border-l-4 border-l-blue-600">
                    <p className="text-slate-700 italic leading-relaxed text-lg">
                        "{log.description}"
                    </p>
                </div>

                <div className="mt-8 flex flex-wrap gap-6 pt-6 border-t border-slate-100">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource Type</span>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-900 hover:bg-slate-200 border-none px-3 font-bold">
                            {log.resource}
                        </Badge>
                    </div>
                    {log.resourceId && (
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource Identification</span>
                            <span className="font-mono bg-blue-50 text-blue-900 px-3 py-1 rounded text-sm border border-blue-100 font-bold">
                                {log.resourceId}
                            </span>
                        </div>
                    )}
                </div>
            </section>

            {/* Change History Section */}
            <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-blue-600" />
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Transactional Diff</h2>
                    </div>
                </div>
                <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                    <AuditLogDiff oldData={log.changes?.old} newData={log.changes?.new} />
                </div>
            </section>
        </div>

      </div>
    </div>
  );
}
