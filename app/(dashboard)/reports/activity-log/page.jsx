"use client"

import { useState, useMemo } from "react"
import ReportLayout from "@/components/reports/ReportLayout"
import PrintableTable from "@/components/reports/PrintableTable"
import { useActivityLogReport } from "@/lib/hooks/useReports"
import { Badge } from "@/components/ui/badge"

function formatDateTime(date) {
  if (!date) return "—"
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getDefaultDateRange() {
  const today = new Date()
  return {
    from: today.toISOString().split("T")[0],
    to: today.toISOString().split("T")[0],
  }
}

export default function ActivityLogReportPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  const { data, isLoading, refetch } = useActivityLogReport({
    startDate: dateRange.from,
    endDate: dateRange.to,
  })

  const activityData = useMemo(() => {
    return data?.activities || data?.logs || []
  }, [data])

  const stats = useMemo(() => {
    const userSet = new Set(activityData.map(a => a.user?._id || a.userId))
    const actionCounts = activityData.reduce((acc, a) => {
      const action = a.action || "unknown"
      acc[action] = (acc[action] || 0) + 1
      return acc
    }, {})
    
    return {
      totalActivities: activityData.length,
      uniqueUsers: userSet.size,
      actionCounts,
    }
  }, [activityData])

  const columns = [
    {
      header: "Timestamp",
      accessor: "timestamp",
      render: (row) => (
        <span className="text-xs whitespace-nowrap">
          {formatDateTime(row.timestamp || row.createdAt)}
        </span>
      ),
    },
    {
      header: "User",
      accessor: "user",
      render: (row) => (
        <div>
          <div className="font-medium">{row.user?.name || row.userName || "System"}</div>
          <div className="text-xs text-muted-foreground">{row.user?.email || row.userEmail || ""}</div>
        </div>
      ),
    },
    {
      header: "Action",
      accessor: "action",
      render: (row) => {
        const actionStyles = {
          create: "bg-emerald-100 text-emerald-700",
          update: "bg-blue-100 text-blue-700",
          delete: "bg-red-100 text-red-700",
          login: "bg-purple-100 text-purple-700",
          logout: "bg-gray-100 text-gray-700",
          view: "bg-sky-100 text-sky-700",
        }
        const action = (row.action || "unknown").toLowerCase()
        return (
          <Badge className={actionStyles[action] || "bg-gray-100 text-gray-700"}>
            {row.action || "Unknown"}
          </Badge>
        )
      },
    },
    {
      header: "Module",
      accessor: "module",
      render: (row) => (
        <span className="capitalize">{row.module || row.entityType || "—"}</span>
      ),
    },
    {
      header: "Description",
      accessor: "description",
      render: (row) => (
        <div className="max-w-xs truncate" title={row.description}>
          {row.description || "—"}
        </div>
      ),
    },
    {
      header: "IP Address",
      accessor: "ipAddress",
      render: (row) => (
        <span className="font-mono text-xs">{row.ipAddress || "—"}</span>
      ),
    },
  ]

  const summary = [
    {
      label: "Total Activities",
      value: stats.totalActivities,
      subtext: "logged actions",
    },
    {
      label: "Unique Users",
      value: stats.uniqueUsers,
      subtext: "active users",
    },
    {
      label: "Creates",
      value: stats.actionCounts.create || 0,
      color: "text-green-600",
    },
    {
      label: "Updates",
      value: stats.actionCounts.update || 0,
      color: "text-blue-600",
    },
  ]

  return (
    <ReportLayout
      title="Daily Activity Report"
      description="User activity log and audit trail"
      dateRange={dateRange}
      onDateChange={setDateRange}
      onRefresh={refetch}
      loading={isLoading}
      summary={summary}
    >
      {activityData.length === 0 && !isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No activity logs found for the selected date range.</p>
          <p className="text-sm mt-2">Activity logging may need to be enabled in the backend.</p>
        </div>
      ) : (
        <PrintableTable
          columns={columns}
          data={activityData}
          loading={isLoading}
          pageSize={100}
        />
      )}
    </ReportLayout>
  )
}
