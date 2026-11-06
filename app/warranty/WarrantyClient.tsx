"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Clock,
  Wrench,
  AlertCircle,
  FileCheck,
  Smartphone,
  Phone,
  Receipt,
  User,
  Calendar,
  Copy,
  Check,
  Plus,
  Eye,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================
// TYPES
// ============================================================

type WarrantyClaim = {
  id: number;
  claimNo: string;
  warrantyId: number;
  issue: string;
  actionTaken: string | null;
  status: "PENDING" | "IN_PROGRESS" | "REPLACED" | "REPAIRED" | "REJECTED" | "RESOLVED";
  claimDate: string;
  resolvedDate: string | null;
  handledBy: string | null;
};

type WarrantyItem = {
  id: number;
  warrantyCode: string;
  saleId: number;
  productId: number;
  customerId: number | null;
  customerName: string;
  customerPhone: string | null;
  startDate: string;
  durationMonths: number;
  expiryDate: string;
  status: "ACTIVE" | "EXPIRED" | "CLAIMED" | "VOID";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  diffDays: number;
  product: {
    id: number;
    code: string;
    name: string;
    sellingPrice: number;
    category: {
      id: number;
      name: string;
    } | null;
    unit: {
      shortName: string;
    } | null;
  } | null;
  sale: {
    id: number;
    invoiceNo: string;
    createdAt: string;
    paymentMethod: string;
    total: number;
  } | null;
  customer: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  claims: WarrantyClaim[];
};

type WarrantyStats = {
  totalWarranties: number;
  activeWarranties: number;
  expiredWarranties: number;
  claimedWarranties: number;
  pendingClaims: number;
};

