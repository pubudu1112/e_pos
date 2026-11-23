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
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (norm.includes("UPDATE") || norm.includes("EDIT") || norm.includes("STATUS")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (norm.includes("DELETE") || norm.includes("CANCEL")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (norm.includes("LOGIN") || norm.includes("AUTH")) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
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
    <div className="min-h-full bg-slate-50/50 p-3 sm:p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Activity &amp; Audit Logs</h1>
                <p className="text-xs text-slate-500 sm:text-sm">
                  Real-time timeline of user actions, sales, jobs, and security events
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={loading}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full min-w-0 lg:flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by action, entity, details..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto lg:flex-wrap lg:items-center">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-primary focus:outline-none lg:w-auto"
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
              className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-primary focus:outline-none lg:w-auto"
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
              className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-primary focus:outline-none lg:w-auto"
              title="From date"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-primary focus:outline-none lg:w-auto"
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
                className="col-span-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 lg:col-span-1 lg:w-auto"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm font-medium">Fetching activity log...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Activity className="h-12 w-12 stroke-[1.2]" />
              <p className="mt-3 text-base font-semibold text-slate-700">No activity logs recorded</p>
              <p className="mt-1 text-sm text-slate-400">User operations and transactions will appear here.</p>
            </div>
          ) : (
            <>
              <div className="touch-pan-x overscroll-x-contain overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500">
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
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => {
                      const { date, time } = formatTimestamp(log.createdAt);
                      return (
                        <tr key={log.id} className="transition-colors hover:bg-slate-50/50">
                          <td className="whitespace-nowrap px-5 py-3.5 text-xs">
                            <span className="font-semibold text-slate-900">{date}</span>
                            <span className="ml-1.5 text-slate-400">{time}</span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5">
                            {log.user ? (
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                                  {log.user.fullName.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-900">{log.user.fullName}</p>
                                  <p className="text-[10px] text-slate-400">@{log.user.username}</p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs italic text-slate-400">System</span>
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
                          <td className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-slate-700">
                            {log.entity || "—"}{" "}
                            {log.entityId && (
                              <span className="font-mono text-slate-400">#{log.entityId}</span>
                            )}
                          </td>
                          <td className="max-w-md truncate px-5 py-3.5 text-xs text-slate-700" title={log.details || ""}>
                            {log.details || "—"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-slate-400">
                            {log.ipAddress || "127.0.0.1"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedLog(log)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-4 text-xs text-slate-500 sm:px-6">
                <span>
                  Showing {logs.length} of {pagination.total} entries
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 font-medium hover:bg-slate-50 disabled:opacity-40"
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
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 font-medium hover:bg-slate-50 disabled:opacity-40"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-4">
          <div className="my-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Audit Log Details</h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500">Log ID</span>
                <span className="font-mono font-semibold text-slate-800">#{selectedLog.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500">Action</span>
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${getActionBadge(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500">Target Entity</span>
                <span className="font-semibold text-slate-800">
                  {selectedLog.entity || "—"} {selectedLog.entityId && `(#${selectedLog.entityId})`}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500">Operator</span>
                <span className="font-semibold text-slate-800">
                  {selectedLog.user ? `${selectedLog.user.fullName} (@${selectedLog.user.username})` : "System"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500">Timestamp</span>
                <span className="font-semibold text-slate-800">
                  {new Date(selectedLog.createdAt).toLocaleString("en-LK")}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500">Client IP Address</span>
                <span className="font-mono text-slate-800">{selectedLog.ipAddress || "127.0.0.1"}</span>
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Details Payload</span>
                <div className="mt-1.5 rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-800 break-words">
                  {selectedLog.details || "No extra payload recorded."}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
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
