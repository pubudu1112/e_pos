"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Download,
  Flame,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  Search,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import Pagination, { usePagination } from "@/components/Pagination";

type CategoryItem = {
  id: number;
  name: string;
};

type CategoryValuation = {
  categoryId: number;
  categoryName: string;
  productCount: number;
  totalUnits: number;
  costValue: number;
  retailValue: number;
  expectedProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
};

type StockProductRow = {
  id: number;
  code: string;
  barcode: string | null;
  name: string;
  status: string;
  categoryId: number;
  categoryName: string;
  brandName: string | null;
  unitName: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minimumStock: number;
  reorderQty: number;
  purchasePrice: number;
  sellingPrice: number;
  stockCostValue: number;
  stockRetailValue: number;
  expectedProfit: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  soldQtyInPeriod: number;
  salesValueInPeriod: number;
  lastSoldAt: string | null;
  movementType: "FAST_MOVING" | "SLOW_MOVING" | "DEAD_STOCK";
};

type StockReportData = {
  from: string;
  to: string;
  categories: CategoryItem[];
  summary: {
    totalProducts: number;
    totalUnitsInStock: number;
    totalCostValue: number;
    totalRetailValue: number;
    totalExpectedProfit: number;
    lowStockCount: number;
    outOfStockCount: number;
    fastMovingCount: number;
    slowMovingCount: number;
    deadStockCount: number;
  };
  categoryValuations: CategoryValuation[];
  products: StockProductRow[];
};

