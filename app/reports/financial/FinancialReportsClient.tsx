"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  Loader2,
  Printer,
  RefreshCw,
  TrendingDown,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

type FinancialData = {
  salesCount: number;
  totalRevenue: number;
  subtotal: number;
  discount: number;
  tax: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  totalExpenses: number;
  expensesCount: number;
  netProfit: number;
  netMargin: number;
  expensesByCategory: Record<string, number>;
  paymentMethods: Record<string, number>;
  jobs: {
    count: number;
    totalValue: number;
    advanceReceived: number;
    receivable: number;
  };
};

function formatPrice(val: number) {
  return new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

function formatDateDisplay(iso: string) {
  return new Date(iso).toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function FinancialReportsClient() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [period, setPeriod] = useState<{ range: string; startDate: string; endDate: string }>({
    range: "this_month",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(true);
  const [rangePreset, setRangePreset] = useState("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const fetchFinancialsData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("range", rangePreset);
      if (rangePreset === "custom") {
        if (customFrom) params.set("from", customFrom);
        if (customTo) params.set("to", customTo);
      }

      const res = await fetch(`/api/reports/financial?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setData(json.data);
        setPeriod(json.period);
      } else {
        toast.error(json.message || "Failed to load financial report");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while loading financial report");
    } finally {
      setLoading(false);
    }
  }, [rangePreset, customFrom, customTo]);

  useEffect(() => {
    fetchFinancialsData();
  }, [fetchFinancialsData]);

  function handleManualRefresh() {
    setLoading(true);
    fetchFinancialsData();
  }

  // Print P&L Statement
  function handlePrintStatement() {
    if (!data) return;

    const printWin = window.open("", "_blank", "width=850,height=900");
    if (!printWin) {
      toast.error("Please allow pop-ups to print statement");
      return;
    }

    const expenseRows = Object.entries(data.expensesByCategory)
      .map(
        ([cat, amt]) => `
        <tr>
          <td style="padding: 6px 12px; color: #475569;">${cat}</td>
          <td style="padding: 6px 12px; text-align: right; font-family: monospace;">Rs. ${formatPrice(amt)}</td>
        </tr>
      `
      )
      .join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Income Statement - Pubudu POS</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; }
            h1 { font-size: 24px; margin: 0 0 4px 0; font-weight: 800; }
            .subtitle { color: #64748b; font-size: 13px; margin-bottom: 24px; }
            .meta { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { text-align: left; padding: 10px 12px; background: #f8fafc; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
            td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
            .highlight { font-weight: bold; background: #f8fafc; }
            .grand-net { font-size: 16px; font-weight: 800; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; background: #f1f5f9; }
            .positive { color: #15803d; }
            .negative { color: #b91c1c; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>PUBUDU CREATIVE HUB</h1>
          <div class="subtitle">Printing • Designing • Stationery • Mobile Accessories</div>
          <div class="meta">
            <div><strong>STATEMENT OF PROFIT AND LOSS (P&L)</strong></div>
            <div>Period: ${formatDateDisplay(period.startDate)} to ${formatDateDisplay(period.endDate)}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Account / Description</th>
                <th style="text-align: right;">Amount (LKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr class="highlight">
                <td><strong>Gross Sales Revenue</strong> (${data.salesCount} Completed Invoices)</td>
                <td style="text-align: right; font-family: monospace;">Rs. ${formatPrice(data.totalRevenue)}</td>
              </tr>
              <tr>
                <td style="padding-left: 28px; color: #64748b;">Subtotal Billed</td>
                <td style="text-align: right; font-family: monospace; color: #64748b;">Rs. ${formatPrice(data.subtotal)}</td>
              </tr>
              <tr>
                <td style="padding-left: 28px; color: #64748b;">Less: Discounts Given</td>
                <td style="text-align: right; font-family: monospace; color: #64748b;">- Rs. ${formatPrice(data.discount)}</td>
              </tr>
              <tr>
                <td style="padding-left: 28px; color: #64748b;">Taxes Collected</td>
                <td style="text-align: right; font-family: monospace; color: #64748b;">+ Rs. ${formatPrice(data.tax)}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Less: Cost of Goods Sold (COGS)</td>
                <td style="text-align: right; font-family: monospace; color: #64748b;">- Rs. ${formatPrice(data.cogs)}</td>
              </tr>
              <tr class="highlight" style="background: #f1f5f9;">
                <td><strong>GROSS PROFIT</strong> (${data.grossMargin.toFixed(1)}% Margin)</td>
                <td style="text-align: right; font-family: monospace;"><strong>Rs. ${formatPrice(data.grossProfit)}</strong></td>
              </tr>

              <tr><td colspan="2" style="padding: 12px 0 4px 0; font-weight: bold; font-size: 11px; text-transform: uppercase; color: #64748b;">Operating Expenses</td></tr>
              ${expenseRows || '<tr><td colspan="2" style="color: #94a3b8; font-style: italic;">No expenses recorded in this period</td></tr>'}
              <tr class="highlight">
                <td><strong>Total Operating Outflow</strong></td>
                <td style="text-align: right; font-family: monospace; color: #b91c1c;">- Rs. ${formatPrice(data.totalExpenses)}</td>
              </tr>

              <tr class="grand-net">
                <td>NET PROFIT / (LOSS) (${data.netMargin.toFixed(1)}% Net Margin)</td>
                <td style="text-align: right; font-family: monospace;" class="${data.netProfit >= 0 ? "positive" : "negative"}">
                  Rs. ${formatPrice(data.netProfit)}
                </td>
              </tr>
            </tbody>
          </table>

          <div style="font-size: 11px; color: #94a3b8; margin-top: 40px; text-align: center;">
            Generated from Pubudu POS on ${new Date().toLocaleString("en-LK")}
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  }

  const isNetPositive = (data?.netProfit ?? 0) >= 0;

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Reports</h1>
                <p className="text-sm text-slate-500">
                  Comprehensive Profit & Loss, revenue, COGS, and operating outflow analysis
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrintStatement}
              disabled={loading || !data}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>Print P&L Statement</span>
            </button>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: "Today", value: "today" },
              { label: "This Week", value: "this_week" },
              { label: "This Month", value: "this_month" },
              { label: "Last Month", value: "last_month" },
              { label: "This Year", value: "this_year" },
              { label: "Custom Range", value: "custom" },
            ].map((btn) => (
              <button
                key={btn.value}
                type="button"
                onClick={() => setRangePreset(btn.value)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  rangePreset === btn.value
                    ? "bg-primary text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {rangePreset === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-700"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-700"
              />
            </div>
          )}

          <div className="text-xs font-medium text-slate-400">
            {formatDateDisplay(period.startDate)} — {formatDateDisplay(period.endDate)}
          </div>
        </div>

        {loading || !data ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white py-24 text-slate-400 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm font-medium">Calculating financial metrics...</p>
          </div>
        ) : (
          <>
            {/* 5 Core Financial Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {/* Gross Revenue */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Gross Revenue</span>
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  Rs. {formatPrice(data.totalRevenue)}
                </p>
                <p className="mt-1 text-xs text-slate-400">{data.salesCount} completed sales</p>
              </div>

              {/* COGS */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Cost of Goods (COGS)</span>
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  Rs. {formatPrice(data.cogs)}
                </p>
                <p className="mt-1 text-xs text-slate-400">Inventory cost of sold items</p>
              </div>

              {/* Gross Profit */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Gross Profit</span>
                  <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    {data.grossMargin.toFixed(1)}% Margin
                  </span>
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  Rs. {formatPrice(data.grossProfit)}
                </p>
                <p className="mt-1 text-xs text-slate-400">Revenue minus product cost</p>
              </div>

              {/* Operating Expenses */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Operating Expenses</span>
                  <WalletCards className="h-4 w-4 text-rose-500" />
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  Rs. {formatPrice(data.totalExpenses)}
                </p>
                <p className="mt-1 text-xs text-slate-400">{data.expensesCount} logged expenses</p>
              </div>

              {/* NET PROFIT */}
              <div
                className={`rounded-2xl border p-5 shadow-sm ${
                  isNetPositive
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-rose-200 bg-rose-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isNetPositive ? "text-emerald-800" : "text-rose-800"
                    }`}
                  >
                    NET PROFIT
                  </span>
                  {isNetPositive ? (
                    <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-rose-600" />
                  )}
                </div>
                <p
                  className={`mt-2 text-2xl font-black ${
                    isNetPositive ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  Rs. {formatPrice(data.netProfit)}
                </p>
                <p
                  className={`mt-1 text-xs font-semibold ${
                    isNetPositive ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {data.netMargin.toFixed(1)}% Net Margin
                </p>
              </div>
            </div>

            {/* Middle Section: Breakdown Grids */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Expenses Breakdown */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900">Expenses by Category</h3>
                  <WalletCards className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-4 space-y-3">
                  {Object.keys(data.expensesByCategory).length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">No expenses in this period</p>
                  ) : (
                    Object.entries(data.expensesByCategory).map(([cat, amt]) => {
                      const pct = data.totalExpenses > 0 ? (amt / data.totalExpenses) * 100 : 0;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-700">{cat}</span>
                            <span className="font-mono font-bold text-slate-900">Rs. {formatPrice(amt)}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-rose-500"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900">Revenue by Payment Method</h3>
                  <CreditCard className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-4 space-y-3">
                  {Object.keys(data.paymentMethods).length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">No sales recorded</p>
                  ) : (
                    Object.entries(data.paymentMethods).map(([pm, amt]) => {
                      const pct = data.totalRevenue > 0 ? (amt / data.totalRevenue) * 100 : 0;
                      return (
                        <div key={pm} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-700">{pm}</span>
                            <span className="font-mono font-bold text-slate-900">Rs. {formatPrice(amt)}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Job Orders Performance */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900">Job Orders Pipeline</h3>
                  <Briefcase className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <span className="text-xs font-semibold text-slate-600">Total Jobs Created</span>
                    <span className="text-base font-bold text-slate-900">{data.jobs.count}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <span className="text-xs font-semibold text-slate-600">Total Billed Value</span>
                    <span className="font-mono text-sm font-bold text-slate-900">
                      Rs. {formatPrice(data.jobs.totalValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50/50 p-3">
                    <span className="text-xs font-semibold text-emerald-800">Advance Collected</span>
                    <span className="font-mono text-sm font-bold text-emerald-700">
                      Rs. {formatPrice(data.jobs.advanceReceived)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-amber-50/50 p-3">
                    <span className="text-xs font-semibold text-amber-800">Pending Receivables</span>
                    <span className="font-mono text-sm font-bold text-amber-700">
                      Rs. {formatPrice(data.jobs.receivable)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Income Statement Detailed Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="text-base font-bold text-slate-900">Formal Income Statement</h3>
                <p className="text-xs text-slate-500">Summary table of operational performance</p>
              </div>

              <div className="p-6">
                <table className="w-full text-left text-sm text-slate-700">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50/75 font-semibold">
                      <td className="py-3 pl-4">1. Revenue (Sales from Products & Services)</td>
                      <td className="py-3 pr-4 text-right font-mono text-slate-900">
                        Rs. {formatPrice(data.totalRevenue)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-8 text-xs text-slate-500">Less: Cost of Goods Sold (COGS)</td>
                      <td className="py-2.5 pr-4 text-right font-mono text-xs text-slate-500">
                        - Rs. {formatPrice(data.cogs)}
                      </td>
                    </tr>
                    <tr className="font-semibold text-slate-900">
                      <td className="py-3 pl-4">2. Gross Profit</td>
                      <td className="py-3 pr-4 text-right font-mono">Rs. {formatPrice(data.grossProfit)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-8 text-xs text-slate-500">Less: Total Operating Expenses</td>
                      <td className="py-2.5 pr-4 text-right font-mono text-xs text-rose-600">
                        - Rs. {formatPrice(data.totalExpenses)}
                      </td>
                    </tr>
                    <tr
                      className={`text-base font-bold ${
                        isNetPositive ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                      }`}
                    >
                      <td className="py-3.5 pl-4">3. Net Profit / (Loss)</td>
                      <td className="py-3.5 pr-4 text-right font-mono">Rs. {formatPrice(data.netProfit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
