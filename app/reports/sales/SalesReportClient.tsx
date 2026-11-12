"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Brain,
  FileDown,
  Loader2,
  Printer,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

type ReportData = {
  from: string;
  to: string;
  invoiceCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  balanceAmount: number;
  productSales: number;
  serviceSales: number;
  productCost: number;
  productGrossProfit: number;
  serviceSalesWithoutCost: number;
  serviceCost: number;
  serviceGrossProfit: number;
  totalSales: number;
  totalCogs: number;
  totalGrossProfit: number;
  missingCostPriceCount: number;
  costDataComplete: boolean;
  paymentMethods: { name: string; amount: number }[];
  dailySales: { date: string; sales: number; invoices: number }[];
  topProducts: { name: string; quantity: number; sales: number }[];
  topServices: { name: string; quantity: number; sales: number }[];
  sales: {
    invoiceNo: string;
    saleDate: string;
    customer: string;
    cashier: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paidAmount: number;
    balanceAmount: number;
    paymentMethods: { name: string; amount: number }[];
  }[];
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

export default function SalesReportClient() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");

  async function loadReport() {
    try {
      // loading is true
      setAiSummary("");

      const response = await fetch(
        `/api/reports/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load report.");
      }

      setData(result.data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load report."
      );
    } finally {
      setLoading(false);
    }
  }

  async function generateAIReport() {
    if (!data) return;

    try {
      setAiLoading(true);

      const response = await fetch("/api/reports/sales/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportData: data }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to generate AI report.");
      }

      setAiSummary(result.data.summary);
      toast.success("AI sales analysis generated.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to generate AI report."
      );
    } finally {
      setAiLoading(false);
    }
  }

  function printReport() {
    window.print();
  }

  useEffect(() => {
    loadReport();
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxDailySales = useMemo(
    () => Math.max(...(data?.dailySales.map((x) => x.sales) ?? [1])),
    [data]
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Reports
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-foreground">
              Sales Report
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
              Normal sales report + AI-powered sales analysis
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block h-10 rounded-lg border border-slate-300 dark:border-border bg-white dark:bg-muted/40 px-3 text-sm text-slate-900 dark:text-foreground outline-none focus:border-emerald-500"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block h-10 rounded-lg border border-slate-300 dark:border-border bg-white dark:bg-muted/40 px-3 text-sm text-slate-900 dark:text-foreground outline-none focus:border-emerald-500"
              />
            </label>

            <button
              onClick={loadReport}
              disabled={loading}
              className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Load Report
            </button>

            <button
              onClick={printReport}
              className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-muted/30 px-4 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-muted"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {!data ? (
          <div className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-12 text-center text-sm text-slate-500 dark:text-muted-foreground">
            {loading ? "Loading report..." : "No report data."}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Invoices", data.invoiceCount.toLocaleString()],
                ["Sales", `Rs. ${money(data.total)}`],
                ["Paid", `Rs. ${money(data.paidAmount)}`],
                ["Balance", `Rs. ${money(data.balanceAmount)}`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 dark:text-muted-foreground">{label}</p>
                  <p className="mt-2 text-xl font-black text-slate-900 dark:text-foreground">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <section className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-slate-900 dark:text-foreground">Sales Summary</h2>
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Metric label="Subtotal" value={data.subtotal} />
                  <Metric label="Discount" value={data.discount} />
                  <Metric label="Tax" value={data.tax} />
                  <Metric label="Total" value={data.total} />

                  <Metric label="Product Sales" value={data.productSales} />
                  <Metric label="Service Sales" value={data.serviceSales} />

                  <Metric label="Product Cost" value={data.productCost} />
                  <Metric label="Service Cost" value={data.serviceCost} />

                  <Metric
                    label="Product Gross Profit"
                    value={data.productGrossProfit}
                  />

                  <Metric
                    label="Service Gross Profit"
                    value={data.serviceGrossProfit}
                  />

                  <Metric label="Total COGS" value={data.totalCogs} />

                  <Metric
                    label="Total Gross Profit"
                    value={data.totalGrossProfit}
                  />
                </div>

                {data.missingCostPriceCount > 0 ? (
                  <p className="mt-4 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs leading-5 text-amber-800 dark:text-amber-300">
                    Warning: {data.missingCostPriceCount} sale item(s) have
                    missing cost prices. Gross profit is calculated using
                    only available cost data. Historical profit may be incomplete.
                  </p>
                ) : (
                  <p className="mt-4 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs leading-5 text-emerald-700 dark:text-emerald-300">
                    All product and service cost prices are available.
                    Gross profit calculation is complete.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
                <h2 className="font-black text-slate-900 dark:text-foreground">Payment Methods</h2>
                <div className="mt-4 space-y-3">
                  {data.paymentMethods.map((item) => (
                    <div key={item.name}>
                      <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300">
                        <span className="font-semibold">{item.name}</span>
                        <span>Rs. {money(item.amount)}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-muted">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{
                            width: `${Math.min(
                              100,
                              (item.amount / Math.max(data.paidAmount, 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
                <h2 className="font-black text-slate-900 dark:text-foreground">Daily Sales</h2>
                <div className="mt-5 space-y-3">
                  {data.dailySales.map((item) => (
                    <div key={item.date}>
                      <div className="mb-1 flex justify-between text-xs text-slate-700 dark:text-slate-300">
                        <span>{item.date}</span>
                        <span className="font-bold">
                          Rs. {money(item.sales)} · {item.invoices} invoices
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100 dark:bg-muted">
                        <div
                          className="h-3 rounded-full bg-emerald-500"
                          style={{
                            width: `${Math.max(
                              2,
                              (item.sales / maxDailySales) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
                <h2 className="font-black text-slate-900 dark:text-foreground">Top Products</h2>
                <div className="mt-4 divide-y divide-slate-100 dark:divide-border">
                  {data.topProducts.map((item, index) => (
                    <div key={item.name} className="flex justify-between py-3 text-sm text-slate-800 dark:text-slate-200">
                      <span>
                        <b className="mr-2">{index + 1}.</b>{item.name}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-foreground">Rs. {money(item.sales)}</span>
                    </div>
                  ))}
                  {!data.topProducts.length && (
                    <p className="py-4 text-sm text-slate-500 dark:text-muted-foreground">No product sales.</p>
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
              <h2 className="font-black text-slate-900 dark:text-foreground">Top Services</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {data.topServices.map((item) => (
                  <div key={item.name} className="rounded-xl border border-slate-100 dark:border-border bg-slate-50 dark:bg-muted/40 p-4">
                    <div className="flex justify-between text-slate-900 dark:text-foreground">
                      <span className="font-semibold">{item.name}</span>
                      <span className="font-black">Rs. {money(item.sales)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                ))}
                {!data.topServices.length && (
                  <p className="text-sm text-slate-500 dark:text-muted-foreground">No service sales.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-black text-slate-900 dark:text-foreground">AI Sales Analysis</h2>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">
                    AI receives the report data only and does not become the source of truth for the numbers.
                  </p>
                </div>
                <button
                  onClick={generateAIReport}
                  disabled={aiLoading}
                  className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 dark:bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 dark:hover:bg-primary/90 disabled:opacity-50"
                >
                  {aiLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4" />
                  )}
                  Generate AI Report
                </button>
              </div>

              {aiSummary ? (
                <div className="mt-5 whitespace-pre-wrap rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/30 p-5 text-sm leading-7 text-slate-700 dark:text-slate-200">
                  {aiSummary}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-slate-300 dark:border-border p-8 text-center text-sm text-slate-500 dark:text-muted-foreground">
                  Click “Generate AI Report” to analyze this sales report.
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-border">
                <h2 className="font-black text-slate-900 dark:text-foreground">Invoice Details</h2>
                <FileDown className="h-5 w-5 text-slate-400" />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-muted/40 text-left text-xs uppercase text-slate-500 dark:text-muted-foreground border-b border-slate-200 dark:border-border">
                    <tr>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Cashier</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-border text-slate-700 dark:text-slate-200">
                    {data.sales.map((sale) => (
                      <tr key={sale.invoiceNo} className="hover:bg-slate-50/50 dark:hover:bg-muted/30">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-foreground">{sale.invoiceNo}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-muted-foreground">
                          {new Date(sale.saleDate).toLocaleDateString("en-LK")}
                        </td>
                        <td className="px-4 py-3">{sale.customer}</td>
                        <td className="px-4 py-3">{sale.cashier}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-foreground">
                          Rs. {money(sale.total)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          Rs. {money(sale.paidAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400">
                          Rs. {money(sale.balanceAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          button,
          input,
          label {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-border bg-slate-50 dark:bg-muted/40 p-3">
      <p className="text-[11px] font-semibold text-slate-500 dark:text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900 dark:text-foreground">
        Rs. {money(value)}
      </p>
    </div>
  );
}
