"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FolderTree,
  Layers,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  Search,
  Tags,
} from "lucide-react";
import { toast } from "sonner";
import Pagination, { usePagination } from "@/components/Pagination";

type CategoryOption = {
  categoryKey: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
};

type ProductReportRow = {
  itemKey: string;
  id: number | null;
  code: string;
  barcode: string | null;
  name: string;
  itemType: "PRODUCT" | "SERVICE";
  categoryKey: string;
  categoryName: string;
  brandName: string | null;
  unitName: string;
  currentStock: number | null;
  unitSellingPrice: number;
  unitCostPrice: number;
  invoiceCount: number;
  quantitySold: number;
  totalDiscount: number;
  tax: number;
  grossSalesValue: number;
  netSalesValue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
};

type CategorySummaryRow = {
  categoryKey: string;
  categoryName: string;
  categoryType: "PRODUCT" | "SERVICE";
  distinctItemsCount: number;
  totalQuantity: number;
  totalDiscount: number;
  totalTax: number;
  grossSalesValue: number;
  netSalesValue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  items: ProductReportRow[];
};

type CategoryProductReportData = {
  from: string;
  to: string;
  categoriesList: CategoryOption[];
  summary: {
    categoriesCount: number;
    distinctProductsSold: number;
    totalQuantity: number;
    totalDiscount: number;
    totalTax: number;
    grossSalesValue: number;
    netSalesValue: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
  };
  categories: CategorySummaryRow[];
  products: ProductReportRow[];
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

export default function CategoryProductReportClient() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedType, setSelectedType] = useState<"ALL" | "PRODUCT" | "SERVICE">(
    "ALL"
  );
  const [includeUnsold, setIncludeUnsold] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"BOTH" | "CATEGORY" | "PRODUCT">(
    "BOTH"
  );
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [data, setData] = useState<CategoryProductReportData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadReport(unsoldOverride?: boolean) {
    try {
      setLoading(true);
      const showUnsold =
        unsoldOverride !== undefined ? unsoldOverride : includeUnsold;

      const params = new URLSearchParams({
        from,
        to,
        includeUnsold: String(showUnsold),
      });

      const response = await fetch(
        `/api/reports/category-products?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load category & product report."
        );
      }

      setData(result.data);

      if (result.data?.categories?.length > 0) {
        const nextExpanded: Record<string, boolean> = {};
        result.data.categories.slice(0, 3).forEach((cat: CategorySummaryRow) => {
          nextExpanded[cat.categoryKey] = true;
        });
        setExpandedCategories(nextExpanded);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load category & product report."
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
      if (selectedCategory !== "ALL" && p.categoryKey !== selectedCategory) {
        return false;
      }
      if (selectedType !== "ALL" && p.itemType !== selectedType) {
        return false;
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
  }, [data, selectedCategory, selectedType, search]);

  const filteredCategories = useMemo(() => {
    const map = new Map<string, CategorySummaryRow>();

    for (const p of filteredProducts) {
      let cat = map.get(p.categoryKey);
      if (!cat) {
        cat = {
          categoryKey: p.categoryKey,
          categoryName: p.categoryName,
          categoryType: p.itemType,
          distinctItemsCount: 0,
          totalQuantity: 0,
          totalDiscount: 0,
          totalTax: 0,
          grossSalesValue: 0,
          netSalesValue: 0,
          totalCost: 0,
          grossProfit: 0,
          profitMargin: 0,
          items: [],
        };
        map.set(p.categoryKey, cat);
      }

      cat.distinctItemsCount += 1;
      cat.totalQuantity += p.quantitySold;
      cat.totalDiscount += p.totalDiscount;
      cat.totalTax += p.tax;
      cat.grossSalesValue += p.grossSalesValue;
      cat.netSalesValue += p.netSalesValue;
      cat.totalCost += p.totalCost;
      cat.grossProfit += p.grossProfit;
      cat.items.push(p);
    }

    return [...map.values()]
      .map((c) => ({
        ...c,
        profitMargin:
          c.netSalesValue > 0 ? (c.grossProfit / c.netSalesValue) * 100 : 0,
      }))
      .sort((a, b) => b.grossSalesValue - a.grossSalesValue);
  }, [filteredProducts]);

  const filteredSummary = useMemo(() => {
    let totalQuantity = 0;
    let totalDiscount = 0;
    let grossSalesValue = 0;
    let netSalesValue = 0;
    let totalCost = 0;

    for (const p of filteredProducts) {
      totalQuantity += p.quantitySold;
      totalDiscount += p.totalDiscount;
      grossSalesValue += p.grossSalesValue;
      netSalesValue += p.netSalesValue;
      totalCost += p.totalCost;
    }

    const grossProfit = netSalesValue - totalCost;
    const profitMargin =
      netSalesValue > 0 ? (grossProfit / netSalesValue) * 100 : 0;

    return {
      categoriesCount: filteredCategories.length,
      productsCount: filteredProducts.length,
      totalQuantity,
      totalDiscount,
      grossSalesValue,
      netSalesValue,
      totalCost,
      grossProfit,
      profitMargin,
    };
  }, [filteredProducts, filteredCategories]);

  const productPagination = usePagination(filteredProducts, 25);

  function toggleCategory(key: string) {
    setExpandedCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function expandAllCategories() {
    const next: Record<string, boolean> = {};
    for (const c of filteredCategories) {
      next[c.categoryKey] = true;
    }
    setExpandedCategories(next);
  }

  function collapseAllCategories() {
    setExpandedCategories({});
  }

  function exportCsv() {
    if (!filteredProducts.length) {
      toast.error("No data to export.");
      return;
    }

    const headers = [
      "Category",
      "Type",
      "Product Code",
      "Barcode",
      "Product / Service Name",
      "Brand",
      "Unit",
      "Invoices",
      "Qty Sold",
      "Current Stock",
      "Gross Sales (LKR)",
      "Total Discount (LKR)",
      "Net Sales (LKR)",
      "Total Cost (LKR)",
      "Gross Profit (LKR)",
      "Profit Margin (%)",
    ];

    const rows = filteredProducts.map((p) => [
      p.categoryName,
      p.itemType,
      p.code,
      p.barcode || "-",
      p.name,
      p.brandName || "-",
      p.unitName,
      String(p.invoiceCount),
      String(p.quantitySold),
      p.currentStock !== null ? String(p.currentStock) : "N/A",
      p.grossSalesValue.toFixed(2),
      p.totalDiscount.toFixed(2),
      p.netSalesValue.toFixed(2),
      p.totalCost.toFixed(2),
      p.grossProfit.toFixed(2),
      p.profitMargin.toFixed(2),
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
    link.download = `category-product-report-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV report downloaded.");
  }

  function handlePrint() {
    expandAllCategories();
    setTimeout(() => {
      window.print();
    }, 150);
  }

  const maxCategorySales = useMemo(
    () =>
      Math.max(...filteredCategories.map((c) => c.grossSalesValue), 1),
    [filteredCategories]
  );

  return (
    <div className="min-h-[calc(100dvh_-_4rem)] bg-slate-50 p-3 sm:p-4 lg:min-h-[calc(100dvh_-_5rem)] md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header & Filter Bar */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                Reports · Category & Product Analytics
              </p>
              <h1 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                Category & Product-Wise Sales Report
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Analyze sales quantities, revenue, cost of goods sold, and gross profit by category and product
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                onClick={exportCsv}
                disabled={loading || !filteredProducts.length}
                className="flex h-10 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>

              <button
                onClick={handlePrint}
                disabled={loading || !filteredProducts.length}
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
              Category
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900"
              >
                <option value="ALL">All Categories</option>
                {data?.categoriesList.map((cat) => (
                  <option key={cat.categoryKey} value={cat.categoryKey}>
                    {cat.name} ({cat.type === "PRODUCT" ? "Product" : "Service"})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Item Type
              <select
                value={selectedType}
                onChange={(e) =>
                  setSelectedType(
                    e.target.value as "ALL" | "PRODUCT" | "SERVICE"
                  )
                }
                className="mt-1 block h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900"
              >
                <option value="ALL">Products & Services</option>
                <option value="PRODUCT">Products Only</option>
                <option value="SERVICE">Services Only</option>
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Search Product / Code / Category
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Product name, code, brand..."
                  className="block h-10 w-full rounded-lg border pl-9 pr-3 text-sm text-slate-900"
                />
              </div>
            </label>

            <div className="flex items-end">
              <button
                onClick={() => loadReport()}
                disabled={loading}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
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

          {/* Unsold Toggle & View Tabs */}
          <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Report View:
              </span>
              <div className="inline-flex rounded-lg border bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("BOTH")}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    activeTab === "BOTH"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Both (Category + Product)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("CATEGORY")}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    activeTab === "CATEGORY"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Category-Wise Only
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("PRODUCT")}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    activeTab === "PRODUCT"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Product-Wise Table Only
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={includeUnsold}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIncludeUnsold(checked);
                  loadReport(checked);
                }}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              Include products with 0 sales in period
            </label>
          </div>
        </div>

        {/* Report Body */}
        {!data ? (
          <div className="rounded-2xl border bg-white p-12 text-center text-sm text-slate-500">
            {loading
              ? "Loading category & product report..."
              : "No report data available."}
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Categories
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-slate-900">
                  {filteredSummary.categoriesCount.toLocaleString()}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Products / Items
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-slate-900">
                  {filteredSummary.productsCount.toLocaleString()}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Total Qty Sold
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-indigo-600">
                  {qtyFormat(filteredSummary.totalQuantity)}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Gross Sales Value
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-slate-900">
                  Rs. {money(filteredSummary.grossSalesValue)}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Total Cost (COGS)
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-slate-700">
                  Rs. {money(filteredSummary.totalCost)}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Gross Profit ({filteredSummary.profitMargin.toFixed(1)}%)
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-emerald-600">
                  Rs. {money(filteredSummary.grossProfit)}
                </p>
              </div>
            </div>

            {/* SECTION 1: CATEGORY-WISE REPORT */}
            {(activeTab === "BOTH" || activeTab === "CATEGORY") && (
              <section className="space-y-4">
                <div className="flex flex-col gap-2 rounded-2xl border bg-white p-4 shadow-sm sm:p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                      <FolderTree className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900">
                        Category-Wise Breakdown
                      </h2>
                      <p className="text-xs text-slate-500">
                        Click any category to view all products sold under that category
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={expandAllCategories}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Expand All Categories
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllCategories}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                {filteredCategories.length === 0 ? (
                  <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">
                    No category sales found for the selected filters.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCategories.map((cat) => {
                      const isExpanded = Boolean(
                        expandedCategories[cat.categoryKey]
                      );
                      const revenueShare =
                        filteredSummary.grossSalesValue > 0
                          ? (cat.grossSalesValue /
                              filteredSummary.grossSalesValue) *
                            100
                          : 0;

                      return (
                        <div
                          key={cat.categoryKey}
                          className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() => toggleCategory(cat.categoryKey)}
                            className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-slate-50/80 lg:flex-row lg:items-center lg:justify-between"
                          >
                            <div className="flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2.5">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                  <Tags className="h-4 w-4" />
                                </span>
                                <h3 className="text-base font-black text-slate-900">
                                  {cat.categoryName}
                                </h3>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    cat.categoryType === "PRODUCT"
                                      ? "bg-blue-50 text-blue-700"
                                      : "bg-purple-50 text-purple-700"
                                  }`}
                                >
                                  {cat.categoryType}
                                </span>
                                <span className="text-xs font-semibold text-slate-500">
                                  {cat.distinctItemsCount} item(s) ·{" "}
                                  {qtyFormat(cat.totalQuantity)} units sold
                                </span>
                              </div>

                              {/* Share bar */}
                              <div className="max-w-md">
                                <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                                  <span>
                                    Revenue Share: {revenueShare.toFixed(1)}%
                                  </span>
                                  <span>
                                    Margin: {cat.profitMargin.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100">
                                  <div
                                    className="h-2 rounded-full bg-indigo-600"
                                    style={{
                                      width: `${Math.max(
                                        2,
                                        (cat.grossSalesValue /
                                          maxCategorySales) *
                                          100
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-6 border-t pt-3 lg:border-t-0 lg:pt-0">
                              <div>
                                <p className="text-[11px] font-semibold uppercase text-slate-400">
                                  Sales Value
                                </p>
                                <p className="text-base font-black text-slate-900">
                                  Rs. {money(cat.grossSalesValue)}
                                </p>
                              </div>

                              <div>
                                <p className="text-[11px] font-semibold uppercase text-slate-400">
                                  Net Sales
                                </p>
                                <p className="text-sm font-bold text-slate-700">
                                  Rs. {money(cat.netSalesValue)}
                                </p>
                              </div>

                              <div>
                                <p className="text-[11px] font-semibold uppercase text-slate-400">
                                  Cost
                                </p>
                                <p className="text-sm font-bold text-slate-600">
                                  Rs. {money(cat.totalCost)}
                                </p>
                              </div>

                              <div>
                                <p className="text-[11px] font-semibold uppercase text-slate-400">
                                  Gross Profit
                                </p>
                                <p className="text-sm font-black text-emerald-600">
                                  Rs. {money(cat.grossProfit)}
                                </p>
                              </div>

                              <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 print:hidden">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t bg-slate-50/50 p-4">
                              <div className="touch-pan-x overscroll-x-contain overflow-x-auto rounded-xl border bg-white">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                                    <tr>
                                      <th className="px-4 py-3">Code</th>
                                      <th className="px-4 py-3">
                                        Product / Service
                                      </th>
                                      <th className="px-4 py-3">Brand</th>
                                      <th className="px-4 py-3 text-right">
                                        Sold Qty
                                      </th>
                                      <th className="px-4 py-3 text-right">
                                        Stock
                                      </th>
                                      <th className="px-4 py-3 text-right">
                                        Sales Value
                                      </th>
                                      <th className="px-4 py-3 text-right">
                                        Discount
                                      </th>
                                      <th className="px-4 py-3 text-right">
                                        Cost
                                      </th>
                                      <th className="px-4 py-3 text-right">
                                        Profit
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {cat.items.map((item) => (
                                      <tr
                                        key={item.itemKey}
                                        className="hover:bg-slate-50/80"
                                      >
                                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-700">
                                          {item.code}
                                        </td>
                                        <td className="px-4 py-2.5 font-semibold text-slate-900">
                                          {item.name}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-slate-500">
                                          {item.brandName || "-"}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                                          {qtyFormat(item.quantitySold)}{" "}
                                          <span className="text-xs font-normal text-slate-500">
                                            {item.unitName}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-xs text-slate-600">
                                          {item.currentStock !== null
                                            ? `${qtyFormat(item.currentStock)} ${item.unitName}`
                                            : "N/A"}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                                          Rs. {money(item.grossSalesValue)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-slate-600">
                                          Rs. {money(item.totalDiscount)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-slate-600">
                                          Rs. {money(item.totalCost)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-black text-emerald-600">
                                          Rs. {money(item.grossProfit)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* SECTION 2: PRODUCT-WISE DETAILED TABLE */}
            {(activeTab === "BOTH" || activeTab === "PRODUCT") && (
              <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="flex items-center justify-between border-b p-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900">
                        Product-Wise Sales & Valuation Table
                      </h2>
                      <p className="text-xs text-slate-500">
                        Complete product ranking with sold quantities, current stock, sales value, and profit margin
                      </p>
                    </div>
                  </div>
                  <Layers className="h-5 w-5 text-slate-400" />
                </div>

                <div className="touch-pan-x overscroll-x-contain overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3">Product / Service</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Invoices</th>
                        <th className="px-4 py-3 text-right">Sold Qty</th>
                        <th className="px-4 py-3 text-right">Current Stock</th>
                        <th className="px-4 py-3 text-right">Sales Value</th>
                        <th className="px-4 py-3 text-right">Net Sales</th>
                        <th className="px-4 py-3 text-right">Cost</th>
                        <th className="px-4 py-3 text-right">Profit</th>
                        <th className="px-4 py-3 text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={11}
                            className="px-4 py-10 text-center text-sm text-slate-500"
                          >
                            No product sales found for the selected criteria.
                          </td>
                        </tr>
                      ) : (
                        productPagination.paginatedItems.map((p) => (
                          <tr
                            key={p.itemKey}
                            className="hover:bg-slate-50/80"
                          >
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                              {p.code}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900">
                                {p.name}
                              </div>
                              {p.brandName && (
                                <div className="text-xs text-slate-500">
                                  Brand: {p.brandName}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                {p.categoryName}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              {p.invoiceCount}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-indigo-600">
                              {qtyFormat(p.quantitySold)}{" "}
                              <span className="text-xs font-normal text-slate-500">
                                {p.unitName}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                              {p.currentStock !== null
                                ? `${qtyFormat(p.currentStock)} ${p.unitName}`
                                : "N/A"}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900">
                              Rs. {money(p.grossSalesValue)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700">
                              Rs. {money(p.netSalesValue)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              Rs. {money(p.totalCost)}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-emerald-600">
                              Rs. {money(p.grossProfit)}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-bold text-slate-700">
                              {p.profitMargin.toFixed(1)}%
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredProducts.length > 0 && (
                      <tfoot className="border-t bg-slate-50 font-black text-slate-900">
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-3 text-right text-xs uppercase text-slate-500"
                          >
                            Grand Total
                          </td>
                          <td className="px-4 py-3 text-right text-indigo-600">
                            {qtyFormat(filteredSummary.totalQuantity)}
                          </td>
                          <td className="px-4 py-3 text-right">-</td>
                          <td className="px-4 py-3 text-right">
                            Rs. {money(filteredSummary.grossSalesValue)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            Rs. {money(filteredSummary.netSalesValue)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            Rs. {money(filteredSummary.totalCost)}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600">
                            Rs. {money(filteredSummary.grossProfit)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {filteredSummary.profitMargin.toFixed(1)}%
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                <Pagination
                  currentPage={productPagination.currentPage}
                  totalPages={productPagination.totalPages}
                  totalRecords={productPagination.totalRecords}
                  pageSize={productPagination.pageSize}
                  onPageChange={productPagination.handlePageChange}
                  onPageSizeChange={productPagination.handlePageSizeChange}
                  startIndex={productPagination.startIndex}
                  endIndex={productPagination.endIndex}
                  recordLabel="products"
                />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

