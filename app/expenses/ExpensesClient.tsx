"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  DollarSign,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";

type ExpenseCategory = {
  id: number;
  name: string;
  description: string | null;
  _count?: { expense: number };
};

type PaymentMethod = {
  id: number;
  name: string;
  type: string;
};

type Expense = {
  id: number;
  expenseNo: string;
  description: string;
  amount: number;
  expenseDate: string;
  status: "ACTIVE" | "CANCELLED";
  category: { id: number; name: string } | null;
  createdBy: { id: number; fullName: string; username: string } | null;
  paymentMethod: { id: number; name: string; type: string } | null;
};

type ExpenseSummary = {
  totalFiltered: number;
  monthlyTotal: number;
  todayTotal: number;
  count: number;
  categoryTotals: Record<string, number>;
};

function formatPrice(val: number) {
  return new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function ExpensesClient() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    totalFiltered: 0,
    monthlyTotal: 0,
    todayTotal: 0,
    count: 0,
    categoryTotals: {},
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modals
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form State
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formPaymentMethod, setFormPaymentMethod] = useState("");

  // New Category Form State
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/expenses/categories");
      const json = await res.json();
      if (json.success) {
        setCategories(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }, []);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const res = await fetch("/api/payment-methods");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setPaymentMethods(json.data || []);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchExpensesData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedCategory !== "ALL") params.set("categoryId", selectedCategory);
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setExpenses(json.data || []);
        setSummary(json.summary || {
          totalFiltered: 0,
          monthlyTotal: 0,
          todayTotal: 0,
          count: 0,
          categoryTotals: {},
        });
      } else {
        toast.error(json.message || "Failed to load expenses");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while loading expenses");
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedStatus, dateFrom, dateTo]);

  useEffect(() => {
    loadCategories();
    loadPaymentMethods();
  }, [loadCategories, loadPaymentMethods]);

  useEffect(() => {
    fetchExpensesData();
  }, [fetchExpensesData]);

  function handleManualRefresh() {
    setLoading(true);
    fetchExpensesData();
    loadCategories();
  }

  // Open modal for Create
  function openCreateModal() {
    setEditingExpense(null);
    setFormCategory(categories[0]?.id ? String(categories[0].id) : "");
    setFormDescription("");
    setFormAmount("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormPaymentMethod(paymentMethods[0]?.id ? String(paymentMethods[0].id) : "");
    setExpenseModalOpen(true);
  }

  // Open modal for Edit
  function openEditModal(exp: Expense) {
    setEditingExpense(exp);
    setFormCategory(exp.category ? String(exp.category.id) : "");
    setFormDescription(exp.description);
    setFormAmount(String(exp.amount));
    setFormDate(exp.expenseDate.split("T")[0]);
    setFormPaymentMethod(exp.paymentMethod ? String(exp.paymentMethod.id) : "");
    setExpenseModalOpen(true);
  }

  // Submit Expense (Create or Edit)
  async function handleSubmitExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!formCategory) {
      toast.error("Please select an expense category");
      return;
    }
    if (!formDescription.trim()) {
      toast.error("Please enter a description");
      return;
    }
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    try {
      setSubmitting(true);
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : "/api/expenses";
      const method = editingExpense ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: formCategory,
          description: formDescription,
          amount: amt,
          expenseDate: formDate,
          paymentMethodId: formPaymentMethod || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to save expense");
        return;
      }

      toast.success(editingExpense ? "Expense updated" : "Expense recorded successfully");
      setExpenseModalOpen(false);
      handleManualRefresh();
    } catch {
      toast.error("Network error while saving expense");
    } finally {
      setSubmitting(false);
    }
  }

  // Delete Expense
  async function handleDeleteExpense(id: number) {
    if (!confirm("Are you sure you want to delete this expense record?")) return;

    try {
      setDeletingId(id);
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to delete expense");
        return;
      }

      toast.success("Expense deleted successfully");
      handleManualRefresh();
    } catch {
      toast.error("Failed to delete expense");
    } finally {
      setDeletingId(null);
    }
  }

  // Create New Category
  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/expenses/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), description: newCatDesc.trim() }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to create category");
        return;
      }

      toast.success("Category created");
      setNewCatName("");
      setNewCatDesc("");
      loadCategories();
    } catch {
      toast.error("Failed to create category");
    } finally {
      setSubmitting(false);
    }
  }

  const topCategoryEntry = Object.entries(summary.categoryTotals).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <WalletCards className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expenses</h1>
                <p className="text-sm text-slate-500">Track and manage operational business expenses</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCategoryModalOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card px-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-muted"
            >
              <Tag className="h-4 w-4 text-slate-500 dark:text-muted-foreground" />
              <span>Categories</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">This Month</span>
              <DollarSign className="h-4 w-4 text-rose-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-foreground">
              Rs. {formatPrice(summary.monthlyTotal)}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-muted-foreground">Total monthly operating outflow</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Today</span>
              <Calendar className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-foreground">
              Rs. {formatPrice(summary.todayTotal)}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-muted-foreground">Logged since 12:00 AM</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Filtered Total</span>
              <WalletCards className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-foreground">
              Rs. {formatPrice(summary.totalFiltered)}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-muted-foreground">{expenses.length} records matching search</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Top Category</span>
              <Tag className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="mt-2 truncate text-xl font-bold text-slate-900 dark:text-foreground">
              {topCategoryEntry ? topCategoryEntry[0] : "—"}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-muted-foreground">
              {topCategoryEntry ? `Rs. ${formatPrice(topCategoryEntry[1])}` : "No expenses recorded"}
            </p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by expense #, description..."
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted/40 pl-10 pr-4 text-sm text-slate-900 dark:text-foreground placeholder-slate-400 focus:border-primary focus:bg-white dark:focus:bg-card focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm focus:border-primary focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm focus:border-primary focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm focus:border-primary focus:outline-none"
              title="From date"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm focus:border-primary focus:outline-none"
              title="To date"
            />

            {(search || selectedCategory !== "ALL" || selectedStatus !== "ALL" || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("ALL");
                  setSelectedStatus("ALL");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 dark:border-border px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-muted"
              >
                Clear
              </button>
            )}

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-border text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-muted disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm font-medium">Loading expenses...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <WalletCards className="h-12 w-12 stroke-[1.2]" />
              <p className="mt-3 text-base font-semibold text-slate-700 dark:text-slate-200">No expenses found</p>
              <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">Record your business operating costs to track profit.</p>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                <span>Record Expense</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-100 dark:border-border bg-slate-50/75 dark:bg-muted/40 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5">Expense #</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5">Payment</th>
                    <th className="px-5 py-3.5 text-right">Amount (LKR)</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-border">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-muted/30">
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-semibold text-slate-900 dark:text-foreground">
                        {exp.expenseNo}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-muted-foreground">
                        {formatDate(exp.expenseDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-muted px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <Tag className="h-3 w-3 text-slate-400" />
                          {exp.category?.name || "General"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="max-w-xs truncate font-medium text-slate-800 dark:text-slate-200" title={exp.description}>
                          {exp.description}
                        </p>
                        {exp.createdBy && (
                          <p className="text-xs text-slate-400 dark:text-muted-foreground">by {exp.createdBy.fullName}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-slate-600 dark:text-muted-foreground">
                        {exp.paymentMethod?.name || "Cash"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-mono font-bold text-slate-900 dark:text-foreground">
                        Rs. {formatPrice(exp.amount)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            exp.status === "ACTIVE"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {exp.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(exp)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-muted hover:text-slate-700 dark:hover:text-foreground"
                            title="Edit Expense"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id)}
                            disabled={deletingId === exp.id}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-50"
                            title="Delete Expense"
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
      </div>

      {/* ADD / EDIT EXPENSE MODAL */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card text-slate-900 dark:text-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-border px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-foreground">
                  {editingExpense ? "Edit Expense" : "Record New Expense"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-muted-foreground">
                  {editingExpense ? editingExpense.expenseNo : "Enter details of the shop expense"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-muted hover:text-slate-600 dark:hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Category *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm text-slate-800 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Description / Note *
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. 5 Reams of Double A A4 Paper 80GSM, Ceylon Electricity Board bill"
                  className="h-20 w-full resize-none rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 p-3 text-sm text-slate-800 dark:text-foreground placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Amount (Rs.) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      Rs.
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 pl-11 pr-3 text-sm font-semibold text-slate-900 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-sm text-slate-800 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Payment Method
                </label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm text-slate-800 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Cash (Default)</option>
                  {paymentMethods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-border pt-4">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{editingExpense ? "Update Expense" : "Save Expense"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE CATEGORIES MODAL */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card text-slate-900 dark:text-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-border px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-foreground">Expense Categories</h3>
                <p className="text-xs text-slate-500 dark:text-muted-foreground">Add or review expense classification groups</p>
              </div>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-muted hover:text-slate-600 dark:hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* Add Category Form */}
              <form onSubmit={handleCreateCategory} className="rounded-xl border border-slate-100 dark:border-border bg-slate-50 dark:bg-muted/40 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Add New Category</p>
                <div className="mt-2.5 space-y-2.5">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Category Name (e.g. Courier & Delivery)"
                    className="h-10 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card px-3 text-sm text-slate-900 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Short description (optional)"
                    className="h-10 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card px-3 text-sm text-slate-900 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-primary text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:hover:bg-primary/90 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    <span>Add Category</span>
                  </button>
                </div>
              </form>

              {/* Categories List */}
              <div className="max-h-64 overflow-y-auto pr-1">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                  Existing Categories ({categories.length})
                </p>
                <div className="divide-y divide-slate-100 dark:divide-border rounded-xl border border-slate-100 dark:border-border">
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 text-sm">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</p>
                        {c.description && <p className="text-xs text-slate-400 dark:text-muted-foreground">{c.description}</p>}
                      </div>
                      <span className="rounded-full bg-slate-100 dark:bg-muted px-2 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {c._count?.expense || 0} expenses
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-100 dark:border-border pt-3">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="rounded-xl bg-slate-100 dark:bg-muted px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-muted/80"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
