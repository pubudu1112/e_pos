"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  Loader2,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

type JobStatus =
  | "NEW"
  | "DESIGNING"
  | "WAITING_APPROVAL"
  | "APPROVED"
  | "PRINTING"
  | "FINISHING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

type JobPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

type Job = {
  id: number;
  jobNo: string;
  title: string;
  description: string;
  status: JobStatus;
  priority: JobPriority;
  startDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  total: number;
  advanceAmount: number;
  balanceAmount: number;
  createdAt: string;
  customer?: { id: number; name: string; phone: string | null; code: string } | null;
  createdBy?: { id: number; fullName: string; username: string } | null;
  assignedTo?: { id: number; fullName: string; username: string } | null;
  itemsCount: number;
  items: Array<{
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  payments: Array<{
    id: number;
    amount: number;
    paymentDate: string;
    reference: string;
    note: string;
  }>;
};

type Dropdowns = {
  users: Array<{ id: number; fullName: string; username: string }>;
  customers: Array<{ id: number; name: string; phone: string | null; code: string }>;
  services: Array<{ id: number; name: string; code: string; basePrice: number }>;
};

function formatRs(amount: number) {
  return (
    "Rs. " +
    amount.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  NEW: { label: "New Order", bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-300" },
  DESIGNING: { label: "Designing", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  WAITING_APPROVAL: { label: "Waiting Approval", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  APPROVED: { label: "Approved", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  PRINTING: { label: "Printing", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  FINISHING: { label: "Finishing / Binding", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  READY: { label: "Ready for Pickup", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
  DELIVERED: { label: "Delivered", bg: "bg-slate-900", text: "text-white", border: "border-slate-900" },
  CANCELLED: { label: "Cancelled", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

const PRIORITY_CONFIG: Record<
  JobPriority,
  { label: string; badge: string }
> = {
  LOW: { label: "Low", badge: "bg-slate-100 text-slate-600" },
  NORMAL: { label: "Normal", badge: "bg-blue-50 text-blue-700" },
  HIGH: { label: "High", badge: "bg-amber-50 text-amber-700 font-bold" },
  URGENT: { label: "Urgent", badge: "bg-rose-100 text-rose-800 font-black animate-pulse" },
};

export default function JobsClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    ready: 0,
    delivered: 0,
    cancelled: 0,
  });

  const [dropdowns, setDropdowns] = useState<Dropdowns>({
    users: [],
    customers: [],
    services: [],
  });

  // Modal states
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);
  const [paymentModalJob, setPaymentModalJob] = useState<Job | null>(null);
  const [statusModalJob, setStatusModalJob] = useState<Job | null>(null);

  // New Job Form
  const [jobForm, setJobForm] = useState({
    title: "",
    description: "",
    customerId: "",
    priority: "NORMAL" as JobPriority,
    assignedToId: "",
    dueDate: "",
    advanceAmount: "",
    paymentReference: "",
    items: [{ serviceId: "", description: "", quantity: 1, unitPrice: 0 }],
  });
  const [submittingJob, setSubmittingJob] = useState(false);

  // Quick Payment form
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Status Change form
  const [newStatus, setNewStatus] = useState<JobStatus>("READY");
  const [statusNote, setStatusNote] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Fetch Jobs
  const loadJobs = useCallback(async () => {
    try {
      // loading is true by default
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);

      const res = await fetch(`/api/jobs?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (res.ok && data.success) {
        setJobs(data.data || []);
        if (data.stats) setStats(data.stats);
        if (data.dropdowns) setDropdowns(data.dropdowns);
      } else {
        toast.error(data.message || "Failed to load jobs");
      }
    } catch {
      toast.error("Network error loading jobs");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Handle Create Job Items
  const handleAddItemRow = () => {
    setJobForm((curr) => ({
      ...curr,
      items: [...curr.items, { serviceId: "", description: "", quantity: 1, unitPrice: 0 }],
    }));
  };

  const handleRemoveItemRow = (index: number) => {
    setJobForm((curr) => ({
      ...curr,
      items: curr.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleItemChange = (
    index: number,
    field: "serviceId" | "description" | "quantity" | "unitPrice",
    value: string | number
  ) => {
    setJobForm((curr) => {
      const updated = [...curr.items];
      if (field === "serviceId") {
        const found = dropdowns.services.find((s) => s.id === Number(value));
        updated[index] = {
          ...updated[index],
          serviceId: String(value),
          description: found ? found.name : updated[index].description,
          unitPrice: found ? found.basePrice : updated[index].unitPrice,
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...curr, items: updated };
    });
  };

  const calculatedJobTotal = useMemo(() => {
    return jobForm.items.reduce((sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0);
  }, [jobForm.items]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.title.trim()) {
      toast.error("Job title is required.");
      return;
    }

    try {
      setSubmittingJob(true);
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jobForm.title.trim(),
          description: jobForm.description.trim(),
          customerId: jobForm.customerId || null,
          priority: jobForm.priority,
          assignedToId: jobForm.assignedToId || null,
          dueDate: jobForm.dueDate || null,
          advanceAmount: Number(jobForm.advanceAmount) || 0,
          paymentReference: jobForm.paymentReference.trim(),
          items: jobForm.items.filter((i) => i.description.trim() || Number(i.unitPrice) > 0),
          total: calculatedJobTotal,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create job");
      }

      toast.success(data.message || "Job created successfully!");
      setIsNewJobModalOpen(false);
      setJobForm({
        title: "",
        description: "",
        customerId: "",
        priority: "NORMAL",
        assignedToId: "",
        dueDate: "",
        advanceAmount: "",
        paymentReference: "",
        items: [{ serviceId: "", description: "", quantity: 1, unitPrice: 0 }],
      });
      loadJobs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creating job");
    } finally {
      setSubmittingJob(false);
    }
  };

  // Status Change Submit
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalJob) return;

    try {
      setSubmittingStatus(true);
      const res = await fetch(`/api/jobs/${statusModalJob.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          note: statusNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update status");
      }

      toast.success(data.message);
      setStatusModalJob(null);
      setStatusNote("");
      loadJobs();
      if (viewingJob && viewingJob.id === statusModalJob.id) {
        setViewingJob({ ...viewingJob, status: newStatus });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating status");
    } finally {
      setSubmittingStatus(false);
    }
  };

  // Payment Submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalJob) return;

    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }

    try {
      setSubmittingPayment(true);
      const res = await fetch(`/api/jobs/${paymentModalJob.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          reference: paymentRef.trim() || undefined,
          note: paymentNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to record payment");
      }

      toast.success(data.message);
      setPaymentModalJob(null);
      setPaymentAmount("");
      setPaymentRef("");
      setPaymentNote("");
      loadJobs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error processing payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Print Job Ticket
  const printJobSheet = (job: Job) => {
    const printWindow = window.open("", "_blank", "width=700,height=800");
    if (!printWindow) return;

    const itemsRows = job.items
      .map(
        (it) => `
      <tr>
        <td style="padding: 6px; border-bottom: 1px solid #ddd;">${it.description}</td>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: center;">${it.quantity}</td>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: right;">${formatRs(it.unitPrice)}</td>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${formatRs(it.total)}</td>
      </tr>
    `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${job.jobNo} - Job Sheet</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
            .title { font-size: 20px; font-weight: 900; margin: 0; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { background: #f4f4f4; padding: 6px; border-bottom: 2px solid #ccc; text-align: left; }
            .totals { margin-top: 15px; text-align: right; font-size: 14px; }
            .footer { margin-top: 30px; font-size: 11px; text-align: center; color: #666; border-top: 1px dashed #ccc; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">PUBUDU CREATIVE HUB</h1>
            <p style="margin: 2px 0; font-size: 12px;">PRINTING • BINDING • DESIGNING WORK ORDER</p>
          </div>
          <div class="meta">
            <div>
              <strong>JOB NO:</strong> ${job.jobNo}<br />
              <strong>TITLE:</strong> ${job.title}<br />
              <strong>CUSTOMER:</strong> ${job.customer ? `${job.customer.name} (${job.customer.phone || "-"})` : "Walk-in Customer"}
            </div>
            <div style="text-align: right;">
              <strong>DATE:</strong> ${new Date(job.createdAt).toLocaleDateString("en-LK")}<br />
              <strong>DUE DATE:</strong> ${job.dueDate ? new Date(job.dueDate).toLocaleDateString("en-LK") : "Open"}<br />
              <strong>PRIORITY:</strong> ${job.priority}
            </div>
          </div>
          ${job.description ? `<p style="font-size: 12px; background: #fafafa; padding: 8px; border: 1px solid #eee;"><strong>Note:</strong> ${job.description}</p>` : ""}
          <table>
            <thead>
              <tr>
                <th>Service / Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <div class="totals">
            <div>Subtotal: <strong>${formatRs(job.total)}</strong></div>
            <div style="color: green;">Advance Paid: <strong>${formatRs(job.advanceAmount)}</strong></div>
            <div style="font-size: 16px; color: ${job.balanceAmount > 0 ? "red" : "black"};">Balance Due: <strong>${formatRs(job.balanceAmount)}</strong></div>
          </div>
          <div class="footer">
            Customer Signature: _________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Staff: _________________________
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Job Tracking & Work Orders
              </h1>
              <p className="text-xs text-slate-500">
                Manage print, photocopy, binding & design jobs across production stages
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadJobs}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition"
            title="Refresh jobs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-purple-600" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsNewJobModalOpen(true)}
            className="flex h-10 items-center gap-2 rounded-xl bg-purple-600 px-4 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Work Order</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">All Jobs</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{stats.total}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">New Orders</p>
          <p className="mt-1 text-2xl font-black text-blue-700">{stats.new}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">In Production</p>
          <p className="mt-1 text-2xl font-black text-amber-700">{stats.inProgress}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Ready for Pickup</p>
          <p className="mt-1 text-2xl font-black text-emerald-700">{stats.ready}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Delivered</p>
          <p className="mt-1 text-2xl font-black text-slate-800">{stats.delivered}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by job no (JOB-202611-...), title, customer name or phone..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 text-xs font-medium text-slate-900 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-purple-500"
          >
            <option value="all">All Stages</option>
            <option value="NEW">New Order</option>
            <option value="DESIGNING">Designing</option>
            <option value="PRINTING">Printing</option>
            <option value="FINISHING">Finishing / Binding</option>
            <option value="READY">Ready for Pickup</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-purple-500"
          >
            <option value="all">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <p className="mt-2 text-xs font-semibold">Loading job records...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BriefcaseBusiness className="h-7 w-7" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-800">No jobs found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              No matching work orders. Click &quot;New Work Order&quot; to log a custom job.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4">Job Info</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Priority & Stage</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-right">Total</th>
                  <th className="py-3.5 px-4 text-right">Advance / Paid</th>
                  <th className="py-3.5 px-4 text-right">Balance</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {jobs.map((j) => {
                  const statusInfo = STATUS_CONFIG[j.status] || STATUS_CONFIG.NEW;
                  const priorityInfo = PRIORITY_CONFIG[j.priority] || PRIORITY_CONFIG.NORMAL;
                  return (
                    <tr key={j.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-xs mt-0.5">
                            <BriefcaseBusiness className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{j.title}</p>
                            <span className="font-mono text-[10px] text-slate-400">{j.jobNo}</span>
                            {j.itemsCount > 0 && (
                              <span className="ml-2 text-[10px] text-slate-500 font-semibold">
                                • {j.itemsCount} items
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {j.customer ? (
                          <div>
                            <p className="font-semibold text-slate-800">{j.customer.name}</p>
                            {j.customer.phone && (
                              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {j.customer.phone}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Walk-in</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityInfo.badge}`}>
                            {priorityInfo.label}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {j.dueDate ? (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{new Date(j.dueDate).toLocaleDateString("en-LK")}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatRs(j.total)}
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                        {formatRs(j.advanceAmount)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-black ${
                            j.balanceAmount > 0 ? "text-rose-600" : "text-slate-400"
                          }`}
                        >
                          {formatRs(j.balanceAmount)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setStatusModalJob(j);
                              setNewStatus(j.status);
                            }}
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition"
                            title="Update Job Stage / Status"
                          >
                            <Clock className="h-4 w-4" />
                          </button>

                          {j.balanceAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentModalJob(j);
                                setPaymentAmount(j.balanceAmount.toString());
                              }}
                              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition"
                              title="Collect Payment"
                            >
                              <DollarSign className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setViewingJob(j)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                            title="View Work Order Sheet"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => printJobSheet(j)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                            title="Print Work Order Ticket"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Work Order Modal */}
      {isNewJobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <div>
                <h3 className="text-base font-black text-slate-900">Create New Work Order</h3>
                <p className="text-xs text-slate-500">Record custom printing, binding, scanning or photocopy order</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewJobModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Job Title / Summary *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    placeholder="e.g. 50 Thesis Hardcover Binding with Gold Foil"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-900 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Customer</label>
                  <select
                    value={jobForm.customerId}
                    onChange={(e) => setJobForm({ ...jobForm, customerId: e.target.value })}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-900 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">Walk-in Customer</option>
                    {dropdowns.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Priority</label>
                  <select
                    value={jobForm.priority}
                    onChange={(e) => setJobForm({ ...jobForm, priority: e.target.value as JobPriority })}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-900 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent (Express)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Assigned Staff / Operator</label>
                  <select
                    value={jobForm.assignedToId}
                    onChange={(e) => setJobForm({ ...jobForm, assignedToId: e.target.value })}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-900 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {dropdowns.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Target Due Date</label>
                  <input
                    type="date"
                    value={jobForm.dueDate}
                    onChange={(e) => setJobForm({ ...jobForm, dueDate: e.target.value })}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-900 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Instructions / Notes</label>
                  <textarea
                    rows={2}
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    placeholder="Specific instructions e.g. Blue leather cover, 80gsm paper, gold embossed lettering on front & spine"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Job Items Builder */}
              <div className="border-t border-slate-200/80 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Services & Production Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {jobForm.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 bg-slate-50/50">
                      <div className="w-1/3">
                        <select
                          value={it.serviceId}
                          onChange={(e) => handleItemChange(idx, "serviceId", e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 focus:outline-none"
                        >
                          <option value="">Preset Service...</option>
                          {dropdowns.services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({formatRs(s.basePrice)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                          placeholder="Description"
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div className="w-16">
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                          placeholder="Qty"
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white text-center text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={it.unitPrice}
                          onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                          placeholder="Price"
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-right text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>

                      {jobForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Advance Deposit & Totals */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex justify-between items-center text-sm font-black text-slate-900">
                  <span>Calculated Job Total:</span>
                  <span className="text-base text-purple-700">{formatRs(calculatedJobTotal)}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Advance Deposit (Rs.)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={jobForm.advanceAmount}
                      onChange={(e) => setJobForm({ ...jobForm, advanceAmount: e.target.value })}
                      placeholder="0.00"
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Payment Reference</label>
                    <input
                      type="text"
                      value={jobForm.paymentReference}
                      onChange={(e) => setJobForm({ ...jobForm, paymentReference: e.target.value })}
                      placeholder="e.g. Cash, Slip no"
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-600 pt-1">
                  <span>Remaining Balance:</span>
                  <span className="font-bold text-rose-600">
                    {formatRs(Math.max(0, calculatedJobTotal - (Number(jobForm.advanceAmount) || 0)))}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewJobModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingJob}
                  className="flex-1 rounded-xl bg-purple-600 py-2.5 text-xs font-black text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 disabled:opacity-50 transition"
                >
                  {submittingJob ? "Creating Job..." : "Create Work Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Job Work Order Details Modal */}
      {viewingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white font-bold">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{viewingJob.title}</h3>
                  <p className="text-xs font-mono text-purple-600 font-bold">{viewingJob.jobNo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingJob(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Status & Priority Row */}
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Stage:</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_CONFIG[viewingJob.status]?.bg} ${STATUS_CONFIG[viewingJob.status]?.text}`}>
                    {STATUS_CONFIG[viewingJob.status]?.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Priority:</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${PRIORITY_CONFIG[viewingJob.priority]?.badge}`}>
                    {PRIORITY_CONFIG[viewingJob.priority]?.label}
                  </span>
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Customer</p>
                  <p className="font-bold text-slate-800 mt-0.5">{viewingJob.customer?.name || "Walk-in"}</p>
                  {viewingJob.customer?.phone && (
                    <p className="text-[10px] text-slate-500">{viewingJob.customer.phone}</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Target Due Date</p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {viewingJob.dueDate ? new Date(viewingJob.dueDate).toLocaleDateString("en-LK") : "Open"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Operator</p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {viewingJob.assignedTo?.fullName || "Unassigned"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Created On</p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {new Date(viewingJob.createdAt).toLocaleDateString("en-LK")}
                  </p>
                </div>
              </div>

              {viewingJob.description && (
                <div className="rounded-xl border border-slate-200 bg-amber-50/50 p-3.5 text-xs">
                  <p className="font-bold text-amber-900 mb-1">Production Instructions:</p>
                  <p className="text-slate-700 leading-relaxed">{viewingJob.description}</p>
                </div>
              )}

              {/* Items List */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                  Work Order Items
                </h4>
                <div className="overflow-hidden rounded-xl border border-slate-200 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                      <tr>
                        <th className="p-2.5">Item / Service</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Price</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingJob.items.map((it) => (
                        <tr key={it.id}>
                          <td className="p-2.5 font-bold text-slate-800">{it.description}</td>
                          <td className="p-2.5 text-center">{it.quantity}</td>
                          <td className="p-2.5 text-right">{formatRs(it.unitPrice)}</td>
                          <td className="p-2.5 text-right font-bold">{formatRs(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Job Total</span>
                  <span className="font-black text-slate-900 text-sm">{formatRs(viewingJob.total)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Advance / Payments Received</span>
                  <span>{formatRs(viewingJob.advanceAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-sm">
                  <span>Balance Due</span>
                  <span className={viewingJob.balanceAmount > 0 ? "text-rose-600" : "text-emerald-700"}>
                    {formatRs(viewingJob.balanceAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-3 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => printJobSheet(viewingJob)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
              >
                <Printer className="h-4 w-4 text-purple-600" />
                <span>Print Ticket</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStatusModalJob(viewingJob);
                    setNewStatus(viewingJob.status);
                  }}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 transition"
                >
                  Change Stage
                </button>
                <button
                  type="button"
                  onClick={() => setViewingJob(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Stage / Status Modal */}
      {statusModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleStatusSubmit}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">
                Update Job Stage - {statusModalJob.jobNo}
              </h3>
              <button
                type="button"
                onClick={() => setStatusModalJob(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Production Stage</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as JobStatus)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-800 focus:border-purple-500 focus:outline-none"
              >
                <option value="NEW">New Order</option>
                <option value="DESIGNING">Designing</option>
                <option value="WAITING_APPROVAL">Waiting Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="PRINTING">Printing</option>
                <option value="FINISHING">Finishing / Binding</option>
                <option value="READY">Ready for Pickup</option>
                <option value="DELIVERED">Delivered to Customer</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Stage Transition Note</label>
              <textarea
                rows={2}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="e.g. Printing completed, now moved to spiral binding"
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusModalJob(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingStatus}
                className="flex-1 rounded-xl bg-purple-600 py-2.5 text-xs font-black text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 disabled:opacity-50"
              >
                {submittingStatus ? "Saving..." : "Update Stage"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Collect Balance Payment Modal */}
      {paymentModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handlePaymentSubmit}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Collect Job Balance</h3>
                <p className="text-xs text-slate-500 font-mono">{paymentModalJob.jobNo}</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalJob(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">Remaining Balance:</span>
              <span className="font-black text-rose-600 text-sm">{formatRs(paymentModalJob.balanceAmount)}</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Payment Amount (Rs.) *</label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-900 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Payment Reference</label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="e.g. Cash receipt, Card slip no"
                className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-900 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Note</label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Final payment on collection"
                className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-900 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalJob(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingPayment}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {submittingPayment ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

