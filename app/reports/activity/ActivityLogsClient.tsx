"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

type AuditLog = {
  id: number;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: number; fullName: string; username: string } | null;
};

type UserOption = {
  id: number;
  fullName: string;
  username: string;
};

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString("en-LK", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }),
    time: date.toLocaleTimeString("en-LK", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}

function getActionBadge(action: string) {
  const norm = action.toUpperCase();
  if (norm.includes("CREATE") || norm.includes("SALE") || norm.includes("ADD")) {
    return "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400";
  }
  if (norm.includes("UPDATE") || norm.includes("EDIT") || norm.includes("STATUS")) {
    return "border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400";
  }
  if (norm.includes("DELETE") || norm.includes("CANCEL")) {
    return "border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400";
  }
  if (norm.includes("LOGIN") || norm.includes("AUTH")) {
    return "border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400";
  }
  return "border-slate-200 dark:border-border bg-slate-100 dark:bg-muted text-slate-700 dark:text-slate-300";
}

export default function ActivityLogsClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogsData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (actionFilter !== "ALL") params.set("action", actionFilter);
      if (userFilter !== "ALL") params.set("userId", userFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("page", String(page));
      params.set("limit", "30");

      const res = await fetch(`/api/reports/activity?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setLogs(json.data || []);
        if (json.users) setUsers(json.users);
        if (json.pagination) setPagination(json.pagination);
      } else {
        toast.error(json.message || "Failed to load activity logs");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while loading activity logs");
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter, userFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchLogsData();
  }, [fetchLogsData]);

  function handleManualRefresh() {
    setLoading(true);
    fetchLogsData();
  }

  return (
    <div className="min-h-full bg-slate-50/50 dark:bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground">Activity & Audit Logs</h1>
                <p className="text-sm text-slate-500 dark:text-muted-foreground">
                  Real-time timeline of user actions, sales, jobs, and security events
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card px-4 text-sm font-semibold text-slate-700 dark:text-foreground shadow-sm transition hover:bg-slate-50 dark:hover:bg-muted/40 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by action, entity, details..."
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted/40 pl-10 pr-4 text-sm text-slate-900 dark:text-foreground placeholder-slate-400 dark:placeholder-muted-foreground focus:border-primary focus:bg-white dark:focus:bg-muted focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-xs font-medium text-slate-700 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="SALE">Sale</option>
              <option value="LOGIN">Login</option>
            </select>

            <select
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-xs font-medium text-slate-700 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
            >
              <option value="ALL">All Operators</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-xs font-medium text-slate-700 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
              title="From date"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-xs font-medium text-slate-700 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
              title="To date"
            />

            {(search || actionFilter !== "ALL" || userFilter !== "ALL" || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActionFilter("ALL");
                  setUserFilter("ALL");
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-slate-200 dark:border-border px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-muted/40"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm font-medium">Fetching activity log...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-muted-foreground">
              <Activity className="h-12 w-12 stroke-[1.2]" />
              <p className="mt-3 text-base font-semibold text-slate-700 dark:text-foreground">No activity logs recorded</p>
              <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">User operations and transactions will appear here.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="border-b border-slate-100 dark:border-border bg-slate-50/75 dark:bg-muted/40 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5">Timestamp</th>
                      <th className="px-5 py-3.5">Operator</th>
                      <th className="px-5 py-3.5">Action</th>
                      <th className="px-5 py-3.5">Entity</th>
                      <th className="px-5 py-3.5">Activity Details</th>
                      <th className="px-5 py-3.5">IP Address</th>
                      <th className="px-5 py-3.5 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-border">
                    {logs.map((log) => {
                      const { date, time } = formatTimestamp(log.createdAt);
                      return (
                        <tr key={log.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-muted/30">
                          <td className="whitespace-nowrap px-5 py-3.5 text-xs">
                            <span className="font-semibold text-slate-900 dark:text-foreground">{date}</span>
                            <span className="ml-1.5 text-slate-400 dark:text-muted-foreground">{time}</span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5">
                            {log.user ? (
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-muted text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {log.user.fullName.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-900 dark:text-foreground">{log.user.fullName}</p>
                                  <p className="text-[10px] text-slate-400 dark:text-muted-foreground">@{log.user.username}</p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs italic text-slate-400 dark:text-muted-foreground">System</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5">
                            <span
                              className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-bold ${getActionBadge(
                                log.action
                              )}`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {log.entity || "—"}{" "}
                            {log.entityId && (
                              <span className="font-mono text-slate-400 dark:text-muted-foreground">#{log.entityId}</span>
                            )}
                          </td>
                          <td className="max-w-md truncate px-5 py-3.5 text-xs text-slate-700 dark:text-slate-300" title={log.details || ""}>
                            {log.details || "—"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-slate-400 dark:text-muted-foreground">
                            {log.ipAddress || "127.0.0.1"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedLog(log)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-muted hover:text-slate-700 dark:hover:text-foreground"
                              title="Inspect Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-border px-6 py-4 text-xs text-slate-500 dark:text-muted-foreground">
                <span>
                  Showing {logs.length} of {pagination.total} entries
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 dark:border-border px-2.5 font-medium hover:bg-slate-50 dark:hover:bg-muted/40 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>
                  <span>
                    Page {page} of {pagination.totalPages || 1}
                  </span>
                  <button
                    type="button"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 dark:border-border px-2.5 font-medium hover:bg-slate-50 dark:hover:bg-muted/40 disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-border pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-foreground">Audit Log Details</h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-muted hover:text-slate-600 dark:hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-100 dark:border-border py-1.5">
                <span className="text-slate-500 dark:text-muted-foreground">Log ID</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-foreground">#{selectedLog.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-border py-1.5">
                <span className="text-slate-500 dark:text-muted-foreground">Action</span>
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${getActionBadge(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-border py-1.5">
                <span className="text-slate-500 dark:text-muted-foreground">Target Entity</span>
                <span className="font-semibold text-slate-800 dark:text-foreground">
                  {selectedLog.entity || "—"} {selectedLog.entityId && `(#${selectedLog.entityId})`}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-border py-1.5">
                <span className="text-slate-500 dark:text-muted-foreground">Operator</span>
                <span className="font-semibold text-slate-800 dark:text-foreground">
                  {selectedLog.user ? `${selectedLog.user.fullName} (@${selectedLog.user.username})` : "System"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-border py-1.5">
                <span className="text-slate-500 dark:text-muted-foreground">Timestamp</span>
                <span className="font-semibold text-slate-800 dark:text-foreground">
                  {new Date(selectedLog.createdAt).toLocaleString("en-LK")}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-border py-1.5">
                <span className="text-slate-500 dark:text-muted-foreground">Client IP Address</span>
                <span className="font-mono text-slate-800 dark:text-foreground">{selectedLog.ipAddress || "127.0.0.1"}</span>
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">Details Payload</span>
                <div className="mt-1.5 rounded-xl border border-slate-200/50 dark:border-border bg-slate-50 dark:bg-muted/40 p-3 font-mono text-xs text-slate-800 dark:text-slate-200 break-words">
                  {selectedLog.details || "No extra payload recorded."}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-slate-100 dark:bg-muted px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-muted/80"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