function money(value: number) {
  return value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function qtyFormat(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString("en-LK")
    : value.toLocaleString("en-LK", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
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

export default function StockReportClient() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [stockStatusFilter, setStockStatusFilter] = useState("ALL");
  const [movementFilter, setMovementFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<
    "VALUATION" | "LOW_STOCK" | "MOVEMENT"
  >("VALUATION");
  const [data, setData] = useState<StockReportData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadReport() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ from, to });
      const response = await fetch(`/api/reports/stock?${params.toString()}`, {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load stock report.");
      }

      setData(result.data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load stock report."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();

    return data.products.filter((p) => {
      if (categoryFilter !== "ALL" && String(p.categoryId) !== categoryFilter) {
        return false;
      }

      if (stockStatusFilter === "ALERT") {
        if (p.stockStatus !== "LOW_STOCK" && p.stockStatus !== "OUT_OF_STOCK") {
          return false;
        }
      } else if (
        stockStatusFilter !== "ALL" &&
        p.stockStatus !== stockStatusFilter
      ) {
        return false;
      }

      if (movementFilter !== "ALL" && p.movementType !== movementFilter) {
        return false;
      }

      if (activeTab === "LOW_STOCK") {
        if (p.stockStatus !== "LOW_STOCK" && p.stockStatus !== "OUT_OF_STOCK") {
          return false;
        }
      }

      if (!q) return true;

      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        p.categoryName.toLowerCase().includes(q) ||
        (p.brandName && p.brandName.toLowerCase().includes(q))
      );
    });
  }, [
    data,
    categoryFilter,
    stockStatusFilter,
    movementFilter,
    activeTab,
    search,
  ]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (activeTab === "LOW_STOCK") {
      return list.sort((a, b) => a.currentStock - b.currentStock);
    }
    if (activeTab === "MOVEMENT") {
      return list.sort((a, b) => b.soldQtyInPeriod - a.soldQtyInPeriod);
    }
    return list.sort((a, b) => b.stockCostValue - a.stockCostValue);
  }, [filteredProducts, activeTab]);

  const pagination = usePagination(sortedProducts, 25);

  const filteredTotals = useMemo(() => {
    let units = 0;
    let costValue = 0;
    let retailValue = 0;
    let expectedProfit = 0;

    for (const p of sortedProducts) {
      units += Math.max(0, p.currentStock);
      costValue += p.stockCostValue;
      retailValue += p.stockRetailValue;
      expectedProfit += p.expectedProfit;
    }

    return {
      count: sortedProducts.length,
      units,
      costValue,
      retailValue,
      expectedProfit,
    };
  }, [sortedProducts]);

  function exportCsv() {
    if (!sortedProducts.length) {
      toast.error("No data to export.");
      return;
    }

    const headers = [
      "Product Code",
      "Barcode",
      "Product Name",
      "Category",
      "Brand",
      "Unit",
      "Current Stock",
      "Min Stock",
      "Reorder Qty",
      "Stock Status",
      "Cost Price (LKR)",
      "Selling Price (LKR)",
      "Total Stock Cost Value (LKR)",
      "Total Retail Value (LKR)",
      "Expected Profit (LKR)",
      `Sold Qty (${from} to ${to})`,
      `Sales Value (${from} to ${to})`,
      "Movement Velocity",
    ];

    const rows = sortedProducts.map((p) => [
      p.code,
      p.barcode || "-",
      p.name,
      p.categoryName,
      p.brandName || "-",
      p.unitName,
      String(p.currentStock),
      String(p.minimumStock),
      String(p.reorderQty),
      p.stockStatus,
      p.purchasePrice.toFixed(2),
      p.sellingPrice.toFixed(2),
      p.stockCostValue.toFixed(2),
      p.stockRetailValue.toFixed(2),
      p.expectedProfit.toFixed(2),
      String(p.soldQtyInPeriod),
      p.salesValueInPeriod.toFixed(2),
      p.movementType,
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
    link.download = `stock-valuation-report-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Stock report CSV downloaded.");
  }

  return (
    <div className="min-h-[calc(100dvh_-_4rem)] bg-slate-50 p-3 sm:p-4 lg:min-h-[calc(100dvh_-_5rem)] md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
                Reports · Inventory & Valuation
              </p>
              <h1 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                Stock Valuation, Low Stock & Fast/Slow Moving Report
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Analyze inventory cost value, retail value, reorder alerts, and fast/dead moving stock
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                onClick={exportCsv}
                disabled={loading || !sortedProducts.length}
                className="flex h-10 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>

              <button
                onClick={() => window.print()}
                disabled={loading || !sortedProducts.length}
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
              Velocity From Date
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border px-3 text-sm text-slate-900"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Velocity To Date
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border px-3 text-sm text-slate-900"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Category
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
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
              Stock Level
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900"
              >
                <option value="ALL">All Stock Levels</option>
                <option value="ALERT">Low & Out of Stock Only</option>
                <option value="LOW_STOCK">Low Stock Only</option>
                <option value="OUT_OF_STOCK">Out of Stock Only</option>
                <option value="IN_STOCK">Healthy Stock Only</option>
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Movement Speed
              <select
                value={movementFilter}
                onChange={(e) => setMovementFilter(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900"
              >
                <option value="ALL">All Movement Types</option>
                <option value="FAST_MOVING">Fast Moving</option>
                <option value="SLOW_MOVING">Slow Moving</option>
                <option value="DEAD_STOCK">Dead Stock (0 Sold)</option>
              </select>
            </label>

            <div className="flex items-end">
              <button
                onClick={loadReport}
                disabled={loading}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
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

          {/* Search & Mode Tabs */}
          <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div className="inline-flex flex-wrap rounded-lg border bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("VALUATION")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "VALUATION"
                    ? "bg-white text-amber-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Stock Valuation & Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("LOW_STOCK")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "LOW_STOCK"
                    ? "bg-white text-red-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Low Stock & Reorder List (
                {(data?.summary.lowStockCount ?? 0) +
                  (data?.summary.outOfStockCount ?? 0)}
                )
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("MOVEMENT")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "MOVEMENT"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Fast / Slow / Dead Stock Analysis
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product, code, barcode..."
                className="h-9 w-full rounded-lg border pl-9 pr-3 text-sm text-slate-900"
              />
            </div>
          </div>
        </div>

        {!data ? (
          <div className="rounded-2xl border bg-white p-12 text-center text-sm text-slate-500">
            {loading ? "Loading stock valuation report..." : "No data available."}
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Total Stock Cost
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-lg text-slate-900">
                  Rs. {money(filteredTotals.costValue)}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Total Retail Value
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-lg text-blue-600">
                  Rs. {money(filteredTotals.retailValue)}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Expected Profit
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-lg text-emerald-600">
                  Rs. {money(filteredTotals.expectedProfit)}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Low / Out of Stock
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-lg text-red-600">
                  {data.summary.lowStockCount} Low ·{" "}
                  {data.summary.outOfStockCount} Out
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Fast Moving Items
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-lg text-amber-600">
                  {data.summary.fastMovingCount} Products
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Dead Stock (0 Sold)
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-lg text-slate-600">
                  {data.summary.deadStockCount} Products
                </p>
              </div>
            </div>

            {/* Category Valuation Summary Table */}
            {activeTab === "VALUATION" && (
              <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="flex items-center justify-between border-b p-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                      <Boxes className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        Category-Wise Stock Valuation
                      </h2>
                      <p className="text-xs text-slate-500">
                        Capital tied up in each product category and expected retail return
                      </p>
                    </div>
                  </div>
                </div>

                <div className="touch-pan-x overscroll-x-contain overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Products</th>
                        <th className="px-4 py-3 text-right">Units in Stock</th>
                        <th className="px-4 py-3 text-right">Low / Out Alerts</th>
                        <th className="px-4 py-3 text-right">
                          Cost Value (LKR)
                        </th>
                        <th className="px-4 py-3 text-right">
                          Retail Value (LKR)
                        </th>
                        <th className="px-4 py-3 text-right">
                          Expected Profit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.categoryValuations.map((cat) => (
                        <tr
                          key={cat.categoryId}
                          className="hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-2.5 font-bold text-slate-900">
                            {cat.categoryName}
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-600">
                            {cat.productCount}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                            {qtyFormat(cat.totalUnits)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {cat.lowStockCount + cat.outOfStockCount > 0 ? (
                              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600">
                                {cat.lowStockCount} Low / {cat.outOfStockCount}{" "}
                                Out
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-emerald-600">
                                Healthy
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                            Rs. {money(cat.costValue)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-blue-600">
                            Rs. {money(cat.retailValue)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-black text-emerald-600">
                            Rs. {money(cat.expectedProfit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Main Products Table */}
            <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b p-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    {activeTab === "LOW_STOCK" ? (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    ) : activeTab === "MOVEMENT" ? (
                      <Flame className="h-5 w-5 text-amber-600" />
                    ) : (
                      <Package className="h-5 w-5 text-slate-700" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      {activeTab === "LOW_STOCK"
                        ? "Low Stock & Reorder Alert List"
                        : activeTab === "MOVEMENT"
                          ? `Fast / Slow / Dead Stock Analysis (${from} to ${to})`
                          : "Product-Wise Stock Valuation Details"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Showing {sortedProducts.length} product(s) matching current filters
                    </p>
                  </div>
                </div>
              </div>

              <div className="touch-pan-x overscroll-x-contain overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Stock</th>
                      <th className="px-4 py-3 text-right">Min Stock</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Cost Price</th>
                      <th className="px-4 py-3 text-right">Stock Cost Value</th>
                      <th className="px-4 py-3 text-right">Retail Value</th>
                      <th className="px-4 py-3 text-right">Sold in Period</th>
                      <th className="px-4 py-3">Velocity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedProducts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-4 py-10 text-center text-sm text-slate-500"
                        >
                          No products match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      pagination.paginatedItems.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                            {p.code}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">
                              {p.name}
                            </div>
                            {p.brandName && (
                              <div className="text-xs text-slate-500">
                                {p.brandName}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {p.categoryName}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">
                            {qtyFormat(p.currentStock)}{" "}
                            <span className="text-xs font-normal text-slate-500">
                              {p.unitName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-slate-500">
                            {qtyFormat(p.minimumStock)} {p.unitName}
                          </td>
                          <td className="px-4 py-3">
                            {p.stockStatus === "OUT_OF_STOCK" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-700">
                                OUT OF STOCK
                              </span>
                            ) : p.stockStatus === "LOW_STOCK" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                LOW (+{qtyFormat(p.reorderQty)} needed)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                IN STOCK
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            Rs. {money(p.purchasePrice)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            Rs. {money(p.stockCostValue)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-600">
                            Rs. {money(p.stockRetailValue)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            {qtyFormat(p.soldQtyInPeriod)}{" "}
                            <span className="text-xs font-normal text-slate-500">
                              {p.unitName}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {p.movementType === "FAST_MOVING" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-700">
                                <Flame className="h-3 w-3" />
                                FAST MOVING
                              </span>
                            ) : p.movementType === "SLOW_MOVING" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                                SLOW MOVING
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                                <TrendingDown className="h-3 w-3" />
                                DEAD STOCK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {sortedProducts.length > 0 && (
                    <tfoot className="border-t bg-slate-50 font-black text-slate-900">
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-right text-xs uppercase text-slate-500"
                        >
                          Total Valuation
                        </td>
                        <td className="px-4 py-3 text-right">
                          {qtyFormat(filteredTotals.units)}
                        </td>
                        <td colSpan={3} />
                        <td className="px-4 py-3 text-right">
                          Rs. {money(filteredTotals.costValue)}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600">
                          Rs. {money(filteredTotals.retailValue)}
                        </td>
                        <td colSpan={2} />
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

