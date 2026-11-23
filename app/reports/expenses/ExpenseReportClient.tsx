"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CreditCard,
  Download,
  FolderTree,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import Pagination, { usePagination } from "@/components/Pagination";

type CategoryOption = {
  id: number;
  name: string;
};

type PaymentMethodOption = {
  id: number;
  name: string;
  type: string;
};

type CategoryBreakdownRow = {
  categoryId: number;
  categoryName: string;
  count: number;
  totalAmount: number;
  sharePercent: number;
};

type PaymentBreakdownRow = {
  name: string;
  count: number;
  totalAmount: number;
  sharePercent: number;
};

type DailyExpenseRow = {
  date: string;
  count: number;
  totalAmount: number;
};

type ExpenseVoucherRow = {
  id: number;
  expenseNo: string;
  expenseDate: string;
  categoryId: number;
  categoryName: string;
  description: string;
  amount: number;
  paymentMethodName: string;
  createdBy: string;
};

type ExpenseReportData = {
  from: string;
  to: string;
  categories: CategoryOption[];
  paymentMethods: PaymentMethodOption[];
  summary: {
    expenseCount: number;
    categoriesUsed: number;
    activeDays: number;
    totalAmount: number;
    dailyAverage: number;
    highestExpense: number;
    topCategoryName: string;
  };
  categoryBreakdown: CategoryBreakdownRow[];
  paymentBreakdown: PaymentBreakdownRow[];
  dailyExpenses: DailyExpenseRow[];
  expenses: ExpenseVoucherRow[];
};