function formatRs(amount: number): string {
  return "Rs. " + Number(amount || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-LK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function WarrantyClient() {
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [stats, setStats] = useState<WarrantyStats>({
    totalWarranties: 0,
    activeWarranties: 0,
    expiredWarranties: 0,
    claimedWarranties: 0,
    pendingClaims: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "EXPIRED" | "CLAIMED" | "VOID">("ALL");

  // Claim Modal State
  const [claimModalWarranty, setClaimModalWarranty] = useState<WarrantyItem | null>(null);
  const [claimIssue, setClaimIssue] = useState("");
  const [claimActionTaken, setClaimActionTaken] = useState("");
  const [claimStatus, setClaimStatus] = useState<string>("PENDING");
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Detail Modal State
  const [detailModalWarranty, setDetailModalWarranty] = useState<WarrantyItem | null>(null);

  // Copied code feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  /* ============================================================
     FETCH WARRANTIES FROM API
  ============================================================ */

  async function loadWarranties() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/warranty?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load warranties.");
      }

      setWarranties(data.data || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error("LOAD WARRANTIES ERROR:", err);
      toast.error(err.message || "Could not load warranties.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWarranties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadWarranties();
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  }

  /* ============================================================
     CLAIM SUBMISSION
  ============================================================ */

  function openClaimModal(w: WarrantyItem) {
    setClaimModalWarranty(w);
    setClaimIssue("");
    setClaimActionTaken("");
    setClaimStatus("PENDING");
  }

  async function handleSaveClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!claimModalWarranty) return;

    if (!claimIssue.trim()) {
      toast.error("Please describe the customer's defect or complaint.");
      return;
    }

    try {
      setSubmittingClaim(true);
      const res = await fetch("/api/warranty/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warrantyId: claimModalWarranty.id,
          issue: claimIssue.trim(),
          actionTaken: claimActionTaken.trim() || null,
          status: claimStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to record warranty claim.");
      }

      toast.success(data.message || "Claim recorded successfully!");
      setClaimModalWarranty(null);
      loadWarranties();
    } catch (err: any) {
      console.error("CLAIM ERROR:", err);
      toast.error(err.message || "Could not record claim.");
    } finally {
      setSubmittingClaim(false);
    }
  }

  /* ============================================================
     FILTERED WARRANTIES LIST
  ============================================================ */

  const filteredWarranties = useMemo(() => {
    return warranties;
  }, [warranties]);

  return (
    <div className="flex-1 space-y-5 p-4 sm:p-6 lg:p-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Warranty &amp; Protection Management
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Phone Accessories, Cables, Chargers &amp; Devices Warranty Tracking &amp; Customer Claims
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadWarranties()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-card px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-muted dark:border-slate-800 dark:text-slate-300 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        {/* Active Warranties */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-2xs dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              Active Protection
            </span>
            <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-900 dark:text-emerald-200">
            {stats.activeWarranties}
          </div>
          <p className="mt-0.5 text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
            Items under valid coverage
          </p>
        </div>

        {/* Expired Warranties */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Expired
            </span>
            <div className="rounded-lg bg-slate-200 p-1.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
            {stats.expiredWarranties}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Warranty period ended
          </p>
        </div>

        {/* Open Claims */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-2xs dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
              Pending Claims
            </span>
            <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-200">
            {stats.pendingClaims}
          </div>
          <p className="mt-0.5 text-[11px] text-amber-700/80 dark:text-amber-400/80">
            Awaiting inspection or repair
          </p>
        </div>

        {/* Total Issued */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-2xs dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">
              Total Issued
            </span>
            <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-900 dark:text-blue-200">
            {stats.totalWarranties}
          </div>
          <p className="mt-0.5 text-[11px] text-blue-700/80 dark:text-blue-400/80">
            All-time customer warranties
          </p>
        </div>
      </div>

      {/* SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Invoice No (INV-...), Phone No, Warranty Code (WAR-...), or Customer Name..."
              className="w-full rounded-xl border bg-background py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground shadow-2xs hover:opacity-90 transition"
          >
            Search
          </button>
        </form>

        {/* STATUS TABS */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1">Status:</span>
          {(["ALL", "ACTIVE", "EXPIRED", "CLAIMED", "VOID"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                statusFilter === st
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {st === "ALL" ? "All Warranties" : st}
            </button>
          ))}
        </div>
      </div>

      {/* WARRANTIES TABLE & LIST */}
      <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">Warranty Code</th>
                <th className="px-4 py-3">Product / Phone Accessory</th>
                <th className="px-4 py-3">Customer Details</th>
                <th className="px-4 py-3">Invoice &amp; Purchase</th>
                <th className="px-4 py-3">Coverage Duration</th>
                <th className="px-4 py-3">Remaining Days</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin mb-2 text-primary" />
                    Loading warranty records...
                  </td>
                </tr>
              ) : filteredWarranties.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <ShieldCheck className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No warranty records found.</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Issue warranties directly from the POS when customers purchase phone accessories, chargers, or devices.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredWarranties.map((w) => {
                  const hasClaims = w.claims.length > 0;

                  return (
                    <tr key={w.id} className="hover:bg-muted/30 transition">
                      {/* Warranty Code */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-xs">
                            {w.warrantyCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(w.warrantyCode)}
                            className="text-muted-foreground hover:text-primary transition"
                            title="Copy warranty code"
                          >
                            {copiedCode === w.warrantyCode ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        {w.notes && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[140px] mt-0.5">
                            {w.notes}
                          </div>
                        )}
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Smartphone className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate max-w-[180px]">{w.product?.name ?? "Product Item"}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {w.product?.category?.name || "Accessory"} • {w.product?.code}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>{w.customerName}</span>
                        </div>
                        {w.customerPhone ? (
                          <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                            <Phone className="h-2.5 w-2.5" />
                            <span>{w.customerPhone}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground mt-0.5">No phone provided</div>
                        )}
                      </td>

                      {/* Invoice & Date */}
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <Receipt className="h-3 w-3 text-slate-400" />
                          <span>{w.sale?.invoiceNo ?? `Sale #${w.saleId}`}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDate(w.startDate)}
                        </div>
                      </td>

                      {/* Coverage Duration */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-800 border border-emerald-200 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                          {w.durationMonths} Months
                        </span>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Until {formatDate(w.expiryDate)}
                        </div>
                      </td>

                      {/* Remaining Days */}
                      <td className="px-4 py-3.5">
                        {w.diffDays > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <Clock className="h-3 w-3" />
                            {w.diffDays} days left
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Expired {Math.abs(w.diffDays)}d ago
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            w.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : w.status === "CLAIMED"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                              : w.status === "EXPIRED"
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                          }`}
                        >
                          {w.status}
                        </span>

                        {hasClaims && (
                          <div className="mt-1">
                            <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 dark:bg-amber-950/50 dark:border-amber-900 dark:text-amber-300">
                              {w.claims.length} Claim{w.claims.length > 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openClaimModal(w)}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 transition"
                            title="Lodge customer warranty claim"
                          >
                            <Wrench className="h-3 w-3" />
                            Claim
                          </button>

                          <button
                            type="button"
                            onClick={() => setDetailModalWarranty(w)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-muted dark:text-slate-300 transition"
                            title="View full certificate & claims history"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================
          LODGE / FILE WARRANTY CLAIM MODAL
      ============================================================ */}

      {claimModalWarranty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border bg-background shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="shrink-0 border-b border-border p-4 bg-card flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-100 p-1.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Record Customer Warranty Claim</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Code: <strong className="font-mono text-slate-900 dark:text-slate-100">{claimModalWarranty.warrantyCode}</strong> • {claimModalWarranty.customerName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setClaimModalWarranty(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClaim} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Product & Validity Preview */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/50 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product:</span>
                  <span className="font-bold">{claimModalWarranty.product?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice:</span>
                  <span className="font-mono font-semibold">{claimModalWarranty.sale?.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valid Period:</span>
                  <span className="font-semibold">{formatDate(claimModalWarranty.startDate)} - {formatDate(claimModalWarranty.expiryDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coverage Status:</span>
                  <span className={`font-bold ${claimModalWarranty.diffDays > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {claimModalWarranty.diffDays > 0 ? `${claimModalWarranty.diffDays} days remaining` : "Warranty Expired"}
                  </span>
                </div>
              </div>

              {/* Defect Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Customer Issue / Defect Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={claimIssue}
                  onChange={(e) => setClaimIssue(e.target.value)}
                  placeholder="e.g. Device not charging, cable connector loose, earphones sound distortion..."
                  className="w-full rounded-xl border bg-background p-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              {/* Resolution Action */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Action Taken / Resolution Notes
                </label>
                <input
                  type="text"
                  value={claimActionTaken}
                  onChange={(e) => setClaimActionTaken(e.target.value)}
                  placeholder="e.g. Replaced with brand new unit, Tested and repaired pin, Sent to supplier"
                  className="w-full rounded-xl border bg-background p-2.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              {/* Claim Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Claim Status
                </label>
                <select
                  value={claimStatus}
                  onChange={(e) => setClaimStatus(e.target.value)}
                  className="w-full rounded-xl border bg-background p-2.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  <option value="PENDING">PENDING - Awaiting technician inspection</option>
                  <option value="IN_PROGRESS">IN_PROGRESS - Sent to service center</option>
                  <option value="REPLACED">REPLACED - Unit replaced with new stock</option>
                  <option value="REPAIRED">REPAIRED - Item repaired &amp; returned</option>
                  <option value="RESOLVED">RESOLVED - Complaint resolved</option>
                  <option value="REJECTED">REJECTED - Physical or water damage</option>
                </select>
              </div>

              <div className="shrink-0 border-t border-border pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setClaimModalWarranty(null)}
                  className="rounded-xl border px-4 py-2 text-xs font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim}
                  className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
                >
                  {submittingClaim ? "Saving..." : "Record Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW WARRANTY DETAILS & CLAIMS HISTORY MODAL
      ============================================================ */}

      {detailModalWarranty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border bg-background shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="shrink-0 border-b border-border p-4 bg-card flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Warranty Certificate Details</h2>
                  <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                    {detailModalWarranty.warrantyCode}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalWarranty(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Certificate Card */}
              <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20 text-xs space-y-2">
                <div className="flex justify-between border-b border-emerald-200 pb-2 dark:border-emerald-900">
                  <span className="text-muted-foreground">Product:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{detailModalWarranty.product?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-bold">{detailModalWarranty.customerName}</span>
                </div>
                {detailModalWarranty.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone Number:</span>
                    <span className="font-mono font-bold text-emerald-700">{detailModalWarranty.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Reference:</span>
                  <span className="font-mono font-bold">{detailModalWarranty.sale?.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Warranty Period:</span>
                  <span className="font-bold">{detailModalWarranty.durationMonths} Months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issue Date:</span>
                  <span>{formatDate(detailModalWarranty.startDate)}</span>
                </div>
                <div className="flex justify-between border-t border-emerald-200 pt-2 dark:border-emerald-900">
                  <span className="font-bold">Expires On:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatDate(detailModalWarranty.expiryDate)}</span>
                </div>
              </div>

              {/* Claims History */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-primary" />
                  Claims &amp; Customer Complaints ({detailModalWarranty.claims.length})
                </h3>

                {detailModalWarranty.claims.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No claims lodged yet. This warranty is currently in good standing.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {detailModalWarranty.claims.map((claim) => (
                      <div key={claim.id} className="rounded-xl border border-border bg-card p-3 text-xs space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{claim.claimNo}</span>
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            {claim.status}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">
                          <strong>Issue:</strong> {claim.issue}
                        </p>
                        {claim.actionTaken && (
                          <p className="text-muted-foreground text-[11px]">
                            <strong>Resolution:</strong> {claim.actionTaken}
                          </p>
                        )}
                        <div className="text-[10px] text-muted-foreground flex justify-between pt-1 border-t border-border mt-1">
                          <span>Lodged: {formatDate(claim.claimDate)}</span>
                          {claim.handledBy && <span>By: {claim.handledBy}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-border p-4 bg-muted/40 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModalWarranty(null)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
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
