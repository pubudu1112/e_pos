"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Edit2,
  Eye,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

type Customer = {
  id: number;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  creditLimit: number;
  openingBalance: number;
  isActive: boolean;
  createdAt: string;
  salesCount: number;
  jobsCount: number;
};

type CustomerDetail = Customer & {
  sales: Array<{
    id: number;
    invoiceNo: string;
    saleDate: string;
    total: number;
    paidAmount: number;
    balanceAmount: number;
    paymentStatus: string;
    status: string;
  }>;
  jobs: Array<{
    id: number;
    jobNo: string;
    title: string;
    status: string;
    priority: string;
    total: number;
    advanceAmount: number;
    balanceAmount: number;
    createdAt: string;
  }>;
  transactions: Array<{
    id: number;
    description: string;
    debit: number;
    credit: number;
    createdAt: string;
  }>;
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

export default function CustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    inactiveCustomers: 0,
    totalReceivables: 0,
  });

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomerId, setViewingCustomerId] = useState<number | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    phone: "",
    email: "",
    address: "",
    creditLimit: "",
    openingBalance: "",
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch customers
  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/customers?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCustomers(data.data || []);
        if (data.stats) setStats(data.stats);
      } else {
        toast.error(data.message || "Failed to load customers");
      }
    } catch {
      toast.error("Network error loading customers");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Load customer details
  const openCustomerDetail = async (id: number) => {
    try {
      setViewingCustomerId(id);
      setLoadingDetail(true);
      const res = await fetch(`/api/customers/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomerDetail(data.data);
      } else {
        toast.error(data.message || "Failed to load customer details");
      }
    } catch {
      toast.error("Error loading customer profile");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      code: "",
      phone: "",
      email: "",
      address: "",
      creditLimit: "0",
      openingBalance: "0",
      isActive: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      code: customer.code,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      creditLimit: String(customer.creditLimit),
      openingBalance: String(customer.openingBalance),
      isActive: customer.isActive,
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Customer name is required.");
      return;
    }

    try {
      setSubmitting(true);
      const url = editingCustomer
        ? `/api/customers/${editingCustomer.id}`
        : "/api/customers";
      const method = editingCustomer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Operation failed");
      }

      toast.success(
        editingCustomer
          ? "Customer updated successfully!"
          : "Customer registered successfully!"
      );
      setIsAddModalOpen(false);
      loadCustomers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving customer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to remove or deactivate customer "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || "Customer removed");
        loadCustomers();
      } else {
        toast.error(data.message || "Failed to remove customer");
      }
    } catch {
      toast.error("Error deleting customer");
    }
  };

  const totalFilteredCount = useMemo(() => customers.length, [customers]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-foreground">
                Customer Management
              </h1>
              <p className="text-xs text-slate-500 dark:text-muted-foreground">
                Maintain client accounts, ledger balances & sales history
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadCustomers}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card text-slate-600 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-muted/40 transition"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 dark:text-muted-foreground uppercase tracking-wider">
            Total Customers
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-foreground">{stats.totalCustomers}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-4 shadow-sm">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
            Active Accounts
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-400">{stats.activeCustomers}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-4 shadow-sm">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
            Total Receivables
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-foreground">
            {formatRs(stats.totalReceivables)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 dark:text-muted-foreground uppercase tracking-wider">
            Filtered Shown
          </p>
          <p className="mt-1 text-2xl font-black text-slate-700 dark:text-slate-300">{totalFilteredCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, customer code (CUST-0001), phone, or email..."
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50/60 dark:bg-muted/40 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-foreground outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-card focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card px-3 text-xs font-bold text-slate-700 dark:text-foreground outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card shadow-sm">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-2 text-xs font-semibold">Loading customer records...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-muted text-slate-400">
              <UserRound className="h-7 w-7" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-800 dark:text-foreground">No customers found</p>
            <p className="text-xs text-slate-400 dark:text-muted-foreground mt-1 max-w-xs">
              No matching customers. Try adjusting search or click &quot;Add Customer&quot; above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 dark:border-border bg-slate-50/80 dark:bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                <tr>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Address</th>
                  <th className="py-3.5 px-4 text-right">Credit Limit</th>
                  <th className="py-3.5 px-4 text-right">Balance</th>
                  <th className="py-3.5 px-4 text-center">Orders</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-border/60 font-medium text-slate-700 dark:text-slate-200">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-muted/30 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-foreground">{c.name}</p>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-muted-foreground">{c.code}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5 text-[11px]">
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-muted-foreground">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span className="truncate max-w-[140px]">{c.email}</span>
                          </div>
                        )}
                        {!c.phone && !c.email && <span className="text-slate-300 dark:text-slate-600">-</span>}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-500 dark:text-muted-foreground">
                      {c.address ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="line-clamp-1 max-w-[150px]">{c.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-foreground">
                      {formatRs(c.creditLimit)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-bold ${
                          c.openingBalance > 0
                            ? "text-rose-600 dark:text-rose-400"
                            : c.openingBalance < 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {formatRs(c.openingBalance)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex gap-1.5 text-[10px]">
                        <span className="rounded bg-slate-100 dark:bg-muted px-1.5 py-0.5 font-bold text-slate-700 dark:text-slate-300" title="Sales">
                          {c.salesCount} S
                        </span>
                        <span className="rounded bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 font-bold text-blue-700 dark:text-blue-300" title="Jobs">
                          {c.jobsCount} J
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.isActive
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : "bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground border border-slate-200 dark:border-border"
                        }`}
                      >
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openCustomerDetail(c.id)}
                          className="rounded-lg p-1.5 text-slate-500 dark:text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition"
                          title="View Ledger & History"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="rounded-lg p-1.5 text-slate-500 dark:text-muted-foreground hover:bg-slate-100 dark:hover:bg-muted hover:text-slate-800 dark:hover:text-foreground transition"
                          title="Edit Customer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id, c.name)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition"
                          title="Remove Customer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-border px-6 py-4">
              <h3 className="text-base font-black text-slate-900 dark:text-foreground">
                {editingCustomer ? "Edit Customer Details" : "Register New Customer"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Full Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Pubudu Printing Services"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-xs font-semibold text-slate-900 dark:text-foreground focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Customer Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Auto generated if empty"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-xs font-semibold text-slate-900 dark:text-foreground focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 0771234567"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-xs font-semibold text-slate-900 dark:text-foreground focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. customer@gmail.com"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-xs font-semibold text-slate-900 dark:text-foreground focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Postal / Shop Address</label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. No. 12, Main Street, Colombo 03"
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 p-2.5 text-xs font-semibold text-slate-900 dark:text-foreground focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Credit Limit (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    placeholder="0.00"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-xs font-semibold text-slate-900 dark:text-foreground focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Opening Balance (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    placeholder="0.00"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-xs font-semibold text-slate-900 dark:text-foreground focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Customer account is active
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-border pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-border py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-muted/40 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-black text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-50 transition"
                >
                  {submitting ? "Saving..." : editingCustomer ? "Update Customer" : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Profile & Transaction Ledger Modal */}
      {viewingCustomerId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-border px-6 py-4 bg-slate-50/80 dark:bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-foreground">
                    {customerDetail ? customerDetail.name : "Customer Profile"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground font-mono">
                    {customerDetail?.code} • Tel: {customerDetail?.phone || "No phone"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingCustomerId(null);
                  setCustomerDetail(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-muted transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {loadingDetail || !customerDetail ? (
                <div className="flex h-64 items-center justify-center text-slate-400">
                  <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  {/* Account Summary Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/30 p-3">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-muted-foreground uppercase">Balance Due</p>
                      <p className="mt-1 text-lg font-black text-rose-600 dark:text-rose-400">
                        {formatRs(customerDetail.openingBalance)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/30 p-3">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-muted-foreground uppercase">Credit Limit</p>
                      <p className="mt-1 text-lg font-black text-slate-800 dark:text-foreground">
                        {formatRs(customerDetail.creditLimit)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/30 p-3">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-muted-foreground uppercase">Lifetime Sales</p>
                      <p className="mt-1 text-lg font-black text-blue-600 dark:text-blue-400">
                        {customerDetail.sales.length} Orders
                      </p>
                    </div>
                  </div>

                  {/* Recent Invoices Table */}
                  <div>
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                      <Receipt className="h-4 w-4 text-slate-400" />
                      <span>Recent Sales & Invoices</span>
                    </h4>

                    {customerDetail.sales.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-muted-foreground italic">No sales recorded yet.</p>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-border text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-muted/40 font-bold text-slate-500 dark:text-muted-foreground border-b border-slate-200 dark:border-border">
                            <tr>
                              <th className="p-2.5">Invoice</th>
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5 text-right">Total</th>
                              <th className="p-2.5 text-right">Paid</th>
                              <th className="p-2.5 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-border/60">
                            {customerDetail.sales.map((s) => (
                              <tr key={s.id}>
                                <td className="p-2.5 font-bold font-mono text-slate-900 dark:text-foreground">
                                  {s.invoiceNo}
                                </td>
                                <td className="p-2.5 text-slate-500 dark:text-muted-foreground">
                                  {new Date(s.saleDate).toLocaleDateString("en-LK")}
                                </td>
                                <td className="p-2.5 text-right font-bold text-slate-900 dark:text-foreground">
                                  {formatRs(s.total)}
                                </td>
                                <td className="p-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {formatRs(s.paidAmount)}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className="rounded bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                    {s.paymentStatus}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Recent Jobs */}
                  <div>
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                      <BriefcaseBusiness className="h-4 w-4 text-slate-400" />
                      <span>Print & Binding Jobs</span>
                    </h4>

                    {customerDetail.jobs.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-muted-foreground italic">No custom print jobs recorded.</p>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-border text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-muted/40 font-bold text-slate-500 dark:text-muted-foreground border-b border-slate-200 dark:border-border">
                            <tr>
                              <th className="p-2.5">Job No</th>
                              <th className="p-2.5">Title</th>
                              <th className="p-2.5">Status</th>
                              <th className="p-2.5 text-right">Total</th>
                              <th className="p-2.5 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-border/60">
                            {customerDetail.jobs.map((j) => (
                              <tr key={j.id}>
                                <td className="p-2.5 font-bold font-mono text-slate-900 dark:text-foreground">{j.jobNo}</td>
                                <td className="p-2.5 text-slate-700 dark:text-slate-200 font-semibold">{j.title}</td>
                                <td className="p-2.5">
                                  <span className="rounded bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                                    {j.status}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-bold text-slate-900 dark:text-foreground">
                                  {formatRs(j.total)}
                                </td>
                                <td className="p-2.5 text-right text-amber-600 dark:text-amber-400 font-semibold">
                                  {formatRs(j.balanceAmount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-border px-6 py-3 bg-slate-50 dark:bg-muted/30 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setViewingCustomerId(null);
                  setCustomerDetail(null);
                }}
                className="rounded-xl bg-slate-900 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition"
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