function money(value: number) {
  return value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function defaultFrom() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpenseReportClient() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [categoryId, setCategoryId] = useState("ALL");
  const [paymentMethodId, setPaymentMethodId] = useState("ALL");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<ExpenseReportData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadReport() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        from,
        to,
        categoryId,
        paymentMethodId,
      });

      const response = await fetch(
        `/api/reports/expenses?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load expense report.");
      }

      setData(result.data);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load expense report."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredExpenses = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.expenses;

    return data.expenses.filter(
      (e) =>
        e.expenseNo.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.categoryName.toLowerCase().includes(q) ||
        e.paymentMethodName.toLowerCase().includes(q) ||
        e.createdBy.toLowerCase().includes(q)
    );
  }, [data, search]);

  const filteredTotalAmount = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const pagination = usePagination(filteredExpenses, 25);

  const maxDailyExpense = useMemo(
    () =>
      Math.max(
        ...(data?.dailyExpenses.map((d) => d.totalAmount) ?? [1]),
        1
      ),
    [data]
  );

  function exportCsv() {
    if (!filteredExpenses.length) {
      toast.error("No data to export.");
      return;
    }

    const headers = [
      "Expense No",
      "Date",
      "Category",
      "Description",
      "Payment Method",
      "Created By",
      "Amount (LKR)",
    ];

    const rows = filteredExpenses.map((e) => [
      e.expenseNo,
      new Date(e.expenseDate).toLocaleDateString("en-LK"),
      e.categoryName,
      e.description,
      e.paymentMethodName,
      e.createdBy,
      e.amount.toFixed(2),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expense-report-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Expense report CSV downloaded.");
  }

  return (
    <div className="min-h-[calc(100dvh_-_4rem)] bg-slate-50 p-3 sm:p-4 lg:min-h-[calc(100dvh_-_5rem)] md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-rose-600">
                Reports · Operating Expenses
              </p>
              <h1 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                Expense Category & Daily Expense Report
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Analyze operating expenses by category, payment method, daily trends, and voucher records
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                onClick={exportCsv}
                disabled={loading || !filteredExpenses.length}
                className="flex h-10 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>

              <button
                onClick={() => window.print()}
                disabled={loading || !filteredExpenses.length}
                className="flex h-10 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-5 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-6 print:hidden">
            <label className="text-xs font-semibold text-slate-600">
              From Date
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border px-3 text-sm text-slate-900"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600">
              To Date
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border px-3 text-sm text-slate-900"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Expense Category
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900"
              >
                <option value="ALL">All Categories</option>
                {data?.categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Payment Method
              <select
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900"
              >
                <option value="ALL">All Payment Methods</option>
                {data?.paymentMethods.map((pm) => (
                  <option key={pm.id} value={String(pm.id)}>
                    {pm.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Search Voucher / Description
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Voucher no, description..."
                  className="block h-10 w-full rounded-lg border pl-9 pr-3 text-sm text-slate-900"
                />
              </div>
            </label>

            <div className="flex items-end">
              <button
                onClick={loadReport}
                disabled={loading}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Load Report
              </button>
            </div>
          </div>
        </div>

        {/* Summary & Breakdown */}
        {!data ? (
          <div className="rounded-2xl border bg-white p-12 text-center text-sm text-slate-500">
            {loading ? "Loading expense report..." : "No expense data."}
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Total Expenses
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-lg text-rose-600">
                  Rs. {money(filteredTotalAmount)}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Expense Vouchers
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-lg text-slate-900">
                  {filteredExpenses.length.toLocaleString()}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Categories Used
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-lg text-slate-900">
                  {data.summary.categoriesUsed}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Daily Avg (Active Days)
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-lg text-slate-900">
                  Rs. {money(data.summary.dailyAverage)}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Highest Single Expense
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-lg text-slate-900">
                  Rs. {money(data.summary.highestExpense)}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Top Expense Category
                </p>
                <p className="mt-2 truncate text-base font-black text-rose-600">
                  {data.summary.topCategoryName}
                </p>
              </div>
            </div>

            {/* Category & Payment Method Breakdown */}
            <div className="grid gap-5 lg:grid-cols-3">
              {/* Category Breakdown */}
              <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderTree className="h-5 w-5 text-rose-600" />
                    <h2 className="font-black text-slate-900">
                      Expense Category Breakdown
                    </h2>
                  </div>
                </div>

                {data.categoryBreakdown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No category expenses recorded in this period.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {data.categoryBreakdown.map((cat) => (
                      <div
                        key={cat.categoryId}
                        className="rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-bold text-slate-900">
                              {cat.categoryName}
                            </span>
                            <span className="ml-2 text-xs text-slate-500">
                              ({cat.count} voucher{cat.count > 1 ? "s" : ""})
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-900">
                              Rs. {money(cat.totalAmount)}
                            </span>
                            <span className="ml-2 text-xs font-bold text-rose-600">
                              ({cat.sharePercent.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-200/70">
                          <div
                            className="h-2 rounded-full bg-rose-500"
                            style={{
                              width: `${Math.max(2, cat.sharePercent)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Payment Method Breakdown */}
              <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-rose-600" />
                  <h2 className="font-black text-slate-900">Payment Methods</h2>
                </div>

                {data.paymentBreakdown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No payment data.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {data.paymentBreakdown.map((pm) => (
                      <div key={pm.name}>
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-800">
                            {pm.name} ({pm.count})
                          </span>
                          <span className="font-bold text-slate-900">
                            Rs. {money(pm.totalAmount)} ({pm.sharePercent.toFixed(1)}
                            %)
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-slate-800"
                            style={{
                              width: `${Math.max(2, pm.sharePercent)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Daily Expenses Timeline */}
            <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-rose-600" />
                <h2 className="font-black text-slate-900">
                  Daily Expense Summary
                </h2>
              </div>

              {data.dailyExpenses.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No daily expenses recorded in this period.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.dailyExpenses.map((day) => (
                    <div
                      key={day.date}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">
                          {day.date}
                        </span>
                        <span className="text-slate-500">
                          {day.count} voucher(s)
                        </span>
                      </div>
                      <p className="mt-1 text-base font-black text-slate-900">
                        Rs. {money(day.totalAmount)}
                      </p>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                        <div
                          className="h-1.5 rounded-full bg-rose-500"
                          style={{
                            width: `${Math.max(
                              3,
                              (day.totalAmount / maxDailyExpense) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Detailed Expense Vouchers Table */}
            <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b p-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
                    <WalletCards className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Expense Voucher Details
                    </h2>
                    <p className="text-xs text-slate-500">
                      Complete list of all recorded expense transactions
                    </p>
                  </div>
                </div>
              </div>

              <div className="touch-pan-x overscroll-x-contain overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Voucher No</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Payment Method</th>
                      <th className="px-4 py-3">Created By</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredExpenses.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-sm text-slate-500"
                        >
                          No expense vouchers match the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      pagination.paginatedItems.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-mono text-xs font-bold text-rose-600">
                            {e.expenseNo}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {new Date(e.expenseDate).toLocaleDateString(
                              "en-LK"
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                              {e.categoryName}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {e.description}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {e.paymentMethodName}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {e.createdBy}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">
                            Rs. {money(e.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredExpenses.length > 0 && (
                    <tfoot className="border-t bg-slate-50 font-black text-slate-900">
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-3 text-right text-xs uppercase text-slate-500"
                        >
                          Total Expenses
                        </td>
                        <td className="px-4 py-3 text-right text-rose-600">
                          Rs. {money(filteredTotalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              <div className="border-t p-4 print:hidden">
                <Pagination pagination={pagination} />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

